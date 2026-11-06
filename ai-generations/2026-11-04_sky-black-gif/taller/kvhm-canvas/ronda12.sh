#!/bin/bash
# Doceava ronda (2026-11-06, Dianesty y Daniela en Teams): sin sombras de texto (banderas.cjs, rutas.cjs), píldora de
# origen adaptativa con 35 px tras la última letra (pildora.cjs), y degradados sólo donde hacen falta: VELO_AUTO=1
# (velo B sólo si el fondo del logo es ruidoso) y PISO_SUTIL=1 (piso negro 15 % sólo si el pie es claro), en KV,
# popup, story y MP4. Lote GIF + POPUP, extras AR/BR banderas y rutas foco de Perú.
set -e
cd "$(dirname "$0")"
export VELO_AUTO=1 PISO_SUTIL=1
node banderas.cjs HM_AR_KV_BANDERAS HM_PE_KV_INTER_BANDERAS HM_BR_KV_BANDERAS HM_US_KV_BANDERAS HM_UY_KV_BANDERAS > /dev/null
node variantes.cjs > /dev/null
node rutas.cjs > /dev/null
R=$(ls "src2/KV X HM" | grep -E '^HM_PE_RUTA_.*\.svg$' | sed 's/\.svg$//' | tr '\n' ' ')
node destinos.cjs HM_AR_KV_SANTIAGO HM_AR_KV_LIMA HM_UY_KV_BANDERAS HM_US_KV_BANDERAS HM_PE_KV_INTER_BANDERAS HM_PE_KV_ENCUENTRA HM_CL_KV_INTER_CLUSTER HM_CL_KV_ENCUENTRA HM_PE_KV_DOM_REGIONES $R > ronda12-destinos.log
L=""; for n in $R; do L="$L $n.svg"; done
node brecha.cjs HM_AR_KV_SANTIAGO.svg HM_AR_KV_LIMA.svg HM_BR_KV_SANTIAGO.svg HM_BR_KV_PERU.svg HM_PE_KV_ENCUENTRA.svg HM_PE_KV_DOM_REGIONES.svg HM_PE_KV_INTER_BANDERAS.svg $L > /dev/null
N="HM_UY_KV_BANDERAS HM_US_KV_BANDERAS HM_AR_KV_LIMA HM_AR_KV_SANTIAGO HM_CL_KV_INTER_CLUSTER HM_CL_KV_DOM_CLUSTER HM_CL_KV_ENCUENTRA HM_PE_KV_INTER_BANDERAS HM_PE_KV_DOM_REGIONES HM_PE_KV_ENCUENTRA HM_AR_KV_BANDERAS HM_BR_KV_BANDERAS"
T="$N HM_BR_KV_SANTIAGO HM_BR_KV_PERU $R"
F=""; for n in $T; do F="$F $n.svg"; rm -f parts/${n}__*; done
node render.cjs $F > /dev/null 2>&1
node parts.cjs $F > /dev/null 2>&1
node compose.cjs $T > /dev/null
echo "estáticos: $(echo $T | wc -w)"
G=""; for n in $N; do G="$G $n.svg"; done
node layers.cjs $G > /dev/null 2>&1
node recrop.cjs $N > /dev/null
node anim-css-gen.cjs $N > /dev/null
./render-gif.sh $N
echo "MP4: $(echo $N | wc -w)"
