#!/bin/bash
# Piloto del lecho, ronda 3 (vertical 14 %, muro del jardín, 2026-11-02): una toma por fila de specs.tsv, una sola intención cada una.
D=/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-02_berel-lecho-logo/ronda-3
gen() {
  IFS=$'\t' read -r id toma esp reg name code lecho extra <<< "$(grep "^$1$(printf '\t')" "$D/specs.tsv")"
  img=(); [ "$code" != - ] && img=(--image "$D/chip-$code.png")
  cd /Users/jreye/Documents/greenhouse-eo && gtimeout 900 pnpm -s ai:image --openai-key personal "${img[@]}" --prompt-file "$D/prompt-$id.txt" \
    --model gpt-image-2.5-sunburst --quality xhigh --size 2048x1536 --format png --out "$D/$id.png" 2>&1 | grep -E "✓|✗|rror|USD" | sed "s/^/$id: /"
}
export -f gen; export D
# Solo el id viaja por xargs: en macOS -I tiene tope de 255 bytes y las filas largas no se ejecutaban.
cut -f1 "$D/specs.tsv" | grep -v '^$' | while read -r id; do [ -f "$D/$id.png" ] || echo "$id"; done | xargs -P 4 -I{} bash -c 'gen "$@"' _ {}
