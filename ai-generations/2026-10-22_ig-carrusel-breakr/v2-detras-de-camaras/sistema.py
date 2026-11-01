# Sistema de impacto aplicado a las 12 láminas (2026-10-22): foto a sangre, número protagonista, anotación de rodaje.
import os
S = os.path.dirname(os.path.abspath(__file__))
psrc = open(f'{S}/piloto.py', encoding='utf-8').read()
exec(psrc[:psrc.index('\nPL = ')])  # trae helpers de slides2 + p1, p6, p8, bed_tl, select_box


def bed_at(q, a, f, x, y, corner='c-tl', side='left'):
    return (f'<div class="k-bed {corner}" style="--f:{f};top:{y}px;{side}:{x}px">'
            f'<div class="k-q">{RING}{q}</div><div class="k-B" style="font-size:{f}px">{a}<span class="k-esf"></span></div></div>')


def chip(text, x, y, bg=TEAL, fg=NAVY, size=24, anchor='left'):
    pos = f'{anchor}:{x}px;top:{y}px'
    return (f'<div style="position:absolute;{pos};background:{bg};color:{fg};font-family:Poppins;font-weight:600;font-size:{size}px;'
            f'line-height:1;padding:11px 16px;border-radius:10px;white-space:nowrap">{text}</div>')


def navy_bg():
    return f'<div style="position:absolute;inset:0;background:{NAVY}"></div>'


def big_number(n, sub, note, size=470, sub_x=560):
    return (f'<div style="position:absolute;left:52px;top:58px;{BRIC};font-size:{size}px">{n}</div>'
            f'<div style="position:absolute;left:{sub_x}px;top:150px;width:{1080 - sub_x - 60}px;font-family:Poppins;font-weight:500;font-size:46px;line-height:1.18;color:#fff">{sub}</div>'
            f'<div style="position:absolute;left:{sub_x}px;top:330px;width:{1080 - sub_x - 60}px;font-family:Poppins;font-weight:500;font-size:28px;line-height:1.3;color:#C9D3E0">{note}</div>')


# 2 · 23 fichas: el número manda, la ficha a sangre debajo
n2 = (navy_bg() + big_number('23', 'fichas de toma antes de generar una sola imagen.',
                             f'Motor, cámara, acción, sonido y costo. <span style="color:{TEAL}">Una por plano.</span>')
      + f'<div style="position:absolute;left:0;top:540px;width:1080px;height:810px;overflow:hidden">'
        f'<img src="{U(S + "/doc-ficha2.png")}" style="width:1080px;height:962px;object-fit:cover;object-position:left top"></div>'
      + select_box(430, 735, 625, 150, 'cada toma, especificada', tag_side='l', tag_y=681)
      )

# 3 · la marca: hero y sabores a sangre, selección sobre el logotipo
n3 = (navy_bg()
      + f'<img src="{U(S + "/doc-br-hero.png")}" style="position:absolute;left:0;top:0;width:1080px;height:553px;object-fit:cover">'
      + f'<img src="{U(S + "/doc-br-sabores.png")}" style="position:absolute;left:0;top:553px;width:1080px;height:474px;object-fit:cover">'
      + select_box(36, 70, 470, 190, 'marca creada desde cero', tag_y=70)
      + bed_at('La bebida no existía:', 'la creamos', 112, 65, 1085))

# 4 · casting: tres anclas a sangre, de borde a borde
A = f'{G}/2026-10-17_byteplus-retratos-elenco/antonio'
cols = [(f'{A}/antonio-rostro-neutro.png', 'ANTONIO · ROSTRO', '50% 20%'),
        (f'{A}/antonio-cuerpo-frontal.png', 'ANTONIO · CUERPO', '50% 30%'),
        (f'{G}/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/casting/ancla-paula.png', 'PAULA · ANCLA', '50% 20%')]
n4 = navy_bg()
for k, (src_, tag, pos) in enumerate(cols):
    n4 += (f'<img src="{U(src_)}" style="position:absolute;left:{k * 360}px;top:0;width:360px;height:1350px;object-fit:cover;object-position:{pos}">'
           + chip(tag, k * 360 + 20, 40, size=20))
n4 += ''.join(f'<div style="position:absolute;left:{k * 360 - 2}px;top:0;width:4px;height:1350px;background:{NAVY}"></div>' for k in (1, 2))
n4 += bed_at('Antes de rodar,', 'el casting', 112, 65, 1085)

# 5 · la planta: más grande, sobre navy
n5 = (navy_bg() + plan.replace('width="960" height="660" style="position:absolute;left:60px;top:345px"',
                               'width="1040" height="715" style="position:absolute;left:24px;top:370px"')
      + remate_q('Como en un rodaje,', 'una planta')
      + glass('Todas las cámaras, del mismo lado de la línea entre Paula y Antonio.', 'l', bottom=66))

