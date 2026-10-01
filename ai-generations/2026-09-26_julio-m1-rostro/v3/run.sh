#!/bin/zsh
cd /Users/jreye/Documents/greenhouse-eo
D=ai-generations/2026-09-26_julio-m1-rostro/v3; R=ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas; S=ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas
REFS=(); for n in 04 08 06 05 07 01 03 11 09 10 12; do REFS+=(--image $R/julio-ap-$n.png); done
while IFS=$'\t' read -r name src who keep body; do
  python3 - "$D/base.txt" "$D/prompt-$name.txt" "$who" "$keep" "$body" <<'PY'
import sys; t=open(sys.argv[1]).read(); t=t.replace('{WHO}',sys.argv[3]).replace('{KEEP}',sys.argv[4]).replace('{BODY}',sys.argv[5]); open(sys.argv[2],'w').write(t)
PY
  gtimeout 360s pnpm -s ai:image --image $S/$src "${REFS[@]}" --prompt-file $D/prompt-$name.txt --size 1152x1440 --quality high --out $D/$name-v3-plate.png 2>&1 | tail -2
done < $D/jobs.tsv
echo ALLDONE
