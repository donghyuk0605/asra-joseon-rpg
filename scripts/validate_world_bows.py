#!/usr/bin/env python3
"""Validate the dedicated world bow image fleet."""

from hashlib import sha256
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public/assets/weapons"
NAMES = (
    "frontier-horn-bow-world-v1.png",
    "white-birch-bow-world-v1.png",
    "iron-horn-warbow-world-v1.png",
    "thunderbird-bow-world-v1.png",
    "northwind-warbow-world-v1.png",
    "gangneung-sea-bow-world-v1.png",
    "uiju-black-horn-bow-world-v1.png",
    "samcheok-seawind-bow-world-v1.png",
)


def main() -> None:
    hashes = set()
    for name in NAMES:
        path = OUTPUT_DIR / name
        if not path.exists():
            raise AssertionError(f"missing world bow: {path}")
        image = Image.open(path).convert("RGBA")
        if image.size != (256, 256):
            raise AssertionError(f"{name}: expected 256x256, got {image.size}")
        alpha = image.getchannel("A")
        if any(alpha.getpixel(point) != 0 for point in ((0, 0), (255, 0), (0, 255), (255, 255))):
            raise AssertionError(f"{name}: corners must be transparent")
        bbox = alpha.getbbox()
        if bbox is None:
            raise AssertionError(f"{name}: empty image")
        longest = max(bbox[2] - bbox[0], bbox[3] - bbox[1])
        if not 226 <= longest <= 234:
            raise AssertionError(f"{name}: normalized long edge is {longest}px")
        if sum(alpha.histogram()[17:]) < 1_000:
            raise AssertionError(f"{name}: too few visible pixels")
        hashes.add(sha256(path.read_bytes()).hexdigest())
    if len(hashes) != len(NAMES):
        raise AssertionError("world bow outputs must be visually distinct files")
    print(f"Validated {len(NAMES)} distinct 256px world bows")


if __name__ == "__main__":
    main()
