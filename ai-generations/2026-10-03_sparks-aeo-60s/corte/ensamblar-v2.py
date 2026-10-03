#!/usr/bin/env python3
"""Ensamble del corte v2: video mudo + subtítulos quemados (final/v2/subs) + master v2. Versión con y sin subtítulos."""
import json, os, subprocess
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'final', 'v2'); os.chdir(D)
c = json.load(open('subs/cues.json')); T = json.load(open('cues-fuente.json'))['total']
inp = ['-i', 'video-mudo.mp4', '-i', '../../audio/master-v2.wav']
for x in c: inp += ['-loop', '1', '-t', str(T + 1), '-i', x['f']]
prev, parts = '0:v', []
for i, x in enumerate(c):
    parts.append(f"[{prev}][{i + 2}:v]overlay=0:0:shortest=1:enable='between(t,{x['a']},{x['b']})'[v{i}]"); prev = f'v{i}'
enc = ['-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', str(T), '-movflags', '+faststart']
run = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
run(*inp, '-filter_complex', ';'.join(parts), '-map', f'[{prev}]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow',
    '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '24', *enc, 'sparks-aeo-v2-1080-es.mp4')
run('-i', 'video-mudo.mp4', '-i', '../../audio/master-v2.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', *enc,
    'sparks-aeo-v2-1080-es-sin-subtitulos.mp4')
print('ok', T)
