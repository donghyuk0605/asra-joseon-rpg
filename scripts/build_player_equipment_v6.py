#!/usr/bin/env python3
"""Build the V6 base body and a body-locked clothing layer from paired atlases.

The generated base and clothed sources use the same 8x5 layout.  Each matching
cell is transformed once, then that exact transform is applied to both outputs.
This keeps the feet, gait, fists, origin, and scale identical after equipment is
shown or hidden.
"""

from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROWS = 5
COLS = 8
FRAME = 256
FOOTLINE = 249
MAX_CONTENT = 232
TARGET_HEIGHT = 174
ALPHA_THRESHOLD = 20


@dataclass(frozen=True)
class FramePair:
    base: Image.Image
    outfit: Image.Image
    base_box: tuple[int, int, int, int]
    union_box: tuple[int, int, int, int]


def extract_component(
    mask: np.ndarray,
    visited: np.ndarray,
    seed_x: int,
    seed_y: int,
) -> tuple[int, int, int, int]:
    height, width = mask.shape
    queue: deque[tuple[int, int]] = deque([(seed_x, seed_y)])
    visited[seed_y, seed_x] = True
    min_x = max_x = seed_x
    min_y = max_y = seed_y
    while queue:
        x, y = queue.popleft()
        min_x = min(min_x, x)
        max_x = max(max_x, x)
        min_y = min(min_y, y)
        max_y = max(max_y, y)
        for next_y in range(max(0, y - 1), min(height, y + 2)):
            for next_x in range(max(0, x - 1), min(width, x + 2)):
                if mask[next_y, next_x] and not visited[next_y, next_x]:
                    visited[next_y, next_x] = True
                    queue.append((next_x, next_y))
    return min_x, min_y, max_x + 1, max_y + 1


def find_seed(
    mask: np.ndarray,
    visited: np.ndarray,
    center_x: float,
    center_y: float,
    radius_x: int,
    radius_y: int,
) -> tuple[int, int]:
    height, width = mask.shape
    left = max(0, int(center_x - radius_x))
    right = min(width, int(center_x + radius_x))
    top = max(0, int(center_y - radius_y))
    bottom = min(height, int(center_y + radius_y))
    candidates = np.argwhere(mask[top:bottom, left:right] & ~visited[top:bottom, left:right])
    if candidates.size == 0:
        raise ValueError(f"No complete pose near grid center ({center_x:.1f}, {center_y:.1f})")
    absolute_y = candidates[:, 0] + top
    absolute_x = candidates[:, 1] + left
    distances = (absolute_x - center_x) ** 2 + (absolute_y - center_y) ** 2
    index = int(np.argmin(distances))
    return int(absolute_x[index]), int(absolute_y[index])


def subject_boxes(source: Image.Image) -> list[tuple[int, int, int, int]]:
    alpha = np.asarray(source.getchannel("A"))
    mask = alpha >= ALPHA_THRESHOLD
    visited = np.zeros(mask.shape, dtype=bool)
    slot_width = source.width / COLS
    slot_height = source.height / ROWS
    boxes: list[tuple[int, int, int, int]] = []
    for row in range(ROWS):
        for column in range(COLS):
            center_x = (column + 0.5) * slot_width
            center_y = (row + 0.5) * slot_height
            seed = find_seed(
                mask,
                visited,
                center_x,
                center_y,
                int(slot_width * 0.38),
                int(slot_height * 0.4),
            )
            boxes.append(extract_component(mask, visited, *seed))
    return boxes


def content_boxes(base: Image.Image, outfit: Image.Image) -> tuple[
    tuple[int, int, int, int], tuple[int, int, int, int]
]:
    base_box = base.getchannel("A").getbbox()
    outfit_box = outfit.getchannel("A").getbbox()
    if base_box is None or outfit_box is None:
        raise ValueError("Every base and outfit cell must contain one complete pose")
    union = (
        min(base_box[0], outfit_box[0]),
        min(base_box[1], outfit_box[1]),
        max(base_box[2], outfit_box[2]),
        max(base_box[3], outfit_box[3]),
    )
    return base_box, union


def extract_outfit_layer(outfit: Image.Image) -> Image.Image:
    pixels = np.asarray(outfit.convert("RGBA")).copy()
    alpha = pixels[..., 3] > 12
    ys, xs = np.where(alpha)
    if len(xs) == 0:
        raise ValueError("Outfit cell is empty")

    red = pixels[..., 0].astype(np.int16)
    green = pixels[..., 1].astype(np.int16)
    blue = pixels[..., 2].astype(np.int16)
    skin = alpha & (red > 105) & (red > green + 16) & (green > blue + 7) & (blue < 175)
    skin = np.asarray(Image.fromarray(skin.astype(np.uint8) * 255, "L").filter(ImageFilter.MaxFilter(7))) > 0

    top = int(ys.min())
    bottom = int(ys.max())
    height = max(1, bottom - top + 1)
    y_grid = np.arange(outfit.height)[:, None]
    below_head = y_grid >= top + int(height * 0.205)

    # Generated hair is dark like the garment.  Remove only the compact head
    # region while retaining the shoulders and the raised rear-facing sleeves.
    center_x = (int(xs.min()) + int(xs.max())) / 2
    x_grid = np.arange(outfit.width)[None, :]
    head_region = (
        (y_grid < top + int(height * 0.29))
        & (np.abs(x_grid - center_x) < max(8, int((xs.max() - xs.min()) * 0.2)))
    )

    garment = alpha & below_head & ~skin & ~head_region
    layer = np.zeros_like(pixels)
    layer[garment] = pixels[garment]
    return Image.fromarray(layer, "RGBA")


