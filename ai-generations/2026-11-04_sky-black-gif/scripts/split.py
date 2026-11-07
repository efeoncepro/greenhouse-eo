import os, shutil, sys
O='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/rutas-peru'
N=os.path.expanduser('~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre')
IATA={'AREQUIPA':'AQP','AYACUCHO':'AYP','CAJAMARCA':'CJA','CHICLAYO':'CIX','CUSCO':'CUZ','IQUITOS':'IQT','JAUJA':'JAU','JULIACA':'JUL','PIURA':'PIU','PUCALLPA':'PCL','TACNA':'TCQ','TALARA':'TYL','TARAPOTO':'TPP','TRUJILLO':'TRU','TUMBES':'TBP'}
# Estado en Frame.io (Daniela, 2026-11-05): A = aprobado; R = ajustado, va a revisión; C = por confirmar (sin cambios)
# Estado vigente (Frame.io, Daniela, 2026-11-05: 1.ª revisión 17:14 y 2.ª revisión 16:49–17:00 hora de Frame).
# A = aprobado; R = ajustado o con cambios pedidos, va a revisión.
E={'AYACUCHO':('R','R'),'CAJAMARCA':('A','A'),'CHICLAYO':('R','R'),'CUSCO':('R','A'),'IQUITOS':('A','A'),'JAUJA':('A','A'),
   'JULIACA':('A','A'),'PIURA':('R','R'),'PUCALLPA':('A','R'),'TACNA':('A','A'),'TALARA':('R','R'),'TARAPOTO':('A','R'),
   'TRUJILLO':('A','A'),'TUMBES':('A','A'),'AREQUIPA':('A','A')}
DST={'A':N+'/BLACK SKY 2026 - APROBADO','R':N+'/BLACK SKY 2026 - PARA REVISION'}
apply='--apply' in sys.argv; cnt={'A':0,'R':0}; plan=[]
for c,(p,s) in E.items():
  for fmt,st in (('popup',p),('story',s)):
    src=f'{O}/HM_PE_RUTA_{c}__{fmt}.png'; assert os.path.exists(src), src
    dst=f'{DST[st]}/HM PE/RUTAS FOCO/{c}/BS_{fmt.upper()}_{IATA[c]}.png'
    plan.append((st,src,dst)); cnt[st]+=1
print(cnt)
if apply:
  for st,src,dst in plan:
    os.makedirs(os.path.dirname(dst),exist_ok=True)
    shutil.copy2(src,dst)
  print('copiados',len(plan))
for st,src,dst in plan: print(st, dst.split('10_Noviembre/')[1])
