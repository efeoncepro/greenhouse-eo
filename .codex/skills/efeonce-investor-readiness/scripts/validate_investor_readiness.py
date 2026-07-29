#!/usr/bin/env python3
"""Small structural validator for investor-readiness artifacts."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
required = [
    "SKILL.md", "references/sources.md", "references/source-catalog.json", "templates/claim-record.md", "templates/metric-contract.md",
    "templates/investor-deck-outline.md", "templates/financial-readiness-review.md",
    "templates/use-of-funds-model.md", "templates/data-room-index.md", "templates/investor-pipeline.md",
    "templates/diligence-risk-register.md", "templates/fundraising-decision-record.md",
    "templates/application-variants.md", "templates/founder-video-brief.md", "templates/product-demo-brief.md",
    "templates/post-close-reporting.md", "checklists/readiness.md", "agents/openai.yaml",
    "evals/acceptance-criteria.md", "evals/protocol.md"
]
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
