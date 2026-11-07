import csv, json, re, collections, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'build.py')).read().split('# --- topic & operation filters')[0])
# units: canonical, [unir], tema, destino, por que dic, publicar antes, notas
U=[
 ('documentos-viaje',[],'Servicio: documentos de viaje (incl. menores)','Multidestino (CL/PE)','nov-dic + ene-feb = 3.007 clics, la guía de servicio no rechazada con más demanda de temporada; base de viajes internacionales de verano','2026-12-04','Verificar requisitos en fuente oficial (PDI/Migraciones/Centro de Ayuda); sección menores sin tocar bebé'),
 ('viajes-avion',[],'Servicio: dudas frecuentes antes de volar','General','46.591 impr. ago-sep con CTR 0,9 %; 1.875 clics en temporada; pre28 999 sesiones','2026-12-04','No repetir equipaje/líquidos/check-in (O1-O8): enlazarlos'),
 ('se-puede-llegar-en-avion-a-pucon',['como-ir-de-santiago-a-pucon-sin-preocupaciones'],'Cómo llegar a Pucón (avión a Temuco ZCO + traslado)','Chile · Pucón (ZCO)','temporada alta de lagos ene-feb: ef26 = 841 clics en las 2 URL; mayor valor CPC del lote (US$ 118 ago-oct)','2026-12-04','Grupo Pucón: mantener «qué hacer» (pucon) y termas como satélites (consolidarlos en 2ª ola)'),
 ('panoramas-para-ninos-en-santiago',[],'Panoramas para niños en Santiago','Chile · Santiago (SCL)','vacaciones escolares: 1.573 clics en ene-feb 2026 vs 16 en nov-dic','2026-12-11','Lote recuperación 15-10 #8 dejó metadatos propuestos (no aplicados): reutilizarlos'),
 ('semana-valdiviana',[],'Semana Valdiviana 2027: fechas y actividades','Chile · Valdivia (ZAL)','evento de febrero: 1.642 clics en ene-feb 2026; título dice 2026','2026-12-15','Actualizar a 2027 con programa oficial; enlazar O13 Valdivia (nov)'),
 ('platos-tipicos-de-lima',[],'Platos típicos de Lima','Perú · Lima (LIM)','1.023 clics en temporada (ef26 653) y 346 aún en ago-sep; 80 % lector Perú; pérdida ~850 sesiones vs pre','2026-12-11','Gastronomía: complementa O-lote Lima y cena peruana'),
 ('paises-baratos-para-viajar-desde-chile-con-sky',[],'Países baratos para viajar desde Chile','Multidestino (desde Chile)','34.549 impr. ago-sep con CTR 0,6 %; 906 clics en temporada; 2º mayor valor CPC (US$ 81)','2026-12-04','Solo destinos con ruta SKY vigente; precios con fecha'),
 ('documentos-que-necesitas-para-viajar-a-argentina-desde-chile',[],'Documentos para viajar a Argentina desde Chile','Argentina (desde Chile)','ef26 654 clics: el chileno cruza a Argentina en verano; 99 % lector Chile; US$ 36','2026-12-04','Requisitos de menores y vehículo: fuente oficial'),
 ('aeropuertos-en-buenos-aires',[],'Aeropuertos de Buenos Aires: AEP vs EZE y traslados','Argentina · Buenos Aires (AEP/EZE)','35.187 impr. con CTR 0,6 %; 1.011 clics en temporada; US$ 60','2026-12-04','Alrededores del aeropuerto de llegada; no posicionar «vuelos a»'),
 ('vacunas-brasil',[],'Vacunas para ir a Brasil','Brasil','1.102 clics en temporada; pre28 849 sesiones → mayor pérdida absoluta del grupo internacional','2026-12-04','Enlazar desde O14 viaje-a-brasil-3 (nov); fuente: Ministerio de Salud/OMS'),
 ('comprar-pasajes-baratos',['pasajes-de-avion-baratos','vuelos-baratos','pasajes-al-mejor-precio','encontrar-pasajes-al-mejor-precio','pasajes-aereos-baratos','tips-para-encontrar-vuelos-baratos','claves-para-comprar-pasajes-4-tips-para-encontrar-precios-convenientes','4-tips-para-comprar-boletos-a-precios-mas-convenientes','donde-comprar-un-pasaje-de-avion'],'Tarifas: cuándo comprar pasajes baratos (guía SKY)','General (CL/PE)','11→2: 32.621 impr. en 11 URL; temporada de compra de verano; US$ 30','2026-12-04','pasajes-aereos-en-linea queda para la guía de compra segura (pasaje-en-linea); explicar tarifas SKY con Centro de Ayuda'),
 ('mejores-playas-de-florianopolis',['florianopolis-playas','floripa','florianopolis'],'Mejores playas de Florianópolis','Brasil · Florianópolis (FLN)','cayó de 34,5 a 0,4 ses/día; pre28 987 sesiones; temporada ene-feb (ef26 244)','2026-12-04','Distinto de clima-florianopolis; viaje-a-florianopolis está 404 (sumar 301)'),
 ('punta-del-este-montevideo',['punta-del-este-playas','punta-del-este-sky'],'Punta del Este desde Montevideo: playas y cómo llegar','Uruguay · Montevideo (MVD)','26.995 impr. ago-sep, CTR 0,5 %; temporada ene-feb; US$ 45','2026-12-04','Backlog #28'),
 ('como-llegar-ahornopiren',['hornopiren','hornopiren-2','donde-queda-hornopiren','hornopiren-que-hacer-en-este-destino-natural-de-chile','parque-hornopiren-que-ver-y-como-llegar'],'Hornopirén desde Puerto Montt','Chile · Puerto Montt (PMC)','6→1; ef26 471 (×3 vs nov-dic): Carretera Austral en verano; 98 % lector Chile','2026-12-11','Corregir slug «ahornopiren» sólo si se hace 301 (riesgo); alrededores PMC'),
 ('aeropuerto-chiloe',[],'Aeropuerto de Chiloé (Mocopulli) y cómo moverse','Chile · Castro (MHC)','mayor valor CPC del inventario elegible (US$ 181); ef26 616','2026-12-11','Enlazar N14 Curanto (nov)'),
 ('destinos-de-verano',['verano-en-chile','verano-en-chile-2','verano-en-chile-3','mejores-destinos-en-verano','vacaciones-de-verano'],'Dónde viajar en verano (Sudamérica con SKY)','Multidestino','31.853 impr. con 29 clics (CTR 0,09 %): la mayor brecha de CTR; 5 URL de verano compiten','2026-12-04','Lote recuperación 15-10 #7 (no aplicado); sección «verano en Chile» absorbe el grupo'),
 ('lugares-turisticos-chile',[],'Lugares turísticos de Chile por zona','Chile','pre28 1.365 sesiones → 5 clics en ago-sep (mayor pérdida relativa); 288 clics en temporada','2026-12-11','Lote recuperación 15-10 #6: reparar CTA literal'),
 ('puerto-natales-a-torres-del-paine',['parque-nacional-torres-del-paine','parque-nacional-torres-del-paine-2','parque-nacional-torres-del-paine-3','trekking-en-torres-del-paine'],'Torres del Paine desde Puerto Natales','Chile · Puerto Natales (PNT)','temporada alta nov-mar; 6 URL; posición 23 en 2025 (mejorable)','2026-12-04','Mantener mejor-fecha-para-ir-a-torres-del-paine como satélite o sumarla'),
 ('mejor-fecha-para-viajar-a-tarapoto',[],'Mejor época para viajar a Tarapoto (lluvias)','Perú · Tarapoto (TPP)','dic-mar es temporada de lluvias: ef26 281; 97 % lector Perú','2026-12-11','Satélite de O21 (nov); el grupo pide mantenerla aparte'),
 ('pasaje-en-linea',['pasajes-aereos-en-linea'],'Servicio: comprar pasajes en línea en SKY de forma segura','General (PE/CL)','26.634 impr. ago-sep y 327 clics que se sostienen fuera de temporada; 63 % lector Perú; compra de pasajes de verano','2026-12-04','Segunda guía del grupo «Pasajes baratos» (la otra es comprar-pasajes-baratos); medios de pago y canales desde Centro de Ayuda'),
 ('playas-de-piura',[],'Las mejores playas de Piura','Perú · Piura (PIU)','verano peruano: ef26 134; 81 % lector Perú; pérdida ~340 sesiones','2026-12-04','Hub que enlaza O18 Máncora, N2 Colán (nov) sin repetirlos'),
 ('circuito-de-playas-de-la-costa-verde',['costa-verde','playas-de-lima','playas-de-lima-2'],'Playas de Lima: Costa Verde','Perú · Lima (LIM)','4→1; 8.353 impr. ago-sep; ef26 126; verano limeño','2026-12-04','playas-de-lima y -2 son duplicado directo'),
 ('viaje-a-juliaca',[],'Qué hacer en Juliaca (puerta al Titicaca y la Candelaria)','Perú · Juliaca (JUL)','Candelaria feb-2027: ef26 101 vs as26 5; 90 % lector Perú','2026-12-10','Coordinar con N5 lago-titicaca y N6 Candelaria; no duplicar Puno'),
 ('canon-de-shucto',[],'Cañón de Shucto: cómo llegar desde Jauja','Perú · Jauja (JAU)','ef26 154; 98 % lector Perú; alrededores del aeropuerto de Jauja','2026-12-11','Ubicación (Junín) a verificar; advertir lluvias dic-mar'),
 ('mejores-asientos-avion',[],'Cómo elegir asiento en el avión (y asientos SKY)','General','guía de servicio no rechazada: 383 clics en temporada; pérdida ~570 sesiones vs pre','2026-12-11','Datos de selección de asiento por tarifa desde Centro de Ayuda'),
]
S=[
 ('asistencia-al-viajero',['seguro-de-viaje','como-funciona-un-seguro-de-viaje','asistencia-para-viajes-internacionales','seguro-de-viaje-de-covid-19'],'Asistencia/seguro de viaje 5→1 (covid → 410); 990 clics en temporada, US$ 30'),
 ('salvador-de-bahia',['playas-salvador-bahia','playas-salvador-bahia-2','salvador-de-bahia-playas','que-hacer-salvador-bahia','salvador-de-brasil','salvador-bahia-que-hacer-viaje-cultural-gastronomico'],'Salvador de Bahía 7→1; 451 clics en temporada; lector AR/CL'),
 ('el-tiempo-en-florianopolis',['clima-florianopolis','clima-florianopolis-2'],'Clima Florianópolis 3→1; 32.238 impr. ago-sep'),
 ('clima-en-punta-cana-cual-es-la-mejor-epoca-para-viajar',['mejor-fecha-para-viajar-punta-cana','temporada-de-huracanes-en-punta-cana-meses-y-precauciones','punta-cana-en-temporada-baja','sargazo-en-punta-cana'],'Punta Cana mes a mes 5→1; 894 clics, pre28 1.454; choca con O15 (dónde queda + clima) → decidir con O15'),
 ('viajar-a-coyhaique',[],'Coyhaique (BBA); ef26 255, US$ 20; unir o enlazar a-donde-ir-en-balmaceda'),
 ('que-hacer-en-chiclayo',['como-llegar-chiclayo','sky-inicia-vuelos-a-chiclayo-y-apuesta-por-el-norte-peruano','sky-operara-vuelos-diarios-entre-lima-y-chiclayo-desde-julio'],'Chiclayo: 23.788 impr. latentes en como-llegar-chiclayo (CTR 0,2 %), pero los clics del clúster son de marca/ruta; Lima–Chiclayo no está Activa en Notion'),
 ('estado-de-vuelo',['seguimiento-de-vuelos'],'Estado de vuelo 2→1; 536 clics en temporada'),
 ('normas-para-viajar-en-avion',[],'Normas para viajar en avión; 1.336 clics en temporada; posible solape con viajes-avion'),
 ('trujillo-peru',[],'Trujillo (Marinera, fines de enero); lote recuperación #10; 6.467 impr.'),
 ('nevado-rajuntay',[],'Nevado Rajuntay desde Lima: 9.028 impr. ago-sep con CTR 0,2 %; 97 % lector Perú; temporada de lluvias'),
]
def unit_metrics(canon, unir):
    sl=[canon]+unir; ms=[inv[s] for s in sl if s in inv]
    sm=lambda c: sum(num(m[c]) for m in ms)
    d=dict(nd25=sm('gsc_clics_nov-dic25'), ef26=sm('gsc_clics_ene-feb26'), ma26=sm('gsc_clics_mar-abr26'), as26=sm('gsc_clics_ago-sep26'), impr=sm('gsc_impr_ago-sep26'),
           pre28=sm('ga4_org_pre28_25ago-21sep25'), ga_ef26=sm('ga4_org_ene-feb26'), ga_as26=sm('ga4_org_ago-sep26'), sdpre=sm('ga4_ses_dia_pre'), sdnow=sm('ga4_ses_dia_ago-sep26'))
    d['missing']=[s for s in sl if s not in inv]
    d['estado']=';'.join(sorted(set(m['estado_live_2026-10-23'] for m in ms)))
    d['titulo']=inv[canon]['titulo'] if canon in inv else ''
    d['tipo']=inv[canon]['tipo'] if canon in inv else ''
    d['ctr']=round(100*d['as26']/d['impr'],2) if d['impr'] else ''
    pi=sum(pos25[s][0] for s in sl); d['pos25']=round(sum(pos25[s][1] for s in sl)/pi,1) if pi else ''
    cc=collections.Counter()
    for s in sl: cc.update(c25[s]); cc.update(c26[s])
    t=sum(cc.values()); d['lector_n']=t
    names={'chl':'Chile','per':'Perú','arg':'Argentina','ury':'Uruguay','bra':'Brasil','col':'Colombia','esp':'España','mex':'México','usa':'EE.UU.'}
    d['lector']=' · '.join('%s %d%%'%(names.get(k,k),round(100*v/t)) for k,v in cc.most_common(3)) if t else 's/d'
    d['lector_top']=names.get(cc.most_common(1)[0][0],cc.most_common(1)[0][0]) if t else 's/d'
    d['val26']=round(sum(val26[s] for s in sl),2)
    d['loss']=round(max(0,d['sdpre']-d['sdnow'])*61)
    d['excl_hit']=[s for s in sl if s in excl]
    return d
