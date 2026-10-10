# Láminas nuevas (2026-10-10): feed por intereses, probar y escalar, canales cerrados, social→CRM y dos divisorias.
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from ui import *
P=sys.argv[1]; ONLY=set(sys.argv[2:])
def want(n): return not ONLY or n in ONLY
B=AD
ILU='Ejemplo ilustrativo con una marca ficticia.'

# ── 1 · El feed es por intereses ────────────────────────────────────────────
if want('feed'):
    px,py,pw,ph=1150,150,330,700
    o=glow(1320,520)
    inner=(pic(B['calle'],'Un creador camina por la calle y muestra su cold brew a la cámara.','50% 35%')+shade()+side(170)
      +f'<div style="position: absolute; left: 0; right: 0; top: 22px; display: flex; justify-content: center; gap: 22px; {POP}; font-size: 15px; color: #ffffff"><span style="font-weight: 400; opacity: 0.6">Siguiendo</span><span style="font-weight: 600; border-bottom: 2.5px solid #ffffff; padding-bottom: 4px">Para ti</span></div>'
      +f'<div style="position: absolute; left: 16px; right: 56px; bottom: 30px; {POP}; color: #ffffff"><div style="display: flex; align-items: center; gap: 9px; font-size: 14px; line-height: 1.2">{avatar(34,"MC")}<span style="font-weight: 600">mareascafe</span><span style="font-size: 12px; font-weight: 600; border: 1.5px solid #ffffff; border-radius: 8px; padding: 3px 10px">Seguir</span></div><div style="margin-top: 10px; font-size: 14px; font-weight: 400; line-height: 1.3">El café de la tarde, pero helado.</div><div style="margin-top: 8px"><span style="font-size: 11px; font-weight: 600; letter-spacing: 0.04em; background: rgba(255, 255, 255, 0.24); border-radius: 5px; padding: 2px 7px">Sugerido para ti</span></div></div>')
    o+=shell(px,py,pw,ph,inner,glow='rgba(46, 139, 232, 0.5)',rot=2)
    # entradas: intereses
    chips=[(330,'Café de especialidad'),(404,'Recetas en casa'),(478,'Planes de tarde')]
    s=''
    for cy,_ in chips: s+=f'<path d="M1064 {cy} C1110 {cy}, 1100 500, {px-6} 500" fill="none" stroke="#72ded8" stroke-opacity="0.75" stroke-width="2"></path><circle cx="1064" cy="{cy}" r="5" fill="#72ded8"></circle>'
    s+=f'<circle cx="{px-6}" cy="500" r="6" fill="#ffffff"></circle>'
    outs=[(300,330,'Se queda mirando','Los primeros segundos y cuánto ve.'),(470,470,'Lo guarda o lo comparte','Señal de que le sirvió.'),(640,610,'Comenta o busca más','Y le llega a personas parecidas.')]
    for cy,ty,_,_ in outs: s+=f'<path d="M{px+pw+10} {ty} L1544 {cy}" stroke="#72ded8" stroke-opacity="0.8" stroke-width="1.6" fill="none"></path><circle cx="{px+pw+10}" cy="{ty}" r="5" fill="#ffffff"></circle>'
    o+=svg(s)
    o+=f'<div style="position: absolute; left: 800px; top: 250px; width: 270px; {POP}; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Lo que le interesa</div>'
    for cy,t in chips: o+=f'<div style="position: absolute; left: 800px; top: {cy-23}px; width: 264px; box-sizing: border-box; height: 46px; display: flex; align-items: center; padding: 0 18px; border: 1.5px solid rgba(114, 222, 216, 0.5); border-radius: 999px; background: rgba(0, 26, 51, 0.55); {POP}; font-size: 17px; font-weight: 500; color: #ffffff">{t}</div>'
    o+=f'<div style="position: absolute; left: 800px; top: 560px; width: 264px; box-sizing: border-box; height: 46px; display: flex; align-items: center; padding: 0 18px; border: 1.5px dashed rgba(207, 228, 250, 0.45); border-radius: 999px; {POP}; font-size: 17px; font-weight: 400; color: #cfe4fa">No sigue a la marca</div>'
    o+=f'<div style="position: absolute; left: 800px; top: 618px; width: 264px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.35; color: #cfe4fa">Y la pieza le aparece igual.</div>'
    o+=f'<div style="position: absolute; left: 1556px; top: 250px; width: 300px; {POP}; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Lo que decide hasta dónde llega</div>'
    for cy,ty,t,d in outs: o+=f'<div style="position: absolute; left: 1556px; top: {cy-24}px; width: 310px"><div style="{BRI}; font-size: 25px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 4px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.3; color: #cfe4fa">{d}</div></div>'
    o+=cap(px-40,py+ph+26,pw+80,'Para ti','Llega por interés','No por seguir la cuenta.')
    left=col(voice('Lo que cambió · La distribución','¿Quién ve lo que publico?','Cada pieza<br>compite<br>sola',size=104)
      +body('Las redes ya no muestran solo a quien sigues: recomiendan lo que le <b style="font-weight: 600">interesa</b> a cada persona, venga de quien venga.',mt=26,mw=540,size=21)
      +R([('rayo','Los primeros segundos deciden'),('busqueda','Se gana por tema, no por tamaño de cuenta'),('paleta','Varias versiones de cada idea'),('trofeo','Seguidores: una señal, ya no la meta')]))
    write(P,'02b-feed-intereses','Lo que cambió · Cada pieza compite sola',o+left+foot(ILU)+BUB)

