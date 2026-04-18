# Greenhouse EO — Commercial Quotation Module Architecture V1

> **Version:** 2.12
> **Created:** 2026-04-09
> **Updated:** 2026-04-18 — v2.12: TASK-464c tool catalog + overhead addons foundation implementada. `greenhouse_ai.tool_catalog` se extiende con `tool_sku`, prorrateo, `applicable_business_lines`, `applicability_tags`, `includes_in_addon` y `notes_for_quoting`; se crea `greenhouse_commercial.overhead_addons` con 9 addons canonizados (`EFO-001..009`). Nuevos módulos `tool-catalog-store.ts`, `overhead-addons-store.ts`, `tool-catalog-events.ts` y seeders idempotentes `scripts/seed-tool-catalog.ts` / `scripts/seed-overhead-addons.ts`. El catálogo comercial sigue conviviendo con AI tooling sin romper consumers existentes.
> **Updated:** 2026-04-18 — v2.11: TASK-464b pricing governance tables implementada. Nuevas tablas `role_tier_margins`, `service_tier_margins`, `commercial_model_multipliers`, `country_pricing_factors` y `fte_hours_guide` en `greenhouse_commercial`, con versionado liviano por `effective_from`, readers cacheados en `pricing-governance-store.ts` y seeder idempotente `scripts/seed-pricing-governance.ts`. El seed real dejó `21` drifts rol→tier auditados contra `TASK-464a`; el catálogo canónico sigue ganando y la reconciliación queda para consumers posteriores.
> **Updated:** 2026-04-18 — v2.10: TASK-468 commercial-side payroll employment type bridge. Nueva tabla `greenhouse_commercial.employment_type_aliases` para resolver vocabulario factual de payroll (`contract_type`) hacia `employment_types` canónicos sin tocar `greenhouse_payroll.*`. Nuevos módulos `employment-type-alias-store.ts`, `employment-type-alias-normalization.ts`, `payroll-rates-bridge.ts` y script `scripts/audit-payroll-contract-types.ts`. El bridge queda read-only y auditable; el cutover del engine sigue diferido a TASK-464d.
> **Updated:** 2026-04-18 — v2.10: TASK-464d pricing engine v2 implementado como capa aditiva en `src/lib/finance/pricing/pricing-engine-v2.ts` con `tier-compliance.ts`, `addon-resolver.ts` y `currency-converter.ts`. El flujo persistente legacy de quotations (`QuotationPricingInput`, `resolveLineItemCost`, `quotation-pricing-orchestrator.ts`) sigue conviviendo con `role_rate_cards` / `margin_targets`, mientras el endpoint `GET /api/finance/quotes/pricing/config` ya expone también el catálogo canónico de roles, employment types, governance, tools y overhead addons.
> **Updated:** 2026-04-18 — v2.8: TASK-351 quotation intelligence automation. Reactive projections `quotation_pipeline` + `quotation_profitability` en domain `cost_intelligence`. Daily lifecycle sweep (`/api/cron/quotation-lifecycle` + ops-worker `/quotation-lifecycle/sweep`) que expira cotizaciones vencidas y emite `renewal_due` con dedup. 4 eventos canónicos nuevos (`expired`, `renewal_due`, `pipeline_materialized`, `profitability_materialized`). Nueva tab "Cotizaciones" en `/finance/intelligence` con Pipeline + Rentabilidad + Renovaciones.
> **Updated:** 2026-04-17 — v2.7: TASK-350 quotation-to-cash document chain bridge. FK explícitas `purchase_orders.quotation_id`, `service_entry_sheets.quotation_id`/`amount_authorized_clp`, `income.quotation_id`/`source_hes_id`. Nuevo módulo `src/lib/finance/quote-to-cash/` con link helpers, reader de cadena documental y materializers para ramas simple (quote → income) y enterprise (HES → income). 3 eventos outbox nuevos: `commercial.quotation.po_linked`, `commercial.quotation.hes_linked`, `commercial.quotation.invoice_emitted`. Nueva tab "Cadena documental" en QuoteDetailView con KPIs Cotizado/Autorizado/Facturado + delta chips.
> **Audience:** Backend engineers, product owners, agents implementing quotation features
> **Related:** `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`, `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md`

---

## Delta 2026-04-18 — TASK-464c Tool Catalog Extension + Overhead Addons

- `greenhouse_ai.tool_catalog` pasa a ser también el catálogo comercial runtime de herramientas, sin moverlo de schema ni romper AI tooling:
  - columnas nuevas: `tool_sku`, `prorating_qty`, `prorating_unit`, `prorated_cost_usd`, `prorated_price_usd`, `applicable_business_lines`, `applicability_tags`, `includes_in_addon`, `notes_for_quoting`
  - secuencia `greenhouse_ai.tool_sku_seq` + `generate_tool_sku()` para altas futuras `ETG-027+`
  - índices nuevos: unique parcial por `tool_sku` y GIN para `applicable_business_lines` / `applicability_tags`
- Nuevo catálogo complementario `greenhouse_commercial.overhead_addons`:
  - secuencia `overhead_addon_sku_seq` + `generate_overhead_addon_sku()`
  - 9 addons canonizados `EFO-001..009`
  - enum operativo actual: `overhead_fixed`, `fee_percentage`, `fee_fixed`, `resource_month`, `adjustment_pct`
- Contrato de normalización nuevo:
  - business lines canónicas viven en `applicable_business_lines`
  - tags no-BL (`all_business_lines`, `staff_augmentation`, `internal_ops`) viven en `applicability_tags`
  - `provider_id` queda siempre resuelto y no puede degradar a `NULL`
  - filas placeholder y vacías del CSV no crean registros ni avanzan secuencias
- Runtime nuevo disponible para consumers:
  - `src/lib/commercial/tool-catalog-store.ts`
  - `src/lib/commercial/overhead-addons-store.ts`
  - `src/lib/commercial/tool-catalog-events.ts`
  - `resolveApplicableAddons()` ya resuelve `named_resources` -> `EFO-003/EFO-004/EFO-005`
- Seeder contract:
  - `scripts/seed-tool-catalog.ts` consume `tool-catalog.csv` y deja `26` rows activas sembradas
  - `scripts/seed-overhead-addons.ts` consume `overhead-addons.csv` y deja `9` rows sembradas
  - rerun idempotente verificado (`0 inserted / 0 updated` en ambos)
- Coexistencia:
  - AI tooling readers y `provider_tooling_snapshots` siguen usando `greenhouse_ai.tool_catalog`
  - `TASK-464d` toma este catálogo extendido como foundation del engine, no reinterpreta CSVs ni reconstruye tooling

---

## Delta 2026-04-18 — TASK-464b Pricing Governance Tables

- `greenhouse_commercial` incorpora cinco lookup tables versionadas por `effective_from`:
  - `role_tier_margins`
  - `service_tier_margins`
  - `commercial_model_multipliers`
  - `country_pricing_factors`
  - `fte_hours_guide`
- Contrato runtime nuevo:
  - readers canónicos en `src/lib/commercial/pricing-governance-store.ts`
  - cache in-memory TTL 5 min para lookups de config
  - resolución por fecha efectiva (`latest effective_from <= asOfDate`)
- Seeder nuevo:
  - `scripts/seed-pricing-governance.ts`
  - parser en `src/lib/commercial/pricing-governance-seed.ts`
  - consume los 5 CSVs de `data/pricing/seed/`
  - normaliza rango país (`0.85-0.9` -> `0.85 / 0.875 / 0.90`)
  - re-seed sobre la misma fecha es idempotente (`0 inserted / 0 updated` en rerun verificado)
- Drift contract:
  - `role-tier-margins.csv` no muta `sellable_roles.tier`
  - el catálogo de `TASK-464a` gana cualquier contradicción
  - el seed actual dejó `21` drifts (`tier_mismatch`, `csv_only`, `catalog_only`) exportados en artifact para reconciliación manual o futura
- Regla de coexistencia:
  - `margin_targets` y `role_rate_cards` siguen vivos como compat hasta `TASK-464d`
  - `TASK-348` no consume aún `role_tier_margins`; el condition type nuevo queda como follow-up

---

## Delta 2026-04-18 — TASK-468 Payroll Employment Type Bridge

- `greenhouse_commercial` incorpora `employment_type_aliases` como capa persistente de resolución para vocabulario externo/factual.
- El source inicial cubre `greenhouse_payroll.contract_type` y aliases legacy explícitos, con PK por `(source_system, source_value_normalized)`, `resolution_status`, `confidence` y target `employment_type_code`.
- Regla nueva:
  - commercial resuelve `contract_type` de payroll mediante alias table y **no** mediante FK, rewrite ni constraint sobre `greenhouse_payroll.*`
  - el read path de tasas payroll vive en `src/lib/commercial/payroll-rates-bridge.ts` y solo hace `SELECT`
  - cualquier writeback o sincronización bidireccional queda fuera de este corte
- Contrato para consumers futuros:
  - `TASK-467` / `TASK-463` pueden leer alias coverage y drift desde el bridge
  - `TASK-464d` puede consumir `payroll-rates-bridge` sin acoplarse a `src/lib/payroll/**`

---

## Delta 2026-04-18 — TASK-464a Sellable Roles Catalog Foundation

- Pricing comercial deja de depender solo de `role_rate_cards` como fuente de costo/precio por rol.
- Foundation nueva en `greenhouse_commercial`:
  - `sellable_roles` — catálogo canónico por SKU `ECG-XXX`, categoría, tier y flags `can_sell_as_staff` / `can_sell_as_service_component`.
  - `employment_types` — vocabulario comercial versionado e independiente de payroll (`indefinido_clp`, `honorarios_clp`, `contractor_deel_usd`, etc.).
  - `sellable_role_cost_components` — stack de costo por `(role_id, employment_type_code, effective_from)` con salario base, 4 bonos, previsional, Deel/EOR y columnas generadas `total_monthly_cost_usd` / `hourly_cost_usd`.
  - `role_employment_compatibility` — compatibilidad/default por rol sin tocar `greenhouse_payroll.*`.
  - `sellable_role_pricing_currency` — precio vigente por rol y moneda (`USD`, `CLP`, `CLF`, `COP`, `MXN`, `PEN`).
- Seeder operativo:
  - `scripts/seed-sellable-roles.ts` consume `data/pricing/seed/sellable-roles-pricing.csv`.
  - Es **resumable e idempotente**: usa upserts por PK compuesta para resembrar el mismo `effective_from` sin duplicados.
  - Distingue `skipped_placeholder`, `rejected`, `needs_review` y exporta artifact local para las filas ambiguas.
  - Inferencia de `employment_type` es conservadora; los casos ambiguos no crean compatibilidad automática.
- Eventos nuevos:
  - `commercial.sellable_role.created`
  - `commercial.sellable_role.cost_updated`
  - `commercial.sellable_role.pricing_updated`
- Regla de coexistencia:
  - `role_rate_cards` sigue como compatibilidad para callers legacy del engine TASK-346.
  - `pricing-engine-v2.ts` es la superficie nueva para callers backend/UI que ya hablen en SKUs y output currencies extendidas.
  - la deprecación efectiva de `role_rate_cards` queda supeditada al cutover completo de quotations/UI; no ocurre en el mismo merge de 464d.

---

## Delta 2026-04-18 — TASK-351 Quotation Intelligence Automation

### Problema que cerró

El bridge TASK-350 dejó las FKs listas, pero no había materialización downstream. Responder "¿cuánto pipeline hay y con qué probabilidad? ¿qué se renueva pronto? ¿cuánto drift tiene el margen real contra el cotizado?" seguía exigiendo joins ad-hoc en cada lectura.

### Schema (migration `20260418005940703_task-351-quotation-intelligence.sql`)

- `greenhouse_serving.quotation_pipeline_snapshots` — 1 fila por quote. Key = `quotation_id`. Guarda: stage derivado (draft/in_review/sent/approved/converted/rejected/expired), probability_pct, totales autorizado/facturado del bridge, days_in_stage, days_until_expiry, is_renewal_due, is_expired, snapshot_source_event.
- `greenhouse_serving.quotation_profitability_snapshots` — 1 fila por (quotation_id, period_year, period_month). Guarda quoted/authorized/invoiced/realized + attributed_cost_clp + effective_margin_pct + margin_drift_pct + drift_severity (`aligned`/`warning`/`critical`) + drift_drivers JSONB.
- `greenhouse_commercial.quotation_renewal_reminders` — dedup de alertas: last_reminder_at, reminder_count, next_check_at, last_event_type.

### Runtime (`src/lib/commercial-intelligence/`)

- `pipeline-materializer.ts:materializePipelineSnapshot({ quotationId, sourceEvent })` — idempotente. Lee quote + agrega `purchase_orders.authorized_amount_clp` + `income.total_amount_clp` por quote. Upsert con ON CONFLICT.
- `profitability-materializer.ts:materializeProfitabilitySnapshots({ quotationId })` — por quote, itera sobre cada período con income + costo atribuido prorrateado por share revenue del quote vs revenue cliente/período. `materializeProfitabilityForPeriod({ year, month })` para fan-out desde el evento de cost attribution.
- `renewal-lifecycle.ts:runQuotationLifecycleSweep()` — sweep diario. Expira quotes + emite `renewal_due` con dedup via `quotation_renewal_reminders` (cadencia 14d, lookahead 60d).
- `intelligence-store.ts` — `listPipelineSnapshots(filters)`, `buildPipelineTotals(items)`, `listProfitabilitySnapshots(filters)` — todos tenant-safe por clientId/organizationId/spaceId.

### Eventos canónicos nuevos

| Evento | Emisor | Consumidores reactivos |
|---|---|---|
| `commercial.quotation.expired` | lifecycle sweep | `quotation_pipeline` projection, audit log (`action: 'expired'`), notifications |
| `commercial.quotation.renewal_due` | lifecycle sweep | `quotation_pipeline` projection, notifications (`finance_alert` con `metadata.subtype: quotation_renewal`) |
| `commercial.quotation.pipeline_materialized` | `quotation_pipeline` projection | observabilidad, dashboards |
| `commercial.quotation.profitability_materialized` | `quotation_profitability` projection | observabilidad, dashboards |

### Projections (domain `cost_intelligence`)

- `quotation_pipeline` — triggerEvents: `created, synced, sent, approved, rejected, converted, expired, renewal_due, version_created, po_linked, hes_linked, invoice_emitted`. Scope: `{ entityType: 'quotation', entityId }`.
- `quotation_profitability` — triggerEvents: `approved, converted, po_linked, hes_linked, invoice_emitted, version_created, finance.income.created/updated, accounting.commercial_cost_attribution.period_materialized`. Scope: quote o período. El evento de cost attribution dispara fan-out por quote del período.