rows=[]
for canon,unir,tema,dest,porque,fecha,nota in U:
    d=unit_metrics(canon,unir)
    latent=d['impr']*max(0,0.03-(d['as26']/d['impr'] if d['impr'] else 0))
    d['score']=round(d['nd25']+d['ef26']+0.5*d['loss']+0.5*latent+3*d['val26'],1)
    rows.append(dict(canon=canon,unir=unir,tema=tema,dest=dest,porque=porque,fecha=fecha,nota=nota,**d))
rows.sort(key=lambda r:-r['score'])
for i,r in enumerate(rows,1): r['n']=i
with open(os.path.join(OUT,'SKY-reescrituras-diciembre-2026-top25.csv'),'w',newline='',encoding='utf-8') as f:
    w=csv.writer(f)
    w.writerow(['prioridad','url_canonica','urls_unir_301','titulo_actual','tema','destino_pais','pais_lector','base_clics_pais','clics_nov-dic25','clics_ene-feb26','clics_mar-abr26','clics_ago-sep26','impr_ago-sep26','ctr_ago-sep26_%','pos_promedio_www_jul-sep25','ga4_pre28','ga4_ene-feb26','perdida_sesiones_60d_vs_pre','valor_usd_ago-oct26','puntaje','por_que_diciembre','publicar_antes_de','notas','estado_live'])
    for r in rows:
        w.writerow([r['n'],'https://blog.skyairline.com/%s/'%r['canon'],' | '.join('/%s/'%s for s in r['unir']),r['titulo'],r['tema'],r['dest'],r['lector'],r['lector_n'],int(r['nd25']),int(r['ef26']),int(r['ma26']),int(r['as26']),int(r['impr']),r['ctr'],r['pos25'],int(r['pre28']),int(r['ga_ef26']),r['loss'],r['val26'],r['score'],r['porque'],r['fecha'],r['nota'],r['estado']])
