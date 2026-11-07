# Fijos del Rey del Gas desde el kit del mundo: Horario («Su Majestad atiende»), Ubicación («Ven al Reino») y
# Mesa de ayuda («Audiencias reales»). Escenario real + objetos 3D satinados + corte 2D, por capas; los datos salen
# de locales.json con respaldo.
import json, sys, os

OUT = sys.argv[1]
B = json.loads(sys.argv[2])
AR = json.loads(sys.argv[3])
u = lambda k: '/_blob/' + B[k]
SOMBRA = 'rgba(40,4,2,{a})'


def capa(k, cx, base, h, rot=0, blur=0, sombra=0.0, alt=''):
    """Objeto 3D centrado en `cx`, apoyado en `base` (px desde arriba), de alto `h`."""
    w, hh = AR[k]
    ancho = int(h * w / hh)
    left, top = int(cx - ancho / 2), int(base - h)
    out = ''
    if sombra:
        out += f'  <div style="position:absolute;left:{int(cx - ancho*0.55)}px;top:{int(base - h*0.035)}px;width:{int(ancho*1.1)}px;height:{int(h*0.08)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(40,4,2,{sombra}) 0%,rgba(40,4,2,0) 70%);filter:blur(6px)"></div>\n'
    f = f'blur({blur}px) ' if blur else ''
    out += f'  <img src="{u(k)}" alt="{alt}" style="position:absolute;left:{left}px;top:{top}px;height:{h}px;transform:rotate({rot}deg);filter:{f}drop-shadow(0 {int(h*.03)}px {int(h*.04)}px rgba(40,4,2,.35))">\n'
    return out


def personaje(k, cx, base, h, alt=''):
    """Personaje 2D con sombra de contacto y la luz de la escena recortada por su silueta."""
    w, hh = AR[k]
    ancho = int(h * w / hh)
    left, top = int(cx - ancho / 2), int(base - h)
    src = u(k)
    return f'''  <div style="position:absolute;left:{int(cx - ancho*0.5)}px;top:{int(base - h*0.03)}px;width:{ancho}px;height:{int(h*0.07)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(40,4,2,.55) 0%,rgba(40,4,2,0) 70%);filter:blur(4px)"></div>
  <div style="position:absolute;left:{left}px;top:{top}px;height:{h}px">
    <img src="{src}" alt="{alt}" style="position:relative;display:block;height:{h}px">
    <div style="position:absolute;inset:0;-webkit-mask-image:url({src});mask-image:url({src});-webkit-mask-size:auto 100%;mask-size:auto 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;background:radial-gradient(ellipse at 50% 0%,rgba(255,226,160,.35) 0%,rgba(255,226,160,0) 60%),linear-gradient(to bottom,rgba(0,0,0,0) 55%,rgba(60,8,4,.30) 100%);mix-blend-mode:soft-light"></div>
  </div>
'''


GRANO = '''  <svg style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.2" width="1080" height="1350" aria-hidden="true"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>
'''


def marco(capas, titular, bajada, extra=''):
    return f'''<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#3A0805">
  <img src="{u('escenario')}" alt="" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover">
{capas}  <div style="position:absolute;left:0;right:0;top:0;height:400px;background:linear-gradient(to bottom,rgba(40,4,2,.62),rgba(40,4,2,0))"></div>
  <img src="{u('logo')}" alt="El Rey del Gas" style="position:absolute;left:390px;top:64px;width:300px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 4px 10px rgba(40,4,2,.6))">
  <p class="p" style="position:absolute;left:0;right:0;top:178px;margin:0;text-align:center;font-size:84px;font-weight:800;letter-spacing:-.045em;line-height:1;color:#FFF3DC;text-shadow:0 6px 24px rgba(40,4,2,.85)">{titular}</p>
  <p class="p" style="position:absolute;left:0;right:0;top:278px;margin:0;text-align:center;font-size:22px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#F6C443;text-shadow:0 2px 10px rgba(40,4,2,.8)">{bajada}</p>
{extra}{GRANO}</div>
'''


PLACA = 'background:#FFF3DC;border:4px solid #D9A43A;border-radius:30px;box-shadow:0 18px 40px rgba(40,4,2,.55),inset 0 0 0 3px #FFF3DC,inset 0 0 0 6px rgba(217,164,58,.45)'

