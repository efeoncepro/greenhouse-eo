#!/bin/bash
set -e
cd "$(dirname "$0")"; K="$(pwd)"
for f in $K/../canvas/project/anim-hm_*.dc.html; do
  b=$(basename "$f" .dc.html); n=${b#anim-}; N=$(echo "$n" | tr 'a-z' 'A-Z' | sed 's/^HM/HM/')
  rm -rf "fr-$n"; node frames.cjs $K/../canvas/project "$b.dc.html" "$K/fr-$n" 25
  ffmpeg -y -loglevel error -framerate 25 -i "fr-$n/f%04d.png" -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart "$K/../../$N.mp4"
  ffmpeg -y -loglevel error -framerate 25 -i "fr-$n/f%04d.png" -i $K/../canvas/project/ref/audio-gif.mp3 -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -af "volume=-3dB,alimiter=limit=0.79" -shortest -movflags +faststart "$K/../../${N}_audio.mp4"
  ffmpeg -y -loglevel error -framerate 25 -i "fr-$n/f%04d.png" -vf "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a" -loop 0 "$K/../../$N.gif"
  echo "$N listo"
done
