#!/bin/zsh
# Para cada ficha del patrón, prueba las variantes en orden y deja en composición la primera que compone.
# Uso: probar-variantes.sh <suf> <orden de variantes, p. ej. "d c b a"> <claves...>
cd /Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-02_cmp004-cine-nativo/formatos
suf=$1; orden=(${=2}); shift 2
for clave in "$@"; do ok=""
  for v in $orden; do d=(plates/$clave-$suf-*-$v(N)); [[ ${#d} -eq 1 ]] || continue; id=${${d[1]:t}%-$v}; p=$d[1]/$id.png; [[ -f $p ]] || continue
    cp $p composicion/plates/CMP004-$clave-KV-$suf-N1.png; r=$(composicion/componer.sh $suf CMP004-$clave-KV-$suf-N1)
    if [[ $r == CMP004* ]]; then echo "✓ $clave-$suf ($v) ${r:20:170}"; ok=1; break; else echo "  ✗ $clave-$suf ($v) $(echo $r | grep -o 'Error.*\|LienzoError.*' | cut -c1-170)"; fi
  done; [[ -n $ok ]] || echo "✗✗ $clave-$suf sin variante que componga"; done
