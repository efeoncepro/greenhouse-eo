# TASK-1885 — Atribución de campaña en la reunión agendada: cerrar la mitigación de PDR-009

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
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-023`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `growth|crm|data`
- Blocked by: `none`
- Branch: `task/TASK-1885-meeting-booking-campaign-attribution`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Una reunión agendada en `/agenda/` hoy se persiste sin la campaña que la trajo. El contrato server-side
`MeetingBookingRequest` ya define `utmSource`/`utmMedium`/`utmCampaign`/`referrerHost`, la tabla ya tiene
`attribution_json`, pero el renderer sólo envía `placement` y `pagePath` — y su propio tipo de payload
omite los campos UTM, así que la campaña es estructuralmente inalcanzable desde el cliente. Esta task
cierra la pierna Greenhouse/GTM de la mitigación declarada en PDR-009: capturar la campaña en el origen,
poder leerla de vuelta por contrato gobernado y reflejarla en GA4 — y deja la pierna `context.hutk`
como decisión explícita con condición, no como default silencioso.

## Why This Task Exists

`docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md` declara textualmente:

> La Scheduler API no preserva por si sola el tracking nativo de UTK/UTM/content tracking como un
> embed/form HubSpot. La mitigacion propuesta es medicion Greenhouse/GTM + envio complementario por
> Forms API con `context.hutk` cuando aplique.

Y en su postura de atribución:

> Scheduler API no acepta `hubspotutk`, UTM ni content tracking en el payload, y tampoco expone una
> operación de reprogramación. No se debe prometer paridad de atribución HubSpot nativa con el embed.

La mitigación quedó **propuesta, no implementada**. `TASK-1509` heredó el requisito
(«el adapter conserva server-side sólo campaña allowlisted») y dejó `Forms API/hutk` fuera de alcance
por falta de CMP/Consent Mode. El resultado es que el campo existe, se escribe vacío de campaña en cada
reserva, y nadie lo lee de vuelta.

**La consecuencia comercial es concreta.** Se está armando un embudo de paid media B2B para SEO/AEO cuyo
destino de agendamiento es `/agenda/` y cuya métrica norte es **coste por reunión agendada**. Si se pautea
hacia `/agenda/` con este estado, las reuniones que traiga la campaña **no se podrán atribuir a la campaña**:
se gasta presupuesto y no se sabe qué anuncio, qué ángulo ni qué canal funcionó. La aritmética de LTV:CAC
del canal depende de medir el porcentaje que acepta reunión, y ese porcentaje no se puede calcular por
origen si el origen no viaja con la reserva.

No es un problema de reporting que se arregle después: la campaña sólo existe en la sesión del visitante.
Si no se captura en el momento de la reserva, el dato **no es recuperable retroactivamente**.

## Goal

- Que una reserva confirmada en `/agenda/` quede persistida con la campaña que la originó, con la misma
  postura de privacidad que ya rige el resto del payload (cero PII, valores allowlisted).
- Que exista un contrato gobernado para leer reservas por campaña/origen, de modo que el coste por reunión
  agendada sea calculable por contrato y no por consulta manual a la base.
- Que `gh_meeting_booking_confirmed` llegue a GA4 con los parámetros de campaña que la casa ya usa, bajo la
  gramática `gh_<object>_<action>` y sin eventos ni key events nuevos.
- Que la pierna `Forms API` + `context.hutk` quede como decisión escrita con su condición de habilitación,
  no como una mitigación pendiente que nadie sabe si está encendida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`

Reglas obligatorias:

- La campaña es contexto de atribución, nunca identidad ni autenticación. No deriva permisos, no
  identifica persona y no entra en ninguna decisión de acceso.
- **Cero PII en `dataLayer`, logs, Sentry y GA4.** La restricción vigente de `TASK-1509` se mantiene sin
  excepción: ni email, ni timestamp exacto de la cita, ni contact/calendar ID, ni payload del provider.
