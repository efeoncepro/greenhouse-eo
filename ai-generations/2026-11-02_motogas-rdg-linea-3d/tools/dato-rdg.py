# Concepto «El dato es el objeto»: el horario, la dirección o el teléfono se componen con dígitos 3D inflados
# satinados (biblioteca fija) que se paran en el piso del set; el Rey 2D se sienta sobre ellos.
# Cada glifo es una capa: el número se arma desde el registro, sin regenerar imágenes.
import json, sys, os

OUT = sys.argv[1]
B = json.loads(sys.argv[2])
u = lambda k: '/_blob/' + B[k]

# ancho/alto de cada glifo recortado (alto normalizado 700)
AR = {'0': 533, '1': 421, '2': 483, '3': 507, '4': 549, '5': 486, '6': 493, '7': 495, '8': 502, '9': 512, ':': 321}
KEY = {**{str(i): f'd{i}' for i in range(10)}, ':': 'dcolon', '–': 'ddash', '-': 'ddash'}

def glifos(texto, x, base, h, escalas=None, rots=None, solapa=0.06, sombra=True):
    """Dibuja `texto` con dígitos 3D, apoyados en la línea `base` (px desde arriba). Devuelve (html, cajas)."""
    html, cajas, cx = '', [], x
    for i, ch in enumerate(texto):
        if ch == ' ':
            cx += int(h * 0.25); continue
        k = KEY[ch]
        e = (escalas or [1] * len(texto))[i]
        r = (rots or [0] * len(texto))[i]
        gh = int(h * e)
        if ch in '–-':
            gw, gh2 = int(h * 0.55 * e), int(h * 0.55 * e * 700 / 1991)
            top = base - int(h * 0.55)
            html += f'  <img src="{u(k)}" alt="" style="position:absolute;left:{cx}px;top:{top}px;width:{gw}px;transform:rotate({r}deg);filter:drop-shadow(8px 14px 14px rgba(80,14,6,.30))">\n'
            cx += gw - int(h * solapa); continue
        gw = int(gh * AR[ch] / 700)
        top = base - gh
        if sombra:
            html += f'  <div style="position:absolute;left:{cx + int(gw*0.05)}px;top:{base - int(gh*0.05)}px;width:{int(gw*1.05)}px;height:{int(gh*0.12)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(70,8,4,.5) 0%,rgba(70,8,4,0) 70%);filter:blur(5px)"></div>\n'
        html += f'  <img src="{u(k)}" alt="" style="position:absolute;left:{cx}px;top:{top}px;height:{gh}px;transform-origin:50% 100%;transform:rotate({r}deg);filter:drop-shadow({int(gh*.03)}px {int(gh*.05)}px {int(gh*.05)}px rgba(80,14,6,.28))">\n'
        cajas.append((ch, cx, top, gw, gh))
        cx += gw - int(gh * solapa)
    return html, cajas

def rey_sentado(left, asiento_y, h):
    """El Rey sentado: su base (≈70 % del alto) cae exacto sobre `asiento_y`."""
    top = asiento_y - int(h * 0.70)
    src = u('rey-sentado')
    return f'''  <div style="position:absolute;left:{left}px;top:{top}px;height:{h}px">
    <img src="{src}" alt="El Rey del Gas sentado sobre el número" style="position:relative;display:block;height:{h}px;filter:drop-shadow(6px 10px 8px rgba(70,10,4,.35))">
    <div style="position:absolute;inset:0;-webkit-mask-image:url({src});mask-image:url({src});-webkit-mask-size:auto 100%;mask-size:auto 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;background:linear-gradient(105deg,rgba(255,244,228,.34) 0%,rgba(255,244,228,0) 42%,rgba(80,16,8,.34) 100%);mix-blend-mode:soft-light"></div>
  </div>
'''

def obj(k, x, y, h, rot=0, blur=0):
    f = f'blur({blur}px) ' if blur else ''
    return f'  <img src="{u(k)}" alt="" style="position:absolute;left:{x}px;top:{y}px;height:{h}px;transform:rotate({rot}deg);filter:{f}drop-shadow({int(h*0.04)}px {int(h*0.06)}px {int(h*0.06)}px rgba(80,14,6,.28))">\n'

