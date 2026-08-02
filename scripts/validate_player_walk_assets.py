#!/usr/bin/env python3
"""Validate player walk atlases that are easy to miss in DOM/unit tests."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
FRAME = 256
ROWS = 5
COLS = 8
SIZE = (COLS * FRAME, ROWS * FRAME)
LOWER_BODY_TOP = 190
MAX_CONTACT_POSE_IOU = 0.91
FOOT_BASELINE = FRAME - 7
MAX_HEIGHT_VARIATION = 0.08


def open_atlas(path: Path) -> Image.Image:
    atlas = Image.open(path).convert("RGBA")
    if atlas.size != SIZE:
        raise AssertionError(f"{path.name} must be {SIZE[0]}x{SIZE[1]}, got {atlas.size}")
    return atlas


def frame(atlas: Image.Image, row: int, column: int) -> Image.Image:
    return atlas.crop((column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME))


def assert_same_frame(actual: Image.Image, expected: Image.Image, label: str) -> None:
    if ImageChops.difference(actual, expected).getbbox() is not None:
        raise AssertionError(f"{label} must inherit the approved base walk frame exactly")


def lower_body_mask(image: Image.Image) -> set[tuple[int, int]]:
    alpha = image.getchannel("A")
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


def assert_alternating_walk(atlas: Image.Image, label: str) -> None:
    for row in range(ROWS):
        overlap = mask_iou(lower_body_mask(frame(atlas, row, 0)), lower_body_mask(frame(atlas, row, 2)))
        if overlap >= MAX_CONTACT_POSE_IOU:
            raise AssertionError(
                f"{label} row {row} columns 0/2 lower-body IoU {overlap:.3f}; feet read as sliding"
            )


def assert_full_walk_modeling(atlas: Image.Image, label: str) -> None:
    heights: list[int] = []
    for row in range(ROWS):
        walk_frames = [frame(atlas, row, column) for column in range(4)]
        boxes = [pose.getchannel("A").getbbox() for pose in walk_frames]
        if any(box is None for box in boxes):
            raise AssertionError(f"{label} contains an empty walk pose in row {row}")
        for column, box in enumerate(boxes):
            assert box is not None
            if box[3] != FOOT_BASELINE:
                raise AssertionError(
                    f"{label} pose {row},{column} bottom {box[3]} "
                    f"misses foot baseline {FOOT_BASELINE}"
                )
            heights.append(box[3] - box[1])
        if len({pose.tobytes() for pose in walk_frames}) != 4:
            raise AssertionError(
                f"{label} row {row} must contain four uniquely modeled walk poses"
            )
    if (max(heights) - min(heights)) / max(heights) > MAX_HEIGHT_VARIATION:
        raise AssertionError(
            f"{label} walk height varies by more than {MAX_HEIGHT_VARIATION:.0%}: "
            f"{min(heights)}..{max(heights)}px"
        )


def assert_only_walk_changed(
    candidate: Image.Image,
    previous: Image.Image,
    label: str,
) -> None:
    for row in range(ROWS):
        for column in range(COLS):
            if column < 4:
                continue
            if ImageChops.difference(frame(candidate, row, column), frame(previous, row, column)).getbbox():
                raise AssertionError(f"{label} unexpectedly changed frame {row},{column}")


def main() -> None:
    previous_base = open_atlas(ROOT / "public/assets/characters/joseon-hero-base-body-v6.png")
    previous_ready = open_atlas(ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v1.png")
    base_body = open_atlas(ROOT / "public/assets/characters/joseon-hero-base-body-v8.png")
    ready_body = open_atlas(ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v3.png")
    base_hunter = open_atlas(ROOT / "public/assets/characters/joseon-hero-armor-layer-v4.png")
    ready_hunter = open_atlas(ROOT / "public/assets/characters/joseon-hero-hunter-weapon-ready-layer-v2.webp")
    base_warden = open_atlas(ROOT / "public/assets/characters/joseon-hero-warden-layer-v2.png")
    ready_warden = open_atlas(ROOT / "public/assets/characters/joseon-hero-warden-weapon-ready-layer-v2.webp")
    base_tiger = open_atlas(ROOT / "public/assets/characters/joseon-hero-tiger-pelt-layer-v2.png")
    ready_tiger = open_atlas(ROOT / "public/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v2.png")
    previous_hajin = open_atlas(ROOT / "public/assets/characters/harlan-frontier-archer-actions-v1.png")
    hajin = open_atlas(ROOT / "public/assets/characters/hajin-frontier-archer-actions-v2.png")
    previous_gwanghae = open_atlas(ROOT / "public/assets/characters/joseon-gwanghae-actions-v1.png")
    gwanghae = open_atlas(ROOT / "public/assets/characters/joseon-gwanghae-actions-v2.png")

    assert_full_walk_modeling(base_body, "unequipped body")
    assert_full_walk_modeling(ready_body, "weapon-ready body")
    assert_alternating_walk(base_body, "unequipped body")
    assert_alternating_walk(ready_body, "weapon-ready body")
    assert_only_walk_changed(base_body, previous_base, "unequipped body v8")
    assert_only_walk_changed(ready_body, previous_ready, "weapon-ready body v3")
    assert_full_walk_modeling(hajin, "Hajin frontier archer")
    assert_alternating_walk(hajin, "Hajin frontier archer")
    assert_only_walk_changed(hajin, previous_hajin, "Hajin frontier archer v2")
    assert_full_walk_modeling(gwanghae, "Crown Prince Gwanghae")
    assert_alternating_walk(gwanghae, "Crown Prince Gwanghae")
    assert_only_walk_changed(gwanghae, previous_gwanghae, "Crown Prince Gwanghae v2")
    for row in range(ROWS):
        for column in range(4):
            assert_same_frame(frame(ready_body, row, column), frame(base_body, row, column), f"body {row},{column}")
            assert_same_frame(
                frame(ready_hunter, row, column),
                frame(base_hunter, row, column),
                f"hunter layer {row},{column}",
            )
            assert_same_frame(
                frame(ready_warden, row, column),
                frame(base_warden, row, column),
                f"warden layer {row},{column}",
            )
            assert_same_frame(
                frame(ready_tiger, row, column),
                frame(base_tiger, row, column),
                f"tiger-pelt layer {row},{column}",
            )
    print(
        "Player weapon-ready walk assets inherit the approved alternating base gait; "
        "all five source directions are body-locked, grounded, and uniquely modeled."
    )


if __name__ == "__main__":
    main()
