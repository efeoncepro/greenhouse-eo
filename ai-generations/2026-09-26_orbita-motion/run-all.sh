#!/bin/zsh
# Cola de render + codificación por variante, 3 trabajadores (reparto round-robin de queue.txt).
# Candado: una sola instancia a la vez (dos instancias codificando la misma variante corrompieron 4 MP4 el 2026-09-26).
# node y ffmpeg leen stdin: sin `< /dev/null` se comen líneas de queue.txt y la cola salta variantes en silencio
# (así quedaron 16 de 30 sin hacer el 2026-09-26).
# Cada variante deja .done (cuadros) y .encoded (entregables): una variante terminada nunca se vuelve a tocar.
cd /Users/jreye/Documents/greenhouse-eo
R=ai-generations/2026-09-26_orbita-motion
mkdir $R/.lock 2>/dev/null || { echo "Ya hay una cola corriendo ($R/.lock). Salgo."; exit 1 }
trap 'rmdir $R/.lock' EXIT
worker() {
  local w=$1 i=0
  while read -r v; do
    (( i++ % 3 == w )) || continue
    [[ -f $R/frames/$v/.encoded ]] && continue
    local anim=${v%%_*} rest=${v#*_}
    local fmt=${rest%_*} scheme=${rest##*_}
    if [[ ! -f $R/frames/$v/.done ]]; then
      node scripts/creative/brand-motion/render-orbit-motion.mjs --out $R/frames --anim $anim --format $fmt --scheme $scheme --fps 60 --sub 4 < /dev/null && touch $R/frames/$v/.done || { echo "FAIL render $v"; continue }
    fi
    node scripts/creative/brand-motion/encode-orbit-motion.mjs --frames $R/frames --sound $R/sound --out $R/deliverables --only $v < /dev/null && touch $R/frames/$v/.encoded && echo "OK $v $(date +%T)" || echo "FAIL encode $v"
  done < $R/queue.txt
}
for w in 0 1 2; do worker $w > $R/log-w$w.txt 2>&1 & done
wait
echo ALL DONE
