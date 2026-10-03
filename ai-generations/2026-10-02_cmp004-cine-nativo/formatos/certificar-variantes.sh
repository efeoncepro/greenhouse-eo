#!/bin/zsh
# Prueba variantes de plate de UNA pieza: compone y certifica en un plan temporal; deja la primera que pasa el gate.
# Uso: certificar-variantes.sh <suf> <clave> "<variantes en orden>"
F=/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-02_cmp004-cine-nativo/formatos; cd /Users/jreye/Documents/greenhouse-eo
suf=$1; clave=$2; orden=(${=3}); pid=CMP004-$clave-KV-$suf-N1; T=$F/composicion/tmp-$clave-$suf.json
python3 -c "import json;d=json.load(open('$F/composicion/piezas-$suf.json'));json.dump([p for p in d if p['id']=='$pid'],open('$T','w'),ensure_ascii=False,indent=2)"
for v in $orden; do d=($F/plates/$clave-$suf-*-$v(N)); [[ ${#d} -eq 1 ]] || continue; id=${${d[1]:t}%-$v}; p=$d[1]/$id.png; [[ -f $p ]] || continue
  cp $p $F/composicion/plates/$pid.png; rm -f $F/composicion/out/qa-tmp-$clave-$suf.json
  c=$(node scripts/foto/componer-cta.mjs $T 2>&1 | grep -E "^Error|LienzoError" | cut -c1-160)
  if [[ -n $c ]]; then echo "  ✗ $clave-$suf ($v) compone: $c"; continue; fi
  g=$(node scripts/foto/componer-cta.gate.mjs $T 2>&1 | grep -E "^✗" | cut -c1-170 | tr '\n' ' ')
  if [[ -z $g ]]; then echo "✓ $clave-$suf ($v) certificada"; rm -f $T; exit 0; else echo "  ✗ $clave-$suf ($v) gate: $g"; fi
done; rm -f $T; echo "✗✗ $clave-$suf sin variante certificable"
