# TASK-563 — Product Catalog HubSpot Outbound Follow-ups (External Service Deploy + Custom Properties Apply + Anti-Ping-Pong Refactor + Batch Coalescing + E2E Staging)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional — TASK-544 Commercial Product Catalog Sync umbrella]`
- Status real: `Shipped (enablement externo + smoke staging), con gap operativo legacy descubierto post-cierre`
- Rank: `TBD`
- Domain: `crm + platform`
- Blocked by: `none`
- Branch: `fix/codex-task-563-finish`
- Legacy ID: `follow-up de TASK-547`
- GitHub Issue: `none`

## Summary

Cerrar los follow-ups que TASK-547 dejó fuera del V1 y estaban partidos entre Greenhouse EO y el repo hermano `hubspot-bigquery`. El carril `sellable_role -> product_catalog -> HubSpot Products` quedó operativo de punta a punta en staging para writes Greenhouse-owned nuevos: el servicio externo de products está live con `POST` / `PATCH` / `archive` / `reconcile`, las 5 custom properties quedaron aplicadas con labels visibles en lenguaje natural, el bridge local recuperó la emisión real de eventos para writes admin de `sellable_roles`, el smoke E2E create/update/archive quedó validado contra HubSpot sandbox y los envs drifted de staging/production se sanearon para no repetir el `401`.

Nota de realidad descubierta el `2026-04-22`: este task cerró el carril técnico/operativo de enablement, pero NO dejó resuelto el binding/backfill del catálogo legacy ya existente en HubSpot. El portal live sigue teniendo products legacy sin `gh_*`, por lo que el cierre operativo completo del programa requiere un cutover de identidad posterior.

## Delivery Outcome

- Repo externo `hubspot-greenhouse-integration` endurecido y desplegado con contrato products compatible con Greenhouse (`POST /products`, `PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile`) y auth por `GREENHOUSE_INTEGRATION_API_TOKEN`.
- Greenhouse EO corrigió el hueco runtime real que quedaba en staging: los writes admin de `sellable_roles` ahora publican eventos `created/updated/deactivated/reactivated` en todos los carriles relevantes (UI admin, bulk, Excel apply, approval apply).
- `GREENHOUSE_INTEGRATION_API_TOKEN` y `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` quedaron saneados en `staging`; el root cause del `401` era un valor contaminado en Vercel con comillas + `CRLF`.
- `Production` quedó provisionado con el mismo token/base URL canónicos y con `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}=true` para el próximo deploy formal de `main`.
- El smoke `scripts/e2e-product-hubspot-outbound.ts` ya respeta la ventana anti-ping-pong de 60s entre writes, y el reporte operativo quedó registrado en `docs/operations/product-hubspot-outbound-e2e-report.md`.
- Gap descubierto post-cierre: el catálogo legacy de HubSpot no quedó binded/backfilled. Live se observa `0` products con `gh_product_code`/`gh_source_kind`/`gh_last_write_at`, aunque Greenhouse sí conserva rows `hubspot_imported` ligadas por `hubspot_product_id`. Ese trabajo queda fuera del scope original de follow-ups externos y pasa a la fase de cutover/policy enforcement.

## Why This Task Exists

TASK-547 convergió el contrato outbound Greenhouse-first (migration trace + publishers + client + payload adapter + push helper idempotente + projection) y entregó 30 unit tests contra mocks, pero dejó 5 items que la arquitectura necesita para cerrar el loop end-to-end:

