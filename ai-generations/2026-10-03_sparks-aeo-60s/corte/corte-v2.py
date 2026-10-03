#!/usr/bin/env python3
"""Corte v2 (2026-10-03): más ágil (~46,6 s), voz v2 (Efeonce AEO con los Sparks como agentes), cama punk desde la
pieza de energía oficial. Un solo mapa de tiempos re-tima video, voz, efectos y subtítulos.
Salidas en final/v2/. El corte v1 (60 s) queda intacto en final/."""
import json, os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1, OUT = f'{R}/final', f'{R}/final/v2'
os.makedirs(f'{OUT}/seg', exist_ok=True)
ff = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)

# (segmento v1, inicio v1, velocidad, duración que se conserva). S2/S9a se vuelven a dibujar (zoom completo).
SHOTS = [
    ('01', 0.000, 1.25, 3.60), ('02', 5.000, 1.00, 3.00), ('03', 10.000, 1.35, 3.70), ('04', 15.000, 1.00, 5.00),
    ('05', 20.000, 1.40, 5.36), ('06', 27.500, 1.35, 5.56), ('07', 35.000, 1.30, 3.85), ('08', 40.000, 1.50, 3.33),
    ('09a', 45.000, 1.00, 3.60), ('09b', 50.000, 1.25, 1.96), ('10a', 52.458, 0.97, 3.00), ('10b', 55.375, 1.00, 4.583),
]
UI = {'02': 72, '09a': 86}
starts, t = [], 0.0
for s in SHOTS: starts.append(round(t, 3)); t += s[3]
TOTAL = round(t, 3)
REVEAL = starts[-1]

def remap(t_old):
    """Tiempo del corte v1 → v2. None si el instante quedó recortado."""
    for (seg, s1, sp, keep), s2 in zip(SHOTS, starts):
        nxt = SHOTS[SHOTS.index((seg, s1, sp, keep)) + 1][1] if seg != '10b' else 60.0
        if s1 <= t_old < nxt:
            d = (t_old - s1) / sp
            return round(s2 + d, 3) if d < keep else None
    return None

if __name__ == '__main__':
    env = dict(os.environ, UI_OUT=f'{OUT}/seg', UI_FRAMES=json.dumps({f'{k}.mp4': v for k, v in UI.items()}))
    subprocess.run(['node', f'{R}/corte/ui-s2-s9.cjs'], check=True, env=env, stderr=subprocess.DEVNULL)
    for seg, _, sp, keep in SHOTS:
        if seg in UI: continue
        ff('-i', f'{V1}/{seg}.mp4', '-vf', f'setpts=PTS/{sp},fps=24,trim=0:{keep},setpts=PTS-STARTPTS',
           '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
           '-video_track_timescale', '12288', f'{OUT}/seg/{seg}.mp4')
    with open(f'{OUT}/lista.txt', 'w') as f:
        f.writelines(f"file 'seg/{s[0]}.mp4'\n" for s in SHOTS)
    ff('-f', 'concat', '-safe', '0', '-i', f'{OUT}/lista.txt', '-c', 'copy', f'{OUT}/video-mudo.mp4')
    json.dump({'shots': [dict(seg=s[0], start=st, dur=s[3], speed=s[2]) for s, st in zip(SHOTS, starts)],
               'total': TOTAL, 'reveal': REVEAL}, open(f'{OUT}/linea-de-tiempo.json', 'w'), indent=1)
    print('total', TOTAL, 'reveal', REVEAL)
