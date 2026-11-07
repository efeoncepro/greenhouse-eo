# Fijos del Rey del Gas v2: cada pieza vive en su propio lugar del reino (fondo integrado: 3D satinado + corte 2D con
# sombras reales). Tipografía: titular grande alineado a la izquierda sobre el cielo, datos en una tarjeta blanca
# limpia abajo. Los datos salen de locales.json con respaldo.
import json, sys, os

OUT = sys.argv[1]
B = json.loads(sys.argv[2])
u = lambda k: '/_blob/' + B[k]

INK = '#2A0B08'
RED = '#D8261C'

ICONO = {
    'reloj': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
    'pin': '<svg width="24" height="24" viewBox="0 0 24 24" fill="#FFF"><path d="M12 2.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"/></svg>',
    'wa': '<svg width="26" height="26" viewBox="0 0 24 24" fill="#FFF"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm5.6 13.7c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.8-.2 1.5z"/></svg>',
}


def chip(icono, color=RED):
    return f'<span style="flex:none;width:52px;height:52px;border-radius:16px;background:{color};display:grid;place-items:center;box-shadow:0 6px 14px rgba(216,38,28,.28)">{ICONO[icono]}</span>'


def columna(icono, etiqueta, valor, color=RED, valor_px=40):
    return f'''      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:16px">
        {chip(icono, color)}
        <div style="min-width:0">
          <div style="font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:{color};line-height:1.1">{etiqueta}</div>
          <div style="margin-top:4px;font-size:{valor_px}px;font-weight:700;letter-spacing:-.035em;line-height:1;color:{INK};font-variant-numeric:tabular-nums;white-space:nowrap">{valor}</div>
        </div>
      </div>
'''


SEP = '      <div style="flex:none;width:1px;align-self:stretch;margin:4px 0;background:rgba(42,11,8,.12)"></div>\n'


def tarjeta(columnas, pie):
    return f'''  <div class="p" style="position:absolute;left:40px;right:40px;bottom:40px;padding:26px 30px 20px;border-radius:30px;background:rgba(255,253,249,.94);box-shadow:0 24px 60px rgba(70,18,4,.28),0 2px 0 rgba(255,255,255,.6) inset">
    <div style="display:flex;align-items:center;gap:26px">
{columnas}    </div>
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(42,11,8,.1);display:flex;justify-content:space-between;font-size:14px;font-weight:600;letter-spacing:.04em;color:rgba(42,11,8,.55)">{pie}</div>
  </div>
'''


def pieza(fondo, linea1, linea2, bajada, cuerpo, encima=''):
    return f'''<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#F2E3CF">
  <img src="{u(fondo)}" alt="" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover">
  <img src="{u('logo')}" alt="El Rey del Gas" style="position:absolute;left:58px;top:58px;width:230px;opacity:.9">
  <h1 class="p" style="position:absolute;left:52px;top:128px;margin:0;font-size:108px;font-weight:800;letter-spacing:-.055em;line-height:.9;color:{INK}">{linea1}<br><span style="color:{RED}">{linea2}</span></h1>
  <p class="p" style="position:absolute;left:58px;top:342px;margin:0;max-width:560px;font-size:25px;font-weight:500;letter-spacing:-.01em;line-height:1.3;color:rgba(42,11,8,.78)">{bajada}</p>
{cuerpo}{encima}  <svg style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.14" width="1080" height="1350" aria-hidden="true"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>
</div>
'''


horario = pieza('plaza', 'Su Majestad', 'atiende.', 'Todos los días te esperamos en el Reino.',
                tarjeta(columna('reloj', '{{semanaLabel}}', '{{semanaHoras}}') + SEP + columna('reloj', '{{domingoLabel}}', '{{domingoHoras}}'),
                        '<span>{{locales}}</span><span>{{legal}}</span>'))

ubicacion = pieza('camino', 'Ven al', 'Reino.', 'Dos castillos, un solo Rey.',
                  tarjeta(columna('pin', '{{rdgUno}}', '{{rdgUnoCalle}}', '#E01800', 34) + SEP + columna('pin', '{{rdgDos}}', '{{rdgDosCalle}}', '#F26A00', 34),
                          '<span>{{rdgUnoComuna}} · {{rdgDosComuna}}</span><span>Retiro en bodega</span>'))

