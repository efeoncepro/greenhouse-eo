# Pibank · Propuesta técnica 2027 en el canvas Design (v4, 2026-10-07).
# Molde de La órbita, línea Engine. Cambios de v4 sobre v3 (auditoría con la skill efeonce-graphic-line):
#  1. color de la línea: luz, foco y acento en azul Engine; el teal queda sólo como tinta de anillo del token;
#  2. la órbita trabaja: navegación del deck (5 secciones) y medida del aporte, ambas desde AXIS (axis-assets.json);
#  3. halo y plataforma sólo donde hay un objeto héroe (embudo, arquitectura, herramientas);
#  4. selección colaborativa canónica (paint-selection.mjs) e íconos Trazo del catálogo (resolveIcon);
#  5. ritmo: diagnóstico, calendario y responsabilidades en papel.
# Las láminas con par pregunta–respuesta salen del compositor y entran como imagen.
# Uso: python3 build-tecnica.py <carpeta project del canvas>; después node paint-selection.mjs <carpeta>.
import json, os, sys

ROOT = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
AX = json.load(open(os.path.join(HERE, 'axis-assets.json')))
BL = lambda i: f'/_blob/{i}'
BUB = '434cdccb13af2a417f555053d9a45582'
IMG = {'C01': 'd25571b6933c0151b749f615c07c6e3b', 'C04': '826fc5c542aa67cf0489aa3bc5ed9acc', 'C06': '142e69619c3e4414e8607371ef5f930f',
       'C07': '67a1e1797918097800c350d016e8e274', 'C08': '37cf716674faaa8d5f2a522eb8833d0a', 'C09': 'd263d88087b8989fde98a444361c996d'}
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
    return f'<div style="font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: {t["eb"]}">{text}</div>'


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


S = []

# 01 · Portada (compositor)
S.append(('Portada', img_page('Pibank · Portada', IMG['C01'], 'Portada de la propuesta técnica para Pibank: ¿Dónde nace una cuenta? En la búsqueda.')))

# 02 · Resumen para gerencia — sección 1 · foco: la meta
rows = [('Qué hacemos', 'SEO técnico en WordPress, hasta cinco artículos al mes, hub y herramientas, panel de IA, comunidad y PR sobre pibank.pe.'),
        ('Cómo se mide', 'Aperturas validadas y cuentas con fondos, con datos agregados del banco. Una cuenta se cuenta una vez.'),
        ('Inversión', 'Ruta gradual de US$79.200 al año: US$54.000 de servicio base y US$25.200 en activaciones.')]
S.append(('Resumen para gerencia', page('Pibank · Resumen',
    col(eyebrow('Resumen para gerencia') + headline(['Doce meses', 'para que Cuenta', 'Soles se elija'], 104, extra='; margin-top: 64px') +
        body('Un programa de SEO, AEO y contenidos que ayuda a encontrar la cuenta, compararla, abrirla y hacer el primer depósito.', 26, 600, extra='; margin-top: 44px'), 120, 720) +
    zone(f'<div style="font-family: {ID}; font-size: 196px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9">15.200</div>'
         f'<div style="font-family: {ID}; font-size: 44px; font-weight: 620; letter-spacing: -0.02em; color: #cfe4fa; margin-top: 12px">cuentas con fondos: la meta de referencia</div>'
         + source('Meta conversada el 06-10; moneda y período por confirmar con el banco.', extra='; margin-top: 14px') +
         '<div style="margin-top: 50px; display: flex; flex-direction: column; gap: 22px">' +
         ''.join(f'<div style="display: grid; grid-template-columns: 190px minmax(0, 1fr); column-gap: 30px; padding-top: 18px; border-top: 1px solid {DARK["rule"]}">{label(a, "#ffffff", extra="; padding-top: 6px")}<div style="font-size: 22px; font-weight: 300; line-height: 1.45; color: #cfe4fa">{b}</div></div>' for a, b in rows) +
         '</div>', 980, 210, 760) + bubble(), section=1)))

# 03 · La meta hacia atrás — sección 1 · foco: la escalera
steps = [('1.169.231', 'visitas elegibles', 'Búsqueda, IA, pauta y referidos', 300),
         ('23.385', 'aperturas', 'Si abre el 2 % de las visitas', 400),
         ('15.200', 'cuentas con fondos', 'Si el 65 % hace su primer depósito', 500),
         ('US$38&nbsp;m', 'en depósitos iniciales', 'Con un ticket de US$2.500', 600)]