# ── 2 · Lo orgánico prueba, la pauta escala ─────────────────────────────────
if want('probar'):
    o=glow(1330,500)
    GX,GY,TW,TH,GG=800,290,106,152,12
    ideas=[('ugc','50% 40%','Una creadora recomienda un cold brew desde su cocina.'),('hero','50% 60%','Cold brew cayendo sobre hielo, sobre fondo turquesa.'),('calle','50% 35%','Un creador muestra su cold brew en la calle.'),('barra','50% 50%','Dos manos preparan un cold brew con leche.')]
    ver=[(1,'50% 50%','A'),(1.45,'50% 30%','B'),(1.9,'40% 62%','C')]
    score=[[0.42,0.86,0.5],[0.9,0.55,0.38],[0.48,0.4,0.82],[0.52,0.6,0.44]]
    win={(0,1),(1,0),(2,2)}
    for i,(k,pos,alt) in enumerate(ideas):
        for j,(z,org,lab) in enumerate(ver):
            x=GX+i*(TW+GG); y=GY+j*(TH+GG); w=(i,j) in win; sc=score[i][j]
            brd='box-shadow: 0 0 0 3px #72ded8, 0 0 34px 4px rgba(114, 222, 216, 0.55)' if w else 'box-shadow: 0 0 0 1px rgba(114, 222, 216, 0.2)'
            o+=(f'<div style="position: absolute; left: {x}px; top: {y}px; width: {TW}px; height: {TH}px; border-radius: 14px; overflow: hidden; background: #0b1a2b; {brd}; opacity: {1 if w else 0.62}">'
                +pic(B[k],alt if j==0 else '',pos,z,org)
                +f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 60px; background: linear-gradient(180deg, rgba(0, 8, 20, 0), rgba(0, 8, 20, 0.85))"></div>'
                +f'<div style="position: absolute; left: 8px; top: 8px; width: 22px; height: 22px; border-radius: 7px; background: {"#72ded8" if w else "rgba(0, 8, 20, 0.6)"}; color: {"#001a33" if w else "#ffffff"}; {POP}; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center">{lab}</div>'
                +f'<div style="position: absolute; left: 9px; right: 9px; bottom: 10px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.28)"><div style="width: {round(sc*100)}%; height: 5px; border-radius: 3px; background: {"#72ded8" if w else "#ffffff"}"></div></div></div>')
    GW=4*TW+3*GG; GH=3*TH+2*GG
    o+=cap(GX,GY-104,GW,'1 · Orgánico','Doce versiones publicadas','Cuatro ideas, tres ganchos cada una.',align='left')
    o+=f'<div style="position: absolute; left: {GX}px; top: {GY+GH+14}px; width: {GW}px; display: flex; align-items: center; gap: 10px; {POP}; font-size: 14px; font-weight: 300; color: #cfe4fa"><span style="width: 46px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.28); display: inline-block; position: relative"><span style="position: absolute; left: 0; top: 0; width: 30px; height: 5px; border-radius: 3px; background: #ffffff"></span></span>Cuánto retiene cada versión</div>'
    # ganadoras
    WX,WY,WW,WH,WG=1392,290,148,316,16
    wins=[('ugc','50% 30%',1.45,'Idea 1 · gancho B'),('hero','50% 50%',1,'Idea 2 · gancho A'),('calle','40% 62%',1.9,'Idea 3 · gancho C')]
    for n,(k,org,z,lab) in enumerate(wins):
        x=WX+n*(WW+WG)
        inner=(pic(B[k],'',ideas[n][1],z,org)+shade()
          +f'<div style="position: absolute; left: 10px; top: 12px"><span style="{POP}; font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; color: #ffffff; background: rgba(255, 255, 255, 0.26); border-radius: 5px; padding: 2px 7px">Publicidad</span></div>'
          +f'<div style="position: absolute; left: 8px; right: 8px; bottom: 10px; height: 30px; border-radius: 9px; background: #ffffff; color: #001a33; {POP}; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; box-sizing: border-box"><span>Comprar</span><span>›</span></div>')
        o+=shell(x,WY,WW,WH,inner,glow='rgba(114, 222, 216, 0.45)',rad=28,pad=5)
        o+=f'<div style="position: absolute; left: {x-10}px; top: {WY+WH+12}px; width: {WW+20}px; text-align: center; {POP}; font-size: 13.5px; font-weight: 400; color: #cfe4fa">{lab}</div>'
    o+=cap(WX,WY-104,3*WW+2*WG,'2 · Pauta','Presupuesto a las tres mejores','Las mismas piezas, ahora como anuncio.',align='left')
    ax1=GX+GW+18; ax2=WX-14; ay=WY+WH//2; LY=GY+GH+120
    o+=svg(arrow(ax1,ay,ax2)
      +f'<path d="M{WX+WW+WG+WW//2} {WY+WH+44} V{LY-18} Q{WX+WW+WG+WW//2} {LY} {WX+WW+WG+WW//2-18} {LY} H{GX+GW//2+18} Q{GX+GW//2} {LY} {GX+GW//2} {LY-18} V{GY+GH+62}" fill="none" stroke="#72ded8" stroke-opacity="0.75" stroke-width="2.4" stroke-dasharray="2 9" stroke-linecap="round"></path><path d="M{GX+GW//2-13} {GY+GH+70} L{GX+GW//2} {GY+GH+46} L{GX+GW//2+13} {GY+GH+70} Z" fill="#72ded8"></path>')
    o+=f'<div style="position: absolute; left: {ax1-20}px; top: {ay-52}px; width: {ax2-ax1+40}px; text-align: center">{pill("+ pauta")}</div>'
    o+=f'<div style="position: absolute; left: {GX+GW//2}px; top: {LY+14}px; width: {WX+WW+WG+WW//2-GX-GW//2}px; text-align: center; {POP}; font-size: 16px; font-weight: 300; color: #cfe4fa">Lo que aprende la pauta vuelve al <b style="font-weight: 600; color: #ffffff">calendario</b>.</div>'
    left=col(voice('06 · Paid social · Probar y escalar','¿Qué contenido pauto?','El que ya<br>funcionó',size=104)
      +body('Lo orgánico es el laboratorio. Publicamos varias versiones, leemos cuál retiene y ponemos presupuesto <b style="font-weight: 600">solo</b> en las que ya funcionaron.',mt=26,mw=540,size=21)
      +R([('paleta','Varias versiones de cada idea'),('busqueda','Lectura de retención, guardados y comentarios'),('megafono','Presupuesto a las piezas ganadoras'),('bombillo','Lo aprendido vuelve al calendario')]))
    write(P,'07d0-probar-escalar','Paid social · Lo orgánico prueba, la pauta escala',o+left+foot('Ejemplo ilustrativo con una marca ficticia: las cantidades son de muestra.',x=1340,w=540)+BUB)

