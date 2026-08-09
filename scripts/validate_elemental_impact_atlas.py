#!/usr/bin/env python3
"""Validate source transparency and the runtime elemental impact atlas."""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
from PIL import Image

from build_elemental_impact_atlas import ELEMENTS, FRAME, FRAMES_PER_ELEMENT, OUTPUT, ROOT, SOURCE_DIR


ALPHA_THRESHOLD = 16


def digest(image: Image.Image) -> str:
    return hashlib.sha256(image.tobytes()).hexdigest()


def assert_no_key_spill(name: str, rgba: np.ndarray) -> None:
    visible = rgba[..., 3] > ALPHA_THRESHOLD
    rgb = rgba[..., :3]
    green = visible & (rgb[..., 1] > 210) & (rgb[..., 1] > rgb[..., 0] * 1.7) & (rgb[..., 1] > rgb[..., 2] * 1.7)
    magenta = visible & (rgb[..., 0] > 210) & (rgb[..., 2] > 210) & (rgb[..., 1] < 70)
    if int(green.sum() + magenta.sum()) > max(24, int(visible.sum() * 0.0015)):
        raise SystemExit(f"{name}: chroma-key spill remains")


def main() -> None:
    source_hashes: set[str] = set()
    for element in ELEMENTS:
        source = Image.open(SOURCE_DIR / f"{element}-alpha-v1.png").convert("RGBA")
        rgba = np.asarray(source, dtype=np.uint8)
        if np.any(rgba[[0, -1], :, 3]) or np.any(rgba[:, [0, -1], 3]):
            raise SystemExit(f"{element}: source touches an outer edge")
        assert_no_key_spill(element, rgba)
        source_hashes.add(digest(source))
    if len(source_hashes) != len(ELEMENTS):
        raise SystemExit("element sources must be byte-distinct")

    atlas = Image.open(OUTPUT).convert("RGBA")
    expected_size = (FRAME * FRAMES_PER_ELEMENT, FRAME * len(ELEMENTS))
    if atlas.size != expected_size:
        raise SystemExit(f"atlas: expected {expected_size}, got {atlas.size}")
    rgba = np.asarray(atlas, dtype=np.uint8)
    assert_no_key_spill("atlas", rgba)

    frame_hashes: set[str] = set()
    for row, element in enumerate(ELEMENTS):
        row_areas: list[int] = []
        for column in range(FRAMES_PER_ELEMENT):
            x0, y0 = column * FRAME, row * FRAME
            cell = rgba[y0:y0 + FRAME, x0:x0 + FRAME]
            alpha = cell[..., 3]
            ys, xs = np.where(alpha > ALPHA_THRESHOLD)
            if not len(xs):
                raise SystemExit(f"{element}: empty frame {column}")
            width = int(xs.max() - xs.min() + 1)
            height = int(ys.max() - ys.min() + 1)
            if width > 240 or height > 240 or xs.min() < 8 or ys.min() < 8 or xs.max() > 247 or ys.max() > 247:
                raise SystemExit(f"{element}: unsafe bounds {width}x{height} in frame {column}")
            frame = Image.fromarray(cell, "RGBA")
            frame_hashes.add(digest(frame))
            row_areas.append(int((alpha > ALPHA_THRESHOLD).sum()))
        if not row_areas[0] < row_areas[1] < row_areas[2]:
            raise SystemExit(f"{element}: anticipation frames do not expand {row_areas}")
    if len(frame_hashes) != len(ELEMENTS) * FRAMES_PER_ELEMENT:
        raise SystemExit("all 28 elemental animation frames must be distinct")
    print("Validated 7 elemental sources and 28 normalized runtime frames")


if __name__ == "__main__":
    main()
