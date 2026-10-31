# Banda sonora v6 (12,5 s, 120 BPM): tema rock nuevo de ElevenLabs (flow xeeaUimdx9tuMTxmYNHi, variante A,
# instrumental verificado). Sin edición de estructura: la imagen se ajustó a sus ataques medidos
# (4,00 envío · 6,00 la tarjeta · 10,00 la esfera aterriza; la banda termina sola cerca de 11,9).
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
ins=['-i','rock-a.wav']; fl=["[0]aresample=48000,aformat=channel_layouts=stereo,atrim=0:12.5,afade=t=out:st=12.2:d=0.3[m]"]; labs=['[m]']
def sfx(file,t,vol=1.0,rate=None):
  ins.extend(['-i',file]); k=len(ins)//2-1; p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
for j in range(11): sfx('clic.wav',2.375+0.125*j,0.12,60000)    # tipeo, discreto bajo la guitarra
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=first,aformat=sample_rates={R}:channel_layouts=stereo[o]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[o]','mezcla-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-14.0-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.82:level=false",'mezcla-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
