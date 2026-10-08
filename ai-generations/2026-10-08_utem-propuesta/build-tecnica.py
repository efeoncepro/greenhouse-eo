# UTEM · Propuesta técnica SEO/GEO/AEO en el canvas Design (v1, 2026-10-08: lectura sin presentador).
# Molde de la propuesta técnica Pibank (estilo alternativo aprobado el 2026-10-07), línea Engine.
# Fuente narrativa: docs/commercial/tenders/utem-seo-aeo-2026/oferta-tecnica.md (v1.0). Si cambia el Markdown,
# se actualiza aquí; nunca al revés. Sin precio, costos, nombres del equipo ni casos de clientes.
# Uso: python3 build-tecnica.py <carpeta project del canvas>
import json, os, sys

ROOT = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
AX = json.load(open(os.path.join(HERE, 'axis-assets.json')))
LOGO_NEG = '/_blob/b397c33481405b476462814aec64dac3'
UTEM_LOGO = '/_blob/5d02dd72cc8612c88976ffd0e350fbe3'  # logos-cliente/utem-logo-blanco-canvas.svg
LOGO_POS = '/_blob/374f0987b3b271674331e68c112de6e1'
ACC = '#0375db'
DARK = dict(name='dark', bg='#091951', ink='#ffffff', soft='#cfe4fa', rule='rgba(114, 222, 216, 0.16)', eb='#ffffff', logo=LOGO_NEG)
LIGHT = dict(name='light', bg='#f7f8f6', ink='#023c70', soft='#5f5a69', rule='rgba(2, 60, 112, 0.14)', eb='#5f5a69', logo=LOGO_POS)
ID = "'Bricolage Grotesque', system-ui, sans-serif"; ST = "'Poppins', system-ui, sans-serif"
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">'
CLIENT = 'UTEM'
COVER = '/_blob/48c3c1e499dca3e646056ae0cced538e'  # compositor: cover-proposal, línea Engine, logo UTEM, selección quitada (quitar-seleccion-portada.mjs)
TEAM = '/_blob/bc2c141fef640f18a5b4c6b53dfb50dc'  # compositor: content-team (selección quitada, Engine, logo UTEM al centro: logo-centro-equipo.mjs)
SKY = '/_blob/2c686ea0f1dea2a01427da4ce4a6b715'  # compositor: decision-case Sky (Growth claro → recolor-engine.mjs)
BEREL = '/_blob/5fdddaf9ff5366baf4aaae9412d976f2'  # compositor: decision-case Berel, cifras del deck SEO/AEO aprobado
# Día a día y «vívelo», importadas del deck SEO/AEO aprobado (2026-09-29, completo 19–21) y llevadas a Engine con recolor-engine.mjs (RECOLOR_LO=156).
DIA = {'todo': '/_blob/8d152ebf97646a27f83a368dca1ef9a5', 'vista': '/_blob/02e8223bb48d6f2ec678284a1b214ad5', 'mes': '/_blob/e7bb4ecc36a6d47879e0895ad3382d01'}
# Portadas de capítulo (section-classic) y clientes (content-clients), compositor Growth claro → recolor-engine.mjs.
SEC = {1: '/_blob/1d546fa4d7c8381ee7ac73f242560e1b', 2: '/_blob/4b9cf7247bca397e01fa80d3d55fb07e', 3: '/_blob/e21c092ff6c206bdbcb577f7b44d0acc', 4: '/_blob/42ad04a06a008ec10bfe5e73b71b4ff9', 5: '/_blob/4d088717c43f9c8577977717002f8fc6'}
CLIENTES = '/_blob/0f121c443e671ccffb29472382e394fd'
CLOSE = '/_blob/d43156c699f56fd5b6abf1ae7e91d037'  # compositor: close-proposal, plate BR3f


def signature(t, big=False):
    w = 260 if big else 160
    h = round(w * 196.68 / 837.07)
    return f'<img src="{t["logo"]}" alt="Efeonce" style="position: absolute; left: {(1920 - w) // 2}px; top: {1080 - 40 - h}px; width: {w}px; height: {h}px">'


def page(title, body, t=DARK, section=None, sign=True):
    nav = f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">{AX["nav"][t["name"] + "-" + str(section)]}</svg>' if section else ''
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>
body{{margin:0;background:{t['bg']}}}
</style>
</helmet>
<div style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: {t['bg']}; color: {t['ink']}; font-family: {ST}">
{body}
{nav}
{signature(t) if sign else ''}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''


def img_page(title, blob, alt):
    return page(title, f'<img src="{blob}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px">', sign=False)


def sphere():
    return f'<span style="display: inline-block; width: 0.2em; height: 0.2em; border-radius: 50%; background: {ACC}; margin-left: 0.04em"></span>'


def eyebrow(text, t=DARK):
    ring = f'<span style="display: inline-block; width: 14px; height: 14px; box-sizing: border-box; border: 3px solid {ACC}; border-radius: 50%; margin-right: 16px; vertical-align: -1px"></span>'
    return f'<div style="font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: {t["eb"]}">{ring}{text}</div>'


def headline(lines, px, t=DARK, extra=''):
    return f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.96; white-space: nowrap; color: {t["ink"]}{extra}" data-hl="1">{"<br>".join(lines)}{sphere()}</div>'


def body(text, px=24, width=560, t=DARK, extra=''):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: {t["ink"]}; max-width: {width}px{extra}">{text}</div>'


def source(text, t=DARK, extra=''):
    return f'<div style="font-size: 15px; font-weight: 400; line-height: 1.5; color: {t["soft"]}{extra}">{text}</div>'


def label(text, color=None, t=DARK, extra=''):
    return f'<div style="font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: {color or t["soft"]}{extra}">{text}</div>'


def col(inner, top=120, width=600):
    return f'<div style="position: absolute; left: 140px; top: {top}px; width: {width}px; display: flex; flex-direction: column">{inner}</div>'


def zone(inner, left, top, width, extra=''):
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px{extra}">{inner}</div>'


def icon(glyph, t=DARK, size=52):
    return f'<div style="width: {size}px; height: {size}px; margin: 0 0 4px -4px">{AX["icons"][glyph + "-" + t["name"]]}</div>'


def halo_platform(cx=1290, cy=440, pcx=1290, pcy=900, prx=520, pry=70):
    return f'''<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">
<defs>
<radialGradient id="hl" cx="{cx}" cy="{cy}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{ACC}" stop-opacity="0.30"/><stop offset="0.4" stop-color="{ACC}" stop-opacity="0.09"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient>
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000814" stop-opacity="0.5"/></linearGradient>
<radialGradient id="pf" cx="{pcx}" cy="{pcy}" r="{prx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 {pcy - pcy * 0.16:.0f}) scale(1 0.16)"><stop offset="0" stop-color="{ACC}" stop-opacity="0.38"/><stop offset="0.7" stop-color="{ACC}" stop-opacity="0.07"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient>
<filter id="pg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<rect width="1920" height="1080" fill="url(#hl)"/>
<rect y="778" width="1920" height="302" fill="url(#fl)"/>
<ellipse cx="{pcx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="url(#pf)"/>
<ellipse cx="{pcx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="none" stroke="{ACC}" stroke-opacity="0.6" stroke-width="3"/>
<path d="M {pcx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {pcx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{ACC}" stroke-width="14" opacity="0.5" filter="url(#pg)"/>
<path d="M {pcx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {pcx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{ACC}" stroke-width="6" stroke-linecap="round"/>
</svg>'''


def halo_only(cx, cy, op=0.26):
    return (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true"><defs>'
            f'<radialGradient id="ho" cx="{cx}" cy="{cy}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{ACC}" stop-opacity="{op}"/>'
            f'<stop offset="0.45" stop-color="{ACC}" stop-opacity="0.08"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="1920" height="1080" fill="url(#ho)"/></svg>')


def obj(inner, left, top, width, hero=False, extra=''):
    sh = (f'box-shadow: 0 0 0 2px rgba(3, 117, 219, 0.95), 0 50px 110px rgba(0, 6, 16, 0.75), 0 0 120px rgba(3, 117, 219, 0.45); background: linear-gradient(180deg, #12385a 0%, #081c30 100%); border-radius: 28px; padding: 30px 32px 32px;'
          if hero else
          'box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 22px 44px rgba(0, 6, 16, 0.6); background: linear-gradient(180deg, #10304b 0%, #081c30 100%); border-radius: 22px; padding: 26px 28px 28px;')
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px; box-sizing: border-box; {sh}{extra}">{inner}</div>'


def okicker(text):
    return f'<div style="font-weight: 600; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">{text}</div>'


def otitle(text, px=30):
    return f'<div style="font-family: {ID}; font-weight: 740; font-size: {px}px; letter-spacing: -0.02em; line-height: 1.05; margin-top: 10px">{text}</div>'


def otext(text, px=18, extra=''):
    return f'<div style="font-weight: 400; font-size: {px}px; line-height: 1.4; color: #c9d6e2; margin-top: 10px{extra}">{text}</div>'


def item(title, text, lab=None, px=32, t=DARK, ic=None):
    return (f'<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 20px; border-top: 1px solid {t["rule"]}">' +
            (icon(ic, t) if ic else '') + (label(lab, t=t) if lab else '') +
            f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.06; color: {t["ink"]}">{title}</div>'
            f'<div style="font-size: 19px; font-weight: 300; line-height: 1.45; color: {t["soft"]}">{text}</div></div>')


