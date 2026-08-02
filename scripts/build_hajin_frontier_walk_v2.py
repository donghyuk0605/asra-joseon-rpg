#!/usr/bin/env python3
"""Install Hajin's modeled five-direction walk while preserving bow attacks."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
FRAME = 256
ROWS = 5
COLS = 8
WALK_COLS = 4
FOOT_BASELINE = FRAME - 7
RUNTIME_SIZE = (COLS * FRAME, ROWS * FRAME)
WALK_SIZE = (WALK_COLS * FRAME, ROWS * FRAME)

SOURCE_WALK = (
    ROOT
    / "assets/sprites/hajin-frontier-archer-v2/processed/full-walk-normalized-v1.png"
)
PREVIOUS = ROOT / "public/assets/characters/harlan-frontier-archer-actions-v1.png"
OUTPUT = ROOT / "public/assets/characters/hajin-frontier-archer-actions-v2.png"


def frame(atlas: Image.Image, row: int, column: int) -> Image.Image:
    return atlas.crop(
        (
            column * FRAME,
            row * FRAME,
            (column + 1) * FRAME,
            (row + 1) * FRAME,
        )
    )


def grounded(pose: Image.Image, row: int, column: int) -> Image.Image:
    box = pose.getchannel("A").getbbox()
    if box is None:
        raise ValueError(f"Empty Hajin walk pose {row},{column}")
    shifted = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    shifted.alpha_composite(pose, (0, FOOT_BASELINE - box[3]))
    result_box = shifted.getchannel("A").getbbox()
    if result_box is None or result_box[3] != FOOT_BASELINE:
        raise ValueError(f"Hajin walk pose {row},{column} missed the foot baseline")
    return shifted


def main() -> None:
    source = Image.open(SOURCE_WALK).convert("RGBA")
    previous = Image.open(PREVIOUS).convert("RGBA")
    if source.size != WALK_SIZE:
        raise ValueError(f"Walk source must be {WALK_SIZE}, got {source.size}")
    if previous.size != RUNTIME_SIZE:
        raise ValueError(f"Previous atlas must be {RUNTIME_SIZE}, got {previous.size}")

    candidate = previous.copy()
    for row in range(ROWS):
        for column in range(WALK_COLS):
            candidate.paste(
                grounded(frame(source, row, column), row, column),
                (column * FRAME, row * FRAME),
            )

    for row in range(ROWS):
        for column in range(WALK_COLS, COLS):
            if ImageChops.difference(
                frame(candidate, row, column),
                frame(previous, row, column),
            ).getbbox() is not None:
                raise ValueError(f"Approved bow attack frame {row},{column} changed")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    candidate.save(OUTPUT, optimize=True)
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
