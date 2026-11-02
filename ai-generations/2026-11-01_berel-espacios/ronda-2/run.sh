#!/bin/bash
D=/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-01_berel-espacios/ronda-2
W=/Users/jreye/Documents/creative-workbench
while IFS=$'\t' read -r esp reg name code extra; do
  P=$(cd $W && node brands/berel/scripts/prompt-plate.mjs --registro "$reg" --espacio "$esp" --color "$name" --codigo "$code" --extra "$extra")
  P="$P

The attached reference image is the exact Berel paint color swatch for the painted surface ($name $code). The painted surface must match that swatch exactly in hue, value and saturation under neutral daylight. Do not show the swatch itself in the photo."
  printf '%s' "$P" > "$D/prompt-$esp.txt"
  cd /Users/jreye/Documents/greenhouse-eo && gtimeout 600 pnpm -s ai:image --image "$D/chip-$code.png" --prompt-file "$D/prompt-$esp.txt" --model gpt-image-2.5-sunburst --quality xhigh --size 2048x1536 --format png --out "$D/$esp.png" 2>&1 | grep -E "✓|✗|rror" | sed "s/^/$esp: /"
done < "$D/specs.tsv"
