#!/usr/bin/env python3
"""Build the seven-row elemental impact atlas from approved alpha sources."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/fx/elemental-source-v1"
OUTPUT = ROOT / "public/assets/fx/beta-elemental-impact-atlas-v1.png"
ELEMENTS = ("fire", "ice", "lightning", "poison", "wind", "earth", "shadow")
FRAME = 256
FRAMES_PER_ELEMENT = 4
FRAME_SCALES = (0.54, 0.78, 1.0, 1.06)
FRAME_OPACITY = (0.58, 0.86, 1.0, 0.56)
BASE_SIZES = {
    "fire": (196, 208),
    "ice": (218, 218),
    "lightning": (190, 220),
    "poison": (220, 206),
    "wind": (226, 204),
    "earth": (230, 172),
    "shadow": (226, 212),
}
CENTER_Y = {
    "fire": 140,
    "ice": 128,
    "lightning": 128,
    "poison": 130,
    "wind": 128,
    "earth": 158,
    "shadow": 128,
}


def load_trimmed(element: str) -> Image.Image:
    source = Image.open(SOURCE_DIR / f"{element}-alpha-v1.png").convert("RGBA")
    alpha = source.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if not bbox:
        raise ValueError(f"{element}: empty alpha source")
    return source.crop(bbox)


def scaled_frame(source: Image.Image, element: str, frame_index: int) -> Image.Image:
    max_width, max_height = BASE_SIZES[element]
    scale = FRAME_SCALES[frame_index]
    target_width = max(1, round(max_width * scale))
    target_height = max(1, round(max_height * scale))
    contained = source.copy()
    contained.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)

    opacity = FRAME_OPACITY[frame_index]
    if opacity < 1:
        alpha = contained.getchannel("A").point(lambda value: round(value * opacity))
        contained.putalpha(alpha)

    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    center_y = CENTER_Y[element]
    x = round((FRAME - contained.width) / 2)
    y = round(center_y - contained.height / 2)
    x = max(8, min(x, FRAME - contained.width - 8))
    y = max(8, min(y, FRAME - contained.height - 8))
    frame.alpha_composite(contained, (x, y))
    return frame


def main() -> None:
    atlas = Image.new(
        "RGBA",
        (FRAME * FRAMES_PER_ELEMENT, FRAME * len(ELEMENTS)),
        (0, 0, 0, 0),
    )
    for row, element in enumerate(ELEMENTS):
        source = load_trimmed(element)
        for column in range(FRAMES_PER_ELEMENT):
            atlas.alpha_composite(
                scaled_frame(source, element, column),
                (column * FRAME, row * FRAME),
            )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT, format="PNG", optimize=True, compress_level=9)
    print(f"Built {OUTPUT.relative_to(ROOT)}: 7 elements / 28 frames / {atlas.size[0]}x{atlas.size[1]}")


if __name__ == "__main__":
    main()
