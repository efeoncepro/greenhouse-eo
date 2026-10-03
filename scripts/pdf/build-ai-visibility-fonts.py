#!/usr/bin/env python3
"""Freeze the licensed Bricolage source for react-pdf (TASK-1938).

uv run --no-project --with fonttools==4.60.1 --no-python-downloads \
  python scripts/pdf/build-ai-visibility-fonts.py [--check]

No downloads of fonts: the input is the repository's SHA-sealed OFL source.
opsz=96 and wdth=100 freeze the source's declared defaults; wght is per role.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path

import fontTools
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = ROOT / "src/assets/fonts"
SOURCE = FONT_DIR / "BricolageGrotesque-Variable.ttf"
SOURCE_SHA256 = "413e7357809ddd12fd80a96a8a396de0e401638d4acd3cb3e37532f0472ac682"
WEIGHTS = (320, 400, 700, 720, 740, 760)
FONTTOOLS_VERSION = "4.60.1"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def static_font(weight):
    source = TTFont(SOURCE, recalcTimestamp=False)
    axes = {axis.axisTag: axis for axis in source["fvar"].axes}
    if set(axes) != {"opsz", "wdth", "wght"}:
        raise ValueError("Unexpected variable font axes")
    limits = {"opsz": 96, "wdth": 100, "wght": weight}
    for axis, value in limits.items():
        if not axes[axis].minValue <= value <= axes[axis].maxValue:
            raise ValueError(f"{axis}={value} outside the licensed source range")
    font = instantiateVariableFont(source, limits, inplace=False, static=True)
    font.recalcTimestamp = False
    family = f"AI Visibility Bricolage {weight}"
    names = {
        1: family,
        2: "Regular",
        3: f"AIVisibilityBricolage-{weight};{SOURCE_SHA256[:16]}",
        4: family,
        6: f"AIVisibilityBricolage-{weight}",
        16: family,
        17: "Regular",
    }
    for name_id, value in names.items():
        for platform_id, encoding_id, language_id in ((3, 1, 0x409), (1, 0, 0)):
            font["name"].setName(value, name_id, platform_id, encoding_id, language_id)
    font["OS/2"].usWeightClass = weight
    output = io.BytesIO()
    font.save(output, reorderTables=True)
    data = output.getvalue()
    loaded = TTFont(io.BytesIO(data), recalcTimestamp=False)
    if "fvar" in loaded or "gvar" in loaded:
        raise ValueError("Font was not made fully static")
    # The source has no ▲/▼. Trend indicators must be vector shapes, never an implicit font fallback.
    required = "áéíóúñüÁÉÍÓÚÑÜãõçÃÕÇâêôàÂÊÔÀ—→"
    cmap = loaded.getBestCmap()
    missing = [char for char in required if ord(char) not in cmap]
    if missing:
        raise ValueError(f"Required report characters are missing: {missing}")
    return data, limits, family


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if fontTools.__version__ != FONTTOOLS_VERSION:
        raise ValueError(f"Use fonttools=={FONTTOOLS_VERSION} for reproducible font bytes")
    if sha256(SOURCE.read_bytes()) != SOURCE_SHA256:
        raise ValueError("The licensed Bricolage source SHA-256 changed")
    outputs = []
    mismatches = []
    for weight in WEIGHTS:
        data, axes, family = static_font(weight)
        filename = f"BricolageGrotesque-AiVisibility-{weight}.ttf"
        target = FONT_DIR / filename
        outputs.append({"file": filename, "family": family, "axes": axes, "sha256": sha256(data), "bytes": len(data)})
        if args.check:
            if not target.exists() or target.read_bytes() != data:
                mismatches.append(filename)
        else:
            target.write_bytes(data)
    manifest = {
        "schema": "efeonce.ai-visibility-pdf-fonts.v1",
        "source": SOURCE.name,
        "sourceSha256": SOURCE_SHA256,
        "license": "BricolageGrotesque-OFL.txt",
        "tool": {"name": "fonttools", "version": FONTTOOLS_VERSION},
        "outputs": outputs,
    }
    content = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    target = FONT_DIR / "BricolageGrotesque-AiVisibility.manifest.json"
    if args.check:
        if not target.exists() or target.read_bytes() != content:
            mismatches.append(target.name)
    else:
        target.write_bytes(content)
    if mismatches:
        raise ValueError(f"Static font drift: {', '.join(mismatches)}")
    print(json.dumps({"mode": "check" if args.check else "build", "weights": WEIGHTS, "bytes": sum(o["bytes"] for o in outputs)}))


if __name__ == "__main__":
    main()
