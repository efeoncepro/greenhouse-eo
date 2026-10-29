# Operar prospección B2B con agentes

Nombres de Deal/Lead: [convención vigente Efeonce](../../operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md),
aceptada el 15/10/2026. Marca/cuenta primero y separador ` | `; nuevas altas autorizadas la adoptan.
El histórico se normaliza sólo por lote autorizado con identidad/dedupe, antes/después y readback;
no reescribir snapshots fechados ni alterar asociaciones para acomodar el nombre.

Canon: [skill](../../../.codex/skills/efeonce-b2b-prospecting/SKILL.md),
[decisión](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md) y
[funcionamiento](../../documentation/comercial/prospeccion-b2b.md).

## Antes de empezar

Sales Navigator: [recorrido verificado en Chrome con Playwright](prospectar-sales-navigator-con-agentes.md)
con sesión abierta del operador: filtros de cuentas → empleados/Personas → perfil/actividad → listas.
El manual distingue investigación, configuración autorizada, guardado/readback y comunicación; documenta
Core, 150 InMail observados el 29/10 (50 fue el antecedente inicial) y uso táctico según la
[política de canal](../../operations/EFEONCE_LINKEDIN_SALES_NAVIGATOR_POLICY_V1.md).

Para cualquier nueva apertura, respuesta inbound, reactivación o seguimiento comercial, aplicar
[conversaciones útiles](../../../.codex/skills/efeonce-b2b-prospecting/references/conversation-quality-and-review.md).
La [implementación de octubre](../../commercial/analyses/2026-10-prospeccion/IMPLEMENTACION-Y-PAUTA.md)
distingue método local aplicado, cambios nativos preparados y evaluación de pauta; no autoriza envíos.

Definir cuenta/persona/señal o micro-ICP, mercado, servicio, historia y resultado pedido. Identificar las
acciones autorizadas y presupuesto si hay créditos. Una aprobación anterior cubre exactamente su alcance;
no hay que renovarla sólo porque cambie de fase el agente. Creación de skill/radar no aprueba lotes futuros.

## Recorrido

Para Sales Navigator, definir primero las cuentas por industria/sede/tamaño y comprobar la entidad exacta;
usar keywords para ampliar taxonomías como fintech clasificada en software. Conservar una base sin relación
y añadir la pasada de primer grado sólo para acceso. Inventariar un filtro no prueba haber aplicado todas
sus opciones; el control CRM bloqueado en Core no se resuelve reconectando HubSpot.

El [modelo de servicios e ICP](../../commercial/sales-navigator/PORTAFOLIO-E-ICP-2026-10-29.md) cubre las doce
landings verificadas y cinco Personas por rol. Elegir frente por problema/ownership, no por coincidencia
literal con SEO. Organizar cuentas por sector/cohorte y personas por servicio; mantener el buying group y la
tesis de cuenta compartidos entre listas. Guardar una persona en Sales Navigator no requiere email y no
equivale a crear Contact/Lead CRM, contactar ni consumir InMail. Si el mandato incluye guardar, comprobar
perfil/Cargo actual, destino exacto y membresía nominal tras recarga; conciliar intentos ambiguos antes de repetir.

1. Invocar `$efeonce-b2b-prospecting` o pedir investigación/registro/recuperación de cuenta. Cargar sólo módulos
   pertinentes; resolver entidad y leer expediente/hilo vigente. Si el pedido nombra Sales, cargar su índice
   y workflow específico instalado antes de su fase; no hacer instalación/call sólo para validar la skill.
2. Verificar tamaño/encaje, señal y fecha con fuentes dueñas; distinguir hechos, hipótesis y demanda. No
   extrapolar headcount de grupo a filial, presupuesto por tamaño o tecnología/tier por un script visible.
3. Investigar objetivo **y una base inicial de 2–3 adicionales**, sus funciones y rutas. Amplíala si faltan
   roles críticos, validadores, aprobadores u otras unidades de la oportunidad/fase: el número no es techo.
   Separar personas únicas, funciones, participación/autoridad, correo, acceso e interacción. Guardar
   vínculos confirmados/hipotéticos; para cada brecha, riesgo, owner/ruta y siguiente validación. Un rol
   crítico sin email permanece en investigación. No exigir champion ni comité completo antes de conversar.
