# Vista «Resultados» de Marketing Studio (interfaz construida, datos de muestra). Parte de la misma base que MS-Social.
import re,sys,json,os
base=open('work/mssocial.py').read(); exec(base[:base.index("ST={")])
AD=json.load(open('work/adblobs.json'))
def kpi(l,v,s,col='var(--ok)'):
    return f'<div style="flex: 1 1 0; border-radius: 12px; background: var(--base); border: 1px solid var(--line); padding: 14px 20px"><div style="font-size: 14px; color: var(--t3)">{l}</div><div style="margin-top: 2px; {P}; font-size: 40px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; white-space: nowrap; color: var(--t1)">{v}</div><div style="margin-top: 3px; font-size: 13.5px; font-weight: 500; white-space: nowrap; color: {col}">{s}</div></div>'
kpis=kpi('Piezas publicadas','38','de 40 planificadas','var(--info)')+kpi('Interacciones','+24 %','frente al mes previo')+kpi('Mensajes respondidos','92 %','DM y comentarios')+kpi('Contactos desde social','64','9 pidieron cotización','var(--info)')
wk=[('Sem 1',38,14),('Sem 2',46,22),('Sem 3',52,40),('Sem 4',58,62)]
bars=''.join(f'<div style="flex: 1 1 0; display: flex; flex-direction: column; align-items: center; gap: 8px"><div style="width: 72px; height: 372px; display: flex; flex-direction: column; justify-content: flex-end; gap: 3px"><div style="height: {b*3}px; border-radius: 8px 8px 3px 3px; background: #72ded8"></div><div style="height: {a*3}px; border-radius: 3px 3px 8px 8px; background: #0375db"></div></div><span style="font-size: 12.5px; color: var(--t3)">{w}</span></div>' for w,a,b in wk)
chart=(f'<div style="flex: 1 1 0; min-width: 0; border-radius: 12px; background: var(--base); border: 1px solid var(--line); padding: 16px 20px; display: flex; flex-direction: column"><div style="display: flex; align-items: center; gap: 14px"><span style="{P}; font-size: 18px; font-weight: 600; color: var(--t1)">Alcance por semana</span><span style="margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--t2)"><span style="width: 10px; height: 10px; border-radius: 3px; background: #0375db"></span>Orgánico</span><span style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--t2)"><span style="width: 10px; height: 10px; border-radius: 3px; background: #72ded8"></span>Pauta</span></div>'
  f'<div style="flex-grow: 1; display: flex; align-items: flex-end; gap: 10px; padding: 14px 10px 0">{bars}</div><div style="margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: var(--info-bg2); border: 1px solid var(--info-line); font-size: 13px; line-height: 1.35; color: var(--t2)"><b style="font-weight: 600; color: var(--t1)">Lectura:</b> la pauta se concentró desde la semana 3 en las tres piezas que mejor retenían.</div></div>')
nets=[('ig','Instagram',86),('tt','TikTok',72),('li','LinkedIn',34),('yt','YouTube',48)]
def nrow(n,name,p):
    blob,_=NET[n]
    return f'<div style="display: flex; align-items: center; gap: 10px; padding: 9px 0"><span style="width: 26px; height: 26px; border-radius: 8px; background: var(--chip); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0"><img src="/_blob/{blob}" alt="{name}" style="width: 16px; height: 16px"></span><span style="width: 78px; font-size: 13.5px; color: var(--t1)">{name}</span><div style="flex-grow: 1; height: 9px; border-radius: 5px; background: var(--sunk)"><div style="width: {p}%; height: 9px; border-radius: 5px; background: #0375db"></div></div></div>'
netc=(f'<div style="width: 330px; flex-shrink: 0; border-radius: 12px; background: var(--base); border: 1px solid var(--line); padding: 16px 20px"><div style="{P}; font-size: 18px; font-weight: 600; color: var(--t1)">Interacciones por red</div><div style="margin-top: 8px">{"".join(nrow(*n) for n in nets)}</div><div style="margin-top: 8px; font-size: 12.5px; line-height: 1.35; color: var(--t3)">Instagram y TikTok concentran la conversación del lanzamiento.</div>'
 +f'<div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); {P}; font-size: 18px; font-weight: 600; color: var(--t1)">Atención en redes</div>'
 +''.join(f'<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 9px 0; border-top: {"1px solid var(--line)" if i else "none"}"><span style="font-size: 13.5px; color: var(--t2)">{a}</span><span style="{P}; font-size: 20px; font-weight: 600; color: var(--t1); white-space: nowrap">{b}</span></div>' for i,(a,b) in enumerate([('Primera respuesta','38 min'),('Resueltos por agente de IA','61 %'),('Derivados a ventas','9'),('Alertas de reputación','0')]))
 +'</div>')
