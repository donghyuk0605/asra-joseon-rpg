#!/usr/bin/env python3
"""Extract grid subjects by connectivity and rebuild a clean, anchored sprite atlas."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--cols", type=int, required=True)
    parser.add_argument("--frame-size", type=int, default=256)
    parser.add_argument("--alpha-threshold", type=int, default=20)
    parser.add_argument("--max-content", type=int, default=232)
    parser.add_argument("--allow-missing", action="store_true")
    return parser.parse_args()


def extract_component(mask: np.ndarray, visited: np.ndarray, seed_x: int, seed_y: int) -> tuple[int, int, int, int]:
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
        for ny in range(max(0, y - 1), min(height, y + 2)):
            for nx in range(max(0, x - 1), min(width, x + 2)):
                if not visited[ny, nx] and mask[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((nx, ny))
    return min_x, min_y, max_x + 1, max_y + 1


def find_seed(mask: np.ndarray, visited: np.ndarray, center_x: float, center_y: float, radius_x: int, radius_y: int) -> tuple[int, int]:
    height, width = mask.shape
    left = max(0, int(center_x - radius_x))
    right = min(width, int(center_x + radius_x))
    top = max(0, int(center_y - radius_y))
    bottom = min(height, int(center_y + radius_y))
    candidates = np.argwhere(mask[top:bottom, left:right] & ~visited[top:bottom, left:right])
    if candidates.size == 0:
        raise RuntimeError(f"No subject near expected center ({center_x:.1f}, {center_y:.1f})")
    absolute_y = candidates[:, 0] + top
    absolute_x = candidates[:, 1] + left
    distances = (absolute_x - center_x) ** 2 + (absolute_y - center_y) ** 2
    index = int(np.argmin(distances))
    return int(absolute_x[index]), int(absolute_y[index])


def main() -> None:
    args = parse_args()
    source = Image.open(args.input).convert("RGBA")
    alpha = np.asarray(source.getchannel("A"))
    mask = alpha >= args.alpha_threshold
    visited = np.zeros(mask.shape, dtype=bool)
    slot_width = source.width / args.cols
    slot_height = source.height / args.rows
    boxes: list[tuple[int, int, int, int] | None] = []

    for row in range(args.rows):
        for col in range(args.cols):
            center_x = (col + 0.5) * slot_width
            center_y = (row + 0.5) * slot_height
            try:
                seed = find_seed(mask, visited, center_x, center_y, int(slot_width * 0.38), int(slot_height * 0.4))
                boxes.append(extract_component(mask, visited, *seed))
            except RuntimeError:
                if not args.allow_missing:
                    raise
                boxes.append(None)

    present_boxes = [box for box in boxes if box is not None]
    max_width = max(right - left for left, _, right, _ in present_boxes)
    max_height = max(bottom - top for _, top, _, bottom in present_boxes)
    shared_scale = min(1.0, args.max_content / max_width, args.max_content / max_height)
    atlas = Image.new("RGBA", (args.cols * args.frame_size, args.rows * args.frame_size), (0, 0, 0, 0))

    for index, box in enumerate(boxes):
        if box is None:
            continue
        left, top, right, bottom = box
        sprite = source.crop((max(0, left - 2), max(0, top - 2), min(source.width, right + 2), min(source.height, bottom + 2)))
        if shared_scale < 0.999:
            sprite = sprite.resize((max(1, round(sprite.width * shared_scale)), max(1, round(sprite.height * shared_scale))), Image.Resampling.LANCZOS)
        row, col = divmod(index, args.cols)
        paste_x = col * args.frame_size + (args.frame_size - sprite.width) // 2
        paste_y = row * args.frame_size + args.frame_size - 7 - sprite.height
        atlas.alpha_composite(sprite, (paste_x, paste_y))

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output)
    print(f"Wrote {output} ({atlas.width}x{atlas.height}), shared scale {shared_scale:.4f}")
    for index, box in enumerate(boxes):
        print(f"frame {index:02d}: {box if box is not None else 'MISSING'}")


if __name__ == "__main__":
    main()