def trow(cells, widths, t, px=20, pad=18):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    cs = ''.join(f'<div style="font-size: {px}px; line-height: 1.4; {"font-weight: 600; color: " + t["ink"] if j == 0 else "font-weight: 400; color: " + t["soft"]}">{c}</div>' for j, c in enumerate(cells))
    return f'<div style="display: grid; grid-template-columns: {tpl}; column-gap: 36px; padding: {pad}px 24px; border-top: 1px solid {t["rule"]}; align-items: start">{cs}</div>'


def thead(cells, widths, t):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    return f'<div style="display: grid; grid-template-columns: {tpl}; column-gap: 36px; padding: 0 24px 18px">{"".join(f"<div>{label(c, t=t)}</div>" for c in cells)}</div>'


def means(text, src='', t=DARK, top=852):
    return zone(f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) 500px; column-gap: 60px; padding-top: 16px; border-top: 1px solid {t["rule"]}">'
                f'<div>{label("Qué significa para " + CLIENT, t["ink"], t)}<div style="font-size: 21px; font-weight: 400; line-height: 1.4; color: {t["ink"]}; margin-top: 8px">{text}</div></div>'
                f'<div style="padding-top: 22px">{source(src, t)}</div></div>', 140, top, 1640)


def para(text, px=21, t=DARK, extra=''):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: {t["soft"]}{extra}">{text}</div>'


def callout(text, t=DARK, extra=''):
    return f'<div style="border-left: 3px solid {ACC}; padding: 4px 0 4px 16px; font-size: 18px; font-weight: 400; line-height: 1.45; color: {t["ink"]}{extra}">{text}</div>'


def navmini(n, t=DARK):
    return f'<svg viewBox="1712 82 96 96" width="60" height="60" aria-hidden="true">{AX["nav"][t["name"] + "-" + str(n)]}</svg>'


def chip(x, on=True, t=DARK):
    bg = 'background: rgba(255, 255, 255, 0.08)' if t is DARK else 'background: rgba(2, 60, 112, 0.06)'
    return f'<div style="padding: 8px 12px; border-radius: 10px; font-size: 15px; font-weight: 500; line-height: 1.3; {bg if on else "box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.3)"}">{x}</div>'


S = []  # (clave, título del artboard, html)
N = {}  # clave → número de lámina, para las referencias cruzadas


def add(key, title, html_fn):
    S.append((key, title, html_fn))


def ref(key):
    return f'{N[key]}'


# ── 01 · Portada ───────────────────────────────────────────────────────────────────────────────────────────────
def s_portada():
    ring = (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
            f'<circle cx="1360" cy="420" r="432" fill="none" stroke="#72ded8" stroke-opacity="0.16" stroke-width="2"/></svg>')
    facts = ''.join(f'<div style="display: grid; grid-template-columns: 210px minmax(0, 1fr); column-gap: 24px; padding: 14px 0; border-top: 1px solid {DARK["rule"]}">'
                    f'{label(a, "#ffffff")}<div style="font-size: 19px; font-weight: 300; color: #cfe4fa">{b}</div></div>'
                    for a, b in [('Institución', 'Universidad Tecnológica Metropolitana · Educación Continua'),
                                 ('Compra Ágil', '5251-1060-COT26'),
                                 ('Duración', 'Tres meses desde la fecha de inicio que establezca UTEM'),
                                 ('Oferente', 'Efeonce Group SpA · versión 1.0 · 8 de octubre de 2026')])
    return page('UTEM · Portada', halo_only(1360, 420, 0.32) + ring +
                zone(eyebrow('Propuesta técnica · SEO, GEO y AEO'), 140, 120, 900) +
                zone(f'<div style="font-family: {ST}; font-size: 40px; font-weight: 300; line-height: 1.2; color: #cfe4fa">¿Dónde empieza la formación continua?</div>'
                     f'<div style="font-family: {ID}; font-size: 150px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.92; margin-top: 18px">En la<br>búsqueda{sphere()}</div>', 140, 300, 1000) +
                zone(facts, 140, 700, 1000), sign=True)


add('portada', 'Portada', lambda: img_page('UTEM · Portada', COVER, 'Portada de la propuesta técnica para Educación Continua UTEM: ¿Dónde nace una postulación? En la búsqueda.'))

# ── 02 · Cómo leer ─────────────────────────────────────────────────────────────────────────────────────────────
CHAP = [(1, '¿Qué necesita Educación Continua UTEM?', 'sec1', 'objetivos'),
        (2, '¿Cómo se ejecutará el trabajo?', 'sec2', 'pr'),
        (3, '¿Cómo se medirá el avance?', 'sec3', 'cronograma'),
        (4, '¿Quién lo ejecuta y qué ha logrado?', 'sec4', 'alcance'),
        (5, '¿Qué recibe la Universidad?', 'sec5', 'siguiente')]


def s_leer():
    annex = f'Anexos · Matriz de cumplimiento, lámina {ref("matriz")} · Fuentes y supuestos, lámina {ref("fuentes")}'
    rows = ''.join(f'<div style="display: grid; grid-template-columns: 60px minmax(0, 1fr); column-gap: 28px; align-items: center; padding: 22px 0; border-top: 1px solid {DARK["rule"]}">{navmini(n)}'
                   f'<div><div style="font-family: {ID}; font-size: 34px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1">{q}</div>'
                   f'<div style="font-size: 18px; font-weight: 300; color: #cfe4fa; margin-top: 6px">Capítulo {n} · láminas {ref(a)} a {ref(b)}</div></div></div>' for n, q, a, b in CHAP)
    return page('UTEM · Cómo leer',
                col(eyebrow('Cómo leer esta propuesta') + headline(['Cinco preguntas,', 'una por', 'capítulo'], 86, extra='; margin-top: 64px') +
                    body('Cada título dice la conclusión de su lámina, y las láminas con contenido técnico explican al pie qué significan para UTEM.', 22, 560, extra='; margin-top: 40px') +
                    para(f'El círculo de la esquina superior derecha indica el capítulo. Las fuentes y los parámetros de ejecución propuestos están reunidos en la lámina {ref("fuentes")}.', 19, extra='; margin-top: 22px; max-width: 540px'), 120, 600) +
                zone(rows + f'<div style="padding-top: 18px; border-top: 1px solid {DARK["rule"]}">{label(annex, "#cfe4fa")}</div>', 820, 170, 960))


add('leer', 'Cómo leer esta propuesta', s_leer)


# ── 03 · Resumen ───────────────────────────────────────────────────────────────────────────────────────────────
def s_resumen():
    sq = lambda on: f'<div style="width: 12px; height: 12px; border-radius: 3px; {"background: " + ACC if on else "box-shadow: inset 0 0 0 1.5px rgba(207, 228, 250, 0.45)"}"></div>'
    months = ''.join(f'<div><div style="display: grid; grid-template-columns: repeat(5, 12px); gap: 4px">{"".join(sq(True) for _ in range(5))}</div>'
                     f'<div style="font-size: 13px; font-weight: 500; color: #cfe4fa; margin-top: 8px">Mes {m}</div></div>' for m in (1, 2, 3))
    mini_art = f'<div style="display: grid; grid-template-columns: repeat(3, max-content); gap: 14px; margin-top: 18px">{months}</div>' + otext('Cinco por mes, aprobados por UTEM antes de publicar.', 16)
    sec = lambda x: f'<div style="font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #ffffff; margin-top: 18px">{x}</div>'
    mini_meta = (sec('Visibilidad · SEO, GEO y AEO') +
                 f'<div style="display: grid; gap: 7px; margin-top: 8px">{chip("Impresiones, clics y posiciones orgánicas")}{chip("Presencia y exactitud en respuestas de IA")}{chip("Menciones y enlaces verificados")}</div>' +
                 sec('Ejecución') + f'<div style="display: grid; gap: 7px; margin-top: 8px">{chip("Artículos publicados y acciones técnicas verificadas")}</div>' +
                 otext('Todo contra una línea base levantada al inicio.', 15))
    fig = lambda v, px: f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9; margin-top: 14px; white-space: nowrap">{v}</div>'
    steps = ''.join(f'<div style="display: flex; align-items: center; gap: 10px; margin-top: 10px"><div style="width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 2px #cfe4fa"></div>'
                    f'<div style="font-size: 16px; color: #c9d6e2">{x}</div></div>' for x in ('Mes 1 · auditoría y línea base', 'Mes 2 · seguimiento técnico', 'Mes 3 · informe final y hoja de ruta'))
    mini_srv = f'<div style="margin-top: 14px">{steps}</div>'
    cards = (obj(okicker('El servicio') + fig('3 meses', 60) + mini_srv, 820, 360, 300, False, '; height: 430px') +
             obj(okicker('Qué se mide') + otitle('Dos tableros', 40) + mini_meta, 1150, 250, 300, True, '; height: 560px') +
             obj(okicker('La producción') + fig('15 artículos', 50) + mini_art, 1480, 360, 300, False, '; height: 430px'))
    return page('UTEM · Resumen', halo_platform(1300, 520, 1300, 800, 560, 50) + cards +
                col(eyebrow('Resumen') + headline(['Tres meses para', 'que la oferta de', 'Educación', 'Continua se', 'encuentre'], 66, extra='; margin-top: 56px') +
                    body('Un programa SEO, GEO y AEO sobre educacioncontinua.utem.cl: auditoría, implementación, quince artículos, una campaña de autoridad digital y medición desde una línea base.', 20, 560, extra='; margin-top: 28px') +
                    f'<div style="margin-top: 34px; padding-top: 18px; border-top: 1px solid {DARK["rule"]}">{label("Qué recibe la Universidad", "#ffffff")}'
                    f'<div style="font-family: {ID}; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin-top: 10px">Siete entregables verificables, una contraparte responsable y una hoja de ruta para continuar.</div></div>', 120, 600))


