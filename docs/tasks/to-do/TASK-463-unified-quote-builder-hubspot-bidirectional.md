# TASK-463 — Unified Quote Builder + Bidirectional HubSpot Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-463-unified-quote-builder-hubspot-bidirectional`
- Legacy ID: `follow-on de TASK-347 + TASK-349`
- GitHub Issue: `none`

## Summary

Unificar los dos drawers de creación de cotización (botón "HubSpot" legacy + "+ Nueva cotización" canónico) en un único flujo canónico con sync bidireccional a HubSpot. Hoy el canónico (TASK-349) crea quote local sin propagarla a HubSpot; el legacy propaga a HubSpot pero usa schema viejo. El resultado es dos mundos paralelos que no convergen.

## Why This Task Exists

En la UI `/finance/quotes` coexisten dos botones que producen estados distintos:

- **"HubSpot"** → `POST /api/finance/quotes/hubspot` → llama `createHubSpotQuote()` y persiste en `greenhouse_finance.quotes` (legacy schema)
- **"+ Nueva cotización"** → `POST /api/finance/quotes` → persiste en `greenhouse_commercial.quotations` (canónico) pero **nunca propaga a HubSpot**

El usuario tiene que decidir al crear si quiere "quote local rico con governance" o "quote que aparece en HubSpot", cuando debería ser **siempre ambos**. El deal en HubSpot debe ver la quote que se está negociando, y Greenhouse debe ser source-of-truth de toda la metadata rica (governance, versions, terms, pricing config).

## Goal

- Un único botón "+ Nueva cotización" en la UI (el botón "HubSpot" desaparece)
- `POST /api/finance/quotes` propaga automáticamente a HubSpot cuando la quote tiene `hubspot_deal_id` asociado (o lo crea si aplica)
- Updates downstream (version_created, sent, approved, rejected) sincronizan a HubSpot
- `greenhouse_finance.quotes` (legacy) queda read-only como compat view (o se deprecia)
- Eventos outbox `commercial.quotation.pushed_to_hubspot` publicados para observabilidad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Greenhouse sigue siendo source-of-truth de governance + pricing + versions + terms
- HubSpot refleja el estado comercial visible al cliente (total, line items básicos, status)
- NO re-inventar: reusar `createHubSpotQuote()` existente como outbound helper
- NO romper sync inbound: `sync-hubspot-quotes.ts` sigue trayendo quotes que nacen en HubSpot, el merger canonical los upsert normalmente

## Normative Docs

- `src/lib/hubspot/create-hubspot-quote.ts` — outbound helper existente
- `src/lib/hubspot/sync-hubspot-quotes.ts` — inbound sync
- `src/lib/commercial/quotation-events.ts` — publishers canónicos

## Dependencies & Impact

### Depends on

- Infra HubSpot integration service activa (`HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`)
- TASK-349 (quote workspace UI) ya shipped

### Blocks / Impacts

- Deprecación de `CreateQuoteDrawer` legacy (usado solo por botón "HubSpot")
- Deprecación de endpoint `/api/finance/quotes/hubspot`
- Deprecación gradual de `greenhouse_finance.quotes` (o promoción a view)

### Files owned

- `src/views/greenhouse/finance/QuotesListView.tsx` — eliminar botón "HubSpot" + `CreateQuoteDrawer` legacy
- `src/app/api/finance/quotes/route.ts` — extender POST con outbound sync
- `src/app/api/finance/quotes/[id]/send/route.ts` — propagar send a HubSpot
- `src/app/api/finance/quotes/[id]/approve/route.ts` — propagar approval a HubSpot
- `src/app/api/finance/quotes/[id]/versions/route.ts` — propagar version_created (optional: actualizar total)
- `src/lib/hubspot/push-canonical-quote.ts` (nuevo) — wrapper sobre `createHubSpotQuote` adaptado al schema canónico
- `src/lib/hubspot/update-hubspot-quote.ts` (nuevo) — updates downstream
- Deprecar: `src/app/api/finance/quotes/hubspot/route.ts`, `CreateQuoteDrawer` legacy component

## Current Repo State

### Already exists

- `createHubSpotQuote()` en `src/lib/hubspot/create-hubspot-quote.ts` — helper outbound operativo
- `syncCanonicalFinanceQuote()` — mantiene el schema canónico alineado con legacy durante cutover
- `publishQuoteCreated()` en canonical quotation-events

### Gap

- `POST /api/finance/quotes` canónico NO llama a `createHubSpotQuote()`
- Updates (version, send, approve) canónicos NO propagan a HubSpot
- UI tiene dos entry points que confunden al usuario

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## UI Plan

Esta task implementa UI descrita en **[TASK-469](TASK-469-commercial-pricing-ui-interface-plan.md)**. Consumir en lugar de re-especificar:

- **Surface A — Quote Builder**: layout 9/3, reusa `full-version/src/views/apps/invoice/add/AddCard.tsx` + `AddActions.tsx` + `AddCustomerDrawer.tsx`, adaptados a `src/components/greenhouse/pricing/QuoteBuilderCard.tsx` + `QuoteBuilderActions.tsx` + `SpaceDealPickerDrawer.tsx`
- **Surface E — Quote Preview**: reusa `full-version/src/views/apps/invoice/preview/PreviewCard.tsx` + `PreviewActions.tsx` + `print.css` → `QuotePreviewCard.tsx` / `QuotePreviewActions.tsx`
- **Surface F — Send Drawer**: reusa `full-version/src/views/apps/invoice/shared/SendInvoiceDrawer.tsx` → `SendQuoteDrawer.tsx` con `react-hook-form`
- **Surface G — Quote List**: reusa `InvoiceListTable.tsx` + `InvoiceCard.tsx` → `QuoteListTable.tsx` + `QuoteListStats.tsx`
- **Copy**: extraer de `GH_PRICING` bloque (TASK-469 §4) en `src/config/greenhouse-nomenclature.ts`
- **A11y floor**: 13-row checklist modern-ui (TASK-469 §5)

