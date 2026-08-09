#!/usr/bin/env python3
"""Derive normalized world charm cutouts from the approved inventory artwork."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "public/assets/charms"
CANVAS = 256
CONTENT_EDGE = 216
ALPHA_THRESHOLD = 8

SOURCES = {
    "boar-tusk-charm": "public/assets/items/boar-tusk-charm-v4.png",
    "falcon-eye-bracer": "public/assets/items/falcon-eye-bracer-v1.png",
    "silver-tiger-charm": "public/assets/items/silver-tiger-charm-v4.png",
    "haetae-ward-charm": "public/assets/items/haetae-ward-charm-v2.png",
    "crane-feather-talisman": "public/assets/items/crane-feather-talisman-v2.png",
    "sea-salt-amulet": "public/assets/items/sea-salt-amulet-v2.png",
    "jaeryeong-fox-charm": "public/assets/items/episode2/episode2-jaeryeong-fox-charm-v1.png",
    "gapyeong-birch-talisman": "public/assets/items/episode2/episode2-gapyeong-birch-talisman-v1.png",
    "yangju-beacon-seal": "public/assets/items/episode2/episode2-yangju-beacon-seal-v1.png",
    "yeoju-river-jade": "public/assets/items/episode2/episode2-yeoju-river-jade-v1.png",
    "icheon-spirit-jar": "public/assets/items/episode2/episode2-icheon-spirit-jar-v1.png",
    "boryeong-tidal-anchor": "public/assets/items/episode2/episode2-boryeong-tidal-anchor-v1.png",
    "namwon-bamboo-flute": "public/assets/items/episode2/episode2-namwon-bamboo-flute-v1.png",
    "tongyeong-signal-drum": "public/assets/items/episode2/episode2-tongyeong-signal-drum-v1.png",
}


def subject_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").point(
        lambda value: 255 if value > ALPHA_THRESHOLD else 0,
    ).getbbox()
    if bbox is None:
        raise ValueError("empty charm source")
    return bbox


def normalized_cutout(source: Image.Image) -> Image.Image:
    source = source.convert("RGBA")
    left, top, right, bottom = subject_bbox(source)
    padding = 3
    crop = source.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(source.width, right + padding),
        min(source.height, bottom + padding),
    ))
    scale = min(CONTENT_EDGE / crop.width, CONTENT_EDGE / crop.height)
    crop = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    output.alpha_composite(crop, ((CANVAS - crop.width) // 2, (CANVAS - crop.height) // 2))
    transparent = output.getchannel("A").point(lambda value: 255 if value == 0 else 0)
    output.paste((0, 0, 0, 0), (0, 0, CANVAS, CANVAS), transparent)
    return output


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for item_id, relative_source in SOURCES.items():
        source_path = ROOT / relative_source
        output_path = OUTPUT_ROOT / f"{item_id}-world-v1.png"
        result = normalized_cutout(Image.open(source_path))
        result.save(output_path, format="PNG", optimize=True, compress_level=9)
        print(f"Wrote {output_path.relative_to(ROOT)}")
    print(f"Built {len(SOURCES)} normalized world charm cutouts")


if __name__ == "__main__":
    main()
