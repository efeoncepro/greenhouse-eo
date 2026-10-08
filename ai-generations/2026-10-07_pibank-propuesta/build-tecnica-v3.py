# Pibank · Propuesta técnica 2027 en el canvas Design (v3, 2026-10-07).
# Láminas a mano sobre el molde de La órbita, línea Engine, con el vocabulario de las nativas del deck SEO/AEO
# (render-src/native/: halo + plataforma de luz, UN foco por lámina) y las listas editoriales del brochure
# Agencia Creativa (build-canvas-v7.py: filetes, sin tarjetas). Las láminas con par pregunta–respuesta salen del
# compositor (composer/, riesgo/) y entran como imagen.
# Uso: python3 build-tecnica.py <carpeta project del canvas>
import json, sys

ROOT = sys.argv[1]
BL = lambda i: f'/_blob/{i}'
BUB = '434cdccb13af2a417f555053d9a45582'
IMG = {'C01': 'd25571b6933c0151b749f615c07c6e3b', 'C04': '826fc5c542aa67cf0489aa3bc5ed9acc', 'C06': '142e69619c3e4414e8607371ef5f930f',
       'C07': '67a1e1797918097800c350d016e8e274', 'C08': '37cf716674faaa8d5f2a522eb8833d0a', 'C09': 'd263d88087b8989fde98a444361c996d'}
BG, INK, SOFT, ACC, TEAL, TEAL2 = '#091951', '#ffffff', '#cfe4fa', '#0375db', '#72ded8', '#1f9e94'
RULE = 'rgba(114, 222, 216, 0.16)'
ID = "'Bricolage Grotesque', system-ui, sans-serif"; ST = "'Poppins', system-ui, sans-serif"
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">'


def page(title, body):
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
body{{margin:0;background:{BG}}}
</style>
</helmet>
<div style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: {BG}; color: {INK}; font-family: {ST}">
{body}
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


def eyebrow(t):
    return f'<div style="font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: {INK}">{t}</div>'


def headline(lines, px, extra=''):
    return f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.94; color: {INK}{extra}">{"<br>".join(lines)}{sphere()}</div>'


def body(t, px=26, width=560, extra=''):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: {INK}; max-width: {width}px{extra}">{t}</div>'


def source(t, extra=''):
    return f'<div style="font-size: 15px; font-weight: 400; line-height: 1.5; color: {SOFT}{extra}">{t}</div>'


def label(t, color=SOFT, extra=''):
    return f'<div style="font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: {color}{extra}">{t}</div>'


def bubble():
    return f'<img src="{BL(BUB)}" alt="efeoncepro.com" style="position: absolute; left: 135px; top: 990px; width: 162px; height: 38px">'


def col(inner, top=120, width=640):
    return f'<div style="position: absolute; left: 140px; top: {top}px; width: {width}px; display: flex; flex-direction: column">{inner}</div>'


def zone(inner, left, top, width, extra=''):
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px{extra}">{inner}</div>'


def halo(cx=1290, cy=440, plat=True, pcx=1290, pcy=900, prx=520, pry=70):
    p = ''
    if plat:
        p = f'''<radialGradient id="pf" cx="{pcx}" cy="{pcy}" r="{prx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 {pcy - pcy * 0.16:.0f}) scale(1 0.16)"><stop offset="0" stop-color="{TEAL}" stop-opacity="0.30"/><stop offset="0.7" stop-color="{TEAL2}" stop-opacity="0.06"/><stop offset="1" stop-color="{TEAL2}" stop-opacity="0"/></radialGradient>
<filter id="pg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>'''
    shapes = ''
    if plat:
        shapes = f'''<ellipse cx="{pcx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="url(#pf)"/>
<ellipse cx="{pcx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="none" stroke="{TEAL}" stroke-opacity="0.55" stroke-width="3"/>
<path d="M {pcx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {pcx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{TEAL2}" stroke-width="14" opacity="0.45" filter="url(#pg)"/>
<path d="M {pcx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {pcx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{TEAL2}" stroke-width="6" stroke-linecap="round"/>'''
    return f'''<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">
<defs>
<radialGradient id="hl" cx="{cx}" cy="{cy}" r="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{TEAL}" stop-opacity="0.26"/><stop offset="0.35" stop-color="{TEAL2}" stop-opacity="0.10"/><stop offset="1" stop-color="{TEAL2}" stop-opacity="0"/></radialGradient>
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000814" stop-opacity="0.5"/></linearGradient>
{p}
</defs>
<rect width="1920" height="1080" fill="url(#hl)"/>
<rect y="778" width="1920" height="302" fill="url(#fl)"/>
{shapes}
</svg>'''


def obj(inner, left, top, width, hero=False, extra=''):
    sh = (f'box-shadow: 0 0 0 2px rgba(114, 222, 216, 0.85), 0 50px 110px rgba(0, 6, 16, 0.75), 0 0 120px rgba(114, 222, 216, 0.38); background: linear-gradient(180deg, #12385a 0%, #081c30 100%); border-radius: 28px; padding: 30px 32px 32px;'
          if hero else
          'box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 22px 44px rgba(0, 6, 16, 0.6); background: linear-gradient(180deg, #10304b 0%, #081c30 100%); border-radius: 22px; padding: 26px 28px 28px;')
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px; box-sizing: border-box; {sh}{extra}">{inner}</div>'


def okicker(t):
    return f'<div style="font-weight: 600; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: {TEAL}">{t}</div>'