## Scope

### Slice 1 — Outbound sync wrapper

- `push-canonical-quote.ts`:
  - Input: quotationId canonical
  - Lee quote + line items canónicos + client
  - Llama `createHubSpotQuote()` con payload adaptado al schema legacy esperado
  - Persiste `hubspot_quote_id` de retorno en `greenhouse_commercial.quotations`
  - Publica `commercial.quotation.pushed_to_hubspot` con `quotationId`, `hubspotQuoteId`, `hubspotDealId`, direction='outbound', result='created|updated|skipped'
- Si la quote ya tiene `hubspot_quote_id`: usa `update-hubspot-quote.ts` (updates) en lugar de create

### Slice 2 — Extender POST /api/finance/quotes

- Después de persistir canónico local, invocar `pushCanonicalQuoteToHubSpot({ quotationId })` de forma async (don't block response)
- Si falla outbound, se registra en outbox como retry pendiente — NO falla la creación local
- Observabilidad: evento con `result='failed'` + retry reactivo via ops-worker
- Flag opcional en body: `skipHubSpotPush: boolean` (para tests o casos especiales)

### Slice 3 — Propagar lifecycle events

- `send/route.ts` → después de transitar draft→sent, push actualización a HubSpot con nuevo status
- `approve/route.ts` → después de approval, push approved status + actualización de total (si cambió)
- `versions/route.ts` → al crear nueva versión, push nuevos line items y total al quote HubSpot existente (NO crea quote nueva en HubSpot)
- Todos los publisher wrappers en `update-hubspot-quote.ts`

### Slice 4 — UI unificación

- Eliminar botón "HubSpot" de `QuotesListView.tsx`
- Eliminar import + render de `CreateQuoteDrawer` legacy
- Dejar solo botón "+ Nueva cotización" con `QuoteCreateDrawer` canónico
- Smoke test: crear quote nueva → aparece en HubSpot + en portal dentro de 1 min
- Smoke test: editar quote existente en portal → updates reflejados en HubSpot

### Slice 5 — Deprecación controlada del endpoint legacy

- `/api/finance/quotes/hubspot` route: retorna 410 Gone con mensaje "Deprecated, use POST /api/finance/quotes"
- Redirect si hay clientes legacy llamando este endpoint (telemetría 1 semana antes de retirarlo definitivamente)

## Out of Scope

- Outbound de HubSpot properties custom (ownership, deal stage, etc.) — solo core quote fields
- E-signing integration via HubSpot (deja DocuSign/HelloSign)
- Real-time sync via webhook subscriptions — keep polling cron for inbound; outbound on-demand
- Migration completa de `greenhouse_finance.quotes` legacy a canonical view — se evaluará después

## Detailed Spec

### Flow diagram

```
User → [+ Nueva cotización] → QuoteCreateDrawer canónico
  ↓
POST /api/finance/quotes (con hubspot_deal_id en body)
  ↓ (sync local)
  Persiste en greenhouse_commercial.quotations + line_items
  ↓ (async, outbox)
  Publica commercial.quotation.created
  ↓ (reactive consumer nuevo)
  pushCanonicalQuoteToHubSpot({ quotationId })
    → createHubSpotQuote() con payload adaptado
    → Persiste hubspot_quote_id en canonical
    → Publica commercial.quotation.pushed_to_hubspot
```

### Event catalog additions

```typescript
quotationPushedToHubSpot: 'commercial.quotation.pushed_to_hubspot',
quotationHubSpotSyncFailed: 'commercial.quotation.hubspot_sync_failed',
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Solo un botón "+ Nueva cotización" visible en `/finance/quotes`
- [ ] Botón "HubSpot" eliminado del código
- [ ] `POST /api/finance/quotes` con `hubspot_deal_id` → genera quote en HubSpot en ≤30s
- [ ] Version nueva de quote → se refleja en la misma quote HubSpot (no crea nueva)
- [ ] Send → quote HubSpot se marca sent
- [ ] Approve → quote HubSpot se marca approved
- [ ] Failure del outbound no rompe creación canónica; retry via outbox
- [ ] Endpoint legacy `/api/finance/quotes/hubspot` retorna 410
- [ ] Eventos `commercial.quotation.pushed_to_hubspot` aparecen en outbox

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Smoke manual en staging: crear quote desde UI → verificar en HubSpot
- Smoke manual: editar quote existente → verificar update en HubSpot

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con "botón HubSpot deprecado, flujo unificado vivo"
- [ ] Chequeo impacto cruzado con TASK-453 (deal canonical amplía el sync)
- [ ] Actualizar `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

## Follow-ups

- Webhook subscription de HubSpot quote.propertyChange para sync casi-real-time inbound
- Deprecar `greenhouse_finance.quotes` legacy completo (convertir a view o droppear después de ventana de coexistencia)

## Open Questions

- ¿Si una quote canónica no tiene `hubspot_deal_id` (ej. Nubox-sourced o quote a lead sin deal todavía) — se crea quote HubSpot orphan o se salta? Propuesta: skip outbound hasta que tenga deal asociado, flag `pending_hubspot_sync=true`.
