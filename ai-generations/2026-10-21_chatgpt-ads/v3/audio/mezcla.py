# Banda sonora v3 «La pregunta» (15 s, 120 BPM). Música B de ElevenLabs (flow xeeaUimdx9tuMTxmYNHi) editada:
# build 0-3,75 · silencio 3,75-4,0 · drop 4,0 · micro-hueco 7,85-8,0 · drop 8,0 · tensión 10,0-11,75 · silencio 11,75-12,0 · sting con pico en 12,0.
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"aevalsrc='0.32*(t/0.75)^2*sin(2*PI*150*0.75/log(10)*(pow(10,t/0.75)-1))':s={R}:d=0.75",'-af','aformat=channel_layouts=stereo,afade=t=out:st=0.745:d=0.005','riser.wav'])
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"anoisesrc=d=0.4:c=pink:r={R}:a=0.5",'-af',"highpass=f=900,volume='0.05+0.95*(t/0.4)^3':eval=frame,aformat=channel_layouts=stereo,afade=t=out:st=0.38:d=0.02",'barrido.wav'])
ins=[]; fl=[]; labs=[]
def inp(f): ins.extend(['-i',f]); return len(ins)//2-1
mus=[(4.0,7.75,0.0,'afade=t=in:d=0.4,afade=t=out:st=3.745:d=0.005'),
     (8.5,10.5,4.0,'afade=t=out:st=1.97:d=0.03'),(8.5,10.35,6.0,'afade=t=in:d=0.02,afade=t=out:st=1.82:d=0.03'),
     (8.5,10.5,8.0,'afade=t=out:st=1.97:d=0.03'),
     (6.0,7.75,10.0,'afade=t=in:d=0.05,afade=t=out:st=1.745:d=0.005'),
     (10.5,14.0,12.0,'afade=t=out:st=1.5:d=1.5')]
for i,(a,b,t,f) in enumerate(mus):
  k=inp('musica-b.mp3'); fl.append(f"[{k}]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample={R},{f},adelay={int(t*1000)}|{int(t*1000)}[m{i}]"); labs.append(f"[m{i}]")
def sfx(file,t,vol=1.0,rate=None):
  k=inp(file); p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
for j in range(21): sfx('clic.wav',0.625+0.125*j,0.2,60000)    # tipeo en semicorcheas 0,625-3,125
sfx('riser.wav',3.0,1.0)                                       # riser cortado en seco en 3,75
for t in (4.0,8.0): sfx('golpe1-a.mp3',t,0.95); sfx('sub.wav',t,0.9)
sfx('clic.wav',4.0,0.7,40000)                                  # envío
sfx('barrido.wav',7.55,0.6)                                    # la losa cae
sfx('golpe1-b.mp3',10.0,0.7); sfx('golpe1-b.mp3',11.0,0.6)     # el dato y Chile
sfx('riser.wav',11.0,0.7)
duck="if(lt(t,3.75),1,if(lt(t,4.0),0,if(lt(t,7.85),1,if(lt(t,8.0),0.05,if(lt(t,11.75),1,if(lt(t,12.0),0,0.45))))))"
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=longest,volume='{duck}':eval=frame,atrim=0:15,aformat=sample_rates={R}:channel_layouts=stereo[bus]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[bus]','bus.wav'])
run(['ffmpeg','-v','error','-y','-i','bus.wav','-i','efeonce-sting.wav','-filter_complex',f"[1]aresample={R},aformat=channel_layouts=stereo,adelay=11410|11410,volume=1.2[st];[0][st]amix=inputs=2:normalize=0:duration=first[o]",'-map','[o]','mezcla-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-13.6-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.7:level=false",'mezcla-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