def otitle(t, px=30):
    return f'<div style="font-family: {ID}; font-weight: 740; font-size: {px}px; letter-spacing: -0.02em; line-height: 1.05; margin-top: 10px">{t}</div>'


def otext(t, px=18, extra=''):
    return f'<div style="font-weight: 400; font-size: {px}px; line-height: 1.4; color: #c9d6e2; margin-top: 10px{extra}">{t}</div>'


def item(title, text, lab=None, px=36):
    return (f'<div style="display: flex; flex-direction: column; gap: 10px; padding-top: 22px; border-top: 1px solid {RULE}">' +
            (label(lab) if lab else '') +
            f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.04">{title}</div>'
            f'<div style="font-size: 20px; font-weight: 300; line-height: 1.45; color: {SOFT}">{text}</div></div>')


def sel_box(inner, extra=''):
    return f'<div style="position: relative; border-radius: 18px; box-shadow: 0 0 0 2px rgba(114, 222, 216, 0.85), 0 0 80px rgba(114, 222, 216, 0.25); background: linear-gradient(180deg, rgba(18, 56, 90, 0.85) 0%, rgba(8, 28, 48, 0.85) 100%){extra}">{inner}</div>'


def trow(cells, widths, first_bold=True, selected=False, px=21):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    cs = ''.join(f'<div style="font-size: {px}px; line-height: 1.42; {"font-weight: 600; color: #ffffff" if (j == 0 and first_bold) else f"font-weight: 300; color: {SOFT if not selected else INK}"}">{c}</div>' for j, c in enumerate(cells))
    row = f'<div style="display: grid; grid-template-columns: {tpl}; column-gap: 40px; padding: 20px 26px; align-items: start">{cs}</div>'
    if selected:
        return sel_box(row, '; margin: 4px 0')
    return f'<div style="border-top: 1px solid {RULE}">{row}</div>'


def thead(cells, widths):
    tpl = ' '.join(f'minmax(0, {w}fr)' for w in widths)
    cs = ''.join(f'<div>{label(c)}</div>' for c in cells)
    return f'<div style="display: grid; grid-template-columns: {tpl}; column-gap: 40px; padding: 0 26px 14px">{cs}</div>'


S = []

# 01 · Portada (compositor)
S.append(('Portada', img_page('Pibank · Portada', IMG['C01'], 'Portada de la propuesta técnica para Pibank: ¿Dónde nace una cuenta? En la búsqueda.')))

# 02 · Resumen para gerencia — foco: la meta
rows = [('Qué hacemos', 'SEO técnico en WordPress, hasta cinco artículos al mes, hub y herramientas, panel de IA, comunidad y PR sobre pibank.pe.'),
        ('Cómo se mide', 'Aperturas validadas y cuentas con fondos, con datos agregados del banco. Una cuenta se cuenta una vez.'),
        ('Inversión', 'Ruta gradual de US$79.200 al año: US$54.000 de servicio base y US$25.200 en activaciones.')]
S.append(('Resumen para gerencia', page('Pibank · Resumen', halo(1340, 380, plat=False) +
    col(eyebrow('Resumen para gerencia') + headline(['Doce meses', 'para que Cuenta', 'Soles se elija'], 104, '; margin-top: 64px') +
        body('Un programa de SEO, AEO y contenidos que ayuda a encontrar la cuenta, compararla, abrirla y hacer el primer depósito.', 26, 600, '; margin-top: 44px'), 120, 720) +
    zone(f'<div style="font-family: {ID}; font-size: 196px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9">15.200</div>'
         f'<div style="font-family: {ID}; font-size: 44px; font-weight: 620; letter-spacing: -0.02em; color: {SOFT}; margin-top: 12px">cuentas con fondos: la meta de referencia</div>'
         + source('Meta conversada el 06-10; moneda y período por confirmar con el banco.', '; margin-top: 14px') +
         '<div style="margin-top: 50px; display: flex; flex-direction: column; gap: 22px">' +
         ''.join(f'<div style="display: grid; grid-template-columns: 190px minmax(0, 1fr); column-gap: 30px; padding-top: 18px; border-top: 1px solid {RULE}">{label(a, INK, "; padding-top: 6px")}<div style="font-size: 22px; font-weight: 300; line-height: 1.45; color: {SOFT}">{b}</div></div>' for a, b in rows) +
         '</div>', 980, 150, 800) + bubble())))

# 03 · La meta hacia atrás — foco: la escalera del embudo
steps = [('1.169.231', 'visitas elegibles', 'Búsqueda, IA, pauta y referidos', 300),
         ('23.385', 'aperturas', 'Si abre el 2 % de las visitas', 400),
         ('15.200', 'cuentas con fondos', 'Si el 65 % hace su primer depósito', 500),
         ('US$38&nbsp;m', 'en depósitos iniciales', 'Con un ticket de US$2.500', 600)]
st = ''
for i, (v, l, d, h) in enumerate(steps):
    left = 780 + i * 262
    hero = (i == 2)
    inner = (okicker(f'0{i + 1}') +
             f'<div style="font-family: {ID}; font-weight: 760; font-size: {52 if i else 46}px; letter-spacing: -0.035em; line-height: 0.95; margin-top: 12px">{v}</div>' +
             f'<div style="font-size: 19px; font-weight: 600; margin-top: 10px">{l}</div>' + otext(d, 16))
    st += obj(inner, left, 900 - h, 240, hero, f'; height: {h}px')