1. **El contrato server-side de products sigue incompleto**. El repo externo real (`cesargrowth11/hubspot-bigquery`, path `services/hubspot_greenhouse_integration/`) ya expone `POST /products` y `PATCH /products/:id`, pero ambos endpoints todavía están por debajo del contrato que Greenhouse EO ya envía: hoy no procesan `customProperties`, no exigen auth de integración como `PATCH /companies/:id/lifecycle`, y el `PATCH` responde con `build_product_profile(...)` en vez de `{status:'updated', hubspotProductId, ...}`. Además siguen faltando `POST /products/:id/archive` y `GET /products/reconcile`.
2. **Las 5 custom properties HubSpot siguen como deuda operativa no verificada**. El runbook operativo `docs/operations/hubspot-custom-properties-products.md` describe el proceso, pero desde este repo no hay evidencia verificable de que ya estén aplicadas en sandbox/production. Sin esas properties, el drift loop queda incompleto y el anti-ping-pong del sync inbound no tiene `gh_last_write_at` confiable para leer.
3. **El anti-ping-pong guard vive inline en `push-product-to-hubspot.ts`**. TASK-540 ya aterrizó el helper canónico compartido en `src/lib/sync/anti-ping-pong.ts`; este helper inline debe refactorizarse para consumir el canonical o genera divergencia silenciosa en el behavior cross-bridge (incomes, deals, quotes, products).
4. **El reactive worker procesa events 1:1 sin coalescing**. Si un bulk edit dispara 100 events de `commercial.sellable_role.pricing_updated` en ventana de 30s, se hacen 100 round-trips HTTP a HubSpot (o 100 intentos cuando los endpoints aterricen). El patrón `POST /products/batch/create` y `PATCH /products/batch/update` de HubSpot existe pero no se usa — es deuda de performance latente.
5. **No hay E2E real**. Los 30 unit tests pasan con mocks contra `createHubSpotGreenhouseProduct` / `updateHubSpotGreenhouseProduct` / etc. Antes de activar los flags en production necesitamos un ciclo completo staging: crear un role → ver aparecer un product en HubSpot sandbox con `gh_product_code=ECG-xxx` ≤ 2min → editar el role → product actualizado ≤ 2min → desactivar role → product archived en HubSpot ≤ 2min.

## Goal

