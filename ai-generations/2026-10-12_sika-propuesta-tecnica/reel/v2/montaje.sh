#!/bin/bash
# Reel v2 «El agua siempre busca una entrada» · 25 s · 1080×1920 · 30 fps.
# Planos (Seedance 2.5 desde cuadros de Sunburst) + capa de motion (overlay/NNNN.png) + firma POSIBLE (animatic del 06/10)
# + locución (Eleven v4, voz «Marco») + música + golpes sintetizados. Uso: bash montaje.sh [ganancia_musica_dB]
set -e
MG=${1:--11}
# plano 1: sólo los primeros 2,85 s de la gota (después la junta se deforma), estirados a 4 s; el resto, desde T* y con su duración
T1=${T1:-0.6}; T2A=${T2A:-1.5}; T2B=${T2B:-1.0}; T2C=${T2C:-1.5}; T3=${T3:-0.0}; T4=${T4:-0.6}
G="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,eq=contrast=1.07:saturation=1.06:gamma=0.97,noise=alls=5:allf=t,format=yuv420p"
P="scale=1080:1920,fps=30,setsar=1,format=yuv420p"
ffmpeg -v error -y \
 -ss 0 -t 2.85 -i clips/s1-gota.mp4 -ss $T2A -t 2 -i clips/s2a-regadera.mp4 -ss $T2B -t 2 -i clips/s2b-cocina.mp4 -ss $T2C -t 2 -i clips/s2c-ventana.mp4 \
 -f lavfi -t 2 -i color=c=black:s=1080x1920:r=30 -ss $T3 -t 5 -i clips/s3-aplicacion.mp4 -ss $T4 -t 4 -i clips/s4-hero.mp4 -ss 16.9 -t 4 -i ../animatic-sin-audio.mp4 \
 -framerate 30 -i overlay/%04d.png \
 -filter_complex "[0:v]setpts=PTS*1.4036,minterpolate=fps=30:mi_mode=blend,$G[a];[1:v]$G[b];[2:v]$G[c];[3:v]$G[d];[4:v]$P[e];[5:v]$G[f];[6:v]$G[g];[7:v]$P[h];[a][b][c][d][e][f][g][h]concat=n=8:v=1:a=0[base];[base][8:v]overlay=0:0:format=auto,format=yuv420p[v]" \
 -map "[v]" -t 25 -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p _imagen.mp4
# música: la pista generada dura 43 s; se rearma a 25 s con sus golpes (6,55 · 11,1 · 16,95 · 21,55 s) en los cortes del video
# (4 · 6 · 8 · 10 s) y su clímax (40,5 s) en la entrada de la firma (21 s)
MP="[0:a]atrim=2.5:8.5,asetpts=PTS-STARTPTS,afade=t=in:d=0.4[m0];[0:a]atrim=11.05:13.05,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=1.9:d=0.1[m1];[0:a]atrim=16.9:18.9,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=1.9:d=0.1[m2];[0:a]atrim=21.5:23.5,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=1.7:d=0.3[m3];[0:a]atrim=31.5:43,asetpts=PTS-STARTPTS,afade=t=in:d=0.12[m4];[m0][m1][m2][m3][m4]concat=n=5:v=0:a=1,apad=whole_dur=25[m]"
ffmpeg -v error -y -i musica-43.mp3 -filter_complex "$MP" -map "[m]" -t 25 musica.mp3
# locución: inicio y fin de cada frase en vo.mp3, y segundo del video donde entra
SEG=("0.00 2.28 0.90" "2.54 3.38 4.25" "3.52 4.45 6.25" "4.61 5.60 8.25" "5.89 8.52 9.85" "8.73 13.08 12.90" "13.30 15.44 20.60" "15.60 17.90 22.70")
F=""; MIX=""; i=0
for s in "${SEG[@]}"; do set -- $s
  ST=$(awk -v a=$1 -v b=$2 'BEGIN{printf "%.2f", b-a-0.05}'); MS=$(awk -v t=$3 'BEGIN{printf "%d", t*1000}')
  F="$F[0:a]atrim=$1:$2,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=$ST:d=0.05,adelay=$MS|$MS[v$i];"; MIX="$MIX[v$i]"; i=$((i+1))
done
F="$F${MIX}amix=inputs=$i:normalize=0,volume=1.7,aformat=channel_layouts=stereo,apad=whole_dur=25[vo];"
# golpes graves sintetizados en los cortes (seno de 48 Hz con caída) para reforzar la música
H=""; HM=""; j=0
for t in ${HITS:-10.0 12.0 17.0 21.0}; do MS=$(awk -v t=$t 'BEGIN{printf "%d", t*1000}')
  H="$H[2:a]atrim=0:0.9,asetpts=PTS-STARTPTS,afade=t=out:st=0.05:d=0.8,adelay=$MS|$MS[h$j];"; HM="$HM[h$j]"; j=$((j+1))
done
F="$F$H${HM}amix=inputs=$j:normalize=0,volume=0.9,aformat=channel_layouts=stereo,apad=whole_dur=25[hits];"
F="$F[1:a]atrim=0:25,asetpts=PTS-STARTPTS,afade=t=in:d=0.2,afade=t=out:st=24.4:d=0.6,volume=${MG}dB[mu];[vo]asplit[vo1][vo2];[mu][vo2]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=400[duck];[vo1][duck][hits]amix=inputs=3:normalize=0,alimiter=limit=0.95[a]"
ffmpeg -v error -y -i vo.mp3 -i musica.mp3 -f lavfi -t 1 -i "sine=frequency=48:sample_rate=44100" -i _imagen.mp4 -filter_complex "$F" -map 3:v -map "[a]" -c:v copy -c:a aac -b:a 256k -t 25 -movflags +faststart reel-sikaseal-170-v2.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 reel-sikaseal-170-v2.mp4