- El valor de campaña se **sanitiza en el cliente antes de enviarse**. El servidor no relaja su validación
  para aceptar lo que el navegador traiga: la allowlist de caracteres es el contrato, no una sugerencia.
- Una reserva sólo cuenta como conversión cuando el servidor recibe confirmación exitosa de Scheduler. El
  ledger `server_confirmed` es source of truth; GA4 es espejo browser-reported.
- Nada de esto autoriza publicar el workspace GTM sin confirmación humana explícita (guardrail heredado de
  `TASK-1509`/`TASK-1510`).

## Normative Docs

- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md` — house style `gh_<object>_<action>`,
  contenedor GTM live `GTM-NGHPGRLZ` (containerId `218104216`) y propiedad GA4 `486264460`. El contenedor
  `GTM-NS3RNNCD` NO está instalado: un tag ahí no dispara.
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` — fila `fhsf-efeonce-lead-gen-web` + binding `discovery`,
  con el estado real del funnel `gh_meeting_*` y el pendiente de publish.
- `docs/reference/measurement-gtm-ga4/03-event-naming-taxonomy.md` y `01-ga4-event-model.md` — fundamento de
  parámetros y custom dimensions.
- `ai-generations/2026-09-21_ads-brand-visibility/PAID-MEDIA-B2B.md` — consumidor: declara coste por reunión
  agendada como métrica norte y `/agenda/` como destino de agendamiento.
- `ai-generations/2026-09-21_ads-brand-visibility/EMBUDO-STORYTELLING.md` — consumidor: la narrativa del embudo
  descansa sobre la misma medición.

## Dependencies & Impact

### Depends on

- `TASK-1509` (in-progress) — dueña del adapter y del ledger `greenhouse_growth.meeting_booking_execution`.
  Esta task NO reabre la autoridad de booking: consume su contrato y amplía lo que el cliente le entrega.
- `TASK-1510` (in-progress) — dueña del renderer `src/growth-meeting-renderer/**` y del host `/agenda/`.
  El cambio de payload vive en archivos que esa task posee; coordinar antes de tocar.
- `greenhouse_growth.meeting_booking_execution.attribution_json` — ya existe con `DEFAULT '{}'::jsonb`.
- Contenedor GTM `GTM-NGHPGRLZ` y propiedad GA4 `486264460` — ya operados vía
  `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com`.

### Blocks / Impacts

- Bloquea de hecho cualquier inversión de paid media que use `/agenda/` como destino de conversión: sin esto
  el gasto no es atribuible.
- `TASK-1509` recibe Delta: su out-of-scope «marketing Forms API submission by default» queda reafirmado y
  su requisito heredado de campaña allowlisted queda cerrado por esta task.
- `TASK-1510` recibe Delta: el payload del renderer se amplía; su contrato de telemetría sin PII no cambia.
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` — la fila del scheduler nativo cambia de estado.
- `PDR-009` recibe amendment con la postura final de la pierna `hutk`.

### Files owned

- `src/growth-meeting-renderer/api-client.ts`
- `src/growth-meeting-renderer/renderer.ts` (sólo el bloque de `attribution` del payload de booking)
- `src/lib/growth/meetings/readers.ts`
- `src/lib/growth/meetings/validation.ts` (sólo si Discovery prueba que la allowlist actual es demasiado
  estrecha para campañas reales; ver riesgo R1)
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md` (amendment de la pierna `hutk`)

## Current Repo State

### Already exists

- `src/lib/growth/meetings/contracts.ts:148` — `attribution?: { placement, pagePath, referrerHost, utmSource,
  utmMedium, utmCampaign }` en `MeetingBookingRequest`.
- `src/lib/growth/meetings/validation.ts:6` — `safeAttributionValue` = `string().trim().min(1).max(80)` con
  regex de alfabeto estrecho, `referrerHost` validado como hostname y el objeto `attribution` en `.strict()`.