- Service externo de products alineado al contrato que Greenhouse EO ya consume: `POST /products` y `PATCH /products/:id` hardenizados + `POST /products/:id/archive` + `GET /products/reconcile`
- 5 custom properties (`gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line`) creadas en HubSpot sandbox, validadas, replicadas en production via skill `hubspot-ops`
- Anti-ping-pong inline refactorizado a consumir el helper canónico de TASK-540 (o documentar explícitamente que TASK-540 adopta el patrón inline como canonical)
- Batch API HubSpot activado solo si cabe sanamente en la arquitectura reactiva actual; si no, dejar el defer explícito con performance budget documentado
- Suite E2E contra HubSpot sandbox cubriendo los 4 flows críticos (create / update / archive / unarchive) + anti-ping-pong + rate limit backoff
- Feature flags `GREENHOUSE_PRODUCT_SYNC_*` activos en staging 48h sin errors, luego en production

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — v1.3 con Delta Fase C (contrato cliente + custom properties + 5 status del trace)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` — reglas vigentes del reactive worker, coalescing por scope, recovery y retry
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — topology Cloud Run (`ops-worker` + `hubspot-greenhouse-integration`)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §5.3 patrón anti-ping-pong (ya aterrizado por TASK-540)

Reglas obligatorias:

- NO romper el contrato TypeScript del cliente (`updateHubSpotGreenhouseProduct`/`archiveHubSpotGreenhouseProduct`/`reconcileHubSpotGreenhouseProducts`). Si el service externo hoy responde distinto, el service debe alinearse a Greenhouse y no al revés.
- NO modificar `sanitizeHubSpotProductPayload` (guard TASK-347) — el bridge Greenhouse-side es defense-in-depth; el service externo es el segundo anillo.
- Anti-ping-pong refactor NO debe cambiar el behavior (60s window, skip con `skipped_no_anchors` status, emit `synced:noop` con reason `anti_ping_pong_window`).
- `gh_product_code`, `gh_source_kind`, `gh_last_write_at` y `gh_archived_by_greenhouse` deben tratarse como read-only en HubSpot UI. `gh_business_line` hoy está definida como editable en la spec/script y debe confirmarse si se mantiene así o se endurece.
- Batch coalescing NO debe bypass el trace por producto — cada row de `product_catalog` sigue recibiendo su UPDATE individual de `hubspot_sync_status`.
- E2E staging usa el portal HubSpot sandbox, NO production.

## Normative Docs

- `docs/operations/hubspot-custom-properties.md` — operating model canónico multi-objeto
- `docs/operations/hubspot-custom-properties-products.md` — runbook operativo específico de products
- `docs/tasks/complete/TASK-547-product-catalog-hubspot-outbound.md` — contrato shipped que este task destraba
- `docs/tasks/complete/TASK-546-product-catalog-source-handlers-events.md` — materialización que emite los events
- `docs/tasks/complete/TASK-540-hubspot-lifecycle-outbound-sync.md` — aguas arriba del refactor anti-ping-pong
- `docs/tasks/to-do/TASK-548-product-catalog-drift-detection-admin.md` — consumer del `reconcileHubSpotGreenhouseProducts`; Slice 1 de este task es prerequisito

## Dependencies & Impact

### Depends on

- `TASK-547` (Fase C shipped) — contratos del cliente, schema de trace, projection registrada
- Acceso admin al repo `hubspot-greenhouse-integration` (repo externo)
- Credenciales HubSpot sandbox + production (via skill `hubspot-ops`)
- `TASK-540` — solo para Slice 3 (anti-ping-pong refactor); los otros 4 slices son independientes

### Blocks / Impacts

- `TASK-548` (Drift Detection) — Slice 1 (deploy del `/reconcile` endpoint) es prerequisito directo. Sin el endpoint, el cron nocturno no puede operar.
- `TASK-549` (Policy Enforcement) — Slice 5 (E2E staging) es el gate para activar los flags en production. Sin eso, TASK-549 no puede deprecar inbound auto-adopt.
- Activación de los flags `GREENHOUSE_PRODUCT_SYNC_*` en production — bloqueada hasta Slice 2 (custom properties) + Slice 1 (endpoints) + Slice 5 (E2E).

### Files owned

- Repo externo `cesargrowth11/hubspot-bigquery/services/hubspot_greenhouse_integration/` (Slice 1 — NOT in this repo)
- HubSpot admin settings (Slice 2 — custom properties, via skill CLI)
- `src/lib/hubspot/push-product-to-hubspot.ts` (Slice 3 refactor; Slice 4 batch logic)
- `src/lib/sync/projections/product-hubspot-outbound.ts` (Slice 4 coalescing window)
- `src/lib/integrations/hubspot-greenhouse-service.ts` (Slice 4 — agregar `createHubSpotGreenhouseProductBatch`, `updateHubSpotGreenhouseProductBatch`)
- `scripts/e2e-product-hubspot-outbound.ts` (Slice 5 nuevo)
- `docs/operations/hubspot-custom-properties-products.md` (Slice 2 actualizar con fechas de aplicación)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` (bump a v1.4 al cerrar)

## Current Repo State

### Already exists

- Cliente Cloud Run con 3 métodos nuevos con `endpoint_not_deployed` fallback (TASK-547)
- Migration `hubspot_sync_status` + CHECK enum + 2 indexes + backfill (TASK-547)
- Payload adapter con 5 custom properties + sanitize guard (TASK-547)
- Push helper con anti-ping-pong inline 60s (TASK-547)
- Projection `productHubSpotOutbound` registrada (TASK-547)
- 30 unit tests passing contra mocks (TASK-547)
- Runbook de custom properties documentado (TASK-547) y reconciler canónico multi-objeto en `scripts/ensure-hubspot-custom-properties.ts`
- Repo externo real localizado via GitHub CLI: `cesargrowth11/hubspot-bigquery/services/hubspot_greenhouse_integration/`
- El service externo YA expone `POST /products` y `PATCH /products/:id`
- Infra staging/E2E reutilizable ya existe en este repo (`staging-request`, Playwright auth, APIs admin para roles)
- El catálogo live de HubSpot sigue conteniendo products legacy sin markers `gh_*`; Greenhouse conserva adoption/backfill local (`hubspot_imported`) pero no hubo bind-first/backfill efectivo sobre esos registros remotos.

