# Plan — TASK-857 GitHub Webhooks Release Event Ingestion

## Discovery Summary

- Task libre: no hay PR abierto ni branch `TASK-857`/`github-webhooks-release` visible.
- El usuario pidió explícitamente mantenerse en `develop`, por lo que no se crea ni cambia branch aunque la task declare `Branch: task/TASK-857-github-webhooks-release-event-ingestion`.
- Source of truth real: `greenhouse_sync.release_manifests` + `release_state_transitions`, con helpers canónicos en `src/lib/release/manifest-store.ts` y state machine cerrada en `src/lib/release/state-machine.ts`.
- Webhook transport real: `greenhouse_sync.webhook_endpoints` + `webhook_inbox_events` y helpers en `src/lib/webhooks/store.ts`.
- Gap real: no hay endpoint GitHub inbound ni tabla normalizada para delivery/event metadata de release.
- `pnpm pg:doctor` verde: GCP CLI + ADC alineados, runtime sin CREATE en schemas, `greenhouse_sync` accesible.

## Architecture Decision

- ADR existente: `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` gobierna source of truth, state machine y signals.
- ADR existente: `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` gobierna persist-first, provider-native signatures y webhook inbox.
- Delta requerido: GitHub repository webhooks son una excepción específica del Release Control Plane sobre el transport boundary existente; se documenta en release/webhook specs.
- Outbox events nuevos: no en V1. El ledger normalizado + reliability signal cubren observabilidad; las transiciones release existentes siguen emitiendo `platform.release.*`.

## Access Model

- `routeGroups`: no aplica.
- `views` / `authorizedViews`: no aplica.
- `entitlements`: no aplica; endpoint server-to-server firmado.
- `startup policy`: no aplica.
- Decisión: auth por `X-Hub-Signature-256` + secret `GITHUB_RELEASE_WEBHOOK_SECRET`; ningún usuario/session.

## Skills

- `greenhouse-agent`: rutas Next/App Router, helpers shared Greenhouse, tests.
- `software-architect-2026`: decisiones de contrato, blast radius, ADR/deltas y seguridad.

## Subagent Strategy

Sequential. Ruta, storage, reconciler, signal y docs comparten contrato y no conviene repartir ownership.

## Execution Order

1. Crear migración con `pnpm migrate:create task-857-github-release-webhooks`.
2. Agregar tabla normalizada `greenhouse_sync.github_release_webhook_events` + seed endpoint `github-release-events`.
3. Implementar firma GitHub HMAC y normalización allowlisted.
4. Implementar ingestion persist-first sobre `webhook_inbox_events` + ledger normalizado.
5. Implementar reconciler contra `release_manifests`, con transición solo si la state machine permite.
6. Agregar endpoint `POST /api/webhooks/github/release-events`.
7. Agregar reliability signal de unmatched/failed events y wire-up en `productionRelease`.
8. Agregar tests focales.
9. Actualizar arquitectura, runbook, changelog y handoff.

## Files To Create

- `src/app/api/webhooks/github/release-events/route.ts`
- `src/lib/release/github-webhook-signature.ts`
- `src/lib/release/github-webhook-ingestion.ts`
- `src/lib/release/github-webhook-reconciler.ts`
- `src/lib/release/github-webhook-ingestion.test.ts`
- `src/lib/release/github-webhook-reconciler.test.ts`
- `src/lib/reliability/queries/release-github-webhook-unmatched.ts`
- `migrations/*_task-857-github-release-webhooks.sql`

## Files To Modify

- `src/lib/webhooks/store.ts` — retorno real de duplicate inbox id si aplica.
- `src/lib/sync/event-catalog.ts` — solo si finalmente se decide evento outbox nuevo; plan V1 es no tocar.
- `src/lib/reliability/get-reliability-overview.ts` + `registry.ts` — signal nuevo.
- `src/types/db.d.ts` + `docs/architecture/schema-snapshot-baseline.sql` — si se regenera schema.
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `Handoff.md`
- `changelog.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

## Risk Flags

- Endpoint público nuevo: no persistir trusted payload antes de verificar HMAC.
- Dedupe: `X-GitHub-Delivery` debe ser idempotency key primaria.
- State transitions: nunca mover release si no hay match verificable o transición permitida.
- Secret/config externa: `GITHUB_RELEASE_WEBHOOK_SECRET` debe configurarse en Vercel/GitHub después del deploy.

## Open Questions

- Ninguna bloqueante. Decisiones resueltas en el audit impreso antes del plan.
