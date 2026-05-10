# TASK-857 — GitHub Webhooks Release Event Ingestion

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-857-github-webhooks-release-event-ingestion`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Agregar ingestión inbound de eventos GitHub Actions/Deployments por webhook firmado para que el Production Release Control Plane observe cambios de estado casi en tiempo real. La implementación debe reconciliar eventos contra `release_manifests` sin convertir GitHub en source of truth ni retirar el watchdog existente.

## Why This Task Exists

TASK-848/TASK-849/TASK-850/TASK-851/TASK-853/TASK-854 cerraron el control plane V1.1, pero el diagnóstico de fallos de producción sigue dependiendo principalmente de polling, correos y watchdog programado. Eso es resiliente como backstop, pero lento y ruidoso para incidentes de GitHub Actions donde el dato nace como evento (`workflow_run`, `workflow_job`, `deployment_status`) y debería entrar al plano release con dedupe, firma, auditoría y reconciliación.

## Goal

- Recibir eventos GitHub relevantes para releases mediante endpoint firmado e idempotente.
- Persistir eventos inbound con dedupe por `X-GitHub-Delivery` y payload sanitizado.
- Reconciliar eventos contra `greenhouse_sync.release_manifests` y `release_state_transitions` usando helpers canónicos.
- Mantener el watchdog TASK-849 como fallback/backstop hasta que la ingestión webhook demuestre steady state.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- `greenhouse_sync.release_manifests` sigue siendo source of truth; GitHub webhook es evidencia/reconciliador, no autoridad para decisiones de release.
- No crear un control plane paralelo. Extender/reusar `src/lib/release/*`, `greenhouse_sync.webhook_*` y `release_state_transitions`.
- Todo inbound GitHub debe validar `X-Hub-Signature-256` antes de parsear como trusted data.
- Idempotencia obligatoria por `X-GitHub-Delivery`; reintentos de GitHub no pueden duplicar transiciones ni alertas.
- El payload raw debe almacenarse sanitizado o con redaction explícita; nunca persistir tokens/secrets/header completo.
- No eliminar ni debilitar el watchdog TASK-849 en esta task.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/operations/runbooks/production-release-watchdog.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-848-production-release-control-plane.md`
- `docs/tasks/complete/TASK-849-production-release-watchdog-alerts.md`
- `docs/tasks/complete/TASK-851-production-release-orchestrator-workflow.md`
- `docs/tasks/complete/TASK-854-release-deploy-duration-last-status-signals.md`
- `src/lib/release/manifest-store.ts`
- `src/lib/release/state-machine.ts`
- `src/lib/webhooks/store.ts`
- `.github/workflows/production-release.yml`

### Blocks / Impacts

- Reduce MTTA de fallos GitHub Actions en Production Release.
- Mejora la evidencia para `/admin/releases` y reliability signals `Platform Release`.
- Puede habilitar un V1.3 posterior donde el watchdog baja frecuencia o pasa a auditor de drift.

### Files owned

- `src/app/api/webhooks/github/release-events/route.ts`
- `src/lib/release/github-webhook-ingestion.ts`
- `src/lib/release/github-webhook-reconciler.ts`
- `src/lib/release/github-webhook-signature.ts`
- `src/lib/release/github-webhook-ingestion.test.ts`
- `src/lib/release/github-webhook-reconciler.test.ts`
- `migrations/*`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Release source of truth: `greenhouse_sync.release_manifests` + `greenhouse_sync.release_state_transitions`.
- Release state helpers: `src/lib/release/manifest-store.ts` and `src/lib/release/state-machine.ts`.
- Watchdog scheduled detector + Teams alerts: `src/lib/release/watchdog-alerts-dispatcher.ts` and `.github/workflows/production-release-watchdog.yml`.
- Webhook platform tables and store: `greenhouse_sync.webhook_endpoints`, `greenhouse_sync.webhook_inbox_events`, `src/lib/webhooks/store.ts`.
- Operator dashboard: `/admin/releases` backed by `src/lib/release/list-recent-releases-paginated.ts`.

### Gap

- No first-party GitHub inbound webhook route exists for release events.
- Release manifests are not updated from GitHub event evidence in near real time.
- Current failure discovery can still arrive through email/watchdog polling instead of deterministic event ingestion.
- There is no dead-letter/unmatched-event surface specific to GitHub release webhook delivery.

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

### Slice 1 — Secure GitHub webhook endpoint

- Crear endpoint inbound para eventos GitHub release-relevantes.
- Validar `X-Hub-Signature-256` con secret canónico de runtime.
- Validar event type allowlist: `workflow_run`, `workflow_job`, `deployment_status`, `check_suite`, `check_run`.
- Rechazar payload unsigned, malformed, oversized o no allowlisted con respuesta sanitizada.

### Slice 2 — Idempotent event persistence

- Crear migración con storage mínimo para delivery metadata si las tablas genéricas no cubren dedupe GitHub de forma suficiente.
- Persistir `delivery_id`, `event_name`, `action`, `repository`, `workflow_run_id`, `workflow_job_id`, `deployment_id`, `target_sha`, `status`, `conclusion`, `received_at`, `processed_at`, `processing_status`, `error_code` y payload redacted.
- Dedupe por `delivery_id` y procesamiento at-least-once sin duplicar side effects.

### Slice 3 — Release reconciler

- Implementar reconciliador que mapea eventos a release manifest por `target_sha`, `workflow_run_id` y workflow name.
- Usar helpers canónicos de `src/lib/release/manifest-store.ts` para transiciones permitidas.
- No tocar campos inmutables de `release_manifests`.
- Si no existe manifest compatible, marcar evento `unmatched` y dejar evidencia para signal/runbook.

### Slice 4 — Reliability and observability

- Agregar signal o extender signal existente para `github_release_webhook_dead_letter` / `unmatched_release_event`.
- Registrar evidencia concreta: últimos delivery IDs, event types, workflow names, target SHAs y conteos por ventana.
- Agregar logs/audit redacted con `captureWithDomain` en dominio platform/release.

### Slice 5 — Tests and fixtures

- Fixtures sanitizados para eventos `workflow_run` success/failure, `workflow_job` queued/in_progress/completed, `deployment_status` success/failure.
- Tests de firma HMAC, replay/dedupe, allowlist, redaction, unmatched, y transición idempotente.
- Test de contrato que asegura que eventos GitHub no pueden mover un release fuera de la state machine permitida.

### Slice 6 — GitHub/Vercel/GCP configuration runbook

- Documentar webhook URL, eventos seleccionados, secret name/env var, rotación, retry esperado y verificación.
- Documentar que watchdog queda activo como backstop y cómo comparar webhook vs watchdog.
- Actualizar arquitectura release/webhooks si cambia el contrato.

## Out of Scope

- No dispara deploys ni merges desde el webhook.
- No reemplaza ni desactiva `.github/workflows/production-release-watchdog.yml`.
- No automatiza rollback.
- No acepta webhooks unsigned o secretos hardcodeados.
- No agrega UI write/mutation en `/admin/releases`; el dashboard puede seguir read-only.

## Detailed Spec

### Security contract

- Secret runtime: `GITHUB_RELEASE_WEBHOOK_SECRET` o secret ref equivalente ya usado por el repo si existe durante Discovery.
- Signature algorithm: GitHub `sha256=` HMAC over raw request body.
- Body parsing: leer raw body primero; validar firma; solo después parsear JSON.
- Response policy:
  - `401` para firma ausente/inválida.
  - `202` para evento aceptado o duplicado idempotente.
  - `400` para payload inválido no retryable.
  - `500` solo para fallas internas retryables, con error redacted.

### Reconciliation contract

- Primary match: `target_sha` + active/recent `release_manifests`.
- Secondary match: `workflow_runs` JSON si el manifest ya conoce `run_id`.
- No match: guardar `unmatched`, no inventar manifest.
- Terminal GitHub failure puede mover a `degraded`/`aborted` solo si la state machine y el contrato release actual lo permiten. Si hay duda, registrar evidence y dejar para operador.

### Event catalog

- Si se emiten outbox events, deben ser versionados `platform.release.github_event_received.v1` o `platform.release.github_event_reconciled.v1` y agregarse a `GREENHOUSE_EVENT_CATALOG_V1.md`.
- Si no se emiten eventos en V1, documentar explícitamente el rationale en Audit/Delta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El endpoint rechaza webhooks GitHub sin firma válida y no persiste payload trusted.
- [ ] El mismo `X-GitHub-Delivery` puede reenviarse sin duplicar transiciones, alerts ni registros laterales.
- [ ] Eventos `workflow_run` y `deployment_status` se reconciliaron contra `release_manifests` cuando hay match verificable.
- [ ] Eventos sin manifest quedan `unmatched` con evidence observable y no crean manifests fantasma.
- [ ] Payloads/errores quedan redacted y no exponen secrets ni headers sensibles.
- [ ] Watchdog TASK-849 sigue activo y funcional como backstop.
- [ ] Runbook explica configuración GitHub, rotación secret, verificación y rollback operacional.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/release/github-webhook-ingestion.test.ts src/lib/release/github-webhook-reconciler.test.ts`
- `pnpm test -- src/lib/webhooks`
- `pnpm pg:doctor` si se agrega migración
- Validación manual con fixture firmado contra endpoint local/staging
- Verificación en GitHub: delivery accepted/retried desde settings webhook sin error 5xx sostenido

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` y `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` reflejan el contrato final
- [ ] Si hubo migración, `schema-snapshot-baseline.sql`/tipos se actualizaron según flujo canónico del repo

## Follow-ups

- Evaluar después de 30 días si el watchdog puede bajar frecuencia y operar como drift auditor.
- V1.3 posible: poblar timeline enriquecido en `/admin/releases` con eventos GitHub reconciliados.
- V1.3 posible: alertar por divergencia entre webhook events y polling watchdog.

## Delta 2026-05-10

- Task creada como follow-up del incidente observado por email GitHub Actions: `Production Release Watchdog - main` falló y el operador se enteró por Outlook. La task apunta a que esos eventos entren al control plane por webhook firmado e idempotente.
