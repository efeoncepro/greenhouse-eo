#!/bin/zsh
# uso: run-one.sh <plate-id> <kv-ratio|vacío>
set -u
R=ai-generations/2026-10-17_breakr-marca
SRC=ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/plates-v5/$1.png
W=$(sips -g pixelWidth "$SRC" | awk '/pixelWidth/{print $2}')
H=$(sips -g pixelHeight "$SRC" | awk '/pixelHeight/{print $2}')
ARGS=(--image "$SRC" --image "$R/lata/breakr-lata-v1.png")
[ "${2:--}" != "-" ] && ARGS+=(--image "$R/activos/kv-$2.png")
pnpm -s ai:image --model gpt-image-2.5-sunburst --quality high --size ${W}x${H} "${ARGS[@]}" \
  --prompt-file "$R/planos/prompts/$1.txt" --out "$R/planos/$1-breakr-v1.png" > "$R/log/plano-$1-v1.log" 2>&1
echo "$1 exit=$? $(ls -la $R/planos/$1-breakr-v1.png 2>/dev/null | awk '{print $5}')"