Ambas corren dentro del cron existente `ops-reactive-cost-intelligence` (*/10 min) del ops-worker — no se agregó cron reactivo nuevo.

### Scheduled lifecycle job

- Cloud Run canonical: `POST /quotation-lifecycle/sweep` en ops-worker. Cloud Scheduler `ops-quotation-lifecycle` 07:00 Santiago (declarado en `services/ops-worker/deploy.sh`).
- Vercel fallback: `GET /api/cron/quotation-lifecycle` 10:00 UTC daily.

### Profitability — cómo se computa el costo atribuido

1. Lee `realized_revenue_clp` = `SUM(income.total_amount_clp) WHERE quotation_id AND period_year/month`.
2. Lee `client_loaded_cost_clp` = `SUM(commercial_loaded_cost_target) FROM greenhouse_serving.commercial_cost_attribution WHERE client_id AND period`.
3. Lee `client_period_revenue` = `SUM(income.total_amount_clp) WHERE client_id AND period_year/month`.
4. Share = `min(1, realized_revenue / client_period_revenue)`. Si `client_period_revenue = 0` o el quote es el único linked, share = 1.
5. `attributed_cost_clp = client_loaded_cost_clp * share`.
6. `effective_margin_pct = ((realized_revenue - attributed_cost) / realized_revenue) * 100`.
7. `margin_drift_pct = effective_margin_pct - quoted_margin_pct`.
8. `drift_severity`: `aligned` (|drift| < 5pp), `warning` (5-15pp), `critical` (≥15pp).

Los drivers adicionales (`authorizedVsQuotedPct`, `invoicedVsQuotedPct`, `realizedVsQuotedPct`) quedan persistidos en `drift_drivers` JSONB.

### API

- `GET /api/finance/commercial-intelligence/pipeline` — `{ items, totals, count }`. Filtros: `stage, clientId, businessLineCode, renewalsDueOnly, expiredOnly`. Tenant scope automático.
- `GET /api/finance/commercial-intelligence/profitability` — `{ items, count }`. Filtros: `quotationId, periodYear, periodMonth, driftSeverity, clientId`.
- `GET /api/finance/commercial-intelligence/renewals?include=renewals|expired|all` — `{ renewals, expired, counts }`.
- `POST /api/finance/commercial-intelligence/materialize` — admin/finance_manager. `{ quotationId? }` o `{ lifecycleSweep: true }`.

### UI

- `/finance/intelligence` → tab **"Cotizaciones"** → `CommercialIntelligenceView` con 3 sub-tabs:
  - **Pipeline** — 4 KPIs (abierto / ponderado / ganado / perdido) + tabla por stage con probability, margen, vencimiento, badge de renovación/vencida.
  - **Rentabilidad** — tabla por quote-período con quoted/invoiced/costo + margen cotizado vs efectivo + chip drift (Alineado/Atención/Crítico).
  - **Renovaciones** — dos secciones: "Próximas a vencer" (60d) y "Vencidas".

Todas las listas respetan tenant scope automáticamente.

---

## Delta 2026-04-17 — TASK-350 Quotation-to-Cash Document Chain Bridge

### Problema que cerró

Antes de TASK-350, OC, HES e income se relacionaban con la cotización a través de strings frágiles (`po_number`, `hes_number`) o no se relacionaban en absoluto. No había modo de responder "¿cuánto se cotizó vs cuánto se autorizó vs cuánto se facturó de esta quote?" sin reconstruir joins heurísticamente.

### Schema (migration `20260417190539017_task-350-quotation-to-cash-bridge.sql`)

- `greenhouse_finance.purchase_orders.quotation_id` — FK → `greenhouse_commercial.quotations(quotation_id)`, `ON DELETE SET NULL`, indexada (partial index WHERE NOT NULL).
- `greenhouse_finance.service_entry_sheets.quotation_id` — FK análogo. Auto-hereda del PO cuando se crea HES con `purchase_order_id`.
- `greenhouse_finance.service_entry_sheets.amount_authorized_clp` — `numeric(14,2)` nullable. Fijado en `approveHes` (default = `amount_clp`). Habilita drift vs `amount_clp` (submitted) y vs quote total (quoted).
- `greenhouse_finance.income.quotation_id` — FK canónica al quote ancestor. Poblada al materializar factura (simple branch desde quote, enterprise branch desde HES).
- `greenhouse_finance.income.source_hes_id` — FK a HES que autorizó el income. NULL para rama simple.

Todas las columnas son nullable y no se hace backfill: bridge solo aplica a flujos nuevos; callers que pasen `quotationId` explícito (o lo hereden vía PO) obtienen audit + outbox automáticamente.

### Runtime (`src/lib/finance/quote-to-cash/`)

- `linkPurchaseOrderToQuotation({ poId, quotationId, actor })` — valida consistencia client_id/organization_id entre PO y quote, setea FK, publica `commercial.quotation.po_linked`, registra audit `po_received`. `FOR UPDATE` sobre la PO.
- `linkServiceEntryToQuotation({ hesId, quotationId, actor })` — análogo para HES; publica `commercial.quotation.hes_linked` y audit `hes_received`.
- `readQuotationDocumentChain({ quotationId })` — read-only reader que devuelve quote header + POs + HES + incomes + `totals: { quoted, authorized, invoiced, authorizedVsQuotedDelta, invoicedVsQuotedDelta }`.
- `materializeInvoiceFromApprovedQuotation({ quotationId, actor, dueDate? })` — **rama simple**. Precondiciones: quote status `approved`|`sent`, no convertida, sin POs linked, sin HES approved linked. Inserta income con `quotation_id`, transita quote a `converted`, publica `commercial.quotation.invoice_emitted` (`sourceHesId: null`) + audit `invoice_triggered` (branch: `simple`) + `status_changed`.
- `materializeInvoiceFromApprovedHes({ hesId, actor, dueDate? })` — **rama enterprise**. Precondiciones: HES status `approved`, `quotation_id` set, `income_id` null. Inserta income con `quotation_id` + `source_hes_id`, marca HES `invoiced=TRUE` y `income_id`, transita quote a `converted` si aún no lo está. Publica `invoice_emitted` + audit `invoice_triggered` (branch: `enterprise`).

### API surface

- `POST /api/finance/purchase-orders` — acepta `quotationId` opcional. Corre link helper post-create; en fallo de validación rollback limpiando la FK (no deja PO sin quote si el caller quería el link).
- `PUT /api/finance/purchase-orders/[id]` — acepta `quotationId`. Si cambia el link, corre helper.
- `POST /api/finance/hes` — al crear HES, si quedó linked (explícito o heredado del PO) emite `hes_linked` + audit.
- `POST /api/finance/hes/[id]/approve` — extendido. Acepta `amountAuthorizedClp` (persiste en approve) + `materializeInvoice` boolean + `dueDate`. Si se pide materializar y hay `quotation_id` y no hay `income_id`, encadena `materializeInvoiceFromApprovedHes` en el mismo handler. Error de materialización → 207 con `invoiceError` (approval ya ocurrió, no se revierte).
- `GET /api/finance/quotes/[id]/document-chain` — devuelve la cadena leída por el reader.
- `POST /api/finance/quotes/[id]/convert-to-invoice` — **rama simple**. Body `{ dueDate? }`.

### UI

- Nueva tab **"Cadena documental"** en `QuoteDetailView` (`src/views/greenhouse/finance/QuoteDetailView.tsx`).
- Componente `QuoteDocumentChain` (`src/views/greenhouse/finance/workspace/QuoteDocumentChain.tsx`): 3 KPIs (Cotizado / Autorizado / Facturado) con delta chip contextualizado (Alineado / +X% sobre cotizado / -X% bajo cotizado), secciones PO / HES / Facturas con accent border por estado, CTA "Convertir a factura" habilitado solo en rama simple (quote approved/sent + sin POs + sin HES aprobadas + sin facturas).

### Convivencia de ramas

- **Simple** — cliente sin ciclo enterprise. Quote aprobada → `/convert-to-invoice` → income. Quote transita directo a `converted`.
- **Enterprise** — cliente con procurement. Quote → link PO → submit HES (auto-herence de `quotation_id`) → approve HES (fija `amount_authorized_clp`) → opcional `materializeInvoice:true` → income con `source_hes_id`. La primera materialización transita la quote a `converted`; HES adicionales del mismo quote siguen materializándose sin re-transicionar.

### Definición operativa de `converted`

Una quote se considera `converted` cuando `converted_to_income_id` deja de ser NULL. Esto ocurre al primer `materializeInvoice*` exitoso. Quotes en rama enterprise con múltiples HES acumulan múltiples incomes pero sólo referencian el primero en `converted_to_income_id` — el resto queda trazable via `income.quotation_id`.

### Qué se factura

- Rama simple: quote vigente (subtotal/tax/total del quote).
- Rama enterprise: monto autorizado por HES (`amount_authorized_clp`, fallback `amount_clp`).
- Drift auditable: `readQuotationDocumentChain` expone `authorizedVsQuotedDelta` e `invoicedVsQuotedDelta` para dashboards de profitability (TASK-351).

---

## Delta 2026-04-17 — TASK-349 Workspace UI + PDF Delivery

### UI surface consolidada

- **Ruta canónica sigue siendo** `/finance/quotes`. No se abrió workspace comercial separado — spec Open Question resuelta: la fachada Finance permanece como entrypoint único; la experiencia comercial vive debajo vía tabs y drawers.
- **QuotesListView** ahora muestra columna **Versión** (vN si current_version > 1) y columna **Margen** (chip verde/ámbar/rojo según `effective_margin_pct` vs `margin_floor_pct` / `target_margin_pct`). Dos botones de creación:
  - "Nueva cotización" (primary) → `QuoteCreateDrawer` canónico (POST `/api/finance/quotes`).
  - "HubSpot" (secondary) → drawer legacy que publica directo a HubSpot vía `/api/finance/quotes/hubspot`.
- **QuoteDetailView** en tab `General` incorpora `QuoteHealthCard` (margen efectivo + target + piso + descuento + alertas) en la parte superior. Header ahora expone botones "PDF", "Guardar como template" (draft only) y "Enviar" (draft | pending_approval | approved) según permisos y status.

### Componentes nuevos en `src/views/greenhouse/finance/workspace/`

| Componente | Responsabilidad |
|---|---|
| `QuoteCreateDrawer` | Drawer lateral 560px con toggle "Desde cero" / "Desde template". Precarga currency/billing/pricingModel desde el template seleccionado. Envía payload extendido al POST `/api/finance/quotes`. |
| `QuoteLineItemsEditor` | Editor inline de line items (habilitado solo si status=draft y canEdit). Read-only si editable=false. Soporta agregar/eliminar filas, subtotales preview local, guardar/descartar. |
| `QuoteHealthCard` | Tarjeta de salud de margen. Muestra chip (Óptimo/Atención/Crítico/Sin datos), breakdown target/piso/descuento, lista de alertas MUI `Alert`, y CTA "Solicitar aprobación" cuando hay alerta `requiredApproval='finance'`. |
| `QuoteSendDialog` | Confirm dialog context-aware: distingue `needs_approval`, `approval_in_progress`, `ready`, `blocked`. Muestra health + steps pendientes + alertas. Disabled en estados bloqueantes. |
| `QuoteSaveAsTemplateDialog` | Dialog con templateName (≥4 chars) + templateCode (pattern `^[A-Z0-9\-]+$`, auto-uppercase) + description opcional. |

### Endpoints nuevos

| Método | Ruta | Responsabilidad |
|---|---|---|
| `GET` | `/api/finance/quotes/[id]/pdf` | Render client-safe del PDF usando `@react-pdf/renderer`. Excluye `unit_cost`, `subtotal_cost`, `margin_pct`, `effective_margin_pct`, `cost_breakdown`, metadata de approvals. `?download=1` cambia `Content-Disposition` de `inline` a `attachment`. Registra `pdf_generated` en audit_log (sin outbox event — es señal interna). |
| `POST` | `/api/finance/quotes/[id]/send` | Transiciona `draft → sent` (directo si health OK) o `draft → pending_approval` (si health requiere aprobación; crea approval_steps). Bloquea transiciones desde `sent`/`approved`/`pending_approval`/`rejected`/`converted`/`expired` con 409. Emite `commercial.quotation.sent` o `commercial.quotation.approval_requested` según corresponda. Actualiza `sent_at`. |
| `POST` | `/api/finance/quotes/[id]/save-as-template` | Crea template en `greenhouse_commercial.quote_templates` desde la quote actual: copia pricing_model, currency, billing_frequency, payment_terms, contract_duration; mapea current-version line items a `quote_template_items` (strip `member_id`, keep role_code); extrae `default_term_ids` de `quotation_terms` con `included=true`. Emite `commercial.quotation.template_saved`. |

### POST `/api/finance/quotes` extendido

Acepta opcional `templateId`. Cuando está presente:
1. Llama `recordTemplateUsage(templateId)` (increment `usage_count`, update `last_used_at`).
2. Defaults heredados del template: `currency`, `billingFrequency`, `pricingModel`, `contractDurationMonths`, `businessLineCode` (los valores del body sobrescriben).
3. Si `body.lineItems` está vacío → genera desde `template.items`.
4. Después del pricing snapshot, llama `seedQuotationDefaultTerms` con los `default_term_ids` del template.
5. Emite `commercial.quotation.template_used`.

Comportamiento idéntico al anterior cuando `templateId` es null/undefined.

### PDF Pipeline (client-safe)

- **Renderer:** `@react-pdf/renderer@4.3.2` en Node runtime vía `renderToBuffer`. No requiere Puppeteer ni headless Chrome.
- **Documento:** `src/lib/finance/pdf/quotation-pdf-document.tsx` usa `Document`, `Page`, `View`, `Text`, `StyleSheet`. Paleta: azul Greenhouse `#0375DB` primario, gris `#6E6B7B` secundario. Fallback Helvetica cuando Poppins no está disponible server-side.
- **Input contract (`src/lib/finance/pdf/contracts.ts`):** solo acepta campos externamente-seguros (`label`, `description`, `quantity`, `unitPrice`, `subtotalAfterDiscount`). El tipo en sí excluye costos/márgenes — **firewall a nivel TypeScript**. Si un caller intenta inyectar costos, TS falla en compilación.
- **Layout:** Header (Efeonce + numeroQuote · versión · fecha · válida hasta) → Cliente → Tabla line items (7 columnas client-safe) → Totales (subtotal / descuento / total) → Términos opcionales → Footer (datos fiscales + timestamp).
- **Audit:** cada render emite `pdf_generated` a `greenhouse_commercial.quotation_audit_log` con `{ versionNumber, downloadMode, fileName }` en details.

