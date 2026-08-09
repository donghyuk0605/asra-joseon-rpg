#!/usr/bin/env python3
"""Normalize the approved 4x2 alpha weather sheet into a Phaser VFX atlas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


COLUMNS = 4
ROWS = 2
FRAME = 256
CONTENT_LIMIT = 236
ALPHA_MULTIPLIERS = (1.4, 2.2, 1.8, 1.8, 5.8, 6.4, 1.25, 1.25)


def crop_grid_cell(source: Image.Image, column: int, row: int) -> Image.Image:
    left = round(column * source.width / COLUMNS)
    right = round((column + 1) * source.width / COLUMNS)
    top = round(row * source.height / ROWS)
    bottom = round((row + 1) * source.height / ROWS)
    return source.crop((left, top, right, bottom))


def normalize_cell(cell: Image.Image, index: int) -> Image.Image:
    alpha = cell.getchannel("A").point(
        lambda value: min(255, round(value * ALPHA_MULTIPLIERS[index])),
    )
    cell.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"Weather source contains an empty frame at index {index}")
    subject = cell.crop(bounds)
    scale = min(CONTENT_LIMIT / subject.width, CONTENT_LIMIT / subject.height, 1.0)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    x = (FRAME - subject.width) // 2
    # Mist belongs close to the ground; the other effects remain centred.
    y = FRAME - subject.height - 8 if index in (4, 5) else (FRAME - subject.height) // 2
    frame.alpha_composite(subject, (x, y))
    return frame


def validate(atlas: Image.Image) -> None:
    if atlas.size != (COLUMNS * FRAME, ROWS * FRAME):
        raise ValueError(f"Unexpected weather atlas size: {atlas.size}")
    for row in range(ROWS):
        for column in range(COLUMNS):
            frame = atlas.crop((
                column * FRAME,
                row * FRAME,
                (column + 1) * FRAME,
                (row + 1) * FRAME,
            ))
            bounds = frame.getchannel("A").getbbox()
            if bounds is None:
                raise ValueError(f"Empty weather frame at {row},{column}")
            if bounds[2] - bounds[0] > CONTENT_LIMIT or bounds[3] - bounds[1] > CONTENT_LIMIT:
                raise ValueError(f"Weather frame exceeds safe content area at {row},{column}: {bounds}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    atlas = Image.new("RGBA", (COLUMNS * FRAME, ROWS * FRAME), (0, 0, 0, 0))
    for row in range(ROWS):
        for column in range(COLUMNS):
            index = row * COLUMNS + column
            frame = normalize_cell(crop_grid_cell(source, column, row), index)
            atlas.alpha_composite(frame, (column * FRAME, row * FRAME))
    validate(atlas)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.out, optimize=True)
    print(f"Wrote {args.out} ({atlas.width}x{atlas.height}, 8 validated alpha frames)")


if __name__ == "__main__":
    main()
