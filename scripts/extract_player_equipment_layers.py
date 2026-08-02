#!/usr/bin/env python3
"""Build an unequipped body and a body-locked clothing overlay.

Both outputs are derived from the exact same normalized 40-frame atlas. The
unequipped body turns the wrapped upper garment into bare skin while retaining
plain inner trousers. The armor output recolors only the base garment pixels,
so it cannot introduce a second head, hand, foot, pose, or gait.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


FRAME = 256
ROWS = 5
COLS = 8


def dilate(mask: np.ndarray, size: int) -> np.ndarray:
    image = Image.fromarray(mask.astype(np.uint8) * 255, "L")
    return np.asarray(image.filter(ImageFilter.MaxFilter(size))) > 0


def fabric_mask(frame: np.ndarray) -> np.ndarray:
    rgb = frame[..., :3].astype(np.int16)
    alpha = frame[..., 3] > 12
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    light_neutral = alpha & (red > 72) & (np.abs(red - green) < 24) & (green >= blue - 2)
    skin = alpha & (red >= green + 20) & (green >= blue + 8)
    mask = alpha & dilate(light_neutral, 5) & ~dilate(skin, 3)
    mask[227:, :] = False
    return mask


def recolor(pixels: np.ndarray, mask: np.ndarray, palette: str) -> np.ndarray:
    result = np.zeros_like(pixels)
    luminance = (
        pixels[..., 0].astype(np.float32) * 0.30
        + pixels[..., 1].astype(np.float32) * 0.59
        + pixels[..., 2].astype(np.float32) * 0.11
    ) / 255.0
    if palette == "skin":
        result[..., 0] = np.clip(100 + luminance * 148, 0, 255)
        result[..., 1] = np.clip(55 + luminance * 145, 0, 255)
        result[..., 2] = np.clip(34 + luminance * 104, 0, 255)
    else:
        result[..., 0] = np.clip(5 + luminance * 72, 0, 255)
        result[..., 1] = np.clip(8 + luminance * 84, 0, 255)
        result[..., 2] = np.clip(12 + luminance * 124, 0, 255)
    result[..., 3] = np.where(mask, pixels[..., 3], 0)
    return result


def build_outputs(source: Image.Image) -> tuple[Image.Image, Image.Image]:
    body_output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    armor_output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    for row in range(ROWS):
        for col in range(COLS):
            box = (col * FRAME, row * FRAME, (col + 1) * FRAME, (row + 1) * FRAME)
            frame = np.asarray(source.crop(box).convert("RGBA")).copy()
            alpha = frame[..., 3] > 12
            ys, xs = np.where(alpha)
            if len(xs) == 0:
                raise ValueError(f"Empty frame at row {row}, column {col}")

            garment = fabric_mask(frame)
            top = int(ys.min())
            bottom = int(ys.max())
            height = max(1, bottom - top + 1)
            local_y = np.arange(FRAME)[:, None]
            upper_garment = (
                dilate(garment, 11)
                & alpha
                & (local_y >= top + int(height * 0.23))
                & (local_y <= top + int(height * 0.57))
            )
            lower_garment = (
                dilate(garment, 7)
                & alpha
                & (local_y > top + int(height * 0.54))
                & (local_y <= bottom - 18)
            )
            armor_mask = upper_garment | lower_garment
            armor_mask[227:, :] = False

            bare_body = frame.copy()
            skin_layer = recolor(frame, upper_garment, "skin")
            bare_body[upper_garment] = skin_layer[upper_garment]

            armor_layer = recolor(frame, armor_mask, "navy")
            body_output.alpha_composite(Image.fromarray(bare_body, "RGBA"), (col * FRAME, row * FRAME))
            armor_output.alpha_composite(Image.fromarray(armor_layer, "RGBA"), (col * FRAME, row * FRAME))
    return body_output, armor_output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--base-out", required=True)
    parser.add_argument("--armor-out", required=True)
    args = parser.parse_args()

    source = Image.open(args.base).convert("RGBA")
    expected = (COLS * FRAME, ROWS * FRAME)
    if source.size != expected:
        raise ValueError(f"Base atlas must be {expected[0]}x{expected[1]}")

    base_body, armor_layer = build_outputs(source)
    Path(args.base_out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.armor_out).parent.mkdir(parents=True, exist_ok=True)
    base_body.save(args.base_out)
    armor_layer.save(args.armor_out)
    print(f"Wrote {args.base_out} and {args.armor_out}")


if __name__ == "__main__":
    main()
