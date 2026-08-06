#!/usr/bin/env python3
"""Install the approved four-frame west/east walk cycle into player atlases.

The generated source is never used directly at runtime. Each pose is split,
cropped, scaled with one shared factor, anchored at the hips, and placed on the
project's fixed 256 px frame with the approved y=249 foot baseline.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
FRAME = 256
ATLAS_COLS = 8
ATLAS_ROWS = 5
WEST_ROW = 2
WALK_COLUMNS = range(4)
FOOT_BASELINE = FRAME - 7

SOURCE = (
    ROOT
    / "assets/sprites/joseon-hero-components-v9/processed/west-walk-transparent-raw-v1.png"
)
BASE_V6 = ROOT / "public/assets/characters/joseon-hero-base-body-v6.png"
READY_V1 = ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v1.png"
BASE_V7 = ROOT / "public/assets/characters/joseon-hero-base-body-v7.png"
READY_V2_PNG = ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v2.png"
READY_V2_WEBP = ROOT / "public/assets/characters/joseon-hero-weapon-ready-body-v2.webp"
PROCESSED = ROOT / "assets/sprites/joseon-hero-components-v9/processed"

ARMOR_LAYERS = {
    "hunter": {
        "base": ROOT / "public/assets/characters/joseon-hero-armor-layer-v3.png",
        "ready": ROOT
        / "public/assets/characters/joseon-hero-hunter-weapon-ready-layer-v1.png",
        "output": ROOT / "public/assets/characters/joseon-hero-armor-layer-v4.png",
        "ready_output": ROOT
        / "public/assets/characters/joseon-hero-hunter-weapon-ready-layer-v2.png",
        "color": (43, 53, 68),
    },
    "warden": {
        "base": ROOT / "public/assets/characters/joseon-hero-warden-layer-v1.png",
        "ready": ROOT
        / "public/assets/characters/joseon-hero-warden-weapon-ready-layer-v1.png",
        "output": ROOT / "public/assets/characters/joseon-hero-warden-layer-v2.png",
        "ready_output": ROOT
        / "public/assets/characters/joseon-hero-warden-weapon-ready-layer-v2.png",
        "color": (35, 42, 47),
    },
    "tiger": {
        "base": ROOT / "public/assets/characters/joseon-hero-tiger-pelt-layer-v1.png",
        "ready": ROOT
        / "public/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v1.png",
        "output": ROOT / "public/assets/characters/joseon-hero-tiger-pelt-layer-v2.png",
        "ready_output": ROOT
        / "public/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v2.png",
        "color": (137, 76, 30),
    },
}


def alpha_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    if box is None:
        raise ValueError("Expected a visible character pose")
    return box


def atlas_frame(atlas: Image.Image, row: int, column: int) -> Image.Image:
    return atlas.crop(
        (column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME)
    )


def split_source() -> list[Image.Image]:
    strip = Image.open(SOURCE).convert("RGBA")
    poses: list[Image.Image] = []
    for column in WALK_COLUMNS:
        left = round(column * strip.width / 4)
        right = round((column + 1) * strip.width / 4)
        pose = strip.crop((left, 0, right, strip.height))
        poses.append(pose.crop(alpha_box(pose)))
    return poses


def hip_anchor_x(image: Image.Image) -> float:
    """Return a stable body anchor without following the swinging feet/hands."""
    alpha = image.getchannel("A")
    top = round(image.height * 0.42)
    bottom = max(top + 1, round(image.height * 0.61))
    band = alpha.crop((0, top, image.width, bottom))
    pixels = band.load()
    weighted_x = 0.0
    weight = 0.0
    for y in range(band.height):
        for x in range(band.width):
            value = pixels[x, y]
            if value > 20:
                weighted_x += x * value
                weight += value
    return weighted_x / weight if weight else image.width / 2


def normalize_poses(poses: list[Image.Image], target_height: int) -> list[Image.Image]:
    shared_scale = target_height / max(pose.height for pose in poses)
    normalized: list[Image.Image] = []
    for index, pose in enumerate(poses, start=1):
        resized = pose.resize(
            (
                max(1, round(pose.width * shared_scale)),
                max(1, round(pose.height * shared_scale)),
            ),
            Image.Resampling.LANCZOS,
        )
        anchor_x = hip_anchor_x(resized)
        offset_x = round(FRAME / 2 - anchor_x)
        offset_y = FOOT_BASELINE - resized.height
        canvas = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        canvas.alpha_composite(resized, (offset_x, offset_y))
        bounds = alpha_box(canvas)
        if bounds[3] != FOOT_BASELINE:
            raise ValueError(
                f"Pose {index} missed foot baseline: bottom={bounds[3]}, expected {FOOT_BASELINE}"
            )
        normalized.append(canvas)
        canvas.save(PROCESSED / f"west-walk-normalized-{index:02d}.png")
    return normalized


def install_walk(source_atlas: Path, output: Path, poses: list[Image.Image]) -> Image.Image:
    atlas = Image.open(source_atlas).convert("RGBA")
    expected_size = (ATLAS_COLS * FRAME, ATLAS_ROWS * FRAME)
    if atlas.size != expected_size:
        raise ValueError(f"{source_atlas.name} must be {expected_size}, got {atlas.size}")
    for column, pose in enumerate(poses):
        atlas.paste(
            pose,
            (column * FRAME, WEST_ROW * FRAME),
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output)
    return atlas


def is_skin(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return (
        alpha > 20
        and red > 88
        and green > 42
        and red > green * 1.06
        and green > blue * 1.16
    )


def body_locked_sleeve(
    body: Image.Image,
    old_layer: Image.Image,
    cloth_color: tuple[int, int, int],
) -> Image.Image:
    """Cover the re-posed arms while retaining the authored coat and trim."""
    layer = old_layer.copy()
    body_pixels = body.load()
    layer_pixels = layer.load()
    for y in range(111, 167):
        for x in range(FRAME):
            pixel = body_pixels[x, y]
            if not is_skin(pixel):
                continue
            red, green, blue, alpha = pixel
            luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
            shade = max(0.64, min(1.32, luminance / 145))
            seam = 0.89 if (x + y * 2) % 29 < 2 else 1.0
            layer_pixels[x, y] = (
                min(255, round(cloth_color[0] * shade * seam)),
                min(255, round(cloth_color[1] * shade * seam)),
                min(255, round(cloth_color[2] * shade * seam)),
                alpha,
            )
    return layer


def install_armor_walk(
    source_atlas: Path,
    output: Path,
    poses: list[Image.Image],
    cloth_color: tuple[int, int, int],
) -> Image.Image:
    atlas = Image.open(source_atlas).convert("RGBA")
    for column, body in enumerate(poses):
        old_layer = atlas_frame(atlas, WEST_ROW, column)
        sleeve = body_locked_sleeve(body, old_layer, cloth_color)
        atlas.paste(sleeve, (column * FRAME, WEST_ROW * FRAME))
    atlas.save(output)
    return atlas


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    image = Image.new("RGBA", size, (222, 224, 224, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(242, 243, 243, 255))
    return image


def render_preview(base: Image.Image, poses: list[Image.Image]) -> None:
    labels = ["base", *ARMOR_LAYERS.keys()]
    preview = checkerboard((FRAME * 4, FRAME * len(labels)))
    draw = ImageDraw.Draw(preview)
    for row_index, label in enumerate(labels):
        layer = None
        if row_index:
            layer = Image.open(ARMOR_LAYERS[label]["output"]).convert("RGBA")
        for column, pose in enumerate(poses):
            tile = pose.copy()
            if layer is not None:
                tile.alpha_composite(atlas_frame(layer, WEST_ROW, column))
            preview.alpha_composite(tile, (column * FRAME, row_index * FRAME))
        draw.text((8, row_index * FRAME + 8), label, fill=(33, 24, 18, 255))
    preview.save(PROCESSED / "west-walk-runtime-layer-preview-v1.png")

    runtime_scale = 0.51
    runtime_w = round(FRAME * runtime_scale)
    runtime = checkerboard((runtime_w * 4, runtime_w))
    for column in WALK_COLUMNS:
        tile = atlas_frame(base, WEST_ROW, column).resize(
            (runtime_w, runtime_w), Image.Resampling.LANCZOS
        )
        runtime.alpha_composite(tile, (column * runtime_w, 0))
    runtime.save(PROCESSED / "west-walk-runtime-scale-preview-v1.png")


def main() -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    approved = Image.open(BASE_V6).convert("RGBA")
    target_height = max(
        alpha_box(atlas_frame(approved, WEST_ROW, column))[3]
        - alpha_box(atlas_frame(approved, WEST_ROW, column))[1]
        for column in WALK_COLUMNS
    )
    poses = normalize_poses(split_source(), target_height)
    base = install_walk(BASE_V6, BASE_V7, poses)
    ready = install_walk(READY_V1, READY_V2_PNG, poses)
    ready.save(READY_V2_WEBP, format="WEBP", lossless=True, method=6)
    for layer in ARMOR_LAYERS.values():
        base_armor = install_armor_walk(
            layer["base"], layer["output"], poses, layer["color"]
        )
        ready_armor = install_armor_walk(
            layer["ready"], layer["ready_output"], poses, layer["color"]
        )
        base_armor.save(layer["output"])
        ready_armor.save(layer["ready_output"])
        ready_armor.save(
            layer["ready_output"].with_suffix(".webp"),
            format="WEBP",
            lossless=True,
            method=6,
        )
    render_preview(base, poses)
    print(
        "Installed four normalized west/east walk poses "
        f"(height={target_height}, footline={FOOT_BASELINE}) into {BASE_V7.name} and {READY_V2_WEBP.name}."
    )


if __name__ == "__main__":
    main()
