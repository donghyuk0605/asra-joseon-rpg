from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/items-v4/source/joseon-item-atlas-v4-transparent.png"
PUBLIC = ROOT / "public/assets/items"
NAMES = [
    "worn-hwando-v4",
    "dokkaebi-club-v4",
    "hunter-durumagi-v4",
    "boar-tusk-charm-v4",
    "moonsteel-hwando-v4",
    "warden-durumagi-v4",
    "silver-tiger-charm-v4",
    "ginseng-pellet-v4",
]


def normalize_icon(cell: Image.Image, size: int = 160, content: int = 138) -> Image.Image:
    alpha = cell.getchannel("A")
    bbox = alpha.getbbox()
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if not bbox:
        return canvas
    subject = cell.crop(bbox)
    scale = min(content / subject.width, content / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    x = (size - subject.width) // 2
    y = (size - subject.height) // 2
    canvas.alpha_composite(subject, (x, y))
    return canvas


def main() -> None:
    atlas = Image.open(SOURCE).convert("RGBA")
    cell_width = atlas.width // 4
    cell_height = atlas.height // 2
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(NAMES):
        column = index % 4
        row = index // 4
        # Exclude the generated black cell divider before alpha-bound trimming.
        inset = 5
        cell = atlas.crop((
            column * cell_width + inset,
            row * cell_height + inset,
            (column + 1) * cell_width - inset,
            (row + 1) * cell_height - inset,
        ))
        normalize_icon(cell).save(PUBLIC / f"{name}.png", optimize=True)


if __name__ == "__main__":
    main()
