# TASK-1223 — HubSpot Quotes status fix — production release + verificación

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial|ops`
- Blocked by: `none`
- Branch: `task/TASK-1223-hubspot-quotes-fix-production-release`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Promover a `main` (vía release control plane develop→main) el fix de status drift de TASK-1222 (el CASE de `syncCanonicalFinanceQuote` que mostraba quotes HubSpot `issued` como `draft`), ya mergeado en `develop`. La DATA ya está corregida (instancia Cloud SQL compartida dev/staging/prod), así que el outcome visible (24→64) ya está vivo en prod; esta task ship el CÓDIGO a `main` para evitar regresión futura cuando una quote re-sincronice, verifica prod y cierra TASK-1222.

## Why This Task Exists

TASK-1222 quedó `code complete (dev+staging), rollout pendiente`. Por instrucción del operador (2026-06-22), el paso a producción se difiere a una task separada. El fix del CASE vive en `develop` (commit `9d0d5d15a`) pero NO en `main`: hasta que se promueva, el app de producción corre el CASE viejo y un re-sync de cualquier quote HubSpot la volvería a marcar `draft`. La data ya está corregida en la instancia compartida; falta solo el deploy del código + verificación prod + cierre formal de TASK-1222.

## Goal

- Promover `develop→main` vía release control plane, asegurando que el fix del CASE (`quotation-canonical-store.ts`) llegue a producción.
- Verificar en la API de producción que `?source=hubspot` refleja los status correctos (issued no se muestra como draft) y que un re-sync no regresa el status.
- Cerrar TASK-1222 a `complete/` una vez verificado prod.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/operations/runbooks/production-release.md`

Reglas obligatorias:

- Invocar la skill MANDATORIA `greenhouse-production-release` antes de cualquier preflight/promoción.
- NO correr scripts de datos `--apply` contra prod salvo que se confirme que faltan (la instancia es compartida — la data A+B ya está aplicada; verificar antes de re-aplicar).
- NUNCA disparar el orquestador <8 min post-push a `main` (Vercel BUILDING race).

## Normative Docs

- `docs/tasks/in-progress/TASK-1222-hubspot-quotes-global-reconciliation.md` (la task fuente; sus Slices A+B + ISSUE-106)
- `docs/issues/open/ISSUE-106-product-catalog-hubspot-trace-check-blocks-inbound-quote-products.md`

## Dependencies & Impact

### Depends on

- TASK-1222 Slice A (fix del CASE) mergeado en `develop` (commit `9d0d5d15a`).
- Release control plane operativo (TASK-848…871).

### Blocks / Impacts

- Cierre de TASK-1222 (no puede pasar a `complete/` hasta que el fix esté en `main` + verificado prod).

### Files owned

- `Handoff.md`
- `changelog.md`
- `docs/tasks/in-progress/TASK-1222-hubspot-quotes-global-reconciliation.md` (cierre)

## Current Repo State

### Already exists

- Fix del CASE en `src/lib/finance/quotation-canonical-store.ts` (develop).
- Scripts backfill/onboarding idempotentes (`scripts/finance/backfill-quotation-status-from-finance.ts`, `scripts/hubspot/reconcile-quotes-onboard-leads.ts`).
- Data A+B aplicada en la instancia compartida (dev/staging/prod = `greenhouse-pg-dev`): 64 quotes expuestas, 31 orgs opportunity.

### Gap

- El fix del CASE no está en `main` → app de prod corre el CASE viejo (riesgo de regresión en re-sync).
- TASK-1222 sigue `in-progress` esperando verificación prod.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Promoción develop→main

- Invocar `greenhouse-production-release` + preflight.
- Promover `develop→main` vía release control plane (incluye el fix del CASE + lo demás que esté en develop).
- Esperar Vercel READY de producción.

### Slice 2 — Verificación prod + cierre TASK-1222

- Verificar API de prod: `?source=hubspot` muestra status correctos (issued ≠ draft); confirmar que la data está (debería, por instancia compartida).
- Confirmar que un re-sync (o el cron) no regresa el status a draft (el CASE arreglado corre en prod).
- Mover TASK-1222 a `complete/` + sincronizar README/registry/Handoff/changelog.

## Out of Scope

- ISSUE-106 (product_catalog CHECK) — task/issue aparte.
- Slice C (8 quotes sin asociación) — data hygiene HubSpot, follow-up.
- Webhook quote — follow-up gated.
- Re-aplicar datos en prod (ya están por instancia compartida; solo verificar).

## Detailed Spec

El fix relevante: el CASE en `syncCanonicalFinanceQuote` hace passthrough de los status canónicos (`issued/pending_approval/approval_rejected/expired/converted`) en lugar de colapsarlos a `draft`. Sin el deploy a main, un re-sync inbound de una quote HubSpot la volvería a `draft` en `commercial.quotations` (el read API lee de ahí).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (promoción) → Slice 2 (verificación + cierre). No cerrar TASK-1222 antes de verificar prod.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión de status en re-sync mientras el código no esté en main | commercial | medium | promover el fix a main; mientras tanto la data ya está corregida | quotes HubSpot issued mostradas como draft en `/finance/quotes` |
| Release control plane drift / preflight falla | release | low | seguir runbook + skill `greenhouse-production-release`; no forzar | preflight checks rojos |

### Feature flags / cutover

- Sin flag — el fix es additive (passthrough de status). Cutover = el deploy a main.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del release vía control plane (rollback a revisión previa) | <30 min | si |
| Slice 2 | N/A (solo verificación + cierre documental) | — | si |

### Production verification sequence

1. Promover develop→main vía release control plane; esperar Vercel READY.
2. Verificar API prod `?source=hubspot`: status correctos.
3. Confirmar no-regresión post re-sync.
4. Cerrar TASK-1222.

### Out-of-band coordination required

- N/A — repo + release control plane. (El upload del webhook HubSpot es de otra task.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El fix del CASE está en `main` (verificable por commit/deploy de producción).
- [ ] API de prod `?source=hubspot` muestra los status correctos (issued no aparece como draft).
- [ ] Un re-sync de una quote HubSpot issued NO la regresa a draft en prod.
- [ ] TASK-1222 movida a `complete/` con README/registry/Handoff/changelog sincronizados.

## Verification

- Release control plane preflight + promoción (skill `greenhouse-production-release`).
- Verificación de la API de producción post-deploy.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (cerrar TASK-1222)
- [ ] TASK-1222 movida a `complete/` tras verificación prod

## Follow-ups

- ISSUE-106 (product_catalog CHECK bloquea 5 quotes con productos inbound).
- Slice C de TASK-1222: 8 quotes HubSpot sin asociación → data hygiene HubSpot + señal de completeness.
- Webhook quote (intake reactivo) — código no construido; app en monorepo `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/`, account `48713323`, upload outward-facing gated.

## Open Questions

- Confirmar si el release develop→main se hace dedicado para este fix o se piggybackea en el próximo release programado (decisión operador).
