#!/usr/bin/env python3
"""Small structural validator for the business-model operator skill."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
required = ["SKILL.md", "references/sources.md", "templates/business-model-integrity-pack.md", "templates/validation-plan.md", "checklists/business-model-review.md", "agents/openai.yaml"]
missing = [p for p in required if not (ROOT / p).exists()]
if missing:
    print("missing:", ", ".join(missing))
    sys.exit(1)
text = (ROOT / "SKILL.md").read_text().lower()
terms = ["delivery", "revenue", "unit economics", "validation", "ip", "capital", "finance", "legal"]
missing_terms = [t for t in terms if t not in text]
if missing_terms:
    print("missing required concepts:", ", ".join(missing_terms))
    sys.exit(1)
print(f"business-model skill valid: {len(required)} required artifacts present")
