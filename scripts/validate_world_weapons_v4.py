#!/usr/bin/env python3
"""Validate normalized beta world weapons before runtime use."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from PIL import Image


ROOT = Path("public/assets/weapons")
ITEM_IDS = (
    "bear-claw-gauntlet",
    "chiaksan-claw-knife",
    "saltfield-ritual-knife",
    "geoje-anchor-hwando",
    "hwangju-moonsteel-spear",
    "pyeongchang-leopard-knife",
    "cheongju-kiln-hwando",
    "gunsan-drowned-blade",
)


def main() -> None:
    hashes: set[str] = set()
    for item_id in ITEM_IDS:
        path = ROOT / f"{item_id}-world-v1.png"
        image = Image.open(path).convert("RGBA")
        if image.size != (256, 256):
            raise ValueError(f"Invalid frame size: {path} {image.size}")
        alpha = image.getchannel("A")
        bounds = alpha.getbbox()
        if bounds is None or bounds[0] < 4 or bounds[1] < 4 or bounds[2] > 252 or bounds[3] > 252:
            raise ValueError(f"Invalid transparent margin: {path} {bounds}")
        if any(image.getpixel(point)[3] != 0 for point in ((0, 0), (255, 0), (0, 255), (255, 255))):
            raise ValueError(f"Opaque corner: {path}")
        opaque = sum(1 for value in alpha.getdata() if value > 16)
        if opaque < 2_000:
            raise ValueError(f"Unreadable silhouette: {path} {opaque}")
        grip_pixels = sum(
            1
            for y in range(42, 59)
            for x in range(120, 137)
            if alpha.getpixel((x, y)) > 32
        )
        if grip_pixels < 80:
            raise ValueError(f"Detached shared grip: {path} {grip_pixels}")
        hashes.add(sha256(path.read_bytes()).hexdigest())
    if len(hashes) != len(ITEM_IDS):
        raise ValueError("World weapon outputs are not visually distinct")
    print(f"Validated {len(ITEM_IDS)} distinct 256px world weapons with transparent margins and shared grip")


if __name__ == "__main__":
    main()