# ── 3 · Comunidad en canales cerrados ───────────────────────────────────────
if want('canales'):
    o=glow(1330,500)
    PW,PH,X0,GAPX=292,600,800,48
    BG='#0c1a29'; HB='#11263b'; OT='#17324d'; ME='#0375db'
    def head(title,sub,av):
        return f'<div style="position: absolute; left: 0; right: 0; top: 0; height: 64px; background: {HB}; border-bottom: 1px solid rgba(114, 222, 216, 0.14); display: flex; align-items: center; gap: 10px; padding: 0 14px; box-sizing: border-box">{av}<div style="{POP}; line-height: 1.2; color: #ffffff"><div style="font-size: 14.5px; font-weight: 600">{title}</div><div style="font-size: 11.5px; font-weight: 300; color: #cfe4fa">{sub}</div></div></div>'
    def bub(t,me=False,name=None,nc='#72ded8',w=None):
        nm=f'<div style="font-size: 11px; font-weight: 600; color: {nc}; margin-bottom: 2px">{name}</div>' if name else ''
        ww=f'width: {w}px; box-sizing: border-box; ' if w else ''
        return f'<div style="align-self: {"flex-end" if me else "flex-start"}; max-width: 214px; {ww}padding: 8px 11px; border-radius: {"14px 14px 4px 14px" if me else "14px 14px 14px 4px"}; background: {ME if me else OT}; {POP}; font-size: 13px; font-weight: 400; line-height: 1.32; color: #ffffff">{nm}{t}</div>'
    def thumb(k,pos,h,alt): return f'<div style="position: relative; width: 100%; height: {h}px; border-radius: 9px; overflow: hidden; margin-bottom: 7px"><img src="/_blob/{B[k]}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; object-position: {pos}"></div>'
    def react(n=2):
        h='<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="#ff6b81"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.200 3.100 4.500 6.600 4.500c2 0 3.500 1 5.400 3.100 1.900-2.100 3.400-3.100 5.400-3.100 3.500 0 5.700 3.700 4.200 7.300C19.500 16.400 12 21 12 21z"></path></svg>'
        return f'<div style="align-self: flex-start; margin-top: -4px; margin-left: 8px; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: {HB}; box-shadow: 0 0 0 1.5px {BG}">{h*n}</div>'
    def body_(items,top=76,bottom=14): return f'<div style="position: absolute; left: 12px; right: 12px; top: {top}px; bottom: {bottom}px; display: flex; flex-direction: column; gap: 9px">{"".join(items)}</div>'
    def inputbar(t): return f'<div style="position: absolute; left: 10px; right: 10px; bottom: 12px; height: 38px; border-radius: 999px; background: {HB}; display: flex; align-items: center; padding: 0 16px; {POP}; font-size: 12.5px; font-weight: 300; color: #cfe4fa">{t}</div>'
    poll=(f'<div style="align-self: flex-start; width: 214px; box-sizing: border-box; padding: 10px 11px; border-radius: 14px 14px 14px 4px; background: {OT}; {POP}; color: #ffffff"><div style="font-size: 13px; font-weight: 600">¿Qué sabor sigue?</div>'
      +''.join(f'<div style="margin-top: 8px"><div style="display: flex; justify-content: space-between; font-size: 12px"><span>{a}</span></div><div style="margin-top: 3px; height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.16)"><div style="width: {p}%; height: 7px; border-radius: 4px; background: {c}"></div></div></div>' for a,p,c in [('Naranja',68,'#72ded8'),('Canela',32,'#cfe4fa')])+'</div>')
    p1=(f'<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: {BG}"></div>'+head('Mareas Café','Canal de difusión',avatar(36,'MC',ring=False))
      +body_([bub(thumb('hero','50% 62%',118,'Cold brew cayendo sobre hielo.')+'Nuevo: cold brew de naranja. Sale el viernes.',w=214),react(3),bub('Para quienes están en el canal: dos por uno este sábado.'),react(2),poll],bottom=58)
      +f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 46px; background: {HB}; display: flex; align-items: center; justify-content: center; {POP}; font-size: 12px; font-weight: 300; color: #cfe4fa">Solo la marca publica en este canal</div>')
    stack=''.join(f'<span style="margin-left: {0 if i==0 else -10}px; display: inline-flex">{avatar(28,t,c)}</span>' for i,(t,c) in enumerate([('MC','#0375db'),('LP','#bb1954'),('AR','#7a4fd6')]))
    p2=(f'<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: {BG}"></div>'+head('Club Mareas','Comunidad · con moderación',f'<span style="display: inline-flex; flex-shrink: 0">{stack}</span>')
      +body_([bub('¿Alguien probó el de naranja con tónica?',name='Lu Paredes',nc='#ff9fb6'),bub(thumb('barra','50% 55%',104,'Dos manos preparan un cold brew con leche.')+'Yo lo hago así, con leche de avena.',name='Andrés R.',nc='#b9a2ff',w=214),bub('Buenísima, Andrés. La subimos a la receta de la semana.',name='Mareas Café · equipo',nc='#72ded8'),bub('¡Me anoto para el sábado!',me=True)],bottom=62)+inputbar('Escribe a la comunidad'))
    shared=(f'<div style="align-self: flex-start; width: 196px; border-radius: 14px; overflow: hidden; background: {OT}; {POP}; color: #ffffff"><div style="display: flex; align-items: center; gap: 7px; padding: 8px 10px">{avatar(22,"MC",ring=False)}<span style="font-size: 12px; font-weight: 600">mareascafe</span></div><div style="position: relative; width: 100%; height: 232px; overflow: hidden"><img src="/_blob/{B["calle"]}" alt="Un creador muestra su cold brew en la calle." style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%"><div style="position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: rgba(0, 8, 20, 0.55); display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff"><path d="M7 4l14 8-14 8z"></path></svg></div></div><div style="padding: 8px 10px; font-size: 12px; font-weight: 300; line-height: 1.3">El café de la tarde, pero helado.</div></div>')
    p3=(f'<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: {BG}"></div>'+head('Cami','Mensaje directo',avatar(36,'C','#bb1954',ring=False))
      +body_([shared,bub('Mira esto. ¿Vamos el sábado?'),bub('¡Sí! Lo guardo.',me=True),bub('Le aviso a Tomás también.')],bottom=62)+inputbar('Mensaje'))
    ph=[(p1,-3,0,'Canal de difusión','La marca habla','Directo a quien eligió seguirte.'),(p2,2,44,'Comunidad','La gente conversa','Un grupo con reglas y moderación.'),(p3,-2,12,'Mensajes','Se recomienda','Lo que se comparte entre amigos.')]
    for i,(inner,rot,dy,k,t,d) in enumerate(ph):
        x=X0+i*(PW+GAPX); y=128+dy
        o+=shell(x,y,PW,PH,inner,rot=rot,bg=BG,glow='rgba(46, 139, 232, 0.4)' if i==1 else None)
        o+=cap(x-24,y+PH+24,PW+48,k,t,d)
    left=col(voice('01 · Social media · Comunidad propia','¿Y fuera del feed?','También en<br>canales<br>cerrados',size=100)
      +body('Mucho de lo que se recomienda hoy pasa en mensajes, grupos y canales de difusión. Ahí construimos una comunidad que <b style="font-weight: 600">eligió</b> escucharte.',mt=26,mw=540,size=21)
      +R([('megafono','Canales de difusión en WhatsApp e Instagram'),('corazon','Comunidades con reglas y moderación'),('estrella','Contenido y beneficios para miembros'),('comentar','Piezas pensadas para compartirse por mensaje')]))
    write(P,'04c-canales-cerrados','Social media · También en canales cerrados',o+left+foot('Interfaces ilustrativas con una marca y personas ficticias.',x=1380,w=500)+BUB)

# ── 5 · Del social al CRM ───────────────────────────────────────────────────
if want('crm'):
    o=glow(1330,500,820,560)
    G="font-family: 'Geist', system-ui, sans-serif"
    T1='rgba(47, 43, 61, 0.92)'; T2='rgba(47, 43, 61, 0.72)'; T3='rgba(47, 43, 61, 0.6)'; LN='rgba(47, 43, 61, 0.12)'
    src=[('ig','Anuncio con formulario','Deja sus datos sin salir de la red.'),('tt','Mensaje directo','Pregunta por precios y queda registrado.'),('li','Enlace con seguimiento','Llega a tu sitio desde una pieza.')]
    SX,SW_,SH=800,300,118; sy=[214,362,510]
    for (net,t,d),y in zip(src,sy):
        blob,name=NET[net]
        o+=(f'<div style="position: absolute; left: {SX}px; top: {y}px; width: {SW_}px; height: {SH}px; box-sizing: border-box; padding: 16px 18px; border-radius: 20px; background: rgba(2, 44, 84, 0.72); box-shadow: 0 0 0 1px rgba(114, 222, 216, 0.28), 0 24px 50px rgba(0, 8, 20, 0.45); display: flex; gap: 14px; align-items: flex-start">'
            f'<span style="width: 46px; height: 46px; border-radius: 13px; background: #ffffff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0"><img src="/_blob/{blob}" alt="{name}" style="width: 26px; height: 26px"></span>'
            f'<div><div style="{BRI}; font-size: 23px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 5px; {POP}; font-size: 14.5px; font-weight: 300; line-height: 1.32; color: #cfe4fa">{d}</div></div></div>')
    CX,CY,CW,CH=1172,222,372,398
    s=''
    for y in sy: s+=f'<path d="M{SX+SW_+6} {y+SH//2} C{SX+SW_+50} {y+SH//2}, {CX-50} {CY+CH//2}, {CX-10} {CY+CH//2}" fill="none" stroke="#72ded8" stroke-opacity="0.8" stroke-width="2.2"></path><circle cx="{SX+SW_+6}" cy="{y+SH//2}" r="5" fill="#72ded8"></circle>'
    s+=f'<circle cx="{CX-10}" cy="{CY+CH//2}" r="6" fill="#ffffff"></circle>'
    PX=1612
    s+=arrow(CX+CW+14,CY+CH//2,PX-18,4)
    o+=svg(s)
    def fld(a,b,last=False): return f'<div style="display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid {LN}"><span style="font-size: 13px; color: {T3}; flex-shrink: 0">{a}</span><span style="font-size: 13.5px; font-weight: 500; color: {T1}; text-align: right">{b}</span></div>'
    card=(f'<div style="position: absolute; left: {CX}px; top: {CY}px; width: {CW}px; height: {CH}px; box-sizing: border-box; border-radius: 22px; overflow: hidden; background: #ffffff; {G}; box-shadow: 0 44px 90px rgba(0, 8, 20, 0.6), 0 0 0 1px rgba(114, 222, 216, 0.3); transform: rotate(-1.5deg)">'
      f'<div style="padding: 16px 20px 14px; background: #f8f7fa; border-bottom: 1px solid {LN}; display: flex; align-items: center; justify-content: space-between"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {T3}">Contacto nuevo en tu CRM</span><span style="font-size: 11.5px; font-weight: 600; color: #8a5a00; background: rgba(255, 183, 3, 0.2); border-radius: 999px; padding: 2px 9px">Datos de muestra</span></div>'
      f'<div style="padding: 18px 20px 6px"><div style="display: flex; align-items: center; gap: 12px"><span style="width: 48px; height: 48px; border-radius: 50%; background: #bb1954; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600">CS</span><div><div style="{POP}; font-size: 20px; font-weight: 600; color: {T1}; line-height: 1.15">Camila Soto</div><div style="font-size: 13.5px; color: {T2}">Compras · Tostaduría Norte</div></div></div>'
      f'<div style="margin-top: 16px">{fld("Origen","Instagram · anuncio")}{fld("Pieza","Reel «Cold brew para tu oficina»")}{fld("Creador","vale.rios")}{fld("Primer contacto","Formulario del anuncio")}{fld("Interés","Plan para equipos")}{fld("Responsable","Equipo comercial")}</div></div></div>')
    o+=card
    st=[('Contacto','Llegó desde social.',2),('Oportunidad','Pidió una cotización.',1),('Cliente','Negocio ganado.',0)]
    PY=250
    ss=f'<path d="M{PX+17} {PY+17} V{PY+17+2*132}" stroke="#72ded8" stroke-opacity="0.4" stroke-width="3" fill="none"></path><path d="M{PX+17} {PY+17} V{PY+17+132}" stroke="#72ded8" stroke-width="3" fill="none"></path>'
    o+=svg(ss)
    for i,(t,d,stt) in enumerate(st):
        y=PY+i*132
        dot=(f'<span style="width: 34px; height: 34px; border-radius: 50%; background: #72ded8; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001a33" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.500L19 7.500"></path></svg></span>' if stt==2 else
             f'<span style="width: 34px; height: 34px; box-sizing: border-box; border-radius: 50%; background: #001a33; border: 3px solid #72ded8; box-shadow: 0 0 0 6px rgba(114, 222, 216, 0.22); flex-shrink: 0"></span>' if stt==1 else
             f'<span style="width: 34px; height: 34px; box-sizing: border-box; border-radius: 50%; background: #001a33; border: 3px solid rgba(114, 222, 216, 0.4); flex-shrink: 0"></span>')
        o+=f'<div style="position: absolute; left: {PX}px; top: {y}px; width: 270px; display: flex; gap: 16px; align-items: flex-start">{dot}<div><div style="{BRI}; font-size: 26px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1; color: {"#ffffff" if stt else "#cfe4fa"}">{t}</div><div style="margin-top: 3px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.3; color: #cfe4fa">{d}</div></div></div>'
    o+=f'<div style="position: absolute; left: {PX}px; top: {PY-56}px; width: 270px; {POP}; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Tu embudo comercial</div>'
    o+=f'<div style="position: absolute; left: {SX}px; top: {sy[0]-56}px; width: 300px; {POP}; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Lo que pasa en redes</div>'
    o+=(f'<div style="position: absolute; left: 800px; top: 760px; width: 1070px; display: flex; align-items: center; gap: 30px; border-top: 1px solid rgba(114, 222, 216, 0.3); padding-top: 26px"><div style="width: 300px"><div style="{BRI}; font-size: 26px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">Lo conectamos con el CRM que ya usas</div></div>'
        f'<img src="/_blob/dbdf8af7e73c67c409bb631ff408a1b6" alt="HubSpot Solutions Partner Program, nivel Gold" style="height: 112px; width: auto"><img src="/_blob/82f3bb831c117e5676b0e58d0d7a354d" alt="Salesforce Partner" style="height: 66px; width: auto"><div style="{POP}; font-size: 15px; font-weight: 300; line-height: 1.35; color: #cfe4fa; max-width: 250px">Efeonce es partner de HubSpot y de Salesforce.</div></div>')
    left=col(voice('Cómo sabes si funciona · Del social al CRM','¿Y eso llega a ventas?','Del<br>comentario<br>al CRM',size=100)
      +body('Conectamos lo que pasa en redes con tu CRM: cada contacto llega con su origen y tu equipo comercial ve qué contenido lo <b style="font-weight: 600">trajo</b>.',mt=26,mw=540,size=21)
      +R([('cursor','Formularios y mensajes que crean el contacto'),('busqueda','Origen por red, pieza y creador'),('escuadra','Seguimiento en HubSpot o Salesforce'),('trofeo','Resultados leídos por negocio ganado')]))
    write(P,'09b-social-crm','Medición · Del comentario al CRM',o+left+foot('Ejemplo ilustrativo con personas y empresas ficticias.',x=1380,w=500)+BUB,fonts='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&amp;display=swap">')

# ── Divisorias: Momentos y Programas ────────────────────────────────────────
FB=json.load(open(os.path.join(S,'work','fotoblobs.json')))
def strips(F,SW=372,GAP=22,H=820,X0=704):
    o=''
    for i,f in enumerate(F):
        n,t,d,blob,c,alt=f[:6]; ih=f[6] if len(f)>6 else H
        x=X0+i*(SW+GAP); top=96 if i%2==0 else 150
        wi=ih*16/9; p=max(0,min(100,100*(c*wi-SW/2)/(wi-SW)))
        o+=f'<div style="position: absolute; left: {x}px; top: {top}px; width: {SW}px; height: {H}px; border-radius: 30px; overflow: hidden; background: #023c70; box-shadow: 0 30px 60px rgba(0, 8, 20, 0.5), 0 0 0 1px rgba(114, 222, 216, 0.22)">'
        o+=f'<img src="/_blob/{blob}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: {SW}px; height: {ih}px; object-fit: cover; object-position: {p:.1f}% 50%">'
        g1,g2,g3=(54,76,100) if ih==H else (round(100*(ih-230)/H),round(100*(ih-50)/H),round(100*ih/H))
        o+=f'<div style="position: absolute; left: 0; top: 0; width: {SW}px; height: {H}px; background: linear-gradient(180deg, rgba(0, 26, 51, 0.5) 0%, rgba(0, 26, 51, 0) 20%, rgba(0, 26, 51, 0) {g1}%, rgba(0, 26, 51, 0.9) {g2}%, #001a33 {g3}%)"></div>'
        o+=f'<div style="position: absolute; left: 24px; top: 22px; {POP}; font-size: 16px; font-weight: 600; letter-spacing: 0.08em; color: #ffffff">{n}</div>'
        o+=f'<div style="position: absolute; left: 24px; right: 22px; bottom: 28px"><div style="{BRI}; font-size: 38px; font-weight: 760; letter-spacing: -0.035em; line-height: 1; color: #ffffff">{" ".join(t.split(" ")[:-1])} <span style="white-space: nowrap">{t.split(" ")[-1]}<svg aria-hidden="true" viewBox="0 0 10 10" width="0.3em" height="0.3em" style="margin-left: 0.06em"><circle cx="5" cy="5" r="5" fill="#ff6500"></circle></svg></span></div><div style="margin-top: 11px; {POP}; font-size: 17px; font-weight: 300; line-height: 1.38; color: #e2e2e2">{d}</div></div></div>'
    return o
def colw(inner): return f'<div style="position: absolute; left: 140px; top: 120px; width: 530px; display: flex; flex-direction: column">{inner}</div>'
if want('momentos'):
    F=[('A','Lanzamientos','Antes, durante y después: un plan en tres tiempos.',FB['CT18'],0.665,'Una estratega de Efeonce descubre un cubo de luz sobre un pedestal.'),
       ('B','Cobertura en vivo','Tu evento contado en redes mientras ocurre.',FB['CT22'],0.722,'Un creador de Efeonce graba un evento en vivo con su teléfono.',600),
       ('C','Crisis y reputación','Protocolo listo para contener antes de que crezca.',FB['CT23'],0.74,'Nexa, con hoodie de Efeonce, cubre un punto naranja con una cúpula de vidrio.')]
    left=colw(voice('Además de lo de siempre','¿Y en los días clave?','Momentos<br>que piden<br>más',size=96,qsize=34)
      +body('Los seis frentes corren todo el año. Hay momentos que necesitan un plan <b style="font-weight: 600">propio</b> y un equipo reforzado por unos días.',mw=470,size=22))
    write(P,'07m-momentos','Momentos · Lanzamientos, en vivo y crisis',strips(F)+left+BUB)
if want('programas'):
    F=[('A','Programa de creadores','Relaciones de largo plazo, no campañas sueltas.',FB['CT17'],0.70,'Un estratega de Efeonce y una creadora cierran un acuerdo con un apretón de manos.'),
       ('B','Ejecutivos en LinkedIn','La voz de tus líderes, con método y acompañamiento.',FB['CT15'],0.72,'Una estratega de Efeonce trabaja con una ejecutiva en una sesión de contenido.'),
       ('C','Embajadores de marca','Tu equipo como canal, con formación y contenido listo.',FB['CT14'],0.665,'Una estratega de Efeonce activa a dos colaboradores desde sus teléfonos.')]
    left=colw(voice('Programas','¿Quién más habla por mí?','Programas<br>que suman<br>voces',size=96,qsize=34)
      +body('Relaciones de largo plazo con quienes pueden hablar por tu marca: <b style="font-weight: 600">creadores</b>, ejecutivos y tu propio equipo.',mw=470,size=22))
    write(P,'07p-programas','Programas · Creadores, ejecutivos y embajadores',strips(F)+left+BUB)

# ── 4 · Series, no posts sueltos ────────────────────────────────────────────
if want('series'):
    o=glow(1380,520,820,580)
    SER=[('Barista responde','Martes · Reel','Una duda de la comunidad por episodio.','#72ded8',
          [('s-pregunta','50% 30%','¿Con o sin leche?','Un barista responde a la cámara detrás de la barra.'),('s-molienda','50% 40%','¿Qué molienda?','Unas manos sirven café molido en un frasco.'),('s-hielo','40% 45%','¿Cuánto hielo?','Unas manos ponen hielo en un vaso junto a una jarra de cold brew.'),('barra','50% 50%','¿Cuándo va la leche?','Dos manos preparan un cold brew con leche.')]),
         ('Del origen a la taza','Jueves · Carrusel','De dónde viene cada café.','#2e8be8',
          [('s-cerezas','60% 50%','La cosecha','Unas manos sostienen cerezas de café maduras.'),('s-secado','50% 70%','El secado','Camas de secado con granos de café frente a los cerros.'),('s-tueste','50% 60%','El tueste','Granos recién tostados caen de una tostadora.'),('hero','50% 62%','La taza','Cold brew cayendo sobre hielo.')]),
         ('Plan de sábado','Sábado · Video con creadores','Un creador, un lugar y un cold brew.','#cfe4fa',
          [('s-feria','55% 40%','En la feria','Una creadora muestra su cold brew en una feria.'),('s-playa','70% 45%','Frente al mar','Un creador brinda con su cold brew frente al mar.'),('calle','50% 35%','En la calle','Un creador muestra su cold brew en la calle.'),('ugc','50% 40%','En casa','Una creadora recomienda un cold brew desde su cocina.')])]
    LX,CX0,CW_,CH_,CG=800,1086,140,216,14; ys=[130,400,670]
    for (name,cad,desc,colr,eps),y in zip(SER,ys):
        o+=(f'<div style="position: absolute; left: {LX}px; top: {y}px; width: 262px; height: {CH_}px; display: flex; flex-direction: column; justify-content: center"><div style="width: 44px; height: 5px; border-radius: 3px; background: {colr}"></div>'
            f'<div style="margin-top: 14px; {BRI}; font-size: 33px; font-weight: 760; letter-spacing: -0.03em; line-height: 1; color: #ffffff">{name}</div>'
            f'<div style="margin-top: 12px"><span style="{POP}; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; color: #ffffff; border: 1.5px solid rgba(114, 222, 216, 0.5); border-radius: 999px; padding: 4px 12px; white-space: nowrap">{cad}</span></div>'
            f'<div style="margin-top: 12px; {POP}; font-size: 15.5px; font-weight: 300; line-height: 1.35; color: #cfe4fa">{desc}</div></div>')
        for i,(k,pos,tt,alt) in enumerate(eps):
            x=CX0+i*(CW_+CG)
            o+=(f'<div style="position: absolute; left: {x}px; top: {y}px; width: {CW_}px; height: {CH_}px; border-radius: 16px; overflow: hidden; background: #0b1a2b; box-shadow: 0 22px 44px rgba(0, 8, 20, 0.5), 0 0 0 1px rgba(114, 222, 216, 0.22)">'
                +pic(AD[k],alt,pos)
                +f'<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(0, 8, 20, 0.45) 0%, rgba(0, 8, 20, 0) 26%, rgba(0, 8, 20, 0) 50%, rgba(0, 8, 20, 0.88) 100%)"></div>'
                +f'<div style="position: absolute; left: 0; right: 0; top: 0; height: 5px; background: {colr}"></div>'
                +f'<div style="position: absolute; left: 10px; top: 14px; {POP}; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff">Ep. {i+1}</div>'
                +f'<div style="position: absolute; left: 10px; right: 8px; bottom: 11px; {POP}; font-size: 13.5px; font-weight: 600; line-height: 1.2; color: #ffffff">{tt}</div></div>')
        x=CX0+4*(CW_+CG)
        o+=(f'<div style="position: absolute; left: {x}px; top: {y}px; width: {CW_}px; height: {CH_}px; box-sizing: border-box; border-radius: 16px; border: 2px dashed rgba(114, 222, 216, 0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; {POP}; color: #cfe4fa">'
            f'<span style="width: 38px; height: 38px; border-radius: 50%; border: 2px solid rgba(114, 222, 216, 0.7); display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 300; color: #72ded8; line-height: 1">+</span><div style="font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff">Ep. 5</div><div style="font-size: 13px; font-weight: 300">En guion</div></div>')
    o+=svg(''.join(f'<path d="M{LX} {y} H1856" stroke="#72ded8" stroke-opacity="0.16" stroke-width="1"></path>' for y in [ys[1]-27,ys[2]-27]))
    left=col(voice('01 · Social media · Series','¿Por qué volverían a verme?','Series,<br>no posts<br>sueltos',size=104,qsize=36)
      +body('Formatos con nombre, día y estructura propios. Tu audiencia sabe qué esperar y cada episodio sale <b style="font-weight: 600">mejor</b> que el anterior.',mt=26,mw=540,size=21)
      +R([('biblioteca','Pocas series, bien definidas'),('claqueta','Gancho, estructura y cierre fijos'),('postit','Un día y un formato por serie'),('trofeo','Se mide episodio contra episodio')]))
    write(P,'04b-series','Social media · Series, no posts sueltos',o+left+foot('Ejemplo ilustrativo con una marca ficticia.')+BUB)
