#!/usr/bin/env python3
"""Feather the three open-field tiles into the central village world edges."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path("public/assets/environment")
CENTRAL = ROOT / "moonshadow-village-world-v1.png"
VILLAGE_TOP = 896
FEATHER = 256


def mix(a: tuple[int, ...], b: tuple[int, ...], weight: float) -> tuple[int, ...]:
    return tuple(round(left * (1.0 - weight) + right * weight) for left, right in zip(a, b))


def feather_west(central: Image.Image) -> None:
    tile = Image.open(ROOT / "mistwood-village-transition-v1.png").convert("RGBA")
    pixels = tile.load()
    source = central.load()
    for local_y in range(tile.height):
        central_y = VILLAGE_TOP + local_y
        for distance in range(FEATHER):
            tile_x = tile.width - 1 - distance
            weight = 1.0 - distance / (FEATHER - 1)
            pixels[tile_x, local_y] = mix(pixels[tile_x, local_y], source[distance, central_y], weight)
    tile.save(ROOT / "mistwood-village-feathered-v2.png")


def feather_east(central: Image.Image) -> None:
    tile = Image.open(ROOT / "village-minepass-transition-v1.png").convert("RGBA")
    pixels = tile.load()
    source = central.load()
    for local_y in range(tile.height):
        central_y = VILLAGE_TOP + local_y
        for distance in range(FEATHER):
            weight = 1.0 - distance / (FEATHER - 1)
            central_x = central.width - 1 - distance
            pixels[distance, local_y] = mix(pixels[distance, local_y], source[central_x, central_y], weight)
    tile.save(ROOT / "village-minepass-feathered-v2.png")


def feather_south(central: Image.Image) -> None:
    tile = Image.open(ROOT / "village-moonfield-transition-v1.png").convert("RGBA")
    pixels = tile.load()
    source = central.load()
    for distance in range(FEATHER):
        weight = 1.0 - distance / (FEATHER - 1)
        central_y = central.height - 1 - distance
        for x in range(tile.width):
            pixels[x, distance] = mix(pixels[x, distance], source[x, central_y], weight)
    tile.save(ROOT / "village-moonfield-feathered-v2.png")


def main() -> None:
    central = Image.open(CENTRAL).convert("RGBA")
    feather_west(central)
    feather_east(central)
    feather_south(central)
    print("Wrote feathered open-world transition tiles")


if __name__ == "__main__":
    main()
