#!/bin/bash
# Renderiza MP4, MP4 con audio y GIF desde las animaciones CSS (anim-css-<KV>.html) de este directorio.
# Uso: render-gif.sh HM_AR_KV [HM_BR_KV ...]   (sin argumentos: todas)
set -e
# Color (2026-11-06, Dianesty: «en todos los gif cambia el color del logo»): sin matriz explícita, ffmpeg pasaba de RGB a
# YUV con BT.601 y no etiquetaba el video; navegadores, Frame y QuickTime lo leen como BT.709 y el verde del logo caía
# de 221 a 189 (más apagado). Se convierte con BT.709 y se etiqueta: decodificado como BT.709 vuelve a 217 ≈ el KV.
V709="-vf scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
K="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$K/../.." && pwd)"
AUD=$K/../canvas/project/ref/audio-gif.mp3
cd $K
NAMES="$@"; [ -z "$NAMES" ] && NAMES=$(ls anim-css-HM_*.html | sed 's/anim-css-//; s/\.html//')
for N in $NAMES; do
  n=$(echo $N | tr 'A-Z' 'a-z'); rm -rf fr-$n
  node frames.cjs $K anim-css-$N.html $K/fr-$n 25 > /dev/null
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png $V709 -c:v libx264 -crf 18 -movflags +faststart $OUT/$N.mp4
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png -i $AUD $V709 -c:v libx264 -crf 18 -c:a aac -b:a 192k -af "volume=-3dB,alimiter=limit=0.79" -shortest -movflags +faststart $OUT/${N}_audio.mp4
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png -vf "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a" -loop 0 $OUT/$N.gif
  echo "$N listo"
done
