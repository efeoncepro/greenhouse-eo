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
- Status real: `Bloqueada por identity cutover del catálogo legacy`
- Rank: `TBD`
- Domain: `crm + platform`
- Blocked by: `validacion >=4 semanas en production` (TASK-563 completada — pending solo gate de validación operativa desde 2026-05-05)
- Branch: `task/TASK-549-product-catalog-policy-enforcement-cleanup`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase E del programa TASK-544. Cleanup final del carril Product Catalog Sync una vez que el runtime real esté validado: resolver primero el identity cutover del catálogo legacy HubSpot (bind/backfill/dedupe sin reemplazar ni duplicar), luego remover los 4 sub-flags `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}`, normalizar el contrato legacy de `sync_direction`, y decidir el retiro o resignificación de los carriles legacy `sync-hubspot-products.ts` / `create-hubspot-product.ts` que todavía operan sobre `greenhouse_finance.products`. Cierra el programa sin dejar drift entre el runtime canónico `product_catalog` y las surfaces heredadas.

## Why This Task Exists

Tras el cierre técnico de `TASK-563`, la auditoría live mostró un hueco operativo real: HubSpot conserva un catálogo legacy sin markers `gh_*`, mientras Greenhouse todavía no rematerializó de forma masiva su canon desde las fuentes. Antes de remover flags o cerrar el programa, esta fase debe hacer el cutover de identidad para conectar ambos mundos sin duplicar productos ni en HubSpot ni en Greenhouse. La política canónica es Greenhouse-first: los products existentes solo en HubSpot NO se importan a Greenhouse; solo se linkean cuando matchean exactamente a un producto Greenhouse canónico. Luego sí se estabiliza el contrato y se marca el programa como "cerrado y en régimen".

## Goal

- Remover feature flags del programa.
- Implementar `bind-first`/backfill Greenhouse → HubSpot usando `product_code`/SKU como identidad canónica.
- Resolver duplicados con survivor selection explícita y archivo semántico de duplicados HubSpot cuando corresponda.
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
- Identity cutover legacy completado y validado
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
- Auditoría 2026-04-22: HubSpot live tiene `36` products activos y `0` con `gh_product_code`/`gh_source_kind`/`gh_last_write_at`; Greenhouse local tiene `39` rows en `product_catalog`, `38` con `hubspot_product_id`, `36` `hubspot_imported`, y solo `3` rows Greenhouse-owned materializadas desde sources

### Gap

- Flags no removidos.
- No existe carril explícito de bind/backfill para el catálogo legacy ya existente en HubSpot.
- `push-product-to-hubspot.ts` sigue `create-first`; no hace `bind-first` antes de crear.
- `hubspot_product_id` no es único en `product_catalog`, así que falta una defensa explícita contra doble binding.
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

### Slice 1 — Identity cutover audit + materialization/bind-first

- Clasificar el universo actual en `bound`, `candidate_match`, `orphan_hubspot`, `orphan_greenhouse`, `duplicate_hubspot`, `duplicate_greenhouse`.
- Rematerializar el canon local desde las fuentes Greenhouse (`sellable_roles`, `tool_catalog`, `overhead_addons`, `service_pricing`) antes de empujar a HubSpot.
- Implementar `bind-first` usando `product_code` Greenhouse como identidad canónica y `sku` HubSpot como fallback exacto.
- Backfill de markers `gh_*` sobre los survivors HubSpot que correspondan a productos Greenhouse existentes.
- Registrar ambigüedades en `product_sync_conflicts`; no auto-bind por nombre fuzzy ni importar huérfanos HubSpot a Greenhouse.

### Slice 2 — Guardrails anti-duplicación

- Agregar defensa explícita para evitar doble binding por `hubspot_product_id`.
- Ajustar `push-product-to-hubspot.ts` para resolver match antes de `create`.
- Verificar impacto sobre `ops-worker` (`productHubSpotOutbound` reactivo y `/product-catalog/drift-detect` nocturno).

### Slice 3 — Audit + migrate legacy rows

- Grep por `sync_direction='hubspot_only'`: cuantas rows, cuales.
- Script migrate: decidir caso a caso (probablemente → `greenhouse_only` tras audit).
- Migrate antes de enum drop.

### Slice 4 — Remove flags

- Eliminar las 4 sub-flags del rollout.
- Limpiar Vercel env vars.
- Documentar en changelog.

### Slice 5 — Resolver carril inbound legacy

- Decidir si `sync-hubspot-products.ts` se retira, se reduce a compatibilidad explícita para `greenhouse_finance.products`, o se reemplaza por un contrato read-only/documentado.
- No asumir ya un “auto-adopt” directo sobre `product_catalog`: el runtime actual de conflictos/adopción manual vive en `product_sync_conflicts` + `conflict-resolution-commands.ts`.

### Slice 6 — Cleanup legacy code

- `create-hubspot-product.ts` → reemplazar imports por `push-product-to-hubspot.ts`.
- Si queda huerfano, eliminar.
- Tests legacy removidos.

### Slice 7 — Drop enum value

- Migrate removiendo `'hubspot_only'` del check constraint.

### Slice 8 — Docs finalizadas

- Runbook completo con casos reales observados.
- Doc funcional sin menciones a flag.

### Slice 9 — Corregir referencias obsoletas

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

- [ ] El catálogo legacy HubSpot queda binded/backfilled sin duplicados y con `gh_*` pobladas en los survivors.
- [ ] `push-product-to-hubspot.ts` resuelve `bind-first` antes de `create`.
- [ ] El `ops-worker` reactivo/nocturno sigue sano tras el cutover.
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
