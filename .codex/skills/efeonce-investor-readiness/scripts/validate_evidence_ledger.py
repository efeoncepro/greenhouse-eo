#!/usr/bin/env python3
"""Validate an investor evidence ledger CSV without judging the truth of claims."""
from csv import DictReader
from pathlib import Path
import sys

required = {
    "claim_id", "claim", "claim_type", "period", "source", "source_owner",
    "as_of", "confidence", "allowed_surfaces", "review_date"
}
allowed_confidence = {"observed", "reconciled", "estimated", "inferred", "aspirational", "asserted"}
allowed_surfaces = {"internal", "data_room", "deck", "public"}

if len(sys.argv) != 2:
    print("usage: validate_evidence_ledger.py <ledger.csv>")
    sys.exit(2)
path = Path(sys.argv[1])
if not path.exists():
    print(f"missing ledger: {path}")
    sys.exit(1)
with path.open(newline="") as handle:
    rows = list(DictReader(handle))
    headers = set(rows[0]) if rows else set()
missing = required - headers
errors = [f"missing headers: {', '.join(sorted(missing))}"] if missing else []
for index, row in enumerate(rows, start=2):
    for key in required:
        if not row.get(key, "").strip():
            errors.append(f"row {index}: empty {key}")
    confidence = row.get("confidence", "").strip().lower()
    if confidence and confidence not in allowed_confidence:
        errors.append(f"row {index}: invalid confidence {confidence}")
    surfaces = {item.strip() for item in row.get("allowed_surfaces", "").split(",") if item.strip()}
    if not surfaces.issubset(allowed_surfaces):
        errors.append(f"row {index}: invalid surfaces {sorted(surfaces - allowed_surfaces)}")
if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"evidence ledger valid: {len(rows)} rows")
