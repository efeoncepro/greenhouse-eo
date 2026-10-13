# Piezas de interfaz compartidas por las láminas construidas (teléfonos, tarjetas, leyendas).
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
S=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AD=json.load(open(os.path.join(S,'work','adblobs.json')))
NET={'ig':('2d4896e9385e1988c295d8a7c354143d','Instagram'),'tt':('e983c46e29770fefe13aaac3c26b3719','TikTok'),'li':('5bf8e95345f1ab5750ee51ed19ac7e8a','LinkedIn'),'yt':('712d531fb65791883c98dd1de90fdc52','YouTube'),'fb':('95408181b80b4225771cb3f03d9b7aa8','Facebook')}
HEART='<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.200 3.100 4.500 6.600 4.500c2 0 3.500 1 5.400 3.100 1.900-2.100 3.400-3.100 5.400-3.100 3.500 0 5.700 3.700 4.200 7.300C19.500 16.400 12 21 12 21z"></path></svg>'
BUBB='<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 3.500c5 0 9 3.400 9 7.700s-4 7.700-9 7.700c-.9 0-1.800-.1-2.600-.300L5 21l.9-3.600C4.100 16 3 13.900 3 11.200c0-4.300 4-7.700 9-7.700z"></path></svg>'
SEND='<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10 14"></path><path d="M21 3l-7 18-4-7-7-4 18-7z"></path></svg>'
def col(inner,w=600): return f'<div style="position: absolute; left: 140px; top: 120px; width: {w}px; display: flex; flex-direction: column">{inner}</div>'
def R(items,mt=24,mw=540): return rows([(IC[i],t) for i,t in items],mt=mt,mw=mw,size=19,pad=8)
def foot(t,x=1460,w=420): return f'<div style="position: absolute; left: {x}px; top: 1010px; width: {w}px; text-align: right; {POP}; font-size: 13px; color: #cfe4fa">{t}</div>'
def glow(cx,cy,rx=760,ry=560): return f'<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: radial-gradient(ellipse {rx}px {ry}px at {cx}px {cy}px, rgba(3, 117, 219, 0.46), rgba(3, 117, 219, 0.12) 50%, rgba(0, 26, 51, 0) 76%)"></div>'
def avatar(sz,txt,bg='#0375db',ring=True):
    r='; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9)' if ring else ''
    return f'<span style="width: {sz}px; height: {sz}px; border-radius: 50%; background: {bg}; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; {POP}; font-size: {round(sz*0.42)}px; font-weight: 600; flex-shrink: 0{r}">{txt}</span>'
def shell(x,y,w,h,inner,glow=None,rot=0,rad=44,pad=8,bg='#0b1a2b'):
    g=f', 0 0 0 2px {glow}, 0 0 70px 6px {glow}' if glow else ''
    r=f'; transform: rotate({rot}deg)' if rot else ''
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; box-sizing: border-box; padding: {pad}px; border-radius: {rad}px; background: #06121f; box-shadow: 0 40px 80px rgba(0, 8, 20, 0.6), 0 0 0 1px rgba(114, 222, 216, 0.25){g}{r}">'
            f'<div style="position: relative; width: 100%; height: 100%; border-radius: {rad-pad}px; overflow: hidden; background: {bg}">{inner}</div></div>')
def shade(): return '<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(0, 8, 20, 0.5) 0%, rgba(0, 8, 20, 0) 22%, rgba(0, 8, 20, 0) 52%, rgba(0, 8, 20, 0.82) 100%)"></div>'
def pic(blob,alt,pos='50% 50%',zoom=1,origin='50% 50%'):
    z=f'; transform: scale({zoom}); transform-origin: {origin}' if zoom!=1 else ''
    return f'<img src="/_blob/{blob}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; object-position: {pos}{z}">'
def side(bottom=150): return f'<div style="position: absolute; right: 12px; bottom: {bottom}px; display: flex; flex-direction: column; gap: 18px; align-items: center">{HEART}{BUBB}{SEND}</div>'
def tile(x,y,net,s=62):
    blob,name=NET[net]
    return f'<div style="position: absolute; left: {x}px; top: {y}px; width: {s}px; height: {s}px; border-radius: {round(s*0.27)}px; background: #ffffff; box-shadow: 0 14px 30px rgba(0, 8, 20, 0.5); display: flex; align-items: center; justify-content: center"><img src="/_blob/{blob}" alt="{name}" style="width: {round(s*0.56)}px; height: {round(s*0.56)}px"></div>'
def cap(x,y,w,k,t,d,align='center'):
    dd=f'<div style="margin-top: 4px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.3; color: #cfe4fa">{d}</div>' if d else ''
    return f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; text-align: {align}"><div style="{POP}; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">{k}</div><div style="margin-top: 3px; {BRI}; font-size: 25px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div>{dd}</div>'
def pill(t,bg='#72ded8',c='#001a33'): return f'<span style="{POP}; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {c}; background: {bg}; border-radius: 999px; padding: 5px 12px; white-space: nowrap">{t}</span>'
def svg(inner): return f'<svg aria-hidden="true" width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0">{inner}</svg>'
def arrow(x1,y,x2,w=5): return f'<path d="M{x1} {y} H{x2-22}" fill="none" stroke="#72ded8" stroke-width="{w}" stroke-linecap="round"></path><path d="M{x2-28} {y-16} L{x2} {y} L{x2-28} {y+16} Z" fill="#72ded8" stroke="#72ded8" stroke-width="3" stroke-linejoin="round"></path>'
def write(P,name,title,inner,fonts=''):
    h=page(title,inner)
    if fonts: h=h.replace('<helmet>','<helmet>\n'+fonts)
    open(os.path.join(P,name+'.dc.html'),'w').write(h); print('ok',name)
