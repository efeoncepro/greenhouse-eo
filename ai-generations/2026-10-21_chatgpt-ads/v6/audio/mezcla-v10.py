# Banda sonora v10 (15 s): eleven_music_v2_5, toma 2, desde su propio primer golpe, con UN solo empalme.
# Empalme compás a compás: sale 14 ms antes del tiempo fuerte de 9,99 s y entra 12 ms antes del acorde final (16,005 s);
# el acorde cae en el 10,05 de la pieza (aterriza la esfera) y resuena solo bajo la tapa hasta ~14,6 s.
# Sin stop-time, sin estiramiento. El empalme lo arma y lo verifica `pnpm ai:audio-edits revisar --plan plan-v10-ajustado.json --render musica-v10.wav`.
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
ins=['-i','musica-v10.wav']; fl=["[0]aresample=48000,aformat=channel_layouts=stereo,atrim=0:15,asetpts=PTS-STARTPTS[m]"]; labs=['[m]']
def sfx(file,t,vol=1.0,rate=None):
  ins.extend(['-i',file]); k=len(ins)//2-1; p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
for j in range(11): sfx('clic.wav',2.375+0.125*j,0.12,60000)
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=first,aformat=sample_rates={R}:channel_layouts=stereo[o]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[o]','mezcla-v10-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-v10-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-14.0-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla-v10-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.82:level=false",'mezcla-v10-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-v10-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