for r in rows:
    print(r['n'],r['score'],r['canon'][:45],len(r['unir']),'|',r['lector'],'n=',r['lector_n'],'| nd',int(r['nd25']),'ef',int(r['ef26']),'pre',int(r['pre28']),'im',int(r['impr']),'ctr',r['ctr'],'pos',r['pos25'],'v',r['val26'],'loss',r['loss'],'| miss',r['missing'],'excl',r['excl_hit'],r['estado'][:12],'|',r['titulo'][:40])
print('--- suplentes')
sup=[]
for canon,unir,line in S:
    d=unit_metrics(canon,unir); print(canon[:45],'|',d['lector'],'| nd',int(d['nd25']),'ef',int(d['ef26']),'im',int(d['impr']),'pre',int(d['pre28']),'v',d['val26'],'excl',d['excl_hit'],d['missing'])
    sup.append(dict(canon=canon,unir=unir,line=line,**d))
json.dump(sup,open(os.path.join(OUT,'suplentes.json'),'w'),ensure_ascii=False,indent=1,default=str)
with open(os.path.join(OUT,'SKY-reescrituras-diciembre-2026-suplentes.csv'),'w',newline='',encoding='utf-8') as f:
    w=csv.writer(f); w.writerow(['url_canonica','urls_unir_301','pais_lector','clics_nov-dic25','clics_ene-feb26','impr_ago-sep26','ga4_pre28','valor_usd_ago-oct26','nota'])
    [w.writerow(['https://blog.skyairline.com/%s/'%d['canon'],' | '.join('/%s/'%x for x in d['unir']),d['lector'],int(d['nd25']),int(d['ef26']),int(d['impr']),int(d['pre28']),d['val26'],d['line']]) for d in sup]
# distributions
print(collections.Counter(r['lector_top'] for r in rows)); print(collections.Counter(r['tipo'] for r in rows))
print('total urls tocadas', sum(1+len(r['unir']) for r in rows))
