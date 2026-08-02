#!/usr/bin/env python3
"""Validate dungeon prop atlases used instead of temporary geometric markers."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def assert_atlas(path: Path, size: tuple[int, int], cell: int, minimum_visible_frames: int) -> None:
    atlas = Image.open(path).convert("RGBA")
    if atlas.size != size:
        raise AssertionError(f"{path.name} must be {size[0]}x{size[1]}, got {atlas.size}")
    cols = size[0] // cell
    rows = size[1] // cell
    visible = 0
    for row in range(rows):
      for column in range(cols):
        frame = atlas.crop((column * cell, row * cell, (column + 1) * cell, (row + 1) * cell))
        if frame.getchannel("A").getbbox() is not None:
            visible += 1
    if visible < minimum_visible_frames:
        raise AssertionError(f"{path.name} has only {visible} visible frames")


def main() -> None:
    assert_atlas(ROOT / "public/assets/environment/props/dungeon-prop-atlas-v1.png", (1024, 512), 256, 8)
    assert_atlas(ROOT / "public/assets/environment/props/dungeon-wall-atlas-v1.png", (1024, 512), 256, 8)
    assert_atlas(ROOT / "public/assets/fx/dungeon-telegraph-atlas-v1.png", (768, 256), 256, 3)
    print("Dungeon prop, wall and telegraph image atlases are present and framed.")


if __name__ == "__main__":
    main()
