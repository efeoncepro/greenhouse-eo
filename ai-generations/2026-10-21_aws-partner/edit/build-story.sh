#!/bin/zsh
# Story 9:16: pasillo en relleno (crop central); Tierra ajustada al ancho sobre bandas de espacio (y=120).
BG=0x02070d
ffmpeg -v error -y \
 -framerate 24 -i ../comp/ap-story/a%04d.png -i seg1-rampa.mp4 -i seg2-rampa.mp4 -i ../video/tomaD.mp4 \
 -f lavfi -i "color=c=0xfff1dc:s=1080x1920:r=24:d=2" -f lavfi -i "color=c=0xffffff:s=1080x1920:r=24:d=1" \
 -filter_complex "
[0]format=yuv420p,setsar=1,trim=end_frame=48[A];
[1]trim=end_frame=48,setpts=PTS-STARTPTS,scale=2880:3840,crop=2160:3840:360:0,scale=w='2*trunc(2160*(1.04+0.16*exp(-t*9))/2)':h=-2:eval=frame,crop=2160:3840:x='(in_w-2160)/2+24*exp(-t*7)*sin(t*90)':y='(in_h-3840)/2+20*exp(-t*7)*cos(t*70)',scale=1080:1920,eq=brightness='0.07*exp(-mod(t\,0.25)*16)':eval=frame,format=yuv420p,setsar=1[b0];
[4]format=yuv420p,setsar=1[w1];[b0][w1]blend=all_expr='A+(B-A)*exp(-T*11)',trim=end_frame=48[B];
[2]trim=end_frame=24,setpts=PTS-STARTPTS,scale=2160:2880,pad=2160:3840:0:240:color=${BG},scale=w='2*trunc(2160*(1.3333-0.2633*(1-pow(1-min(t\,1)\,3))+0.12*exp(-t*8))/2)':h=-2:eval=frame,crop=2160:3840:x='(in_w-2160)/2+20*exp(-t*7)*sin(t*85)':y='max(0\,min(in_h-3840\,1104*in_h/3840-1104+16*exp(-t*7)*cos(t*66)))',scale=1080:1920,format=yuv420p,setsar=1[c0];
[5]format=yuv420p,setsar=1[w2];[c0][w2]blend=all_expr='A+(B-A)*exp(-T*8)',trim=end_frame=24,fps=24,settb=1/24[C];
[3]trim=end_frame=76,setpts=PTS-STARTPTS,scale=4320:5760,scale=w='2*trunc(4320*(1.07-0.07*(0.55*t/3.17+0.45*(1-pow(1-t/3.17\,2))))/2)':h=-2:eval=frame,crop=4320:5760:x='(in_w-4320)/2':y='(in_h-5760)*0.30',scale=1080:1440,pad=1080:1920:0:120:color=$BG,format=yuv420p,setsar=1,fps=24,settb=1/24[D];
[C][D]xfade=transition=fade:duration=0.1667:offset=0.8333[CD];
[A][B][CD]concat=n=3:v=1[v]" -map "[v]" -r 24 -frames:v 192 -c:v libx264 -crf 14 -pix_fmt yuv420p story-mudo.mp4
