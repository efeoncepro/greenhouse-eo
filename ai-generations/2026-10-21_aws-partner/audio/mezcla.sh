#!/bin/zsh
# Banda sonora AWS sobre la grilla de 120 BPM (ver ../audio-cues.json). Dos pasos: bus (un solo amix) + sting.
set -e
R=48000
ffmpeg -v error -y -i clic-b.mp3 -af "atrim=1.62:1.74,asetpts=PTS-STARTPTS,aresample=$R,aformat=channel_layouts=stereo" clic.wav
# riser 1,0-1,75 (barrido exponencial 150->1500 Hz) y aire del pasillo 2,0-3,95
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.35*(t/0.75)^2*sin(2*PI*150*0.75/log(10)*(pow(10,t/0.75)-1))':s=${R}:d=0.75" -af "aformat=channel_layouts=stereo,afade=t=out:st=0.745:d=0.005" riser.wav
ffmpeg -v error -y -f lavfi -i "anoisesrc=d=1.95:c=pink:r=${R}:a=0.5" -af "highpass=f=700,volume='0.15+0.85*(t/1.95)^2':eval=frame,aformat=channel_layouts=stereo,afade=t=out:st=1.90:d=0.05" aire.wav
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.9*exp(-t*3.2)*sin(2*PI*(30*t+25*(1-exp(-t*4))/4))':s=${R}:d=1.4" -af "aformat=channel_layouts=stereo" sub.wav
D(){ echo "adelay=$(( $1 ))|$(( $1 ))" }
ffmpeg -v error -y \
 -i musica-b.mp3 -i musica-b.mp3 -i musica-b.mp3 -i clic.wav -i riser.wav -i golpe1-a.mp3 -i sub.wav -i pasillo-a.mp3 -i pasillo-b.mp3 -i aire.wav -i golpe2-a.mp3 -i golpe1-b.mp3 \
 -filter_complex "
[0]atrim=4.0:5.75,asetpts=PTS-STARTPTS,afade=t=in:d=0.2,afade=t=out:st=1.745:d=0.005,volume=0.75[m1];
[1]atrim=10.0:12.0,asetpts=PTS-STARTPTS,afade=t=out:st=1.97:d=0.03,adelay=2000|2000[m2];
[2]atrim=10.0:14.0,asetpts=PTS-STARTPTS,afade=t=out:st=2.6:d=1.4,adelay=4000|4000[m3];
[3]asplit=16[c0][c1][c2][c3][c4][c5][c6][c7][c8][c9][c10][c11][c12][c13][c14][c15];
[c0]volume=0.35,adelay=0|0[k0];[c1]volume=0.35,adelay=125|125[k1];[c2]volume=0.35,adelay=250|250[k2];
[c3]volume=1.0,adelay=500|500[k3];[c4]volume=0.8,adelay=625|625[k4];[c5]volume=0.9,adelay=750|750[k5];[c6]volume=0.9,adelay=875|875[k6];[c7]volume=1.0,adelay=1000|1000[k7];
[c8]asetrate=60000,aresample=48000,volume=0.5,adelay=1250|1250[k8];[c9]asetrate=60000,aresample=48000,volume=0.55,adelay=1375|1375[k9];[c10]asetrate=60000,aresample=48000,volume=0.6,adelay=1500|1500[k10];[c11]asetrate=60000,aresample=48000,volume=0.65,adelay=1625|1625[k11];
[c12]asetrate=33600,aresample=48000,volume=0.55,adelay=2250|2250[r1];[c13]asetrate=33600,aresample=48000,volume=0.55,adelay=2750|2750[r2];[c14]asetrate=33600,aresample=48000,volume=0.6,adelay=3250|3250[r3];[c15]asetrate=33600,aresample=48000,volume=0.65,adelay=3750|3750[r4];
[4]adelay=1000|1000[ri];
[5]volume=0.9,adelay=2000|2000[g1];[6]asplit=2[s1][s2];[s1]adelay=2000|2000[sb1];[s2]volume=0.9,adelay=4000|4000[sb2];
[7]volume=0.6,adelay=2000|2000[p1];[8]volume=0.55,adelay=3000|3000[p2];[9]volume=0.5,adelay=2000|2000[ai];
[10]volume=0.9,adelay=4000|4000[g2];[11]volume=0.5,adelay=4000|4000[g3];
[m1][m2][m3][k0][k1][k2][k3][k4][k5][k6][k7][k8][k9][k10][k11][r1][r2][r3][r4][ri][g1][sb1][sb2][p1][p2][ai][g2][g3]amix=inputs=28:normalize=0:duration=longest,
volume='if(lt(t,1.75),1,if(lt(t,2.0),0,if(lt(t,4.55),1,if(lt(t,4.6),1-0.9*(t-4.55)/0.05,if(lt(t,4.98),0.1,if(lt(t,5.05),0.1+0.45*(t-4.98)/0.07,0.55))))))':eval=frame,atrim=0:8,aformat=sample_rates=48000:channel_layouts=stereo[bus]" -map "[bus]" bus.wav
ffmpeg -v error -y -i bus.wav -i efeonce-sting.wav -filter_complex "[1]aresample=48000,aformat=channel_layouts=stereo,adelay=4410|4410,volume=1.0[st];[0][st]amix=inputs=2:normalize=0:duration=first[o]" -map "[o]" mezcla-pre.wav
L=$(ffmpeg -hide_banner -i mezcla-pre.wav -af loudnorm=print_format=json -f null - 2>&1 | awk -F'"' '/input_i/{print $4}')
G=$(python3 -c "print(-13.6-($L))")
ffmpeg -v error -y -i mezcla-pre.wav -af "volume=${G}dB,alimiter=limit=0.7:level=false" mezcla-master.wav
ffmpeg -hide_banner -i mezcla-master.wav -af loudnorm=print_format=json -f null - 2>&1 | awk -F'"' '/input_i|input_tp/{print $2": "$4}'
echo "duracion $(ffprobe -v error -show_entries format=duration -of csv=p=0 mezcla-master.wav)"
