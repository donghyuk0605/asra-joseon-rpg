#!/usr/bin/env python3
"""Extract and normalize the beta world-weapon image set to one shared hand grip."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image


SOURCE = Path("assets/weapons-v4/processed/joseon-world-weapons-grid-v1-alpha.png")
OUTPUT_ROOT = Path("public/assets/weapons")
PREVIEW = Path("assets/weapons-v4/processed/joseon-world-weapons-preview-v1.png")
FRAME = 256
MARGIN = 4
TARGET_GRIP = (128, 50)


@dataclass(frozen=True)
class WeaponSource:
    item_id: str
    crop: tuple[int, int, int, int]
    grip: tuple[int, int]
    rotate_180: bool = False


WEAPONS = (
    WeaponSource("bear-claw-gauntlet", (88, 100, 275, 485), (180, 145)),
    WeaponSource("chiaksan-claw-knife", (425, 40, 545, 565), (493, 145)),
    WeaponSource("saltfield-ritual-knife", (744, 20, 810, 568), (778, 112)),
    WeaponSource("geoje-anchor-hwando", (970, 15, 1135, 585), (1060, 90)),
    WeaponSource("hwangju-moonsteel-spear", (135, 565, 207, 1225), (170, 1100), True),
    WeaponSource("pyeongchang-leopard-knife", (410, 645, 510, 1200), (462, 750)),
    WeaponSource("cheongju-kiln-hwando", (722, 595, 864, 1232), (780, 690)),
    WeaponSource("gunsan-drowned-blade", (1006, 650, 1110, 1210), (1058, 745)),
)


def transformed_grip(spec: WeaponSource, crop_size: tuple[int, int]) -> tuple[float, float]:
    local_x = spec.grip[0] - spec.crop[0]
    local_y = spec.grip[1] - spec.crop[1]
    if not spec.rotate_180:
        return float(local_x), float(local_y)
    return float(crop_size[0] - local_x), float(crop_size[1] - local_y)


def fit_scale(bounds: tuple[int, int, int, int], grip: tuple[float, float]) -> float:
    left, top, right, bottom = bounds
    grip_x, grip_y = grip
    limits: list[float] = [1.0]
    if grip_x > left:
        limits.append((TARGET_GRIP[0] - MARGIN) / (grip_x - left))
    if right > grip_x:
        limits.append((FRAME - MARGIN - TARGET_GRIP[0]) / (right - grip_x))
    if grip_y > top:
        limits.append((TARGET_GRIP[1] - MARGIN) / (grip_y - top))
    if bottom > grip_y:
        limits.append((FRAME - MARGIN - TARGET_GRIP[1]) / (bottom - grip_y))
    return min(limits) * 0.95


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    preview = Image.new("RGBA", (FRAME * 4, FRAME * 2), (20, 19, 17, 255))
    for index, spec in enumerate(WEAPONS):
        crop = source.crop(spec.crop)
        if spec.rotate_180:
            crop = crop.rotate(180)
        bounds = crop.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"Empty source crop: {spec.item_id}")
        grip = transformed_grip(spec, crop.size)
        scale = fit_scale(bounds, grip)
        resized = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            Image.Resampling.LANCZOS,
        )
        canvas = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        offset = (
            round(TARGET_GRIP[0] - grip[0] * scale),
            round(TARGET_GRIP[1] - grip[1] * scale),
        )
        canvas.alpha_composite(resized, offset)
        output = OUTPUT_ROOT / f"{spec.item_id}-world-v1.png"
        canvas.save(output, optimize=True)

        final_bounds = canvas.getchannel("A").getbbox()
        if final_bounds is None:
            raise ValueError(f"Empty normalized weapon: {spec.item_id}")
        if (
            final_bounds[0] < MARGIN
            or final_bounds[1] < MARGIN
            or final_bounds[2] > FRAME - MARGIN
            or final_bounds[3] > FRAME - MARGIN
        ):
            raise ValueError(f"Clipped normalized weapon: {spec.item_id} {final_bounds}")
        if any(canvas.getpixel(point)[3] != 0 for point in ((0, 0), (255, 0), (0, 255), (255, 255))):
            raise ValueError(f"Opaque corner in normalized weapon: {spec.item_id}")
        preview.alpha_composite(canvas, ((index % 4) * FRAME, (index // 4) * FRAME))
        print(f"Wrote {output}; grip={TARGET_GRIP}; bounds={final_bounds}; scale={scale:.3f}")
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    preview.convert("RGB").save(PREVIEW, optimize=True)
    print(f"Wrote {PREVIEW}")


if __name__ == "__main__":
    main()
