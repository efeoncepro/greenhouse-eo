#!/bin/zsh
# Cierre de la corrida V1.1: espera a que termine la cola (candado .lock), sube TODO al bucket público de AXIS
# (incluidas las capas PNG), copia lo liviano a OneDrive y SÓLO si el bucket tiene cada archivo local con el mismo
# tamaño, borra frames/ y deliverables/ para liberar disco. Si algo no cuadra, no borra nada y lo dice.
set -u
R=/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_orbita-motion
B=gs://efeonce-group-axis-public-media/motion/logo/v1.1
OD="/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1"
cd $R
while [[ -d .lock ]]; do sleep 60; done
echo "cola terminada $(date +%T); variantes codificadas: $(ls frames/*/.encoded 2>/dev/null | wc -l | tr -d ' ') de $(wc -l < queue.txt | tr -d ' ')"
gcloud storage rsync deliverables $B --recursive --exclude='.*\.DS_Store' --cache-control="public, max-age=86400" || { echo "FALLÓ la subida; no borro nada"; exit 1 }
rsync -a --include='*/' --exclude='png-por-capas/' --include='*.mp4' --include='*.png' --include='*.gif' --include='LEEME.txt' --exclude='*' --prune-empty-dirs deliverables/ "$OD/" || { echo "FALLÓ OneDrive; no borro nada"; exit 1 }
# Verificación: cada archivo local debe estar en el bucket con el mismo tamaño.
gcloud storage ls -l -r "$B/**" | awk '$1 ~ /^[0-9]+$/ {sub("'"$B"'/",""); print $3"\t"$1}' | sort > /tmp/orbita-bucket.tsv
(cd deliverables && find . -type f ! -name .DS_Store -exec stat -f '%N	%z' {} + | sed 's#^\./##' | sort) > /tmp/orbita-local.tsv
missing=$(comm -23 /tmp/orbita-local.tsv /tmp/orbita-bucket.tsv | wc -l | tr -d ' ')
if [[ $missing != 0 ]]; then echo "NO borro: $missing archivos locales no están (o difieren) en el bucket"; comm -23 /tmp/orbita-local.tsv /tmp/orbita-bucket.tsv | head; exit 1; fi
echo "verificado: $(wc -l < /tmp/orbita-local.tsv | tr -d ' ') archivos en el bucket con el mismo tamaño"
before=$(du -sh . | cut -f1)
rm -rf frames deliverables
echo "liberado: la corrida pasó de $before a $(du -sh . | cut -f1) (quedan scripts, logs, sonido y storyboards)"
