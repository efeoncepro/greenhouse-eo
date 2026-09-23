#!/usr/bin/env bash
# Post determinístico (0 créditos) de una toma generada: out/<toma>.mp4 -> finales/<toma>-final.mp4
#   1. 3:4 -> 4:5: recorte centrado 1080x1350 (quita 45 px arriba y abajo), SÓLO si qa.sh midió las franjas.
#   2. Firma: logo oficial (public/branding/logo-negative.svg) al 20 % del lado corto, compuesto, nunca generado.
#   3. Room tone: ruido marrón a -58 dBFS bajo el audio (el silencio digital del piloto 01 medía -163,9 dB).
#   4. H.264 CRF 18 + AAC 192k, faststart.
# Uso: ./post.sh CMP001-04-9x16   (FIRMA_Y=<0..1> fuerza la altura del centro de la firma)
set -euo pipefail
cd "$(dirname "$0")"
REPO=/Users/jreye/Documents/greenhouse-eo
take=$1; in="out/${take}.mp4"; mkdir -p finales tmp
[ -f "$in" ] || { echo "falta $in"; exit 1; }
piece=$(echo "$take" | cut -d- -f2); ratio=${take##*-}

# Altura del centro de la firma, medida sobre los estáticos aprobados (quitar-logo.mjs).
case "$piece-$ratio" in
  02-9x16|03-9x16) fy=0.833 ;;
  0[4-7]-9x16)     fy=0.900 ;;
  *)               fy=0.934 ;;
esac
fy=${FIRMA_Y:-$fy}

vf=""
if [ "$ratio" = "3x4" ]; then
  vf="crop=1080:1350:0:45,"
  out="finales/${take/3x4/4x5}-final.mp4"
else
  out="finales/${take}-final.mp4"
fi

read -r W H < <(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0:s=x "$in" | tr x ' ')
[ "$ratio" = "3x4" ] && H=1350
short=$(( W < H ? W : H )); lw=$(( short * 20 / 100 ))
node -e "require('$REPO/node_modules/sharp')('$REPO/public/branding/logo-negative.svg',{density:600}).resize($lw).png().toFile('tmp/logo-$lw.png').then(()=>{})"
lh=$(ffprobe -v error -show_entries stream=height -of csv=p=0 "tmp/logo-$lw.png")
ly=$(python3 -c "print(round($fy*$H - $lh/2))")

ffmpeg -loglevel error -y -i "$in" -i "tmp/logo-$lw.png" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.0013:sample_rate=48000" \
  -filter_complex "[0:v]${vf}setsar=1[v0];[v0][1:v]overlay=(W-w)/2:${ly}:format=auto[v];[0:a][2:a]amix=inputs=2:duration=first:normalize=0[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  -shortest "$out"
echo "$out  firma ${lw}x${lh} en y=${ly} (centro ${fy})"
