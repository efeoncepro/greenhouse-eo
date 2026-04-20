# TASK-548 — Product Catalog Drift Detection & Admin Center (Fase D)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-547`
- Branch: `task/TASK-548-product-catalog-drift-detection-admin`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase D del programa TASK-544. Cron nocturno reconciler que compara `product_catalog` vs HubSpot Products, detecta drift (orphan HubSpot, orphan Greenhouse, field drift, SKU collision, archive mismatch), inserta rows en `product_sync_conflicts` y aplica auto-heal donde es seguro. Admin Center surface `/admin/commercial/product-sync-conflicts` con resolution UI. Alertas Slack ops cuando > N conflicts sin resolver.

## Why This Task Exists

Sin drift detection, el catalogo HubSpot drifta silenciosamente: orphans creados manualmente, edits que reescriben fields owned por Greenhouse, products archivados en un lado pero no en el otro. Sin surface de resolution, los conflicts acumulan deuda. Esta fase es el closing loop operacional.

## Goal

- Cron nocturno `ops-worker /product-catalog/drift-detect` (03:00 America/Santiago, despues de party-lifecycle sweep).
- Logic reconciler completo segun spec §10.
- Auto-heal seguro para `orphan_in_greenhouse` y `field_drift` con Greenhouse win.
- Admin Center vista list + detail + resolution actions.
- Alertas Slack: >10 conflicts en 24h, >3 SKU collisions any time.
- Runbook operacional `docs/operations/product-catalog-sync-runbook.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — §10, §11
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`

Reglas obligatorias:

- Admin-only: capability `commercial.product_catalog.resolve_conflict`.
- Toda resolution pasa por comandos auditables; no direct DB writes.
- Auto-heal solo para casos donde Greenhouse es authoritative sin ambiguedad.
- Sweep corre en `ops-worker` Cloud Run, no en Vercel.
- Usar skills `greenhouse-ux` + `greenhouse-ui-review` pre-commit.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`

## Dependencies & Impact

### Depends on

- TASK-545 cerrada (tabla `product_sync_conflicts`)
- TASK-547 cerrada (Cloud Run `GET /products/reconcile`)
- Admin Center infrastructure
- `ops-worker` Cloud Run service

### Blocks / Impacts

- TASK-549 Fase E — policy enforcement usa auto-heal como parte de cleanup
- UX Ops — permite detectar y resolver drift sin devops manual

### Files owned

- `services/ops-worker/product-catalog-drift-detect.ts`
- `src/lib/commercial/product-catalog/drift-reconciler.ts`
- `src/lib/commercial/product-catalog/conflict-resolution-commands.ts`
- `src/app/(admin)/admin/commercial/product-sync-conflicts/page.tsx`
- `src/app/(admin)/admin/commercial/product-sync-conflicts/[id]/page.tsx`
- `src/views/greenhouse/admin/ProductSyncConflictsListView.tsx`
- `src/views/greenhouse/admin/ProductSyncConflictDetailView.tsx`
- `src/app/api/admin/commercial/product-sync-conflicts/**/route.ts`
- `docs/operations/product-catalog-sync-runbook.md`
- `docs/documentation/admin-center/product-catalog-sync.md`

## Current Repo State

### Already exists

- Admin Center routing + list/detail patterns
- `ops-worker` Cloud Run
- Pattern de sync conflicts de TASK-540 (partial reference)

### Gap

- Drift reconciler no existe.
- `/product-catalog/drift-detect` endpoint no existe en ops-worker.
- Admin Center no tiene vista de conflicts.
- Commands de resolution no existen.
- Runbook no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reconciler logic

- `drift-reconciler.ts` con funciones puras: `detectOrphansHubSpot`, `detectOrphansGreenhouse`, `detectFieldDrift`, `detectSkuCollisions`, `detectArchiveMismatches`.
- Fetch HubSpot snapshot via Cloud Run `GET /products/reconcile`.
- Cross-join con `product_catalog` local.
- Tests unitarios exhaustivos con fixtures.

### Slice 2 — Auto-heal

- `orphan_in_greenhouse` → re-trigger outbound (re-emit event).
- `field_drift` con Greenhouse win → re-push via `pushProductToHubSpot`.
- `archive_mismatch` (Greenhouse archived, HubSpot activo) → push archive.
- NO auto-heal para `orphan_in_hubspot`, `sku_collision`: manual obligatorio.

### Slice 3 — ops-worker endpoint + cron

- `services/ops-worker/product-catalog-drift-detect.ts`.
- Cloud Scheduler job `product-catalog-drift-detect` con schedule `0 4 * * *` America/Santiago.
- Registrar en `source_sync_pipelines` + `source_sync_runs`.

### Slice 4 — Commands de resolution

- `adoptOrphanHubSpotProduct(hubspotProductId, sourceKind?, actor)` — crea row en `product_catalog` con `source_kind='hubspot_imported'` o materializa en source catalog si se decide.
- `archiveOrphanInHubSpot(hubspotProductId, actor, reason)` — push archive.
- `acceptHubSpotFieldValue(conflictId, field, actor, reason)` — override field authority para este caso.
- `ignoreConflict(conflictId, actor, reason)` — mark as resolved without action.
- Todas con capability check + audit.

### Slice 5 — Admin Center vistas

- List `/admin/commercial/product-sync-conflicts` — filterable por type, age, resolution_status.
- Detail `/admin/commercial/product-sync-conflicts/[id]` — diff viewer + action buttons.
- Pattern de resolution UI segun spec §10.2.

### Slice 6 — Alertas + observability

- Counts en Admin > Ops Health.
- Slack webhook para >10 unresolved o >3 SKU collisions.

### Slice 7 — Runbook + doc funcional

- Runbook con: diagnostico, replay, rollback, escalation.
- Doc funcional: "Como Greenhouse mantiene coherencia con HubSpot Products".

## Out of Scope

- Policy enforcement strict (TASK-549).
- Inbound deprecation (TASK-549).
- Orphan adoption heuristicos automaticos (solo admin manual por ahora).

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` §10.