# El Heraldo es el primer plano: su capa va por encima de la tarjeta.
H = {'left': 64, 'top': 810, 'h': 405}
heraldo = f'  <img src="{u("heraldo")}" alt="El Heraldo anuncia con su trompeta" style="position:absolute;left:{H["left"]}px;top:{H["top"]}px;height:{H["h"]}px">\n'
def tarjeta_mesa(filas, pie):
    return f'''  <div class="p" style="position:absolute;left:40px;right:40px;bottom:40px;padding:24px 30px 20px 440px;border-radius:30px;background:rgba(255,253,249,.94);box-shadow:0 24px 60px rgba(70,18,4,.28),0 2px 0 rgba(255,255,255,.6) inset">
    <div style="display:flex;flex-direction:column;gap:16px">
{filas}    </div>
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(42,11,8,.1);display:flex;justify-content:space-between;font-size:14px;font-weight:600;letter-spacing:.04em;color:rgba(42,11,8,.55)">{pie}</div>
  </div>
'''


mesa = pieza('puerta', 'Audiencias', 'reales.', 'Escríbele al Rey por WhatsApp.',
             tarjeta_mesa(columna('wa', '{{rdgUno}}', '{{rdgUnoWa}}', '#1FA855', 34) + columna('wa', '{{rdgDos}}', '{{rdgDosWa}}', '#1FA855', 34),
                          '<span>Precios y stock</span><span>{{legal}}</span>'), heraldo)

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
FOOT = '''</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1080,"height":1350}}}}'>
class Component extends DCLogic {{
  componentDidMount() {{
    fetch('locales.json').then((r) => r.json()).then((loc) => this.setState({{ loc }})).catch(() => this.setState({{ err: true }}));
  }}
  renderVals() {{
    // Respaldo con los datos vigentes del registro, por si la carga falla.
    const respaldo = {respaldo};
    const s = this.state || {{}};
    if (!s.loc) return respaldo;
    try {{
      const [a, b] = s.loc.marcas['rey-del-gas'].locales.map((id) => s.loc.locales[id]);
      const h = s.loc.horario;
      const calle = (l) => l.linea1.split(',')[0].trim();
      return Object.assign({{}}, respaldo, {{
        semanaLabel: h.semana.label, semanaHoras: h.semana.horas, domingoLabel: h.domingo.label, domingoHoras: h.domingo.horas,
        locales: a.local + ' · ' + b.local,
        rdgUno: a.local, rdgUnoCalle: calle(a), rdgUnoComuna: a.local, rdgUnoWa: a.waLegible,
        rdgDos: b.local, rdgDosCalle: calle(b), rdgDosComuna: b.local, rdgDosWa: b.waLegible,
        legal: (s.loc.legales.contacto.pie || '').replace(/\\s*\\|\\s*$/, '').replace(/\\s*\\|\\s*/g, ' · ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
      }});
    }} catch (e) {{ return respaldo; }}
  }}
}}
</script>
</body>
</html>
'''
RESPALDO = {
    'semanaLabel': 'Lunes a sábado', 'semanaHoras': '10:00 – 20:00',
    'domingoLabel': 'Domingos y festivos', 'domingoHoras': '10:00 – 15:00',
    'locales': 'Lo Prado · Cerro Navia',
    'rdgUno': 'Lo Prado', 'rdgUnoCalle': 'Neptuno 934', 'rdgUnoComuna': 'Lo Prado', 'rdgUnoWa': '+56 9 5460 6758',
    'rdgDos': 'Cerro Navia', 'rdgDosCalle': 'El Pastizal 1518', 'rdgDosComuna': 'Cerro Navia', 'rdgDosWa': '+56 9 6642 6189',
    'legal': 'Sólo efectivo · Retiro en bodega',
}
R = json.dumps(RESPALDO, ensure_ascii=False)
for nombre, titulo, cuerpo in [('ReinoRDG_1_Horario', 'Rey del Gas · Horario', horario),
                               ('ReinoRDG_2_Ubicacion', 'Rey del Gas · Ubicación', ubicacion),
                               ('ReinoRDG_3_MesaAyuda', 'Rey del Gas · Mesa de ayuda', mesa)]:
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(HEAD.format(titulo=titulo) + cuerpo + FOOT.format(respaldo=R))
print('ok')
