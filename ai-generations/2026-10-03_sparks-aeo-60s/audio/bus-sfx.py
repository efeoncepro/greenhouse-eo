# Pista de SFX con los tiempos de PREPRODUCCION.md §5 (v1, SFX sintéticos locales).
import subprocess
ev = []
ev += [('sfx/clic.wav', 1.5 + i * 0.19, 0.6) for i in range(10)]
ev += [('sfx/pluck.wav', 3.6, 0.8), ('sfx/pop.wav', 5.5, 0.9), ('sfx/portal.wav', 10.0, 0.9),
       ('sfx/gorjeo-hola.wav', 13.0, 0.9),
       ('sfx/gorjeo-b.wav', 15.6, 0.8), ('sfx/gorjeo-c.wav', 16.4, 0.8), ('sfx/gorjeo-hola.wav', 17.2, 0.8), ('sfx/gorjeo-b.wav', 18.0, 0.8),
       ('sfx/whoosh.wav', 19.6, 0.9)]
ev += [('sfx/pluck.wav', t, 0.6) for t in (22.0, 23.0, 24.0, 25.0, 26.0, 28.5, 30.0, 31.5, 33.0)]
ev += [('sfx/riser.wav', 35.0, 0.8), ('sfx/aprobado.wav', 38.5, 0.9), ('sfx/whoosh.wav', 39.6, 0.8)]
ev += [('sfx/clic.wav', 41.0 + i * 0.19, 0.6) for i in range(10)]
ev += [('sfx/pluck.wav', 43.2, 0.8), ('../kit/efeonce-logo-sonoro-engine.wav', 46.0, 0.9),
       ('sfx/gorjeo-hola.wav', 48.0, 0.7), ('sfx/gorjeo-c.wav', 48.4, 0.7), ('sfx/gorjeo-b.wav', 48.8, 0.7)]
cmd = ['ffmpeg', '-v', 'error', '-y']
for f, _, _ in ev: cmd += ['-i', f]
parts = []
for i, (_, t, g) in enumerate(ev):
    ms = int(t * 1000)
    parts.append(f'[{i}]aresample=48000,aformat=channel_layouts=stereo,volume={g},adelay={ms}|{ms}[e{i}]')
parts.append(''.join(f'[e{i}]' for i in range(len(ev))) + f'amix=inputs={len(ev)}:normalize=0,apad=whole_dur=60,atrim=0:60[a]')
cmd += ['-filter_complex', ';'.join(parts), '-map', '[a]', '-ar', '48000', 'sfx-bus.wav']
subprocess.run(cmd, check=True)
print('ok', len(ev), 'eventos')
