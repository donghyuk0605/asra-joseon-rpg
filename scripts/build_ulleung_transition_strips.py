#!/usr/bin/env python3
"""Feather generated Ulleung transition paintings into their neighboring maps."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path("public/assets/environment")
SOURCE_ROOT = Path("assets/environment/transitions")
OVERLAP_HEIGHT = 256
OVERLAY_HEIGHT = 1024
PAIRS = (
    (
        "ulleung-coastal-forest-v1.webp",
        "ulleung-silvergrass-meadow-v1.webp",
        "ulleung-coast-meadow-transition-source-v2.png",
        "ulleung-coast-meadow-blend-v3.webp",
    ),
    (
        "ulleung-silvergrass-meadow-v1.webp",
        "ulleung-raided-village-v2.webp",
        "ulleung-meadow-hunt-transition-source-v2.png",
        "ulleung-meadow-hunt-blend-v3.webp",
    ),
    (
        "ulleung-raided-village-v2.webp",
        "ulleung-highland-ridge-v1.webp",
        "ulleung-hunt-ridge-transition-source-v2.png",
        "ulleung-hunt-ridge-blend-v3.webp",
    ),
    (
        "ulleung-highland-ridge-v1.webp",
        "ulleungdo-prison-gates-aligned-v2.webp",
        "ulleung-ridge-prison-transition-source-v2.png",
        "ulleung-ridge-prison-blend-v3.webp",
    ),
    (
        "ulleungdo-prison-gates-aligned-v2.webp",
        "ulleung-government-district-v3.webp",
        "ulleung-prison-government-transition-source-v2.png",
        "ulleung-prison-government-blend-v3.webp",
    ),
)


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def overlap_mask(width: int, top: bool, seed: int) -> Image.Image:
    mask = Image.new("L", (width, OVERLAY_HEIGHT), 0)
    pixels = mask.load()
    start_y = 0 if top else OVERLAY_HEIGHT - OVERLAP_HEIGHT
    for x in range(width):
        wave = math.sin(x * 0.0121 + seed * 0.73) * 13 + math.sin(x * 0.029 + seed * 1.31) * 6
        for local_y in range(OVERLAP_HEIGHT):
            # The sine term keeps the outermost row pixel-identical to its
            # neighboring map while breaking up the inner fade into an organic
            # shoreline/forest edge instead of another horizontal line.
            warped = local_y + wave * math.sin(math.pi * local_y / max(1, OVERLAP_HEIGHT - 1))
            progress = smoothstep(warped / max(1, OVERLAP_HEIGHT - 1))
            alpha = 1.0 - progress if top else progress
            pixels[x, start_y + local_y] = round(max(0.0, min(1.0, alpha)) * 255)
    return mask.filter(ImageFilter.GaussianBlur(radius=5))


def build_overlap_overlay(
    transition: Image.Image,
    upper: Image.Image,
    lower: Image.Image,
    seed: int,
) -> Image.Image:
    width, height = upper.size
    overlay = transition.resize((width, OVERLAY_HEIGHT), Image.Resampling.LANCZOS)

    upper_layer = overlay.copy()
    upper_layer.paste(upper.crop((0, height - OVERLAP_HEIGHT, width, height)), (0, 0))
    overlay = Image.composite(upper_layer, overlay, overlap_mask(width, True, seed))

    lower_layer = overlay.copy()
    lower_layer.paste(lower.crop((0, 0, width, OVERLAP_HEIGHT)), (0, OVERLAY_HEIGHT - OVERLAP_HEIGHT))
    overlay = Image.composite(lower_layer, overlay, overlap_mask(width, False, seed + 17))
    return overlay


def outer_alpha_mask(width: int, seed: int) -> Image.Image:
    """Fade the painted strip back into both source maps without a straight cut."""
    mask = Image.new("L", (width, OVERLAY_HEIGHT), 255)
    pixels = mask.load()
    fade_height = 196
    for x in range(width):
        wave = math.sin(x * 0.0107 + seed * 0.91) * 18 + math.sin(x * 0.0253 + seed) * 7
        for y in range(OVERLAY_HEIGHT):
            edge_distance = min(y, OVERLAY_HEIGHT - 1 - y)
            warped = edge_distance + wave * math.sin(
                math.pi * min(1.0, edge_distance / max(1, fade_height))
            )
            pixels[x, y] = round(255 * smoothstep(warped / fade_height))
    return mask.filter(ImageFilter.GaussianBlur(radius=7))


def build_strip(
    upper_name: str,
    lower_name: str,
    source_name: str,
    output_name: str,
    seed: int,
) -> None:
    upper = Image.open(ROOT / upper_name).convert("RGB")
    lower = Image.open(ROOT / lower_name).convert("RGB")
    transition = Image.open(SOURCE_ROOT / source_name).convert("RGB")
    if upper.size != lower.size or transition.size != upper.size:
        raise ValueError(
            f"Ulleung transition sizes differ: upper={upper.size}, "
            f"lower={lower.size}, transition={transition.size}"
        )
    overlay = build_overlap_overlay(transition, upper, lower, seed).convert("RGBA")
    overlay.putalpha(outer_alpha_mask(upper.width, seed))
    overlay.save(ROOT / output_name, "WEBP", quality=90, method=6)


def main() -> None:
    for index, pair in enumerate(PAIRS):
        build_strip(*pair, seed=index + 1)
    print(
        f"Wrote {len(PAIRS)} Ulleung feather overlays at "
        f"{OVERLAY_HEIGHT}px high ({OVERLAP_HEIGHT}px map overlap)"
    )


if __name__ == "__main__":
    main()
