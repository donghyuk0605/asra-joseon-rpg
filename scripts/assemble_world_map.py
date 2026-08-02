#!/usr/bin/env python3
"""Assemble the hunting field and village into one feather-blended world texture."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FIELD = ROOT / "public/assets/environment/moonshadow-ridge.png"
VILLAGE = ROOT / "public/assets/environment/joseon-village-v1.png"
OUTPUT = ROOT / "public/assets/environment/moonshadow-village-world-v1.png"
OVERLAP = 128


def main() -> None:
    field = Image.open(FIELD).convert("RGBA")
    village = Image.open(VILLAGE).convert("RGBA")
    if field.size != village.size:
        raise ValueError(f"Map sizes must match: field={field.size}, village={village.size}")

    width, map_height = field.size
    village_top = map_height - OVERLAP
    world = Image.new("RGBA", (width, village_top + map_height), (18, 20, 16, 255))
    world.alpha_composite(field, (0, 0))

    alpha = Image.new("L", village.size, 255)
    alpha_pixels = alpha.load()
    for y in range(OVERLAP):
        # Smoothstep avoids a visible density change at either end of the overlap.
        t = y / (OVERLAP - 1)
        smooth = t * t * (3 - 2 * t)
        value = round(255 * smooth)
        for x in range(width):
            alpha_pixels[x, y] = value
    village.putalpha(alpha)
    world.alpha_composite(village, (0, village_top))
    world.convert("RGB").save(OUTPUT, quality=95, optimize=True)
    print(f"saved {OUTPUT} ({world.width}x{world.height})")


if __name__ == "__main__":
    main()

