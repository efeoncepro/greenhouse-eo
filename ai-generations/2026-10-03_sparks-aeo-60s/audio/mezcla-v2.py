#!/usr/bin/env python3
"""Audio del corte v2: voz v2 (Andre, eleven_v4, +7 %), efectos re-mapeados al nuevo tiempo, cama punk (Stable Audio
desde la pieza de energía oficial, ecualizada) con ducking fuerte por la voz, reveal oficial al final.
Master -16 LUFS / -1 dBTP. Escribe también los cues de subtítulos (final/v2/cues.json)."""
import json, os, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, f'{R}/corte'); import importlib.util
spec = importlib.util.spec_from_file_location('cv2', f'{R}/corte/corte-v2.py'); cv2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(cv2)
A, OUT = f'{R}/audio', f'{R}/final/v2'
dur = lambda f: float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
# Inicios REALES (cada segmento redondea a cuadros enteros).
real, t = {}, 0.0
for s in cv2.SHOTS: real[s[0]] = round(t, 3); t += dur(f'{OUT}/seg/{s[0]}.mp4')
TOTAL, REVEAL = round(t, 3), real['10b']
cv2.starts = [real[s[0]] for s in cv2.SHOTS]
ff = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
TEMPO = 1.07
# (toma, recorte en la toma, plano, desfase dentro del plano, líneas de subtítulo con su corte en segundos de la toma)
VO = [
    ('S1-t1', 0.00, 3.32, '01', 0.25, [(0.00, ['Tus clientes ya no solo buscan:', 'le preguntan a la IA.'])]),
    ('S3-t1', 0.00, 2.91, '03', 0.30, [(0.00, ['Y si la IA no te conoce,', 'no te nombra.'])]),
    ('S4-t1', 0.00, 5.74, '04', 0.15, [(0.00, ['Con Efeonce AEO, nuestro equipo y los Sparks,', 'nuestros agentes, se ponen a trabajar contigo.'])]),
    ('S5-t1', 0.00, 5.31, '05', 0.60, [(0.00, ['Primero, medimos cómo', 'te describen las IA:']), (2.74, ['qué fuentes leen y quién', 'aparece en tu lugar.'])]),
    ('S6-t1', 0.00, 5.64, '06', 0.45, [(0.00, ['Después, ordenamos lo que falta:']), (1.80, ['contenido claro, una marca bien definida', 'y fuentes que te respalden.'])]),
    ('S7-t1', 0.00, 3.18, '07', 0.35, [(0.00, ['Lo ves todo en un reporte,', 'y tú decides cada paso.'])]),
    ('S9-t1', 0.00, 3.84, '09a', 0.20, [(0.00, ['Ahora, cuando la IA responde,', 'tiene con qué nombrarte.'])]),
    # Cierre completo sobre la placa animada; el reveal del logo queda sin voz.
    ('S10-t1', 0.00, 1.78, 'p10a', 0.15, [(0.00, ['Efeonce AEO.'])]),
    ('S10-t1', 2.10, 6.96, 'p10a', 1.96, [(0.00, ['Mide tu visibilidad en los', 'motores de respuesta de IA']), (2.75, ['con nuestro AI Visibility Report.'])]),
]
inp, ch, cues = [], [], []
for i, (tk, a, b, seg, off, subs) in enumerate(VO):
    pos = real[seg] + off; ln = (b - a) / TEMPO
    inp += ['-i', f'{A}/vo2/tomas/{tk}.mp3']
    ch.append(f'[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono,atempo={TEMPO},'
              f'afade=t=in:d=0.01,afade=t=out:st={ln - 0.04:.3f}:d=0.04,adelay={int(pos * 1000)}[s{i}]')
    for k, (cut, lines) in enumerate(subs):
        c0 = pos + cut / TEMPO; c1 = pos + (subs[k + 1][0] / TEMPO if k + 1 < len(subs) else ln) + 0.15
        cues.append({'a': round(c0, 2), 'b': round(c1, 2), 'lines': lines})
ch.append(''.join(f'[s{i}]' for i in range(len(VO))) + f'amix=inputs={len(VO)}:normalize=0,apad=whole_dur={TOTAL},atrim=0:{TOTAL},'
          'highpass=f=80,acompressor=threshold=-24dB:ratio=3:attack=5:release=120:makeup=2,equalizer=f=3500:t=q:w=1.2:g=2,aformat=channel_layouts=stereo[vo]')
