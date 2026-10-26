# Efeonce B2B Prospecting — decisión de método compartido

- **Status:** Accepted.
- **Date:** 2026-10-11; el operador aprobó crear la estructura investigada con «Vamos» y pidió apoyo de `@Sales`.
- **Owner:** Commercial / Julio Reyes; Customer Model, prácticas y CRM conservan sus dominios.
- **Scope:** skills repo Codex/Claude, entrada Commercial Codex y adapter personal de radar.
- **Reversibility:** two-way; archivos de método, sin migración ni nuevos procesos externos.
- **Confidence:** high en contrato/ownership; medium en eficacia comercial, a experimentar localmente.
- **Validated as of:** 2026-10-11, documentos locales, revisión Sales y fuentes fechadas del discovery; no estado live de proveedores.

## Context

Evidencia operativa del mismo día: [diccionario completo del portal](../audits/commercial/hubspot-properties-2026-10-11/README.md)
y [captura por objeto/fase](../manual-de-uso/hubspot/llenar-propiedades-comerciales.md). El inventario readonly
documenta el schema observado; no introduce nuevas propiedades, permisos ni cambios a esta decisión.

La prospección ya tiene radar personal, reglas CRM, modelo de cliente, métodos comerciales y seguimiento.
El [discovery](../audits/commercial/2026-10-11-prospecting-skill-discovery.md) encontró reglas repartidas y
un routing Codex ausente para Commercial. El operador exige datos accionables y objetivo más 2–3 contactos
adicionales; el [canon CRM](GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md) ya establece
el gate de correo individual. El trabajo reciente distingue necesidad pública, relación, compra y ejecución.

Evidencia operativa posterior: [web y secuencia del 16/10/2026](../commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md).
Aplica el mandato finito y los owners vigentes; la conciliación de un Contact creado por BCC_TO_CRM no
amplía la admisión de nuevos contactos. El método cargable conserva versión de material, personalización
final y límites de render/readback; sin nueva autoridad, API ni scheduler.

## Decision

1. Crear `efeonce-b2b-prospecting` como núcleo compartido y discoverable. Unidad de salida: cuenta con
   evidencia, encaje, grupo comprador, rutas y siguiente decisión; referencias por fase, no carga completa.
2. Mantener relación por persona/con quién y demanda/progreso/urgencia por oportunidad. Frío/tibio/cálido,
   referido, reactivación y expansión eligen recorridos; no son lifecycle CRM ni probabilidad de cierre.
3. Buscar objetivo + 2–3 adicionales inicialmente, incluso con email del objetivo: base de búsqueda, no techo
   ni prueba de grupo completo. Ampliar por roles, decisiones y riesgos de la oportunidad/fase; contar personas
   únicas y cobertura funcional por separado. Mantener brechas, owner/ruta/validación y búsqueda acotada. No crear Contact/Lead sin correo corporativo individual verificado, inventar vínculo ni atribuir
   demanda del objetivo a adyacentes. Sin email, preservar investigación/nota de empresa autorizada.
4. Una tesis/owner/historia por cuenta; valor adaptado al rol y prueba contextual proporcional. No rodear
   negativas o restricciones de proceso ni abrir cadencias por cada persona automáticamente.
5. Commercial conserva discovery, negociación y next step; Customer Model el ICP/JTBD; prácticas la oferta,
   capacidad y proof; Copywriting la voz; HubSpot las mutaciones/readback. La entrada Codex de Commercial es
   companion del overlay Claude, no un fork del método global. Cargar sólo la fase pertinente, sin recursión.
6. La skill personal `hubspot-saas-prospecting` conserva nombre compatible, IDs HSP, historial, datos privados,
   matriz y scheduler; delega método al núcleo. Por instrucción de Julio del 13-10-2026, el scheduler existente
   abre una tarea nueva por corrida en greenhouse-eo a las 09:00 Santiago y escribe búsquedas saneadas en
   [el registro del radar](../commercial/prospecting-agent/README.md). Nuevas convocatorias para postular:
   publicación verificable en la misma semana calendario y proceso abierto; históricas para credenciales
   futuras. Cinco líneas por cuatro mercados, incluyendo medios. No mover datos privados, borrar aprobaciones
   ni duplicar scheduler. El adapter local no constituye distribución a otros hosts.
