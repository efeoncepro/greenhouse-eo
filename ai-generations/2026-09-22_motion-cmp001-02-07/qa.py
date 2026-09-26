#!/usr/bin/env python3
"""QA medido de una toma (cruda o final). No juzga el concepto: eso lo mira una persona en la tira.

  python3 qa.py out/CMP001-04-9x16.mp4          -> qa/<nombre>/ tira + reporte.json
  python3 qa.py finales/CMP001-04-9x16-final.mp4

Mide lo que el piloto 01 enseñó a medir:
  - loop: diferencia entre el PRIMER y el ÚLTIMO cuadro reales (lección 15), meta ≤ 1,5 /255.
  - sostén: movimiento del cuadro entre 7,5 y 13,0 s (debe ser casi nulo en la capa gráfica).
  - audio: pico en la ventana del sostén (sólo room tone) y silencio digital (≤ -120 dB = cortado).
  - 3:4 -> 4:5: luminancia máxima de las franjas de 45 px que el recorte sacrifica (todas las muestras).
  - ratio y duración reales contra lo pedido.
"""
import json, subprocess, sys, pathlib, re

src = pathlib.Path(sys.argv[1])
name = src.stem
qdir = pathlib.Path(__file__).parent / 'qa' / name
qdir.mkdir(parents=True, exist_ok=True)


def run(args):
    return subprocess.run(args, capture_output=True, check=True)


def probe():
    out = run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration',
               '-of', 'json', str(src)]).stdout
    j = json.loads(out)
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    return v['width'], v['height'], float(j['format']['duration']), any(s['codec_type'] == 'audio' for s in j['streams'])


def seek(t):
    """t < 0 = desde el final (el contenedor puede durar más que el video: -ss cerca del fin no da cuadro)."""
    return ['-sseof', f'{t}'] if t < 0 else ['-ss', f'{t}']


def gray(t, w=120):
    """Cuadro en gris reducido a w px de ancho, como bytes crudos."""
    raw = run(['ffmpeg', '-v', 'error', *seek(t), '-i', str(src), '-frames:v', '1',
               '-vf', f'scale={w}:-2,format=gray', '-f', 'rawvideo', '-']).stdout
    return raw


def mad(a, b):
    n = min(len(a), len(b))
    return sum(abs(a[i] - b[i]) for i in range(n)) / n


W, H, dur, has_audio = probe()
rep = {'archivo': str(src), 'medidas': f'{W}x{H}', 'duracion_s': round(dur, 3)}

# Tira de revisión: 8 momentos del guion.
marks = [0.0, 1.5, 3.0, 5.0, 7.5, 10.0, 13.0, -0.25]
for m in marks:
    run(['ffmpeg', '-v', 'error', '-y', *seek(m), '-i', str(src), '-frames:v', '1', '-update', '1',
         '-vf', 'scale=360:-2', str(qdir / f't{m:05.2f}.png')])
inputs = sum([['-i', str(qdir / f't{m:05.2f}.png')] for m in marks], [])
run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', f'hstack=inputs={len(marks)}', str(qdir / 'tira.png')])

# Loop: primer contra último cuadro real.
first, last = gray(0), gray(-0.1)
rep['loop_dif_primero_ultimo'] = round(mad(first, last), 2)
rep['loop_ok'] = rep['loop_dif_primero_ultimo'] <= 1.5

# Sostén: movimiento entre muestras de 7,5 a 13,0 s.
hold = [gray(t) for t in (7.5, 9.0, 10.5, 12.0, 13.0)]
rep['sosten_movimiento_max'] = round(max(mad(hold[i], hold[i + 1]) for i in range(len(hold) - 1)), 2)

# Audio.
if has_audio:
    def vol(ss=None, to=None):
        a = ['ffmpeg', '-v', 'info']
        if ss is not None:
            a += ['-ss', str(ss), '-to', str(to)]
        a += ['-i', str(src), '-vn', '-af', 'volumedetect', '-f', 'null', '-']
        err = subprocess.run(a, capture_output=True, text=True).stderr
        mx = re.search(r'max_volume: (-?[\d.]+|-inf) dB', err)
        mean = re.search(r'mean_volume: (-?[\d.]+|-inf) dB', err)
        return (float(mx.group(1)) if mx and mx.group(1) != '-inf' else -999.0,
                float(mean.group(1)) if mean and mean.group(1) != '-inf' else -999.0)
    rep['audio_pico_total_db'], rep['audio_media_total_db'] = vol()
    rep['audio_pico_sosten_db'], rep['audio_media_sosten_db'] = vol(7.6, 12.9)
    rep['audio_silencio_digital'] = rep['audio_media_sosten_db'] <= -120
    rep['nota_audio'] = 'El RMS no distingue voz de foley: la ausencia de habla la juzga un oído (lección 16).'
else:
    rep['audio'] = 'SIN PISTA DE AUDIO'

# 3:4 -> 4:5: ¿las franjas que se recortan están vacías en TODO el clip?
if abs(W / H - 0.75) < 0.01:
    band = round(45 * H / 1440)
    peaks = []
    for t in [x * 0.5 for x in range(int(dur * 2) - 1)] + [-0.1]:
        raw = run(['ffmpeg', '-v', 'error', *seek(t), '-i', str(src), '-frames:v', '1', '-vf', 'format=gray',
                   '-f', 'rawvideo', '-']).stdout
        top, bot = raw[:band * W], raw[(H - band) * W:]
        peaks.append((sum(top) / len(top), sum(bot) / len(bot)))
    rep['recorte_franja_sup_lum_max'] = round(max(p[0] for p in peaks), 1)
    rep['recorte_franja_inf_lum_max'] = round(max(p[1] for p in peaks), 1)
    rep['recorte_nota'] = ('Luminancia media 0–255 de la franja a sacrificar, peor muestra. Mirar además la tira: '
                           'media baja no garantiza que no haya texto o sujeto cortado.')

# Zona de la firma en la toma CRUDA: debe estar vacía (el logo se compone en post.sh).
# Caso fuente: el crudo del piloto 01 traía un logotipo DIBUJADO por el modelo, con la órbita deformada.
if 'finales' not in src.parts:
    zone = []
    for t in (1.0, 7.5, 10.0, 13.0):
        g = gray(t, 240); w = 240; h = len(g) // w
        y0, y1, x0, x1 = int(h * 0.78), int(h * 0.98), int(w * 0.33), int(w * 0.67)
        zone.append(max(g[y * w + x] for y in range(y0, y1) for x in range(x0, x1)))
    rep['firma_zona_lum_pico'] = max(zone)
    rep['firma_zona_nota'] = ('Pico 0–255 en la zona central inferior. Alto (>160) = revisar en la tira si el modelo '
                              'dibujó un logotipo o letras; puede ser también un reflejo legítimo del set.')

(qdir / 'reporte.json').write_text(json.dumps(rep, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(rep, ensure_ascii=False, indent=2))
print(f'tira: {qdir / "tira.png"}')
