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
- Status real: `Bloqueada por activacion real`
- Rank: `TBD`
- Domain: `crm + platform`
- Blocked by: `TASK-563` + `validacion >=4 semanas en production`
- Branch: `task/TASK-549-product-catalog-policy-enforcement-cleanup`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase E del programa TASK-544. Cleanup final del carril Product Catalog Sync una vez que la activacion real ya esté validada: remover los 4 sub-flags `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}`, normalizar el contrato legacy de `sync_direction`, y decidir el retiro o resignificación de los carriles legacy `sync-hubspot-products.ts` / `create-hubspot-product.ts` que todavía operan sobre `greenhouse_finance.products`. Cierra el programa sin dejar drift entre el runtime canónico `product_catalog` y las surfaces heredadas.

## Why This Task Exists

Tras ≥4 semanas de validación en production de las Fases A-D y con `TASK-563` cerrada, mantener flags + superficies legacy + contrato histórico de `sync_direction` es deuda y fuente de bugs sutiles. Esta fase estabiliza el contrato y marca el programa como "cerrado y en régimen".

## Goal

- Remover feature flags del programa.
- Decidir el cierre del inbound legacy `sync-hubspot-products.ts`, que hoy sigue manteniendo `greenhouse_finance.products` y el bridge legacy hacia el canon comercial.
- Remover `sync_direction='hubspot_only'` como valor enum permitido (migrate existing rows a `greenhouse_only` o `bidirectional`).
- Cleanup: `create-hubspot-product.ts` reemplazado, deprecado o explicitamente preservado como surface legacy documentada.
- Runbook operacional finalizado.
- Doc funcional en `docs/documentation/`.
- Cerrar la umbrella `TASK-544` sin supuestos/documentación rotos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — §11, §12 Fase E
- Rest del spec como baseline

Reglas obligatorias:

- No remover flags antes de ≥4 semanas de validacion con traffic real en production.
- `TASK-563` debe estar cerrada antes: endpoints externos deployados, custom properties aplicadas, E2E staging y activacion real.
- Consumers externos del `create-hubspot-product.ts` (si los hay) migran antes.
- Rows con `sync_direction='hubspot_only'` se migran antes del enum drop.
- Tests legacy obsoletos se remueven.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`

## Dependencies & Impact

### Depends on

- TASK-545 a TASK-548 completadas
- `TASK-563` cerrada
- Validación real en production ≥4 semanas
- No ISSUE-### open contra Fases A-D
- Consumers legacy migrados

### Blocks / Impacts

- Reduccion de superficie de codigo
- Simplificacion de onboarding del equipo
- Cierre honesto del programa TASK-544

### Files owned

- `src/lib/commercial/product-catalog/flags.ts`
- `src/lib/sync/projections/source-to-product-catalog.ts`
- `src/lib/hubspot/sync-hubspot-products.ts`
- `src/lib/hubspot/create-hubspot-product.ts` (remocion o wrapper)
- `migrations/YYYYMMDDHHMMSS_task-549-drop-hubspot-only-sync-direction.sql`
- Tests legacy
- `docs/documentation/finance/catalogo-productos-sincronizacion.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`

## Current Repo State

### Already exists

- 4 sub-flags operativos (`GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}`)
- Carril canónico `product_catalog` ya materializado y bridge outbound/drift/admin ya cerrados
- Cron legacy `sync-hubspot-products.ts` todavía activo sobre `greenhouse_finance.products`
- `create-hubspot-product.ts` todavía expuesto por `POST /api/finance/products/hubspot`
- Rows con `sync_direction='hubspot_only'` posiblemente (legacy TASK-345)
- `TASK-474` ya está cerrada en `docs/tasks/complete/TASK-474-quote-builder-catalog-reconnection-pass.md`

### Gap

- Flags no removidos.
- Carriles legacy de products todavía activos y no documentados como deprecados/canonizados.
- Enum `hubspot_only` sigue valido.
- `create-hubspot-product.ts` no deprecado explicitamente.
- La documentación todavía mezcla cleanup interno de Fase E con follow-ups externos que hoy viven en `TASK-563`.

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

- Eliminar las 4 sub-flags del rollout.
- Limpiar Vercel env vars.
- Documentar en changelog.

### Slice 3 — Resolver carril inbound legacy

- Decidir si `sync-hubspot-products.ts` se retira, se reduce a compatibilidad explícita para `greenhouse_finance.products`, o se reemplaza por un contrato read-only/documentado.
- No asumir ya un “auto-adopt” directo sobre `product_catalog`: el runtime actual de conflictos/adopción manual vive en `product_sync_conflicts` + `conflict-resolution-commands.ts`.

### Slice 4 — Cleanup legacy code

- `create-hubspot-product.ts` → reemplazar imports por `push-product-to-hubspot.ts`.
- Si queda huerfano, eliminar.
- Tests legacy removidos.

### Slice 5 — Drop enum value

- Migrate removiendo `'hubspot_only'` del check constraint.

### Slice 6 — Docs finalizadas

- Runbook completo con casos reales observados.
- Doc funcional sin menciones a flag.

### Slice 7 — Corregir referencias obsoletas

- Eliminado del scope: `TASK-474` ya está cerrada; solo corregir cualquier referencia obsoleta.

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

- [ ] Los 4 sub-flags removidos; grep retorna 0 hits funcionales del rollout.
- [ ] El carril legacy `sync-hubspot-products.ts` queda retirado o documentado explícitamente como compatibilidad.
- [ ] Legacy rows con `hubspot_only` migradas.
- [ ] Enum check constraint sin `hubspot_only`.
- [ ] `create-hubspot-product.ts` removido o convertido en wrapper con deprecation warning.
- [ ] Runbook y doc funcional publicados.
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
- [ ] Chequeo de impacto cruzado (`TASK-563`, rutas legacy de products)

- [ ] Update TASK-544 umbrella a `complete`
- [ ] 7 open questions del spec con respuesta documentada (o task follow-up)

## Follow-ups

- Bundle products HubSpot (open question #6) si aparece demanda.
- Multi-portal HubSpot disambiguation (open question compartida con TASK-534).
