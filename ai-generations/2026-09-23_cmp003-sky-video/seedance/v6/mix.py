"""Mix only silent Seedance video + new instrumental/SFX; times follow visual review."""
from pathlib import Path
import argparse,json,subprocess,re
v=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--video',default=str(v/'sky-v6-silent-30s-916.mp4'));p.add_argument('--jet-peak',type=float,default=12.3);p.add_argument('--flash',type=float,default=9.3);p.add_argument('--ui',type=float,default=.5);args=p.parse_args()
audio=v/'audio';video=Path(args.video)
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(video)]))
if any(x['codec_type']=='audio' for x in meta['streams']):raise SystemExit('Reject: visual source must contain zero audio streams')
jet_start=max(0,args.jet_peak-3);spark_start=max(0,args.flash-2)
inputs=[]
for name in ['music','jet','ui','spark']:inputs+=['-i',str(audio/(name+'.mp3'))]
# Music bed -4 dB; jet -11 dB; UI +1 dB; flash -10 dB before master normalization.
# Additional music dip around closest pass gives the aircraft acoustic space.
filters=f"[0:a]atrim=0:30,asetpts=PTS-STARTPTS,volume=-4dB,volume='if(between(t,{args.jet_peak-.8},{args.jet_peak+.8}),0.65,1)':eval=frame,afade=t=in:d=0.15,afade=t=out:st=29:d=1[m];[1:a]volume=-11dB,adelay={int(jet_start*1000)}:all=1[j];[2:a]volume=1dB,adelay={int(args.ui*1000)}:all=1[u];[3:a]volume=-10dB,adelay={int(spark_start*1000)}:all=1[s];[m][j][u][s]amix=inputs=4:duration=longest:normalize=0,atrim=0:30[mix]"
premix=audio/'premix.wav'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*inputs,'-filter_complex',filters,'-map','[mix]','-ar','48000','-c:a','pcm_s24le',str(premix)],check=True)
scan=subprocess.run(['ffmpeg','-hide_banner','-i',str(premix),'-af','loudnorm=I=-16:TP=-1.2:LRA=10:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
d=json.loads(re.search(r'\{\s*"input_i".*?\}',scan.stderr,re.S).group())
norm=f"loudnorm=I=-16:TP=-1.2:LRA=10:measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true:print_format=json"
mix=audio/'sky-v6-instrumental-sfx.mp3'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(premix),'-af',norm,'-ar','48000','-c:a','libmp3lame','-b:a','320k',str(mix)],check=True)
out=v/'sky-v6-30s-musica-sfx-sin-voz.mp4'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(video),'-i',str(mix),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-t','30','-movflags','+faststart',str(out)],check=True)
report={'source_video':str(video),'zero_source_audio_streams':True,'timing':vars(args),'premix_measurement':d,'output':str(out)}
(audio/'mix-report.json').write_text(json.dumps(report,indent=2))
print(out)
