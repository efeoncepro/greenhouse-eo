from faster_whisper import WhisperModel
from pathlib import Path
import json,sys
D=Path(__file__).resolve().parent
m=WhisperModel('small',device='cpu',compute_type='int8',local_files_only=True,cpu_threads=4)
paths=sys.argv[1:] or [str(D.parent/'v7/sky-v7-seedance-native-qa/audio.wav')]
for path in paths:
 segments,info=m.transcribe(path,language='es',word_timestamps=True,beam_size=5,condition_on_previous_text=False,vad_filter=False)
 data=[{'start':s.start,'end':s.end,'text':s.text,'words':[{'word':w.word,'start':w.start,'end':w.end} for w in s.words]} for s in segments]
 out=D/'qa'/('speech-'+Path(path).stem+'.json');out.write_text(json.dumps(data,indent=2));print(out, data,flush=True)
