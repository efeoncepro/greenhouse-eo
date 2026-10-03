#!/usr/bin/env python3
"""Versiones para redes del corte v2: master a -14 LUFS / -1 dBTP (norma sonora para video en redes; el master v2
quedó a -16). Instagram = intro muda de 3 s (teléfono que gira) + video; LinkedIn = video 16:9 sin intro."""
import json, os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(f'{R}/final')
run = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
pre = f'{R}/audio/vo2/premaster.wav'
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
run('-i', pre, '-af', f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
    f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000", '-c:a', 'pcm_s24le', f'{R}/audio/master-v2-redes.wav')
enc = ['-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart']
# LinkedIn: misma imagen (con subtítulos), audio -14.
run('-i', 'v2/sparks-aeo-v2-1080-es.mp4', '-i', f'{R}/audio/master-v2-redes.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', *enc,
    '-shortest', 'redes/sparks-aeo-linkedin-16x9.mp4')
# Instagram: intro muda + video.
run('-i', 'redes/intro-girar.mp4', '-f', 'lavfi', '-t', '3', '-i', 'anullsrc=r=48000:cl=stereo', '-i', 'v2/sparks-aeo-v2-1080-es.mp4',
    '-i', f'{R}/audio/master-v2-redes.wav', '-filter_complex',
    '[0:v]fps=24,format=yuv420p[i];[2:v]fps=24,format=yuv420p[v];[i][1:a][v][3:a]concat=n=2:v=1:a=1[ov][oa]',
    '-map', '[ov]', '-map', '[oa]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', *enc, 'redes/sparks-aeo-instagram-16x9.mp4')
print('ok')
