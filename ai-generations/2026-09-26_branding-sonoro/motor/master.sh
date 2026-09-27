#!/usr/bin/env bash
# Masteriza una pieza: realce suave sobre 5 kHz + loudnorm en dos pasadas al objetivo de su destino.
#   motor/master.sh <in.wav> <out.wav> <LUFS>   (−14 video/redes · −16 podcast)
set -euo pipefail
in=$1; out=$2; target=$3
pre="highshelf=f=5000:g=3"
m=$(ffmpeg -hide_banner -nostats -i "$in" -af "$pre,loudnorm=I=$target:TP=-1:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$m" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -hide_banner -loglevel error -y -i "$in" -af "$pre,loudnorm=I=$target:TP=-1:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a pcm_s24le "$out"
