# Plan — TASK-1366 HubSpot Scheduler Booking Equivalence Spike

## Discovery summary

- La task está libre: no hay branch ni PR activo para `TASK-1366`. Se mantiene `develop`, sin cambio de rama
  ni subagentes, y se preserva el directorio ajeno `docs/ui/creative-studio/`.
- La Scheduling Page pública `https://meetings.hubspot.com/efeoncepro/agenda-discovery` responde HTTP 200.
- El secreto canónico `hubspot-access-token` existe y su versión vigente está habilitada. Los chequeos de
  shape/higiene pasaron sin imprimir el token ni PII.
- El app canónico del portal `48713323` no declara `scheduler.meetings.meeting-link.read`. El reader de
  Scheduler devolvió `403 MISSING_SCOPES`; no se intentó reservar.
- La documentación oficial 2026-03 confirma details, availability y booking sobre la Scheduling Page. El
  response de booking puede incluir `calendarEventId`, `contactId`, `isOffline`, `webConferenceMeetingId` y
  `webConferenceUrl`; no soporta UTK/UTM/content tracking nativos, reprogramación API, CAPTCHA ni payments.
- `crm.objects.appointments.write` ya existe como scope opcional, pero la documentación generada de POST no
  permite inferir con seguridad el set mínimo de write scopes. Se resolverá por contrato oficial + error
  redacted después de habilitar el reader; no se agregarán scopes amplios por especulación.
- `book_meeting` de TASK-1431 es navegación-only. Si el spike pasa, el adapter productivo será otro kind
  (`native_booking` o `hubspot_handoff`) y requerirá task/arquitectura posterior.
- El scope fue autorizado y aplicado: build `#27` validado/desplegado, reinstalación confirmada y read-back
  efectivo con el token gobernado existente. No hubo rotación porque el mismo token adquirió el permiso.
- Details/availability prueban `GROUP_CALENDAR`, `isOffline=false`, Office 365, duración 30 min, `company`
  requerido, consentimiento legal habilitado y slots reales. El slug API incluye owner + leaf.
- El harness quedó implementado y verificado en modo inspect; el guard de execute falla cerrado sin la
  confirmación literal y no realizó POST.
- El POST inválido controlado alcanzó `VALIDATION_ERROR`, probando autorización del endpoint sin crear booking;
  ya no existe incertidumbre de write scope para el smoke.

## Audit

### Supuestos correctos

- HubSpot debe seguir siendo el motor de disponibilidad/reserva/calendario/Teams.
- CRM Meetings API no reemplaza Scheduler booking.
- `HubSpotMeetingEmbed` es el fallback vigente y no se toca en este spike.

### Supuestos desactualizados

- Las referencias de TASK-1339/1340 apuntaban a `to-do`; ambas tasks están `complete` y se corrigieron.
- El contrato modular faltaba porque TASK-1366 antecede el gate; se agregó antes de implementación.
- `backend-standard` subestimaba un write externo con PII e invitaciones reales; el plan usa
  `backend-critical` y checkpoint humano.

### Arquitectura y docs obligatorios

- `PDR-009`: autoriza validación, no cutover.
- Growth CTA ADR/architecture: `book_meeting` permanece navigation-only; el write futuro es otro adapter.
- Tracking Plan + convención GH: telemetry sin PII y conversión solo server-confirmed.
- HubSpot bridge + secret governance: scope/app config y token server-side son boundaries distintos.

### Código/contratos existentes para reutilizar

- `src/lib/hubspot/access-token.ts`: resolver canónico env → Secret Manager.
- `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/app-hsmeta.json`: app y scopes.
- `HubSpotMeetingEmbed`: fallback público, sin cambios.

### Schema/runtime real

- No hay schema, migration ni DB en este spike.
- Source of truth externo: Scheduling Page `agenda-discovery`, calendario Office 365 y Teams del organizador.
- Runtime actual: token sano + Scheduler bloqueado por scope; booking no probado.

### Access model

- Sin route groups, views, entitlements ni startup-policy de Greenhouse.
- Auth externa server-only mediante app/token HubSpot; ningún secreto o provider call llega al browser.

### Skills

- `greenhouse-task-execution-hook` y `greenhouse-task-planner`: intake, lifecycle y checkpoint.
- `hubspot-greenhouse-bridge`: boundary app/bridge/token.
- `greenhouse-secret-hygiene`: inspección/refresh sin exponer secretos.
- `software-architect-2026`: veredicto y frontera de eventual productización.
- Al cierre: `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`.

### Subagent strategy

`sequential`: no autorizados y los slices son causales (scope → details/availability → booking → evidencia).

### Riesgos / blast radius

