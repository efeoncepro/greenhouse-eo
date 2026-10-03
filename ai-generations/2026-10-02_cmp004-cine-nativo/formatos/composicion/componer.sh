#!/bin/zsh
# Compone pieza por pieza un plan de formato y deja una línea por pieza. Uso: componer.sh <suf> [ids...]
cd /Users/jreye/Documents/greenhouse-eo
P=ai-generations/2026-10-02_cmp004-cine-nativo/formatos/composicion/piezas-$1.json; shift
ids=("$@"); [[ ${#ids} -eq 0 ]] && ids=($(python3 -c "import json;print(' '.join(p['id'] for p in json.load(open('$P'))))"))
for id in $ids; do
  r=$(node scripts/foto/componer-cta.mjs $P $id 2>&1 | grep -vE "objc|GNotification" | grep -E "^CMP004|Error" | sed -E 's/gaps.*//' | cut -c1-330)
  echo "$r"
done