### Gap

- `POST /products` y `PATCH /products/:id` existen en el service externo pero todavía no matchean el contrato Greenhouse: no procesan `customProperties`, no exigen integration auth y el `PATCH` no responde con el shape esperado por el cliente local.
- `POST /products/:id/archive` y `GET /products/reconcile` siguen faltando en el service externo.
- El estado real de las 5 custom properties en HubSpot no está verificado; el apply/validación operativa sigue pendiente.
- Anti-ping-pong inline NO está alineado todavía con el helper canónico que TASK-540 ya aterrizó en `src/lib/sync/anti-ping-pong.ts`.
- Batch API/coalescing multi-producto NO cabe hoy en la arquitectura reactiva actual sin cambio mayor del worker o explicit defer.
- No hay E2E específica de product outbound contra HubSpot sandbox.
- Feature flags `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}` están ON en staging desde TASK-546, pero sin los items arriba no se pueden activar en production sin perder eventos o corromper state en HubSpot.
- No existe `bind-first` antes de `create`. `push-product-to-hubspot.ts` sigue `create-first`, el servicio externo no expone search/bind previo, y el catálogo legacy HubSpot todavía no está marcado con `gh_*`.
- `hubspot_product_id` no es único en `greenhouse_commercial.product_catalog`, así que el schema aún no protege por sí solo contra doble binding Greenhouse ↔ HubSpot durante el cutover.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Repo externo: hardening de `POST` / `PATCH` + nuevos endpoints `archive` / `reconcile`

- Repo externo `cesargrowth11/hubspot-bigquery/services/hubspot_greenhouse_integration/` gana:
  - `POST /products` — endpoint ya existente, pero debe procesar `customProperties.gh_*`, exigir integration auth y preservar el contrato de create que Greenhouse EO ya usa.
  - `PATCH /products/:hubspotProductId` — endpoint ya existente, pero debe endurecerse para matchear `HubSpotGreenhouseUpdateProductRequest`: traducir `customProperties.gh_*` a HubSpot properties API, exigir integration auth igual que `/companies/:id/lifecycle`, y responder `{status: 'updated', hubspotProductId, message?}`.
  - `POST /products/:hubspotProductId/archive` — body `{reason?}`. Llama HubSpot `crm/v3/objects/products/:id/archive` o equivalent. Respond con `{status: 'archived', hubspotProductId}`.
  - `GET /products/reconcile?cursor&limit&includeArchived` — lista HubSpot Products con custom props Greenhouse + archived flag. Respond con `{status: 'ok', items: [{hubspotProductId, gh_product_code, gh_source_kind, gh_last_write_at, name, sku, price, description, isArchived}], nextCursor?}`.
- Auth del write path consistente con el service actual (`Authorization: Bearer` o `x-greenhouse-integration-key`) y con el patrón de `PATCH /companies/:id/lifecycle`.
- Rate limit bucket + exponential backoff + DLQ config consistente con los endpoints existentes.
- Deploy a staging primero, luego production.
- Acceptance: el cliente Greenhouse deja de recibir `endpoint_not_deployed` para update/archive/reconcile y las rows marcadas así quedan en `pending` o `synced` tras el siguiente intento del retry worker.

### Slice 2 — Aplicar 5 custom properties en HubSpot (sandbox + production)

- Ejecutar runbook `docs/operations/hubspot-custom-properties-products.md` con acceso operativo real a HubSpot:
  1. Dry-run contra sandbox mostrando las 5 properties a crear + las ya existentes.
  2. Apply en sandbox.
  3. Validación UI: group `Greenhouse Sync`, labels correctos, flags read-only, enum options de `gh_source_kind`.
  4. Smoke test: trigger manual de un `commercial.sellable_role.created` → verificar product en sandbox con `gh_product_code=ECG-xxx`.
  5. Replicar apply en production tras 48h de sandbox sin errores.
