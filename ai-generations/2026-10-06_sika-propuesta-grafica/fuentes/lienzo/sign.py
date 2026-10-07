#!/usr/bin/env python3
"""Firma cada tablero del lienzo con el pie de Efeonce Creative Studio (logo + burbuja URL). Idempotente."""
import json, os, re, sys
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project')
LOCKUP = '/_blob/2c9f9d574dddf747156a9cf67a920140'   # creative-studio-lockup-negative.svg
BUBBLE = '/_blob/2d47ba48d70f372d27bf1ba8b8597a09'   # url-bubble-baked-dark.svg (axis-brand-assets)
COVER = '/_blob/4e3b53c7e71245db626357af35b6fe77'    # portada cine (cover-brochure line brand, plate CS1); la B sin foto vive en PortadaSinFoto.dc.html
FH = 64
SIN_PIE = {'Portada.dc.html', 'PortadaSinFoto.dc.html', 'Contraportada.dc.html'}  # operador 2026-10-07: la portada no lleva pie
LONG = 'Propuesta para <b style="font-weight: 600; color: #FFFFFF">Sika Mexicana</b> · Licitación Wherex N.º 1164 · Confidencial'
SHORT = '<b style="font-weight: 600; color: #FFFFFF">Sika Mexicana</b> · Wherex N.º 1164 · Confidencial'
POPPINS = '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&amp;display=swap" rel="stylesheet">'

def footer(w):
    return (f'<div data-ef-footer style="width: {w}px; height: {FH}px; box-sizing: border-box; padding: 0 40px; background: #001a33; '
            f"display: flex; align-items: center; gap: 28px; font-family: 'Poppins', sans-serif; color: #D9E1EA\">"
            f'<img src="{LOCKUP}" alt="Efeonce Creative Studio" style="height: 26px; width: auto; display: block">'
            f'<div style="width: 1px; height: 24px; background: #3A5470"></div>'
            f'<div style="font-size: 15px; letter-spacing: 0.02em; flex-grow: 1">' + (LONG if w >= 1500 else SHORT) + '</div>'
            f'<img src="{BUBBLE}" alt="efeoncepro.com" style="height: 24px; width: auto; display: block"></div>')

def unsign(name):
    path = os.path.join(P, name); s = open(path).read()
    if 'data-ef-footer' in s:
        s = re.sub(r'<div data-ef-frame data-h="\d+"[^>]*>\n', '', s, count=1)
        s = re.sub(r'\n<div data-ef-footer[^\n]*\n</div>\n', '\n', s, count=1)
        s = re.sub(r'"\$preview":\{"width":(\d+),"height":\d+\}', lambda x: f'"$preview":{{"width":{x.group(1)},"height":1080}}', s)
        open(path, 'w').write(s)
    return int(re.search(r'<div style="width: \d+px; height: (\d+)px', s[s.index('</helmet>'):]).group(1))

def sign(name):
    if name in SIN_PIE: return unsign(name)
    path = os.path.join(P, name); s = open(path).read()
    if 'data-ef-footer' in s:
        m = re.search(r'data-ef-frame data-h="(\d+)"', s); return int(m.group(1))
    a = s.index('</helmet>') + len('</helmet>'); b = s.index('</x-dc>')
    head, body, tail = s[:a], s[a:b].strip('\n'), s[b:]
    m = re.match(r'<div style="width: (\d+)px; height: (\d+)px', body)
    w, h = int(m.group(1)), int(m.group(2)); H = h + FH
    if 'family=Poppins' not in head: head = head.replace('</helmet>', POPPINS + '\n</helmet>')
    body = f'<div data-ef-frame data-h="{H}" style="width: {w}px; display: flex; flex-direction: column">\n{body}\n{footer(w)}\n</div>'
    tail = re.sub(r'"\$preview":\{"width":(\d+),"height":\d+\}', lambda x: f'"$preview":{{"width":{x.group(1)},"height":{H}}}', tail)
    open(path, 'w').write(head + '\n' + body + '\n' + tail)
    return H

def portada():
    tpl = open(os.path.join(P, 'Evolucion.dc.html')).read()
    a = tpl.index('</helmet>') + len('</helmet>'); b = tpl.index('</x-dc>')
    body = f'<div style="width: 1920px; height: 1080px; position: relative; overflow: hidden; background: #001a33"><img src="{COVER}" alt="Portada: Efeonce presenta a Sika Mexicana su propuesta creativa para la licitación Wherex N.º 1164. ¿Cómo se ve lo posible? Así." style="width: 1920px; height: 1080px; display: block"></div>'
    s = tpl[:a] + '\n' + body + '\n' + tpl[b:]
    s = re.sub(r'<title>.*?</title>', '<title>Portada · propuesta Sika</title>', s)
    s = re.sub(r'"\$preview":\{"width":\d+,"height":\d+\}', '"$preview":{"width":1920,"height":1080}', s)
    open(os.path.join(P, 'Portada.dc.html'), 'w').write(s)

if __name__ == '__main__':
    if not os.path.exists(os.path.join(P, 'Portada.dc.html')) or 'data-ef-footer' not in open(os.path.join(P, 'Portada.dc.html')).read():
        portada()
    c = json.load(open(os.path.join(P, 'canvas.json')))
    c['boards'].setdefault('Portada.dc.html', {'x': 0, 'y': 0, 'w': 1920, 'h': 1080, 'page': 'portada',
        'title': 'PORTADA · Efeonce Creative Studio presenta la propuesta a Sika'})
    for name, bd in c['boards'].items():
        bd['h'] = sign(name)
    if not any(p['id'] == 'portada' for p in c['pages']):
        c['pages'].insert(0, {'id': 'portada', 'name': 'Portada'})
    c['launch']['page'] = 'portada'
    if 'Portada.dc.html' not in c['order']: c['order'].insert(0, 'Portada.dc.html')
    B = c['boards']; N = c['notes']
    N['t_reel']['y'] = 2990
    for k in ('Storyboard.dc.html', 'Reel.dc.html'): B[k]['y'] = 3270
    N['t_extras']['y'] = 4720
    for k in ('Sikaflex.dc.html', 'ViscoCrete.dc.html', 'PDV.dc.html'): B[k]['y'] = 5000
    json.dump(c, open(os.path.join(P, 'canvas.json'), 'w'), ensure_ascii=False, indent=2)
    # verificación de solapes por página
    for pg in {b['page'] for b in B.values()}:
        bs = [(k, b) for k, b in B.items() if b['page'] == pg]
        for i, (k1, a) in enumerate(bs):
            for k2, b in bs[i+1:]:
                if a['x'] < b['x']+b['w'] and b['x'] < a['x']+a['w'] and a['y'] < b['y']+b['h'] and b['y'] < a['y']+a['h']:
                    print('SOLAPE', pg, k1, k2)
    print('ok', len(B))