ff(*inp, '-filter_complex', ';'.join(ch), '-map', '[vo]', '-c:a', 'pcm_s24le', f'{A}/vo2/vo-pista.wav')
# Efectos: mismos eventos del bus v1, re-mapeados (los recortados se descartan).
src = open(f'{A}/bus-sfx.py').read(); g = {}; exec(src.split('cmd =')[0], g)
# El logo sonoro intermedio (v1: 46 s) choca con la voz de S9 y el reveal ya lo trae: fuera. Gorjeos de S9, más bajos.
ev = [(f, cv2.remap(t), gn * (0.5 if t >= 45 else 1)) for f, t, gn in g['ev'] if cv2.remap(t) is not None and 'logo-sonoro' not in f]
cmd = []; parts = []
for i, (f, t, gn) in enumerate(ev):
    cmd += ['-i', f'{A}/{f}']; ms = int(t * 1000)
    parts.append(f'[{i}]aresample=48000,aformat=channel_layouts=stereo,volume={gn},adelay={ms}|{ms}[e{i}]')
parts.append(''.join(f'[e{i}]' for i in range(len(ev))) + f'amix=inputs={len(ev)}:normalize=0,apad=whole_dur={TOTAL},atrim=0:{TOTAL}[a]')
ff(*cmd, '-filter_complex', ';'.join(parts), '-map', '[a]', '-ar', '48000', f'{A}/vo2/sfx-bus.wav')
# Mezcla.
fc = ';'.join([
    '[0:a]volume=7dB,asplit=3[vo][k1][k2]',
    f'[1:a]aresample=48000,asplit=3[c1][c2][c3];[c1]atrim=0:39,asetpts=PTS-STARTPTS[x1];[c2]atrim=33:36,asetpts=PTS-STARTPTS[x2];'
    f'[c3]atrim=39:42,asetpts=PTS-STARTPTS[x3];[x1][x2][x3]concat=n=3:v=0:a=1,equalizer=f=180:t=h:w=200:g=-4,equalizer=f=2500:t=q:w=1:g=2,volume=-6dB,atrim=0:{REVEAL},'
    f'afade=t=out:st={REVEAL - 0.12:.3f}:d=0.12,apad=whole_dur={TOTAL}[m0]',
    '[m0][k1]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=300[mus]',
    f'[3:a]aresample=48000,volume=-2dB,adelay={int(REVEAL * 1000)}|{int(REVEAL * 1000)},apad=whole_dur={TOTAL}[r0]',
    '[r0][k2]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=300[rev]',
    '[2:a]aresample=48000,volume=-1dB[sfx]',
    f'[vo][mus][sfx][rev]amix=inputs=4:normalize=0:duration=longest,atrim=0:{TOTAL}[pre]'])
pre = f'{A}/vo2/premaster.wav'
ff('-i', f'{A}/vo2/vo-pista.wav', '-i', f'{A}/musica/cama-punk-sa80.wav', '-i', f'{A}/vo2/sfx-bus.wav', '-i', f'{R}/kit/efeonce-reveal.wav',
   '-filter_complex', fc, '-map', '[pre]', '-c:a', 'pcm_s24le', pre)
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', pre, '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
ff('-i', pre, '-af', f"loudnorm=I=-16:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
   f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000", '-c:a', 'pcm_s24le', f'{A}/master-v2.wav')
for k in range(len(cues) - 1): cues[k]['b'] = min(cues[k]['b'], round(cues[k + 1]['a'] - 0.05, 2))
cues[-1]['b'] = min(cues[-1]['b'], round(REVEAL - 0.04, 2)) if cues[-1]['a'] < REVEAL else cues[-1]['b']
ui = [(real['02'], real['03']), (real['09a'], real['09b'])]
json.dump({'cues': cues, 'ui': ui, 'total': TOTAL, 'reveal': REVEAL, 'sonido': [
    [real['02'] + 0.1, real['02'] + 1.6, ['[envío y respuesta]']], [real['03'] + 1.7, real['03'] + 2.8, ['[gorjeo del Spark]']],
    [real['08'] + 0.3, real['08'] + 2.6, ['[tecleo y envío]']], [real['09a'] + 1.0, real['09a'] + 1.8, ['[logo sonoro de Efeonce]']],
    [REVEAL + 1.6, REVEAL + 2.6, ['[logo sonoro de Efeonce]']]]}, open(f'{OUT}/cues-fuente.json', 'w'), indent=1, ensure_ascii=False)
print('total', TOTAL, 'reveal', REVEAL, 'eventos', len(ev), 'premaster', j['input_i'])
