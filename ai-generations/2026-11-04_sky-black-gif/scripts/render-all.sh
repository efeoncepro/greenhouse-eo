#!/bin/bash
set -e
cd /private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas
for f in /private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/canvas/project/anim-hm_*.dc.html; do
  b=$(basename "$f" .dc.html); n=${b#anim-}; N=$(echo "$n" | tr 'a-z' 'A-Z' | sed 's/^HM/HM/')
  rm -rf "fr-$n"; node frames.cjs /private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/canvas/project "$b.dc.html" "/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas/fr-$n" 25
  ffmpeg -y -loglevel error -framerate 25 -i "fr-$n/f%04d.png" -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart "/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/$N.mp4"
  ffmpeg -y -loglevel error -framerate 25 -i "fr-$n/f%04d.png" -i /private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/canvas/project/ref/audio-gif.mp3 -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -af "volume=-3dB,alimiter=limit=0.79" -shortest -movflags +faststart "/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/${N}_audio.mp4"
  ffmpeg -y -loglevel error -framerate 25 -i "fr-$n/f%04d.png" -vf "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a" -loop 0 "/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/$N.gif"
  echo "$N listo"
done
