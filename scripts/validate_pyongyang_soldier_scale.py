#!/usr/bin/env python3
"""Validate direction-safe body heights for the Pyongyang soldier atlases."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_BY_KIND = {
    "joseon-border-swordsman": ROOT / "public/assets/monsters/ulleung-guard-actions-v1.png",
    "joseon-border-spearman": ROOT / "public/assets/monsters/joseon-spearman-actions-v1.png",
    "joseon-border-archer": ROOT / "public/assets/monsters/joseon-archer-actions-v1.png",
    "joseon-border-commander": ROOT / "public/assets/monsters/joseon-pododaejang-actions-v1.png",
    "royal-guard": ROOT / "public/assets/monsters/ulleung-guard-actions-v1.png",
}
TARGET_BY_KIND = {
    "joseon-border-swordsman": 92.0,
    "joseon-border-spearman": 92.0,
    "joseon-border-archer": 92.0,
    "joseon-border-commander": 96.0,
    "royal-guard": 92.0,
}
TARGET_TOLERANCE = 1.0
MAX_DIRECTIONAL_DRIFT = 1.08
DENSE_BODY_ROW_PIXELS = 16


def walk_measurements(path: Path) -> tuple[list[list[int]], list[int]]:
    atlas = Image.open(path).convert("RGBA")
    heights: list[list[int]] = []
    bottoms: list[int] = []
    for row in range(5):
        row_heights: list[int] = []
        for column in range(4):
            cell = atlas.crop((
                column * 256,
                row * 256,
                (column + 1) * 256,
                (row + 1) * 256,
            ))
            alpha = cell.getchannel("A")
            opaque = alpha.point(lambda value: 255 if value > 16 else 0)
            bounds = opaque.getbbox()
            if bounds is None:
                raise AssertionError(f"empty walk frame: {path.name} row={row} column={column}")
            bottoms.append(bounds[3])
            dense_rows = [
                y
                for y in range(256)
                if alpha.crop((0, y, 256, y + 1))
                .point(lambda value: 255 if value > 16 else 0)
                .histogram()[255]
                >= DENSE_BODY_ROW_PIXELS
            ]
            if not dense_rows:
                raise AssertionError(
                    f"no dense body rows: {path.name} row={row} column={column}"
                )
            row_heights.append(dense_rows[-1] - dense_rows[0] + 1)
        heights.append(row_heights)
    return heights, bottoms


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_pyongyang_soldier_scale.py '<scale-json>'", file=sys.stderr)
        return 2
    scales = json.loads(sys.argv[1])
    rendered: dict[str, list[float]] = {}
    for kind, path in ASSET_BY_KIND.items():
        body_heights, foot_bottoms = walk_measurements(path)
        if min(foot_bottoms) < 247 or max(foot_bottoms) > 249:
            raise AssertionError(
                f"{kind}: foot baseline drifted outside 247..249px "
                f"({min(foot_bottoms)}..{max(foot_bottoms)})"
            )
        directional_scales = scales[kind]
        if not isinstance(directional_scales, list) or len(directional_scales) != 5:
            raise AssertionError(f"{kind}: expected five directional scale values")
        rendered_frames = [
            height * float(directional_scales[row])
            for row, row_heights in enumerate(body_heights)
            for height in row_heights
        ]
        row_averages = [
            sum(row_heights) / len(row_heights) * float(directional_scales[row])
            for row, row_heights in enumerate(body_heights)
        ]
        target = TARGET_BY_KIND[kind]
        for row, rendered_height in enumerate(row_averages):
            if abs(rendered_height - target) > TARGET_TOLERANCE:
                raise AssertionError(
                    f"{kind}: row {row} body height {rendered_height:.2f}px, "
                    f"expected {target:.2f}±{TARGET_TOLERANCE:.2f}px"
                )
        drift = max(rendered_frames) / min(rendered_frames)
        if drift > MAX_DIRECTIONAL_DRIFT:
            raise AssertionError(
                f"{kind}: directional body drift {drift:.3f} exceeds "
                f"{MAX_DIRECTIONAL_DRIFT:.2f}"
            )
        rendered[kind] = row_averages
    print(
        "Pyongyang soldier silhouettes normalized by body and direction: "
        + ", ".join(
            f"{kind}={min(heights):.2f}..{max(heights):.2f}px"
            for kind, heights in rendered.items()
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