# 7 · el eje: antes arriba, después abajo, a sangre; el remate cose la costura
n7 = (f'<img src="{U(B + "/11a-ola-llega-v6.png")}" style="position:absolute;left:0;top:0;width:1080px;height:675px;object-fit:cover;object-position:50% 31%">'
      + f'<img src="{U(B + "/final/11a-ola-llega.png")}" style="position:absolute;left:0;top:675px;width:1080px;height:675px;object-fit:cover;object-position:50% 30%">'
      + f'<div style="position:absolute;left:0;top:673px;width:1080px;height:4px;background:#fff"></div>'
      + chip('✗ antes · la cámara cruzaba el eje', 65, 40, bg='#fff')
      + chip('✓ después · detrás del hombro de Antonio', 65, 1270, size=24)
      + bed_at('El contraplano cruzaba', 'el eje', 104, 65, 580, corner='c-tr', side='right'))

# 9 · REAKR: la lata a sangre, selección sobre la palabra rota, inserto corregido
n9 = (f'<img src="{U(B + "/10-lata-breakr-v1.png")}" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover">'
      + select_box(440, 228, 315, 548, 'falta la B', tag_y=470)
      + f'<div style="position:absolute;right:65px;bottom:66px;width:250px;height:375px;border-radius:14px;overflow:hidden;box-shadow:0 0 0 3px #fff,0 18px 40px rgba(0,0,0,.45)">'
        f'<img src="{U(S + "/reakr-v2.png")}" style="width:100%;height:100%;object-fit:cover"></div>'
      + chip('corregida ✓', 65 + 250, 1350 - 66 - 375 - 52, bg='#fff', anchor='right')
      + bed_at('La IA escribió', '«REAKR»', 112, 65, 1085, corner='c-bl'))

# 10 · ingredientes: el 5 manda, tres oficios a sangre, todo converge en el orquestador
def ing_tile(k, src_, role, rows, fit='cover', pad=''):
    x = k * 360
    t = (f'<div style="position:absolute;left:{x}px;top:540px;width:360px;height:500px;overflow:hidden;background:#0b1a2b">'
         f'<img src="{U(src_)}" style="width:100%;height:100%;object-fit:{fit};{pad}"></div>'
         + chip(role, x + 20, 560, size=20))
    body = ''.join(f'<div style="display:flex;flex-direction:column;gap:8px">{logo(l, h)}<div style="font-family:Poppins;font-weight:500;font-size:24px;line-height:1.1">{n}</div></div>' for l, h, n in rows)
    t += (f'<div class="k-glass" style="position:absolute;left:{x + 20}px;bottom:{1350 - 1040 + 20}px;width:max-content;max-width:none;'
          f'display:flex;flex-direction:column;gap:14px;padding:16px 20px;font-size:24px">{body}</div>')
    return t
conv = ('<svg width="1080" height="1350" style="position:absolute;left:0;top:0" viewBox="0 0 1080 1350">'
        + ''.join(f'<path d="M{cx} 1040 C {cx} 1085, 540 1075, 540 1112" fill="none" stroke="{TEAL}" stroke-width="3"/>' for cx in (180, 540, 900))
        + f'<circle cx="540" cy="1114" r="7" fill="{TEAL}"/></svg>')
n10 = (navy_bg() + big_number('5', 'modelos en la receta.', f'Cuatro producen. <span style="color:{TEAL}">Uno los orquesta.</span>', sub_x=470)
       + ing_tile(0, f'{S}/ing-video.png', 'VIDEO', [('logo-byteplus-blanco.png', 30, 'Seedance 2.5')])
       + ing_tile(1, f'{G}/2026-10-17_breakr-marca/planos/final/12-paredes.png', 'IMAGEN',
                  [('logo-byteplus-blanco.png', 28, 'Seedream 5'), ('openai-blanco.svg', 28, 'GPT Image 2.5')])
       + ing_tile(2, f'{S}/ing-audio2.png', 'AUDIO', [('elevenlabs-logotype-blanco.svg', 28, 'v4')], fit='contain', pad='padding:0 24px 120px;box-sizing:border-box')
       + ''.join(f'<div style="position:absolute;left:{k * 360 - 2}px;top:540px;width:4px;height:500px;background:{NAVY}"></div>' for k in (1, 2))
       + conv
       + f'<div style="position:absolute;left:0;width:1080px;top:1140px;display:flex;flex-direction:column;align-items:center;gap:12px">'
         f'<img src="{U(LG + "/claude-logotype-blanco.svg")}" style="height:96px;width:auto;display:block">'
         f'<div style="font-family:Poppins;font-weight:600;font-size:24px;letter-spacing:.14em;color:{TEAL}">OPUS 5.5 · ORQUESTADOR</div></div>')

# 13 · contraportada UNIFORME de carrusel (operador 2026-10-22: «más de diseño, uniforme para los cierres de carrusel»).
# Es el cierre de marca del deck (AXIS deckSlideHtml('close'), B1) llevado a 4:5: órbita completa con la esfera arriba y el
# logo dentro, pregunta, respuesta con su punto, usuario y eslogan de la línea. Medidas de redes (§0.1): ×1,75.
FONTS_X = ''.join(f"@font-face{{font-family:'Poppins';src:url('file://{R}/src/assets/fonts/{f}.ttf');font-weight:{w};font-style:{st}}}"
                  for f, w, st in (('Poppins-Light', 300, 'normal'), ('Poppins-ExtraBold', 800, 'normal'), ('Poppins-ExtraBoldItalic', 800, 'italic'), ('Poppins-BlackItalic', 900, 'italic')))
