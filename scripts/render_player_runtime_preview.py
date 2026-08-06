#!/usr/bin/env python3
"""Render the actual player body, armor, and weapon transforms into a QA sheet."""

from __future__ import annotations

import math
import re
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
FRAME = 256
ROWS = 5
COLS = 8
PLAYER_SCALE = 0.51
WEAPON_SCALE = 0.245
WEAPON_GRIP = (128, 50)
ROOT_POINT = (FRAME // 2, 210)


def attachments() -> tuple[list[tuple[int, int, float, bool]], list[tuple[int, int, float, bool]]]:
    source = (ROOT / "src/game/phaser/playerLayerState.ts").read_text()
    matches = re.findall(
        r"\{ x: (-?\d+), y: (-?\d+), rotation: (-?\d+(?:\.\d+)?), behindBody: (true|false) \}",
        source,
    )
    expected = ROWS * 4 * 2
    if len(matches) != expected:
        raise ValueError(f"Expected {expected} authored attachments, found {len(matches)}")
    parsed = [(int(x), int(y), float(rotation), behind == "true") for x, y, rotation, behind in matches]
    return parsed[:ROWS * 4], parsed[ROWS * 4:]


def atlas_frame(atlas: Image.Image, index: int) -> Image.Image:
    row, column = divmod(index, COLS)
    return atlas.crop((column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME))


def render_sprite(frame: Image.Image, scale: float) -> tuple[Image.Image, tuple[int, int]]:
    size = max(1, round(FRAME * scale))
    sprite = frame.resize((size, size), Image.Resampling.LANCZOS)
    position = (
        round(ROOT_POINT[0] - size * 0.5),
        round(ROOT_POINT[1] - size * 0.97),
    )
    return sprite, position


def render_weapon(
    weapon: Image.Image,
    source_x: int,
    source_y: int,
    rotation: float,
) -> tuple[Image.Image, tuple[int, int]]:
    size = max(1, round(FRAME * WEAPON_SCALE))
    sprite = weapon.resize((size, size), Image.Resampling.LANCZOS)
    turntable_size = 192
    center = turntable_size // 2
    turntable = Image.new("RGBA", (turntable_size, turntable_size), (0, 0, 0, 0))
    grip = (
        round(size * WEAPON_GRIP[0] / FRAME),
        round(size * WEAPON_GRIP[1] / FRAME),
    )
    turntable.alpha_composite(sprite, (center - grip[0], center - grip[1]))
    rotated = turntable.rotate(-math.degrees(rotation), resample=Image.Resampling.BICUBIC, center=(center, center))
    runtime_x = (source_x - FRAME * 0.5) * PLAYER_SCALE
    runtime_y = (source_y - FRAME * 0.97) * PLAYER_SCALE
    return rotated, (round(ROOT_POINT[0] + runtime_x - center), round(ROOT_POINT[1] + runtime_y - center))


def render_preview(armor_path: Path, output: Path) -> None:
    body = Image.open(ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v3.png").convert("RGBA")
    armor = Image.open(armor_path).convert("RGBA")
    weapon = Image.open(ROOT / "public/assets/weapons/worn-hwando-world-v1.png").convert("RGBA")
    carry_poses, attack_poses = attachments()
    preview = Image.new("RGBA", (COLS * FRAME, ROWS * FRAME), (18, 20, 18, 255))

    for index in range(ROWS * COLS):
        row, column = divmod(index, COLS)
        attack = column >= 4
        pose_index = row * 4 + (column - 4 if attack else column)
        x, y, rotation, behind = attack_poses[pose_index] if attack else carry_poses[pose_index]
        cell = Image.new("RGBA", (FRAME, FRAME), (24, 27, 23, 255))
        draw = ImageDraw.Draw(cell)
        draw.ellipse((82, ROOT_POINT[1] - 5, 174, ROOT_POINT[1] + 16), fill=(4, 5, 4, 110))
        body_sprite, body_position = render_sprite(atlas_frame(body, index), PLAYER_SCALE)
        armor_sprite, armor_position = render_sprite(atlas_frame(armor, index), PLAYER_SCALE)
        weapon_sprite, weapon_position = render_weapon(
            weapon, x, y, rotation,
        )
        if behind:
            cell.alpha_composite(weapon_sprite, weapon_position)
        cell.alpha_composite(body_sprite, body_position)
        cell.alpha_composite(armor_sprite, armor_position)
        if not behind:
            cell.alpha_composite(weapon_sprite, weapon_position)
        preview.alpha_composite(cell, (column * FRAME, row * FRAME))

    output.parent.mkdir(parents=True, exist_ok=True)
    preview.save(output)
    print(f"Wrote {output}")


def main() -> None:
    variants = (
        (
            ROOT / "public/assets/characters/joseon-hero-hunter-weapon-ready-layer-v2.png",
            ROOT / "assets/sprites/joseon-hero-components-v9/processed/runtime-weapon-ready-hunter-preview.png",
        ),
        (
            ROOT / "public/assets/characters/joseon-hero-warden-weapon-ready-layer-v2.png",
            ROOT / "assets/sprites/joseon-hero-components-v9/processed/runtime-weapon-ready-warden-preview.png",
        ),
        (
            ROOT / "public/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v2.png",
            ROOT / "assets/sprites/joseon-hero-components-v9/processed/runtime-weapon-ready-tiger-preview.png",
        ),
    )
    for armor, output in variants:
        render_preview(armor, output)


if __name__ == "__main__":
    main()
