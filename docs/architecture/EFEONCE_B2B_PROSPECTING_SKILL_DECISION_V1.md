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
   matriz, reportes, ventanas y scheduler; delega método al núcleo. No mover datos, borrar aprobaciones o crear
   otro scheduler. El adapter local no constituye distribución a otros hosts.
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
