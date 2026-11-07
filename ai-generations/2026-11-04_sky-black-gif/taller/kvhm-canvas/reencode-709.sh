#!/bin/bash
# Re-codifica MP4 y MP4 con audio desde los cuadros ya renderizados (fr-<kv>/), con color BT.709 (ver render-gif.sh).
# Uso: ./reencode-709.sh HM_PE_KV_ENCUENTRA [...]
set -e
cd "$(dirname "$0")"; K="$(pwd)"; OUT="$(cd "$K/../.." && pwd)"; AUD=$K/../canvas/project/ref/audio-gif.mp3
V709="-vf scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
for N in "$@"; do
  n=$(echo $N | tr 'A-Z' 'a-z'); [ -f fr-$n/f0000.png ] || { echo "$N sin cuadros"; continue; }
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png $V709 -c:v libx264 -crf 18 -movflags +faststart $OUT/$N.mp4
  ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png -i $AUD $V709 -c:v libx264 -crf 18 -c:a aac -b:a 192k -af "volume=-3dB,alimiter=limit=0.79" -shortest -movflags +faststart $OUT/${N}_audio.mp4
  echo "$N listo"
done
