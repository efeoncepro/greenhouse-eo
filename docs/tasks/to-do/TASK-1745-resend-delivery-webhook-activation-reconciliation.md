# TASK-1745 — Activar y reconciliar el lifecycle de entrega de Resend

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `webhook`
- Epic: `EPIC-011`
- Status real: `Diseño — incidente abierto`
- Rank: `TBD`
- Domain: `hr|platform|ops|delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-160`

## Summary

Hacer operativo el lifecycle de entrega de Resend: corregir el handler firmado, registrar el webhook, persistir estados de proveedor y reconciliar los despachos recientes sin inventar entregas. Cierra el incidente que hoy deja todo correo como `sent` aunque el candidato no lo reciba.

## Why This Task Exists

La base registra 393 despachos con `resend_id`, pero cero lifecycle events desde que existe el handler. La cuenta de Resend no tiene webhooks registrados y el secreto no está configurado. Además, el handler puede reconocer como ausente un secreto por referencia durante cold start y responde `200 ignored`, suprimiendo reintentos.

## Goal

- Distinguir aceptación de despacho de entrega, rebote, queja, demora, fallo y supresión.
- Dejar el endpoint Resend firmado, idempotente, observable y operativamente configurado.
- Reconciliar el histórico reciente de forma honesta para que Hiring opere evidencia, no una etiqueta ambigua.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

Reglas obligatorias:

- Un `2xx` solo se devuelve después de verificar la firma y persistir/deduplicar el hecho; configuración ausente es una falla reintentable, no un evento ignorado.
- `svix-id` es la llave de deduplicación; eventos pueden repetirse y llegar desordenados.
- `email_deliveries` es la proyección Greenhouse; `sent` no equivale a `delivered`.

## Normative Docs

