# SGS Chile · Propuesta de trazabilidad comercial — deck que se lee sin presentador (v2, 2026-10-19).
# Molde aprobado «propuesta que se lee sin presentador» (Pibank/UTEM; deck-studio, propuesta-tecnica-seo-sin-presentador.md),
# línea revenue-salesforce, fondo Efeonce. Fuente narrativa: docs/commercial/prospects/sgs-chile-contactabilidad-2026/
# CASO-DE-NEGOCIO.md, Parte A. Si cambia el caso, se cambia este archivo y se regenera; nunca al revés.
# Portada, contraportada y las láminas con receta salen del compositor (build-intents.py + pnpm brand:compose) y entran
# como imagen. Las láminas propias usan solo tokens de La órbita e íconos de AXIS (axis-assets.mjs).
# Uso: python3 build-deck.py <carpeta project del canvas> [blobs.json]
import json, os, sys

ROOT = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
AX = json.load(open(os.path.join(HERE, 'axis-assets.json')))
BLOBS = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'blobs.json')))
ACC = '#2fb8ff'  # acento revenue-salesforce sobre oscuro (nunca en texto de menos de 24 px)
ACC_RGB = '47, 184, 255'
TEAL = '#36c8bf'  # dato de Efeonce Insights
URL = BLOBS['url-bubble-dark']
DARK = dict(name='dark', bg='#001a33', ink='#ffffff', soft='#cfe4fa', rule='rgba(114, 222, 216, 0.16)')
ID = "'Bricolage Grotesque', system-ui, sans-serif"; ST = "'Poppins', system-ui, sans-serif"
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">'
t = DARK


def page(title, body, section=None, foot=True):
    nav = f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">{AX["nav"]["dark-" + str(section)]}</svg>' if section else ''
    bubble = f'<img src="{URL}" alt="efeoncepro.com" style="position: absolute; left: 140px; bottom: 60px; height: 40px">' if foot else ''
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
{bubble}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''


def img_page(title, blob, alt):
    return page(title, f'<img src="{blob}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px">', foot=False)


def sphere():
    return f'<span style="display: inline-block; width: 0.2em; height: 0.2em; border-radius: 50%; background: {ACC}; margin-left: 0.04em"></span>'


def eyebrow(text):
    ring = f'<span style="display: inline-block; width: 14px; height: 14px; box-sizing: border-box; border: 3px solid {ACC}; border-radius: 50%; margin-right: 16px; vertical-align: -1px"></span>'
    return f'<div style="font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #ffffff">{ring}{text}</div>'


def headline(lines, px, extra=''):
    return f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.96; white-space: nowrap; color: #ffffff{extra}">{"<br>".join(lines)}{sphere()}</div>'


def body(text, px=22, width=560, extra=''):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: #ffffff; max-width: {width}px{extra}">{text}</div>'


def para(text, px=20, extra=''):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: {t["soft"]}{extra}">{text}</div>'


def source(text, extra=''):
    return f'<div style="font-size: 15px; font-weight: 400; line-height: 1.5; color: {t["soft"]}{extra}">{text}</div>'


def label(text, color=None, extra=''):
    return f'<div style="font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: {color or t["soft"]}{extra}">{text}</div>'


def col(inner, top=120, width=600):
    return f'<div style="position: absolute; left: 140px; top: {top}px; width: {width}px; display: flex; flex-direction: column">{inner}</div>'


def zone(inner, left, top, width, extra=''):
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px{extra}">{inner}</div>'


def icon(glyph, size=52, extra=''):
    return f'<div style="width: {size}px; height: {size}px; margin: 0 0 4px -4px{extra}">{AX["icons"][glyph + "-dark"]}</div>'


def halo_platform(cx=1290, cy=440, pcx=1290, pcy=900, prx=520, pry=70):
    return f'''<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">
<defs>
<radialGradient id="hl" cx="{cx}" cy="{cy}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{ACC}" stop-opacity="0.22"/><stop offset="0.4" stop-color="{ACC}" stop-opacity="0.07"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient>
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000814" stop-opacity="0.5"/></linearGradient>
<radialGradient id="pf" cx="{pcx}" cy="{pcy}" r="{prx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 {pcy - pcy * 0.16:.0f}) scale(1 0.16)"><stop offset="0" stop-color="{ACC}" stop-opacity="0.34"/><stop offset="0.7" stop-color="{ACC}" stop-opacity="0.06"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient>
<filter id="pg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<rect width="1920" height="1080" fill="url(#hl)"/>
<rect y="778" width="1920" height="302" fill="url(#fl)"/>
<ellipse cx="{pcx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="url(#pf)"/>
<ellipse cx="{pcx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="none" stroke="{ACC}" stroke-opacity="0.55" stroke-width="3"/>
<path d="M {pcx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {pcx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{ACC}" stroke-width="14" opacity="0.45" filter="url(#pg)"/>
<path d="M {pcx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {pcx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{ACC}" stroke-width="6" stroke-linecap="round"/>
</svg>'''


def halo_only(cx, cy, op=0.2):
    return (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true"><defs>'
            f'<radialGradient id="ho" cx="{cx}" cy="{cy}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{ACC}" stop-opacity="{op}"/>'
            f'<stop offset="0.45" stop-color="{ACC}" stop-opacity="0.06"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="1920" height="1080" fill="url(#ho)"/></svg>')


def obj(inner, left, top, width, hero=False, extra=''):
    sh = (f'box-shadow: 0 0 0 2px rgba({ACC_RGB}, 0.9), 0 50px 110px rgba(0, 6, 16, 0.75), 0 0 120px rgba({ACC_RGB}, 0.32); background: linear-gradient(180deg, #0f3556 0%, #061c33 100%); border-radius: 28px; padding: 30px 32px 32px;'
          if hero else
          'box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 22px 44px rgba(0, 6, 16, 0.6); background: linear-gradient(180deg, #0c2c49 0%, #061c33 100%); border-radius: 22px; padding: 26px 28px 28px;')
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px; box-sizing: border-box; {sh}{extra}">{inner}</div>'


def okicker(text):
    return f'<div style="font-weight: 600; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">{text}</div>'


def otitle(text, px=30, extra=''):
    return f'<div style="font-family: {ID}; font-weight: 740; font-size: {px}px; letter-spacing: -0.02em; line-height: 1.08; margin-top: 10px{extra}">{text}</div>'


def otext(text, px=18, extra=''):
    return f'<div style="font-weight: 400; font-size: {px}px; line-height: 1.42; color: #c9d6e2; margin-top: 10px{extra}">{text}</div>'


def trow(cells, widths, px=19, pad=16, first_strong=True):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    cs = ''.join(f'<div style="font-size: {px}px; line-height: 1.38; {"font-weight: 600; color: #ffffff" if (j == 0 and first_strong) else "font-weight: 400; color: " + t["soft"]}">{c}</div>' for j, c in enumerate(cells))
    return f'<div style="display: grid; grid-template-columns: {tpl}; column-gap: 32px; padding: {pad}px 24px; border-top: 1px solid {t["rule"]}; align-items: start">{cs}</div>'


def thead(cells, widths):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    return f'<div style="display: grid; grid-template-columns: {tpl}; column-gap: 32px; padding: 0 24px 16px">{"".join(f"<div>{label(c)}</div>" for c in cells)}</div>'


def table(rows, widths, head=None, px=19, pad=16):
    return (thead(head, widths) if head else '') + ''.join(trow(r, widths, px, pad) for r in rows)


def means(text, src='', top=820):
    right = f'<div style="padding-top: 22px">{source(src)}</div>' if src else '<div></div>'
    return zone(f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) 460px; column-gap: 60px; padding-top: 16px; border-top: 1px solid {t["rule"]}">'
                f'<div>{label("Qué significa para ustedes", "#ffffff")}<div style="font-size: 21px; font-weight: 400; line-height: 1.4; color: #ffffff; margin-top: 8px">{text}</div></div>'
                f'{right}</div>', 140, top, 1640)


def callout(text, extra=''):
    return f'<div style="border-left: 3px solid {ACC}; padding: 4px 0 4px 16px; font-size: 18px; font-weight: 400; line-height: 1.45; color: #ffffff{extra}">{text}</div>'


def navmini(n):
    return f'<svg viewBox="1712 82 96 96" width="60" height="60" aria-hidden="true">{AX["nav"]["dark-" + str(n)]}</svg>'


def chip(x, on=True):
    bg = 'background: rgba(255, 255, 255, 0.08)' if on else 'box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.3)'
    return f'<div style="padding: 8px 12px; border-radius: 10px; font-size: 15px; font-weight: 500; line-height: 1.3; {bg}">{x}</div>'


def tag(x, on=False):
    st = f'background: {ACC}; color: #001a33' if on else 'box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.45); color: #ffffff'
    return f'<span style="display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; {st}">{x}</span>'


S = []
N = {}


def add(key, title, fn):
    S.append((key, title, fn))


def ref(key):
    return f'{N[key]}'


CAP = {1: 'Capítulo 1 · Hoy', 2: 'Capítulo 2 · La solución', 3: 'Capítulo 3 · Implementación', 4: 'Capítulo 4 · Revisión regional', 5: 'Capítulo 5 · La decisión'}

# ── 01 · Portada (compositor) ─────────────────────────────────────────────────────────────────────────────────────
add('portada', 'Portada', lambda: img_page('Portada', BLOBS['P01'], 'Portada: Propuesta técnica de trazabilidad comercial para SGS Chile, con el logo de SGS dentro de la órbita.'))

# ── 02 · Cómo leer ───────────────────────────────────────────────────────────────────────────────────────────────
CHAP = [(1, '¿Qué pasa hoy con el registro?', 'hoy', 'criterios'),
        (2, '¿Cómo funciona la solución?', 'solucion', 'alternativas'),
        (3, '¿Cómo se implementa con el equipo?', 'etapas', 'implementacion'),
        (4, '¿Qué necesita el equipo regional?', 'region', 'privacidad'),
        (5, '¿Cómo se mide y se decide?', 'medicion', 'pasos')]


def s_leer():
    rows = ''.join(f'<div style="display: grid; grid-template-columns: 60px minmax(0, 1fr); column-gap: 28px; align-items: center; padding: 20px 0; border-top: 1px solid {t["rule"]}">{navmini(n)}'
                   f'<div><div style="font-family: {ID}; font-size: 32px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1">{q}</div>'
                   f'<div style="font-size: 18px; font-weight: 300; color: #cfe4fa; margin-top: 6px">Capítulo {n} · láminas {ref(a)} a {ref(b)}</div></div></div>' for n, q, a, b in CHAP)
    annex = f'Anexos · Supuestos y fuentes, lámina {ref("supuestos")} · Glosario, lámina {ref("glosario")}'
    return page('Cómo leer esta propuesta',
                col(eyebrow('Cómo leer esta propuesta') + headline(['Cinco preguntas,', 'una por', 'capítulo'], 84, '; margin-top: 60px') +
                    body('Cada título dice la conclusión de su lámina. Las láminas con contenido cierran con lo que significa para ustedes.', 22, 560, '; margin-top: 40px') +
                    callout(f'Llamamos «equipo regional» al equipo de SGS que administra Salesforce para la región. El capítulo 4 reúne lo que le pedimos, los permisos y las condiciones.', '; margin-top: 28px; max-width: 540px') +
                    para('El círculo de la esquina superior derecha indica el capítulo.', 18, '; margin-top: 22px'), 120, 600) +
                zone(rows + f'<div style="padding-top: 18px; border-top: 1px solid {t["rule"]}">{label(annex, "#cfe4fa")}</div>', 820, 150, 960))


add('leer', 'Cómo leer esta propuesta', s_leer)


