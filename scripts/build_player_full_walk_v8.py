#!/usr/bin/env python3
"""Install the approved full directional walk atlas into the player bodies.

The image-generation result is source material only. This installer consumes
the already chroma-removed and normalized 4x5 atlas, copies its walk poses into
the fixed 8x5 runtime grid, and preserves every approved attack frame exactly.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
FRAME = 256
ROWS = 5
COLS = 8
WALK_COLS = 4
RUNTIME_SIZE = (COLS * FRAME, ROWS * FRAME)
WALK_SIZE = (WALK_COLS * FRAME, ROWS * FRAME)
FOOT_BASELINE = FRAME - 7

SOURCE_WALK = (
    ROOT
    / "assets/sprites/joseon-hero-components-v10/processed/full-walk-normalized-v2.png"
)
PREVIOUS_BASE = ROOT / "public/assets/characters/joseon-hero-base-body-v7.png"
PREVIOUS_READY = (
    ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v2.png"
)
OUTPUT_BASE = ROOT / "public/assets/characters/joseon-hero-base-body-v8.png"
OUTPUT_READY = (
    ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v3.png"
)


def frame(atlas: Image.Image, row: int, column: int) -> Image.Image:
    return atlas.crop(
        (
            column * FRAME,
            row * FRAME,
            (column + 1) * FRAME,
            (row + 1) * FRAME,
        )
    )


def open_rgba(path: Path, expected_size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.size != expected_size:
        raise ValueError(
            f"{path.name} must be {expected_size[0]}x{expected_size[1]}, "
            f"got {image.size[0]}x{image.size[1]}"
        )
    return image


def assert_grounded(walk: Image.Image) -> None:
    for row in range(ROWS):
        for column in range(WALK_COLS):
            pose = frame(walk, row, column)
            box = pose.getchannel("A").getbbox()
            if box is None:
                raise ValueError(f"Empty walk frame at row={row}, column={column}")
            if box[3] != FOOT_BASELINE:
                raise ValueError(
                    f"Walk frame {row},{column} bottom={box[3]} "
                    f"must equal foot baseline {FOOT_BASELINE}"
                )


def install(previous_path: Path, output_path: Path, walk: Image.Image) -> None:
    previous = open_rgba(previous_path, RUNTIME_SIZE)
    candidate = previous.copy()
    for row in range(ROWS):
        for column in range(WALK_COLS):
            pose = frame(walk, row, column)
            candidate.paste(pose, (column * FRAME, row * FRAME))

    for row in range(ROWS):
        for column in range(WALK_COLS, COLS):
            if ImageChops.difference(
                frame(candidate, row, column),
                frame(previous, row, column),
            ).getbbox() is not None:
                raise ValueError(
                    f"{output_path.name} changed approved attack frame "
                    f"{row},{column}"
                )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    candidate.save(output_path, optimize=True)
    print(f"Wrote {output_path.relative_to(ROOT)}")


def main() -> None:
    walk = open_rgba(SOURCE_WALK, WALK_SIZE)
    assert_grounded(walk)
    install(PREVIOUS_BASE, OUTPUT_BASE, walk)
    install(PREVIOUS_READY, OUTPUT_READY, walk)


if __name__ == "__main__":
    main()