- `docs/issues/open/ISSUE-160-resend-webhook-delivery-lifecycle-never-operational.md`
- [Resend webhooks](https://resend.com/docs/webhooks/introduction)
- [Resend retries and replays](https://resend.com/docs/webhooks/retries-and-replays)

## Dependencies & Impact

### Depends on

- `src/app/api/webhooks/resend/route.ts`
- `src/lib/resend.ts`
- `src/lib/email/delivery.ts`
- `greenhouse_notifications.email_deliveries` and `greenhouse_notifications.email_engagement`

### Blocks / Impacts

- TASK-1747 consumes truthful delivery state.
- TASK-1746 uses the canonical delivery layer but does not wait for historical reconciliation.
- Replaces the stale operational assumption left by TASK-269 without rewriting its history.

### Files owned

- `src/app/api/webhooks/resend/route.ts` (+ tests)
- `src/lib/resend.ts` (+ tests)
- `src/lib/email/delivery.ts` (+ tests)
- `src/lib/reliability/queries/hiring-assessment-assignment-signals.ts`
- `services/ops-worker/deploy.sh` only if a declared worker/runtime contract requires it
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/manual-de-uso/plataforma/operar-comunicaciones-notificaciones.md`

## Current Repo State

### Already exists

- `POST /api/webhooks/resend` verifies Svix-style HMAC and has handlers for delivered, bounce, complaint, opened and clicked.
- `email_deliveries` has `resend_id` and lifecycle timestamp columns.
- The Resend email API accepts outbound email and the provider offers webhook retries/replays and email retrieval.

### Gap

- No webhook is registered in Resend and no production signing secret is configured.
- Handler initialization is unsafe for Secret Manager references; events can be acknowledged as ignored.
- Failure/delay/suppression and historical reconciliation are not represented by the current operational model.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/app/api/webhooks/resend/route.ts` on Vercel; Resend is the external provider.
- Future candidate home: `api`
- Boundary: signed Resend adapter → canonical delivery projection and reliability readers.
- Server/browser split: server-only route, provider client, secrets and Postgres; browser receives only allowlisted delivery status.
- Build impact: `none` — existing Resend/Svix-compatible dependencies only.
- Extraction blocker: Vercel ingress, Secret Manager resolution and transactional database projection are deployed together today.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `webhook`
- Source of truth afectado: `greenhouse_notifications.email_deliveries` plus signed Resend event lifecycle.
- Consumidores afectados: `UI/API/worker/external`
- Runtime target: `production|external`

### Contract surface

- Contrato existente a respetar: `POST /api/webhooks/resend`, `src/lib/email/delivery.ts`, Resend/Svix signed headers.
- Contrato nuevo o modificado: lifecycle state mapping, reconciliation reader/job and sanitized delivery DTO.
- Backward compatibility: `compatible` — existing `sent` rows stay historical dispatch records.
- Full API parity: readers/commands own state; Admin and Hiring UI consume DTOs rather than provider responses.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_notifications.email_deliveries`, `greenhouse_notifications.email_engagement`.
- Invariantes que no se pueden romper:
  - Provider events are verified before parsing/persisting and deduplicated by `svix-id`.
  - A reconciliation cannot promote a record to delivered without provider evidence.
  - Raw provider payload, email content and secrets never reach logs or browser DTOs.
- Tenant/space boundary: delivery lookup is server-side by provider identifier; operator readers retain existing authorization.
- Idempotency/concurrency: `svix-id` unique marker plus monotonic lifecycle transitions using provider `created_at` where ordering matters.
- Audit/outbox/history: preserve engagement/event audit and add a reliability signal for unconfirmed lifecycle beyond the defined window.

### Migration, backfill and rollout

- Migration posture: `additive` only if explicit status/timestamps require it.
- Default state: `disabled` until signed handler tests and secret wiring pass.
- Backfill plan: bounded read-only/provider reconciliation for recent `resend_id` rows; write only provider-confirmed facts, with a dry-run report first.
- Rollback path: disable/remove Resend webhook, revert deployment, preserve delivery records.
- External coordination: Resend dashboard/API registration, signing-secret storage, Vercel production configuration and redeploy.

### Security and access

- Auth/access gate: Resend Svix HMAC and server-only secret resolution.
- Sensitive data posture: email metadata is restricted; no raw token or mail body in event records.
- Error contract: invalid signature is `401`; unavailable secret/dependency is retryable and captured without raw error leakage.
- Abuse/rate-limit posture: provider signature, replay dedupe and no unauthenticated manual trigger.

### Runtime evidence

- Local checks: route signature, duplicate, order, missing-secret and event-mapping tests.
- DB/runtime checks: lifecycle transition queries and a zero-fabrication reconciliation report.
- Integration checks: Resend signed test/replay plus real delivery smoke.
- Reliability signals/logs: lifecycle unconfirmed, handler verification failures and webhook processing errors.
- Production verification sequence: deploy handler → configure secret → register endpoint → provider test → real email → verify DB and signal.

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

### Slice 1 — Handler seguro y semántica de lifecycle

- Await de la resolución de secreto, firma, dedupe, orden y errores reintentables.
- Mapear eventos soportados a un estado/DTO honesto; agregar cobertura para fallo, demora y supresión.

### Slice 2 — Configuración y smoke productivo

- Registrar el webhook productivo en Resend, guardar el secreto fuera del código y validar el endpoint firmado.
- Ejecutar replay/test y un envío real con evidencia de transición durable.

### Slice 3 — Reconciliación y señal

- Implementar un reader/job acotado para consultar el estado de despachos recientes por `resend_id`.
- Publicar señal de lifecycle no confirmado y manual operativo actualizado.

## Detailed Spec

- El handler resuelve el secreto de forma asíncrona antes de decidir el resultado HTTP; si no puede verificar o persistir de forma durable, responde como fallo reintentable y deja señal redacted.
- La firma se valida sobre el cuerpo crudo. El `svix-id` se persiste como dedupe antes de aplicar una transición monotónica por `created_at` del proveedor.
- Se normalizan explícitamente `email.sent`, `email.delivered`, `email.failed`, `email.delivery_delayed`, `email.bounced`, `email.complained` y `email.suppressed`; `opened` y `clicked` son engagement, nunca prueba de entrega.
- La reconciliación consulta `emails.get(resend_id)` en lotes acotados, primero dry-run. Solo aplica hechos que el proveedor confirme y conserva `sent` como despacho aceptado cuando no hay lifecycle.
- La configuración productiva registra exclusivamente `https://greenhouse.efeoncepro.com/api/webhooks/resend`, almacena el secreto `whsec_` en el mecanismo de secretos y se comprueba con test/replay firmado y un correo real consentido.
- El webhook es estrictamente inbound y observer-only: no se invoca desde `sendEmail`, no puede cancelar/bloquear el correo transaccional ni modifica el sender u ops-worker. Un fallo de recepción afecta solo visibilidad de lifecycle y debe activar retry del proveedor.

## Out of Scope

- Reenviar assessment o exponer enlaces de test (TASK-1746/1747).
- Reescribir el historial como entregado por inferencia.
- Migrar todos los proveedores de correo o crear un servicio nuevo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 MUST ship before registrar el endpoint externo.
- Slice 2 MUST prove a evento firmado con un único correo canario antes de suscribir el set completo de eventos o ejecutar writes de reconciliación.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Evento aceptado sin secreto | webhook | medium | await + respuesta reintentable + smoke | handler_unavailable |
| Evento duplicado/desordenado | DB | medium | `svix-id` + transición monotónica | duplicate/ordering test |
| Estado histórico inventado | delivery | low | provider evidence only + dry-run | reconciliation mismatch |
| Webhook afecta despacho outbound | email | low | observer-only contract + dispatch independence smoke | sender error rate |

### Feature flags / cutover

Sin feature flag de producto: el cutover externo ocurre solo después del test firmado y un canario que pruebe independencia del despacho outbound. Desregistrar/disable el webhook es rollback inmediato y no altera `emails.send`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert deployment | <5 min | sí |
| 2 | disable/delete webhook and secret binding | <5 min | sí |
| 3 | stop reconciliation job; retain confirmed facts | <5 min | parcial |

### Production verification sequence

1. Test local de firma/dedupe/secret.
2. Deploy sin registro externo y comprobar error reintentable ante secreto ausente.
3. Configurar secreto y registrar webhook para un canario consentido.
4. Ejecutar test/replay firmado, después un email real; verificar en paralelo que el despacho sigue sano y que el lifecycle llegó a DB.
5. Suscribir el set completo de eventos solo después del canario.
6. Ejecutar reconciliación dry-run antes de apply.

### Out-of-band coordination required

Resend dashboard/API, Vercel production variables/secrets and a consented real inbox for smoke.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un webhook de Resend habilitado y firmado existe en producción y el secreto no se expone en código/logs.
- [ ] El handler espera la resolución de secreto, deduplica por `svix-id` y no responde éxito cuando no puede verificar/procesar de forma durable.
- [ ] `email_deliveries` distingue despacho aceptado de lifecycle confirmado; eventos de fallo/demora/supresión tienen estado honesto.
- [ ] Un test firmado y un correo real producen evidencia durable; un replay no duplica efectos.
- [ ] La reconciliación histórica es acotada, auditable y no fabrica `delivered`.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- tests focales de webhook/delivery
- query de lifecycle en PostgreSQL
- smoke firmado + entrega real observada

## Closing Protocol

- [ ] Lifecycle y ubicación del archivo reflejan estado real.
- [ ] README, ISSUE-160, arquitectura y manual quedaron sincronizados.
- [ ] Handoff/changelog registran evidencia runtime y rollback.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` pasan al cierre.

## Follow-ups

- TASK-1746 y TASK-1747.
