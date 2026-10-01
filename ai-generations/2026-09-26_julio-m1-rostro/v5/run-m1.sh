#!/bin/zsh
cd /Users/jreye/Documents/greenhouse-eo
REFS=(); for n in 04 08 06 05 07 01 03 11 09 10 12; do REFS+=(--image ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-$n.png); done
gtimeout 360s pnpm -s ai:image --model gpt-image-2.5-sunburst --image ai-generations/2026-09-26_julio-m1-rostro/v5/M1-julio-clawd-codex-crop.png "${REFS[@]}" --prompt-file ai-generations/2026-09-26_julio-m1-rostro/v5/prompt-M1.txt --size 1024x1024 --quality high --out ai-generations/2026-09-26_julio-m1-rostro/v5/M1-julio-clawd-codex-edit.png 2>&1 | tail -1
node ai-generations/2026-09-26_julio-m1-rostro/v5/recorte.cjs paste ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/mascotas/M1-julio-clawd-codex-plate.png ai-generations/2026-09-26_julio-m1-rostro/v5/M1-julio-clawd-codex-edit.png 590 420 480 ai-generations/2026-09-26_julio-m1-rostro/v5/M1-julio-clawd-codex-v5-plate.png && echo listo M1