st = ''
for i, (v, l, d, h) in enumerate(steps):
    inner = (okicker(f'0{i + 1}') + f'<div style="font-family: {ID}; font-weight: 760; font-size: {44 if i in (0, 3) else 52}px; letter-spacing: -0.035em; line-height: 0.95; margin-top: 12px">{v}</div>' +
             f'<div style="font-size: 19px; font-weight: 600; margin-top: 10px">{l}</div>' + otext(d, 16))
    st += obj(inner, 780 + i * 262, 900 - h, 240, i == 2, f'; height: {h}px')
S.append(('La meta y el embudo', page('Pibank · La meta', halo_platform(1300, 520, 1300, 900, 600, 70) + st +
    col(eyebrow('La meta, hacia atrás') + headline(['Todo el embudo,', 'no sólo la', 'búsqueda'], 80, extra='; margin-top: 64px') +
        body('Llegar a 15.200 cuentas con fondos exige este recorrido completo. El programa suma demanda nueva, mejor conversión de lo que ya llega y ayuda al primer depósito.', 24, 560, extra='; margin-top: 40px') +
        source('Cálculo de Efeonce. Tasas de prueba de 2 % y 65 %, no datos de Pibank: es un requisito, no un pronóstico.', extra='; margin-top: 30px; max-width: 520px'), 120, 600) + bubble(), section=1)))

# 04 · Diagnóstico — sección 1 · papel · foco: la fila seleccionada
W = [1.15, 1.2, 1.25]
diag = [['No apareció en 17 capturas genéricas de ahorro', 'Brecha frente a otros bancos en esa muestra; no ausencia total en Google', 'Priorizar ahorro y comparación, y contrastar con Search Console'],
        ['Dos canonical idénticos en páginas clave y FAQ', 'Duplicidad de implementación; no prueba una penalización', 'Una canónica consistente por plantilla y datos estructurados coherentes'],
        ['FAQ de horarios y de cancelación con el mismo texto', 'Hay que ordenar intención antes de producir más', 'Mantener, mejorar o consolidar según consultas y utilidad'],
        ['La FAQ de tasa remite al tarifario sin enlazarlo', 'La exactitud de condiciones pesa en la confianza', 'Fuentes vigentes enlazadas y revisión de Producto y Cumplimiento'],
        ['2 backlinks desde 1 dominio (DataForSEO)', 'Pocas referencias detectadas en ese índice', 'Referencias editoriales con origen, destino y atributo registrados']]
S.append(('Diagnóstico de pibank.pe', page('Pibank · Diagnóstico',
    col(eyebrow('Diagnóstico de pibank.pe') + headline(['La base existe; la búsqueda', 'todavía no la encuentra'], 80, extra='; margin-top: 40px'), 110, 1500) +
    zone(thead(['Lo que vimos', 'Qué implica', 'Qué haremos'], W, DARK) + ''.join(trow(r, W, DARK, sel('Pibank') if i == 0 else '') for i, r in enumerate(diag)), 114, 380, 1560) +
    zone(source('Revisión pública del 06-10 y 07-10-2026: WordPress con tema propio y Yoast SEO, 51 FAQ, calculadora y documentos. 19 capturas válidas sobre 10 consultas, Perú en español. Se revalida al inicio con el banco.'), 1060, 985, 720) +
    bubble(), section=1)))

# 05 · Demanda — sección 1 · foco: la barra de productos rivales
grp = [('Productos rivales', 18300, 'Cuentas de BCP, Interbank, Scotiabank y BBVA'), ('Educativa', 5680, 'TREA, respaldo y hábitos de ahorro'),
       ('Directa', 3740, 'Cuenta de ahorros, requisitos, intereses y costos'), ('Condicional', 3330, 'Ahorro digital y rendimiento, según encaje')]
bars = ''
for i, (n, v, d) in enumerate(grp):
    w = round(820 * v / 18300)
    c = ACC if i == 0 else 'rgba(207, 228, 250, 0.42)'
    glow = '; box-shadow: 0 0 40px rgba(3, 117, 219, 0.55)' if i == 0 else ''
    bars += (f'<div style="display: grid; grid-template-columns: 250px minmax(0, 1fr); column-gap: 30px; align-items: center; padding: 20px 0; border-top: 1px solid {DARK["rule"]}">'
             f'<div><div style="font-family: {ID}; font-size: 30px; font-weight: 740; letter-spacing: -0.02em">{n}</div><div style="font-size: 16px; font-weight: 300; color: #cfe4fa; margin-top: 4px">{d}</div></div>'
             f'<div style="display: flex; align-items: center; gap: 22px"><div style="width: {w}px; height: 30px; border-radius: 8px; background: {c}{glow}"></div>'
             f'<div style="font-family: {ID}; font-size: 40px; font-weight: 760; letter-spacing: -0.03em">{format(v, ",").replace(",", ".")}</div></div></div>')
