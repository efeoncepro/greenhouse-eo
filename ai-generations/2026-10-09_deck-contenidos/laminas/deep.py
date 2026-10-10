import sys,os,math,random
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
P=sys.argv[1]
def col(inner,w=600): return f'<div style="position: absolute; left: 140px; top: 120px; width: {w}px; display: flex; flex-direction: column">{inner}</div>'
R=lambda items,mt=24: rows([(IC[i],t) for i,t in items],mt=mt,mw=540,size=19,pad=8)
def foot(t,x=1460,w=420): return f'<div style="position: absolute; left: {x}px; top: 1010px; width: {w}px; text-align: right; {POP}; font-size: 13px; color: #cfe4fa">{t}</div>'

# ── Social listening · radar ────────────────────────────────────────────────
CX,CY,RR=1330,530,360
o=f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(circle 640px at {CX}px {CY}px, rgba(3, 117, 219, 0.5), rgba(3, 117, 219, 0.14) 50%, rgba(0, 26, 51, 0) 76%)"></div>'
o+=f'<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0"><defs><linearGradient id="sw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#72ded8" stop-opacity="0.42"></stop><stop offset="1" stop-color="#72ded8" stop-opacity="0"></stop></linearGradient></defs>'
for i,r in enumerate([RR,RR*0.72,RR*0.44,RR*0.18]):
    o+=f'<circle cx="{CX}" cy="{CY}" r="{r:.0f}" fill="none" stroke="#72ded8" stroke-opacity="{[0.5,0.3,0.26,0.4][i]}" stroke-width="{[2.2,1.4,1.4,1.4][i]}"></circle>'
o+=f'<path d="M{CX-RR} {CY} H{CX+RR} M{CX} {CY-RR} V{CY+RR}" stroke="#72ded8" stroke-opacity="0.22" stroke-width="1.2" fill="none"></path>'
# barrido
a0,a1=math.radians(-78),math.radians(-28)
o+=f'<path d="M{CX} {CY} L{CX+RR*math.cos(a0):.1f} {CY+RR*math.sin(a0):.1f} A{RR} {RR} 0 0 1 {CX+RR*math.cos(a1):.1f} {CY+RR*math.sin(a1):.1f} Z" fill="url(#sw)"></path><path d="M{CX} {CY} L{CX+RR*math.cos(a1):.1f} {CY+RR*math.sin(a1):.1f}" stroke="#72ded8" stroke-width="2.4" stroke-linecap="round"></path>'
random.seed(7)
cols=[('#ffffff',0.95),('#2e8be8',0.95),('#6f89a2',0.9)]
pts=[]
for k in range(64):
    ang=random.uniform(0,2*math.pi); rad=RR*math.sqrt(random.uniform(0.04,0.96)); c,op=random.choices(cols,weights=[5,4,3])[0]; sz=random.choice([4,5,5,6,8,10])
    x,y=CX+rad*math.cos(ang),CY+rad*math.sin(ang)
    if abs(x-(CX+178))<46 and abs(y-(CY-150))<46: continue
    o+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{sz}" fill="{c}" fill-opacity="{op}"></circle>'
ox,oy=CX+178,CY-150
o+=f'<circle cx="{ox}" cy="{oy}" r="30" fill="#ff6500" fill-opacity="0.2"></circle><circle cx="{ox}" cy="{oy}" r="13" fill="#ff6500"></circle><path d="M{ox+16} {oy-12} L{ox+92} {oy-76} H{ox+150}" stroke="#ffffff" stroke-opacity="0.8" stroke-width="1.6" fill="none"></path>'
o+=f'<circle cx="{CX}" cy="{CY}" r="16" fill="#ffffff"></circle></svg>'
o+=f'<div style="position: absolute; left: {ox+158}px; top: {oy-104}px; width: 240px"><div style="{BRI}; font-size: 26px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">Una señal</div><div style="margin-top: 3px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.3; color: #cfe4fa">Un tema que crece y que le sirve a tu marca.</div></div>'
for t,dx,dy,al in [('Tu marca',-RR+26,-RR+6,'left'),('Competencia',RR-206,-RR+6,'right'),('Categoría',-RR+26,RR-40,'left'),('Cultura',RR-206,RR-40,'right')]:
    o+=f'<div style="position: absolute; left: {CX+dx}px; top: {CY+dy}px; width: 180px; text-align: {al}; {POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #e2e2e2">{t}</div>'