7. Sales es colaborador opcional por fase, descubierto mediante su índice instalado. Enrichment identifica
   contactos/datos; company research prepara acercamiento a destinatario conocido; strategy/business case/
   follow-up conservan sus propios recorridos. No copiar el plugin ni fijar versión/cache como dependencia.
   Cuando Sales exige Sales Intelligence y no hay evidencia equivalente, bloquear sólo esa fase nativa;
   no sustituirla con broad web/CUA. Los docs/fixtures bastan para crear/evaluar la skill.
8. Modo degradado explícito: `deep-research` no disponible en el preflight. Para investigación acotada se
   permite lectura/búsqueda directa y síntesis con fuentes/fechas; delegación sólo autorizada. Se conserva
   rigor de Research, sin afirmar ejecución de harness. Un encargo que exige esa harness queda pendiente.

### Delta aceptado 2026-10-11 — cobertura del buying group

El operador aprobó actualizar la skill con la [investigación](../audits/commercial/2026-10-11-buying-group-coverage-research.md).
El mapa pertenece a una necesidad/decisión, aunque no exista Deal; una cuenta puede tener varios grupos y
una persona varios roles. Comité formal se documenta con evidencia, no como sinónimo de organigrama.
La suficiencia es para el siguiente paso: no exigir champion confirmado ni todo el comité antes de una primera
conversación pertinente; no afirmar aprobación o calificación por cantidad de contactos. Identidad, participación,
autoridad, correo, acceso e interacción se verifican por separado. Stakeholders críticos sin email permanecen
en investigación, sin Contact/Lead vacío; externos son puentes o influencers según evidencia.
Ampliación acotada por presupuesto/permiso; brechas críticas abiertas conservan cobertura parcial.
No modifica pricing, ICP, metas outbound, schema, beta HubSpot ni autorizaciones externas.

### Delta aceptado 2026-10-11 — ABM y ABS

El operador aprobó incorporar la [investigación ABM/ABS](../audits/commercial/2026-10-11-abm-abs-research.md)
y hacer commit de la skill. Se añade [módulo progresivo](../../.codex/skills/efeonce-b2b-prospecting/references/abm-and-abs.md):
selección por cuenta y mapas por iniciativa; inversión/intensidad/purpose distintos de fit ICP y relación;
coordinación ABM con Digital Marketing y ABS con Commercial; consenso/proof por función conservando una tesis;
capacidad/costo total y métricas con denominador, atribución distinta de causalidad. 1:many es válido cuando
conserva selección/relevancia/coordinación; no imponer rangos ni uplift de benchmarks. Se mantienen gates de
correo/cobertura y owners. Templates, escenarios y fuentes comparten el espejo Codex/Claude.
El escenario de piloto sigue propuesto: esta aprobación de método no reserva horas, aprueba gasto/inicio,
crea oferta ABM para clientes ni habilita comunicaciones/schema/proveedores. La eficacia local está pendiente.
[Verificación de actualización](../audits/commercial/2026-10-11-abm-abs-skill-update.md).

### Delta aceptado 2026-10-11 — adapter, economía, proof y aprendizaje

El operador aprobó las cuatro mejoras propuestas tras la investigación HubSpot con «vamos con eso y
actualiza las skills». [Adapter HubSpot](../../.codex/skills/hubspot-as-a-service/references/account-based-prospecting.md)
como contrato de operación de agentes, no nuevo software ni schema: cuenta target, fit ICP y rol global
separados del mapa por iniciativa; changeset mínimo, preservación de valores, concurrencia/readback y
capability API/Agent CLI/UI fechada. CRUD del gráfico Buying Groups sigue no comprobado.

[Capacidad/economía](../../.codex/skills/efeonce-b2b-prospecting/references/capacity-and-economics.md)
comprueba esfuerzo por owner/período y seguimiento, costo total/caja incremental y unknowns sin fijar tarifas;
[discovery/proof](../../.codex/skills/efeonce-b2b-prospecting/references/discovery-and-proof.md) adapta preguntas
y evidencia mínima a oferta/función, con derechos y criterios confirmados separados de propuestas;
[aprendizaje](../../.codex/skills/efeonce-b2b-prospecting/references/experiments-and-learning.md) conserva
motivo comprador vs interpretación, resultado por iniciativa y vigencia/trigger sin nuevos schedulers.