S.append(('La demanda', page('Pibank · Demanda',
    col(eyebrow('La demanda') + headline(['La oportunidad', 'está en', 'comparar'], 104, extra='; margin-top: 64px') +
        body('Quien ya ahorra en un banco grande compara rendimiento, costos y liquidez antes de mover su dinero. Ahí entra Cuenta Soles.', 24, 520, extra='; margin-top: 40px'), 120, 620) +
    zone(label('Búsquedas mensuales estimadas en Perú, por grupo') + f'<div style="margin-top: 22px">{bars}</div>' +
         source('DataForSEO, corte 06-10: 2.278 observaciones, 1.594 consultas, 19 familias. Los grupos se solapan: no se suman como mercado, personas ni visitas. Comparar con marcas requiere aprobación de Producto y Cumplimiento.', extra='; margin-top: 24px; max-width: 1000px'), 780, 230, 1000) + bubble(), section=1)))

# 06 · Arquitectura — sección 2 · foco: el pilar sobre la plataforma
chips = ['Rendimiento y costos', 'Comparación', 'Ahorro disponible', 'Confianza', 'Apertura', 'Primer fondeo']
chip_html = ''.join(f'<div style="padding: 9px 14px; border-radius: 999px; background: #163f60; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22); font-size: 16px; font-weight: 500">{c}</div>' for c in chips)
arr = lambda x, y: f'<div style="position: absolute; left: {x}px; top: {y}px; font-size: 40px; color: #cfe4fa">→</div>'
S.append(('Arquitectura', page('Pibank · Arquitectura', halo_platform(1290, 520, 1290, 880, 560, 70) +
    obj(okicker('Entrada') + otitle('Búsqueda e IA') + otext('Consultas de ahorro, comparación y productos rivales, y respuestas de los motores de IA.'), 720, 470, 250) +
    arr(985, 600) +
    obj(okicker('Hub de ahorro · WordPress') + otitle('Artículos y herramientas por decisión') + f'<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px">{chip_html}</div>', 1035, 400, 360) +
    arr(1405, 600) +
    obj(okicker('Pilar comercial') + otitle('Cuenta Soles', 40) + otext('Uso, rendimiento, costos, requisitos, respaldo y acceso a la apertura, con fuentes claras.', 18), 1455, 470, 300, True) +
    obj(okicker('Banco') + otitle('Registro y primer depósito', 24) + otext('registro.pibank.pe y la app, operados por Pibank.', 16), 1490, 205, 230) +
    col(eyebrow('La arquitectura') + headline(['Cuenta Soles', 'al centro'], 104, extra='; margin-top: 64px') +
        body('La página actual de Cuenta Soles pasa a ser el pilar comercial. Un hub en WordPress organiza artículos y herramientas por decisión de ahorro, y cada recurso lleva al producto.', 24, 540, extra='; margin-top: 40px') +
        body('Si se lanza la cuenta en dólares, se suma con su intención y sus fuentes.', 20, 520, extra='; margin-top: 26px; color: #cfe4fa'), 120, 560) + bubble(), section=2)))

# 07 · SEO técnico — sección 2 · foco: el frente diagnosticado · íconos Trazo
fr = [('buscador', 'Rastreo e indexación', 'Robots, noindex, sitemap y URLs prioritarias. Cierre: estado antes y después.'),
      ('integracion', 'Arquitectura y enlaces', 'Pilar, artículos y herramientas conectados; sin páginas huérfanas.'),
      ('reloj', 'Rendimiento móvil', 'LCP, INP y CLS medidos; imágenes, scripts y plantillas.'),
      ('base-de-datos', 'Datos estructurados', 'Organization, Article y BreadcrumbList, sin duplicidad.'),
      ('checklist', 'Continuidad', 'Revisión tras cada cambio de plantilla, plugin o condición.'),
      ('codigo', 'Canónicas y redirecciones', 'Hoy hay canonical duplicado. Cierre: una canónica renderizada por URL.')]