SLOGAN = {'growth': 'Growth'}


# Burbuja URL del kit de video aprobado (close-inner.html): el logo ya está en la órbita, así que la burbuja firma
# (operador 2026-10-22: «quita el @efeoncepro y pon el URL bubble»).
_i = close.index('<div class="k-urlb'); _j = close.index('</svg>', _i) + 6
URLB = close[_i:_j] + '</div>'


def cierre_carrusel(question, answer='Compártelo', line='growth'):
    cx, cy, r = 540, 430, 230
    # Órbita de ACENTO (operador 2026-10-22: «mejor cuando el ring y la órbita no completa»; composition.md: anillo +
    # arco corto de 50° con la esfera en la punta, arriba a la izquierda; un solo anillo; el arco es movimiento, no dato).
    import math
    a0, a1 = 200, 250  # como el arco de acento de la portada del deck (200°–250°): sube hacia las 11
    pt = lambda a: (cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
    (x0, y0), (x1, y1) = pt(a0), pt(a1)
    orb = (f'<svg style="position:absolute;inset:0" viewBox="0 0 1080 1350" width="1080" height="1350" aria-hidden="true">'
           f'<defs><radialGradient id="halo"><stop offset="0" stop-color="#72ded8" stop-opacity=".13"/>'
           f'<stop offset=".5" stop-color="#72ded8" stop-opacity=".03"/><stop offset="1" stop-color="#72ded8" stop-opacity="0"/></radialGradient></defs>'
           f'<rect width="1080" height="1350" fill="{NAVY}"/>'
           f'<circle cx="{x1:.1f}" cy="{y1:.1f}" r="120" fill="url(#halo)"/>'
           f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#72ded8" stroke-opacity="0.2" stroke-width="2.4"/>'
           f'<path d="M{x0:.1f} {y0:.1f} A{r} {r} 0 0 1 {x1:.1f} {y1:.1f}" fill="none" stroke="{TEAL}" stroke-width="4" stroke-linecap="round"/>'
           f'<circle cx="{x1:.1f}" cy="{y1:.1f}" r="14" fill="{TEAL}"/></svg>')
    logo_w = 270
    return (orb
            + f'<img src="{U(R + "/public/branding/logo-negative.svg")}" alt="Efeonce" style="position:absolute;left:{cx - logo_w // 2}px;top:{cy - 34}px;width:{logo_w}px;height:auto">'
            + '<div style="position:absolute;left:0;width:1080px;top:770px;display:flex;flex-direction:column;align-items:center;gap:26px">'
              '<div style="font-family:Poppins;font-weight:300;font-size:44px;line-height:1.22;color:#F4F6F8;text-align:center;max-width:900px">'
              f'<span aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;border:.1em solid {TEAL};box-sizing:border-box;margin-right:.42em;vertical-align:-.04em"></span>{question}</div>'
              f'<div style="{BRIC};font-size:156px;line-height:1;white-space:nowrap">{answer}<span style="display:inline-block;width:.2em;height:.2em;border-radius:50%;background:{TEAL};margin-left:.03em"></span></div>'
              f'<div style="margin-top:10px">{URLB}</div></div>'
            + '<div style="position:absolute;left:0;width:1080px;bottom:84px;text-align:center;font-family:Poppins;font-size:32px;color:#e2e2e2">'
              f'<span style="font-weight:800;font-style:italic">Empower</span> <span style="font-weight:800">your</span> '
              f'<span style="font-weight:900;font-style:italic;color:{TEAL}">{SLOGAN[line]}</span></div>')


n12 = cierre_carrusel('¿Tu equipo está listo para<br>escalar su producción creativa?', answer='Compártelo')
head = head.replace('</style>', FONTS_X + '</style>')

SLIDES = [('n01', f'{C1}/plates/s1v2-fundido.png', p1), ('n02', None, n2), ('n03', None, n3), ('n04', None, n4), ('n05', None, n5),
          ('n06', f'{B}/11a-ola-llega-v3.png', p6), ('n07', None, n7), ('n08', None, p8), ('n09', None, n9), ('n10', None, n10),
          ('n11', f'{C1}/plates/s17v2.png', s10), ('n12', None, n12)]
for sid, plate, inner in SLIDES:
    cls = 'k-stg f45 slide' + ('' if plate else ' doc dk')
    bg = f'<img class="k-pl" src="{U(plate)}" alt="">' if plate else ''
    open(f'{S}/f/{sid}.html', 'w', encoding='utf-8').write(head + f'<div class="{cls}">{bg}{inner}</div></body></html>')
print('sistema', len(SLIDES))