def load_pairs(base_source: Image.Image, outfit_source: Image.Image) -> list[FramePair]:
    if base_source.size != outfit_source.size:
        raise ValueError("Base and outfit sources must have the same canvas size")
    base_subjects = subject_boxes(base_source)
    outfit_subjects = subject_boxes(outfit_source)
    pairs: list[FramePair] = []
    for base_box_global, outfit_box_global in zip(base_subjects, outfit_subjects, strict=True):
        union_global = (
            min(base_box_global[0], outfit_box_global[0]),
            min(base_box_global[1], outfit_box_global[1]),
            max(base_box_global[2], outfit_box_global[2]),
            max(base_box_global[3], outfit_box_global[3]),
        )
        base = base_source.crop(union_global)
        outfit = outfit_source.crop(union_global)
        base_box = (
            base_box_global[0] - union_global[0],
            base_box_global[1] - union_global[1],
            base_box_global[2] - union_global[0],
            base_box_global[3] - union_global[1],
        )
        union = (0, 0, union_global[2] - union_global[0], union_global[3] - union_global[1])
        pairs.append(FramePair(base, outfit, base_box, union))
    return pairs


def build_atlases(pairs: list[FramePair]) -> tuple[Image.Image, Image.Image, Image.Image, float]:
    max_width = max(box[2] - box[0] for box in (pair.base_box for pair in pairs))
    max_height = max(box[3] - box[1] for box in (pair.base_box for pair in pairs))
    shared_scale = min(MAX_CONTENT / max_width, TARGET_HEIGHT / max_height)
    size = (COLS * FRAME, ROWS * FRAME)
    body_atlas = Image.new("RGBA", size, (0, 0, 0, 0))
    armor_atlas = Image.new("RGBA", size, (0, 0, 0, 0))
    preview_atlas = Image.new("RGBA", size, (0, 0, 0, 0))

    for index, pair in enumerate(pairs):
        body = pair.base.crop(pair.base_box)
        armor = extract_outfit_layer(pair.outfit).crop(pair.union_box)
        if abs(shared_scale - 1.0) > 0.001:
            body = body.resize(
                (max(1, round(body.width * shared_scale)), max(1, round(body.height * shared_scale))),
                Image.Resampling.LANCZOS,
            )
            armor = armor.resize(
                (max(1, round(armor.width * shared_scale)), max(1, round(armor.height * shared_scale))),
                Image.Resampling.LANCZOS,
            )
        row, column = divmod(index, COLS)
        frame_left = column * FRAME
        frame_top = row * FRAME
        body_x = frame_left + (FRAME - body.width) // 2
        body_y = frame_top + FOOTLINE - body.height
        base_center_in_union = ((pair.base_box[0] + pair.base_box[2]) / 2 - pair.union_box[0]) * shared_scale
        base_bottom_in_union = (pair.base_box[3] - pair.union_box[1]) * shared_scale
        armor_x = round(frame_left + FRAME / 2 - base_center_in_union)
        armor_y = round(frame_top + FOOTLINE - base_bottom_in_union)
        body_atlas.alpha_composite(body, (body_x, body_y))
        armor_atlas.alpha_composite(armor, (armor_x, armor_y))
        preview_atlas.alpha_composite(body, (body_x, body_y))
        preview_atlas.alpha_composite(armor, (armor_x, armor_y))

    return body_atlas, armor_atlas, preview_atlas, shared_scale


def validate_frames(atlas: Image.Image, label: str) -> None:
    for row in range(ROWS):
        for column in range(COLS):
            frame = atlas.crop((column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME))
            box = frame.getchannel("A").getbbox()
            if box is None:
                raise ValueError(f"{label} frame {row},{column} is empty")
            if box[2] - box[0] > MAX_CONTENT or box[3] - box[1] > MAX_CONTENT:
                raise ValueError(f"{label} frame {row},{column} exceeds the {MAX_CONTENT}px content limit")
            if box[3] > FOOTLINE + 1:
                raise ValueError(f"{label} frame {row},{column} crosses the shared footline")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--outfit", required=True)
    parser.add_argument("--base-out", required=True)
    parser.add_argument("--armor-out", required=True)
    parser.add_argument("--preview-out", required=True)
    args = parser.parse_args()

    base_source = Image.open(args.base).convert("RGBA")
    outfit_source = Image.open(args.outfit).convert("RGBA")
    body, armor, preview, scale = build_atlases(load_pairs(base_source, outfit_source))
    validate_frames(body, "body")
    validate_frames(armor, "armor")

    for destination, image in (
        (args.base_out, body),
        (args.armor_out, armor),
        (args.preview_out, preview),
    ):
        path = Path(destination)
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path)
        print(f"Wrote {path} ({image.width}x{image.height})")
    print(f"Shared scale: {scale:.4f}; shared origin: (0.5, 0.97); footline: {FOOTLINE}")


if __name__ == "__main__":
    main()
