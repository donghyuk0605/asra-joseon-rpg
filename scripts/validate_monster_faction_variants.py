#!/usr/bin/env python3
"""Validate dedicated monster variants and their immutable motion contract."""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
from PIL import Image

from build_monster_faction_variants import COLS, EXPECTED_SIZE, FRAME, MONSTERS, ROWS, SPECS


ALPHA_THRESHOLD = 16
FOOTLINE = 248


def digest(image: Image.Image) -> str:
    return hashlib.sha256(image.tobytes()).hexdigest()


def main() -> None:
    output_hashes: set[str] = set()
    source_cache: dict[str, Image.Image] = {}

    for spec in SPECS:
        source = source_cache.setdefault(spec.source, Image.open(MONSTERS / spec.source).convert("RGBA"))
        output_path = MONSTERS / spec.output
        if not output_path.exists():
            raise SystemExit(f"missing {output_path}")
        output = Image.open(output_path).convert("RGBA")
        if output.size != EXPECTED_SIZE:
            raise SystemExit(f"{spec.output}: {output.size}")
        if digest(output) == digest(source):
            raise SystemExit(f"{spec.output}: identical to {spec.source}")
        if digest(output) in output_hashes:
            raise SystemExit(f"{spec.output}: duplicate generated atlas")
        output_hashes.add(digest(output))

        source_rgba = np.asarray(source, dtype=np.uint8)
        output_rgba = np.asarray(output, dtype=np.uint8)
        if not np.array_equal(source_rgba[..., 3], output_rgba[..., 3]):
            raise SystemExit(f"{spec.output}: alpha or silhouette changed")
        visible = output_rgba[..., 3] > ALPHA_THRESHOLD
        changed = np.any(source_rgba[..., :3] != output_rgba[..., :3], axis=2) & visible
        if changed.sum() < visible.sum() * 0.38:
            raise SystemExit(f"{spec.output}: material change too subtle")

        for row in range(ROWS):
            for column in range(COLS):
                y0, x0 = row * FRAME, column * FRAME
                alpha = output_rgba[y0:y0 + FRAME, x0:x0 + FRAME, 3]
                ys, _ = np.where(alpha > ALPHA_THRESHOLD)
                if not len(ys):
                    raise SystemExit(f"{spec.output}: empty frame {row},{column}")
                if int(ys.max()) != FOOTLINE:
                    raise SystemExit(f"{spec.output}: footline {int(ys.max())} at {row},{column}")

    print(f"Validated {len(SPECS)} unique 8x5 faction and species monster atlases")


if __name__ == "__main__":
    main()