- `src/lib/growth/meetings/__tests__/privacy-validation.test.ts:40` — ya prueba que un `utmCampaign` con
  `email=person@example.com` es rechazado. La defensa anti-PII existe y funciona.
- `src/lib/growth/meetings/command.ts:229,247` — propaga `input.attribution ?? {}`.
- `src/lib/growth/meetings/store.ts:204,221` — persiste `attribution_json` con `JSON.stringify`.
- `migrations/20260721034500000_task-1509-growth-meeting-scheduler.sql:39` — columna
  `attribution_json JSONB NOT NULL DEFAULT '{}'::jsonb` en `greenhouse_growth.meeting_booking_execution`.
- `src/app/api/public/growth/meetings/book/route.ts` — ruta pública de booking.
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` — fila del scheduler nativo con
  `gh_meeting_step_reached` y `gh_meeting_booking_confirmed` mapeado a `generate_lead`
  (`lead_source=meeting_booking`), workspace 6 previewado y sin publicar.

### Gap

- **El cliente no puede enviar la campaña.** `src/growth-meeting-renderer/api-client.ts:18` declara el payload
  como `attribution?: { placement?: string; pagePath?: string }` — los campos UTM y `referrerHost` no existen
  en el tipo del cliente. Buscar `utm` en `src/growth-meeting-renderer/` devuelve **cero ocurrencias**.
- **El renderer envía sólo dos campos.** `src/growth-meeting-renderer/renderer.ts:1616` arma
  `attribution: { placement, pagePath }`. Toda reserva se persiste sin campaña, sin medio, sin fuente y sin
  referrer. El dato se pierde en el origen y no es recuperable después.
- **Nadie lee `attribution_json` de vuelta.** `src/lib/growth/meetings/readers.ts` sólo exporta
  `readMeetingSchedulerConfig` y `readMeetingAvailability`. No existe reader de reservas por campaña, ni ruta
  admin, ni lane ecosystem, ni tool MCP. El coste por reunión agendada no es calculable por contrato.
- **GA4 no recibe campaña en la conversión.** `gh_meeting_booking_confirmed` no lleva parámetros de campaña y
  su tag sigue sin publicar.
- **La pierna `hutk` está en limbo.** `TASK-1509` la deja OFF «unless CMP/Consent Mode, dedupe and explicit
  policy approval exist», y `PDR-009` confirma que los hosts públicos hoy no tienen ese gate. Nadie ha escrito
  la decisión final, así que se relee como pendiente cada vez.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/growth-meeting-renderer/**` (bundle del web component servido al host público),
  `src/lib/growth/meetings/**` (contrato, validación, reader, store) y
  `src/app/api/public/growth/meetings/book/route.ts` (runtime Next.js en Vercel).
- Future candidate home: `remain-shared`
- Boundary: el contrato canónico sigue siendo `MeetingBookingRequest` + `parseMeetingBookingRequest` +
  `claimMeetingBooking`. El renderer es un consumer del contrato, nunca su dueño; el reader nuevo de
  atribución nace en `src/lib/growth/meetings/readers.ts` y los consumers autorizados son la ruta admin,
  el lane ecosystem y MCP — nunca una consulta SQL desde una vista.
- Server/browser split: el navegador sólo aporta valores ya sanitizados y allowlisted de la URL y el
  referrer. La validación autoritativa, la persistencia, el token de HubSpot y toda lectura del ledger
  permanecen server-side. Ningún secreto ni credencial cruza al bundle del renderer.
- Build impact: `none` — sin dependencias nuevas, sin filesystem inputs, sin entrypoints globales.
- Extraction blocker: `none` para el reader. El renderer comparte el contrato de payload con el dominio
  server-side, así que un split físico exigiría versionar ese contrato primero.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.meeting_booking_execution.attribution_json` (ledger
  server-confirmed); GA4 `486264460` es espejo, nunca fuente.
- Consumidores afectados: renderer público `/agenda/`, ruta admin de lectura, lane ecosystem + MCP,
  GTM `GTM-NGHPGRLZ` y GA4 `486264460`.
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/meetings/contracts.ts` (`MeetingBookingRequest`),
  `src/lib/growth/meetings/validation.ts` (`meetingBookingRequestSchema`, `.strict()`),
  `src/app/api/public/growth/meetings/book/route.ts`.
