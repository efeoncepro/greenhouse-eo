# Etiquetas de sección coherentes con la estructura Frentes / Momentos / Programas (2026-10-10).
# Idempotente: correr después de regenerar cualquier lámina.
import re,os,sys
P='canvas/project/'
M={'05-formatos':('Adaptación nativa','01 · Social media · Adaptación nativa'),
 '07a2-produccion':('Producción de contenido','01 · Social media · Producción'),
 '06b-seleccion-creadores':('Influencer marketing · Selección','02 · Influencer marketing · Selección'),
 '06c-programa-creadores':('Influencer marketing · Programa de creadores','Programas · Creadores'),
 '07b1-listening-radar':('Social listening','04 · Listening · Social listening'),
 '07b3-trendjacking':('Trendjacking · Contenido reactivo','04 · Listening · Trendjacking'),
 '07b2-social-search':('Social search','04 · Listening · Social search'),
 '07c1-care-como':('Social care · Cómo respondemos','05 · Social care · Cómo respondemos'),
 '07c3-reputacion':('Reputación de marca','Momentos · Crisis y reputación'),
 '07d1-paid-ugc':('Paid social · UGC patrocinado','06 · Paid social · UGC patrocinado'),
 '07d1b-paid-formatos':('Paid social · Formatos por canal','06 · Paid social · Formatos por canal'),
 '07d2-social-commerce':('Social commerce','Todos los frentes · Social commerce'),
 '07d3-lanzamientos':('Lanzamientos','Momentos · Lanzamientos'),
 '07d4-evento-en-vivo':('Cobertura en vivo','Momentos · Cobertura en vivo'),
 '07f-linkedin-ejecutivos':('LinkedIn · Voz ejecutiva','Programas · Voz ejecutiva en LinkedIn'),
 '07g-ejecutivos-programa':('LinkedIn · Programa de ejecutivos','Programas · Ejecutivos en LinkedIn'),
 '07h-embajadores':('LinkedIn · Embajadores de marca','Programas · Embajadores de marca')}
for f,(a,b) in M.items():
    p=P+f+'.dc.html'; s=open(p).read()
    pat='text-transform: uppercase; color: #e2e2e2">'
    if pat+b+'<' in s: print('=',f); continue
    assert s.count(pat+a+'<')==1,(f,s.count(pat+a+'<'))
    open(p,'w').write(s.replace(pat+a+'<',pat+b+'<')); print('ok',f,'→',b)
if '--src' in sys.argv:
    for g in ['work/fotoslides.py','work/deep.py','work/paid.py']:
        s=open(g).read(); n=0
        for a,b in M.values():
            if f"voice('{a}'," in s: s=s.replace(f"voice('{a}',",f"voice('{b}',"); n+=1
        open(g,'w').write(s); print(g,n)
