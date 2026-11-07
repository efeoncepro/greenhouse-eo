#!/bin/bash
# Décima ronda (2026-11-06, Daniela en Teams y Frame «V2»): logo BLACK nuevo en todas las piezas (resplandor original del
# kit, patches.cjs → logoNuevo) y ajustes de Frame. Sólo POP-up y GIF: Daniela exporta story y story video.
# Uso: ./ronda10.sh [--sin-gif]
set -e
cd "$(dirname "$0")"
node variantes.cjs > /dev/null
node destinos.cjs HM_AR_KV_SANTIAGO HM_AR_KV_LIMA HM_UY_KV_BANDERAS HM_US_KV_BANDERAS HM_PE_KV_INTER_BANDERAS HM_PE_KV_ENCUENTRA HM_CL_KV_INTER_CLUSTER HM_CL_KV_ENCUENTRA HM_PE_KV_DOM_REGIONES > /dev/null
node brecha.cjs HM_AR_KV_SANTIAGO.svg HM_AR_KV_LIMA.svg HM_BR_KV_SANTIAGO.svg HM_BR_KV_PERU.svg HM_PE_KV_ENCUENTRA.svg HM_PE_KV_DOM_REGIONES.svg HM_PE_KV_INTER_BANDERAS.svg > /dev/null
# Las 10 piezas del lote de Daniela; BR Santiago y BR Perú se re-renderizan sólo porque variantes.cjs los reescribe.
N="HM_UY_KV_BANDERAS HM_US_KV_BANDERAS HM_AR_KV_LIMA HM_AR_KV_SANTIAGO HM_CL_KV_INTER_CLUSTER HM_CL_KV_DOM_CLUSTER HM_CL_KV_ENCUENTRA HM_PE_KV_INTER_BANDERAS HM_PE_KV_DOM_REGIONES HM_PE_KV_ENCUENTRA"
T="$N HM_BR_KV_SANTIAGO HM_BR_KV_PERU"
F=""; for n in $T; do F="$F $n.svg"; done
node render.cjs $F > /dev/null 2>&1
node parts.cjs $F > /dev/null 2>&1
node compose.cjs $T > /dev/null
echo "estáticos: $(echo $T | wc -w)"
[ "$1" = "--sin-gif" ] && exit 0
G=""; for n in $N; do G="$G $n.svg"; done
node layers.cjs $G > /dev/null 2>&1
node recrop.cjs $N > /dev/null
node anim-css-gen.cjs $N > /dev/null
./render-gif.sh $N
echo "GIF: $(echo $N | wc -w)"
