#!/bin/zsh
# Espera al cierre en curso, renderiza lo que falta y vuelve a cerrar (sube, verifica y libera disco).
R=/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_orbita-motion
while pgrep -f "finalize.sh" > /dev/null; do sleep 60; done
echo "cierre 1 terminado $(date +%T)"
# Las marcas .encoded viven en frames/, que el cierre borra: las variantes ya subidas se marcan desde el bucket.
mkdir -p $R/frames
for v in $(cat $R/queue.txt); do
  anim=${v%%_*}; rest=${v#*_}; fmt=${rest%_*}; scheme=${rest##*_}
  a=$([[ $anim == open ]] && echo apertura || echo $anim); s=$([[ $scheme == dark ]] && echo navy || echo claro)
  if gcloud storage ls "gs://efeonce-group-axis-public-media/motion/logo/v1.1/$a/$fmt/$s/efeonce-orbita-${a}_${fmt}_${s}_60fps.mp4" > /dev/null 2>&1; then mkdir -p $R/frames/$v && touch $R/frames/$v/.encoded; fi
done
echo "ya en el bucket: $(ls $R/frames/*/.encoded 2>/dev/null | wc -l | tr -d ' ') de 30"
zsh $R/run-all.sh
zsh $R/finalize.sh