### Compatibilidad quote heredadas multi-source

- Quotes con `source_system ∈ {nubox, hubspot}` se muestran con el mismo shell — el chip "Fuente" indica origen.
- Quotes sin `effective_margin_pct` (típico de ingestas legacy) renderean `QuoteHealthCard` en modo muted "Aún sin margen calculado".
- El PDF funciona para cualquier quote con `current_version` y `quotation_line_items`; no requiere pricing config completa.

### Archivos tocados

- `src/lib/finance/pdf/contracts.ts` (nuevo)
- `src/lib/finance/pdf/quotation-pdf-document.tsx` (nuevo)
- `src/lib/finance/pdf/render-quotation-pdf.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/pdf/route.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/send/route.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/save-as-template/route.ts` (nuevo)
- `src/app/api/finance/quotes/route.ts` (POST extendido)
- `src/lib/finance/quotation-canonical-store.ts` (list row incluye `current_version` + margen para badges)
- `src/views/greenhouse/finance/workspace/` (5 componentes nuevos)
- `src/views/greenhouse/finance/QuotesListView.tsx` (columnas + canonical drawer wiring)
- `src/views/greenhouse/finance/QuoteDetailView.tsx` (health card + action buttons + dialogs)

### Verificación

- tsc strict, lint, test (1337 passed), build ✓.
- Smoke E2E staging-equivalent contra dev DB:
  - `GET /api/finance/quotes/{id}/pdf` → HTTP 200, `application/pdf` 3665 bytes, PDF 1.3 1 página.
  - `POST /api/finance/quotes/{id}/send` → HTTP 200, `{ sent: true, newStatus: 'sent', health }`.
- Observacional: auditoría registra `pdf_generated` y `sent` con actor + version.

### Follow-ups explícitos

- Email dispatch del PDF al cliente (consumer reactivo sobre `commercial.quotation.sent` con attachment) — queda para iteración posterior.
- PDF multi-página cuando line items > 30 (actual caso: la page única se ajusta automáticamente por el flex del renderer; con volumen real puede requerir pagination explícita).
- Font embedding de Poppins/DM Sans server-side (ahora fallback a Helvetica; cosmético).
- Analytics de uso del workspace.

---

## Delta 2026-04-17 — TASK-348 quotation governance runtime

- **7 tablas nuevas en `greenhouse_commercial`** (migration `20260417140553325_task-348-quotation-governance-runtime.sql`):
  - `approval_policies` — reglas parametrizables de aprobación por BL, pricing model, condition type (`margin_below_floor`, `margin_below_target`, `amount_above_threshold`, `discount_above_threshold`, `always`).
  - `approval_steps` — instancias pendientes/decididas por `(quotation_id, version_number)` con required_role, step_order, notes y decided_at.
  - `quotation_audit_log` — trail inmutable de acciones (`created`, `status_changed`, `version_created`, `approval_requested`, `approval_decided`, `terms_changed`, `template_used`, …) con detalle en jsonb.
  - `terms_library` — catálogo global de términos reutilizables con `body_template` que admite variables `{{payment_terms_days}}`, `{{valid_until}}`, etc.
  - `quotation_terms` — snapshot por cotización del término aplicado con `body_resolved` inmutable.
  - `quote_templates` + `quote_template_items` — plantillas por BL + pricing model con line items default, currency, billing frequency, terms referenciados y usage_count.
- **Runtime governance helpers** en `src/lib/commercial/governance/`:
  - `contracts.ts`, `audit-log.ts`, `approval-evaluator.ts`, `approval-steps-store.ts`, `policies-store.ts`, `terms-store.ts` (incluye `resolveTermVariables`), `templates-store.ts`, `versions-store.ts`, `version-diff.ts`.
  - `evaluateApproval()` recibe `health.quotationMarginPct/discountPct + totalPrice` y retorna los steps a crear en orden.
  - `createNewVersion()` clona line items de la versión vigente, incrementa `current_version`, crea snapshot en `quotation_versions` y deja la cotización en `draft`.
  - `seedQuotationDefaultTerms()` + `upsertQuotationTerms()` aplican términos del library a una quote resolviendo variables.
- **Outbox fan-out**. Nuevos event types en `event-catalog.ts`: `commercial.quotation.version_created`, `commercial.quotation.approval_requested`, `commercial.quotation.approval_decided`, `commercial.quotation.sent`, `commercial.quotation.approved`, `commercial.quotation.rejected`, `commercial.quotation.template_used`, `commercial.quotation.template_saved`. Publishers correspondientes viven en `src/lib/commercial/quotation-events.ts`.
- **API surface extension**. La gobernanza se expone bajo la superficie runtime existente (no se duplica el bridge TASK-345):
  - Por cotización: `/api/finance/quotes/[id]/versions`, `/approve`, `/audit`, `/terms`.
  - Globales: `/api/finance/quotation-governance/approval-policies[/[id]]`, `/terms-library[/[id]]`, `/templates[/[id]]`. Todos protegidos por `requireFinanceTenantContext` + role gate en mutaciones.
- **UI tabs** en `src/views/greenhouse/finance/QuoteDetailView.tsx`: General / Versiones / Aprobaciones / Términos / Auditoría. Componentes nuevos en `src/views/greenhouse/finance/governance/`.
- **Seeds iniciales**: 3 approval policies globales (margen bajo piso, monto > 50M, descuento > 30%) y 6 terms library reutilizables (pago, vigencia, confidencialidad, cambios de alcance, reemplazo, escalamiento).
- **Respeta boundaries**: audit, versions y outbox coexisten — cada uno cumple un propósito distinto según §18.3.

---

## Delta 2026-04-17 — TASK-347 HubSpot canonical bridge + event namespace convergence

- **Canonical-first semantics declared.** `greenhouse_commercial.*` is the primary
  contract target; `greenhouse_finance.*` persists as a compat façade with bridge
  syncers for the duration of the cutover (until TASK-349 closes). No table dropped.
- **Event namespace fan-out.** HubSpot sync publishers (inbound quotes, inbound
  products, inbound line items, outbound create-quote, outbound create-product)
  now route all emissions through `src/lib/commercial/quotation-events.ts`, which
  dual-publishes:
  - legacy `finance.quote.*` / `finance.product.*` / `finance.quote_line_item.*`
  - canonical `commercial.quotation.*` / `commercial.product_catalog.*` /
    `commercial.quotation.line_items_synced`
  - `commercial.discount.health_alert` (TASK-346) now registered canonically with
    `aggregate_type='quotation'` and uses the proper `outbox_events.payload_json`
    column (fix from TASK-346 where raw insert referenced a missing column).
- **Outbound cost-field governance.** `src/lib/commercial/hubspot-outbound-guard.ts`
  is the only authoritative path for building HubSpot-bound payloads. Forbidden
  fields (`costOfGoodsSold`, `cost_of_goods_sold`, `unit_cost`, `loaded_cost`,
  `marginPct`, `targetMarginPct`, `floorMarginPct`, `effectiveMarginPct`,
  `costBreakdown`) are stripped by `sanitizeHubSpotProductPayload` and double-checked
  at the service boundary (`createHubSpotGreenhouseProduct` deletes `costOfGoodsSold`
  defensively even if a caller skipped the guard). Violations throw
  `HubSpotCostFieldLeakError`.
- **Canonical product catalog reader.** `src/lib/commercial/product-catalog-store.ts`
  (`listCommercialProductCatalog`, `getCommercialProduct`) exposes
  `greenhouse_commercial.product_catalog` with canonical identity
  (`product_id` + `finance_product_id` bridge). `/api/finance/products?view=canonical`
  returns the new shape without breaking the legacy default view. ProductCatalogView
  UI is NOT wired to sidebar yet (left for TASK-349 workspace redesign).
- **Aggregate types registered.** `AGGREGATE_TYPES.quotation`,
  `AGGREGATE_TYPES.quotationLineItem`, `AGGREGATE_TYPES.productCatalog` added to
  `event-catalog.ts`. Legacy aggregate types (`quote`, `quote_line_item`, `product`)
  preserved for backward compatibility.
- **Cutover policy.**
  - Inbound sync: HubSpot → `greenhouse_finance.*` (bridge writes to
    `greenhouse_commercial.*` via existing `syncCanonicalFinanceQuote` /
    `syncCanonicalFinanceProduct`). Legacy write + canonical bridge remain
    transactional; events emitted after canonical anchor is populated.
  - Outbound create: Greenhouse → `greenhouse_finance.*` → HubSpot (payload
    sanitized) → `syncCanonicalFinanceQuote` / `syncCanonicalFinanceProduct`
    → dual publish. `publishProductCreated` / `publishQuoteCreated` fan-out to
    both namespaces in the same transaction.
  - Double-write avoidance: the bridge is idempotent via `ON CONFLICT (finance_quote_id)`
    on `quotations` and `ON CONFLICT (finance_product_id)` on `product_catalog`.
- **Compatibility surfaces.**
  - `/api/finance/quotes`, `/api/finance/quotes/[id]`, `/api/finance/quotes/[id]/lines`
    already read from canonical (TASK-345). No changes required for TASK-347.
  - `/api/finance/products` default view preserved; `view=canonical` query param
    switches to `greenhouse_commercial.product_catalog`.
  - Cron routes (`/api/cron/hubspot-quotes-sync`, `/api/cron/hubspot-products-sync`)
    unchanged externally; internally they invoke the updated publishers.
- **Pending cleanup (future tasks):**
  - Retire `finance.quote.*` / `finance.product.*` aliases once all consumers
    migrate (TASK-349+).
  - Drop `greenhouse_finance.products` table entirely after ProductCatalog workspace
    (TASK-349) is live (out of scope for TASK-347).

---

## Delta 2026-04-17 — TASK-346 Pricing/costing/margin core live

- Pricing config foundation materializada en `greenhouse_commercial`:
  - `margin_targets` (business_line_code nullable + effective_from; CHECK floor ≤ target)
  - `role_rate_cards` (business_line_code + role_code + seniority_level + effective_from)
  - `revenue_metric_config` (business_line_code nullable, hubspot_amount_metric + pipeline_default_metric)
- Runtime pricing helpers en `src/lib/finance/pricing/`:
  - `pricing-config-store.ts` — resolvers con herencia `quotation_override → business_line → global_default`.
  - `costing-engine.ts` — puerta legacy para `QuotationPricingInput` / line items históricos.
  - `pricing-engine-v2.ts` — puerta canónica nueva para role/person/tool/overhead/direct_cost con tier compliance, FX y addon resolver.
  - `margin-health.ts` — clasifica alertas (blocking / finance-approval / warning / info).
  - `revenue-metrics.ts` — resuelve `recurrence_type = 'inherit'` según `billing_frequency` y calcula MRR/ARR/TCV/ACV.
  - `quotation-pricing-orchestrator.ts` — `buildQuotationPricingSnapshot` / `persistQuotationPricing` /
    `recalculateQuotationPricing` orquestan costing + totals + health + revenue + persistencia transaccional y
    publican al outbox `commercial.discount.health_alert` cuando hay alerta severa.
- Política canónica **snapshot vs recompute** (bajada a código):
  - **Snapshot (congelado al guardar en `quotation_line_items`)**: `unit_cost`, `cost_breakdown`,
    `subtotal_cost`. Esto blinda la cotización contra cambios posteriores de payroll/FX/rate cards
    salvo recálculo explícito.
  - **Recompute (siempre en cada save)**: `subtotal_price`, `discount_amount`, `subtotal_after_discount`,
    `effective_margin_pct` por línea y los agregados de quotation (`total_cost`, `total_price`,
    `effective_margin_pct`, `mrr`, `arr`, `tcv`, `acv`, `revenue_type`).
  - **Recompute bajo comando del usuario**: `POST /api/finance/quotes/[id]/recalculate` re-lee
    `member_capacity_economics` y `role_rate_cards` vigentes, actualizando el snapshot. Opcionalmente
    crea una nueva versión (`createVersion: true`) en `quotation_versions`.
- FX multi-moneda:
  - `quotations.exchange_rates` (JSONB) guarda las tasas canónicas del momento del snapshot.
  - El engine acepta claves `FROM_TO` y su inversa; si no encuentra tasa usa `fx_rate` del snapshot
    de capacity cuando la target es CLP; si no hay match deja el costo sin convertir y agrega warning
    a `resolutionNotes` del line item.
- API routes (finance-scoped):
  - `POST /api/finance/quotes` — create draft + snapshot inicial
  - `PUT /api/finance/quotes/[id]` — update headers + recalculate (`recalculatePricing: boolean`)
  - `POST /api/finance/quotes/[id]/lines` — replace line items + recompute
  - `POST /api/finance/quotes/[id]/recalculate` — force re-read del backbone
  - `GET /api/finance/quotes/[id]/health` — discount health server-side
  - `GET/PUT /api/finance/quotes/pricing/config` — PUT gated a `finance_admin` / `efeonce_admin`; GET ahora expone tanto config legacy como catálogo canónico de pricing.
- El namespace de eventos sigue en `finance.quote.*` para compat (converge a `commercial.quotation.*`
  en TASK-347). TASK-346 suma el nuevo evento `commercial.discount.health_alert` al outbox.

## Delta 2026-04-17 — TASK-345 Canonical schema + finance compatibility bridge

- `greenhouse_commercial` ya existe físicamente en PostgreSQL para la lane de quotations.
- Foundation materializada:
  - `greenhouse_commercial.product_catalog`
  - `greenhouse_commercial.quotations`
  - `greenhouse_commercial.quotation_versions`
  - `greenhouse_commercial.quotation_line_items`
- La materialización nace como **bridge canónico**, no como surface visible nueva:
  - `Finance > Cotizaciones` sigue siendo la fachada visible
  - las APIs Finance leen vía façade canónica manteniendo el contrato legacy del portal
  - los writers actuales de HubSpot/Nubox siguen publicando `finance.quote.*` / `finance.product.*`, pero ahora sincronizan también el anchor canónico
- Regla de IDs/cutover:
  - `quotation_id` es la identidad canónica interna del nuevo schema
  - `finance_quote_id`, `finance_product_id` y `finance_line_item_id` quedan persistidos como claves de compatibilidad/runtime
  - el portal Finance sigue exponiendo `quoteId` y `lineItemId` legacy mientras dure el cutover
- Regla de tenancy actualizada:
  - `space_id` queda materializado en `greenhouse_commercial.quotations` via resolución bridge desde `organization_id` / `client_id`
  - si el lane legacy no trae `space_id` explícito, el bridge conserva `space_resolution_source` para auditar cómo se resolvió