add('resumen', 'Resumen', s_resumen)


# ── Capítulo 1 ────────────────────────────────────────────────────────────────────────────────────────────────
def s_contexto():
    rec = [('Primera pregunta', 'Identifica una competencia que necesita fortalecer', 'Encontrar una explicación útil y el área que la aborda.', False),
           ('Comparación', 'Evalúa alternativas de formación', 'Entender modalidad, duración y aprendizajes de cada programa.', True),
           ('Decisión', 'Busca los antecedentes de un programa', 'Llegar a la información oficial y al canal para consultar.', False)]
    cards = ''.join(obj(okicker(k) + otitle(t, 28) + otext(x, 17), 820 + i * 330, 250 if hero else 330, 300, hero, '; height: ' + ('440px' if hero else '360px'))
                    for i, (k, t, x, hero) in enumerate(rec))
    return page('UTEM · Contexto', halo_platform(1310, 470, 1310, 760, 560, 46) + cards +
                col(eyebrow('Capítulo 1 · Contexto') + headline(['Una oferta', 'amplia necesita', 'recorridos', 'claros'], 84, extra='; margin-top: 56px') +
                    body('Educación Continua UTEM reúne cursos, diplomados y postítulos organizados por áreas, además de una oferta dirigida al sector público. Quien busca formación llega con preguntas distintas según la etapa en que está.', 21, 560, extra='; margin-top: 30px') +
                    callout('El punto de partida es educacioncontinua.utem.cl. La revisión pública usada para esta propuesta no es la auditoría: la línea base se levanta al comenzar.', extra='; margin-top: 28px; max-width: 540px'), 120, 600) +
                means('La estrategia conectará cada pregunta con información institucional vigente y con la página donde se conoce el programa o se solicita información.',
                      'F2–F3 · Sitio de Educación Continua y Dirección de Educación Continua UTEM, consulta del 08/10/2026.'), section=1)


add('sec1', 'Capítulo 1', lambda: img_page('UTEM · Capítulo 1', SEC[1], 'Capítulo 1: ¿Encuentran a UTEM al buscar? Casi nunca.'))
add('contexto', 'Contexto y recorridos', s_contexto)


def s_busqueda():
    # Revisión pública del 08/10/2026 (DataForSEO, Google Chile, escritorio): 15 búsquedas de formación continua.
    data = json.load(open(os.path.join(HERE, 'serp', 'utem-serp-resumen.json')))['rows']
    n_rank = sum(1 for r in data if r['rank']); n_aio = sum(1 for r in data if r['aio']); n_cit = sum(1 for r in data if r['cited'])
    fig = lambda v, px: f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9; margin-top: 12px; white-space: nowrap">{v}</div>'
    cards = (obj(okicker('En Google') + fig(f'{n_rank} de 15', 64) + otext('búsquedas con UTEM entre los primeros 20 resultados', 17), 820, 236, 300, False, '; height: 216px') +
             obj(okicker('Respuestas de IA') + fig(f'{n_aio} de 15', 72) + otext('búsquedas donde Google ya responde con IA antes de los resultados', 17), 1150, 196, 300, True, '; height: 256px') +
             obj(okicker('Citas a UTEM') + fig(f'{n_cit} de 15', 64) + otext('respuestas de IA que citan o enlazan a UTEM', 17), 1480, 236, 300, False, '; height: 216px'))
    def chip(r):
        rk = f'#{r["rank"]}' if r['rank'] else '—'
        on = bool(r['rank'])
        tag = (f'<div style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff; background: {ACC}; padding: 3px 7px; border-radius: 6px">Cita IA</div>' if r['cited'] else '')
        return (f'<div style="display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); box-shadow: inset 0 0 0 1px rgba(207, 228, 250, {"0.5" if on else "0.14"})">'
                f'<div style="font-family: {ID}; font-size: 18px; font-weight: 740; width: 34px; color: {"#ffffff" if on else "#8fa6c0"}">{rk}</div>'
                f'<div style="flex: 1; font-size: 14px; line-height: 1.25; color: #dbe6f1">{r["query"]}</div>{tag}</div>')
    grid = f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">{"".join(chip(r) for r in data)}</div>'
    return page('UTEM · Búsqueda hoy', halo_platform(1300, 340, 1300, 470, 560, 26) + cards + zone(label('Las 15 búsquedas · posición de UTEM en Google', '#ffffff') + f'<div style="margin-top: 10px">{grid}</div>', 820, 540, 960) +
                col(eyebrow('Capítulo 1 · Revisión pública') + headline(['Google ya', 'responde con IA;', 'UTEM casi no', 'aparece'], 72, extra='; margin-top: 56px') +
                    body('Quince búsquedas de formación continua en Google Chile, que suman cerca de 17.900 consultas al mes. «—» significa que UTEM no aparece entre los primeros 20 resultados.', 20, 560, extra='; margin-top: 28px'), 120, 600) +
                means('Hay demanda de formación continua que hoy no llega a la oferta de UTEM. La auditoría parte de esta brecha, con las fuentes y accesos de la Universidad.',
                      'Revisión pública del 08/10/2026, no la auditoría: DataForSEO, Google Chile, escritorio, top 20 y AI Overview. Volumen mensual: Semrush Chile.', top=880), section=1)


add('busqueda', 'Búsqueda hoy', s_busqueda)


def s_objetivos():
    # Tres objetos sobre la plataforma, uno por disciplina; el del centro (AEO) es el héroe. Los objetivos, a la izquierda.
    disc = [('buscador', 'SEO', 'Posicionamiento orgánico', 'Que las páginas de la oferta se encuentren y se comprendan en los buscadores.', False),
            ('contenido', 'AEO', 'Información lista para responder', 'Que el contenido resuelva preguntas concretas con datos institucionales claros.', True),
            ('ia', 'GEO', 'Visibilidad en IA generativa', 'Que UTEM aparezca y quede bien representada en las respuestas de IA.', False)]
    acr = lambda a, px: f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9; margin-top: 16px">{a}</div>'
    cards = ''.join(obj(icon(g) + acr(a, 112 if hero else 96) + otitle(t, 26) + otext(x, 17), 820 + i * 330, 230 if hero else 300, 300, hero, '; height: ' + ('520px' if hero else '450px'))
                    for i, (g, a, t, x, hero) in enumerate(disc))
    objs = ['Priorizar las brechas que impiden encontrar la oferta.', 'Contenidos originales que lleven a programas pertinentes.',
            'Información consistente sobre programas y áreas.', 'Autoridad digital con relaciones editoriales.', 'Medición que oriente la continuidad.']
    ocol = ''.join(f'<div style="display: grid; grid-template-columns: 40px minmax(0, 1fr); column-gap: 14px; padding: 11px 0; border-top: 1px solid {DARK["rule"]}">'
                   f'<div style="font-family: {ID}; font-size: 22px; font-weight: 740; color: #cfe4fa">{i}</div><div style="font-size: 18px; font-weight: 300; line-height: 1.4">{o}</div></div>' for i, o in enumerate(objs, 1))
    return page('UTEM · Objetivos', halo_platform(1300, 470, 1300, 790, 580, 46) + cards +
                col(eyebrow('Capítulo 1 · Objetivos') + headline(['Tres disciplinas,', 'una sola', 'estrategia'], 72, extra='; margin-top: 50px') +
                    f'<div style="margin-top: 34px">{label("Cinco objetivos de trabajo", "#ffffff")}<div style="margin-top: 10px">{ocol}</div></div>', 120, 600) +
                means('SEO, GEO y AEO se integran en una misma línea editorial y técnica. Google mantiene los fundamentos de SEO como base de sus experiencias generativas y no exige un marcado especial para IA.',
                      'F4–F5 · Google Search Central: AI features; Optimizing for generative AI features.', top=870), section=1)


add('objetivos', 'Objetivos', s_objetivos)


