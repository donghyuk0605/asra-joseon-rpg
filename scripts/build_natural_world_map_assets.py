#!/usr/bin/env python3
"""Normalize authored world maps and build alpha-feathered seam paintings."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets" / "environment"
PUBLIC_ROOT = ROOT / "public" / "assets" / "environment"
MAP_SIZE = (1536, 1024)
SEAM_SIZE = (1536, 768)
SEAM_FADE = 210
JOSEON_SEAM_HEIGHT = 320


SEAMS = (
    (
        "transitions/settsu-osaka-transition-source-v1.png",
        "transitions/settsu-osaka-transition-v1.webp",
        5,
    ),
    (
        "transitions/jurchen-frontier-transition-source-v1.png",
        "transitions/jurchen-frontier-transition-v1.webp",
        11,
    ),
)


JOSEON_SEAMS = (
    (
        "gaeseong-songdo-v1.webp",
        "changdeokgung-audience-v2.webp",
        "transitions/joseon-gaeseong-changdeokgung-v2.webp",
    ),
    (
        "changdeokgung-audience-v2.webp",
        "hanseong-unjongga-v1.webp",
        "transitions/joseon-changdeokgung-unjongga-v2.webp",
    ),
    (
        "hanseong-unjongga-v1.webp",
        "hanseong-sungnyemun-v2.webp",
        "transitions/joseon-unjongga-sungnyemun-v2.webp",
    ),
    (
        "hanseong-sungnyemun-v2.webp",
        "suwon-dohobu-v1.webp",
        "transitions/joseon-sungnyemun-suwon-v2.webp",
    ),
    (
        "suwon-dohobu-v1.webp",
        "chungju-mokgye-v1.webp",
        "transitions/joseon-suwon-chungju-v2.webp",
    ),
    (
        "chungju-mokgye-v1.webp",
        "andong-seowon-v1.webp",
        "transitions/joseon-chungju-andong-v2.webp",
    ),
)


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def organic_outer_mask(width: int, height: int, seed: int) -> Image.Image:
    """Keep the painted middle opaque while dissolving both map-facing edges."""
    mask = Image.new("L", (width, height), 255)
    pixels = mask.load()
    for x in range(width):
        wave = (
            math.sin(x * 0.0097 + seed * 0.81) * 18
            + math.sin(x * 0.0261 + seed * 1.37) * 8
            + math.sin(x * 0.051 + seed * 0.43) * 3
        )
        for y in range(height):
            top_alpha = smoothstep((y + wave) / SEAM_FADE)
            bottom_alpha = smoothstep((height - 1 - y - wave) / SEAM_FADE)
            pixels[x, y] = round(255 * min(top_alpha, bottom_alpha))
    return mask.filter(ImageFilter.GaussianBlur(radius=6))


def build_seam(source_relative: str, output_relative: str, seed: int) -> None:
    source = Image.open(SOURCE_ROOT / source_relative).convert("RGB")
    painted = source.resize(SEAM_SIZE, Image.Resampling.LANCZOS).convert("RGBA")
    painted.putalpha(organic_outer_mask(*SEAM_SIZE, seed))
    output = PUBLIC_ROOT / output_relative
    output.parent.mkdir(parents=True, exist_ok=True)
    painted.save(output, "WEBP", quality=88, method=6)


def build_awaji_coast() -> None:
    source = Image.open(
        SOURCE_ROOT / "campaign" / "awaji-coast-source-v2.png"
    ).convert("RGB")
    background = source.resize(MAP_SIZE, Image.Resampling.LANCZOS)
    output = PUBLIC_ROOT / "campaign" / "awaji-coast-v2.webp"
    output.parent.mkdir(parents=True, exist_ok=True)
    background.save(output, "WEBP", quality=88, method=6)


def build_sungnyemun() -> None:
    source = Image.open(
        SOURCE_ROOT / "campaign" / "hanseong-sungnyemun-source-v2.png"
    ).convert("RGB")
    background = source.resize(MAP_SIZE, Image.Resampling.LANCZOS)
    output = PUBLIC_ROOT / "campaign" / "hanseong-sungnyemun-v2.webp"
    output.parent.mkdir(parents=True, exist_ok=True)
    background.save(output, "WEBP", quality=90, method=6)


def build_changdeokgung() -> None:
    source = Image.open(
        SOURCE_ROOT / "campaign" / "changdeokgung-audience-source-v2.png"
    ).convert("RGB")
    background = source.resize(MAP_SIZE, Image.Resampling.LANCZOS)
    output = PUBLIC_ROOT / "campaign" / "changdeokgung-audience-v2.webp"
    output.parent.mkdir(parents=True, exist_ok=True)
    background.save(output, "WEBP", quality=90, method=6)


def build_joseon_seam(
    upper_name: str,
    lower_name: str,
    output_relative: str,
) -> None:
    """Blend the real adjoining pixels so the overlay matches both maps.

    The upper and lower 88px remain exact copies of their source map. Only the
    middle band dissolves the last upper row into the first lower row, keeping
    roads aligned without painting a generic biome over gates or buildings.
    """
    upper = Image.open(PUBLIC_ROOT / "campaign" / upper_name).convert("RGB")
    lower = Image.open(PUBLIC_ROOT / "campaign" / lower_name).convert("RGB")
    upper = upper.resize(MAP_SIZE, Image.Resampling.LANCZOS)
    lower = lower.resize(MAP_SIZE, Image.Resampling.LANCZOS)
    width, height = MAP_SIZE
    half = JOSEON_SEAM_HEIGHT // 2

    upper_canvas = Image.new("RGB", (width, JOSEON_SEAM_HEIGHT))
    lower_canvas = Image.new("RGB", (width, JOSEON_SEAM_HEIGHT))
    for y in range(JOSEON_SEAM_HEIGHT):
        upper_y = min(height - 1, height - half + y)
        lower_y = max(0, y - half)
        upper_canvas.paste(upper.crop((0, upper_y, width, upper_y + 1)), (0, y))
        lower_canvas.paste(lower.crop((0, lower_y, width, lower_y + 1)), (0, y))

    blend_start = half - 72
    blend_end = half + 72
    mask = Image.new("L", (width, JOSEON_SEAM_HEIGHT), 0)
    mask_pixels = mask.load()
    for y in range(JOSEON_SEAM_HEIGHT):
        weight = smoothstep((y - blend_start) / (blend_end - blend_start))
        value = round(255 * weight)
        for x in range(width):
            mask_pixels[x, y] = value
    mask = mask.filter(ImageFilter.GaussianBlur(radius=3))
    transition = Image.composite(lower_canvas, upper_canvas, mask)
    output = PUBLIC_ROOT / output_relative
    output.parent.mkdir(parents=True, exist_ok=True)
    transition.save(output, "WEBP", quality=90, method=6)


def main() -> None:
    build_awaji_coast()
    build_sungnyemun()
    build_changdeokgung()
    for seam in JOSEON_SEAMS:
        build_joseon_seam(*seam)
    for seam in SEAMS:
        build_seam(*seam)
    print("Wrote Awaji Coast v2, Sungnyemun v2, six Joseon edge-matched seams, and two alpha seams")


if __name__ == "__main__":
    main()
