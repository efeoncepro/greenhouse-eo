#!/bin/sh
set -eu
cd "$(dirname "$0")"
ffmpeg -hide_banner -loglevel error -n -filter_complex_threads 2 -ss 20.666666667 -i ../2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/topaz-full-4k.mp4 -framerate 24 -start_number 0 -i alpha/frame-%03d.png -filter_complex '[0:v]setpts=PTS-STARTPTS,setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=limited,scale=in_color_matrix=bt709:out_range=pc,format=rgb24[bg];[1:v]format=rgba[fg];[bg][fg]overlay=eof_action=pass:format=rgb,format=bgr0[out]' -map '[out]' -an -frames:v 80 -c:v ffv1 -level 3 -threads 4 patch-lossless.mkv
