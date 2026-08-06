from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/ui/world-sign-atlas-v1.png'
CELL = 64
COLS = 4
ROWS = 2
assert COLS * ROWS == 8


def to_rgba(hex_color: str, alpha: int = 255):
    rgb = hex_color.lstrip('#')
    return (*tuple(int(rgb[i:i + 2], 16) for i in (0, 2, 4)), alpha)


icons = {
    'portal-left': 0,
    'portal-right': 1,
    'portal-down': 2,
    'portal-up': 3,
    'dungeon-gate': 4,
    'stair-down': 5,
    'stair-up': 6,
    'seal-rune': 7,
}

atlas = Image.new('RGBA', (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
draw = ImageDraw.Draw(atlas)


def draw_sign(idx: int, name: str):
    x = (idx % COLS) * CELL
    y = (idx // COLS) * CELL
    rect = (x, y, x + CELL, y + CELL)
    panel = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    p = ImageDraw.Draw(panel)

    # frame shadow
    p.rounded_rectangle((4, 8, 60, 60), radius=10, fill=(18, 14, 11, 215), outline=(120, 96, 59, 220), width=2)
    p.rounded_rectangle((6, 10, 58, 58), radius=9, fill=(32, 26, 19, 230), outline=(170, 142, 90, 235), width=1)

    if name == 'portal-left':
        p.polygon((13, 22, 30, 18, 30, 28), fill=(220, 168, 93, 230))
        p.polygon((13, 42, 30, 38, 30, 48), fill=(220, 168, 93, 230))
        p.line((30, 18, 47, 32), fill=(220, 168, 93, 230), width=5)
        p.line((30, 48, 47, 32), fill=(220, 168, 93, 230), width=5)
        p.ellipse((45, 26, 54, 35), fill=(238, 203, 141, 200))
    elif name == 'portal-right':
        p.polygon((51, 22, 34, 18, 34, 28), fill=(220, 168, 93, 230))
        p.polygon((51, 42, 34, 38, 34, 48), fill=(220, 168, 93, 230))
        p.line((34, 18, 17, 32), fill=(220, 168, 93, 230), width=5)
        p.line((34, 48, 17, 32), fill=(220, 168, 93, 230), width=5)
        p.ellipse((10, 26, 19, 35), fill=(238, 203, 141, 200))
    elif name == 'portal-down':
        p.polygon((32, 49, 28, 37, 36, 37), fill=(224, 185, 109, 230))
        p.polygon((32, 15, 28, 31, 36, 31), fill=(224, 185, 109, 230))
        p.line((32, 31, 32, 20), fill=(238, 203, 141, 210), width=4)
        p.ellipse((22, 20, 27, 25), fill=(224, 185, 109, 210))
        p.ellipse((37, 20, 42, 25), fill=(224, 185, 109, 210))
    elif name == 'portal-up':
        p.polygon((32, 15, 28, 27, 36, 27), fill=(224, 185, 109, 230))
        p.polygon((32, 49, 28, 37, 36, 37), fill=(224, 185, 109, 230))
        p.line((32, 27, 32, 45), fill=(238, 203, 141, 210), width=4)
        p.ellipse((22, 40, 27, 45), fill=(224, 185, 109, 210))
        p.ellipse((37, 40, 42, 45), fill=(224, 185, 109, 210))
    elif name == 'dungeon-gate':
        p.rounded_rectangle((13, 10, 51, 47), radius=6, fill=(58, 44, 35, 230), outline=(210, 174, 108, 228), width=2)
        p.rounded_rectangle((16, 14, 48, 43), radius=4, fill=(88, 74, 53, 228))
        p.polygon((20, 22, 44, 22, 44, 26, 20, 26), fill=(219, 179, 109, 230))
        p.ellipse((19, 33, 25, 39), fill=(219, 179, 109, 230))
        p.ellipse((39, 33, 45, 39), fill=(219, 179, 109, 230))
        p.line((26, 35, 38, 35), fill=(219, 179, 109, 230), width=2)
    elif name == 'stair-down':
        p.rectangle((12, 14, 52, 20), fill=(72, 62, 50, 230), outline=(198, 166, 108, 235), width=1)
        p.rectangle((12, 23, 44, 29), fill=(90, 77, 64, 230), outline=(198, 166, 108, 235), width=1)
        p.rectangle((12, 32, 36, 38), fill=(109, 93, 76, 230), outline=(198, 166, 108, 235), width=1)
        p.arrow((0,0,1,1)) if False else None
        # simple down glyph
        p.polygon((48, 52, 32, 52, 32, 44, 26, 44, 32, 36, 38, 44, 32, 44), fill=(232, 198, 138, 220))
    elif name == 'stair-up':
        p.rectangle((12, 14, 52, 20), fill=(72, 62, 50, 230), outline=(198, 166, 108, 235), width=1)
        p.rectangle((12, 23, 44, 29), fill=(90, 77, 64, 230), outline=(198, 166, 108, 235), width=1)
        p.rectangle((12, 32, 36, 38), fill=(109, 93, 76, 230), outline=(198, 166, 108, 235), width=1)
        p.polygon((32, 12, 26, 20, 38, 20), fill=(232, 198, 138, 220))
    elif name == 'seal-rune':
        p.ellipse((13, 16, 50, 53), fill=(58, 37, 68, 230), outline=(214, 166, 232, 236), width=2)
        p.line((20, 34, 28, 26, 36, 34, 44, 26, 44, 40), fill=(233, 184, 245, 228), width=2)
        p.arc((19, 33, 45, 59), start=190, end=350, fill=(234, 196, 241, 185), width=2)

    # add subtle noise and vignette
    for sx in range(3):
        for sy in range(3):
            if (sx + sy) % 2 == 0:
                p.point((sx * 2, sy * 2), fill=(255, 255, 255, 8))

    atlas.paste(panel, (x, y), panel)


def to_idx(name: str):
    return icons[name]

for name, idx in icons.items():
    draw_sign(idx, name)

atlas.save(OUTPUT, format='PNG', optimize=True)
print(f'world-sign atlas written: {OUTPUT} {atlas.size}')
