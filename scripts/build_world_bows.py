#!/usr/bin/env python3
"""Split, key, orient, and normalize the approved eight-bow source sheets."""

from pathlib import Path
import math

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/generated/bows"
OUTPUT_DIR = ROOT / "public/assets/weapons"

SHEETS = (
    (
        SOURCE_DIR / "world-bows-source-north-v1.png",
        (
            "frontier-horn-bow-world-v1.png",
            "white-birch-bow-world-v1.png",
            "iron-horn-warbow-world-v1.png",
            "thunderbird-bow-world-v1.png",
        ),
    ),
    (
        SOURCE_DIR / "world-bows-source-regional-v1.png",
        (
            "northwind-warbow-world-v1.png",
            "gangneung-sea-bow-world-v1.png",
            "uiju-black-horn-bow-world-v1.png",
            "samcheok-seawind-bow-world-v1.png",
        ),
    ),
)


def keyed_rgba(cell: Image.Image) -> Image.Image:
    pixels = np.asarray(cell.convert("RGBA"), dtype=np.uint8).copy()
    rgb = pixels[:, :, :3].astype(np.int16)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    green_excess = green - np.maximum(red, blue)

    alpha = np.full(green.shape, 255, dtype=np.int16)
    alpha[green_excess >= 78] = 0
    feather = (green_excess > 22) & (green_excess < 78)
    alpha[feather] = np.clip(255 - (green_excess[feather] - 22) * 255 / 56, 0, 255)
    alpha[(green > 155) & (red < 105) & (blue < 105)] = 0

    # Remove green spill from partially transparent edge pixels without
    # repainting the generated bow surface.
    surviving = alpha > 0
    neutral_limit = np.maximum(red, blue) + 18
    rgb[:, :, 1][surviving] = np.minimum(green[surviving], neutral_limit[surviving])
    pixels[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    pixels[:, :, 3] = alpha.astype(np.uint8)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def orient_vertical(image: Image.Image) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.nonzero(alpha > 40)
    if len(xs) < 100:
        raise ValueError("bow cell contains too few foreground pixels")
    points = np.column_stack((xs - xs.mean(), ys - ys.mean()))
    covariance = np.cov(points, rowvar=False)
    values, vectors = np.linalg.eigh(covariance)
    axis = vectors[:, int(np.argmax(values))]
    angle = math.degrees(math.atan2(float(axis[1]), float(axis[0])))
    rotation = 90.0 - angle
    while rotation > 90:
        rotation -= 180
    while rotation < -90:
        rotation += 180
    return image.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True)


def normalize(image: Image.Image) -> Image.Image:
    alpha_bbox = image.getchannel("A").getbbox()
    if alpha_bbox is None:
        raise ValueError("bow cell became empty after chroma key removal")
    cutout = image.crop(alpha_bbox)
    width, height = cutout.size
    scale = 232 / max(width, height)
    resized = cutout.resize(
        (max(1, round(width * scale)), max(1, round(height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((256 - resized.width) // 2, (256 - resized.height) // 2))
    result = np.asarray(canvas, dtype=np.uint8).copy()
    result[result[:, :, 3] == 0, :3] = 0
    return Image.fromarray(result, "RGBA")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    written = []
    for sheet_index, (sheet_path, names) in enumerate(SHEETS):
        if not sheet_path.exists():
            raise FileNotFoundError(f"missing approved generated source: {sheet_path}")
        sheet = Image.open(sheet_path).convert("RGBA")
        cell_width = sheet.width // 2
        cell_height = sheet.height // 2
        for index, name in enumerate(names):
            column, row = index % 2, index // 2
            cell = sheet.crop((
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            ))
            oriented = orient_vertical(keyed_rgba(cell))
            # The second source sheet has broad recurves whose taut strings can
            # dominate PCA. Turn that approved sheet once more so every runtime
            # bow shares the same vertical authoring orientation.
            if sheet_index == 1:
                oriented = oriented.rotate(90, resample=Image.Resampling.BICUBIC, expand=True)
            output = normalize(oriented)
            output_path = OUTPUT_DIR / name
            output.save(output_path, optimize=True)
            written.append(output_path.relative_to(ROOT))
    print(f"Built {len(written)} world bows")
    for path in written:
        print(path)


if __name__ == "__main__":
    main()
