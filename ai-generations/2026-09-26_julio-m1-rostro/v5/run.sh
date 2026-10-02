#!/bin/zsh
cd /Users/jreye/Documents/greenhouse-eo
D=ai-generations/2026-09-26_julio-m1-rostro/v5; R=ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas; S=ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas
REFS=(); for n in 04 08 06 05 07 01 03 11 09 10 12; do REFS+=(--image $R/julio-ap-$n.png); done
while IFS=$'\t' read -r n src cx cy box gaze; do
  python3 -c "import sys;t=open(sys.argv[1]).read().replace('{GAZE}',sys.argv[2]);open(sys.argv[3],'w').write(t)" $D/base.txt "$gaze" $D/prompt-$n.txt
  gtimeout 360s pnpm -s ai:image --model gpt-image-2.5-sunburst --image $D/$n-crop.png "${REFS[@]}" --prompt-file $D/prompt-$n.txt --size 1024x1024 --quality high --out $D/$n-edit.png 2>&1 | tail -1
  node $D/recorte.cjs paste $S/$src $D/$n-edit.png $cx $cy $box $D/$n-v5-plate.png && echo "listo $n"
done < $D/jobs.tsv
echo ALLDONE
