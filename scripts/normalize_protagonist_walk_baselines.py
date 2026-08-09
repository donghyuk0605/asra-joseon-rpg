#!/usr/bin/env python3
"""Ground protagonist walk frames without altering their approved attacks."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / "public/assets/characters"
FRAME = 256
ROWS = 5
WALK_COLUMNS = 4
FOOT_BASELINE = FRAME - 7
ATLASES = (
    ("osaka-mudang-actions-v1.png", "osaka-mudang-actions-v2.png"),
    ("harlan-melee-ready-actions-v1.png", "hajin-frontier-melee-actions-v2.png"),
)
HAJIN_MELEE_GAIT_ORDER = {
    # The source rows 2 and 4 hid their strongest opposite-foot contact in
    # column 1. Put that pose in contact column 2 while retaining frame 0 as
    # the stable idle pose used by the runtime.
    2: (0, 2, 1, 3),
    4: (0, 2, 1, 3),
}


def grounded_walk(source_path: Path) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    expected = (FRAME * 8, FRAME * ROWS)
    if source.size != expected:
        raise AssertionError(f"{source_path.name} must be {expected}, got {source.size}")
    result = source.copy()
    for row in range(ROWS):
        order = HAJIN_MELEE_GAIT_ORDER.get(row, (0, 1, 2, 3)) \
            if source_path.name == "harlan-melee-ready-actions-v1.png" else (0, 1, 2, 3)
        for column in range(WALK_COLUMNS):
            box = (column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME)
            source_column = order[column]
            pose = source.crop((
                source_column * FRAME,
                row * FRAME,
                (source_column + 1) * FRAME,
                (row + 1) * FRAME,
            ))
            bounds = pose.getchannel("A").getbbox()
            if bounds is None:
                raise AssertionError(f"{source_path.name} has an empty walk pose at {row},{column}")
            shift = FOOT_BASELINE - bounds[3]
            if shift < 0 or shift > 4:
                raise AssertionError(
                    f"{source_path.name} walk pose {row},{column} needs unsafe baseline shift {shift}"
                )
            cell = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
            cell.alpha_composite(pose, (0, shift))
            result.paste(cell, box)
    return result


def main() -> None:
    for source_name, output_name in ATLASES:
        output = grounded_walk(CHARACTERS / source_name)
        output_path = CHARACTERS / output_name
        output.save(output_path, optimize=True)
        print(f"Wrote {output_path.relative_to(ROOT)} with grounded walk frames")


if __name__ == "__main__":
    main()
