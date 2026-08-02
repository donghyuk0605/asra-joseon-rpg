#!/usr/bin/env python3
"""Extract sprite subjects from a near-black generated grid without erasing dark armour.

The generated frontier sheets use a softly textured black preview background. A
plain colour-distance matte would also remove the soldiers' black outlines and
shadowed armour. This tool instead finds the main connected subject in every
grid cell, closes only tiny gaps inside that silhouette, and adds a two-pixel
soft alpha fringe.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def dilate(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    result = mask.copy()
    for _ in range(iterations):
        padded = np.pad(result, 1, mode="constant", constant_values=False)
        result = np.zeros_like(result)
        for y_offset in range(3):
            for x_offset in range(3):
                result |= padded[
                    y_offset : y_offset + result.shape[0],
                    x_offset : x_offset + result.shape[1],
                ]
    return result


def erode(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    result = mask.copy()
    for _ in range(iterations):
        padded = np.pad(result, 1, mode="constant", constant_values=False)
        next_result = np.ones_like(result)
        for y_offset in range(3):
            for x_offset in range(3):
                next_result &= padded[
                    y_offset : y_offset + result.shape[0],
                    x_offset : x_offset + result.shape[1],
                ]
        result = next_result
    return result


def connected_components(mask: np.ndarray) -> list[np.ndarray]:
    height, width = mask.shape
    visited = np.zeros_like(mask)
    components: list[np.ndarray] = []
    for seed_y, seed_x in np.argwhere(mask):
        if visited[seed_y, seed_x]:
            continue
        queue: deque[tuple[int, int]] = deque([(int(seed_x), int(seed_y))])
        visited[seed_y, seed_x] = True
        pixels: list[tuple[int, int]] = []
        while queue:
            x, y = queue.popleft()
            pixels.append((y, x))
            for next_y in range(max(0, y - 1), min(height, y + 2)):
                for next_x in range(max(0, x - 1), min(width, x + 2)):
                    if mask[next_y, next_x] and not visited[next_y, next_x]:
                        visited[next_y, next_x] = True
                        queue.append((next_x, next_y))
        component = np.zeros_like(mask)
        ys, xs = zip(*pixels)
        component[np.asarray(ys), np.asarray(xs)] = True
        components.append(component)
    return components


def fill_enclosed_holes(mask: np.ndarray) -> np.ndarray:
    inverse = ~mask
    height, width = mask.shape
    exterior = np.zeros_like(mask)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        if inverse[0, x]:
            queue.append((x, 0))
        if inverse[height - 1, x]:
            queue.append((x, height - 1))
    for y in range(height):
        if inverse[y, 0]:
            queue.append((0, y))
        if inverse[y, width - 1]:
            queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if exterior[y, x] or not inverse[y, x]:
            continue
        exterior[y, x] = True
        for next_y in range(max(0, y - 1), min(height, y + 2)):
            for next_x in range(max(0, x - 1), min(width, x + 2)):
                if inverse[next_y, next_x] and not exterior[next_y, next_x]:
                    queue.append((next_x, next_y))
    return mask | (inverse & ~exterior)


def cell_subject_mask(rgb: np.ndarray, threshold: int) -> np.ndarray:
    brightness = rgb.max(axis=2)
    saturation = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    seed_mask = (brightness >= threshold) | ((brightness >= threshold - 8) & (saturation >= 18))
    components = connected_components(seed_mask)
    if not components:
        raise RuntimeError("No sprite subject found in grid cell")

    center_y = rgb.shape[0] * 0.58
    center_x = rgb.shape[1] * 0.5

    def component_score(component: np.ndarray) -> float:
        ys, xs = np.nonzero(component)
        distance = ((xs.mean() - center_x) / rgb.shape[1]) ** 2 + ((ys.mean() - center_y) / rgb.shape[0]) ** 2
        return float(component.sum()) / (1.0 + distance * 3.0)

    subject = max(components, key=component_score)
    main_size = int(subject.sum())
    meaningful_size = max(18, round(main_size * 0.018))
    for component in components:
        if int(component.sum()) >= meaningful_size:
            subject |= component

    # Reconnect tiny tips, tassels and boot highlights that sit just off a
    # larger dark component, while leaving isolated background grain behind.
    for _ in range(2):
        nearby = dilate(subject, 4)
        for component in components:
            if int(component.sum()) >= 5 and np.any(component & nearby):
                subject |= component
    subject = erode(dilate(subject, 1), 1)
    return fill_enclosed_holes(subject)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--rows", type=int, default=5)
    parser.add_argument("--cols", type=int, default=8)
    parser.add_argument("--threshold", type=int, default=30)
    args = parser.parse_args()

    source = np.asarray(Image.open(args.input).convert("RGBA")).copy()
    output = source.copy()
    output[..., 3] = 0
    cell_width = source.shape[1] / args.cols
    cell_height = source.shape[0] / args.rows

    for row in range(args.rows):
        for col in range(args.cols):
            left = round(col * cell_width)
            right = round((col + 1) * cell_width)
            top = round(row * cell_height)
            bottom = round((row + 1) * cell_height)
            cell_rgb = source[top:bottom, left:right, :3]
            subject = cell_subject_mask(cell_rgb, args.threshold)
            fringe_one = dilate(subject, 1) & ~subject
            fringe_two = dilate(subject, 2) & ~dilate(subject, 1)
            alpha = np.zeros(subject.shape, dtype=np.uint8)
            alpha[subject] = 255
            alpha[fringe_one] = 150
            alpha[fringe_two] = 58
            output[top:bottom, left:right, 3] = alpha

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(output, "RGBA").save(destination)
    print(f"Wrote {destination} ({output.shape[1]}x{output.shape[0]})")


if __name__ == "__main__":
    main()
