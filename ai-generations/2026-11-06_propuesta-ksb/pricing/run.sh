#!/bin/bash
# uso: run.sh <clave> <sufijo>  (escaffold + demanda + cotización, salida nueva cada vez)
cd /Users/jreye/Documents/greenhouse-eo
D=ai-generations/2026-11-06_propuesta-ksb/pricing
( cd "$D" && python3 gen.py "$1" )
pnpm --silent pricing:v3 compose scaffold --current --input "$D/$1.brief.json" > "$D/$1.scaffold.json"
( cd "$D" && python3 demand.py "$1" )
pnpm --silent pricing:v3 compose quote --current --input "$D/$1.demand.json" --out "$D/$1.$2.artifact.json" > "$D/$1.$2.summary.json"
echo "$1 exit $?"
python3 - "$D/$1.$2.summary.json" <<'PY'
import json,sys
s=json.load(open(sys.argv[1]))
print(s['calculationStatus'], [(d['code'],d['path']) for d in (s.get('diagnostics') or [])][:8])
t=s.get('totals')
if t: print({k:t[k] for k in ('cost','net','marginAmount','averageMonthlyNet','currency')}, 'margin', s.get('marginRateRoundedDown'), 'flagged', (s.get('marginFloor') or {}).get('flaggedLinePeriods'))
PY
