#!/usr/bin/env python3
"""Normalize every active monster frame and repair the legacy static bandit attack."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
COVERAGE_PATH = ROOT / "docs/graphics/visual-coverage.generated.json"
FRAME_SIZE = 256
ROWS = 5
COLS = 8
ALPHA_THRESHOLD = 16
FOOTLINE_MAX_Y = 248
MAX_CONTENT = 232
BANDIT_PATH = "/assets/monsters/bandit-actions.png"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="Overwrite active runtime atlases")
    parser.add_argument("--rewrite-webp", action="store_true", help="Re-encode active WebP files after clearing hidden RGB")
    return parser.parse_args()


def opaque_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").point(lambda value: 255 if value > ALPHA_THRESHOLD else 0).getbbox()


def frame(atlas: Image.Image, row: int, column: int) -> Image.Image:
    return atlas.crop((
        column * FRAME_SIZE,
        row * FRAME_SIZE,
        (column + 1) * FRAME_SIZE,
        (row + 1) * FRAME_SIZE,
    ))


def scale_around_footline(source: Image.Image, scale: float) -> Image.Image:
    bbox = source.getchannel("A").getbbox()
    threshold_bbox = opaque_bbox(source)
    if bbox is None or threshold_bbox is None:
        return source.copy()
    content = source.crop(bbox)
    content = content.resize(
        (max(1, round(content.width * scale)), max(1, round(content.height * scale))),
        Image.Resampling.LANCZOS,
    )
    content_threshold = opaque_bbox(content)
    if content_threshold is None:
        return source.copy()
    target_center_x = (threshold_bbox[0] + threshold_bbox[2]) / 2
    content_center_x = (content_threshold[0] + content_threshold[2]) / 2
    paste_x = round(target_center_x - content_center_x)
    paste_y = FOOTLINE_MAX_Y + 1 - content_threshold[3]
    output = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    output.alpha_composite(content, (paste_x, paste_y))
    return output


def repair_bandit_attacks(atlas: Image.Image) -> tuple[Image.Image, bool]:
    if all(len({frame(atlas, row, column).tobytes() for column in range(4, 8)}) >= 3 for row in range(ROWS)):
        return atlas.copy(), False
    repaired = atlas.copy()
    for row in range(ROWS):
        sequence = [
            frame(atlas, row, 3),
            frame(atlas, row, 4),
            scale_around_footline(frame(atlas, row, 4), 1.015),
            frame(atlas, row, 0),
        ]
        for offset, pose in enumerate(sequence):
            repaired.paste(pose, ((offset + 4) * FRAME_SIZE, row * FRAME_SIZE))
    return repaired, True


def normalize_frame(source: Image.Image) -> tuple[Image.Image, bool]:
    bbox = opaque_bbox(source)
    if bbox is None:
        raise ValueError("empty frame")
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    scale = min(1.0, MAX_CONTENT / width, MAX_CONTENT / height)
    if scale < 0.9999:
        normalized = scale_around_footline(source, scale)
        return normalized, normalized.tobytes() != source.tobytes()

    shift_y = FOOTLINE_MAX_Y - (bbox[3] - 1)
    if shift_y == 0:
        return source.copy(), False
    normalized = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    normalized.alpha_composite(source, (0, shift_y))
    return normalized, True


def save_atlas(atlas: Image.Image, destination: Path) -> None:
    if destination.suffix.lower() == ".webp":
        # Lossless WebP stores RGB even when alpha is zero. Clearing those
        # invisible colors keeps the normalized atlas compact and deterministic.
        transparent = atlas.getchannel("A").point(lambda value: 255 if value == 0 else 0)
        atlas.paste((0, 0, 0, 0), (0, 0, atlas.width, atlas.height), transparent)
        atlas.save(destination, format="WEBP", lossless=True, quality=100, method=6)
    else:
        atlas.save(destination, format="PNG", compress_level=7)


def main() -> None:
    args = parse_args()
    coverage = json.loads(COVERAGE_PATH.read_text(encoding="utf-8"))
    active_paths = sorted({monster["asset"]["path"] for monster in coverage["monsters"]})
    changed_files = 0
    changed_frames = 0

    for asset_path in active_paths:
        disk_path = ROOT / "public" / asset_path.lstrip("/")
        with Image.open(disk_path) as opened:
            atlas = opened.convert("RGBA")
        if atlas.size != (COLS * FRAME_SIZE, ROWS * FRAME_SIZE):
            raise ValueError(f"{asset_path}: expected 2048x1280, got {atlas.size}")
        repaired_static_attack = False
        if asset_path == BANDIT_PATH:
            atlas, repaired_static_attack = repair_bandit_attacks(atlas)

        output = Image.new("RGBA", atlas.size, (0, 0, 0, 0))
        file_changed = repaired_static_attack or (args.rewrite_webp and disk_path.suffix.lower() == ".webp")
        for row in range(ROWS):
            for column in range(COLS):
                source = frame(atlas, row, column)
                normalized, changed = normalize_frame(source)
                changed_frames += int(changed)
                file_changed = file_changed or changed
                output.paste(normalized, (column * FRAME_SIZE, row * FRAME_SIZE))

        if not file_changed:
            continue
        changed_files += 1
        print(f"{'WRITE' if args.write else 'WOULD WRITE'} {asset_path}")
        if args.write:
            save_atlas(output, disk_path)

    print(f"active atlases={len(active_paths)} changed files={changed_files} normalized frames={changed_frames}")
    if not args.write:
        print("Dry run only. Re-run with --write to update runtime atlases.")


if __name__ == "__main__":
    main()
