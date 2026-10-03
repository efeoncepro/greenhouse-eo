#!/bin/sh
SRC=$(echo "$1" | cut -d'|' -f1); PF=$(echo "$1" | cut -d'|' -f2); OUT=$(echo "$1" | cut -d'|' -f3); SIZE=$(echo "$1" | cut -d'|' -f4); MACRO=$(echo "$1" | cut -d'|' -f5); EXTRA=$(echo "$1" | cut -d'|' -f6)
[ -f "$OUT" ] && exit 0
if [ -n "$EXTRA" ]; then
  pnpm -s ai:image --image "$SRC" --image "$MACRO" --image "$EXTRA" --prompt-file "$PF" --out "$OUT" --model gpt-image-2.5-sunburst --quality high --size "$SIZE" > "${OUT%.png}.log" 2>&1
else
  pnpm -s ai:image --image "$SRC" --image "$MACRO" --prompt-file "$PF" --out "$OUT" --model gpt-image-2.5-sunburst --quality high --size "$SIZE" > "${OUT%.png}.log" 2>&1
fi