- Los eventos `commercial.quotation.*` siguen siendo naming objetivo; TASK-345 no introduce todavía publishers runtime en esa familia.

## 1. Vision y proposito

El modulo de cotizaciones es el puente entre **lo que cuesta operar** (payroll, overhead, assignments) y **lo que se le cobra al cliente** (precio, condiciones, documentos). Cierra el ciclo `cotizado → vendido → ejecutado → medido` que hoy tiene un gap entre finance (que mide margen post-facto) y operaciones (que asigna personas sin pricing formal).

### Principios de diseno

1. **El costo viene del sistema, no del usuario** — el costo loaded por persona se deriva de payroll + overhead. El comercial solo define precio y margen; no inventa costos.
2. **HubSpot es CRM, Greenhouse es pricing** — los deals y productos se sincronizan bidireccionalmente, pero costo/margen nunca salen de Greenhouse.
3. **El catalogo es local-first** — productos viven en PG con sync opcional a HubSpot. No depender del CRM para cotizar.
4. **La cotizacion genera la cadena documental** — Cotizacion → OC → HES → Factura. Cada eslabon tiene su lifecycle independiente.
5. **Descuentos saludables por construccion** — el sistema calcula el impacto del descuento sobre el margen y bloquea o alerta antes de generar perdida.
6. **Aprobacion por excepcion, no por regla** — el flujo default no requiere aprobacion. Solo se activan steps de aprobacion cuando una condicion (margen debajo del floor, monto alto, descuento agresivo) lo dispara.
7. **Cotizado vs ejecutado siempre visible** — el sistema compara lo que se prometio con lo que se entrego. El margin drift es un KPI de primer nivel.
8. **Templates para velocidad, catalogo para consistencia** — las cotizaciones frecuentes parten de templates predefinidos; los line items se arman desde un catalogo unificado con HubSpot.

---

## 2. Modelos de pricing

Efeonce opera con 4 business lines y 3 modelos de pricing:

| Modelo | Que se vende | Ejemplo | Facturacion |
|--------|-------------|---------|-------------|
| **Staff Augmentation** | Personas nombradas con tarifa/hora | "Maria Gonzalez, Lead Dev, $85/h, 160h/mes" | Mensual anticipada |
| **Retainer** | Paquete de capacidad sin nombrar personas | "Agencia creativa, 80h produccion/mes, $9.6M/mes" | Mensual, requiere HES en clientes enterprise |
| **Proyecto On-demand** | Entregable con scope cerrado | "Rediseno sitio web, $15M total en 4 hitos" | Por hito, requiere HES |

Los 3 modelos comparten la misma estructura de datos (quotation + line items). Lo que cambia es:
- `line_type` de los items (person vs role vs deliverable)
- Lo que se muestra en el PDF
- El billing frequency (monthly vs milestone vs one_time)

---

## 3. Schema: `greenhouse_commercial`

Schema dedicado ya materializado. Ownership: `greenhouse_ops`.

> **Nota de cutover:** este schema ya existe físicamente desde `TASK-345`, pero el portal no hace bypass directo del lane Finance. El runtime visible sigue siendo finance-first con façade canónica detrás.

### 3.1. Margin targets (configuracion por business line)

```sql
CREATE TABLE greenhouse_commercial.margin_targets (
  target_id        TEXT PRIMARY KEY DEFAULT 'mt-' || gen_random_uuid(),
  business_line_code TEXT NOT NULL,       -- EO-BL-WAVE, EO-BL-GLOBE, etc.
  target_margin_pct  NUMERIC(5,2) NOT NULL,
  floor_margin_pct   NUMERIC(5,2) NOT NULL,
  effective_from     DATE NOT NULL,
  effective_until    DATE,                -- null = vigente indefinidamente
  created_by         TEXT NOT NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT margin_targets_floor_lte_target CHECK (floor_margin_pct <= target_margin_pct)
);

CREATE INDEX idx_margin_targets_bl_date ON greenhouse_commercial.margin_targets (business_line_code, effective_from);
```

Valores iniciales sugeridos:

| Business Line | Target | Floor |
|--------------|--------|-------|
| Wave | 28% | 20% |
| Reach | 18% | 10% |
| Globe | 40% | 25% |
| Efeonce Digital | 35% | 20% |

### 3.2. Product catalog

```sql
CREATE TABLE greenhouse_commercial.product_catalog (
  product_id          TEXT PRIMARY KEY DEFAULT 'prd-' || gen_random_uuid(),
  hubspot_product_id  TEXT,               -- nullable; null = solo local
  product_code        TEXT NOT NULL UNIQUE, -- "EO-PRD-RETAINER-CREATIVO-80H"
  product_name        TEXT NOT NULL,
  product_type        TEXT NOT NULL CHECK (product_type IN ('service', 'deliverable', 'license', 'infrastructure')),
  pricing_model       TEXT CHECK (pricing_model IN ('staff_aug', 'retainer', 'project', 'fixed')),
  business_line_code  TEXT,               -- sugerencia, no constraint
  default_currency    TEXT NOT NULL DEFAULT 'CLP' CHECK (default_currency IN ('CLP', 'USD', 'CLF')),
  default_unit_price  NUMERIC(14,2),
  default_unit        TEXT NOT NULL DEFAULT 'hour' CHECK (default_unit IN ('hour', 'month', 'unit', 'project')),
  suggested_role_code TEXT,               -- rol sugerido para costeo
  suggested_hours     NUMERIC(8,2),
  description         TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sync_status         TEXT NOT NULL DEFAULT 'local_only' CHECK (sync_status IN ('synced', 'local_only', 'pending_sync')),
  sync_direction      TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'greenhouse_only', 'hubspot_only')),
  last_synced_at      TIMESTAMPTZ,
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_catalog_hs ON greenhouse_commercial.product_catalog (hubspot_product_id) WHERE hubspot_product_id IS NOT NULL;
CREATE INDEX idx_product_catalog_bl ON greenhouse_commercial.product_catalog (business_line_code) WHERE business_line_code IS NOT NULL;
```

**Tres capas de productos:**
1. **Sync desde HubSpot** — `hubspot_product_id` != null, `sync_status = 'synced'`
2. **Creado en Greenhouse, synced a HubSpot** — `hubspot_product_id` != null, `sync_status = 'synced'`, originado local
3. **Solo local** — `hubspot_product_id` is null, `sync_status = 'local_only'`

### 3.3. Product overhead defaults

Overhead directo por defecto asociado a un producto del catalogo (licencias incluidas):

```sql
CREATE TABLE greenhouse_commercial.product_overhead_defaults (
  default_id    TEXT PRIMARY KEY DEFAULT 'pod-' || gen_random_uuid(),
  product_id    TEXT NOT NULL REFERENCES greenhouse_commercial.product_catalog(product_id),
  label         TEXT NOT NULL,            -- "Licencia Adobe Creative Cloud"
  monthly_cost  NUMERIC(14,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4. Quotations

```sql
CREATE TABLE greenhouse_commercial.quotations (
  quotation_id         TEXT PRIMARY KEY DEFAULT 'qt-' || gen_random_uuid(),
  quotation_number     TEXT NOT NULL UNIQUE, -- "GH-2026-0042"
  organization_id      TEXT NOT NULL,        -- FK logico → greenhouse_core.organizations
  space_id             TEXT,                 -- nullable, para contexto de space especifico
  client_id            TEXT,                 -- nullable, para lookup de costos
  business_line_code   TEXT NOT NULL,
  pricing_model        TEXT NOT NULL CHECK (pricing_model IN ('staff_aug', 'retainer', 'project')),

  -- Status
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
  current_version      INTEGER NOT NULL DEFAULT 1,

  -- Moneda y tipo de cambio
  currency             TEXT NOT NULL DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD', 'CLF')),
  exchange_rates       JSONB NOT NULL DEFAULT '{}',
  exchange_snapshot_date DATE,

  -- Margen
  target_margin_pct    NUMERIC(5,2),         -- heredado de margin_targets, sobreescribible
  margin_floor_pct     NUMERIC(5,2),         -- heredado, sobreescribible

  -- Descuentos globales
  global_discount_type TEXT CHECK (global_discount_type IN ('percentage', 'fixed_amount')),
  global_discount_value NUMERIC(14,2),       -- % o monto segun type

  -- Totales (calculados, denormalizados para queries rapidas)
  total_cost           NUMERIC(14,2),
  total_price_before_discount NUMERIC(14,2),
  total_discount       NUMERIC(14,2),
  total_price          NUMERIC(14,2),
  effective_margin_pct NUMERIC(5,2),

  -- Revenue metrics (derivados, recalculados al guardar — ver §12A)
  revenue_type         TEXT DEFAULT 'recurring' CHECK (revenue_type IN ('recurring', 'one_time', 'hybrid')),
  mrr                  NUMERIC(14,2),         -- Monthly Recurring Revenue (null si one_time puro)
  arr                  NUMERIC(14,2),         -- Annual Recurring Revenue (MRR × 12)
  tcv                  NUMERIC(14,2),         -- Total Contract Value
  acv                  NUMERIC(14,2),         -- Annual Contract Value (TCV / años)

  -- Validez y condiciones
  valid_until          DATE,
  contract_duration_months INTEGER,
  billing_frequency    TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'milestone', 'one_time')),
  payment_terms_days   INTEGER NOT NULL DEFAULT 30,
  conditions_text      TEXT,                 -- texto libre para el PDF
  internal_notes       TEXT,                 -- solo admin, no va al PDF

  -- Escalamiento
  escalation_mode      TEXT DEFAULT 'none' CHECK (escalation_mode IN ('none', 'automatic_ipc', 'negotiated')),
  escalation_pct       NUMERIC(5,2),         -- solo si mode = negotiated
  escalation_frequency_months INTEGER,       -- meses entre ajustes
  escalation_base_date DATE,

  -- Integraciones
  hubspot_deal_id      TEXT,                 -- sync bidireccional

  -- Auditoria
  created_by           TEXT NOT NULL,
  approved_by          TEXT,
  sent_at              TIMESTAMPTZ,
  approved_at          TIMESTAMPTZ,
  expired_at           TIMESTAMPTZ,
  converted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotations_org ON greenhouse_commercial.quotations (organization_id);
CREATE INDEX idx_quotations_status ON greenhouse_commercial.quotations (status);
CREATE INDEX idx_quotations_hs_deal ON greenhouse_commercial.quotations (hubspot_deal_id) WHERE hubspot_deal_id IS NOT NULL;
```

### 3.5. Quotation versions

```sql
CREATE TABLE greenhouse_commercial.quotation_versions (
  version_id           TEXT PRIMARY KEY DEFAULT 'qv-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  version_number       INTEGER NOT NULL,
  snapshot_json        JSONB NOT NULL,       -- copia completa de line items al crear version
  diff_from_previous   JSONB,               -- delta calculado automaticamente
  total_cost           NUMERIC(14,2),
  total_price          NUMERIC(14,2),
  total_discount       NUMERIC(14,2),
  effective_margin_pct NUMERIC(5,2),
  created_by           TEXT NOT NULL,
  notes                TEXT,                 -- "Ajuste de tarifa por pedido del cliente"
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quotation_id, version_number)
);
```

### 3.6. Quotation line items

```sql
CREATE TABLE greenhouse_commercial.quotation_line_items (
  line_item_id         TEXT PRIMARY KEY DEFAULT 'qli-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  version_number       INTEGER NOT NULL,

  -- Origen
  product_id           TEXT REFERENCES greenhouse_commercial.product_catalog(product_id),
  hubspot_line_item_id TEXT,                -- sync bidireccional
  line_type            TEXT NOT NULL CHECK (line_type IN ('person', 'role', 'deliverable', 'direct_cost')),
  sort_order           INTEGER NOT NULL DEFAULT 0,

  -- Presentacion (lo que aparece en el PDF)
  label                TEXT NOT NULL,
  description          TEXT,

  -- Asignacion (staff aug)
  member_id            TEXT,                 -- nullable; solo staff aug con persona nombrada
  role_code            TEXT,                 -- para retainer/proyecto sin persona
  fte_allocation       NUMERIC(4,2),         -- 0.50, 1.00
  hours_estimated      NUMERIC(8,2),
  unit                 TEXT NOT NULL DEFAULT 'hour' CHECK (unit IN ('hour', 'month', 'unit', 'project')),
  quantity             NUMERIC(10,2) NOT NULL DEFAULT 1,

  -- Costeo (calculado desde payroll + overhead; no editable por comercial)
  unit_cost            NUMERIC(14,2),        -- costo loaded por unidad
  cost_breakdown       JSONB,               -- { salary, employer_costs, direct_overhead, structural_overhead }
  subtotal_cost        NUMERIC(14,2),        -- unit_cost * quantity

  -- Pricing (editable por comercial)
  unit_price           NUMERIC(14,2),        -- manual o calculado con margen
  subtotal_price       NUMERIC(14,2),        -- unit_price * quantity

  -- Descuento por item
  discount_type        TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value       NUMERIC(14,2),
  discount_amount      NUMERIC(14,2),        -- monto calculado del descuento
  subtotal_after_discount NUMERIC(14,2),     -- subtotal_price - discount_amount

  -- Margen
  margin_pct           NUMERIC(5,2),         -- nullable; hereda de cotizacion si null
  effective_margin_pct NUMERIC(5,2),         -- derivado: (price_after_discount - cost) / price_after_discount

  -- Recurrencia (ver §12A — revenue metrics)
  recurrence_type      TEXT DEFAULT 'inherit' CHECK (recurrence_type IN ('recurring', 'one_time', 'inherit')),
  -- 'inherit' = usa billing_frequency de la cotizacion
  -- 'one_time' = este item se cobra una vez aunque la cotizacion sea monthly
  -- 'recurring' = este item se cobra cada periodo

  -- Moneda (hereda de cotizacion; override para items multi-moneda)
  currency             TEXT,

  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qli_quotation ON greenhouse_commercial.quotation_line_items (quotation_id, version_number);
```

### 3.7. Purchase orders (OC)

```sql
CREATE TABLE greenhouse_commercial.purchase_orders (
  po_id                TEXT PRIMARY KEY DEFAULT 'po-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  po_number            TEXT NOT NULL,        -- numero de OC del cliente
  po_date              DATE NOT NULL,
  po_amount            NUMERIC(14,2) NOT NULL,
  po_currency          TEXT NOT NULL DEFAULT 'CLP',
  po_document_asset_id TEXT,                 -- FK logico → media assets (PDF subido)
  status               TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'active', 'completed', 'cancelled')),
  received_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes                TEXT,
  created_by           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_quotation ON greenhouse_commercial.purchase_orders (quotation_id);
