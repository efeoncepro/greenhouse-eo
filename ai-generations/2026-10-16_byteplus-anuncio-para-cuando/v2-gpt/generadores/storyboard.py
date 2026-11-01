"""Storyboard v3 de «¿Para cuándo?»: cada plano con los componentes del kit de video aprobado (2026-10-17).

Cuadros fijos en 4:5 (el master), en el momento en que el componente ya está armado. Línea Growth: acento teal sobre
el navy de Efeonce. Reutiliza el CSS y las piezas de la lámina de componentes (components.py) y los planos del
animatic (animatic.py), con sus tiempos en la grilla de 120 BPM.
"""
import os
import re

import components as C
import animatic as A

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = C.PROJ
W = 381                      # ancho del cuadro en la lámina
SC = W / 1080

RING_STATIC = ('<svg class="k-ring2" style="color:var(--acc)" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.06" fill="none" '
               'stroke="currentColor" stroke-width="3.87"/></svg>')
ESF = '<span class="k-esf"></span>'


def bed(cls, style, inner, f):
    return f'<div class="k-bed {cls}" style="--f:{f};{style}">{inner}</div>'


def lower_third(ctx, word, pin=True, side='l'):
    pos = 'left:var(--sl);bottom:var(--zb)' if side == 'l' else 'right:var(--sr);bottom:var(--zb)'
    corner = 'c-bl' if side == 'l' else 'c-br'
    return bed(corner, pos, f'<div class="k-ctx k-ctxr" style="font-size:32px"><span class="k-ring"></span>{ctx}</div>'
                            f'<div class="k-B" style="font-size:96px">{C.PIN if pin else ""}{word}{ESF}</div>', 96)


def punch(word, side='r'):
    pos = 'top:var(--top);right:var(--sr)' if side == 'r' else 'top:var(--top);left:var(--sl)'
    return bed('c-tr' if side == 'r' else 'c-tl', pos, f'<div class="k-B" style="font-size:124px">{word}{ESF}</div>', 124)


def punch_q(q, word):
    return bed('c-tr', 'top:var(--top);right:var(--sr)',
               f'<div class="k-q"><span class="k-ring" style="width:.62em;height:.62em"></span>{q}</div>'
               f'<div class="k-B" style="font-size:124px">{word}{ESF}</div>', 124)


def sub(lines, who='l', ask=True):
    side = 'flex-start' if who == 'l' else 'flex-end'
    spans = ''.join(f'<span>{l}</span>' for l in lines)
    return (f'<div class="k-subw" style="justify-content:{side}"><div class="k-glass {"c-bl" if who == "l" else "c-br"}">'
            f'{RING_STATIC if ask else ""}<div class="k-subt">{spans}</div></div></div>')


def bubbles():
    words = [('Seis semanas', 48), ('Casting', 56), ('Locación', 66), ('Otra cotización', 96)]
    bubs = ''.join(f'<div class="k-bub" style="font-size:{fs}px">{w}{ESF if w == "Otra cotización" else ""}</div>' for w, fs in reversed(words))
    return f'<div class="k-stack" style="left:var(--sl);bottom:calc(var(--bb) - 24px);transform:translateY(-24px)">{bubs}</div>'


def close_punch():
    return ('<div class="k-panel" style="z-index:1"></div><div class="k-center" style="gap:18px">'
            '<div class="k-q" style="font-size:52px"><span class="k-ring" style="width:.62em;height:.62em"></span>¿Para ayer?</div>'
            f'<div class="k-B" style="font-size:190px">Ya está{ESF}</div></div>')


def close_proof(local):
    e = 'file://' + PROJ + '/img/efeonce-logo-negative.svg' if local else A.LOGO_EFEONCE
    b = 'file://' + PROJ + '/img/byteplus-white-hi.png' if local else A.LOGO_BYTEPLUS
    import math
    ang = math.radians(105)
    x, y = 280 + 236 * math.sin(ang), 280 - 236 * math.cos(ang)
    return ('<div class="k-panel" style="z-index:1"></div><div class="k-center" style="gap:56px">'
            '<div class="k-disc" style="background:transparent">'
            '<svg width="560" height="560" viewBox="0 0 560 560" style="position:absolute;left:0;top:0;overflow:visible">'
            '<circle cx="280" cy="280" r="236" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="6"/>'
            f'<path d="M280 44 A236 236 0 0 1 {x:.1f} {y:.1f}" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="17" fill="currentColor"/></svg>'
            '<div class="k-ctx" style="font-size:40px">Este video</div>'
            '<div class="k-B" style="font-size:150px">[X] h</div>'
            '<div class="k-src">Fuente:<br>registro de producción</div></div>'
            f'<div style="display:flex;align-items:center;gap:30px"><img src="{e}" alt="Efeonce" style="height:64px">'
            f'<span style="width:2px;height:72px;background:rgba(255,255,255,.55)"></span><img src="{b}" alt="BytePlus" style="height:60px"></div></div>')


