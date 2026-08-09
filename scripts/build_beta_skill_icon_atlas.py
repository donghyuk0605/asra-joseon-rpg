#!/usr/bin/env python3
"""Normalize the approved 6x3 beta skill concept sheet for the runtime HUD."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/sprites/beta-skills-v1/source/beta-skill-icon-sheet-v1.png"
OUTPUT = ROOT / "public/assets/ui/skills/beta-skill-icon-atlas-v1.webp"
COLS = 6
ROWS = 3
ICON = 256


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    if source.width % COLS:
        raise AssertionError(f"Expected {COLS} equal source columns, got {source.size}")

    source_cell_width = source.width // COLS
    atlas = Image.new("RGB", (COLS * ICON, ROWS * ICON), (4, 5, 5))
    for row in range(ROWS):
        for column in range(COLS):
            top = round(row * source.height / ROWS)
            bottom = round((row + 1) * source.height / ROWS)
            cell = source.crop((
                column * source_cell_width,
                top,
                (column + 1) * source_cell_width,
                bottom,
            ))
            # The generated contact sheet uses rectangular cells because its
            # source canvas is 3:2. Each authored emblem already has generous
            # safe margins, so a high-quality cell resize preserves the frame
            # while giving CSS an exact 256px square grid.
            atlas.paste(
                cell.resize((ICON, ICON), Image.Resampling.LANCZOS),
                (column * ICON, row * ICON),
            )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT, "WEBP", quality=90, method=6)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({atlas.width}x{atlas.height}, {COLS * ROWS} icons)")


if __name__ == "__main__":
    main()