# ── Capítulo 2 ────────────────────────────────────────────────────────────────────────────────────────────────
def s_metodo():
    steps = [('buscador', '1 · Diagnosticar', 'Auditoría, línea base y matriz de acciones priorizadas.'),
             ('codigo', '2 · Implementar', 'Ajustes en el CMS y en páginas prioritarias, con validación.'),
             ('contenido', '3 · Publicar', 'Cinco artículos al mes, aprobados por UTEM antes de salir.'),
             ('prensa', '4 · Fortalecer autoridad', 'Una campaña de PR digital con sitios pertinentes.'),
             ('medicion', '5 · Medir', 'Seguimiento en el mes 2 e informe final en el mes 3.')]
    cards = ''.join(obj(icon(g) + otitle(t, 26) + otext(x, 16), 140 + i * 336, 410 if i != 0 else 370, 308, i == 0, '; height: ' + ('330px' if i == 0 else '290px'))
                    for i, (g, t, x) in enumerate(steps))
    return page('UTEM · Método', halo_platform(300, 520, 960, 760, 860, 46) + cards +
                zone(eyebrow('Capítulo 2 · Método') + headline(['Un ciclo de cinco pasos durante tres meses'], 72, extra='; margin-top: 44px') +
                     body('La producción editorial empieza en paralelo al diagnóstico, para cumplir cinco entregas desde el primer mes.', 21, 900, extra='; margin-top: 22px'), 140, 110, 1500) +
                means('Cada recomendación quedará vinculada a una acción, un responsable y una evidencia de ejecución. Al cierre, la Universidad recibe los contenidos, los registros y una hoja de ruta.',
                      'Oferta técnica v1.0, §1 y §7.'), section=2)


add('sec2', 'Capítulo 2', lambda: img_page('UTEM · Capítulo 2', SEC[2], 'Capítulo 2: ¿Cómo se ejecuta el trabajo? Paso a paso.'))
add('metodo', 'Método', s_metodo)


