import json,os,re
S=os.path.dirname(os.path.abspath(__file__))
R='/Users/jreye/Documents/greenhouse-eo'
css=open(f'{S}/kit.css',encoding='utf-8').read()
close=open(f'{S}/close-inner.html',encoding='utf-8').read()
close=re.sub(r'src="/_blob/[0-9a-f]+"',f'src="file://{R}/public/branding/logo-negative.svg"',close)
RING='<svg class="k-ring2" style="color:var(--acc)" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.06" fill="none" stroke="currentColor" stroke-width="3.87"/></svg>'
SWIPE=open(f'{S}/swipe.svg').read()
def remate_q(q,a,f=124,side='r'):
    pos='top:var(--top);right:var(--sr)' if side=='r' else 'top:var(--top);left:var(--sl)'
    corner='c-tr' if side=='r' else 'c-tl'
    return f'<div class="k-bed {corner}" style="--f:{f};{pos}"><div class="k-q">{RING}{q}</div><div class="k-B" style="font-size:{f}px">{a}<span class="k-esf"></span></div></div>'
def remate(a,f=124,sphere=True):
    return f'<div class="k-bed c-tr" style="--f:{f};top:var(--top);right:var(--sr)"><div class="k-B" style="font-size:{f}px">{a}{"<span class=\"k-esf\"></span>" if sphere else ""}</div></div>'
def glass(text,side='l',ring=True,icon=None):
    j='flex-start' if side=='l' else 'flex-end'; c='c-bl' if side=='l' else 'c-br'
    lead=icon if icon else (RING if ring else '')
    return f'<div class="k-subw" style="justify-content:{j};"><div class="k-glass {c}">{lead}<div class="k-subt"><span>{text}</span></div></div></div>'
def bubbles(items):
    sizes=[96,66,56,48]
    h=''.join(f'<div class="k-bub" style="font-size:{sz}px">{t}{"<span class=\"k-esf\"></span>" if k==0 else ""}</div>' for k,(t,sz) in enumerate(zip(items,sizes)))
    return f'<div class="k-stack" style="left:var(--sl);top:var(--top)">{h}</div>'
cover=(f'<div class="k-bed c-tr" style="--f:108;top:var(--top);right:var(--sr)"><div class="k-B" style="font-size:108px">¿Cómo llegamos</div><div class="k-B" style="font-size:108px">hasta aquí?</div></div>'
       + glass('Desliza para descubrirlo','r',icon=SWIPE))
SL=[
 ('s1',cover),
 ('s2',remate('Rebobinemos')+glass('¿Y para cuándo estaría la campaña?','l')),
 ('s3',bubbles(['Seis semanas','Casting','Locación','Otra cotización'])),
 ('s4',remate('Día 42')),
 ('s5',remate_q('¿Para ayer?','Ya está')),
 ('s6',remate_q('Nada de esto se filmó.','Así se hizo')),
 ('s7',remate_q('Antes de cualquier toma,','el set')+glass('Oficina maestra, cámaras en planta y biblia de continuidad.','l')),
 ('s8',remate_q('La primera lata salió','gigante')+glass('Una lata mide 15,7 cm. La IA no lo sabe: hay que decírselo.','l')),
 ('s9',remate_q('La IA acelera. ¿Y quién decide?','El criterio')),
 ('s10',close.replace('Hablemos','Síguenos')),
]
head=f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:'Bricolage Grotesque';src:url('file://{R}/src/assets/fonts/BricolageGrotesque-Variable.ttf');font-weight:200 800}}
@font-face{{font-family:'Poppins';src:url('file://{R}/src/assets/fonts/Poppins-Regular.ttf');font-weight:400}}
@font-face{{font-family:'Poppins';src:url('file://{R}/src/assets/fonts/Poppins-Medium.ttf');font-weight:500}}
@font-face{{font-family:'Poppins';src:url('file://{R}/src/assets/fonts/Poppins-SemiBold.ttf');font-weight:600}}
body{{margin:0;width:1080px;height:1350px;overflow:hidden;background:#000}}
{css}
.k-a{{animation:none!important}} .k-guide{{display:none}}
.k-stg.slide{{--acc:#36c8bf;--accl:#0e8c82;--bed:#001a33;transform:none}}
.k-glass .swp{{width:1.15em;height:1.15em;flex:none;margin-right:.1em}}
</style></head><body>'''
os.makedirs(f'{S}/f',exist_ok=True)
for sid,inner in SL:
    plate=f'{S}/plates/{sid}.png' if sid!='s10' else f'{S}/plates/s9.png'
    html=head+f'<div class="k-stg f45 slide"><img class="k-pl" src="file://{plate}" alt="">{inner}</div></body></html>'
    open(f'{S}/f/{sid}.html','w',encoding='utf-8').write(html)
print('ok')
