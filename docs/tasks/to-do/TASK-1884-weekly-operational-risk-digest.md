# TASK-1884 — Digest semanal de riesgo operativo: el correo del lunes que sirve para decidir

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1884-weekly-operational-risk-digest.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-048`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `TASK-1882` (reader de riesgo) y `TASK-1883` (severidad y evidencia honestas)
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reescribe el correo semanal de Nexa Insights para que responda las preguntas que la cadencia canónica asigna al ritmo semanal: qué vence y no se está moviendo, qué se incumplió y sigue abierto, qué parte del tablero no se mantiene, y qué indicadores quedaron fuera de banda — cada uno con sujeto, fecha, denominador y período. Es consumer puro de los readers de TASK-1882 y TASK-1883: no calcula nada.

## Why This Task Exists

El correo del 2026-09-21 a las 07:00 es el caso de referencia. Presentó 5 insights, todos con el mismo número visible (`score 85`), tres de ellos del período **agosto** bajo un encabezado que decía "14 SEPT - 21 SEPT", y su titular sobre Efeonce afirmaba que un proyecto *"está experimentando una baja significativa en OTD%"* con la recomendación de *"revisar el backlog y la asignación de recursos"*. Ese proyecto tenía 12 tareas en el período y **1 completada**; el `20 %` citado era el OTD del espacio completo, no del proyecto, cuyo valor real en el mismo payload era `0`.

Mientras tanto, a la misma hora y con los datos ya materializados, el sistema sabía que **156 tareas vencían en los siguientes 7 días y 78 de ellas llevaban días sin movimiento** (Berel 37 de 104, Sky 41 de 52), que había **369 compromisos vencidos y abiertos** de los cuales **272 sin responsable** con ~235 días de antigüedad, y que Sky Airline exhibía OTD 94,5 % mientras arrastraba **164 incumplimientos sin cerrar**. Nada de eso apareció en el correo.

La cadencia canónica ya define qué debe contener este ritmo. `docs/architecture/Contrato_Metricas_ICO_v1.md` §8:

> **Semanal · Operativo:** *"Cuellos de botella activos, proyectos atrasados, brief queue, capacidad vs. demanda"* → Ops Lead + Account Lead

Y `docs/operations/EFEONCE_OPERATING_CODE_V1.md:117-122` fija las cuatro preguntas del weekly, empezando por *"¿Qué riesgo estamos viendo antes de que explote?"*. El correo actual no responde ninguna de las ocho: su unidad de información es la desviación estadística mensual, que es un instrumento de análisis retrospectivo.

El EPIC-048 declara en su cadencia el ritmo semanal (*"revisión interna de toda la cartera vigente… excepciones, capacidad, decisiones y seguimiento"*) y el diario (*"cola de riesgos/ownership"*). Ninguna de sus tres hijas construye la superficie de ese ritmo: TASK-1879 es fuentes, TASK-1880 es la proyección de indicadores, TASK-1881 es Person 360. Este correo es la superficie que faltaba.

## Goal

- El primer fold permite decidir si hay que mover algo hoy, sin abrir el portal.
- Todo ítem lleva sujeto, fecha, inmovilidad y responsable — o declara explícitamente que no tiene responsable.
- Todo indicador lleva su denominador, su severidad de negocio, el período del hecho y si ya se vio antes.
- Riesgo operativo e higiene de registro quedan en bloques separados, porque exigen decisiones opuestas.
- Lo que no se pudo medir se declara; el correo nunca presenta un subconjunto como si fuera el total.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
- `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **El correo no calcula.** `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` §5 prohíbe que un consumer downstream recompute una métrica ICO inline. El builder compone lo que los readers de TASK-1882 y TASK-1883 devuelven. Si un dato no viene del reader, no entra al correo.
- **Copy en `src/lib/copy/*`.** Ningún literal visible en JSX. Validar tono es-CL con `greenhouse-ux-writing` antes de escribir.
- **Los brand assets salen del SSOT** `src/config/efeonce-brand.ts`. Prohibido hardcodear logo, eslogan o colores de marca.
- **Sin `fontSize` inline.** Tipografía por tokens/variantes según los invariantes de diseño.
- **Compatibilidad Outlook.** El correo laboral de Efeonce y sus clientes vive en Outlook/Microsoft 365. Tabla HTML, no flexbox/grid. Un render que sólo se ve bien en Gmail no está verificado.
- **Degradación honesta.** Si un reader falla, su bloque se reemplaza por una nota explícita. Prohibido que otro bloque rellene el hueco.

