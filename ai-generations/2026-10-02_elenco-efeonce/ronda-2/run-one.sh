#!/bin/sh
D=ai-generations/2026-10-02_elenco-efeonce/ronda-2
pnpm -s ai:image --prompt-file "$D/$1.txt" --out "$D/$1.png" --model gpt-image-2.5-sunburst --quality high --size 1024x1280 > "$D/$1.log" 2>&1
