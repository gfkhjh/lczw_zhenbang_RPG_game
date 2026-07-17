from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def sliced_frames(
    source: Path,
    output_dir: Path,
    prefix: str,
    canvas_size: tuple[int, int],
    subject_limit: tuple[int, int],
    bottom_margin: int = 4,
) -> None:
    image = Image.open(source).convert("RGBA")
    output_dir.mkdir(parents=True, exist_ok=True)
    cell_width = image.width // 4

    for index in range(4):
        left = index * cell_width
        right = image.width if index == 3 else (index + 1) * cell_width
        cell = image.crop((left, 0, right, image.height))
        alpha = cell.getchannel("A")
        bbox = alpha.point(lambda value: 255 if value > 18 else 0).getbbox()
        if bbox is None:
            raise RuntimeError(f"No visible subject in {source}, frame {index}")

        subject = cell.crop(bbox)
        scale = min(subject_limit[0] / subject.width, subject_limit[1] / subject.height)
        target_size = (
            max(1, round(subject.width * scale)),
            max(1, round(subject.height * scale)),
        )
        subject = subject.resize(target_size, Image.Resampling.LANCZOS)

        # Keep the generated material detail but reduce the overly smooth,
        # high-resolution look to a compact game-sprite palette.
        subject_alpha = subject.getchannel("A")
        reduced_rgb = subject.convert("RGB").quantize(colors=48, method=Image.Quantize.MEDIANCUT).convert("RGB")
        subject = reduced_rgb.convert("RGBA")
        subject.putalpha(subject_alpha.point(lambda value: 0 if value < 10 else value))

        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        x = (canvas_size[0] - target_size[0]) // 2
        y = canvas_size[1] - bottom_margin - target_size[1]
        canvas.alpha_composite(subject, (x, y))
        canvas.save(output_dir / f"{prefix}-{index}.png", optimize=True)


def main() -> None:
    specs: Iterable[tuple[Path, Path, str, tuple[int, int], tuple[int, int], int]] = (
        (
            ROOT / "tmp/imagegen/resting-alpha-v3.png",
            ROOT / "assets/resources/characters/resting-douli-v3",
            "idle",
            (96, 72),
            (78, 62),
            3,
        ),
        (
            ROOT / "tmp/imagegen/weeding-alpha-v1.png",
            ROOT / "assets/resources/characters/field-weeding-man-v1",
            "work",
            (96, 80),
            (88, 70),
            4,
        ),
        (
            ROOT / "tmp/imagegen/led-horse-cart-alpha-v2.png",
            ROOT / "assets/resources/characters/led-horse-cart-v1",
            "walk",
            (192, 80),
            (184, 70),
            4,
        ),
    )
    for spec in specs:
        sliced_frames(*spec)


if __name__ == "__main__":
    main()
