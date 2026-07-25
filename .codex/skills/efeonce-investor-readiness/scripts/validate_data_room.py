#!/usr/bin/env python3
"""Validate data-room index metadata and sharing controls."""
from csv import DictReader
from pathlib import Path
import sys

required = {"id", "area", "document", "owner", "status", "updated", "confidentiality", "share externally?", "source"}
statuses = {"missing", "draft", "review", "approved", "expired", "superseded"}
sharing = {"yes", "no", "conditional"}

if len(sys.argv) != 2:
    print("usage: validate_data_room.py <index.csv>")
    sys.exit(2)
path = Path(sys.argv[1])
if not path.exists():
    print(f"missing data room index: {path}")
    sys.exit(1)
with path.open(newline="") as handle:
    reader = DictReader(handle)
    rows = list(reader)
    headers = set(reader.fieldnames or [])
errors = [f"missing headers: {', '.join(sorted(required - headers))}"] if required - headers else []
seen = set()
for index, row in enumerate(rows, start=2):
    ident = row.get("id", "").strip()
    if not ident:
        errors.append(f"row {index}: empty id")
    if ident in seen:
        errors.append(f"row {index}: duplicate id {ident}")
    seen.add(ident)
    if row.get("status", "").strip() not in statuses:
        errors.append(f"row {index}: invalid status")
    if row.get("share externally?", "").strip().lower() not in sharing:
        errors.append(f"row {index}: invalid share externally? value")
    if row.get("share externally?", "").strip().lower() == "yes" and row.get("status", "").strip() != "approved":
        errors.append(f"row {index}: externally shared item must be approved")
if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"data-room index valid: {len(rows)} rows")