```

### 3.8. Service entries (HES)

```sql
CREATE TABLE greenhouse_commercial.service_entries (
  entry_id             TEXT PRIMARY KEY DEFAULT 'hes-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  po_id                TEXT REFERENCES greenhouse_commercial.purchase_orders(po_id),
  period_label         TEXT NOT NULL,        -- "Abril 2026" o "Hito 1: Discovery"
  period_start         DATE,
  period_end           DATE,
  amount_authorized    NUMERIC(14,2) NOT NULL, -- puede diferir del cotizado
  currency             TEXT NOT NULL DEFAULT 'CLP',
  hes_number           TEXT,
  hes_document_asset_id TEXT,                -- FK logico → media assets (PDF subido)
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'invoiced')),
  invoice_trigger      BOOLEAN NOT NULL DEFAULT FALSE,
  nubox_invoice_id     TEXT,                 -- se llena al facturar
  received_at          TIMESTAMPTZ,
  invoiced_at          TIMESTAMPTZ,
  notes                TEXT,
  created_by           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hes_quotation ON greenhouse_commercial.service_entries (quotation_id);
CREATE INDEX idx_hes_status ON greenhouse_commercial.service_entries (status);
```

---

## 4. Costeo automatico

### 4.1. Costo loaded por persona

El sistema deriva el costo desde `member_capacity_economics` (ya materializado):

```
unit_cost = cost_per_hour_target
          = (loaded_cost_target / contracted_hours_month)
```

Donde `loaded_cost_target` ya incluye:
- Salario bruto
- Cargas empleador (AFP, salud, seguro cesantia, mutual)
- Bonificaciones
- Overhead directo prorrateado (licencias, equipo)
- Overhead estructural prorrateado (oficina, infra compartida)

Fuente: `greenhouse_hr.member_capacity_economics` via `src/lib/member-capacity-economics/store.ts`.

### 4.2. Dos capas de overhead

| Capa | Atribucion | Ejemplos | Como se calcula |
|------|-----------|----------|----------------|
| **Overhead directo** | Por persona, real y trazable | Adobe ($55/mes), Figma ($15/mes), GitHub Copilot ($19/mes), equipo amortizado | Suma de licencias/tools asignadas al miembro |
| **Overhead estructural** | Por BU o global, prorrateado | Oficina, internet, contador, seguros | Total overhead BU / personas activas BU / horas mes |

Ambas capas ya estan incluidas en `loaded_cost_target`. El `cost_breakdown` JSONB del line item desglosa:

```json
{
  "salary_component": 1200000,
  "employer_costs": 324000,
  "direct_overhead": 55000,
  "structural_overhead": 180000,
  "loaded_total": 1759000,
  "cost_per_hour": 10994,
  "source_period": "2026-04",
  "currency": "CLP"
}
```

### 4.3. Costeo de roles genericos (sin persona asignada)

Para retainers y proyectos donde se cotiza un "Disenador Senior" sin nombrar persona:

1. El sistema busca el costo promedio de personas con ese `role_code` en la BU correspondiente
2. Si no hay datos, usa un rate card configurable por BU + seniority
3. El admin puede sobreescribir el unit_cost manualmente

```sql
CREATE TABLE greenhouse_commercial.role_rate_cards (
  rate_card_id       TEXT PRIMARY KEY DEFAULT 'rrc-' || gen_random_uuid(),
  business_line_code TEXT NOT NULL,
  role_code          TEXT NOT NULL,
  seniority_level    TEXT NOT NULL,         -- junior, mid, senior, lead
  hourly_rate_cost   NUMERIC(14,2) NOT NULL, -- costo estimado/hora
  currency           TEXT NOT NULL DEFAULT 'CLP',
  effective_from     DATE NOT NULL,
  effective_until    DATE,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_line_code, role_code, seniority_level, effective_from)
);
```

---

## 5. Descuentos: modelo y guardrails

### 5.1. Tipos de descuento

| Nivel | Tipo | Ejemplo |
|-------|------|---------|
| **Por line item** | Porcentaje | "10% descuento en horas de QA" |
| **Por line item** | Monto fijo | "$200.000 de descuento en este item" |
| **Por cotizacion** | Porcentaje | "5% descuento global" |
| **Por cotizacion** | Monto fijo | "$500.000 descuento total" |

Los descuentos se **acumulan**: si un item tiene 10% descuento y la cotizacion tiene 5% adicional, el item final tiene ambos aplicados.

Orden de aplicacion:
1. Calcular `subtotal_price` de cada item (`unit_price * quantity`)
2. Aplicar descuento por item → `subtotal_after_discount`
3. Sumar todos los `subtotal_after_discount` → `total_price_before_global_discount`
4. Aplicar descuento global → `total_price`

### 5.2. CRUD de descuentos

Los descuentos son campos del line item y de la cotizacion, no entidades separadas. El CRUD es:

- **Crear:** al agregar un line item, opcionalmente se define `discount_type` + `discount_value`
- **Leer:** el sistema calcula y persiste `discount_amount` y `subtotal_after_discount`
- **Actualizar:** el comercial puede cambiar el descuento en cualquier momento mientras la cotizacion esta en `draft`
- **Eliminar:** poner `discount_type = null` y `discount_value = null`

Para descuento global: mismos campos en la tabla `quotations` (`global_discount_type`, `global_discount_value`).

### 5.3. Guardrail de salud: el discount health checker

Cada vez que se modifica un descuento (item o global), el sistema recalcula y evalua:

```typescript
interface DiscountHealthResult {
  healthy: boolean
  quotationMarginPct: number
  marginFloorPct: number
  marginTargetPct: number
  deltaFromFloor: number           // puede ser negativo
  deltaFromTarget: number
  alerts: DiscountAlert[]
}

type DiscountAlert =
  | { level: 'error'; code: 'margin_below_zero'; message: string; affectedItems: string[] }
  | { level: 'error'; code: 'margin_below_floor'; message: string; requiredApproval: 'finance' }
  | { level: 'warning'; code: 'margin_below_target'; message: string; deltaFromTarget: number }
  | { level: 'warning'; code: 'item_negative_margin'; message: string; itemId: string }
  | { level: 'info'; code: 'discount_exceeds_threshold'; message: string; discountPct: number }
```

**Reglas de bloqueo:**

| Condicion | Nivel | Efecto |
|-----------|-------|--------|
| Margen efectivo < 0% (perdida) | `error` | **Bloquea envio.** No se puede enviar la cotizacion. |
| Margen efectivo < floor de la BL | `error` | **Requiere aprobacion de Finance** para enviar. |
| Margen efectivo < target de la BL | `warning` | Alerta visual pero permite enviar. |
| Un item individual tiene margen < 0% | `warning` | Flag rojo en el item. No bloquea si el total es sano. |
| Descuento total > 25% del subtotal | `info` | Nota informativa: "Descuento significativo (28%)". |

El health check se ejecuta:
- Al guardar un draft (calculo en backend)
- En tiempo real en la UI (calculo en frontend con los mismos datos)
- Antes de cambiar status a `sent` (validacion server-side bloqueante)

---

## 6. Multi-moneda

### 6.1. Monedas soportadas

| Moneda | ISO | Rol | Fuente de conversion |
|--------|-----|-----|---------------------|
| CLP | CLP | Moneda operativa interna (costos Chile) | Base |
| USD | USD | Moneda operativa intl + cotizacion extranjero | `economic_indicators` (ya sincronizado) |
| UF | CLF | Moneda de cotizacion Chile (indexada) | `economic_indicators` (ya sincronizado) |

### 6.2. Snapshot de tipo de cambio

Al crear o enviar una cotizacion, se fija el tipo de cambio del dia:

```json
{
  "clp_usd": 920.50,
  "clf_clp": 38245.60,
  "snapshot_date": "2026-04-09",
  "source": "economic_indicators"
}
```

Esto asegura que los numeros de la cotizacion no cambian si el dolar sube al dia siguiente. Al facturar (HES → Nubox), se usa el tipo de cambio **del dia de facturacion** — la diferencia cambiaria se registra en finance.

### 6.3. Presentacion por moneda

- **Capa interna (admin):** siempre ve costo en CLP (moneda base de payroll Chile). Si el costo es USD (persona internacional), se convierte al TC del snapshot.
- **Capa cliente (PDF):** ve precio en la moneda de la cotizacion (CLP, USD, o UF). Los montos se formatean con `Intl.NumberFormat` segun la moneda.

---

## 7. Escalamiento (IPC / ajuste periodico)

```sql
-- Campos en quotations
escalation_mode              TEXT    -- 'none' | 'automatic_ipc' | 'negotiated'
escalation_pct               NUMERIC -- solo si mode = 'negotiated'
escalation_frequency_months  INTEGER -- meses entre ajustes (tipico: 12)
escalation_base_date         DATE    -- desde cuando cuenta
```

**Modo `automatic_ipc`:** al cumplirse el `escalation_frequency_months` desde la `base_date`, el sistema:
1. Consulta el IPC acumulado desde la base date (fuente: `economic_indicators`)
2. Genera una nueva version de la cotizacion con precios ajustados
3. Notifica al comercial para revision y envio

**Modo `negotiated`:** aplica el `escalation_pct` fijo al cumplirse la frecuencia. Mismo flujo de nueva version.

**Modo `none`:** sin ajuste. El precio se mantiene hasta renegociacion manual.

---

## 8. Versionamiento y diff

### 8.1. Crear una nueva version

Al editar una cotizacion que ya fue enviada (o para crear una revision):

1. El sistema clona todos los `quotation_line_items` del `current_version`
2. Incrementa `current_version` en la cotizacion
3. Crea un registro en `quotation_versions` con:
   - `snapshot_json`: copia completa de los line items de la version anterior
   - `diff_from_previous`: null (se calcula despues del edit)

4. El comercial edita los items de la nueva version
5. Al guardar, el sistema calcula el diff automaticamente

### 8.2. Calculo del diff

```typescript
interface VersionDiff {
  added: Array<{ label: string; unitPrice: number; quantity: number }>
  removed: Array<{ label: string; unitPrice: number; quantity: number }>
  changed: Array<{
    label: string
    field: string
    oldValue: string | number
    newValue: string | number
    deltaPct: number | null
  }>
  impact: {
    previousTotal: number
    currentTotal: number
    deltaPct: number
    previousMargin: number
    currentMargin: number
    marginDelta: number
  }
}
```

### 8.3. Que versiones se muestran

- **PDF:** siempre la version vigente (la ultima enviada o la del current_version)
- **Vista admin:** timeline de versiones con diff entre cada par consecutivo
- **HubSpot:** el deal amount se actualiza con el total de la version vigente

---

## 9. Integraciones

### 9.1. HubSpot — deals y line items

**Sync bidireccional de deals:**

| Campo | Direccion | Detalle |
|-------|-----------|---------|
| Deal amount | GH → HS | `total_price` de la cotizacion |
| Deal stage | Bidireccional | Mapping: draft→proposal, sent→proposal_sent, approved→closed_won, rejected→closed_lost |
| Deal line items | GH ↔ HS | Linked a `product_catalog` via `hubspot_product_id` |
| Deal contacts | HS → GH | El deal ya tiene contactos; se leen para contexto |
| Notes/attachments | GH → HS | PDF se adjunta como engagement note |

**Sync bidireccional de productos:**

| Evento | Direccion | Accion |
|--------|-----------|--------|
| Producto creado en HS | HS → GH | Crear en `product_catalog` con `sync_status = 'synced'` |
| Producto creado en GH (con sync) | GH → HS | Crear en HubSpot, guardar `hubspot_product_id` |
| Producto actualizado | Bidireccional | Actualizar nombre, precio default, descripcion |
| Producto eliminado en HS | HS → GH | Marcar `active = false` en GH (soft delete) |

**Infraestructura:** reutiliza el Cloud Run `hubspot-greenhouse-integration` service. Se agregan endpoints:
- `POST /deals/sync` — sync deal desde/hacia Greenhouse
- `POST /products/sync` — sync producto (ya parcialmente existente)

### 9.2. Nubox — facturacion

Trigger: cuando un `service_entry` cambia a `status = 'invoiced'` con `invoice_trigger = true`:

1. Greenhouse compila los datos de facturacion:
   - RUT cliente (desde `organization.tax_id`)
   - Detalle de items (desde `quotation_line_items` de la version vigente)
   - Monto autorizado (desde `service_entry.amount_authorized`)
   - Moneda y tipo de cambio del dia de facturacion
2. Llama a Nubox API `POST /v1/sales` (endpoint ya documentado en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`)
3. Registra el `nubox_invoice_id` en el service entry
4. Crea un registro en `greenhouse_finance.income` (flujo existente)
5. Publica evento `commercial.invoice.generated` al outbox

---

## 10. Generacion de PDF

### 10.1. Stack tecnico

- **Renderizado:** React Email components (mismo stack que los emails transaccionales)
- **Generacion PDF:** `@react-pdf/renderer` o Puppeteer headless sobre el HTML de React Email
- **Storage:** `greenhouse-media` bucket (mismo que logos y attachments)
- **Entrega:** descarga directa desde Greenhouse + attachment a deal de HubSpot

### 10.2. Formatos por pricing model

Tres templates comparten el mismo shell visual (header con logo, numero, fecha, cliente):

| Modelo | Que muestra al cliente | Que NO muestra |
|--------|----------------------|---------------|
| Staff Aug | Nombre persona (o "Por asignar"), rol, dedicacion, tarifa/hora, subtotal | Costo interno, margen, overhead, salary |
| Retainer | Conceptos de servicio, horas incluidas, fee mensual | Personas, costos, margen |
| Proyecto | Fases, entregables, precio por fase, forma de pago | Horas estimadas por rol, costos internos |

### 10.3. Secciones del PDF

1. **Header:** logo Efeonce, numero cotizacion, version, fecha, validez
2. **Cliente:** nombre organizacion, contacto, direccion (si disponible)
3. **Cuerpo:** segun pricing model (ver arriba)
4. **Totales:** subtotal, descuentos (si aplica), total, moneda
5. **Condiciones:** texto libre (`conditions_text`) + condiciones default por BL
6. **Footer:** datos fiscales Efeonce, contacto comercial

---

## 11. Cadena documental completa

