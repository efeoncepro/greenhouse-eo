#!/bin/bash
# Rutas foco de Chile y Perú internacional (2026-11-06): KV → popup y story. Sin GIF ni story video.
# Uso: ./rutas-foco.sh [HM_…]   (sin argumentos: las 16 rutas de rutas-foco.cjs)
set -e
cd "$(dirname "$0")"
N="$*"; [ -z "$N" ] && N=$(node -e "console.log(require('./rutas-foco.cjs').RUTAS.map(r=>r.name).join(' '))")
node rutas-foco.cjs $N
node destinos.cjs $N > /dev/null
F=""; for n in $N; do F="$F $n.svg"; done
node brecha.cjs $F
node render.cjs $F > /dev/null 2>&1
node parts.cjs $F > /dev/null 2>&1
PISO_SUTIL=1 VELO_AUTO=1 node compose.cjs $N > /dev/null
echo "rutas foco: $(echo $N | wc -w)"
