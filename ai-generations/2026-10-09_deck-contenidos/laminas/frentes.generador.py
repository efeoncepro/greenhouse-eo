import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
ct10=sys.argv[2] if len(sys.argv)>2 else 'c2a9a248573d4d2569e682dd08f5a513'; c10=float(sys.argv[3]) if len(sys.argv)>3 else 0.7
F=[('01','Social media management','Estrategia, sistema editorial, producción nativa y publicación.',ct10,c10),
   ('02','Influencer marketing','Scouting, vetting, activaciones y programas de creadores.','1f4c5744a33383b5fb29e7ec94c2ba89',0.515),
   ('03','Creadores y UGC','Contenido de personas reales, con derechos de uso claros.','d82136f917bd6bfae17078e875cd23e3',0.665),
   ('04','Listening y trendjacking','Escuchar la conversación y entrar a tiempo en lo que importa.','32dc9308b1d334bb81a08ac84c1d68df',0.715),
   ('05','Social care','Atención integral en DM y comentarios, con la voz de tu marca.','317d1793e2e9368498197f2021a4de57',0.675),
   ('06','Paid social','Pauta para que el mejor contenido llegue a la audiencia correcta.','a5f5707306f8573286988c625d1de4cd',0.645)]
X0,SW,GAP,H=694,182,14,820
o=''
for i,(n,t,d,blob,c) in enumerate(F):
    x=X0+i*(SW+GAP); top=96 if i%2==0 else 150
    wi=H*16/9; p=max(0,min(100,100*(c*wi-SW/2)/(wi-SW)))
    o+=f'<div style="position: absolute; left: {x}px; top: {top}px; width: {SW}px; height: {H}px; border-radius: 26px; overflow: hidden; background: #023c70; box-shadow: 0 30px 60px rgba(0, 8, 20, 0.5), 0 0 0 1px rgba(114, 222, 216, 0.22)">'
    o+=f'<img src="/_blob/{blob}" alt="" style="position: absolute; left: 0; top: 0; width: {SW}px; height: {H}px; object-fit: cover; object-position: {p:.1f}% 50%">'
    o+=f'<div style="position: absolute; left: 0; top: 0; width: {SW}px; height: {H}px; background: linear-gradient(180deg, rgba(0, 26, 51, 0.5) 0%, rgba(0, 26, 51, 0) 20%, rgba(0, 26, 51, 0) 50%, rgba(0, 26, 51, 0.9) 72%, #001a33 100%)"></div>'
    o+=f'<div style="position: absolute; left: 18px; top: 18px; {POP}; font-size: 15px; font-weight: 600; letter-spacing: 0.08em; color: #ffffff">{n}</div>'
    o+=f'<div style="position: absolute; left: 18px; right: 14px; bottom: 22px"><div style="{BRI}; font-size: 23px; font-weight: 760; letter-spacing: -0.03em; line-height: 1.02; color: #ffffff">{t}<svg aria-hidden="true" viewBox="0 0 10 10" width="0.3em" height="0.3em" style="margin-left: 0.06em"><circle cx="5" cy="5" r="5" fill="#ff6500"></circle></svg></div><div style="margin-top: 9px; {POP}; font-size: 14px; font-weight: 300; line-height: 1.38; color: #e2e2e2">{d}</div></div></div>'
left=('<div style="position: absolute; left: 140px; top: 120px; width: 520px; display: flex; flex-direction: column">'
 +voice('Qué hacemos','¿Qué hacen por mi marca?','Todo lo<br>social,<br>un solo<br>squad',qsize=34)
 +body('Seis frentes con una estrategia, <b style="font-weight: 600">un</b> calendario y un solo interlocutor.',mw=440)+'</div>')
open(sys.argv[1],'w').write(page('Qué hacemos · Todo lo social, un solo squad',o+left+BUB))