S.append(('La meta y el embudo', page('Pibank · La meta', halo(1300, 520, True, 1300, 900, 600, 70) + st +
    col(eyebrow('La meta, hacia atrás') + headline(['Todo el embudo,', 'no sólo la', 'búsqueda'], 80, '; margin-top: 64px') +
        body('Llegar a 15.200 cuentas con fondos exige este recorrido completo. El programa suma demanda nueva, mejor conversión de lo que ya llega y ayuda al primer depósito.', 24, 560, '; margin-top: 40px') +
        source('Cálculo de Efeonce. Tasas de prueba de 2 % y 65 %, no datos de Pibank: es un requisito, no un pronóstico.', '; margin-top: 30px; max-width: 520px'), 120, 600) + bubble())))

# 04 · Diagnóstico — foco: fila seleccionada
W = [1.15, 1.2, 1.25]
diag = [['No apareció en 17 capturas genéricas de ahorro', 'Brecha frente a otros bancos en esa muestra; no ausencia total en Google', 'Priorizar ahorro y comparación, y contrastar con Search Console'],
        ['Dos canonical idénticos en páginas clave y FAQ', 'Duplicidad de implementación; no prueba una penalización', 'Una canónica consistente por plantilla y datos estructurados coherentes'],
        ['FAQ de horarios y de cancelación con el mismo texto', 'Hay que ordenar intención antes de producir más', 'Mantener, mejorar o consolidar según consultas y utilidad'],
        ['La FAQ de tasa remite al tarifario sin enlazarlo', 'La exactitud de condiciones pesa en la confianza', 'Fuentes vigentes enlazadas y revisión de Producto y Cumplimiento'],
        ['2 backlinks desde 1 dominio (DataForSEO)', 'Pocas referencias detectadas en ese índice', 'Referencias editoriales con origen, destino y atributo registrados']]
S.append(('Diagnóstico de pibank.pe', page('Pibank · Diagnóstico',
    col(eyebrow('Diagnóstico de pibank.pe') + headline(['La base existe; la búsqueda', 'todavía no la encuentra'], 80, '; margin-top: 40px'), 110, 1640) +
    zone(thead(['Lo que vimos', 'Qué implica', 'Qué haremos'], W) + ''.join(trow(r, W, selected=(i == 0)) for i, r in enumerate(diag)), 114, 400, 1690) +
    zone(source('Revisión pública del 06-10 y 07-10-2026: WordPress con tema propio y Yoast SEO, 51 FAQ, calculadora y documentos. 19 capturas válidas sobre 10 consultas, Perú en español. Se revalida al inicio con el banco.'), 1060, 985, 720) + bubble())))

# 05 · Demanda — foco: barras con datos
grp = [('Productos rivales', 18300, 'Cuentas de BCP, Interbank, Scotiabank y BBVA'), ('Educativa', 5680, 'TREA, respaldo y hábitos de ahorro'),
       ('Directa', 3740, 'Cuenta de ahorros, requisitos, intereses y costos'), ('Condicional', 3330, 'Ahorro digital y rendimiento, según encaje')]
mx = 18300; bars = ''
for i, (n, v, d) in enumerate(grp):
    w = round(820 * v / mx)
    c = TEAL if i == 0 else 'rgba(207, 228, 250, 0.42)'
    bars += (f'<div style="display: grid; grid-template-columns: 250px minmax(0, 1fr); column-gap: 30px; align-items: center; padding: 20px 0; border-top: 1px solid {RULE}">'
             f'<div><div style="font-family: {ID}; font-size: 30px; font-weight: 740; letter-spacing: -0.02em">{n}</div><div style="font-size: 16px; font-weight: 300; color: {SOFT}; margin-top: 4px">{d}</div></div>'
             f'<div style="display: flex; align-items: center; gap: 22px"><div style="width: {w}px; height: 30px; border-radius: 8px; background: {c}{"; box-shadow: 0 0 40px rgba(114, 222, 216, 0.45)" if i == 0 else ""}"></div>'
             f'<div style="font-family: {ID}; font-size: 40px; font-weight: 760; letter-spacing: -0.03em">{format(v, ",").replace(",", ".")}</div></div></div>')
S.append(('La demanda', page('Pibank · Demanda', halo(1300, 470, plat=False) +
    col(eyebrow('La demanda') + headline(['La oportunidad', 'está en', 'comparar'], 104, '; margin-top: 64px') +
        body('Quien ya ahorra en un banco grande compara rendimiento, costos y liquidez antes de mover su dinero. Ahí entra Cuenta Soles.', 24, 520, '; margin-top: 40px'), 120, 620) +
    zone(label('Búsquedas mensuales estimadas en Perú, por grupo') + f'<div style="margin-top: 22px">{bars}</div>' +
         source('DataForSEO, corte 06-10: 2.278 observaciones, 1.594 consultas, 19 familias. Los grupos se solapan: no se suman como mercado, personas ni visitas. Comparar con marcas requiere aprobación de Producto y Cumplimiento.', '; margin-top: 24px; max-width: 1000px'), 780, 200, 1000) + bubble())))

