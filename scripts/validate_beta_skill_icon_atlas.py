#!/usr/bin/env python3
"""Fail when the beta skill atlas loses cells, contrast, or unique artwork."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "public/assets/ui/skills/beta-skill-icon-atlas-v1.webp"
COLS = 6
ROWS = 3
ICON = 256


def main() -> None:
    atlas = Image.open(ATLAS).convert("RGB")
    expected = (COLS * ICON, ROWS * ICON)
    if atlas.size != expected:
        raise AssertionError(f"Skill atlas must be {expected}, got {atlas.size}")

    hashes: set[str] = set()
    for row in range(ROWS):
        for column in range(COLS):
            cell = atlas.crop((
                column * ICON,
                row * ICON,
                (column + 1) * ICON,
                (row + 1) * ICON,
            ))
            hashes.add(hashlib.sha256(cell.tobytes()).hexdigest())
            luminance = ImageStat.Stat(cell.convert("L"))
            if luminance.stddev[0] < 24:
                raise AssertionError(f"Skill cell {row},{column} lacks small-icon contrast")
            if not 18 <= luminance.mean[0] <= 118:
                raise AssertionError(f"Skill cell {row},{column} has an invalid dark-fantasy value range")

    if len(hashes) != COLS * ROWS:
        raise AssertionError("Every skill must have dedicated artwork; duplicate cells found")
    print("Beta skill atlas: 18 unique, high-contrast 256px icons in a deterministic 6x3 grid.")


if __name__ == "__main__":
    main()