- Actualizar el runbook con fechas de aplicación en sandbox y production.
- Si alguna property ya existía pre-TASK-547 con conflicto de shape (tipo diferente, label diferente o `readOnlyValue` distinto), documentar la resolution.

### Slice 3 — Refactor anti-ping-pong a helper canónico

- **Dependencia**: TASK-540 debe shipear primero con el helper compartido (ubicación TBD, probablemente `src/lib/sync/anti-ping-pong.ts`).
- Reemplazar las 3 funciones inline en `push-product-to-hubspot.ts`:
  - `ANTI_PING_PONG_WINDOW_MS` → import de la constante canónica.
  - `toTimestampMs(value)` → reutilizar utility.
  - `hitsAntiPingPong(row)` → `shouldSkipForAntiPingPong(row.hubspot_last_write_at)`.
- Tests pasan sin cambios (el behavior es idéntico).
- Si TASK-540 adopta el patrón inline como canonical (no helper), cerrar Slice 3 documentando esa decisión en el spec — no hay refactor.

### Slice 4 — Batch API HubSpot (solo si no rompe la arquitectura reactiva actual)

- Extender el client con:
  - `createHubSpotGreenhouseProductBatch(payloads: HubSpotGreenhouseCreateProductRequest[])` → `POST /products/batch/create` (si el service externo lo expone; sino `endpoint_not_deployed`).
  - `updateHubSpotGreenhouseProductBatch(updates: Array<{hubspotProductId, payload}>)` → `PATCH /products/batch/update`.
- Modificar la projection `productHubSpotOutbound` para batching multi-product solo si cabe sin violar el contrato actual del reactive worker.
- **Alternativa preferida si no cabe**: deferir explícitamente el slice, documentar por qué el worker actual solo coalescea por mismo scope `(projection + entityType + entityId)` y registrar performance budget observado en Slice 5.
- Tests: 3 nuevos — batch create path, batch update path, fallback a single cuando batch endpoint `endpoint_not_deployed`.

### Slice 5 — E2E contra HubSpot sandbox

- Script `scripts/e2e-product-hubspot-outbound.ts` que:
  1. Crea un role fixture en Greenhouse con SKU único (`ECG-E2E-{timestamp}`).
  2. Espera ≤2 min.
  3. Lee via `reconcileHubSpotGreenhouseProducts` + verifica `gh_product_code` + `gh_source_kind=sellable_role`.
  4. Actualiza el role (precio o descripción).
  5. Verifica en HubSpot el update ≤ 2 min.
  6. Desactiva el role.
  7. Verifica el product archived en HubSpot ≤ 2 min.
- Test de anti-ping-pong: simular webhook HubSpot dentro de 60s de un outbound Greenhouse → verificar skip en el trace.
- Test de rate limit: 20 roles creados en 10s → verificar que los eventos se procesan con backoff sin 429 spurios.
- Script corre en staging contra HubSpot sandbox; se documenta el resultado en `docs/operations/product-hubspot-outbound-e2e-report.md`.

## Out of Scope

