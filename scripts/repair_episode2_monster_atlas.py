#!/usr/bin/env python3
"""Repair isolated generation defects while keeping the fixed 8x5 contract."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def cell_box(image: Image.Image, row: int, col: int) -> tuple[int, int, int, int]:
    return (
        round(col * image.width / 8),
        round(row * image.height / 5),
        round((col + 1) * image.width / 8),
        round((row + 1) * image.height / 5),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--copy-row", help="SOURCE:TARGET, zero-based")
    parser.add_argument("--copy-cell", action="append", default=[], help="ROW,SOURCE_COL,TARGET_COL")
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    if args.copy_row:
        source_row, target_row = (int(value) for value in args.copy_row.split(":"))
        source_box = (0, cell_box(image, source_row, 0)[1], image.width, cell_box(image, source_row, 0)[3])
        target_y = cell_box(image, target_row, 0)[1]
        source = image.crop(source_box)
        target_height = cell_box(image, target_row, 0)[3] - target_y
        if source.height != target_height:
            source = source.resize((image.width, target_height), Image.Resampling.LANCZOS)
        image.paste(source, (0, target_y))

    for repair in args.copy_cell:
        row, source_col, target_col = (int(value) for value in repair.split(","))
        source = image.crop(cell_box(image, row, source_col))
        target = cell_box(image, row, target_col)
        if source.size != (target[2] - target[0], target[3] - target[1]):
            source = source.resize((target[2] - target[0], target[3] - target[1]), Image.Resampling.LANCZOS)
        image.paste(source, (target[0], target[1]))

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination)
    print(f"Wrote {destination}")


if __name__ == "__main__":
    main()
