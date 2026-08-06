from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/sprites/dungeon-props-v2/source"
PROP_SOURCE = SOURCE_DIR / "dungeon-prop-atlas-generated-v2.png"
TELEGRAPH_SOURCE = SOURCE_DIR / "dungeon-telegraph-atlas-generated-v2.png"
PROP_OUTPUT = ROOT / "public/assets/environment/props/dungeon-prop-atlas-v1.png"
TELEGRAPH_OUTPUT = ROOT / "public/assets/fx/dungeon-telegraph-atlas-v1.png"
PROP_CELL = 256
TELEGRAPH_CELL = 256


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")
    pixels = source.load()
    for y in range(source.height):
        for x in range(source.width):
            r, g, b, a = pixels[x, y]
            green_score = g - max(r, b)
            magenta_score = min(r, b) - g
            if r > 150 and b > 130 and magenta_score > 45:
                pixels[x, y] = (r, g, b, 0)
            elif r > 105 and b > 95 and magenta_score > 18:
                alpha = max(0, min(a, int((45 - magenta_score) * 8)))
                pixels[x, y] = (min(r, g + 18), g, min(b, g + 18), alpha)
            elif g > 120 and green_score > 34:
                pixels[x, y] = (r, g, b, 0)
            elif g > 78 and green_score > 10:
                alpha = max(0, min(a, int((34 - green_score) * 10)))
                pixels[x, y] = (r, min(g, max(r, b) + 8), b, alpha)
            elif green_score > 4:
                pixels[x, y] = (r, min(g, max(r, b) + 8), b, a)
            elif green_score > 0:
                pixels[x, y] = (r, min(g, max(r, b) + 2), b, a)
            if pixels[x, y][3] < 46:
                pixels[x, y] = (pixels[x, y][0], pixels[x, y][1], pixels[x, y][2], 0)
            r2, g2, b2, a2 = pixels[x, y]
            if a2 > 0 and g2 > 100 and b2 < 90 and g2 >= r2 - 18:
                pixels[x, y] = (r2, min(g2, max(r2, b2) // 2), b2, max(0, a2 - 110))
    return source


def crop_grid(image: Image.Image, cols: int, rows: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for row in range(rows):
        for col in range(cols):
            left = round(image.width * col / cols)
            upper = round(image.height * row / rows)
            right = round(image.width * (col + 1) / cols)
            lower = round(image.height * (row + 1) / rows)
            frames.append(image.crop((left, upper, right, lower)))
    return frames


def normalize_frame(frame: Image.Image, cell_size: int, max_size: int, floor_pad: int, center_y: bool = False) -> Image.Image:
    rgba = chroma_to_alpha(frame)
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("source frame is empty after chroma removal")
    cutout = rgba.crop(bbox)
    scale = min(max_size / cutout.width, max_size / cutout.height)
    size = (max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale)))
    cutout = cutout.resize(size, Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
    x = round((cell_size - cutout.width) / 2)
    y = round((cell_size - cutout.height) / 2) if center_y else cell_size - cutout.height - floor_pad
    result.alpha_composite(cutout, (x, y))
    return result


def build_prop_atlas() -> None:
    source = Image.open(PROP_SOURCE)
    frames = crop_grid(source, 4, 2)
    atlas = Image.new("RGBA", (PROP_CELL * 4, PROP_CELL * 2), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        floor_decal = index in (5, 6)
        max_size = 238 if index not in (2, 3) else 218
        normalized = normalize_frame(frame, PROP_CELL, max_size, 8, center_y=floor_decal)
        atlas.alpha_composite(normalized, ((index % 4) * PROP_CELL, (index // 4) * PROP_CELL))
    PROP_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(PROP_OUTPUT, format="PNG", optimize=True)
    print(f"dungeon prop atlas written: {PROP_OUTPUT} {atlas.size}")


def build_telegraph_atlas() -> None:
    source = Image.open(TELEGRAPH_SOURCE)
    frames = crop_grid(source, 3, 1)
    atlas = Image.new("RGBA", (TELEGRAPH_CELL * 3, TELEGRAPH_CELL), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        max_size = 242 if index != 2 else 250
        normalized = normalize_frame(frame, TELEGRAPH_CELL, max_size, 7, center_y=True)
        atlas.alpha_composite(normalized, (index * TELEGRAPH_CELL, 0))
    TELEGRAPH_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(TELEGRAPH_OUTPUT, format="PNG", optimize=True)
    print(f"dungeon telegraph atlas written: {TELEGRAPH_OUTPUT} {atlas.size}")


if __name__ == "__main__":
    build_prop_atlas()
    build_telegraph_atlas()
