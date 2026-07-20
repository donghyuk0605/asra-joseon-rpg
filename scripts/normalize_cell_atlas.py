#!/usr/bin/env python3
"""Normalize a chroma-keyed regular grid while preserving disconnected weapon/effect pixels."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--cols", type=int, required=True)
    parser.add_argument("--frame-size", type=int, default=256)
    parser.add_argument("--max-content", type=int, default=232)
    parser.add_argument("--x-boundaries", help="Comma-separated source X cuts for irregular columns")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    boundaries = [int(value) for value in args.x_boundaries.split(",")] if args.x_boundaries else None
    if boundaries is not None and len(boundaries) != args.cols + 1:
        raise ValueError("--x-boundaries needs cols + 1 values")
    cell_width = source.width / args.cols
    cell_height = source.height / args.rows
    frames: list[Image.Image] = []
    boxes: list[tuple[int, int, int, int]] = []

    for row in range(args.rows):
        for col in range(args.cols):
            left = boundaries[col] if boundaries else round(col * cell_width)
            right = boundaries[col + 1] if boundaries else round((col + 1) * cell_width)
            cell = source.crop((left, round(row * cell_height), right, round((row + 1) * cell_height)))
            bounds = cell.getchannel("A").getbbox()
            if bounds is None:
                raise RuntimeError(f"Empty frame at row {row}, column {col}")
            frames.append(cell.crop(bounds))
            boxes.append(bounds)

    shared_scale = min(1.0, args.max_content / max(max(frame.width, frame.height) for frame in frames))
    atlas = Image.new("RGBA", (args.cols * args.frame_size, args.rows * args.frame_size), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        if shared_scale < 0.999:
            frame = frame.resize((max(1, round(frame.width * shared_scale)), max(1, round(frame.height * shared_scale))), Image.Resampling.LANCZOS)
        row, col = divmod(index, args.cols)
        x = col * args.frame_size + (args.frame_size - frame.width) // 2
        y = row * args.frame_size + args.frame_size - 7 - frame.height
        atlas.alpha_composite(frame, (x, y))

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination)
    print(f"Wrote {destination} ({atlas.width}x{atlas.height}), shared scale {shared_scale:.4f}")
    for index, box in enumerate(boxes):
        print(f"frame {index:02d}: {box}")


if __name__ == "__main__":
    main()
