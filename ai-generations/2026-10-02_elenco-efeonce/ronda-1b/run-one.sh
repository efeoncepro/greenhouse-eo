#!/bin/sh
D=ai-generations/2026-10-02_elenco-efeonce
pnpm -s ai:image --image "$D/ronda-1/$1.png" --prompt-file "$D/ronda-1b/$1.txt" --out "$D/ronda-1b/$1.png" --model gpt-image-2.5-sunburst --quality high --size 1024x1280 > "$D/ronda-1b/$1.log" 2>&1
