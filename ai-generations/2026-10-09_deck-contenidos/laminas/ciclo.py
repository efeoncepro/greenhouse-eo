import math,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
CX,CY,R=1350,560,292
N=[('01','Escuchar','Listening, tendencias y comunidad.',-90,'t'),
   ('02','Planificar','Pilares, calendario y creadores.',-18,'r'),
   ('03','Producir','Piezas nativas y contenido con creadores.',54,'r'),
   ('04','Publicar y atender','Canales, pauta y social care.',126,'l'),
   ('05','Medir','Resultados y plan del ciclo siguiente.',198,'l')]
o=f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(circle 600px at {CX}px {CY}px, rgba(3, 117, 219, 0.5), rgba(3, 117, 219, 0.14) 50%, rgba(0, 26, 51, 0) 76%)"></div>'
o+=f'<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0"><circle cx="{CX}" cy="{CY}" r="{R+70}" fill="none" stroke="#72ded8" stroke-opacity="0.12" stroke-width="1.4"></circle><circle cx="{CX}" cy="{CY}" r="{R}" fill="none" stroke="#72ded8" stroke-opacity="0.5" stroke-width="2.4"></circle>'
# flechas de sentido entre nodos
for k in range(5):
    a=math.radians(-90+72*k+36); x,y=CX+R*math.cos(a),CY+R*math.sin(a); deg=-90+72*k+36+90
    o+=f'<path d="M-9 -8 L5 0 L-9 8" transform="translate({x:.1f} {y:.1f}) rotate({deg:.0f})" fill="none" stroke="#72ded8" stroke-opacity="0.9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>'
for num,name,desc,deg,side in N:
    a=math.radians(deg); x,y=CX+R*math.cos(a),CY+R*math.sin(a)
    o+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="40" fill="#2e8be8" fill-opacity="0.22"></circle><circle cx="{x:.1f}" cy="{y:.1f}" r="22" fill="#ffffff"></circle>'
o+='</svg>'
o+=f'<img src="/_blob/1a18e3d33a77490b564b9d5c097b7da1" alt="" style="position: absolute; left: {CX-150}px; top: {CY-176}px; width: 300px; height: 300px; filter: drop-shadow(0 26px 40px rgba(0, 8, 20, 0.55))">'
o+=f'<div style="position: absolute; left: {CX-140}px; top: {CY+112}px; width: 280px; text-align: center"><div style="{POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Al centro</div><div style="{BRI}; font-size: 44px; font-weight: 760; letter-spacing: -0.04em; line-height: 1; color: #ffffff">Tu marca</div></div>'
for num,name,desc,deg,side in N:
    a=math.radians(deg); x,y=CX+R*math.cos(a),CY+R*math.sin(a)
    o+=f'<div style="position: absolute; left: {x-22:.0f}px; top: {y-13:.0f}px; width: 44px; text-align: center; {POP}; font-size: 15px; font-weight: 600; line-height: 26px; color: #001a33">{num}</div>'
    W=250
    if side=='t': st=f'left: {x-W/2-40:.0f}px; top: {y-128:.0f}px; width: {W+80}px; text-align: center'
    elif side=='r': st=f'left: {x+48:.0f}px; top: {y-34:.0f}px; width: {W}px; text-align: left'
    else: st=f'left: {x-48-W:.0f}px; top: {y-34:.0f}px; width: {W}px; text-align: right'
    o+=f'<div style="position: absolute; {st}"><div style="{BRI}; font-size: 36px; font-weight: 740; letter-spacing: -0.03em; line-height: 1.02; color: #ffffff">{name}</div><div style="margin-top: 6px; {POP}; font-size: 17px; font-weight: 300; line-height: 1.35; color: #cfe4fa">{desc}</div></div>'
left=('<div style="position: absolute; left: 140px; top: 120px; width: 660px; display: flex; flex-direction: column">'
 +voice('Cómo trabajamos','¿Cómo trabajan mes a mes?','Cada ciclo<br>suma al<br>anterior')
 +body('Los seis frentes operan como un solo sistema: lo que se aprende en un ciclo entra al siguiente.',mw=480)+'</div>')
open(sys.argv[1],'w').write(page('Cómo trabajamos · Cada ciclo suma al anterior',o+left+IND+BUB))