- Contrato nuevo o modificado: el tipo de payload del cliente en `src/growth-meeting-renderer/api-client.ts`
  se alinea con el contrato server-side; reader nuevo de atribución de reservas en
  `src/lib/growth/meetings/readers.ts` con su ruta de lectura gobernada.
- Backward compatibility: `compatible` — `attribution` sigue siendo opcional y cada subcampo opcional. Una
  reserva sin campaña se comporta exactamente como hoy.
- Full API parity: la lectura de reservas por campaña nace como reader canónico en `src/lib/growth/meetings/`,
  consumido por ruta admin y por lane ecosystem/MCP desde el mismo PR. Ninguna superficie consulta
  `attribution_json` por SQL propio.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.meeting_booking_execution` (lectura y escritura del
  campo `attribution_json` ya existente; **sin DDL**).
- Invariantes que no se pueden romper:
  - `attribution_json` nunca contiene PII. El único filtro que lo garantiza es la allowlist de caracteres
    del schema; ampliarla es ampliar la superficie de fuga y exige prueba explícita.
  - Un valor de campaña que no pasa la allowlist se descarta en el cliente, nunca se reenvía crudo ni
    hace fallar la reserva (ver riesgo R1: hoy la haría fallar).
  - `attribution` permanece `.strict()`: ninguna clave nueva entra sin declararse en el contrato.
  - La campaña no participa de idempotencia, autorización ni de la decisión de conversión.
  - Una reserva ya persistida no se reescribe para «mejorar» su atribución: el ledger es el registro de lo
    que se supo en el momento.
- Write-target allowlist: `N/A` — el dominio `growth/meetings` no tiene boundary test de destinos de escritura
  y esta task no agrega tablas. Si Discovery encuentra uno, declarar ahí antes de mergear.
- Tenant/space boundary: la superficie se deriva de `surfaceId` + `schedulerKey` vía
  `getMeetingSurfaceAuthority`, con validación de origen server-side. El reader nuevo hereda esa autoridad y
  se gatea por capability; nunca es lectura pública.
- Idempotency/concurrency: sin cambios — la reserva sigue idempotente por `idempotencyKey` y por el claim
  atómico de `claimMeetingBooking`. El reader es de sólo lectura.
- Audit/outbox/history: sin evento nuevo. `attribution_json` ya forma parte del registro append-only de la
  ejecución.

### Migration, backfill and rollout

- Migration posture: `none` — la columna existe desde
  `migrations/20260721034500000_task-1509-growth-meeting-scheduler.sql`.
- Default state: el envío de campaña nace con la versión inmutable del renderer; el reader nace gateado por
  capability. GTM se queda en preview hasta confirmación humana.
- Backfill plan: **ninguno, y es deliberado.** Las reservas históricas no tienen campaña y ese dato no existe
  en ninguna parte; inventarlo sería peor que no tenerlo. Las filas previas se leen como
  `origen no registrado`, nunca como `directo`.
- Rollback path: revertir la versión del renderer (el host sirve versiones inmutables) deja de enviar campaña
  sin tocar el servidor; el reader se apaga por capability; el tag GA4 se despublica desde GTM.
- External coordination: publicar el tag en `GTM-NGHPGRLZ` y verificar la llegada en GA4 `486264460` con la
  service account `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com`. Requiere confirmación
  humana explícita antes del publish.

### Security and access

- Auth/access gate: la ruta pública de booking mantiene su gate actual (origen + Turnstile + rate-limit). El
  reader de atribución exige sesión y capability; no se expone en ninguna superficie pública.
- Sensitive data posture: la campaña es dato de marketing, no PII — siempre que la allowlist se respete.
  El riesgo real es un `utm_*` con email o teléfono dentro, que ya está cubierto por el schema y por
  `privacy-validation.test.ts`.
- Error contract: `canonicalErrorResponse` para la ruta de lectura; `captureWithDomain` para observabilidad.
  Un valor de campaña descartado no es un error del usuario y no genera respuesta de error.
- Abuse/rate-limit posture: sin cambios. La campaña no amplía superficie de abuso porque su longitud y su
  alfabeto están acotados por el schema.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/meetings` más tests nuevos de sanitización cliente en
  `src/growth-meeting-renderer/`.
