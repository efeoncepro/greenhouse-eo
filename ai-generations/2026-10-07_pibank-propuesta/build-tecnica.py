# Pibank · Propuesta técnica 2027 en el canvas Design (v5, 2026-10-07: lectura sin presentador).
# Molde de La órbita, línea Engine. Cambios de v4 sobre v3 (auditoría con la skill efeonce-graphic-line):
#  1. color de la línea: luz, foco y acento en azul Engine; el teal queda sólo como tinta de anillo del token;
#  2. la órbita trabaja: navegación del deck (5 secciones) y medida del aporte, ambas desde AXIS (axis-assets.json);
#  3. halo y plataforma sólo donde hay un objeto héroe (embudo, arquitectura, herramientas);
#  4. selección colaborativa canónica (paint-selection.mjs) e íconos Trazo del catálogo (resolveIcon);
#  5. ritmo: diagnóstico, calendario y responsabilidades en papel.
# Las láminas con par pregunta–respuesta salen del compositor y entran como imagen.
# Uso: python3 build-tecnica.py <carpeta project del canvas>; después node paint-selection.mjs <carpeta>.
import base64, json, os, sys

ROOT = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
AX = json.load(open(os.path.join(HERE, 'axis-assets.json')))
BL = lambda i: f'/_blob/{i}'
BUB = '434cdccb13af2a417f555053d9a45582'
IMG = {'C01': 'd8a543dde98647bb5c4f3a2338930929', 'C04': '443f206029e67e2f2177a8749d01157e', 'C06': '5f3c83b94f1bcab135421beb67d092aa',
       'C07': 'f116209d1cd6415a3bbe77dd498f8503', 'C08': '37cf716674faaa8d5f2a522eb8833d0a', 'C09': 'f343972502695c0194d54cdd5d86a5d8'}
ACC = '#0375db'
DARK = dict(name='dark', bg='#091951', ink='#ffffff', soft='#cfe4fa', rule='rgba(114, 222, 216, 0.16)', eb='#ffffff')
LIGHT = dict(name='light', bg='#f7f8f6', ink='#023c70', soft='#5f5a69', rule='rgba(2, 60, 112, 0.14)', eb='#5f5a69')
ID = "'Bricolage Grotesque', system-ui, sans-serif"; ST = "'Poppins', system-ui, sans-serif"
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">'
MARK = '<!--GL-SELECTION-->'


def page(title, body, t=DARK, section=None):
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
{MARK if 'data-gl-sel' in body else ''}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''


def img_page(title, blob, alt):
    return page(title, f'<img src="{BL(blob)}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px">')


def sphere():
    return f'<span style="display: inline-block; width: 0.2em; height: 0.2em; border-radius: 50%; background: {ACC}; margin-left: 0.04em"></span>'


def eyebrow(text, t=DARK):
    # Anillo de La órbita en el título superior y esfera al cierre del titular, nunca ambos en el mismo texto (criterio del 2026-10-05).
    ring = f'<span style="display: inline-block; width: 14px; height: 14px; box-sizing: border-box; border: 3px solid {ACC}; border-radius: 50%; margin-right: 16px; vertical-align: -1px"></span>'
    return f'<div style="font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: {t["eb"]}">{ring}{text}</div>'


def headline(lines, px, t=DARK, extra=''):
    return f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.94; color: {t["ink"]}{extra}">{"<br>".join(lines)}{sphere()}</div>'


def body(text, px=26, width=560, t=DARK, extra=''):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: {t["ink"]}; max-width: {width}px{extra}">{text}</div>'


def source(text, t=DARK, extra=''):
    return f'<div style="font-size: 15px; font-weight: 400; line-height: 1.5; color: {t["soft"]}{extra}">{text}</div>'


def label(text, color=None, t=DARK, extra=''):
    return f'<div style="font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: {color or t["soft"]}{extra}">{text}</div>'


def bubble():
    return f'<img src="{BL(BUB)}" alt="efeoncepro.com" style="position: absolute; left: 135px; top: 990px; width: 162px; height: 38px">'


def col(inner, top=120, width=640):
    return f'<div style="position: absolute; left: 140px; top: {top}px; width: {width}px; display: flex; flex-direction: column">{inner}</div>'


def zone(inner, left, top, width, extra=''):
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px{extra}">{inner}</div>'


def icon(glyph, t=DARK):
    return f'<div style="width: 52px; height: 52px; margin: 0 0 4px -4px">{AX["icons"][glyph + "-" + t["name"]]}</div>'


def sel(label_text, anchor='bottom-end', kind='object'):
    return f' data-gl-sel="{label_text}" data-gl-anchor="{anchor}" data-gl-kind="{kind}"'


def halo_platform(cx=1290, cy=440, pcx=1290, pcy=900, prx=520, pry=70):
    """El halo de la línea Engine sobre el objeto héroe y la plataforma de luz donde se apoyan los objetos."""
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


def item(title, text, lab=None, px=36, t=DARK, ic=None, attrs=''):
    return (f'<div{attrs} style="display: flex; flex-direction: column; gap: 10px; padding-top: 22px; border-top: 1px solid {t["rule"]}">' +
            (icon(ic, t) if ic else '') + (label(lab, t=t) if lab else '') +
            f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.04; color: {t["ink"]}">{title}</div>'
            f'<div style="font-size: 20px; font-weight: 300; line-height: 1.45; color: {t["soft"]}">{text}</div></div>')


def trow(cells, widths, t, attrs='', px=21, pad=20):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    cs = ''.join(f'<div style="font-size: {px}px; line-height: 1.42; {"font-weight: 600; color: " + t["ink"] if j == 0 else "font-weight: 400; color: " + t["soft"]}">{c}</div>' for j, c in enumerate(cells))
    return f'<div{attrs} style="display: grid; grid-template-columns: {tpl}; column-gap: 40px; padding: {pad}px 26px; border-top: 1px solid {t["rule"]}; align-items: start">{cs}</div>'


def thead(cells, widths, t):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    return f'<div style="display: grid; grid-template-columns: {tpl}; column-gap: 40px; padding: 0 26px 24px">{"".join(f"<div>{label(c, t=t)}</div>" for c in cells)}</div>'



# ── v5 · lectura sin presentador (2026-10-07) ─────────────────────────────────────────────────────────
# Cada título afirma la conclusión; cada lámina con datos explica al pie qué significa para Pibank; los
# términos técnicos se explican en la lámina y en el glosario (27). Guion aprobado por el operador.
RISK = '897dc38a8cb15f7d7f78465b2c04377c'
W_ = '#ffffff'; SOFT_ = '#cfe4fa'; RULE_ = DARK['rule']


def means(text, src=''):
    return zone(f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) 500px; column-gap: 60px; padding-top: 16px; border-top: 1px solid {RULE_}">'
                f'<div>{label("Qué significa para Pibank", W_)}<div style="font-size: 21px; font-weight: 400; line-height: 1.4; color: {W_}; margin-top: 8px">{text}</div></div>'
                f'<div style="padding-top: 22px">{source(src)}</div></div>', 140, 868, 1640)


def halo_only(cx, cy):
    return (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true"><defs>'
            f'<radialGradient id="ho" cx="{cx}" cy="{cy}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{ACC}" stop-opacity="0.26"/>'
            f'<stop offset="0.45" stop-color="{ACC}" stop-opacity="0.08"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="1920" height="1080" fill="url(#ho)"/></svg>')


def navmini(n):
    return f'<svg viewBox="1712 82 96 96" width="60" height="60" aria-hidden="true">{AX["nav"]["dark-" + str(n)]}</svg>'


def para(text, px=21, extra=''):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: {SOFT_}{extra}">{text}</div>'


def bigrow(lab, text, w=230):
    return (f'<div style="display: grid; grid-template-columns: {w}px minmax(0, 1fr); column-gap: 30px; padding: 18px 0; border-top: 1px solid {RULE_}">'
            f'{label(lab, W_, extra="; padding-top: 5px")}<div style="font-size: 21px; font-weight: 300; line-height: 1.45; color: {SOFT_}">{text}</div></div>')


def callout(text, extra=''):
    return f'<div style="border-left: 3px solid {ACC}; padding: 4px 0 4px 16px; font-size: 18px; font-weight: 400; line-height: 1.45; color: {W_}{extra}">{text}</div>'


S = []

# 01 · Portada (compositor)
S.append(('Portada', img_page('Pibank · Portada', IMG['C01'], 'Portada de la propuesta técnica para Pibank: ¿Dónde nace una cuenta? En la búsqueda.')))

# 02 · Cómo leer esta propuesta
chap = [(1, '¿Dónde está Pibank hoy en la búsqueda?', 'Láminas ⟦Encuentran a Pibank al buscar⟧ a ⟦Diagnóstico técnico⟧'),
        (2, '¿Cómo se vuelve Pibank la respuesta?', 'Láminas ⟦Cómo aparece Pibank⟧ a ⟦Ciclo mensual⟧'),
        (3, '¿Cómo sabremos que funciona?', 'Láminas ⟦Calendario⟧ a ⟦Reporte mensual⟧ · en visibilidad y en cuentas, con el aporte que pidió Jesús'),
        (4, '¿Quién lo hace y por qué nosotros?', 'Láminas ⟦Equipo de la cuenta⟧ a ⟦Cinco países⟧'),
        (5, '¿Cuánto cuesta y cómo seguimos?', 'Láminas ⟦Inversión⟧ a ⟦Siguiente paso⟧')]
rows = ''.join(f'<div style="display: grid; grid-template-columns: 60px minmax(0, 1fr); column-gap: 28px; align-items: center; padding: 24px 0; border-top: 1px solid {RULE_}">{navmini(n)}'
               f'<div><div style="font-family: {ID}; font-size: 36px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1">{q}</div>'
               f'<div style="font-size: 18px; font-weight: 300; color: {SOFT_}; margin-top: 6px">Capítulo {n} · {p}</div></div></div>' for n, q, p in chap)
S.append(('Cómo leer esta propuesta', page('Pibank · Cómo leer',
    col(eyebrow('Cómo leer esta propuesta') + headline(['Cinco preguntas,', 'una por', 'capítulo'], 104, extra='; margin-top: 64px') +
        body('Cada título dice la conclusión de su lámina, y las láminas con datos explican al pie qué significan para Pibank.', 22, 560, extra='; margin-top: 40px') +
        para('El círculo de la esquina superior derecha indica en qué capítulo vas. Los supuestos están reunidos en la lámina ⟦Supuestos y fuentes⟧ y los términos técnicos, en el glosario de la lámina ⟦Glosario⟧.', 19, '; margin-top: 22px; max-width: 540px'), 120, 600) +
    zone(rows + f'<div style="padding-top: 18px; border-top: 1px solid {RULE_}">{label("Anexos · Supuestos y fuentes, lámina ⟦Supuestos y fuentes⟧ · Glosario, lámina ⟦Glosario⟧", SOFT_)}</div>', 820, 200, 960) + bubble())))

# 03 · Resumen para gerencia — tres objetos sobre la plataforma: problema, meta (héroe) e inversión, cada uno con su mini dato
MONTHLY = [6000, 7200, 7700, 7700, 7700, 6200, 5700, 7700, 5700, 5700, 6200, 5700]
assert sum(MONTHLY) == 79200
sq = ''.join(f'<div style="width: 16px; height: 16px; border-radius: 4px; box-shadow: inset 0 0 0 1.5px rgba(207, 228, 250, 0.45)"></div>' for _ in range(17))
mini_prob = f'<div style="display: grid; grid-template-columns: repeat(9, 16px); gap: 6px; margin-top: 18px">{sq}</div>' + otext('17 capturas de búsquedas genéricas en Google Perú: en ninguna aparece Pibank.', 16)
chipx = lambda x, on=True: (f'<div style="padding: 8px 12px; border-radius: 10px; font-size: 15px; font-weight: 500; line-height: 1.3; '
                           + ('background: rgba(255, 255, 255, 0.08)' if on else 'box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.3)') + f'">{x}</div>')
mini_meta = (f'<div style="font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: {W_}; margin-top: 18px">Visibilidad · SEO y AEO</div>'
             f'<div style="display: grid; gap: 7px; margin-top: 8px">{chipx("Posiciones frente a otros bancos")}{chipx("Menciones correctas en IA")}{chipx("Visitas orgánicas sin marca")}</div>'
             f'<div style="font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: {W_}; margin-top: 16px">Negocio</div>'
             f'<div style="display: grid; gap: 7px; margin-top: 8px">{chipx("Aperturas y cuentas con fondos")}</div>'
             + otext('Meta del banco: 15.200 cuentas con fondos. Aporte estimado en la lámina ⟦Evaluación 2026⟧.', 15))
