#!/bin/sh
SRC=$(echo "$1" | cut -d'|' -f1); PF=$(echo "$1" | cut -d'|' -f2); OUT=$(echo "$1" | cut -d'|' -f3); SIZE=$(echo "$1" | cut -d'|' -f4)
pnpm -s ai:image --image "$SRC" --prompt-file "$PF" --out "$OUT" --model gpt-image-2.5-sunburst --quality high --size "$SIZE" > "${OUT%.png}.log" 2>&1
