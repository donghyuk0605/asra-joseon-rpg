#!/usr/bin/env python3
"""Remove the light checkerboard sometimes baked into generated sprite previews."""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    image = np.asarray(Image.open(args.input).convert("RGBA")).copy()
    rgb = image[..., :3].astype(np.int16)
    low = rgb.min(axis=2)
    spread = rgb.max(axis=2) - low
    background = (low >= 224) & (spread <= 13)
    edge = (low >= 206) & (spread <= 17) & ~background
    image[background, 3] = 0
    image[edge, 3] = np.clip((224 - low[edge]) * 14, 0, 255).astype(np.uint8)

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(image, "RGBA").save(destination)
    print(f"Wrote {destination} ({image.shape[1]}x{image.shape[0]})")


if __name__ == "__main__":
    main()
