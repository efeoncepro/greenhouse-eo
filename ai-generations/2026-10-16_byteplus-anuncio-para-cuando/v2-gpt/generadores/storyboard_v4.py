"""Storyboard v4 canónico de «¿Para cuándo?» (2026-10-17): cada plano con su ficha de toma para producir con IA.

Fuente de verdad de las tomas: tomas_data.py. Reutiliza el cuadro clave con su componente armado (storyboard.py), los
tiempos del animatic (animatic.py) y el CSS de la lámina de componentes (components.py).
"""
import html
import os
import re

import animatic as A
import components as C
import storyboard as S
from tomas_data import DECISIONES, TOMAS

PROJ = C.PROJ
W = 381
SC = W / 1080
INICIO = {'09-inicio': 'bab3ca8955c773f99f2cfc9bc5d3a863', '10-inicio': '5e40341d9d5874e1721a2ba43b311f92',
          '11b-inicio': '754a71fe4efa1438cfc286fa0f96866e', '12-inicio': '39b0f9785e0b9d0f45832a58e3abdbf3'}
RUTA = {'REF': ('Seedance 2.5 · referencias', '#36C8BF', '#001A33'), 'FF': ('Seedance 2.5 · primer cuadro', '#6FA8FF', '#001A33'),
        'POST': ('Composición en post', '#3A3F48', '#ECEEF2'), 'POST + OMNI': ('Post + Omni por recuadro', '#E8B04B', '#001A33')}
ESTADO_COLOR = [('Bloqueada', '#E5675F', '#fff'), ('Por decidir', '#E8B04B', '#001A33'), ('Lista', '#4CC38A', '#001A33')]
e = html.escape


def chip(text, bg, fg):
    return (f'<span style="display:inline-flex;align-items:center;font-size:12px;font-weight:600;color:{fg};background:{bg};'
            f'border-radius:999px;padding:4px 10px;white-space:nowrap">{e(text)}</span>')


def estado_chip(s):
    for k, bg, fg in ESTADO_COLOR:
        if s.startswith(k):
            return chip(s, bg, fg)
    return chip(s, '#2A2F38', '#C9CED6')


def row(label, value):
    return (f'<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6F7682;padding-top:2px">{label}</div>'
            f'<div style="font-size:14px;line-height:1.5;color:#ECEEF2">{value}</div>')


def ul(items):
    return '<br>'.join(e(i) for i in items)