# ── 03 · Resumen ─────────────────────────────────────────────────────────────────────────────────────────────────
def s_resumen():
    fig = lambda v, px: f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9; margin-top: 14px; white-space: nowrap">{v}</div>'
    cards = (obj(okicker('Decisión 1 · SGS Chile') + otitle('Un piloto', 44) +
                 otext('Un equipo comercial de 8 a 12 ejecutivos registra correo, llamadas, WhatsApp y reuniones sin trabajo manual.', 17), 820, 330, 300, False, '; height: 380px') +
             obj(okicker('Qué se logra') + otitle('Un historial, dos vistas', 38) +
                 otext('La ficha de cada cliente con todos sus contactos, y un panel de contactabilidad para la jefatura.', 17) +
                 f'<div style="display: grid; gap: 7px; margin-top: 18px">{chip("Vista de cuenta · en Salesforce")}{chip("Vista de gestión · panel Efeonce Insights")}</div>', 1150, 250, 300, True, '; height: 540px') +
             obj(okicker('Decisión 2 · Equipo regional') + fig('5', 96) + otitle('ajustes en Salesforce', 26) +
                 otext('Acotadas al grupo piloto y reversibles. Las tres primeras etapas no las necesitan.', 17), 1480, 330, 300, False, '; height: 380px'))
    return page('Resumen', halo_platform(1300, 500, 1300, 840, 560, 50) + cards +
                col(eyebrow('Resumen') + headline(['Cada contacto', 'con un cliente,', 'registrado', 'sin anotarlo'], 72, '; margin-top: 56px') +
                    body('Proponemos llamar desde un número de empresa en Aircall, mantener el WhatsApp en su app y su número con WhatsApp Coexistence, registrar el correo con lo que Salesforce ya incluye y dar a la jefatura un panel propio.', 20, 560, '; margin-top: 28px') +
                    callout(f'El cambio principal: un número fijo de empresa para llamar; el WhatsApp no cambia (lámina {ref("cambios")}).', '; margin-top: 24px; max-width: 560px') +
                    f'<div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid {t["rule"]}">{label("Quién hace qué", "#ffffff")}'
                    f'<div style="font-family: {ID}; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin-top: 10px">Efeonce diseña, construye, habilita y opera. SGS Chile define el equipo y decide en cada etapa.</div></div>', 120, 600))


add('resumen', 'Resumen', s_resumen)


# ── Capítulo 1 · Hoy ─────────────────────────────────────────────────────────────────────────────────────────────
def s_hoy():
    canales = [('reunion', 'Reuniones', 'Se registran solas', 'Cuando el ejecutivo agenda con el cliente.', 'Automático'),
               ('correo', 'Correo', 'Seguimiento parcial', 'Falta confirmar que esté activo para todo el equipo.', 'Por confirmar'),
               ('llamada', 'Llamadas y negocios', 'Se anotan a mano', 'Compiten con el tiempo de venta; el historial queda incompleto.', 'Manual'),
               ('social', 'WhatsApp', 'No quedan registrados', 'No se sabe cuántas veces se contactó a un cliente ni por qué canal.', 'Sin registro')]
    cards = ''.join(obj(icon(g) + okicker(c) + otitle(ti, 26) + otext(x, 16) + f'<div style="margin-top: 16px">{tag(s, i == 3)}</div>',
                        820 + (i % 2) * 490, 210 + (i // 2) * 300, 460, i == 3, '; height: 280px')
                    for i, (g, c, ti, x, s) in enumerate(canales))
    return page('Hoy', halo_only(1300, 470) + cards +
                col(eyebrow(CAP[1]) + headline(['Hoy solo las', 'reuniones se', 'registran solas'], 74, '; margin-top: 56px') +
                    body('El resto depende de que el ejecutivo lo anote, o no queda.', 22, 560, '; margin-top: 30px') +
                    f'<div style="margin-top: 34px; display: grid; gap: 18px">'
                    f'<div>{label("Para quien lleva la cuenta", "#ffffff")}{para("Carga administrativa: registrar cada contacto le quita tiempo de venta.", 19, "; margin-top: 6px")}</div>'
                    f'<div>{label("Para la jefatura comercial", "#ffffff")}{para("Falta de visibilidad: no se pueden detectar clientes sin seguimiento.", 19, "; margin-top: 6px")}</div></div>', 120, 600) +
                means('El problema no es la herramienta: es que registrar cuesta. La solución tiene que registrar sin pedirle trabajo al ejecutivo.',
                      'Levantado con SGS Chile. Otra unidad de negocio ya había pedido lo mismo.'), section=1)


add('hoy', 'Cómo están hoy', s_hoy)


def s_vistas():
    gest = [('Intentos por cliente', 'por canal y resultado'), ('Clientes sin contacto', 'en el período'), ('Cobertura', 'por equipo')]
    grows = ''.join(f'<div style="padding: 12px 0; border-top: 1px solid rgba(255, 255, 255, 0.10)"><div style="font-size: 17px; font-weight: 600">{a}</div><div style="font-size: 14px; color: #9fb4c8">{b}</div></div>' for a, b in gest)
    cards = (zone(label('Vista de cuenta · en Salesforce', '#ffffff'), 820, 196, 600) + sf_record(820, 230, 600, 430) +
             obj(icon('medicion') + okicker('Vista de gestión') + otitle('El panel de contactabilidad', 28) + otext('Excelencia comercial y las jefaturas verán el seguimiento de todas las cuentas, sin pedir reportes.', 16) +
                 f'<div style="margin-top: 12px">{grows}</div>', 1450, 230, 330, True, '; height: 430px'))
    return page('Dos vistas', halo_only(1300, 480) + cards +
                col(eyebrow(CAP[1] + ' · Objetivo') + headline(['Un historial,', 'dos vistas'], 84, '; margin-top: 56px') +
                    body('Las dos vistas partirán de los mismos contactos: lo que el ejecutivo haga con el cliente quedará en su ficha de Salesforce, y la jefatura lo verá en su panel.', 21, 560, '; margin-top: 30px') +
                    callout('Fuera de alcance en el piloto: agentes de IA, campañas de marketing, rediseño del modelo de datos y otros países.', '; margin-top: 30px; max-width: 540px'), 120, 600) +
                means('Quien lleva la cuenta dejará de anotar y verá todo en la línea de tiempo de la cuenta; la jefatura sabrá qué clientes están sin seguimiento sin pedírselo a nadie.',
                      'Ejemplo ilustrativo de una ficha: nombres, cuenta y horas no son datos de SGS.'), section=1)


add('vistas', 'Un historial, dos vistas', s_vistas)


def s_criterios():
    crit = [('seguridad', 'El gobierno regional se respeta', 'Todo cambio dentro de Salesforce lo aprueba y lo despliega el equipo regional.'),
            ('talent', 'Piloto por grupo de usuarios', 'Las capacidades se asignan por usuario; el resto de la organización no ve cambios.'),
            ('checklist', 'Se registra el contacto, no se graba', 'Quién, a quién, cuándo, por qué canal y con qué resultado. Sin grabar ni transcribir llamadas.'),
            ('reloj', 'Menos trabajo para el ejecutivo', 'Llama y escribe desde su celular; el registro ocurre solo.'),
            ('objetivo', 'Se miden cuentas, no personas', 'La información sirve para dar seguimiento a los clientes, no para evaluar a cada ejecutivo.')]
    items = ''.join(f'<div style="display: grid; grid-template-columns: 60px minmax(0, 1fr); column-gap: 22px; align-items: start; padding: 18px 0; border-top: 1px solid {t["rule"]}">'
                    f'{icon(g)}<div><div style="font-family: {ID}; font-size: 28px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1">{a}</div>'
                    f'<div style="font-size: 18px; font-weight: 300; line-height: 1.4; color: #cfe4fa; margin-top: 6px">{b}</div></div></div>' for g, a, b in crit)
    return page('Criterios de diseño',
                col(eyebrow(CAP[1] + ' · Criterios') + headline(['Cinco reglas', 'guían el', 'diseño'], 84, '; margin-top: 56px') +
                    body('Son las condiciones que la solución cumple desde el primer día, y la base para que el equipo regional la apruebe.', 22, 560, '; margin-top: 30px'), 120, 600) +
                zone(items, 820, 210, 960) +
                means('Nada de lo que se propone cambia la configuración común del equipo regional ni la experiencia de los otros países.'), section=1)


add('criterios', 'Criterios de diseño', s_criterios)

# ── Capítulo 2 · La solución ─────────────────────────────────────────────────────────────────────────────────────
add('solucion', 'Nuestra propuesta', lambda: img_page('Nuestra propuesta', BLOBS['P04'], 'Nuestra propuesta: ¿Hay que anotar cada contacto? Ya no. Se llega en cuatro etapas: diagnóstico, piloto en Chile, conexión y operación.'))


def s_ejecutivo():
    rows = [('Correo y reuniones', 'Como hoy, desde Outlook.', 'Cada correo con un cliente y cada reunión, en la ficha.'),
            ('Llamadas', 'Desde la app de Aircall en su celular o computador, con un número de empresa.', 'Cada llamada, incluidas las no contestadas y las perdidas, con su resultado.'),
            ('WhatsApp', 'Desde la app de WhatsApp Business que ya usa, con el número que sus clientes conocen.', 'Cada mensaje enviado y recibido, también los escritos desde la app, como actividad en la ficha.')]
    gl = ['correo', 'llamada', 'social']
    head = thead(['Canal', 'Cómo trabaja el ejecutivo', 'Qué queda en Salesforce'], [1, 1.5, 1.5])
    body_rows = ''.join(f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1.5fr); column-gap: 32px; padding: 22px 24px; border-top: 1px solid {t["rule"]}; align-items: start">'
                        f'<div style="display: flex; gap: 14px; align-items: center"><div style="width: 44px; height: 44px">{AX["icons"][gl[i] + "-dark"]}</div>'
                        f'<div style="font-family: {ID}; font-size: 26px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1">{a}</div></div>'
                        f'<div style="font-size: 19px; line-height: 1.4; color: #cfe4fa">{b}</div><div style="font-size: 19px; line-height: 1.4; color: #ffffff">{c}</div></div>' for i, (a, b, c) in enumerate(rows))
    return page('Cómo trabaja el ejecutivo',
                col(eyebrow(CAP[2]) + headline(['Se trabajará', 'como siempre;', 'el registro', 'será automático'], 74, '; margin-top: 56px') +
                    body('Una app nueva solo para llamar. El WhatsApp sigue en su app y el correo y las reuniones usan lo que Salesforce ya incluye.', 21, 560, '; margin-top: 30px'), 120, 600) +
                zone(head + body_rows, 820, 200, 960) +
                means('Que las llamadas no contestadas también queden registradas es lo que permitirá contar intentos y no solo conversaciones. El resultado saldrá de la propia llamada: el ejecutivo no tendrá que clasificarlo.'), section=2)


add('ejecutivo', 'Cómo trabaja el ejecutivo', s_ejecutivo)


def sized(glyph, px):
    import re
    return re.sub(r'(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"', r'\1 width="%d" height="%d"' % (px, px), AX['icons'][glyph + '-dark'], count=1)


def sf_record(x, y, w, h):
    # Ficha de cuenta de Salesforce en clave Lightning (fondo claro, línea de tiempo de actividades). Datos ilustrativos.
    INK, SOFTL, LINE = '#16325c', '#54698d', '#dddbda'
    item = lambda glyph, bg, title, rel, when: (
        f'<div style="display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; column-gap: 12px; align-items: start; padding: 11px 0; border-top: 1px solid {LINE}">'
        f'<div style="width: 34px; height: 34px; border-radius: 8px; background: {bg}; display: flex; align-items: center; justify-content: center; line-height: 0">{sized(glyph, 20)}</div>'
        f'<div><div style="font-size: 15px; font-weight: 600; color: #0b5cab">{title}</div><div style="font-size: 12.5px; color: {SOFTL}; margin-top: 2px">{rel}</div></div>'
        f'<div style="font-size: 12.5px; color: {SOFTL}; white-space: nowrap">{when}</div></div>')
    field = lambda k, v: f'<div><div style="font-size: 11.5px; color: {SOFTL}">{k}</div><div style="font-size: 14px; font-weight: 600; color: {INK}; margin-top: 2px">{v}</div></div>'
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; box-sizing: border-box; border-radius: 18px; overflow: hidden; '
            f'background: #f3f3f3; box-shadow: 0 50px 110px rgba(0, 6, 16, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.2); font-family: {ST}">'
            f'<div style="background: #ffffff; padding: 16px 20px; border-bottom: 1px solid {LINE}; display: flex; align-items: center; gap: 14px">'
            f'<img src="{BLOBS["sf-logo"]}" alt="Salesforce" style="height: 26px; display: block">'
            f'<div style="width: 1px; height: 24px; background: {LINE}"></div>'
            f'<img src="{BLOBS["sf-sales"]}" alt="" style="width: 30px; height: 30px; display: block">'
            f'<div><div style="font-size: 11.5px; color: {SOFTL}">Cuenta</div><div style="font-size: 20px; font-weight: 700; color: {INK}; line-height: 1.1">Minera Andes</div></div></div>'
            f'<div style="background: #ffffff; padding: 12px 20px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; border-bottom: 1px solid {LINE}">'
            f'{field("Propietario", "R. Soto")}{field("Oportunidad abierta", "Inspección 2027")}{field("Etapa", "Negociación")}</div>'
            f'<div style="margin: 12px; background: #ffffff; border-radius: 10px; box-shadow: 0 0 0 1px {LINE}; padding: 4px 16px 6px">'
            f'<div style="display: flex; gap: 22px; font-size: 13.5px; font-weight: 600; padding: 10px 0 8px">'
            f'<span style="color: {INK}; box-shadow: inset 0 -3px 0 #0b5cab; padding-bottom: 6px">Actividad</span><span style="color: {SOFTL}">Detalles</span><span style="color: {SOFTL}">Relacionado</span></div>'
            f'{item("llamada", "#16325c", "Llamada · no contestada", "Pedro Rojas · Inspección 2027", "Hoy 10:42")}'
            f'{item("social", "#16325c", "WhatsApp · enviado", "Pedro Rojas · Inspección 2027", "Hoy 10:45")}'
            f'{item("correo", "#16325c", "Correo · cotización enviada", "Pedro Rojas · Inspección 2027", "Ayer 17:10")}'
            f'{item("reunion", "#16325c", "Reunión · visita técnica", "Ana Pérez · Inspección 2027", "Lun 09:00")}'
            f'</div></div>')