4. Evaluar atribución, empleo y calidad de correo por separado. Revelación/enriquecimiento pagado requiere
   alcance explícito; no reiterar resultado vacío ni tratar un patrón como verificación. Dirección general,
   personal o incierta no cumple la admisión normal. Si Julio pide investigar un patrón, presentar la candidata
   como inferida y sus límites antes de actuar; una excepción expresa e informada se conserva por persona,
   dirección y acciones autorizadas, sin promover la calidad a `verified`. Si faltan datos o permiso,
   entregar estado parcial y menor chequeo útil.
5. Preparar un account brief y apertura/prueba según relación. Releer último mandato, validar claim/capacidad
   y graduar costo de preventa. Preparar preguntas de discovery sin convertir borrador en comunicación realizada.
6. Para registro pedido/autorizado, pasar a HubSpot con changeset revisable, dedupe y valores reales. Ejecutar
   sólo su alcance y leer IDs/campos/Primary/Lead automático/membresía después. Ante escritura ambigua, reconciliar
   antes de repetir. Si sólo se autorizó investigar, entregar propuesta y no escribir.
7. Entregar action pack a Commercial/seguimiento: estado observado, owner, próximo paso/fecha, fuentes y brechas.
   Mantener HSP e historial privados en radar existente; no cambiar scheduler ni crear otro.

## Si HubSpot avisa que vieron las credenciales

Aplicar [visitas a documentos](../../../.codex/skills/efeonce-b2b-prospecting/references/document-engagement-signals.md):
recuperar aviso Outlook y detalle **Documentos → Visitantes → Detalles**; comparar sesiones, páginas,
tiempos y atribución. Separar evento/aviso/consulta, usando vista previa interna para interpretar páginas.
Releer hilo, último envío, proceso, respuestas y cadencia; recomendar espera o un contacto útil sin revelar
el tracking. El mismo día/próximo hábil puede ser oportuno en el caso, nunca obligación ni permiso automático.

«Redacta» deja borrador con firma gráfica/CCO; «envíalo» sobre ese texto autoriza ese envío único.
Comprobar guardado, nueva copia en Enviados e ingestión EMAIL por separado. Registrar el delta en expediente,
REGISTRO y state existentes; no renovar inventario global ni crear secuencia por una visita.
[Indecaucho26/10](../../commercial/follow-up-agent/runs/2026-10-26-indecaucho-documento-seguimiento.md)
distingue exploración rápida, recomendación, autorización y envío/registro; admisión y respuesta pendientes.

## Radar: primera puerta y aviso temprano

1. Leer la [guía compartida](../../commercial/tenders/RADAR_EARLY_ENTRY_GUIDE.md) y el estado del proceso.
   Separar descubrimiento de vigilancia; registrar por país/servicio público y privado independientes,
   nonprofit aparte. Prioridad LATAM; Palm Desert sigue condicionado.
2. Antes de abrir, prechequear identidad canónica y URL contra bloqueos. Si falla, registrar intento y
   brecha, conservar marcadores de éxito/cobertura/IDs y detener ese acceso; no usar rutas equivalentes.
3. Aplicar solape mínimo de 72 horas desde el último corte exitoso, incluso al cruzar semana; ampliar
   ante indexación tardía acreditada/interrupción. No sustituye la frecuencia vigente ni permite simular lecturas.
4. Ordenar interés, credenciales, inscripción, visita, consultas y cierre final. Avisar al operador una
   señal primaria documentada con una acción útil sin esperar el RFP completo; acceso/eligibilidad
   pendientes siguen explícitos. Menos de cinco días hábiles a la primera puerta muestra detección tardía.
5. Registrar publicación, disponibilidad pública, detección, validación y aviso separados, con fuentes/
   precisión/zona y margen útil. No usar creación CRM como primera detección ni borrador como aviso entregado.
   No inferir causa del retraso ni prometer exhaustividad. Una guía no es una automatización desplegada.

