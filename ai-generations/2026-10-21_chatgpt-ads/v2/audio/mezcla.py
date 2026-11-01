# Banda sonora v2 «La pregunta» (8 s, 120 BPM). Música B de ElevenLabs (flow xeeaUimdx9tuMTxmYNHi) editada:
# build 0-1,75 · silencio 1,75-2,0 · drop en 2,0 · micro-hueco 3,85-4,0 · drop reiniciado en 4,0 · sting con pico en 5,0.
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"aevalsrc='0.32*(t/0.75)^2*sin(2*PI*150*0.75/log(10)*(pow(10,t/0.75)-1))':s={R}:d=0.75",'-af','aformat=channel_layouts=stereo,afade=t=out:st=0.745:d=0.005','riser.wav'])
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"anoisesrc=d=0.4:c=pink:r={R}:a=0.5",'-af',"highpass=f=900,volume='0.05+0.95*(t/0.4)^3':eval=frame,aformat=channel_layouts=stereo,afade=t=out:st=0.38:d=0.02",'barrido.wav'])
ins=[]; fl=[]; labs=[]
def inp(f): ins.extend(['-i',f]); return len(ins)//2-1
for i,(a,b,t,f) in enumerate([(6.0,7.75,0.0,'afade=t=in:d=0.25,afade=t=out:st=1.745:d=0.005'),(8.5,10.5,2.0,'afade=t=out:st=1.98:d=0.02'),(8.5,13.0,4.0,'afade=t=out:st=2.5:d=2.0')]):
  k=inp('musica-b.mp3'); fl.append(f"[{k}]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample={R},{f},adelay={int(t*1000)}|{int(t*1000)}[m{i}]"); labs.append(f"[m{i}]")
def sfx(file,t,vol=1.0,rate=None):
  k=inp(file); p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
for j in range(10): sfx('clic.wav',0.375+0.125*j,0.22,60000)   # tipeo en semicorcheas
sfx('riser.wav',1.0,1.0)                                       # riser cortado en seco en 1,75
for t in (2.0,4.0): sfx('golpe1-a.mp3',t,0.95); sfx('sub.wav',t,0.9)
sfx('clic.wav',2.0,0.7,40000)                                  # envío
sfx('barrido.wav',3.55,0.6)                                    # la losa cae
duck="if(lt(t,1.75),1,if(lt(t,2.0),0,if(lt(t,3.85),1,if(lt(t,4.0),0.05,if(lt(t,4.3),1,if(lt(t,4.5),1-0.9*(t-4.3)/0.2,if(lt(t,4.98),0.1,if(lt(t,5.05),0.1+0.4*(t-4.98)/0.07,0.5))))))))"
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=longest,volume='{duck}':eval=frame,atrim=0:8,aformat=sample_rates={R}:channel_layouts=stereo[bus]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[bus]','bus.wav'])
run(['ffmpeg','-v','error','-y','-i','bus.wav','-i','efeonce-sting.wav','-filter_complex',f"[1]aresample={R},aformat=channel_layouts=stereo,adelay=4410|4410,volume=1.2[st];[0][st]amix=inputs=2:normalize=0:duration=first[o]",'-map','[o]','mezcla-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-13.6-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.7:level=false",'mezcla-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
