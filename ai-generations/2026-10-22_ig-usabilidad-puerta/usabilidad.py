# Usabilidad 12-11 · voz de la línea gráfica: pregunta chica con anillo + respuesta grande con su esfera (operador 2026-10-23)
import os
S = os.path.dirname(os.path.abspath(__file__))
src = open(f'{S}/slides2.py', encoding='utf-8').read()
exec(src[:src.index('\nSL = ')])
hstart = src.index("head = f'''"); exec(src[hstart:src.index("os.makedirs", hstart)])
R2 = '/Users/jreye/Documents/greenhouse-eo'
plate = f'{R2}/ai-generations/2026-10-22_ig-usabilidad-puerta/plates/U2-bodegon-45-cartel.png'
inner = ('<div style="position:absolute;left:76px;top:88px;display:flex;flex-direction:column;gap:22px">'
         f'<div class="k-q" style="font-size:46px">{RING}Si tu interfaz necesita un cartel,</div>'
         '<div class="k-B" style="font-size:158px">no es usable<span class="k-esf"></span></div>'
         '<div style="font-family:Poppins;font-weight:400;font-size:36px;color:#ffffff;margin-top:6px">Feliz Día de la Usabilidad.</div></div>'
         f'<img src="{U(R2 + "/public/branding/logo-negative.svg")}" alt="Efeonce" style="position:absolute;left:{540 - 108}px;top:1196px;width:216px;height:auto">')
html = head + f'<div class="k-stg f45 slide"><img class="k-pl" src="{U(plate)}" alt="">{inner}</div></body></html>'
open(f'{S}/f/usa.html', 'w', encoding='utf-8').write(html)
print('ok')
