#!/usr/bin/env python3
"""Validate a CX markdown artifact has the minimum decision-oriented structure."""
from pathlib import Path
import sys

REQUIRED = ("## Context", "## Evidence", "## Decisions")

def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate-cx-artifact.py PATH", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"missing artifact: {path}", file=sys.stderr)
        return 1
    text = path.read_text(encoding="utf-8")
    missing = [heading for heading in REQUIRED if heading not in text]
    if missing:
        print("missing headings: " + ", ".join(missing), file=sys.stderr)
        return 1
    print(f"valid CX artifact: {path}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