# Plano → (título, voz o diálogo, nota de producción, componente, overlay, transición propuesta a la salida)
CARDS = {
 '00': ('Cuadro congelado del final', 'Rebobinado rápido al kickoff', 'Mismo plano del 11b, congelado · rebobinado en post',
        'Remate con pregunta', lambda l: punch_q('¿Cómo llegamos aquí?', 'Rebobinemos'), None),
 '01': ('Kickoff. Antonio ya teclea al fondo', '«¿Y para cuándo estaría la campaña?»', 'Se planta el café y se planta a Antonio',
        'Subtítulo · vidrio denso (Paula)', lambda l: sub(['¿Y para cuándo estaría', 'la campaña?']), None),
 '02': ('La videollamada', '«Seis semanas.» · «Primero hay que hacer casting.»', 'El subtítulo del 01 cruza el corte · cada recuadro se ilumina cuando habla',
        'Subtítulo · vidrio denso (continúa)', lambda l: sub(['¿Y para cuándo estaría', 'la campaña?']), None),
 '03': ('La grilla se multiplica: 4 → 16 → 64', '«Depende de la locación…» · «¿En portugués? Eso es otra cotización.»', 'Cacofonía: todas las voces a la vez',
        None, None, None),
 '04': ('Las excusas la aplastan', '«Seis semanas» → «Casting» → «Locación» → «Otra cotización»', 'Tres en corcheas; la última cae en el golpe con microtemblor · Paula se hunde con cada una',
        'Burbujas de voz', lambda l: bubbles(), None),
 '05': ('Día 42', 'Telarañas, planta seca, quince tazas, una cana', 'Antonio, impecable, sigue tecleando al fondo',
        'Remate', lambda l: punch('Día 42', 'l'), 'Barrido navy: cambio de bloque, entra el silencio'),
 '06': ('Paula se gira hacia Antonio', '(silencio)', 'Se corta la música', None, None, None),
 '07': ('Antonio, sereno', '«¿Para cuándo la necesitas?»', 'Toma de prueba de sincronía labial',
        'Subtítulo · vidrio denso (Antonio)', lambda l: sub(['¿Para cuándo la necesitas?'], 'r'), None),
 '08': ('Paula, entre la risa y la duda', '«…¿Para ayer?»', 'Voz ElevenLabs v4 · Seedance 2.5',
        'Subtítulo · vidrio denso (Paula)', lambda l: sub(['…¿Para ayer?']), None),
 '09': ('Antonio gira su portátil', '«Ya está.»', 'La luz de la pantalla cruza la mesa hacia ella · Antonio no se mueve de su lugar',
        'Remate', lambda l: punch('Ya está'), 'Iris de anillo: lo que sigue es la respuesta'),
 '10': ('La cámara atraviesa la pantalla de Antonio', 'La lata sale disparada hacia Paula', 'Probado en borrador · empalma desde el 09', None, None, None),
 '11a': ('Contraplano: la ola cruza la mesa', 'Sale del lado de Antonio y va hacia Paula', 'Cámara baja, a ras de la mesa · Paula todavía seca', None, None, None),
 '11b': ('La ola golpea a Paula', 'El café sigue en su mano', 'Es el cuadro del gancho', None, None, None),
 '12': ('Las paredes se vuelven pantallas', 'La campaña en todos los formatos', 'Sin texto: las paredes lo dicen solas', None, None, 'Barrido navy: cambio de lugar, sale a la ciudad'),
 '13': ('Reforma, Ciudad de México', 'Corte encadenado por la forma de la lata', 'Seedance 2.5',
        'Zócalo de lugar con pin', lambda l: lower_third('Lunes · 09:12', 'CDMX'), None),
 '14': ('Bogotá, con Monserrate', 'Misma posición de la lata', 'El zócalo sigue: sólo cambian la hora y la ciudad',
        'Zócalo de lugar con pin', lambda l: lower_third('Lunes · 09:13', 'Bogotá'), None),
 '15': ('Santiago: pantalla y feed', 'De la vía pública al celular', 'Zócalo a la derecha para no tapar la pantalla',
        'Zócalo de lugar con pin', lambda l: lower_third('Lunes · 09:14', 'Santiago', side='r'), None),
 '16': ('Vocera: un idioma por golpe de música', 'Voz ElevenLabs v4 en tres idiomas', 'ES, EN y PT entran uno por tiempo',
        'Zócalo (contexto: idiomas)', lambda l: lower_third('ES · EN · PT', '3 idiomas', pin=False), None),
 '17': ('Paula, empapada y seca de humor', '«…¿Y para el lunes?»', 'Rodaja de naranja en el hombro',
        'Subtítulo · vidrio denso (Paula)', lambda l: sub(['…¿Y para el lunes?']), None),
 '18': ('Antonio, sin pestañear', '«También.»', 'Seco e impecable', 'Remate', lambda l: punch('También'), None),
 '19': ('Los recuadros se apagan, uno a uno', 'El último cierra su laptop en silencio', 'Compuesto en post', None, None, 'Barrido navy: entra el cierre'),
 '20a': ('Cierre, golpe 1', '«¿Para ayer? Ya está.»', 'Sobre el navy de Efeonce', 'Remate con pregunta', lambda l: close_punch(), None),
 '20b': ('Cierre, golpe 2: la prueba', 'Este video: [X] horas', 'Las horas reales, medidas · lockup Efeonce | BytePlus con el mismo peso óptico',
        'Super de dato + lockup', close_proof, None),
}

