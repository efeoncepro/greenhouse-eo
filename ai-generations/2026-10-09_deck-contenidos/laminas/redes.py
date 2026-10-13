import math,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
CX,CY,PHI=1360,548,math.radians(-13)
def pt(rx,ry,t):
    a=rx*math.cos(math.radians(t)); b=ry*math.sin(math.radians(t))
    return CX+a*math.cos(PHI)-b*math.sin(PHI), CY+a*math.sin(PHI)+b*math.cos(PHI)
R=[(168,104),(336,214),(500,326)]
# nombre, especialidad, blob, color del halo, anillo, ángulo, lado de la etiqueta
T=[('Instagram','Reels, carruseles y stories.','2d4896e9385e1988c295d8a7c354143d','#e1306c',2,95,'b'),
 ('TikTok','Video nativo y tendencias.','e983c46e29770fefe13aaac3c26b3719','#25f4ee',2,50,'b'),
 ('LinkedIn','Empresa y perfiles personales.','5bf8e95345f1ab5750ee51ed19ac7e8a','#2e8be8',1,140,'b'),
 ('YouTube','Shorts y video largo.','712d531fb65791883c98dd1de90fdc52','#ff0033',2,328,'b'),
 ('Facebook','Comunidad y pauta.','95408181b80b4225771cb3f03d9b7aa8','#1877f2',2,165,'b'),
 ('Pinterest','Descubrimiento e inspiración.','f0be4cc958be7e375f5fcbec3ee55947','#e60023',1,10,'b'),
 ('X','Tiempo real.','b0baf1d0e33ac2923976929a22a6003a','#cfe4fa',2,283,'b'),
 ('Threads','Conversación.','8f991007d4cebad4fd36140f067aa7e7','#cfe4fa',1,250,'b'),
 ('Twitch','Streaming en vivo.','4a57eb5eb0823b2caedd2b109c44c7ec','#9146ff',2,215,'b')]
o='<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 760px 560px at 1360px 548px, rgba(3, 117, 219, 0.42), rgba(3, 117, 219, 0.12) 46%, rgba(0, 26, 51, 0) 72%)"></div>'
o+='<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0">'
for i,(rx,ry) in enumerate(R):
    o+=f'<ellipse cx="{CX}" cy="{CY}" rx="{rx}" ry="{ry}" transform="rotate(-13 {CX} {CY})" fill="none" stroke="#72ded8" stroke-opacity="{[0.5,0.34,0.24][i]}" stroke-width="{[2,1.6,1.4][i]}"></ellipse>'
o+='</svg>'
# centro: tu marca
o+=f'<div style="position: absolute; left: {CX-150}px; top: {CY-150}px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.34), rgba(3, 117, 219, 0.3) 38%, rgba(3, 117, 219, 0) 70%)"></div>'
o+=f'<div style="position: absolute; left: {CX-62}px; top: {CY-62}px; width: 124px; height: 124px; border-radius: 50%; background: radial-gradient(circle at 34% 30%, #ffffff, #cfe4fa 38%, #2e8be8 78%, #0375db); box-shadow: 0 0 70px 14px rgba(46, 139, 232, 0.6), inset -10px -14px 26px rgba(2, 60, 112, 0.5)"></div>'
o+=f'<div style="position: absolute; left: {CX-90}px; top: {CY+74}px; width: 180px; text-align: center; {POP}; font-size: 14px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #e2e2e2">Tu marca</div>'
tiles=[]
for name,spec,blob,col,ring,t,side in T:
    rx,ry=R[ring]; x,y=pt(rx,ry,t)
    depth=(math.sin(math.radians(t))+1)/2          # 0 atrás, 1 adelante
    s=round((118 if ring==2 else 104)*(0.74+0.42*depth))
    tiles.append((depth,name,spec,blob,col,x,y,s))
for depth,name,spec,blob,col,x,y,s in sorted(tiles):
    g=round(s*2.5); op=round(0.62+0.38*depth,2)
    o+=f'<div style="position: absolute; left: {x-g/2:.0f}px; top: {y-g/2:.0f}px; width: {g}px; height: {g}px; border-radius: 50%; background: radial-gradient(circle, {col} 8%, rgba(0, 26, 51, 0) 66%); opacity: {round(0.72+0.26*depth,2)}"></div>'
    o+=f'<div style="position: absolute; left: {x-s/2:.0f}px; top: {y-s/2:.0f}px; width: {s}px; height: {s}px; border-radius: {round(s*0.27)}px; background: #ffffff; box-shadow: 0 {round(s*0.22)}px {round(s*0.5)}px rgba(0, 8, 20, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.5); display: flex; align-items: center; justify-content: center"><img src="/_blob/{blob}" alt="{name}" style="width: {round(s*0.56)}px; height: {round(s*0.56)}px"></div>'
    ns=round(22+10*depth); ss=round(14+3*depth)
    o+=f'<div style="position: absolute; left: {x-130:.0f}px; top: {y+s/2+12:.0f}px; width: 260px; text-align: center; opacity: {op}"><div style="{BRI}; font-size: {ns}px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff; text-shadow: 0 2px 14px rgba(0, 26, 51, 0.9)">{name}</div><div style="margin-top: 3px; {POP}; font-size: {ss}px; font-weight: 300; line-height: 1.3; color: #cfe4fa; text-shadow: 0 2px 12px rgba(0, 26, 51, 0.95)">{spec}</div></div>'
left=('<div style="position: absolute; left: 140px; top: 120px; width: 700px; display: flex; flex-direction: column">'
 +voice('Las redes que atendemos','¿En qué redes trabajan?','Especialistas<br>en cada red')
 +body('Cada red tiene su idioma. Producimos, publicamos y atendemos de forma <b style="font-weight: 600">nativa</b> en cada una.',mw=500)
 +'</div>'
 +f'<div style="position: absolute; left: 140px; top: 890px; width: 520px; {POP}; font-size: 17px; font-weight: 400; line-height: 1.4; color: #cfe4fa">¿Tu audiencia está en otra red? También la evaluamos.</div>')
open(sys.argv[1],'w').write(page('Redes · Especialistas en cada red',o+left+BUB))