def s_auditoria():
    fr = [('buscador', 'Acceso e indexación', 'Respuestas HTTP, robots, sitemaps, canónicas, redirecciones y duplicidades.'),
          ('web', 'Arquitectura y navegación', 'Relación entre áreas, programas y contenidos; profundidad y enlaces internos.'),
          ('contenido', 'Contenido y búsqueda', 'Inventario, intención, palabras clave, títulos, encabezados y actualización.'),
          ('codigo', 'Experiencia técnica', 'Desempeño y visualización móvil, con evidencia y prioridad.'),
          ('checklist', 'Información institucional', 'Oferta, destinatarios, modalidad, duración, requisitos y contacto.'),
          ('ia', 'Respuestas de IA', 'Consultas de referencia, presencia de UTEM, URLs citadas y exactitud.'),
          ('prensa', 'Autoridad y enlaces', 'Fuentes externas, enlaces identificados y oportunidades editoriales.')]
    grid = ''.join(item(t, x, None, 24, DARK, g) for g, t, x in fr)
    return page('UTEM · Auditoría',
                col(eyebrow('Capítulo 2 · Auditoría') + headline(['Siete frentes', 'y un plan, no', 'una lista de', 'errores'], 80, extra='; margin-top: 56px') +
                    body('Se realiza en el primer mes, sobre el sitio público y con Search Console, analítica y herramientas institucionales cuando estén disponibles.', 21, 560, extra='; margin-top: 30px') +
                    callout('Una métrica sin acceso no se registra como cero, ni una falla de herramienta como falta de visibilidad.', extra='; margin-top: 26px; max-width: 540px'), 120, 600) +
                zone(f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 36px; row-gap: 22px">{grid}</div>', 820, 200, 960) +
                means('Cada hallazgo indicará URL o evidencia, fecha, impacto, acción recomendada y dependencia.',
                      'Oferta técnica v1.0, §3.1 · F1, especificaciones técnicas p. 1.', top=892), section=2)


add('auditoria', 'Auditoría inicial', s_auditoria)


def s_prioridad():
    # Escalera de cuatro objetos sobre la plataforma: la altura y los cuadros de urgencia bajan de Crítica a Continuidad.
    rows = [('Crítica', 'Impide acceder, indexar o comprender información esencial', 'Atención inicial y coordinación inmediata con UTEM'),
            ('Alta', 'Afecta páginas o consultas relevantes para la oferta priorizada', 'Implementación durante el servicio'),
            ('Media', 'Mejora cobertura, navegación o presentación de contenidos', 'Programación según impacto y dependencias'),
            ('Continuidad', 'Requiere un proyecto de infraestructura o desarrollo de mayor alcance', 'Especificación y hoja de ruta para el equipo institucional')]
    hs = [580, 520, 460, 420]
    sq = lambda n: ''.join(f'<div style="width: 14px; height: 14px; border-radius: 4px; {("background: " + ACC) if k < n else "box-shadow: inset 0 0 0 1.5px rgba(207, 228, 250, 0.4)"}"></div>' for k in range(4))
    cards = ''
    for i, ((lvl, crit, trat), h) in enumerate(zip(rows, hs)):
        inner = (f'<div style="display: flex; gap: 6px">{sq(4 - i)}</div>' + otitle(lvl, 34 if i == 0 else 30) +
                 f'<div style="font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #cfe4fa; margin-top: 18px">Criterio</div>' + otext(crit, 16, '; margin-top: 6px') +
                 f'<div style="font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #cfe4fa; margin-top: 16px">Tratamiento</div>' +
                 f'<div style="font-size: 16px; font-weight: 500; line-height: 1.4; color: #ffffff; margin-top: 6px">{trat}</div>')
        cards += obj(inner, 820 + i * 246, 790 - h, 222, i == 0, f'; height: {h}px; padding: 24px 22px 24px')
    return page('UTEM · Priorización', halo_platform(1000, 420, 1300, 806, 600, 40) + cards +
                col(eyebrow('Capítulo 2 · Priorización') + headline(['Primero, lo', 'que impide', 'encontrar la', 'oferta'], 84, extra='; margin-top: 56px') +
                    body('El informe de auditoría incluye una matriz de acciones en cuatro niveles: diagnóstico, línea base, hallazgos y oportunidades, en orden de impacto.', 21, 560, extra='; margin-top: 30px'), 120, 600) +
                means('El orden considera impacto, esfuerzo, calendario de programas y dependencias. Lo que excede los tres meses queda especificado para la decisión de UTEM.',
                      'Oferta técnica v1.0, §3.2.', top=870), section=2)


add('prioridad', 'Priorización', s_prioridad)


def s_implementacion():
    def card(kicker, title, rows, left, hero):
        rr = ''.join(f'<div style="display: grid; grid-template-columns: 18px minmax(0, 1fr); column-gap: 14px; padding: 12px 0; border-top: 1px solid rgba(207, 228, 250, 0.16)">'
                     f'<div style="width: 10px; height: 10px; margin-top: 8px; border-radius: 50%; box-shadow: inset 0 0 0 2px #cfe4fa"></div><div style="font-size: 18px; line-height: 1.42; color: #dbe6f1">{r}</div></div>' for r in rows)
        return obj(kicker + otitle(title, 32) + f'<div style="margin-top: 16px">{rr}</div>', left, 196, 460, hero, '; height: 604px')
    ef = ['Optimiza y prepara los quince artículos y, con permisos del CMS, los publica después de la aprobación de UTEM.',
          'Optimiza hasta diez páginas existentes prioritarias: metadatos, títulos, enlaces internos y claridad.',
          'Configura componentes existentes y datos estructurados, con autorización institucional.',
          'Documenta y valida antes de tocar indexación, redirecciones o elementos compartidos.']
    ut = ['Designa una contraparte y valida contenidos y datos académicos.',
          'Entrega accesos pertinentes a CMS, Search Console y analítica, cuando estén disponibles.',
          'Coordina los cambios que dependen de infraestructura o de otras unidades.',
          'Aprueba cada artículo de forma expresa antes de su publicación.']
    lg_ef = f'<div style="height: 64px; display: flex; align-items: center"><img src="{LOGO_NEG}" alt="Efeonce" style="width: 200px; height: 47px"></div>'
    lg_ut = f'<div style="height: 64px; display: flex; align-items: center"><img src="{UTEM_LOGO}" alt="UTEM · Dirección de Educación Continua" style="width: 184px; height: 64px"></div>'
    return page('UTEM · Implementación', halo_platform(1300, 470, 1300, 800, 560, 46) +
                card(lg_ef, 'Implementa y verifica', ef, 820, True) + card(lg_ut, 'Aprueba y habilita', ut, 1320, False) +
                col(eyebrow('Capítulo 2 · Implementación') + headline(['Efeonce', 'implementa;', 'UTEM aprueba', 'y habilita'], 84, extra='; margin-top: 56px') +
                    callout('Si UTEM prefiere mantener la publicación en su equipo, Efeonce entrega el contenido y las instrucciones listas para aplicar, acompaña y verifica el resultado.', extra='; margin-top: 34px; max-width: 540px'), 120, 600) +
                means('El registro de trabajo distinguirá con claridad las acciones implementadas de las que estén pendientes de ejecución institucional.',
                      'Oferta técnica v1.0, §3.3 · «Hasta diez páginas» es un parámetro propuesto (P1).'), section=2)


add('implementacion', 'Implementación', s_implementacion)


def s_articulos():
    w = [1.6, 1.6, 1.3]
    rows = [('Comprender una competencia o desafío profesional', 'Guías explicativas y aplicaciones en el trabajo', 'Áreas y programas relacionados'),
            ('Evaluar una alternativa de formación', 'Criterios de elección, modalidades y aprendizajes', 'Información oficial del programa'),
            ('Resolver dudas antes de consultar', 'Requisitos, dedicación y proceso de información', 'Canal institucional correspondiente')]
    tbl = thead(['Necesidad de la persona', 'Enfoque del contenido', 'Conexión con la oferta'], w, DARK) + ''.join(trow(r, w, DARK, 20, 22) for r in rows)
    return page('UTEM · Artículos', halo_only(1300, 360) +
                col(eyebrow('Capítulo 2 · Producción editorial') + headline(['Quince artículos', 'que llevan de', 'una pregunta a', 'un programa'], 76, extra='; margin-top: 56px') +
                    body('Cinco por mes, con temas acordados con la contraparte UTEM. Antes de proponer un tema se revisa el contenido existente para no duplicarlo.', 21, 560, extra='; margin-top: 30px'), 120, 600) +
                zone(tbl + callout('Ejemplo de enfoque, no un tema aprobado ni una demanda medida: una guía para evaluar formación en análisis de datos explicaría competencias, aplicaciones y criterios de elección, y enlazaría los programas pertinentes.', extra='; margin-top: 34px'), 820, 230, 960) +
                means('Los datos de duración, aranceles, admisión o certificación se tomarán solo de antecedentes institucionales vigentes y se validarán con UTEM.',
                      'Oferta técnica v1.0, §4.1 · F1, especificaciones técnicas p. 2.'), section=2)


add('articulos', 'Quince artículos', s_articulos)


def s_flujo():
    ficha = ['Objetivo, público e intención de búsqueda', 'Palabra clave principal y términos relacionados', 'Título editorial, título SEO, descripción y URL sugerida',
             'Encabezados y desarrollo original', 'Fuentes institucionales o especializadas', 'Enlaces internos y externos pertinentes',
             'Respuestas claras a preguntas relevantes', 'Siguiente paso hacia la oferta o la consulta', 'Versión y registro de aprobación']
    fcol = ''.join(f'<div style="display: grid; grid-template-columns: 36px minmax(0, 1fr); column-gap: 12px; padding: 11px 0; border-top: 1px solid {DARK["rule"]}">'
                   f'<div style="font-size: 16px; font-weight: 600; color: #cfe4fa">{i:02d}</div><div style="font-size: 18px; font-weight: 300; line-height: 1.4">{f}</div></div>' for i, f in enumerate(ficha, 1))
    flow = ['Tema y enfoque acordados', 'Redacción', 'Revisión editorial y SEO/AEO de Efeonce', 'Revisión institucional', 'Ajustes', 'Aprobación expresa de UTEM', 'Publicación y control de la página']
    steps = ''.join(f'<div style="display: grid; grid-template-columns: 34px minmax(0, 1fr); column-gap: 16px; align-items: center; padding: 10px 0">'
                    f'<div style="width: 22px; height: 22px; border-radius: {"6px" if i == 5 else "50%"}; box-sizing: border-box; {("background: " + ACC) if i == 5 else "box-shadow: inset 0 0 0 2px #cfe4fa"}"></div>'
                    f'<div style="font-size: 20px; {"font-weight: 600; color: #ffffff" if i == 5 else "font-weight: 400; color: #dbe6f1"}">{s}</div></div>' for i, s in enumerate(flow))
    flowcard = obj(okicker('Flujo de cada artículo') + f'<div style="margin-top: 14px">{steps}</div>' +
                   otext('Dos rondas consolidadas de revisión por artículo. Las correcciones de errores propios y las necesarias para cumplir las especificaciones no cuentan como cambios de alcance.', 15, '; margin-top: 16px'),
                   1330, 200, 450, True, '; height: 600px')
    return page('UTEM · Flujo editorial', halo_only(1550, 460) + flowcard +
                col(eyebrow('Capítulo 2 · Aprobación') + headline(['Ningún artículo', 'se publica sin', 'la aprobación', 'de UTEM'], 72, extra='; margin-top: 56px') +
                    para('La extensión responde a la profundidad que pide la intención de búsqueda, no a una cuota de palabras. Si se usan herramientas de asistencia, la responsabilidad editorial y la comprobación de hechos siguen en el equipo humano.', 19, extra='; margin-top: 30px; max-width: 540px'), 120, 600) +
                zone(label('Qué incluye cada entrega', '#ffffff') + f'<div style="margin-top: 14px">{fcol}</div>', 790, 200, 480) +
                means('La revisión cuida exactitud, originalidad, legibilidad, tono institucional, consistencia de enlaces y fidelidad de las fuentes.',
                      'Oferta técnica v1.0, §4.2–4.3 · «Dos rondas consolidadas» es un parámetro propuesto (P1).', top=868), section=2)


add('flujo', 'Ficha y aprobación', s_flujo)


def s_pr():
    steps = [('objetivo', 'Enfoque', 'Un tema con valor informativo, acordado con UTEM, y una página de destino útil.'),
             ('buscador', 'Destinos', 'Al menos diez sitios o interlocutores pertinentes, por afinidad, calidad y contexto.'),
             ('contenido', 'Material', 'Propuesta editorial basada en contenidos aprobados; vocería si se requiere.'),
             ('correo', 'Gestión', 'Presentación personalizada, seguimiento y registro de cada respuesta.'),
             ('checklist', 'Reporte', 'Publicaciones, menciones y enlaces con URL, fecha, destino y observaciones.')]
    grid = ''.join(item(t, x, f'Paso {i}', 26, DARK, g) for i, (g, t, x) in enumerate(steps, 1))
    no = ['Compra de enlaces', 'Publicaciones pagadas', 'Redes de enlaces', 'Envíos masivos automatizados', 'Garantía de publicación de terceros']
    nocard = (f'<div style="box-sizing: border-box; border-radius: 22px; padding: 22px 24px; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 22px 44px rgba(0, 6, 16, 0.6); background: linear-gradient(180deg, #10304b 0%, #081c30 100%)">' +
              okicker('No incluye') + ''.join(f'<div style="font-size: 16px; color: #dbe6f1; padding: 7px 0; border-top: 1px solid rgba(207, 228, 250, 0.16); margin-top: 4px">{x}</div>' for x in no) + '</div>')
    return page('UTEM · PR digital',
                col(eyebrow('Capítulo 2 · Autoridad digital') + headline(['Relaciones', 'editoriales,', 'no enlaces', 'comprados'], 84, extra='; margin-top: 56px') +
                    body('Una campaña de linkbuilding y PR digital, ejecutada por el equipo interno de Efeonce durante los tres meses, con reporte en el mes 3.', 21, 560, extra='; margin-top: 30px'), 120, 600) +
                zone(f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 40px; row-gap: 24px">{grid}{nocard}</div>', 820, 200, 960) +
                means('El reporte distingue una mención de un enlace y un contacto de una publicación. Como la decisión editorial es de terceros, no se compromete un número garantizado de enlaces.',
                      'Oferta técnica v1.0, §5 · «Diez destinos» es un parámetro propuesto (P1).', top=850), section=2)


add('pr', 'Campaña de PR digital', s_pr)


# ── Capítulo 3 ────────────────────────────────────────────────────────────────────────────────────────────────
def s_medicion():
    # Un tablero como objeto héroe sobre la plataforma: tres cortes arriba y seis dimensiones con su ícono y su fuente.
    dims = [('medicion', 'Visibilidad', 'Visibilidad orgánica', 'Impresiones, clics, CTR y posición; con y sin marca', 'Search Console'),
            ('web', 'Visibilidad', 'Tráfico y contenido', 'Sesiones orgánicas y desempeño de cada artículo', 'Analítica institucional'),
            ('buscador', 'Visibilidad', 'Consultas priorizadas', 'Posición, URL y fecha por consulta', 'Seguimiento documentado'),
            ('ia', 'Visibilidad', 'Respuestas de IA', 'Presencia, URLs citadas y exactitud', 'Panel de 15 consultas'),
            ('prensa', 'Ejecución', 'Autoridad', 'Gestiones, menciones y enlaces verificados', 'Registro de campaña'),
            ('checklist', 'Ejecución', 'Avance del plan', 'Artículos publicados y acciones técnicas', 'Matriz de trabajo')]
    tile = lambda g, k, n, x, f: (f'<div style="display: flex; flex-direction: column; gap: 8px; padding: 20px 22px; border-radius: 18px; background: rgba(255, 255, 255, 0.05); box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.16)">'
                                  f'<div style="display: flex; align-items: center; justify-content: space-between">{icon(g, DARK, 44)}<div style="font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #cfe4fa">{k}</div></div>'
                                  f'<div style="font-family: {ID}; font-size: 26px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05">{n}</div>'
                                  f'<div style="font-size: 16px; font-weight: 400; line-height: 1.4; color: #c9d6e2">{x}</div>'
                                  f'<div style="margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(207, 228, 250, 0.14); font-size: 13px; font-weight: 500; letter-spacing: 0.04em; color: #cfe4fa">Fuente · {f}</div></div>')
    cuts = [('Línea base', 'Inicio · mes 1', True), ('Seguimiento', 'Mes 2', False), ('Cierre', 'Mes 3', False)]
    timeline = ''.join(f'<div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; {("background: " + ACC) if on else "box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.3)"}">'
                       f'<div style="font-size: 17px; font-weight: 600">{a}</div><div style="font-size: 14px; color: {"#ffffff" if on else "#cfe4fa"}">{b}</div></div>' for a, b, on in cuts)
    panel = obj(f'<div style="display: flex; align-items: baseline; justify-content: space-between">{okicker("Tablero del servicio")}<div style="font-size: 14px; color: #cfe4fa">educacioncontinua.utem.cl</div></div>'
                f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 16px">{timeline}</div>'
                f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 18px">{"".join(tile(*d) for d in dims)}</div>',
                800, 204, 980, True, '; height: 616px')
    return page('UTEM · Medición', halo_platform(1290, 470, 1290, 836, 600, 34) + panel +
                col(eyebrow('Capítulo 3 · Medición') + headline(['Un tablero', 'con fuentes y', 'definiciones', 'claras'], 76, extra='; margin-top: 56px') +
                    body('La línea base se fija al inicio y los cortes siguientes repiten las mismas páginas, consultas y condiciones de observación.', 21, 540, extra='; margin-top: 30px') +
                    callout('Cada indicador dice de dónde sale. Si una fuente no está disponible, se registra y se usa evidencia alternativa: no se inventa un histórico.', extra='; margin-top: 26px; max-width: 540px'), 120, 600) +
                means('Los indicadores de consultas o formularios se suman si la institución tiene eventos confiables. No se atribuirá matrícula a SEO/AEO sin trazabilidad.',
                      'Oferta técnica v1.0, §6.1 y §9.1 · F1, pp. 2–3.', top=880), section=3)


add('sec3', 'Capítulo 3', lambda: img_page('UTEM · Capítulo 3', SEC[3], 'Capítulo 3: ¿Cuándo se mide el avance? Desde el inicio.'))
add('medicion', 'Medición', s_medicion)


def s_panel_ia():
    cut = ['Inicio', 'Seguimiento', 'Cierre']
    cells = ''
    for r in range(15):
        row = ''.join(f'<div style="height: 14px; border-radius: 4px; {("background: " + ACC) if c == 0 else "box-shadow: inset 0 0 0 1.5px rgba(207, 228, 250, 0.4)"}"></div>' for c in range(6))
        cells += f'<div style="display: grid; grid-template-columns: 40px repeat(6, minmax(0, 1fr)); column-gap: 8px; align-items: center"><div style="font-size: 13px; color: #cfe4fa">C{r + 1:02d}</div>{row}</div>'
    head = (f'<div style="display: grid; grid-template-columns: 40px repeat(3, minmax(0, 1fr)); column-gap: 8px; margin-bottom: 8px"><div></div>' +
            ''.join(f'<div style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {"#ffffff" if i == 0 else "#cfe4fa"}">{c}</div>' for i, c in enumerate(cut)) + '</div>'
            f'<div style="display: grid; grid-template-columns: 40px repeat(6, minmax(0, 1fr)); column-gap: 8px; margin-bottom: 10px"><div></div>' +
            ''.join(f'<div style="font-size: 12px; color: #cfe4fa">Sistema {"AB"[i % 2]}</div>' for i in range(6)) + '</div>')
    panel = obj(okicker('Panel de referencia') + otitle('15 consultas · 2 sistemas · 3 cortes', 28) +
                f'<div style="margin-top: 20px; display: grid; row-gap: 7px">{head}{cells}</div>', 1110, 210, 660, True, '; height: 620px')
    dist = [('Mención', 'UTEM aparece nombrada en la respuesta.'), ('Cita', 'La respuesta enlaza una URL de UTEM como fuente.'), ('Tráfico referido', 'Visitas que llegan al sitio desde esa respuesta.')]
    dcol = ''.join(f'<div style="padding: 14px 0; border-top: 1px solid {DARK["rule"]}"><div style="font-size: 20px; font-weight: 600">{a}</div><div style="font-size: 17px; font-weight: 300; color: #cfe4fa; margin-top: 4px">{b}</div></div>' for a, b in dist)
    return page('UTEM · Panel de IA', halo_only(1440, 480) + panel +
                col(eyebrow('Capítulo 3 · Respuestas de IA') + headline(['Quince', 'consultas para', 'ver cómo', 'responde la IA'], 76, extra='; margin-top: 56px') +
                    para('Se observan al inicio y al cierre en dos sistemas de respuesta accesibles, definidos en la línea base; el corte intermedio se revisa en el informe de seguimiento.', 19, extra='; margin-top: 26px; max-width: 520px') +
                    f'<div style="margin-top: 22px; max-width: 520px">{label("Tres señales que no son equivalentes", "#ffffff")}<div style="margin-top: 8px">{dcol}</div></div>', 120, 600) +
                zone(source('Es una muestra de trabajo documentada —consulta, sistema, fecha y evidencia—, no una medición de todas las respuestas posibles. Parámetro propuesto (P1). Oferta técnica v1.0, §6.1.'), 1110, 856, 660), section=3)


add('panel_ia', 'Panel de respuestas de IA', s_panel_ia)


def s_cronograma():
    t = LIGHT
    lines = [('Inicio y diagnóstico', ['Reunión inicial, accesos, inventario, línea base e informe de auditoría', 'Revisión de hallazgos y nuevas evidencias', 'Verificación de cierre']),
             ('Implementación', ['Priorización e inicio de ajustes', 'Ejecución y verificación', 'Ajustes finales y transferencia']),
             ('Artículos', ['5 artículos', '5 artículos', '5 artículos']),
             ('PR digital', ['Tema, material y destinos', 'Gestión y seguimiento editorial', 'Verificación y reporte']),
             ('Seguimiento', ['Coordinación y control de acciones', 'Instancia técnica e informe de seguimiento', 'Informe final y recomendaciones']),
             ('Acompañamiento', ['Continuo', 'Continuo', 'Continuo'])]
    hdr = (f'<div style="display: grid; grid-template-columns: 300px repeat(3, minmax(0, 1fr)); column-gap: 14px; padding-bottom: 14px"><div></div>' +
           ''.join(f'<div style="font-family: {ID}; font-size: 30px; font-weight: 740; letter-spacing: -0.02em; color: {t["ink"]}">Mes {m}</div>' for m in (1, 2, 3)) + '</div>')
    hl = {(0, 0), (2, 0), (2, 1), (2, 2), (4, 1), (4, 2)}
    body_ = ''
    for r, (name, cells) in enumerate(lines):
        cs = ''.join(f'<div style="border-radius: 12px; padding: 14px 16px; font-size: 17px; line-height: 1.35; {("background: " + ACC + "; color: #ffffff; font-weight: 500") if (r, c) in hl else "background: rgba(2, 60, 112, 0.06); color: " + t["ink"]}">{x}</div>' for c, x in enumerate(cells))
        body_ += f'<div style="display: grid; grid-template-columns: 300px repeat(3, minmax(0, 1fr)); column-gap: 14px; padding: 10px 0; border-top: 1px solid {t["rule"]}; align-items: stretch"><div style="font-size: 19px; font-weight: 600; color: {t["ink"]}; padding-top: 12px">{name}</div>{cs}</div>'
    return page('UTEM · Cronograma',
                zone(eyebrow('Capítulo 3 · Cronograma', t) + headline(['Tres meses desde la fecha de inicio que fije UTEM'], 56, t, '; margin-top: 30px'), 140, 90, 1500) +
                zone(hdr + body_, 140, 260, 1640) +
                means('Al inicio se acuerdan las fechas de revisión de lotes y las ventanas de publicación. Efeonce alertará a tiempo las dependencias que afecten el calendario y propondrá ajustes dentro del período, sin sustituir entregables.',
                      'Oferta técnica v1.0, §7 · F1, especificaciones técnicas p. 3.', t, top=846), LIGHT, section=3)


add('cronograma', 'Cronograma', s_cronograma)


# ── Capítulo 4 ────────────────────────────────────────────────────────────────────────────────────────────────
def s_equipo():
    fn = [('Dirección y coordinación', 'Plan de trabajo, interlocución, control de hitos y resolución de requerimientos.'),
          ('Especialista SEO/GEO/AEO', 'Auditoría, priorización, especificaciones, implementación y seguimiento.'),
          ('Producción y edición de contenidos', 'Plan editorial, investigación, redacción, revisión y optimización de artículos.'),
          ('PR y análisis', 'Relaciones editoriales, registro de campaña y consolidación de indicadores.')]
    grid = ''.join(item(a, b, None, 26) for a, b in fn)
    lead = obj(okicker('Responsable del proyecto') + otitle('Julio Reyes', 40) + otext('Contraparte de coordinación frente a UTEM.', 18) +
               otext('jreyes@efeoncepro.com · +56 9 3480 2860', 16, '; margin-top: 18px'), 820, 210, 860, True)
    cad = ''.join(f'<div style="display: grid; grid-template-columns: 220px minmax(0, 1fr); column-gap: 24px; padding: 12px 0; border-top: 1px solid {DARK["rule"]}">{label(a, "#ffffff")}<div style="font-size: 18px; font-weight: 300; color: #cfe4fa">{b}</div></div>'
                  for a, b in [('Inicio', 'Reunión inicial con accesos y calendario'), ('Cada 15 días', 'Coordinación con minuta de acuerdos'), ('Cierre', 'Reunión final y transferencia')])
    return page('UTEM · Equipo', halo_only(1300, 260) + lead +
                col(eyebrow('Capítulo 4 · Funciones') + headline(['Cada función', 'con su', 'responsable'], 80, extra='; margin-top: 56px') +
                    body('Las funciones especializadas se coordinan según la etapa, con una sola contraparte frente a UTEM.', 21, 560, extra='; margin-top: 30px') +
                    f'<div style="margin-top: 30px">{label("Cadencia de trabajo", "#ffffff")}<div style="margin-top: 10px">{cad}</div></div>', 120, 600) +
                zone(f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px; row-gap: 26px">{grid}</div>', 820, 470, 960) +
                zone(source('Oferta técnica v1.0, §8 · La coordinación quincenal es un parámetro propuesto (P1). Una matriz compartida de avances mantiene visibles los pendientes.'), 820, 900, 960), section=4)


add('sec4', 'Capítulo 4', lambda: img_page('UTEM · Capítulo 4', SEC[4], 'Capítulo 4: ¿Quién lo ejecuta? Un equipo.'))
add('equipo_foto', 'Equipo', lambda: img_page('UTEM · Equipo', TEAM, '¿Quién ejecuta el servicio? Expertos por área: Andrés, Valentina, Julio, Daniela y Melkin, equipo interno de Efeonce.'))
add('equipo', 'Funciones y coordinación', s_equipo)
add('dia_todo', 'Día a día · Todo junto', lambda: img_page('UTEM · Día a día', DIA['todo'], 'Tu día a día con Efeonce: ¿Dónde ves lo que pasa? Todo junto: Teams, Notion, Frame.io y el reporte en vivo de Efeonce Insights en tu panel de Greenhouse.'))
add('dia_vista', 'Vívelo 1 · A la vista', lambda: img_page('UTEM · A la vista', DIA['vista'], 'Tu día a día con Efeonce: ¿Cómo avanza cada artículo? A la vista: el plan editorial en Notion y la aprobación de cada artículo de Educación Continua en Frame.io.'))
add('dia_mes', 'Vívelo 2 · Cada mes', lambda: img_page('UTEM · Cada mes', DIA['mes'], 'Tu reporte mensual: ¿Cómo avanza? Cada mes Efeonce Insights arma el reporte de SEO y AEO y lo revisamos en Teams. Datos de muestra.'))
add('clientes', 'Clientes', lambda: img_page('UTEM · Clientes', CLIENTES, '¿Quién confía en nosotros? Marcas líderes: Universidad Católica de Temuco, Gobierno de Santiago, Marca Chile, ANAM, Aguas Andinas, Sky, Berel, Bresler y Carozzi.'))
add('caso_sky', 'Caso Sky', lambda: img_page('UTEM · Caso Sky', SKY, 'Caso de éxito Sky: ¿Qué cambió? Más visible. +65 % impresiones y +27 % clics orgánicos, +39 % citabilidad en ChatGPT y Perplexity, en 6 meses de estrategia SEO/AEO editorial.'))
add('caso_berel', 'Caso Berel', lambda: img_page('UTEM · Caso Berel', BEREL, 'Caso de éxito Berel: ¿Qué cambió? Lo eligen. +54 % tráfico orgánico, +120 páginas de color, el doble de citas en respuestas de IA y +38 % búsquedas de la marca, en 12 meses.'))


def s_alcance():
    cols = [('Incluye', ['Producción editorial y publicación autorizada', 'Ajustes descritos sobre páginas priorizadas', 'Acompañamiento técnico durante tres meses', 'Informes en PDF y editables; matrices en planilla reutilizable'], True),
            ('No incluye', ['Rediseño integral o migración del sitio', 'Desarrollo de funcionalidades o intervención de servidores', 'Sistemas transaccionales, intranet, aulas virtuales y sistemas académicos', 'Si la auditoría detecta esa necesidad, se entrega su especificación y prioridad'], False),
            ('Resguardo', ['Reserva sobre accesos, estadísticas e información institucional', 'Sin datos confidenciales ni personales en herramientas de IA externas sin autorización', 'Sin testimonios, resultados ni declaraciones atribuidas a UTEM sin respaldo', 'Respeto de los derechos de contenidos, imágenes y material de terceros'], False)]
    cards = ''
    for i, (k, rows, hero) in enumerate(cols):
        rr = ''.join(f'<div style="font-size: 18px; line-height: 1.42; color: #dbe6f1; padding: 12px 0; border-top: 1px solid rgba(207, 228, 250, 0.16)">{r}</div>' for r in rows)
        cards += obj(okicker(k) + f'<div style="margin-top: 12px">{rr}</div>', 140 + i * 556, 400, 524, hero, '; height: 420px')
    return page('UTEM · Alcance', halo_platform(420, 560, 960, 860, 860, 40) + cards +
                zone(eyebrow('Capítulo 4 · Alcance y resguardo') + headline(['Un alcance claro protege los entregables'], 72, extra='; margin-top: 44px') +
                     body('El servicio cubre el sitio público de Educación Continua. Los límites no reducen los entregables mínimos solicitados.', 21, 900, extra='; margin-top: 22px'), 140, 110, 1500) +
                zone(source('Oferta técnica v1.0, §9 · F1, especificaciones técnicas p. 3 (confidencialidad).'), 140, 870, 1640), section=4)


add('alcance', 'Alcance y resguardo', s_alcance)


# ── Capítulo 5 ────────────────────────────────────────────────────────────────────────────────────────────────
def s_entregables():
    t = LIGHT
    w = [0.45, 1.6, 1.1, 2.2]
    rows = [('D1', 'Informe de auditoría SEO/GEO/AEO', 'Mes 1', 'Línea base, diagnóstico, evidencias y acciones priorizadas'),
            ('D2', 'Informe de seguimiento', 'Mes 2', 'Revisión posterior a la auditoría, avances y continuidad'),
            ('D3', '15 artículos optimizados', '5 por mes', 'Texto, ficha SEO/AEO, fuentes y revisión institucional antes de publicar'),
            ('D4', 'Campaña de linkbuilding/PR y reporte', 'Meses 1–3; reporte en mes 3', 'Tema, gestión, acciones y enlaces obtenidos cuando corresponda'),
            ('D5', 'Acompañamiento técnico', 'Tres meses', 'Contraparte, coordinación, resolución de requerimientos y orientación'),
            ('D6', 'Línea base y medición', 'Inicio, seguimiento y cierre', 'Indicadores, fuentes, cobertura y comparación disponible'),
            ('D7', 'Informe final de resultados y recomendaciones', 'Mes 3', 'Resultados, inventarios y hoja de ruta')]
    tbl = thead(['Código', 'Entregable', 'Momento', 'Contenido para revisión'], w, t) + ''.join(trow(r, w, t, 19, 15) for r in rows)
    return page('UTEM · Entregables',
                zone(eyebrow('Capítulo 5 · Entregables', t) + headline(['Siete entregables con momento y contenido definidos'], 56, t, '; margin-top: 30px'), 140, 90, 1500) +
                zone(tbl, 140, 270, 1640) +
                means('La recepción conforme corresponde a la contraparte técnica designada por la Universidad. La cotización y los anexos administrativos acompañan la oferta por separado; esta propuesta no modifica recepción, facturación ni la ausencia de anticipos de las bases.',
                      'Oferta técnica v1.0, §10 · F1, especificaciones técnicas pp. 3–4.', t, top=856), LIGHT, section=5)


add('sec5', 'Capítulo 5', lambda: img_page('UTEM · Capítulo 5', SEC[5], 'Capítulo 5: ¿Qué recibe la Universidad? 7 entregables.'))
add('entregables', 'Entregables', s_entregables)


def s_matriz():
    t = LIGHT
    w = [2.3, 2.1, 0.7]
    rows = [('§1 · Estrategia SEO/GEO/AEO: diagnóstico, contenidos, autoridad y acompañamiento', 'Programa integrado por tres meses', f'{ref("resumen")}–{ref("alcance")}'),
            ('§2.a · Auditoría inicial con hallazgos y priorización', 'D1 y matriz de acciones', f'{ref("auditoria")}–{ref("prioridad")}'),
            ('§2.b · Seguimiento posterior a la auditoría', 'Instancia técnica e informe D2', f'{ref("metodo")}, {ref("cronograma")}'),
            ('§2.c · 15 artículos, cinco mensuales, temas acordados y aprobación previa', 'D3, ficha por artículo y flujo de aprobación', f'{ref("articulos")}–{ref("flujo")}'),
            ('§2.c · Palabra clave, intención, estructura, títulos, enlaces; GEO/AEO, originalidad y tono', 'Componentes de cada entrega y control humano', f'{ref("flujo")}'),
            ('§2.d · Campaña con sitios pertinentes y reporte de enlaces', 'D4, gestión editorial trazable y reporte', f'{ref("pr")}'),
            ('§2.d y §2.i · Sin automatismos dañinos ni prácticas penalizables', 'Sin redes de enlaces ni manipulación', f'{ref("pr")}, {ref("alcance")}'),
            ('§2.e · Acompañamiento y profesional responsable', 'D5 y contraparte Julio Reyes', f'{ref("equipo")}'),
            ('§2.f · Línea base e indicadores según disponibilidad', 'D6, fuentes y límites de medición', f'{ref("medicion")}–{ref("panel_ia")}'),
            ('§2.g · Informe final y conjunto mínimo de entregables', 'D1–D7 e inventario de cierre', f'{ref("entregables")}'),
            ('§2.h · Tres meses desde el inicio fijado por UTEM', 'Calendario relativo a la fecha de inicio', f'{ref("cronograma")}'),
            ('§2.i · Reserva de la información institucional', 'Confidencialidad y control de accesos', f'{ref("alcance")}'),
            ('§3–7 · Fichas técnicas, despacho, recepción y facturación', 'Esta propuesta; cotización y anexos en el paquete; condiciones de bases conservadas', f'{ref("entregables")}')]
    tbl = thead(['Requisito de las especificaciones', 'Respuesta y entregable', 'Lámina'], w, t) + ''.join(trow(r, w, t, 16, 9) for r in rows)
    return page('UTEM · Matriz de cumplimiento',
                zone(eyebrow('Anexo · Matriz de cumplimiento', t) + headline(['Cada requisito, con su respuesta'], 56, t, '; margin-top: 30px'), 140, 90, 1500) +
                zone(tbl, 140, 250, 1640) +
                zone(source('Describe el compromiso de ejecución propuesto; no acredita que el servicio ya se haya prestado. F1 · Especificaciones Técnicas Mínimas 9284, Compra Ágil 5251-1060-COT26.', t), 140, 960, 680), LIGHT, section=5)


def s_siguiente():
    steps = [('contrato', '1 · Adjudicación', 'UTEM emite la orden de compra y fija la fecha de inicio del servicio.', False),
             ('calendario', '2 · Reunión inicial', 'Contraparte, accesos, URLs prioritarias y calendario académico, en la primera semana.', True),
             ('medicion', '3 · Mes 1 en marcha', 'Auditoría, línea base y los primeros cinco artículos en producción.', False)]
    cards = ''.join(obj(icon(g) + otitle(t, 28) + otext(x, 17), 820 + i * 330, 230 if hero else 290, 300, hero, '; height: ' + ('330px' if hero else '270px'))
                    for i, (g, t, x, hero) in enumerate(steps))
    need = ['Contraparte designada', 'Acceso al CMS', 'Search Console', 'Analítica del sitio', 'URLs prioritarias', 'Calendario de admisión']
    chips = ''.join(f'<div style="padding: 10px 14px; border-radius: 10px; font-size: 16px; font-weight: 500; background: rgba(255, 255, 255, 0.06); box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.2)">{x}</div>' for x in need)
    return page('UTEM · Siguiente paso', halo_platform(1300, 420, 1300, 590, 560, 34) + cards +
                zone(label('Qué necesitamos de UTEM para el primer día', '#ffffff') + f'<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px">{chips}</div>', 820, 680, 960) +
                col(eyebrow('Capítulo 5 · Siguiente paso') + headline(['Tres pasos', 'para empezar'], 84, extra='; margin-top: 56px') +
                    body('Desde la adjudicación, el servicio queda en marcha dentro del primer mes, con una contraparte responsable en cada lado.', 21, 560, extra='; margin-top: 30px') +
                    f'<div style="margin-top: 34px; padding-top: 18px; border-top: 1px solid {DARK["rule"]}">{label("Contacto", "#ffffff")}'
                    f'<div style="font-family: {ID}; font-size: 30px; font-weight: 740; margin-top: 8px">Julio Reyes</div>'
                    f'<div style="font-size: 18px; font-weight: 300; color: #cfe4fa; margin-top: 6px">jreyes@efeoncepro.com · +56 9 3480 2860</div></div>', 120, 600) +
                means('El calendario de trabajo se ajusta a la fecha de inicio que fije UTEM; los tres meses corren desde ese día.', 'Oferta técnica v1.0, §7–8.', top=884), section=5)


add('siguiente', 'Siguiente paso', s_siguiente)
add('matriz', 'Matriz de cumplimiento', s_matriz)


def s_fuentes():
    # Anexo en oscuro: las cinco fuentes como fichas y, sobre la plataforma, los parámetros propuestos (héroe) y lo que no se garantiza.
    fs = [('F1', 'Especificaciones Técnicas Mínimas 9284 · Compra Ágil 5251-1060-COT26', 'Objeto, plazos, entregables y condiciones'),
          ('F2', 'Sitio de Educación Continua UTEM', 'Oferta pública y sitio de intervención'),
          ('F3', 'Dirección de Educación Continua, Vinculación con el Medio', 'Propósito institucional y públicos'),
          ('F4', 'Google Search Central: AI features and your website', 'Fundamentos y elegibilidad'),
          ('F5', 'Google Search Central: generative AI features', 'Coherencia entre SEO y experiencias generativas')]
    card = lambda c, t, u: (f'<div style="box-sizing: border-box; height: 176px; padding: 18px 20px; border-radius: 18px; background: rgba(255, 255, 255, 0.05); box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.16); display: flex; flex-direction: column; gap: 6px">'
                            f'<div style="font-family: {ID}; font-size: 34px; font-weight: 760; letter-spacing: -0.03em; line-height: 1">{c}</div>'
                            f'<div style="font-size: 16px; font-weight: 500; line-height: 1.35">{t}</div>'
                            f'<div style="margin-top: auto; font-size: 13px; font-weight: 400; line-height: 1.35; color: #cfe4fa">{u}</div></div>')
    date = (f'<div style="box-sizing: border-box; height: 176px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: flex-end">'
            f'{label("Consulta de fuentes públicas", "#cfe4fa")}<div style="font-family: {ID}; font-size: 26px; font-weight: 740; margin-top: 8px">8 de octubre de 2026</div></div>')
    grid = f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px">{"".join(card(*f) for f in fs)}{date}</div>'
    lst = lambda xs: ''.join(f'<div style="font-size: 16px; line-height: 1.4; color: #dbe6f1; padding: 9px 0; border-top: 1px solid rgba(207, 228, 250, 0.16)">{x}</div>' for x in xs)
    p1 = ['Hasta 10 páginas existentes, además de los 15 artículos', 'Dos rondas consolidadas de revisión por artículo',
          'Al menos 10 destinos editoriales en la campaña', 'Panel de 15 consultas, 2 sistemas y 3 cortes', 'Coordinación cada 15 días, más inicio y cierre']
    # «No se garantizan» retirado a pedido del operador (2026-10-08): restaba más de lo que aportaba.
    objs = obj(okicker('P1 · Parámetros propuestos por Efeonce') + f'<div style="margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 36px">{lst(p1)}</div>', 820, 574, 960, True, '; height: 214px; padding: 22px 26px')
    return page('UTEM · Fuentes y supuestos', halo_platform(1300, 600, 1300, 800, 560, 34) + zone(grid, 820, 184, 960) + objs +
                col(eyebrow('Anexo · Fuentes y supuestos') + headline(['Lo que', 'sostiene esta', 'propuesta'], 84, extra='; margin-top: 56px') +
                    body('Las cantidades del contrato salen de las especificaciones. Los parámetros P1 son la propuesta de ejecución de Efeonce, no exigencias atribuidas a UTEM.', 21, 560, extra='; margin-top: 30px') +
                    callout('El compromiso es ejecutar y documentar el alcance acordado, con evidencia de cada entrega.', extra='; margin-top: 26px; max-width: 540px'), 120, 600), section=5)


add('fuentes', 'Fuentes y supuestos', s_fuentes)


# ── Cierre ─────────────────────────────────────────────────────────────────────────────────────────────────────
def s_cierre():
    r = 300; cx, cy = 960, 430; lw = 300; lh = round(lw * 196.68 / 837.07)
    orb = (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
           f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#72ded8" stroke-opacity="0.16" stroke-width="2"/></svg>')
    return page('UTEM · Cierre', halo_only(cx, cy, 0.3) + orb +
                f'<img src="{LOGO_NEG}" alt="Efeonce" style="position: absolute; left: {cx - lw // 2}px; top: {cy - lh // 2}px; width: {lw}px; height: {lh}px">' +
                zone(f'<div style="text-align: center; font-family: {ID}; font-size: 64px; font-weight: 700; letter-spacing: -0.03em"><span style="color: #cfe4fa; font-weight: 400">Empower your </span><span style="color: {ACC}">Engine</span></div>'
                     f'<div style="text-align: center; font-size: 20px; font-weight: 300; color: #cfe4fa; margin-top: 30px">Julio Reyes · Responsable del proyecto · jreyes@efeoncepro.com · +56 9 3480 2860</div>', 160, 800, 1600), sign=False)


add('cierre', 'Cierre', lambda: img_page('UTEM · Cierre', CLOSE, 'Cierre de la propuesta: Empower your Engine, con los datos de contacto de Efeonce.'))

# ── Escritura ──────────────────────────────────────────────────────────────────────────────────────────────────
for i, (k, _, _) in enumerate(S, 1):
    N[k] = i
files, boards, order = [], {}, []
COLS = 4
for i, (k, title, fn) in enumerate(S):
    name = 'Main.dc.html' if i == 0 else f'Tec-{i + 1:02d}.dc.html'
    open(os.path.join(ROOT, name), 'w').write(fn())
    boards[name] = {'x': (i % COLS) * (1920 + 120), 'y': (i // COLS) * (1080 + 200), 'w': 1920, 'h': 1080, 'title': f'{i + 1:02d} · {title}'}
    order.append(name)
    files.append(name)
json.dump({'boards': boards, 'order': order}, open(os.path.join(ROOT, '_layout.json'), 'w'), ensure_ascii=False, indent=1)
print(len(files), 'láminas')
