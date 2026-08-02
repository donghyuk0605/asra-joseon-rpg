#!/usr/bin/env python3
"""Render legacy item SVG icons into the production item icon set."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "legacy" / "items"
DEST_DIR = ROOT / "public" / "assets" / "items"

DEFAULT_MAPPING = {
    "worn-hwando.svg": "worn-hwando-v4.png",
    "dokkaebi-club.svg": "dokkaebi-club-v4.png",
    "hunter-durumagi.svg": "hunter-durumagi-v4.png",
    "boar-tusk-charm.svg": "boar-tusk-charm-v4.png",
}


def render_source_to_png(source: Path, destination: Path, size: int = 160, content_size: int = 138) -> None:
    if source.suffix == ".svg":
        temp = destination.with_suffix(".rendered.png")
        subprocess.run(
            ["rsvg-convert", "-w", "256", "-h", "256", str(source), "-o", str(temp)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        image = Image.open(temp).convert("RGBA")
        temp.unlink(missing_ok=True)
    else:
        image = Image.open(source).convert("RGBA")

    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        normalized = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        image = image.crop(bbox)
        scale = min(content_size / image.width, content_size / image.height)
        resized = image.resize((max(1, int(image.width * scale)), max(1, int(image.height * scale))))
        normalized = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        normalized.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2), resized)

    destination.parent.mkdir(parents=True, exist_ok=True)
    normalized.save(destination, optimize=True)


def resolve_source(item_name: str) -> Path:
    source = SOURCE_DIR / item_name
    if source.exists():
        return source
    fallback = SOURCE_DIR / f"{Path(item_name).stem}.png"
    if fallback.exists():
        print(f"Fallback to PNG source for {item_name}: {fallback}")
        return fallback
    raise FileNotFoundError(f"Missing source for icon set render: {source} and fallback {fallback}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--item", action="append", default=None, metavar="NAME")
    parser.add_argument("--size", type=int, default=160, help="Output tile size in pixels")
    parser.add_argument("--content", type=int, default=138, help="Max content area inside each icon tile")
    args = parser.parse_args()

    selected = args.item or list(DEFAULT_MAPPING.keys())
    for item in selected:
        source_name = item if item.endswith(".svg") else f"{item}.svg"
        source = resolve_source(source_name)
        output_name = DEFAULT_MAPPING.get(source_name, source.stem + "-v4.png")
        destination = DEST_DIR / output_name
        render_source_to_png(source, destination, size=args.size, content_size=args.content)
        print(f"Wrote {destination}")


if __name__ == "__main__":
    main()
