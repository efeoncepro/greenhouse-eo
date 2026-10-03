#!/usr/bin/env python3
"""Pista de locución (Andre · ElevenLabs eleven_v4) posicionada sobre los 60 s.
Cada entrada: (toma, recorte_ini, recorte_fin, posición en el video, tempo).
Tiempos de recorte medidos con silencedetect (-42 dB, 0,15 s)."""
import subprocess, os
D = os.path.dirname(os.path.abspath(__file__))
SEG = [
    ('S1-t1', 0.00, 4.30, 0.40, 1.00),
    ('S3-t1', 0.00, 3.93, 10.40, 1.00),
    ('S4-t1', 0.00, 6.03, 15.20, 1.00),
    ('S5-t1', 0.00, 6.13, 21.60, 1.00),
    ('S6-t1', 0.00, 7.10, 28.20, 1.00),
    ('S7-t1', 0.00, 2.09, 36.00, 1.00),
    ('S9-t1', 0.00, 3.81, 46.90, 1.00),
    ('S10-t1', 0.00, 1.88, 52.60, 1.00),   # «Efeonce AEO.»
    ('S10-t1', 2.15, 7.44, 54.55, 1.04),   # llamado a la acción, 4 % más rápido para cerrar antes del fin
]
inp, chains = [], []
for i, (t, a, b, pos, tempo) in enumerate(SEG):
    inp += ['-i', f'{D}/tomas/{t}.mp3']
    tf = f',atempo={tempo}' if tempo != 1 else ''
    chains.append(f'[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono{tf},'
                  f'afade=t=in:d=0.01,afade=t=out:st={(b-a)/tempo-0.04:.3f}:d=0.04,adelay={int(pos*1000)}[s{i}]')
mix = ''.join(f'[s{i}]' for i in range(len(SEG))) + f'amix=inputs={len(SEG)}:normalize=0:duration=longest,apad=whole_dur=60,atrim=0:60,' \
      'highpass=f=80,acompressor=threshold=-24dB:ratio=3:attack=5:release=120:makeup=2,' \
      'equalizer=f=3500:t=q:w=1.2:g=2,aformat=channel_layouts=stereo[vo]'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(chains) + ';' + mix,
                '-map', '[vo]', '-c:a', 'pcm_s24le', f'{D}/vo-pista.wav'], check=True)
print('ok', f'{D}/vo-pista.wav')
