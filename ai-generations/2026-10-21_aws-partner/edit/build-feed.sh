#!/bin/zsh
# Montaje del feed 4:5 (1080x1350). D: empuje a 4x interno para que el zoom no salte de a píxel.
ffmpeg -v error -y \
 -framerate 24 -i ../comp/ap-feed/a%04d.png -i seg1-rampa.mp4 -i seg2-rampa.mp4 -i ../video/tomaD.mp4 \
 -f lavfi -i "color=c=0xfff1dc:s=1080x1350:r=24:d=2" -f lavfi -i "color=c=0xffffff:s=1080x1350:r=24:d=1" \
 -filter_complex "
[0]format=yuv420p,setsar=1,trim=end_frame=48[A];
[1]trim=end_frame=48,setpts=PTS-STARTPTS,scale=4320:5760,crop=4320:5400:0:180,scale=w='2*trunc(4320*(1.04+0.16*exp(-t*9))/2)':h=-2:eval=frame,crop=4320:5400:x='(in_w-4320)/2+48*exp(-t*7)*sin(t*90)':y='(in_h-5400)/2+40*exp(-t*7)*cos(t*70)',scale=1080:1350,eq=brightness='0.07*exp(-mod(t\,0.25)*16)':eval=frame,format=yuv420p,setsar=1[b0];
[4]format=yuv420p,setsar=1[w1];[b0][w1]blend=all_expr='A+(B-A)*exp(-T*11)',trim=end_frame=48[B];
[2]trim=end_frame=24,setpts=PTS-STARTPTS,scale=4320:5760,crop=4320:5400:0:180,scale=w='2*trunc(4320*(1.07+0.12*exp(-t*8))/2)':h=-2:eval=frame,crop=4320:5400:x='(in_w-4320)/2+40*exp(-t*7)*sin(t*85)':y='(in_h-5400)/2+32*exp(-t*7)*cos(t*66)',scale=1080:1350,format=yuv420p,setsar=1[c0];
[5]format=yuv420p,setsar=1[w2];[c0][w2]blend=all_expr='A+(B-A)*exp(-T*8)',trim=end_frame=24[C];
[3]trim=end_frame=76,setpts=PTS-STARTPTS,scale=4320:5760,crop=4320:5400:0:180,scale=w='2*trunc(4320*(1.07-0.07*(0.55*t/3.17+0.45*(1-pow(1-t/3.17\,2))))/2)':h=-2:eval=frame,crop=4320:5400:x='(in_w-4320)/2':y='(in_h-5400)*0.30',scale=1080:1350,format=yuv420p,setsar=1[D];
[C][D]xfade=transition=fade:duration=0.1667:offset=0.8333[CD];
[A][B][CD]concat=n=3:v=1[v]" -map "[v]" -r 24 -frames:v 192 -c:v libx264 -crf 14 -pix_fmt yuv420p feed-mudo.mp4
