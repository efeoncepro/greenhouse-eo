# TASK-1366 — HubSpot Scheduler Booking Equivalence Spike

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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|crm`
- Blocked by: `none`
- Branch: `task/TASK-1366-hubspot-scheduler-booking-equivalence`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Validar si una experiencia de booking propia de Greenhouse puede usar HubSpot Scheduler API y conservar el comportamiento nativo de HubSpot Meetings: reserva en calendario, Teams, invitacion al cliente, contacto/timeline/meeting object y medicion confiable. Si no hay equivalencia real, se mantiene el iframe oficial como fallback.

## Why This Task Exists

El iframe oficial de HubSpot Meetings ya esta funcionando en la landing de Redes Sociales, pero introduce friccion CRO: scroll interno, bloque largo de privacidad, control visual limitado y menor capacidad de instrumentacion fina. La alternativa atractiva es UI propia + API, pero seria un error reemplazar el widget si el API no dispara los mismos side effects de HubSpot/Teams/calendario que hoy justifican usar Meetings.

## Goal

- Probar con evidencia si `POST /scheduler/2026-03/meetings/meeting-links/book` sobre `agenda-discovery` reserva usando el motor real de HubSpot.
- Documentar con matriz pass/fail que side effects se preservan: calendario, Teams, invite, contacto/timeline, meeting internals, cancel/reschedule.
- Definir la arquitectura posterior: mantener widget, crear adapter server-side de `book_meeting`, o abrir task UI nativa sobre un contrato probado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/epics/to-do/EPIC-023-growth-cta-popup-cro-engine.md`
- `docs/tasks/to-do/TASK-1339-growth-cta-engine-foundation.md`
- `docs/tasks/to-do/TASK-1340-growth-cta-portable-renderer-surfaces.md`

Reglas obligatorias:

- HubSpot sigue siendo el motor de reserva hasta que se pruebe lo contrario; Greenhouse no debe duplicar calendario/Teams.
- El cliente nunca ve tokens HubSpot ni llama a Scheduler API directo.
- `CRM Meetings API` no es sustituto de booking; solo puede servir como comparador/fallback documental.
- La prueba debe usar cuenta/email de test y horario aprobado; no crear reuniones con leads reales.
- No publicar tags GTM ni cambiar landings durante esta task.

## Normative Docs

- `docs/context/00_INDEX.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/web-media-delivery-tooling.md` (solo si se adjunta evidencia visual; no se esperan assets)
- `https://developers.hubspot.com/docs/api-reference/latest/scheduler/meetings/create-meeting`
- `https://knowledge.hubspot.com/meetings-tool/create-and-edit-scheduling-pages`
- `https://knowledge.hubspot.com/integrations/connect-hubspot-and-microsoft-teams`
- `https://knowledge.hubspot.com/meetings-tool/use-meetings`
- `https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/meetings/guide`
- `https://developers.hubspot.es/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-authenticated`

## Dependencies & Impact

### Depends on

- HubSpot portal Efeonce con scheduling page `efeoncepro/agenda-discovery`.
- HubSpot Meetings + Office 365 calendar + Microsoft Teams configurados para el organizador.
- Token/credential HubSpot server-side disponible via Secret Manager o entorno local autorizado.
- `HubSpotMeetingEmbed` actual documentado en `docs/architecture/public-site/PRIMITIVES.md`.

### Blocks / Impacts

- Decide el mecanismo futuro del CTA "Agenda una reunion" para `TASK-1350`, `TASK-1351`, `TASK-1352` y `TASK-1358`.
- Informa el action router `book_meeting` de `EPIC-023`.
- Puede abrir una task posterior `ui-ux` para booking nativo cross-surface si el spike pasa.
- Puede abrir una task de hardening del iframe si el spike falla.

### Files owned

- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`
- `docs/tasks/to-do/TASK-1366-hubspot-scheduler-booking-equivalence.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `Handoff.md`
- `changelog.md`
- `project_context.md`
- `[nuevo si hace falta] scripts/hubspot/smoke-scheduler-booking.mjs`
- `[nuevo si se decide persistir adapter] src/lib/growth/meetings/**`

## Current Repo State

### Already exists

