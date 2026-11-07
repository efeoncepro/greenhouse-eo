# Genera los tres tableros de la serie del Rey del Gas (Horario, Direcciones, Mesa de ayuda) desde una sola plantilla.
# La cinta dorada es UN trazado de 3240 px de ancho: cada post muestra su tercio, así la serie se une en el feed.
import json, sys, os

OUT = sys.argv[1]
B = json.loads(sys.argv[2])  # ids de assets: {"rey-04-apoyado": "...", ...}

def u(k):
    return '/_blob/' + B[k]

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
<link href="https://fonts.googleapis.com/css2?family=Anton&amp;family=Poppins:wght@600;700;800;900&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
.t{{font-family:Anton,Impact,sans-serif;text-transform:uppercase;line-height:.9;white-space:nowrap;letter-spacing:.005em}}
.etq{{display:inline-block;font-family:Poppins,system-ui,sans-serif;font-weight:900;font-size:28px;letter-spacing:.1em;padding:7px 20px 6px;border-radius:999px}}
.sombra{{position:absolute;border-radius:50%;background:radial-gradient(ellipse at center,rgba(40,0,0,.55) 0%,rgba(40,0,0,0) 70%)}}
</style>
</helmet>
'''

# cinta: un trazado continuo en coordenadas de la serie completa (3 × 1080)
CINTA = '''  <svg style="position:absolute;left:{dx}px;top:0" width="3240" height="1350" viewBox="0 0 3240 1350" aria-hidden="true">
    <defs>
      <linearGradient id="oro{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A3"/><stop offset=".45" stop-color="#F6C443"/><stop offset="1" stop-color="#C98A16"/></linearGradient>
      <path id="eje{i}" d="M -40 1236 C 360 1170, 720 1290, 1080 1226 S 1800 1170, 2160 1236 S 2880 1290, 3280 1220"/>
    </defs>
    <path d="M -40 1236 C 360 1170, 720 1290, 1080 1226 S 1800 1170, 2160 1236 S 2880 1290, 3280 1220" fill="none" stroke="#5A0000" stroke-width="96" stroke-linecap="round" transform="translate(0,10)" opacity=".45"/>
    <path d="M -40 1236 C 360 1170, 720 1290, 1080 1226 S 1800 1170, 2160 1236 S 2880 1290, 3280 1220" fill="none" stroke="url(#oro{i})" stroke-width="86" stroke-linecap="round"/>
    <text font-family="Poppins, system-ui, sans-serif" font-weight="900" font-size="25" letter-spacing="3" fill="#5A0000" dy="9"><textPath href="#eje{i}" startOffset="0">{cinta}</textPath></text>
  </svg>
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
        semanaLabel: h.semana.label.toUpperCase(), semanaHoras: h.semana.horas,
        domingoLabel: h.domingo.label.toUpperCase(), domingoHoras: h.domingo.horas,
        local1: L[0].local.toUpperCase(), dir1: corta(L[0].linea1), wa1: L[0].waLegible,
        local2: L[1].local.toUpperCase(), dir2: corta(L[1].linea1), wa2: L[1].waLegible
      }});
    }} catch (e) {{ return respaldo; }}
  }}
}}
</script>
</body>
</html>
'''

RESPALDO = {
    'semanaLabel': 'LUNES A SÁBADO', 'semanaHoras': '10:00 – 20:00',
    'domingoLabel': 'DOMINGOS Y FESTIVOS', 'domingoHoras': '10:00 – 15:00',
    'local1': 'LO PRADO', 'dir1': 'Neptuno 934', 'wa1': '+56 9 5460 6758',
    'local2': 'CERRO NAVIA', 'dir2': 'El Pastizal 1518', 'wa2': '+56 9 6642 6189',
}
CINTA_TXT = ' ✦ '.join(['SÓLO EFECTIVO', 'RETIRO EN BODEGA', 'EL REY DEL GAS', 'LO PRADO', 'CERRO NAVIA'] * 6)

LOGO = '<img src="{logo}" alt="El Rey del Gas" style="position:absolute;left:56px;top:40px;width:280px;object-fit:contain;filter:brightness(0) invert({inv})">'

def post(i, fondo, tinta, contenido, logo_inv=1):
    return (f'<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:{fondo}">\n'
            f'  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 60%)"></div>\n'
            + LOGO.format(logo=u('logo'), inv=logo_inv) + '\n'
            + contenido
            + CINTA.format(dx=-1080 * i, i=i, cinta=CINTA_TXT)
            + '</div>\n')

# ---------- 1 · Horario (rojo): el Rey se apoya en un reloj gigante ----------
horario = f'''  <p class="t" style="position:absolute;left:50px;top:124px;margin:0;font-size:214px;color:#FFFFFF;text-shadow:8px 8px 0 #7A0000">HORARIO</p>
  <div style="position:absolute;left:56px;top:330px;display:flex;flex-direction:column;align-items:flex-start;gap:6px">
    <span class="etq" style="background:#FFC214;color:#5A0000">{{{{semanaLabel}}}}</span>
    <span class="t" style="font-size:104px;color:#FFFFFF;text-shadow:6px 6px 0 #7A0000">{{{{semanaHoras}}}}</span>
    <span class="etq" style="background:#000000;color:#FFC214;margin-top:14px">{{{{domingoLabel}}}}</span>
    <span class="t" style="font-size:104px;color:#FFC214;text-shadow:6px 6px 0 #7A0000">{{{{domingoHoras}}}}</span>
  </div>
  <div class="sombra" style="left:180px;top:1150px;width:560px;height:80px"></div>
  <img src="{u('3d-reloj')}" alt="" style="position:absolute;left:236px;top:690px;height:540px;object-fit:contain;transform:rotate(-6deg)">
  <img src="{u('3d-monedas')}" alt="" style="position:absolute;right:-30px;top:330px;height:220px;object-fit:contain;transform:rotate(18deg)">
  <div class="sombra" style="left:560px;top:1168px;width:380px;height:64px"></div>
  <img src="{u('rey-04-apoyado')}" alt="El Rey del Gas apoyado en el reloj" style="position:absolute;left:566px;top:612px;height:620px;object-fit:contain">
