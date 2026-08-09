#!/usr/bin/env python3
"""Validate the complete regional armor layer fleet and cleaned legacy layers."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / "public/assets/characters"
FRAME = 256
ITEM_IDS = (
    "frontier-lamellar-coat",
    "coastal-scout-coat",
    "haeju-reed-cape",
    "anju-frontier-coat",
    "gongju-scholar-coat",
)
ALL_ARMOR_IDS = ("hunter-durumagi", "warden-durumagi", "tiger-pelt-armor", *ITEM_IDS)


def expected_paths() -> list[Path]:
    paths: list[Path] = []
    for item_id in ITEM_IDS:
        paths.extend((
            CHARACTERS / f"joseon-hero-{item_id}-layer-v1.png",
            CHARACTERS / f"joseon-hero-{item_id}-weapon-ready-layer-v1.png",
        ))
    for item_id in ALL_ARMOR_IDS:
        paths.extend((
            CHARACTERS / f"hajin-{item_id}-armor-layer-v1.png",
            CHARACTERS / f"hajin-{item_id}-melee-armor-layer-v1.png",
        ))
    paths.extend(
        CHARACTERS / f"joseon-hero-{kind}-weapon-ready-layer-v3.png"
        for kind in ("hunter", "warden", "tiger-pelt")
    )
    return paths


def frame_counts(alpha: np.ndarray) -> list[int]:
    return [
        int((alpha[row * FRAME:(row + 1) * FRAME, column * FRAME:(column + 1) * FRAME] > 16).sum())
        for row in range(5)
        for column in range(8)
    ]


def assert_body_locked(path: Path, body_alpha: Image.Image) -> None:
    alpha = np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[..., 3]
    allowed = np.asarray(body_alpha.filter(ImageFilter.MaxFilter(25)), dtype=np.uint8)
    escaped = int(((alpha > 16) & (allowed <= 16)).sum())
    if escaped:
        raise AssertionError(f"{path.name}: {escaped} pixels escape the approved body silhouette")


def main() -> None:
    paths = expected_paths()
    missing = [path.name for path in paths if not path.is_file()]
    if missing:
        raise AssertionError(f"missing armor layers: {missing}")

    hashes: set[str] = set()
    for path in paths:
        image = Image.open(path)
        if image.size != (2048, 1280):
            raise AssertionError(f"{path.name}: expected 2048x1280, got {image.size}")
        if image.mode != "RGBA":
            raise AssertionError(f"{path.name}: expected RGBA PNG, got {image.mode}")
        hashes.add(sha256(path.read_bytes()).hexdigest())

    if len(hashes) != len(paths):
        raise AssertionError("regional armor layers must be visually distinct files")

    # Palette siblings share an alpha grid by construction. Decode one sample
    # for each source silhouette plus both Hajin bodies and all three cleaned
    # legacy-ready layers; headers and hashes above still cover every file.
    sample_names = (
        "joseon-hero-frontier-lamellar-coat-layer-v1.png",
        "joseon-hero-coastal-scout-coat-layer-v1.png",
        "joseon-hero-haeju-reed-cape-layer-v1.png",
        "joseon-hero-frontier-lamellar-coat-weapon-ready-layer-v1.png",
        "joseon-hero-coastal-scout-coat-weapon-ready-layer-v1.png",
        "joseon-hero-haeju-reed-cape-weapon-ready-layer-v1.png",
        "hajin-frontier-lamellar-coat-armor-layer-v1.png",
        "hajin-frontier-lamellar-coat-melee-armor-layer-v1.png",
        "joseon-hero-hunter-weapon-ready-layer-v3.png",
        "joseon-hero-warden-weapon-ready-layer-v3.png",
        "joseon-hero-tiger-pelt-weapon-ready-layer-v3.png",
    )
    for name in sample_names:
        path = CHARACTERS / name
        image = Image.open(path).convert("RGBA")
        alpha = np.asarray(image, dtype=np.uint8)[..., 3]
        if any(alpha[y, x] > 0 for x, y in ((0, 0), (2047, 0), (0, 1279), (2047, 1279))):
            raise AssertionError(f"{path.name}: atlas corners must be transparent")
        counts = frame_counts(alpha)
        if min(counts) < 3_000 or max(counts) > 7_000:
            raise AssertionError(f"{path.name}: implausible frame coverage {min(counts)}..{max(counts)}")

    ready_body = Image.open(CHARACTERS / "joseon-hero-weapon-ready-body-v3.png").convert("RGBA").getchannel("A")
    for name in sample_names:
        if "joseon-hero" in name and "weapon-ready" in name:
            assert_body_locked(CHARACTERS / name, ready_body)

    concept = Image.open(ROOT / "assets/generated/armors/regional-armor-material-reference-v1.png").convert("RGBA")
    if concept.getchannel("A").getextrema() != (0, 255):
        raise AssertionError("regional material reference must retain transparent and opaque pixels")

    print(f"Validated {len(paths)} body-locked armor atlases and five-material reference")


if __name__ == "__main__":
    main()
