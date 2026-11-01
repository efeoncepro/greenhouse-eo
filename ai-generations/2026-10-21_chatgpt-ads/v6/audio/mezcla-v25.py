# Banda sonora 15 s con eleven_music_v2_5 (flow xeeaUimdx9tuMTxmYNHi, toma 2, instrumental verificado).
# Se toma desde su segundo 6,0 para que su acorde final (16,00) caiga en el 10,0, cuando la esfera aterriza, y
# resuene natural bajo la tapa. Dos stop-time de montaje (silencio de un cuarto de tiempo) antes del 4,0 y del 10,0.
# Sin estiramiento ni procesamiento de la música.
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
stop="if(between(t,3.75,3.995)+between(t,9.75,9.995),0,1)"
ins=['-i','v25-2.wav']; fl=[f"[0]aresample=48000,aformat=channel_layouts=stereo,atrim=6.06:21.06,asetpts=PTS-STARTPTS,volume='{stop}':eval=frame,afade=t=out:st=14.5:d=0.5[m]"]; labs=['[m]']
def sfx(file,t,vol=1.0,rate=None):
  ins.extend(['-i',file]); k=len(ins)//2-1; p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
for j in range(11): sfx('clic.wav',2.375+0.125*j,0.12,60000)
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=first,aformat=sample_rates={R}:channel_layouts=stereo[o]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[o]','mezcla-v25-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-v25-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-14.0-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla-v25-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.82:level=false",'mezcla-v25-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-v25-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