top=[('ugc','50% 35%','Reseña de Valentina','Instagram · Reel','Retención alta','Pautada'),('hero','50% 60%','Ya llegó Cold brew','Instagram · Reel','Más guardados','Pautada'),('calle','50% 30%','El primer sorbo','TikTok · Video','Más compartidos','Pautada'),('barra','50% 50%','Cómo se prepara','YouTube · Short','Más búsquedas','Orgánica'),('s-pregunta','50% 25%','Barista responde #3','Instagram · Reel','Más respuestas','Orgánica'),('s-feria','55% 35%','Plan de sábado','TikTok · Video','Más comentarios','Orgánica')]
def trow(k,pos,t,n,m,tag):
    c=('var(--info)','var(--info-bg2)','var(--info-line)') if tag=='Pautada' else ('var(--t2)','var(--chip)','var(--line)')
    return f'<div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line)"><span style="position: relative; width: 46px; height: 62px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--sunk)"><img src="/_blob/{AD[k]}" alt="" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; object-position: {pos}"></span><div style="min-width: 0; flex-grow: 1"><div style="font-size: 14.5px; font-weight: 600; color: var(--t1); white-space: nowrap">{t}</div><div style="font-size: 12.5px; color: var(--t3)">{n}</div><div style="margin-top: 2px; font-size: 12.5px; font-weight: 500; color: var(--ok)">{m}</div></div><span style="font-size: 11.5px; font-weight: 600; color: {c[0]}; background: {c[1]}; border: 1px solid {c[2]}; border-radius: 999px; padding: 2px 9px; white-space: nowrap">{tag}</span></div>'
topc=(f'<div style="width: 360px; flex-shrink: 0; border-radius: 12px; background: var(--base); border: 1px solid var(--line); padding: 16px 20px 6px"><div style="{P}; font-size: 18px; font-weight: 600; color: var(--t1)">Piezas que mejor funcionaron</div><div style="margin-top: 8px">{"".join(trow(*t) for t in top)}</div></div>')
head=(f'<header style="height: 60px; flex-shrink: 0; box-sizing: border-box; padding: 0 28px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid var(--line); background: var(--chrome)"><img src="/_blob/d01041cd835458c640e916b3cf452be1" alt="Marketing Studio" style="height: 20px; width: auto; display: block">'
 f'<nav aria-label="Ruta" style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-left: 8px; color: var(--t3)"><span>Campañas</span><span>›</span><span>Lanzamiento Cold brew</span><span>›</span><span style="color: var(--t1); font-weight: 500">Resultados</span></nav></header>')
tabs=''.join(f'<span style="padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: {600 if t=="Resultados" else 500}; color: {"var(--t1)" if t=="Resultados" else "var(--t3)"}; background: {"var(--base)" if t=="Resultados" else "transparent"}; box-shadow: {"0 1px 2px rgba(47, 43, 61, 0.12)" if t=="Resultados" else "none"}">{t}</span>' for t in ['Plan','Social','Creadores','Pauta','Resultados'])
row1=(f'<div style="display: flex; align-items: center; gap: 14px; height: 40px"><h1 style="margin: 0; {P}; font-size: 26px; font-weight: 600; letter-spacing: -0.03em; white-space: nowrap">Lanzamiento Cold brew</h1><span style="font-size: 12px; font-weight: 500; color: var(--t2); background: var(--chip); border-radius: 999px; padding: 4px 10px; white-space: nowrap">Octubre</span><span style="font-size: 12px; font-weight: 600; color: var(--warn); background: var(--warn-bg); border: 1px solid var(--warn-line); border-radius: 999px; padding: 3px 10px; white-space: nowrap">Datos de muestra</span>'
 f'<div style="margin-left: auto; display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--sunk)">{tabs}</div>'
 f'<span style="height: 36px; box-sizing: border-box; padding: 0 14px; border-radius: 9px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #ffffff; background: #0375db; white-space: nowrap">Descargar reporte</span></div>')
ui=(f'<div class="ms" data-theme="light" style="position: relative; width: 1440px; height: 860px; display: flex; background: var(--app); color: var(--t1); {G}; overflow: hidden">{nav}'
 f'<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column">{head}<main style="flex-grow: 1; min-height: 0; overflow: hidden; background: var(--app)"><div style="height: 100%; box-sizing: border-box; padding: 16px 28px 18px; display: flex; flex-direction: column; gap: 14px">{row1}<div style="display: flex; gap: 12px">{kpis}</div>'
 f'<div style="flex-grow: 1; min-height: 0; display: flex; gap: 14px">{chart}{netc}{topc}</div></div></main></div></div>')
html=f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Resultados de la campaña · Marketing Studio</title>
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
open('canvas/project/MS-Resultados.dc.html','w').write(html); print('ok',len(html))