- `HubSpotMeetingEmbed` live en `/servicios/redes-sociales/`, con shell Efeonce, fallback directo y eventos `dataLayer` sin PII.
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` registra CTAs meeting y embed como `pendiente` para GTM/GA4.
- `EPIC-023` ya contempla `book_meeting` como action futura del Growth CTA engine.
- `services/hubspot_greenhouse_integration/` existe como bridge Cloud Run para HubSpot CRM writes/webhooks, pero hoy no expone Scheduler booking.

### Gap

- No se ha probado si Scheduler API conserva los side effects del widget en el portal Efeonce.
- No hay adapter server-side Greenhouse para availability/book/cancel/reconcile.
- No hay decision fundada para reemplazar el iframe en WordPress o Think.
- El impacto real de perder UTK/content tracking nativo del embed aun no esta cuantificado ni mitigado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `HubSpot Scheduling Page agenda-discovery + future growth.meetings adapter`
- Consumidores afectados: `public-site CTAs`, `Think`, `Growth CTA engine`, `GTM/GA4`, `HubSpot CRM`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: HubSpot Scheduler API `POST /scheduler/2026-03/meetings/meeting-links/book`; HubSpot Meetings embed actual como fallback.
- Contrato nuevo o modificado: `candidate book_meeting adapter` documentado; codigo productivo solo si se necesita para el smoke y queda no-enlazado a runtime publico.
- Backward compatibility: `compatible` — no debe cambiar la landing live ni los CTAs existentes.
- Full API parity: la UI futura consumiria un adapter server-side Greenhouse; nunca llamaria HubSpot desde el componente ni desde WordPress inline.

### Data model and invariants

- Entidades/tablas/views afectadas: `none` en esta task salvo que el executor cree un artefacto local de evidencia; no migrations.
- Invariantes que no se pueden romper:
  - No crear reuniones con clientes/leads reales durante el spike.
  - No registrar PII cruda en logs, `dataLayer`, screenshots o docs.
  - `isOffline=false` es requisito para considerar equivalencia.
  - `calendarEventId` + Teams URL/ID son requisitos para considerar reemplazo.
- Tenant/space boundary: `N/A` para el spike; si se productiza, el adapter debe recibir surface/tenant/campaign y no inferir desde dominio libre.
- Idempotency/concurrency: la prueba debe evitar doble booking; si se implementa adapter, usar idempotency key propio y comparar behavior de retry contra HubSpot.
- Audit/outbox/history: `none` en spike; si se productiza, conversion evidence debe ser server-confirmed y reconciliable con HubSpot/GA4.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `disabled` — ninguna landing cambia.
- Backfill plan: `N/A`
- Rollback path: cancelar/eliminar la reunion de prueba y revertir cualquier script/adapter experimental no usado.
- External coordination: confirmar con operador email de test, horario de prueba, organizer y scheduling page antes de crear la reserva.

### Security and access

- Auth/access gate: token HubSpot server-side; nunca en cliente.
- Sensitive data posture: email/nombre de test solamente; redactar en logs y docs.
- Error contract: si hay codigo, errores canonicos (`scheduler_unavailable`, `offline_booking`, `teams_missing`, `calendar_missing`, `hubspot_scope_missing`) sin body raw de HubSpot.
- Abuse/rate-limit posture: no aplica al spike; si pasa a producto, rate limit por IP/email/surface + captcha/Turnstile o challenge equivalente.

### Runtime evidence

- Local checks: script o cURL reproducible documentado, con payload redacted.
- DB/runtime checks: `N/A` salvo que se cree adapter Greenhouse local.
- Integration checks: availability read + controlled booking + HubSpot portal verification + Outlook/Teams/invite verification.
- Reliability signals/logs: documentar signals candidatos para futura productizacion (`growth.meeting.booking_succeeded`, `growth.meeting.booking_failed`, `growth.meeting.offline_booking_detected`).
- Production verification sequence: ver §Production verification sequence; no live user rollout en esta task.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract inventory

- Confirmar slug/link real de `agenda-discovery` y la scheduling page que usa el iframe actual.
- Confirmar si la scheduling page tiene Microsoft Teams seleccionado y calendario Office 365 conectado.
- Confirmar scopes/token disponibles para Scheduler API sin rotar secretos.
- Inventariar required fields, legal consent responses y form fields de la scheduling page.
- Documentar diferencia entre Scheduler API, CRM Meetings API y Forms API.

### Slice 2 — Availability + controlled booking smoke

- Consultar disponibilidad real de la meeting link.
- Reservar una reunion controlada con email/nombre de prueba aprobados.
- Registrar la respuesta redacted de HubSpot: `calendarEventId`, `contactId`, `isOffline`, `webConferenceUrl`, `webConferenceMeetingId`, subject/location/start/end.
- Verificar en HubSpot portal, calendario, Teams y correo del invitado que el comportamiento sea equivalente al nativo.
- Cancelar/limpiar la reunion de prueba si corresponde y documentar cleanup.

### Slice 3 — Attribution and UTK mitigation

- Confirmar que Scheduler API no preserva tracking nativo `hubspotutk`/UTM/content igual que el embed.
- Probar o disenar la mitigacion minima: tracking code + `dataLayer` + captura server-side de UTMs + Forms API con `context.hutk` cuando aplique.
- Definir cuales eventos son mid-funnel (`gh_cta_clicked`, `gh_meeting_*`) y cual seria conversion server-confirmed (`gh_meeting_booked` o GA4 recommended equivalente si aplica).
- Actualizar el Tracking Plan solo si se define un evento nuevo; no publicar GTM.

### Slice 4 — Verdict + follow-up task split

- Emitir un veredicto `pass | conditional pass | fail`.
- Si pasa: abrir o proponer task `backend-data` para adapter `book_meeting` productivo y task `ui-ux` posterior para UI nativa cross-surface.
- Si falla: abrir o proponer task de hardening del iframe/fallback actual y mantener `HubSpotMeetingEmbed` como camino canónico.
- Actualizar `PDR-009`, `PRIMITIVES.md`, `Handoff.md` y `changelog.md` con la decision final.

## Out of Scope

- Reemplazar el iframe en `/servicios/redes-sociales/`.
- Insertar booking nativo en WordPress, Think o cualquier landing.
- Publicar tags/triggers en GTM.
- Crear una UI calendario propia.
- Usar CRM Meetings API como reserva.
- Crear/deal/quote o workflows comerciales desde la reunion.
- Cambiar configuracion de Teams/Office 365/HubSpot sin aprobacion explicita del operador.

## Detailed Spec

### Pass criteria

El spike pasa solo si se cumplen todos:

- `isOffline=false`.
- `calendarEventId` presente.
- `webConferenceUrl` o `webConferenceMeetingId` presente y corresponde a Teams.
- El evento aparece reservado en el calendario del organizador.
- El invitado recibe invite con Teams.
- HubSpot crea/actualiza contacto y deja evidencia de la reunion en timeline/objeto esperado.
- La scheduling page conserva o explica links de cancelacion/reprogramacion.
- El API no requiere CAPTCHA/payment feature no soportada para nuestro caso.
- El token/scope requerido puede operar server-side sin exponer secreto ni usar credenciales personales.

### Conditional pass

El spike puede pasar condicionado si el booking funciona, pero faltan mitigaciones documentables:

- UTK/content tracking no viaja nativo, pero se puede cubrir con Forms API + `context.hutk` + GTM/Greenhouse attribution.
- Reschedule/cancel no es API-first, pero el invite/HubSpot email contiene links nativos suficientes.
- La respuesta no trae un campo secundario, pero el portal/calendario/Teams demuestran la creacion real.

### Fail criteria

El spike falla si:

- HubSpot devuelve `isOffline=true`.
- No hay calendario o invite.
- No se genera Teams.
- Solo se crea actividad CRM sin reserva real.
- El endpoint no acepta la scheduling page o scopes actuales.
- El flujo exige payment/CAPTCHA o feature expresamente no soportada por Scheduler API.
- La prueba muestra riesgo de duplicar reservas sin idempotencia posible.

### UTK and measurement posture

- `hubspotutk` no se trata como simple autollenado: asocia visitante anonimo, paginas vistas y atribucion nativa de HubSpot.
- La mitigacion minima debe preservar first-party measurement:
  - HubSpot tracking code activo en hosts publicos.
  - `dataLayer` sin PII para CTA/view/load/fail/booked.
  - Captura server-side de UTM/referrer/page/surface/correlation.
  - Forms API opcional con `context.hutk`, `pageUri`, `pageName` si necesitamos asociar visit history en HubSpot antes/junto al booking.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (inventory) MUST complete before Slice 2 (booking smoke).
- Slice 2 MUST use approved test details before creating any meeting.
- Slice 3 can run after Slice 1 and should finish before the final verdict.
- Slice 4 depends on Slice 2 + Slice 3 evidence.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Crear reunion real no deseada | HubSpot/Calendar/Teams | medium | email y horario de test aprobados; cleanup inmediato | invite llega a persona equivocada |
| Perder side effects nativos | HubSpot Meetings | medium | pass criteria estrictos; no reemplazo si falta Teams/calendar | `isOffline=true`, sin `calendarEventId` |
| Exponer PII en logs/docs | privacy/measurement | medium | redaction antes de commitear evidencia | email/nombre visible en diff |
| Scope/token insuficiente | HubSpot API | medium | inventario de scopes antes de booking; no rotar secreto sin approval | `403`/`scope missing` |
| Sobreestimar equivalencia por una sola prueba | growth/public-site | medium | veredicto `conditional` si hay dudas; mantener iframe fallback | campos inconsistentes entre portal/invite/API |

### Feature flags / cutover

- Sin flag en esta task: no hay runtime public cutover.
- Si se crea codigo experimental, debe quedar sin import/enqueue en runtime publico.
- La productizacion posterior debera usar flag tipo `GROWTH_MEETING_BOOKING_ADAPTER_ENABLED=false` por defecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir docs/scripts de inventario si quedan incorrectos | <15 min | si |
| Slice 2 | Cancelar reunion de prueba, borrar/archivar contacto test si corresponde, revertir script | <30 min | parcial |
| Slice 3 | Revertir cambios de tracking docs si el evento no se adopta | <15 min | si |
| Slice 4 | Cambiar veredicto en `PDR-009` y mantener iframe | <15 min | si |

### Production verification sequence

1. Confirmar con operador email de prueba, organizer y slot.
2. Ejecutar availability read contra scheduling page.
3. Ejecutar booking smoke una sola vez.
4. Capturar respuesta redacted.
5. Verificar HubSpot contact/timeline/meeting.
6. Verificar calendario del organizador.
7. Verificar invite recibido por invitado test.
8. Verificar Teams URL.
9. Cancelar o limpiar reunion si el operador lo pide.
10. Documentar veredicto y no tocar landings.

### Out-of-band coordination required

- Operador debe confirmar email de prueba y horario antes de crear el booking.
- Puede requerir revisar en HubSpot UI que la scheduling page tenga Teams y calendario conectados.
- Si falta scope/token, cualquier cambio de private app/secret requiere aprobacion separada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se confirma el endpoint/version Scheduler API y payload requerido para `agenda-discovery`.
- [ ] Se documenta si la scheduling page tiene Teams + Office 365 calendar conectados.
- [ ] Availability read funciona o falla con error canonico documentado.
- [ ] Booking smoke controlado produce evidencia redacted.
- [ ] Se verifica `calendarEventId`, `isOffline`, Teams URL/ID, invite, calendario y HubSpot timeline.
- [ ] Se documenta el impacto de `hubspotutk`/UTM/content tracking y mitigacion viable.
- [ ] Se emite veredicto `pass | conditional pass | fail` con decision de next task.
- [ ] No se inserta booking nativo en ninguna landing.
- [ ] No se publica GTM.
- [ ] No queda PII cruda en docs, logs o diffs.

## Verification

- `pnpm task:lint --task TASK-1366`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check -- docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md docs/tasks/to-do/TASK-1366-hubspot-scheduler-booking-equivalence.md`
- `node --check scripts/hubspot/smoke-scheduler-booking.mjs` si se crea script JS.
- Smoke HubSpot Scheduler API documentado con evidencia redacted.
- Verificacion manual HubSpot UI + calendario + Teams + email invite.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `PDR-009` quedo actualizado con el veredicto final
- [ ] `docs/architecture/public-site/PRIMITIVES.md` quedo alineado con fallback/camino nativo
- [ ] se abrio follow-up task si el veredicto requiere productizacion o hardening

## Follow-ups

- `TASK-TBD` — Native Meeting Booking Adapter (`backend-data`) si `TASK-1366` pasa.
- `TASK-TBD` — Native Meeting Booking UI cross-surface (`ui-ux`) dependiente del adapter.
- `TASK-TBD` — HubSpotMeetingEmbed hardening si `TASK-1366` falla.

## Open Questions

- Que email de prueba y slot exacto usara el smoke?
- La scheduling page `agenda-discovery` requiere campos legales/consent que no podamos mapear fuera del iframe?
- HubSpot devuelve o expone links de cancelacion/reprogramacion cuando el booking se hace por API?
- Conviene enviar una Forms API submission con `hutk` antes del booking o basta la atribucion Greenhouse/GTM?
