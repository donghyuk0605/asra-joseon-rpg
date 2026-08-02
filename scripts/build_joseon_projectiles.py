#!/usr/bin/env python3
"""Build small transparent raster projectiles used by Joseon soldier roles."""

from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    scale = 4
    width, height = 96, 32
    image = Image.new("RGBA", (width * scale, height * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def points(values: list[tuple[int, int]]) -> list[tuple[int, int]]:
        return [(x * scale, y * scale) for x, y in values]

    # Soft dark outline, warm wooden shaft, forged iron point and red-white fletching.
    draw.line(points([(13, 16), (78, 16)]), fill=(22, 17, 13, 230), width=5 * scale)
    draw.line(points([(13, 15), (78, 15)]), fill=(151, 103, 49, 255), width=2 * scale)
    draw.polygon(points([(77, 10), (95, 15), (77, 21), (82, 15)]), fill=(31, 32, 31, 245))
    draw.polygon(points([(79, 12), (93, 15), (79, 17), (83, 15)]), fill=(171, 173, 160, 255))
    draw.polygon(points([(16, 15), (2, 7), (7, 15)]), fill=(126, 31, 28, 255))
    draw.polygon(points([(16, 16), (2, 24), (7, 16)]), fill=(105, 25, 23, 255))
    draw.polygon(points([(18, 14), (7, 10), (10, 15)]), fill=(221, 207, 171, 245))
    draw.polygon(points([(18, 17), (7, 21), (10, 16)]), fill=(221, 207, 171, 245))

    image = image.resize((width, height), Image.Resampling.LANCZOS)
    destination = Path("public/assets/fx/joseon-arrow-projectile-v1.png")
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)
    print(f"Wrote {destination} ({width}x{height})")


if __name__ == "__main__":
    main()