def money(v):
    return f'US$ {v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def build():
    starts, t = {}, 0.0
    for sid, dur, _, _ in A.SCENES:
        starts[sid] = (t, t + dur)
        t += dur
    total = t
    by_id = {x['id']: x for x in TOMAS}
    gen = [x for x in TOMAS if x['costo'][1] > 0]
    draft = sum(x['costo'][0] for x in gen)
    final = sum(x['costo'][1] for x in gen)
    bloq = [x['id'] for x in TOMAS if x['estado'].startswith('Bloqueada')]
    listas = [x['id'] for x in TOMAS if x['estado'].startswith('Lista')]

    acts = []
    for name, ids, mood in S.ACTS:
        a, b = starts[ids[0]][0], starts[ids[-1]][1]
        rows = []
        for sid in ids:
            title, voice, note, comp, ov, trans = S.CARDS[sid]
            tm = by_id[sid]
            s, en = starts[sid]
            plate = f'<img class="k-pl" src="/_blob/{A.BLOB[sid]}" alt="Plano {sid}">' if sid in A.BLOB else ''
            inner = ov(False) if ov else ''
            key = (f'<div class="k-view" style="width:{W}px;height:{round(1350 * SC)}px"><div class="k-stg f45" style="height:1350px;transform:scale({SC:.5f})">'
                   f'{plate}{inner}</div></div>')
            lab = lambda txt: f'<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6F7682">{txt}</div>'
            frames = f'{lab("Cuadro clave (con componente)")}{key}'
            if tm['inicio']:
                frames = (f'{lab("Cuadro inicial")}<img src="/_blob/{INICIO[tm["inicio"]]}" alt="Cuadro inicial {sid}" '
                          f'style="width:190px;height:238px;object-fit:cover;border-radius:10px;display:block">' + frames)
            ruta = RUTA[tm['ruta']]
            costo = (f'Borrador {money(tm["costo"][0])} · final {money(tm["costo"][1])}' if tm['costo'][1] else 'Sin generación')
            gen_txt = (f'{tm["gen"]} s generados · se usa {tm["uso"]}' if tm['gen'] else f'Se usa {tm["uso"]}')
            ficha = ''.join([
                row('Motor', f'{chip(ruta[0], ruta[1], ruta[2])}&nbsp; {e(gen_txt)}'),
                row('Cámara', f'{e(tm["eje"])} · {e(tm["cam"])}<br><span style="color:#C9CED6">Movimiento: {e(tm["mov"])}</span>'),
                row('Acción', ul(tm['accion'])),
                row('Referencias', ul(tm['refs'])),
                row('Sonido', e(tm['sonido'])),
                row('Continuidad', e(tm['cont'])),
                row('Intocable', ul(tm['intoc'])),
                row('Plan B', e(tm['planb'])),
                row('Dificultad', e(tm['dif']) + '<span style="color:#6F7682"> (C cámara · F física · I identidad, de 1 a 5)</span>'),
                row('Costo estimado', e(costo)),
            ])
            comp_chip = chip(comp, '#36C8BF', '#001A33') if comp else chip('Sin texto', '#2A2F38', '#8A919C')
            rows.append(
                f'<article style="display:flex;gap:36px;padding:28px 0;border-top:1px solid #1C2027">'
                f'<div style="display:flex;flex-direction:column;gap:8px;width:{W}px;flex:none">{frames}</div>'
                f'<div style="flex:1;display:flex;flex-direction:column;gap:14px;min-width:0">'
                f'<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
                f'<span style="font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;font-size:30px;color:#fff">{sid}</span>'
                f'<span style="font-size:14px;color:#8A919C">{S.tc(s)}–{S.tc(en)}</span>{estado_chip(tm["estado"])}{comp_chip}</div>'
                f'<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-weight:700;font-size:22px;color:#fff;line-height:1.2">{e(title)}</div>'
                f'<div style="font-size:15px;color:#C9CED6">{e(voice)}{(" · → " + e(trans)) if trans else ""}</div>'
                f'<div style="display:grid;grid-template-columns:150px 1fr;column-gap:22px;row-gap:10px">{ficha}</div></div></article>')
        acts.append(f'<section style="display:flex;flex-direction:column;padding-top:24px">'
                    f'<div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;padding-bottom:8px">'
                    f'<h2 style="margin:0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-.035em;font-size:34px">{name}</h2>'
                    f'<span style="font-size:15px;color:#C9CED6">{S.tc(a)}–{S.tc(b)}</span><span style="font-size:15px;color:#8A919C">{mood}</span></div>'
                    f'{"".join(rows)}</section>')

    box = 'background:#151920;border:1px solid #22262E;border-radius:16px;padding:24px 26px;display:flex;flex-direction:column;gap:12px'
    h3 = lambda txt: f'<h3 style="margin:0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;font-size:24px;color:#fff">{txt}</h3>'
    p = lambda txt, c='#C9CED6': f'<div style="font-size:14px;line-height:1.6;color:{c}">{txt}</div>'

    decis = ''.join(f'<div style="display:grid;grid-template-columns:52px 1fr;gap:14px;border-top:1px solid #22262E;padding-top:12px">'
                    f'<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;font-size:22px;color:#E8B04B">{d}</div>'
                    f'<div style="display:flex;flex-direction:column;gap:4px"><div style="font-weight:600;color:#fff;font-size:15px">{e(n)}</div>'
                    f'{p(e(why))}{p("Recomendación: " + e(rec), "#ECEEF2")}</div></div>' for d, n, why, rec in DECISIONES)
    rutas = ''.join(f'<div style="display:flex;gap:10px;align-items:baseline">{chip(v[0], v[1], v[2])}'
                    f'{p(dict(REF="Personajes como asset:// de la biblioteca de BytePlus + prompt; la escena va descrita o como plano sin rostros. Obligatoria cuando hay una cara visible: Seedance rechaza rostros de imágenes externas.", FF="El plano aprobado es el primer cuadro. Sólo sin rostros visibles.", POST="Se arma en edición, sin generar.", **{"POST + OMNI": "Recuadros compuestos; Gemini Omni sólo si hace falta habla real (sin verificar con personas)."})[k])}</div>'
                    for k, v in RUTA.items())
    resumen = (f'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">'
               + ''.join(f'<div style="{box}"><div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6F7682">{k}</div>'
                         f'<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;font-size:36px;color:#fff">{v}</div>{p(n)}</div>'
                         for k, v, n in [('Tomas', len(TOMAS), f'{len(gen)} con generación · {len(TOMAS) - len(gen)} en post'),
                                         ('Bloqueadas', len(bloq), 'por D1 o D2: ' + ', '.join(bloq)),
                                         ('Listas para borrador', len(listas), ', '.join(listas)),
                                         ('Presupuesto de video', money(draft + final), f'Borradores {money(draft)} + finales {money(final)}; con 50 % de repeticiones ≈ {money((draft + final) * 1.5)}')])
               + '</div>')
    entrega = (f'<div style="{box}">{h3("Entrega y formatos (recomendación D4)")}'
               + p('<b style="color:#fff">Generar en 9:16 y recortar el 4:5.</b> Una sola generación sirve para Reels, Stories y TikTok (9:16) y para el feed (4:5, recorte '
                   'central de 1080×1350 dentro de 1080×1920). Los textos y componentes viven en la zona común a los dos formatos. Las tomas con primer cuadro (13–15) se amplían a 9:16 '
                   'antes de generar (pnpm ai:inpaint expand). El 16:9 sólo si hay pauta en YouTube o TV, como generación aparte con su propio encuadre.')
               + p('Duraciones: Seedance genera desde 4 s; cada ficha dice qué tramo se usa. Resolución: borrador 480p para aprobar movimiento y física; final 1080p desde el mismo '
                   'borrador (misma toma, cuadro a cuadro). Sonido: voces ElevenLabs v4 grabadas antes; sincronía de labios por referencia de audio (a probar) o audio nativo y doblaje.')
               + '</div>')
    flujo = (f'<div style="{box}">{h3("Cómo se produce cada toma")}'
             + p('1. Cerrar las decisiones D1–D4. 2. Grabar voces y música temporal; montar el animatic con sonido. 3. Borrador 480p de cada toma lista, en orden de dificultad '
                 '(10, 11a y 11b primero). 4. Revisar el borrador contra su ficha: acción, cámara, continuidad e intocables. 5. Final 1080p desde el borrador aprobado. '
                 '6. Composición: componentes, textos, pantallas, cara de Paula si derivó. 7. Mezcla y entrega según el método madre.')
             + '</div>')
    esfH = '<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:#36C8BF;margin-left:0.035em"></span>'
    header = ('<header style="display:flex;flex-direction:column;gap:14px">'
              '<div style="font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#36C8BF;font-weight:600">Efeonce × BytePlus · Storyboard v4 · canónico</div>'
              f'<h1 style="margin:0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-.035em;font-size:64px;line-height:1">¿Para cuándo?{esfH}</h1>'
              f'<div style="font-size:16px;color:#C9CED6;max-width:1300px;line-height:1.6">La hoja de producción de cada toma para generar el video con IA: {S.tc(total)} a 120 BPM, '
              'línea Growth, bebida BREAKR. Cada plano trae su cuadro clave con el componente armado, el cuadro inicial cuando el clave es el clímax, y la ficha: motor, cámara, acción '
              'tiempo a tiempo, referencias, sonido, continuidad, intocables, plan B, dificultad y costo. La geografía y la física vienen de la biblia de continuidad '
              '(CONTINUIDAD.md); los datos, de un único archivo de tomas.</div></header>')
    v2 = open(os.path.join(PROJ, 'project', 'V2.dc.html')).read()
    cast = re.search(r'<section[^>]*>\s*<h2[^>]*>Elenco, set y producto</h2>.*?</section>', v2, re.S).group(0)
    cast = (cast.replace('/_blob/4743880fba6ab5a290f24ba00cbef806', '/_blob/f655bac4c6d60dcd1e9698182d5e4295')
            .replace('Lata de la bebida ficticia', 'Lata BREAKR Orange Break')
            .replace('Bebida ficticia, sin nombre ni marca. La misma lata en todos los planos.', 'BREAKR, marca ficticia: «Break the wait.». La misma lata en todos los planos.')
            .replace('La clienta. Retrato ancla para que sea la misma en todo el video.', 'La clienta. Retrato ancla. Sin retrato en BytePlus todavía (D1).'))
    body = (f'<div style="width:1720px;box-sizing:border-box;padding:72px 62px 80px;background:#0F1115;color:#ECEEF2;font-family:\'Poppins\',system-ui,sans-serif;display:flex;flex-direction:column;gap:36px">'
            f'{header}{resumen}<div style="{box}">{h3("Decisiones que bloquean la producción")}{decis}</div>'
            f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div style="{box}">{h3("Rutas de motor")}{rutas}</div>{entrega}</div>{flujo}'
            f'{cast}{"".join(acts)}</div>')
    css = C.CSS + '.k-pl{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
    return css, body


if __name__ == '__main__':
    css, body = build()
    H = 16900
    board = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<title>Storyboard v4</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n'
             f'<link rel="preconnect" href="https://fonts.googleapis.com">\n{C.FONTS}\n<style>\nbody{{margin:0;background:#0F1115}}\n{css}\n</style>\n</helmet>\n{body}\n</x-dc>\n'
             f'<script type="text/x-dc" data-dc-script data-props=\'{{"$preview":{{"width":1720,"height":{H}}}}}\'>\nclass Component extends DCLogic {{\n  renderVals() {{ return {{}}; }}\n}}\n</script>\n</body>\n</html>\n')
    open(os.path.join(PROJ, 'project', 'Storyboard.dc.html'), 'w').write(board)
    print('ok', len(board))
