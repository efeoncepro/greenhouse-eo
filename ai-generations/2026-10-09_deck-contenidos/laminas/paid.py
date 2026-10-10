import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
P=sys.argv[1]; B=json.load(open(sys.argv[2]))
NET={'ig':('2d4896e9385e1988c295d8a7c354143d','Instagram'),'tt':('e983c46e29770fefe13aaac3c26b3719','TikTok'),'li':('5bf8e95345f1ab5750ee51ed19ac7e8a','LinkedIn'),'yt':('712d531fb65791883c98dd1de90fdc52','YouTube')}
HEART='<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.200 3.100 4.500 6.600 4.500c2 0 3.500 1 5.400 3.100 1.900-2.100 3.400-3.100 5.400-3.100 3.500 0 5.700 3.700 4.200 7.300C19.500 16.400 12 21 12 21z"></path></svg>'
BUBB='<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 3.500c5 0 9 3.400 9 7.700s-4 7.700-9 7.700c-.9 0-1.800-.1-2.600-.300L5 21l.9-3.600C4.100 16 3 13.900 3 11.200c0-4.300 4-7.700 9-7.700z"></path></svg>'
SEND='<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10 14"></path><path d="M21 3l-7 18-4-7-7-4 18-7z"></path></svg>'
def avatar(sz,txt,bg='#0375db'):
    return f'<span style="width: {sz}px; height: {sz}px; border-radius: 50%; background: {bg}; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; {POP}; font-size: {round(sz*0.42)}px; font-weight: 600; flex-shrink: 0; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9)">{txt}</span>'
def shell(x,y,w,h,inner,glow=None,rot=0):
    g=f', 0 0 0 2px {glow}, 0 0 70px 6px {glow}' if glow else ''
    r=f'; transform: rotate({rot}deg)' if rot else ''
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; box-sizing: border-box; padding: 8px; border-radius: 44px; background: #06121f; box-shadow: 0 40px 80px rgba(0, 8, 20, 0.6), 0 0 0 1px rgba(114, 222, 216, 0.25){g}{r}">'
            f'<div style="position: relative; width: 100%; height: 100%; border-radius: 36px; overflow: hidden; background: #0b1a2b">{inner}</div></div>')
def shade(): return '<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(0, 8, 20, 0.5) 0%, rgba(0, 8, 20, 0) 22%, rgba(0, 8, 20, 0) 52%, rgba(0, 8, 20, 0.82) 100%)"></div>'
def pic(blob,alt,pos='50% 50%'): return f'<img src="/_blob/{blob}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; object-position: {pos}">'
def side(): return f'<div style="position: absolute; right: 12px; bottom: 150px; display: flex; flex-direction: column; gap: 18px; align-items: center">{HEART}{BUBB}{SEND}</div>'
def vertical(blob,alt,who,ini,line,tag,cta,cta_bg='#ffffff',cta_col='#001a33',avbg='#0375db',pos='50% 50%',collab=None):
    name=f'<span style="font-weight: 600">{who}</span>'+(f'<span style="font-weight: 300"> · {collab}</span>' if collab else '')
    return (pic(blob,alt,pos)+shade()+side()
     +f'<div style="position: absolute; left: 16px; right: 56px; bottom: 82px; {POP}; color: #ffffff"><div style="display: flex; align-items: center; gap: 9px; font-size: 14px; line-height: 1.2">{avatar(32,ini,avbg)}<div>{name}<div style="margin-top: 2px"><span style="font-size: 11px; font-weight: 600; letter-spacing: 0.04em; background: rgba(255, 255, 255, 0.24); border-radius: 5px; padding: 2px 7px">{tag}</span></div></div></div><div style="margin-top: 9px; font-size: 13.5px; font-weight: 400; line-height: 1.3">{line}</div></div>'
     +(f'<div style="position: absolute; left: 14px; right: 14px; bottom: 18px; height: 46px; border-radius: 12px; background: {cta_bg}; color: {cta_col}; {POP}; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; box-sizing: border-box"><span>{cta}</span><span>›</span></div>' if cta else ''))
def tile(x,y,net,s=62):
    blob,name=NET[net]
    return f'<div style="position: absolute; left: {x}px; top: {y}px; width: {s}px; height: {s}px; border-radius: {round(s*0.27)}px; background: #ffffff; box-shadow: 0 14px 30px rgba(0, 8, 20, 0.5); display: flex; align-items: center; justify-content: center"><img src="/_blob/{blob}" alt="{name}" style="width: {round(s*0.56)}px; height: {round(s*0.56)}px"></div>'