## Normative Docs

- `docs/ui/wireframes/TASK-1884-weekly-operational-risk-digest.md` — contrato de esta superficie. **Leerlo entero antes de tocar JSX**, incluida su sección `## Open Decisions`, que bloquea `UI ready: yes`.
- `docs/architecture/Contrato_Metricas_ICO_v1.md` §8 — la cadencia que define el contenido.
- `docs/operations/EFEONCE_OPERATING_CODE_V1.md:117-122` — las cuatro preguntas del weekly.
- `docs/documentation/delivery/nexa-insights-digest-semanal.md` — documentación funcional vigente del correo actual; debe quedar actualizada, no duplicada.
- `docs/runbooks/ico-weekly-digest-rollback.md` — runbook de rollback existente; debe seguir siendo válido.

## Dependencies & Impact

### Depends on

- `TASK-1882` — `readDeliveryCommitmentRisk`. Sin este reader no existen los bloques ①-③. **Bloqueante duro.**
- `TASK-1883` — severidad compuesta, evidencia y recurrencia. Sin esto, los bloques ④-⑤ repetirían los defectos actuales. **Bloqueante duro para esos bloques**; ver `## Open Questions` sobre un V1 parcial.
- `src/emails/WeeklyExecutiveDigestEmail.tsx` — plantilla existente en producción.
- `src/lib/nexa/digest/build-weekly-digest.ts` + `types.ts` — builder y DTO actuales.
- `src/lib/copy/nexa.ts` (`GH_NEXA`) y `src/lib/copy/dictionaries/es-CL/emails.ts`.
- `services/ops-worker/server.ts:932` — handler `POST /nexa/weekly-digest` con `dryRun` y `recipients_override` ya soportados.

### Blocks / Impacts

- `docs/documentation/delivery/nexa-insights-digest-semanal.md` queda desactualizado al cerrar; debe actualizarse en el mismo lote.
- `TASK-439` (daily role-based briefing) reusará estos bloques para su versión diaria; coordinar vocabulario y no duplicar componentes de email.
- `TASK-695` / `TASK-436` (entrega por Teams e in-app) consumirán el mismo contenido por otro canal; el contenido no puede quedar acoplado al render de email.
- `docs/runbooks/ico-weekly-digest-rollback.md` debe seguir siendo ejecutable tras el cambio.

### Files owned

- `src/emails/WeeklyExecutiveDigestEmail.tsx` (modificado)
- `src/lib/nexa/digest/build-weekly-digest.ts` (modificado)
- `src/lib/nexa/digest/types.ts` (modificado)
- `src/lib/nexa/digest/build-weekly-digest.test.ts` (modificado)
- `src/lib/copy/nexa.ts` (modificado)
- `docs/ui/wireframes/TASK-1884-weekly-operational-risk-digest.md` (creado)
- `docs/documentation/delivery/nexa-insights-digest-semanal.md` (modificado)

## Current Repo State

### Already exists

- Plantilla de correo en producción con identidad Efeonce, chips de severidad (`WeeklyExecutiveDigestEmail.tsx:46`) y resumen agregado.
- Builder con ventana de 7 días, tope por espacio (`DEFAULT_MAX_PER_SPACE = 3`), resolución de menciones contra el canónico vigente y log estructurado `narrative_presentation`.
- Handler con `dryRun` y `recipients_override` (`server.ts:938-940`) — permite ensayar el render sin enviar y dirigir un envío real a una casilla de prueba.
- Cron `ops-nexa-weekly-digest` lunes 07:00 Santiago.
- Runbook de rollback del digest.