[Socopur 2027](../../commercial/tenders/socopur-agencia-marketing-digital-2027/research/cierre-y-aprendizajes-2026-10-15-INTERNO.md):
la respuesta del 15/10 16:54:36 UTC cerró nuevas postulaciones/propuestas de este período. No insistir,
ampliar a colegas ni preparar oferta; credenciales guardadas no prometen invitación/fecha o adjudicación.
El seguimiento puntual enlazado abajo es un corte histórico anterior a esa respuesta. Estos pasos no
modifican permisos, frecuencia o suscripciones ni autorizan comunicaciones o registros CRM.

## Cuando el pedido involucra ABM / ABS

Cargar [módulo account-based](../../../.codex/skills/efeonce-b2b-prospecting/references/abm-and-abs.md).
Seleccionar cuenta por fit y decidir inversión por problema, acceso, margen/capacidad; documentar intensidad
1:1/1:few/1:many y propósito sin cuotas universales ni sustituir el tier ICP. Mantener mapas por iniciativa,
tesis compartida, owners marketing/comercial y proof que ayude a las distintas funciones a resolver una
misma decisión. Business case/MAP se preparan según fase y evidencia bilateral, no como requisito de apertura.
Dimensionar costo total, caja incremental y continuidad; medir progreso comprador, resultados/margen y
cohortes con denominador. No adoptar uplift de proveedores como meta ni declarar efecto causal por atribución.
El piloto del informe es propuesta y requiere parámetros/capacidad aprobados antes de ejecutarse.

## Herramientas de operación account-based

- Cuentas objetivo/roles HubSpot: [adapter](../../../.codex/skills/hubspot-as-a-service/references/account-based-prospecting.md)
  y changeset. Refrescar diccionario/capability; conservar valores y mapa por iniciativa. No asumir API/CLI del gráfico.
- Capacidad/preventa: [módulo](../../../.codex/skills/efeonce-b2b-prospecting/references/capacity-and-economics.md)
  y plantilla por owner/período, seguimiento y costo total/caja, con unknowns y sin tarifas nuevas.
- Discovery/prueba: [módulo](../../../.codex/skills/efeonce-b2b-prospecting/references/discovery-and-proof.md)
  por oferta/función; pregunta, baseline, prueba mínima/derechos y criterio comprador, sin claims infundados.
- Aprendizaje: [módulo](../../../.codex/skills/efeonce-b2b-prospecting/references/experiments-and-learning.md)
  y ficha por iniciativa; motivo declarado separado de hipótesis, datos a revalidar y restricciones del seguimiento existente.

## Señal, entrada, cadencia, respuesta y entrega

1. Convertir la señal en [validación y acción](../../../.codex/skills/efeonce-b2b-prospecting/references/signal-to-action.md):
   hecho/fuente/fecha, hipótesis, evidencia que la refutaría y menor chequeo útil. Confirmar entidad/ICP y
   vigencia antes de invertir; cambio de empleo reabre identidad/canal, no traslada demanda ni confianza.
2. Elegir [entrada por situación](../../../.codex/skills/efeonce-b2b-prospecting/references/situation-entry-playbooks.md):
   proveedor actual, equipo saturado, proyecto, transformación CRM u operación continua. Preparar una
   pregunta y prueba proporcional; Commercial/práctica conserva alcance, capacidad y criterios de compra.
3. Preparar [cadencia de cuenta](../../../.codex/skills/efeonce-b2b-prospecting/references/account-cadence.md):
   una tesis/owner, persona/canal/orden/motivo por paso, esfuerzo y fecha/evento de revisión. Revisar
   historial/restricciones antes de ampliar interlocutores; no enrolar como efecto de diseñar pasos.
4. Ante evento, [clasificar respuesta](../../../.codex/skills/efeonce-b2b-prospecting/references/response-handling.md)
   leyendo el hilo completo: alcance persona/iniciativa/cuenta, pausa/revisión/next step y handoff. Confirmar
   settings y parada aplicada/readback en el proveedor; OOO, silencio y bots no equivalen a rechazo o interés.
