#!/usr/bin/env python3
"""Validate a minimal Efeonce Brand Studio artifact."""
from pathlib import Path
import re
import sys

REQUIRED = ("Context", "Evidence", "Diagnosis", "Decisions")

def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate-brand-artifact.py <markdown-file>")
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"ERROR missing artifact: {path}")
        return 1
    text = path.read_text(encoding="utf-8")
    missing = [heading for heading in REQUIRED if not re.search(rf"^##\s+{re.escape(heading)}\s*$", text, re.M)]
    if missing:
        print("ERROR missing sections: " + ", ".join(missing))
        return 1
    if re.search(r"\b(innovative|líder|integral|360)\b", text, re.I) and "evidence" not in text.lower():
        print("ERROR promotional claims require an evidence section")
        return 1
    print(f"OK valid brand artifact: {path}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
