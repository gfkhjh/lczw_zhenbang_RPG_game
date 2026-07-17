from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


NAMES = [
    "grass-tile", "earth-tile", "water-tile", "millet-tile",
    "wall-horizontal", "wall-vertical", "south-gate", "path-tile",
    "divination-temple", "earthen-house", "market-stall", "field-shelter",
    "ancient-tree", "grass-clump", "mountain-rock", "oracle-pit",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Slice the 4x4 YinXu pixel atlas into transparent sprites.")
    parser.add_argument("atlas", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    image = Image.open(args.atlas).convert("RGBA")
    args.output.mkdir(parents=True, exist_ok=True)
    x_edges = [round(image.width * i / 4) for i in range(5)]
    y_edges = [round(image.height * i / 4) for i in range(5)]

    for index, name in enumerate(NAMES):
        row, col = divmod(index, 4)
        cell = image.crop((x_edges[col], y_edges[row], x_edges[col + 1], y_edges[row + 1]))
        alpha_bbox = cell.getchannel("A").getbbox()
        if alpha_bbox:
            cell = cell.crop(alpha_bbox)
        padded = Image.new("RGBA", (cell.width + 20, cell.height + 20), (0, 0, 0, 0))
        padded.alpha_composite(cell, (10, 10))
        padded.save(args.output / f"{name}.png", optimize=True)


if __name__ == "__main__":
    main()
