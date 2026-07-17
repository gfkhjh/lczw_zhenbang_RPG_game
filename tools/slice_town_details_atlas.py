from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


NAMES = [
    "small-house-a", "small-house-b", "small-house-c", "village-shop",
    "village-well", "road-straight", "road-corner", "road-t-junction",
    "road-cross", "fence-straight", "fence-corner", "barrel-crate-cluster",
    "pottery-jar-cluster", "wildflower-patch", "roadside-grass-clump", "bronze-brazier-lamp",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Slice the 4x4 YinXu town-detail atlas.")
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
        alpha_bbox = cell.getchannel("A").getbbox()
        if alpha_bbox:
            cell = cell.crop(alpha_bbox)
        padded = Image.new("RGBA", (cell.width + 20, cell.height + 20), (0, 0, 0, 0))
        padded.alpha_composite(cell, (10, 10))
        padded.save(args.output / f"{name}.png", optimize=True)


if __name__ == "__main__":
    main()
