#!/bin/zsh
# Uso: ui/pipeline.sh <ID> <WxH> <acabado-prompt> <ui1> [ui2 ...]  (desde ai-generations/2026-10-18_menu-sitio)
ID=$1; SIZE=$2; PR=$3; shift 3
R=/Users/jreye/Documents/greenhouse-eo; D=$R/ai-generations/2026-10-18_menu-sitio
cd $R && pnpm -s foto:generar $D/fichas/$ID.json --quality high > $D/plates/v1/$ID.gen.log 2>&1 || { echo "generar falló"; exit 1; }
cd $D && node ui/componer-paneles.mjs $D/plates/$ID.png $D/compuestas/$ID-comp.png "$@" || exit 1
cd $R && pnpm -s ai:image --model gpt-image-2.5-sunburst --quality high --size $SIZE --image $D/compuestas/$ID-comp.png --prompt-file $PR --out $D/compuestas/$ID-acabado.png > $D/plates/v1/$ID.acabado.log 2>&1
[ -f $D/compuestas/$ID-acabado.png ] || { echo "acabado falló"; tail -3 $D/plates/v1/$ID.acabado.log; exit 1; }
cd $D && node ui/reponer-paneles.mjs $D/plates/$ID.png $D/compuestas/$ID-comp-raw.png $D/compuestas/$ID-acabado.png $D/compuestas/$ID.png
