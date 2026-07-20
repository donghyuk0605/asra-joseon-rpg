from __future__ import annotations

from pathlib import Path
import argparse

from PIL import Image, ImageDraw


FRAME_SIZE = 256
WALK_COLUMNS = range(4)
SIDE_ROWS = {1, 2, 3}
NORTH_ROW = 4
FOOTLINE_Y = 246

TARGETS = [
    Path("public/assets/characters/joseon-hero-unequipped-v2.png"),
    Path("public/assets/characters/joseon-hero-weapon-only-v2.png"),
    Path("public/assets/characters/joseon-hero-armor-only-v2.png"),
    Path("public/assets/characters/joseon-hero-fully-equipped-v2.png"),
]


def average_lower_colour(frame: Image.Image) -> tuple[int, int, int]:
    pixels: list[tuple[int, int, int]] = []
    for y in range(188, 248):
        for x in range(48, 208):
            r, g, b, a = frame.getpixel((x, y))
            if a > 64:
                pixels.append((r, g, b))
    if not pixels:
        return (194, 134, 83)
    pixels.sort(key=lambda rgb: rgb[0] + rgb[1] + rgb[2], reverse=True)
    sample = pixels[: max(1, len(pixels) // 5)]
    return tuple(sum(channel) // len(sample) for channel in zip(*sample))


def darken(colour: tuple[int, int, int], amount: float) -> tuple[int, int, int, int]:
    return (
        max(0, int(colour[0] * amount)),
        max(0, int(colour[1] * amount)),
        max(0, int(colour[2] * amount)),
        220,
    )


def brighten(colour: tuple[int, int, int], amount: float) -> tuple[int, int, int, int]:
    return (
        min(255, int(colour[0] * amount)),
        min(255, int(colour[1] * amount)),
        min(255, int(colour[2] * amount)),
        235,
    )


def lower_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    alpha = frame.getchannel("A")
    bbox = alpha.crop((38, 156, 218, 250)).getbbox()
    if not bbox:
        return (92, 160, 164, 248)
    return (bbox[0] + 38, bbox[1] + 156, bbox[2] + 38, bbox[3] + 156)


def draw_foot(draw: ImageDraw.ImageDraw, x: float, y: float, size: float, colour: tuple[int, int, int], forward: int) -> None:
    outline = darken(colour, 0.42)
    fill = brighten(colour, 1.02)
    toe = x + forward * size * 0.34
    draw.ellipse((x - size * 0.56, y - size * 0.22, x + size * 0.56, y + size * 0.2), fill=outline)
    draw.ellipse((x - size * 0.43, y - size * 0.34, x + size * 0.68, y + size * 0.07), fill=fill)
    draw.ellipse((toe - size * 0.24, y - size * 0.4, toe + size * 0.35, y - size * 0.03), fill=brighten(colour, 1.13))


def enhance_side_walk(frame: Image.Image, row: int, column: int) -> Image.Image:
    out = frame.copy()
    draw = ImageDraw.Draw(out, "RGBA")
    colour = average_lower_colour(frame)
    left, _top, right, bottom = lower_bbox(frame)
    center = (left + right) / 2
    width = max(44, right - left)
    phase = [-1, 0, 1, 0][column]
    diagonal_bias = {1: 3.0, 2: 0.0, 3: -2.0}[row]
    y = min(FOOTLINE_Y, max(232, bottom - 5))

    draw.line(
        (
            center - width * 0.16 - phase * 2,
            y - 43,
            center - width * 0.05 - phase * 4,
            y - 13,
        ),
        fill=darken(colour, 0.34),
        width=3,
    )
    draw.line(
        (
            center + width * 0.1 + phase * 2,
            y - 39,
            center + width * 0.02 + phase * 5,
            y - 10,
        ),
        fill=darken(colour, 0.38),
        width=2,
    )

    if phase == 0:
        draw_foot(draw, center - width * 0.23, y - 2 + diagonal_bias, 9.2, colour, -1)
        draw_foot(draw, center + width * 0.19, y - 6 - diagonal_bias, 8.4, colour, 1)
    else:
        draw_foot(draw, center - phase * width * 0.34, y - 1 + diagonal_bias * 0.5, 10.2, colour, -phase)
        draw_foot(draw, center + phase * width * 0.19, y - 8 - diagonal_bias * 0.45, 8.2, colour, phase)
    return out


def enhance_north_walk(frame: Image.Image, column: int) -> Image.Image:
    out = frame.copy()
    draw = ImageDraw.Draw(out, "RGBA")
    colour = average_lower_colour(frame)
    left, _top, right, bottom = lower_bbox(frame)
    center = (left + right) / 2
    phase = [-1, 0, 1, 0][column]
    y = min(FOOTLINE_Y, max(234, bottom - 4))

    draw.line((center - 8 - phase * 2, y - 44, center - 11 - phase * 6, y - 12), fill=darken(colour, 0.32), width=3)
    draw.line((center + 8 + phase * 2, y - 44, center + 11 + phase * 6, y - 12), fill=darken(colour, 0.32), width=3)
    draw.line((center, y - 40, center, y - 6), fill=(22, 18, 14, 150), width=2)

    if phase == 0:
        draw_foot(draw, center - 10, y - 3, 8.6, colour, -1)
        draw_foot(draw, center + 10, y - 3, 8.6, colour, 1)
    else:
        draw_foot(draw, center - 10 - phase * 4, y - 2, 9.5, colour, -1)
        draw_foot(draw, center + 10 + phase * 4, y - 7, 7.6, colour, 1)
    return out


def enhance(path: Path) -> None:
    atlas = Image.open(path).convert("RGBA")
    if atlas.size != (FRAME_SIZE * 8, FRAME_SIZE * 5):
        raise ValueError(f"{path} must be 2048x1280, got {atlas.size}")

    for row in [*SIDE_ROWS, NORTH_ROW]:
        for column in WALK_COLUMNS:
            box = (
                column * FRAME_SIZE,
                row * FRAME_SIZE,
                (column + 1) * FRAME_SIZE,
                (row + 1) * FRAME_SIZE,
            )
            frame = atlas.crop(box)
            enhanced = enhance_north_walk(frame, column) if row == NORTH_ROW else enhance_side_walk(frame, row, column)
            atlas.alpha_composite(enhanced, (box[0], box[1]))
    atlas.save(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*")
    args = parser.parse_args()
    targets = [Path(path) for path in args.paths] or TARGETS
    for target in targets:
        enhance(target)
        print(f"enhanced {target}")


if __name__ == "__main__":
    main()
