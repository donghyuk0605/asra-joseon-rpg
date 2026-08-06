#!/usr/bin/env python3
"""Build a seam-only road atlas with soft alpha on every road edge."""

from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/environment/props/world-natural-road-atlas-v2.png"
OUTPUT = ROOT / "public/assets/environment/props/world-seam-road-atlas-v4.png"
FRAME_SIZE = 418
GRID_SIZE = 3
FADE_START = 6
FADE_END = 82
SHOULDER_BLUR_RADIUS = 12


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def main() -> None:
    atlas = Image.open(SOURCE).convert("RGBA")
    if atlas.size != (FRAME_SIZE * GRID_SIZE, FRAME_SIZE * GRID_SIZE):
        raise ValueError(f"unexpected atlas size: {atlas.size}")

    pixels = atlas.load()
    for grid_y in range(GRID_SIZE):
        frame_top = grid_y * FRAME_SIZE
        for local_y in range(FRAME_SIZE):
            edge_distance = min(local_y, FRAME_SIZE - 1 - local_y)
            fade = smoothstep((edge_distance - FADE_START) / (FADE_END - FADE_START))
            for x in range(atlas.width):
                red, green, blue, alpha = pixels[x, frame_top + local_y]
                pixels[x, frame_top + local_y] = red, green, blue, round(alpha * fade)

    # The source silhouettes have only a couple of partially transparent
    # pixels along their irregular shoulders. Fade inward without revealing
    # RGB from transparent pixels, so scaled roads merge into terrain instead
    # of reading as cardboard cutouts.
    for grid_y in range(GRID_SIZE):
        for grid_x in range(GRID_SIZE):
            left = grid_x * FRAME_SIZE
            top = grid_y * FRAME_SIZE
            frame = atlas.crop((left, top, left + FRAME_SIZE, top + FRAME_SIZE))
            alpha = frame.getchannel("A")
            silhouette = alpha.point(lambda value: 255 if value > 4 else 0)
            shoulder = silhouette.filter(ImageFilter.GaussianBlur(SHOULDER_BLUR_RADIUS))
            frame.putalpha(ImageChops.multiply(alpha, shoulder))
            atlas.paste(frame, (left, top))

    atlas.save(OUTPUT, optimize=True)
    print(f"wrote {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
