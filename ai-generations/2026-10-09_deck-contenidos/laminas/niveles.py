import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
T=[('Nivel 1','Foundation','Lo esencial, bien operado.',['Estrategia y voz de base','Calendario, copy y publicación','Comunidad en ventana acotada','Listening de base','Reporte mensual'],470,'rgba(3, 117, 219, 0.22)'),
   ('Nivel 2','Growth','Más profundidad y capacidad reactiva.',['Estrategia profunda','Producción ampliada','Comunidad ampliada','Radar de tendencias y contenido reactivo','Reporte mensual con aprendizajes'],590,'rgba(3, 117, 219, 0.38)'),
   ('Nivel 3','Integrated','Varios equipos, varios mercados.',['Varios mercados y gobierno','Coordinación entre equipos','Comunidad intensiva','Inteligencia cultural y social search','Reporte ejecutivo y trimestral'],710,'rgba(3, 117, 219, 0.58)')]
o='<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 820px 620px at 1340px 560px, rgba(3, 117, 219, 0.46), rgba(3, 117, 219, 0.12) 52%, rgba(0, 26, 51, 0) 78%)"></div>'
BASE=884; X0,CW,GAP=760,330,24
o+=f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; perspective: 2600px"><div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform: rotateY(-9deg) rotateX(3deg); transform-origin: 70% 55%">'
for i,(lv,name,tag,items,h,fill) in enumerate(T):
    x=X0+i*(CW+GAP)
    o+=f'<div style="position: absolute; left: {x}px; top: {BASE-h}px; width: {CW}px; height: {h}px; box-sizing: border-box; border-radius: 28px; padding: 30px 28px; background: linear-gradient(180deg, {fill}, rgba(2, 60, 112, 0.3)); border: 1px solid rgba(114, 222, 216, 0.34); box-shadow: 0 34px 70px rgba(0, 8, 20, 0.5); overflow: hidden">'
    o+=f'<div style="position: absolute; right: 8px; bottom: -70px; {BRI}; font-size: 330px; font-weight: 800; letter-spacing: -0.06em; line-height: 1; color: rgba(255, 255, 255, 0.1)">{i+1}</div>'
    o+=f'<div style="position: relative; {POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">{lv}</div><div style="position: relative; margin-top: 4px; {BRI}; font-size: 52px; font-weight: 760; letter-spacing: -0.04em; line-height: 1; color: #ffffff">{name}</div><div style="position: relative; margin-top: 10px; {POP}; font-size: 17px; font-weight: 300; line-height: 1.35; color: #e2e2e2">{tag}</div>'
    o+=f'<div style="position: relative; margin-top: 22px; display: flex; flex-direction: column; {POP}; font-size: 17px; font-weight: 400; line-height: 1.3; color: #ffffff">'
    for it in items:
        o+=f'<div style="display: flex; align-items: flex-start; gap: 11px; padding: 9px 0; border-top: 1px solid rgba(114, 222, 216, 0.2)"><svg aria-hidden="true" viewBox="0 0 62 62" width="13" height="13" style="flex-shrink: 0; margin-top: 4px"><circle cx="31" cy="31" r="24" fill="none" stroke="#72ded8" stroke-width="12"></circle></svg><span>{it}</span></div>'
    o+='</div></div>'
o+='</div></div>'
ad=['Paid social','Creadores','Producción especial','Crisis 24/7','Tiempo real']
o+=f'<div style="position: absolute; left: 760px; top: 946px; width: 1100px; display: flex; align-items: center; gap: 10px; white-space: nowrap"><div style="{POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa; margin-right: 8px">Se suman aparte</div>'
for c in ad: o+=f'<div style="{POP}; font-size: 16px; font-weight: 500; color: #ffffff; border: 1.5px solid rgba(114, 222, 216, 0.45); border-radius: 999px; padding: 7px 15px">{c}</div>'
o+='</div>'
left=('<div style="position: absolute; left: 140px; top: 120px; width: 580px; display: flex; flex-direction: column">'
 +voice('Cómo se arma tu plan','¿Cuánto necesito?','Tres niveles,<br>un mismo<br>método',size=92)
 +body('Cada nivel suma profundidad sobre el anterior. Lo especial se agrega aparte, cuando hace falta.',mt=30,mw=480,size=22)+'</div>'
 +f'<div style="position: absolute; left: 140px; top: 900px; width: 520px; {POP}; font-size: 15px; font-weight: 400; line-height: 1.4; color: #cfe4fa">El alcance de cada nivel se define en la propuesta.</div>')
open(sys.argv[1],'w').write(page('Cómo se arma tu plan · Tres niveles, un mismo método',o+left+BUB))
