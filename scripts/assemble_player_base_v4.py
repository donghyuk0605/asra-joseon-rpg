#!/usr/bin/env python3
"""Assemble the V4 player body atlas from approved directional walk strips."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


FRAME_SIZE = 256
FOOTLINE_Y = 249
ROW_NAMES = ("south", "southwest", "west", "northwest", "north")
ATTACK_SOURCE = Path(
    "assets/sprites/joseon-hero-components-v4/processed/base-body-actions-normalized.png"
)
WALK_ROOT = Path(
    "assets/sprites/joseon-hero-components-v4/walk-strips/processed"
)
PROCESSED_OUTPUT = Path(
    "assets/sprites/joseon-hero-components-v4/processed/base-body-actions-v4.png"
)
RUNTIME_OUTPUT = Path(
    "public/assets/characters/joseon-hero-base-body-v4.png"
)


def paste_on_footline(atlas: Image.Image, frame: Image.Image, row: int, column: int) -> None:
    alpha_bbox = frame.getchannel("A").getbbox()
    if alpha_bbox is None:
        raise ValueError(f"empty walk frame at row {row}, column {column}")
    content = frame.crop(alpha_bbox)
    if content.width > 232 or content.height > 232:
        raise ValueError(f"walk frame exceeds 232px content limit: {content.size}")
    x = column * FRAME_SIZE + (FRAME_SIZE - content.width) // 2
    y = row * FRAME_SIZE + FOOTLINE_Y - content.height
    atlas.alpha_composite(content, (x, y))


def main() -> None:
    atlas = Image.open(ATTACK_SOURCE).convert("RGBA")
    if atlas.size != (FRAME_SIZE * 8, FRAME_SIZE * 5):
        raise ValueError(f"unexpected attack atlas size: {atlas.size}")

    # Clear only the authored walk columns. Attack columns remain unchanged.
    for row, name in enumerate(ROW_NAMES):
        atlas.paste((0, 0, 0, 0), (0, row * FRAME_SIZE, FRAME_SIZE * 4, (row + 1) * FRAME_SIZE))
        for column in range(4):
            frame_path = WALK_ROOT / f"{name}-frames" / f"{column + 1:02d}.png"
            paste_on_footline(atlas, Image.open(frame_path).convert("RGBA"), row, column)

    PROCESSED_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(PROCESSED_OUTPUT)
    atlas.save(RUNTIME_OUTPUT)
    print(f"wrote {PROCESSED_OUTPUT}")
    print(f"wrote {RUNTIME_OUTPUT}")


if __name__ == "__main__":
    main()
