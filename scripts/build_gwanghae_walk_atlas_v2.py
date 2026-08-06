#!/usr/bin/env python3
"""Build Gwanghae v2 by normalizing a generated walk grid and preserving v1 attacks."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


FRAME = 256
ROWS = 5
WALK_COLS = 4
ATLAS_COLS = 8
FOOT_BASELINE = FRAME - 7


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--walk", required=True, help="Transparent 4x5 generated walk grid")
    parser.add_argument("--previous", required=True, help="Approved 8x5 v1 atlas")
    parser.add_argument("--out", required=True)
    return parser.parse_args()


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("Encountered an empty Gwanghae walk cell")
    return bounds


def clean_subject(cell: Image.Image) -> Image.Image:
    """Discard isolated chroma spill while retaining nearby shoes and scabbard pieces."""
    alpha = cell.getchannel("A")
    width, height = cell.size
    pixels = alpha.load()
    occupied = {(x, y) for y in range(height) for x in range(width) if pixels[x, y] > 24}
    components: list[set[tuple[int, int]]] = []
    while occupied:
        seed = occupied.pop()
        component = {seed}
        queue: deque[tuple[int, int]] = deque([seed])
        while queue:
            x, y = queue.popleft()
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    point = (nx, ny)
                    if point in occupied:
                        occupied.remove(point)
                        component.add(point)
                        queue.append(point)
        components.append(component)

    if not components:
        raise RuntimeError("Encountered an empty Gwanghae walk cell")
    main = max(components, key=len)
    main_x = [point[0] for point in main]
    main_y = [point[1] for point in main]
    main_box = (min(main_x), min(main_y), max(main_x) + 1, max(main_y) + 1)
    retained: set[tuple[int, int]] = set()
    for component in components:
        xs = [point[0] for point in component]
        ys = [point[1] for point in component]
        box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
        nearby = not (
            box[2] < main_box[0] - 52
            or box[0] > main_box[2] + 52
            or box[3] < main_box[1] - 32
            or box[1] > main_box[3] + 32
        )
        if component is main or (len(component) >= 24 and nearby):
            retained.update(component)

    binary = Image.new("L", cell.size, 0)
    binary_pixels = binary.load()
    for x, y in retained:
        binary_pixels[x, y] = 255
    fringe = binary.filter(ImageFilter.MaxFilter(5))
    cleaned_alpha = ImageChops.multiply(alpha, fringe)
    cleaned = cell.copy()
    cleaned.putalpha(cleaned_alpha)
    return cleaned


def accentuate_frontal_contact(frame: Image.Image, column: int) -> Image.Image:
    """Open the frontal robe hem so opposite planted shoes remain readable at game scale."""
    if column not in (0, 2):
        return frame
    original = frame.copy()
    result = frame.copy()
    # Displacement grows below the knees, retaining an unbroken upper-body silhouette.
    for top, bottom, rear_shift, planted_shift in ((220, 232, 1, 3), (232, 250, 2, 9)):
        band = original.crop((0, top, FRAME, bottom))
        left = band.crop((0, 0, FRAME // 2, bottom - top))
        right = band.crop((FRAME // 2, 0, FRAME, bottom - top))
        result.paste((0, 0, 0, 0), (0, top, FRAME, bottom))
        if column == 0:
            # Viewer-right shoe is the forward contact; viewer-left shoe passes inward.
            result.alpha_composite(left, (rear_shift, top))
            result.alpha_composite(right, (FRAME // 2 + planted_shift, top))
        else:
            # The opposite contact mirrors the support foot without moving the root.
            result.alpha_composite(left, (-planted_shift, top))
            result.alpha_composite(right, (FRAME // 2 - rear_shift, top))
    return result


def main() -> None:
    args = parse_args()
    walk = Image.open(args.walk).convert("RGBA")
    previous = Image.open(args.previous).convert("RGBA")
    expected_previous = (ATLAS_COLS * FRAME, ROWS * FRAME)
    if previous.size != expected_previous:
        raise ValueError(f"Previous atlas must be {expected_previous}, got {previous.size}")

    cell_width = walk.width / WALK_COLS
    cell_height = walk.height / ROWS
    poses: list[Image.Image] = []
    for row in range(ROWS):
        for column in range(WALK_COLS):
            cell = walk.crop(
                (
                    round(column * cell_width),
                    round(row * cell_height),
                    round((column + 1) * cell_width),
                    round((row + 1) * cell_height),
                )
            )
            cell = clean_subject(cell)
            poses.append(cell.crop(alpha_bounds(cell)))

    # Match the approved v1 on-screen stature and correct modest generation-scale
    # drift so direction changes never make the character grow or shrink.
    previous_heights: list[int] = []
    for row in range(ROWS):
        for column in range(WALK_COLS):
            old = previous.crop(
                (column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME)
            )
            box = alpha_bounds(old)
            previous_heights.append(box[3] - box[1])
    target_height = round(sum(previous_heights) / len(previous_heights))
    atlas = Image.new("RGBA", expected_previous, (0, 0, 0, 0))
    pose_scales: list[float] = []
    for index, pose in enumerate(poses):
        pose_scale = min(target_height / pose.height, 232 / pose.width, 232 / pose.height)
        pose_scales.append(pose_scale)
        pose = pose.resize(
            (
                max(1, round(pose.width * pose_scale)),
                max(1, round(pose.height * pose_scale)),
            ),
            Image.Resampling.LANCZOS,
        )
        # Make the authored foot line deterministic for both Pillow and runtime
        # alpha-threshold checks; near-zero resampling fringe is not visible art.
        pose.putalpha(pose.getchannel("A").point(lambda value: 0 if value <= 16 else value))
        pose = pose.crop(alpha_bounds(pose))
        row, column = divmod(index, WALK_COLS)
        normalized = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        normalized.alpha_composite(pose, ((FRAME - pose.width) // 2, FOOT_BASELINE - pose.height))
        if row in (0, ROWS - 1):
            normalized = accentuate_frontal_contact(normalized, column)
        atlas.alpha_composite(normalized, (column * FRAME, row * FRAME))

    # Attack frames are copied byte-for-byte at pixel level from the approved v1 atlas.
    for row in range(ROWS):
        attack = previous.crop(
            (WALK_COLS * FRAME, row * FRAME, ATLAS_COLS * FRAME, (row + 1) * FRAME)
        )
        atlas.alpha_composite(attack, (WALK_COLS * FRAME, row * FRAME))

    for row in range(ROWS):
        old_attack = previous.crop(
            (WALK_COLS * FRAME, row * FRAME, ATLAS_COLS * FRAME, (row + 1) * FRAME)
        )
        new_attack = atlas.crop(
            (WALK_COLS * FRAME, row * FRAME, ATLAS_COLS * FRAME, (row + 1) * FRAME)
        )
        if ImageChops.difference(old_attack, new_attack).getbbox() is not None:
            raise AssertionError(f"Attack row {row} changed during walk rebuild")

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination)
    print(
        f"Wrote {destination} ({atlas.width}x{atlas.height}); "
        f"pose scales={min(pose_scales):.4f}..{max(pose_scales):.4f}, "
        f"target height={target_height}px, baseline={FOOT_BASELINE}"
    )


if __name__ == "__main__":
    main()
