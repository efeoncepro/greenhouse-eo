#!/bin/bash
# Novena ronda (2026-11-06, Daniela en Frame + Teams): POP-up y GIF. Rehace en cascada las 10 piezas de «GIF + POPUP»
# más las variantes que variantes.cjs reescribe (AR Lima, BR Santiago, BR Perú). Uso: ./ronda9.sh [--sin-gif]
set -e
cd "$(dirname "$0")"
node variantes.cjs > /dev/null
node destinos.cjs HM_AR_KV_SANTIAGO HM_AR_KV_LIMA HM_UY_KV_BANDERAS HM_US_KV_BANDERAS HM_PE_KV_INTER_BANDERAS HM_PE_KV_ENCUENTRA > /dev/null
node brecha.cjs HM_AR_KV_SANTIAGO.svg HM_AR_KV_LIMA.svg HM_BR_KV_SANTIAGO.svg HM_BR_KV_PERU.svg HM_PE_KV_ENCUENTRA.svg HM_PE_KV_DOM_REGIONES.svg HM_PE_KV_INTER_BANDERAS.svg > /dev/null
N="HM_UY_KV_BANDERAS HM_US_KV_BANDERAS HM_AR_KV_LIMA HM_AR_KV_SANTIAGO HM_CL_KV_INTER_CLUSTER HM_CL_KV_DOM_CLUSTER HM_CL_KV_ENCUENTRA HM_PE_KV_INTER_BANDERAS HM_PE_KV_DOM_REGIONES HM_PE_KV_ENCUENTRA HM_BR_KV_SANTIAGO HM_BR_KV_PERU"
F=""; for n in $N; do F="$F $n.svg"; done
# «Vuela por el Perú» dejó de llevar PromPerú y ubicación: se borran sus capas viejas para que compose no las reponga.
rm -f parts/HM_PE_KV_DOM_REGIONES__* layers/HM_PE_KV_DOM_REGIONES__*
node render.cjs $F > /dev/null 2>&1
node parts.cjs $F > /dev/null 2>&1
node compose.cjs $N > /dev/null
echo "estáticos: $(echo $N | wc -w)"
[ "$1" = "--sin-gif" ] && exit 0
node layers.cjs $F > /dev/null 2>&1
node recrop.cjs $N > /dev/null
node anim-css-gen.cjs $N > /dev/null
./render-gif.sh $N
node story-video.cjs $N > /dev/null
echo "GIF y story video: $(echo $N | wc -w)"
