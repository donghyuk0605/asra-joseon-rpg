#!/usr/bin/env python3
"""Clean generated magenta-backed atlases without leaving neon edge spill.

The ordinary Euclidean chroma key is intentionally conservative. Generated
art often contains compressed pink/purple halos that are far away from pure
``#ff00ff`` while still belonging to the background. This pass keys by hue and
magenta dominance, then decontaminates only the soft boundary pixels.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--hard-score", type=float, default=58.0)
    parser.add_argument("--soft-score", type=float, default=22.0)
    args = parser.parse_args()

    source = np.asarray(Image.open(args.input).convert("RGBA"), dtype=np.float32).copy()
    rgb = source[:, :, :3]
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    # Pink background remnants have both red and blue above green. Requiring
    # both channels prevents brown timber, red cloth and blue water from being
    # keyed merely because one channel happens to be strong.
    magenta_floor = np.minimum(red, blue)
    magenta_score = magenta_floor - green
    chroma_strength = np.maximum.reduce((red, green, blue)) - np.minimum.reduce((red, green, blue))
    candidate = (magenta_floor > 46.0) & (magenta_score > args.soft_score) & (chroma_strength > 28.0)

    matte = np.ones_like(magenta_score, dtype=np.float32)
    matte[candidate] = np.clip(
        (args.hard_score - magenta_score[candidate]) / (args.hard_score - args.soft_score),
        0.0,
        1.0,
    )
    source[:, :, 3] = np.minimum(source[:, :, 3], matte * 255.0)

    # Neutralise the last pink halo on partially transparent pixels. Do not
    # recolour opaque art: this only touches pixels already identified as
    # chroma contamination.
    edge = candidate & (matte > 0.0) & (matte < 1.0)
    neutral = np.maximum(green * 1.12, (red + green + blue) / 3.0 * 0.72)
    red[edge] = np.minimum(red[edge], neutral[edge])
    blue[edge] = np.minimum(blue[edge], neutral[edge])

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(source, 0, 255).astype(np.uint8), "RGBA").save(destination)
    removed = int(np.count_nonzero(source[:, :, 3] < 1.0))
    print(f"Wrote {destination} ({source.shape[1]}x{source.shape[0]}), transparent pixels {removed}")


if __name__ == "__main__":
    main()
