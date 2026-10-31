import os, re
S = os.path.dirname(os.path.abspath(__file__))
C1 = os.path.join(os.path.dirname(S), 'car')
R = '/Users/jreye/Documents/greenhouse-eo'
G = R + '/ai-generations'
css = open(f'{C1}/kit.css', encoding='utf-8').read()
close = open(f'{C1}/close-inner.html', encoding='utf-8').read()
close = re.sub(r'src="/_blob/[0-9a-f]+"', f'src="file://{R}/public/branding/logo-negative.svg"', close)
SWIPE = open(f'{C1}/swipe.svg').read()
RING = '<svg class="k-ring2" style="color:var(--acc)" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.06" fill="none" stroke="currentColor" stroke-width="3.87"/></svg>'
U = lambda p: 'file://' + p


def remate_q(q, a, f=124):
    return f'<div class="k-bed c-tr" style="--f:{f};top:var(--top);right:var(--sr)"><div class="k-q">{RING}{q}</div><div class="k-B" style="font-size:{f}px">{a}<span class="k-esf"></span></div></div>'


def glass(text, side='l', icon=None, bottom=None):
    j = 'flex-start' if side == 'l' else 'flex-end'
    c = 'c-bl' if side == 'l' else 'c-br'
    st = f'justify-content:{j};' + (f'bottom:{bottom}px;' if bottom is not None else '')
    return f'<div class="k-subw" style="{st}"><div class="k-glass {c}">{icon or RING}<div class="k-subt"><span>{text}</span></div></div></div>'


def img(src, x, y, w, h, fit='cover', radius=14, extra=''):
    return f'<img src="{U(src)}" alt="" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;object-fit:{fit};border-radius:{radius}px;{extra}">'


def label(text, x, y, w, sub=None, align='left'):
    s = f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;text-align:{align};font-family:Poppins;font-weight:500;font-size:30px;line-height:1.2;color:#fff">{text}'
    if sub:
        s += f'<div style="font-size:24px;color:#C9D3E0;margin-top:4px">{sub}</div>'
    return s + '</div>'


# 1 · portada (toma ampliada de la ronda anterior)
s1 = (f'<div class="k-bed c-tr" style="--f:108;top:var(--top);right:var(--sr)"><div class="k-B" style="font-size:108px">¿Cómo llegamos</div><div class="k-B" style="font-size:108px">hasta aquí?</div></div>'
      + glass('Desliza para descubrirlo', 'r', icon=SWIPE))

# 2 · storyboard: la ficha de toma
s2 = img(f'{S}/doc-ficha2.png', 0, 340, 1080, 962, radius=0) + remate_q('Antes de cualquier imagen,', '23 fichas')

# 3 · la marca BREAKR
s3 = img(f'{S}/doc-br-hero.png', 65, 340, 950, 487, radius=16) + img(f'{S}/doc-br-sabores.png', 65, 845, 950, 417, radius=16) + remate_q('La bebida no existía:', 'la creamos')

# 4 · casting: las anclas
A = f'{G}/2026-10-17_byteplus-retratos-elenco/antonio'
s4 = (img(f'{A}/antonio-rostro-neutro.png', 65, 350, 300, 450) + img(f'{A}/antonio-cuerpo-frontal.png', 390, 350, 300, 450)
      + img(f'{G}/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/casting/ancla-paula.png', 715, 350, 300, 450)
      + label('Antonio', 65, 818, 300, 'rostro') + label('Antonio', 390, 818, 300, 'cuerpo entero') + label('Paula', 715, 818, 300, 'ancla de casting')
      + remate_q('Antes de rodar,', 'el casting')
      + glass('Seedance trabaja con rostros de su biblioteca de retratos: eso decidió cómo se produce cada toma.', 'l'))

# 5 · la planta del set (CONTINUIDAD.md §1–§2)
def cam(x, y, ang, letter):
    return (f'<g transform="translate({x} {y}) rotate({ang})"><path d="M0 0 L120 -46 L120 46 Z" fill="#36c8bf" fill-opacity="0.16" stroke="#36c8bf" stroke-width="2"/>'
            f'<rect x="-22" y="-16" width="34" height="32" rx="6" fill="#36c8bf"/></g>'
            f'<text x="{x - 6}" y="{y + 58}" fill="#ffffff" font-family="Poppins" font-weight="600" font-size="28" text-anchor="middle">{letter}</text>')