- DB/runtime checks: reserva de prueba en staging y `SELECT attribution_json` sobre su fila de
  `greenhouse_growth.meeting_booking_execution` confirmando los campos de campaña y cero PII.
- Integration checks: `pnpm test:live src/lib/growth/meetings` con proxy Cloud SQL arriba, más verificación de
  llegada del evento en GA4 realtime con
  `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/ga4/realtime-events.ts 486264460`.
- Reliability signals/logs: sin signal nueva. Si Discovery prueba que hace falta, declararla antes de crearla.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] El source of truth (`greenhouse_growth.meeting_booking_execution.attribution_json`), la contract surface
      (`MeetingBookingRequest`, reader nuevo, ruta admin, lane ecosystem/MCP) y los consumers quedan nombrados
      con paths reales.
- [ ] Los invariantes de PII, allowlist, `.strict()` y no-reescritura del ledger quedan explícitos y probados.
- [ ] La postura de migración (`none`) y de backfill (ninguno, deliberado) queda escrita con su razón.
- [ ] La evidencia runtime incluye una reserva real en staging leída desde PostgreSQL.
- [ ] La ruta de lectura usa errores canónicos y no filtra PII ni identificadores del provider.

## Capability Definition of Done — Full API Parity gate

- [ ] La lógica de atribución vive en `src/lib/growth/meetings/**`, no en el renderer ni en una vista.
- [ ] La lectura se modela como reader canónico sobre el ledger, no como consulta ad hoc de una pantalla.
- [ ] El reader expone contrato gobernado; no se introduce ningún write nuevo.
- [ ] Capability y grant a un rol real en el MISMO PR, con su coverage test.
- [ ] Camino programático declarado: ruta admin, lane `api/platform/ecosystem` y tool MCP en el mismo PR.
- [ ] Sin integración Nexa-específica: el reader lo consumen todos los consumers por construcción.
- [ ] Un primitive, muchos consumers — cero lógica de atribución duplicada.
- [ ] Parity check = SÍ.

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

### Slice 1 — Captura y transporte de campaña desde el host

- Alinear `src/growth-meeting-renderer/api-client.ts` con el contrato server-side: el tipo del payload incluye
  `referrerHost`, `utmSource`, `utmMedium` y `utmCampaign`.
- Leer los `utm_*` de la query de la página del host y el host del referrer en el momento en que el scheduler
  se monta, no en el momento del submit (el visitante puede navegar dentro del host y perder la query).
- Sanitizar antes de enviar: recortar a 80 caracteres, normalizar y descartar cualquier valor que no case
  la allowlist del servidor. Un valor no conforme se omite del payload; jamás se envía crudo.
- Tests de sanitización en el renderer: valor con espacios, valor con signo más, valor sobre 80 caracteres,
  valor con arroba, y ausencia total de query. En los cinco casos la reserva se envía y se confirma.

### Slice 2 — Reader gobernado de atribución de reservas

- Reader nuevo en `src/lib/growth/meetings/readers.ts` que devuelve reservas confirmadas agrupadas por
  `utmSource`, `utmMedium` y `utmCampaign` en una ventana `[start, end)`, sin PII y sin timestamp exacto de la
  cita.
- Filas sin campaña se reportan como `origen no registrado`, nunca como `directo`.
- Full API Parity en el mismo PR: ruta admin de lectura, lane `api/platform/ecosystem` y tool MCP, con
  capability nueva registrada y granteada a un rol real y su coverage test.

