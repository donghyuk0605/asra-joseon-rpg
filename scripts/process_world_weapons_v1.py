#!/usr/bin/env python3
"""Normalize generated in-world weapon cutouts to one shared hand origin."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


SOURCE_ROOT = Path("assets/weapons-v1/processed")
OUTPUT_ROOT = Path("public/assets/weapons")
ASSETS = (
    "worn-hwando",
    "dokkaebi-club",
    "moonsteel-hwando",
)
FRAME = 256
SOURCE_ASPECT_WIDTH = 171
TARGET_GRIP = (128, 50)

# Hand-authored grip centers measured after the common resize.  Translating
# these to TARGET_GRIP makes every runtime cutout share one real pivot instead
# of merely sharing the same canvas dimensions.
RESIZED_GRIPS = {
    "worn-hwando": (128, 50),
    "dokkaebi-club": (121, 45),
    "moonsteel-hwando": (125, 52),
}


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        source = Image.open(SOURCE_ROOT / f"{name}-world-transparent.png").convert("RGBA")
        resized = source.resize((SOURCE_ASPECT_WIDTH, FRAME), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        resized_grip = RESIZED_GRIPS[name]
        offset = (
            (FRAME - SOURCE_ASPECT_WIDTH) // 2 + TARGET_GRIP[0] - resized_grip[0],
            TARGET_GRIP[1] - resized_grip[1],
        )
        canvas.alpha_composite(resized, offset)
        output = OUTPUT_ROOT / f"{name}-world-v1.png"
        canvas.save(output)
        box = canvas.getchannel("A").getbbox()
        if box is None or box[0] < 0 or box[1] < 0 or box[2] > FRAME or box[3] > FRAME:
            raise ValueError(f"Invalid normalized weapon: {name}")
        print(f"Wrote {output}; grip origin={TARGET_GRIP}; bounds={box}")


if __name__ == "__main__":
    main()