HEAD = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{titulo}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
.p{{font-family:Poppins,system-ui,sans-serif}}
</style>
</helmet>
'''
GRANO = '''  <svg style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.22" width="1080" height="1350" aria-hidden="true"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>
'''
FOOT = '''</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1080,"height":1350}}}}'>
class Component extends DCLogic {{
  componentDidMount() {{
    fetch('locales.json').then(r => r.json()).then((loc) => this.setState({{ loc }})).catch(() => this.setState({{ err: true }}));
  }}
  renderVals() {{
    // Respaldo con los datos vigentes del registro, por si la carga falla.
    const respaldo = {respaldo};
    const s = this.state || {{}};
    if (!s.loc) return respaldo;
    try {{
      const L = s.loc.marcas['rey-del-gas'].locales.map((id) => s.loc.locales[id]);
      const h = s.loc.horario;
      return Object.assign({{}}, respaldo, {{
        semanaLabel: h.semana.label, semanaHoras: h.semana.horas, domingoLabel: h.domingo.label, domingoHoras: h.domingo.horas,
        locales: L.map((l) => l.local).join(' · ')
      }});
    }} catch (e) {{ return respaldo; }}
  }}
}}
</script>
</body>
</html>
'''
RESPALDO = {'semanaLabel': 'Lunes a sábado', 'semanaHoras': '10:00 – 20:00', 'domingoLabel': 'Domingos y festivos',
            'domingoHoras': '10:00 – 15:00', 'locales': 'Lo Prado · Cerro Navia'}

# ---------- Horario: «10:00» gigante parado en el piso; el Rey sentado sobre el «1» ----------
BASE = 1035
num, cajas = glifos('10:00', 96, BASE, 340, escalas=[0.92, 0.97, 0.9, 1.0, 1.06], rots=[-4, 2, 0, -3, 4], solapa=0.06)
c1 = cajas[0]  # el «1»
rey = rey_sentado(c1[1] - 58, c1[2] + 30, 400)
flotan = (obj('sat-corona', 840, 300, 150, 18) + obj('sat-reloj', 700, 430, 120, -16)
          + obj('sat-corona', 720, 1180, 220, -22, blur=9) + obj('sat-reloj', 900, 1040, 300, 20, blur=11))

horario = f'''<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#EDE5DE">
  <img src="{u('set')}" alt="" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover">
  <img src="{u('logo')}" alt="El Rey del Gas" style="position:absolute;left:60px;top:38px;width:220px;object-fit:contain;filter:brightness(0);opacity:.9">
  <p class="p" style="position:absolute;right:60px;top:58px;margin:0;font-size:19px;font-weight:600;letter-spacing:.06em;color:#8A3A30">{{{{locales}}}}</p>
  <p class="p" style="position:absolute;left:58px;top:126px;margin:0;font-size:76px;font-weight:800;letter-spacing:-.045em;line-height:.98;color:#2A0B08">Te esperamos<br>desde las<span style="color:#C8241A">…</span></p>
{flotan.split(chr(10))[0]}
{flotan.split(chr(10))[1]}
{num}{rey}  <div class="p" style="position:absolute;left:58px;top:1092px;display:flex;flex-direction:column;gap:4px;color:#FFFFFF">
    <span style="font-size:20px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.85">{{{{semanaLabel}}}}</span>
    <span style="font-size:46px;font-weight:700;letter-spacing:-.02em;line-height:1">{{{{semanaHoras}}}}</span>
    <span style="font-size:20px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:12px">{{{{domingoLabel}}}}</span>
    <span style="font-size:46px;font-weight:700;letter-spacing:-.02em;line-height:1">{{{{domingoHoras}}}}</span>
  </div>
{flotan.split(chr(10))[2]}
{flotan.split(chr(10))[3]}
{GRANO}</div>
'''
html = HEAD.format(titulo='Dato Rey del Gas 1 Horario') + horario + FOOT.format(respaldo=json.dumps(RESPALDO, ensure_ascii=False))
open(os.path.join(OUT, 'DatoRDG_1_Horario.dc.html'), 'w').write(html)
print(json.dumps({'cajas': cajas}))
