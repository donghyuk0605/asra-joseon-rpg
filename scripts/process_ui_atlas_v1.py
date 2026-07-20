from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/ui-v1/source/joseon-mmorpg-ui-atlas-v1.png"
OUTPUT = ROOT / "public/assets/ui"
NAMES = [
    "inventory-window-v1",
    "character-stats-v1",
    "inventory-slot-v1",
    "item-detail-v1",
]


def main() -> None:
    atlas = Image.open(SOURCE).convert("RGB")
    cell_width = atlas.width // 2
    cell_height = atlas.height // 2
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(NAMES):
        column = index % 2
        row = index // 2
        inset = 7
        cell = atlas.crop((
            column * cell_width + inset,
            row * cell_height + inset,
            (column + 1) * cell_width - inset,
            (row + 1) * cell_height - inset,
        ))
        cell.resize((512, 512), Image.Resampling.LANCZOS).save(
            OUTPUT / f"{name}.webp", "WEBP", quality=88, method=6
        )


if __name__ == "__main__":
    main()
