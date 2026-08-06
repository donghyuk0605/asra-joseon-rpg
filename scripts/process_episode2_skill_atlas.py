#!/usr/bin/env python3
"""Split the generated Episode II skill concept sheet into runtime-ready icons."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ICON_NAMES = (
    "episode2-tidebreaker-step-v1.png",
    "episode2-beacon-volley-v1.png",
)


def remove_checkerboard(cell: Image.Image) -> Image.Image:
    pixels = np.asarray(cell.convert("RGBA")).copy()
    rgb = pixels[..., :3].astype(np.int16)
    low = rgb.min(axis=2)
    spread = rgb.max(axis=2) - low

    # Image generation sometimes bakes a white/light-gray transparency grid into
    # the preview. The actual emblems are dark, saturated ink paintings, so the
    # neutral high-luminance field can be keyed without eroding their silhouette.
    background = (low >= 218) & (spread <= 22)
    fringe = (low >= 196) & (spread <= 25) & ~background
    pixels[background, 3] = 0
    pixels[fringe, 3] = np.minimum(
        pixels[fringe, 3],
        np.clip((218 - low[fringe]) * 12, 0, 255).astype(np.uint8),
    )

    keyed = Image.fromarray(pixels, "RGBA")
    alpha = keyed.getchannel("A").filter(ImageFilter.GaussianBlur(0.35))
    keyed.putalpha(alpha)
    return keyed


def fit_icon(cell: Image.Image, size: int = 256, inset: int = 14) -> Image.Image:
    alpha = cell.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("Generated skill cell has no visible foreground")

    cropped = cell.crop(bbox)
    available = size - inset * 2
    ratio = min(available / cropped.width, available / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * ratio)), max(1, round(cropped.height * ratio))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    cell_width = source.width // 2
    if source.width % 2 or source.height < cell_width * 0.75:
        raise ValueError(f"Expected a horizontal two-cell atlas, got {source.size}")

    destination = Path(args.out_dir)
    destination.mkdir(parents=True, exist_ok=True)
    for index, filename in enumerate(ICON_NAMES):
        cell = source.crop((index * cell_width, 0, (index + 1) * cell_width, source.height))
        icon = fit_icon(remove_checkerboard(cell))
        path = destination / filename
        icon.save(path, optimize=True)
        print(f"Wrote {path} ({icon.width}x{icon.height})")


if __name__ == "__main__":
    main()
