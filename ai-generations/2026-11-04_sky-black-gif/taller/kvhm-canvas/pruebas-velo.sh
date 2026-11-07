#!/bin/bash
# Pruebas del velo superior (2026-11-06, Dianesty vía Daniela: «que sea lo mismo para todos y no tan oscuro»; Daniela:
# «dos o tres pruebas, no en todas»). Tres piezas, cuatro variantes; KV y popup a OUT/pruebas-velo/<variante>/.
# Al final vuelve a correr las tres piezas con el default, así la entrega queda como estaba.
set -e
cd "$(dirname "$0")"
OUT="$(cd ../.. && pwd)/pruebas-velo"
N="HM_AR_KV_LIMA HM_PE_KV_ENCUENTRA HM_CL_KV_ENCUENTRA"
F=""; for n in $N; do F="$F $n.svg"; done
corre() { node destinos.cjs $N > /dev/null; node render.cjs $F > /dev/null 2>&1; node parts.cjs $F > /dev/null 2>&1; node compose.cjs $N > /dev/null; }
variante() { # nombre + variables de entorno
  local v=$1; shift
  env "$@" bash -c "$(declare -f corre); N='$N'; F='$F'; corre"
  mkdir -p "$OUT/$v"
  for n in $N; do cp "png/$n.png" "$OUT/$v/${n}__kv.png"; cp "formatos/${n}__popup.png" "$OUT/$v/${n}__popup.png"; done
  echo "$v listo"
}
variante 0-actual VELO_A=0.69 VELO_FORMA=lineal VELO_FIN_K=1 SOMBRA=1 VELO_LISTA=1
variante A-suave VELO_A=0.40 SOMBRA=0
variante B-curva VELO_A=0.45 VELO_FORMA=suave VELO_FIN_K=0.85 SOMBRA=0
variante C-logo VELO_A=0.38 VELO_FORMA=logo SOMBRA=0
corre; echo "default restaurado"
