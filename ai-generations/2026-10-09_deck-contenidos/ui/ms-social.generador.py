import re,sys,json,os
src=open('canvas/project/MS-Month.dc.html').read()
css=src[src.index('<style>'):src.index('</style>')+8]
b=src[src.index('<div class="ms"'):src.index('</x-dc>')]
nav=b[b.index('<nav'):b.index('</nav>')+6]
# solo tema claro, sin lógica
nav=re.sub(r'<sc-if value="\{\{isDark\}\}".*?</sc-if>','',nav,flags=re.S)
nav=re.sub(r'<sc-if value="\{\{isLight\}\}"[^>]*>(.*?)</sc-if>',r'\1',nav,flags=re.S)
nav=re.sub(r'href="[^"]*"','href="#"',nav)
nav=nav.replace('<img src="/_blob/2d86ca2fd35e850fb627cbaab8ab690e" alt="Mareas Café" style="width: 30px; height: auto; display: block; margin-bottom: 20px;">','<img src="/_blob/5b7fe46f8bc335a2658f4d48e5e6acff" alt="Marketing Studio" style="width: 34px; height: auto; display: block; margin-bottom: 18px;">')
# la página actual pasa de Calendario a Campañas
cur='aria-current="page" style="display: flex; flex-direction: column; align-items: center; gap: 5px; width: 60px; padding: 9px 0; border-radius: 10px; background: var(--raised); color: var(--t1);'
off='style="display: flex; flex-direction: column; align-items: center; gap: 5px; width: 60px; padding: 9px 0; border-radius: 10px; background: transparent; color: var(--t3);'
assert cur in nav
nav=nav.replace(cur,off)
i=nav.index('<span>Campañas</span>'); j=nav.rfind('<a href="#" '+off,0,i)
nav=nav[:j]+'<a href="#" '+cur+nav[j+len('<a href="#" '+off):]
G="font-family: 'Geist', system-ui, sans-serif"; P="font-family: 'Poppins', sans-serif"
NET={'ig':('2d4896e9385e1988c295d8a7c354143d','Instagram'),'tt':('e983c46e29770fefe13aaac3c26b3719','TikTok'),'li':('5bf8e95345f1ab5750ee51ed19ac7e8a','LinkedIn'),'yt':('712d531fb65791883c98dd1de90fdc52','YouTube'),'fb':('95408181b80b4225771cb3f03d9b7aa8','Facebook')}
ST={'pub':('Publicada','var(--ok)'),'prog':('Programada','var(--info)'),'apr':('Por aprobar','var(--warn)'),'bor':('Borrador','var(--t3)')}
GR=['linear-gradient(135deg, #0375db, #72ded8)','linear-gradient(135deg, #023c70, #2e8be8)','linear-gradient(135deg, #bb1954, #ff6500)','linear-gradient(135deg, #3bcbbd, #0b5ed7)','linear-gradient(135deg, #6d6777, #cfe4fa)']
DAYS=[('Lun','12',[('ig','Reel','Teaser: algo frío viene','09:00','pub',0),('li','Post','Nota del fundador','12:30','pub',1)]),
 ('Mar','13',[('tt','Video','Detrás de la receta','18:00','pub',3),('ig','Story','Cuenta regresiva','20:00','pub',2)]),
 ('Mié','14',[('ig','Carrusel','Cold brew en 5 datos','10:00','prog',1),('yt','Short','Cómo se prepara','17:00','prog',0)]),
 ('Jue','15',[('ig','Reel','Ya llegó Cold brew','09:00','prog',2),('tt','Video','El primer sorbo','12:00','prog',3),('fb','Post','Dónde encontrarlo','13:00','apr',4)]),
 ('Vie','16',[('ig','Reel','Reseña de Valentina','11:00','apr',0),('li','Post','El lanzamiento por dentro','15:00','prog',1)]),
 ('Sáb','17',[('tt','Video','Reto Cold brew en casa','12:00','apr',2),('ig','Story','Encuesta de sabores','19:00','prog',3)]),
 ('Dom','18',[('ig','Carrusel','Lo mejor de la semana','18:00','bor',4)])]
