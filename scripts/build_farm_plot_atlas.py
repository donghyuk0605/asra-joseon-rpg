#!/usr/bin/env python3
"""Normalize a transparent 2x2 farm source into four stable 512px frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_SIZE = 512
TARGET_WIDTH = 480
BASELINE_Y = 430


def build_atlas(source_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    if source.width % 2 or source.height % 2:
        raise ValueError("Farm source must divide evenly into a 2x2 grid")

    source_frame_width = source.width // 2
    source_frame_height = source.height // 2
    atlas = Image.new("RGBA", (FRAME_SIZE * 2, FRAME_SIZE * 2), (0, 0, 0, 0))

    for frame_index in range(4):
        column = frame_index % 2
        row = frame_index // 2
        frame = source.crop((
            column * source_frame_width,
            row * source_frame_height,
            (column + 1) * source_frame_width,
            (row + 1) * source_frame_height,
        ))
        alpha_box = frame.getchannel("A").getbbox()
        if alpha_box is None:
            raise ValueError(f"Farm frame {frame_index} has no visible pixels")

        object_image = frame.crop(alpha_box)
        scale = TARGET_WIDTH / object_image.width
        object_height = round(object_image.height * scale)
        object_image = object_image.resize((TARGET_WIDTH, object_height), Image.Resampling.LANCZOS)
        paste_x = (FRAME_SIZE - TARGET_WIDTH) // 2
        paste_y = BASELINE_Y - object_height

        normalized_frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        normalized_frame.alpha_composite(object_image, (paste_x, paste_y))
        atlas.alpha_composite(
            normalized_frame,
            (column * FRAME_SIZE, row * FRAME_SIZE),
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    build_atlas(args.input, args.out)


if __name__ == "__main__":
    main()
