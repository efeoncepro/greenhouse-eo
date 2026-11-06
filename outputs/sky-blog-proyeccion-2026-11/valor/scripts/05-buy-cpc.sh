#!/usr/bin/env bash
# Buys keyword_overview/live for each planned batch via the canonical DataForSEO CLI (preview first, then --yes with
# --estimated-usd/--max-usd), keeps preview + receipt per batch, and stops if the cumulative real cost would pass USD 3.
set -uo pipefail
V=outputs/sky-blog-proyeccion-2026-11/valor
ORG=org-b9977f96-f7ef-4afb-bb26-7355d78c981f
CUM=0
while read -r FILE KW EST; do
  REC=${FILE/-payload/-receipt}; PRE=${FILE/-payload/-preview}
  [ -f "$REC" ] && { echo "skip $REC exists"; continue; }
  NEXT=$(python3 -c "print(round($CUM+$EST,6))")
  if python3 -c "import sys; sys.exit(0 if $NEXT<=3.0 else 1)"; then :; else echo "STOP: ceiling would be exceeded ($NEXT)"; break; fi
  pnpm -s dataforseo -- run /v3/dataforseo_labs/google/keyword_overview/live --file "$FILE" --org $ORG --consumer seo --dry-run > "$PRE" 2>&1
  MAX=$(python3 -c "print(round($EST*1.2,4))")
  pnpm -s dataforseo -- run /v3/dataforseo_labs/google/keyword_overview/live --file "$FILE" --org $ORG --consumer seo \
    --yes --estimated-usd "$EST" --max-usd "$MAX" --out "$REC" > "${REC%.json}.log" 2>&1 || { echo "FAILED $FILE (see log) — not retrying"; break; }
  COST=$(python3 -c "import json;d=json.load(open('$REC'));r=d['response'];print(r.get('costUsd') if r.get('costUsd') is not None else 'unknown');")
  [ "$COST" = "unknown" ] && { echo "unknown cost for $FILE — stopping"; break; }
  CUM=$(python3 -c "print(round($CUM+$COST,6))")
  echo "$FILE kw=$KW est=$EST real=$COST cum=$CUM"
done < $V/dataforseo/batches.txt
echo "TOTAL_REAL_USD=$CUM"
