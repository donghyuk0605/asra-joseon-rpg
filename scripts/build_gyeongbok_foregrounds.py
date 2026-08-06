#!/usr/bin/env python3
"""Build aligned palace and fortress object layers from the painted maps.

The maps already contain the correct architecture.  These alpha layers lift the
large gates, halls, walls, houses, and siege works out of the floor image so
actors can pass behind them without introducing a second, visually mismatched
reconstruction.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CAMPAIGN_DIR = ROOT / "public" / "assets" / "environment" / "campaign"
OUTPUT_DIR = CAMPAIGN_DIR / "foregrounds"


LAYERS = {
    "gyeongbok-gwanghwamun-v1.webp": {
        "gyeongbok-gwanghwamun-outer-gate-v2.webp": [
            ("rect", (0, 492, 560, 724)),
            ("rect", (390, 430, 1148, 724)),
            ("rect", (976, 492, 1536, 724)),
        ],
        "gyeongbok-gwanghwamun-inner-gate-v2.webp": [
            ("rect", (282, 38, 1254, 232)),
        ],
        "gyeongbok-gwanghwamun-side-compounds-v2.webp": [
            ("rect", (0, 300, 270, 735)),
            ("rect", (250, 165, 620, 590)),
            ("rect", (916, 165, 1286, 590)),
            ("rect", (1266, 300, 1536, 735)),
        ],
    },
    "gyeongbok-geunjeong-v1.webp": {
        "gyeongbok-geunjeong-south-gate-v2.webp": [
            ("rect", (0, 692, 1536, 900)),
            ("rect", (484, 622, 1052, 900)),
        ],
        "gyeongbok-geunjeong-hall-v2.webp": [
            ("polygon", ((364, 0), (1172, 0), (1172, 304), (1040, 346), (496, 346), (364, 304))),
        ],
        "gyeongbok-geunjeong-side-corridors-v2.webp": [
            ("rect", (0, 80, 480, 815)),
            ("rect", (1056, 80, 1536, 815)),
        ],
    },
    "gyeongbok-inner-v1.webp": {
        "gyeongbok-inner-south-gate-v2.webp": [
            ("rect", (0, 714, 1536, 1000)),
            ("rect", (478, 650, 1058, 1000)),
        ],
        "gyeongbok-inner-sajeong-hall-v2.webp": [
            ("polygon", ((486, 204), (1050, 204), (1050, 452), (965, 482), (571, 482), (486, 452))),
        ],
        "gyeongbok-inner-gangnyeong-hall-v2.webp": [
            ("polygon", ((506, 0), (1030, 0), (1030, 206), (960, 228), (576, 228), (506, 206))),
        ],
        "gyeongbok-inner-side-compounds-v2.webp": [
            ("rect", (0, 0, 560, 760)),
            ("rect", (976, 0, 1536, 760)),
        ],
    },
    "pyongyang-outer-v1.webp": {
        "pyongyang-outer-north-camps-v1.webp": [
            ("rect", (18, 140, 610, 430)),
            ("rect", (900, 140, 1536, 440)),
        ],
        "pyongyang-outer-rampart-v1.webp": [
            ("polygon", ((0, 348), (650, 348), (650, 326), (886, 326), (886, 348), (1536, 348), (1536, 614), (886, 614), (886, 532), (650, 532), (650, 614), (0, 614))),
        ],
        "pyongyang-outer-south-settlement-v1.webp": [
            ("rect", (0, 560, 610, 985)),
            ("rect", (910, 548, 1536, 985)),
        ],
    },
    "pyongyang-daedong-gate-v1.webp": {
        "pyongyang-daedong-north-works-v1.webp": [
            ("rect", (0, 0, 605, 270)),
            ("rect", (920, 0, 1325, 282)),
        ],
        "pyongyang-daedong-rampart-v1.webp": [
            ("polygon", ((0, 108), (610, 108), (610, 132), (930, 132), (930, 110), (1295, 110), (1295, 470), (885, 470), (885, 426), (650, 426), (650, 470), (0, 470))),
        ],
        "pyongyang-daedong-siegeworks-v1.webp": [
            ("rect", (0, 330, 570, 960)),
            ("rect", (965, 330, 1536, 960)),
        ],
    },
    "pyongyang-inner-v1.webp": {
        "pyongyang-inner-north-wall-v1.webp": [
            ("polygon", ((0, 0), (1536, 0), (1536, 188), (870, 188), (870, 150), (666, 150), (666, 188), (0, 188))),
        ],
        "pyongyang-inner-upper-compounds-v1.webp": [
            ("rect", (20, 88, 620, 465)),
            ("rect", (890, 70, 1516, 480)),
        ],
        "pyongyang-inner-lower-compounds-v1.webp": [
            ("rect", (0, 390, 585, 805)),
            ("rect", (930, 360, 1536, 805)),
        ],
        "pyongyang-inner-south-wall-v1.webp": [
            ("polygon", ((0, 690), (650, 690), (650, 795), (886, 795), (886, 690), (1536, 690), (1536, 930), (886, 930), (886, 868), (650, 868), (650, 930), (0, 930))),
        ],
    },
}


def build_layer(source: Image.Image, shapes: list[tuple[str, tuple]], destination: Path) -> None:
    mask = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(mask)
    for kind, points in shapes:
        if kind == "rect":
            draw.rectangle(points, fill=255)
        elif kind == "polygon":
            draw.polygon(points, fill=255)
        else:
            raise ValueError(f"Unsupported mask shape: {kind}")
    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.8))
    result = source.convert("RGBA")
    result.putalpha(mask)
    crop = mask.getbbox()
    if crop is None:
        raise ValueError(f"{destination.name}: empty foreground mask")
    result = result.crop(crop)
    destination.parent.mkdir(parents=True, exist_ok=True)
    result.save(destination, lossless=True, quality=86, method=6)


def main() -> None:
    for source_name, outputs in LAYERS.items():
        source = Image.open(CAMPAIGN_DIR / source_name)
        if source.size != (1536, 1024):
            raise ValueError(f"{source_name}: expected 1536x1024, got {source.size}")
        for output_name, shapes in outputs.items():
            build_layer(source, shapes, OUTPUT_DIR / output_name)
            print(OUTPUT_DIR / output_name)


if __name__ == "__main__":
    main()
