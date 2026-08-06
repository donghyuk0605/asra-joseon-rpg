#!/usr/bin/env python3
"""Build runtime raster assets for the northern-war and palace expansion.

The generated sources are kept in ``assets/``. This script performs only
deterministic packaging: fixed-grid normalization is handled separately by
``normalize_cell_atlas.py``, while this file crops UI quadrants, normalizes FX
atlases, and writes compressed world backgrounds.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def alpha_crop(image: Image.Image, padding: int = 8) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("Generated component is empty")
    left, top, right, bottom = bounds
    return rgba.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(rgba.width, right + padding),
            min(rgba.height, bottom + padding),
        )
    )


def contain(image: Image.Image, size: tuple[int, int], padding: int = 0) -> Image.Image:
    target_width, target_height = size
    available = (max(1, target_width - padding * 2), max(1, target_height - padding * 2))
    source = image.copy()
    source.thumbnail(available, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(
        source,
        ((target_width - source.width) // 2, (target_height - source.height) // 2),
    )
    return canvas


def build_ui_components(ui_alpha_path: Path) -> None:
    source = Image.open(ui_alpha_path).convert("RGBA")
    # Image generation keeps the four panels visually isolated but their
    # ornamental corners cross the mathematical half-way cuts. Use the empty
    # gutters between panels so neighbouring frame slivers never leak into a
    # packaged component.
    quadrants = {
        "inventory-bag-panel-v2.webp": (0, 0, round(source.width * 0.535), round(source.height * 0.56)),
        "equipment-paperdoll-panel-v2.webp": (
            round(source.width * 0.515), 0, source.width, round(source.height * 0.58)
        ),
        "item-detail-panel-v2.webp": (
            0, round(source.height * 0.55), round(source.width * 0.52), source.height
        ),
        "inventory-mobile-tabs-v2.webp": (
            round(source.width * 0.50), round(source.height * 0.72), source.width, source.height
        ),
    }
    output_dir = ROOT / "public/assets/ui"
    output_dir.mkdir(parents=True, exist_ok=True)
    sizes = {
        "inventory-bag-panel-v2.webp": (768, 768),
        "equipment-paperdoll-panel-v2.webp": (640, 768),
        "item-detail-panel-v2.webp": (640, 640),
        "inventory-mobile-tabs-v2.webp": (768, 256),
    }
    for name, box in quadrants.items():
        component = alpha_crop(source.crop(box))
        packaged = contain(component, sizes[name], 4)
        destination = output_dir / name
        packaged.save(destination, "WEBP", lossless=True, method=6)
        print(f"Wrote {destination.relative_to(ROOT)} {packaged.size}")


def build_fx_atlas(fx_alpha_path: Path) -> None:
    source = Image.open(fx_alpha_path).convert("RGBA")
    source_width = source.width / 4
    source_height = source.height / 2
    atlas = Image.new("RGBA", (2048, 1024), (0, 0, 0, 0))
    for row in range(2):
        for column in range(4):
            cell = source.crop(
                (
                    round(column * source_width),
                    round(row * source_height),
                    round((column + 1) * source_width),
                    round((row + 1) * source_height),
                )
            )
            component = alpha_crop(cell, 3)
            packaged = contain(component, (512, 512), 18)
            atlas.alpha_composite(packaged, (column * 512, row * 512))
    destination = ROOT / "public/assets/fx/frontier-combat-fx-v1.webp"
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination, "WEBP", lossless=True, method=6)
    print(f"Wrote {destination.relative_to(ROOT)} {atlas.size}")


def build_frontier_props(props_alpha_path: Path) -> None:
    source = Image.open(props_alpha_path).convert("RGBA")
    source_width = source.width / 3
    source_height = source.height / 2
    atlas = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
    for row in range(2):
        for column in range(3):
            cell = source.crop(
                (
                    round(column * source_width),
                    round(row * source_height),
                    round((column + 1) * source_width),
                    round((row + 1) * source_height),
                )
            )
            component = alpha_crop(cell, 3)
            packaged = contain(component, (512, 512), 12)
            atlas.alpha_composite(packaged, (column * 512, row * 512))
    destination = ROOT / "public/assets/environment/props/frontier-camp-props-v1.webp"
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination, "WEBP", lossless=True, method=6)
    print(f"Wrote {destination.relative_to(ROOT)} {atlas.size}")


def build_world_backgrounds() -> None:
    sources = {
        "gyeongbok-royal-garden-v1": ROOT / "assets/environment/campaign/gyeongbok-royal-garden-source-v1.png",
        "gyeongbok-sinmumun-v1": ROOT / "assets/environment/campaign/gyeongbok-sinmumun-source-v1.png",
        "samjeondo-humiliation-v1": ROOT / "assets/environment/campaign/samjeondo-humiliation-source-v1.png",
    }
    output_dir = ROOT / "public/assets/environment/campaign"
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, source_path in sources.items():
        source = Image.open(source_path).convert("RGB")
        if source.size != (1536, 1024):
            source = source.resize((1536, 1024), Image.Resampling.LANCZOS)
        destination = output_dir / f"{name}.webp"
        source.save(destination, "WEBP", quality=88, method=6)
        print(f"Wrote {destination.relative_to(ROOT)} {source.size}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ui-alpha", required=True)
    parser.add_argument("--fx-alpha", required=True)
    parser.add_argument("--props-alpha", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build_ui_components(Path(args.ui_alpha))
    build_fx_atlas(Path(args.fx_alpha))
    build_frontier_props(Path(args.props_alpha))
    build_world_backgrounds()


if __name__ == "__main__":
    main()