# 06 · Arquitectura — foco: el pilar sobre la plataforma
chips = ['Rendimiento y costos', 'Comparación', 'Ahorro disponible', 'Confianza', 'Apertura', 'Primer fondeo']
chip_html = ''.join(f'<div style="padding: 9px 14px; border-radius: 999px; background: #163f60; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22); font-size: 16px; font-weight: 500">{c}</div>' for c in chips)
arr = lambda x, y: f'<div style="position: absolute; left: {x}px; top: {y}px; font-size: 40px; color: {TEAL}">→</div>'
S.append(('Arquitectura', page('Pibank · Arquitectura', halo(1290, 430, True, 1290, 880, 560, 70) +
    obj(okicker('Entrada') + otitle('Búsqueda e IA') + otext('Consultas de ahorro, comparación y productos rivales, y respuestas de los motores de IA.'), 720, 470, 250) +
    arr(985, 600) +
    obj(okicker('Hub de ahorro · WordPress') + otitle('Artículos y herramientas por decisión') + f'<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px">{chip_html}</div>', 1035, 400, 360) +
    arr(1405, 600) +
    obj(okicker('Pilar comercial') + otitle('Cuenta Soles', 40) + otext('Uso, rendimiento, costos, requisitos, respaldo y acceso a la apertura, con fuentes claras.', 18), 1455, 420, 300, True) +
    obj(okicker('Banco') + otitle('Registro y primer depósito', 24) + otext('registro.pibank.pe y la app, operados por Pibank.', 16), 1500, 210, 260) +
    col(eyebrow('La arquitectura') + headline(['Cuenta Soles', 'al centro'], 104, '; margin-top: 64px') +
        body('La página actual de Cuenta Soles pasa a ser el pilar comercial. Un hub en WordPress organiza artículos y herramientas por decisión de ahorro, y cada recurso lleva al producto.', 24, 540, '; margin-top: 40px') +
        body('Si se lanza la cuenta en dólares, se suma con su intención y sus fuentes.', 20, 520, f'; margin-top: 26px; color: {SOFT}'), 120, 560) + bubble())))

# 07 · SEO técnico — foco: el frente diagnosticado
fr = [('Rastreo e indexación', 'Robots, noindex, sitemap y URLs prioritarias. Cierre: estado antes y después.'),
      ('Canónicas y redirecciones', 'Hoy hay canonical duplicado. Cierre: una canónica renderizada por URL.'),
      ('Arquitectura y enlaces', 'Pilar, artículos y herramientas conectados; sin páginas huérfanas.'),
      ('Rendimiento móvil', 'LCP, INP y CLS medidos; imágenes, scripts y plantillas.'),
      ('Datos estructurados', 'Organization, Article y BreadcrumbList, sin duplicidad.'),
      ('Continuidad', 'Revisión tras cada cambio de plantilla, plugin o condición.')]
cells = ''
for i, (t, d) in enumerate(fr):
    inner = f'<div style="padding: 22px 26px 24px">{label(f"0{i + 1}")}<div style="font-family: {ID}; font-size: 32px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; margin-top: 10px">{t}</div><div style="font-size: 19px; font-weight: 300; line-height: 1.45; color: {SOFT}; margin-top: 10px">{d}</div></div>'
    cells += sel_box(inner) if i == 1 else f'<div style="border-top: 1px solid {RULE}">{inner}</div>'