mb = ''.join(f'<div style="display: flex; flex-direction: column; justify-content: flex-end; height: 70px"><div style="height: {round(70 * (v - 4500) / 7700)}px; border-radius: 3px 3px 0 0; background: {ACC}"></div><div style="height: {round(70 * 4500 / 7700)}px; border-radius: 0 0 3px 3px; background: rgba(207, 228, 250, 0.38)"></div></div>' for v in MONTHLY)
mini_inv = f'<div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; margin-top: 18px">{mb}</div>' + otext('Al año, en la ruta recomendada: US$4.500 al mes de base más proyectos y campañas con fecha.', 16)
fig = lambda v, px: f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9; margin-top: 14px; white-space: nowrap">{v}</div>'
cards3 = (obj(okicker('El problema') + fig('0 de 17', 64) + mini_prob, 820, 360, 300, False, '; height: 430px') +
          obj(okicker('Qué medimos') + otitle('Dos tableros', 40) + mini_meta, 1150, 250, 300, True, '; height: 560px') +
          obj(okicker('La inversión') + fig('US$79.200', 52) + mini_inv, 1480, 360, 300, False, '; height: 430px'))
S.append(('Resumen para gerencia', page('Pibank · Resumen', halo_platform(1300, 520, 1300, 800, 560, 50) + cards3 +
    col(eyebrow('Resumen para gerencia') + headline(['Doce meses para', 'que Pibank sea', 'la respuesta', 'cuando alguien', 'busca dónde ahorrar'], 64, extra='; margin-top: 56px') +
        body('Un programa SEO, GEO y AEO sobre pibank.pe: que Pibank aparezca en Google y en las respuestas de IA, gane terreno frente a otros bancos y tenga un sitio que convence. Se mide en visibilidad y en cuentas con fondos.', 20, 560, extra='; margin-top: 28px') +
        f'<div style="margin-top: 34px; padding-top: 18px; border-top: 1px solid {RULE_}">{label("Qué decide la gerencia", W_)}'
        f'<div style="font-family: {ID}; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin-top: 10px">Aprobar el programa anual, elegir la ruta y habilitar los datos para medir el aporte.</div></div>', 120, 600) +
    bubble())))

# 04 · Sin oficinas, la búsqueda es la puerta de entrada — capítulo 1 · el recorrido en profundidad; la luz cae donde actúa el programa
st4 = [('buscador', '01 · SEO y AEO', 'Aparecer', 'En Google y en la IA, cuando alguien busca o pregunta dónde ahorrar.', 'Impresiones, posiciones y menciones en IA', 350),
       ('objetivo', '02 · SEO y AEO', 'Ser elegido', 'Que el resultado o la cita de Pibank gane el clic frente a bancos y comparadores.', 'Clics, visitas sin marca y cuota frente a otros bancos', 365),
       ('web', '03 · SEO y contenido', 'Convencer', 'Que pibank.pe resuelva la duda: contenido, calculadora y comparador.', 'Uso de herramientas y paso al registro', 380),
       ('finanzas', '04 · Lo opera Pibank', 'Abrir y fondear', 'Registro, app y primer depósito: recién ahí hay una cuenta con fondos.', 'Aperturas y cuentas con fondos', 395)]
BASE = 790; x = 140; cards4 = ''; arrows4 = ''
for i, (g, k, t, d, m, h) in enumerate(st4):
    inner = (icon(g) + okicker(k) + otitle(t, 40) + otext(d, 16) +
             f'<div style="position: absolute; left: 28px; right: 28px; bottom: 24px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.14)">'
             f'<div style="font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: {SOFT_}">Se mide en</div>'
             f'<div style="font-size: 17px; font-weight: 600; line-height: 1.3; margin-top: 4px">{m}</div></div>')
    cards4 += obj(inner, x, BASE - h, 385, i == 0, f'; height: {h}px' + ('' if i < 3 else '; opacity: 0.72'))
    if i < 3:
        arrows4 += f'<div style="position: absolute; left: {x + 385 + 2}px; top: {BASE - 150}px; font-size: 22px; color: {SOFT_}">→</div>'
    x += 385 + 22
S.append(('De la búsqueda a la cuenta', page('Pibank · La cadena', halo_platform(520, 560, 940, BASE, 860, 46) + cards4 + arrows4 +
    col(eyebrow('Por qué ahora') + headline(['De la búsqueda a la cuenta,', 'cuatro eslabones'], 66, extra='; margin-top: 40px') +
        body('En un banco sin oficinas, la cuenta nace en una búsqueda o una pregunta. SEO y AEO trabajan los tres primeros eslabones y cada uno tiene su propia métrica; el cuarto lo opera Pibank.', 21, 1200, extra='; margin-top: 24px'), 110, 1500) +
    means('Hoy Pibank se pierde en el primer eslabón: no aparece (lámina ⟦Hoy no encuentra a Pibank⟧). Por eso el programa empieza por la visibilidad, sin descuidar los otros dos.',
          'Recorrido descrito por Pibank en la reunión del 06-10-2026. Métricas detalladas en las láminas ⟦Medición y atribución⟧ y ⟦Métricas SEO y AEO⟧.') + bubble(), section=1)))

# 05 · Hoy no encuentra a Pibank — capítulo 1 · una búsqueda real como objeto héroe; el hueco de Pibank, en foco
SERP = json.load(open(os.path.join(HERE, '../../docs/commercial/prospects/banco-pichincha-peru-seo-2026/research/pibank-expanded-2026-10-06/serp-evidence.json')))
caps = [c for c in SERP['captures'] if 'pibank' not in c['query']]
assert len(caps) == 17 and all(c['pibank_presence'] == 'not_observed_in_captured_organic' and not c['pibank_rows'] for c in caps)
TOTAL = sum(c['organic_rows_returned'] for c in caps)
hero = next(c for c in caps if c['query'] == 'mejor cuenta de ahorros peru' and c['device'] == 'desktop')
SHOW = 7
rows5 = ''.join(f'<div style="display: grid; grid-template-columns: 30px 230px minmax(0, 1fr); column-gap: 14px; align-items: baseline; padding: 11px 0; border-top: 1px solid rgba(255, 255, 255, 0.08)">'
                f'<div style="font-size: 15px; color: {SOFT_}">{r["rank_group"]}</div><div style="font-size: 18px; font-weight: 600">{r["domain"].removeprefix("www.")}</div>'
                f'<div style="font-size: 15px; font-weight: 300; color: {SOFT_}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{r["title"]}</div></div>' for r in hero['organic'][:SHOW])
pill = (f'<div style="display: flex; align-items: center; gap: 14px; padding: 12px 22px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16)">'
        f'<div style="width: 30px; height: 30px">{AX["icons"]["buscador-dark"].replace(chr(39) + "52" + chr(39), "30").replace(chr(34) + "52" + chr(34), chr(34) + "30" + chr(34))}</div>'
        f'<div style="font-size: 24px; font-weight: 400">{hero["query"]}</div></div>')
slot = (f'<div style="margin-top: 18px; display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: 14px; border: 2px dashed {ACC}; box-shadow: 0 0 46px rgba(3, 117, 219, 0.35), inset 0 0 30px rgba(3, 117, 219, 0.12)">'
        f'<img src="data:image/svg+xml;base64,{base64.b64encode(open(os.path.join(HERE, "logos-cliente/pibank-logo-blanco.svg"), "rb").read()).decode()}" alt="Pibank" style="height: 30px; width: auto; align-self: center">'
        f'<div style="font-size: 20px; color: {SOFT_}">no aparece en ninguno de los {hero["organic_rows_returned"]} resultados</div></div>')
card5 = obj(pill + f'<div style="font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: {SOFT_}; margin: 16px 0 6px 4px">Google Perú · escritorio · 06-10-2026 · resultados orgánicos</div>' +
            rows5 + f'<div style="font-size: 15px; color: {SOFT_}; padding: 10px 0 0 44px; border-top: 1px solid rgba(255, 255, 255, 0.08)">y {hero["organic_rows_returned"] - SHOW} resultados más</div>' + slot,
            900, 180, 820, True)
