#!/usr/bin/env python3
"""Split the Episode II 4x4 icon sheet into fixed transparent runtime icons."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ITEM_SLUGS = (
    "uiju-black-horn-bow",
    "hwangju-moonsteel-spear",
    "jaeryeong-fox-charm",
    "anju-frontier-coat",
    "pyeongchang-leopard-knife",
    "samcheok-seawind-bow",
    "gapyeong-birch-talisman",
    "yangju-beacon-seal",
    "yeoju-river-jade",
    "gongju-scholar-coat",
    "cheongju-kiln-hwando",
    "icheon-spirit-jar",
    "boryeong-tidal-anchor",
    "gunsan-drowned-blade",
    "namwon-bamboo-flute",
    "tongyeong-signal-drum",
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--size", type=int, default=256)
    parser.add_argument("--content", type=int, default=228)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cell_width = source.width / 4
    cell_height = source.height / 4

    for index, slug in enumerate(ITEM_SLUGS):
        row, col = divmod(index, 4)
        cell = source.crop((
            round(col * cell_width),
            round(row * cell_height),
            round((col + 1) * cell_width),
            round((row + 1) * cell_height),
        ))
        bounds = cell.getchannel("A").getbbox()
        if bounds is None:
            raise RuntimeError(f"Empty icon {index}: {slug}")
        icon = cell.crop(bounds)
        scale = min(1.0, args.content / max(icon.width, icon.height))
        if scale < 0.999:
            icon = icon.resize(
                (max(1, round(icon.width * scale)), max(1, round(icon.height * scale))),
                Image.Resampling.LANCZOS,
            )
        canvas = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
        canvas.alpha_composite(icon, ((args.size - icon.width) // 2, (args.size - icon.height) // 2))
        destination = out_dir / f"episode2-{slug}-v1.png"
        canvas.save(destination)
        print(f"Wrote {destination}")


if __name__ == "__main__":
    main()