# ---------- 1 · Horario: «Su Majestad atiende» ----------
c = ''
c += capa('3d-castillo-rojo', 150, 850, 190, sombra=.35)
c += capa('3d-castillo-naranjo', 940, 850, 190, sombra=.35)
c += capa('3d-torre-reloj', 810, 1030, 700, sombra=.55, alt='La torre del reloj')
c += capa('3d-trono', 400, 1030, 530, sombra=.6)
c += personaje('2d-rey-trono', 410, 891, 446, alt='El Rey del Gas en su trono')
c += personaje('2d-paje', 650, 1034, 240, alt='El Paje')
c += capa('3d-cetro', 30, 1300, 470, rot=-30, blur=8)
c += capa('3d-llama', 1070, 1250, 340, rot=16, blur=9)
horas = f'''  <div class="p" style="position:absolute;left:110px;right:110px;top:1048px;height:206px;display:flex;align-items:center;{PLACA}">
    <div style="flex:1;text-align:center;border-right:3px solid rgba(217,164,58,.55)">
      <div style="font-size:19px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9E1A10">{{{{semanaLabel}}}}</div>
      <div style="margin-top:8px;font-size:52px;font-weight:800;letter-spacing:-.03em;line-height:1;color:#D8261C;font-variant-numeric:tabular-nums">{{{{semanaHoras}}}}</div>
    </div>
    <div style="flex:1;text-align:center">
      <div style="font-size:19px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9E1A10">{{{{domingoLabel}}}}</div>
      <div style="margin-top:8px;font-size:52px;font-weight:800;letter-spacing:-.03em;line-height:1;color:#D8261C;font-variant-numeric:tabular-nums">{{{{domingoHoras}}}}</div>
    </div>
  </div>
  <p class="p" style="position:absolute;left:0;right:0;top:1284px;margin:0;text-align:center;font-size:19px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#FFF3DC;opacity:.9">{{{{locales}}}}</p>
'''
horario = marco(c, 'Su Majestad atiende', 'Te esperamos en el Reino', horas)

# ---------- 2 · Ubicación: «Ven al Reino» ----------
c = ''
c += capa('3d-camino-real', 540, 1420, 820, sombra=0)
c += capa('3d-castillo-rojo', 215, 1010, 520, sombra=.55, alt='Castillo de Lo Prado')
c += capa('3d-castillo-naranjo', 865, 1010, 520, sombra=.55, alt='Castillo de Cerro Navia')
c += personaje('2d-rey-capa', 540, 1040, 430, alt='El Rey del Gas con su capa')
c += capa('3d-escudo', 1050, 1380, 320, rot=18, blur=9)
c += capa('3d-cetro', 20, 1400, 430, rot=-34, blur=9)


def tarjeta(x, color, nombre, dir_):
    return f'''  <div class="p" style="position:absolute;left:{x}px;top:1050px;width:440px;box-sizing:border-box;padding:14px 16px 16px;text-align:center;{PLACA};border-color:{color}">
    <div style="display:inline-block;padding:5px 16px;border-radius:999px;background:{color};color:#FFF;font-size:18px;font-weight:800;letter-spacing:.12em">{nombre}</div>
    <div style="margin-top:8px;font-size:23px;font-weight:700;letter-spacing:-.02em;line-height:1.15;color:#3A0805;white-space:nowrap">{dir_}</div>
  </div>
'''


ubic = tarjeta(40, '#E01800', '{{rdgUno}}', '{{rdgUnoDir}}') + tarjeta(600, '#F26A00', '{{rdgDos}}', '{{rdgDosDir}}')
ubic += '''  <div class="p" style="position:absolute;left:0;right:0;top:1250px;text-align:center"><span style="display:inline-block;padding:10px 26px;border-radius:999px;background:rgba(40,4,2,.78);color:#FFF3DC;font-size:20px;font-weight:700;letter-spacing:.1em">SIGUE EL CAMINO REAL · RETIRO EN BODEGA</span></div>
'''
ubicacion = marco(c, 'Ven al Reino', 'Dos castillos, un solo Rey', ubic)