def card(n,fmt,t,h,st,g):
    blob,name=NET[n]; lab,col=ST[st]
    return (f'<div style="border-radius: 10px; background: var(--base); border: 1px solid var(--line); overflow: hidden; box-shadow: 0 1px 2px rgba(47, 43, 61, 0.06)">'
     f'<div style="height: 88px; background: {GR[g]}; position: relative"><span style="position: absolute; left: 9px; bottom: 7px; font-size: 10.5px; white-space: nowrap; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #ffffff">{fmt} · {h}</span><span style="position: absolute; right: 7px; top: 7px; width: 26px; height: 26px; border-radius: 8px; background: #ffffff; display: flex; align-items: center; justify-content: center"><img src="/_blob/{blob}" alt="{name}" style="width: 17px; height: 17px"></span></div>'
     f'<div style="padding: 9px 10px 11px"><div style="font-size: 14.5px; font-weight: 600; line-height: 1.22; color: var(--t1)">{t}</div><div style="margin-top: 6px; display: flex; align-items: center; gap: 5px; font-size: 11.5px; white-space: nowrap; color: var(--t3)"><span style="width: 7px; height: 7px; border-radius: 50%; background: {col}; flex-shrink: 0"></span><span style="color: var(--t2)">{lab}</span></div></div></div>')
board=''
for d,num,posts in DAYS:
    launch=num=='15'
    board+=(f'<div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 12px; background: {"var(--info-bg2)" if launch else "transparent"}; border: 1px solid {"var(--info-line)" if launch else "transparent"}">'
     f'<div style="display: flex; align-items: baseline; gap: 6px; padding: 0 2px 2px"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--t3)">{d}</span><span style="{P}; font-size: 22px; font-weight: 600; color: var(--t1)">{num}</span>'
     +(f'<span style="margin-left: auto; font-size: 11px; font-weight: 600; color: var(--info); white-space: nowrap">Lanzamiento</span>' if launch else '')+'</div>'
     +''.join(card(*p) for p in posts)+'</div>')
def kpi(l,v,s,col='var(--ok)'):
    return f'<div style="flex: 1 1 0; border-radius: 12px; background: var(--base); border: 1px solid var(--line); padding: 12px 18px"><div style="font-size: 13.5px; color: var(--t3)">{l}</div><div style="margin-top: 2px; {P}; font-size: 34px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; white-space: nowrap; color: var(--t1)">{v}</div><div style="margin-top: 2px; font-size: 13px; font-weight: 500; white-space: nowrap; color: {col}">{s}</div></div>'
kpis=kpi('Publicaciones de la semana','14','6 programadas','var(--info)')+kpi('Por aprobar','3','esperan tu visto','var(--warn)')+kpi('Mensajes respondidos','94 %','DM y comentarios')+kpi('Alcance de la campaña','128 mil','+18 % frente a la semana previa')
def inbox(who,kind,msg,st,col):
    return f'<div style="padding: 12px 0; border-top: 1px solid var(--line)"><div style="display: flex; align-items: center; gap: 6px; font-size: 13px"><span style="font-weight: 600; color: var(--t1)">{who}</span><span style="color: var(--t3)">{kind}</span><span style="margin-left: auto; font-weight: 600; color: {col}; white-space: nowrap">{st}</span></div><div style="margin-top: 4px; font-size: 13.5px; line-height: 1.3; color: var(--t2)">{msg}</div></div>'
