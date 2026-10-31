import fs from 'node:fs/promises'
import path from 'node:path'

import { EFEONCE_CONTACT, EFEONCE_OPERATING_MARKETS, EFEONCE_LEGAL_NAME_FALLBACK, EFEONCE_TAX_ID_FALLBACK } from '@/config/efeonce-brand'

async function main() {
const root = path.resolve('outputs/prospeccion-2026-10-24')
const data = JSON.parse(await fs.readFile(path.join(root, 'datos.json'), 'utf8'))
const radar = JSON.parse(await fs.readFile(path.join(root, 'radar.json'), 'utf8'))
const s = data.stats
const pct = (n:number,d:number) => `${(100*n/d).toFixed(1).replace('.',',')} %`
const edition = 'Comercial · Prospección · Octubre 2026'
const footer = { footerEdition: edition, footerContact: { address: EFEONCE_CONTACT.addressDisplay, phone: EFEONCE_CONTACT.phones[0].display } }
const pages:any[] = []
const common = (section:string) => ({clientName:'Confidencial · Uso interno', runningSection:section, runningPeriod:'Corte: 24 de octubre de 2026', ...footer})
const close = (meaning:string,action:string) => [{kind:'measure',label:'Lo que significa',text:meaning},{kind:'action',label:'Decisión propuesta',text:action,signature:'Recomendación de Efeonce'}]
const narrative=(id:string,title:string,lead:string,paragraphs:string[],meaning:string,action:string)=>pages.push({slideId:id,contentType:'report-narrative',body:true,slots:{...common('Análisis comercial'),eyebrow:'Efectividad de la prospección',assertion:title,lead,paragraphs,closing:close(meaning,action)}})
const table=(id:string,title:string,hero:string,heroText:string,cols:string[],rows:any[],source:string,coverage:string,meaning:string,action:string)=>pages.push({slideId:id,contentType:'report-table',body:true,slots:{...common('Evidencia cuantitativa'),eyebrow:'Evidencia comercial',heroFigure:hero,heroText,tableTitle:title,boardTitle:title.length>48?'Datos de respaldo':title,tableColumns:cols.map(label=>({label})),tableRows:rows,barMode:'none',source:{label:'Fuente',text:source},coverage:{label:'Cobertura',text:coverage},closing:close(meaning,action)}})

pages.push({slideId:'portada',contentType:'report-cover',slots:{editionLabel:edition,productLabel:'COMERCIAL',eyebrow:'Efeonce · Dirección comercial',reportTitle:'Prospección: actividad, avance y resultados',reportSubtitle:'Histórico 2025–2026 y acciones de octubre. Cómo convertir investigación en conversaciones y ventas.',confidentialityLine:'Confidencial · Uso interno · Versión 1 · 24 de octubre de 2026'}})
pages.push({slideId:'resumen',contentType:'report-summary',body:true,slots:{...common('Resumen ejecutivo'),eyebrow:'Resumen ejecutivo',thesis:'Hay actividad sostenida; los avances se concentran en necesidades concretas y relaciones existentes.',thesisLead:'El volumen de investigación supera el avance comercial. El histórico sí registra ventas, pero la ola de octubre todavía no acredita cierres ganados. La prioridad es convertir las conversaciones abiertas y corregir el seguimiento.',essentialsLabel:'Lo esencial',essentials:[
{figure:String(s.oct_outreach_messages),title:'Correos de prospección en octubre',detail:`A ${s.oct_outreach_accounts} cuentas y ${s.oct_recipient_mailboxes} casillas. Se excluyen ocho intentos fallidos del conteo de envíos.`,folio:'@@resumen-campanas@@'},
{figure:pct(7,62),title:'Cuentas con respuesta humana por email',detail:'Siete de 62: cuatro sin cierre negativo y tres negativas. Una conversación adicional se documentó en LinkedIn.',folio:'@@respuestas@@'},
{figure:pct(20,222),title:'Ganados entre negocios cerrados',detail:'20 ganados y 202 perdidos en el CRM histórico. Es una tasa registral; incluye expansión y cierres administrativos.',folio:'@@historico@@'},
{figure:'52',title:'Casos conservados por el radar',detail:'29 siguen en investigación. El último reporte no entrega una nueva compra lista para recomendar postulación.',folio:'@@radar@@'},
{figure:'0',title:'Ganados en negocios creados en octubre',detail:'Es un corte temprano: no demuestra que la ola fracasó ni permite calcular aún su rentabilidad.',folio:'@@limites@@'}],decision:{label:'Decisión propuesta',text:'Concentrar el esfuerzo en demanda confirmada, referidos y expansión; limitar preparación sin admisión; medir costo y siguiente compromiso por cuenta.',signature:'Recomendación de Efeonce'}}})
table('cobertura','Qué se cuantificó y qué significa','1.701','Actividades salientes históricas; incluyen operación y calendarios.', ['#','Universo','Cantidad','Unidad'],[
{entity:'Correo histórico de Julio',valueA:'1.701',valueB:'Actividades'},
{entity:'Inventario comercial',valueA:'298',valueB:'Negocios'},
{entity:'Empresas investigadas',valueA:'159',valueB:'Empresas CRM'},
{entity:'Contactos investigados',valueA:'185',valueB:'Contactos CRM'},
{entity:'Contactos con email presente',valueA:'172 / 185',valueB:'Presencia'},
{entity:'Historial de radar',valueA:'52',valueB:'Casos'},
{entity:'Correo de prospección octubre',valueA:'146',valueB:'Enviados'},
{entity:'Cuentas contactadas octubre',valueA:'62',valueB:'Agrupaciones'}
], 'CRM y Outlook, leídos el 24/10/2026.','Los universos se solapan; nunca se suman como un embudo.', 'Investigar, registrar, contactar, conversar y vender son hitos diferentes.', 'Evaluar por cuenta e iniciativa; separar captación de expansión y operación.')
const channelNames=['Prospección directa','Referidos','Marketing','Partnership','WherEX','Mercado público','Marketing;Prospección directa','sin_dato']

table('historico','El histórico favorece el acceso directo','20 / 222','Negocios ganados entre cerrados: 9,0 %; no tasa de propuestas.', ['#','Canal registrado','Ganados/cerrados','Tasa'],channelNames.map(k=>{const x=data.groups.channels[k];

return {entity:k==='sin_dato'?'Sin canal de origen':k==='Marketing;Prospección directa'?'Marketing + prospección':k,valueA:`${x.won} / ${x.won+x.lost}`,valueB:pct(x.won,x.won+x.lost)}}), '298 negocios actuales de HubSpot; canal de adquisición registrado.','118 de 298 carecen de canal. Mezcla captación, expansión y no postulación.', 'La relación entre canal y resultado orienta la inversión; no demuestra causalidad.', 'Favorecer acceso verificable y registrar por separado cada etapa del proceso.')
narrative('ventas','La mitad de los ganados corresponde a clientes existentes','El CRM registra 20 ganados: diez de negocio existente, nueve de negocio nuevo y uno sin tipo.',[
`Negocio nuevo: 9 ganados de 147 cerrados (${pct(9,147)}). Negocio existente: 10 de 57 (${pct(10,57)}). Son cohortes de distinta madurez y no una prueba experimental.`,
'El histórico registra resultados en SKY, Berel, SSilva, ANAM/Ecoriles, Aguas Andinas, DDSoft y entidades públicas. Renovación, ampliación, licencias y adquisición no deben atribuirse a una sola campaña.',
'El negocio de Blog SEO/AEO de SKY fue creado en julio y figura ganado en septiembre. No es un cierre producido por la prospección de octubre.',
'Cuatro ganados no tienen monto y otro tiene cero. Los importes mezclan monedas y períodos: no se suman como facturación, ingresos cobrados o retorno de inversión.'
], 'La expansión y la relación existente son una fuente comprobable de continuidad comercial.', 'Reservar capacidad para ambas, con metas separadas de adquisición nueva.')
table('resumen-campanas','Octubre: 146 correos para 62 cuentas','62','Agrupaciones por cuenta; 88 casillas destinatarias o en copia.', ['#','Recorrido principal','Cuentas','Correos'],data.motion.map((x:any)=>({entity:({frio_agente:'Agente y reactivación',senal_focalizada:'Señal / investigación focal',proceso_compra:'Procesos de compra',conversacion_previa:'Conversación o relación previa'} as any)[x.motion],valueA:String(x.accounts),valueB:String(x.outlook_messages)})), 'Enviados de Outlook del 1 al 24 de octubre, conciliados con CRM.','Incluye rechazos y correos correctivos; no son 146 primeros contactos.', 'El grupo automatizado aporta 52 envíos y una respuesta humana, negativa.', 'Evaluar pertinencia y errores antes de aumentar destinatarios o frecuencia.')
table('respuestas','Las respuestas tienen desenlaces diferentes','7 / 62','Respuesta humana por email en octubre: 11,3 % observado.', ['#','Cuenta','Respuesta','Estado'],[
{entity:'izipay',valueA:'Invitación',valueB:'Proceso'},
{entity:'Olivos del Sur',valueA:'Recepción',valueB:'Revisión'},
{entity:'Pichincha / Pibank Perú',valueA:'Precisiones',valueB:'Evaluación'},
{entity:'Momentum',valueA:'Revisará',valueB:'Revisión'},
{entity:'Fabrimetal',valueA:'Otra agencia',valueB:'Detener'},
{entity:'TVN',valueA:'Entrada tardía',valueB:'Detener'},
{entity:'Socopur',valueA:'Proceso cerrado',valueB:'Detener'}
], 'Mensajes originales de Outlook; clasificación manual del contenido.','Se excluyen newsletter de Duemint y respuestas automáticas.', 'Cuatro cuentas siguen en revisión; ninguna de esas respuestas acredita una compra.', 'Assetplan suma conversación útil en LinkedIn; mantener su canal diferenciado.')
narrative('acceso','El mejor avance aparece cuando el comprador confirma su trabajo pendiente','La muestra favorece conversaciones concretas. Su tamaño y madurez impiden declarar un canal ganador.',[
'Assetplan confirmó liderazgo de CRM, 90 usuarios y unas 25 horas mensuales de apoyo. Se envió propuesta. Es evidencia de necesidad y evaluación; presupuesto final, cierre y aceptación siguen pendientes.',
'Pibank pidió propuesta de SEO/GEO/AEO y luego precisiones de impuestos, costos y referencias. SGS tuvo reunión y recibió propuesta técnica; faltan datos para cerrar la económica.',
'izipay invitó a participar y acusó interés. Falta confirmar admisión de proveedor extranjero, documentación y calendario. La invitación ocurrió después del acercamiento, sin prueba de que éste la causara.',
'Olivos recepciona antecedentes para evaluación interna. Momentum revisaría la propuesta. Son continuidades comerciales; todavía no hay encargo o siguiente compromiso bilateral acreditados.'
], 'La pertinencia abre una conversación; después importa acordar una decisión concreta.', 'Priorizar Assetplan, Pibank y SGS; respetar las esperas y calendarios de Compras.')
narrative('ejecucion','Los fallos de ejecución reducen el rendimiento medible','El CRM conserva 153 actividades en la cohorte; ocho fallaron. Outlook acredita 146 copias enviadas.',[
'La conciliación explica la diferencia: 153 actividades menos ocho fallidas, más un envío de Forus ausente en ese resultado CRM. Los envíos de Outlook incluyen mensajes que después rebotaron.',
'Rebotes identificados: Forus, Unilever, izipay y Bivien. Tres figuran como BOUNCED en la extracción y Forus tiene NDR documental. Correo válido en un proveedor no garantiza entrega.',
'El agente de prospección conserva nueve contactos con error, diez en curso y dos finalizados. Dos que figuraban en curso el 21/10 ya están finalizados. Error no equivale a negativa.',
'Hay 13 contactos actualmente inscritos en secuencias. Las de Glasstech y Antalis se guardaron sin inscripción: diez textos preparados y cero envíos. Arcor tiene pendiente su canal LinkedIn.'
], 'Programación y automatización activa no prueban despacho, entrega ni conversación.', 'Conciliar cada error y respuesta; evitar seguimientos paralelos a la misma cuenta.')
narrative('radar','El radar produce investigación; la admisión y la oportunidad siguen siendo el cuello de botella','52 casos conservados, 51 entradas de ejecución y actualización; 29 casos siguen en investigación.',[
'El reporte del 24/10 cubre cuatro mercados y cinco líneas. Registra 52 consultas de descubrimiento, pero ninguna compra nueva con evidencia suficiente para recomendar postulación. Acceso parcial no equivale a ausencia de demanda.',
'Socopur se detectó el 06/10 y el interés cerraba el 05/10: un día calendario tarde. TVN tampoco admitió entrada posterior. Esenttia ya estaba adjudicada cuando se trabajó como posible oportunidad.',
'Se documentan ofertas presentadas de UTEM, Sika creativa y Gana programática. UTEM figura perdida; las otras conservan evaluación pendiente. La tasa de adjudicación no se calcula con casos aún abiertos.',
'En el CRM, al menos 32 de los 34 perdidos con motivo cargado describen no presentación, descarte o error de admisión. Los otros 168 perdidos no tienen motivo estructurado. No son 202 derrotas competitivas verificadas.'
], 'La detección sólo vale comercialmente si deja tiempo útil y condiciones de participación.', 'Medir primera puerta y margen útil; decidir pronto si preparar una oferta o archivar.')
narrative('continuidad','La demora propia también consume oportunidades con interés','Momentum muestra una falla de continuidad distinta de la falta de respuesta del comprador.',[
'El 8 de septiembre el comprador informó que estaba en la reunión y no había nadie. El 29 volvió a pedir la propuesta; el 8 de octubre preguntó si llegaría o avanzaba con otro partner.',
'La propuesta salió el 12/10 y el comprador respondió el 13/10 que la revisaría. Este caso no permite culpar a la demanda ni al canal: hay fricción propia documentada que merece corrección.',
'El lote de seis cuentas del 13/10 recibió 18 correos hasta el 22/10. No hay respuesta humana localizada; Bivien terminó rebotando. No hay base para afirmar que más pasos por sí solos mejoran la conversión.',
'Ocho cuentas focalizadas recibieron su primer email entre el 22 y el 24/10. Carecen de una ventana suficiente para evaluar respuesta. Compararlas directamente con cuentas trabajadas desde el 8/10 distorsionaría el resultado.'
], 'La capacidad de cumplir lo prometido debe crecer antes que el volumen de nuevos contactos.', 'Dar responsable y fecha a cada compromiso propio; medir antigüedad por cohorte.')
narrative('prioridades','La siguiente inversión debe concentrarse en convertir y aprender','Recomendación para Julio y Commercial; no modifica automatizaciones ni inicia nuevas comunicaciones.',[
'Prioridad 1: Assetplan, Pibank y SGS. Convertir necesidades en alcance, dato pendiente y siguiente decisión bilateral. Mantener las condiciones ya enviadas; no rehacer propuestas sin feedback.',
'Prioridad 2: izipay, Olivos y Momentum. Resolver admisión o primera evaluación en el momento permitido por cada hilo. Pierre Fabre de medios y su iniciativa CRM se siguen por separado.',
'Prioridad 3: revisar errores del agente y rebotes; conservar STOP de TVN, Socopur, Fabrimetal y Esenttia. Conciliar las fechas vencidas del pipeline antes de usarlo como forecast.',
'Para la siguiente cohorte, registrar horas, preventa, créditos y herramientas por cuenta. Comparar respuesta humana, próximo paso acordado, propuesta presentada, resultado e ingreso cobrado a igual antigüedad.'
], 'No hay datos completos de costo o atribución para calcular CAC, ROI o rentabilidad por canal.', 'Priorizar con evidencia; confirmar la mejora con una cohorte nueva y comparable.')
pages.push({slideId:'limites',contentType:'report-limits',body:true,slots:{...common('Método y límites'),eyebrow:'Método y límites',heroFigure:'6',heroText:'límites que cambian la interpretación de los resultados',assertion:'Este informe evalúa evidencia; no certifica ingresos ni causalidad',limits:[
{subject:'Universos distintos',cause:'298 negocios, 159 empresas, 185 contactos, 52 casos y 62 cuentas de octubre se solapan; no forman un embudo único.'},
{subject:'Historia de correo',cause:'1.701 actividades son metadatos desde enero de 2025. Cuerpos e interacciones se revisaron en los hilos recientes relevantes.'},
{subject:'Cobertura de respuestas',cause:'88 casillas y sus hilos; otros alias y canales pueden contener respuestas no incluidas. Tasas observadas, no exhaustivas.'},
{subject:'LinkedIn',cause:'Se usa evidencia conservada por caso. No se reabrió el buzón completo ni se calcula una tasa global de InMail.'},
{subject:'Atribución y madurez',cause:'118 negocios sin canal; cohortes de distintas fechas, expansión mezclada y cierres administrativos limitan comparaciones.'},
{subject:'Costo y resultado',cause:'Faltan horas, costos completos y contratos/cobros conciliados. Ganado en CRM no es facturación ni dinero recibido.'}],methodologyLabel:'Fuentes y cálculo',methodology:[
'HubSpot y Outlook: lectura del 24/10/2026; portal de Efeonce e identidad de Julio comprobados.',
'298 negocios y 1.701 actividades salientes, sin IDs repetidos. Outlook: 376 copias desde septiembre.',
'Respuestas: 21 mensajes desde septiembre, 14 de octubre; clasificación separa humanos, OOO y newsletter.',
'Radar y expedientes por cuenta al 24/10; prevalecen sus actualizaciones.',
'Ganados/cerrados = 20/222. Respuesta humana email = 7/62; no se confunde con respuesta favorable.'
]}})
pages.push({slideId:'contraportada',contentType:'report-back-cover',slots:{editionLabel:edition,contact:{email:EFEONCE_CONTACT.email,phonePrimary:EFEONCE_CONTACT.phones[0].display,phoneSecondary:EFEONCE_CONTACT.phones[1].display,address:EFEONCE_CONTACT.addressDisplay},marketsLine:EFEONCE_OPERATING_MARKETS.join(' · '),legalLine:`${EFEONCE_LEGAL_NAME_FALLBACK} · RUT ${EFEONCE_TAX_ID_FALLBACK} · Confidencial · Uso interno · Corte 24/10/2026`}})
const folio=(id:string)=>String(pages.findIndex(p=>p.slideId===id)+1).padStart(2,'0')

pages.forEach((p,i)=>{if(p.body)p.slots.folio={page:String(i+1).padStart(2,'0'),total:String(pages.length).padStart(2,'0')}})
const plan=JSON.parse(JSON.stringify({tenderId:'Efeonce-Analisis-Prospeccion-2026-10-24',slides:pages}).replace(/@@([a-z-]+)@@/g,(_,id)=>`p. ${folio(id)}`))

await fs.writeFile(path.join(root,'informe.plan.json'),JSON.stringify(plan,null,2))

const csv=(rows:any[])=>{const keys=Object.keys(rows[0]);

return '\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n'}

await fs.writeFile(path.join(root,'cuentas-octubre.csv'),csv(data.accounts.map((a:any)=>({cuenta:a.account,pais_iniciativa:a.country,recorrido:({frio_agente:'Agente y reactivación',senal_focalizada:'Señal / investigación focal',proceso_compra:'Proceso de compra',conversacion_previa:'Conversación o relación previa'} as any)[a.motion],servicio:a.service,correos_enviados:a.outlook_messages,casillas:a.actualRecipients,intentos_crm:a.messages,crm_sent:a.sent,crm_bounced:a.bounced,respuesta_email:a.humanReply??'No localizada',primera_actividad_octubre:a.first,ultima_actividad_octubre:a.last}))))
await fs.writeFile(path.join(root,'negocios-historicos.csv'),csv(data.deals))
await fs.writeFile(path.join(root,'radar.csv'),csv(radar.map((x:any)=>({...x,next_action:typeof x.next_action==='object'?JSON.stringify(x.next_action):x.next_action}))))
const title='# Efeonce · Análisis de prospección\n\nConfidencial · Uso interno · Corte: 24/10/2026, America/Santiago.\n\n'
let md=title+'La actividad es sostenida, pero los avances se concentran en necesidades concretas, relaciones y procesos accesibles. La cohorte de octubre todavía no registra un negocio creado ese mes como ganado. El histórico sí registra 20 ganados; no se atribuyen a esa cohorte.\n\n'

for(const p of pages){if(p.contentType==='report-cover'||p.contentType==='report-back-cover')continue;const z=p.slots;

md+=`## ${z.thesis||z.tableTitle||z.assertion||'Método y límites'}\n\n`;if(z.thesisLead)md+=z.thesisLead+'\n\n';if(z.lead)md+=z.lead+'\n\n';if(z.essentials)for(const e of z.essentials)md+=`- **${e.figure} · ${e.title}.** ${e.detail}\n`;if(z.tableRows){md+='| '+z.tableColumns.slice(1).map((c:any)=>c.label).join(' | ')+' |\n|---|---:|---:|\n';for(const r of z.tableRows)md+=`| ${r.entity} | ${r.valueA} | ${r.valueB} |\n`;md+=`\nFuente: ${z.source.text} ${z.coverage.text}\n\n`;}if(z.paragraphs)md+=z.paragraphs.join('\n\n')+'\n\n';if(z.limits)for(const l of z.limits)md+=`- **${l.subject}:** ${l.cause}\n`;if(z.methodology)md+='\n'+z.methodology.map((x:string)=>'- '+x).join('\n')+'\n\n';if(z.closing)md+=z.closing.map((x:any)=>`**${x.label}:** ${x.text}`).join('\n\n')+'\n\n';md+='\n'}

md+='## Detalle por cuenta de octubre\n\nCorreos = copias de Enviados; pueden tener rebote posterior. Casillas no equivalen a personas ni a miembros compradores confirmados. La primera actividad es la primera observada en octubre, no el inicio histórico de la relación.\n\n| Cuenta | País de iniciativa | Correos | Casillas | Respuesta email octubre |\n|---|---|---:|---:|---|\n'
for(const a of data.accounts)md+=`| ${a.account} | ${a.country} | ${a.outlook_messages} | ${a.actualRecipients} | ${a.humanReply??'No localizada'} |\n`
md+='\n## Fuentes y trazabilidad\n\n- [Datos calculados](datos.json), [62 cuentas](cuentas-octubre.csv), [298 negocios](negocios-historicos.csv) y [52 casos de radar](radar.csv).\n- [Auditoría de correspondencia del 21/10](../../docs/commercial/follow-up-agent/runs/2026-10-21-revision-integral-correos.md).\n- [Radar del 24/10](../../docs/commercial/prospecting-agent/runs/2026-10-24-0906.md).\n- [Assetplan: necesidad y propuesta](../../docs/commercial/prospecting-agent/runs/2026-10-20-1221-assetplan-deal.md).\n- [SGS: reunión y propuesta técnica](../../docs/commercial/prospects/sgs-chile-contactabilidad-2026/CONTINUIDAD.md).\n- [izipay y Olivos: respuestas](../../docs/commercial/follow-up-agent/runs/2026-10-21-1055-respuestas-izipay-olivos.md).\n- [Cinco casos focalizados](../../docs/commercial/prospecting-agent/runs/2026-10-24-cierre-chat-prospeccion.md); [Lucía y Yvette](../../docs/commercial/prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md); [secuencias posteriores](../../docs/commercial/follow-up-agent/runs/2026-10-24-lucia-yvette-secuencias.md).\n- [Glasstech y Antalis: preparación sin inscripción](../../docs/commercial/prospects/hubspot-chile-2026-10/SECUENCIAS-GLASSTECH-ANTALIS-2026-10-19.md).\n- [Prospección de banca](../../docs/commercial/prospects/bancos-chile-2026-10/README.md): el corte de 28 contactos de 14 bancos fue corregido posteriormente por industria; no se suma como nueva población ni outreach.\n- [Negocios CRM](https://app.hubspot.com/contacts/48713323/objects/0-3/views/all/list); clasificación y montos conservan autoridad registral, no certifican contratos o cobros.\n\nNo se modificó CRM, se enviaron mensajes ni se cambiaron automatizaciones. LinkedIn se analiza con la evidencia documental; no se auditó en vivo la totalidad de sus conversaciones.\n'
await fs.writeFile(path.join(root,'INFORME.md'),md)
console.log(JSON.stringify({pages:pages.length,accounts:data.accounts.length,deals:data.deals.length,radar:radar.length,output:root}))
}

main().catch(error => { console.error(error); process.exit(1) })
