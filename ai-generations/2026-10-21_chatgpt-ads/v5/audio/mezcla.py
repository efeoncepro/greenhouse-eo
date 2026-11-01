# Banda sonora v5 (12 s, 120 BPM), sólo con el kit oficial de identidad sonora, registro de energía (rock):
#  · pieza larga de energía (sha256 1b23b0a1…): intro de golpes 0-3,36, pausa con conteo, la banda entra en 4,0.
#  · la banda se corta en el 8,0 y entra el cierre de energía (sha256 0a643922…): golpe, Mi·Mi·Mi y el La en 9,0,
#    cuando la esfera aterriza como punto de «Preguntando». El acorde de La sostiene el cierre.
import subprocess, re
R=48000
def run(a): subprocess.run(a,check=True)
A_OFF=0.975                      # el La del cierre en el archivo (medido)
T_A=9.0; ST=T_A-A_OFF            # 8,025
ins=[]; fl=[]; labs=[]
def inp(f): ins.extend(['-i',f]); return len(ins)//2-1
k=inp('pieza-larga-energia.wav'); fl.append(f"[{k}]atrim=0:8.0,asetpts=PTS-STARTPTS,aresample={R},aformat=channel_layouts=stereo,afade=t=out:st=7.975:d=0.025[m0]"); labs.append('[m0]')
k=inp('cierre-energia.wav'); fl.append(f"[{k}]aresample={R},aformat=channel_layouts=stereo,afade=t=out:st={12-ST-0.6:.3f}:d=0.6,adelay={int(ST*1000)}|{int(ST*1000)}[c0]"); labs.append('[c0]')
def sfx(file,t,vol=1.0,rate=None):
  k=inp(file); p=f"[{k}]aresample={R},aformat=channel_layouts=stereo"
  if rate: p+=f",asetrate={rate},aresample={R}"
  n=f"s{len(labs)}"; fl.append(p+f",volume={vol},adelay={int(t*1000)}|{int(t*1000)}[{n}]"); labs.append(f"[{n}]")
for j in range(11): sfx('clic.wav',2.375+0.125*j,0.14,60000)    # tipeo, discreto bajo la guitarra
sfx('sub.wav',6.0,0.5)                                         # peso cuando la tarjeta aterriza
graph=';'.join(fl)+';'+''.join(labs)+f"amix=inputs={len(labs)}:normalize=0:duration=longest,atrim=0:12,aformat=sample_rates={R}:channel_layouts=stereo[o]"
run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',graph,'-map','[o]','mezcla-pre.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-pre.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
G=-14.0-float(re.search(r'"input_i" : "([-\d.]+)"',o).group(1))
run(['ffmpeg','-v','error','-y','-i','mezcla-pre.wav','-af',f"volume={G}dB,alimiter=limit=0.82:level=false",'mezcla-master.wav'])
o=subprocess.run(['ffmpeg','-hide_banner','-i','mezcla-master.wav','-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
print('LUFS',re.search(r'"input_i" : "([-\d.]+)"',o).group(1),'TP',re.search(r'"input_tp" : "([-\d.]+)"',o).group(1))
