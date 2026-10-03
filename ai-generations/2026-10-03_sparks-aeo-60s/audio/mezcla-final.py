#!/usr/bin/env python3
"""Mezcla final: voz + cama (con ducking por voz) + bus SFX + reveal de marca a 55,4 s.
Master a -16 LUFS / -1 dBTP en dos pasadas de loudnorm. Deja stems en audio/stems/."""
import subprocess, json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = f'{R}/audio'; os.makedirs(f'{A}/stems', exist_ok=True)
inputs = ['-i', f'{A}/vo/vo-pista.wav', '-i', f'{A}/musica/cama-55s.wav', '-i', f'{A}/sfx-bus.wav',
          '-i', f'{R}/kit/efeonce-reveal.wav']
fc = ';'.join([
    '[0:a]volume=7dB,asplit=3[vo][vokey][vokey2]',
    '[1:a]aresample=48000,volume=-5dB,apad=whole_dur=60[mus0]',
    '[mus0][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=350[mus]',
    '[3:a]aresample=48000,volume=-3dB,adelay=55400|55400,apad=whole_dur=60[rev0]',
    '[rev0][vokey2]sidechaincompress=threshold=0.05:ratio=2.5:attack=20:release=300[rev]',
    '[2:a]aresample=48000,volume=-1dB[sfx]',
    '[vo][mus][sfx][rev]amix=inputs=4:normalize=0:duration=longest,atrim=0:59.958[pre]',
])
pre = f'{A}/stems/premaster.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[pre]',
                '-c:a', 'pcm_s24le', pre], check=True)
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', pre, '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json',
                    '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
ln = (f"loudnorm=I=-16:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
      f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pre, '-af', ln + ',aresample=48000', '-c:a', 'pcm_s24le',
                f'{A}/master-60s.wav'], check=True)
for name, src, f in [('vo', 0, 'volume=7dB'), ('musica', 1, 'volume=-5dB'), ('sfx', 2, 'volume=-1dB')]:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', f'[{src}:a]aresample=48000,{f}[o]',
                    '-map', '[o]', '-c:a', 'pcm_s24le', f'{A}/stems/{name}.wav'], check=True)
print('premaster', j['input_i'], j['input_tp'])