def cap(x,y,w,k,t,d,align='center'):
    return f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; text-align: {align}"><div style="{POP}; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">{k}</div><div style="margin-top: 3px; {BRI}; font-size: 25px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 4px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.3; color: #cfe4fa">{d}</div></div>'
GLOW=lambda cx,cy: f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse 760px 560px at {cx}px {cy}px, rgba(3, 117, 219, 0.46), rgba(3, 117, 219, 0.12) 50%, rgba(0, 26, 51, 0) 76%)"></div>'

# ── A · UGC patrocinado ────────────────────────────────────────────────────
o=GLOW(1340,540)
x1,y1,w1,h1=800,250,300,610; x2,y2,w2,h2=1210,170,350,710
o+=shell(x1,y1,w1,h1,vertical(B['ugc'],'Una creadora recomienda un cold brew desde su cocina, en un video grabado con su teléfono.','vale.rios','VR','Mi cold brew de todas las mañanas.','Publicación','',avbg='#bb1954',pos='50% 40%'),rot=-3)
o+=shell(x2,y2,w2,h2,vertical(B['ugc'],'El mismo video de la creadora, ahora como anuncio con etiqueta de colaboración pagada y botón de compra.','vale.rios','VR','Mi cold brew de todas las mañanas.','Publicidad','Comprar ahora',avbg='#bb1954',pos='50% 40%',collab='con Mareas Café'),glow='rgba(46, 139, 232, 0.55)',rot=2)
o+=tile(x1-26,y1-22,'ig')+tile(x2-28,y2-24,'ig',68)+tile(x2+50,y2-24,'tt',68)
# flecha entre teléfonos
o+=f'<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0"><path d="M{x1+w1+16} 566 H{x2-34}" fill="none" stroke="#72ded8" stroke-width="5" stroke-linecap="round"></path><path d="M{x2-40} 550 L{x2-12} 566 L{x2-40} 582 Z" fill="#72ded8" stroke="#72ded8" stroke-width="3" stroke-linejoin="round"></path>'
calls=[(y2+520,y2+560,'El creador','Sale desde su perfil, con su voz.'),(y2+596,y2+588,'La etiqueta','Colaboración pagada, a la vista.'),(y2+672,y2+662,'La acción','Un botón que lleva a comprar.')]
for cy,ty,t,d in calls:
    o+=f'<path d="M{x2+w2+4} {ty} L{x2+w2+62} {cy}" stroke="#72ded8" stroke-opacity="0.8" stroke-width="1.6" fill="none"></path><circle cx="{x2+w2+4}" cy="{ty}" r="5" fill="#ffffff"></circle>'
o+='</svg>'
for cy,ty,t,d in calls:
    o+=f'<div style="position: absolute; left: {x2+w2+74}px; top: {cy-22}px; width: 250px"><div style="{BRI}; font-size: 24px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 3px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.3; color: #cfe4fa">{d}</div></div>'
o+=f'<div style="position: absolute; left: {x1+w1-10}px; top: 512px; width: {x2-x1-w1+20}px; text-align: center; {POP}; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #001a33; white-space: nowrap"><span style="background: #72ded8; border-radius: 999px; padding: 5px 12px">+ pauta</span></div>'
o+=cap(x1-30,y1+h1+22,w1+60,'1 · Orgánico','La publicación del creador','Contenido real, con derechos de uso por contrato.')
o+=cap(x2-30,y2+h2+22,w2+60,'2 · Patrocinado','El mismo video, como anuncio','')
left=('<div style="position: absolute; left: 140px; top: 120px; width: 600px; display: flex; flex-direction: column">'
 +voice('06 · Paid social · UGC patrocinado','¿Y si no parece anuncio?','La voz de<br>un creador,<br>con pauta',size=92)
 +body('Tomamos el contenido que ya hicieron creadores y clientes reales y lo amplificamos como anuncio desde su <b style="font-weight: 600">propio</b> perfil.',mt=26,mw=540,size=21)
 +rows([(IC['aro'],'Partnership ads en Instagram y Facebook'),(IC['reproducir'],'Spark Ads en TikTok'),(IC['megafono'],'Thought Leader Ads en LinkedIn'),(IC['biblioteca'],'Uso pagado, whitelisting y plazos por contrato')],mt=24,mw=540,size=19,pad=8)+'</div>')
foot=f'<div style="position: absolute; left: 1560px; top: 1010px; width: 320px; text-align: right; {POP}; font-size: 13px; color: #cfe4fa">Ejemplo ilustrativo con una marca y una creadora ficticias.</div>'
open(os.path.join(P,'07d1-paid-ugc.dc.html'),'w').write(page('Paid social · UGC patrocinado',o+left+foot+BUB)); print('ok 07d1-paid-ugc')