leg=[('#2e8be8','Positiva'),('#ffffff','Neutra'),('#6f89a2','Negativa'),('#ff6500','Señal')]
o+=f'<div style="position: absolute; left: {CX-300}px; top: {CY+RR+44}px; width: 600px; display: flex; justify-content: center; gap: 26px; {POP}; font-size: 15px; color: #cfe4fa">'+''.join(f'<span style="display: inline-flex; align-items: center; gap: 8px"><span style="width: 11px; height: 11px; border-radius: 50%; background: {c}"></span>{t}</span>' for c,t in leg)+'</div>'
left=col(voice('04 · Listening · Social listening','¿Qué se dice de mi marca?','De ruido<br>a señales',size=104)
 +body('Seguimos la conversación sobre tu marca, tu competencia y tu categoría, y la convertimos en señales para decidir contenido, pauta y atención.',mt=26,mw=540,size=21)
 +R([('audifonos','Menciones, sentimiento y temas'),('busqueda','Competencia y participación en la conversación'),('rayo','Alertas de alzas y riesgos'),('biblioteca','Informe mensual con oportunidades')]))
open(os.path.join(P,'07b1-listening-radar.dc.html'),'w').write(page('Social listening · De ruido a señales',o+left+foot('Radar ilustrativo, sin datos reales.')+BUB)); print('ok 07b1-listening-radar')

# ── Trendjacking · la ventana ───────────────────────────────────────────────
X0,X1,YB,YT=800,1840,760,250
def curve(t):  # 0..1 -> altura 0..1 (sube rápido, máximo en 0.42, cae)
    return math.exp(-((t-0.42)/0.17)**2) if t<0.42 else math.exp(-((t-0.42)/0.26)**2)
