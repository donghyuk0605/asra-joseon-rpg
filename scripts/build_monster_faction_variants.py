#!/usr/bin/env python3
"""Build role- and faction-specific monster atlases from approved 8x5 poses.

The source alpha, frame layout and foot line are immutable.  Variants replace
the most obvious shared-sprite problem with readable regional cloth, lacquer,
leather and animal-coat treatments while keeping the approved motion intact.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MONSTERS = ROOT / "public/assets/monsters"
FRAME = 256
ROWS = 5
COLS = 8
EXPECTED_SIZE = (FRAME * COLS, FRAME * ROWS)


@dataclass(frozen=True)
class VariantSpec:
    kind: str
    source: str
    base: tuple[int, int, int]
    accent: tuple[int, int, int]
    pattern: str
    animal: bool = False

    @property
    def output(self) -> str:
        return f"{self.kind}-actions-v1.png"


SPECS = (
    # The Ulleung guard remains the baseline.  Every rank and mainland army
    # receives a separate, strongly readable uniform treatment.
    VariantSpec("ulleung-executioner", "ulleung-guard-actions-v1.png", (52, 24, 25), (142, 52, 43), "apron"),
    VariantSpec("yeongwol-swordsman", "ulleung-guard-actions-v1.png", (38, 49, 60), (116, 100, 72), "crossbelt"),
    VariantSpec("jeonju-swordsman", "ulleung-guard-actions-v1.png", (69, 48, 33), (145, 104, 50), "hem"),
    VariantSpec("joseon-border-swordsman", "ulleung-guard-actions-v1.png", (43, 52, 54), (102, 125, 118), "plates"),
    VariantSpec("royal-guard", "ulleung-guard-actions-v1.png", (66, 23, 29), (183, 139, 61), "royal"),

    VariantSpec("yeongwol-spearman", "joseon-spearman-actions-v1.png", (36, 49, 60), (112, 103, 77), "crossbelt"),
    VariantSpec("jeonju-spearman", "joseon-spearman-actions-v1.png", (73, 48, 31), (151, 103, 45), "hem"),
    VariantSpec("joseon-border-spearman", "joseon-spearman-actions-v1.png", (42, 55, 57), (110, 128, 119), "plates"),

    VariantSpec("yeongwol-archer", "joseon-archer-actions-v1.png", (34, 48, 62), (128, 111, 72), "crossbelt"),
    VariantSpec("jeonju-archer", "joseon-archer-actions-v1.png", (66, 47, 30), (151, 107, 49), "hem"),
    VariantSpec("joseon-border-archer", "joseon-archer-actions-v1.png", (39, 57, 58), (106, 132, 119), "plates"),

    VariantSpec("yeongwol-commander", "joseon-pododaejang-actions-v1.png", (29, 42, 57), (151, 125, 68), "officer"),
    VariantSpec("jeonju-commander", "joseon-pododaejang-actions-v1.png", (75, 38, 30), (176, 114, 48), "officer"),
    VariantSpec("joseon-border-commander", "joseon-pododaejang-actions-v1.png", (35, 52, 53), (135, 150, 126), "plates"),
    VariantSpec("jeonju-shield", "joseon-shield-guard-actions-v1.png", (74, 43, 30), (170, 111, 46), "shield"),

    # Japanese authorities, masterless warriors and raiders no longer share
    # one identical swordsman or campaign-rank texture.
    VariantSpec("osaka-overseer", "japanese-swordsman-actions-v1.png", (35, 30, 31), (154, 51, 43), "officer"),
    VariantSpec("osaka-ronin", "japanese-swordsman-actions-v1.png", (71, 62, 49), (126, 105, 71), "weathered"),
    VariantSpec("wako-raider", "japanese-swordsman-actions-v1.png", (30, 66, 67), (151, 72, 44), "raider"),
    VariantSpec("wako-archer", "japanese-archer-actions-v1.png", (32, 67, 66), (155, 76, 43), "raider"),
    VariantSpec("wako-captain", "japanese-general-actions-v1.png", (42, 31, 34), (171, 58, 45), "officer"),
    VariantSpec("osaka-gunner", "japanese-gunner-actions-v1.png", (35, 49, 69), (151, 112, 61), "plates"),

    # The Japanese fauna keeps the same approved gait but gets species-level
    # coat markings that remain visible at the runtime scale.
    VariantSpec("japanese-wild-boar", "boar-actions.webp", (48, 43, 40), (151, 137, 109), "bristles", True),
    VariantSpec("japanese-sika-deer", "ulleung-water-deer-actions-v1.png", (117, 65, 35), (218, 196, 145), "spots", True),
)


def load_rgba(name: str) -> Image.Image:
    image = Image.open(MONSTERS / name).convert("RGBA")
    if image.size != EXPECTED_SIZE:
        raise ValueError(f"{name}: expected {EXPECTED_SIZE}, got {image.size}")
    return image


def material_variant(image: Image.Image, spec: VariantSpec) -> Image.Image:
    source = np.asarray(image, dtype=np.uint8)
    output = source.copy()
    rgb = source[..., :3].astype(np.float32)
    alpha = source[..., 3]
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = (maximum - minimum) / np.maximum(maximum, 1)
    base = np.asarray(spec.base, dtype=np.float32)
    accent = np.asarray(spec.accent, dtype=np.float32)

    for row in range(ROWS):
        for column in range(COLS):
            y0, x0 = row * FRAME, column * FRAME
            cell_alpha = alpha[y0:y0 + FRAME, x0:x0 + FRAME]
            cell_rgb = rgb[y0:y0 + FRAME, x0:x0 + FRAME]
            cell_lum = luminance[y0:y0 + FRAME, x0:x0 + FRAME]
            cell_sat = saturation[y0:y0 + FRAME, x0:x0 + FRAME]
            ys, xs = np.where(cell_alpha > 16)
            if not len(xs):
                continue
            min_x, max_x = int(xs.min()), int(xs.max())
            min_y, max_y = int(ys.min()), int(ys.max())
            width = max(1, max_x - min_x + 1)
            height = max(1, max_y - min_y + 1)
            yy, xx = np.indices((FRAME, FRAME))
            nx = (xx - min_x) / width
            ny = (yy - min_y) / height
            visible = cell_alpha > 16

            if spec.animal:
                editable = visible
            else:
                skin = (
                    (cell_rgb[..., 0] > 78)
                    & (cell_rgb[..., 1] > 30)
                    & (cell_rgb[..., 0] > cell_rgb[..., 1] * 1.22)
                    & (cell_rgb[..., 1] > cell_rgb[..., 2] * 1.04)
                )
                bright_metal = (cell_sat < 0.16) & (cell_lum > 126)
                # Keep faces, hands and bright weapon edges.  Dark shafts and
                # scabbards take the faction palette so the unit reads whole.
                editable = visible & ~skin & ~bright_metal

            shade = np.clip(0.32 + cell_lum / 190.0, 0.28, 1.45)
            target = base[None, None, :] * shade[..., None]

            if spec.pattern == "apron":
                detail = visible & (ny > 0.42) & (ny < 0.86) & (np.abs(nx - 0.5) < 0.28)
            elif spec.pattern == "crossbelt":
                detail = visible & (ny > 0.22) & (ny < 0.72) & (np.abs((nx + ny * 0.72) - 0.88) < 0.055)
            elif spec.pattern == "hem":
                detail = visible & (ny > 0.68) & (((xx + column * 5) // 5) % 2 == 0)
            elif spec.pattern == "plates":
                detail = visible & (ny > 0.28) & (ny < 0.78) & (((xx // 6) + (yy // 5)) % 3 == 0)
            elif spec.pattern == "royal":
                detail = visible & (((ny > 0.34) & (ny < 0.42)) | ((ny > 0.66) & (ny < 0.72)))
            elif spec.pattern == "officer":
                detail = visible & (ny > 0.24) & (ny < 0.76) & (((xx + yy * 2) % 19) < 3)
            elif spec.pattern == "shield":
                detail = visible & (cell_lum > 45) & (((xx // 8) + (yy // 8)) % 2 == 0)
            elif spec.pattern == "weathered":
                detail = visible & (((xx * 3 + yy * 5) % 31) < 2)
            elif spec.pattern == "raider":
                detail = visible & (ny > 0.30) & (((xx + yy) % 23) < 4)
            elif spec.pattern == "bristles":
                detail = visible & (ny > 0.12) & (ny < 0.68) & (((xx + yy * 2) % 17) < 3)
            elif spec.pattern == "spots":
                detail = visible & (ny > 0.16) & (ny < 0.72) & ((((xx // 5) * 3 + (yy // 5) * 5) % 11) == 0)
            else:
                detail = np.zeros_like(visible)

            target[detail] = target[detail] * 0.42 + accent * 0.58
            cell_out = output[y0:y0 + FRAME, x0:x0 + FRAME, :3]
            cell_out[editable] = np.clip(target[editable], 0, 255).astype(np.uint8)

    output[alpha == 0, :3] = 0
    return Image.fromarray(output, "RGBA")


def main() -> None:
    for spec in SPECS:
        variant = material_variant(load_rgba(spec.source), spec)
        variant.save(MONSTERS / spec.output, format="PNG", optimize=True, compress_level=9)
    print(f"Built {len(SPECS)} dedicated faction and species monster atlases")


if __name__ == "__main__":
    main()