S.append(('Hoy no encuentra a Pibank', page('Pibank · Visibilidad', halo_platform(1310, 470, 1310, 800, 560, 50) + card5 +
    col(eyebrow('Por qué ahora') + headline(['Hoy, quien busca', 'dónde ahorrar', 'no encuentra', 'a Pibank'], 76, extra='; margin-top: 56px') +
        f'<div style="display: flex; align-items: baseline; gap: 18px; margin-top: 44px"><div style="font-family: {ID}; font-size: 150px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.85">0</div>'
        f'<div style="font-family: {ID}; font-size: 30px; font-weight: 640; letter-spacing: -0.02em; line-height: 1.15; color: {SOFT_}">de {TOTAL} resultados en<br>17 capturas de búsqueda</div></div>' +
        para('Repetimos la prueba con 9 consultas genéricas, en móvil y escritorio. Pibank no apareció en ninguna. Y solo un sitio enlaza a pibank.pe.', 19, '; margin-top: 24px; max-width: 540px'), 120, 620) +
    means('Las búsquedas de ahorro tienen un espacio que hoy ocupan otros. El contenido de comparación y las referencias de medios son la forma de entrar.',
          f'Muestra Efeonce en Google Perú, 06-10-2026: 17 capturas (9 consultas genéricas, móvil y escritorio), {TOTAL} resultados orgánicos. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=1)))

# 06 · Demanda — capítulo 1
grp = [('Productos rivales', 18300, 'Cuentas de BCP, Interbank, Scotiabank y BBVA', 'objetivo'), ('Educativa', 5680, 'TREA, respaldo y hábitos de ahorro', 'contenido'),
       ('Directa', 3740, 'Cuenta de ahorros, requisitos, intereses y costos', 'finanzas'), ('Condicional', 3330, 'Ahorro digital y rendimiento, según encaje', 'web')]
import base64
LOGO_DIR = os.path.join(HERE, 'logos-terceros')
def logo(fn, h=20):
    data = base64.b64encode(open(os.path.join(LOGO_DIR, fn), 'rb').read()).decode()
    return f'<img src="data:image/svg+xml;base64,{data}" alt="" style="height: {h}px; width: auto; filter: brightness(0) invert(1); opacity: 0.9">'
LOGOS6 = (f'<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 10px">'
          f'{logo("Logo-bcp-vector.svg")}{logo("Interbank_logo.svg")}{logo("scotiabank-full-positive.svg")}{logo("BBVA_2019.svg")}</div>')
bars = ''
for i, (n, v, d, g) in enumerate(grp):
    w = round(440 * v / 18300)
    c = ACC if i == 0 else 'rgba(207, 228, 250, 0.42)'
    glow = '; box-shadow: 0 0 40px rgba(3, 117, 219, 0.55)' if i == 0 else ''
    bars += (f'<div style="display: grid; grid-template-columns: 56px 240px minmax(0, 1fr); column-gap: 20px; align-items: center; padding: 18px 0; border-top: 1px solid {RULE_}">{icon(g)}'
             f'<div><div style="font-family: {ID}; font-size: 28px; font-weight: 740; letter-spacing: -0.02em">{n}</div>' + (LOGOS6 if i == 0 else f'<div style="font-size: 16px; font-weight: 300; color: {SOFT_}; margin-top: 4px">{d}</div>') + '</div>'
             f'<div style="display: flex; align-items: center; gap: 20px"><div style="width: {w}px; height: 28px; border-radius: 8px; background: {c}{glow}"></div>'
             f'<div style="font-family: {ID}; font-size: 38px; font-weight: 760; letter-spacing: -0.03em">{format(v, ",").replace(",", ".")}</div></div></div>')
    if i == 0:
        bars += callout('Aquí está el ahorrador que Pibank quiere ganar: tiene su dinero en un banco grande y compara antes de moverlo.', '; margin: 2px 0 18px 316px')
S.append(('La demanda', page('Pibank · Demanda',
    col(eyebrow('Por qué ahora') + headline(['La mayor demanda', 'está en quienes', 'miran cuentas de', 'otros bancos'], 84, extra='; margin-top: 64px') +
        body('Medimos cuántas veces al mes se buscan en Google Perú términos de ahorro y los agrupamos según lo que la persona busca. El grupo más grande no busca a Pibank: busca las cuentas de los bancos grandes. Público que indicó el banco: NSE A/B, de 35 a 55 años.', 21, 560, extra='; margin-top: 40px'), 120, 620) +
    zone(label('Búsquedas mensuales estimadas en Perú, por grupo') + f'<div style="margin-top: 18px">{bars}</div>', 820, 230, 960) +
    means('Por eso la comparación —rendimiento, costos y liquidez— y el comparador son prioridad: es donde está el ahorrador que hoy tiene su dinero en un banco grande.',
          'Investigación Efeonce, corte 06-10: 1.594 consultas en 19 familias. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=1)))

# 07 · Tres palancas — capítulo 1 · escalera de objetos con ícono; la tasa de cada salto, a la vista
st = [('buscador', 'Aparecer y ser elegido', '1.169.231', 'visitas', 'De búsqueda, IA, pauta y referidos', 300),
      ('contrato', 'Convencer', '23.385', 'aperturas', 'Si abre el 2 % de quienes visitan', 390),
      ('finanzas', 'Abrir y fondear', '15.200', 'cuentas con fondos', 'Si deposita el 65 % de quienes abren', 480),
      ('revenue', 'Resultado', 'US$38&nbsp;m', 'en depósitos iniciales', 'Con US$2.500 por cuenta', 560)]
jumps = ['2 % abre', '65 % deposita', '× US$2.500']
stc = ''
for i, (g, k, v, l, d, h) in enumerate(st):
    inner = (icon(g) + okicker(k) + f'<div style="font-family: {ID}; font-weight: 760; font-size: {42 if i in (0, 3) else 56}px; letter-spacing: -0.04em; line-height: 0.92; margin-top: 14px">{v}</div>' +
             f'<div style="font-size: 19px; font-weight: 600; margin-top: 10px">{l}</div>' + otext(d, 16))
    stc += obj(inner, 820 + i * 245, 790 - h, 228, i == 2, f'; height: {h}px')
    if i < 3:
        stc += (f'<div style="position: absolute; left: {820 + i * 245 + 150}px; top: {790 - st[i + 1][5] - 44}px; padding: 6px 12px; border-radius: 999px; '
                f'background: rgba(3, 117, 219, 0.22); box-shadow: inset 0 0 0 1px rgba(3, 117, 219, 0.7); font-size: 15px; font-weight: 600; white-space: nowrap">→ {jumps[i]}</div>')
S.append(('La meta del banco', page('Pibank · La meta', halo_platform(1300, 520, 1300, 790, 560, 50) + stc +
    col(eyebrow('Cómo sabremos si funciona') + headline(['La cadena', 'termina en', 'la meta', 'del banco'], 84, extra='; margin-top: 64px') +
        body('El banco nos compartió su meta: 15.200 cuentas con fondos, US$38 millones con un ticket de US$2.500. Contada hacia atrás con tasas de prueba, exige 1,17 millones de visitas de todos sus canales: es un requisito, no tráfico que prometa la búsqueda.', 21, 560, extra='; margin-top: 40px'), 120, 620) +
    means('La meta es del banco en todos sus canales. SEO, GEO y AEO aportan una parte: la estimamos en las dos láminas siguientes.',
          'Cálculo Efeonce con tasas de prueba. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=3)))

# 08 · Diagnóstico técnico — capítulo 1 · cuatro hallazgos, cada uno con su evidencia dibujada en miniatura
MONO = 'font-size: 13px; line-height: 1.5; color: #cfe4fa'
codebox = lambda inner: f'<div style="border-radius: 12px; background: #050f24; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); padding: 14px 16px">{inner}</div>'
canon = '&lt;link rel="canonical" href="https://pibank.pe/cuenta-soles-pibank/"&gt;'
m1 = codebox(f'<div style="{MONO}">{canon}</div><div style="{MONO}; margin-top: 8px; padding: 4px 6px; border-radius: 6px; border: 1.5px dashed {ACC}">{canon}</div>'
             f'<div style="margin-top: 10px; display: inline-block; padding: 3px 10px; border-radius: 999px; background: rgba(3, 117, 219, 0.25); font-size: 12px; font-weight: 600">La misma etiqueta, dos veces</div>')
faq = lambda: (f'<div style="border-radius: 10px; background: rgba(255, 255, 255, 0.06); padding: 10px 12px"><div style="font-size: 13px; font-weight: 600">¿Cuál es el horario de atención?</div>'
               f'<div style="height: 5px; width: 92%; border-radius: 3px; background: rgba(207, 228, 250, 0.32); margin-top: 8px"></div><div style="height: 5px; width: 70%; border-radius: 3px; background: rgba(207, 228, 250, 0.32); margin-top: 5px"></div></div>')
m2 = f'<div style="display: grid; gap: 8px">{faq()}<div style="text-align: center; font-size: 13px; font-weight: 600; color: {SOFT_}">= mismo texto</div>{faq()}</div>'
m3 = codebox(f'<div style="font-size: 13px; font-weight: 600">¿Cuál es la tasa de la cuenta?</div><div style="{MONO}; margin-top: 8px">Revisa las condiciones en el <span style="border-bottom: 1.5px dashed {ACC}; color: #ffffff">tarifario</span>.</div>'
             f'<div style="margin-top: 10px; display: inline-block; padding: 3px 10px; border-radius: 999px; background: rgba(3, 117, 219, 0.25); font-size: 12px; font-weight: 600">Sin enlace a la fuente</div>')
chip = lambda t: f'<div style="padding: 10px 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14); font-size: 13px; text-align: center">{t}</div>'
m4 = codebox(f'<div style="font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: {SOFT_}">Identificador del sitio</div>'
             f'<div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; margin-top: 10px">{chip("Página A")}<div style="font-size: 26px; font-weight: 600">≠</div>{chip("Página B")}</div>')
finds = [(m1, 'Dos etiquetas «canonical» en páginas clave', 'La canonical le dice a Google cuál es la versión oficial de una página. Hoy se repite en el código de páginas clave.', 'Una sola por plantilla, comprobada en el código.'),
         (m2, 'Preguntas frecuentes con el mismo texto', 'Horarios y cancelación repiten la misma respuesta en dos preguntas distintas.', 'Mantener, mejorar o unir según lo que la gente busca.'),
         (m3, 'La tasa remite al tarifario sin enlazarlo', 'En un banco, la exactitud de las condiciones es confianza, para las personas y para la IA.', 'Enlazar fuentes vigentes, con visto bueno de Producto y Cumplimiento.'),
         (m4, 'Datos estructurados con identificadores distintos', 'El código que describe el sitio a buscadores e IA no dice lo mismo en todas las páginas.', 'Un solo identificador, coherente con lo que se ve.')]
cards8 = ''
for i, (mock, t, why, do) in enumerate(finds):
    inner = (f'<div style="display: grid; grid-template-columns: 300px minmax(0, 1fr); column-gap: 26px; align-items: center">{mock}<div>'
             f'<div style="font-family: {ID}; font-size: 23px; font-weight: 740; letter-spacing: -0.015em; line-height: 1.15">{t}</div>'
             f'<div style="font-size: 15px; font-weight: 300; line-height: 1.45; color: {SOFT_}; margin-top: 8px">{why}</div>'
             f'<div style="font-size: 15px; font-weight: 600; line-height: 1.4; margin-top: 10px">→ {do}</div></div></div>')
    cards8 += obj(f'<div style="width: 100%">{inner}</div>', 140 + (i % 2) * 832, 320 + (i // 2) * 270, 808, i == 0, '; height: 250px; display: flex; align-items: center')
S.append(('Diagnóstico técnico', page('Pibank · Diagnóstico', halo_only(560, 460) + cards8 +
    col(eyebrow('Diagnóstico de pibank.pe') + headline(['El sitio tiene buena base, pero cuatro detalles', 'técnicos le restan claridad ante Google'], 64, extra='; margin-top: 36px'), 110, 1500) +
    means('Son arreglos acotados, dentro de las 8 horas mensuales de WordPress incluidas: no hace falta rehacer un sitio que ya tiene producto, calculadora, documentos y 51 preguntas frecuentes.',
          'Revisión pública Efeonce del 06 y 07-10-2026 (WordPress con Yoast SEO). Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=1)))

# 09 · Cinco frentes — capítulo 2 · cinco objetos sobre la plataforma; cada uno enciende las palancas que mueve
fr9 = [('buscador', 'SEO técnico y arquitectura', 'Que Google encuentre y entienda las páginas, y que todas conduzcan a Cuenta Soles.', (1, 1, 0), '⟦Arquitectura⟧ y ⟦SEO técnico⟧'),
       ('contenido', 'Contenido', 'Hasta cinco artículos al mes con lo que la gente pregunta antes de abrir y depositar.', (1, 1, 1), '⟦Contenido⟧'),
       ('medicion', 'Herramientas', 'Calculadora y comparador para decidir con números.', (0, 1, 1), '⟦Herramientas⟧'),
       ('ia', 'Respuestas de IA', 'Que los asistentes y el buscador con IA mencionen a Pibank con datos correctos.', (1, 1, 0), '⟦Respuestas de IA (AEO)⟧'),
       ('prensa', 'Comunidad, medios y pauta', 'Llevar los recursos a medios y canales del banco, y mejorar donde aterriza la pauta.', (1, 1, 1), '⟦Comunidad y PR⟧ y ⟦Eficiencia de la pauta⟧')]
LEV = ['Aparecer', 'Ser elegido', 'Convencer']
def lever(on, name):
    return (f'<div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; font-size: 15px; font-weight: 600; '
            + (f'background: {ACC}; color: #ffffff; box-shadow: 0 0 24px rgba(3, 117, 219, 0.45)' if on else 'box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.22); color: rgba(207, 228, 250, 0.45)')
            + f'">{name}</div>')
cards9 = ''
for i, (g, t, d, lv, ref) in enumerate(fr9):
    hero = i == 1
    h = 470 if hero else 430
    inner = (icon(g) + otitle(t, 26) + otext(d, 16) +
             f'<div style="position: absolute; left: 26px; right: 26px; bottom: 24px; display: grid; gap: 7px">' + ''.join(lever(on, n) for on, n in zip(lv, LEV)) +
             f'<div style="font-size: 13px; color: {SOFT_}; margin-top: 4px">Lámina {ref}</div></div>')
    cards9 += obj(inner, 140 + i * 333, 790 - h, 308, hero, f'; height: {h}px')
S.append(('Cinco frentes', page('Pibank · Cinco frentes', halo_platform(960, 560, 960, 790, 900, 46) + cards9 +
    col(eyebrow('Qué haremos') + headline(['El programa trabaja cinco frentes, y cada uno', 'mueve eslabones de la cadena'], 64, extra='; margin-top: 36px'), 110, 1500) +
    means('Ningún frente basta solo: el contenido sin base técnica no se encuentra, y sin referencias no gana confianza. Por eso van juntos y se priorizan cada mes según resultados.',
          'En azul, los eslabones de la cadena (lámina ⟦De la búsqueda a la cuenta⟧) que mueve cada frente. Todo se mide cada mes.') + bubble(), section=2)))

# 10 · Arquitectura — capítulo 2
chips = ['Rendimiento y costos', 'Comparación', 'Ahorro disponible', 'Confianza', 'Apertura', 'Primer fondeo']
chip_html = ''.join(f'<div style="padding: 9px 14px; border-radius: 999px; background: #163f60; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22); font-size: 16px; font-weight: 500">{c}</div>' for c in chips)
arr = lambda x, y: f'<div style="position: absolute; left: {x}px; top: {y}px; font-size: 40px; color: {SOFT_}">→</div>'
S.append(('Arquitectura', page('Pibank · Arquitectura', halo_platform(1290, 500, 1290, 790, 560, 50) +
    obj(okicker('Entrada') + otitle('Búsqueda e IA') + otext('Consultas de ahorro, comparación y productos rivales, y respuestas de los motores de IA.'), 720, 420, 250) +
    arr(985, 540) +
    obj(okicker('Hub de ahorro · WordPress') + otitle('Artículos y herramientas por decisión') + f'<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px">{chip_html}</div>', 1035, 360, 360) +
    arr(1405, 540) +
    obj(f'<img src="data:image/svg+xml;base64,{base64.b64encode(open(os.path.join(HERE, "logos-cliente/pibank-logo-blanco.svg"), "rb").read()).decode()}" alt="Pibank" style="height: 34px; width: auto; display: block; margin-bottom: 18px">' +
        okicker('Pilar comercial') + otitle('Cuenta Soles', 40) +
        f'<div style="margin-top: 12px; display: inline-block; padding: 7px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.09); font-size: 13px; white-space: nowrap; color: {SOFT_}">pibank.pe/cuenta-soles-pibank</div>' +
        otext('Uso, rendimiento, costos, requisitos, respaldo y acceso a la apertura, con fuentes claras.', 17), 1455, 410, 300, True) +
    obj(okicker('Banco') + otitle('Registro y primer depósito', 24) + otext('registro.pibank.pe y la app, operados por Pibank.', 16), 1490, 150, 230) +
    col(eyebrow('Qué haremos') + headline(['Cuenta Soles', 'al centro;', 'todo conduce', 'a ella'], 84, extra='; margin-top: 64px') +
        body('El pilar es la página principal de Cuenta Soles, que ya existe y se mejora. El hub es una sección nueva de pibank.pe que reúne artículos y herramientas ordenados por la decisión que la persona está tomando.', 21, 540, extra='; margin-top: 40px') +
        para('Si se lanza la cuenta en dólares, se suma con su propia página y fuentes.', 18, '; margin-top: 18px'), 120, 560) +
    means('Cada visita que llega por una pregunta encuentra un camino claro hacia la apertura, en vez de quedarse en un artículo suelto.',
          'Hub y mejora del pilar en M1–M2. registro.pibank.pe y la app los opera Pibank.') + bubble(), section=2)))

# 11 · SEO técnico — capítulo 2
def tech(g, term, title, text, attrs=''):
    return (f'<div{attrs} style="display: grid; grid-template-columns: 56px minmax(0, 1fr); column-gap: 18px; padding-top: 20px; border-top: 1px solid {RULE_}">{icon(g)}'
            f'<div>{label(term)}<div style="font-family: {ID}; font-size: 26px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1; margin-top: 8px">{title}</div>'
            f'<div style="font-size: 18px; font-weight: 300; line-height: 1.45; color: {SOFT_}; margin-top: 8px">{text}</div></div></div>')
fr11 = [('codigo', 'Canonical', 'Una sola versión oficial por página', 'Hoy hay dos etiquetas canonical en páginas clave; dejamos una y la comprobamos.'),
        ('buscador', 'Rastreo e indexación', 'Que Google encuentre todas las páginas', 'Revisamos qué páginas ve y guarda Google, y recuperamos las que quedan fuera.'),
        ('integracion', 'Enlaces internos', 'Que las páginas se conecten', 'Cada artículo y herramienta enlaza al producto; ninguna página queda aislada.'),
        ('reloj', 'Core Web Vitals', 'Que cargue rápido en el celular', 'Medimos la velocidad con las métricas de Google y ajustamos imágenes, código y plantillas.'),
        ('base-de-datos', 'Datos estructurados', 'Que buscadores e IA sepan quién es Pibank', 'Código que describe la organización, los artículos y la navegación, coherente con lo visible.'),
        ('checklist', 'Continuidad', 'Que nada se rompa con cada cambio', 'Revisión después de cada cambio de plantilla, plugin o condición del producto.')]
cells11 = ''.join(tech(*f, sel('Efeonce', 'top-end') if i == 0 else '') for i, f in enumerate(fr11))
S.append(('SEO técnico', page('Pibank · SEO técnico',
    col(eyebrow('Qué haremos') + headline(['Antes de publicar', 'más, el sitio', 'tiene que', 'leerse bien'], 84, extra='; margin-top: 64px') +
        body('Seis arreglos técnicos, explicados en simple. Incluye hasta 8 horas al mes de ajustes en WordPress; si un cambio depende de TI o del proveedor, entregamos la especificación y lo verificamos después.', 21, 540, extra='; margin-top: 40px'), 120, 600) +
    zone(f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px; row-gap: 22px">{cells11}</div>', 820, 230, 960) +
    means('Es la base de todo lo demás: un buen artículo en una página que Google no lee bien no se encuentra.',
          'No asignamos schema por cuota ni prometemos resultados especiales en Google. registro.pibank.pe se valida por separado.') + bubble(), section=2)))

# 12 · Contenido — capítulo 2 · cuatro artículos reales del plan como objetos; cada uno termina en su siguiente paso
arts = [('M1 · Rendimiento', 'Cómo interpretar la TREA y las condiciones de una cuenta', 'Ir a la calculadora'),
        ('M1 · Apertura', 'Qué revisar antes de abrir una cuenta de ahorro digital', 'Abrir Cuenta Soles'),
        ('M2 · Primer depósito', 'Cómo preparar la primera transferencia hacia tu cuenta', 'Ver cómo depositar'),
        ('M3 · Comparación', 'Cómo comparar rendimiento, costos y liquidez', 'Usar el comparador')]
cards12 = ''
for i, (lab, t, cta) in enumerate(arts):
    inner = (f'<div style="display: inline-block; padding: 5px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: {SOFT_}">{lab}</div>'
             f'<div style="font-family: {ID}; font-size: 24px; font-weight: 740; letter-spacing: -0.015em; line-height: 1.15; margin-top: 12px">{t}</div>'
             + ''.join(f'<div style="height: 5px; width: {w}%; border-radius: 3px; background: rgba(207, 228, 250, 0.26); margin-top: {10 if k == 0 else 6}px"></div>' for k, w in enumerate([96, 88, 64])) +
             f'<div style="position: absolute; left: 26px; bottom: 22px; display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-radius: 999px; background: {ACC}; box-shadow: 0 0 28px rgba(3, 117, 219, 0.5); font-size: 15px; font-weight: 600">{cta} →</div>')
    cards12 += obj(inner, 820 + (i % 2) * 490, 210 + (i // 2) * 290, 470, i == 0, '; height: 265px')
S.append(('Contenido', page('Pibank · Contenido', halo_platform(1300, 520, 1300, 790, 560, 46) + cards12 +
    col(eyebrow('Qué haremos') + headline(['Cada mes, artículos', 'que responden', 'lo que la gente', 'pregunta antes', 'de abrir'], 64, extra='; margin-top: 56px') +
        f'<div style="display: flex; align-items: baseline; gap: 18px; margin-top: 36px"><div style="font-family: {ID}; font-size: 140px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.85">60</div>'
        f'<div style="font-family: {ID}; font-size: 28px; font-weight: 640; letter-spacing: -0.02em; line-height: 1.15; color: {SOFT_}">espacios al año, entre<br>nuevos y actualizaciones</div></div>' +
        para('Hasta cinco al mes: unas 36 piezas nuevas y 24 actualizaciones, con 24 temas de partida. Cada pieza nace de una pregunta real y termina en un siguiente paso hacia el producto.', 19, '; margin-top: 22px; max-width: 540px'), 120, 620) +
    means('El contenido no es volumen: cada pieza ataca una duda que hoy frena la apertura o el primer depósito, y se actualiza o se une a otra si la evidencia lo pide.',
          'Cuatro de los 24 temas del plan de contenidos Efeonce v0.7. Son candidatos: se priorizan en M1 con Search Console y el equipo de Pibank.') + bubble(), section=2)))

# 13 · Herramientas — capítulo 2
calc = (okicker('M2 · Mejora') + otitle('Calculadora') +
        '<div style="margin-top: 16px; display: grid; gap: 10px">'
        '<div style="display: flex; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px"><span>Monto</span><span>S/ 10.000</span></div>'
        '<div style="display: flex; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px"><span>Plazo</span><span>12 meses</span></div></div>' +
        otext('Responde: ¿cuánto gano?', 16))
rowsc = [('Producto A', '✓', '✓', '—'), ('Cuenta Soles', '✓', '✓', '✓'), ('Producto C', '—', '✓', '✓')]
comp = (okicker('M4–M5 · Nuevo') + otitle('Comparador de ahorro', 34) +
        '<div style="margin-top: 18px; display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 10px 8px; font-size: 15px">' +
        ''.join(f'<div style="color: {SOFT_}; font-weight: 500">{h}</div>' for h in ['', 'Rendimiento', 'Costos', 'Liquidez']) +
        ''.join(''.join(f'<div style="{"font-weight: 600; color: #ffffff" if r[0] == "Cuenta Soles" and j == 0 else ("color: #ffffff; font-weight: 600" if c == "✓" else "color: #cfe4fa")}">{c}</div>' for j, c in enumerate(r)) for r in rowsc) + '</div>' +
        otext('Responde: ¿frente a qué? Hasta cinco productos, con criterios aprobados por el banco.', 17))
hub = (okicker('M1–M2 · Proyecto') + otitle('Hub de ahorro') +
       '<div style="margin-top: 16px; display: grid; gap: 8px">' + ''.join(f'<div style="padding: 9px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px">{x}</div>' for x in ['Comparar cuentas', 'Entender la TREA', 'Abrir y fondear']) + '</div>' +
       otext('Ordena las herramientas y los artículos.', 16))
S.append(('Herramientas', page('Pibank · Herramientas', halo_platform(1260, 560, 1250, 790, 600, 50) +
    obj(hub, 720, 470, 300) + obj(calc, 1480, 480, 290) + obj(comp, 1040, 380, 420, True) +
    col(eyebrow('Qué haremos') + headline(['Tres herramientas', 'para la pregunta', 'que define', 'la apertura'], 80, extra='; margin-top: 64px') +
        body('La pregunta es: ¿cuánto gano y frente a qué? La calculadora responde lo primero; el comparador, lo segundo. El hub las ordena. Las mantenemos de M3 a M12, con 30 días de garantía correctiva.', 21, 520, extra='; margin-top: 36px') +
        para('La ruta integral suma un planificador de ahorro en M5–M6.', 18, '; margin-top: 18px'), 120, 560) +
    means('Quien calcula o compara ya está decidiendo. Por eso cada herramienta termina en el botón de apertura y medimos cuántas personas avanzan.',
          'Comparador: hasta cinco productos y actualización manual; criterios y fuentes aprobados por Producto y Cumplimiento.') + bubble(), section=2)))

# 14 · AEO — capítulo 2 · el panel como objeto héroe (la tablita, con la columna del ejemplo encendida) y una observación abierta al lado
grid14 = ''.join(f'<div style="width: 14px; height: 14px; border-radius: 4px; {"background: " + ACC + "; box-shadow: 0 0 14px rgba(3, 117, 219, 0.8)" if q == 1 else "box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.35)"}"></div>' for s_ in range(3) for q in range(24))
rowlab = ''.join(f'<div style="font-size: 12px; color: {SOFT_}; height: 14px; line-height: 14px">Superficie {k}</div>' for k in (1, 2, 3))
panel = (okicker('Panel AEO · cada mes') +
         f'<div style="display: flex; align-items: baseline; gap: 16px; margin-top: 10px"><div style="font-family: {ID}; font-size: 120px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.85">144</div>'
         f'<div style="font-family: {ID}; font-size: 26px; font-weight: 640; line-height: 1.1; color: {SOFT_}">observaciones<br>al mes desde M2</div></div>'
         f'<div style="margin-top: 26px; display: grid; grid-template-columns: 84px auto; column-gap: 10px; align-items: start">'
         f'<div style="display: grid; gap: 8px">{rowlab}</div><div style="display: grid; grid-template-columns: repeat(24, 14px); gap: 8px 4px">{grid14}</div></div>'
         f'<div style="font-size: 14px; color: {SOFT_}; margin-top: 14px">24 preguntas × 3 superficies, en dos cortes al mes. Línea base de 72 en M1.</div>')
checks = ''.join(f'<div style="display: flex; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 15px">'
                 f'<span style="width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 2px {ACC}; flex: none"></span>{t}</div>'
                 for t in ['¿Aparece Pibank?', '¿Sus datos son correctos?', '¿Qué fuentes cita?', '¿A qué competidores nombra?'])
obs = (okicker('Una observación') +
       f'<div style="margin-top: 12px; margin-left: 40px; padding: 10px 14px; border-radius: 14px 14px 4px 14px; background: rgba(255, 255, 255, 0.1); font-size: 14px; line-height: 1.35">¿Qué diferencia hay entre TREA y tasa de interés de una cuenta de ahorro?</div>'
       f'<div style="margin-top: 10px; margin-right: 30px; padding: 10px 14px; border-radius: 14px 14px 14px 4px; background: rgba(3, 117, 219, 0.18); box-shadow: inset 0 0 0 1px rgba(3, 117, 219, 0.5)">'
       f'<div style="font-size: 12px; color: {SOFT_}">Respuesta de la IA</div>' + ''.join(f'<div style="height: 5px; width: {w}%; border-radius: 3px; background: rgba(207, 228, 250, 0.3); margin-top: 7px"></div>' for w in (94, 86, 60)) + '</div>'
       f'<div style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {SOFT_}; margin: 14px 0 4px">Lo que registramos</div>{checks}')
S.append(('Respuestas de IA (AEO)', page('Pibank · Panel AEO', halo_platform(1290, 520, 1300, 800, 560, 44) +
    obj(panel, 820, 330, 620, True, '; height: 450px') + obj(obs, 1400, 250, 380, False, '; height: 480px') +
    col(eyebrow('Qué haremos') + headline(['Parte de la', 'búsqueda ya', 'la responde', 'la IA'], 88, extra='; margin-top: 64px') +
        body('AEO y GEO son optimizar para motores de respuesta: los resúmenes con IA del buscador y asistentes como ChatGPT o Gemini. Ahí la persona recibe una respuesta antes de visitar un sitio, y esa respuesta puede nombrar a Pibank o no.', 21, 560, extra='; margin-top: 36px'), 120, 620) +
    means('Así sabremos si la IA describe bien Cuenta Soles, frente a qué bancos compite en cada respuesta y qué corregir en el sitio para que la cite.',
          'La columna encendida es la pregunta del ejemplo, en las tres superficies. Superficies y su acceso se acuerdan al inicio.') + bubble(), section=2)))

# 15 · Comunidad y PR — capítulo 2 · calendario arriba; abajo, el newsletter y la campaña como objetos sobre la plataforma
months = ''.join(f'<div style="text-align: center; font-size: 15px; font-weight: 500; color: {SOFT_}">M{m}</div>' for m in range(1, 13))
def band(a, b, color, txt='', ink='#04122b', glow=False):
    return f'<div style="grid-column: {a} / {b + 1}; grid-row: 1; height: 28px; border-radius: 8px; background: {color}; display: flex; align-items: center; padding-left: 12px; font-size: 14px; font-weight: 600; color: {ink}{"; box-shadow: 0 0 30px rgba(3, 117, 219, 0.55)" if glow else ""}">{txt}</div>'
G12 = 'display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px'
tl = (f'<div style="{G12}">{months}</div>'
      f'<div style="margin-top: 12px; {G12}">{band(3, 12, "rgba(207, 228, 250, 0.55)", "Comunidad · una decisión de ahorro por mes")}</div>'
      f'<div style="margin-top: 10px; {G12}">{band(3, 4, ACC, "Campaña PR", "#ffffff", True)}{band(6, 6, "rgba(207, 228, 250, 0.55)", "Ref.")}{band(8, 9, ACC, "Campaña PR", "#ffffff", True)}{band(11, 11, "rgba(207, 228, 250, 0.55)", "Ref.")}</div>')
PIB = f'<img src="data:image/svg+xml;base64,{base64.b64encode(open(os.path.join(HERE, "logos-cliente/pibank-logo-blanco.svg"), "rb").read()).decode()}" alt="Pibank" style="height: 24px; width: auto">'
lines = lambda ws: ''.join(f'<div style="height: 5px; width: {w}%; border-radius: 3px; background: rgba(207, 228, 250, 0.26); margin-top: 7px"></div>' for w in ws)
news = (f'<div style="display: flex; justify-content: space-between; align-items: center">{PIB}<div style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {SOFT_}">Newsletter · ejemplo</div></div>'
        f'<div style="margin-top: 16px; padding: 14px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.06)">'
        f'<div style="font-size: 12px; color: {SOFT_}">Asunto</div><div style="font-family: {ID}; font-size: 22px; font-weight: 740; line-height: 1.15; margin-top: 4px">¿Tu ahorro rinde lo que debería? Compáralo en un minuto</div>'
        + lines([96, 90, 72]) +
        f'<div style="margin-top: 14px; display: inline-block; padding: 8px 14px; border-radius: 999px; background: {ACC}; box-shadow: 0 0 24px rgba(3, 117, 219, 0.5); font-size: 14px; font-weight: 600">Usar el comparador →</div></div>'
        f'<div style="font-size: 15px; color: {SOFT_}; margin-top: 14px">10 newsletters · 40 adaptaciones · hasta 16 h al mes de escucha en los canales del banco</div>')
chips = ''.join(f'<div style="padding: 6px 12px; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.4); font-size: 14px">{m}</div>' for m in ['Gestión', 'El Comercio', 'RPP', 'Andina'])
pr = (okicker('Medios y enlaces') + otitle('Dos campañas de PR', 28) +
      ''.join(f'<div style="display: flex; align-items: baseline; gap: 12px; padding: 9px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: {12 if k == 0 else 0}px"><div style="font-family: {ID}; font-size: 30px; font-weight: 760; min-width: 52px">{n}</div><div style="font-size: 16px">{t}</div></div>'
              for k, (n, t) in enumerate([('3', 'ángulos de historia por campaña'), ('12', 'propuestas a medios por campaña'), ('2', 'refuerzos: menciones sin enlace y enlaces perdidos')])) +
      f'<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px">{chips}</div>')
S.append(('Comunidad y PR', page('Pibank · Comunidad y PR', halo_platform(1300, 600, 1300, 800, 560, 44) +
    zone(label('Ruta gradual · mes a mes') + f'<div style="margin-top: 14px">{tl}</div>', 820, 200, 960) +
    obj(news, 820, 380, 470, True, '; height: 410px') + obj(pr, 1310, 400, 470, False, '; height: 390px') +
    col(eyebrow('Qué haremos') + headline(['Los recursos', 'salen a buscar', 'a quien compara'], 78, extra='; margin-top: 64px') +
        body('Hoy solo un sitio enlaza a pibank.pe (lámina ⟦Hoy no encuentra a Pibank⟧). Cada nota en un medio con enlace es una referencia que Google valora, y cada newsletter trae de vuelta a quien ya conoció a Pibank.', 21, 560, extra='; margin-top: 40px'), 120, 620) +
    means('La comunidad sostiene la relación con quien ya llegó; los medios suman alcance y referencias. Ambos llevan a recursos útiles, no a avisos.',
          'Medios prioritarios. Publicar y enlazar es decisión de cada medio; Comunicaciones aprueba mensajes y voceros. El newsletter es un ejemplo ilustrativo.') + bubble(), section=2)))

# 16 · SEM — capítulo 2 · los mismos 100 clics, dos páginas: los puntos encendidos son aperturas (geometría desde el dato)
def sbar(lab, w, color, val, glow=False):
    return (f'<div style="display: grid; grid-template-columns: 300px minmax(0, 1fr); column-gap: 24px; align-items: center; padding: 16px 0; border-top: 1px solid {RULE_}">'
            f'<div style="font-size: 20px; font-weight: 600; line-height: 1.3">{lab}</div><div style="display: flex; align-items: center; gap: 18px">'
            f'<div style="width: {w}px; height: 28px; border-radius: 8px; background: {color}{"; box-shadow: 0 0 40px rgba(3, 117, 219, 0.55)" if glow else ""}"></div>'
            f'<div style="font-family: {ID}; font-size: 34px; font-weight: 760">{val}</div></div></div>')
def clicks(opens):
    dots = ''.join(f'<div style="width: 18px; height: 18px; border-radius: 50%; '
                   + (f'background: {ACC}; box-shadow: 0 0 16px rgba(3, 117, 219, 0.9)' if k < opens else 'box-shadow: inset 0 0 0 1.5px rgba(207, 228, 250, 0.32)') + '"></div>' for k in range(100))
    return f'<div style="display: grid; grid-template-columns: repeat(10, 18px); gap: 8px; margin-top: 16px">{dots}</div>'
def semcard(kicker, opens, cost, hero):
    inner = (okicker(kicker) + f'<div style="font-size: 16px; color: {SOFT_}; margin-top: 8px">100 clics pagados · mismo gasto</div>' + clicks(opens) +
             f'<div style="display: flex; align-items: baseline; gap: 12px; margin-top: 18px"><div style="font-family: {ID}; font-size: 52px; font-weight: 760; letter-spacing: -0.03em">{opens}</div><div style="font-size: 18px; font-weight: 600">aperturas</div></div>'
             f'<div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.12); display: flex; justify-content: space-between; align-items: baseline">'
             f'<div style="font-size: 15px; color: {SOFT_}">Costo por apertura<br><span style="color: #ffffff; font-weight: 600">gasto ÷ {opens}</span></div>'
             f'<div style="font-family: {ID}; font-size: 48px; font-weight: 760; letter-spacing: -0.03em">{cost}</div></div>')
    return inner
S.append(('Eficiencia de la pauta', page('Pibank · SEM', halo_platform(1300, 520, 1300, 790, 560, 46) +
    obj(semcard('Escenario de referencia', 2, '100 %', False), 820, 230, 450, False, '; height: 550px') +
    obj(semcard('Con mejor página', 3, '67 %', True), 1310, 190, 470, True, '; height: 590px') +
    col(eyebrow('Qué haremos') + headline(['Una mejor página', 'puede abaratar', 'la pauta'], 72, extra='; margin-top: 56px') +
        f'<div style="display: flex; align-items: baseline; gap: 18px; margin-top: 30px"><div style="font-family: {ID}; font-size: 150px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.85">−33 %</div></div>'
        f'<div style="font-family: {ID}; font-size: 28px; font-weight: 640; letter-spacing: -0.02em; color: {SOFT_}; margin-top: 10px">en el costo de cada apertura pagada</div>' +
        para('SEM es la pauta en buscadores: anuncios que se pagan por clic. Esos clics aterrizan en las páginas que mejora el programa. Si una página convence a 3 de cada 100 en vez de a 2, cada apertura pagada cuesta un tercio menos.', 19, '; margin-top: 22px; max-width: 560px'), 120, 620) +
    means('Cada sol de pauta rinde más cuando la página convence. Lo comprobaremos con el costo por apertura y por cuenta con fondos, con datos de Marketing.',
          'Ejemplo aritmético: tasas ilustrativas y condiciones constantes. Marketing opera la pauta. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=2)))

# 17 · Ciclo mensual (compositor)
S.append(('Ciclo mensual', img_page('Pibank · Ciclo', IMG['C04'], 'Cómo trabajamos cada mes: medir, crear, distribuir y optimizar alrededor de Pibank.')))

# 18 · Calendario — capítulo 3 · cuatro etapas como objetos alineados a sus meses; el gantt en un panel de vidrio con el mes 1 encendido
gantt = [('Servicio base', [(1, 12, 's')]), ('Diagnóstico y medición', [(1, 2, 's')]), ('Panel AEO', [(1, 12, 's')]), ('Hub de ahorro', [(1, 2, 'w')]),
         ('Calculadora', [(2, 2, 'w')]), ('Comparador', [(4, 5, 'w')]), ('Comparativas de cuentas', [(3, 6, 'w')]), ('Comunidad', [(3, 12, 's')]), ('Campañas de PR', [(3, 4, 'w'), (8, 9, 'w')]),
         ('Refuerzos de enlaces', [(6, 6, 'w'), (11, 11, 'w')]), ('Mantenimiento', [(3, 12, 's')]), ('Revisión trimestral', [(3, 3, 'r'), (6, 6, 'r'), (9, 9, 'r'), (12, 12, 'r')])]
TPL = 'grid-template-columns: 300px repeat(12, minmax(0, 1fr)); column-gap: 6px'
GX, GW = 150, 1620
COLW = (GW - 300 - 6 * 12) / 12
colx = lambda m: GX + 300 + 6 + (m - 1) * (COLW + 6)
phases = [(1, 2, 'checklist', 'Base y medición', 'Diagnóstico, medición, hub, calculadora y primeros artículos', 150),
          (3, 5, 'prensa', 'Distribución', 'Comunidad, primera campaña de PR y comparador', 165),
          (6, 8, 'medicion', 'Ajuste', 'Revisión semestral, refuerzo de enlaces y segunda campaña', 180),
          (9, 12, 'revenue', 'Optimización', 'Mejoras por resultados, balance anual y siguiente ciclo', 195)]
cards18 = ''
for a_, b_, g, t, d, h in phases:
    x = colx(a_); w = colx(b_) + COLW - x
    inner = (f'<div style="display: flex; align-items: center; gap: 10px"><div style="width: 40px; height: 40px; flex: none">{AX["icons"][g + "-dark"].replace(chr(34) + "52" + chr(34), chr(34) + "40" + chr(34))}</div>'
             f'<div style="font-family: {ID}; font-size: 22px; font-weight: 740; letter-spacing: -0.015em; line-height: 1.05">{t}</div></div>'
             f'<div style="font-size: 14px; font-weight: 300; line-height: 1.35; color: {SOFT_}; margin-top: 8px">{d}</div>')
    cards18 += obj(inner, round(x), 410 - h, round(w), a_ == 1, f'; height: {h}px; padding: 16px 16px 14px')
gl = f'<div style="display: grid; {TPL}; padding-bottom: 6px"><div style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: {SOFT_}">Ruta gradual</div>' + ''.join(f'<div style="text-align: center; font-size: 15px; font-weight: 600; color: {W_ if m == 1 else SOFT_}">M{m}</div>' for m in range(1, 13)) + '</div>'
for name, bs in gantt:
    pos = ''
    for a_, b_, k in bs:
        sty = {'w': 'background: #ffffff', 's': 'background: rgba(207, 228, 250, 0.38)', 'r': 'box-shadow: inset 0 0 0 2px #cfe4fa'}[k]
        pos += f'<div style="grid-column: {a_ + 1} / {b_ + 2}; grid-row: 1; height: 16px; align-self: center; border-radius: 5px; {sty}"></div>'
    gl += f'<div style="display: grid; {TPL}; padding: 2px 0; border-top: 1px solid {RULE_}"><div style="grid-column: 1; grid-row: 1; font-size: 15px; font-weight: 400">{name}</div>{pos}</div>'
legend = (f'<span style="display: inline-flex; align-items: center; gap: 6px; margin-right: 14px"><span style="width: 20px; height: 10px; border-radius: 3px; background: #ffffff"></span>Construcción o campaña</span>'
          f'<span style="display: inline-flex; align-items: center; gap: 6px; margin-right: 14px"><span style="width: 20px; height: 10px; border-radius: 3px; background: rgba(207, 228, 250, 0.38)"></span>Operación continua</span>'
          f'<span style="display: inline-flex; align-items: center; gap: 6px"><span style="width: 20px; height: 10px; border-radius: 3px; box-shadow: inset 0 0 0 2px #cfe4fa"></span>Revisión</span>')
S.append(('Calendario', page('Pibank · Calendario', halo_only(560, 300) + cards18 +
    obj('', 120, 428, 1680, False, '; height: 420px') +
    f'<div style="position: absolute; left: {round(colx(1)) - 5}px; top: 436px; width: {round(COLW) + 10}px; height: 402px; border-radius: 12px; box-shadow: 0 0 0 2px rgba(3, 117, 219, 0.95), 0 0 60px rgba(3, 117, 219, 0.45)"></div>' +
    zone(gl, GX, 446, GW) +
    col(eyebrow('Cómo sabremos si funciona') + headline(['Primero la base, después la distribución'], 64, extra='; margin-top: 30px'), 110, 1500) +
    means('Cada etapa usa lo que dejó la anterior. Si una aprobación se demora, se mueve el hito que depende de ella y mientras tanto adelantamos otro trabajo.',
          legend + '<br>M1 es el mes de inicio acordado.') + bubble(), section=3)))

# 18b · Lo que veremos moverse — capítulo 3 · tres etapas; la del medio (visibilidad SEO y AEO) es la protagonista
mv = [('checklist', 'M1–M3 · Base', 'El sitio se lee bien', ['Errores técnicos corregidos y verificados', 'Páginas clave indexadas en Google', 'Línea base: qué dice hoy la IA de Pibank'], 'Aparecer', 400),
      ('buscador', 'M3–M6 · Visibilidad', 'Pibank empieza a aparecer', ['Más impresiones en búsquedas sin marca', 'Mejores posiciones frente a otros bancos', 'Menciones correctas en respuestas de IA', 'Primeros enlaces desde medios'], 'Aparecer · Ser elegido', 500),
      ('revenue', 'M6–M12 · Decisión', 'Llegan, comparan y deciden', ['Visitas orgánicas sin marca', 'Uso de calculadora y comparador', 'Aperturas y cuentas con fondos que vienen de ahí'], 'Convencer · Abrir y fondear', 440)]
cmv = ''
for i, (g, k, t, sig, ch, h) in enumerate(mv):
    lis = ''.join(f'<div style="display: grid; grid-template-columns: 18px minmax(0, 1fr); column-gap: 10px; padding: 7px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 16px; line-height: 1.35">'
                  f'<span style="width: 8px; height: 8px; border-radius: 50%; margin-top: 7px; background: {ACC if i == 1 else SOFT_}"></span><span>{x_}</span></div>' for x_ in sig)
    inner = (icon(g) + okicker(k) + otitle(t, 28) + f'<div style="margin-top: 14px">{lis}</div>' +
             f'<div style="position: absolute; left: 28px; bottom: 24px; padding: 6px 12px; border-radius: 999px; font-size: 14px; font-weight: 600; '
             + (f'background: {ACC}; box-shadow: 0 0 24px rgba(3, 117, 219, 0.45)' if i == 1 else 'box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.4)') + f'">{ch}</div>')
    cmv += obj(inner, 820 + i * 325, 790 - h, 305, i == 1, f'; height: {h}px')
S.append(('Lo que veremos moverse', page('Pibank · Lo que veremos moverse', halo_platform(1300, 480, 1300, 790, 560, 50) + cmv +
    col(eyebrow('Cómo sabremos si funciona') + headline(['Lo que veremos', 'moverse,', 'en orden'], 84, extra='; margin-top: 64px') +
        body('SEO y AEO no se ven de un mes a otro: primero se corrige la base, después crece la visibilidad en Google y en la IA, y al final llegan las decisiones. Cada etapa tiene señales propias en el informe mensual.', 21, 560, extra='; margin-top: 40px'), 120, 620) +
    means('La gerencia verá avances de visibilidad desde el primer semestre, antes de que maduren las cuentas. Son señales para revisar en cada informe mensual.',
          'Plazos orientativos según el calendario de la ruta gradual. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=3)))

# 20b · Evaluación de oportunidad 2026 — capítulo 3 · lo que pidió el banco (correo del 07-10), escenario central de la estimación Codex 08-10
QT = [('T1', 543, 7), ('T2', 3845, 50), ('T3', 10777, 155), ('T4', 18505, 292)]
qbars = ''
for i, (q, v, f) in enumerate(QT):
    h = round(300 * f / 292)
    qbars += (f'<div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 380px">'
              f'<div style="font-family: {ID}; font-size: 40px; font-weight: 760; letter-spacing: -0.03em; margin-bottom: 10px">{f}</div>'
              f'<div style="width: 150px; height: {h}px; border-radius: 10px 10px 0 0; background: {ACC if i == 3 else "rgba(207, 228, 250, 0.42)"}{"; box-shadow: 0 0 40px rgba(3, 117, 219, 0.55)" if i == 3 else ""}"></div>'
              f'<div style="font-size: 20px; font-weight: 600; margin-top: 12px">{q}</div>'
              f'<div style="font-size: 15px; color: {SOFT_}">{format(v, ",").replace(",", ".")} visitas</div></div>')
scen = ''
for i, (n, c, d) in enumerate([('Prudente', '171', 'Captura madura 2 %'), ('Central', '504', 'Captura madura 5 %'), ('Favorable', '1.357', 'Captura madura 10 %')]):
    scen += obj(okicker(n) + f'<div style="font-family: {ID}; font-size: 48px; font-weight: 760; letter-spacing: -0.03em; margin-top: 8px">{c}</div>'
                + otext('cuentas con fondos · ' + d, 15), 820 + i * 330, 655, 310, i == 1, '; height: 175px; padding: 20px 24px')
S.append(('Evaluación 2026', page('Pibank · Evaluación 2026', halo_only(1300, 420) + scen +
    col(eyebrow('Evaluación de oportunidad 2026') + headline(['Si Pibank', 'hubiera empezado', 'en enero de 2026'], 66, extra='; margin-top: 56px') +
        f'<div style="display: flex; align-items: baseline; gap: 16px; margin-top: 30px"><div style="font-family: {ID}; font-size: 120px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.85">≈500</div>'
        f'<div style="font-family: {ID}; font-size: 24px; font-weight: 640; line-height: 1.15; color: {SOFT_}">cuentas con fondos<br>en el año</div></div>' +
        para('Lo que pidió el banco, en el escenario central: 33.700 visitas orgánicas, unas 760 aperturas y cerca de 500 cuentas con fondos, equivalentes a US$1,26 millones al ticket de US$2.500.', 19, '; margin-top: 22px; max-width: 560px'), 120, 620) +
    zone(label('Cuentas con fondos por trimestre, escenario central') + f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 6px">{qbars}</div>', 820, 200, 960) +
    means('El aporte crece a medida que los recursos se publican y maduran: casi seis de cada diez cuentas del año llegan en el último trimestre.',
          'Estimación Efeonce con hipótesis, ejercicio enero–diciembre 2026: producto y programa disponibles desde enero. No es pronóstico ni dato del banco. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=3)))

# 20c · Cómo se conecta con la meta — capítulo 3 · composición de la fila que resuelve la meta y tabla de visitas de otros canales
seg = lambda w, c, t, v: (f'<div style="width: {w}%; display: flex; flex-direction: column; gap: 8px"><div style="height: 46px; border-radius: 8px; background: {c}"></div>'
                          f'<div style="font-family: {ID}; font-size: 30px; font-weight: 760; letter-spacing: -0.02em">{v}</div><div style="font-size: 15px; color: {SOFT_}; line-height: 1.3">{t}</div></div>')
stack = (f'<div style="display: flex; gap: 6px; align-items: flex-start">'
         + seg(78, 'rgba(207, 228, 250, 0.42)', 'Referencia del banco con sus otros canales', '13.119')
         + seg(14, 'rgba(3, 117, 219, 0.6)', 'Mejor conversión', '1.576')
         + seg(8, ACC, 'Directas', '504') + '</div>')
rows = [('100.000', '658', '1.936'), ('250.000', '888', '4.084'), ('500.000', '1.272', '7.664'), ('1.000.000', '2.040', '14.824'), ('1.026.286 · meta', '2.081', '15.200')]
W3 = [1.3, 1, 1]
tbl = thead(['Visitas de otros canales (supuesto)', 'Aporte del programa', 'Cuentas totales del banco'], W3, DARK) + ''.join(
    (f'<div style="background: rgba(3, 117, 219, 0.2); border-radius: 10px; box-shadow: inset 0 0 0 1px rgba(3, 117, 219, 0.7)">{trow(r, W3, DARK, px=19, pad=12)}</div>' if i == 4 else trow(r, W3, DARK, px=19, pad=12)) for i, r in enumerate(rows))
S.append(('Cómo se conecta con la meta', page('Pibank · Conexión con la meta', halo_only(1300, 300) +
    col(eyebrow('Evaluación de oportunidad 2026') + headline(['Así se conecta', 'con las 15.200', 'cuentas'], 76, extra='; margin-top: 56px') +
        body('El programa aporta de dos formas: cuentas directas desde la búsqueda y PR, y una mejor conversión del tráfico que el banco trae por otros canales. Escenario central: 504 directas más 154 por cada 100.000 visitas de esos canales.', 20, 560, extra='; margin-top: 32px'), 120, 620) +
    zone(label('La fila que resuelve la meta: 15.200 cuentas') + f'<div style="margin-top: 16px">{stack}</div>' +
         f'<div style="margin-top: 40px">{tbl}</div>', 820, 210, 960) +
    means('A ese nivel el programa aporta unas 2.100 cuentas (13,7 % de la meta); el resto depende de los otros canales del banco. Las 1,03 millones de visitas son un requisito, no una predicción.',
          'Escenario central 2026. Cada cuenta se cuenta una vez; las visitas de otros canales excluyen búsqueda orgánica y PR. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=3)))

# 19 · Aporte calculable: retirada a pedido del operador (07-10): restaba a la venta; la cifra de sensibilidad queda como nota en la lámina siguiente.

# 20 · Convertir lo que ya llega y medirlo en M1 — capítulo 3
b20 = (sbar('Hoy: 2 % abre y 65 % deposita', round(560 * 130 / 225), 'rgba(207, 228, 250, 0.42)', '130') +
       sbar('Mejor conversión: 3 % abre y 75 % deposita', 560, ACC, '225', True))
S.append(('Convertir lo que ya llega', page('Pibank · Medir en M1',
    col(eyebrow('Cómo sabremos si funciona') + headline(['Convertir mejor', 'lo que ya llega', 'suma cuentas, y lo', 'calibraremos con', 'datos de Pibank'], 60, extra='; margin-top: 64px') +
        body('Pibank se lanzó hace pocos días. Con los agregados disponibles desde el lanzamiento —sesiones por canal y página, solicitudes, aperturas y primer depósito— ajustamos la estimación. Datos agregados, sin información personal.', 20, 560, extra='; margin-top: 32px'), 120, 620) +
    zone(label('Ejemplo ilustrativo: cuentas con fondos por cada 10.000 visitas') + f'<div style="margin-top: 14px">{b20}</div>' +
         callout('+95 cuentas con fondos con las mismas visitas: es lo que suma un sitio que convence mejor.', '; margin-top: 10px') +
         label('En el mes 1', extra='; margin-top: 40px') +
         '<div style="margin-top: 6px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 44px">' +
         item('Calibración', 'Ajustamos la estimación de esta propuesta con las primeras cohortes de apertura y fondeo, sin contar dos veces una misma cuenta.', None, 28) +
         item('El ejercicio desde enero', 'La evaluación 2026 que pidió el banco (lámina ⟦Evaluación 2026⟧) se recalcula con datos reales en cuanto existan.', None, 28) + '</div>', 820, 230, 960) +
    means('Con esos datos, la estimación de esta propuesta pasa a números de Pibank. Si falta algún dato, diremos qué no se puede estimar.',
          'Ejemplo ilustrativo de 10.000 visitas. Supuestos en lámina ⟦Supuestos y fuentes⟧.') + bubble(), section=3)))

# 21 · Medición (compositor)
S.append(('Medición y atribución', img_page('Pibank · Medición', IMG['C06'], '¿Cómo sabremos si funciona? Lo medimos: cinco métricas con fórmula, fuente y dueño.')))

# 22 · Equipo (compositor)
S.append(('Equipo de la cuenta', img_page('Pibank · Equipo', IMG['C07'], '¿Quién trabaja en la cuenta? Expertos por área: Andrés, Valentina, Julio y Daniela, y diseño visual por asignar antes del inicio.')))

# 23 · Responsabilidades — capítulo 4 · dos objetos, qué hace cada uno, y la cadencia de trabajo al pie
EFE_LOGO = base64.b64encode(open(os.path.join(HERE, '../../node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg'), 'rb').read()).decode()
PIB_LOGO = base64.b64encode(open(os.path.join(HERE, 'logos-cliente/pibank-logo-blanco.svg'), 'rb').read()).decode()
ic36 = lambda g: f'<div style="width: 36px; height: 36px; flex: none">{AX["icons"][g + "-dark"].replace(chr(34) + "52" + chr(34), chr(34) + "36" + chr(34))}</div>'
def resp_card(logo, kicker, rows):
    out = (f'<div style="display: flex; align-items: center; justify-content: space-between"><img src="data:image/svg+xml;base64,{logo}" alt="" style="height: 30px; width: auto">'
           f'<div style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: {SOFT_}">{kicker}</div></div><div style="margin-top: 14px">')
    for g, t, who in rows:
        out += (f'<div style="display: flex; align-items: center; gap: 14px; padding: 11px 0; border-top: 1px solid rgba(255, 255, 255, 0.1)">{ic36(g)}'
                f'<div style="font-size: 19px; font-weight: 500; line-height: 1.3">{t}' + (f'<span style="font-weight: 300; color: {SOFT_}"> · {who}</span>' if who else '') + '</div></div>')
    return out + '</div>'
efe_rows = [('contenido', 'Investiga, prioriza y produce el contenido', ''), ('web', 'Implementa en WordPress donde tiene acceso', ''),
            ('codigo', 'Especifica lo que depende de TI y lo verifica', ''), ('medicion', 'Mide, analiza y reporta cada mes', ''),
            ('prensa', 'Gestiona comunidad, medios y enlaces', '')]
pib_rows = [('checklist', 'Valida cifras, condiciones y mensajes', 'Producto y Cumplimiento'), ('integracion', 'Habilita accesos, entornos y despliegues', 'TI'),
            ('base-de-datos', 'Entrega datos agregados', 'Marketing y Analítica'), ('finanzas', 'Opera registro, app y primer depósito', ''),
            ('correo', 'Aprueba voceros y canales', 'Comunicaciones')]
cad = [('Cada semana', 'Seguimiento'), ('Cada mes', 'Informe y plan'), ('Cada trimestre', 'Revisión de resultados'), ('Cada lote', 'Revisión del banco: 5 días hábiles y hasta 2 rondas')]
cad_html = ''.join(f'<div style="padding-top: 14px; border-top: 3px solid {ACC if i == 3 else "rgba(207, 228, 250, 0.45)"}"><div style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: {SOFT_}">{a_}</div>'
                   f'<div style="font-family: {ID}; font-size: 21px; font-weight: 740; line-height: 1.15; margin-top: 6px">{b_}</div></div>' for i, (a_, b_) in enumerate(cad))
S.append(('Responsabilidades', page('Pibank · Responsabilidades', halo_platform(960, 500, 960, 700, 820, 40) +
    obj(resp_card(EFE_LOGO, 'Produce y mide', efe_rows), 140, 325, 790, True, '; height: 385px') +
    obj(resp_card(PIB_LOGO, 'Valida y habilita', pib_rows), 990, 325, 790, False, '; height: 385px') +
    zone(f'<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1.6fr; column-gap: 36px">{cad_html}</div>', 140, 740, 1640) +
    col(eyebrow('Cómo trabajaremos') + headline(['Efeonce produce y mide;', 'Pibank valida y habilita'], 64, extra='; margin-top: 36px'), 110, 1500) +
    means('Nada se publica sin el visto bueno del banco, y el silencio no aprueba una publicación. Una persona del banco consolida los comentarios para que cada lote avance a tiempo.',
          'Cadencia propuesta; se ajusta en el arranque con el equipo de Pibank.') + bubble(), section=4)))

# Riesgos: retirada a pedido del operador (07-10): defendía de una objeción que el cliente no planteó.

# 25 · Inversión — capítulo 5 · el gasto mes a mes sale del calendario de la oferta híbrida
monthly = [6000, 7200, 7700, 7700, 7700, 6200, 5700, 7700, 5700, 5700, 6200, 5700]
assert sum(monthly) == 79200
H = 400; top = 330
chart = ''
for m, tot in enumerate(monthly):
    x = 820 + m * 80
    hb = round(H * 4500 / 7700); ha = round(H * (tot - 4500) / 7700)
    chart += (f'<div style="position: absolute; left: {x}px; top: {top + H - hb}px; width: 56px; height: {hb}px; border-radius: 0 0 6px 6px; background: rgba(207, 228, 250, 0.38)"></div>'
              f'<div style="position: absolute; left: {x}px; top: {top + H - hb - ha}px; width: 56px; height: {ha}px; border-radius: 6px 6px 0 0; background: {ACC}{"; box-shadow: 0 0 30px rgba(3, 117, 219, 0.5)" if tot == 7700 else ""}"></div>'
              f'<div style="position: absolute; left: {x - 12}px; top: {top + H - hb - ha - 28}px; width: 80px; text-align: center; font-size: 15px; font-weight: 600">{format(tot, ",").replace(",", ".")}</div>'
              f'<div style="position: absolute; left: {x - 12}px; top: {top + H + 10}px; width: 80px; text-align: center; font-size: 15px; color: {SOFT_}">M{m + 1}</div>')
legend25 = (f'<div style="display: flex; gap: 22px; font-size: 16px; color: {SOFT_}"><span style="display: flex; align-items: center; gap: 8px"><span style="width: 22px; height: 12px; border-radius: 3px; background: rgba(207, 228, 250, 0.38)"></span>Servicio base · US$4.500</span>'
            f'<span style="display: flex; align-items: center; gap: 8px"><span style="width: 22px; height: 12px; border-radius: 3px; background: {ACC}"></span>Activaciones del mes</span></div>')
inv = [('Servicio base · US$4.500 al mes', 'Lo continuo: dirección, SEO técnico, hasta cinco artículos, panel de IA y medición.'),
       ('Activaciones · US$25.200', 'Proyectos y campañas con fecha: hub, calculadora, comparador, comunidad, PR y mantenimiento. Cada una se acuerda antes de empezar.'),
       ('Ruta integral · US$89.200', 'Por US$10.000 más: planificador de ahorro, dos meses más de comunidad, dos campañas y dos refuerzos.')]
S.append(('Inversión', page('Pibank · Inversión', chart +
    col(eyebrow('Inversión') + headline(['US$79.200 en', 'doce meses'], 92, extra='; margin-top: 56px') +
        ''.join(f'<div style="padding: 16px 0; border-top: 1px solid {RULE_}; margin-top: {36 if i == 0 else 0}px">{label(a, W_)}<div style="font-size: 19px; font-weight: 300; line-height: 1.45; color: {SOFT_}; margin-top: 6px">{b}</div></div>' for i, (a, b) in enumerate(inv)), 120, 600) +
    zone(label('Inversión mes a mes, ruta gradual recomendada (US$)', W_) + f'<div style="margin-top: 12px">{legend25}</div>', 820, 214, 960) +
    zone(callout('Máximo de US$7.700 en M3, M4, M5 y M8, cuando coinciden proyectos y campañas.'), 820, 790, 960) +
    means('El gasto no es plano: sube en los meses de proyectos y campañas y baja a US$5.700 cuando solo corren la base, la comunidad y el mantenimiento.',
          'Valores en USD antes de impuestos. Base facturada mensualmente por adelantado; proyectos 50 % al inicio y 50 % a la aceptación. Calendario de referencia.') + bubble(), section=5)))

# 25b · Costo por cuenta — capítulo 5 · la vara para medirnos: inversión ÷ cuentas con fondos aportadas (aritmética, sin promesa)
scen = [250, 500, 1000, 2000]
cpa = [round(79200 / n) for n in scen]
H25 = 370; base = 660
bars25 = ''
for i, (n, c) in enumerate(zip(scen, cpa)):
    x = 850 + i * 235; h = round(H25 * c / cpa[0])
    dep = n * 2500 / 1e6
    bars25 += (f'<div style="position: absolute; left: {x - 20}px; top: {base - h - 58}px; width: 190px; text-align: center; font-family: {ID}; font-size: 40px; font-weight: 760; letter-spacing: -0.03em">US${c}</div>'
               f'<div style="position: absolute; left: {x}px; top: {base - h}px; width: 150px; height: {h}px; border-radius: 10px 10px 4px 4px; background: linear-gradient(180deg, rgba(3, 117, 219, 0.95), rgba(3, 117, 219, 0.35)); box-shadow: 0 0 34px rgba(3, 117, 219, 0.35)"></div>'
               f'<div style="position: absolute; left: {x - 20}px; top: {base + 14}px; width: 190px; text-align: center"><div style="font-size: 20px; font-weight: 600">{format(n, ",").replace(",", ".")} cuentas</div>'
               f'<div style="font-size: 14px; color: {SOFT_}; margin-top: 4px">US${str(round(dep, 2)).replace(".", ",").rstrip("0").rstrip(",")} M en depósitos iniciales</div></div>')
S.append(('Costo por cuenta', page('Pibank · Costo por cuenta', halo_only(1300, 520) + bars25 +
    zone(label('Costo por cuenta con fondos, según cuántas sume el programa', W_), 820, 200, 960) +
    zone(callout('Para comparar: lo que hoy paga Pibank por cada cuenta con fondos que llega por pauta. Lo calculamos con sus datos en el mes 1.'), 820, 800, 960) +
    col(eyebrow('Inversión') + headline(['Cuantas más', 'cuentas sume,', 'menos cuesta', 'cada una'], 84, extra='; margin-top: 64px') +
        body('El costo por cuenta es la inversión del año dividida por las cuentas con fondos que aporta el programa. Se compara con lo que cuesta una cuenta en los otros canales del banco.', 21, 560, extra='; margin-top: 36px'), 120, 620) +
    means('El resultado se mide en costo por cuenta, con datos del banco y frente a sus otros canales, no con un volumen prometido.',
          'US$79.200 ÷ cuentas atribuidas al programa. 250 a 2.000 son denominadores de ejemplo, no proyecciones ni costo total de adquisición. Depósitos al ticket de US$2.500; no son ingreso del banco.') + bubble(), section=5)))

# 26 · Siguiente paso — capítulo 5
cal = [('09-10', 'Entrega de la propuesta'), ('Semana del 12-10', 'Revisión con el equipo de Pibank'), ('Semana del 19-10', 'Revisión con gerencia'), ('2027', 'Inicio del mes 1')]
tl26 = (f'<div style="position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 20px">'
        f'<div style="position: absolute; left: 9px; right: 0; top: 9px; height: 2px; background: rgba(207, 228, 250, 0.35)"></div>' +
        ''.join(f'<div style="position: relative"><div style="width: 16px; height: 16px; border-radius: 50%; background: #091951; box-shadow: inset 0 0 0 2px {W_ if i == 0 else SOFT_}"></div>'
                f'<div style="font-size: 15px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: {SOFT_}; margin-top: 14px">{d}</div>'
                f'<div style="font-family: {ID}; font-size: 24px; font-weight: 740; line-height: 1.1; margin-top: 6px">{t}</div></div>' for i, (d, t) in enumerate(cal)) + '</div>')
need = [('calendario', 'Agregados desde el lanzamiento', 'Sesiones, solicitudes, aperturas y primer depósito, aunque sean pocos días.'),
        ('medicion', 'Search Console y analítica', 'Acceso para fijar la línea base de búsqueda.'),
        ('web', 'WordPress y entorno de pruebas', 'O el contacto del proveedor que implementa.'),
        ('contrato', 'Revisores de Producto y Cumplimiento', 'Y una persona que consolide las revisiones.'),
        ('objetivo', 'La meta del servicio', 'Meta 2027 y cómo se mide la captación, con Finanzas.')]
nl = ''.join(f'<div style="display: grid; grid-template-columns: 70px minmax(0, 1fr); column-gap: 18px; align-items: center; padding: 12px 0; border-top: 1px solid {RULE_}">'
             f'{icon(g)}<div><div style="font-family: {ID}; font-size: 28px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05">{t}</div><div style="font-size: 18px; font-weight: 300; color: {SOFT_}; margin-top: 4px">{d}</div></div></div>' for g, t, d in need)
S.append(('Siguiente paso', page('Pibank · Siguiente paso',
    col(eyebrow('Siguiente paso') + headline(['Para empezar', 'en 2027: una', 'decisión y', 'cinco datos'], 92, extra='; margin-top: 64px') +
        body('Qué decide la gerencia: aprobar el programa anual, elegir la ruta, gradual o integral, y designar a la persona del banco que consolida las revisiones.', 21, 540, extra='; margin-top: 36px'), 120, 600) +
    zone(label('Calendario que nos compartió Jesús', W_) + f'<div style="margin-top: 18px">{tl26}</div>' +
         label('Cinco datos para el mes 1', W_, extra='; margin-top: 40px') + f'<div style="margin-top: 10px">{nl}</div>', 820, 210, 960) +
    means('La propuesta y la evaluación 2026 están listas hoy. El mes 1 entrega diagnóstico validado, medición, línea base en IA, pilar mejorado, primeros artículos y estimación calibrada.') + bubble(), section=5)))

# 26b · Supuestos y fuentes (anexo) — todas las advertencias reunidas en un solo lugar
sups = [('Meta de referencia', '15.200 cuentas con fondos y US$38 millones (ticket US$2.500), del correo del banco del 07-10, con su público NSE A/B de 35 a 55 años. La meta del servicio 2027 se confirma al inicio.'),
        ('Tasas del embudo', '2 % de visitas que abren y 65 % de aperturas que depositan: tasas de prueba para dimensionar la meta, no datos de Pibank.'),
        ('Ticket de referencia', 'US$2.500 por cuenta, mencionado en la reunión. Un depósito inicial no es un ingreso del banco.'),
        ('Muestra de búsqueda', '17 capturas de 9 búsquedas genéricas en Google Perú, en móvil y escritorio, el 06-10-2026: 301 resultados. Es una muestra fechada; se contrasta con Search Console en el mes 1.'),
        ('Demanda estimada', 'Búsquedas mensuales estimadas por grupo, corte 06-10. Los grupos se solapan: no se suman como mercado ni como personas.'),
        ('Evaluación 2026', 'Ejercicio hipotético: producto y programa disponibles desde enero de 2026. 63 consultas (140.130 búsquedas/mes); ene–ago según el proveedor, sep–dic constante. Captura 2/5/10 %, apertura 2→2,3 %, fondeo 65→70 % (80 % en el mes de apertura), 230 visitas de PR. No es pronóstico ni dato del banco.'),
        ('Ejemplos ilustrativos', 'Los hallazgos técnicos dibujados, el newsletter, el ejemplo de 100 clics y el de 10.000 visitas explican mecanismos; no son resultados observados.'),
        ('Respuestas de IA', 'Una mención en una respuesta de IA no es una visita ni una cuenta. Las superficies y su acceso se acuerdan al inicio.'),
        ('Condiciones y comparaciones', 'Toda condición de producto y toda comparación con otras marcas se publica con fuente vigente y visto bueno de Producto y Cumplimiento.'),
        ('Precios', 'Valores en USD antes de impuestos. Cada activación se acuerda antes de ejecutarse.')]
sup_html = ''.join(f'<div style="padding: 11px 0; border-top: 1px solid {RULE_}"><div style="font-family: {ID}; font-size: 21px; font-weight: 740">{t}</div>'
                   f'<div style="font-size: 15px; font-weight: 300; line-height: 1.38; color: {SOFT_}; margin-top: 4px">{d}</div></div>' for t, d in sups)
S.append(('Supuestos y fuentes', page('Pibank · Supuestos',
    col(eyebrow('Anexo') + headline(['Supuestos y fuentes de esta propuesta'], 60, extra='; margin-top: 30px'), 110, 1600) +
    zone(f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: column; grid-template-rows: repeat(6, auto); column-gap: 64px">{sup_html}</div>', 140, 250, 1640) + bubble())))

# 27 · Glosario (anexo)
glos = [('SEO', 'Optimización para buscadores: que las páginas de Pibank aparezcan cuando alguien busca en Google.'),
        ('AEO', 'Optimización para motores de respuesta: que los resúmenes con IA y asistentes como ChatGPT o Gemini mencionen a Pibank con información correcta.'),
        ('GEO', 'Optimización para respuestas generativas: que Pibank esté bien representado en lo que responden las IA. Se trabaja junto con AEO.'),
        ('SEM', 'Pauta en buscadores: anuncios que se pagan por clic.'),
        ('Indexación', 'Que Google encuentre y guarde una página para poder mostrarla.'),
        ('Canonical', 'Etiqueta que indica a Google cuál es la versión oficial de una página.'),
        ('Core Web Vitals', 'Métricas de Google sobre la velocidad y estabilidad de una página, sobre todo en el celular.'),
        ('Datos estructurados', 'Código que describe la página —quién es la organización, qué es un artículo— para buscadores e IA.'),
        ('Enlace externo', 'Un enlace desde otro sitio hacia pibank.pe. Para Google es una señal de confianza.'),
        ('Pilar y hub', 'El pilar es la página principal de Cuenta Soles; el hub, la sección que reúne artículos y herramientas.'),
        ('Captura', 'Una página de resultados de Google guardada para revisar quién aparece.'),
        ('Observación', 'En el panel AEO: una pregunta, en una superficie de IA, en un corte de medición.'),
        ('Apertura y cuenta con fondos', 'Apertura: cuenta abierta y validada por el banco. Cuenta con fondos: la que además recibió su primer depósito.'),
        ('Captación', 'Depósitos que traen las cuentas nuevas; si se mide como primer depósito o saldo mantenido se define con el banco.'),
        ('M1 a M12', 'Meses del programa, contados desde el inicio acordado.'),
        ('Activación', 'Proyecto o campaña con fecha y precio propios, que se acuerda antes de ejecutar.')]
gl27 = ''.join(f'<div style="padding: 10px 0; border-top: 1px solid {RULE_}"><div style="font-family: {ID}; font-size: 22px; font-weight: 740; letter-spacing: -0.01em">{t}</div>'
               f'<div style="font-size: 16px; font-weight: 300; line-height: 1.38; color: {SOFT_}; margin-top: 4px">{d}</div></div>' for t, d in glos)
S.append(('Glosario', page('Pibank · Glosario',
    col(eyebrow('Anexo') + headline(['Glosario: los términos de esta propuesta, en simple'], 60, extra='; margin-top: 30px'), 110, 1600) +
    zone(f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: column; grid-template-rows: repeat(8, auto); column-gap: 64px">{gl27}</div>', 140, 250, 1640) + bubble())))

# 28 · Cierre (compositor)
S.append(('Cierre', img_page('Pibank · Cierre', IMG['C09'], 'Contraportada: Empower your Engine, con los datos de contacto de Efeonce.')))

_m = [t for t, _ in S].index('La meta del banco'); _meta = S.pop(_m)
S.insert([t for t, _ in S].index('Lo que veremos moverse') + 1, _meta)
for _k in ['Cómo se conecta con la meta', 'Evaluación 2026']:
    _x = S.pop([t for t, _ in S].index(_k)); S.insert([t for t, _ in S].index('La meta del banco') + 1, _x)

# ── ritmo: láminas con foto del compositor intercaladas entre las azules (set SEO aprobado, voz Pibank) ──
FOTOS = [('De la búsqueda a la cuenta', 'Encuentran a Pibank al buscar', 'd675c179ed94d303c3cff0a4aa4f7371', 'Sección partida: ¿Encuentran a Pibank al buscar? Todavía no.'),
         ('Cinco frentes', 'Cómo aparece Pibank', '89a8d3e3ea5cc7199b00a922bdaef58a', '¿Cómo aparece Pibank? Paso a paso: base técnica, contenido, herramientas e informe mensual.'),
         ('SEO técnico', 'Y si hay que tocar código', '9840a86dca8a3254268812d6a519d9c0', '¿Y si hay que tocar código? Lo hacemos: WordPress de pibank.pe.'),
         ('Respuestas de IA (AEO)', 'Qué dice la IA de Pibank', '6540e9e599c1d73e1c312e6aa958d40c', '¿Qué dice la IA de Pibank? Lo sabremos: panel de respuestas de IA.'),
         ('Comunidad y PR', 'E-E-A-T', '81f7c41d2e679b0e5f31cc6fc5498ee7', 'E-E-A-T en banca: ¿Qué hace citable a Pibank? Lo verificable: fuentes vigentes, autoría y revisión, condiciones claras y datos consistentes.'),
         ('Equipo de la cuenta', 'Métricas SEO y AEO', '02654e6b3f11d2753c580dee51977793', '¿Cómo se mide la visibilidad? Cinco métricas de SEO y AEO con fórmula, fuente y dueño.'),
         ('Equipo de la cuenta', 'Reporte mensual', '48d063a211117f41d6652bcdfb94b9cc', '¿Cómo lo verán? Cada mes: reporte de Efeonce Insights y revisión en Teams.'),
         ('Inversión', 'Por qué Efeonce', '182202cde0d97d420102df86c5e84201', '¿Qué nos hace distintos? Se puede medir: método medible frente a una agencia commodity.'),
         ('Inversión', 'Clientes', '12372e4e846fefaf3f764ce6ee3e3953', '¿Quién confía en nosotros? Marcas líderes: clientes de Efeonce y casos publicados.'),
         ('Inversión', 'Caso BICECORP', 'fac667cd8b01f546ae5003e27a5d5ddc', 'Caso de éxito BICECORP: ¿Qué cambió? Más visible.'),
         ('Inversión', 'Caso Banco BICE', '5e7b9a504979ba23d93cf791f0f21d3b', 'Caso de éxito Banco BICE: ¿Qué logró? Más cuentas.'),
         ('Inversión', 'Caso Berel', '36de7907d0d999ab6414d06bc8cbebf8', 'Caso de éxito Berel: ¿Qué cambió? Lo eligen.'),
         ('Inversión', 'Cinco países', 'cdb4ea4bbba4a91bcfb9df3f7555d139', '¿Dónde operamos? Cinco países: Chile, Estados Unidos, Colombia, México y Perú.'),
         ('Por qué Efeonce', 'Tu día a día', '7a7c5e3e80d16d7c4c9b7c60d2056050', 'Tu día a día con Efeonce: ¿Dónde ves lo que pasa? Todo junto: Teams, Notion, Frame.io y el reporte en vivo de Efeonce Insights en tu panel.'),
         ('Por qué Efeonce', 'A la vista', '228a4d1b4e960751d9d9860b3332d45d', 'Tu día a día con Efeonce: ¿Cómo avanza tu SEO? A la vista: plan en Notion y aprobación de cada landing en Frame.io.')]
# La sección partida abre el capítulo 1: sobre el papel, debajo de la voz, el índice del capítulo (lectura sin presentador).
NAVY, PSOFT = '#023c70', '#5f5a69'
toc1 = [('De la búsqueda a la cuenta', 'De la búsqueda a la cuenta'), ('Lo que vimos en Google', 'Hoy no encuentra a Pibank'),
        ('Dónde está la demanda', 'La demanda'), ('El diagnóstico técnico', 'Diagnóstico técnico')]
SPLIT_OVERLAY = (f'<div style="position: absolute; left: 140px; top: 832px; width: 700px; font-family: {ST}">'
                 f'<div style="font-size: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: {PSOFT}; margin-bottom: 6px">En este capítulo</div>'
                 + ''.join(f'<div style="display: grid; grid-template-columns: 44px minmax(0, 1fr); padding: 5px 0; border-top: 1px solid rgba(2, 60, 112, 0.14); font-size: 18px; color: {NAVY}">'
                           f'<span style="font-weight: 600">⟦{ref}⟧</span><span style="font-weight: 400">{name}</span></div>' for name, ref in toc1) + '</div>')
OVERLAYS = {'Encuentran a Pibank al buscar': SPLIT_OVERLAY}
for before, title, blob, alt in FOTOS:
    i = [t for t, _ in S].index(before)
    img = f'<img src="{BL(blob)}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px">'
    S.insert(i, (title, page('Pibank · ' + title, img + OVERLAYS.get(title, ''))))
import re
NUM = {t: i + 1 for i, (t, _) in enumerate(S)}
S = [(t, re.sub(r'⟦([^⟧]+)⟧', lambda m: str(NUM[m.group(1)]), h)) for t, h in S]
assert not any('⟦' in h for _, h in S)

# ── canvas: cuatro láminas por fila ──
N = len(S)
assert N == 46, N
idx = json.load(open(f'{ROOT}/canvas.json'))
for f in list(idx['boards']):
    if f.startswith('Tec-'):
        del idx['boards'][f]
for i, (title, html) in enumerate(S):
    fn = f'Tec-{i + 1:02d}.dc.html'
    open(f'{ROOT}/{fn}', 'w').write(html)
    idx['boards'][fn] = {'x': (i % 4) * 2000, 'y': (i // 4) * 1380, 'w': 1920, 'h': 1080, 'title': f'{i + 1:02d} · {title}', 'page': 'tecnica'}
others = [o for o in idx['order'] if not o.startswith('Tec-')]
idx['order'] = [f'Tec-{i + 1:02d}.dc.html' for i in range(N)] + others
for p in idx['pages']:
    if p['id'] == 'tecnica':
        p['name'] = f'Propuesta técnica · {N}'
idx['notes']['titulo-tecnica']['text'] = 'Pibank 2027 · Propuesta técnica · v11 del 08-10 · con la evaluación 2026 que pidió el banco'
idx['notes']['pendientes-tecnica']['text'] = ('Para revisar\n\n1. Equipo: Andrés, Valentina, Julio y Daniela confirmados; diseño visual por asignar antes del inicio.\n\n'
    '2. v5: cada título afirma su conclusión y las láminas con datos explican al pie qué significan para Pibank.\n\n'
    '3. v7: por qué Efeonce y clientes, costo por cuenta y anexo de supuestos.\n\n'
    '4. Las láminas con foto, portada, ciclo, medición, equipo y cierre salen del compositor (imagen); las demás se editan aquí.')
json.dump(idx, open(f'{ROOT}/canvas.json', 'w'), ensure_ascii=False, indent=2)
print('ok', N)
