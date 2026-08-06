#!/usr/bin/env python3
"""Crop a 2x2 chroma-keyed ambient sheet into a fixed anchored Phaser atlas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--rows", type=int, default=2)
    parser.add_argument("--cols", type=int, default=2)
    parser.add_argument("--frame-size", type=int, default=256)
    parser.add_argument("--inset", type=int, default=10)
    parser.add_argument("--max-content", type=int, default=232)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    cell_width = source.width / args.cols
    cell_height = source.height / args.rows
    frames: list[Image.Image] = []

    for row in range(args.rows):
        for col in range(args.cols):
            left = round(col * cell_width) + args.inset
            top = round(row * cell_height) + args.inset
            right = round((col + 1) * cell_width) - args.inset
            bottom = round((row + 1) * cell_height) - args.inset
            cell = source.crop((left, top, right, bottom))
            bounds = cell.getchannel("A").getbbox()
            if bounds is None:
                raise RuntimeError(f"Empty ambient frame at row {row}, column {col}")
            frames.append(cell.crop(bounds))

    largest_dimension = max(max(frame.width, frame.height) for frame in frames)
    shared_scale = min(1.0, args.max_content / largest_dimension)
    atlas = Image.new(
        "RGBA",
        (args.cols * args.frame_size, args.rows * args.frame_size),
        (0, 0, 0, 0),
    )

    for index, frame in enumerate(frames):
        if shared_scale < 0.999:
            frame = frame.resize(
                (
                    max(1, round(frame.width * shared_scale)),
                    max(1, round(frame.height * shared_scale)),
                ),
                Image.Resampling.LANCZOS,
            )
        row, col = divmod(index, args.cols)
        paste_x = col * args.frame_size + (args.frame_size - frame.width) // 2
        paste_y = row * args.frame_size + args.frame_size - 7 - frame.height
        atlas.alpha_composite(frame, (paste_x, paste_y))

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination)
    print(f"Wrote {destination} ({atlas.width}x{atlas.height}), shared scale {shared_scale:.4f}")


if __name__ == "__main__":
    main()
