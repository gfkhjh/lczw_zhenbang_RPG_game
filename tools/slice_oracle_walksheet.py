from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


DIRECTIONS = ("down", "left", "right", "up")
OUTPUT_SIZE = 160
CHARACTER_SCALE = 0.43
FOOT_BASELINE_Y = 150


def remove_alpha_specks(image: Image.Image, minimum_area: int = 20) -> None:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    visited: set[tuple[int, int]] = set()
    remove: list[tuple[int, int]] = []

    for start_y in range(alpha.height):
        for start_x in range(alpha.width):
            if pixels[start_x, start_y] <= 24 or (start_x, start_y) in visited:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(start_x, start_y)])
            visited.add((start_x, start_y))
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for nx in range(max(0, x - 1), min(alpha.width, x + 2)):
                    for ny in range(max(0, y - 1), min(alpha.height, y + 2)):
                        if (nx, ny) not in visited and pixels[nx, ny] > 24:
                            visited.add((nx, ny))
                            queue.append((nx, ny))
            if len(component) < minimum_area:
                remove.extend(component)

    rgba = image.load()
    for x, y in remove:
        rgba[x, y] = (0, 0, 0, 0)


def normalize_frame(frame: Image.Image) -> Image.Image:
    """Align every pose to one body center and one foot baseline.

    The generated source sheet contains useful limb motion, but the full body
    drifts between cells.  Alignment removes that drift so playback reads as a
    walk cycle instead of a sliding cutout.
    """
    scaled = frame.resize(
        (round(frame.width * CHARACTER_SCALE), round(frame.height * CHARACTER_SCALE)),
        Image.Resampling.NEAREST,
    )
    remove_alpha_specks(scaled)
    alpha = scaled.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))

    top, bottom = bbox[1], bbox[3]
    head_limit = top + round((bottom - top) * 0.46)
    head_x: list[int] = []
    pixels = alpha.load()
    for y in range(top, min(head_limit, alpha.height)):
        for x in range(alpha.width):
            if pixels[x, y] > 24:
                head_x.append(x)
    head_x.sort()
    anchor_x = head_x[len(head_x) // 2] if head_x else (bbox[0] + bbox[2]) // 2

    canvas = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    paste_x = OUTPUT_SIZE // 2 - anchor_x
    paste_y = FOOT_BASELINE_Y - bottom
    canvas.alpha_composite(scaled, (paste_x, paste_y))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser(description="Slice the oracle apprentice 4x4 walk sheet.")
    parser.add_argument("sheet", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    image = Image.open(args.sheet).convert("RGBA")
    args.output.mkdir(parents=True, exist_ok=True)
    x_edges = [round(image.width * index / 4) for index in range(5)]
    y_edges = [round(image.height * index / 4) for index in range(5)]
    for row, direction in enumerate(DIRECTIONS):
        for column in range(4):
            frame = image.crop((x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]))
            canvas = normalize_frame(frame)
            canvas.save(args.output / f"{direction}-{column}.png", optimize=True)


if __name__ == "__main__":
    main()