Plantillas/mirrors y routing Commercial/HubSpot se actualizan; fixtures v4 añaden P27–P30 y preservan los
26 casos previos. El bundle HubSpot ya idéntico queda incorporado al gate mecánico de espejos, sin excepciones
de contenido. Continúan los gates de correo/cobertura y owners. La aprobación actualiza método, no
habilita beta, software externo, créditos, schema, gastos, comunicaciones o lotes CRM.
[Verificación](../audits/commercial/2026-10-11-prospecting-operational-modules-update.md).

### Delta aceptado 2026-10-11 — inventario aplicado a la captura CRM

El operador pidió actualizar la skill con el inventario completo del portal. El módulo HubSpot convierte
evidencia en plan por objeto/fase (completar/conservar/pendiente/sistema) antes del changeset; incluye hechos
pertinentes confirmados, conserva writers y separa requisitos operativos, del carril y UI/etapa. Las plantillas
de entrega/cambio lo consumen. La selección de campos y enums se revalida; el snapshot no autoriza nuevos
objetos, schema o mutaciones. Es extensión del método compartido, sin nuevo runtime ni APIs.

### Delta aceptado 2026-10-11 — recorridos y entregabilidad

El operador aprobó las cinco extensiones recomendadas con «Hazlas todas... lanza subagentes para paralelizar».
Se incorporan módulos progresivos de señal→acción, entrada por situación, cadencia coordinada, tratamiento
de respuestas y entregabilidad operativa, con plantillas, routing Commercial y escenarios sintéticos.
Cada señal conserva vigencia/contraste y siguiente validación; los pasos tienen persona/canal/motivo/owner,
esfuerzo y stops según persona/iniciativa/cuenta. Respuestas revisan el plan y respetan restricciones;
Commercial conserva objeciones/negociación. Los settings de pausa/enrollment se verifican por carril y
pausa propuesta no consta aplicada sin ejecución/readback. Correo verificado no certifica remitente listo,
inbox o ingestión CRM; el proveedor y su owner conservan configuración/autenticación/restricciones.

Es extensión del método aprobado, sin nuevo runtime, scheduler, schema, oferta, tarifas ni autonomía.
La aprobación autoriza los archivos/revisión delegada, sin iniciar piloto, DNS, créditos, CRM o comunicaciones.
[Verificación y límites](../audits/commercial/2026-10-11-prospecting-routes-deliverability-update.md).

### Delta 2026-10-12 — diferencial ciego bajo Claude y proporcionalidad

El operador pidió medir la skill bajo Claude («lánzalo») y, con el veredicto, «corrige todo lo que
corresponda y robustece la skill». En 10 escenarios con y sin skill, calificados a ciegas, la skill evitó
el único fallo crítico (alta de un contacto sin correo) pero sus respuestas salían 74 % más largas y con
carriles no pedidos. Se incorporan:

- Proporcionalidad como parte del método: la respuesta contesta primero lo pedido; la entrega completa
  aplica a dossier o handoff y el plan de captura CRM a pedidos de registro.
- Veinte decisiones (D1–D20) que cierran ambigüedades halladas al aplicar el método, escritas en los módulos.
  Las tomó el agente bajo el mandato general, con la lectura que no amplía su autoridad. El operador revisó
  ese día las tres que tocaban autoridad o canal: aprobó D2 (investigación bajo HOLD) y D6 (mensaje manual
  del operador) y modificó D3: autorizar «registrar contactos» cubre crear la Company si no existe y la
  entidad está verificada; la nota de Company sólo si el pedido la nombra; Lead y Deal siempre aparte.
- Módulo de sesión Claude: costos de los tools de Apollo según sus descripciones a esa fecha y radar personal
  ausente fuera de Codex. El punto 8 se precisa: la harness `deep-research` se comprueba por sesión; faltó en
  el preflight de Codex del 2026-10-11 y aparecía listada en Claude el 2026-10-12.
