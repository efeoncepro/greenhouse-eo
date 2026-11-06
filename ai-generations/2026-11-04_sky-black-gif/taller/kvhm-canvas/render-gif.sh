#!/bin/bash
# Renderiza MP4, MP4 con audio y GIF desde las animaciones CSS (anim-css-<KV>.html) de este directorio.
# Uso: render-gif.sh HM_AR_KV [HM_BR_KV ...]   (sin argumentos: todas)
set -e
K="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$K/../.." && pwd)"
AUD=$K/../canvas/project/ref/audio-gif.mp3
cd $K
NAMES="$@"; [ -z "$NAMES" ] && NAMES=$(ls anim-css-HM_*.html | sed 's/anim-css-//; s/\.html//')
for N in $NAMES; do
  n=$(echo $N | tr 'A-Z' 'a-z'); rm -rf fr-$n
  node frames.cjs $K anim-css-$N.html $K/fr-$n 25 > /dev/null
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart $OUT/$N.mp4
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png -i $AUD -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -af "volume=-3dB,alimiter=limit=0.79" -shortest -movflags +faststart $OUT/${N}_audio.mp4
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png -vf "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a" -loop 0 $OUT/$N.gif
  echo "$N listo"
done