ACTS = [('1 · El gancho', ['00', '01'], 'Abre con un adelanto del final'),
        ('2 · La ráfaga', ['02', '03', '04', '05'], 'Mundo frío · cámara fija · videollamada pixelada'),
        ('3 · El remate', ['06', '07', '08', '09'], 'Silencio total · sólo el sorbo de café'),
        ('4 · La invasión', ['10', '11a', '11b', '12', '13', '14', '15', '16'], 'Mundo Efeonce · color saturado · cámara en movimiento · entra el drop'),
        ('5 · Doble remate y cierre', ['17', '18', '19', '20a', '20b'], 'Sobre el navy de Efeonce al final')]


def tc(t):
    m, s = divmod(t, 60)
    whole = int(s)
    frac = round((s - whole) * 10)
    return f'{int(m)}:{whole:02d}' + (f',{frac}' if frac else '')


def build(local):
    starts, t = {}, 0.0
    for sid, dur, _, _ in A.SCENES:
        starts[sid] = (t, t + dur)
        t += dur
    total = t

    def src(sid):
        return f'file://{C.PLATES}{A.LOCAL[sid]}.png' if local else f'/_blob/{A.BLOB[sid]}'

    acts = []
    for name, ids, mood in ACTS:
        a, b = starts[ids[0]][0], starts[ids[-1]][1]
        cards = []
        for sid in ids:
            title, voice, note, comp, ov, trans = CARDS[sid]
            s, e = starts[sid]
            plate = f'<img class="k-pl" src="{src(sid)}" alt="Plano {sid}">' if sid in A.BLOB else ''
            inner = ov(local) if ov else ''
            frame = (f'<div class="k-view" style="width:{W}px;height:{round(1350 * SC)}px"><div class="k-stg f45" style="height:1350px;transform:scale({SC:.5f})">'
                     f'{plate}{inner}</div></div>')
            chip = (f'<div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#001A33;background:#36C8BF;border-radius:999px;padding:4px 10px;align-self:flex-start">{comp}</div>'
                    if comp else '<div style="font-size:12px;color:#6F7682;align-self:flex-start">Sin texto</div>')
            tr = (f'<div style="font-size:12px;color:#C9CED6;border-top:1px solid #22262E;padding-top:8px">→ {trans}</div>' if trans else '')
            cards.append(f'<article style="display:flex;flex-direction:column;gap:10px;width:{W}px">{frame}'
                         f'<div style="font-size:13px;color:#8A919C;letter-spacing:.04em">{sid} · {tc(s)}–{tc(e)}</div>{chip}'
                         f'<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-weight:700;font-size:20px;line-height:1.15;color:#fff">{title}</div>'
                         f'<div style="font-size:14px;color:#ECEEF2;line-height:1.45">{voice}</div>'
                         f'<div style="font-size:13px;color:#8A919C;line-height:1.45">{note}</div>{tr}</article>')
        acts.append(f'<section style="display:flex;flex-direction:column;gap:18px;padding-top:28px;border-top:1px solid #22262E">'
                    f'<div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap"><h2 style="margin:0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-.035em;font-size:34px">{name}</h2>'
                    f'<span style="font-size:15px;color:#C9CED6">{tc(a)}–{tc(b)}</span><span style="font-size:15px;color:#8A919C">{mood}</span></div>'
                    f'<div style="display:flex;flex-wrap:wrap;gap:24px">{"".join(cards)}</div></section>')

    esfH = '<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:#36C8BF;margin-left:0.035em"></span>'
    header = ('<header style="display:flex;flex-direction:column;gap:14px">'
              '<div style="font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#36C8BF;font-weight:600">Efeonce × BytePlus · Storyboard v3</div>'
              f'<h1 style="margin:0;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:760;letter-spacing:-.035em;font-size:64px;line-height:1">¿Para cuándo?{esfH}</h1>'
              f'<div style="font-size:16px;color:#C9CED6;max-width:1250px;line-height:1.6">El storyboard con los componentes de video ya aprobados aplicados plano por plano: '
              f'{tc(total)} en la grilla de 120 BPM, master 4:5, línea Growth (acento teal sobre el navy de Efeonce). La bebida ya es BREAKR en todos los planos. Cada cuadro muestra el componente ya armado; '
              'el movimiento y los tiempos de cada uno están en la página de componentes y en el animatic. Las transiciones marcadas son una propuesta para revisar.</div></header>')
    v2 = open(os.path.join(PROJ, 'project', 'V2.dc.html')).read()
    cast = re.search(r'<section[^>]*>\s*<h2[^>]*>Elenco, set y producto</h2>.*?</section>', v2, re.S).group(0)
    cast = cast.replace('/_blob/4743880fba6ab5a290f24ba00cbef806', '/_blob/f655bac4c6d60dcd1e9698182d5e4295').replace('Lata de la bebida ficticia', 'Lata BREAKR Orange Break').replace('Bebida ficticia, sin nombre ni marca. La misma lata en todos los planos.', 'BREAKR, marca ficticia: «Break the wait.». La misma lata en todos los planos; en vallas, pantallas y teléfonos va su key visual.')
    assert 'f655bac4c6d60dcd1e9698182d5e4295' in cast and 'BREAKR, marca ficticia' in cast
    body = (f'<div style="width:1720px;box-sizing:border-box;padding:72px 62px 80px;background:#0F1115;color:#ECEEF2;font-family:\'Poppins\',system-ui,sans-serif;display:flex;flex-direction:column;gap:40px">'
            f'{header}{cast}{"".join(acts)}</div>')
    css = C.CSS + '.k-pl{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
    return css, body


if __name__ == '__main__':
    css, body = build(False)
    board = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<title>Storyboard v3</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n'
             f'<link rel="preconnect" href="https://fonts.googleapis.com">\n{C.FONTS}\n<style>\nbody{{margin:0;background:#0F1115}}\n{css}\n</style>\n</helmet>\n{body}\n</x-dc>\n'
             '<script type="text/x-dc" data-dc-script data-props=\'{"$preview":{"width":1720,"height":6240}}\'>\nclass Component extends DCLogic {\n  renderVals() { return {}; }\n}\n</script>\n</body>\n</html>\n')
    open(os.path.join(PROJ, 'project', 'Storyboard.dc.html'), 'w').write(board)
    lcss, lbody = build(True)
    open(os.path.join(HERE, 'sb-test.html'), 'w').write(f'<!doctype html><html><head><meta charset="utf-8">{C.FONTS}<style>body{{margin:0;background:#0F1115}}{lcss}</style></head><body>{lbody}</body></html>')
    print('ok', len(board))
