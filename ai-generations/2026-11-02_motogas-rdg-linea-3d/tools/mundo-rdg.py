# Serie «El Rey en el mundo real» (Horario, Direcciones, Mesa de ayuda).
# Escena 3D mate generada sin texto + Rey 2D integrado a lo Roger Rabbit (sombra proyectada, contacto, luz de la
# escena, grano) + tipografía limpia (Poppins) con los datos del registro de locales.
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
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,500;0,600;0,700;0,800;1,300&amp;display=swap" rel="stylesheet">
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

def rey(src, left, top, h, alt):
    """El Rey 2D integrado: sombra proyectada (luz desde arriba a la izquierda), contacto, luz de escena y grano."""
    return f'''  <div style="position:absolute;left:{left}px;top:{top}px;height:{h}px">
    <!-- sombra proyectada: su silueta aplastada sobre el piso, hacia abajo a la derecha -->
    <img src="{src}" alt="" style="position:absolute;left:0;top:0;height:{h}px;transform-origin:50% 97%;transform:skewX(-50deg) scaleY(.26);filter:brightness(0) blur(4px);opacity:.40;mix-blend-mode:multiply">
    <!-- sombra de contacto bajo los zapatos -->
    <div style="position:absolute;left:8%;right:4%;top:{int(h*0.93)}px;height:{int(h*0.07)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(70,8,4,.55) 0%,rgba(70,8,4,0) 70%)"></div>
    <img src="{src}" alt="{alt}" style="position:relative;display:block;height:{h}px">
    <!-- luz de la escena sobre el dibujo: claro a la izquierda, sombra suave a la derecha y abajo -->
    <div style="position:absolute;inset:0;-webkit-mask-image:url({src});mask-image:url({src});-webkit-mask-size:auto 100%;mask-size:auto 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;background:linear-gradient(105deg,rgba(255,244,228,.34) 0%,rgba(255,244,228,0) 42%,rgba(80,16,8,.34) 100%);mix-blend-mode:soft-light"></div>
  </div>
'''

GRANO = '''  <svg style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.22" width="1080" height="1350" aria-hidden="true"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>
'''

def post(escena, pared, titulo_html, datos_html, rey_html, logo):
    return f'''<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:{pared}">
  <img src="{escena}" alt="" style="position:absolute;left:0;top:190px;width:1080px;height:1350px;object-fit:cover;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 120px);mask-image:linear-gradient(to bottom,transparent 0,#000 120px)">
  <!-- encabezado -->
  <img src="{logo}" alt="El Rey del Gas" style="position:absolute;left:60px;top:38px;width:220px;object-fit:contain;filter:brightness(0);opacity:.9">
  <p class="p" style="position:absolute;right:60px;top:58px;margin:0;font-size:19px;font-weight:600;letter-spacing:.06em;color:#8A3A30">{{{{locales}}}}</p>
{titulo_html}{datos_html}{rey_html}  <!-- pie -->
  <div class="p" style="position:absolute;left:60px;bottom:40px;display:flex;gap:10px;align-items:center;font-size:17px;font-weight:600;color:#FFFFFF;letter-spacing:.04em">
    <span style="background:rgba(40,6,4,.55);padding:9px 18px;border-radius:999px;backdrop-filter:blur(6px)">Sólo efectivo · Retiro en bodega</span>
  </div>
{GRANO}</div>
'''

TIT = '  <p class="p" style="position:absolute;left:56px;top:118px;margin:0;font-size:150px;font-weight:800;letter-spacing:-.055em;line-height:1;color:#2A0B08">{t}<span style="color:#C8241A">.</span></p>\n'

def bloque(top, filas):
    out = f'  <div style="position:absolute;left:60px;top:{top}px;display:flex;flex-direction:column;gap:6px">\n'
    for k, (eti, dato, tam) in enumerate(filas):
        mt = ' style="margin-top:26px"' if k else ''
        out += f'    <span class="eti"{mt}>{eti}</span>\n    <span class="dato" style="font-size:{tam}px">{dato}</span>\n'
    return out + '  </div>\n'

piezas = [
    ('MundoRDG_1_Horario', 'Mundo real Rey del Gas 1 Horario', u('escena-reloj'), '#EDE5DE', TIT.format(t='Horario'),
     bloque(330, [('{{semanaLabel}}', '{{semanaHoras}}', 70), ('{{domingoLabel}}', '{{domingoHoras}}', 70)]),
     rey(u('rey-09-guino'), 40, 800, 470, 'El Rey del Gas con el pulgar arriba')),
    ('MundoRDG_2_Direcciones', 'Mundo real Rey del Gas 2 Direcciones', u('escena-pin'), '#EDE5DB', TIT.format(t='Visítanos'),
     bloque(330, [('{{local1}}', '{{dir1}}', 64), ('{{local2}}', '{{dir2}}', 64)]),
     rey(u('rey-03-senalando'), 30, 820, 450, 'El Rey del Gas señalando el pin')),
    ('MundoRDG_3_MesaAyuda', 'Mundo real Rey del Gas 3 Mesa de ayuda', u('escena-celular'), '#EEE8E1', TIT.format(t='Escríbenos'),
     bloque(330, [('WhatsApp · {{local1}}', '{{wa1}}', 64), ('WhatsApp · {{local2}}', '{{wa2}}', 64)]),
     rey(u('rey-05-celular'), 40, 810, 460, 'El Rey del Gas con el celular')),
]
for nombre, titulo, escena, pared, tit, datos, r in piezas:
    html = HEAD.format(titulo=titulo) + post(escena, pared, tit, datos, r, u('logo')) + FOOT.format(respaldo=json.dumps(RESPALDO, ensure_ascii=False))
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(html)
print('ok')