plan = f'''<svg viewBox="0 0 960 660" width="960" height="660" style="position:absolute;left:60px;top:345px">
<rect x="40" y="70" width="860" height="470" rx="10" fill="none" stroke="#C9D3E0" stroke-width="3"/>
<line x1="40" y1="110" x2="40" y2="500" stroke="#C9D3E0" stroke-width="8" stroke-dasharray="14 10"/>
<line x1="900" y1="70" x2="900" y2="540" stroke="#ff6500" stroke-width="10"/>
<text x="470" y="52" fill="#C9D3E0" font-family="Poppins" font-weight="500" font-size="24" text-anchor="middle">NORTE · muro con pantalla</text>
<text x="470" y="582" fill="#C9D3E0" font-family="Poppins" font-weight="500" font-size="24" text-anchor="middle">SUR · muro con pantalla</text>
<text x="930" y="305" fill="#ff6500" font-family="Poppins" font-weight="600" font-size="24" text-anchor="middle" transform="rotate(90 930 305)">ESTE · ventanal y cordillera</text>
<text x="14" y="305" fill="#C9D3E0" font-family="Poppins" font-weight="500" font-size="24" text-anchor="middle" transform="rotate(-90 14 305)">OESTE · tabique de vidrio</text>
<rect x="180" y="268" width="640" height="74" rx="10" fill="#C9D3E0" fill-opacity="0.18" stroke="#C9D3E0" stroke-width="2"/>
<text x="500" y="314" fill="#ffffff" font-family="Poppins" font-weight="500" font-size="24" text-anchor="middle">mesa larga</text>
<line x1="470" y1="236" x2="770" y2="374" stroke="#ffffff" stroke-width="3" stroke-dasharray="10 8"/>
<circle cx="470" cy="236" r="20" fill="#ffffff"/><text x="470" y="200" fill="#ffffff" font-family="Poppins" font-weight="600" font-size="28" text-anchor="middle">Paula</text>
<circle cx="770" cy="374" r="20" fill="#ffffff"/><text x="770" y="428" fill="#ffffff" font-family="Poppins" font-weight="600" font-size="28" text-anchor="middle">Antonio</text>
<text x="640" y="250" fill="#ffffff" font-family="Poppins" font-weight="500" font-size="22" text-anchor="middle" transform="rotate(25 640 250)">línea de 180°</text>
{cam(400, 252, 18, 'A')}{cam(830, 470, -147, 'B')}{cam(120, 305, 0, 'C')}
</svg>'''
s5 = (plan + remate_q('Como en un rodaje,', 'una planta')
      + glass('Todas las cámaras, del mismo lado de la línea entre Paula y Antonio.', 'l'))

# 6 · la lata: chica, gigante, justa (misma cámara)
B = f'{G}/2026-10-17_breakr-marca/planos'
s6 = (img(f'{B}/11a-ola-llega-breakr-v1.png', 65, 360, 300, 375) + img(f'{B}/11a-ola-llega-v3.png', 390, 360, 300, 375) + img(f'{B}/11a-ola-llega-v6.png', 715, 360, 300, 375)
      + label('Versión 1', 65, 752, 300, 'chica') + label('Versión 3', 390, 752, 300, 'gigante') + label('Versión 6', 715, 752, 300, 'justa')
      + remate_q('Una lata real mide', '15,7 cm')
      + glass('La IA no lo sabe. Se calcula como en un set: tamaño real y distancia al lente.', 'l'))

# 7 · el eje de 180°: antes y después
s7 = (img(f'{B}/11a-ola-llega-v6.png', 65, 360, 460, 575) + img(f'{B}/final/11a-ola-llega.png', 555, 360, 460, 575)
      + label('Antes', 65, 950, 460, 'la cámara cruzaba el eje') + label('Después', 555, 950, 460, 'detrás del hombro de Antonio')
      + remate_q('El contraplano cruzaba', 'el eje'))

# 8 · las 15 versiones del golpe
tiles = ''
for i in range(15):
    c, r = i % 5, i // 5
    tiles += img(f'{S}/ver/v{i + 1:02d}.png', 65 + c * 194, 360 + r * 246, 182, 228, radius=10)
s8 = tiles + remate_q('El golpe sobre Paula tomó', '15 versiones')

# 9 · la letra que faltaba
s9 = (img(f'{S}/reakr-v1.png', 65, 360, 460, 690) + img(f'{S}/reakr-v2.png', 555, 360, 460, 690)
      + label('Primera versión', 65, 1062, 460) + label('Corregida', 555, 1062, 460)
      + remate_q('La IA escribió', '«REAKR»'))


# 10 · los ingredientes
LG = f'{S}/logos'
def logo(l, h): return f'<img src="{U(LG + "/" + l)}" alt="" style="height:{h}px;width:auto;display:block;align-self:flex-start;flex:none">'
def tile(x, thumb, role, names, logos, contain=False):
    W, Y = 300, 345
    fit = 'contain' if contain else 'cover'
    out = f'<div style="position:absolute;left:{x}px;top:{Y}px;width:{W}px;height:{W}px;border-radius:18px;overflow:hidden;background:#0b1a2b;box-shadow:0 0 0 1px rgba(255,255,255,.14)"><img src="{U(thumb)}" alt="" style="width:100%;height:100%;object-fit:{fit};{"padding:0 18px;box-sizing:border-box" if contain else ""}"></div>'
    out += f'<div style="position:absolute;left:{x}px;top:{Y + W + 26}px;width:{W}px;display:flex;flex-direction:column;gap:10px">'
    out += f'<div style="font-family:Poppins;font-weight:600;font-size:22px;letter-spacing:.14em;color:#C9D3E0">{role}</div>'
    out += '<div style="display:flex;gap:22px;align-items:center;margin-top:4px">' + ''.join(logo(l, h) for l, h in logos) + '</div>'
    out += ''.join(f'<div style="font-family:Poppins;font-weight:500;font-size:28px;line-height:1.15;color:#fff">{n}</div>' for n in names)
    out += '</div>'
    return out