S.append(('SEO técnico', page('Pibank · SEO técnico',
    col(eyebrow('SEO técnico') + headline(['La base,', 'dentro del', 'WordPress de', 'pibank.pe'], 92, '; margin-top: 64px') +
        body('Incluye hasta 8 horas de ajustes al mes. Si un cambio depende de TI o del proveedor, entregamos la especificación y lo verificamos después.', 22, 520, '; margin-top: 40px'), 120, 600) +
    zone(f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 36px; row-gap: 14px">{cells}</div>', 820, 150, 960) +
    zone(source('La tecnología de registro.pibank.pe se valida por separado. Sin schema por cuota ni promesa de resultados enriquecidos.'), 846, 985, 900) + bubble())))

# 08 · Herramientas — foco: el comparador
calc = (okicker('M2 · Mejora') + otitle('Calculadora') +
        f'<div style="margin-top: 16px; display: grid; gap: 10px">'
        f'<div style="display: flex; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px"><span>Monto</span><span>S/ 10.000</span></div>'
        f'<div style="display: flex; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px"><span>Plazo</span><span>12 meses</span></div></div>' +
        otext('Fórmula, experiencia y pruebas, con supuestos visibles.', 16))
rowsc = [('Producto A', '✓', '✓', '—'), ('Cuenta Soles', '✓', '✓', '✓'), ('Producto C', '—', '✓', '✓')]
comp = (okicker('M4–M5 · Nuevo') + otitle('Comparador de ahorro', 34) +
        f'<div style="margin-top: 18px; display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 10px 8px; font-size: 15px">' +
        ''.join(f'<div style="color: {SOFT}; font-weight: 500">{h}</div>' for h in ['', 'Rendimiento', 'Costos', 'Liquidez']) +
        ''.join(''.join(f'<div style="{"font-weight: 600; color: #ffffff" if r[0] == "Cuenta Soles" and j == 0 else ("color: " + TEAL if c == "✓" else "color: " + SOFT)}">{c}</div>' for j, c in enumerate(r)) for r in rowsc) + '</div>' +
        otext('Hasta cinco productos, con criterios y fuentes aprobados por Producto y Cumplimiento. Actualización manual.', 17))
hub = (okicker('M1–M2 · Proyecto') + otitle('Hub de ahorro') +
       f'<div style="margin-top: 16px; display: grid; gap: 8px">' + ''.join(f'<div style="padding: 9px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.07); font-size: 16px">{x}</div>' for x in ['Comparar cuentas', 'Entender la TREA', 'Abrir y fondear']) + '</div>' +
       otext('Arquitectura, diseño y hasta tres plantillas.', 16))
S.append(('Herramientas', page('Pibank · Herramientas', halo(1290, 430, True, 1290, 890, 560, 70) +
    obj(hub, 720, 300, 300) + obj(calc, 1500, 300, 290) + obj(comp, 1040, 200, 440, True) +
    zone(f'<div style="display: inline-block; padding: 10px 18px; border-radius: 999px; box-shadow: 0 0 0 1px rgba(207, 228, 250, 0.4); font-size: 17px; color: {SOFT}">Ruta integral: planificador de ahorro en M5–M6</div>', 1080, 760, 400, '; text-align: center') +
    col(eyebrow('Herramientas') + headline(['Tres', 'herramientas', 'para decidir'], 82, '; margin-top: 64px') +
        body('Ayudan a calcular, comparar y avanzar a la apertura. Las mantenemos de M3 a M12, con 30 días de garantía correctiva.', 24, 520, '; margin-top: 40px'), 120, 560) + bubble())))

# 09 · Ciclo mensual (compositor)
S.append(('Ciclo mensual', img_page('Pibank · Ciclo', IMG['C04'], 'Cómo trabajamos cada mes: medir, crear, distribuir y optimizar alrededor de Pibank.')))

# 10 · Panel AEO — foco: la grilla de observaciones
dec = ['Rendimiento', 'Comparación', 'Confianza', 'Liquidez', 'Apertura', 'Primer fondeo']
lit = {(0, 0), (1, 2), (3, 1), (6, 0), (9, 2), (13, 1), (17, 0), (20, 2)}
grid_cells = ''.join(f'<div style="width: 26px; height: 26px; border-radius: 6px; {"background: " + TEAL + "; box-shadow: 0 0 18px rgba(114, 222, 216, 0.6)" if (q, s) in lit else "box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.35)"}"></div>' for s in range(3) for q in range(24))
S.append(('Panel AEO', page('Pibank · Panel AEO', halo(1300, 420, plat=False) +
    col(eyebrow('Panel AEO') + headline(['Lo que dice', 'la IA, medido', 'dos veces', 'al mes'], 92, '; margin-top: 64px') +
        body('Registramos fecha, superficie, presencia, exactitud, fuentes y competidores. Cada hallazgo útil pasa al backlog y se vuelve a observar.', 22, 520, '; margin-top: 40px'), 120, 600) +
    zone(f'<div style="display: flex; align-items: flex-end; gap: 28px"><div style="font-family: {ID}; font-size: 200px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.85">144</div>'
         f'<div style="font-family: {ID}; font-size: 40px; font-weight: 620; letter-spacing: -0.02em; line-height: 1.05; color: {SOFT}; padding-bottom: 10px">observaciones<br>al mes desde M2</div></div>' +
         label('24 preguntas × 3 superficies · una celda, una observación por corte', SOFT, '; margin-top: 48px') +
         f'<div style="margin-top: 16px; display: grid; grid-template-columns: repeat(24, 26px); gap: 9px">{grid_cells}</div>' +
         f'<div style="margin-top: 36px; display: flex; flex-wrap: wrap; gap: 10px">' + ''.join(f'<div style="padding: 9px 16px; border-radius: 999px; box-shadow: 0 0 0 1px rgba(114, 222, 216, 0.4); font-size: 18px">{d}</div>' for d in dec) + '</div>' +
         source('M1: línea base de 72 observaciones. Superficies acordadas al inicio. Una cita no es una visita ni una cuenta.', '; margin-top: 28px'), 820, 170, 960) + bubble())))

# 11 · Comunidad y PR — foco: la línea de tiempo
months = ''.join(f'<div style="text-align: center; font-size: 16px; font-weight: 500; color: {SOFT}">M{m}</div>' for m in range(1, 13))
def band(a, b, color, txt='', top=0, h=34, glow=False):
    return f'<div style="grid-column: {a} / {b + 1}; grid-row: 1; margin-top: {top}px; height: {h}px; border-radius: 9px; background: {color}; display: flex; align-items: center; padding-left: 14px; font-size: 16px; font-weight: 600; color: #04122b{"; box-shadow: 0 0 40px rgba(114, 222, 216, 0.5)" if glow else ""}">{txt}</div>'
tl = (f'<div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{months}</div>'
      f'<div style="margin-top: 18px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{band(3, 12, "rgba(207, 228, 250, 0.55)", "Comunidad · una decisión de ahorro por mes")}</div>'
      f'<div style="margin-top: 14px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{band(3, 4, TEAL, "Campaña PR", glow=True)}{band(8, 9, TEAL, "Campaña PR", glow=True)}</div>'
      f'<div style="margin-top: 14px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px">{band(6, 6, "rgba(207, 228, 250, 0.55)", "Ref.")}{band(11, 11, "rgba(207, 228, 250, 0.55)", "Ref.")}</div>')
S.append(('Comunidad y PR', page('Pibank · Comunidad y PR', halo(1300, 420, plat=False) +
    col(eyebrow('Comunidad y PR') + headline(['Los recursos', 'salen a buscar', 'a quien', 'compara'], 92, '; margin-top: 64px'), 120, 600) +
    zone(label('Ruta gradual · mes a mes') + f'<div style="margin-top: 22px">{tl}</div>' +
         '<div style="margin-top: 60px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px">' +
         item('Comunidad', 'Diez newsletters, cuarenta adaptaciones y hasta 16 horas al mes de escucha y moderación en canales del banco. Las gestiones de cuenta van a los canales oficiales.', 'M3 a M12', 34) +
         item('PR y enlaces', 'Dos campañas de seis a ocho semanas: tres ángulos, doce propuestas a medios y vocería. Dos refuerzos de hasta seis gestiones, sin repetir.', 'M3 · M6 · M8 · M11', 34) + '</div>' +
         source('Medios prioritarios: Gestión, El Comercio, RPP y Andina. Publicar y enlazar es decisión de cada medio; Comunicaciones aprueba mensajes y voceros.', '; margin-top: 30px'), 820, 170, 960) + bubble())))

# 12 · SEM — foco: la cifra
S.append(('Eficiencia SEM', page('Pibank · SEM', halo(1300, 430, plat=False) +
    col(eyebrow('Eficiencia de captación') + headline(['Mejores', 'destinos, pauta', 'más eficiente'], 96, '; margin-top: 64px') +
        body('Las páginas que mejora el programa también reciben la pauta. Si convierten mejor, cada apertura pagada cuesta menos.', 24, 520, '; margin-top: 40px'), 120, 600) +
    zone(f'<div style="font-family: {ID}; font-size: 240px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.85">−33 %</div>'
         f'<div style="font-family: {ID}; font-size: 40px; font-weight: 620; letter-spacing: -0.02em; color: {SOFT}; margin-top: 18px">gasto de pauta por apertura</div>' +
         source('Ejemplo del mecanismo con los mismos clics y el mismo gasto, si la conversión sube de 2 % a 3 % (+50 % de aperturas). No es un resultado observado.', '; margin-top: 16px; max-width: 760px') +
         '<div style="margin-top: 56px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 40px">' +
         item('Destino por intención', 'Una búsqueda comercial va al producto; una de cálculo o comparación, al recurso que la resuelve.', None, 28) +
         item('SEM y SEO se informan', 'Los términos que aprende la pauta orientan el contenido, y al revés.', None, 28) +
         item('Costos completos', 'Costo por apertura y por cuenta con fondos, en cohortes comparables. Marketing opera la pauta.', None, 28) + '</div>', 820, 180, 960) + bubble())))

# 13 · Calendario — foco: el mes actual
gantt = [('Servicio base', [(1, 12, 's')]), ('Diagnóstico y medición', [(1, 2, 's')]), ('Panel AEO', [(1, 12, 's')]), ('Hub de ahorro', [(1, 2, 'w')]),
         ('Calculadora', [(2, 2, 'w')]), ('Comparador', [(4, 5, 'w')]), ('Comunidad', [(3, 12, 's')]), ('Campañas de PR', [(3, 4, 'w'), (8, 9, 'w')]),
         ('Refuerzos de enlaces', [(6, 6, 'w'), (11, 11, 'w')]), ('Mantenimiento', [(3, 12, 's')]), ('Revisión trimestral', [(3, 3, 'r'), (6, 6, 'r'), (9, 9, 'r'), (12, 12, 'r')])]
gl = f'<div style="display: grid; grid-template-columns: 300px repeat(12, minmax(0, 1fr)); column-gap: 6px; padding-bottom: 12px"><div></div>' + ''.join(f'<div style="text-align: center; font-size: 17px; font-weight: 600; color: {TEAL if m == 1 else SOFT}">M{m}</div>' for m in range(1, 13)) + '</div>'
for name, bs in gantt:
    pos = ''
    for a, b, k in bs:
        sty = {'w': 'background: #ffffff', 's': 'background: rgba(207, 228, 250, 0.38)', 'r': 'box-shadow: inset 0 0 0 2px #cfe4fa'}[k]
        pos += f'<div style="grid-column: {a + 1} / {b + 2}; grid-row: 1; height: 22px; align-self: center; border-radius: 6px; {sty}"></div>'
    gl += f'<div style="display: grid; grid-template-columns: 300px repeat(12, minmax(0, 1fr)); column-gap: 6px; padding: 9px 0; border-top: 1px solid {RULE}"><div style="grid-column: 1; grid-row: 1; font-size: 20px; font-weight: 400">{name}</div>{pos}</div>'
S.append(('Calendario', page('Pibank · Calendario',
    col(eyebrow('Calendario de la ruta gradual') + headline(['Primero la base, después la distribución'], 72, '; margin-top: 36px'), 110, 1640) +
    f'<div style="position: absolute; left: 441px; top: 318px; width: 116px; height: 560px; border-radius: 14px; box-shadow: 0 0 0 2px rgba(114, 222, 216, 0.85), 0 0 60px rgba(114, 222, 216, 0.22)"></div>' +
    zone(gl, 140, 330, 1640) +
    zone(label('M1 · Estamos aquí', TEAL), 452, 930, 300) +
    zone(f'<div style="display: flex; gap: 30px; font-size: 16px; color: {SOFT}"><span style="display: flex; align-items: center; gap: 8px"><span style="width: 26px; height: 12px; border-radius: 4px; background: #ffffff"></span>Construcción o campaña</span><span style="display: flex; align-items: center; gap: 8px"><span style="width: 26px; height: 12px; border-radius: 4px; background: rgba(207, 228, 250, 0.38)"></span>Operación continua</span><span style="display: flex; align-items: center; gap: 8px"><span style="width: 26px; height: 12px; border-radius: 4px; box-shadow: inset 0 0 0 2px #cfe4fa"></span>Revisión</span></div>', 1080, 930, 700) +
    zone(source('M1 es el mes de inicio acordado. Una aprobación pendiente reprograma el hito que depende de ella.'), 1080, 975, 700) + bubble())))

# 14 · Aporte — foco: la proporción frente a la meta
cells_m = ''.join(f'<div style="width: 22px; height: 22px; border-radius: 5px; {"background: " + TEAL + "; box-shadow: 0 0 16px rgba(114, 222, 216, 0.6)" if i == 0 else ("background: linear-gradient(90deg, " + TEAL + " 28%, transparent 28%); box-shadow: inset 0 0 0 1px " + TEAL if i == 1 else "box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.3)")}"></div>' for i in range(100))
S.append(('Aporte estimado', page('Pibank · Aporte', halo(1300, 430, plat=False) +
    col(eyebrow('Aporte estimado') + headline(['El aporte', 'se estima', 'con datos', 'de Pibank'], 96, '; margin-top: 64px') +
        body('La búsqueda nueva explica una parte pequeña de la meta. La conversión del tráfico que ya llega y el primer depósito se cuantifican con los datos del banco en el primer mes.', 22, 540, '; margin-top: 40px'), 120, 600) +
    zone(label('Cada cuadro es 1 % de la meta: 152 cuentas con fondos') +
         f'<div style="margin-top: 18px; display: grid; grid-template-columns: repeat(20, 22px); gap: 8px">{cells_m}</div>' +
         f'<div style="margin-top: 26px; display: flex; align-items: baseline; gap: 20px"><div style="font-family: {ID}; font-size: 96px; font-weight: 760; letter-spacing: -0.04em; line-height: 0.9">39–195</div><div style="font-size: 22px; font-weight: 300; color: {SOFT}">cuentas con fondos desde la búsqueda nueva<br>(0,26 % a 1,28 % de la meta)</div></div>' +
         source('Sensibilidad sobre las 19 familias investigadas, con captura madura de 2 %, 5 % y 10 %. No es un mínimo ni un techo del programa.', '; margin-top: 10px') +
         '<div style="margin-top: 40px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 44px">' +
         item('130 → 225', 'Cuentas con fondos por cada 10.000 visitas si la apertura pasa de 2 % a 3 % y el fondeo de 65 % a 75 %. Explica el mecanismo.', 'Convertir lo que ya llega', 40) +
         item('Dos entregables', 'Estimación de aporte por cohorte y escenario desde el lanzamiento, con la fecha y las series del banco.', 'Primer mes', 40) + '</div>', 820, 140, 960) + bubble())))

# 15 · Medición (compositor)
S.append(('Medición y atribución', img_page('Pibank · Medición', IMG['C06'], '¿Cómo sabremos si funciona? Lo medimos: cinco métricas con fórmula, fuente y dueño.')))

# 16 · Equipo (compositor)
S.append(('Equipo de la cuenta', img_page('Pibank · Equipo', IMG['C07'], 'Equipo de la cuenta con Pibank al centro.')))

# 17 · Responsabilidades — foco: condiciones financieras
W2 = [0.9, 1.25, 1.25, 1]
resp = [['Prioridades y contenido', 'Investiga, recomienda y produce', 'Acuerda prioridades', 'Plan mensual'],
        ['Condiciones financieras', 'Prepara contenido con fuente', 'Valida cifras y claims', 'Nada se publica sin visto bueno'],
        ['Sitio y plantillas', 'Implementa donde tiene acceso', 'Habilita entornos y despliegue', 'Especificación y QA'],
        ['Registro, app y depósito', 'Especifica continuidad y medición', 'Implementa y opera', 'Eventos comprobados'],
        ['Medición y datos', 'Diccionario, tablero y análisis', 'Entrega agregados autorizados', 'Conciliación mensual'],
        ['Comunidad y PR', 'Recursos, gestión y moderación', 'Aprueba voceros y canales', 'Calendario de salidas']]
S.append(('Responsabilidades', page('Pibank · Responsabilidades',
    col(eyebrow('Responsabilidades') + headline(['Qué hace Efeonce y qué hace Pibank'], 72, '; margin-top: 36px'), 110, 1640) +
    zone(thead(['Frente', 'Efeonce', 'Pibank', 'Juntos'], W2) + ''.join(trow(r, W2, selected=(i == 1), px=20) for i, r in enumerate(resp)), 114, 330, 1690) +
    zone(source('Seguimiento semanal, informe mensual y revisión trimestral. Revisión del banco en cinco días hábiles, hasta dos rondas por lote; el silencio no aprueba una publicación.'), 1060, 975, 720) + bubble())))

# 18 · Riesgos (compositor)
S.append(('Riesgos', img_page('Pibank · Riesgos', IMG['C08'], '¿Y si no funciona? Lo corregimos: cuatro riesgos con su cobertura.')))

# 19 · Inversión — foco: la ruta gradual
plans = [('Servicio base', 'US$4.500', 'al mes · US$54.000 al año', ['Dirección y revisiones trimestrales', 'SEO técnico y 8 h de WordPress al mes', 'Hasta 5 artículos al mes', 'Panel AEO de 24 preguntas', 'Medición, CRO y eficiencia SEM']),
         ('Ruta gradual · recomendada', 'US$79.200', 'al año · promedio US$6.600 al mes', ['Servicio base: US$54.000', 'Hub US$3.000 · calculadora US$1.200', 'Comparador US$4.000', 'Comunidad M3–M12: US$10.000', 'Dos campañas PR US$4.000 · dos refuerzos US$1.000', 'Mantenimiento de herramientas US$2.000']),
         ('Ruta integral', 'US$89.200', 'al año · US$10.000 más', ['Todo lo de la gradual', 'Planificador de ahorro US$3.000', 'Comunidad desde M1 (+US$2.000)', 'Cuatro campañas y cuatro refuerzos (+US$5.000)'])]
pc = ''
for i, (n, a, p, fs) in enumerate(plans):
    inner = (f'<div style="padding: 30px 32px 32px">{label(n, TEAL if i == 1 else SOFT)}'
             f'<div style="font-family: {ID}; font-size: {84 if i == 1 else 64}px; font-weight: 760; letter-spacing: -0.04em; line-height: 0.95; margin-top: 16px">{a}</div>'
             f'<div style="font-size: 18px; color: {SOFT}; margin-top: 10px">{p}</div>'
             f'<div style="margin-top: 22px; display: flex; flex-direction: column; gap: 0">' +
             ''.join(f'<div style="padding: 11px 0; border-top: 1px solid {RULE}; font-size: 19px; font-weight: 300; line-height: 1.35">{f}</div>' for f in fs) + '</div></div>')
    pc += sel_box(inner) if i == 1 else f'<div style="padding-top: 20px">{inner}</div>'
S.append(('Inversión', page('Pibank · Inversión', halo(1290, 380, plat=False) +
    col(eyebrow('Inversión') + headline(['US$79.200 en doce meses'], 80, '; margin-top: 36px'), 110, 1640) +
    zone(f'<div style="display: grid; grid-template-columns: 1fr 1.25fr 1fr; column-gap: 40px; align-items: start">{pc}</div>', 140, 330, 1640) +
    zone(source('Valores en USD, antes de los impuestos que correspondan. Base facturada mensualmente por adelantado; proyectos 50 % al inicio y 50 % a la aceptación. Cada activación se acuerda antes de ejecutar; máximo de US$7.700 en un mes.'), 1040, 975, 740) + bubble())))

# 20 · Para arrancar — foco: la lista
need = [('Fecha y series del lanzamiento', 'Tráfico, aperturas y fondeo agregados por canal y página.'),
        ('Search Console y analítica', 'Acceso para fijar la línea base de búsqueda.'),
        ('WordPress y entorno de pruebas', 'O el contacto del proveedor que implementa.'),
        ('Revisores de Producto y Cumplimiento', 'Y una persona que consolide las revisiones.'),
        ('Definición de la meta', 'Unidad, moneda y período de las 15.200 cuentas.')]
nl = ''.join(f'<div style="display: grid; grid-template-columns: 90px minmax(0, 1fr); column-gap: 24px; align-items: baseline; padding: 20px 0; border-top: 1px solid {RULE}">'
             f'<div style="font-size: 56px; font-weight: 300; line-height: 1; color: {SOFT}">{i + 1}</div>'
             f'<div><div style="font-family: {ID}; font-size: 32px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05">{t}</div><div style="font-size: 19px; font-weight: 300; color: {SOFT}; margin-top: 6px">{d}</div></div></div>' for i, (t, d) in enumerate(need))
S.append(('Para arrancar', page('Pibank · Para arrancar', halo(1300, 430, plat=False) +
    col(eyebrow('Para arrancar') + headline(['Cinco datos', 'para empezar'], 104, '; margin-top: 64px') +
        body('Con esto, el primer mes entrega el diagnóstico validado, la medición, la línea base en IA, la mejora inicial del pilar, los primeros artículos y la estimación de aporte.', 22, 540, '; margin-top: 40px'), 120, 620) +
    zone(nl, 820, 150, 960) + bubble())))

# 21 · Cierre (compositor)
S.append(('Cierre', img_page('Pibank · Cierre', IMG['C09'], 'Contraportada: Empower your Engine, con los datos de contacto de Efeonce.')))

idx = json.load(open(f'{ROOT}/canvas.json'))
assert len(S) == 21
for i, (title, html) in enumerate(S):
    fn = f'Tec-{i + 1:02d}.dc.html'
    open(f'{ROOT}/{fn}', 'w').write(html)
    idx['boards'][fn]['title'] = f'{i + 1:02d} · {title}'
idx['notes']['titulo-tecnica']['text'] = 'Pibank 2027 · Propuesta técnica · v3 del 07-10'
idx['notes']['pendientes-tecnica']['text'] = ('Para revisar\n\n1. Equipo (16): Melkin entró provisorio como quinta ficha; confirma quién va.\n\n'
    '2. Inversión (19): montos de la oferta híbrida, antes de impuestos.\n\n'
    '3. Pares pregunta–respuesta sólo en portada, medición, equipo, riesgos y ciclo; el resto, titular de decisión.\n\n'
    '4. 01, 09, 15, 16, 18 y 21 salen del compositor (imagen); las demás se editan aquí.')
json.dump(idx, open(f'{ROOT}/canvas.json', 'w'), ensure_ascii=False, indent=2)
print('ok')
