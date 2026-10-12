#!/bin/bash
# Monta la locución (vo-v4.mp3: voz «Marco», español de México, Eleven v4; una toma continua) y la música (musica.mp3) sobre el animatic de 25 s.
# Cada frase se corta por sus silencios (medidos con silencedetect) y se ubica en el segundo de su escena.
# Uso: bash mezcla.sh [ganancia_musica_dB]   → reel-sikaseal-170.mp4
set -e
MG=${1:--13}
# inicio y fin de cada frase en vo-v4.mp3, y segundo del video donde entra
SEG=("0.00 2.40 0.50" "2.62 3.25 3.90" "3.35 4.04 4.90" "4.12 5.00 5.85" "5.20 6.02 7.30" "6.17 8.40 9.30" "8.52 11.46 12.60" "11.52 14.60 17.00" "14.76 16.84 20.75" "17.00 19.12 22.85")
IN=""; F=""; MIX=""; i=0
for s in "${SEG[@]}"; do set -- $s
  ST=$(awk -v a=$1 -v b=$2 'BEGIN{printf "%.2f", b-a-0.05}'); MS=$(awk -v t=$3 'BEGIN{printf "%d", t*1000}')
  F="$F[0:a]atrim=$1:$2,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=$ST:d=0.05,adelay=$MS|$MS[v$i];"
  MIX="$MIX[v$i]"; i=$((i+1))
done
F="$F${MIX}amix=inputs=$i:normalize=0,volume=1.6,aformat=channel_layouts=stereo,apad=whole_dur=25[vo];"
# música: 25 s, entrada y salida suaves, y baja cuando hay voz (sidechain)
F="$F[1:a]atrim=0:25,asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=24.2:d=0.8,volume=${MG}dB[mu];[vo]asplit[vo1][vo2];[mu][vo2]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[duck];[vo1][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]"
ffmpeg -v error -y -i vo-v4.mp3 -i musica.mp3 -i animatic-sin-audio.mp4 -filter_complex "$F" -map 2:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 25 -movflags +faststart reel-sikaseal-170.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 reel-sikaseal-170.mp4