### Drift detection heuristica

```typescript
const hubspotSnapshot = await cloudRun.reconcileProducts();
const localProducts = await listAllProductsIncludingArchived();

// Orphan HubSpot: no gh_product_code o gh_product_code no matchea local
const orphansHubSpot = hubspotSnapshot.filter(hs => 
  !hs.gh_product_code || !localProducts.find(p => p.product_code === hs.gh_product_code)
);

// Orphan Greenhouse: local active sin hubspot_product_id o no matchea HubSpot
const orphansGH = localProducts.filter(p => 
  !p.is_archived && (!p.hubspot_product_id || !hubspotSnapshot.find(hs => hs.id === p.hubspot_product_id))
);

// Field drift
const fieldDrifts = localProducts.flatMap(p => {
  const hs = hubspotSnapshot.find(h => h.id === p.hubspot_product_id);
  if (!hs) return [];
  return diffOwnedFields(p, hs); // returns list of conflicting fields
});

// SKU collision
const skuCollisions = groupBy(localProducts, 'product_code').filter(g => g.length > 1);
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cron corre a las 03:00 America/Santiago y registra en `source_sync_runs`.
- [ ] Detecta 5 tipos de conflict correctamente con fixtures de test.
- [ ] Auto-heal funciona para `orphan_in_greenhouse`, `field_drift` GH win, `archive_mismatch`.
- [ ] Auto-heal NO toca `orphan_in_hubspot` ni `sku_collision`.
- [ ] Admin Center muestra lista filtrable + detail con diff.
- [ ] Resolution actions con capability check; sin capability → 403.
- [ ] Slack alert dispara para umbrales definidos.
- [ ] Runbook publicado y referenciado.
- [ ] Skill `greenhouse-ui-review` aprobo.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Staging: forzar drift (edit manual en HubSpot) → validar detection + auto-heal
- Test alertas con threshold bajo

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-544 umbrella
- [ ] Runbook difundido a Ops

## Follow-ups

- Heuristicas automaticas de adoption para orphans si patron emerge.
- Dashboard de funnel de conflicts (created → resolved) si hay demanda.