# conectores: de cada tarjeta baja una línea teal al orquestador
con = ''.join(f'<div style="position:absolute;left:{x + 149}px;top:905px;width:2px;height:75px;background:#36c8bf"></div>' for x in (65, 390, 715))
orq = ('<div style="position:absolute;left:65px;right:65px;top:980px;height:240px;border-radius:22px;background:#001a33;box-shadow:0 0 0 2px #36c8bf;overflow:hidden">'
       f'<img src="{U(S + "/doc-ficha2.png")}" alt="" style="position:absolute;left:0;top:0;width:300px;height:240px;object-fit:cover;object-position:left top">'
       '<div style="position:absolute;left:345px;top:42px;display:flex;flex-direction:column;gap:10px">'
       '<div style="font-family:Poppins;font-weight:600;font-size:22px;letter-spacing:.14em;color:#36c8bf">ORQUESTADOR</div>'
       f'<div style="margin-top:4px">{logo("claude-logotype-blanco.svg", 72)}</div>'
       '<div style="font-family:Poppins;font-weight:500;font-size:34px;line-height:1.1;color:#fff">Opus 5.5</div></div></div>')
s10i = (tile(65, f'{S}/ing-video.png', 'VIDEO', ['Seedance 2.5'], [('logo-byteplus-blanco.png', 34)])
        + tile(390, f'{G}/2026-10-17_breakr-marca/planos/final/12-paredes.png', 'IMAGEN', ['Seedream 5', 'GPT Image 2.5'], [('logo-byteplus-blanco.png', 30), ('openai-blanco.svg', 30)])
        + tile(715, f'{S}/ing-audio2.png', 'AUDIO', ['v4'], [('elevenlabs-logotype-blanco.svg', 30)], contain=True)
        + con + orq + remate_q('¿Con qué se hizo?', 'Ingredientes'))

# 10 · la idea que queda (toma ampliada de la ronda anterior)
s10 = remate_q('La IA acelera. ¿Quién decide?', 'El profesional') + glass('El que tiene el criterio.', 'l')

# 11 · cierre con firma
s11 = close.replace('Hablemos', 'Síguenos')

SL = [('s1', f'{C1}/plates/s1-fundido.png', s1), ('s2', None, s2), ('s3', None, s3), ('s4', None, s4), ('s5', None, s5), ('s6', None, s6),
      ('s7', None, s7), ('s8', None, s8), ('s9', None, s9), ('s10', None, s10i), ('s11', f'{C1}/plates/s9-fundido.png', s10), ('s12', f'{C1}/plates/s9-fundido.png', s11)]

head = f'''<!doctype html><html><head><meta charset="utf-8"><style>
/* peso Bricolage equilibrado (operador 2026-10-22) */
.k-B{{font-weight:620!important;letter-spacing:-.022em!important}}
@font-face{{font-family:'Bricolage Grotesque';src:url('file://{R}/src/assets/fonts/BricolageGrotesque-Variable.ttf');font-weight:200 800}}
@font-face{{font-family:'Poppins';src:url('file://{R}/src/assets/fonts/Poppins-Regular.ttf');font-weight:400}}
@font-face{{font-family:'Poppins';src:url('file://{R}/src/assets/fonts/Poppins-Medium.ttf');font-weight:500}}
@font-face{{font-family:'Poppins';src:url('file://{R}/src/assets/fonts/Poppins-SemiBold.ttf');font-weight:600}}
body{{margin:0;width:1080px;height:1350px;overflow:hidden;background:#000}}
{css}
.k-a{{animation:none!important}} .k-guide{{display:none}}
.k-stg.slide{{--acc:#36c8bf;--accl:#0e8c82;--bed:#001a33;transform:none}}
.k-stg.doc{{background:#05070A}}
.k-glass .swp{{width:1.15em;height:1.15em;flex:none;margin-right:.1em}}
</style></head><body>'''
os.makedirs(f'{S}/f', exist_ok=True)
for sid, plate, inner in SL:
    cls = 'k-stg f45 slide' + ('' if plate else ' doc dk')
    bg = f'<img class="k-pl" src="{U(plate)}" alt="">' if plate else ''
    open(f'{S}/f/{sid}.html', 'w', encoding='utf-8').write(head + f'<div class="{cls}">{bg}{inner}</div></body></html>')
print('ok', len(SL))