### Slice 3 — Campaña en la conversión GA4

- Añadir los parámetros de campaña al evento existente `gh_meeting_booking_confirmed` respetando la gramática
  `gh_<object>_<action>`. Cero eventos nuevos, cero key events nuevos.
- Construir el tag en `GTM-NGHPGRLZ` (containerId `218104216`) y sus custom dimensions en GA4 `486264460`.
- Dejar el workspace en preview con evidencia de `/g/collect`; el publish exige confirmación humana.
- Actualizar la fila del scheduler nativo en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`.

### Slice 4 — Cerrar por escrito la pierna Forms API + context.hutk

- Amendment en `PDR-009` que registre la decisión final: `hutk` queda OFF por defecto, con su condición de
  habilitación (CMP/Consent Mode vigente en el host, deduplicación contra el booking y aprobación de política)
  y su owner.
- Delta en `TASK-1509` y `TASK-1510` apuntando a esta task y a la decisión.
- Si la decisión es no habilitarla en el horizonte visible, decirlo así: la paridad de atribución nativa con el
  embed no se promete, y el coste por reunión se mide con el rail Greenhouse/GTM.

## Out of Scope

- Habilitar el envío por Forms API con `context.hutk`. Slice 4 decide y documenta; no enciende nada.
- Instalar CMP o Consent Mode en los hosts públicos. Es prerrequisito de la pierna `hutk`, no parte de esta task.
- Cualquier cambio a la autoridad de booking, al claim atómico, al flujo de idempotencia o al provider HubSpot
  (son de `TASK-1509`).
- Cualquier cambio visual, de copy o de flujo del scheduler (son de `TASK-1510`).
- Backfill de atribución sobre reservas históricas. El dato no existe; fabricarlo sería mentir.
- Reprogramación o cancelación por API, y modelar el objeto Meeting de HubSpot como fuente de atribución.
- Publicar el workspace GTM sin confirmación humana explícita.
- Un dashboard de coste por reunión. Esta task entrega el contrato de lectura; la superficie visible, si se
  decide, es otra task `ui-ux`.

## Detailed Spec

La atribución de una reunión es un problema de captura en el origen, no de reporting. El único momento en
que la campaña existe es la sesión del visitante que aterriza desde el anuncio; después no está en ninguna
parte. Por eso el orden es: primero que el dato llegue y se guarde, después que se pueda leer, y sólo al final
que se refleje en GA4.

El diseño aprovecha que `TASK-1509` ya dejó el contrato server-side correcto: el schema acepta los campos,
los valida con una allowlist estrecha, rechaza PII con un test que ya existe y los persiste en
`attribution_json`. No hace falta DDL ni relajar validación: hace falta que el cliente los envíe.

El punto delicado está en cómo los envía. `meetingBookingRequestSchema` es `.strict()` y
`parseMeetingBookingRequest` devuelve `null` ante cualquier fallo de schema — no ignora el campo malo, tumba
la reserva entera. Un `utm_campaign` real de Google Ads o LinkedIn suele traer espacios, signos más, secuencias
porcentuales o superar 80 caracteres, y ninguno de esos pasa la allowlist. Enviar el valor crudo convertiría
cada reserva de campaña en un `validation_failed`: **el fix ingenuo rompe justo lo que viene a medir.** De ahí
que la sanitización cliente-side sea un invariante de la task y no un detalle de implementación, y que la prueba
de aceptación no sea «la campaña llega» sino «la reserva se confirma incluso cuando la campaña es impresentable».

La alternativa —ampliar la allowlist del servidor— se evalúa sólo si Discovery prueba con campañas reales que la
pérdida de fidelidad es inaceptable, y en ese caso el criterio es que el alfabeto nuevo siga siendo incapaz de
transportar un email o un teléfono.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (captura) antes de Slice 2 (lectura) antes de Slice 3 (GA4). Leer o graficar antes de capturar produce
  un tablero vacío que se lee como «no hay campañas» en vez de «no estamos midiendo».
- Slice 4 es independiente y puede correr en paralelo: es decisión documental.
- **Slice 1 debe estar verificado en staging ANTES de cualquier inversión publicitaria hacia `/agenda/`.** Ese
  es el gate que justifica la task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| R1 — Un `utm_*` real con espacios, signo más o más de 80 caracteres no pasa la allowlist y, por `.strict()` más `parseMeetingBookingRequest` devolviendo `null`, tumba la reserva completa en vez de descartar el campo | integration | high | Sanitización obligatoria en el cliente: descartar el valor no conforme y enviar el payload sin él; tests con los cinco casos límite antes de mergear | Salto de `validation_failed` en la ruta de booking justo al empezar a pautear |
| R2 — Un `utm_*` inyectado con email o teléfono termina persistido como PII en el ledger | data | low | La allowlist del servidor lo bloquea y `privacy-validation.test.ts` ya lo cubre; no relajar el regex sin prueba de que el alfabeto nuevo no transporta PII | Revisión del `attribution_json` de la reserva de staging |
| R3 — Reservas sin campaña se leen como tráfico directo y se concluye que la campaña no funciona | data | medium | El reader distingue explícitamente `origen no registrado` de `directo`; las filas previas a esta task siempre caen en el primero | Discrepancia entre reservas totales y suma por origen |
| R4 — Se publica el tag GA4 sin confirmación humana y se contamina el histórico de `generate_lead` | UI | low | El publish queda fuera del automatismo; workspace en preview con evidencia `/g/collect` y confirmación explícita | Aparición de `generate_lead` con `lead_source=meeting_booking` sin aviso |
| R5 — El cambio de payload colisiona con el trabajo vivo de `TASK-1510` sobre los mismos archivos del renderer | migration | medium | Delta y coordinación antes de tocar `renderer.ts`; el cambio se acota al bloque `attribution` del payload | Conflicto de merge en `src/growth-meeting-renderer/**` |

### Feature flags / cutover

- Sin flag de entorno nuevo. El corte se hace por versión inmutable del renderer: el host sirve una versión;
  revertirla deja de enviar campaña sin tocar servidor ni base.
- El reader nace gateado por capability; sin grant, no es alcanzable.
- El tag GA4 se controla por publish y despublish en `GTM-NGHPGRLZ`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el host a la versión anterior del renderer; el servidor sigue aceptando `attribution` opcional | menos de 10 min | si |
| Slice 2 | Quitar el grant de la capability; revert PR del reader | menos de 5 min | si |
| Slice 3 | Despublicar el tag en GTM y restaurar la versión anterior del contenedor | menos de 10 min | parcial (los hits ya enviados a GA4 no se borran) |
| Slice 4 | Revert del amendment documental | menos de 5 min | si |

### Production verification sequence

1. Slice 1 en staging: reserva de prueba con `utm_source`, `utm_medium` y `utm_campaign` en la URL;
   `SELECT attribution_json` sobre su fila y confirmar los tres campos, el `referrerHost` y cero PII.
2. Repetir en staging con una campaña impresentable (espacios, signo más, 120 caracteres): la reserva se
   confirma y el campo problemático simplemente no aparece.
3. Promover a producción y repetir el paso 1 contra `/agenda/` con una reserva controlada; leer la fila real.
4. Slice 2: ejercitar el reader por ruta admin y por lane ecosystem, comparando su conteo contra el
   `SELECT` directo sobre el ledger.
5. Slice 3: preview del workspace, evidencia de `/g/collect`, verificación por GA4 realtime, y recién entonces
   pedir confirmación humana para publicar.
6. Sólo con los pasos 1 a 3 verdes en producción se habilita gasto publicitario hacia `/agenda/`.

### Out-of-band coordination required

- Publish del contenedor `GTM-NGHPGRLZ` y creación de custom dimensions en GA4 `486264460` — requieren la
  service account `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` y confirmación humana.
- Coordinación con las sesiones dueñas de `TASK-1509` y `TASK-1510` antes de tocar `src/growth-meeting-renderer/**`.
- La convención de `utm_*` que use la campaña debe acordarse con quien arme la pauta antes de lanzar: si los
  valores no son estables, la lectura agrupa mal aunque todo el cableado funcione.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/growth-meeting-renderer/api-client.ts` declara `referrerHost`, `utmSource`, `utmMedium` y
      `utmCampaign` en el payload de booking.
- [ ] Una reserva hecha en `/agenda/` con `utm_source`, `utm_medium` y `utm_campaign` en la URL persiste esos
      tres valores en `attribution_json` de su fila de `greenhouse_growth.meeting_booking_execution`, verificado
      por `SELECT` sobre la fila real.
- [ ] Una reserva hecha con un `utm_campaign` que no pasa la allowlist (espacios, signo más, más de 80
      caracteres) se confirma igual, y el campo no conforme queda ausente del payload sin `validation_failed`.
- [ ] Ningún valor persistido en `attribution_json` contiene email, teléfono ni ningún otro identificador
      personal, verificado sobre las filas de prueba.
- [ ] Existe un reader en `src/lib/growth/meetings/readers.ts` que devuelve reservas confirmadas agrupadas por
      campaña en una ventana `[start, end)`, y distingue `origen no registrado` de `directo`.
- [ ] Ese reader es alcanzable por ruta admin y por lane `api/platform/ecosystem` o MCP, con capability
      registrada y granteada a un rol real y su coverage test verde, todo en el mismo PR.
- [ ] `gh_meeting_booking_confirmed` lleva los parámetros de campaña, sin eventos ni key events nuevos, y su
      llegada está evidenciada en GA4 `486264460`.
- [ ] El workspace GTM queda en preview con evidencia y no se publica sin confirmación humana registrada.
- [ ] `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` refleja el estado real de la fila del scheduler nativo.
- [ ] `PDR-009` tiene amendment con la postura final de Forms API más `context.hutk`: estado por defecto,
      condición de habilitación y owner.
- [ ] `TASK-1509` y `TASK-1510` tienen `## Delta` apuntando a esta task.
- [ ] No se ejecutó ningún backfill de atribución sobre reservas históricas.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run src/lib/growth/meetings`
- `pnpm test:live src/lib/growth/meetings` (con proxy Cloud SQL arriba)
- `pnpm build`
- Lectura de `attribution_json` sobre las últimas filas de `greenhouse_growth.meeting_booking_execution`
  vía `pnpm pg:connect:shell`
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/ga4/realtime-events.ts 486264460`
- `pnpm task:lint --task TASK-1885`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `docs/changelog.md` registra el cambio de medición
- [ ] Invocar `greenhouse-documentation-governor` y correr `pnpm docs:closure-check`

## Follow-ups

- Superficie visible de coste por reunión agendada por campaña (task `ui-ux` separada, consumidora del reader
  de Slice 2).
- Si se instala CMP o Consent Mode en los hosts públicos, reabrir la pierna Forms API más `context.hutk` con la
  condición escrita en Slice 4.
- Extender la misma captura de campaña a los demás placements de scheduler cuando se gradúen más allá de
  `/agenda/`.

## Open Questions

- ¿Qué convención de `utm_*` va a usar la campaña? La allowlist es estrecha a propósito; si los valores se
  acuerdan de antemano (minúsculas, sin espacios, guiones bajos), la sanitización nunca descarta nada.
- ¿La lectura por campaña debe cruzar el gasto real del canal dentro de Greenhouse, o el coste se cruza fuera y
  aquí sólo viven las reuniones por origen? Cambia el alcance del reader de Slice 2.
- ¿`referrerHost` aporta algo una vez que los `utm_*` están, o es ruido que se guarda por si acaso?
