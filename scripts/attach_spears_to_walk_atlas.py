#!/usr/bin/env python3
"""Attach a readable long spear to every walk frame of the Joseon spearman atlas."""

from pathlib import Path

from PIL import Image, ImageDraw


FRAME = 256
ROWS = 5
WALK_COLUMNS = 4
SCALE = 4


SPEAR_BY_ROW = (
    ((84, 232), (90, 34)),    # south
    ((181, 42), (55, 222)),   # south-west
    ((207, 78), (27, 180)),   # west
    ((200, 214), (39, 66)),   # north-west
    ((174, 233), (167, 33)),  # north
)


def scaled(point: tuple[float, float]) -> tuple[int, int]:
    return round(point[0] * SCALE), round(point[1] * SCALE)


def draw_spear(cell: Image.Image, row: int, column: int) -> Image.Image:
    canvas = Image.new("RGBA", (FRAME * SCALE, FRAME * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas, "RGBA")
    sway_x = (-2, 1, 2, -1)[column]
    sway_y = (0, -2, 1, -1)[column]
    butt, tip = SPEAR_BY_ROW[row]
    butt = (butt[0] + sway_x, butt[1] + sway_y)
    tip = (tip[0] + sway_x, tip[1] + sway_y)

    bx, by = scaled(butt)
    tx, ty = scaled(tip)
    dx, dy = tx - bx, ty - by
    length = max(1.0, (dx * dx + dy * dy) ** 0.5)
    nx, ny = -dy / length, dx / length
    ux, uy = dx / length, dy / length

    draw.line((bx, by, tx, ty), fill=(24, 16, 11, 245), width=6 * SCALE)
    draw.line((bx, by, tx, ty), fill=(116, 67, 33, 255), width=3 * SCALE)
    draw.line(
        (round(bx + nx * SCALE), round(by + ny * SCALE), round(tx + nx * SCALE), round(ty + ny * SCALE)),
        fill=(205, 145, 68, 185),
        width=SCALE,
    )

    head_base_x = tx - ux * 7 * SCALE
    head_base_y = ty - uy * 7 * SCALE
    head_tip_x = tx + ux * 13 * SCALE
    head_tip_y = ty + uy * 13 * SCALE
    head = [
        (round(head_tip_x), round(head_tip_y)),
        (round(head_base_x + nx * 5 * SCALE), round(head_base_y + ny * 5 * SCALE)),
        (round(tx - ux * 2 * SCALE), round(ty - uy * 2 * SCALE)),
        (round(head_base_x - nx * 5 * SCALE), round(head_base_y - ny * 5 * SCALE)),
    ]
    draw.polygon(head, fill=(165, 172, 166, 255), outline=(29, 31, 29, 255))
    draw.line(
        (
            round(head_base_x + nx * 1.5 * SCALE),
            round(head_base_y + ny * 1.5 * SCALE),
            round(head_tip_x),
            round(head_tip_y),
        ),
        fill=(231, 229, 205, 230),
        width=SCALE,
    )

    tassel_x = tx - ux * 13 * SCALE
    tassel_y = ty - uy * 13 * SCALE
    draw.line(
        (
            round(tassel_x),
            round(tassel_y),
            round(tassel_x - ux * 15 * SCALE + nx * 5 * SCALE),
            round(tassel_y - uy * 15 * SCALE + ny * 5 * SCALE),
        ),
        fill=(126, 25, 27, 245),
        width=3 * SCALE,
    )
    draw.line(
        (
            round(tassel_x),
            round(tassel_y),
            round(tassel_x - ux * 13 * SCALE - nx * 4 * SCALE),
            round(tassel_y - uy * 13 * SCALE - ny * 4 * SCALE),
        ),
        fill=(91, 20, 21, 235),
        width=2 * SCALE,
    )

    spear_layer = canvas.resize((FRAME, FRAME), Image.Resampling.LANCZOS)
    # The body renders over the shaft so the character's hands and torso form
    # a convincing grip instead of the pole floating across the silhouette.
    return Image.alpha_composite(spear_layer, cell)


def main() -> None:
    path = Path("public/assets/monsters/joseon-spearman-actions-v1.png")
    atlas = Image.open(path).convert("RGBA")
    if atlas.size != (FRAME * 8, FRAME * ROWS):
        raise ValueError(f"Unexpected atlas size: {atlas.size}")

    for row in range(ROWS):
        for column in range(WALK_COLUMNS):
            box = (column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME)
            cell = atlas.crop(box)
            cell = draw_spear(cell, row, column)
            atlas.alpha_composite(cell, (column * FRAME, row * FRAME))

    atlas.save(path, optimize=True)
    print(f"Updated {path} with {ROWS * WALK_COLUMNS} anchored walk spears")


if __name__ == "__main__":
    main()
