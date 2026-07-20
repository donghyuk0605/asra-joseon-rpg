#!/usr/bin/env python3
"""Build V3 player atlases with a more readable diagonal walk cycle.

The V2 atlases remain the immutable input. Only the four walk columns in the
south-west and north-west rows are changed; attacks and cardinal directions
are copied byte-for-byte into the V3 outputs.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


FRAME_SIZE = 256
ATLAS_SIZE = (2048, 1280)
DIAGONAL_ROWS = (1, 3)
WALK_COLUMNS = range(4)
LOWER_BODY_START = 164
LOWER_BODY_BLEND_END = 190

SOURCE_TO_OUTPUT = {
    Path("public/assets/characters/joseon-hero-unequipped-v2.png"): Path(
        "public/assets/characters/joseon-hero-unequipped-v3.png"
    ),
    Path("public/assets/characters/joseon-hero-weapon-only-v2.png"): Path(
        "public/assets/characters/joseon-hero-weapon-only-v3.png"
    ),
    Path("public/assets/characters/joseon-hero-armor-only-v2.png"): Path(
        "public/assets/characters/joseon-hero-armor-only-v3.png"
    ),
    Path("public/assets/characters/joseon-hero-fully-equipped-v2.png"): Path(
        "public/assets/characters/joseon-hero-fully-equipped-v3.png"
    ),
}


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def strengthen_diagonal_frame(frame: Image.Image, row: int, column: int) -> Image.Image:
    """Increase stride and alternating weight transfer without moving the footline."""

    # Contact poses widen, passing poses narrow. The alternating shift makes
    # the hips visibly load the planted leg instead of gliding through space.
    target_scale = (1.18, 0.92, 1.18, 0.92)[column]
    target_shift = (-7.0, 2.5, 7.0, -2.5)[column]
    if row == 3:
        target_shift *= 0.86

    warped = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    center_x = FRAME_SIZE / 2
    for y in range(LOWER_BODY_START, FRAME_SIZE):
        progress = smoothstep((y - LOWER_BODY_START) / (FRAME_SIZE - 8 - LOWER_BODY_START))
        scale = 1.0 + (target_scale - 1.0) * progress
        shift = target_shift * progress
        scanline = frame.crop((0, y, FRAME_SIZE, y + 1))
        width = max(1, round(FRAME_SIZE * scale))
        if width != FRAME_SIZE:
            scanline = scanline.resize((width, 1), Image.Resampling.LANCZOS)
        paste_x = round(center_x - width / 2 + shift)
        warped.alpha_composite(scanline, (paste_x, y))

    mask = Image.new("L", frame.size, 0)
    mask_pixels = mask.load()
    for y in range(LOWER_BODY_START, FRAME_SIZE):
        blend = smoothstep((y - LOWER_BODY_START) / (LOWER_BODY_BLEND_END - LOWER_BODY_START))
        alpha = round(255 * blend)
        for x in range(FRAME_SIZE):
            mask_pixels[x, y] = alpha

    return Image.composite(warped, frame, mask)


def build_atlas(source_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    if source.size != ATLAS_SIZE:
        raise ValueError(f"{source_path} must be {ATLAS_SIZE}, got {source.size}")

    output = source.copy()
    for row in DIAGONAL_ROWS:
        for column in WALK_COLUMNS:
            box = (
                column * FRAME_SIZE,
                row * FRAME_SIZE,
                (column + 1) * FRAME_SIZE,
                (row + 1) * FRAME_SIZE,
            )
            strengthened = strengthen_diagonal_frame(source.crop(box), row, column)
            output.paste(strengthened, box)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path)
    print(f"wrote {output_path}")


def main() -> None:
    for source_path, output_path in SOURCE_TO_OUTPUT.items():
        build_atlas(source_path, output_path)


if __name__ == "__main__":
    main()