def s_aircall():
    # Escena: un celular grande sobre la plataforma de luz, con la llamada saliendo del número de empresa y el registro
    # en Salesforce; cuatro fichas alrededor con lo que hay que saber. Interfaz genérica (no imita la app de Aircall).
    phone_x, phone_y, phone_w, phone_h = 1130, 150, 360, 720
    btn = lambda glyph, lab, on=False: (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 8px">'
                                        f'<div style="width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; '
                                        f'{"background: #e5484d" if on else "background: rgba(255, 255, 255, 0.10)"}"><div style="width: 30px; height: 30px; line-height: 0">{sized(glyph, 30)}</div></div>'
                                        f'<div style="font-size: 12px; color: #9fb4c8">{lab}</div></div>')
    screen = (f'<div style="position: absolute; inset: 14px; border-radius: 44px; overflow: hidden; background: linear-gradient(180deg, #0b2742 0%, #04121f 100%); '
              f'display: flex; flex-direction: column; align-items: center; padding: 64px 26px 28px; box-sizing: border-box">'
              f'<div style="font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #9fb4c8">Llamada saliente</div>'
              f'<div style="width: 96px; height: 96px; border-radius: 50%; margin-top: 26px; background: rgba({ACC_RGB}, 0.16); box-shadow: 0 0 0 2px rgba({ACC_RGB}, 0.55); '
              f'display: flex; align-items: center; justify-content: center; font-family: {ID}; font-size: 38px; font-weight: 740">MA</div>'
              f'<div style="font-family: {ID}; font-size: 28px; font-weight: 740; margin-top: 18px">Minera Andes</div>'
              f'<div style="font-size: 15px; color: #cfe4fa; margin-top: 4px">Jefe de compras</div>'
              f'<div style="font-family: {ID}; font-size: 44px; font-weight: 300; margin-top: 22px; font-variant-numeric: tabular-nums">00:42</div>'
              f'<div style="margin-top: 14px; padding: 8px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); font-size: 13px; color: #ffffff">'
              f'Desde +56 2 2XXX XXXX · número SGS</div>'
              f'<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px 22px; margin-top: 34px">{btn("checklist", "Resultado")}{btn("crm", "Ficha")}{btn("llamada", "Colgar", True)}</div>'
              f'<div style="margin-top: auto; width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 16px; background: rgba({ACC_RGB}, 0.14); '
              f'box-shadow: inset 0 0 0 1px rgba({ACC_RGB}, 0.5); display: flex; align-items: center; gap: 10px">'
              f'<div style="width: 28px; height: 28px; flex: none; line-height: 0">{sized("checklist", 28)}</div>'
              f'<div style="font-size: 13px; line-height: 1.35; color: #ffffff"><strong>Registrada en Salesforce</strong><br><span style="color: #cfe4fa">en la ficha de Minera Andes</span></div></div>'
              f'</div>')
    phone = (f'<div style="position: absolute; left: {phone_x}px; top: {phone_y}px; width: {phone_w}px; height: {phone_h}px; border-radius: 58px; '
             f'background: linear-gradient(160deg, #2a3d52 0%, #0a1726 60%, #1b2c3f 100%); '
             f'box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.14), 0 60px 120px rgba(0, 6, 16, 0.8), 0 0 140px rgba({ACC_RGB}, 0.35)">'
             f'{screen}<div style="position: absolute; left: 50%; top: 26px; width: 110px; height: 30px; margin-left: -55px; border-radius: 999px; background: #000"></div></div>')
    chip = lambda x, y, glyph, k, t, w=300: obj(f'<div style="display: flex; gap: 14px; align-items: flex-start"><div style="width: 44px; height: 44px; flex: none">{AX["icons"][glyph + "-dark"]}</div>'
                                                f'<div>{okicker(k)}<div style="font-family: {ID}; font-size: 22px; font-weight: 740; letter-spacing: -0.01em; line-height: 1.15; margin-top: 6px">{t}</div></div></div>',
                                                x, y, w, False, '; padding: 20px 22px')
    chips = (chip(780, 250, 'llamada', 'El número', 'Fijo de su ciudad, no móvil') +
             chip(780, 560, 'social', 'WhatsApp', 'Sigue en su app, con Coexistence') +
             chip(1560, 330, 'integracion', 'Salesforce', 'Cada llamada quedará en la ficha', 260) +
             chip(1560, 640, 'contrato', 'Se contrata', 'Por usuario, más consumo', 260))
    return page('Qué es Aircall',
                halo_platform(1310, 480, 1310, 905, 600, 60) + phone + chips +
                zone(f'<img src="{BLOBS["aircall-logo"]}" alt="Aircall" style="width: 300px; display: block">', 140, 210, 400) +
                col(eyebrow(CAP[2] + ' · Aircall') +
                    f'<div style="height: 170px"></div>' +
                    headline(['Un número', 'de empresa', 'en el celular'], 64, '; margin-top: 30px') +
                    body('Aircall es una aplicación de telefonía para empresas. El ejecutivo la usará en su celular o computador, y cada llamada quedará registrada.', 19, 520, '; margin-top: 26px') +
                    para('Efeonce es partner de Aircall y se encargará de configurarla.', 17, '; margin-top: 18px; max-width: 520px') +
                    source('Ejemplo ilustrativo: cliente y número no son reales.', '; margin-top: 18px'), 120, 560), section=2)


add('aircall', 'Qué es Aircall', s_aircall)


def s_coexistence():
    # Escena: el celular con la conversación de WhatsApp Business del ejecutivo y el aviso de registro; cuatro fichas
    # alrededor. Interfaz genérica en la paleta de la línea (no imita la app de WhatsApp).
    phone_x, phone_y, phone_w, phone_h = 1130, 150, 360, 720
    bub = lambda txt, hour, out: (f'<div style="align-self: {"flex-end" if out else "flex-start"}; max-width: 82%; margin-top: 12px; padding: 10px 14px 8px; '
                                  f'border-radius: {"16px 16px 4px 16px" if out else "16px 16px 16px 4px"}; '
                                  f'background: {"rgba(" + ACC_RGB + ", 0.24)" if out else "rgba(255, 255, 255, 0.09)"}; font-size: 14px; line-height: 1.4; color: #ffffff">'
                                  f'{txt}<div style="font-size: 11px; color: #9fb4c8; text-align: right; margin-top: 4px">{hour}</div></div>')
    screen = (f'<div style="position: absolute; inset: 14px; border-radius: 44px; overflow: hidden; background: linear-gradient(180deg, #0b2742 0%, #04121f 100%); '
              f'display: flex; flex-direction: column; padding: 58px 20px 24px; box-sizing: border-box">'
              f'<div style="display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.10)">'
              f'<div style="width: 46px; height: 46px; flex: none; border-radius: 50%; background: rgba({ACC_RGB}, 0.16); box-shadow: 0 0 0 2px rgba({ACC_RGB}, 0.55); '
              f'display: flex; align-items: center; justify-content: center; font-family: {ID}; font-size: 18px; font-weight: 740">PR</div>'
              f'<div><div style="font-size: 16px; font-weight: 600">Pedro Rojas</div><div style="font-size: 12px; color: #9fb4c8">Minera Andes</div></div></div>'
              f'<div style="margin-top: 10px; align-self: center; padding: 5px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); font-size: 11.5px; color: #cfe4fa">'
              f'WhatsApp Business · el número de siempre</div>'
              f'<div style="display: flex; flex-direction: column; margin-top: 6px">'
              f'<div style="align-self: center; margin-top: 14px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9fb4c8">Julio · historial incorporado</div>'
              f'{bub("Les envío el informe de la última inspección.", "16:20 ✓✓", True)}'
              f'{bub("Gracias, lo reviso con el equipo.", "16:32", False)}'
              f'<div style="align-self: center; margin-top: 14px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9fb4c8">Hoy</div>'
              f'{bub("¿Me confirmas la fecha de la inspección?", "10:41", False)}'
              f'{bub("Sí, el jueves a las 9:00. Te envío la cotización.", "10:45 ✓✓", True)}</div>'
              f'<div style="margin-top: auto; width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 16px; background: rgba({ACC_RGB}, 0.14); '
              f'box-shadow: inset 0 0 0 1px rgba({ACC_RGB}, 0.5); display: flex; align-items: center; gap: 10px">'
              f'<div style="width: 28px; height: 28px; flex: none; line-height: 0">{sized("checklist", 28)}</div>'
              f'<div style="font-size: 13px; line-height: 1.35; color: #ffffff"><strong>Los dos mensajes, en Salesforce</strong><br><span style="color: #cfe4fa">en la ficha de Minera Andes</span></div></div>'
              f'</div>')
    phone = (f'<div style="position: absolute; left: {phone_x}px; top: {phone_y}px; width: {phone_w}px; height: {phone_h}px; border-radius: 58px; '
             f'background: linear-gradient(160deg, #2a3d52 0%, #0a1726 60%, #1b2c3f 100%); '
             f'box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.14), 0 60px 120px rgba(0, 6, 16, 0.8), 0 0 140px rgba({ACC_RGB}, 0.35)">'
             f'{screen}<div style="position: absolute; left: 50%; top: 26px; width: 110px; height: 30px; margin-left: -55px; border-radius: 999px; background: #000"></div></div>')
    chip = lambda x, y, glyph, k, t, w=300: obj(f'<div style="display: flex; gap: 14px; align-items: flex-start"><div style="width: 44px; height: 44px; flex: none">{AX["icons"][glyph + "-dark"]}</div>'
                                                f'<div>{okicker(k)}<div style="font-family: {ID}; font-size: 22px; font-weight: 740; letter-spacing: -0.01em; line-height: 1.15; margin-top: 6px">{t}</div></div></div>',
                                                x, y, w, False, '; padding: 20px 22px')
    chips = (chip(780, 250, 'llamada', 'El número', 'El mismo que sus clientes conocen') +
             chip(780, 560, 'social', 'La app', 'WhatsApp Business, como hoy') +
             chip(1560, 330, 'calendario', 'Historial', 'Hasta 6 meses al conectar', 260) +
             chip(1560, 640, 'integracion', 'Salesforce', 'Cada mensaje, también los de la app', 260))
    return page('WhatsApp Coexistence',
                halo_platform(1310, 480, 1310, 905, 600, 60) + phone + chips +
                col(eyebrow(CAP[2] + ' · WhatsApp') + headline(['El WhatsApp', 'de siempre,', 'ahora registrado'], 62, '; margin-top: 56px') +
                    body('WhatsApp Coexistence es una función oficial de Meta: el mismo número funciona a la vez en la app de WhatsApp Business del ejecutivo y en la plataforma de WhatsApp para empresas, que avisa de cada mensaje enviado o recibido.', 19, 520, '; margin-top: 26px') +
                    callout('Qué cambia en la app: se apagan las listas de difusión, los mensajes temporales y de una sola vez, y la ubicación en tiempo real. Los grupos siguen, pero no se registran.', '; margin-top: 22px; max-width: 520px') +
                    para('Quien hoy escriba desde un WhatsApp personal recibirá un número de empresa.', 17, '; margin-top: 18px; max-width: 520px') +
                    source('Ejemplo ilustrativo: cliente y conversación no son reales.', '; margin-top: 16px'), 120, 560), section=2)