```
COTIZACION          OC                  HES                 FACTURA
──────────          ──                  ───                 ───────

Draft
  │
  ├── v1, v2...
  │
Enviada ──────→  [Cliente evalua]
  │
  ├── Aprobada
  │     │
  │     └────→  OC recibida ─────→  HES periodo 1 ───→  Factura Nubox
  │              (PDF upload)        (PDF upload)         (DTE emitido)
  │              po_number           amount_authorized     → finance.income
  │              po_amount           hes_number
  │                                       │
  │                                  HES periodo 2 ───→  Factura Nubox
  │                                  HES periodo 3 ───→  Factura Nubox
  │                                  ...
  │
  ├── Rechazada → [fin o nueva version]
  │
  └── Expirada → [fin o renovacion]
```

**Rama simple (sin OC/HES):**

```
Cotizacion aprobada → Servicio activo → Facturar mensual directo via Nubox
```

**Rama enterprise (con OC + HES):**

```
Cotizacion aprobada → OC recibida → Mes 1: HES → Facturar
                                     Mes 2: HES → Facturar
                                     ...
```

El sistema detecta cual rama aplica segun si `purchase_orders` tiene registros para esa cotizacion.

---

## 11A. Revenue metrics: MRR, ARR, TCV, ACV (v2)

### 11A.1. Proposito

Una cotizacion tiene multiples "valores" segun quien la mira: el PDF muestra un precio mensual, Finance necesita MRR/ARR para medir salud del negocio recurrente, Comercial necesita TCV para medir pipeline, y HubSpot necesita un `amount` consistente. Todas estas metricas se derivan de los mismos campos base.

### 11A.2. Campos base → metricas derivadas

Las metricas se calculan desde 3 campos existentes de la cotizacion:

```
total_price              → precio del periodo base (lo que dice el PDF)
billing_frequency        → monthly | milestone | one_time
contract_duration_months → duracion total del contrato (null = indefinido)
```

Mas la clasificacion por item:

```
recurrence_type por line item → 'recurring' | 'one_time' | 'inherit'
```

### 11A.3. Formulas de calculo

| Metrica | Formula | Aplica a |
|---------|---------|----------|
| **MRR** | Suma de `subtotal_after_discount` de items recurrentes | Retainers, Staff Aug |
| **ARR** | `MRR × 12` | Retainers, Staff Aug |
| **TCV** | `MRR × contract_duration_months` + suma de items one-time | Todos |
| **ACV** | `TCV / ceil(contract_duration_months / 12)` | Contratos multi-anio |
| **revenue_type** | `recurring` si todos los items son recurrentes, `one_time` si todos son one-time, `hybrid` si hay mezcla | Todos |

**Resolucion de `recurrence_type: 'inherit'`:** hereda segun `billing_frequency` de la cotizacion. Si `billing_frequency = 'monthly'` → recurrente. Si `one_time` → one-time. Si `milestone` → one-time (cada hito se factura una vez).

**Contratos indefinidos** (`contract_duration_months = null`):
- TCV = null (no tiene sentido sin duracion)
- ACV = null
- MRR y ARR se calculan normalmente

### 11A.4. Contratos hibridos

Un contrato puede mezclar componentes recurrentes y one-time:

```
Ejemplo: "Retainer creativo $9.6M/mes + Setup inicial $5M (unico)"

Line items:
  1. Fee gestion         → recurrence_type: 'recurring'  → $3.200.000/mes
  2. Produccion 80h      → recurrence_type: 'recurring'  → $4.800.000/mes
  3. Adaptaciones 40h    → recurrence_type: 'recurring'  → $1.600.000/mes
  4. Setup plataforma    → recurrence_type: 'one_time'   → $5.000.000

Metricas derivadas:
  MRR:          $9.600.000 (solo items 1+2+3)
  ARR:          $115.200.000
  TCV:          $9.600.000 × 12 + $5.000.000 = $120.200.000
  ACV:          $120.200.000
  revenue_type: 'hybrid'
```

### 11A.5. Recalculo automatico

Las metricas se recalculan cada vez que:
- Se agrega, edita o elimina un line item
- Se cambia `billing_frequency` o `contract_duration_months`
- Se aplica o modifica un descuento (afecta `subtotal_after_discount`)
- Se crea una nueva version

El recalculo es sincronico (al guardar) — no es una projection reactiva. Los campos `mrr`, `arr`, `tcv`, `acv`, `revenue_type` se persisten en `quotations` para queries rapidas.

### 11A.6. Revenue metric config (sync HubSpot)

El `amount` que se pushea al deal de HubSpot es configurable por BL:

```sql
CREATE TABLE greenhouse_commercial.revenue_metric_config (
  config_id            TEXT PRIMARY KEY DEFAULT 'rmc-' || gen_random_uuid(),
  business_line_code   TEXT,                  -- null = global default
  hubspot_amount_metric TEXT NOT NULL DEFAULT 'tcv'
    CHECK (hubspot_amount_metric IN ('mrr', 'arr', 'tcv', 'acv')),
  pipeline_default_metric TEXT NOT NULL DEFAULT 'mrr'
    CHECK (pipeline_default_metric IN ('mrr', 'arr', 'tcv', 'acv')),
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_line_code)
);
```

Ejemplo de configuracion:

| BL | HubSpot amount | Pipeline default | Razon |
|----|---------------|-----------------|-------|
| Global (null) | TCV | MRR | Default conservador |
| Wave | TCV | MRR | Contratos de delivery con duracion definida |
| Reach | MRR | MRR | Media tiene pass-through; el TCV distorsiona |
| Globe | TCV | ARR | Contratos creativos anuales |
| Efeonce Digital | ARR | MRR | Consultoria con vision anual |

### 11A.7. HubSpot deal sync — mapeo de metricas

| HubSpot property | Greenhouse source | Sync | Notas |
|-----------------|------------------|------|-------|
| `amount` | Segun `revenue_metric_config.hubspot_amount_metric` | GH → HS | Configurable por BL |
| `hs_mrr` | `quotation.mrr` | GH → HS | Propiedad nativa de HubSpot |
| `hs_arr` | `quotation.arr` | GH → HS | Propiedad nativa de HubSpot |
| `hs_tcv` | `quotation.tcv` | GH → HS | Custom property si no existe |
| `hs_acv` | `quotation.acv` | GH → HS | Custom property si no existe |
| `recurringrevenuedealtype` | `quotation.revenue_type` mapping: recurring→`existing`, one_time→`newbusiness` | GH → HS | Alimenta HubSpot recurring revenue analytics |
| `hs_deal_stage_probability` | De tabla de probabilidades §14.2 | GH → HS | |

**Regla:** costo y margen nunca se pushean a HubSpot. Solo metricas de revenue y deal metadata.

### 11A.8. Impacto en pipeline dashboard (§14)

El pipeline dashboard debe permitir toggle entre metricas:

```
┌─ Pipeline view: [MRR ▾]  [ARR]  [TCV]  [ACV] ────────────────┐
│                                                                 │
│  Draft:     $12.400.000 MRR  ░░░░░░░░░░░░ (3 cotizaciones)    │
│  Sent:      $28.600.000 MRR  ░░░░░░░░░░░░░░░░░ (5)            │
│  Approved:  $45.200.000 MRR  ░░░░░░░░░░░░░░░░░░░░░░░ (8)      │
│                                                                 │
│  Pipeline ponderado: $32.180.000 MRR                           │
│  ARR equivalente:    $386.160.000                              │
│                                                                 │
│  Metricas clave:                                               │
│  ├── ARR activo (converted):        $542.400.000               │
│  ├── ARR en riesgo (renewal due):    $86.400.000               │
│  └── ARR nuevo en pipeline:         $148.800.000               │
└─────────────────────────────────────────────────────────────────┘
```

La columna `weighted_value` en `revenue_pipeline` se calcula segun la metrica seleccionada: `weighted_mrr`, `weighted_tcv`, etc. Para evitar multiplicar columnas, el pipeline materializa `mrr`, `arr`, `tcv`, `acv` y el dashboard multiplica por `probability_pct` al renderizar.

### 11A.9. Impacto en profitability tracking (§15)

El profitability tracking compara usando la metrica que corresponda al `revenue_type`:

| revenue_type | Metrica de comparacion | Logica |
|-------------|----------------------|--------|
| `recurring` | MRR cotizado vs MRR facturado por mes | La unidad natural del retainer |
| `one_time` | TCV cotizado vs total facturado acumulado | El proyecto se mide al cierre |
| `hybrid` | MRR recurrente + avance de items one-time por separado | Dos tracks en paralelo |

---

## 12. Approval workflow (v2)

### 12.1. Modelo: aprobacion por excepcion

El flujo default no requiere aprobacion — un Account Lead crea, edita y envia. Los approval steps se activan solo cuando una condicion de riesgo lo dispara.

```
Draft ──→ [health check] ──→ Sin alertas bloqueantes ──→ Enviada
                │
                └── Alerta bloqueante detectada ──→ Pending Approval
                                                        │
                         ┌──────────────────────────────┤
                         ↓                              ↓
                    Step 1: Finance              Step 2: Efeonce Admin
                    (margen < floor)             (monto > threshold)
                         │                              │
                    Aprobado / Rechazado          Aprobado / Rechazado
                         │                              │
                         └──────── Todos aprobados ─────┘
                                        │
                                   Enviada
```

### 12.2. Tablas

```sql
CREATE TABLE greenhouse_commercial.approval_policies (
  policy_id          TEXT PRIMARY KEY DEFAULT 'ap-' || gen_random_uuid(),
  business_line_code TEXT,                   -- null = aplica a todas las BL
  pricing_model      TEXT,                   -- null = aplica a todos los modelos
  condition_type     TEXT NOT NULL CHECK (condition_type IN (
    'margin_below_floor', 'margin_below_target', 'amount_above_threshold',
    'discount_above_threshold', 'always'
  )),
  threshold_value    NUMERIC(14,2),          -- monto o % segun condition
  required_role      TEXT NOT NULL,          -- 'finance' | 'efeonce_admin'
  step_order         INTEGER NOT NULL DEFAULT 1,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_commercial.approval_steps (
  step_id          TEXT PRIMARY KEY DEFAULT 'as-' || gen_random_uuid(),
  quotation_id     TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  version_number   INTEGER NOT NULL,
  policy_id        TEXT REFERENCES greenhouse_commercial.approval_policies(policy_id),
  step_order       INTEGER NOT NULL,
  required_role    TEXT NOT NULL,
  assigned_to      TEXT,                     -- user_id especifico (nullable = cualquiera con el rol)
  condition_label  TEXT NOT NULL,            -- "Margen 18% por debajo del floor 20%"
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  decided_by       TEXT,
  decided_at       TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approval_steps_quotation ON greenhouse_commercial.approval_steps (quotation_id, version_number);
CREATE INDEX idx_approval_steps_pending ON greenhouse_commercial.approval_steps (status) WHERE status = 'pending';
```

### 12.3. Evaluacion de approval

Al intentar enviar una cotizacion, el sistema:
1. Ejecuta el discount health check
2. Busca `approval_policies` que apliquen a esta BL + modelo
3. Evalua cada condicion contra los totales de la cotizacion
4. Si alguna condicion se cumple, crea `approval_steps` y pone la cotizacion en `status = 'pending_approval'`
5. Notifica a los aprobadores (evento outbox + in-app notification)
6. Cuando todos los steps estan `approved`, la cotizacion pasa a `sent` automaticamente

Si un step es `rejected`, la cotizacion vuelve a `draft` con las notas del aprobador visibles.

---

## 13. Capacity check (v2)

### 13.1. Verificacion al asignar personas

Al agregar un `line_type: 'person'` con `member_id`, el sistema consulta assignments activos y capacity economics:

```typescript
interface CapacityCheckResult {
  memberId: string
  memberName: string
  currentFteAllocated: number        // suma de assignments activos
  maxFte: number                     // tipicamente 1.0
  availableFte: number               // maxFte - currentFteAllocated
  requestedFte: number               // lo que pide esta cotizacion
  feasible: boolean                  // availableFte >= requestedFte
  overallocationPct: number | null   // si no es feasible, cuanto excede
  conflicts: CapacityConflict[]
}

interface CapacityConflict {
  spaceId: string
  spaceName: string
  organizationName: string | null
  fteAllocation: number
  assignmentEndDate: string | null   // null = indefinido
  isTemporary: boolean               // true si tiene end date
}
```

### 13.2. Comportamiento

| Resultado | UI | Bloqueo |
|-----------|-----|---------|
| `feasible = true` | Check verde | No |
| `feasible = false`, conflictos temporales que terminan antes del inicio de esta cotizacion | Warning amarillo: "Disponible a partir de {fecha}" | No |
| `feasible = false`, conflictos indefinidos | Warning rojo: "Sobre-asignacion de {X}% — {N} conflicto(s) activos" | No (warning, no bloqueo) |

No se bloquea la cotizacion por sobre-asignacion — el comercial puede tener razones (rotacion planificada, ramp-down en otro cliente). Pero la informacion es visible y queda registrada.

### 13.3. Fuentes de datos

- `greenhouse_core.assignments` — assignments activos con FTE allocation
- `greenhouse_hr.member_capacity_economics` — costo loaded y horas contratadas
- No se crea tabla nueva — es query-time

### 13.4. Sinergia con modulos existentes

- **Space 360 TeamTab:** misma data de capacity, misma fuente
- **Agency Staffing Engine:** el staffing engine ya calcula gaps por servicio; la cotizacion consume el mismo calculo
- **Payroll:** no comprometer personas cuyo costo no se puede cubrir

---

## 14. Revenue pipeline y forecast (v2)

### 14.1. Pipeline como projection reactiva

El pipeline de revenue se materializa como una projection reactiva (mismo patron que `commercial_cost_attribution`):

```sql
CREATE TABLE greenhouse_commercial.revenue_pipeline (
  pipeline_id          TEXT PRIMARY KEY DEFAULT 'rp-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  organization_id      TEXT NOT NULL,
  organization_name    TEXT,
  business_line_code   TEXT NOT NULL,
  pricing_model        TEXT NOT NULL,
  currency             TEXT NOT NULL,
  status               TEXT NOT NULL,

  -- Valores base
  total_price          NUMERIC(14,2) NOT NULL,
  probability_pct      NUMERIC(5,2) NOT NULL,
  expected_close_date  DATE,

  -- Revenue metrics (derivados de §11A)
  revenue_type         TEXT NOT NULL,             -- recurring | one_time | hybrid
  mrr                  NUMERIC(14,2),             -- Monthly Recurring Revenue
  arr                  NUMERIC(14,2),             -- Annual Recurring Revenue
  tcv                  NUMERIC(14,2),             -- Total Contract Value
  acv                  NUMERIC(14,2),             -- Annual Contract Value
  -- El dashboard multiplica por probability_pct al renderizar; no se persiste weighted por metrica

  -- Tracking
  days_in_current_stage INTEGER,
  created_at           TIMESTAMPTZ NOT NULL,       -- de la cotizacion
  last_status_change   TIMESTAMPTZ,
  materialized_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pipeline_org ON greenhouse_commercial.revenue_pipeline (organization_id);
CREATE INDEX idx_pipeline_bl ON greenhouse_commercial.revenue_pipeline (business_line_code);
CREATE INDEX idx_pipeline_status ON greenhouse_commercial.revenue_pipeline (status);
```

