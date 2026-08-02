#!/usr/bin/env python3
"""Remove a magenta generation background while preserving soft sprite edges."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--soft-start", type=float, default=42.0)
    parser.add_argument("--opaque-at", type=float, default=105.0)
    args = parser.parse_args()

    source = np.asarray(Image.open(args.input).convert("RGBA"), dtype=np.float32).copy()
    rgb = source[:, :, :3]
    chroma = np.array([255.0, 0.0, 255.0], dtype=np.float32)
    distance = np.linalg.norm(rgb - chroma, axis=2)
    matte = np.clip((distance - args.soft_start) / (args.opaque_at - args.soft_start), 0.0, 1.0)
    source[:, :, 3] = np.minimum(source[:, :, 3], matte * 255.0)

    # Suppress pink fringe only on semi-transparent edge pixels.
    edge = (matte > 0.0) & (matte < 1.0)
    neutral_limit = np.maximum(rgb[:, :, 1] * 1.45, 35.0)
    rgb[:, :, 0][edge] = np.minimum(rgb[:, :, 0][edge], neutral_limit[edge])
    rgb[:, :, 2][edge] = np.minimum(rgb[:, :, 2][edge], neutral_limit[edge])

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(source, 0, 255).astype(np.uint8), "RGBA").save(destination)
    print(f"Wrote {destination} ({source.shape[1]}x{source.shape[0]})")


if __name__ == "__main__":
    main()
