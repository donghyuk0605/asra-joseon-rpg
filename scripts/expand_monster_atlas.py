#!/usr/bin/env python3
"""Expand normalized monster atlases to 8 columns: walk 4 + attack 4."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_columns(value: str | None) -> list[int] | None:
    if value is None:
        return None
    return [int(column.strip()) for column in value.split(",")]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--source-cols", type=int, required=True)
    parser.add_argument("--rows", type=int, default=5)
    parser.add_argument("--frame-size", type=int, default=256)
    parser.add_argument("--walk-cols", help="Four comma-separated source columns")
    parser.add_argument("--attack-cols", help="Four comma-separated source columns")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    output = Image.new("RGBA", (8 * args.frame_size, args.rows * args.frame_size), (0, 0, 0, 0))
    walk_map = parse_columns(args.walk_cols) or [0, 1, 2, 3]
    attack_map = parse_columns(args.attack_cols)
    if len(walk_map) != 4:
        raise ValueError("--walk-cols must contain exactly four columns")

    if attack_map is None:
        available_attacks = list(range(4, args.source_cols))
        if len(available_attacks) >= 4:
            attack_map = available_attacks[:4]
        elif len(available_attacks) == 3:
            attack_map = [available_attacks[0], available_attacks[1], available_attacks[1], available_attacks[2]]
        elif len(available_attacks) == 2:
            attack_map = [available_attacks[0], available_attacks[0], available_attacks[1], 0]
        elif len(available_attacks) == 1:
            attack_map = [available_attacks[0], available_attacks[0], available_attacks[0], 0]
        else:
            attack_map = [0, 1, 2, 3]
    if len(attack_map) != 4:
        raise ValueError("--attack-cols must contain exactly four columns")

    for row in range(args.rows):
        mapping = [*walk_map, *attack_map]
        for out_col, source_col in enumerate(mapping):
            box = (
                source_col * args.frame_size,
                row * args.frame_size,
                (source_col + 1) * args.frame_size,
                (row + 1) * args.frame_size,
            )
            frame = source.crop(box)
            if frame.getchannel("A").getbbox() is None:
                fallback_col = 0 if out_col == 7 else max(0, source_col - 1)
                frame = source.crop((
                    fallback_col * args.frame_size,
                    row * args.frame_size,
                    (fallback_col + 1) * args.frame_size,
                    (row + 1) * args.frame_size,
                ))
            output.alpha_composite(frame, (out_col * args.frame_size, row * args.frame_size))

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination)
    print(f"Wrote {destination} ({output.width}x{output.height})")


if __name__ == "__main__":
    main()
