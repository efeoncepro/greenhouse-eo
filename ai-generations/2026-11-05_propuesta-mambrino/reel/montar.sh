#!/bin/sh
# Monta el reel de muestra «Del fuego a tu mesa» (15 s, 1080x1920) desde los clips Wan 3.0 y las capas de texto.
set -e
cd "$(dirname "$0")"
V=../muestras/v2-piezas/jpg/historia-vela.jpg
FC='[0:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[v0];[1:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[v1];[2:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[v2];[3:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[v3];[4:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[v4];[5:v]scale=1188:2112,zoompan=z=1+0.0006*on:x=(iw-iw/zoom)/2:y=(ih-ih/zoom)/2:d=60:s=1080x1920:fps=30,setsar=1,format=yuv420p[v5];[6:v]format=rgba,fade=t=in:st=0.15:d=0.35:alpha=1[o0];[7:v]format=rgba,fade=t=in:st=0.15:d=0.35:alpha=1[o1];[8:v]format=rgba,fade=t=in:st=0.15:d=0.35:alpha=1[o2];[9:v]format=rgba,fade=t=in:st=0.15:d=0.35:alpha=1[o3];[10:v]format=rgba,fade=t=in:st=0.1:d=0.3:alpha=1[o4];[11:v]format=rgba,fade=t=in:st=0.1:d=0.5:alpha=1[o5];[v0][o0]overlay=shortest=1[s0];[v1][o1]overlay=shortest=1[s1];[v2][o2]overlay=shortest=1[s2];[v3][o3]overlay=shortest=1[s3];[v4][o4]overlay=shortest=1[s4];[v5][o5]overlay=shortest=1,fade=t=out:st=1.6:d=0.4[s5];[s0][s1][s2][s3][s4][s5]concat=n=6:v=1:a=0[v];[12:a]atrim=0:15,afade=t=in:d=0.2,afade=t=out:st=13.8:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]'
ffmpeg -v error -y \
  -ss 0.6 -t 2 -i clips/1-queso.mp4 -t 3 -i clips/2-masa.mp4 -t 3 -i clips/3-fuego.mp4 -t 3 -i clips/4-plato.mp4 -t 2 -i clips/5-brindis.mp4 \
  -loop 1 -t 2 -i "$V" \
  -loop 1 -t 2 -i overlays/t1.png -loop 1 -t 3 -i overlays/t2.png -loop 1 -t 3 -i overlays/t3.png -loop 1 -t 3 -i overlays/t4.png -loop 1 -t 2 -i overlays/t5.png -loop 1 -t 2 -i overlays/t6.png \
  -i musica.mp3 \
  -filter_complex "$FC" \
  -map '[v]' -map '[a]' -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 15 reel-mambrino-del-fuego.mp4
ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 reel-mambrino-del-fuego.mp4
ffmpeg -v error -y -ss 9.5 -i reel-mambrino-del-fuego.mp4 -frames:v 1 -q:v 3 poster.jpg
