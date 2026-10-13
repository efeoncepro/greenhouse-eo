#!/bin/bash
# Planos del reel v2 con Seedance 2.5 (BytePlus), desde el cuadro fijo de Sunburst como primer cuadro.
cd /Users/jreye/Documents/greenhouse-eo
R=ai-generations/2026-10-12_sika-propuesta-tecnica/reel/v2
for n in "$@"; do
  pnpm -s ai:byteplus --model seedance25 --image $R/stills/$n-916.png --prompt-file $R/$n.motion.txt --duration 5 --aspect 9:16 --resolution 1080p --no-audio --out $R/clips/$n.mp4 --yes > $R/clips/$n.log 2>&1
  echo "$n $?" >> $R/clips/_fin.log
done
echo FIN >> $R/clips/_fin.log
