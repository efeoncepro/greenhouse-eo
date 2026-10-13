import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
W=[('1','Semana 1','Plan','Calendario del mes para tu aprobación, con temas que salen del listening.',[1,1,2,0,0,0,0]),
   ('2','Semana 2','Producción','Piezas por formato y contenido con creadores, en rondas pactadas.',[1,2,2,2,1,0,0]),
   ('3','Semana 3','En vivo','Publicación, campañas de pauta y activaciones en curso.',[2,2,2,2,2,1,1]),
   ('4','Semana 4','Lectura','Reporte de resultados, reunión y plan del mes siguiente.',[1,1,1,2,2,0,0])]
o='<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 820px 600px at 1380px 500px, rgba(3, 117, 219, 0.46), rgba(3, 117, 219, 0.12) 52%, rgba(0, 26, 51, 0) 78%)"></div>'
o+='<div style="position: absolute; left: 820px; top: 96px; width: 1040px; height: 800px; perspective: 2600px"><div style="position: absolute; left: 0; top: 0; width: 1040px; display: flex; flex-direction: column; gap: 16px; transform: rotateY(-13deg) rotateX(5deg) rotateZ(0.6deg); transform-origin: 60% 50%">'
fills=['rgba(3, 117, 219, 0.2)','rgba(3, 117, 219, 0.32)','rgba(3, 117, 219, 0.5)','rgba(3, 117, 219, 0.3)']
for i,(n,wk,t,d,days) in enumerate(W):
    o+=f'<div style="position: relative; height: 176px; border-radius: 26px; background: linear-gradient(100deg, {fills[i]}, rgba(2, 60, 112, 0.34)); border: 1px solid rgba(114, 222, 216, 0.3); box-shadow: 0 30px 60px rgba(0, 8, 20, 0.45); overflow: hidden">'
    o+=f'<div style="position: absolute; left: 22px; top: -34px; {BRI}; font-size: 250px; font-weight: 800; letter-spacing: -0.06em; line-height: 1; color: rgba(255, 255, 255, 0.15)">{n}</div>'
    o+=f'<div style="position: absolute; left: 178px; top: 28px; width: 450px"><div style="{POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">{wk}</div><div style="margin-top: 2px; {BRI}; font-size: 50px; font-weight: 760; letter-spacing: -0.04em; line-height: 1.02; color: #ffffff">{t}</div><div style="margin-top: 8px; {POP}; font-size: 17px; font-weight: 300; line-height: 1.38; color: #e2e2e2">{d}</div></div>'
    o+='<div style="position: absolute; right: 28px; top: 50px; display: flex; gap: 10px">'
    for v in days:
        bg=['rgba(255, 255, 255, 0.07)','rgba(207, 228, 250, 0.3)','#ffffff'][v]
        dot='' if v<2 else '<div style="width: 12px; height: 12px; border-radius: 50%; background: #0375db"></div>'
        o+=f'<div style="width: 46px; height: 76px; border-radius: 14px; background: {bg}; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 12px; box-sizing: border-box">{dot}</div>'
    o+='</div></div>'
o+='</div></div>'
chips=['Publicación','Comunidad y social care','Listening','Optimización de pauta']
o+=f'<div style="position: absolute; left: 860px; top: 918px; width: 1020px; display: flex; align-items: center; gap: 10px; white-space: nowrap"><div style="{POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa; margin-right: 8px">Todos los días</div>'
for c in chips: o+=f'<div style="{POP}; font-size: 16px; font-weight: 500; color: #ffffff; border: 1.5px solid rgba(114, 222, 216, 0.45); border-radius: 999px; padding: 7px 15px">{c}</div>'
o+='</div>'
o+=f'<div style="position: absolute; left: 140px; top: 900px; width: 560px; {POP}; font-size: 15px; font-weight: 400; color: #cfe4fa">Ejemplo de un mes tipo. El ritmo se acuerda en cada plan.</div>'
left=('<div style="position: absolute; left: 140px; top: 120px; width: 640px; display: flex; flex-direction: column">'
 +voice('Tu mes con nosotros','¿Qué recibo cada mes?','Cada mes<br>sabes qué<br>recibes')+'</div>')
open(sys.argv[1],'w').write(page('Tu mes con nosotros · Cada mes sabes qué recibes',o+left+BUB))