### 14.2. Probabilidades por status

| Status | Probabilidad | Logica |
|--------|-------------|--------|
| `draft` | 10% | Intento inicial, puede no enviarse |
| `pending_approval` | 20% | En revision interna |
| `sent` | 30% | Enviada, esperando respuesta |
| `approved` (sin OC) | 80% | Aprobada pero sin documento formal |
| OC recibida (`purchase_orders` exists) | 95% | Compromiso formal del cliente |
| `converted` | 100% | Servicio activo |
| `rejected` / `expired` | 0% | Perdida |

### 14.3. Dashboard de pipeline

El pipeline alimenta un dashboard con:
- **Pipeline total ponderado** por mes/quarter
- **Pipeline por BL** (Wave, Globe, Reach, Efeonce Digital)
- **Conversion funnel** por etapa (cuantas pasan de sent → approved → converted)
- **Aging** de cotizaciones (dias promedio en cada estado)
- **Forecast vs actual** — pipeline proyectado vs revenue facturado real

### 14.4. Projection event triggers

La projection se rematerializa cuando cambian:
- `commercial.quotation.created/sent/approved/rejected/expired/converted`
- `commercial.purchase_order.received`
- `commercial.quotation.version_created` (puede cambiar amount)

---

## 15. Profitability tracking: cotizado vs ejecutado (v2)

### 15.1. Proposito

El margin drift — la diferencia entre el margen cotizado y el margen real ejecutado — es un KPI de primer nivel que hoy no existe en ningun modulo. El profitability tracker cierra ese gap.

### 15.2. Tabla

```sql
CREATE TABLE greenhouse_commercial.profitability_tracking (
  tracking_id         TEXT PRIMARY KEY DEFAULT 'pt-' || gen_random_uuid(),
  quotation_id        TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  organization_id     TEXT NOT NULL,
  business_line_code  TEXT NOT NULL,
  period_year         INTEGER NOT NULL,
  period_month        INTEGER NOT NULL,

  -- Cotizado (snapshot de la version aprobada)
  quoted_price        NUMERIC(14,2) NOT NULL,
  quoted_cost         NUMERIC(14,2) NOT NULL,
  quoted_margin_pct   NUMERIC(5,2) NOT NULL,
  quoted_hours        NUMERIC(8,2),
  quoted_headcount    INTEGER,

  -- Ejecutado (desde finance + cost attribution)
  actual_revenue      NUMERIC(14,2),          -- desde finance.income
  actual_cost         NUMERIC(14,2),          -- desde commercial_cost_attribution
  actual_margin_pct   NUMERIC(5,2),
  actual_hours        NUMERIC(8,2),           -- desde time tracking / ICO
  actual_headcount    INTEGER,                -- desde assignments activos

  -- Drift
  margin_drift_pct    NUMERIC(5,2),           -- actual_margin - quoted_margin
  revenue_drift_pct   NUMERIC(5,2),
  cost_drift_pct      NUMERIC(5,2),
  hours_drift_pct     NUMERIC(5,2),

  -- Diagnostico
  drift_drivers       JSONB,                  -- causas identificadas automaticamente
  drift_severity      TEXT CHECK (drift_severity IN ('on_track', 'minor_drift', 'significant_drift', 'critical')),

  materialized_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quotation_id, period_year, period_month)
);

CREATE INDEX idx_profitability_org ON greenhouse_commercial.profitability_tracking (organization_id, period_year, period_month);
CREATE INDEX idx_profitability_severity ON greenhouse_commercial.profitability_tracking (drift_severity) WHERE drift_severity IN ('significant_drift', 'critical');
```

### 15.3. Drift drivers (diagnostico automatico)

El sistema identifica automaticamente las causas del drift:

```typescript
type DriftDriver =
  | { type: 'headcount_change'; detail: string; impact_pct: number }    // rotacion de persona
  | { type: 'rate_mismatch'; detail: string; impact_pct: number }       // tarifa real != cotizada
  | { type: 'scope_creep'; detail: string; impact_pct: number }         // horas reales > cotizadas
  | { type: 'fx_variance'; detail: string; impact_pct: number }         // tipo de cambio se movio
  | { type: 'overhead_increase'; detail: string; impact_pct: number }   // overhead subio
  | { type: 'discount_absorbed'; detail: string; impact_pct: number }   // descuento mayor al planeado
```

### 15.4. Severity rules

| Condicion | Severity | Accion |
|-----------|----------|--------|
| `|margin_drift| <= 3pp` | `on_track` | Solo informativo |
| `3pp < |margin_drift| <= 8pp` | `minor_drift` | Warning en dashboard |
| `8pp < |margin_drift| <= 15pp` | `significant_drift` | Alerta a Account Lead + Finance |
| `|margin_drift| > 15pp` | `critical` | Alerta critica, requiere plan de accion |

### 15.5. Materialization trigger

Projection reactiva que se rematerializa:
- Al cierre de cada periodo de payroll (`payroll_period.calculated`)
- Al registrar income para el cliente (`finance.income.created`)
- Al cambiar assignments del cliente (`assignment.created/updated`)

---

## 16. Renewal lifecycle (v2)

### 16.1. Campos adicionales en quotations

```sql
ALTER TABLE greenhouse_commercial.quotations ADD COLUMN
  renewal_of_quotation_id TEXT REFERENCES greenhouse_commercial.quotations(quotation_id);
ALTER TABLE greenhouse_commercial.quotations ADD COLUMN
  renewal_alert_days INTEGER DEFAULT 60;
ALTER TABLE greenhouse_commercial.quotations ADD COLUMN
  auto_generate_renewal BOOLEAN DEFAULT FALSE;
```

### 16.2. Flujo de renovacion

```
Cotizacion converted (status = 'converted')
  │
  ├── T-60 dias de valid_until
  │     → Evento: commercial.quotation.renewal_due
  │     → Notification a Account Lead: "Retainer Sky Airline vence en 60 dias"
  │
  ├── T-30 dias (si auto_generate_renewal = true)
  │     → Crear draft de renovacion automaticamente:
  │        - Clona line items de la version vigente
  │        - Aplica escalamiento (IPC o negociado)
  │        - Establece renewal_of_quotation_id = cotizacion original
  │        - Notifica al Account Lead: "Borrador de renovacion creado"
  │
  └── T-0 (valid_until alcanzado sin renovacion)
        → Evento: commercial.quotation.expired_without_renewal
        → Alerta critica a Account Lead + Finance
        → Cotizacion original pasa a status = 'expired'
```

### 16.3. Cron job

Procesado por el ops-worker como scheduled job:

```
POST /api/cron/commercial-renewal-check
  → Busca: status = 'converted' AND valid_until BETWEEN NOW() AND NOW() + max(renewal_alert_days)
  → Para cada match:
    - Si days_until_expiry <= renewal_alert_days AND no hay renewal draft ya creado:
      publicar commercial.quotation.renewal_due
    - Si days_until_expiry <= 30 AND auto_generate_renewal AND no hay renewal draft:
      crear draft de renovacion
    - Si days_until_expiry <= 0:
      marcar expired, publicar commercial.quotation.expired_without_renewal
```

---

## 17. Terms & conditions library (v2)

### 17.1. Tabla

```sql
CREATE TABLE greenhouse_commercial.terms_library (
  term_id            TEXT PRIMARY KEY DEFAULT 'tm-' || gen_random_uuid(),
  term_code          TEXT NOT NULL UNIQUE,    -- 'payment_30d', 'replacement_15d', 'scope_change'
  category           TEXT NOT NULL CHECK (category IN ('payment', 'delivery', 'legal', 'staffing', 'sla', 'general')),
  title              TEXT NOT NULL,           -- "Condiciones de pago"
  body_template      TEXT NOT NULL,           -- "Facturacion mensual anticipada. Pago a {{payment_terms_days}} dias."
  applies_to_model   TEXT,                    -- 'staff_aug' | 'retainer' | 'project' | null (todas)
  default_for_bl     TEXT[],                  -- BLs donde se incluye por defecto (ej: {'EO-BL-WAVE', 'EO-BL-GLOBE'})
  required           BOOLEAN NOT NULL DEFAULT FALSE, -- no se puede quitar de la cotizacion
  sort_order         INTEGER NOT NULL DEFAULT 100,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  version            INTEGER NOT NULL DEFAULT 1,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_commercial.quotation_terms (
  quotation_term_id  TEXT PRIMARY KEY DEFAULT 'qt-' || gen_random_uuid(),
  quotation_id       TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  term_id            TEXT NOT NULL REFERENCES greenhouse_commercial.terms_library(term_id),
  body_resolved      TEXT NOT NULL,           -- template con variables reemplazadas
  sort_order         INTEGER NOT NULL,
  included           BOOLEAN NOT NULL DEFAULT TRUE, -- false = excluido por el comercial
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotation_terms_qt ON greenhouse_commercial.quotation_terms (quotation_id);
```

### 17.2. Flujo

1. Al crear cotizacion, el sistema precarga `terms_library` donde `active = true` AND (`applies_to_model` = pricing_model OR null) AND (business_line_code IN `default_for_bl` OR `default_for_bl` is null)
2. Resuelve variables del template: `{{payment_terms_days}}` → 30, `{{contract_duration}}` → "12 meses"
3. El comercial puede quitar terminos no-required (`included = false`), reordenar, o agregar terminos adicionales
4. Los terminos `required = true` no se pueden excluir
5. El PDF renderiza solo los terminos con `included = true`, ordenados por `sort_order`

### 17.3. Variables de template disponibles

| Variable | Fuente |
|----------|--------|
| `{{payment_terms_days}}` | `quotations.payment_terms_days` |
| `{{contract_duration}}` | `quotations.contract_duration_months` + " meses" |
| `{{billing_frequency}}` | "mensual" / "por hito" / "unico" |
| `{{valid_until}}` | `quotations.valid_until` formateado |
| `{{organization_name}}` | Nombre de la organizacion |
| `{{escalation_pct}}` | `quotations.escalation_pct` + "%" |

---

## 18. Audit trail (v2)

### 18.1. Tabla

```sql
CREATE TABLE greenhouse_commercial.quotation_audit_log (
  log_id           TEXT PRIMARY KEY DEFAULT 'al-' || gen_random_uuid(),
  quotation_id     TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  action           TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'status_changed',
    'line_item_added', 'line_item_updated', 'line_item_removed',
    'discount_changed', 'terms_changed',
    'version_created', 'pdf_generated', 'sent',
    'approval_requested', 'approval_decided',
    'po_received', 'hes_received', 'invoice_triggered',
    'renewal_generated', 'expired'
  )),
  actor_user_id    TEXT NOT NULL,
  actor_name       TEXT NOT NULL,
  details          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_quotation ON greenhouse_commercial.quotation_audit_log (quotation_id, created_at DESC);
CREATE INDEX idx_audit_actor ON greenhouse_commercial.quotation_audit_log (actor_user_id);
```

### 18.2. Que se registra

| Accion | details JSONB |
|--------|--------------|
| `line_item_updated` | `{ lineItemId, field: 'unit_price', old: 85, new: 80, currency: 'USD' }` |
| `discount_changed` | `{ level: 'item', lineItemId, discountType: 'percentage', old: 5, new: 10 }` |
| `status_changed` | `{ from: 'draft', to: 'sent' }` |
| `approval_decided` | `{ stepId, decision: 'approved', notes: '...' }` |
| `version_created` | `{ fromVersion: 1, toVersion: 2, totalPriceDelta: 3100, marginDelta: -4.1 }` |

### 18.3. Diferencia con outbox y versionamiento

| Mecanismo | Proposito | Granularidad | Inmutable |
|-----------|----------|--------------|-----------|
| **Outbox events** | Trigger consumers (notifications, sync) | Por evento de negocio | Si |
| **Versions** | Snapshot completo para comparar | Por version (v1, v2...) | Si |
| **Audit log** | Registro de quien cambio que y cuando | Por campo editado | Si |

Los tres coexisten — cada uno sirve un proposito distinto.

---

## 19. Quote templates (v2)

### 19.1. Tablas

```sql
CREATE TABLE greenhouse_commercial.quote_templates (
  template_id            TEXT PRIMARY KEY DEFAULT 'tmpl-' || gen_random_uuid(),
  template_name          TEXT NOT NULL,        -- "Retainer creativo Globe 80h"
  template_code          TEXT NOT NULL UNIQUE,  -- "TMPL-RETAINER-GLOBE-80H"
  business_line_code     TEXT,
  pricing_model          TEXT NOT NULL CHECK (pricing_model IN ('staff_aug', 'retainer', 'project')),
  default_currency       TEXT NOT NULL DEFAULT 'CLP',
  default_billing_frequency TEXT NOT NULL DEFAULT 'monthly',
  default_payment_terms_days INTEGER NOT NULL DEFAULT 30,
  default_contract_duration_months INTEGER,
  default_conditions_text TEXT,
  default_term_ids       TEXT[],               -- term_ids de la library a precargar
  description            TEXT,
  active                 BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count            INTEGER NOT NULL DEFAULT 0,   -- cuantas veces se ha usado
  created_by             TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE greenhouse_commercial.quote_template_items (
  template_item_id   TEXT PRIMARY KEY DEFAULT 'tmpi-' || gen_random_uuid(),
  template_id        TEXT NOT NULL REFERENCES greenhouse_commercial.quote_templates(template_id),
  product_id         TEXT REFERENCES greenhouse_commercial.product_catalog(product_id),
  line_type          TEXT NOT NULL CHECK (line_type IN ('person', 'role', 'deliverable', 'direct_cost')),
  label              TEXT NOT NULL,
  description        TEXT,
  role_code          TEXT,
  suggested_hours    NUMERIC(8,2),
  unit               TEXT NOT NULL DEFAULT 'hour',
  quantity           NUMERIC(10,2) NOT NULL DEFAULT 1,
  default_margin_pct NUMERIC(5,2),        -- sugerencia para el costing-engine
  default_unit_price NUMERIC(14,2),       -- precio explícito opcional; si != null gana al instanciar
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_items ON greenhouse_commercial.quote_template_items (template_id);
```

