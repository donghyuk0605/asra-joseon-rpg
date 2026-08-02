#!/usr/bin/env python3
"""Build normalized elemental weapons, hunt-item icons, and tiger-pelt armor layers."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FRAME = 256
WEAPON_TOP = 4
WEAPON_BOTTOM = 252
WEAPON_GRIP_X = 128

WEAPONS = {
    "venom-hwando": ROOT / "assets/weapons-v3/processed/venom-hwando-world-transparent-v1.png",
    "gale-hwando": ROOT / "assets/weapons-v3/processed/gale-hwando-world-transparent-v1.png",
    "earth-hwando": ROOT / "assets/weapons-v3/processed/earth-hwando-world-transparent-v1.png",
    "shadow-hwando": ROOT / "assets/weapons-v3/processed/shadow-hwando-world-transparent-v1.png",
}


def alpha_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    if box is None:
        raise ValueError("Image contains no visible pixels")
    return box


def normalize_weapon(source: Path, output: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    crop = image.crop(alpha_box(image))
    target_height = WEAPON_BOTTOM - WEAPON_TOP
    scale = min(target_height / crop.height, 168 / crop.width)
    resized = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )

    # Measure the handle center from the upper quarter of the visible cutout.
    # Aligning this to x=128 keeps the authored runtime grip stable even when
    # the curved blade itself extends far to one side.
    alpha = resized.getchannel("A")
    handle_bottom = max(1, round(resized.height * 0.24))
    handle_crop = alpha.crop((0, 0, resized.width, handle_bottom))
    handle_box = handle_crop.getbbox()
    handle_center_x = resized.width / 2 if handle_box is None else (handle_box[0] + handle_box[2]) / 2
    offset_x = round(WEAPON_GRIP_X - handle_center_x)
    offset_x = max(-resized.width + 8, min(FRAME - 8, offset_x))
    offset_y = WEAPON_TOP

    canvas = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (offset_x, offset_y))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)
    bounds = alpha_box(canvas)
    if bounds[0] < 0 or bounds[1] < 0 or bounds[2] > FRAME or bounds[3] > FRAME:
        raise ValueError(f"Weapon escaped runtime frame: {source.name}")
    return canvas


def make_icon(source: Image.Image, output: Path, padding: int = 18) -> None:
    crop = source.crop(alpha_box(source))
    available = FRAME - padding * 2
    scale = min(available / crop.width, available / crop.height)
    resized = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((FRAME - resized.width) // 2, (FRAME - resized.height) // 2))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)


def tiger_palette_pixel(
    original: tuple[int, int, int, int],
    local_x: int,
    local_y: int,
    row: int,
) -> tuple[int, int, int, int]:
    red, green, blue, alpha = original
    if alpha == 0:
        return original
    luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
    if luminance < 38:
        return (round(red * 0.78), round(green * 0.67), round(blue * 0.5), alpha)

    shade = max(0.68, min(1.25, luminance / 92))
    if local_y >= 188:
        base = (72, 52, 38)
    else:
        stripe_wave = (
            math.sin((local_x - 128) * 0.19 + local_y * 0.057 + row * 0.83)
            + 0.42 * math.sin(local_y * 0.16 - local_x * 0.035)
        )
        edge_weight = min(1, abs(local_x - 128) / 58)
        band = abs(((local_y + local_x * 0.62 + row * 11) % 34) - 17) < 4.6
        stripe = (stripe_wave > 0.34 - edge_weight * 0.22 or band) and local_y > 94
        collar = local_y < 132 and abs(local_x - 128) < 42
        if collar:
            base = (205, 180, 132)
        elif stripe:
            base = (45, 33, 25)
        else:
            base = (198, 121, 38)
    return (
        min(255, round(base[0] * shade)),
        min(255, round(base[1] * shade)),
        min(255, round(base[2] * shade)),
        alpha,
    )


def build_tiger_layer(source: Path, output: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    if image.size != (FRAME * 8, FRAME * 5):
        raise ValueError(f"Unexpected armor atlas size: {source} {image.size}")
    pixels = image.load()
    for frame_row in range(5):
        for frame_column in range(8):
            frame_box = (
                frame_column * FRAME,
                frame_row * FRAME,
                (frame_column + 1) * FRAME,
                (frame_row + 1) * FRAME,
            )
            frame_alpha = image.getchannel("A").crop(frame_box)
            box = frame_alpha.getbbox()
            if box is None:
                continue
            for local_y in range(box[1], box[3]):
                for local_x in range(box[0], box[2]):
                    x = frame_column * FRAME + local_x
                    y = frame_row * FRAME + local_y
                    pixels[x, y] = tiger_palette_pixel(pixels[x, y], local_x, local_y, frame_row)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, optimize=True)
    return image


def make_runtime_preview(body_path: Path, armor: Image.Image, output: Path) -> None:
    body = Image.open(body_path).convert("RGBA")
    if body.size != armor.size:
        raise ValueError("Body and tiger armor atlases must share the 8x5 frame layout")
    composite = Image.alpha_composite(body, armor)
    background = Image.new("RGBA", composite.size, (18, 20, 18, 255))
    background.alpha_composite(composite)
    output.parent.mkdir(parents=True, exist_ok=True)
    background.save(output)


def main() -> None:
    weapon_icons = ROOT / "public/assets/items"
    weapon_outputs = ROOT / "public/assets/weapons"
    for name, source in WEAPONS.items():
        runtime = normalize_weapon(source, weapon_outputs / f"{name}-world-v1.png")
        make_icon(runtime, weapon_icons / f"{name}-v1.png", padding=24)

    pelt_source = Image.open(
        ROOT / "assets/items-v2/processed/ulleung-tiger-pelt-transparent-v1.png"
    ).convert("RGBA")
    armor_icon_source = Image.open(
        ROOT / "assets/items-v2/processed/tiger-pelt-armor-transparent-v1.png"
    ).convert("RGBA")
    make_icon(pelt_source, weapon_icons / "ulleung-tiger-pelt-v1.png")
    make_icon(armor_icon_source, weapon_icons / "tiger-pelt-armor-v1.png")

    armor_layer = build_tiger_layer(
        ROOT / "public/assets/characters/joseon-hero-armor-layer-v3.png",
        ROOT / "public/assets/characters/joseon-hero-tiger-pelt-layer-v1.png",
    )
    ready_layer = build_tiger_layer(
        ROOT / "public/assets/characters/joseon-hero-hunter-weapon-ready-layer-v1.png",
        ROOT / "public/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v1.png",
    )
    make_runtime_preview(
        ROOT / "public/assets/characters/joseon-hero-base-body-v6.png",
        armor_layer,
        ROOT / "assets/items-v2/processed/tiger-pelt-armor-unarmed-preview-v1.png",
    )
    make_runtime_preview(
        ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v1.png",
        ready_layer,
        ROOT / "assets/items-v2/processed/tiger-pelt-armor-weapon-preview-v1.png",
    )

    print("Built 4 normalized weapons, 6 inventory icons, and 2 tiger-pelt armor atlases.")


if __name__ == "__main__":
    main()