- Evals versión 7: 49 escenarios y una comprobación de proporcionalidad; la extensión no es mérito.
- Evals versión 8 (2026-10-12): escenario P50 y módulo `segments-by-attribute`, tras encontrar en HubSpot un
  subsegmento definido con una lista de IDs que no quedaba contenido en su segmento padre. No se corrió una
  ronda ciega sobre P50.

Tras corregir, la skill mantuvo 20 de 20 aprobadas sin fallos críticos, bajó el ruido de 1,55 a 0,60 y quedó
8 % por debajo del brazo sin skill en extensión. Es extensión del método aprobado, sin runtime, schema,
créditos, CRM ni envíos. [Evidencia, límites y pendientes](../audits/commercial/2026-10-12-prospecting-claude-blind-differential.md).

### Delta aceptado 2026-10-13 — seguimientos nativos en HubSpot

Tras ejecutar el lote de seis secuencias, Julio pidió incorporar el procedimiento a docs y skills de
prospección. El [módulo](../../.codex/skills/efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md)
conserva HubSpot como plataforma de sus secuencias; Apollo no es fallback de envío. Prospecting posee
texto/contexto/cadencia, HubSpot mailbox/firma/inscripción/readback. Cada paso aporta valor distinto y
explica el brochure; la programación verifica fechas locales, Enviar más tarde y regla por cualquier
respuesta. Registro nativo y CCO Outlook se distinguen; Programado no es envío ni evidencia de rendering.
Se agrega routing, plantilla y escenarios sintéticos; espejos idénticos. La aprobación actualiza método,
sin nuevo runtime, scheduler, schema, inscripción ni autorización de lotes adicionales. El
[mandato de ejecución](GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md#mandato-separado-y-acotado--2026-10-13)
y la [evidencia del caso](../commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md) conservan su alcance separado.

### Delta aceptado 2026-10-17 — respeto de brochures aprobados

Julio ratificó expresamente que los brochures están aprobados y no necesitan nada más, tras un recorte
no solicitado del brochure de Marketing de Contenidos. Rige la [decisión de uso íntegro](../operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md):
la aprobación comercial prevalece sobre cautelas históricas del agente. No recortar ni crear variantes sin
instrucción de cambio de material; usar los documentos existentes de HubSpot. Se retiran las reglas de
skills/manuales que reabrían validaciones y permitían inferir autorización de recorte desde un envío.
Sin nuevo runtime, permisos de CRM, contactos, envíos o scheduler. [Antecedentes](../audits/commercial/2026-10-17-approved-brochures-correction.md).

## Alternatives Considered

- **Ampliar sólo la skill personal:** no comparte método ni corrige routing/deriva entre agentes.
- **Otro radar completo en el repo:** duplica IDs, scheduler y datos; más riesgo de contacto duplicado.
- **Delegar todo a Sales:** el plugin no posee nuestras reglas de ICP, correo, buying group o capacidad;
  su enrichment no ejecuta escritura ni contacto. Aporta workflow disponible en vez de dependencia dura.
- **Manual monolítico:** carga métodos de venta/proveedor irrelevantes en consultas simples y facilita drift.

## Consequences

Método común versionado y evaluable; mantenimiento de fuentes, routing y adapter local. La skill no demuestra
que nuestras técnicas mejoren conversión ni que los datos/provider settings sigan vigentes. Preserva los
permisos de investigación, datos personales, créditos, CRM, enrollment, Deal, envío y publicación por acción;
reutiliza una autorización existente válida sin solicitarla otra vez. No modifica tarifas, ICP general,
schema, lifecycle, infra o autonomía. Una excepción de filial requiere su aprobación concreta documentada;
no se generaliza por headcount global. La discrepancia entre gate económico ICP y plan outbound propuesto
se conserva visible y la decide Commercial/operador para el caso, no esta skill mediante cifras inventadas.

## Runtime Contract

- Fuente de método: [Codex](../../.codex/skills/efeonce-b2b-prospecting/SKILL.md) y espejo Claude byte-identical.
- Fuentes externas/técnicas: `references/sources.md`, con consulta y límites, no wrappers API nuevos.
- Compartición verificada: entrada del bundle en `scripts/skills/validate-mirrored-skills.mjs`.
- Descubrimiento: router AGENTS/CLAUDE y `docs/operations/agent-context-router.json`.
- Commercial Codex es companion deliberado del overlay Claude/global, no espejo byte-identical.
- Datos reales en CRM/dossiers autorizados; fixtures anónimos, evaluación offline sin efectos externos.
- [Funcional](../documentation/comercial/prospeccion-b2b.md), [manual](../manual-de-uso/comercial/operar-prospeccion-b2b.md)
  y [evidencia de implementación](../audits/commercial/2026-10-11-prospecting-skill-implementation.md).

## Revisit When

Cambie un gate/permiso del operador, aparezca deriva de resultados Codex/Claude, un provider altere costos o
campos, el adapter duplique cuentas/envíos, haya evidencia local de eficacia o fallen escenarios críticos.
Pilotaje de comunicaciones, cambios económicos y schema requieren sus propias decisiones/autorizaciones.

### Delta aceptado 2026-10-13 — continuidad con proveedor actual

Julio aprobó «Hagamos eso, y dejémoslo como política» tras acordar conservar Fabrimetal y revisar en
seis meses, con presencia pública, nutrición por email sólo con permiso y recontacto sujeto a razón nueva
más autorización. La [política dueña](../operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md) distingue revisión de envío:
proveedor recién contratado sin hito → revisión interna a seis meses; hito/HOLD/baja prevalecen.
Cuenta/historia se conservan sin enum, stage o Deal automático. Tarea única en seguimiento existente,
independiente del mes/proyecto de origen; permiso de persona separado de autoridad del operador.
Módulos/plantillas/fixtures v10 P56–P59 espejo consumen el canon; no nuevo runtime, scheduler ni
nutrición activa. [Aplicación y evidencia](../commercial/follow-up-agent/runs/2026-10-13-fabrimetal-respuesta-parada.md).

### Corrección aceptada 2026-10-13 — TASK comercial en HubSpot

Julio corrige el destino: «Estas tareas mejor crearlas en Hubspot, son tareas comerciales».
La revisión y continuidad comercial se gestionan como TASK HubSpot con owner, fecha, asociaciones y
readback; Notion conserva trabajo operativo/entregables e historia de traslado, sin duplicados activos.
Método/plantillas/adaptador HubSpot/fixtures v11 consumen la [política](../operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md).
El destino de TASK no habilita otros objetos CRM, envíos o migración masiva; la autoridad recurrente
acotada se registra en [seguimiento](GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md).

### Delta aceptado 2026-10-15 — primera entrada y señales tempranas del radar

Julio pidió actualizar documentos y skills tras el cierre de Socopur para nuevas postulaciones/propuestas,
confirmado por Katherine a las 16:54:36 UTC. [Cierre y evidencia aportada por el operador](../commercial/tenders/socopur-agencia-marketing-digital-2027/research/cierre-y-aprendizajes-2026-10-15-INTERNO.md).
La [guía compartida](../commercial/tenders/RADAR_EARLY_ENTRY_GUIDE.md) desarrolla el método: primera puerta
de interés/credenciales/inscripción/visita además de cierre final; aviso temprano con fuente primaria y
acción útil sin esperar RFP completo ni certificar elegibilidad. Descubrimiento amplio y vigilancia de
conocidos independientes, público/privado por Chile/Colombia/México/Perú, nonprofit aparte; LATAM primero
y Palm Desert condicionado. Solape mínimo de 72 horas, ampliado ante indexación tardía acreditada;
prechequeo de identidad canónica/URL contra bloqueos y marcadores de éxito sin avance ante falla.

Publicación, disponibilidad pública, detección, validación, aviso y margen útil conservan evidencia y
precisión independientes; CRM no sustituye detección. Menos de cinco días hábiles a la primera puerta
se muestra como detección tardía. No se atribuye causa a frecuencia/indexación sin prueba.
Este delta complementa la pasada semanal/48h para no perder la entrada por un filtro de frescura;
las publicaciones anteriores siguen separadas de nuevas publicaciones verificadas de la semana.

Alcance: instrucciones/documentación del proyecto y dos SKILL.md espejo; sin cambiar ownership, ICP,
autonomía, CRM, schema, código, infraestructura, frecuencia ni suscripciones de automatizaciones.
La instalación personal `hubspot-saas-prospecting` queda fuera de este cambio. No implica despliegue,
propagación al scheduler ni exhaustividad; eficacia pendiente de futuras corridas y avisos observados.
[Verificación y prueba documental](../audits/commercial/2026-10-15-socopur-radar-docs-skills.md).

**Aclaración posterior del operador, mismo 15/10:** la revisión incluye la skill personal si necesita
ajuste documental. Su SKILL.md ya remite al núcleo con precedencia; dos playbooks conservan reglas
que requieren actualización. La ruta personal queda fuera de las raíces de escritura permitidas:
ajuste externo bloqueado, sin ampliación de permisos ni copia instalada. [Cambios mínimos pendientes](../audits/commercial/2026-10-15-socopur-radar-docs-skills.md#revisión-ampliada-de-la-skill-personal--escritura-bloqueada).

**Resolución posterior del mismo mandato:** se aplicaron únicamente los dos ajustes mediante aprobación
puntual de escritura ofrecida por el entorno. SKILL.md, permisos persistentes, horario y suscripciones
intactos; el bloqueo ya no está vigente. La auditoría registra hashes y alcance de la aplicación.

**Corrección de cronología por Julio, 15/10/2026 17:51 UTC:** «Lo detectamos el 6 y había cerrado un día antes».
Detección **06/10/2026**, sin hora/zona acreditadas; cierre de interés **05/10**: un día calendario después,
no 24 horas exactas. Radar horario y alta CRM del 10/10 son posteriores y no explican la tardanza del día 6.
Publicación, primera disponibilidad/indexación, primer aviso exacto y causa siguen sin acreditar.
Las conclusiones previas que no tenían acreditada la fecha se conservan como cortes históricos;
esta confirmación acredita la fecha, no un timestamp, latencia exacta o causa.

## Delta de operación documentado — 21/10/2026

Julio pidió consolidar docs y skills después del [lote Agencia Creativa/izipay](../commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md).
Se conserva el ADR del método y su admisión normal. La excepción informada de correo inferido se registra
por persona y acción, sin promoverla a verificación ni autorización global. NDR posterior y estado Apollo
se conservan con fecha; el canal afectado no se inscribe por tener una secuencia creada.

El módulo HubSpot incorpora clonación de plantillas independientes, guardados separados y lectura de
Programado por contacto. Plantilla, configuración, inscripción, envío y entrega siguen siendo estados
separados. La [capacidad local](../operations/EFEONCE_LOCAL_PRODUCTION_CAPABILITY_V1.md) corrige la premisa
comercial anterior, sin probar propiedad de talleres ni modificar el contrato de ejecución de terceros.
Es consolidación del mandato y evidencia del caso, sin nuevo schema, API, scheduler o autorización externa.


## Conciliación documental del chat — 24/10/2026

El operador pidió subagentes, actualización de docs/skills y commit del trabajo de Fundación Luz, Arcor,
Huelquén Montessori, NIASA y Disney. El [cierre por persona](../commercial/prospecting-agent/runs/2026-10-24-cierre-chat-prospeccion.md)
y la [auditoría](../audits/commercial/2026-10-24-chat-prospeccion-docs-skills.md) conservan acciones y brechas.
Se precisa la operación existente: identidad antes de enriquecimiento, calidad de correo distinta de match,
permisos por persona/canal, dos originales de brochure cuando se pidieron, persistencia HTML, readback de
EMAIL/LinkedIn/inscripción independientes y límites OAuth por comando. Se concilia el pendiente antiguo del
brochure creativo con la aprobación íntegra del 17/10. No cambia admisión, ICP, fuente de verdad, schema,
APIs, scheduler, política de envío o autoridad de futuras acciones. No se introduce una decisión arquitectónica nueva.

## Aplicación del método: Lucía y Yvette — 24/10/2026

El operador pidió consolidar [ambos casos](../commercial/prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md)
con subagentes, docs/skills y commit. Se precisa el método existente: resultados asíncronos y costos reales
distintos de su aceptación; entradas duplicadas del proveedor distintas de personas/contactos; candidata
inferida por patrón distinta de atribución; verificación técnica con su proveedor real distinta de identidad.
La excepción individual de Yvette se autorizó después de comunicar esas dimensiones y no se generaliza.

El [manual](../manual-de-uso/comercial/operar-prospeccion-b2b.md#inferir-una-candidata-y-comprobarla-sin-atribuirla-por-el-patrón)
y los módulos progresivos conservan el descarte de la candidata inválida, la validación única de la nueva,
los permisos por operación y los readbacks de los dos canales. Brochures originales, firma/CCO, privacidad
de recibos y ausencia de secuencias nuevas se mantienen. Es documentación explicativa y evidencia de una
aplicación, sin nueva decisión arquitectónica, autonomía, schema, endpoint ni scheduler.

### Aplicación documental 25/10/2026 — calidad de nuevas conversaciones

Julio pidió incorporar las mejoras de la revisión de octubre a futuras aperturas y seguimientos. El
[módulo compartido](../../.codex/skills/efeonce-b2b-prospecting/references/conversation-quality-and-review.md)
conecta historia por iniciativa, evidencia, siguiente decisión y aprendizaje; los routers de Prospección,
Commercial y Copywriting lo cargan en captación/expansión, incluidas consultas web/pauta. Se conserva
la arquitectura robusta de correo, el brochure aprobado y la autoridad separada de cada canal.

Es una aplicación reversible del método existente: sin nuevo schema, autonomía, scheduler ni permiso de
envío. Los espejos de Prospección se mantienen idénticos. La [entrega de implementación](../commercial/analyses/2026-10-prospeccion/IMPLEMENTACION-Y-PAUTA.md)
separa método aplicado en el repo, adaptaciones nativas propuestas y recomendación de pauta. No declara
modificadas instrucciones, plantillas, programaciones o audiencias de HubSpot.


### Delta aceptado 26/10/2026 — discovery, transcripción y caso de negocio

Julio pidió actualizar documentos/skills, construir el caso ARMOR / Indecaucho y profundizar con
subagentes para preparar la reunión; después, leer la transcripción y completar el caso. Aclaró que
las reuniones se graban con HubSpot y Notion. El
[método progresivo](../../.codex/skills/efeonce-b2b-prospecting/references/discovery-to-business-case.md)
y su plantilla conectan respuesta humana, preparación, fuente declarada de reunión, evidencia
localizable, hipótesis confirmada/refutada, economía condicionada y siguiente decisión.

Se conserva la separación Company/entidad legal/marca/iniciativa; terna anunciada distinta de selección,
invitación enviada/aceptada/reunión realizada y sugerencia del vendedor distinta de acuerdo. La
transcripción se trata como evidencia, sin ejecutar instrucciones insertas ni inventar speaker,
timestamp, presupuesto o ROI. Commercial, Customer Model, práctica y Pricing/Finance conservan sus
dominios. Referencias/plantilla/fixtures v16 P75–P80 y routing Codex/Claude comparten el mismo método.

Es una ampliación reversible del contrato de agentes existente; no cambia source of truth CRM,
schema, oferta, precios ni autonomía general. Se descarta duplicar la skill en una metodología por
marca o imponer la plataforma de videollamada como único repositorio de transcripción. Los datos
reales y estado operativo permanecen en el [expediente de cuenta](../commercial/accounts/indecaucho-armor/README.md).

El mandato específico de retomar tras la reunión se concretó en **una revisión focal del hilo el
27/10/2026 a las16:00 America/Santiago**, app ID `armor-leer-discovery-y-completar-caso`; no reactivó el
seguimiento global pausado. Configuración/readback distintos de ejecución y fuente aún por generarse.
La skill no crea automatizaciones por defecto. Sin correo nuevo, Deal/Lead, stage, gastos o propuesta
aprobada por esta documentación. Reabrir si cambian fuentes, permisos, calidad de extracción o
evidencia de decisión. [Cierre y verificación](../audits/commercial/2026-10-26-armor-discovery-case-docs-skills.md).