### Gap

- El contenido es una lista plana ordenada por `quality_score`, constante en el 86,3 % de los casos.
- El titular imprime `${metricLabel} · score ${score}` (`build-weekly-digest.ts:154-160`), que se lee como si fuera el valor de la métrica.
- No hay período del hecho por insight: tres de cinco eran de agosto bajo encabezado de septiembre.
- No hay denominador, confianza, recurrencia ni distinción entre riesgo e higiene.
- No hay ninguna mirada prospectiva: el correo no puede decir qué vence esta semana porque ese reader no existe (lo crea TASK-1882).
- La `closingNote` actual (*"Resumen automatico basado en los insights materializados del periodo"*) no declara qué no se pudo medir.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/emails/` (plantillas React Email) + `src/lib/nexa/digest/` (composición), ejecutado desde el Cloud Run `ops-worker`
- Future candidate home: `ui-package`
- Boundary: las plantillas de correo son candidatas a `ui-package`; el builder permanece compartido mientras el digest viva en el worker. El builder consume `readDeliveryCommitmentRisk` (TASK-1882) y el DTO de insights (TASK-1883). No accede a BigQuery ni a PostgreSQL por su cuenta.
- Server/browser split: ejecución íntegra server-side; el correo se renderiza a HTML en el worker y nada cruza al browser.
- Build impact: `none` — sin dependencia nueva. **Atención**: el builder es código bundleado por el `ops-worker`; prohibido importar `@core/theme/*`, `@menu` o `@layouts` desde este camino (crash silencioso de arranque del worker). Tokens desde `src/lib/design-tokens/*`.
- Extraction blocker: la resolución de destinatarios depende de identidad y roles del portal.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: hoy `EFEONCE_ADMIN` + `EFEONCE_OPERATIONS`; la cadencia canónica asigna este ritmo a Ops Lead + Account Lead (decisión abierta)
- Momento del flujo: lunes 07:00 Santiago, primera lectura de la semana, habitualmente en el teléfono
- Resultado perceptible esperado: en el primer fold, saber si hay que mover algo hoy y qué
- Fricción que debe reducir: hoy el lector no puede distinguir un compromiso que vence el jueves de una métrica de agosto, ni saber sobre cuántos datos se sostiene una afirmación
- No-goals UX: no es un dashboard, no reemplaza `/nexa/insights`, no busca exhaustividad — busca decisión

### Surface & system decision

- Surface: email transaccional `weekly_executive_digest`
- Nav placement: `none` — no agrega destino de navegación
- Composition Shell: `no aplica` — medio email, tabla HTML
- Primitive decision: `reuse` — componentes de `src/emails/` existentes
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: `no aplica`
- Copy source: `src/lib/copy/nexa.ts` + `src/lib/copy/dictionaries/es-CL/emails.ts`
- Access impact: `none` — la resolución de destinatarios no cambia en esta task

### State inventory

- Default: los cinco bloques con contenido
- Loading: `n/a` (medio email)
- Empty: sin riesgo en el horizonte → mensaje afirmativo explícito, el bloque **no** se omite
- Error: reader caído → bloque reemplazado por nota de degradación, nunca relleno por otro bloque
- Degraded / partial: espacio con datos insuficientes aparece con su razón; banner de frescura cuando el dato está stale; nota explícita si la paridad de señales está rota (ISSUE-176)
- Permission denied: `n/a` — la audiencia se resuelve antes de construir
- Long content: tope de ítems por bloque + "y N más" con enlace
- Mobile / compact: una columna a 390 px, sin scroll horizontal
- Keyboard / focus: `n/a` (medio email)
- Reduced motion: `n/a` — sin motion

### Interaction contract

- Primary interaction: enlace por ítem al detalle de la tarea o al espacio; enlace global al portal
- Hover / focus / active: estilos de enlace por defecto del cliente de correo
- Pending / disabled: `n/a`
- Escape / click-away: `n/a`
- Focus restore: `n/a`
- Latency feedback: `n/a`
- Toast / alert behavior: `n/a`

### Motion & microinteracciones

- Motion primitive: `none`
- Enter / exit: `n/a`
- Layout morph: `n/a`
- Stagger: `n/a`
- Timing / easing token: `n/a`
- Reduced-motion fallback: `n/a` — no hay motion que degradar
- Non-goal motion: ninguna animación en correo

### Implementation mapping

- Route / surface: email `weekly_executive_digest`, disparado por `POST /nexa/weekly-digest`
- Primitive / variant / kind: `reuse` de los componentes de `src/emails/`
- Component candidates: `WeeklyExecutiveDigestEmail.tsx` + subcomponentes locales por bloque
- Copy source: `GH_NEXA` y el diccionario de emails es-CL
- Data reader / command: `readDeliveryCommitmentRisk` (TASK-1882) y el DTO de insights (TASK-1883)
- API parity: el correo es un consumer más de los mismos readers que sirven al portal y a Nexa; cero lógica propia
- Access / capability: sin cambios
- States to implement: los once del inventario

### GVC scenario plan

- Scenario file: `n/a` — medio email; se sustituye por el ensayo de render del wireframe §GVC Scenario Plan
- Route: `n/a`
- Viewports: 600 px y 390 px
- Quality profile: `premium` en criterio, evidencia adaptada al medio
- Required steps: `dryRun` contra staging → render a HTML → apertura a 600 px y 390 px → envío real con `recipients_override` → **apertura en Outlook**
- Required captures: primer fold 600 px, primer fold 390 px, bloque ① con ítems, estado sin riesgo, estado degradado, captura en Outlook
- Required `data-capture` markers: `n/a`
- Assertions: ningún ítem sin responsable con campo vacío; ningún indicador sin denominador; ningún slug técnico; ningún `score` en el titular
- Scroll-width checks: sin scroll horizontal a 390 px
- Reduced-motion / focus evidence: `n/a`
- Review dossier: capturas adjuntas al PR
- Baseline decision / surface ID: sin baseline de píxeles — el render varía entre clientes de correo y un baseline sería falsa precisión

### Design decision log

- Decision: reordenar por naturaleza de riesgo en vez de agrupar por espacio; separar higiene de riesgo; retirar el `score` del titular; declarar siempre frescura y huecos
- Alternatives considered: conservar el agrupamiento por espacio añadiendo campos; partir en dos correos
- Why this pattern: el agrupamiento por espacio obliga a leer todo para saber si hay urgencia y mezcla horizontes temporales incompatibles; dos correos duplican el ritual del lunes
- Reuse / extend / new primitive: `reuse`
- Open risks: el correo se alarga (mitigado con tope por bloque); el bloque de higiene puede volverse ruido si nadie lo acciona (revisar a las 4 semanas)

### Visual verification

- GVC scenario: `n/a` — ver ensayo de render
- Viewports: 600 px, 390 px
- Required captures: las seis del plan
- Required `data-capture` markers: `n/a`
- Scroll-width check: 390 px
- Accessibility/focus checks: contraste de chips ≥ 4,5:1 medido en claro y oscuro; severidad comunicada también por texto; jerarquía real de encabezados; `alt` en el isotipo
- Before/after evidence: correo del 2026-09-21 vs correo nuevo, mismo período y mismos datos
- Known visual debt: el render exacto varía entre clientes de correo; se verifica Outlook como canónico y Gmail como secundario
- Visual scorecard: `docs/ui/reviews/TASK-1884-weekly-operational-risk-digest.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — DTO del digest y copy

- Extender `WeeklyDigestBuildResult` (`src/lib/nexa/digest/types.ts`) con los bloques del wireframe: riesgo prospectivo, deuda, higiene, indicadores, cambios, y el estado de datos por bloque.
- Copy nuevo en `src/lib/copy/nexa.ts`, validado con `greenhouse-ux-writing`. Incluye la frase del bloque de deuda, que requiere validación del operador.
- Test de contrato que congela la forma del DTO.

### Slice 2 — Builder como compositor

- Reescribir `build-weekly-digest.ts` para consumir `readDeliveryCommitmentRisk` y el DTO de insights, y **dejar de ordenar por `quality_score`**.
- El builder deja de construir el titular con `· score`; el titular lleva el valor real de la métrica.
- Cada bloque resuelve su propio estado de datos; el fallo de un reader no vacía los otros.
- Tests: sin riesgo en el horizonte, reader caído, espacio con datos insuficientes, más ítems que el tope, mezcla de períodos.

### Slice 3 — Plantilla del correo

- Reestructurar `WeeklyExecutiveDigestEmail.tsx` en los cinco bloques del wireframe con tabla HTML.
- Anatomía de ítem con los cinco datos obligatorios; "sin responsable" explícito.
- Anatomía de indicador con valor, severidad, denominador, período y recurrencia.
- Banner de frescura y nota de cierre con lo no medido.
- Contraste de chips medido en claro y oscuro.

### Slice 4 — Ensayo de render y evidencia visual

- `dryRun` contra staging; render a HTML; apertura a 600 px y 390 px.
- Envío real con `recipients_override` a una casilla interna y **apertura en Outlook**.
- Las seis capturas del plan, adjuntas al PR, más el before/after contra el correo del 2026-09-21.
- Scorecard visual completado.

### Slice 5 — Documentación y runbook

- Actualizar `docs/documentation/delivery/nexa-insights-digest-semanal.md` con la estructura nueva y qué significa cada bloque.
- Manual: cómo leer el correo y qué decisión habilita cada bloque.
- Verificar que `docs/runbooks/ico-weekly-digest-rollback.md` sigue siendo ejecutable; actualizarlo si el rollback cambió.

## Out of Scope

- **No se crea ni se modifica ningún reader, contrato de datos ni schema.** Por eso `Backend impact: none`. Si durante la ejecución aparece la necesidad de un dato que los readers de TASK-1882/1883 no entregan, **no se resuelve aquí**: se levanta como delta de esas tasks.
- No se cambia la resolución de destinatarios ni la audiencia. Ampliarla a Ops Lead + Account Lead es decisión abierta del wireframe y, si se aprueba, se hace en una task propia con su impacto de acceso.
- No se cambia la cadencia ni el cron.
- No se agrega entrega por Teams ni in-app (TASK-695, TASK-436, TASK-439).
- No se agregan botones de acción dentro del correo (TASK-435, TASK-1184).
- No se tocan las superficies de `/nexa/insights` en el portal.
- No se corrige ninguna métrica ni fórmula.

## Detailed Spec

El detalle de estructura, anatomía de ítem, estados, copy y verificación visual vive en
`docs/ui/wireframes/TASK-1884-weekly-operational-risk-digest.md`. No se duplica aquí.

Dos precisiones de implementación que el wireframe no cubre:

**Composición sin cálculo.** El builder actual hace su propia consulta a `selectPresentableEnrichments`. Post-TASK-1883 esa selección ya devuelve severidad, evidencia y recurrencia resueltas; el builder sólo agrupa y ordena para el render. Si el agente se encuentra escribiendo un umbral, un denominador o una clasificación dentro de `build-weekly-digest.ts`, está violando el boundary: ese código pertenece al reader.

**El correo vacío sigue sin enviarse.** El comportamiento actual (`no_weekly_insights` cuando `totalInsights === 0`, `server.ts:950`) se conserva, pero su condición cambia: ahora el correo tiene contenido si **cualquiera** de los cinco bloques tiene algo que decir. Un lunes sin insights de métricas pero con 40 compromisos en riesgo **sí** se envía.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1882 y TASK-1883 deben estar en producción y verificadas **antes** del Slice 2. Componer sobre readers no desplegados produce un correo que funciona en local y falla el lunes.
- Slice 1 (DTO + copy) → Slice 2 (builder) → Slice 3 (plantilla) → Slice 4 (evidencia visual).
- Slice 4 es condición de cierre, no un paso opcional: sin la apertura en Outlook, el correo no está verificado.
- Slice 5 al final, antes de declarar complete.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El correo del lunes sale roto o vacío para toda la audiencia de liderazgo | comunicación / confianza | medium | `dryRun` obligatorio antes de cada deploy; envío real a casilla de prueba con `recipients_override`; el runbook de rollback existente sigue vigente | ausencia del log `[ops-worker] /nexa/weekly-digest done — status=sent` entre 07:00 y 08:00 del lunes |
| El render se ve bien en Gmail y roto en Outlook | comunicación | medium | Outlook es el cliente canónico de verificación, no el secundario; tabla HTML, sin flexbox/grid | captura en Outlook adjunta al PR |
| El correo se alarga tanto que nadie lo lee | adopción | medium | Tope de ítems por bloque con "y N más"; el primer fold cerrado por diseño en el wireframe | revisión humana tras 4 semanas |
| Import prohibido rompe el arranque del `ops-worker` en silencio | worker | low | Prohibición explícita de `@core/theme/*`, `@menu`, `@layouts` desde el camino bundleado; tokens desde `src/lib/design-tokens/*` | health del `ops-worker` post-deploy |
| El bloque de higiene se vuelve ruido crónico | adopción | medium | Revisión a las 4 semanas con el operador; si nadie lo acciona, decidir si se mueve a otra cadencia | revisión humana |

### Feature flags / cutover

Sin flag. El correo es un artefacto semanal con rollback conocido y ensayado: revert del PR + redeploy del `ops-worker`, y el runbook `docs/runbooks/ico-weekly-digest-rollback.md` ya cubre el procedimiento. Un flag añadiría una ruta de código muerta para un artefacto que se emite una vez por semana y que se puede ensayar con `dryRun` cuantas veces haga falta antes de cada lunes.

El cutover se hace **después** de un lunes de ensayo: envío real con `recipients_override` a una casilla interna el lunes previo, con los datos reales de esa semana, y revisión humana antes de que salga a la audiencia real.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | revert PR + redeploy `ops-worker` | ~10 min | sí |
| Slice 3 | revert PR + redeploy `ops-worker` | ~10 min | sí |
| Slice 4 | `n/a` — evidencia, no código | — | — |
| Slice 5 | revert de docs | <5 min | sí |

Si el fallo se detecta el lunes con el correo ya enviado, el daño es un correo malo, no un estado corrupto: no hay que revertir datos. El runbook cubre el caso.

### Production verification sequence

1. Confirmar que TASK-1882 y TASK-1883 están verificadas en producción.
2. `dryRun: true` contra staging; inspeccionar el digest devuelto: que los cinco bloques traigan lo esperado y que los conteos coincidan con una consulta directa.
3. Render a HTML; abrir a 600 px y 390 px; verificar ausencia de scroll horizontal.
4. Envío real con `recipients_override` a una casilla interna; **abrir en Outlook**; capturar.
5. Deploy a producción. El lunes siguiente, envío real con `recipients_override` a la casilla interna **antes** de la hora del cron, con los datos reales de esa semana; revisión humana.
6. Habilitar la audiencia real al lunes siguiente.
7. Verificar el log `status=sent` entre 07:00 y 08:00 Santiago.
8. A las 4 semanas, revisar con el operador si cada bloque produjo alguna decisión. Un bloque que nadie acciona en un mes es candidato a salir.

### Out-of-band coordination required

- **Decisión del operador** sobre las cuatro `Open Decisions` del wireframe antes de `UI ready: yes`.
- Aviso a la audiencia actual del digest antes del cambio de estructura: el correo del lunes va a verse distinto.
- Casilla interna de prueba para el ensayo con `recipients_override`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout` según el alcance real.
- [ ] `UI ready` permanece `no` hasta que las cuatro `Open Decisions` del wireframe estén resueltas y el contrato tenga implementation mapping, GVC scenario plan y design decision log; si pasa a `yes`, `pnpm task:lint --task TASK-1884` queda sin findings.
- [ ] Se declaró `Wireframe: docs/ui/wireframes/TASK-1884-weekly-operational-risk-digest.md` y el archivo existe.
- [ ] `Flow: none` y `Motion: none` son correctos: el correo no coordina sidecar/drawer/modal/navegación ni introduce motion.
- [ ] El correo renderiza los cinco bloques en el orden del wireframe.
- [ ] Ningún titular contiene `score`; `grep` de `score` en la plantilla y el builder devuelve cero ocurrencias en texto visible.
- [ ] Todo ítem de riesgo muestra qué, dónde, cuándo, cuánto lleva quieto y quién; una tarea sin responsable renderiza "sin responsable" explícito, nunca un espacio en blanco.
- [ ] Todo indicador muestra valor real, severidad, denominador, período del hecho y recurrencia.
- [ ] Riesgo operativo (bloque ①) e higiene de registro (bloque ③) están en bloques separados y con encabezados distintos.
- [ ] Un lunes sin insights de métricas pero con compromisos en riesgo **sí** envía correo; hay un test.
- [ ] Un reader caído produce una nota de degradación en su bloque y no altera los demás; hay un test.
- [ ] La nota de cierre declara qué no se pudo medir esa semana.
- [ ] Todo el copy visible vive en `src/lib/copy/*`; `pnpm lint` no reporta `greenhouse/no-untokenized-copy` en los archivos tocados.
- [ ] Los brand assets salen de `src/config/efeonce-brand.ts`; no hay logo ni eslogan hardcodeado.
- [ ] No hay import de `@core/theme/*`, `@menu` ni `@layouts` en el camino bundleado por el `ops-worker`.
- [ ] Contraste de los chips de severidad ≥ 4,5:1 medido en claro y en oscuro, con la medición adjunta.
- [ ] Sin scroll horizontal a 390 px.
- [ ] Las seis capturas del plan están adjuntas, incluida **la apertura en Outlook**, más el before/after contra el correo del 2026-09-21.
- [ ] El scorecard visual está completo y cumple el umbral declarado.
- [ ] El ensayo del lunes previo con `recipients_override` se ejecutó y fue revisado por un humano antes de habilitar la audiencia real.
- [ ] `docs/documentation/delivery/nexa-insights-digest-semanal.md` quedó actualizado y el runbook de rollback sigue siendo ejecutable.

## Verification

- `pnpm vitest run src/lib/nexa/digest/`
- `pnpm local:check:ui`
- `pnpm test` (suite completa) + `pnpm build` como gate de cierre
- `POST /nexa/weekly-digest` con `dryRun: true` contra staging
- Render a HTML + apertura a 600 px y 390 px + apertura en Outlook
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `EPIC-048` actualizado con el estado real de esta hija
- [ ] La documentación funcional del digest y el runbook de rollback quedaron sincronizados
- [ ] Los criterios tildados corresponden a evidencia real; lo no verificado queda sin tildar con su razón escrita

## Follow-ups

- Revisión a las 4 semanas: ¿qué bloque produjo decisiones y cuál no? Un bloque que nadie acciona en un mes sale o cambia de cadencia.
- Ampliar la audiencia a Ops Lead + Account Lead según el Contrato §8, si el operador lo aprueba. Tiene impacto de acceso y merece task propia.
- `TASK-439` (daily briefing) debería reusar estos bloques; coordinar para no duplicar componentes de email.
- Cuando TASK-435 cierre, los ítems pueden llevar CTA accionable en vez de sólo enlace.

## Open Questions

- ¿V1 son los cinco bloques, o sólo ①-③ (lo que depende únicamente de TASK-1882)? Un V1 parcial permite tener el correo útil antes de que cierre TASK-1883, a costa de convivir unas semanas con los indicadores en su forma actual. **Decisión del operador.**
- ¿Cuántos ítems por espacio antes del "y N más"?
- ¿La audiencia cambia en esta task o en una posterior?
- Redacción final de la frase del bloque de deuda — requiere validación del operador.
