#!/bin/zsh
# Uso: qa.sh <nombre> <url>  · baja el clip, recorta el padding a 4:5, mide cortes y arma una hoja de 20 cuadros.
n=$1; u=$2
curl -s -o $n.mp4 "$u"
W=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 $n.mp4)
H=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 $n.mp4)
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $n.mp4)
CH=$(python3 -c "print(int(round($W*5/4/2))*2)")
Y=$(( (H-CH)/2 ))
echo "$n: ${W}x${H} ${D}s → recorte ${W}x${CH}+${Y}"
ffmpeg -v error -y -i $n.mp4 -vf "crop=$W:$CH:0:$Y" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac $n-4x5.mp4 2>/dev/null || ffmpeg -v error -y -i $n.mp4 -vf "crop=$W:$CH:0:$Y" -c:v libx264 -crf 18 -pix_fmt yuv420p -an $n-4x5.mp4
ffmpeg -i $n-4x5.mp4 -vf scdet=threshold=8 -f null - 2>&1 | grep -oE 'lavfi.scd.time: [0-9.]+' | sed "s/^/  corte /"
rm -rf q_$n && mkdir q_$n
python3 - "$n" "$D" <<'PY'
import sys,subprocess
n,d=sys.argv[1],float(sys.argv[2])
ts=[0,0.083,0.167,0.25,0.333,0.417,0.5,0.583,0.667,0.75,0.875,1.0,1.25,1.5,1.75,2.0,2.5,3.0,min(3.5,d-0.1),d-0.08]
for i,t in enumerate(ts):
    subprocess.run(['ffmpeg','-v','error','-y','-ss',f'{t:.3f}','-i',f'{n}-4x5.mp4','-frames:v','1','-update','1','-vf','scale=256:320',f'q_{n}/f_{i:02d}.png'])
PY
NODE_PATH=/Users/jreye/Documents/greenhouse-eo/node_modules node -e "
const sharp=require('sharp'),fs=require('fs');const n='$n';const f=fs.readdirSync('q_'+n).sort().map(x=>'q_'+n+'/'+x);
(async()=>{await sharp({create:{width:1280,height:1280,channels:3,background:'#000'}}).composite(f.map((p,i)=>({input:p,left:(i%5)*256,top:Math.floor(i/5)*320}))).png().toFile('hoja-'+n+'.png')})()"