'''

# ---------- 2 · Direcciones (amarillo): el Rey señala el pin ----------
direcciones = f'''  <p class="t" style="position:absolute;left:50px;top:140px;margin:0;font-size:196px;color:#E01800;text-shadow:8px 8px 0 #000000">VISÍTANOS</p>
  <div style="position:absolute;left:56px;top:352px;display:flex;flex-direction:column;align-items:flex-start;gap:6px">
    <span class="etq" style="background:#E01800;color:#FFFFFF">{{{{local1}}}}</span>
    <span class="t" style="font-size:96px;color:#000000">{{{{dir1}}}}</span>
    <span class="etq" style="background:#000000;color:#FFC214;margin-top:14px">{{{{local2}}}}</span>
    <span class="t" style="font-size:96px;color:#000000">{{{{dir2}}}}</span>
  </div>
  <img src="{u('3d-corona')}" alt="" style="position:absolute;right:-40px;top:300px;height:200px;object-fit:contain;transform:rotate(14deg)">
  <div class="sombra" style="left:20px;top:1166px;width:470px;height:70px"></div>
  <img src="{u('rey-03-senalando')}" alt="El Rey del Gas señalando el pin" style="position:absolute;left:30px;top:690px;height:540px;object-fit:contain">
  <div class="sombra" style="left:640px;top:1172px;width:320px;height:60px"></div>
  <img src="{u('3d-pin')}" alt="" style="position:absolute;left:640px;top:660px;height:540px;object-fit:contain;transform:rotate(8deg)">
'''

# ---------- 3 · Mesa de ayuda (rojo): burbujas que salen del celular del Rey ----------
mesa = f'''  <p class="t" style="position:absolute;left:50px;top:124px;margin:0;font-size:182px;color:#FFFFFF;text-shadow:8px 8px 0 #7A0000">ESCRÍBENOS</p>
  <div style="position:absolute;left:56px;top:312px;display:flex;flex-direction:column;align-items:flex-start;gap:6px">
    <span class="etq" style="background:#25D366;color:#FFFFFF">MESA DE AYUDA · WHATSAPP</span>
    <span class="etq" style="background:#FFC214;color:#5A0000;margin-top:14px">{{{{local1}}}}</span>
    <span class="t" style="font-size:88px;color:#FFFFFF;text-shadow:6px 6px 0 #7A0000">{{{{wa1}}}}</span>
    <span class="etq" style="background:#000000;color:#FFC214;margin-top:12px">{{{{local2}}}}</span>
    <span class="t" style="font-size:88px;color:#FFC214;text-shadow:6px 6px 0 #7A0000">{{{{wa2}}}}</span>
  </div>
  <img src="{u('3d-burbujas')}" alt="" style="position:absolute;left:820px;top:520px;height:210px;object-fit:contain;transform:rotate(-10deg)">
  <img src="{u('3d-monedas')}" alt="" style="position:absolute;left:180px;top:860px;height:230px;object-fit:contain;transform:rotate(-20deg)">
  <div class="sombra" style="left:600px;top:1170px;width:400px;height:66px"></div>
  <img src="{u('rey-05-celular')}" alt="El Rey del Gas con el celular" style="position:absolute;left:592px;top:680px;height:550px;object-fit:contain">
'''

for i, (nombre, titulo, fondo, cont, inv) in enumerate([
    ('SerieRDG_1_Horario', 'Serie Rey del Gas 1 Horario', '#E01800', horario, 1),
    ('SerieRDG_2_Direcciones', 'Serie Rey del Gas 2 Direcciones', '#FFC214', direcciones, 0),
    ('SerieRDG_3_MesaAyuda', 'Serie Rey del Gas 3 Mesa de ayuda', '#E01800', mesa, 1),
]):
    html = HEAD.format(titulo=titulo) + post(i, fondo, None, cont, inv) + FOOT.format(respaldo=json.dumps(RESPALDO, ensure_ascii=False))
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(html)
print('ok')
