#!/bin/bash
# Onceava ronda (2026-11-06, Dianesty en Frame V3 y Teams): difuminado B en todas las piezas con foto (destinos.cjs),
# sin sombra lateral ni velo tras las listas; MP4 en BT.709 (color del logo); píldora de origen centrada (variantes.cjs);
# Uruguay con lista de destinos con nombre (banderas.cjs, ya aplicado a su SVG). Lote GIF + POPUP y rutas foco de Perú.
set -e
cd "$(dirname "$0")"
./ronda10.sh
R=$(ls "src2/KV X HM" | grep -E '^HM_PE_RUTA_.*\.svg$' | sed 's/\.svg$//' | tr '\n' ' ')
node destinos.cjs $R > /dev/null
F=""; for n in $R; do F="$F $n.svg"; done
node render.cjs $F > /dev/null 2>&1
node parts.cjs $F > /dev/null 2>&1
node compose.cjs $R > /dev/null
echo "rutas Perú: $(echo $R | wc -w)"