add('coexistence', 'WhatsApp Coexistence', s_coexistence)


def s_arquitectura():
    def node(x, y, w, h, kick, title, sub, hero=False, glyph=None):
        ic = f'<div style="width: 40px; height: 40px; flex: none">{AX["icons"][glyph + "-dark"]}</div>' if glyph else ''
        return obj(f'<div style="display: flex; gap: 14px; align-items: flex-start">{ic}<div>{okicker(kick)}'
                   f'<div style="font-family: {ID}; font-weight: 740; font-size: 24px; letter-spacing: -0.02em; line-height: 1.1; margin-top: 6px">{title}</div>'
                   f'<div style="font-size: 15px; line-height: 1.35; color: #c9d6e2; margin-top: 6px">{sub}</div></div></div>', x, y, w, hero, f'; height: {h}px; padding: 20px 22px')
    # columnas: origen (820), camino (1130), destino (1470)
    src = [(200, 'Outlook', 'Correo y reuniones', 'Como hoy', 'correo'), (355, 'App de Aircall', 'Llamadas', 'Número de empresa', 'llamada'), (510, 'App WhatsApp Business', 'WhatsApp', 'El número de hoy', 'social')]
    via = [(200, 'Incluido en Salesforce', 'Registro de correo', 'Se revisa con el equipo regional'), (355, 'App oficial de Aircall', 'Conector de Aircall', 'Solo usuarios del piloto'), (510, 'Coexistence · Meta', 'Integración WhatsApp', 'La construye Efeonce')]
    parts = ''.join(node(820, y, 280, 135, k, a, b, False, g) for y, k, a, b, g in src)
    parts += ''.join(node(1150, y, 280, 135, k, a, b) for y, k, a, b in via)
    parts += node(1480, 265, 300, 260, 'Vista de cuenta', 'Salesforce', 'Todo queda en la ficha del cliente, con fecha y responsable.', True, 'crm')
    parts += node(1150, 668, 630, 122, 'Vista de gestión · desde el piloto', 'Panel de Efeonce Insights', 'Llamadas desde Aircall, WhatsApp desde Meta; el correo se suma al conectar.', False, 'medicion')
    lines = ''.join(f'<line x1="1100" y1="{y + 67}" x2="1150" y2="{y + 67}" stroke="{ACC}" stroke-opacity="0.7" stroke-width="3"/>'
                    f'<line x1="1430" y1="{y + 67}" x2="1480" y2="{395}" stroke="{ACC}" stroke-opacity="0.7" stroke-width="3"/>' for y in (200, 355, 510))
    lines += f'<path d="M 960 645 L 960 729 L 1150 729" fill="none" stroke="#cfe4fa" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="6 8"/>'
    svg = f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">{lines}</svg>'
    return page('Cómo llega cada canal', halo_only(1300, 430, 0.16) + svg + parts +
                zone(label('Origen'), 820, 168, 280) + zone(label('Camino a Salesforce'), 1150, 168, 280) + zone(label('Destino'), 1480, 233, 300) +
                col(eyebrow(CAP[2] + ' · Arquitectura') + headline(['Tres caminos', 'a la ficha;', 'un panel desde', 'el primer día'], 70, '; margin-top: 56px') +
                    body('Cada canal llega a Salesforce por su propia vía. El panel no espera a Salesforce: recibe las llamadas desde Aircall y los WhatsApp desde la plataforma de Meta.', 20, 560, '; margin-top: 28px') +
                    callout('Hasta conectar con Salesforce, el panel identifica a los clientes por su número; después, por su cuenta.', '; margin-top: 26px; max-width: 540px'), 120, 600) +
                means('El piloto entregará valor antes de pedir nada dentro de Salesforce, y la conexión posterior usará vías acotadas que el equipo regional podrá revisar una a una.'), section=2)


add('arquitectura', 'Cómo llega cada canal', s_arquitectura)


def s_modelo():
    INK, SOFTL, LINE = '#16325c', '#54698d', '#dddbda'
    f = lambda k, api, v: (f'<div style="display: grid; grid-template-columns: 150px minmax(0, 1fr); column-gap: 14px; padding: 9px 0; border-top: 1px solid {LINE}">'
                           f'<div><div style="font-size: 13px; color: {SOFTL}">{k}</div><div style="font-size: 11.5px; color: #8a9bb3">{api}</div></div>'
                           f'<div style="font-size: 15px; font-weight: 600; color: {INK}">{v}</div></div>')
    task = (f'<div style="position: absolute; left: 1290px; top: 230px; width: 490px; box-sizing: border-box; border-radius: 18px; background: #ffffff; padding: 18px 22px 12px; '
            f'box-shadow: 0 50px 110px rgba(0, 6, 16, 0.7), 0 0 0 2px rgba({ACC_RGB}, 0.9), 0 0 120px rgba({ACC_RGB}, 0.3); font-family: {ST}">'
            f'<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px"><img src="{BLOBS["sf-logo"]}" alt="Salesforce" style="height: 24px">'
            f'<div style="font-size: 18px; font-weight: 700; color: {INK}">Actividad (Task)</div></div>'
            f'{f("Tipo", "Type", "WhatsApp")}{f("Asunto", "Subject", "WhatsApp enviado")}{f("Fecha", "ActivityDate", "19-11-2026 · 10:45")}'
            f'{f("Asignado a", "OwnerId", "R. Soto")}{f("Nombre", "WhoId", "Pedro Rojas (contacto)")}{f("Relacionado con", "WhatId", "Minera Andes · Inspección 2027")}</div>')
    src = obj(icon('social') + okicker('WhatsApp avisa') + otitle('Mensaje enviado o recibido', 24) +
              otext('También los que el ejecutivo escribe en su app. Llega por la plataforma de Meta, gracias a Coexistence.', 15), 820, 220, 360, False, '; height: 262px')
    mid = obj(icon('integracion') + okicker('La integración de Efeonce') + otitle('Busca al contacto por su teléfono', 24) +
              otext('Si lo encuentra, crea la actividad; si no, queda en el panel por número. El texto se descarta.', 15), 820, 512, 360, True, '; height: 260px')
    arrows = (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
              f'<path d="M 1000 482 L 1000 512" stroke="{ACC}" stroke-width="3" stroke-opacity="0.8"/>'
              f'<path d="M 1180 642 C 1240 642, 1240 470, 1290 470" fill="none" stroke="{ACC}" stroke-width="3" stroke-opacity="0.8"/></svg>')
    return page('Modelo de datos', halo_only(1300, 470) + arrows + src + mid + task +
                col(eyebrow(CAP[2] + ' · Modelo de datos') + headline(['Un WhatsApp', 'se convertirá en', 'una actividad'], 70, '; margin-top: 56px') +
                    body('Cada mensaje quedará como una actividad estándar de Salesforce, en la ficha del contacto y de su cuenta, sin el texto del mensaje.', 21, 560, '; margin-top: 30px') +
                    callout('No se crean objetos ni campos nuevos: solo el valor «WhatsApp» en el tipo de actividad.', '; margin-top: 26px; max-width: 540px'), 120, 600) +
                means('El equipo regional verá exactamente qué escribe la integración: registros estándar, con un responsable y una fecha, que puede auditar como cualquier otra actividad.',
                      'Ejemplo ilustrativo: contacto, cuenta y fecha no son datos de SGS.'), section=2)


add('modelo', 'Modelo de datos', s_modelo)
def s_panel_insights():
    # El panel en el lenguaje visual de Efeonce Insights (informe live de Think): lockup, chips de canal, cifra protagonista
    # en el verde de Insights, fichas con «Medido · fuente» y la banda «Para decidir en la reunión». Datos de muestra.
    TEAL = '#36c8bf'
    chipc = lambda glyph, t, on=False: (f'<div style="display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; '
                                        f'{"background: #ffffff; color: #001a33" if on else "box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.35); color: #ffffff"}; font-size: 14px; font-weight: 500">' +
                                        (f'<span style="width: 18px; height: 18px; line-height: 0">{sized(glyph, 18)}</span>' if glyph else '') + f'{t}</div>')
    measured = lambda src: (f'<div style="display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 13px; color: #9fb4c8">'
                            f'<span style="width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 2px #ffffff"></span><strong style="color: #ffffff">Medido</strong> {src}</div>')
    card = lambda tag, fig, txt, src, w: (f'<div style="box-sizing: border-box; width: {w}px; padding: 20px 22px; border-radius: 20px; background: #0f2a45; box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.12)">'
                                          f'<div style="display: inline-block; padding: 3px 10px; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.35); font-size: 12px; font-weight: 600">{tag}</div>'
                                          f'<div style="font-family: {ID}; font-size: 46px; font-weight: 760; letter-spacing: -0.03em; line-height: 1; margin-top: 14px; font-variant-numeric: tabular-nums">{fig}</div>'
                                          f'<div style="font-size: 15px; line-height: 1.4; color: #dbe6f1; margin-top: 10px">{txt}</div>{measured(src)}</div>')
    win = (f'<div style="position: absolute; left: 780px; top: 210px; width: 1000px; height: 700px; box-sizing: border-box; border-radius: 28px; overflow: hidden; '
           f'background: #001a33; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 60px 120px rgba(0, 6, 16, 0.75), 0 0 140px rgba(54, 200, 191, 0.18)">'
           # barra superior
           f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 22px 30px; border-bottom: 1px solid rgba(207, 228, 250, 0.12)">'
           f'<img src="{BLOBS["insights-lockup"]}" alt="Efeonce Insights" style="height: 26px; display: block">'
           f'<div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.35); font-size: 13px">'
           f'<span style="width: 8px; height: 8px; border-radius: 50%; background: {TEAL}"></span>Datos de muestra</div></div>'
           # cuerpo
           f'<div style="padding: 26px 30px 0">'
           f'<div style="display: flex; gap: 10px">{chipc(None, "Todo", True)}{chipc("llamada", "Llamadas")}{chipc("social", "WhatsApp")}{chipc("correo", "Correo")}</div>'
           f'<div style="font-size: 14px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #9fb4c8; margin-top: 24px">Contactabilidad · equipo piloto · semana 6</div>'
           f'<div style="display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 30px; align-items: end; margin-top: 6px">'
           f'<div style="font-family: {ID}; font-size: 150px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.9; color: {TEAL}; font-variant-numeric: tabular-nums">68 %</div>'
           f'<div style="padding-bottom: 14px"><div style="font-size: 22px; line-height: 1.35">de los intentos de la semana lograron contacto con el cliente.</div>{measured("Aircall y Meta")}</div></div>'
           f'<div style="display: flex; gap: 16px; margin-top: 26px">'
           f'{card("Intentos", "312", "llamadas y WhatsApp a clientes esta semana", "Aircall y Meta", 300)}'
           f'{card("Sin contacto", "14", "cuentas sin contacto hace 30 días o más", "Aircall", 300)}'
           f'{card("Adopción", "11 de 12", "ejecutivos ya usan su número de empresa", "Aircall", 308)}</div></div>'
           # banda de decisión
           f'<div style="position: absolute; left: 30px; right: 30px; bottom: 26px; padding: 18px 24px; border-radius: 20px; background: #023c70; display: flex; align-items: center; justify-content: space-between">'
           f'<div><div style="font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #cfe4fa">Para decidir en la revisión semanal</div>'
           f'<div style="font-family: {ID}; font-size: 26px; font-weight: 740; margin-top: 6px">Repartir las 14 cuentas sin contacto</div></div>'
           f'<div style="padding: 10px 18px; border-radius: 999px; background: #ffffff; color: #001a33; font-size: 15px; font-weight: 600">Ver cuentas →</div></div>'
           f'</div>')
    return page('Panel de contactabilidad', halo_only(1280, 520, 0.22) + win +
                col(eyebrow(CAP[2] + ' · Panel') + headline(['Así se verá', 'el panel de', 'la jefatura'], 76, '; margin-top: 56px') +
                    body('Efeonce Insights mostrará intentos, contactos y cuentas sin contacto, por canal y por equipo, y propondrá qué revisar en la reunión semanal.', 20, 560, '; margin-top: 30px') +
                    source('Datos de muestra: cifras y cuentas no son de SGS.', '; margin-top: 18px'), 120, 580), section=2)


add('panel', 'Panel de contactabilidad', s_panel_insights)


