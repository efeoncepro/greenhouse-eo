# TASK-549 — Product Catalog Policy Enforcement & Legacy Cleanup (Fase E)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-548`
- Branch: `task/TASK-549-product-catalog-policy-enforcement-cleanup`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase E del programa TASK-544. Deprecacion del inbound auto-adopt (HubSpot products ya no se crean automaticamente en `product_catalog`; solo se detectan como orphans). Remocion de feature flags (`GREENHOUSE_PRODUCT_CATALOG_UNIFIED`, `..._ROLES`, `..._TOOLS`, `..._OVERHEADS`, `..._SERVICES`). Remocion del valor enum `sync_direction='hubspot_only'`. Cleanup de codigo legacy (`create-hubspot-product.ts` single-purpose). Doc funcional publicada. Cierra el programa.

## Why This Task Exists

Tras ≥4 semanas de validacion en production de las Fases A-D, mantener flags + branches legacy + inbound auto-adopt es deuda y fuente de bugs sutiles. Esta fase estabiliza el contrato y marca el programa como "cerrado y en regimen".

## Goal

- Remover feature flags del programa.
- Deprecar inbound auto-adopt: `sync-hubspot-products.ts` sigue corriendo para drift detection pero NO crea rows nuevas en `product_catalog`.
- Remover `sync_direction='hubspot_only'` como valor enum permitido (migrate existing rows a `greenhouse_only` o `bidirectional`).
- Cleanup: `create-hubspot-product.ts` reemplazado por `push-product-to-hubspot.ts` (TASK-547).
- Runbook operacional finalizado.
- Doc funcional en `docs/documentation/`.
- TASK-474 (Quote Builder Catalog Reconnection) desbloqueada explicitamente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — §11, §12 Fase E
- Rest del spec como baseline

Reglas obligatorias:

- No remover flags antes de ≥4 semanas de validacion con traffic real en production.
- Consumers externos del `create-hubspot-product.ts` (si los hay) migran antes.
- Rows con `sync_direction='hubspot_only'` se migran antes del enum drop.
- Tests legacy obsoletos se remueven.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`

## Dependencies & Impact

### Depends on

- TASK-545 a TASK-548 completadas y validadas en production ≥4 semanas
- No ISSUE-### open contra Fases A-D
- Consumers legacy migrados

### Blocks / Impacts

- Reduccion de superficie de codigo
- TASK-474 desbloqueada
- Simplificacion de onboarding del equipo

### Files owned

- `src/lib/flags/greenhouse-flags.ts` (remocion de 5 flags)
- `src/lib/hubspot/sync-hubspot-products.ts` (modificacion: no auto-adopt)
- `src/lib/hubspot/create-hubspot-product.ts` (remocion o wrapper)
- `migrations/YYYYMMDDHHMMSS_task-549-drop-hubspot-only-sync-direction.sql`
- Tests legacy
- `docs/documentation/admin-center/product-catalog-sync.md` (sin menciones a flag)
- `docs/operations/product-catalog-sync-runbook.md` (finalizado)

## Current Repo State

### Already exists

- 5 flags operativos en staging + production
- Inbound sync `sync-hubspot-products.ts` con auto-adopt activo
- `create-hubspot-product.ts` reemplazable
- Rows con `sync_direction='hubspot_only'` posiblemente (legacy TASK-345)

### Gap

- Flags no removidos.
- Inbound auto-adopt activo.
- Enum `hubspot_only` sigue valido.
- `create-hubspot-product.ts` no deprecado explicitamente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit + migrate legacy rows

- Grep por `sync_direction='hubspot_only'`: cuantas rows, cuales.
- Script migrate: decidir caso a caso (probablemente → `greenhouse_only` tras audit).
- Migrate antes de enum drop.

### Slice 2 — Remove flags

- Eliminar las 5 flags del registry.
- Limpiar Vercel env vars.
- Documentar en changelog.

### Slice 3 — Deprecate inbound auto-adopt

- Modify `sync-hubspot-products.ts`: fetch sigue, cross-check sigue, pero NO inserta en `product_catalog` automaticamente. En su lugar, registra orphan en `product_sync_conflicts` para Admin resolution.
- Alternativa: borrar el sync inbound automatico y dejar solo el `GET /products/reconcile` que usa TASK-548. Decidir en Discovery.

### Slice 4 — Cleanup legacy code

- `create-hubspot-product.ts` → reemplazar imports por `push-product-to-hubspot.ts`.
- Si queda huerfano, eliminar.
- Tests legacy removidos.

### Slice 5 — Drop enum value

- Migrate removiendo `'hubspot_only'` del check constraint.

### Slice 6 — Docs finalizadas

- Runbook completo con casos reales observados.
- Doc funcional sin menciones a flag.

### Slice 7 — Desbloquear TASK-474

- Marcar TASK-474 como no-mas-bloqueada; agregar delta en su archivo.

## Out of Scope

- Refactor adicional del catalog.
- Cambios de governance de roles/tools/overheads.
- Remocion de capabilities (mantener hasta que Admin Center las gestione formalmente).

## Detailed Spec

Lightweight — scope suficiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] 5 flags removidas; grep retorna 0 hits.
- [ ] Inbound sync no crea rows nuevas en `product_catalog` automaticamente.
- [ ] Legacy rows con `hubspot_only` migradas.
- [ ] Enum check constraint sin `hubspot_only`.
- [ ] `create-hubspot-product.ts` removido o convertido en wrapper con deprecation warning.
- [ ] Runbook y doc funcional publicados.
- [ ] TASK-474 delta agrega fecha de desbloqueo.
- [ ] Staging + production verdes 48h post-deploy.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke test staging tras deploy
- Monitoreo Sentry 48h

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado con "Product Catalog Sync program closed"
- [ ] Chequeo de impacto cruzado (TASK-474)

- [ ] Update TASK-544 umbrella a `complete`
- [ ] 7 open questions del spec con respuesta documentada (o task follow-up)

## Follow-ups

- Bundle products HubSpot (open question #6) si aparece demanda.
- Multi-portal HubSpot disambiguation (open question compartida con TASK-534).