pt=lambda t:(X0+(X1-X0)*t, YB-(YB-YT)*curve(t))
path='M'+' L'.join(f'{pt(i/120)[0]:.1f} {pt(i/120)[1]:.1f}' for i in range(121))
win0,win1=0.2,0.35
area='M'+f'{pt(win0)[0]:.1f} {YB} L'+' L'.join(f'{pt(win0+(win1-win0)*i/40)[0]:.1f} {pt(win0+(win1-win0)*i/40)[1]:.1f}' for i in range(41))+f' L{pt(win1)[0]:.1f} {YB} Z'
late='M'+f'{pt(0.47)[0]:.1f} {YB} L'+' L'.join(f'{pt(0.47+0.53*i/60)[0]:.1f} {pt(0.47+0.53*i/60)[1]:.1f}' for i in range(61))+f' L{X1} {YB} Z'
o=f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 760px 520px at 1300px 500px, rgba(3, 117, 219, 0.44), rgba(3, 117, 219, 0.12) 50%, rgba(0, 26, 51, 0) 76%)"></div>'
o+=f'<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0"><defs><linearGradient id="wn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#72ded8" stop-opacity="0.5"></stop><stop offset="1" stop-color="#72ded8" stop-opacity="0.04"></stop></linearGradient><linearGradient id="lt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f89a2" stop-opacity="0.26"></stop><stop offset="1" stop-color="#6f89a2" stop-opacity="0.02"></stop></linearGradient></defs>'
o+=f'<path d="M{X0} {YB} H{X1}" stroke="#72ded8" stroke-opacity="0.4" stroke-width="1.6"></path><path d="{late}" fill="url(#lt)"></path><path d="{area}" fill="url(#wn)"></path><path d="{path}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>'
marks=[(0.2,'1','Detectamos','La señal aparece en el listening.'),(0.27,'2','Decidimos','¿Va con tu marca? ¿Hay riesgo?'),(0.345,'3','Publicamos','Antes del peak, con tu visto bueno.')]
for t,n,a,b in marks:
    x,y=pt(t); last=n=='3'
    o+=f'<path d="M{x:.1f} {y:.1f} V{YB}" stroke="#72ded8" stroke-opacity="0.6" stroke-width="1.4" stroke-dasharray="4 6"></path>'
    o+=(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="34" fill="#ff6500" fill-opacity="0.22"></circle><circle cx="{x:.1f}" cy="{y:.1f}" r="17" fill="#ff6500"></circle>' if last else f'<circle cx="{x:.1f}" cy="{y:.1f}" r="22" fill="#2e8be8" fill-opacity="0.3"></circle><circle cx="{x:.1f}" cy="{y:.1f}" r="12" fill="#ffffff"></circle>')
px,py=pt(0.42)
o+=f'<path d="M{px:.1f} {py-16:.1f} V{py-66:.1f}" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.4"></path></svg>'
o+=f'<div style="position: absolute; left: {px-90:.0f}px; top: {py-100:.0f}px; width: 180px; text-align: center; {POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #e2e2e2">El peak</div>'
for i,(t,n,a,b) in enumerate(marks):
    x=X0+i*250-10
    o+=f'<div style="position: absolute; left: {x}px; top: {YB+26}px; width: 232px"><div style="{BRI}; font-size: 30px; font-weight: 300; line-height: 1; color: {"#ff6500" if n=="3" else "#cfe4fa"}">0{n}</div><div style="margin-top: 5px; {BRI}; font-size: 27px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{a}</div><div style="margin-top: 5px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.35; color: #cfe4fa">{b}</div></div>'
lx,ly=pt(0.555)
o+=f'<div style="position: absolute; left: {lx-140:.0f}px; top: {YB-150}px; width: 280px; text-align: center"><div style="{BRI}; font-size: 27px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #a6b9cc">Después, es tarde</div><div style="margin-top: 4px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.3; color: #a6b9cc">Sumarse aquí ya se ve forzado.</div></div>'
wx=(pt(win0)[0]+pt(win1)[0])/2
o+=f'<div style="position: absolute; left: {wx-120:.0f}px; top: {YB-52}px; width: 240px; text-align: center; {POP}; font-size: 13px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #001a33"><span style="background: #72ded8; border-radius: 999px; padding: 5px 14px">La ventana</span></div>'
left=col(voice('04 · Listening · Trendjacking','¿Entramos a la tendencia?','A tiempo,<br>o mejor no',size=104)
 +body('Una tendencia dura poco. Tenemos un filtro para decidir rápido y un flujo para publicar mientras sigue <b style="font-weight: 600">viva</b>.',mt=26,mw=540,size=21)
 +R([('corazon','¿Tiene que ver con tu marca?'),('biblioteca','¿Hay riesgo de tono o de derechos?'),('rayo','¿Llegamos antes del peak?'),('like','Aprobación exprés con tu equipo')]))
open(os.path.join(P,'07b3-trendjacking.dc.html'),'w').write(page('Trendjacking · A tiempo, o mejor no',o+left+foot('Curva ilustrativa: cada tendencia tiene su ritmo.')+BUB)); print('ok 07b3-trendjacking')

# ── Social care · cómo respondemos (bandeja construida) ─────────────────────
G="font-family: 'Geist', system-ui, sans-serif"; PP="font-family: 'Poppins', sans-serif"
T1='rgba(47, 43, 61, 0.92)'; T2='rgba(47, 43, 61, 0.72)'; T3='rgba(47, 43, 61, 0.6)'; LN='rgba(47, 43, 61, 0.12)'
def tag(t,c,bg): return f'<span style="font-size: 11.5px; font-weight: 600; color: {c}; background: {bg}; border-radius: 999px; padding: 2px 9px; white-space: nowrap">{t}</span>'
OK=('#11703f','rgba(17, 112, 63, 0.12)'); INF=('#0b5ed7','rgba(11, 94, 215, 0.12)'); WR=('#8a5a00','rgba(255, 183, 3, 0.2)'); ER=('#b3261e','rgba(179, 38, 30, 0.1)')
def conv(n,m,t,c,sel=False):
    return f'<div style="padding: 11px 14px; border-radius: 12px; background: {"rgba(3, 117, 219, 0.10)" if sel else "transparent"}; border: 1px solid {"rgba(11, 94, 215, 0.4)" if sel else "transparent"}"><div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 14px; font-weight: 600; color: {T1}">{n}</span>{tag(t,*c)}</div><div style="margin-top: 3px; font-size: 13px; line-height: 1.3; color: {T2}">{m}</div></div>'
lst=''.join([conv('Lucía M.','¿El cold brew tiene azúcar?','Sugerida por agente',INF,True),conv('Diego R.','¿Hacen envíos a regiones?','Respondió el agente',OK),conv('Paula T.','Mi pedido llegó abierto.','Con Camila',WR),conv('Cafeteando','Queremos 40 para la oficina.','Derivado a ventas',OK),conv('Tomás P.','Esto me cayó mal, cuidado.','Alerta',ER)])
thread=(f'<div style="display: flex; flex-direction: column; gap: 14px; padding: 18px 20px">'
 f'<div style="display: flex; align-items: center; gap: 10px"><span style="width: 36px; height: 36px; border-radius: 50%; background: #bb1954; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600">LM</span><div><div style="font-size: 15px; font-weight: 600; color: {T1}">Lucía M.</div><div style="font-size: 12px; color: {T3}">Mensaje directo · Instagram</div></div></div>'
 f'<div style="align-self: flex-start; max-width: 300px; padding: 11px 14px; border-radius: 16px 16px 16px 4px; background: #eceaf1; font-size: 14.5px; line-height: 1.35; color: {T1}">Hola, ¿el cold brew tiene azúcar? Soy diabética.</div>'
 f'<div style="align-self: flex-end; width: 340px; border-radius: 16px 16px 4px 16px; background: #ffffff; border: 1.5px solid rgba(11, 94, 215, 0.45); box-shadow: 0 8px 24px rgba(47, 43, 61, 0.12)"><div style="display: flex; align-items: center; gap: 8px; padding: 10px 14px 0"><span style="width: 22px; height: 22px; border-radius: 7px; background: #0375db; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700">IA</span><span style="font-size: 12px; font-weight: 600; color: #0b5ed7">Agente de IA · respuesta sugerida</span></div><div style="padding: 8px 14px 10px; font-size: 14.5px; line-height: 1.35; color: {T1}">Hola, Lucía. No lleva azúcar añadida. Te dejo la tabla nutricional completa para que la revises con calma.</div><div style="padding: 0 14px 10px; font-size: 12px; color: {T3}">Fuente: ficha de producto · Cold brew</div><div style="display: flex; gap: 8px; padding: 10px 14px 12px; border-top: 1px solid {LN}"><span style="flex: 1; text-align: center; padding: 8px 0; border-radius: 9px; background: #0375db; color: #ffffff; font-size: 13.5px; font-weight: 600">Enviar</span><span style="flex: 1; text-align: center; padding: 8px 0; border-radius: 9px; border: 1.5px solid rgba(47, 43, 61, 0.2); color: {T1}; font-size: 13.5px; font-weight: 600">Pasar a una persona</span></div></div>'
 f'<div style="align-self: flex-end; display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: {T2}"><span style="width: 8px; height: 8px; border-radius: 50%; background: #8a5a00"></span>Tema de salud: la revisa Camila antes de enviar</div></div>')
kb=(f'<div style="padding: 18px 18px 14px"><div style="{PP}; font-size: 17px; font-weight: 600; color: {T1}">Base de conocimiento</div><div style="margin-top: 3px; font-size: 12.5px; color: {T3}">Lo que el agente usó para responder</div>'
 f'<div style="margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: rgba(3, 117, 219, 0.08); border: 1px solid rgba(11, 94, 215, 0.3)"><div style="display: flex; justify-content: space-between; align-items: center; gap: 8px"><span style="font-size: 14px; font-weight: 600; color: {T1}">Ingredientes y alérgenos</span>{tag("Coincide",*OK)}</div><div style="margin-top: 4px; font-size: 12.5px; line-height: 1.35; color: {T2}">Cold brew: sin azúcar añadida. Tabla nutricional vigente.</div></div>'
 +''.join(f'<div style="padding: 10px 2px; border-top: 1px solid {LN}; font-size: 13.5px; color: {T2}; display: flex; justify-content: space-between"><span>{a}</span><span style="color: {T3}">{b}</span></div>' for a,b in [('Envíos y cobertura','12 respuestas'),('Cambios y devoluciones','8 respuestas'),('Tono y saludo de la marca','guía'),('Ventas para empresas','deriva')])
 +f'<div style="margin-top: 10px; padding: 11px 13px; border-radius: 12px; background: rgba(255, 183, 3, 0.16); font-size: 12.5px; line-height: 1.35; color: #5c3d00"><b style="font-weight: 600">Regla:</b> reclamos y temas de salud siempre pasan por una persona.</div></div>')
ui=(f'<div style="position: absolute; left: 0; top: 0; width: 1060px; height: 590px; border-radius: 24px; overflow: hidden; background: #f8f7fa; {G}; box-shadow: 0 50px 100px rgba(0, 8, 20, 0.6), 0 0 0 1px rgba(114, 222, 216, 0.3); display: flex; flex-direction: column">'
 f'<div style="height: 54px; flex-shrink: 0; display: flex; align-items: center; gap: 14px; padding: 0 20px; background: #ffffff; border-bottom: 1px solid {LN}"><span style="{PP}; font-size: 17px; font-weight: 600; color: {T1}">Bandeja de social care</span><span style="font-size: 12.5px; color: {T3}">Mareas Café · todas las redes</span><span style="margin-left: auto; display: flex; gap: 8px">{tag("3 resueltas por agente",*OK)}{tag("1 con una persona",*WR)}{tag("1 alerta",*ER)}</span></div>'
 f'<div style="flex: 1; min-height: 0; display: flex"><div style="width: 300px; flex-shrink: 0; padding: 12px 10px; border-right: 1px solid {LN}; display: flex; flex-direction: column; gap: 4px; background: #ffffff">{lst}</div><div style="flex: 1; min-width: 0; background: #f8f7fa">{thread}</div><div style="width: 300px; flex-shrink: 0; border-left: 1px solid {LN}; background: #ffffff">{kb}</div></div></div>')
o=f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 820px 560px at 1330px 520px, rgba(3, 117, 219, 0.48), rgba(3, 117, 219, 0.12) 52%, rgba(0, 26, 51, 0) 78%)"></div>'
o+=f'<div style="position: absolute; left: 790px; top: 160px; width: 1060px; height: 590px; perspective: 2600px"><div style="position: absolute; left: 0; top: 0; width: 1060px; height: 590px; transform: rotateY(-11deg) rotateX(4deg) rotateZ(0.5deg); transform-origin: 60% 50%">{ui}</div></div>'
steps=[('01','Base de conocimiento','Preguntas, políticas, tono y respuestas aprobadas.'),('02','Agentes de IA','Responden lo frecuente y clasifican el resto.'),('03','Personas','Casos sensibles, ventas y crisis.')]
o+=f'<div style="position: absolute; left: 820px; top: 812px; width: 1020px; display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 30px">'+''.join(f'<div style="border-top: 1px solid rgba(114, 222, 216, 0.3); padding-top: 12px; display: flex; gap: 14px"><div style="{BRI}; font-size: 34px; font-weight: 300; line-height: 1; color: {"#ff6500" if n=="01" else "#cfe4fa"}">{n}</div><div><div style="{BRI}; font-size: 25px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 5px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.35; color: #cfe4fa">{d}</div></div></div>' for n,t,d in steps)+'</div>'
left=col(voice('05 · Social care · Cómo respondemos','¿Responde una persona o una IA?','Las dos,<br>con una<br>sola voz',size=96,qsize=34)
 +body('Armamos una base de conocimiento de tu marca. Los agentes de IA resuelven lo frecuente al instante y las personas toman lo que pide <b style="font-weight: 600">criterio</b>.',mt=26,mw=560,size=21)
 +R([('biblioteca','La base se arma con tu equipo y se actualiza'),('rayo','Respuesta inmediata en lo frecuente'),('corazon','Una persona en cada caso sensible'),('trofeo','Cada respuesta mejora la base')]),w=620)
fonts='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&amp;display=swap">'
html=page('Social care · Las dos, con una sola voz',o+left+foot('Interfaz ilustrativa con una marca ficticia.')+BUB).replace('<helmet>','<helmet>\n'+fonts)
open(os.path.join(P,'07c1-care-como.dc.html'),'w').write(html); print('ok 07c1-care-como')
