#!/usr/bin/env python3
"""Vectorize curated payment brand PNGs into SVG variants.

Requires:
  python3 -m pip install --user vtracer Pillow
"""

from __future__ import annotations

import argparse
import math
import re
import sys
from collections import deque
from pathlib import Path

from PIL import Image
import vtracer

GLOBAL66_BLUE = (37, 68, 199, 255)
PREVIRED_PURPLE = (82, 45, 126, 255)
PREVIRED_YELLOW = (248, 187, 12, 255)
BRAND_WHITE = (255, 255, 255, 255)


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("input image has no non-transparent pixels")
    return bbox


def pad_bbox(
    bbox: tuple[int, int, int, int],
    width: int,
    height: int,
    pad: int,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(width, right + pad),
        min(height, bottom + pad),
    )


def largest_alpha_component_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    seen: set[tuple[int, int]] = set()
    best: tuple[int, tuple[int, int, int, int]] | None = None

    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in seen:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen.add((x, y))
            count = 0
            left = right = x
            top = bottom = y

            while queue:
                cx, cy = queue.popleft()
                count += 1
                left = min(left, cx)
                right = max(right, cx)
                top = min(top, cy)
                bottom = max(bottom, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if (nx, ny) in seen or pixels[nx, ny] == 0:
                        continue
                    seen.add((nx, ny))
                    queue.append((nx, ny))

            component_bbox = (left, top, right + 1, bottom + 1)
            if best is None or count > best[0]:
                best = (count, component_bbox)

    if best is None:
        raise ValueError("input image has no alpha component")
    return best[1]


def crop_variant(image: Image.Image, variant: str, pad: int) -> Image.Image:
    bbox = largest_alpha_component_bbox(image) if variant.startswith("mark-") else alpha_bbox(image)
    crop = image.crop(pad_bbox(bbox, image.width, image.height, pad))
    return crop


def make_negative_source(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    negative = Image.new("RGBA", image.size, (255, 255, 255, 0))
    negative.putalpha(alpha)
    return negative


def color_distance(left: tuple[int, int, int, int], right: tuple[int, int, int, int]) -> float:
    return math.sqrt(sum((left[index] - right[index]) ** 2 for index in range(3)))


def clean_global66_source(image: Image.Image, variant: str) -> Image.Image:
    output = Image.new("RGBA", image.size, (255, 255, 255, 0))
    pixels = image.load()
    out = output.load()

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, alpha = pixels[x, y]
            if alpha < 96:
                continue

            color = (r, g, b, alpha)
            if variant.endswith("-negative"):
                out[x, y] = BRAND_WHITE
            elif color_distance(color, BRAND_WHITE) < 80:
                out[x, y] = BRAND_WHITE
            else:
                out[x, y] = GLOBAL66_BLUE

    return output


def clean_previred_source(image: Image.Image, variant: str) -> Image.Image:
    output = Image.new("RGBA", image.size, (255, 255, 255, 0))
    pixels = image.load()
    out = output.load()

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, alpha = pixels[x, y]
            if alpha < 96:
                continue

            color = (r, g, b, alpha)
            if variant.endswith("-negative"):
                out[x, y] = BRAND_WHITE
            elif color_distance(color, BRAND_WHITE) < 64:
                out[x, y] = BRAND_WHITE
            elif color_distance(color, PREVIRED_YELLOW) < color_distance(color, PREVIRED_PURPLE):
                out[x, y] = PREVIRED_YELLOW
            else:
                out[x, y] = PREVIRED_PURPLE

    return output


def connected_component_bboxes(image: Image.Image, predicate) -> list[tuple[int, tuple[int, int, int, int], float, float]]:
    width, height = image.size
    pixels = image.load()
    seen: set[tuple[int, int]] = set()
    components: list[tuple[int, tuple[int, int, int, int], float, float]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in seen or not predicate(pixels[x, y]):
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen.add((x, y))
            points: list[tuple[int, int]] = []

            while queue:
                cx, cy = queue.popleft()
                points.append((cx, cy))

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if (nx, ny) in seen or not predicate(pixels[nx, ny]):
                        continue
                    seen.add((nx, ny))
                    queue.append((nx, ny))

            if len(points) < 20:
                continue

            xs = [point[0] for point in points]
            ys = [point[1] for point in points]
            components.append((
                len(points),
                (min(xs), min(ys), max(xs) + 1, max(ys) + 1),
                sum(xs) / len(xs),
                sum(ys) / len(ys),
            ))

    return components


def previred_mark_svg(image: Image.Image, variant: str, label: str | None) -> str:
    cleaned = clean_previred_source(image, variant)
    yellow_components = connected_component_bboxes(
        cleaned,
        lambda pixel: pixel[3] > 0 and pixel[:3] == PREVIRED_YELLOW[:3],
    )
    dots = sorted(yellow_components, key=lambda item: (item[3], item[2]))
    dot_nodes = []

    for _, bbox, center_x, center_y in dots:
        left, top, right, bottom = bbox
        radius = max(right - left, bottom - top) / 2
        fill = "#fff" if variant.endswith("-negative") else "#f8bb0c"
        dot_nodes.append(f'  <circle cx="{center_x:.2f}" cy="{center_y:.2f}" r="{radius:.2f}" fill="{fill}"/>')

    aria = f' role="img" aria-label="{label}"' if label else ""
    if variant.endswith("-negative"):
        background = '  <circle cx="96" cy="96" r="88" fill="none" stroke="#fff" stroke-width="8"/>'
    else:
        background = '  <circle cx="96" cy="96" r="88" fill="#522d7e" stroke="#fff" stroke-width="8"/>'

    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"{aria}>',
        background,
        *dot_nodes,
        '</svg>',
        '',
    ])


def normalize_svg(svg: str, label: str | None, size: tuple[int, int]) -> str:
    width, height = size
    svg = re.sub(r"<\?xml[^>]*>\s*", "", svg)
    svg = svg.replace("<svg ", f'<svg role="img" aria-label="{label}" ' if label else "<svg ", 1)
    if "viewBox=" not in svg and "viewbox=" not in svg:
        svg = svg.replace("<svg ", f'<svg viewBox="0 0 {width} {height}" ', 1)
    return svg.strip() + "\n"


def vectorize(image: Image.Image, label: str | None) -> str:
    rgba = list(image.getdata())
    svg = vtracer.convert_pixels_to_svg(
        rgba,
        image.size,
        colormode="color",
        hierarchical="stacked",
        mode="spline",
        filter_speckle=4,
        color_precision=6,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=2,
    )
    return normalize_svg(svg, label, image.size)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Vectorize curated payment logo PNGs to SVG.")
    parser.add_argument("--input", required=True, help="Input PNG with transparent background.")
    parser.add_argument("--output", required=True, help="Output SVG path.")
    parser.add_argument(
        "--variant",
        required=True,
        choices=("full-positive", "full-negative", "mark-positive", "mark-negative"),
    )
    parser.add_argument("--label", default=None, help="Accessible SVG label.")
    parser.add_argument("--pad", type=int, default=4, help="Pixel padding around detected alpha bbox.")
    parser.add_argument("--brand-clean", choices=("global66", "previred"), default=None, help="Apply brand-specific cleanup before tracing.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Image.open(args.input).convert("RGBA")
    cropped = crop_variant(source, args.variant, args.pad)

    if args.brand_clean == "previred" and args.variant.startswith("mark-"):
        svg = previred_mark_svg(cropped, args.variant, args.label)
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(svg, encoding="utf-8")
        print(f"wrote {output} from {args.input} ({args.variant}, {cropped.width}x{cropped.height})")
        return 0

    if args.brand_clean == "global66":
        cropped = clean_global66_source(cropped, args.variant)
    elif args.brand_clean == "previred":
        cropped = clean_previred_source(cropped, args.variant)
    elif args.variant.endswith("-negative"):
        cropped = make_negative_source(cropped)

    svg = vectorize(cropped, args.label)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(svg, encoding="utf-8")
    print(f"wrote {output} from {args.input} ({args.variant}, {cropped.width}x{cropped.height})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
