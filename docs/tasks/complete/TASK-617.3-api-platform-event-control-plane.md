# TASK-617.3 — API Platform Event Control Plane

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementada 2026-04-26`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-617.1`
- Branch: `task/TASK-617.3-api-platform-event-control-plane`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Converger el runtime ya existente de `webhooks / event delivery` dentro de la `API platform` mediante un control plane explícito y resource-oriented en `api/platform/*`. La task no rehace el transport layer ni reemplaza `src/lib/webhooks/**`; construye la surface canónica para subscriptions, deliveries, retries y observabilidad.

## Why This Task Exists

Greenhouse ya tiene un webhook runtime serio:

- inbound gateway
- outbound dispatcher
- subscriptions
- deliveries
- attempts
- dead-letter semantics

El gap ya no es “tener webhooks”, sino:

- que sigan fuera de la disciplina de `api/platform/*`
- que no exista todavía un control plane ecosystem-facing canónico
- que la observabilidad y el contrato de evento todavía no converjan con la plataforma nueva

Sin esta task, Greenhouse seguirá con dos historias separadas:

- una REST platform
- un webhook runtime aparte

La arquitectura nueva ya dejó claro que eso no es el objetivo final.

## Goal

- Exponer el control plane de eventos como parte oficial de la `API platform`.
- Tratar `subscriptions`, `deliveries` y `retries` como resources y commands canónicos.
- Mantener el transport layer existente, pero desacoplarlo del contrato ecosystem-facing.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Esta task no reescribe el transport inbound/outbound ya materializado en `src/lib/webhooks/**`.
- El transport raw puede seguir viviendo en `/api/webhooks/*`; el control plane nuevo debe vivir en `api/platform/*`.
- Ningún consumer externo debe integrarse directamente contra tablas `greenhouse_sync.*`.
- El event control plane debe reutilizar el runtime existente y exponer resources/commands claros encima.

## Normative Docs

- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/documentation/operations/ops-worker-reactive-crons.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-617.1-api-platform-rest-hardening.md`
- `src/lib/webhooks/**`
- `src/app/api/webhooks/**`
- `src/app/api/internal/webhooks/**`
- `src/app/api/cron/webhook-dispatch/**`
- `src/lib/api-platform/**`

### Blocks / Impacts

- developer docs públicas para event delivery
- futuras integrations ecosystem-facing más maduras
- operator surfaces sobre deliveries/retries
- `MCP` si más adelante expone tools sobre event delivery

### Files owned

- `src/lib/api-platform/**`
- `src/app/api/platform/ecosystem/**`
- `src/lib/webhooks/**`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`

## Current Repo State

### Already exists

- `src/lib/webhooks/inbound.ts`
- `src/lib/webhooks/outbound.ts`
- `src/lib/webhooks/dispatcher.ts`
- `src/lib/webhooks/store.ts`
- `src/app/api/webhooks/[endpointKey]/route.ts`
- `src/app/api/internal/webhooks/inbox/route.ts`
- `src/app/api/internal/webhooks/deliveries/route.ts`
- `src/app/api/cron/webhook-dispatch/route.ts`

### Gap

- no existe un control plane `api/platform/*` para `webhook-subscriptions`
- no existe una surface canónica para `webhook-deliveries` y retry/replay controlado
- el contrato ecosystem-facing todavía no converge con envelope, versionado y seguridad de la platform API
- `greenhouse_sync.webhook_subscriptions` existe como tabla de transport runtime global, pero todavía no modela ownership ecosystem-facing (`sister_platform_consumer_id`, binding/scope Greenhouse). El control plane V1 debe agregar esa metadata antes de exponer create/update/list a consumers externos.
- `webhook-delivery-attempts` sí entra en V1 como detalle read-only dentro de `webhook-deliveries/:id`, porque ya existe storage y es necesario para observabilidad/dead-letter.
- El transport envelope actual conserva compatibilidad con `version`; el control plane debe exponer representación normalizada con `eventVersion`, `publishedAt`, `scope` y `meta` cuando devuelva eventos/deliveries.

## Scope

### Slice 1 — Event plane resources

- Diseñar y exponer resources canónicos como:
  - `event-types`
  - `webhook-subscriptions`
  - `webhook-deliveries`
- Resolver en Discovery si `webhook-delivery-attempts` entra ya en V1 o queda como detalle follow-up.

### Slice 2 — Commands and control plane actions

- Exponer commands explícitos para create/update/retry donde el runtime actual ya lo soporte.
- Mantener idempotencia, auth, auditabilidad y tenancy safety alineadas con la platform API.
- Evitar que el transport POST raw sustituya a estos commands.

### Slice 3 — Observability and event contract convergence

- Converger envelope/event metadata, versionado y seguridad con la platform API.
- Hacer visible dead-letter/retry semantics desde el control plane.
- Reusar el runtime de observabilidad existente sin duplicar storage innecesariamente.

### Slice 4 — Docs sync

- Actualizar arquitectura y docs funcionales para que webhooks/event delivery ya no queden solo como subsistema separado.
- Dejar claro qué surfaces siguen siendo transport y cuáles ya son platform control plane.

## Out of Scope

- reemplazar `src/lib/webhooks/**`
- cambiar el modelo canónico del outbox
- construir una public API masiva de eventos
- abrir `MCP` sobre este control plane en la misma task

## Detailed Spec

La decisión clave de esta task es separar:

- `transport boundary`
- `event control plane`

El éxito no se mide por “mover webhooks a otra carpeta”, sino por lograr que:

- los consumers externos ya no dependan del transport raw ni de tablas internas
- la platform API cuente con resources y commands oficiales para el plano de eventos
- REST y event delivery dejen de evolucionar como subsistemas separados

## Acceptance Criteria

- [ ] Existen resources canónicos de event control plane en `api/platform/*`.
- [ ] Existen commands explícitos para administrar subscriptions o retries sin exponer el transport raw como integración oficial.
- [ ] La surface de eventos converge con auth, envelope, versionado y observabilidad de la platform API.
- [ ] La documentación deja explícita la separación `transport boundary` vs `event control plane`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- smoke manual o automatizado del control plane nuevo
- smoke manual o automatizado del runtime legado de webhooks para no-regresión

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` quedó alineada con el control plane final

## Follow-ups

- `TASK-617.4` — developer documentation portal
- tools MCP sobre event delivery una vez el control plane esté estabilizado