def s_panel():
    shows = ['Intentos por cliente, canal, ejecutivo y resultado', 'Clientes sin contacto en el período', 'Cobertura por equipo']
    keeps = ['Quién, cuándo, canal, resultado y cuenta', 'Nunca el texto de los mensajes ni el audio']
    cards = (obj(icon('medicion') + okicker('El panel') + otitle('Se actualiza solo', 30) +
                 f'<div style="display: grid; gap: 7px; margin-top: 16px">{"".join(chip(x) for x in shows)}</div>' +
                 otext('Se revisa cada semana en la reunión de cada jefatura.', 16), 820, 210, 460, True, '; height: 470px') +
             obj(icon('informe') + okicker('Cada mes') + otitle('Un informe con los hallazgos', 30) +
                 otext('Se comparte por enlace y es el documento para llevar los resultados al equipo regional.', 16) +
                 f'<div style="margin-top: 16px">{label("Guarda el contacto, no el contenido")}<div style="display: grid; gap: 7px; margin-top: 8px">{"".join(chip(x, False) for x in keeps)}</div></div>', 1310, 210, 460, False, '; height: 470px'))
    return page('Por qué un panel propio', halo_only(1300, 430) + cards +
                col(eyebrow(CAP[2] + ' · Vista de gestión') + headline(['Un panel', 'propio, porque', 'el de Salesforce', 'no basta'], 70, '; margin-top: 56px') +
                    body('Los paneles de Salesforce se refrescan a mano o una o dos veces por hora, tienen un tope por edición, sus versiones avanzadas requieren otra licencia y cada ajuste pasa por el equipo regional.', 20, 560, '; margin-top: 28px'), 120, 600) +
                means('La jefatura tendrá la vista de gestión sin licencias nuevas de Salesforce y sin depender del equipo regional para cada cambio. Funcionará desde el piloto.',
                      'Paneles dinámicos y refresco: documentación de Salesforce, consultada en octubre de 2026.'), section=2)


add('panel-propio', 'Un panel propio', s_panel)


def s_insights():
    keep = [('Quién', 'R. Soto'), ('Cuándo', '19-11-2026 · 10:45'), ('Canal', 'WhatsApp'), ('Resultado', 'Respondido'), ('Cuenta', 'Minera Andes')]
    drop = [('Texto del mensaje', 'No se guarda'), ('Audio de la llamada', 'No se graba')]
    ok = lambda k, v: (f'<div style="display: grid; grid-template-columns: 34px 170px minmax(0, 1fr); align-items: center; padding: 13px 0; border-top: 1px solid {t["rule"]}">'
                       f'<div style="width: 22px; height: 22px; border-radius: 50%; background: {TEAL}; color: #001a33; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center">✓</div>'
                       f'<div style="font-size: 16px; color: #9fb4c8">{k}</div><div style="font-size: 19px; font-weight: 600">{v}</div></div>')
    no = lambda k, v: (f'<div style="display: grid; grid-template-columns: 34px 170px minmax(0, 1fr); align-items: center; padding: 13px 0; border-top: 1px dashed rgba(207, 228, 250, 0.25)">'
                       f'<div style="width: 22px; height: 22px; border-radius: 50%; box-shadow: inset 0 0 0 2px #e5484d; color: #e5484d; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center">✕</div>'
                       f'<div style="font-size: 16px; color: #9fb4c8; text-decoration: line-through">{k}</div><div style="font-size: 17px; font-weight: 600; color: #cfe4fa">{v}</div></div>')
    rec = obj(f'<div style="display: flex; justify-content: space-between; align-items: center"><img src="{BLOBS["insights-lockup"]}" alt="Efeonce Insights" style="height: 30px; display: block">'
              f'<span style="font-size: 13px; color: #9fb4c8">Un contacto, tal como queda guardado</span></div>'
              f'<div style="margin-top: 22px">{label("Se guarda")}</div>' + ''.join(ok(*x) for x in keep) +
              f'<div style="margin-top: 24px">{label("No se guarda")}</div>' + ''.join(no(*x) for x in drop), 820, 200, 600, True, '; height: 590px')
    facts = [('seguridad', 'Dónde', 'En Google Cloud, en Estados Unidos. Va en el acuerdo de tratamiento.'),
             ('talent', 'Quién lo ve', 'Quien SGS defina: jefaturas todas las cuentas; cada ejecutivo, las suyas.'),
             ('contrato', 'Cuánto tiempo', 'El plazo y la forma de eliminación que fije el acuerdo con SGS.')]
    side = ''.join(obj(f'<div style="display: flex; gap: 14px; align-items: flex-start"><div style="width: 40px; height: 40px; flex: none; line-height: 0">{sized(g, 40)}</div>'
                       f'<div>{okicker(k)}{otext(x, 15, "; margin-top: 6px")}</div></div>', 1450, 200 + i * 205, 330, False, '; height: 180px; padding: 22px 24px')
                   for i, (g, k, x) in enumerate(facts))
    return page('Qué es Efeonce Insights', halo_only(1120, 470, 0.22) + rec + side +
                col(eyebrow(CAP[2] + ' · Efeonce Insights') + headline(['Efeonce Insights', 'guardará el', 'contacto, no la', 'conversación'], 66, '; margin-top: 56px') +
                    body('Es la plataforma de Efeonce donde vivirán el panel y el informe mensual. Se consulta desde el navegador; no hay que instalar nada.', 21, 560, '; margin-top: 30px') +
                    source('Ejemplo ilustrativo: ejecutivo, fecha y cuenta no son datos de SGS.', '; margin-top: 22px'), 120, 600) +
                means('La jefatura verá el seguimiento de todas las cuentas sin entrar a Salesforce, y SGS decidirá quién accede y cuánto tiempo se guardan los datos.'), section=2)


add('insights', 'Qué es Efeonce Insights', s_insights)

