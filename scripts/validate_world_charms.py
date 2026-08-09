#!/usr/bin/env python3
"""Validate the complete player charm world-image set."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CHARM_ROOT = ROOT / "public/assets/charms"
ITEM_IDS = (
    "boar-tusk-charm",
    "falcon-eye-bracer",
    "silver-tiger-charm",
    "haetae-ward-charm",
    "crane-feather-talisman",
    "sea-salt-amulet",
    "jaeryeong-fox-charm",
    "gapyeong-birch-talisman",
    "yangju-beacon-seal",
    "yeoju-river-jade",
    "icheon-spirit-jar",
    "boryeong-tidal-anchor",
    "namwon-bamboo-flute",
    "tongyeong-signal-drum",
)


def main() -> None:
    expected = {f"{item_id}-world-v1.png" for item_id in ITEM_IDS}
    actual = {path.name for path in CHARM_ROOT.glob("*.png")}
    if actual != expected:
        raise AssertionError(f"world charm file mismatch: missing={sorted(expected - actual)}, extra={sorted(actual - expected)}")

    hashes: set[str] = set()
    for item_id in ITEM_IDS:
        path = CHARM_ROOT / f"{item_id}-world-v1.png"
        with Image.open(path) as opened:
            image = opened.convert("RGBA")
        if image.size != (256, 256):
            raise AssertionError(f"{path.name}: expected 256x256, got {image.size}")
        alpha = image.getchannel("A")
        if any(alpha.getpixel(point) != 0 for point in ((0, 0), (255, 0), (0, 255), (255, 255))):
            raise AssertionError(f"{path.name}: opaque corner")
        bbox = alpha.point(lambda value: 255 if value > 16 else 0).getbbox()
        if bbox is None:
            raise AssertionError(f"{path.name}: empty cutout")
        width, height = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if max(width, height) > 216 or max(width, height) < 196:
            raise AssertionError(f"{path.name}: unexpected content bounds {width}x{height}")
        opaque = sum(alpha.histogram()[17:])
        if opaque < 1_000:
            raise AssertionError(f"{path.name}: silhouette too sparse ({opaque} pixels)")
        hashes.add(hashlib.sha256(image.tobytes()).hexdigest())

    if len(hashes) != len(ITEM_IDS):
        raise AssertionError("world charm cutouts are not visually distinct")
    print(f"Validated {len(ITEM_IDS)} distinct 256px world charms")


if __name__ == "__main__":
    main()
