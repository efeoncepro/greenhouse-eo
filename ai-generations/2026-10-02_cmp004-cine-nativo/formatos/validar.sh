#!/bin/zsh
# Valida reservas (zona de texto + lecho) de cada plate generado. Uso: validar.sh <patrón de id>
cd /Users/jreye/Documents/greenhouse-eo
D=ai-generations/2026-10-02_cmp004-cine-nativo/formatos
for dir in $D/plates/$~1; do id=${${dir:t}%-?}; p=$dir/$id.png; [[ -f $p ]] || continue
  r=$(pnpm -s foto:validar $p --ficha $D/fichas/$id.json --zona-texto 2>&1 | grep -E "zona de texto|lecho de la firma" | sed -E 's/ +/ /g' | cut -c1-90 | tr '\n' '|')
  echo "${dir:t} | $r"; done
