import math,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
CX,CY,RX,RY=1320,560,210,300
L=[('Responsable de cuenta','Tu único interlocutor.'),('Creativos de contenido','Diseño, video y copy.'),('Especialista en creadores','Scouting, contratos y activaciones.'),('Listening','Escucha, tendencias y oportunidades.')]
Rr=[('Estratega social','Canales, pilares y calendario.'),('Community y social care','Comunidad, DM y comentarios.'),('Paid social','Audiencias, campañas y optimización.'),('Analista','Medición y reporte.')]
ys=[292,472,652,832]
o=f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 560px 620px at {CX}px {CY}px, rgba(3, 117, 219, 0.55), rgba(3, 117, 219, 0.14) 52%, rgba(0, 26, 51, 0) 78%)"></div>'
o+=f'<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0"><ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}" fill="none" stroke="#72ded8" stroke-opacity="0.45" stroke-width="2"></ellipse><ellipse cx="{CX}" cy="{CY}" rx="{RX+58}" ry="{RY+66}" fill="none" stroke="#72ded8" stroke-opacity="0.12" stroke-width="1.4"></ellipse>'
def node(y,sign,first=False):
    s=max(-0.97,min(0.97,(y-CY)/RY)); x=CX+sign*RX*math.sqrt(1-s*s); yy=CY+RY*s
    lx=CX+sign*(RX+86)
    col='#ffffff'
    return f'<path d="M{lx:.0f} {y} L{x:.1f} {yy:.1f}" stroke="#72ded8" stroke-opacity="0.45" stroke-width="1.6" fill="none"></path><circle cx="{x:.1f}" cy="{yy:.1f}" r="22" fill="{col}" fill-opacity="0.22"></circle><circle cx="{x:.1f}" cy="{yy:.1f}" r="11" fill="{col}"></circle>'
for i,y in enumerate(ys): o+=node(y,-1,i==0)+node(y,1)
o+='</svg>'
o+=f'<img src="/_blob/d685dc20e13f6cab183dc55b3c7c30b4" alt="La nave de Efeonce, el isotipo de la marca, en 3D, vista en gran angular desde la nariz" style="position: absolute; left: {CX-165}px; top: {CY-204}px; width: 330px; height: auto; filter: drop-shadow(0 30px 44px rgba(0, 8, 20, 0.6))">'
def lab(t,d,y,sign):
    W=250
    st=f'left: {CX-RX-100-W}px; text-align: right' if sign<0 else f'left: {CX+RX+100}px; text-align: left'
    return f'<div style="position: absolute; {st}; top: {y-30}px; width: {W}px"><div style="{BRI}; font-size: 28px; font-weight: 740; letter-spacing: -0.03em; line-height: 1.04; color: #ffffff">{t}</div><div style="margin-top: 5px; {POP}; font-size: 16px; font-weight: 300; line-height: 1.35; color: #cfe4fa">{d}</div></div>'
for (t,d),y in zip(L,ys): o+=lab(t,d,y,-1)
for (t,d),y in zip(Rr,ys): o+=lab(t,d,y,1)
left=('<div style="position: absolute; left: 140px; top: 120px; width: 640px; display: flex; flex-direction: column">'
 +voice('Tu equipo','¿Quién trabaja en mi marca?','Un squad,<br>un solo<br>interlocutor',size=96)
 +body('Roles que cubren los seis frentes. El equipo se dimensiona según tu plan.',mw=440)+'</div>')
open(sys.argv[1],'w').write(page('Tu equipo · Un squad, un solo interlocutor',o+left+IND+BUB))
