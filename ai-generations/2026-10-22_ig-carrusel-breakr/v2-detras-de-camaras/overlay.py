import os
S = os.path.dirname(os.path.abspath(__file__))
src = open(f'{S}/sistema.py', encoding='utf-8').read()
exec(src[:src.index('\nSLIDES = [')])
h2 = head.replace('</style>', 'html,body{background:transparent!important}</style>')
inner = (bed_at('Y así quedó:', 'el resultado', 104, 65, 1350 - 66 - 208, corner='c-bl')
         + '<div class="k-glass" style="position:absolute;left:65px;top:81px;font-size:22px;padding:12px 18px;border-radius:12px;letter-spacing:.12em;font-weight:600">EL CLÍMAX · VIDEO</div>')
open(f'{S}/f/n11v.html', 'w', encoding='utf-8').write(h2 + f'<div class="k-stg f45 slide" style="background:transparent">{inner}</div></body></html>')
print('ok')