side=(f'<div style="border-radius: 12px; background: var(--base); border: 1px solid var(--line); padding: 14px 16px 6px"><div style="display: flex; align-items: center"><span style="{P}; font-size: 18px; font-weight: 600; color: var(--t1)">Bandeja</span><span style="margin-left: auto; font-size: 11px; font-weight: 600; color: var(--warn); background: var(--warn-bg); border: 1px solid var(--warn-line); border-radius: 999px; padding: 1px 8px">1 por responder</span></div><div style="margin-top: 8px">'
 +inbox('Lucía M.','DM','¿Hacen envíos a regiones?','Respondido','var(--ok)')
 +inbox('Diego R.','Comentario','Lo quiero probar, ¿dónde lo compro?','Por responder','var(--warn)')
 +inbox('Cafeteando','Mención','Pregunta por ventas para oficinas.','Derivado a ventas','var(--info)')
 +'</div></div>'
 +f'<div style="border-radius: 12px; background: var(--base); border: 1px solid var(--line); padding: 14px 16px 6px"><div style="{P}; font-size: 18px; font-weight: 600; color: var(--t1)">Creadores</div><div style="margin-top: 8px">'
 +inbox('Valentina Ríos','Reel de reseña','Entrega recibida, falta una ronda.','En revisión','var(--warn)')
 +inbox('Tomás Peña','Story + enlace','Contrato y derechos firmados.','Aprobado','var(--ok)')
 +'</div></div>')
head=(f'<header style="height: 60px; flex-shrink: 0; box-sizing: border-box; padding: 0 28px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid var(--line); background: var(--chrome)"><img src="/_blob/d01041cd835458c640e916b3cf452be1" alt="Marketing Studio" style="height: 20px; width: auto; display: block">'
 f'<nav aria-label="Ruta" style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-left: 8px; color: var(--t3)"><span>Campañas</span><span>›</span><span>Lanzamiento Cold brew</span><span>›</span><span style="color: var(--t1); font-weight: 500">Social</span></nav>'
 '</header>')
tabs=''.join(f'<span style="padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: {600 if t=="Social" else 500}; color: {"var(--t1)" if t=="Social" else "var(--t3)"}; background: {"var(--base)" if t=="Social" else "transparent"}; box-shadow: {"0 1px 2px rgba(47, 43, 61, 0.12)" if t=="Social" else "none"}">{t}</span>' for t in ['Plan','Social','Creadores','Pauta','Resultados'])
row1=(f'<div style="display: flex; align-items: center; gap: 14px; height: 40px"><h1 style="margin: 0; {P}; font-size: 26px; font-weight: 600; letter-spacing: -0.03em; white-space: nowrap">Lanzamiento Cold brew</h1><span style="font-size: 12px; font-weight: 500; color: var(--t2); background: var(--chip); border-radius: 999px; padding: 4px 10px; white-space: nowrap">Semana del 12 al 18 de octubre</span>'
 f'<div style="margin-left: auto; display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--sunk)">{tabs}</div>'
 f'<span style="height: 36px; box-sizing: border-box; padding: 0 14px; border-radius: 9px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #ffffff; background: #0375db; white-space: nowrap">+ Nueva publicación</span></div>')
ui=(f'<div class="ms" data-theme="light" style="position: relative; width: 1440px; height: 860px; display: flex; background: var(--app); color: var(--t1); {G}; overflow: hidden">{nav}'
 f'<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column">{head}<main style="flex-grow: 1; min-height: 0; overflow: hidden; background: var(--app)"><div style="height: 100%; box-sizing: border-box; padding: 16px 28px 18px; display: flex; flex-direction: column; gap: 12px">{row1}<div style="display: flex; gap: 12px">{kpis}</div>'
 f'<div style="flex-grow: 1; min-height: 0; display: flex; gap: 16px"><div style="flex-grow: 1; min-width: 0; display: flex; gap: 4px">{board}</div><div style="width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px">{side}</div></div></div></main></div></div>')
html=f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Social de la campaña · Marketing Studio</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&amp;family=Poppins:wght@500;600;700&amp;display=swap">
{css}
</helmet>
{ui}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview": {{"width": 1440, "height": 860}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''
open('canvas/project/MS-Social.dc.html','w').write(html); print('ok',len(html))
