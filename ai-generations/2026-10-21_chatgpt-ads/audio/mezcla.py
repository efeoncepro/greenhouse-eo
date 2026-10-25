# Banda sonora «Del prompt al pipeline» sobre la grilla de 120 BPM (ver ../audio-cues.json).
# Música B (ElevenLabs, flow xeeaUimdx9tuMTxmYNHi) editada para que el drop caiga en 3,0, 5,0 y 8,5.
import subprocess, json, re
R=48000
def run(a): subprocess.run(a,check=True)
# riser sintetizado (2,0-2,75) y barrido del zoom (4,2-4,95)
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"aevalsrc='0.32*(t/0.75)^2*sin(2*PI*150*0.75/log(10)*(pow(10,t/0.75)-1))':s={R}:d=0.75",'-af','aformat=channel_layouts=stereo,afade=t=out:st=0.745:d=0.005','riser.wav'])
run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f"anoisesrc=d=0.75:c=pink:r={R}:a=0.5",'-af',"highpass=f=900,volume='0.05+0.95*(t/0.75)^3':eval=frame,aformat=channel_layouts=stereo,afade=t=out:st=0.73:d=0.02",'barrido.wav'])
ins=[]; fl=[]; labs=[]
def inp(f): ins.extend(['-i',f]); return len(ins)//2-1
mus=[(5.25,8.0,0.0,'afade=t=in:d=0.25,afade=t=out:st=2.74:d=0.01'),(8.5,10.5,3.0,'afade=t=out:st=1.98:d=0.02'),(8.5,10.5,5.0,'afade=t=out:st=1.98:d=0.02'),(9.0,10.32,7.0,'afade=t=out:st=1.3:d=0.02'),(8.5,13.5,8.5,'afade=t=out:st=3.0:d=2.0')]
for i,(a,b,t,f) in enumerate(mus):
  k=inp('musica-b.mp3'); fl.append(f"[{k}]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample={R},{f},adelay={int(t*1000)}|{int(t*1000)}[m{i}]"); labs.append(f"[m{i}]")
def sfx(file,t,vol=1.0,rate=None,name=None):
  k=inp(file); p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=name or f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
# teclas en semicorcheas 0,375-1,625 (tipeo del prompt)
for j in range(11): sfx('clic.wav',0.375+0.125*j,0.22,60000)
sfx('clic.wav',1.65,0.6,40000)                       # enviar
sfx('riser.wav',2.0,1.0)                             # riser cortado en seco a 2,75
for t in (3.0,5.0,8.5):                              # golpes
  sfx('golpe1-a.mp3',t,0.9); sfx('sub.wav',t,0.85)
sfx('clic.wav',4.0,1.0); sfx('golpe1-b.mp3',4.0,0.8)   # clic en «Ver más», con cuerpo
sfx('barrido.wav',4.2,0.55)                          # zambullida
for t in (5.5,6.0): sfx('clic.wav',t,0.8,33600)      # la tarjeta cambia de etapa
sfx('golpe2-a.mp3',6.5,0.55)                         # «Ganado»
for j in range(5): sfx('golpe1-b.mp3',7.0+0.25*j,0.35+0.05*j)   # un golpe por canal
sfx('riser.wav',7.55,0.6)
duck="if(lt(t,2.75),1,if(lt(t,3.0),0,if(lt(t,3.86),1,if(lt(t,4.0),0.06,if(lt(t,8.27),1,if(lt(t,8.5),0,if(lt(t,9.2),1,if(lt(t,9.45),1-0.9*(t-9.2)/0.25,if(lt(t,9.98),0.1,if(lt(t,10.1),0.1+0.35*(t-9.98)/0.12,0.45))))))))))"
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=longest,volume='{duck}':eval=frame,atrim=0:12,aformat=sample_rates={R}:channel_layouts=stereo[bus]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[bus]','bus.wav'])
# sting con pico en 10,0 (el archivo pica a 0,59 s)
run(['ffmpeg','-v','error','-y','-i','bus.wav','-i','efeonce-sting.wav','-filter_complex',f"[1]aresample={R},aformat=channel_layouts=stereo,adelay=9410|9410,volume=1.25[st];[0][st]amix=inputs=2:normalize=0:duration=first[o]",'-map','[o]','mezcla-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
L=float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1)); G=-13.6-L
run(['ffmpeg','-v','error','-y','-i','mezcla-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.7:level=false",'mezcla-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
