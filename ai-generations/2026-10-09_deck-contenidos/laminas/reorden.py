# Orden del deck (Frentes / Momentos / Programas) + página «Ruta corta». Idempotente.
import json,re,os,shutil
P='canvas/project/'; p=P+'canvas.json'; c=json.load(open(p)); b=c['boards']
DECK=['Main','02-tesis','02b-feed-intereses','03-tres-frentes','10e-prueba',
 '04-social-media','05-formatos','04b-series','07a2-produccion','07a3-ia','04c-canales-cerrados',
 '06-influencers','06b-seleccion-creadores','07-ugc',
 '07b-listening','07b1-listening-radar','07b3-trendjacking','07b2-social-search',
 '07c-social-care','07c1-care-como','07c2-care-agentes',
 '07d-paid-social','07d0-probar-escalar','07d1-paid-ugc','07d1b-paid-formatos','07d2-social-commerce','07e-redes',
 '07m-momentos','07d3-lanzamientos','07d4-evento-en-vivo','07c3-reputacion',
 '07p-programas','06c-programa-creadores','07f-linkedin-ejecutivos','07g-ejecutivos-programa','07h-embajadores',
 '10a-ciclo','11b-marketing-studio','12a-stack','12b-dia','12c-vivelo-avance','12d-vivelo-resultados','10b-mes','10c-squad','13b-equipo','10d-control','08-derechos',
 '09-medicion','09b-social-crm','16a-testimonio','16b-clientes','16c-partners','16d-mercados',
 '10g-niveles','10f-empezar','10-como-empezamos','11-cierre']
NEW={'02b-feed-intereses':'Lo que cambió · Cada pieza compite sola','04b-series':'Social media · Series','04c-canales-cerrados':'Social media · Canales cerrados','07d0-probar-escalar':'Paid social · Probar y escalar','07m-momentos':'Momentos','07p-programas':'Programas','09b-social-crm':'Medición · Del social al CRM'}
REN={'07c3-reputacion':'Momentos · Crisis y reputación','07d3-lanzamientos':'Momentos · Lanzamientos','07d4-evento-en-vivo':'Momentos · Cobertura en vivo','06c-programa-creadores':'Programas · Creadores','07f-linkedin-ejecutivos':'Programas · Voz ejecutiva en LinkedIn','07g-ejecutivos-programa':'Programas · Ejecutivos en LinkedIn','07h-embajadores':'Programas · Embajadores de marca','07b1-listening-radar':'Listening · De ruido a señales','07b3-trendjacking':'Listening · Trendjacking','07b2-social-search':'Listening · Social search','07a2-produccion':'Social media · Producción','07a3-ia':'Social media · Producción con IA','05-formatos':'Social media · Una idea, cada formato','06b-seleccion-creadores':'Influencer marketing · Cómo elegimos creadores','10e-prueba':'Caso Sky (receta)'}
old=[x for x in c['order'] if b[x].get('page','deck')=='deck']
assert set(x+'.dc.html' for x in DECK)>=set(old),set(old)-set(x+'.dc.html' for x in DECK)
for i,n in enumerate(DECK):
    f=n+'.dc.html'; assert os.path.exists(P+f),f
    o=b.get(f,{}); t=NEW.get(n) or REN.get(n) or re.sub(r'^\d+ · ','',o['title'])
    b[f]={'x':(i%8)*2000,'y':(i//8)*1200,'w':1920,'h':1080,'title':f'{i+1:02d} · {t}'}
# interfaces
ms=[x for x in c['order'] if b[x].get('page')=='ms']
if 'MS-Resultados.dc.html' not in b:
    s=b['MS-Social.dc.html']; b['MS-Resultados.dc.html']={'x':s['x']+s['w']+80,'y':s['y'],'w':1440,'h':860,'title':'Resultados de la campaña','page':'ms'}; ms.append('MS-Resultados.dc.html')
# ruta corta
RUTA=['Main','02-tesis','02b-feed-intereses','03-tres-frentes','10e-prueba','04-social-media','06-influencers','07-ugc','07a3-ia','07b-listening','07c-social-care','07d-paid-social','07m-momentos','07p-programas','10a-ciclo','12b-dia','10c-squad','09-medicion','10g-niveles','10f-empezar','11-cierre']
for f in [x for x in list(b) if x.startswith('R-')]:
    del b[f]
    if os.path.exists(P+f): os.remove(P+f)
ruta=[]
for i,n in enumerate(RUTA):
    f='R-%02d-%s.dc.html'%(i+1,n.lower()); shutil.copyfile(P+n+'.dc.html',P+f)
    t=re.sub(r'^\d+ · ','',b[n+'.dc.html']['title'])
    b[f]={'x':(i%7)*2000,'y':(i//7)*1200,'w':1920,'h':1080,'title':f'{i+1:02d} · {t}','page':'ruta'}; ruta.append(f)
if not any(pg['id']=='ruta' for pg in c['pages']): c['pages'].insert(1,{'id':'ruta','name':'Ruta corta · 21 láminas'})
c['notes']['ruta-titulo']={'x':0,'y':-300,'text':'Ruta corta para presentar: 21 láminas del deck, en el mismo orden. Son copias; el original vive en la página «Deck».','kind':'title1','maxW':13920,'page':'ruta'}
c['order']=[n+'.dc.html' for n in DECK]+ruta+ms
json.dump(c,open(p,'w'),ensure_ascii=False,indent=1)
print(len(DECK),'deck ·',len(ruta),'ruta ·',len(ms),'ms'); print(' | '.join(b[n+'.dc.html']['title'] for n in DECK))