cells = ''.join(item(t, d, None, 32, DARK, g, sel('Efeonce', 'bottom-start') if i == 5 else '') for i, (g, t, d) in enumerate(fr))
S.append(('SEO técnico', page('Pibank · SEO técnico',
    col(eyebrow('SEO técnico') + headline(['La base,', 'dentro del', 'WordPress de', 'pibank.pe'], 92, extra='; margin-top: 64px') +
        body('Incluye hasta 8 horas de ajustes al mes. Si un cambio depende de TI o del proveedor, entregamos la especificación y lo verificamos después.', 22, 520, extra='; margin-top: 40px'), 120, 600) +
    zone(f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 56px; row-gap: 30px">{cells}</div>', 820, 230, 960) +
    zone(source('La tecnología de registro.pibank.pe se valida por separado. Sin schema por cuota ni promesa de resultados enriquecidos.'), 820, 985, 900) + bubble(), section=2)))

# 08 · Herramientas — sección 2 · foco: el comparador
calc = (okicker('M2 · Mejora') + otitle('Calculadora') +
        '<div style="margin-top: 16px; display: grid; gap: 10px">'
        '<div style="display: flex; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px"><span>Monto</span><span>S/ 10.000</span></div>'
        '<div style="display: flex; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px"><span>Plazo</span><span>12 meses</span></div></div>' +
        otext('Fórmula, experiencia y pruebas, con supuestos visibles.', 16))
rowsc = [('Producto A', '✓', '✓', '—'), ('Cuenta Soles', '✓', '✓', '✓'), ('Producto C', '—', '✓', '✓')]
comp = (okicker('M4–M5 · Nuevo') + otitle('Comparador de ahorro', 34) +
        '<div style="margin-top: 18px; display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 10px 8px; font-size: 15px">' +
        ''.join(f'<div style="color: #cfe4fa; font-weight: 500">{h}</div>' for h in ['', 'Rendimiento', 'Costos', 'Liquidez']) +
        ''.join(''.join(f'<div style="{"font-weight: 600; color: #ffffff" if r[0] == "Cuenta Soles" and j == 0 else ("color: #ffffff; font-weight: 600" if c == "✓" else "color: #cfe4fa")}">{c}</div>' for j, c in enumerate(r)) for r in rowsc) + '</div>' +
        otext('Hasta cinco productos, con criterios y fuentes aprobados por Producto y Cumplimiento. Actualización manual.', 17))
hub = (okicker('M1–M2 · Proyecto') + otitle('Hub de ahorro') +
       '<div style="margin-top: 16px; display: grid; gap: 8px">' + ''.join(f'<div style="padding: 9px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px">{x}</div>' for x in ['Comparar cuentas', 'Entender la TREA', 'Abrir y fondear']) + '</div>' +
       otext('Arquitectura, diseño y hasta tres plantillas.', 16))
S.append(('Herramientas', page('Pibank · Herramientas', halo_platform(1260, 600, 1250, 880, 600, 70) +
    obj(hub, 720, 560, 300) + obj(calc, 1480, 570, 290) + obj(comp, 1040, 470, 420, True) +
    col(eyebrow('Herramientas') + headline(['Tres', 'herramientas', 'para decidir'], 82, extra='; margin-top: 64px') +
        body('Ayudan a calcular, comparar y avanzar a la apertura. Las mantenemos de M3 a M12, con 30 días de garantía correctiva.', 24, 520, extra='; margin-top: 40px') +
        source('La ruta integral suma un planificador de ahorro en M5–M6.', extra='; margin-top: 26px'), 120, 560) + bubble(), section=2)))

# 09 · Ciclo mensual (compositor)
S.append(('Ciclo mensual', img_page('Pibank · Ciclo', IMG['C04'], 'Cómo trabajamos cada mes: medir, crear, distribuir y optimizar alrededor de Pibank.')))

# 10 · Panel AEO — sección 3 · foco: la cifra
dec = ['Rendimiento', 'Comparación', 'Confianza', 'Liquidez', 'Apertura', 'Primer fondeo']
lit = {(0, 0), (1, 2), (3, 1), (6, 0), (9, 2), (13, 1), (17, 0), (20, 2)}
grid_cells = ''.join(f'<div style="width: 26px; height: 26px; border-radius: 6px; {"background: " + ACC + "; box-shadow: 0 0 18px rgba(3, 117, 219, 0.7)" if (q, s) in lit else "box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.35)"}"></div>' for s in range(3) for q in range(24))
S.append(('Panel AEO', page('Pibank · Panel AEO',
    col(eyebrow('Panel AEO') + headline(['Lo que dice', 'la IA, medido', 'dos veces', 'al mes'], 92, extra='; margin-top: 64px') +
        body('Registramos fecha, superficie, presencia, exactitud, fuentes y competidores. Cada hallazgo útil pasa al backlog y se vuelve a observar.', 22, 520, extra='; margin-top: 40px'), 120, 600) +
    zone(f'<div style="display: flex; align-items: flex-end; gap: 28px"><div style="font-family: {ID}; font-size: 200px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.85">144</div>'
         '<div style="font-family: ' + ID + '; font-size: 40px; font-weight: 620; letter-spacing: -0.02em; line-height: 1.05; color: #cfe4fa; padding-bottom: 10px">observaciones<br>al mes desde M2</div></div>' +
         label('24 preguntas × 3 superficies · una celda, una observación por corte', extra='; margin-top: 48px') +
         f'<div style="margin-top: 16px; display: grid; grid-template-columns: repeat(24, 26px); gap: 9px">{grid_cells}</div>' +
         '<div style="margin-top: 36px; display: flex; flex-wrap: wrap; gap: 10px">' + ''.join(f'<div style="padding: 9px 16px; border-radius: 999px; box-shadow: 0 0 0 1px rgba(207, 228, 250, 0.4); font-size: 18px">{d}</div>' for d in dec) + '</div>' +
         source('M1: línea base de 72 observaciones. Superficies acordadas al inicio. Una cita no es una visita ni una cuenta.', extra='; margin-top: 28px'), 820, 230, 960) + bubble(), section=3)))

# 11 · Comunidad y PR — sección 3 · foco: la línea de tiempo · íconos Trazo
months = ''.join(f'<div style="text-align: center; font-size: 16px; font-weight: 500; color: #cfe4fa">M{m}</div>' for m in range(1, 13))
def band(a, b, color, txt='', ink='#04122b', glow=False):
    return f'<div style="grid-column: {a} / {b + 1}; grid-row: 1; height: 34px; border-radius: 9px; background: {color}; display: flex; align-items: center; padding-left: 14px; font-size: 16px; font-weight: 600; color: {ink}{"; box-shadow: 0 0 40px rgba(3, 117, 219, 0.55)" if glow else ""}">{txt}</div>'
tl = (f'<div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{months}</div>'
      f'<div style="margin-top: 18px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{band(3, 12, "rgba(207, 228, 250, 0.55)", "Comunidad · una decisión de ahorro por mes")}</div>'
      f'<div style="margin-top: 14px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{band(3, 4, ACC, "Campaña PR", "#ffffff", True)}{band(8, 9, ACC, "Campaña PR", "#ffffff", True)}</div>'
      f'<div style="margin-top: 14px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{band(6, 6, "rgba(207, 228, 250, 0.55)", "Ref.")}{band(11, 11, "rgba(207, 228, 250, 0.55)", "Ref.")}</div>')
S.append(('Comunidad y PR', page('Pibank · Comunidad y PR',
    col(eyebrow('Comunidad y PR') + headline(['Los recursos', 'salen a buscar', 'a quien', 'compara'], 92, extra='; margin-top: 64px'), 120, 600) +
    zone(label('Ruta gradual · mes a mes') + f'<div style="margin-top: 22px">{tl}</div>' +
         '<div style="margin-top: 56px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px">' +
         item('Comunidad', 'Diez newsletters, cuarenta adaptaciones y hasta 16 horas al mes de escucha y moderación en canales del banco. Las gestiones de cuenta van a los canales oficiales.', 'M3 a M12', 34, ic='correo') +
         item('PR y enlaces', 'Dos campañas de seis a ocho semanas: tres ángulos, doce propuestas a medios y vocería. Dos refuerzos de hasta seis gestiones, sin repetir.', 'M3 · M6 · M8 · M11', 34, ic='prensa') + '</div>' +
         source('Medios prioritarios: Gestión, El Comercio, RPP y Andina. Publicar y enlazar es decisión de cada medio; Comunicaciones aprueba mensajes y voceros.', extra='; margin-top: 30px'), 820, 230, 960) + bubble(), section=3)))

# 12 · SEM — sección 3 · foco: la cifra
S.append(('Eficiencia SEM', page('Pibank · SEM',
    col(eyebrow('Eficiencia de captación') + headline(['Mejores', 'destinos, pauta', 'más eficiente'], 96, extra='; margin-top: 64px') +
        body('Las páginas que mejora el programa también reciben la pauta. Si convierten mejor, cada apertura pagada cuesta menos.', 24, 520, extra='; margin-top: 40px'), 120, 600) +
    zone(f'<div style="font-family: {ID}; font-size: 240px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.85">−33 %</div>'
         f'<div style="font-family: {ID}; font-size: 40px; font-weight: 620; letter-spacing: -0.02em; color: #cfe4fa; margin-top: 18px">gasto de pauta por apertura</div>' +
         source('Ejemplo del mecanismo con los mismos clics y el mismo gasto, si la conversión sube de 2 % a 3 % (+50 % de aperturas). No es un resultado observado.', extra='; margin-top: 16px; max-width: 760px') +
         '<div style="margin-top: 56px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 40px">' +
         item('Destino por intención', 'Una búsqueda comercial va al producto; una de cálculo o comparación, al recurso que la resuelve.', None, 28) +
         item('SEM y SEO se informan', 'Los términos que aprende la pauta orientan el contenido, y al revés.', None, 28) +
         item('Costos completos', 'Costo por apertura y por cuenta con fondos, en cohortes comparables. Marketing opera la pauta.', None, 28) + '</div>', 820, 220, 960) + bubble(), section=3)))

# 13 · Calendario — sección 4 · papel · foco: el mes de inicio
gantt = [('Servicio base', [(1, 12, 's')]), ('Diagnóstico y medición', [(1, 2, 's')]), ('Panel AEO', [(1, 12, 's')]), ('Hub de ahorro', [(1, 2, 'w')]),
         ('Calculadora', [(2, 2, 'w')]), ('Comparador', [(4, 5, 'w')]), ('Comunidad', [(3, 12, 's')]), ('Campañas de PR', [(3, 4, 'w'), (8, 9, 'w')]),
         ('Refuerzos de enlaces', [(6, 6, 'w'), (11, 11, 'w')]), ('Mantenimiento', [(3, 12, 's')]), ('Revisión trimestral', [(3, 3, 'r'), (6, 6, 'r'), (9, 9, 'r'), (12, 12, 'r')])]
L = DARK
gl = f'<div style="display: grid; grid-template-columns: 300px repeat(12, minmax(0, 1fr)); column-gap: 6px; padding-bottom: 12px"><div></div>' + ''.join(f'<div style="text-align: center; font-size: 17px; font-weight: 600; color: {"#ffffff" if m == 1 else L["soft"]}">M{m}</div>' for m in range(1, 13)) + '</div>'
for name, bs in gantt:
    pos = ''
    for a, b, k in bs:
        sty = {'w': 'background: #ffffff', 's': 'background: rgba(207, 228, 250, 0.38)', 'r': 'box-shadow: inset 0 0 0 2px #cfe4fa'}[k]
        pos += f'<div style="grid-column: {a + 1} / {b + 2}; grid-row: 1; height: 22px; align-self: center; border-radius: 6px; {sty}"></div>'
    gl += f'<div style="display: grid; grid-template-columns: 300px repeat(12, minmax(0, 1fr)); column-gap: 6px; padding: 9px 0; border-top: 1px solid {L["rule"]}"><div style="grid-column: 1; grid-row: 1; font-size: 20px; font-weight: 400; color: {L["ink"]}">{name}</div>{pos}</div>'
S.append(('Calendario', page('Pibank · Calendario',
    col(eyebrow('Calendario de la ruta gradual', L) + headline(['Primero la base, después la distribución'], 72, L, '; margin-top: 36px'), 110, 1500) +
    '<div style="position: absolute; left: 441px; top: 318px; width: 116px; height: 560px; border-radius: 14px; box-shadow: 0 0 0 2px rgba(3, 117, 219, 0.95), 0 0 70px rgba(3, 117, 219, 0.45)"></div>' +
    zone(gl, 140, 330, 1640) +
    zone(label('M1 · Estamos aquí', '#ffffff'), 452, 930, 300) +
    zone(f'<div style="display: flex; gap: 30px; font-size: 16px; color: {L["soft"]}"><span style="display: flex; align-items: center; gap: 8px"><span style="width: 26px; height: 12px; border-radius: 4px; background: #ffffff"></span>Construcción o campaña</span><span style="display: flex; align-items: center; gap: 8px"><span style="width: 26px; height: 12px; border-radius: 4px; background: rgba(207, 228, 250, 0.38)"></span>Operación continua</span><span style="display: flex; align-items: center; gap: 8px"><span style="width: 26px; height: 12px; border-radius: 4px; box-shadow: inset 0 0 0 2px #cfe4fa"></span>Revisión</span></div>', 1080, 930, 700) +
    zone(source('M1 es el mes de inicio acordado. Una aprobación pendiente reprograma el hito que depende de ella.'), 1080, 975, 700) + bubble(), section=4)))

# 14 · Aporte — sección 4 · la órbita mide (measureSvg)
S.append(('Aporte estimado', page('Pibank · Aporte',
    AX['measure']['svg'].replace('<svg ', '<svg style="position: absolute; left: 0; top: 0" ', 1) +
    zone(f'<div style="font-family: {ID}; font-size: 104px; font-weight: 760; letter-spacing: -0.04em; line-height: 0.9">1,28 %</div>'
         '<div style="font-size: 22px; font-weight: 300; color: #cfe4fa; margin-top: 10px">de la meta, como máximo,<br>desde la búsqueda nueva</div>', 1140, 300, 340, '; text-align: center') +
    zone(f'<div style="font-family: {ID}; font-size: 64px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.95">39–195</div>'
         '<div style="font-size: 20px; font-weight: 300; color: #cfe4fa; margin-top: 10px">cuentas con fondos, con captura madura de 2 %, 5 % y 10 % sobre las 19 familias investigadas</div>', 1580, 300, 200) +
    zone(source('Sensibilidad Efeonce sobre 19 familias investigadas, captura madura 10 %. No es un mínimo ni un techo del programa.', extra='; text-align: center'), 1080, 625, 460) +
    col(eyebrow('Aporte estimado') + headline(['El aporte', 'se estima', 'con datos', 'de Pibank'], 96, extra='; margin-top: 64px') +
        body('La búsqueda nueva explica una parte pequeña de la meta. La conversión del tráfico que ya llega y el primer depósito se cuantifican con los datos del banco en el primer mes.', 22, 540, extra='; margin-top: 40px'), 120, 600) +
    zone('<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 44px">' +
         item('130 → 225', 'Cuentas con fondos por cada 10.000 visitas si la apertura pasa de 2 % a 3 % y el fondeo de 65 % a 75 %. Explica el mecanismo.', 'Convertir lo que ya llega', 40) +
         item('Dos entregables', 'Estimación de aporte por cohorte y escenario desde el lanzamiento, con la fecha y las series del banco.', 'Primer mes', 40) + '</div>', 820, 700, 960) + bubble(), section=4)))

# 15 · Medición (compositor)
S.append(('Medición y atribución', img_page('Pibank · Medición', IMG['C06'], '¿Cómo sabremos si funciona? Lo medimos: cinco métricas con fórmula, fuente y dueño.')))

# 16 · Equipo (compositor)
S.append(('Equipo de la cuenta', img_page('Pibank · Equipo', IMG['C07'], 'Equipo de la cuenta con Pibank al centro.')))

# 17 · Responsabilidades — sección 5 · papel · foco: condiciones financieras
W2 = [0.9, 1.25, 1.25, 1]
resp = [['Prioridades y contenido', 'Investiga, recomienda y produce', 'Acuerda prioridades', 'Plan mensual'],
        ['Condiciones financieras', 'Prepara contenido con fuente', 'Valida cifras y claims', 'Nada se publica sin visto bueno'],
        ['Sitio y plantillas', 'Implementa donde tiene acceso', 'Habilita entornos y despliegue', 'Especificación y QA'],
        ['Registro, app y depósito', 'Especifica continuidad y medición', 'Implementa y opera', 'Eventos comprobados'],
        ['Medición y datos', 'Diccionario, tablero y análisis', 'Entrega agregados autorizados', 'Conciliación mensual'],
        ['Comunidad y PR', 'Recursos, gestión y moderación', 'Aprueba voceros y canales', 'Calendario de salidas']]
S.append(('Responsabilidades', page('Pibank · Responsabilidades',
    col(eyebrow('Responsabilidades') + headline(['Qué hace Efeonce y qué hace Pibank'], 72, extra='; margin-top: 36px'), 110, 1500) +
    zone(thead(['Frente', 'Efeonce', 'Pibank', 'Juntos'], W2, DARK) + ''.join(trow(r, W2, DARK, sel('Pibank') if i == 1 else '', 22, 27) for i, r in enumerate(resp)), 114, 330, 1560) +
    zone(source('Seguimiento semanal, informe mensual y revisión trimestral. Revisión del banco en cinco días hábiles, hasta dos rondas por lote; el silencio no aprueba una publicación.'), 1060, 975, 720) + bubble(), section=5)))

# 18 · Riesgos (compositor)
S.append(('Riesgos', img_page('Pibank · Riesgos', IMG['C08'], '¿Y si no funciona? Lo corregimos: cuatro riesgos con su cobertura.')))

# 19 · Inversión — sección 5 · foco: la ruta gradual (selección)
plans = [('Servicio base', 'US$4.500', 'al mes · US$54.000 al año', ['Dirección y revisiones trimestrales', 'SEO técnico y 8 h de WordPress al mes', 'Hasta 5 artículos al mes', 'Panel AEO de 24 preguntas', 'Medición, CRO y eficiencia SEM']),
         ('Ruta gradual · recomendada', 'US$79.200', 'al año · promedio US$6.600 al mes', ['Servicio base: US$54.000', 'Hub US$3.000 · calculadora US$1.200', 'Comparador US$4.000', 'Comunidad M3–M12: US$10.000', 'Dos campañas PR US$4.000 · dos refuerzos US$1.000', 'Mantenimiento de herramientas US$2.000']),
         ('Ruta integral', 'US$89.200', 'al año · US$10.000 más', ['Todo lo de la gradual', 'Planificador de ahorro US$3.000', 'Comunidad desde M1 (+US$2.000)', 'Cuatro campañas y cuatro refuerzos (+US$5.000)'])]
pc = ''
for i, (n, a, p, fs) in enumerate(plans):
    pc += (f'<div{sel("Efeonce") if i == 1 else ""} style="padding: 26px 30px 30px; border-top: 1px solid {DARK["rule"]}">{label(n, "#ffffff" if i == 1 else None)}'
           f'<div style="font-family: {ID}; font-size: {84 if i == 1 else 64}px; font-weight: 760; letter-spacing: -0.04em; line-height: 0.95; margin-top: 16px">{a}</div>'
           f'<div style="font-size: 18px; color: #cfe4fa; margin-top: 10px">{p}</div>'
           '<div style="margin-top: 22px; display: flex; flex-direction: column">' +
           ''.join(f'<div style="padding: 11px 0; border-top: 1px solid {DARK["rule"]}; font-size: 19px; font-weight: 300; line-height: 1.35">{f}</div>' for f in fs) + '</div></div>')
S.append(('Inversión', page('Pibank · Inversión',
    col(eyebrow('Inversión') + headline(['US$79.200 en doce meses'], 80, extra='; margin-top: 36px'), 110, 1500) +
    zone(f'<div style="display: grid; grid-template-columns: 1fr 1.25fr 1fr; column-gap: 48px; align-items: start">{pc}</div>', 140, 270, 1640) +
    zone(source('Valores en USD, antes de los impuestos que correspondan. Base facturada mensualmente por adelantado; proyectos 50 % al inicio y 50 % a la aceptación. Cada activación se acuerda antes de ejecutar; máximo de US$7.700 en un mes.'), 1040, 975, 740) + bubble(), section=5)))

# 20 · Para arrancar — sección 5 · íconos Trazo
need = [('calendario', 'Fecha y series del lanzamiento', 'Tráfico, aperturas y fondeo agregados por canal y página.'),
        ('medicion', 'Search Console y analítica', 'Acceso para fijar la línea base de búsqueda.'),
        ('web', 'WordPress y entorno de pruebas', 'O el contacto del proveedor que implementa.'),
        ('contrato', 'Revisores de Producto y Cumplimiento', 'Y una persona que consolide las revisiones.'),
        ('objetivo', 'Definición de la meta', 'Unidad, moneda y período de las 15.200 cuentas.')]
nl = ''.join(f'<div style="display: grid; grid-template-columns: 76px minmax(0, 1fr); column-gap: 22px; align-items: center; padding: 26px 0; border-top: 1px solid {DARK["rule"]}">'
             f'{icon(g)}<div><div style="font-family: {ID}; font-size: 38px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05">{t}</div><div style="font-size: 21px; font-weight: 300; color: #cfe4fa; margin-top: 8px">{d}</div></div></div>' for g, t, d in need)
S.append(('Para arrancar', page('Pibank · Para arrancar',
    col(eyebrow('Para arrancar') + headline(['Cinco datos', 'para empezar'], 104, extra='; margin-top: 64px') +
        body('Con esto, el primer mes entrega el diagnóstico validado, la medición, la línea base en IA, la mejora inicial del pilar, los primeros artículos y la estimación de aporte.', 22, 540, extra='; margin-top: 40px'), 120, 620) +
    zone(nl, 820, 210, 960) + bubble(), section=5)))

# 21 · Cierre (compositor)
S.append(('Cierre', img_page('Pibank · Cierre', IMG['C09'], 'Contraportada: Empower your Engine, con los datos de contacto de Efeonce.')))

idx = json.load(open(f'{ROOT}/canvas.json'))
assert len(S) == 21
for i, (title, html) in enumerate(S):
    fn = f'Tec-{i + 1:02d}.dc.html'
    open(f'{ROOT}/{fn}', 'w').write(html)
    idx['boards'][fn]['title'] = f'{i + 1:02d} · {title}'
idx['notes']['titulo-tecnica']['text'] = 'Pibank 2027 · Propuesta técnica · v4 del 07-10'
idx['notes']['pendientes-tecnica']['text'] = ('Para revisar\n\n1. Equipo (16): Melkin entró provisorio como quinta ficha; confirma quién va.\n\n'
    '2. Inversión (19): montos de la oferta híbrida, antes de impuestos.\n\n'
    '3. v4: azul Engine en toda la línea, órbita de navegación en las 5 secciones, aporte medido con la órbita, selección e íconos de AXIS, y diagnóstico, calendario y responsabilidades de vuelta en oscuro.\n\n'
    '4. 01, 09, 15, 16, 18 y 21 salen del compositor (imagen); las demás se editan aquí.')
json.dump(idx, open(f'{ROOT}/canvas.json', 'w'), ensure_ascii=False, indent=2)
print('ok')
