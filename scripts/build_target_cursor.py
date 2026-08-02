from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/weapons/worn-hwando-world-v1.png"
OUTPUT = ROOT / "public/assets/ui/sword-target-cursor-v1.png"


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    bbox = source.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError("weapon source has no visible pixels")

    sword = source.crop(bbox).rotate(-135, resample=Image.Resampling.BICUBIC, expand=True)
    sword.thumbnail((38, 38), Image.Resampling.LANCZOS)

    alpha = sword.getchannel("A")
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(5))
    outline_alpha = ImageChops.subtract(outline_alpha, alpha).point(lambda value: int(value * 0.9))
    outline = Image.new("RGBA", sword.size, (226, 193, 118, 0))
    outline.putalpha(outline_alpha)

    cursor = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    offset = ((48 - sword.width) // 2, (48 - sword.height) // 2)
    cursor.alpha_composite(outline, offset)
    cursor.alpha_composite(sword, offset)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    cursor.save(OUTPUT, optimize=True)


if __name__ == "__main__":
    main()
