#!/usr/bin/env python3
"""Ensamble final: concatena los segmentos 1080 (final/lista.txt), quema los subtítulos (final/subs) y
une el master de audio. Produce la versión con y sin subtítulos."""
import json, subprocess, os
F = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'final')
os.chdir(F)
run = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
run('-f', 'concat', '-safe', '0', '-i', 'lista.txt', '-c', 'copy', 'video-mudo-1080.mp4')
c = json.load(open('subs/cues.json'))
inp = ['-i', 'video-mudo-1080.mp4', '-i', '../audio/master-60s.wav']
for x in c: inp += ['-loop', '1', '-t', '60', '-i', x['f']]
prev, parts = '0:v', []
for i, x in enumerate(c):
    parts.append(f"[{prev}][{i + 2}:v]overlay=0:0:enable='between(t,{x['a']},{x['b']})'[v{i}]"); prev = f'v{i}'
enc = ['-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', '59.958', '-movflags', '+faststart']
run(*inp, '-filter_complex', ';'.join(parts), '-map', f'[{prev}]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow',
    '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '24', *enc, 'sparks-aeo-60s-1080-es.mp4')
run('-i', 'video-mudo-1080.mp4', '-i', '../audio/master-60s.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', *enc,
    'sparks-aeo-60s-1080-es-sin-subtitulos.mp4')
print('ok')
