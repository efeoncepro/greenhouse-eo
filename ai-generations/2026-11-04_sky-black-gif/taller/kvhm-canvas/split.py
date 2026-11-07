import os, shutil, sys
O='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/rutas-peru'
N=os.path.expanduser('~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre')
IATA={'AREQUIPA':'AQP','AYACUCHO':'AYP','CAJAMARCA':'CJA','CHICLAYO':'CIX','CUSCO':'CUZ','IQUITOS':'IQT','JAUJA':'JAU','JULIACA':'JUL','PIURA':'PIU','PUCALLPA':'PCL','TACNA':'TCQ','TALARA':'TYL','TARAPOTO':'TPP','TRUJILLO':'TRU','TUMBES':'TBP'}
# Estado vigente (Daniela, Teams 2026-11-06 10:28 + Frame «V2»: «Marqué todo como aprobado. Sólo la story de Pucallpa
# no me hizo la corrección que le dejé»). La corrección («subir un poco más la torre, sin que choque con el logo») se
# aplicó el 2026-11-06 con lift 0.07. A = aprobado; R = va a revisión.
E={c:('A','A') for c in IATA}
# 2026-11-06: Daniela aprobó también la story de Pucallpa corregida (vía Julio). Todo aprobado.
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
    # Una pieza que cambia de estado se MUEVE de una carpeta a la otra (nunca queda en las dos, nunca se borra).
    other=dst.replace(DST[st],DST['R' if st=='A' else 'A'])
    if os.path.exists(other): shutil.move(other,dst)
    shutil.copy2(src,dst)
  print('copiados',len(plan))
for st,src,dst in plan: print(st, dst.split('10_Noviembre/')[1])