- Upload/reinstalación cambia permisos del app HubSpot y emite token nuevo.
- Un booking escribe contacto/timeline, calendario, Teams y correo real; solo una ejecución aprobada.
- HubSpot no ofrece idempotency key documentada para este endpoint: el script debe fail-closed y requerir
  confirmación explícita para el write, sin retry automático.
- La evidencia debe ser allowlisted/redacted; no se guardan email, nombre, token ni bodies raw.

### Open questions resueltas y pendientes

- Resuelta: la falla actual es scope faltante, no secreto corrupto.
- Resuelta: no se gradúa `book_meeting`; cualquier adapter de write será nuevo.
- Pendiente de operador: organizador, email de test y ventana de slot.
- Resuelta tras details: un organizador resuelto por la scheduling page, calendario Office 365, `company`
  requerido y consentimiento legal habilitado. Teams aún debe probarse con el booking.
- Pendiente tras booking: cancel/reschedule y necesidad real de Forms API + `context.hutk`.

## Architecture decision

- `PDR-009` es suficiente para ejecutar el spike, porque acepta la dirección de validación y prohíbe el
  cutover. No nace ADR ni runtime productivo en esta task.
- Un veredicto positivo no autoriza productización: la task sucesora deberá formalizar adapter, abuse control,
  idempotencia/reconciliación, señalización, consentimiento y flag default OFF.

## Backend/data contract

- Rigor: `backend-critical` por write externo, PII e invitaciones/calendario reales.
- Contratos: Scheduler details/availability/book; CRM Meetings y Forms API solo comparadores/mitigación.
- Migration/backfill: ninguno. Default: no runtime/cutover.
- Rollback: cancelar reunión y limpiar artefactos test según política; nunca reintentar booking automáticamente.
- Evidence: response allowlisted + comprobación manual HubSpot, calendario, Teams e inbox test.

## Execution order

1. **Checkpoint y coordinación externa.** Aprobar este plan; confirmar autorización para scope mínimo,
   `hs project upload --account=48713323`, reinstalación y refresh del secreto; recibir organizador/email/slot.
2. **Scope/read contract.** Modificar solo el app config gobernado, subirlo tras aprobación, guiar/verificar
   reinstalación y comprobar que el token nuevo resuelve details + availability. No booking en este slice.
3. **Smoke harness seguro — completo.** `scripts/hubspot/smoke-scheduler-booking.mjs`: inspect por defecto,
   payload desde env, output allowlisted/digested, slot revalidado, guard literal y cero retries de POST.
4. **Booking único.** Elegir un slot devuelto por availability, mostrar resumen sin PII y ejecutar una sola
   reserva con aprobación inmediata. Capturar únicamente IDs/booleanos/host y timestamps necesarios.
5. **Equivalencia operativa.** Verificar `isOffline=false`, calendar event, Teams, invite, contacto/timeline y
   cancel/reschedule. Cancelar/limpiar según instrucción del operador.
6. **Atribución — completa.** Scheduler no porta UTK/UTM/content tracking; futura conversión server-confirmed
   mapea a GA4 `generate_lead`, campaña allowlisted y Forms API opcional solo con consent/CMP + dedupe. Sin GTM.
7. **Veredicto y cierre.** Actualizar PDR-009, primitive docs, task, índices, changelog/handoff; proponer task
   backend-data + UI si pasa o hardening del iframe si falla; correr gates proporcionales.

## Files to create

- `scripts/hubspot/smoke-scheduler-booking.mjs` — solo después del checkpoint y si el smoke reproducible lo
  requiere; nunca se enlaza al runtime público.

## Files to modify

- `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/app-hsmeta.json` — scope mínimo,
  solo tras autorización.
- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/reference/measurement-gtm-ga4/{TRACKING-PLAN.md,04-greenhouse-gh-event-convention.md}` solo si el
  veredicto define un evento nuevo.
- task/lifecycle, índices, `Handoff.md`, `changelog.md` y `project_context.md` según resultado real.

## Files to delete

- Ninguno.

## Verification

- `pnpm task:lint --task TASK-1366`
- `node --check scripts/hubspot/smoke-scheduler-booking.mjs` si existe.
- Details + availability con output redacted.
- Booking único + HubSpot UI + calendario + Teams + inbox test.
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check` y `pnpm docs:context-check:strict` cuando corresponda.

## Checkpoint

- Plan y scope mínimo + upload/reinstalación/refresh del token aprobados por el operador el 2026-07-21.
- Build `#27` desplegado, app reinstalada y scope efectivo sin rotación del secreto.
- Permanece pendiente antes del booking: confirmar email de test y ventana de slot; el organizador lo resuelve
  la scheduling page sobre su único calendario Office 365 disponible.
- Estado 2026-07-21: `operativamente bloqueado`. El repo contiene correos usados en smokes históricos, pero no
  constituyen aprobación vigente para generar contacto, calendario, Teams e invitación reales.
