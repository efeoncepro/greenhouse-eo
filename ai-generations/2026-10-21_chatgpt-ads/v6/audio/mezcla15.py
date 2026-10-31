# Banda sonora v6 extendida (15 s): mismo tema rock (variante A). El acorde final sostenido (10,35-11,1) se estira
# ×2,86 conservando el tono para cubrir la tapa final, y después decae solo; fundido en los últimos 0,6 s.
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
g=("[0]aresample=48000,aformat=channel_layouts=stereo,asplit=3[x][y][z];"
   "[x]atrim=0:10.38,asetpts=PTS-STARTPTS[s1];"
   "[y]atrim=10.35:11.12,asetpts=PTS-STARTPTS,atempo=0.5,atempo=0.7[s2];"
   "[z]atrim=11.08,asetpts=PTS-STARTPTS[s3];"
   "[s1][s2]acrossfade=d=0.03:c1=tri:c2=tri[s12];[s12][s3]acrossfade=d=0.06:c1=tri:c2=tri,atrim=0:15,afade=t=out:st=14.4:d=0.6[m]")
ins=['-i','rock-a.wav']; fl=[g]; labs=['[m]']
def sfx(file,t,vol=1.0,rate=None):
  ins.extend(['-i',file]); k=len(ins)//2-1; p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
for j in range(11): sfx('clic.wav',2.375+0.125*j,0.12,60000)
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=first,aformat=sample_rates={R}:channel_layouts=stereo[o]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[o]','mezcla15-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla15-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-14.0-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla15-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.82:level=false",'mezcla15-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla15-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
