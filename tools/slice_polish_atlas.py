from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


NAMES = [
    "city-wall-horizontal-v2",
    "city-wall-vertical-v2",
    "city-wall-corner-v2",
    "city-wall-end-v2",
    "south-gate-canopy-v2",
    "south-gate-threshold-v2",
    "canal-footbridge-v2",
    "canal-bridge-wide-v2",
    "river-bank-concave-v2",
    "river-bank-convex-v2",
    "river-bank-shadow-v2",
    "river-ford-stones-v2",
    "millet-sway-0",
    "millet-sway-1",
    "millet-sway-2",
    "millet-sway-3",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Slice the 4x4 YinXu polish atlas.")
    parser.add_argument("atlas", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    image = Image.open(args.atlas).convert("RGBA")
    args.output.mkdir(parents=True, exist_ok=True)
    x_edges = [round(image.width * index / 4) for index in range(5)]
    y_edges = [round(image.height * index / 4) for index in range(5)]

    for index, name in enumerate(NAMES):
        row, column = divmod(index, 4)
        cell = image.crop((x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]))
        # The wide bridge intentionally fills its cell and touches the preceding
        # cell by a few pixels; keep the narrow bridge cell isolated.
        if name == "canal-footbridge-v2":
            cell = cell.crop((0, 0, round(cell.width * 0.76), cell.height))
        alpha_bbox = cell.getchannel("A").getbbox()
        if alpha_bbox:
            cell = cell.crop(alpha_bbox)
        padded = Image.new("RGBA", (cell.width + 20, cell.height + 20), (0, 0, 0, 0))
        padded.alpha_composite(cell, (10, 10))
        padded.save(args.output / f"{name}.png", optimize=True)


if __name__ == "__main__":
    main()
