#!/usr/bin/env python3
"""Compose weapon-carry walk frames with the approved weapon attack frames.

Image generation is used only for columns 0-3.  Columns 4-7 are copied after
normalization from the approved V1 weapon attack atlases so attack timing and
grip poses cannot drift between generations.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME = 256
ROWS = 5
COLS = 8
WALK_COLS = 4
SIZE = (COLS * FRAME, ROWS * FRAME)
FOOTLINE = 249
MAX_CONTENT = 232
LOWER_BODY_TOP = 190
MAX_CONTACT_POSE_IOU = 0.90


def open_atlas(path: str) -> Image.Image:
    atlas = Image.open(path).convert("RGBA")
    if atlas.size != SIZE:
        raise ValueError(f"{path} must be {SIZE[0]}x{SIZE[1]}, got {atlas.size}")
    return atlas


def compose(walk: Image.Image, attack: Image.Image) -> Image.Image:
    result = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    for row in range(ROWS):
        top = row * FRAME
        bottom = top + FRAME
        result.alpha_composite(walk.crop((0, top, WALK_COLS * FRAME, bottom)), (0, top))
        result.alpha_composite(
            attack.crop((WALK_COLS * FRAME, top, COLS * FRAME, bottom)),
            (WALK_COLS * FRAME, top),
        )
    return result


def validate(atlas: Image.Image, label: str, body: bool) -> None:
    for row in range(ROWS):
        for column in range(COLS):
            frame = atlas.crop((
                column * FRAME,
                row * FRAME,
                (column + 1) * FRAME,
                (row + 1) * FRAME,
            ))
            box = frame.getchannel("A").getbbox()
            if box is None:
                raise ValueError(f"{label} frame {row},{column} is empty")
            if box[2] - box[0] > MAX_CONTENT or box[3] - box[1] > MAX_CONTENT:
                raise ValueError(f"{label} frame {row},{column} exceeds {MAX_CONTENT}px")
            if body and box[3] > FOOTLINE + 1:
                raise ValueError(f"{label} frame {row},{column} crosses footline {FOOTLINE}")
    if body:
        validate_walk_contact_poses(atlas, label)


def lower_body_mask(frame: Image.Image) -> set[tuple[int, int]]:
    alpha = frame.getchannel("A")
    pixels = alpha.load()
    return {
        (x, y)
        for y in range(LOWER_BODY_TOP, FRAME)
        for x in range(FRAME)
        if pixels[x, y] > 20
    }


def mask_iou(a: set[tuple[int, int]], b: set[tuple[int, int]]) -> float:
    if not a or not b:
        return 1.0
    return len(a & b) / len(a | b)


def walk_frame(atlas: Image.Image, row: int, column: int) -> Image.Image:
    return atlas.crop((
        column * FRAME,
        row * FRAME,
        (column + 1) * FRAME,
        (row + 1) * FRAME,
    ))


def validate_walk_contact_poses(atlas: Image.Image, label: str) -> None:
    for row in range(ROWS):
        first_contact = lower_body_mask(walk_frame(atlas, row, 0))
        second_contact = lower_body_mask(walk_frame(atlas, row, 2))
        overlap = mask_iou(first_contact, second_contact)
        if overlap >= MAX_CONTACT_POSE_IOU:
            raise ValueError(
                f"{label} row {row} walk contact poses do not alternate "
                f"(columns 0/2 lower-body IoU {overlap:.3f})"
            )


def save(atlas: Image.Image, path: str) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination)
    print(f"Wrote {destination} ({atlas.width}x{atlas.height})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--walk-body", required=True)
    parser.add_argument("--attack-body", required=True)
    parser.add_argument("--walk-hunter", required=True)
    parser.add_argument("--attack-hunter", required=True)
    parser.add_argument("--walk-warden", required=True)
    parser.add_argument("--attack-warden", required=True)
    parser.add_argument("--body-out", required=True)
    parser.add_argument("--hunter-out", required=True)
    parser.add_argument("--warden-out", required=True)
    args = parser.parse_args()

    outputs = (
        ("body", compose(open_atlas(args.walk_body), open_atlas(args.attack_body)), args.body_out, True),
        ("hunter", compose(open_atlas(args.walk_hunter), open_atlas(args.attack_hunter)), args.hunter_out, False),
        ("warden", compose(open_atlas(args.walk_warden), open_atlas(args.attack_warden)), args.warden_out, False),
    )
    for label, atlas, destination, body in outputs:
        validate(atlas, label, body)
        save(atlas, destination)


if __name__ == "__main__":
    main()
