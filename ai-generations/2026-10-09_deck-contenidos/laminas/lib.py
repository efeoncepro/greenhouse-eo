# Piezas compartidas de las láminas hechas a mano (medidas aprobadas de La órbita).
FONTS='<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">'
POP="font-family: 'Poppins', system-ui, sans-serif"
BRI="font-family: 'Bricolage Grotesque', system-ui, sans-serif"
BUB='<img src="/_blob/8d15e2eec5049f6f6c99229e50d7dfee" alt="efeoncepro.com" style="position: absolute; left: 135px; top: 994px; width: 162px; height: auto">'
IND='<svg aria-hidden="true" width="100" height="100" viewBox="0 0 100 100" style="position: absolute; left: 1710px; top: 80px"><circle cx="50" cy="50" r="40" fill="none" stroke="#72ded8" stroke-opacity="0.14" stroke-width="2.2"></circle><path d="M50 10 A40 40 0 0 1 50 90" fill="none" stroke="#ff6500" stroke-width="3.96" stroke-linecap="round"></path><circle cx="50" cy="90" r="7.7" fill="#ff6500"></circle></svg>'
RING='<svg aria-hidden="true" viewBox="0 0 62 62" width="0.62em" height="0.62em" style="margin-right: 0.42em; flex-shrink: 0"><circle cx="31" cy="31" r="26" fill="none" stroke="#ff6500" stroke-width="10"></circle></svg>'
SPH='<svg aria-hidden="true" viewBox="0 0 10 10" width="0.2em" height="0.2em" style="margin-left: 0.03em"><circle cx="5" cy="5" r="5" fill="#ff6500"></circle></svg>'
def voice(eyebrow,question,headline,size=104,lh=0.92,qsize=38):
    return (f'<div style="{POP}; font-size: 16px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #e2e2e2">{eyebrow}</div>'
     f'<div style="margin-top: 44px; display: flex; align-items: center; {POP}; font-size: {qsize}px; font-weight: 300; line-height: 1.2; color: #e2e2e2">{RING}{question}</div>'
     f'<div style="margin-top: 20px; {BRI}; font-size: {size}px; font-weight: 760; letter-spacing: -0.045em; line-height: {lh}; color: #ffffff">{headline}{SPH}</div>')
def body(html,mt=40,mw=520,size=24):
    return f'<div style="margin-top: {mt}px; {POP}; font-size: {size}px; font-weight: 300; line-height: 1.45; color: #ffffff; max-width: {mw}px">{html}</div>'
def rows(items,mt=44,mw=480,size=20,icon=34,pad=9):
    out=f'<div style="margin-top: {mt}px; display: flex; flex-direction: column; max-width: {mw}px; {POP}; font-size: {size}px; font-weight: 400; color: #ffffff">'
    for i,(ic,t) in enumerate(items):
        last='; border-bottom: 1px solid rgba(114, 222, 216, 0.16)' if i==len(items)-1 else ''
        out+=f'<div style="padding: {pad}px 0; border-top: 1px solid rgba(114, 222, 216, 0.16){last}; display: flex; align-items: center; gap: 14px"><img src="/_blob/{ic}" alt="" style="width: {icon}px; height: {icon}px; flex-shrink: 0"><span>{t}</span></div>'
    return out+'</div>'
def page(title,inner,bg='#001a33'):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>
body{{margin:0;background:{bg}}}
</style>
</helmet>
<div style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: {bg}; color: #ffffff">
{inner}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''
def photo(blob,alt):
    return f'<img src="/_blob/{blob}" alt="{alt}" style="position: absolute; object-fit: cover; left: 0; top: 0; width: 1920px; height: 1080px">'
IC={'like':'04cdf9ef407660920b149cf91ef886c8','aro':'b81bb41182145f5392b82ed5845ff407','camara':'06387d478bb8b2df7d4807adcee4d9f7','audifonos':'f70dc881f8d209987b0bd853f7f0f0e3','comentar':'9bbc23e214fa63d488862f95281c0626','megafono':'d199f7f76d6f8ce5aa54292bf492f4a9','telefono':'d8d473a9838732c456a9d093fac0c707','encuadre':'bb9bee11419b39e9fb7809264194546e','reproducir':'7b13cb639196df194e3d6ee0f2c4240a','tijeras':'e2a370c433c4a3f09523b0c8150a5401','lapiz':'9bc76fca654ca5770920259664cf21b7','biblioteca':'87784a6f1b5a31107eb09428683ccd00','bombillo':'b4c6fa1f54ca3715ec95ae8d6d433523','rayo':'e56052c369b4da1da1ad7d9f8cb9d28d','busqueda':'da9371ab928bf5305e2e18a3d1b6d5f6','cursor':'9adb6a6492157c196f8f7e58766f7a4f','corazon':'b2c1d0e81d54b2c6a9af2e2e536554c9','paleta':'7eebed066cae4ef5be3d96f9c0c89312','trofeo':'8c6e7541b5ea4ee48eb85351cf77a7c8','estrella':'4abbd132b89499b5668ac34ac0dd68b6','galeria':'dbbae3e9c8aa3c2301dfe3aff6755e16','postit':'473fd9665e214fc72f395bc46a1072e9','escuadra':'2aa8051db2336528a7e8d0bd40b870ea','claqueta':'5fbe94a33914a20a8123a90a2231c4e0','taza':'c22191f4348aa1daad731605536664f7'}