**Resolución de precio al instanciar un template (v2 — TASK-348):** el template guarda AMBOS `default_margin_pct` (sugerencia) y `default_unit_price` (precio explícito opcional). El orchestrator al aplicar el template:

1. Si `default_unit_price` está presente → lo usa directo como `unit_price` de la line item.
2. Si `default_unit_price` es null → el costing-engine calcula `unit_cost` desde role rate card y luego `unit_price = unit_cost / (1 - default_margin_pct/100)`.
3. Si ambos son null → solo se pre-popula la estructura y el comercial completa manualmente.

Esta doble opción permite templates rígidos (por ejemplo "Onboarding fijo $5M") coexistiendo con templates variables (por ejemplo "Retainer creativo con margen objetivo 35%").

### 19.2. Flujo de uso

```
1. "Nueva cotizacion para Sky Airline"
2. Seleccionar BL: Globe
3. El sistema muestra templates disponibles para Globe:
   - "Retainer creativo Globe 80h" (usado 12 veces)
   - "Retainer creativo Globe 120h" (usado 5 veces)
   - "Proyecto creativo on-demand" (usado 8 veces)
   - [En blanco]
4. Seleccionar "Retainer creativo Globe 80h"
5. El sistema precarga:
   - 3 line items (fee gestion, produccion 80h, adaptaciones 40h)
   - Moneda: CLP
   - Billing: monthly
   - Payment terms: 30 dias
   - Terminos: payment_30d, scope_change, confidentiality
   - Margen target de Globe: 40%
6. El comercial ajusta para este cliente
```

### 19.3. Crear template desde cotizacion existente

Flujo inverso: "Guardar como template" desde una cotizacion aprobada. El sistema:
1. Extrae los line items como `quote_template_items` (sin persona asignada, con role_code)
2. Copia billing frequency, payment terms, conditions, terms
3. Pide al usuario un nombre y codigo de template
4. Lo registra como nuevo template reutilizable

---

## 20. Eventos outbox (consolidado v2)

| Evento | Trigger | Consumers |
|--------|---------|-----------|
| `commercial.quotation.created` | Crear draft | Notifications → Account Lead, audit log |
| `commercial.quotation.sent` | Enviar al cliente | HubSpot sync (deal stage), Notifications |
| `commercial.quotation.approved` | Aprobada (post-approval) | HubSpot sync, crear service module, crear assignments |
| `commercial.quotation.rejected` | Rechazada | HubSpot sync, Notifications |
| `commercial.quotation.expired` | Vencida sin renovacion | Notifications → Account Lead + Finance |
| `commercial.quotation.converted` | Convertida a servicio | Pipeline projection, profitability tracking |
| `commercial.quotation.version_created` | Nueva version | HubSpot sync (update amount), audit log |
| `commercial.quotation.renewal_due` | T-60 dias de vencimiento | Notifications → Account Lead |
| `commercial.quotation.expired_without_renewal` | Vencida sin draft de renovacion | Alerta critica → Account Lead + Finance |
| `commercial.quotation.approval_requested` | Health check dispara approval | Notifications → aprobadores |
| `commercial.quotation.approval_decided` | Aprobador decide | Notifications → creador, audit log |
| `commercial.quotation.po_linked` (TASK-350) | OC vinculada a cotización canónica | Audit log, profitability tracking, ops notifications |
| `commercial.quotation.hes_linked` (TASK-350) | HES vinculada a cotización canónica (explícito o heredado del PO) | Audit log, profitability tracking |
| `commercial.quotation.invoice_emitted` (TASK-350) | Factura materializada desde quote (rama simple) o desde HES (rama enterprise) | Pipeline projection, profitability tracking, Nubox emission follow-up |
| `commercial.purchase_order.received` | Registrar OC (legacy namespace) | Notifications → Finance, pipeline projection |
| `commercial.service_entry.received` | Registrar HES (legacy namespace) | Notifications → Finance |
| `commercial.service_entry.invoiced` | Facturar (legacy namespace) | Nubox integration, finance.income |
| `commercial.product.created` | Crear producto | HubSpot sync (si sync habilitado) |
| `commercial.product.updated` | Actualizar producto | HubSpot sync |
| `commercial.discount.health_alert` | Descuento riesgoso | Notifications → Finance, audit log |

---

## 21. Permisos (consolidado v2)

| Accion | Roles permitidos |
|--------|-----------------|
| Ver cotizaciones de su organizacion | Account Lead, Ops Lead, Finance, Efeonce Admin |
| Crear cotizacion draft | Account Lead, Ops Lead |
| Crear cotizacion desde template | Account Lead, Ops Lead |
| Editar line items y precios | Account Lead, Finance |
| Ver costos y margenes (capa interna) | Finance, Efeonce Admin |
| Ver audit trail | Finance, Efeonce Admin |
| Aplicar descuentos | Account Lead, Finance |
| Enviar cotizacion (generar PDF) | Account Lead |
| Aprobar cotizacion (approval step) | Segun `required_role` del step |
| Registrar OC recibida | Account Lead, Ops Lead |
| Registrar HES recibida | Ops Lead, Delivery Lead |
| Trigger facturacion (Nubox) | Finance |
| CRUD de product catalog | Finance, Efeonce Admin |
| CRUD de margin targets | Efeonce Admin |
| CRUD de role rate cards | Finance, Efeonce Admin |
| CRUD de terms library | Finance, Efeonce Admin |
| CRUD de quote templates | Account Lead, Finance, Efeonce Admin |
| CRUD de approval policies | Efeonce Admin |
| CRUD de revenue metric config | Efeonce Admin |
| Ver pipeline y forecast | Account Lead, Finance, Efeonce Admin |
| Ver profitability tracking | Finance, Efeonce Admin |

---

## 22. API routes (consolidado v2)

```
# ── Cotizaciones ──
/api/commercial/quotations                              GET (list), POST (create)
/api/commercial/quotations/[id]                         GET, PUT, DELETE
/api/commercial/quotations/[id]/send                    POST (generar PDF + cambiar status)
/api/commercial/quotations/[id]/approve                 POST (approval step decision)
/api/commercial/quotations/[id]/reject                  POST
/api/commercial/quotations/[id]/version                 POST (crear nueva version)
/api/commercial/quotations/[id]/versions                GET (historial + diffs)
/api/commercial/quotations/[id]/pdf                     GET (descargar PDF version vigente)
/api/commercial/quotations/[id]/health                  GET (discount health check)
/api/commercial/quotations/[id]/capacity-check          GET (verificar disponibilidad de personas)
/api/commercial/quotations/[id]/audit                   GET (audit trail)
/api/commercial/quotations/[id]/save-as-template        POST (guardar como template)

# ── Line items ──
/api/commercial/quotations/[id]/line-items              GET, POST
/api/commercial/quotations/[id]/line-items/[itemId]     PUT, DELETE

# ── Cadena documental ──
/api/commercial/purchase-orders                         GET (list by quotation)
/api/commercial/purchase-orders/[id]                    GET, POST, PUT
/api/commercial/service-entries                         GET (list by quotation/PO)
/api/commercial/service-entries/[id]                    GET, POST, PUT
/api/commercial/service-entries/[id]/invoice            POST (trigger facturacion)

# ── Catalogo ──
/api/commercial/products                                GET (catalog), POST
/api/commercial/products/[id]                           GET, PUT, DELETE
/api/commercial/products/[id]/sync                      POST (sync a HubSpot)

# ── Configuracion ──
/api/commercial/margin-targets                          GET, POST
/api/commercial/margin-targets/[id]                     PUT
/api/commercial/rate-cards                              GET, POST
/api/commercial/rate-cards/[id]                         PUT, DELETE
/api/commercial/terms                                   GET, POST
/api/commercial/terms/[id]                              PUT, DELETE
/api/commercial/approval-policies                       GET, POST
/api/commercial/approval-policies/[id]                  PUT, DELETE

# ── Templates ──
/api/commercial/templates                               GET, POST
/api/commercial/templates/[id]                          GET, PUT, DELETE

# ── Intelligence ──
/api/commercial/pipeline                                GET (revenue pipeline dashboard)
/api/commercial/profitability                           GET (cotizado vs ejecutado)
/api/commercial/profitability/[quotationId]             GET (detalle por cotizacion)

# ── Revenue metrics config ──
/api/commercial/revenue-metric-config                   GET, POST
/api/commercial/revenue-metric-config/[id]              PUT

# ── Cron ──
/api/cron/commercial-renewal-check                      POST (procesado por ops-worker)
```

---

## 23. Relacion con modulos existentes (v2)

```
                    ┌─────────────────┐
                    │    Payroll +     │
                    │  Capacity Econ   │
                    │ (costo loaded)   │
                    └────────┬────────┘
                             │ unit_cost + capacity check
                             ▼
┌──────────┐     ┌────────────────────────────────┐     ┌──────────────┐
│ HubSpot  │◄───►│     COMMERCIAL MODULE          │────►│   Nubox      │
│ (deals,  │     │                                │     │ (facturacion)│
│ products)│     │  product_catalog               │     └──────────────┘
└──────────┘     │  quote_templates               │              │
                 │  quotations + line_items        │              ▼
                 │  approval_policies + steps      │     ┌──────────────┐
                 │  purchase_orders               │     │   Finance    │
                 │  service_entries               │────►│   (income,   │
                 │  margin_targets + rate_cards    │     │    P&L)      │
                 │  terms_library                  │     └──────┬───────┘
                 │  audit_log                      │            │
                 │  revenue_pipeline ◄─────────────┼────────────┘
                 │  profitability_tracking ◄────────┼── cost_attribution
                 └────────────────────────────────┘
                             │
                             │ assignments + capacity
                             ▼
                    ┌─────────────────┐
                    │   Agency /      │
                    │   Space 360     │◄── pipeline dashboard
                    │ (team, delivery)│
                    └─────────────────┘
```

---

## 24. Inventory de tablas del schema `greenhouse_commercial`

| # | Tabla | Proposito | Seccion |
|---|-------|----------|---------|
| 1 | `margin_targets` | Target y floor de margen por BL | §3.1 |
| 2 | `product_catalog` | Catalogo de productos (sync HubSpot) | §3.2 |
| 3 | `product_overhead_defaults` | Overhead directo por producto | §3.3 |
| 4 | `quotations` | Cotizaciones con status, moneda, descuentos | §3.4 |
| 5 | `quotation_versions` | Snapshots + diffs entre versiones | §3.5 |
| 6 | `quotation_line_items` | Line items con costeo y pricing | §3.6 |
| 7 | `purchase_orders` | Ordenes de compra (OC) | §3.7 |
| 8 | `service_entries` | Hojas de entrada de servicio (HES) | §3.8 |
| 9 | `role_rate_cards` | Tarifas por rol + seniority + BL | §4.3 |
| 10 | `approval_policies` | Reglas de aprobacion por BL | §12.2 |
| 11 | `approval_steps` | Steps de aprobacion por cotizacion | §12.2 |
| 12 | `revenue_pipeline` | Pipeline de revenue materializado | §14.2 |
| 13 | `profitability_tracking` | Cotizado vs ejecutado por periodo | §15.2 |
| 14 | `terms_library` | Catalogo de terminos y condiciones | §17.1 |
| 15 | `quotation_terms` | Terminos aplicados a cada cotizacion | §17.1 |
| 16 | `quotation_audit_log` | Audit trail inmutable | §18.1 |
| 17 | `quote_templates` | Templates de cotizacion reutilizables | §19.1 |
| 18 | `quote_template_items` | Line items default de cada template | §19.1 |
| 19 | `revenue_metric_config` | Config de metrica para HubSpot amount y pipeline default por BL | §11A.6 |

**Total: 19 tablas** en schema `greenhouse_commercial`.

---

## 25. Glosario (v2)

| Termino | Significado |
|---------|------------|
| **Cotizacion** | Oferta formal de precio a un cliente. Tiene versiones, line items, terms y status |
| **OC (Orden de Compra)** | Documento del cliente que aprueba la cotizacion. Tiene numero, monto y PDF |
| **HES (Hoja de Entrada de Servicio)** | Documento del cliente que confirma la entrega del servicio en un periodo. Autoriza la facturacion |
| **Line item** | Un renglon de la cotizacion: persona, rol, entregable o costo directo |
| **Producto** | Item del catalogo reutilizable. Puede estar synced con HubSpot |
| **Template** | Cotizacion predefinida reutilizable con line items, terms y configuracion default |
| **Costo loaded** | Costo total de una persona: salario + cargas empleador + overhead directo + overhead estructural |
| **Margin target** | Margen objetivo por business line. Se hereda a cotizaciones como default |
| **Margin floor** | Margen minimo aceptable. Debajo de el, se activa approval workflow |
| **Rate card** | Tarifa de referencia por rol + seniority + BL. Se usa cuando no hay persona asignada |
| **Approval policy** | Regla que define cuando se requiere aprobacion y de quien |
| **Approval step** | Instancia de aprobacion pendiente o resuelta en una cotizacion |
| **Capacity check** | Verificacion de disponibilidad FTE de una persona antes de cotizarla |
| **Revenue pipeline** | Projection del revenue esperado de cotizaciones en vuelo, ponderado por probabilidad |
| **Profitability tracking** | Comparacion periodica entre margen cotizado y margen real ejecutado |
| **Margin drift** | Diferencia entre margen cotizado y margen ejecutado. KPI de primer nivel |
| **Drift driver** | Causa identificada automaticamente de un margin drift (rotacion, scope creep, FX) |
| **Escalamiento** | Ajuste periodico de precios por IPC o porcentaje negociado |
| **Discount health** | Evaluacion automatica del impacto del descuento sobre el margen |
| **MRR** | Monthly Recurring Revenue — ingreso mensual recurrente. Solo items con `recurrence_type = 'recurring'` |
| **ARR** | Annual Recurring Revenue — MRR × 12. Run-rate anual del negocio recurrente |
| **TCV** | Total Contract Value — valor total del contrato incluyendo items recurrentes y one-time |
| **ACV** | Annual Contract Value — TCV / anos del contrato. Para contratos multi-anio |
| **Revenue type** | Clasificacion de la cotizacion: `recurring` (todo recurrente), `one_time` (todo unico), `hybrid` (mezcla) |
| **Recurrence type** | Clasificacion por line item: `recurring`, `one_time`, o `inherit` (hereda de la cotizacion) |
| **Revenue metric config** | Configuracion por BL de que metrica se usa como `amount` en HubSpot y como default en pipeline |
| **Terms library** | Catalogo de clausulas legales/comerciales reutilizables con variables de template |
| **Renewal** | Cotizacion de renovacion generada automatica o manualmente al vencer un contrato |