5. Antes del envío autorizado, comprobar [preparación de entrega](../../../.codex/skills/efeonce-b2b-prospecting/references/deliverability-operations.md):
   correo/persona, suppression, permiso, remitente/autenticación, restricciones/reputación, contenido y
   capacidad con su owner. Unknowns no son checks aprobados; corregir configuración exige su alcance.
   Outlook de Julio conserva firma/CCO. API accepted, Enviados, entrega, inbox, respuesta e ingestión CRM
   se verifican por separado; rebote de política no demuestra persona inexistente.

Usar sólo las plantillas del paso actual y enlazar expediente/HSP/seguimiento existente. Las cinco mejoras
actualizan el método; la autorización para crearlas no inicia piloto, campañas, pausas, DNS ni registros CRM.

## Evaluar y enviar otro correo puntual

Cargar [criterio de seguimiento](../../../.codex/skills/efeonce-b2b-prospecting/references/message-and-contextual-proof.md#decidir-si-vale-la-pena-otro-correo)
y el [adapter de envío/readback](../../../.codex/skills/hubspot-as-a-service/references/manual-outreach-follow-up.md#reply-con-firma-gráfica-y-pdf-en-outlook).
Reconstruir contactos de toda la iniciativa, respuestas y pendientes; decidir si el aporte nuevo justifica
otro toque. Elegir un receptor y una pregunta útil, sin repetir la presentación ni rodear restricciones.
La autorización condicional «si vale la pena, hazlo» permite ese envío si el criterio se cumple, sin crear
una secuencia. En procesos cerrados, preguntar por evaluación no acredita reapertura o admisión.

Con firma gráfica solicitada, usar la vía Outlook permitida y comprobar el render. Si corresponde PDF,
adjuntar la versión aprobada como copia y verificar carga terminada; no convertirla en enlace público.
Después leer mensaje, destinatarios, adjunto y EMAIL/asociaciones CRM por separado. Registrar fecha,
aporte y decisión pendiente; esperar respuesta no programa otro envío. [Socopur: aplicación y evidencia](../../commercial/tenders/socopur-agencia-marketing-digital-2027/research/seguimiento-2026-10-15-INTERNO.md).

## Programar seguimientos personalizados en HubSpot

Cargar el [módulo de secuencias](../../../.codex/skills/efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md)
y HubSpot. Para Julio, la plataforma es HubSpot; no reemplazarla por Apollo. Reutilizar autorización del
lote sin repetir confirmaciones; definir textos, aporte nuevo, brochure explicado y calendario finito.
Verificar mailbox/firma, días laborables y zona local, respuesta a cualquier correo y reunión desactivada
si el mandato exige seguir hasta respuesta. Seleccionar **Enviar más tarde**, comprobar las fechas de todos
los pasos e iniciar dentro del permiso. «Procesando» no es cierre: releer contacto, Programado y fecha.
No duplicar desde el heartbeat, ampliar destinatarios ni reiniciar a quien respondió. El logging nativo CRM
se distingue del CCO de Outlook. [Caso del 13/10](../../commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md).

Si Julio exige CCO y la UI no permite guardarlo, completar textos, documentos, firma y propuesta de calendario
antes de resolver la limitación; conservar las secuencias sin inscribir. Una autorización posterior expresa
de registro nativo con excepción al CCO se reutiliza sólo para el lote identificado, sin nueva confirmación ni
regla global. [Aplicación Lucía/Yvette](../../commercial/follow-up-agent/runs/2026-10-24-lucia-yvette-secuencias.md).
Tras Programado, reabrir Editar para leer todos los pasos/horas y salir sin guardar. Si falla el reader CLI,
conciliar UI y campos de inscripción del Contact; no repetir Iniciar por un error de decodificación.

Brochure por defecto para presentar Efeonce completa: el oficial «Agencia de Marketing 360°» (2026-10-16);
el de una línea cuando la necesidad corresponda, como Marketing de Contenidos para contenidos/UGC.
Julio ratificó el 17-10-2026 que los brochures están aprobados y no necesitan nada más. Usarlos completos,
sin revalidar láminas ni crear copias recortadas; [regla vigente](../../operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md).
Verificar versión/ID del documento existente en HubSpot y el enlace correspondiente, además del nombre. Leer cuerpo y calendario finales de la inscripción, porque pueden
diferir de la plantilla y de la ventana general. Una firma HTML configurada no prueba render en un preview
blob vacío ni entrega futura. [Aplicación web del 16/10 y límites](../../commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md).

## Problemas frecuentes

| Observación | Acción |
| --- | --- |
| Apollo devuelve persona sin email | Finalizar ese carril de email y continuar rutas; no alta vacía |
| Email valid con empleador distinto | Resolver atribución vigente; bloquear el canal ambiguo |
| Company API/Primary incorrecta | Leer entidad/automatización y preparar corrección autorizada, no fusión por heurística |
| Lead automático | Reutilizar/reconciliar, no duplicar por iniciar otra investigación |
| Publicación pide agencia | Verificar autor/entidad/fit; colegas no heredan demanda |
| Fecha vencida/HOLD | Recuperación o revisión condicionada; no afirmar convocatoria abierta ni acelerar por colegas |
| Reply/baja/OOO/bounce | Clasificar alcance y proponer parada/revisión; settings no se presumen sincronizados |
| Falta Sales/provider/harness | Descubrir capability real, usar contexto equivalente o declarar carril pendiente; no fingir ejecución |
| Opens sin respuesta | Diagnóstico limitado, no calidez; no repetir mensaje por un scanner |
| Secuencia futura ofrece Enviar ahora | Elegir Enviar más tarde y verificar fechas de todos los pasos antes de iniciar |
| Apollo lista el mailbox pero el operador pidió HubSpot | Mantener HubSpot; comprobar conexión/firma allí, sin fallback de envío |
| HubSpot dice Procesando inscripciones | Estado intermedio: reconciliar Programado/contacto/fecha antes de reportar éxito o reintentar |
| La respuesta trae más de lo pedido | Pedir sólo la decisión y su brecha; la entrega completa es para dossier o handoff |
| Se trabaja desde Claude | Radar HSP no disponible; créditos de Apollo según el módulo de sesión Claude; conectores se comprueban al iniciar |
| «Registrar contactos» y la Company no existe | La autorización cubre crear la Company si la entidad está verificada; su nota sólo si el pedido la nombra; Lead y Deal siempre aparte |

## Verificar y mantener

Antes de completar: ¿entidad y fuente claras?, ¿objetivo + adicionales buscados?, ¿emails admitidos con evidencia?,
¿relación/demanda separadas?, ¿HOLD y procesos respetados?, ¿acción dentro de permiso?, ¿readback si hubo escritura?,
¿siguiente decisión/fase y brechas críticas con owner/ruta visibles?, ¿suficiencia sin contar emails como roles? Outlook de Julio usa su política de firma/CCO y verificación de Enviados.

Mantener método editando primero un bundle, sincronizar espejo y correr `pnpm skills:mirrors`, validación de
frontmatter/rutas y eval offline sobre los escenarios afectados. Registrar decisiones/evidencia en documentación
y correr cierre/contexto después de la última edición. No confundir evaluación de archivos con conversión live.
Para medir un cambio, comparar a ciegas respuestas con y sin la skill sobre los mismos escenarios y mirar
también la extensión: el [diferencial del 2026-10-12](../../audits/commercial/2026-10-12-prospecting-claude-blind-differential.md)
describe el procedimiento y sus límites.

## Conservar cuentas con proveedor actual

Aplicar la [política de seguimiento a largo plazo](../../operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md).
Detener la cadencia actual, conservar encaje/historia y fijar una revisión interna con owner/TASK única
en HubSpot. Asociar Contact/Company y Deal pertinente, verificar readback y registrar el ID nativo.
Notion conserva trabajo operativo/entregables; cancelar duplicado comercial después del readback.
Con agencia recién contratada y sin hito, usar seis meses; hito del comprador y restricciones prevalecen.
Mantener tarea en el seguimiento existente aunque cambie el mes; revisión no autoriza contacto.
Nutrición por email requiere permiso verificable y autoridad de ejecución, distintos de presencia pública.
Caso con tarea/readback: [Fabrimetal](../../commercial/follow-up-agent/runs/2026-10-13-fabrimetal-respuesta-parada.md).

## Aplicación: búsqueda perdida, puentes y un seguimiento

[Indecaucho/Katia,18Oct2026](../../commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md):
actividad de la autora y actualización de shortlist; email publicado con atribución distinta de SMTP;
dos créditos Apollo con un correo extrapolado y otro ausente, sin altas vacías. Primer envío Outlook
con firma gráfica y EMAIL SENT leído; un seguimiento nativo futuro, desinscripción por respuesta/reunión.
Los métodos reusables viven en los módulos de investigación, calidad y secuencias de la skill, y en la
política Outlook. El expediente no renueva cobertura general ni autoriza contactar a los puentes.

## Aplicación: Agencia Creativa, patrón y lote izipay — 21/10/2026

[Registro consolidado](../../commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md):
Ana Paula por InMail sin alta ficticia; Andrés por email/CRM, antes de la corrección de capacidad;
izipay con cuatro contactos, cuatro correos iniciales, tres secuencias programadas y Laura sin inscripción
por rebote. Correos/cuerpos privados en CRM y expediente; IDs, estados y fechas en el registro.

- Aplicar [producción/fabricación local vigente](../../operations/EFEONCE_LOCAL_PRODUCTION_CAPABILITY_V1.md)
  sin negar capacidad ni inferir propiedad, ausencia de intermediarios o cumplimiento de un proyecto.
- Patrón repetido por Apollo sin evidencia independiente sigue inferido. Una excepción expresa e informada
  conserva alcance individual y calidad pendiente; no modifica el gate normal ni se acredita por envío.
- Clonar plantillas además de secuencia; personalizar por rol y comprobar independencia. Guardar ajustes
  de secuencia por separado del texto; releer fechas finales e inscripción Programado antes de cerrar.
- `verified` anterior no invalida un NDR posterior. Conservar secuencia preparada sin enrollment de la
  dirección afectada, cero inscritos verificado y diagnóstico privado; no reintentar para comprobar.
- La asociación Company puede existir aunque el reader omita `associatedcompanyid`: verificar etiqueta
  Principal en el registro, no crear otra Company ni afirmar herencia sectorial sin evidencia.

## Aplicación: Fundación Luz, candidata inferida y envío único — 22/10/2026

[Expediente Mariana](../../commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md):
búsqueda pública de PR/campaña, tres adyacentes investigados sin contactar y tres fuentes del patrón
inicial + apellido. El patrón no verificó la casilla; Julio conoció la incertidumbre y autorizó el alta
y un correo a esa candidata. La nota conserva la excepción **inferida / no verificada**; `individual_email`
es tipo de contacto, no estado técnico. La consulta Apollo ofrecida no llegó a ejecutarse ni autoriza
reportar consumo de enriquecimiento.

Se verificaron Contact/Company/Primary/nota, InMail, copia enviada de Outlook con firma gráfica/CCO y
EMAIL `SENT` asociado. Cada canal usó su enlace sobre el brochure original; un enlace generado al correo
del remitente no atribuye las vistas a la prospecta. Entrega, respuesta y membresía efectiva en segmentos
siguen sin acreditar. Esperar respuesta no crea secuencia ni permiso de otro envío; rebote o negativa
detienen la casilla afectada y exigen revisar el alcance antes de continuar.


## Aplicación: cierre multicanal del chat — 22–24/10/2026

El [cierre consolidado](../../commercial/prospecting-agent/runs/2026-10-24-cierre-chat-prospeccion.md)
reúne Fundación Luz, Arcor, Huelquén Montessori, NIASA y Disney. Es evidencia fechada; los datos de contacto,
cuerpos y enlaces individuales viven en CRM/Outlook. Cada persona conserva su propio permiso y estado:

- Identificar a la persona exacta de la captura antes de revelar o registrar datos. La sede de la Company
  global se distingue del país de la persona y de la iniciativa; no alterar la matriz para representar una filial.
- Conservar estado de correo, atribución y catch-all por separado. Un match alto o un verdict `allow` no
  resuelve por sí solo la casilla individual. La aprobación de revelación estándar no cubre waterfall ni una
  validación de pago adicional. Las excepciones informadas anteriores no se heredan a otra persona.
- Preparar el correo desde su necesidad: cómo trabajaríamos, por qué encajamos, prueba autorizada y una
  pregunta útil. Experiencia de agencia, antigüedad del partnership y disponibilidad del proyecto son hechos
  separados. Tecnología compartida y economías de escala explican eficiencia sin prometer un precio no cotizado.
- Si se piden varios brochures, compartir cada original completo con su enlace nativo propio y explicación.
  La aprobación del material no se reabre; sí se comprueban documento, destinatario, enlaces y firma en el envío.
- Leer el hilo enviado de LinkedIn aparte de Enviados/EMAIL. En Arcor ese canal quedó sin ejecutar; no cerrarlo
  por haber enviado el correo ni activarlo como efecto de documentar. Un contacto creado por Documents no
  acredita validación ni calificación. Conciliarlo antes de repetir un alta.
- NIASA fue el único mandato de secuencia de este lote. Conservar textos finales, firma, fechas y zona de
  inscripción, reglas de parada y estado por persona. Sus fechas futuras observadas no prueban ejecución.
  Una convocatoria vencida sólo admite el acercamiento autorizado como consulta de consideración tardía,
  sin afirmar recepción vigente de propuestas.

La auditoría del 24/10 confirmó las cinco actividades EMAIL `SENT`, incluida Huelquén, antes pendiente de
readback. No amplía permisos de envío, créditos, inscripciones, cambios de lifecycle o automatizaciones.

## Inferir una candidata y comprobarla sin atribuirla por el patrón

Aplicación fechada: [Lucía / Flesan y Yvette / Sigelec](../../commercial/prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md).
El recorrido de Yvette se ejecutó a petición expresa del operador; no sustituye la admisión general ni
autoriza búsquedas de variantes por defecto.

1. Buscar ejemplos exactos publicados por la empresa o fuentes primarias que vinculen persona y dirección.
   Separar dominios de grupo, marcas y entidades; anotar fuente y fecha. Los buzones generales no prueban
   una convención de direcciones individuales.
2. Si el operador pidió inferir, formular una candidata sustentada en esos ejemplos y en el nombre público
   de la persona. Comprobar qué apellido usa la convención: no tomar automáticamente el último apellido de
   un resultado enriquecido. Un patrón consistente sigue siendo inferencia, no atribución comprobada.
3. No reutilizar una candidata anterior con veredicto `invalid` ni revalidarla por haber obtenido otra.
   En Yvette, el waterfall retornó una dirección extrapolada que se descartó; el patrón sustentó una distinta.
4. Para la candidata seleccionada, verificar herramienta, campos y costo actuales; obtener aprobación
   específica antes del gasto. Una validación de una dirección no es un buscador ni autoriza enumerar
   variantes. Conservar request/record ID en el expediente privado y recuperar el resultado asíncrono.
5. Registrar el estado normalizado y el proveedor que realmente respondió. `validated` de LeadMagic
   acredita la comprobación técnica declarada; no se rebautiza como verificación de ZeroBounce ni como
   confirmación de titular. `not_validated` no significa por sí solo `invalid`.
6. Si la atribución sigue inferida, informar esa incertidumbre y resolver la autorización individual para
   alta y envío. En Yvette se aprobaron ambos expresamente después de conocer el resultado; no una secuencia.
   La nota conserva **atribución inferida / calidad técnica validada**, sin degradar el resultado técnico a
   pendiente ni presentar la identidad como confirmada. El permiso de validación solo no cubre estas escrituras.
7. Tras la autorización, deduplicar y crear/reutilizar Contact con Primary Company, campos y nota de evidencia.
   Generar los enlaces de los originales de Documents después del alta para evitar un Contact automático
   previo al gate. Leer propiedades y membresías efectivas; lifecycle no prueba calificación.
8. Comprobar el borrador persistido, ambos enlaces, Para y CCO, cuerpo y firma gráfica; enviar una vez y
   leer la copia nueva de Enviados y el EMAIL `SENT` asociado por separado. No repetir el InMail ya enviado.

Lucía siguió el carril de dirección laboral aportada y verificada por el proveedor, con identidad/empleo
contrastados. El waterfall devolvió dos entradas de la misma dirección: se conservaron posiciones y estados,
sin contarlas como dos personas o dos contactos. En ambos casos, costo real, LinkedIn, email y registro CRM
conservan recibos separados; `SENT` no acredita entrega, lectura ni respuesta.

## De discovery al caso de negocio

Cargar [método](../../../.codex/skills/efeonce-b2b-prospecting/references/discovery-to-business-case.md)
y [plantilla](../../../.codex/skills/efeonce-b2b-prospecting/templates/discovery-business-case.md) cuando
una respuesta abre reunión/propuesta o se pide preparar/analizar discovery. Mantener expediente único:

1. Conciliar entidad, marca, iniciativa y canal real del comprador; conservar historia sin cambiar
   alias/CRM automáticamente. Una futura terna no es selección efectiva.
2. Preparar hipótesis, preguntas que cambian alcance y agenda proporcional. Verificar fecha, zonas,
   asistentes y estado de invitación. Correo autorizado exige firma gráfica/CCO y readback separado del evento.
3. Tras la reunión, recuperar la transcripción de la **fuente declarada por el operador**. Identificar
   reunión, cobertura, versión y speakers/timestamps existentes; si faltan, citar bloque y declarar el límite.
   Un resumen automático o un error en otro proveedor no sustituye ni bloquea toda la fuente disponible.
4. Extraer problema, estado actual, objetivo, alcance, responsabilidades, buying group, criterios,
   contratación, presupuesto/moneda/período y acuerdos, distinguiendo voz del comprador de sugerencias propias.
5. Actualizar v0 a v1 con evidencia, hipótesis refutadas, brechas/owner y próximo paso. Sin baseline,
   tasas o contribución, mantener economía condicionada y plan de medición; costeo/precio pasan a Pricing.
6. Leer el resultado e índices/state; mantener raw y accesos privados. Programar lectura futura sólo
   con mandato y sin duplicar seguimiento; no enviar propuesta, crear Deal ni cambiar etapas por analizar.

[ARMOR / Indecaucho](../../commercial/accounts/indecaucho-armor/README.md) conserva la aplicación del
26/10: guía de reunión27/10, caso previo y revisión posterior HubSpot/Notion focal autorizada.

## Correo personal público y varios canales de una cuenta

[Mass Chile — 26/10/2026](../../commercial/prospecting-agent/runs/2026-10-26-mass-chile.md)
aplica los gates existentes sin ampliar su permiso general:

1. Separar dirección personal publicada, candidata corporativa inferida y correo corporativo verificado.
   La primera acredita procedencia; la segunda conserva su veredicto adverso; ninguna hereda la calidad de otra.
2. Reutilizar la excepción informada de alta/envío sólo para esa persona y dirección. El waterfall de
   adyacentes necesita alcance propio; recuperar el resultado terminal y no repetir el gasto cuando después
   se autoriza CRM/envío. Ignorar datos personales secundarios no necesarios.
3. Crear/reusar los contactos elegibles antes de sus enlaces Documents. Personalizar por función y
   atribuir la señal a quien la publicó, sin inventar solicitudes de colegas ni relaciones jerárquicas.
4. Leer el borrador guardado con todos sus destinatarios y contenido. Si sólo conserva la firma, recuperar
   ese mismo borrador y corregir por la UI; releer antes de enviar y luego verificar Enviados/CRM por separado.
5. Registrar un NDR de casilla inexistente y cerrar esa dirección, sin repetir el envío, fusionar registros
   automáticos o detener colegas por inferencia. Comprobar el DM por su hilo y no repetirlo al corregir email.
