# Banda sonora v4 (12 s, 120 BPM). Música B de ElevenLabs (flow xeeaUimdx9tuMTxmYNHi) editada:
# gancho 0-2 · pregunta 2-3,75 · silencio 3,75-4,0 · drop 4,0 · micro-hueco 5,85-6,0 · drop 6,0 ·
# vuelo de la esfera 8,55-9,0 · la respuesta cae 9,0 · sting con pico en 10,0.
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"aevalsrc='0.32*(t/0.75)^2*sin(2*PI*150*0.75/log(10)*(pow(10,t/0.75)-1))':s={R}:d=0.75",'-af','aformat=channel_layouts=stereo,afade=t=out:st=0.745:d=0.005','riser.wav'])
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"anoisesrc=d=0.42:c=pink:r={R}:a=0.5",'-af',"highpass=f=900,volume='0.05+0.95*(t/0.42)^3':eval=frame,aformat=channel_layouts=stereo,afade=t=out:st=0.40:d=0.02",'barrido.wav'])
ins=[]; fl=[]; labs=[]
def inp(f): ins.extend(['-i',f]); return len(ins)//2-1
mus=[(4.0,6.0,0.0,'afade=t=in:d=0.3'),(6.0,7.75,2.0,'afade=t=out:st=1.745:d=0.005'),
     (8.5,10.5,4.0,'afade=t=out:st=1.97:d=0.03'),(8.5,11.0,6.0,'afade=t=out:st=2.4:d=0.1'),
     (10.5,14.0,9.0,'afade=t=out:st=1.5:d=1.5')]
for i,(a,b,t,f) in enumerate(mus):
  k=inp('musica-b.mp3'); fl.append(f"[{k}]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample={R},{f},adelay={int(t*1000)}|{int(t*1000)}[m{i}]"); labs.append(f"[m{i}]")
def sfx(file,t,vol=1.0,rate=None):
  k=inp(file); p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
sfx('golpe1-b.mp3',0.08,0.6)                                   # el dato entra
sfx('golpe1-b.mp3',2.0,0.45)                                   # entra ChatGPT
for j in range(11): sfx('clic.wav',2.375+0.125*j,0.2,60000)    # tipeo en semicorcheas
sfx('riser.wav',3.0,1.0)                                       # riser cortado en seco en 3,75
for t in (4.0,6.0): sfx('golpe1-a.mp3',t,0.95); sfx('sub.wav',t,0.9)
sfx('clic.wav',4.0,0.7,40000)                                  # envío
sfx('barrido.wav',5.55,0.6)                                    # la tarjeta cae
sfx('barrido.wav',8.55,0.7)                                    # la esfera vuela
sfx('golpe1-b.mp3',9.0,0.85); sfx('sub.wav',9.0,0.6)           # la respuesta cae
duck="if(lt(t,3.75),1,if(lt(t,4.0),0,if(lt(t,5.85),1,if(lt(t,6.0),0.05,if(lt(t,8.5),1,if(lt(t,9.0),0.15,if(lt(t,9.4),0.8,if(lt(t,9.6),0.8-0.7*(t-9.4)/0.2,if(lt(t,9.98),0.1,if(lt(t,10.1),0.1+0.35*(t-9.98)/0.12,0.45))))))))))"
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=longest,volume='{duck}':eval=frame,atrim=0:12,aformat=sample_rates={R}:channel_layouts=stereo[bus]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[bus]','bus.wav'])
run(['ffmpeg','-v','error','-y','-i','bus.wav','-i','efeonce-sting.wav','-filter_complex',f"[1]aresample={R},aformat=channel_layouts=stereo,adelay=9410|9410,volume=1.2[st];[0][st]amix=inputs=2:normalize=0:duration=first[o]",'-map','[o]','mezcla-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-13.6-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.7:level=false",'mezcla-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
