# Serie del Rey del Gas compuesta POR CAPAS: set vacío + objetos 3D satinados recortados a distintas profundidades
# (lejos = chico y nítido; cerca = grande, desenfocado y cortado por el borde) + el Rey 2D integrado entre ellos.
import json, sys, os

OUT = sys.argv[1]
B = json.loads(sys.argv[2])
u = lambda k: '/_blob/' + B[k]

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
.eti{{font-family:Poppins,system-ui,sans-serif;font-weight:600;font-size:21px;letter-spacing:.16em;text-transform:uppercase;color:#8A3A30}}
.dato{{font-family:Poppins,system-ui,sans-serif;font-weight:700;letter-spacing:-.03em;line-height:1;color:#C8241A;white-space:nowrap;font-variant-numeric:tabular-nums}}
</style>
</helmet>
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
      const corta = (t) => String(t).replace(/,\\s*(Lo Prado|Cerro Navia)$/, '');
      return Object.assign({{}}, respaldo, {{
        semanaLabel: h.semana.label, semanaHoras: h.semana.horas, domingoLabel: h.domingo.label, domingoHoras: h.domingo.horas,
        local1: L[0].local, dir1: corta(L[0].linea1), wa1: L[0].waLegible,
        local2: L[1].local, dir2: corta(L[1].linea1), wa2: L[1].waLegible,
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
            'domingoHoras': '10:00 – 15:00', 'local1': 'Lo Prado', 'dir1': 'Neptuno 934', 'wa1': '+56 9 5460 6758',
            'local2': 'Cerro Navia', 'dir2': 'El Pastizal 1518', 'wa2': '+56 9 6642 6189', 'locales': 'Lo Prado · Cerro Navia'}

def obj(k, x, y, h, rot=0, blur=0, piso=False, flip=False):
    """Un objeto 3D en su capa. blur>0 = cerca de la cámara. piso=True = apoyado: sombra de contacto debajo."""
    sombra = ''
    if piso:
        sombra = f'  <div style="position:absolute;left:{x + int(h*0.05)}px;top:{y + int(h*0.92)}px;width:{int(h*0.9)}px;height:{int(h*0.12)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(70,8,4,.45) 0%,rgba(70,8,4,0) 70%);filter:blur(4px)"></div>\n'
    sc = ' scaleX(-1)' if flip else ''
    f = f'blur({blur}px) ' if blur else ''
    # sombra suave proyectada por el propio objeto (luz de arriba a la izquierda)
    return sombra + f'  <img src="{u(k)}" alt="" style="position:absolute;left:{x}px;top:{y}px;height:{h}px;transform:rotate({rot}deg){sc};filter:{f}drop-shadow({int(h*0.04)}px {int(h*0.06)}px {int(h*0.06)}px rgba(80,14,6,.28))">\n'

def rey(src, left, top, h, alt):
    return f'''  <div style="position:absolute;left:{left}px;top:{top}px;height:{h}px">
    <img src="{src}" alt="" style="position:absolute;left:0;top:0;height:{h}px;transform-origin:50% 97%;transform:skewX(-50deg) scaleY(.26);filter:brightness(0) blur(4px);opacity:.40;mix-blend-mode:multiply">
    <div style="position:absolute;left:8%;right:4%;top:{int(h*0.93)}px;height:{int(h*0.07)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(70,8,4,.55) 0%,rgba(70,8,4,0) 70%)"></div>
    <img src="{src}" alt="{alt}" style="position:relative;display:block;height:{h}px">
    <div style="position:absolute;inset:0;-webkit-mask-image:url({src});mask-image:url({src});-webkit-mask-size:auto 100%;mask-size:auto 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;background:linear-gradient(105deg,rgba(255,244,228,.34) 0%,rgba(255,244,228,0) 42%,rgba(80,16,8,.34) 100%);mix-blend-mode:soft-light"></div>
  </div>
'''

GRANO = '''  <svg style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.22" width="1080" height="1350" aria-hidden="true"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>
'''

TIT = '  <p class="p" style="position:absolute;left:56px;top:110px;margin:0;font-size:150px;font-weight:800;letter-spacing:-.055em;line-height:1;color:#2A0B08">{t}<span style="color:#C8241A">.</span></p>\n'

def bloque(filas):
    out = '  <div style="position:absolute;left:60px;top:322px;display:flex;flex-direction:column;gap:6px">\n'
    for k, (eti, dato, tam) in enumerate(filas):
        mt = ' style="margin-top:24px"' if k else ''
        out += f'    <span class="eti"{mt}>{eti}</span>\n    <span class="dato" style="font-size:{tam}px">{dato}</span>\n'
    return out + '  </div>\n'

def post(fondo_capas, frente_capas, tit, datos, r):
    return f'''<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#EDE5DE">
  <img src="{u('set')}" alt="" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover">
  <img src="{u('logo')}" alt="El Rey del Gas" style="position:absolute;left:60px;top:38px;width:220px;object-fit:contain;filter:brightness(0);opacity:.9">
  <p class="p" style="position:absolute;right:60px;top:58px;margin:0;font-size:19px;font-weight:600;letter-spacing:.06em;color:#8A3A30">{{{{locales}}}}</p>
{tit}{datos}  <!-- capas de fondo (lejos) -->
{fondo_capas}  <!-- el Rey -->
{r}  <!-- capas de frente (cerca de la cámara) -->
{frente_capas}  <div class="p" style="position:absolute;left:60px;bottom:40px;font-size:17px;font-weight:600;color:#FFFFFF;letter-spacing:.04em"><span style="background:rgba(40,6,4,.55);padding:9px 18px;border-radius:999px">Sólo efectivo · Retiro en bodega</span></div>
{GRANO}</div>
'''

PIEZAS = [
    ('CapasRDG_1_Horario', 'Capas Rey del Gas 1 Horario', TIT.format(t='Horario'),
     bloque([('{{semanaLabel}}', '{{semanaHoras}}', 70), ('{{domingoLabel}}', '{{domingoHoras}}', 70)]),
     obj('sat-corona', 700, 640, 90, -14) + obj('sat-reloj', 860, 600, 150, 16, blur=1)
     + obj('sat-reloj', 520, 690, 560, -10, piso=True),
     obj('sat-corona', 840, 300, 340, 22, blur=7) + obj('sat-reloj', -150, 1020, 420, 24, blur=11) + obj('sat-corona', 660, 1110, 260, -26, blur=10) + obj('sat-corona', 420, 560, 110, 30, blur=2),
     rey(u('rey-09-guino'), 120, 790, 450, 'El Rey del Gas con el pulgar arriba')),
    ('CapasRDG_2_Direcciones', 'Capas Rey del Gas 2 Direcciones', TIT.format(t='Visítanos'),
     bloque([('{{local1}}', '{{dir1}}', 64), ('{{local2}}', '{{dir2}}', 64)]),
     obj('sat-pin', 760, 610, 130, 14) + obj('sat-corona', 600, 650, 80, -18)
     + obj('sat-pin', 600, 650, 600, 8, piso=True),
     obj('sat-corona', 860, 290, 320, 18, blur=7) + obj('sat-pin', -130, 1010, 440, -22, blur=11) + obj('sat-corona', 700, 1130, 240, 24, blur=10) + obj('sat-pin', 470, 560, 120, -18, blur=2),
     rey(u('rey-03-senalando'), 70, 800, 450, 'El Rey del Gas señalando el pin')),
    ('CapasRDG_3_MesaAyuda', 'Capas Rey del Gas 3 Mesa de ayuda', TIT.format(t='Escríbenos'),
     bloque([('WhatsApp · {{local1}}', '{{wa1}}', 64), ('WhatsApp · {{local2}}', '{{wa2}}', 64)]),
     obj('sat-burbujas', 720, 610, 120, -12) + obj('sat-corona', 900, 690, 80, 16)
     + obj('sat-celular', 630, 640, 600, 12, piso=True) + obj('sat-burbujas', 760, 560, 230, -8),
     obj('sat-burbujas', 850, 280, 320, 14, blur=7) + obj('sat-burbujas', -140, 1020, 420, -18, blur=11, flip=True) + obj('sat-corona', 700, 1130, 240, 22, blur=10) + obj('sat-burbujas', 460, 560, 120, 10, blur=2),
     rey(u('rey-05-celular'), 90, 790, 460, 'El Rey del Gas con el celular')),
]
for nombre, titulo, tit, datos, fondo, frente, r in PIEZAS:
    html = HEAD.format(titulo=titulo) + post(fondo, frente, tit, datos, r) + FOOT.format(respaldo=json.dumps(RESPALDO, ensure_ascii=False))
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(html)
print('ok')
