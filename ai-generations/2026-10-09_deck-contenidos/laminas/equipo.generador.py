import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
T=[('82fc2e34910bc1beb0205b814978e0d8','Andrés','Senior Visual Designer',800,330,196,330,0.88),
   ('315f74125f08bb18dc686f552658afa1','Valentina','Content Lead',986,296,212,372,0.94),
   ('67c735cc0d53914503a9df181d2b6d7d','Julio','Responsable de Cuenta',1190,232,292,450,1),
   ('3abb54871994871ccf145ecd6c308047','Daniela','Creative Operations Lead',1474,296,212,372,0.94),
   ('00f5ac6d8fa9aac2cc35bd61e24a4b78','Melkin','Senior Visual Designer',1678,330,196,330,0.88)]
o='<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 800px 520px at 1330px 560px, rgba(3, 117, 219, 0.42), rgba(3, 117, 219, 0.1) 52%, rgba(0, 26, 51, 0) 78%)"></div>'
o+='<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0"><ellipse cx="1336" cy="850" rx="560" ry="112" fill="none" stroke="#72ded8" stroke-opacity="0.4" stroke-width="2"></ellipse><path d="M 836 900 A 560 112 0 0 0 1736 928" fill="none" stroke="#ff6500" stroke-width="5" stroke-linecap="round"></path></svg>'
order=[0,4,1,3,2]
for i in order:
    blob,name,role,x,y,w,h,op=T[i]; main=i==2
    o+=(f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; border-radius: 22px; overflow: hidden; background: linear-gradient(180deg, #06305a, #021f3d); border: {"2px solid #ff6500" if main else "1px solid rgba(114, 222, 216, 0.28)"}; box-shadow: 0 30px 60px rgba(0, 8, 20, 0.55); opacity: {op}">'
        f'<img src="/_blob/{blob}" alt="{name}, {role}" style="position: absolute; left: 0; top: 0; width: {w}px; height: {w}px; object-fit: cover; object-position: 50% 20%">'
        f'<div style="position: absolute; left: 0; right: 0; top: {w-40}px; height: 60px; background: linear-gradient(180deg, rgba(2, 31, 61, 0), #021f3d)"></div>'
        f'<div style="position: absolute; left: {22 if main else 16}px; right: 12px; top: {w+(14 if main else 8)}px"><div style="{BRI}; font-size: {30 if main else 23}px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{name}</div><div style="margin-top: 6px; {POP}; font-size: {18 if main else 15}px; font-weight: 300; line-height: 1.25; color: #cfe4fa">{role}</div></div></div>')
o+=f'<div style="position: absolute; left: 1136px; top: 800px; width: 400px; text-align: center"><div style="{BRI}; font-size: 44px; font-weight: 760; letter-spacing: -0.04em; line-height: 1; color: #ffffff">Tu marca</div><div style="margin-top: 6px; {POP}; font-size: 19px; font-weight: 300; color: #cfe4fa">al centro de todo</div></div>'
left=('<div style="position: absolute; left: 140px; top: 120px; width: 660px; display: flex; flex-direction: column">'
 +voice('Tu equipo','¿Quién trabaja en mi marca?','Expertos<br>multidisciplinarios',size=80,lh=0.96)
 +body('Un squad que orbita tu marca y <b style="font-weight: 600">un</b> solo interlocutor: tu Responsable de Cuenta.',mt=36,mw=500,size=24)
 +rows([(IC['paleta'],'Diseño, contenido y operación creativa'),(IC['escuadra'],'Estrategia y cuenta en el mismo equipo'),(IC['corazon'],'Personas con nombre, no una bolsa de horas')],mt=34,mw=520,size=20,pad=9)
 +f'<div style="margin-top: 46px; display: flex; align-items: center; gap: 26px"><div style="{BRI}; font-size: 176px; font-weight: 760; letter-spacing: -0.055em; line-height: 0.8; color: #ffffff"><span style="color: #ff6500; margin-right: 0.07em">+</span>85</div><div><div style="{BRI}; font-size: 46px; font-weight: 740; letter-spacing: -0.035em; line-height: 0.98; color: #ffffff">expertos más<br>en Latam</div><div style="margin-top: 12px; {POP}; font-size: 19px; font-weight: 300; line-height: 1.35; color: #cfe4fa; max-width: 270px">La red de Efeonce detrás de tu squad.</div></div></div>'
 +'</div>')
open(sys.argv[1],'w').write(page('Tu equipo · Expertos multidisciplinarios',o+left+BUB))
m=json.load(open('work/blobmap.json'))
for t in T: m[t[0]]='up10/squad-'+{'Andrés':'andres','Valentina':'valentina','Julio':'julio','Daniela':'daniela','Melkin':'melkin'}[t[1]]+'.png'
json.dump(m,open('work/blobmap.json','w'),indent=1)