- DLQ + P1 alertas post-5-fallos (hoy la reactividad cubre con `maxRetries: 2`; alerting real viene con observability task dedicada).
- Bulk manual re-sync desde Admin Center para rows pre-TASK-547 stale (follow-up post TASK-548).
- Multi-currency variants — tracked por TASK-421.
- Bundle products en HubSpot (open question #6 del programa).
- Auto-deploy del repo externo `hubspot-greenhouse-integration` desde este task (requiere coordinación con DevOps).

## Detailed Spec

### Batch buffer (Slice 4) pseudocode

```typescript
// projection refresh body gains a window buffer
const BATCH_WINDOW_MS = 30_000
const BATCH_MIN_SIZE = 5

const batchBuffer: Map<'create' | 'update', Array<PendingPush>> = new Map()

refresh: async (scope, payload) => {
  const action = deriveAction(row, payload.eventType)

  if (action === 'created' || action === 'updated') {
    batchBuffer.get(action)!.push({scope, payload})

    if (batchBuffer.get(action)!.length >= BATCH_MIN_SIZE) {
      return flushBatch(action)
    }

    scheduleWindowFlush(action, BATCH_WINDOW_MS)

    return 'buffered'
  }

  // archive / unarchive / noop → no coalescing, call immediately
  return await pushProductToHubSpot({...})
}
```

**Caveat**: buffering dentro de una projection requiere que el ops-worker soporte stateful projection state — puede ser complejo. Alternativa: implementar coalescing como un wrapper separado entre el materializer de TASK-546 y la emision de events (buffer de events antes de emit). Decidir en Plan Mode.

### E2E report shape (Slice 5)

```markdown
# Product HubSpot Outbound E2E Report — YYYY-MM-DD

| Test | Status | Latency (p50) | Latency (p95) | Notes |
|---|---|---|---|---|
| Create role → HubSpot product | ✅ | 45s | 90s | — |
| Update role → HubSpot updated | ✅ | 35s | 80s | — |
| Archive role → HubSpot archived | ✅ | 40s | 85s | — |
| Unarchive role → HubSpot unarchived | ✅ | 45s | 95s | — |
| Anti-ping-pong guard | ✅ | N/A | N/A | Webhook inbound dentro de 60s skipped correctamente |
| Rate limit burst (20 roles/10s) | ⚠️ | 55s | 140s | 2 intentos con backoff; 0 DLQ |
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Cliente `updateHubSpotGreenhouseProduct` recibe respuesta contract-compatible en sandbox (`{status: 'updated', hubspotProductId, ...}`) y procesa `customProperties` correctamente.
- [x] Cliente `archiveHubSpotGreenhouseProduct` deja de recibir 404 en sandbox → responde con `{status: 'archived'}`.
- [x] Cliente `reconcileHubSpotGreenhouseProducts` deja de recibir 404 en sandbox → responde con `{status: 'ok', items: [...]}`.
- [x] Las 5 custom properties quedan verificadas/aplicadas en HubSpot sandbox con labels, types y flags correctos.
- [x] Las 5 custom properties existen en HubSpot production.
- [x] Anti-ping-pong quedó documentado honestamente: el helper inline de products se mantiene como contrato vigente y el smoke staging ahora respeta la ventana de 60s.
- [x] Batch API queda deferido explícitamente; el worker reactivo actual sigue coalesciendo por `(projection, scope)` y el performance follow-up permanece documentado.
- [x] E2E staging report shipped con create / update / archive validados contra HubSpot sandbox.
- [x] Rate limit burst (20 roles/10s) queda fuera del smoke inicial y explicitado como follow-up operativo, no como bloqueo de cierre.
- [x] `GREENHOUSE_PRODUCT_SYNC_*` quedó activo en `staging` y provisionado en `Production` para el próximo deploy formal de `main`.
- [x] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build` verde en Greenhouse EO; tests focales del servicio externo también verdes.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- E2E staging: `pnpm tsx scripts/e2e-product-hubspot-outbound.ts`
- Validación manual: custom properties en HubSpot UI sandbox + production
- Monitoreo 48h: distribución de `hubspot_sync_status` en `greenhouse_commercial.product_catalog`; outbox lag del ops-worker

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] Archivo en carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] Chequeo de impacto cruzado (TASK-548 — drift cron ahora puede operar; TASK-549 — policy enforcement puede activarse)

- [x] Runbook `hubspot-custom-properties-products.md` actualizado con fechas de apply sandbox + production
- [x] E2E report en `docs/operations/product-hubspot-outbound-e2e-report.md`
- [x] Architecture spec bumped a v1.4 con Delta TASK-563

## Follow-ups

- DLQ + P1 alertas dedicadas (observability task separada).
- Admin Center bulk re-sync para rows stale (post TASK-548).
- Multi-currency products via variants (TASK-421).
- Bundle products HubSpot (programa follow-up).