# ---------- 3 · Mesa de ayuda: «Audiencias reales» ----------
c = ''
c += capa('3d-palacio', 760, 760, 300, sombra=.45)
c += personaje('2d-heraldo', 390, 880, 510, alt='El Heraldo')
c += personaje('2d-rey-trono', 820, 860, 250, alt='El Rey del Gas escucha')
c += capa('3d-sello', 60, 1290, 300, rot=-12, blur=8)
c += capa('3d-pergamino', 1030, 1300, 330, rot=14, blur=8)
WA = '<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="22" fill="#25D366"/><path d="M13 31l1.6-4.6A9.5 9.5 0 1 1 18 30z" fill="#FFF"/><path d="M18.4 17.2c.3-.7.6-.7 1-.7h.7c.2 0 .5.1.7.6l.9 2.2c.1.3 0 .6-.2.8l-.6.7c-.2.2-.2.4 0 .7.5.9 1.6 2.1 3 2.7.3.1.5.1.7-.1l.8-.9c.2-.3.5-.3.8-.2l2.1 1c.4.2.5.4.4.8-.2 1-1.1 1.9-2.2 2-3.3.3-7.3-3.4-8-6.1-.3-1.3 0-2.4.4-3.5z" fill="#25D366"/></svg>'


def fila(top, color, nombre, num):
    return f'''  <div class="p" style="position:absolute;left:150px;right:150px;top:{top}px;height:104px;display:flex;align-items:center;gap:18px;padding:0 26px;{PLACA};border-color:{color}">
    {WA}
    <span style="padding:5px 14px;border-radius:999px;background:{color};color:#FFF;font-size:17px;font-weight:800;letter-spacing:.12em">{nombre}</span>
    <span style="margin-left:auto;font-size:40px;font-weight:800;letter-spacing:-.02em;color:#3A0805;font-variant-numeric:tabular-nums">{num}</span>
  </div>
'''


mesa = fila(930, '#E01800', '{{rdgUno}}', '{{rdgUnoWa}}') + fila(1052, '#F26A00', '{{rdgDos}}', '{{rdgDosWa}}')
mesa += '''  <p class="p" style="position:absolute;left:0;right:0;top:1186px;margin:0;text-align:center;font-size:30px;font-weight:700;letter-spacing:-.01em;color:#FFF3DC;text-shadow:0 3px 12px rgba(40,4,2,.8)">Consulta precios y disponibilidad: el Rey responde.</p>
  <p class="p" style="position:absolute;left:0;right:0;top:1262px;margin:0;text-align:center;font-size:17px;font-weight:700;letter-spacing:.14em;color:#F6C443">{{legal}}</p>
'''
mesa_ayuda = marco(c, 'Audiencias reales', 'El Rey te atiende por WhatsApp', mesa)

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
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&amp;display=swap" rel="stylesheet">
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
      return Object.assign({{}}, respaldo, {{
        semanaLabel: h.semana.label, semanaHoras: h.semana.horas, domingoLabel: h.domingo.label, domingoHoras: h.domingo.horas,
        locales: a.local + ' · ' + b.local,
        rdgUno: a.corto, rdgUnoDir: a.linea1, rdgUnoWa: a.waLegible,
        rdgDos: b.corto, rdgDosDir: b.linea1, rdgDosWa: b.waLegible,
        legal: (s.loc.legales.contacto.pie || '').replace(/\\s*\\|\\s*$/, '').replace(/\\|/g, '·')
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
    'rdgUno': 'LO PRADO', 'rdgUnoDir': 'Neptuno 934, Lo Prado', 'rdgUnoWa': '+56 9 5460 6758',
    'rdgDos': 'CERRO NAVIA', 'rdgDosDir': 'El Pastizal 1518, Cerro Navia', 'rdgDosWa': '+56 9 6642 6189',
    'legal': 'SÓLO EFECTIVO · RETIRO EN BODEGA',
}
R = json.dumps(RESPALDO, ensure_ascii=False)
for nombre, titulo, cuerpo in [('ReinoRDG_1_Horario', 'Rey del Gas · Horario', horario),
                               ('ReinoRDG_2_Ubicacion', 'Rey del Gas · Ubicación', ubicacion),
                               ('ReinoRDG_3_MesaAyuda', 'Rey del Gas · Mesa de ayuda', mesa_ayuda)]:
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(HEAD.format(titulo=titulo) + cuerpo + FOOT.format(respaldo=R))
print('ok')