def s_alternativas():
    alts = [('crm', 'Solo Salesforce', 'Service Cloud Voice es de escritorio y exige licencias nuevas; el marcador de Salesforce (Sales Dialer) solo opera en Estados Unidos y Canadá.'),
            ('medicion', 'Paneles de Salesforce', 'Los dashboards se refrescan a mano o por horario, con tope de paneles dinámicos por edición; CRM Analytics es un complemento pagado.'),
            ('social', 'WhatsApp solo en Aircall', 'Obligaría a cambiar el número que los clientes conocen y a empezar sin historial. Queda para quien no tenga número de empresa.'),
            ('seguridad', 'Apps que leen el WhatsApp personal', 'Incumplen las reglas de WhatsApp y no pasarían la evaluación de seguridad de SGS. Coexistence es la vía oficial de Meta.')]
    html = ''.join(obj(icon(g) + label('Por qué no') + otitle(a, 26, '; margin-top: 6px') + otext(b, 16), 820 + (i % 2) * 490, 210 + (i // 2) * 300, 460, False, '; height: 280px')
                   for i, (g, a, b) in enumerate(alts))
    return page('Alternativas consideradas', halo_only(1300, 470) + html +
                col(eyebrow(CAP[2] + ' · Alternativas') + headline(['Por qué esta', 'solución y', 'no otra'], 84, '; margin-top: 56px') +
                    body('Revisamos cuatro caminos antes de proponer este. Ninguno permitía empezar en Chile, desde el celular y sin cambiar Salesforce.', 21, 560, '; margin-top: 30px'), 120, 600) +
                means('Aircall para llamar y WhatsApp Coexistence para escribir es el camino que dará valor desde el piloto, sin cambiar el WhatsApp del equipo, y dejará al equipo regional una decisión acotada.'), section=2)


add('alternativas', 'Alternativas consideradas', s_alternativas)


# ── Capítulo 3 · Implementación ─────────────────────────────────────────────────────────────────────────────────
def s_etapas():
    et = [('0', 'Diagnóstico y procesos', 'Revisar el correo en Salesforce, levantar teléfonos y números de WhatsApp, revisar seguridad, acordar reglas de seguimiento y medir la línea base.', 'Semanas 1 a 4', 'No'),
          ('1', 'Correo y reuniones', 'Dejar activo el registro de correo para el equipo piloto.', 'Semanas 1 a 4', 'Poco o nada'),
          ('2', 'Piloto de llamadas y WhatsApp', 'Números de empresa para llamar, WhatsApp conectado con Coexistence, panel en marcha, capacitación y medición.', 'Semanas 5 a 16', 'No'),
          ('3', 'Conexión a Salesforce', 'Conector de llamadas, integración de WhatsApp, correo en el panel y validación con usuarios.', 'Tras la decisión del piloto', 'Sí'),
          ('4', 'Operación y extensión', 'Sostener, medir, informe mensual, capacitación continua y preparar otros equipos.', 'Mensual', 'Para extender')]
    head = thead(['Etapa', 'Qué se hace', 'Cuándo', 'Equipo regional'], [1.1, 1.9, 1.0, 0.9])
    rows = ''.join(f'<div style="display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.9fr) minmax(0, 1.0fr) minmax(0, 0.9fr); column-gap: 28px; padding: 16px 24px; border-top: 1px solid {t["rule"]}; align-items: start; {"background: rgba(" + ACC_RGB + ", 0.08); border-radius: 12px" if n == "2" else ""}">'
                   f'<div style="display: flex; gap: 12px"><div style="font-family: {ID}; font-size: 30px; font-weight: 300; line-height: 1; color: {ACC}">{n}</div><div style="font-size: 19px; font-weight: 600; line-height: 1.3">{a}</div></div>'
                   f'<div style="font-size: 16px; line-height: 1.4; color: #cfe4fa">{b}</div><div style="font-size: 16px; line-height: 1.4">{c}</div>'
                   f'<div>{tag(r, r in ("Sí", "Para extender"))}</div></div>' for n, a, b, c, r in et)
    return page('Etapas',
                col(eyebrow(CAP[3]) + headline(['Las tres', 'primeras etapas', 'se harán', 'en Chile'], 74, '; margin-top: 56px') +
                    body('El piloto completo (etapas 0 a 2) dura 112 días como máximo. La conexión a Salesforce se pide después, con datos del propio equipo.', 21, 560, '; margin-top: 30px') +
                    callout('Cada etapa cierra con una decisión explícita antes de pasar a la siguiente.', '; margin-top: 26px; max-width: 540px'), 120, 600) +
                zone(head + rows, 790, 210, 990), section=3)


add('etapas', 'Cinco etapas', s_etapas)


def s_cambios():
    row = lambda g, a, b: (f'<div style="display: grid; grid-template-columns: 44px minmax(0, 1fr); column-gap: 16px; align-items: start; padding: 16px 0; border-top: 1px solid {t["rule"]}">'
                           f'<div style="width: 44px; height: 44px; line-height: 0">{sized(g, 44)}</div>'
                           f'<div><div style="font-family: {ID}; font-size: 23px; font-weight: 740; letter-spacing: -0.01em; line-height: 1.12">{a}</div>'
                           f'<div style="font-size: 15px; line-height: 1.4; color: #c9d6e2; margin-top: 5px">{b}</div></div></div>')
    big = lambda n, k: (f'<div style="display: flex; align-items: flex-end; gap: 16px; margin-bottom: 14px"><div style="font-family: {ID}; font-size: 120px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.8">{n}</div>'
                        f'<div style="padding-bottom: 4px">{okicker(k)}</div></div>')
    cambia = [('llamada', 'El número para llamar', 'Fijo de su ciudad, en la app de Aircall. El anterior convive de 4 a 8 semanas con aviso y desvío.'),
              ('contrato', 'Cuatro funciones de WhatsApp', 'Listas de difusión, mensajes temporales y de una sola vez, y ubicación en tiempo real.')]
    sigue = [('social', 'Su número de WhatsApp', 'El que sus clientes ya conocen, en la misma app.'),
             ('reloj', 'Sus conversaciones', 'Hasta 6 meses de historial se incorporan al conectar.'),
             ('correo', 'Correo y reuniones', 'Desde Outlook, como hoy.'),
             ('crm', 'Salesforce', 'La configuración común del equipo regional no se toca.')]
    cards = (obj(big('2', 'Cosas que cambian') + ''.join(row(*x) for x in cambia) +
                 f'<div style="margin-top: 14px; font-size: 15px; line-height: 1.4; color: #cfe4fa">Los grupos de WhatsApp siguen funcionando, pero no se registran.</div>', 820, 200, 460, True, '; height: 590px') +
             obj(big('4', 'Cosas que no cambian') + ''.join(row(*x) for x in sigue), 1310, 200, 470, False, '; height: 590px'))
    return page('Qué cambia para el equipo', halo_only(1050, 470, 0.24) + cards +
                col(eyebrow(CAP[3] + ' · Qué cambia') + headline(['Cambiará el', 'número para', 'llamar, no la', 'forma de vender'], 74, '; margin-top: 56px') +
                    body('Son los cambios que el equipo va a notar. Los decimos antes para que se planifiquen, no para descubrirlos en el piloto.', 21, 560, '; margin-top: 30px'), 120, 600) +
                means('Cada cliente recibirá un aviso previo con el número nuevo para llamadas, y el período de convivencia evitará que se pierda un contacto. El WhatsApp que ya conoce no cambia.'), section=3)


add('cambios', 'Qué cambia para el equipo', s_cambios)


def s_adopcion():
    fr = [('Alineación de procesos', 'Qué cuenta como intento y como contacto, reglas de seguimiento, respuestas tipo y roles.', 'Guía de contactabilidad acordada'),
          ('Capacitación por rol', 'Cada rol aprende solo lo que va a usar, en vivo y en video.', 'Sesiones en vivo, videos y guías'),
          ('Implementación', 'Codiseño, acuerdo de uso, configuración, pruebas con usuarios y entrega por tandas.', 'Equipo operando con sus números conectados'),
          ('Mejora continua', 'Acompañamiento semanal, medición de adopción y mejoras priorizadas.', 'Cierre comparado contra la línea base')]
    risk = obj(f'<div style="display: grid; grid-template-columns: 60px minmax(0, 1fr); column-gap: 22px; align-items: center">'
               f'<div style="width: 60px; height: 60px; line-height: 0">{sized("seguridad", 60)}</div>'
               f'<div>{okicker("El riesgo principal")}<div style="font-family: {ID}; font-size: 31px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.12; margin-top: 8px">'
               f'Que el equipo siga llamando o escribiendo desde números personales no conectados.</div></div></div>', 820, 196, 960, True, '; height: 160px; padding: 26px 30px')
    cx = [820 + i * 245 + 112 for i in range(4)]
    svg = (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
           f'<line x1="1300" y1="356" x2="1300" y2="380" stroke="{ACC}" stroke-width="3"/>'
           f'<line x1="{cx[0]}" y1="380" x2="{cx[-1]}" y2="380" stroke="{ACC}" stroke-width="3"/>' +
           ''.join(f'<line x1="{x}" y1="380" x2="{x}" y2="410" stroke="{ACC}" stroke-width="3"/><circle cx="{x}" cy="380" r="6" fill="{ACC}"/>' for x in cx) + '</svg>')
    cols = ''.join(obj(f'<div style="display: flex; flex-direction: column; height: 100%">'
                       f'<div style="font-family: {ID}; font-size: 54px; font-weight: 300; line-height: 1; color: {ACC}">{i + 1:02d}</div>'
                       f'{okicker("Frente " + str(i + 1))}' + otitle(a, 23) + otext(b, 15) +
                       f'<div style="margin-top: auto; padding-top: 14px; border-top: 1px solid {t["rule"]}">{label("Entregable")}'
                       f'<div style="font-size: 15px; font-weight: 600; line-height: 1.35; margin-top: 4px">{e}</div></div></div>',
                       820 + i * 245, 410, 225, False, '; height: 385px; padding: 24px 22px')
                   for i, (a, b, e) in enumerate(fr))
    return page('Adopción', halo_only(1300, 300, 0.24) + svg + risk + cols +
                col(eyebrow(CAP[3] + ' · Adopción') + headline(['La herramienta', 'registrará; el', 'provecho vendrá', 'del equipo'], 70, '; margin-top: 56px') +
                    body('Por eso la propuesta incluye cuatro frentes de adopción a cargo de Efeonce, además de la configuración técnica. Los cuatro apuntan al mismo riesgo.', 21, 560, '; margin-top: 30px'), 120, 600) +
                means('Sin adopción no hay registro: por eso la adopción es parte del servicio y se mide cada semana durante el piloto.'), section=3)


add('adopcion', 'Cuatro frentes de adopción', s_adopcion)


def s_capacitacion():
    rows = [('talent', 'Ejecutivos comerciales', 'Llamar desde Aircall, seguir escribiendo en WhatsApp Business, dejar el correo conectado y presentar el número nuevo a sus clientes.', 'Práctica', True, 'Guía rápida'),
            ('medicion', 'Jefaturas comerciales', 'Leer el panel, conducir la revisión semanal y dar seguimiento a cuentas sin convertirlo en control individual.', 'Sesión', False, 'Pauta de reunión'),
            ('checklist', 'Excelencia comercial', 'Administrar usuarios y números conectados, leer el informe mensual y preparar los resultados para el equipo regional.', 'Sesión', False, 'Manual de operación'),
            ('crm', 'Contratos y cuentas', 'Usar el historial de la ficha del cliente y el registro de correo.', 'Breve', True, '')]
    W = 'minmax(0, 1.25fr) minmax(0, 2fr) 120px 120px minmax(0, 1fr)'
    dot = lambda on, txt='': (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">'
                              + (f'<div style="width: 34px; height: 34px; border-radius: 50%; background: {ACC}; box-shadow: 0 0 22px rgba({ACC_RGB}, 0.55); color: #001a33; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center">✓</div>'
                                 if on else '<div style="width: 34px; height: 34px; border-radius: 50%; box-shadow: inset 0 0 0 2px rgba(207, 228, 250, 0.22)"></div>')
                              + (f'<div style="font-size: 12.5px; color: #cfe4fa">{txt}</div>' if txt else '') + '</div>')
    doc = lambda x: (f'<div style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.08); font-size: 14.5px; font-weight: 600">'
                     f'<span style="width: 20px; height: 20px; line-height: 0">{sized("informe", 20)}</span>{x}</div>') if x else dot(False)
    head = (f'<div style="display: grid; grid-template-columns: {W}; column-gap: 24px; padding: 0 24px 14px; align-items: end">'
            f'<div>{label("Rol")}</div><div>{label("Qué aprende")}</div><div style="text-align: center">{label("En vivo")}</div>'
            f'<div style="text-align: center">{label("Videos")}</div><div>{label("Material escrito")}</div></div>')
    body_rows = ''.join(f'<div style="display: grid; grid-template-columns: {W}; column-gap: 24px; padding: 20px 24px; border-top: 1px solid {t["rule"]}; align-items: center; '
                        f'{"background: rgba(" + ACC_RGB + ", 0.08); border-radius: 14px" if i == 0 else ""}">'
                        f'<div style="display: flex; gap: 14px; align-items: center"><div style="width: 44px; height: 44px; flex: none; line-height: 0">{sized(g, 44)}</div>'
                        f'<div style="font-family: {ID}; font-size: 23px; font-weight: 740; letter-spacing: -0.01em; line-height: 1.1">{a}</div></div>'
                        f'<div style="font-size: 15.5px; line-height: 1.42; color: #c9d6e2">{b}</div>{dot(True, v)}{dot(vid)}<div>{doc(m)}</div></div>'
                        for i, (g, a, b, v, vid, m) in enumerate(rows))
    return page('Capacitación por rol', halo_only(1300, 470) +
                col(eyebrow(CAP[3] + ' · Capacitación') + headline(['Cada rol', 'aprenderá lo', 'que usa'], 84, '; margin-top: 56px') +
                    body('Los videos permiten avanzar al ritmo de cada persona y sirven para incorporar a quienes se sumen después.', 21, 560, '; margin-top: 30px') +
                    callout('Durante el piloto hay un espacio semanal de consultas.', '; margin-top: 26px; max-width: 540px'), 120, 600) +
                zone(head + body_rows, 790, 205, 990) +
                means('Nadie recibirá una capacitación genérica: cada rol aprenderá solo lo que va a usar, en el formato que le acomode.'), section=3)


add('capacitacion', 'Capacitación por rol', s_capacitacion)


def s_implementacion():
    steps = [('Codiseño', 'Con los ejecutivos: qué se registra y qué no.'), ('Acuerdo de uso', 'Quién ve qué, por escrito.'),
             ('Configuración', 'Números, horarios, flujos de llamada, conexión de WhatsApp y panel.'), ('Pruebas con usuarios', 'Antes de la puesta en marcha.'),
             ('Entrega por tandas', 'Números, firma de correo, tarjeta y aviso a clientes. Cada WhatsApp se conecta con su ejecutivo presente.'),
             ('Convivencia', 'De 4 a 8 semanas, con respuesta automática, desvío y soporte reforzado.')]
    x0, dx, ty = 930, 144, 500
    xs = [x0 + i * dx for i in range(6)]
    svg = (f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
           f'<defs><linearGradient id="trk" x1="{xs[0]}" y1="0" x2="{xs[-1]}" y2="0" gradientUnits="userSpaceOnUse">'
           f'<stop offset="0" stop-color="{ACC}" stop-opacity="0.25"/><stop offset="1" stop-color="{ACC}" stop-opacity="1"/></linearGradient></defs>'
           f'<line x1="{xs[0] - 60}" y1="{ty}" x2="{xs[-1] + 60}" y2="{ty}" stroke="url(#trk)" stroke-width="4" stroke-linecap="round"/>'
           f'<rect x="{xs[4]}" y="{ty - 7}" width="{xs[5] - xs[4] + 60}" height="14" rx="7" fill="{ACC}" fill-opacity="0.22"/>')
    for i, x in enumerate(xs):
        up = i % 2 == 0
        svg += f'<line x1="{x}" y1="{ty}" x2="{x}" y2="{ty - 52 if up else ty + 52}" stroke="#cfe4fa" stroke-opacity="0.45" stroke-width="2"/>'
        svg += f'<circle cx="{x}" cy="{ty}" r="{13 if i == 5 else 9}" fill="#001a33" stroke="{ACC}" stroke-width="{4 if i == 5 else 3}"/>'
    svg += '</svg>'
    cards = ''
    for i, ((a, b), x) in enumerate(zip(steps, xs)):
        up = i % 2 == 0
        inner = (f'<div style="font-family: {ID}; font-size: 40px; font-weight: 300; line-height: 1; color: {ACC}">{i + 1:02d}</div>' + otitle(a, 23) + otext(b, 15))
        cards += obj(inner, x - 130, 238 if up else 552, 260, i == 5, f'; height: 210px; padding: 22px 22px')
    return page('Implementación', halo_only(1340, 500, 0.2) + svg + cards +
                col(eyebrow('Capítulo 3 · Puesta en marcha') + headline(['Seis pasos', 'hasta que el', 'número nuevo', 'sea el de todos'], 70, '; margin-top: 56px') +
                    body('La puesta en marcha se hace por tandas para que ningún cliente pierda el contacto con su ejecutivo.', 21, 560, '; margin-top: 30px'), 120, 600) +
                means('Durante la convivencia, el número anterior seguirá respondiendo: ningún cliente quedará sin forma de llegar a su ejecutivo.'), section=3)


add('implementacion', 'Implementación', s_implementacion)


# ── Capítulo 4 · Revisión regional ──────────────────────────────────────────────────────────────────────────────
def s_region():
    asks = [('correo', 'Registro de correo', 'Confirmar cómo está configurado e incluir a los usuarios chilenos del piloto.', 'Einstein Activity Capture'),
            ('integracion', 'Conector de Aircall', 'Instalarlo primero en pruebas y luego en producción, solo para el grupo piloto.', 'Paquete de AppExchange · Sandbox · Permission Set'),
            ('social', 'Integración de WhatsApp', 'Autorizar su acceso con una cuenta técnica de permisos mínimos.', 'Connected App · usuario de integración'),
            ('crm', 'Valor «WhatsApp»', 'Agregarlo como tipo de actividad.', 'Campo Type de Task'),
            ('medicion', 'Lectura para el panel', 'Que la misma integración lea el conteo de actividades de correo.', 'Solo lectura, por la misma Connected App')]
    tech = lambda x: f'<span style="display: inline-block; margin-top: 8px; padding: 4px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); font-size: 14px; font-weight: 500; color: #ffffff">En Salesforce: {x}</span>'
    items = ''.join(f'<div style="display: grid; grid-template-columns: 50px 60px minmax(0, 1fr); column-gap: 18px; align-items: start; padding: 14px 0; border-top: 1px solid {t["rule"]}">'
                    f'<div style="font-family: {ID}; font-size: 34px; font-weight: 300; line-height: 1; color: {ACC}">{i + 1}</div>{icon(g)}'
                    f'<div><div style="font-family: {ID}; font-size: 26px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1">{a}</div>'
                    f'<div style="font-size: 17px; font-weight: 300; line-height: 1.4; color: #cfe4fa; margin-top: 4px">{b}</div>{tech(x)}</div></div>' for i, (g, a, b, x) in enumerate(asks))
    return page('Lo que pedimos al equipo regional',
                col(eyebrow(CAP[4]) + headline(['Cinco ajustes', 'en Salesforce,', 'solo para el', 'grupo piloto'], 72, '; margin-top: 56px') +
                    body('Se piden en la etapa 3, cuando el piloto ya tiene datos. Ninguna requiere licencias nuevas de Salesforce.', 21, 560, '; margin-top: 30px') +
                    callout('Es reversible: el conector se desinstala desde la configuración y la integración se apaga revocando su acceso. Las actividades ya registradas permanecen.', '; margin-top: 26px; max-width: 540px'), 120, 600) +
                zone(items, 820, 210, 960), section=4)


add('region', 'Lo que pedimos al equipo regional', s_region)


def s_permisos():
    can = ['Leer contactos y cuentas (Contact y Account), para asociar cada mensaje', 'Crear actividades (Task)', 'Leer el conteo de actividades de correo']
    cant = ['Leer el contenido de correos o mensajes', 'Modificar o borrar registros existentes', 'Cambiar la configuración de la org']
    deliv = ['Métricas de éxito definidas de antemano', 'Descripción de la arquitectura', 'Evaluación de seguridad del proveedor', 'Impacto en los datos', 'Un responsable local del proceso']
    cards = (obj(icon('integracion') + okicker('La integración puede') + f'<div style="display: grid; gap: 8px; margin-top: 16px">{"".join(chip(x) for x in can)}</div>' +
                 f'<div style="margin-top: 22px">{okicker("Y no puede")}</div><div style="display: grid; gap: 8px; margin-top: 12px">{"".join(chip(x, False) for x in cant)}</div>', 820, 210, 460, True, '; height: 580px') +
             obj(icon('checklist') + okicker('Para la revisión regional') + otitle('Lo que entregamos', 28) +
                 f'<div style="display: grid; gap: 8px; margin-top: 16px">{"".join(chip(x) for x in deliv)}</div>', 1310, 210, 460, False, '; height: 580px'))
    return page('Permisos y revisión', halo_only(1300, 470) + cards +
                col(eyebrow(CAP[4] + ' · Permisos') + headline(['Una integración', 'acotada y', 'revisable'], 74, '; margin-top: 56px') +
                    body('El conector de llamadas es un paquete publicado y revisado. La integración de WhatsApp es un desarrollo a medida, por eso su acceso se limita a lo mínimo.', 20, 560, '; margin-top: 30px') +
                    callout('SGS aprueba a Aircall y al proveedor de WhatsApp antes de la etapa 2, y a Efeonce como encargado de los datos del panel.', '; margin-top: 26px; max-width: 540px'), 120, 600), section=4)


add('permisos', 'Permisos y revisión regional', s_permisos)


def s_privacidad():
    INK, SOFTL, LINE = '#16325c', '#54698d', '#e3e8ef'
    cond = [('Base legal y política de datos', 'Finalidad, destinatarios, transferencia internacional y plazo de conservación, documentados.', 'SGS'),
            ('Sin grabación', 'No se graban ni transcriben llamadas, y el texto de los mensajes no se guarda.', 'Por diseño'),
            ('Reglamento interno', 'La medida consta en el reglamento o en un anexo: general, impersonal y sin uso disciplinario individual.', 'SGS'),
            ('Números de empresa', 'Coexistence solo en números de SGS. Si se usa el celular propio, acuerdo escrito y costos a cargo de SGS.', 'SGS'),
            ('Consentimiento del cliente', 'Para recibir mensajes de WhatsApp, registrado por contacto.', 'SGS'),
            ('Acuerdo de tratamiento con Efeonce', 'Qué datos guarda el panel, dónde, por cuánto tiempo y cómo se eliminan.', 'SGS y Efeonce')]
    pill = lambda x: (f'<span style="display: inline-block; white-space: nowrap; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; '
                      f'{"background: #0b5cab; color: #ffffff" if x == "Por diseño" else "box-shadow: inset 0 0 0 1.5px #0b5cab; color: #0b5cab"}">{x}</span>')
    rows = ''.join(f'<div style="display: grid; grid-template-columns: 46px minmax(0, 1fr) 150px; column-gap: 16px; align-items: center; padding: 13px 0; border-top: 1px solid {LINE}">'
                   f'<div style="width: 34px; height: 34px; border-radius: 50%; background: #0b5cab; color: #ffffff; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center">✓</div>'
                   f'<div><div style="font-size: 18px; font-weight: 700; color: {INK}">{a}</div><div style="font-size: 14.5px; line-height: 1.4; color: {SOFTL}; margin-top: 3px">{b}</div></div>'
                   f'<div style="text-align: right">{pill(w)}</div></div>' for a, b, w in cond)
    paper = (f'<div style="position: absolute; left: 820px; top: 196px; width: 960px; box-sizing: border-box; border-radius: 20px; background: #ffffff; padding: 26px 34px 20px; '
             f'box-shadow: 0 50px 110px rgba(0, 6, 16, 0.7), 0 0 0 2px rgba({ACC_RGB}, 0.85), 0 0 120px rgba({ACC_RGB}, 0.28); font-family: {ST}">'
             f'<div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px">'
             f'<div><div style="font-size: 13px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: {SOFTL}">Condiciones del piloto</div>'
             f'<div style="font-family: {ID}; font-size: 30px; font-weight: 760; letter-spacing: -0.02em; color: {INK}; margin-top: 4px">6 de 6, antes de empezar</div></div>'
             f'<div style="font-size: 13px; color: {SOFTL}; text-align: right">Quién lo asegura</div></div>{rows}</div>')
    return page('Privacidad y condiciones laborales', halo_only(1300, 470, 0.22) + paper +
                col(eyebrow(CAP[4] + ' · Privacidad') + headline(['Seis', 'condiciones', 'desde el', 'primer día'], 78, '; margin-top: 56px') +
                    body('Aplican desde el piloto y se validan con el área legal de SGS.', 21, 560, '; margin-top: 30px') +
                    callout('La nueva ley chilena de protección de datos personales rige desde el 1 de diciembre de 2026, salvo que se apruebe la postergación que hoy se tramita.', '; margin-top: 26px; max-width: 540px'), 120, 600), section=4)


add('privacidad', 'Privacidad y condiciones laborales', s_privacidad)


# ── Capítulo 5 · La decisión ─────────────────────────────────────────────────────────────────────────────────────
def s_medicion():
    ad = ['Contactos registrados sin intervención', 'Ejecutivos activos por semana', 'Contactos que siguen saliendo del número anterior']
    res = ['Cuentas con contacto en el período', 'Intentos por canal', 'Horas administrativas declaradas por el equipo']
    dis = [('Línea base', 'Cuatro semanas antes de habilitar'), ('Tamaño', '8 a 12 ejecutivos, y un grupo similar que sigue como hoy'),
           ('Duración', 'Hasta 12 semanas, después de las 4 de línea base'), ('Decisión', 'Umbrales de seguir, ajustar o detener, acordados antes de empezar')]
    cards = (obj(okicker('Adopción') + otitle('¿Lo usan?', 30) + f'<div style="display: grid; gap: 7px; margin-top: 14px">{"".join(chip(x) for x in ad)}</div>', 820, 210, 460, False, '; height: 300px') +
             obj(okicker('Resultado') + otitle('¿Se cubren las cuentas?', 30) + f'<div style="display: grid; gap: 7px; margin-top: 14px">{"".join(chip(x) for x in res)}</div>', 1310, 210, 460, True, '; height: 300px'))
    drow = ''.join(f'<div style="display: grid; grid-template-columns: 180px minmax(0, 1fr); column-gap: 24px; padding: 14px 0; border-top: 1px solid {t["rule"]}">{label(a, "#ffffff")}<div style="font-size: 18px; color: #cfe4fa">{b}</div></div>' for a, b in dis)
    return page('Cómo se mide', halo_only(1300, 300) + cards + zone(label('Diseño del piloto', '#ffffff') + f'<div style="margin-top: 10px">{drow}</div>', 820, 545, 950) +
                col(eyebrow(CAP[5]) + headline(['Se medirá', 'adopción y', 'cobertura,', 'no ventas'], 78, '; margin-top: 56px') +
                    body('El piloto no promete ventas. Mide si el equipo usa la solución y si más cuentas reciben seguimiento.', 21, 560, '; margin-top: 30px'), 120, 600), section=5)


add('medicion', 'Cómo se mide', s_medicion)
add('plan', 'Plan del piloto', lambda: img_page('Plan del piloto', BLOBS['P11'], 'Plan del piloto: 112 días como máximo, línea base, piloto en marcha y decisión.'))


def s_responsabilidades():
    rows = [('0 · Diagnóstico y procesos', 'Conduce, documenta y facilita los acuerdos', 'Define el equipo, entrega datos y aprueba la guía', 'Informa el estado de la plataforma'),
            ('1 · Correo', 'Configura lo que corresponde y forma', 'Reconecta cuentas y valida', 'Confirma la configuración'),
            ('2 · Piloto', 'Configura Aircall, conecta WhatsApp, pone en marcha el panel, capacita y mide', 'Seguridad y compras; libera tiempo del equipo; usa', 'Recibe los resultados'),
            ('3 · Conexión', 'Conector, integración de WhatsApp, correo en el panel y pruebas', 'Valida con usuarios', 'Aprueba y despliega'),
            ('4 · Operación', 'Opera, emite el informe mensual y reporta', 'Usa y prioriza', 'Decide la extensión')]
    logo = f'<img src="{BLOBS["logo-negative"]}" alt="Efeonce" style="height: 26px; display: block">'
    head = (f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1.3fr) minmax(0, 1fr); column-gap: 28px; padding: 0 24px 16px; align-items: end">'
            f'<div>{label("Etapa")}</div><div>{logo}</div><div><img src="{BLOBS["sgs-logo"]}" alt="SGS Chile" style="height: 58px; display: block; margin-bottom: -10px"></div><div style="font-family: {ID}; font-size: 24px; font-weight: 740">Equipo regional</div></div>')
    return page('Responsabilidades',
                col(eyebrow(CAP[5] + ' · Responsabilidades') + headline(['Cada etapa', 'tendrá dueño'], 84, '; margin-top: 56px') +
                    body('Efeonce conduce y ejecuta. SGS Chile define y usa. El equipo regional aprueba lo que ocurre dentro de Salesforce.', 21, 560, '; margin-top: 30px'), 120, 600) +
                zone(head + table(rows, [1, 1.3, 1.3, 1], None, 18, 20), 790, 210, 990) +
                means('Ninguna etapa queda sin dueño: Efeonce ejecuta, SGS Chile decide y usa, y el equipo regional aprueba solo lo que ocurre dentro de Salesforce.'), section=5)


add('responsabilidades', 'Responsabilidades', s_responsabilidades)


def s_nosotros():
    badge = f'<img src="{BLOBS["sf-partner"]}" alt="Salesforce Partner" style="height: 52px; display: block; margin-bottom: 8px">'
    cards = [(badge, 'Salesforce Partner', 'Implementamos y operamos Salesforce para equipos comerciales.'),
             (f'<img src="{BLOBS["aircall-logo"]}" alt="Aircall" style="height: 40px; display: block; margin: 6px 0 14px">', 'Partner de Aircall', 'Configuramos la telefonía de empresa y su conexión con Salesforce.'),
             (f'<img src="{BLOBS["insights-lockup"]}" alt="Efeonce Insights" style="height: 30px; display: block; margin: 12px 0 18px">', 'Software propio', 'Efeonce Insights: paneles e informes que se actualizan solos.'),
             (icon('talent'), 'Un equipo en Chile', 'Desde Providencia, con un solo interlocutor de punta a punta del proyecto.')]
    html = ''.join(obj(ic + otitle(a, 26) + otext(b, 16), 820 + (i % 2) * 490, 210 + (i // 2) * 300, 460, i == 0, '; height: 280px')
                   for i, (ic, a, b) in enumerate(cards))
    return page('Quiénes somos', halo_only(1300, 470) + html +
                col(eyebrow(CAP[5] + ' · Quiénes somos') + headline(['Quiénes', 'somos'], 96, '; margin-top: 56px') +
                    body('Efeonce es una agencia de crecimiento con software propio. Diseñamos, construimos y operamos la tecnología comercial de nuestros clientes, y dejamos al equipo más capaz de sostenerla.', 21, 560, '; margin-top: 30px'), 120, 600), section=5)



def s_inversion():
    its = [('llamada', 'Licencias de Aircall', 'Por usuario, para llamar.', 'Aircall'),
           ('medicion', 'Consumo y WhatsApp', 'Minutos de llamada y la tarifa del proveedor de Coexistence. Lo escrito desde la app no tiene costo de Meta.', 'Aircall · Meta'),
           ('crm', 'Licencias de Salesforce', 'Ninguna nueva en este esquema.', 'Salesforce'),
           ('presentacion', 'Servicios por etapa', 'Diagnóstico, procesos, configuración, integración de WhatsApp, capacitación y acompañamiento.', 'Efeonce'),
           ('informe', 'Panel e informe mensual', 'Efeonce Insights, como servicio recurrente.', 'Efeonce'),
           ('automatizacion', 'Operación continua', 'Incluye el mantenimiento de la integración.', 'Efeonce')]
    cards = ''.join(obj(icon(g) + okicker(w) + otitle(a, 24) + otext(b, 15) + f'<div style="font-family: {ID}; font-size: 30px; font-weight: 700; margin-top: 12px">{"Ninguna" if w == "Salesforce" else "[MONTO]"}</div>',
                        820 + (i % 3) * 325, 210 + (i // 3) * 345, 300, i == 3, '; height: 320px')
                    for i, (g, a, b, w) in enumerate(its))
    return page('Inversión', halo_only(1300, 470) + cards +
                col(eyebrow(CAP[5] + ' · Inversión') + headline(['Se invertirá', 'por etapa, sin', 'licencias nuevas', 'de Salesforce'], 70, '; margin-top: 56px') +
                    body('Los montos se completan al conocer el tamaño del equipo piloto. Cada etapa se aprueba por separado, después de la decisión de la anterior.', 21, 560, '; margin-top: 30px') +
                    para('Valores netos, IVA no incluido.', 17, '; margin-top: 22px'), 120, 600), section=5)


add('inversion', 'Inversión', s_inversion)


def s_datos():
    dat = [('talent', 'Ejecutivos del equipo piloto', 'Ej.: 10 ejecutivos', 'Tamaño y licencias'),
           ('calendario', 'Teléfonos: de empresa o personales; Android o iPhone', 'Ej.: de empresa · iPhone', 'Instalación y acuerdo de uso'),
           ('social', 'Números de WhatsApp: de SGS o personales; uso de grupos', 'Ej.: de SGS · pocos grupos', 'Qué números se conectan con Coexistence'),
           ('llamada', 'Llamadas y conversaciones por ejecutivo a la semana', 'Ej.: 40 llamadas · 60 chats', 'Volumen y consumo'),
           ('crm', 'Edición de Salesforce y complementos', 'Ej.: Enterprise', 'Conector y registro de correo'),
           ('seguridad', 'Quién administra la cuenta de Meta de SGS', 'Ej.: Marketing Chile', 'Conexión de los números')]
    field = lambda i, g, q, ph, why: (f'<div style="padding: 16px 0 18px; border-top: 1px solid {t["rule"]}">'
                                      f'<div style="display: flex; gap: 12px; align-items: flex-start"><div style="width: 30px; height: 30px; flex: none; line-height: 0">{sized(g, 30)}</div>'
                                      f'<div style="font-size: 17px; font-weight: 600; line-height: 1.3; min-height: 44px">{q}</div></div>'
                                      f'<div style="margin-top: 12px; height: 48px; box-sizing: border-box; border-radius: 12px; background: rgba(0, 10, 22, 0.45); box-shadow: inset 0 0 0 1.5px rgba({ACC_RGB}, {0.9 if i == 0 else 0.35}); '
                                      f'display: flex; align-items: center; padding: 0 16px; font-size: 15px; color: #6f8aa3">{ph}'
                                      + (f'<span style="display: inline-block; width: 2px; height: 22px; background: {ACC}; margin-left: 4px"></span>' if i == 0 else '') + '</div>'
                                      f'<div style="font-size: 13.5px; color: #9fb4c8; margin-top: 8px">Para qué: <span style="color: #cfe4fa">{why}</span></div></div>')
    grid = ''.join(field(i, *d) for i, d in enumerate(dat))
    form = obj(f'<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px">'
               f'<div>{okicker("Lo completa SGS")}<div style="font-family: {ID}; font-size: 28px; font-weight: 740; letter-spacing: -0.02em; margin-top: 6px">Seis respuestas, una estimación basta</div></div>'
               f'<div style="text-align: right"><div style="font-size: 13px; color: #9fb4c8">Completado</div><div style="font-family: {ID}; font-size: 26px; font-weight: 740">0 de 6</div>'
               f'<div style="width: 140px; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.12); margin-top: 6px"></div></div></div>'
               f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 34px">{grid}</div>', 820, 196, 960, True, '; height: 610px; padding: 28px 34px')
    return page('Datos que necesitamos', halo_only(1300, 470, 0.22) + form +
                col(eyebrow(CAP[5] + ' · Datos') + headline(['Seis datos', 'para cerrar', 'la propuesta'], 80, '; margin-top: 56px') +
                    body('Con ellos dimensionamos licencias, consumo y montos, y ajustamos el plan a cómo trabaja hoy el equipo.', 21, 560, '; margin-top: 30px') +
                    callout('Una estimación basta: no hace falta un levantamiento formal.', '; margin-top: 26px; max-width: 540px') +
                    source('Los ejemplos de cada campo son ilustrativos.', '; margin-top: 18px'), 120, 600), section=5)


add('datos', 'Datos que necesitamos', s_datos)


def s_pasos():
    st = [('informe', 'Revisar este borrador', 'Con excelencia comercial y las jefaturas, para ajustarlo a su operación.'),
          ('checklist', 'Completar los datos', 'Los seis de la lámina ' + '{datos}' + '.'),
          ('presentacion', 'Ver la solución funcionando', 'En un ambiente de demostración: una llamada y un WhatsApp apareciendo en la ficha.'),
          ('integracion', 'Presentarla al equipo regional', 'En conjunto, con el capítulo 4 como base.')]
    cards = ''.join(obj(f'<div style="display: flex; justify-content: space-between; align-items: flex-start">{icon(g)}<div style="font-family: {ID}; font-size: 40px; font-weight: 300; line-height: 1; color: {ACC}">{i + 1:02d}</div></div>' +
                        otitle(a, 26) + otext(b.replace('{datos}', ref('datos')), 16), 820 + (i % 2) * 490, 210 + (i // 2) * 310, 460, i == 0, '; height: 285px')
                    for i, (g, a, b) in enumerate(st))
    return page('Próximos pasos', halo_only(1300, 470) + cards +
                col(eyebrow(CAP[5] + ' · Próximos pasos') + headline(['Cuatro pasos', 'para empezar', 'el piloto'], 80, '; margin-top: 56px') +
                    body('El primero es una revisión de 30 minutos de este documento con su equipo.', 21, 560, '; margin-top: 30px') +
                    f'<div style="margin-top: 34px; padding-top: 18px; border-top: 1px solid {t["rule"]}">{label("Contacto", "#ffffff")}'
                    f'<div style="font-size: 20px; line-height: 1.6; margin-top: 8px">sales@efeoncepro.com<br>+56 9 3732 3064</div></div>', 120, 600), section=5)


add('pasos', 'Próximos pasos', s_pasos)


# ── Anexos ──────────────────────────────────────────────────────────────────────────────────────────────────────
def s_supuestos():
    rows = [('Números de Aircall en Chile', 'Aircall ofrece en Chile números geográficos, nacionales y 800; no números móviles. Se usan números de la ciudad de cada ejecutivo.'),
            ('WhatsApp Coexistence', 'Función oficial de Meta: el número sigue en la app WhatsApp Business (versión 2.24.17 o superior) y se conecta a la plataforma de WhatsApp. Al conectar se incorporan una vez los contactos y hasta 6 meses de historial, sin grupos.'),
            ('Condiciones de Coexistence', 'El teléfono principal debe abrir la app al menos cada 14 días. Se pueden enlazar hasta cuatro dispositivos; WhatsApp para Windows no se registra.'),
            ('Proveedor de Coexistence', 'La conexión la habilita un socio oficial de Meta, que se define en la etapa 0. Aircall no documenta Coexistence: si un número pasa a WhatsApp en Aircall, pierde su historial.'),
            ('Registro de WhatsApp en Salesforce', 'Lo construye Efeonce sobre los avisos de la plataforma de WhatsApp, incluidos los mensajes escritos desde la app. El texto no se guarda.'),
            ('Llamadas en Salesforce', 'El conector de Aircall registra cada llamada, incluidas las no contestadas y las perdidas.'),
            ('Paneles de Salesforce', 'Refresco manual o programado, tope de paneles dinámicos por edición y licencia adicional para análisis avanzado.'),
            ('Correo', 'Usa el registro de correo incluido en Salesforce (Einstein Activity Capture); su configuración actual se confirma en la etapa 0.'),
            ('Duración del piloto', '4 semanas de línea base y hasta 12 de piloto: 112 días como máximo. Los montos dependen del tamaño del equipo.')]
    return page('Supuestos y fuentes',
                col(eyebrow('Anexo · Supuestos y fuentes') + headline(['Lo que', 'asumimos y', 'de dónde sale'], 78, '; margin-top: 56px') +
                    body('Reunimos aquí los supuestos para no repetirlos lámina por lámina.', 21, 560, '; margin-top: 30px') +
                    para('Fuentes: documentación pública de Aircall, Salesforce y Meta, consultada en octubre de 2026.', 17, '; margin-top: 22px; max-width: 540px'), 120, 600) +
                zone(table(rows, [1, 2.1], ['Tema', 'Supuesto'], 17, 15), 790, 130, 990))


add('supuestos', 'Supuestos y fuentes', s_supuestos)


def s_glosario():
    g = [('Intento de contacto', 'Cualquier llamada o mensaje hacia un cliente, conteste o no.'), ('Contacto efectivo', 'Un intento con respuesta del cliente. Su definición exacta se acuerda en la etapa 0.'),
         ('Registro de correo', 'Función incluida en Salesforce (Einstein Activity Capture) que registra correos y reuniones en la ficha del cliente.'), ('Conector de Aircall', 'Paquete publicado por Aircall que registra las llamadas en Salesforce.'),
         ('WhatsApp Coexistence', 'Función de Meta que permite usar el mismo número en la app de WhatsApp Business y en la plataforma de WhatsApp para empresas.'), ('Plataforma de WhatsApp', 'WhatsApp Business Platform: la vía oficial de Meta para conectar WhatsApp con otros sistemas.'),
         ('Equipo regional', 'Equipo de SGS que administra Salesforce para la región y aprueba sus cambios.'), ('Línea base', 'Medición de cómo trabaja el equipo antes de habilitar nada.'),
         ('Contactabilidad', 'Qué tanto y por qué canal se contacta a cada cliente.'), ('Convivencia', 'Período en que el número anterior de llamadas avisa y desvía al nuevo.')]
    cell = lambda a, b: f'<div style="padding: 14px 0; border-top: 1px solid {t["rule"]}"><div style="font-size: 19px; font-weight: 600">{a}</div><div style="font-size: 16px; line-height: 1.4; color: #cfe4fa; margin-top: 4px">{b}</div></div>'
    grid = f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px">{"".join(cell(a, b) for a, b in g)}</div>'
    return page('Glosario',
                col(eyebrow('Anexo · Glosario') + headline(['Los términos', 'de esta', 'propuesta'], 80, '; margin-top: 56px'), 120, 600) +
                zone(grid, 790, 120, 990))


add('glosario', 'Glosario', s_glosario)
add('contraportada', 'Contraportada', lambda: img_page('Contraportada', BLOBS['P14'], 'Contraportada: Empower your Revenue, contacto de Efeonce e insignia Salesforce Partner.'))

# ── Escritura del canvas ────────────────────────────────────────────────────────────────────────────────────────
for i, (key, _, _) in enumerate(S):
    N[key] = i + 1
os.makedirs(ROOT, exist_ok=True)
boards, order = {}, []
for i, (key, title, fn) in enumerate(S):
    f = 'Main.dc.html' if i == 0 else f'L{i + 1:02d}-{key}.dc.html'
    open(os.path.join(ROOT, f), 'w', encoding='utf-8').write(fn())
    boards[f] = {"x": (i % 4) * 2000, "y": (i // 4) * 1200, "w": 1920, "h": 1080, "title": f'{i + 1:02d} · {title}'}
    order.append(f)
json.dump({"boards": boards, "order": order}, open(os.path.join(HERE, 'boards.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(S), 'láminas')