# ── B · Anuncios por canal ─────────────────────────────────────────────────
o=GLOW(1330,520)
PW,PH,X0,GAPX=252,560,784,22
def li_feed(blob):
    return (f'<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: #f3f2ef"></div>'
     f'<div style="position: absolute; left: 0; right: 0; top: 54px; background: #ffffff; {POP}; color: #1d2226"><div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px 6px"><span style="width: 34px; height: 34px; border-radius: 6px; background: #0375db; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0">MC</span><div style="line-height: 1.2"><div style="font-size: 13px; font-weight: 600">Mareas Café</div><div style="font-size: 10.5px; color: #666666">Promocionado</div></div></div><div style="padding: 0 12px 8px; font-size: 12px; line-height: 1.3">Cold brew para tu oficina, listo cada lunes.</div><div style="position: relative; width: 100%; height: 250px; overflow: hidden"><img src="/_blob/{blob}" alt="Botellas de cold brew sobre fondo naranja, en un anuncio para empresas." style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 50%"></div><div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 12px 11px; background: #eef3f8"><div style="font-size: 12px; font-weight: 600; line-height: 1.2">Plan para equipos</div><span style="font-size: 11.5px; font-weight: 600; color: #0a66c2; border: 1.5px solid #0a66c2; border-radius: 999px; padding: 4px 10px; white-space: nowrap">Cotizar</span></div></div>'
     f'<div style="position: absolute; left: 0; right: 0; top: 0; height: 46px; background: #ffffff; border-bottom: 1px solid #e0dfdc"></div><div style="position: absolute; left: 12px; top: 13px; width: 150px; height: 20px; border-radius: 5px; background: #edf3f8"></div>')
PH_=[('ig','Instagram · Reels','9:16','Gancho en los primeros segundos.',vertical(B['hero'],'Cold brew cayendo sobre hielo con una salpicadura, sobre fondo turquesa.','mareascafe','MC','Cold brew recién hecho. Frío de verdad.','Publicidad','Más información',pos='50% 60%'),-3,0),
     ('tt','TikTok · In-feed','9:16','Ritmo y sonido nativos.',vertical(B['calle'],'Un creador camina por la calle y muestra su cold brew a la cámara.','mareascafe','MC','El café de la tarde, pero helado.','Patrocinado','Comprar',cta_bg='#fe2c55',cta_col='#ffffff',pos='50% 35%'),2,44),
     ('li','LinkedIn · Feed','1:1','Oferta clara para negocio.',li_feed(B['flat']),-2,10),
     ('yt','YouTube · Shorts','9:16','Vertical, directo y breve.',vertical(B['barra'],'Dos manos preparan un cold brew con leche en la barra de un café.','Mareas Café','MC','Así se prepara en 15 segundos.','Patrocinado','Visitar sitio',pos='50% 50%'),3,56)]
for i,(net,k,ratio,d,inner,rot,dy) in enumerate(PH_):
    x=X0+i*(PW+GAPX); y=140+dy
    o+=shell(x,y,PW,PH,inner,rot=rot)+tile(x-18,y-20,net,58)
    o+=cap(x-24,y+PH+24,PW+48,ratio,k,d)
left=('<div style="position: absolute; left: 140px; top: 120px; width: 600px; display: flex; flex-direction: column">'
 +voice('06 · Paid social · Formatos por canal','¿Por qué pasan de largo?','Anuncios<br>que detienen<br>el scroll',size=92)
 +body('Cada anuncio se diseña para su red: formato, duración, gancho y llamado a la acción <b style="font-weight: 600">propios</b>, no una pieza recortada.',mt=26,mw=540,size=21)
 +rows([(IC['rayo'],'Gancho visual desde el primer segundo'),(IC['encuadre'],'Formato y zona segura de cada red'),(IC['cursor'],'Llamado a la acción nativo'),(IC['paleta'],'Variantes para testing creativo')],mt=24,mw=540,size=19,pad=8)+'</div>')
foot=f'<div style="position: absolute; left: 1460px; top: 1010px; width: 420px; text-align: right; {POP}; font-size: 13px; color: #cfe4fa">Ejemplos ilustrativos con una marca ficticia.</div>'
open(os.path.join(P,'07d1b-paid-formatos.dc.html'),'w').write(page('Paid social · Anuncios que detienen el scroll',o+left+foot+BUB)); print('ok 07d1b-paid-formatos')
