#!/usr/bin/env python3
"""Resize iPhone landscape shots to 13-inch iPad App Store size (2752 x 2064).

The source shots are ultrawide. Extra height is filled by stretching a thin
band of sky (and grass, for yards) so the scene still looks like a full iPad.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "store-screenshots"
TARGET_W, TARGET_H = 2752, 2064
BAND = 16

# City menus: extra canvas is night sky. Yards: more sky than grass.
MODES = {
    "01-home.png": "sky",
    "02-yard.png": "sky_grass",
    "03-flight.png": "sky_grass",
    "04-shed.png": "sky",
    "05-stickers.png": "sky",
}


def extend(src: Image.Image, mode: str) -> Image.Image:
    scale = TARGET_W / src.width
    new_h = max(1, round(src.height * scale))
    resized = src.resize((TARGET_W, new_h), Image.Resampling.LANCZOS)
    extra = TARGET_H - new_h
    if extra <= 0:
        top = (new_h - TARGET_H) // 2
        return resized.crop((0, top, TARGET_W, top + TARGET_H))

    if mode == "sky":
        top_extra, bot_extra = extra, 0
    else:
        top_extra = int(extra * 0.72)
        bot_extra = extra - top_extra

    canvas = Image.new("RGB", (TARGET_W, TARGET_H))
    top_band_h = min(BAND, new_h)
    top_band = resized.crop((0, 0, TARGET_W, top_band_h)).resize(
        (TARGET_W, top_extra + top_band_h), Image.Resampling.LANCZOS
    )
    canvas.paste(top_band, (0, 0))
    canvas.paste(resized, (0, top_extra))
    if bot_extra:
        bot_band_h = min(BAND, new_h)
        bot_band = resized.crop((0, new_h - bot_band_h, TARGET_W, new_h)).resize(
            (TARGET_W, bot_extra + bot_band_h), Image.Resampling.LANCZOS
        )
        canvas.paste(bot_band, (0, top_extra + new_h - bot_band_h))
    return canvas


def main() -> None:
    for name, mode in MODES.items():
        src_path = ROOT / name
        dest = ROOT / name.replace(".png", "-ipad13.png")
        im = Image.open(src_path).convert("RGB")
        out = extend(im, mode)
        if out.size != (TARGET_W, TARGET_H):
            raise SystemExit(f"{dest.name} is {out.size}, expected {(TARGET_W, TARGET_H)}")
        out.save(dest, "PNG", optimize=True)
        print(f"wrote {dest.name} {out.size}")


if __name__ == "__main__":
    main()
