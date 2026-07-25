#!/usr/bin/env python3
"""Small structural validator for investor-readiness artifacts."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
required = ["SKILL.md", "references/sources.md", "templates/claim-record.md", "templates/metric-contract.md", "checklists/readiness.md", "agents/openai.yaml"]
missing = [p for p in required if not (ROOT / p).exists()]
if missing:
    print("missing:", ", ".join(missing))
    sys.exit(1)

text = (ROOT / "SKILL.md").read_text()
terms = ["evidence", "data room", "use of funds", "diligence", "runway", "SAFE", "legal"]
missing_terms = [t for t in terms if t.lower() not in text.lower()]
if missing_terms:
    print("missing required concepts:", ", ".join(missing_terms))
    sys.exit(1)
print(f"investor-readiness skill valid: {len(required)} required artifacts present")
