# Piloto de impacto (2026-10-22): láminas 1, 6 y 8 con foto a sangre, número protagonista y anotación de rodaje.
import os
S = os.path.dirname(os.path.abspath(__file__))
src = open(f'{S}/slides2.py', encoding='utf-8').read()
exec(src[:src.index('\nSL = ')])  # helpers, rutas y láminas actuales
hstart = src.index("head = f'''")
exec(src[hstart:src.index("os.makedirs", hstart)])

TEAL, NAVY = '#36c8bf', '#001a33'
BRIC = "font-family:'Bricolage Grotesque';font-weight:620;letter-spacing:-.03em;line-height:.86;color:#fff"


def bed_tl(q, a, f=96):
    return (f'<div class="k-bed c-tl" style="--f:{f};top:var(--top);left:var(--sl)">'
            f'<div class="k-q">{RING}{q}</div><div class="k-B" style="font-size:{f}px">{a}<span class="k-esf"></span></div></div>')


def select_box(x, y, w, h, tag, tag_side='r', tag_y=None):
    """Recuadro de selección de rodaje: trazo teal, cuatro tiradores y una etiqueta."""
    hd = ''.join(f'<div style="position:absolute;left:{hx - 9}px;top:{hy - 9}px;width:18px;height:18px;background:#fff;'
                 f'box-shadow:0 0 0 3px {TEAL}"></div>' for hx, hy in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)))
    ty = tag_y if tag_y is not None else y + h // 2 - 26
    tx = x + w + 22 if tag_side == 'r' else x
    tag_html = (f'<div style="position:absolute;left:{tx}px;top:{ty}px;background:{TEAL};color:{NAVY};font-family:Poppins;'
                f'font-weight:600;font-size:26px;line-height:1;padding:13px 18px;border-radius:12px;white-space:nowrap">{tag}</div>')
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;box-shadow:0 0 0 3px {TEAL}"></div>'
            + hd + tag_html)


B = f'{G}/2026-10-17_breakr-marca/planos'

# 6 · la lata gigante a sangre: el error es el héroe
p6 = (bed_tl('La primera lata', 'salió gigante', 92)
      + select_box(205, 336, 345, 690, 'v3 · fuera de escala', tag_y=560)
      # inserto: la corregida
      + f'<div style="position:absolute;right:65px;bottom:66px;width:250px;height:312px;border-radius:14px;overflow:hidden;box-shadow:0 0 0 3px #fff,0 18px 40px rgba(0,0,0,.45)">'
        f'<img src="{U(B + "/11a-ola-llega-v6.png")}" style="width:100%;height:100%;object-fit:cover"></div>'
      + f'<div style="position:absolute;right:65px;bottom:392px;width:250px;text-align:center;font-family:Poppins;font-weight:600;font-size:24px;color:{NAVY}">'
        f'<span style="background:#fff;padding:8px 14px;border-radius:10px">v6 · a escala ✓</span></div>'
      # número protagonista en vidrio
      + '<div class="k-glass c-bl" style="position:absolute;left:65px;bottom:66px;width:max-content;max-width:none;padding:28px 38px 30px;display:flex;flex-direction:column;gap:12px">'
        f'<div style="{BRIC};font-size:150px;white-space:nowrap">15,7<span style="display:inline;font-size:76px;letter-spacing:-.01em"> cm</span></div>'
        '<div style="font-family:Poppins;font-weight:500;font-size:30px;line-height:1.25">mide una lata real.</div></div>')

# 8 · hoja de contactos: el número manda, la elegida brilla
grid = ''
cw, ch, top = 270, 202, 540
for i in range(16):
    c, r = i % 4, i // 4
    last = i == 15
    filt = '' if last else 'filter:brightness(.42) saturate(.55);'
    grid += (f'<div style="position:absolute;left:{c * cw}px;top:{top + r * ch}px;width:{cw}px;height:{ch}px;overflow:hidden">'
             f'<img src="{U(S + f"/ver/v{i + 1:02d}.png")}" style="width:100%;height:100%;object-fit:cover;object-position:50% 30%;{filt}">'
             f'<div style="position:absolute;left:12px;top:10px;font-family:Poppins;font-weight:600;font-size:20px;color:{"#fff" if last else "rgba(255,255,255,.72)"}">{i + 1:02d}</div>'
             + (f'<div style="position:absolute;inset:0;box-shadow:inset 0 0 0 6px {TEAL}"></div>' if last else '') + '</div>')
# líneas de la hoja (2 px navy) para que lea como hoja de contactos
lines = ''.join(f'<div style="position:absolute;left:{c * cw - 1}px;top:{top}px;width:2px;height:{4 * ch}px;background:{NAVY}"></div>' for c in range(1, 4))
lines += ''.join(f'<div style="position:absolute;left:0;top:{top + r * ch - 1}px;width:1080px;height:2px;background:{NAVY}"></div>' for r in range(1, 4))
p8 = (f'<div style="position:absolute;inset:0;background:{NAVY}"></div>'
      + f'<div style="position:absolute;left:52px;top:58px;{BRIC};font-size:470px">16</div>'
      + '<div style="position:absolute;left:560px;top:150px;width:460px;font-family:Poppins;font-weight:500;font-size:46px;line-height:1.18;color:#fff">'
        'versiones del golpe sobre Paula.</div>'
      + f'<div style="position:absolute;left:560px;top:330px;width:460px;font-family:Poppins;font-weight:500;font-size:28px;line-height:1.3;color:#C9D3E0">'
        f'Quince quedaron en el camino. <span style="color:{TEAL}">La 16 es la del comercial.</span></div>'
      + grid + lines
      + f'<div style="position:absolute;left:{3 * cw + 12}px;top:{top + 4 * ch - 58}px;background:{TEAL};color:{NAVY};font-family:Poppins;font-weight:600;font-size:22px;padding:8px 12px;border-radius:10px">la elegida</div>')

# 1 · portada: el clímax con claqueta de toma
p1 = (s1 + '<div class="k-glass" style="position:absolute;right:65px;top:330px;font-size:24px;padding:12px 18px;border-radius:12px;'
      f'letter-spacing:.12em;font-weight:600">TOMA 11b · VERSIÓN 16 DE 16</div>')

PL = [('p1', f'{C1}/plates/s1-fundido.png', p1), ('p6', f'{B}/11a-ola-llega-v3.png', p6), ('p8', None, p8)]
for sid, plate, inner in PL:
    cls = 'k-stg f45 slide' + ('' if plate else ' doc dk')
    bg = f'<img class="k-pl" src="{U(plate)}" alt="">' if plate else ''
    open(f'{S}/f/{sid}.html', 'w', encoding='utf-8').write(head + f'<div class="{cls}">{bg}{inner}</div></body></html>')
print('piloto', len(PL))
