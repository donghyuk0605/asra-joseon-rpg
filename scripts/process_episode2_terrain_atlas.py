#!/usr/bin/env python3
"""Extract six Episode II top-down terrain bases and one reusable water bank."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


PANEL_NAMES = (
    "episode2-northwest-road-base-v1.webp",
    "episode2-mountain-road-base-v1.webp",
    "episode2-central-river-base-v1.webp",
    "episode2-west-coast-base-v1.webp",
    "episode2-honam-road-base-v1.webp",
    "episode2-yeongnam-road-base-v1.webp",
)


def panel_box(image: Image.Image, index: int) -> tuple[int, int, int, int]:
    column = index % 2
    row = index // 2
    left = round(image.width * column / 2)
    right = round(image.width * (column + 1) / 2)
    top = round(image.height * row / 3)
    bottom = round(image.height * (row + 1) / 3)
    # Exclude the light atlas separators while preserving the painted edges.
    return left + (2 if column else 0), top + (2 if row else 0), right, bottom


def map_aspect_crop(panel: Image.Image) -> Image.Image:
    target_aspect = 3 / 2
    width = min(panel.width, round(panel.height * target_aspect))
    left = (panel.width - width) // 2
    return panel.crop((left, 0, left + width, panel.height))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGB")
    destination = Path(args.out_dir)
    destination.mkdir(parents=True, exist_ok=True)

    raw_panels: list[Image.Image] = []
    for index, filename in enumerate(PANEL_NAMES):
        raw = source.crop(panel_box(source, index))
        raw_panels.append(raw)
        terrain = map_aspect_crop(raw).resize((1536, 1024), Image.Resampling.LANCZOS)
        path = destination / filename
        terrain.save(path, "WEBP", quality=88, method=6)
        print(f"Wrote {path} ({terrain.width}x{terrain.height})")

    # The central-river painting already contains a natural water-to-grass edge.
    # Preserve that edge as a vertical raster component; right banks flip it.
    river = raw_panels[2]
    bank_right = min(river.width, round(river.width * 0.39))
    bank = river.crop((0, 0, bank_right, river.height)).resize((256, 1024), Image.Resampling.LANCZOS)
    bank_path = destination / "episode2-water-bank-v1.webp"
    bank.save(bank_path, "WEBP", quality=90, method=6)
    print(f"Wrote {bank_path} ({bank.width}x{bank.height})")


if __name__ == "__main__":
    main()
