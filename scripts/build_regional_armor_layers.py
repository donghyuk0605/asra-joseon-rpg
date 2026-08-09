#!/usr/bin/env python3
"""Build body-locked regional armor layers without disturbing approved poses.

The five material palettes follow assets/generated/armors/
regional-armor-material-reference-v1.png.  Runtime layers are derived from the
approved hunter/warden/tiger atlases so every pixel stays on the existing 8x5
body grid.  Hajin receives separate recolor overlays for his bow and melee
action bodies instead of a mismatched generic Joseon layer.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / "public/assets/characters"
FRAME = 256
ROWS = 5
COLS = 8


@dataclass(frozen=True)
class ArmorSpec:
    item_id: str
    source: str
    base: tuple[int, int, int]
    accent: tuple[int, int, int]
    material: str


SPECS = (
    ArmorSpec("frontier-lamellar-coat", "warden", (66, 72, 72), (130, 105, 72), "lamellar"),
    ArmorSpec("coastal-scout-coat", "hunter", (42, 79, 83), (135, 119, 82), "coastal"),
    ArmorSpec("haeju-reed-cape", "tiger", (91, 81, 53), (164, 137, 80), "reed"),
    ArmorSpec("anju-frontier-coat", "warden", (67, 48, 39), (124, 79, 55), "scale"),
    ArmorSpec("gongju-scholar-coat", "hunter", (31, 43, 61), (133, 101, 55), "scholar"),
)
FRONTIER_SPECS = (
    ArmorSpec("hunter-durumagi", "hunter", (48, 57, 68), (113, 85, 56), "coastal"),
    ArmorSpec("warden-durumagi", "warden", (55, 62, 61), (126, 101, 68), "lamellar"),
    ArmorSpec("tiger-pelt-armor", "tiger", (113, 72, 30), (184, 126, 55), "reed"),
    *SPECS,
)

NORMAL_SOURCES = {
    "hunter": "joseon-hero-armor-layer-v4.png",
    "warden": "joseon-hero-warden-layer-v2.png",
    "tiger": "joseon-hero-tiger-pelt-layer-v2.png",
}
READY_SOURCES = {
    "hunter": "joseon-hero-hunter-weapon-ready-layer-v2.webp",
    "warden": "joseon-hero-warden-weapon-ready-layer-v2.webp",
    "tiger": "joseon-hero-tiger-pelt-weapon-ready-layer-v2.webp",
}
READY_CLEAN_OUTPUTS = {
    "hunter": "joseon-hero-hunter-weapon-ready-layer-v3.png",
    "warden": "joseon-hero-warden-weapon-ready-layer-v3.png",
    "tiger": "joseon-hero-tiger-pelt-weapon-ready-layer-v3.png",
}


def load_rgba(name: str) -> Image.Image:
    image = Image.open(CHARACTERS / name).convert("RGBA")
    if image.size != (FRAME * COLS, FRAME * ROWS):
        raise ValueError(f"{name}: expected 2048x1280, got {image.size}")
    return image


def body_locked(layer: Image.Image, body: Image.Image, radius: int = 12) -> Image.Image:
    """Remove bars and rectangles that escape the approved body silhouette."""
    layer_rgba = np.asarray(layer, dtype=np.uint8).copy()
    body_alpha = body.getchannel("A").filter(ImageFilter.MaxFilter(radius * 2 + 1))
    allowed = np.asarray(body_alpha, dtype=np.uint8)
    layer_rgba[..., 3] = np.minimum(layer_rgba[..., 3], allowed)
    layer_rgba[layer_rgba[..., 3] == 0, :3] = 0
    return Image.fromarray(layer_rgba, "RGBA")


def material_recolor(image: Image.Image, spec: ArmorSpec) -> Image.Image:
    rgba = np.asarray(image, dtype=np.uint8).copy()
    rgb = rgba[..., :3].astype(np.float32)
    alpha = rgba[..., 3]
    visible = alpha > 0
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = (maximum - minimum) / np.maximum(maximum, 1)
    warm_detail = (saturation > 0.18) & (rgb[..., 0] > rgb[..., 2] * 1.08)

    shade = np.clip(0.38 + luminance / 205.0, 0.30, 1.38)
    base = np.asarray(spec.base, dtype=np.float32)
    accent = np.asarray(spec.accent, dtype=np.float32)
    target = base[None, None, :] * shade[..., None]
    target[warm_detail] = accent * shade[warm_detail, None]

    yy, xx = np.indices(alpha.shape)
    opaque = alpha > 48
    if spec.material == "lamellar":
        detail = opaque & (luminance > 47) & (((xx // 6) + (yy // 5)) % 2 == 0)
        target[detail] = target[detail] * 0.82 + accent * 0.18
    elif spec.material == "coastal":
        detail = opaque & (luminance > 65) & ((xx + yy * 2) % 23 == 0)
        target[detail] = target[detail] * 0.72 + accent * 0.28
    elif spec.material == "reed":
        detail = opaque & (((xx % 8) == 0) | (((xx + yy * 2) % 29) == 0))
        target[detail] = target[detail] * 0.58 + accent * 0.42
    elif spec.material == "scale":
        detail = opaque & (luminance > 42) & (((xx // 5) + (yy // 4)) % 3 == 0)
        target[detail] = target[detail] * 0.74 + accent * 0.26
    elif spec.material == "scholar":
        detail = opaque & (luminance > 52) & (((xx + yy * 3) % 31) == 0)
        target[detail] = target[detail] * 0.62 + accent * 0.38

    rgba[..., :3] = np.clip(target, 0, 255).astype(np.uint8)
    rgba[~visible, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def hajin_clothing_overlay(body: Image.Image, spec: ArmorSpec) -> Image.Image:
    source = np.asarray(body, dtype=np.uint8)
    overlay = np.zeros_like(source)

    for row in range(ROWS):
        for column in range(COLS):
            y0, x0 = row * FRAME, column * FRAME
            cell = source[y0:y0 + FRAME, x0:x0 + FRAME]
            alpha = cell[..., 3]
            ys, xs = np.where(alpha > 16)
            if not len(xs):
                continue
            min_x, max_x = int(xs.min()), int(xs.max())
            min_y, max_y = int(ys.min()), int(ys.max())
            width = max(max_x - min_x + 1, 1)
            height = max(max_y - min_y + 1, 1)
            yy, xx = np.indices((FRAME, FRAME))
            nx = (xx - min_x) / width
            ny = (yy - min_y) / height
            rgb = cell[..., :3].astype(np.float32)
            lum = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
            skin = (
                (rgb[..., 0] > 82)
                & (rgb[..., 1] > 34)
                & (rgb[..., 0] > rgb[..., 1] * 1.28)
                & (rgb[..., 1] > rgb[..., 2] * 1.08)
                & (ny < 0.82)
            )
            torso = (ny >= 0.25) & (ny <= 0.87) & (np.abs(nx - 0.5) <= 0.31)
            sleeves = (ny >= 0.34) & (ny <= 0.68) & (np.abs(nx - 0.5) <= 0.43)
            garment = (alpha > 16) & (lum < 196) & (torso | sleeves) & ~skin
            # Keep head/hair, feet, hands, bow tips and remote quiver pixels out.
            garment &= ~((ny < 0.25) | (ny > 0.89))
            overlay[y0:y0 + FRAME, x0:x0 + FRAME][garment] = cell[garment]

    return material_recolor(Image.fromarray(overlay, "RGBA"), spec)


def save_png(image: Image.Image, name: str) -> None:
    image.save(CHARACTERS / name, format="PNG", optimize=True, compress_level=9)


def main() -> None:
    base_body = load_rgba("joseon-hero-base-body-v8.png")
    ready_body = load_rgba("joseon-hero-weapon-ready-body-v3.png")
    hajin_bow = load_rgba("hajin-frontier-archer-actions-v2.png")
    hajin_melee = load_rgba("harlan-melee-ready-actions-v1.png")

    clean_normal = {
        key: body_locked(load_rgba(path), base_body)
        for key, path in NORMAL_SOURCES.items()
    }
    clean_ready = {
        key: body_locked(load_rgba(path), ready_body)
        for key, path in READY_SOURCES.items()
    }
    for key, output in READY_CLEAN_OUTPUTS.items():
        save_png(clean_ready[key], output)

    for spec in SPECS:
        save_png(
            material_recolor(clean_normal[spec.source], spec),
            f"joseon-hero-{spec.item_id}-layer-v1.png",
        )
        save_png(
            material_recolor(clean_ready[spec.source], spec),
            f"joseon-hero-{spec.item_id}-weapon-ready-layer-v1.png",
        )
    for spec in FRONTIER_SPECS:
        save_png(hajin_clothing_overlay(hajin_bow, spec), f"hajin-{spec.item_id}-armor-layer-v1.png")
        save_png(hajin_clothing_overlay(hajin_melee, spec), f"hajin-{spec.item_id}-melee-armor-layer-v1.png")

    total = len(SPECS) * 2 + len(FRONTIER_SPECS) * 2 + len(READY_CLEAN_OUTPUTS)
    print(f"Built {total} body-locked armor atlases")


if __name__ == "__main__":
    main()
