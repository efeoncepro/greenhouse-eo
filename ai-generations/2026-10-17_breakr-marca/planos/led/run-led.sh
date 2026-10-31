#!/bin/zsh
# uso: run-led.sh <id> <plate relativo a la carpeta de la corrida>
cd /Users/jreye/Documents/greenhouse-eo
R=ai-generations/2026-10-17_breakr-marca
SRC=$R/$2
W=$(sips -g pixelWidth "$SRC" | awk '/pixelWidth/{print $2}'); H=$(sips -g pixelHeight "$SRC" | awk '/pixelHeight/{print $2}')
pnpm -s ai:image --model gpt-image-2.5-sunburst --quality high --size ${W}x${H} --image "$SRC" --prompt-file "$R/planos/prompts/$1-led.txt" --out "$R/planos/led/$1-led-modelo-v1.png" > "$R/log/plano-$1-led-v1.log" 2>&1
echo "$1 exit=$? $(stat -f%z $R/planos/led/$1-led-modelo-v1.png 2>/dev/null)"
