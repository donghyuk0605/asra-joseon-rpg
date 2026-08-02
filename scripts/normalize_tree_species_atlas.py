#!/usr/bin/env python3
"""Normalize the 4x2 regional tree atlas into fixed, safely padded frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_WIDTH = 384
FRAME_HEIGHT = 512
COLUMNS = 4
ROWS = 2
MAX_CONTENT_WIDTH = 320
MAX_CONTENT_HEIGHT = 470
BASELINE_Y = FRAME_HEIGHT - 18


def normalize(source_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    expected_size = (FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * ROWS)
    if source.size != expected_size:
        raise ValueError(f"Tree atlas must be {expected_size[0]}x{expected_size[1]}, got {source.size}")

    atlas = Image.new("RGBA", expected_size, (0, 0, 0, 0))
    for row in range(ROWS):
        for column in range(COLUMNS):
            frame_index = row * COLUMNS + column
            cell = source.crop((
                column * FRAME_WIDTH,
                row * FRAME_HEIGHT,
                (column + 1) * FRAME_WIDTH,
                (row + 1) * FRAME_HEIGHT,
            ))
            bounds = cell.getchannel("A").getbbox()
            if bounds is None:
                raise ValueError(f"Tree frame {frame_index} has no visible pixels")

            tree = cell.crop(bounds)
            scale = min(
                1.0,
                MAX_CONTENT_WIDTH / tree.width,
                MAX_CONTENT_HEIGHT / tree.height,
            )
            if scale < 0.999:
                tree = tree.resize((
                    max(1, round(tree.width * scale)),
                    max(1, round(tree.height * scale)),
                ), Image.Resampling.LANCZOS)

            paste_x = column * FRAME_WIDTH + (FRAME_WIDTH - tree.width) // 2
            paste_y = row * FRAME_HEIGHT + BASELINE_Y - tree.height
            atlas.alpha_composite(tree, (paste_x, paste_y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output_path, optimize=True)
    print(f"Wrote {output_path} ({atlas.width}x{atlas.height})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    normalize(args.input, args.out)


if __name__ == "__main__":
    main()
