# Greenhouse EO — Finance Module Architecture V1

> **Version:** 1.0
> **Created:** 2026-03-30
> **Last updated:** 2026-04-19
> **Audience:** Backend engineers, finance product owners, agents implementing finance features

---

## Delta 2026-04-19 — Currency & FX Platform Foundation (TASK-475)

- Se formalizó la matriz canónica de monedas por dominio + política FX + contrato de readiness. El contrato vive en `src/lib/finance/currency-domain.ts` + `currency-registry.ts` y lo consumen el engine, las APIs y los futuros consumers client-facing.
- **Matriz por dominio** (`CURRENCY_DOMAIN_SUPPORT`):
  - `finance_core`: `['CLP', 'USD']` — estable, alineado con `FinanceCurrency` transaccional. NO se expande en esta task.
  - `pricing_output`: `['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN']` — superficie comercial multi-moneda.
  - `reporting`: `['CLP']` — CLP-normalizado por contrato (P&L, metric registry).
  - `analytics`: `['CLP']` — CLP-normalizado (`operational_pl`, `member_capacity_economics`, cost intelligence).
- **FX policy matrix** (`FX_POLICY_DEFAULT_BY_DOMAIN`):
  - `finance_core` → `rate_at_event` (snapshot al reconocer la transacción).
  - `pricing_output` → `rate_at_send` (congela tasa al emitir el artefacto client-facing).
  - `reporting`/`analytics` → `rate_at_period_close` (normaliza al cierre del período).
- **Readiness contract** (`FxReadiness`): estados `supported | supported_but_stale | unsupported | temporarily_unavailable`. Incluye `rate`, `rateDateResolved`, `source`, `ageDays`, `stalenessThresholdDays`, `composedViaUsd`, `message`.
- **Currency registry** (`src/lib/finance/currency-registry.ts`): policy declarativa por moneda — provider, fallback strategies (`inverse`, `usd_composition`, `none`), sync cadence, coverage class (`auto_synced` | `manual_only` | `declared_only`). Hoy `USD`/`CLP` = `auto_synced` (Mindicador + OpenER). `CLF`/`COP`/`MXN`/`PEN` = `manual_only` (pending provider wire-up).
- **Resolver canónico** (`src/lib/finance/fx-readiness.ts`): `resolveFxReadiness({from, to, rateDate, domain})`. Chain: identity → domain gate → direct lookup → inverse (si registry permite) → composición vía USD (si registry permite) → clasificación por threshold. Endpoint HTTP: `GET /api/finance/exchange-rates/readiness?from=X&to=Y&domain=pricing_output`.
- **Engine integration**: el pricing engine v2 llama a `resolvePricingOutputFxReadiness` al inicio del pipeline y emite structured warnings `fx_fallback` (`critical` si unsupported/temporarily_unavailable, `warning` si stale, `info` si composed via USD). El fallback silencioso `?? 1` queda como compat path pero el engine ya no depende de él para decidir; siempre pasa por readiness.
- **Compatibility rule**: los consumers CLP-normalizados existentes (`operational_pl`, `member_capacity_economics`, `tool-cost-reader` target CLP, payroll CLP/USD) NO cambian. Esta task solo endurece el contrato compartido y sus readers.
- **Escalabilidad**: agregar una moneda nueva requiere 3 edits: `CURRENCIES_ALL`, `CURRENCY_DOMAIN_SUPPORT[domain]` y una entrada en `CURRENCY_REGISTRY`. No hay hardcodes en engine/UI que tocar.

## Delta 2026-04-19 — Pricing / Commercial Cost Basis runtime split formalized

- Finance quotation pricing no debe absorber toda la carga de `Commercial Cost Basis` dentro de request-response.
- Contrato nuevo del lane:
  - `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` y sus consumers siguen siendo el carril de preview interactivo y composición de pricing en portal.
  - la materialización de snapshots role/tool/people/provider, el repricing batch y el feedback quoted-vs-actual pertenecen a un worker dedicado de Cloud Run.
- Regla operativa:
  - el quote builder puede leer snapshots, provenance y confidence ya resueltos;
  - no debe disparar recomputes pesados cross-domain cada vez que un usuario cambia una línea o variante comercial;
  - cualquier expansión del engine hacia workloads batch debe seguir la topología definida por `TASK-483`;
  - `ops-worker` no es el runtime base del lane comercial; su scope sigue siendo reactivo/operativo.

Implicación para el backlog:

- `TASK-477` a `TASK-482` ya no se interpretan como mejoras puramente in-app.
- La evolución del pricing lane debe respetar el split `interactive lane` vs `compute lane`.

## Delta 2026-04-18 — TASK-464c Tool Catalog + Overhead Addons Foundation

- Finance quotation pricing gana la capa de costos directos y fees complementarios que faltaba para el engine v2:
  - `greenhouse_ai.tool_catalog` ahora expone `tool_sku`, prorrateo, business lines y tags de aplicabilidad
  - `greenhouse_commercial.overhead_addons` modela los 9 fees/overheads de Efeonce fuera del catálogo de tools
- Implicación operativa:
  - el runtime actual de TASK-346 no cambia todavía su cálculo legacy
  - `TASK-464d` ya puede consumir herramientas y overheads desde stores canónicos, sin volver al Excel ni mezclar tool costs con markups/fees
- Guardrails explícitos:
  - el catálogo de tools sigue compartido con AI tooling; no se crea identidad paralela en Finance
  - los addons no viven en `greenhouse_finance.*`; se tratan como inputs comerciales del quote engine
  - reseed idempotente ya verificado para `26` tools activas y `9` addons

## Delta 2026-04-18 — TASK-464b Pricing Governance Tables

- Finance quotation pricing sigue sin cutover inmediato, pero gana la capa de governance que el engine v2 ya puede consumir:
  - `role_tier_margins`
  - `service_tier_margins`
  - `commercial_model_multipliers`
  - `country_pricing_factors`
  - `fte_hours_guide`
- Implicación operativa:
  - el runtime actual de TASK-346 no cambia su surface ni su storage legacy
  - `TASK-464d` ya puede resolver margen óptimo por tier, multiplicador comercial, factor país y equivalencia FTE↔horas sin volver al Excel
- Hallazgo relevante para downstream:
  - el seed dejó `21` drifts entre `role-tier-margins.csv` y `sellable_roles.tier`
  - esos drifts se tratan como señal de reconciliación, no como motivo para sobrescribir el catálogo canónico

## Delta 2026-04-18 — TASK-464a Sellable Roles Catalog Foundation

- Finance quotation pricing gana un backbone comercial más rico, pero sin cutover inmediato:
  - `greenhouse_commercial.role_rate_cards` sigue siendo la fuente consumida por el engine vigente de TASK-346.
  - `greenhouse_commercial.sellable_roles`, `employment_types`, `sellable_role_cost_components`, `role_employment_compatibility` y `sellable_role_pricing_currency` quedan listas para el refactor de TASK-464d.
- Implicación operativa:
  - Finance mantiene su contrato estable actual.
  - El programa pricing/revenue pipeline ya puede modelar costo por SKU `ECG-XXX`, modalidad contractual y moneda de venta sin crear identidades paralelas fuera del schema comercial.
- Guardrail explícito:
  - la foundation comercial no toca `greenhouse_payroll.*`; la convergencia de vocabulario con payroll queda aislada en TASK-468.

## Delta 2026-04-17 — TASK-345 Quotation canonical bridge materialized

- Finance quotations deja de depender solo de `greenhouse_finance.*` como storage leído por APIs.
- Estado nuevo del lane:
  - writers runtime siguen entrando por `greenhouse_finance.quotes`, `quote_line_items` y `products`
  - el anchor canónico ya existe en `greenhouse_commercial.*`
  - `GET /api/finance/quotes`, `GET /api/finance/quotes/[id]` y `GET /api/finance/quotes/[id]/lines` ya leen vía façade canónica manteniendo payload legacy
- `finance.quote.*`, `finance.quote_line_item.*` y `finance.product.*` siguen siendo la familia runtime vigente del outbox.
- HubSpot/Nubox ahora deben tratarse como writers del bridge, no como writers exclusivos de Finance tables.
- La lane sigue siendo `finance-first surface`, pero ya no es `finance-only storage`.

## Delta 2026-04-16 — Finance Signal Engine (TASK-245)

- Primer engine de señales AI fuera del ICO Engine.
- Detecta anomalías estadísticas (Z-score rolling 6m) sobre `greenhouse_finance.client_economics` por cliente:
  - `net_margin_pct`, `gross_margin_pct`, `total_revenue_clp`, `direct_costs_clp`, `indirect_costs_clp`, `net_margin_clp`
- Solo emite deteriorations (improvements no generan signals; mantiene el dashboard limpio).
- Enriquecimiento con LLM (Gemini 2.5 Flash) via prompt domain-aware `finance_signal_enrichment_v1` con glosario financiero y cadena causal propia:
  - Revenue ↓ o Direct Costs ↑ → Gross Margin ↓ → Net Margin ↓ → flujo de caja operativo ↓
- Resultado visible en Finance Dashboard (`/finance`) como `NexaInsightsBlock` entre KPIs y Economic Indicators.
- Infraestructura:
  - Tablas PG: `greenhouse_serving.finance_ai_signals`, `greenhouse_serving.finance_ai_signal_enrichments`, `greenhouse_serving.finance_ai_enrichment_runs`
  - Migración: `migrations/20260416235432829_task-245-finance-ai-signals.sql`
  - Código: `src/lib/finance/ai/` (detector, materializer, llm provider, worker, reader, resolver, types)
  - Cloud Run endpoints: `POST /finance/materialize-signals`, `POST /finance/llm-enrich` en `services/ico-batch/server.ts`
  - Vercel cron: `GET /api/cron/finance-ai-signals` (fallback manual; producción usa Cloud Run)
  - Reader API: `GET /api/finance/intelligence/nexa-insights?year=YYYY&month=MM`
- Eventos outbox: `finance.ai_signals.materialized`, `finance.ai_llm_enrichments.materialized`.
- Advisory-only: nunca bloquea workflows financieros; el disclaimer del componente Nexa se respeta.
- Fuente canónica de contrato: `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`.

## Delta 2026-04-11 — Shareholder account anchored semantically to Person ↔ Legal Entity

- `Finance > Cuenta accionista` sigue siendo owner del instrumento, ledger, settlement y balances.
- Regla nueva:
  - la CCA no debe interpretarse como extensión primaria de `user`, `member` ni `space`
  - su semántica canónica es una relación `person ↔ legal entity`
  - `profile_id`, `member_id` opcional y `space_id` siguen siendo anclas útiles de runtime, pero no sustituyen la contraparte económica primaria
- Regla complementaria:
  - `executive compensation` y `shareholder current account` son carriles distintos
  - cualquier compensación/cruce entre ambos debe ser explícita y auditable
- Fuente canónica complementaria:
  - `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

## Delta 2026-04-07

- **TASK-280**: Módulos de caja implementados
  - Tabla `expense_payments` creada (simétrica a `income_payments`) con trigger de derivación
  - Backfill automático de expenses con `payment_status = 'paid'`
  - 3 surfaces nuevas: Cobros (`/finance/cash-in`), Pagos (`/finance/cash-out`), Posición de caja (`/finance/cash-position`)
  - Componentes UI compartidos: `PaymentRegistrationCard`, `PaymentHistoryTable` — reutilizados en IncomeDetailView y ExpenseDetailView
  - Evento `finance.expense_payment.recorded` registrado en catálogo y 4 projections
  - Navegación Finance actualizada con sección Caja (3 items nuevos)

## Delta 2026-04-10 — Shareholder account canonical traceability completed (TASK-306)

- **La CCA deja de depender de IDs manuales como interfaz primaria**
  - `greenhouse_finance.shareholder_account_movements` ahora persiste `source_type` + `source_id` como contrato canónico de origen
  - `source_type` admite `manual`, `expense`, `income`, `expense_payment`, `income_payment`, `settlement_group`
  - los vínculos legacy (`linked_expense_id`, `linked_income_id`, `linked_payment_id`, `linked_payment_type`, `settlement_group_id`) siguen como compatibilidad operativa, pero ya no gobiernan el UX principal
- **Validación tenant-safe en backend**
  - la resolución de origen corre server-side desde `src/lib/finance/shareholder-account/source-links.ts`
  - `expense` se valida por `space_id`
  - `income` se valida por sus anclas canónicas (`organization_id`, `client_id`, `client_profile_id`) porque no tiene `space_id` directo en el modelo actual
  - `expense_payment`, `income_payment` y `settlement_group` se resuelven contra su documento/pago real antes de persistir o exponer el vínculo
- **Read model enriquecido y navegación cross-module**
  - `GET/POST /api/finance/shareholder-account/[id]/movements` ya devuelve `sourceType`, `sourceId` y un objeto `source` con label, estado, monto, fecha y `href`
  - nueva lookup API `GET /api/finance/shareholder-account/lookups/sources` para búsqueda remota tenant-scoped de egresos, ingresos y pagos
  - `ExpenseDetailView` e `IncomeDetailView` ya abren CCA precontextualizada vía query params (`sourceType`, `sourceId`)
- **Settlement se mantiene como capa derivada**
  - `settlement_group_id` ya no debe capturarse manualmente en el drawer de CCA
  - cuando el origen real es un pago o un documento con settlement existente, backend deriva o resuelve el settlement desde esa entidad
  - las métricas y balances siguen consumiéndose desde settlement / `account_balances`; no se recalculan inline

## Delta 2026-04-08 — Shareholder current account module completed (TASK-284)

- **Nuevo instrumento de tesorería `shareholder_account`**
  - `greenhouse_finance.accounts.instrument_category` ahora admite `shareholder_account`
  - la CCA no vive como identidad paralela: se monta 1:1 encima de `accounts.account_id`
  - mantiene compatibilidad con `account_balances`, settlement orchestration y cierres por instrumento
- **Nuevo subdominio `greenhouse_finance.shareholder_accounts`**
  - extiende el instrumento con `profile_id`, `member_id` opcional, `ownership_percentage`, `status`, `notes`, `space_id` y `metadata_json`
  - el vínculo person-aware se resuelve contra `greenhouse_core.identity_profiles` y `greenhouse_core.members`
  - soporta el caso donde el accionista también es usuario interno / admin del portal
- **Nuevo ledger `greenhouse_finance.shareholder_account_movements`**
  - append-only para cargos/abonos bilaterales entre empresa y accionista
  - cada movimiento persiste `direction` (`credit` = empresa debe, `debit` = accionista debe), `movement_type`, monto, FX, referencias documentales y `running_balance_clp`
  - puede vincular opcionalmente `expense_id`, `income_id`, `payment_id`, `settlement_group_id` y una cuenta contraparte
- **Settlement y proyecciones reutilizadas**
  - registrar un movimiento crea `settlement_group` + `settlement_legs` con `leg_type = funding`
  - la rematerialización de `account_balances` usa el mismo carril reactivo que Banco/Tesorería
  - eventos nuevos publicados al outbox:
    - `finance.shareholder_account.created`
    - `finance.shareholder_account_movement.recorded`
    - `finance.settlement_leg.recorded`
- **Nueva superficie operativa**
  - página `GET /finance/shareholder-account`
  - APIs:
    - `GET/POST /api/finance/shareholder-account`
    - `GET /api/finance/shareholder-account/people`
    - `GET /api/finance/shareholder-account/[id]/balance`
    - `GET/POST /api/finance/shareholder-account/[id]/movements`
  - view code nuevo: `finanzas.cuenta_corriente_accionista`
  - acceso alineado a la misma política que `Banco`: `efeonce_admin`, `finance_admin`, `finance_analyst`, salvo override explícito por authorized views
  - la creación de cuentas ya busca personas por nombre/email en Identity y autocompleta `profile_id` / `member_id`

## Delta 2026-04-08 — Payment Instruments Registry + FX Tracking (TASK-281)

- **Tabla `accounts` evolucionada** con 10 nuevas columnas para Payment Instruments:
  - `instrument_category` (bank_account, credit_card, fintech, payment_platform, cash, payroll_processor, shareholder_account)
  - `provider_slug` — link al catálogo estático de proveedores (`src/config/payment-instruments.ts`)
  - `provider_identifier` — ID de cuenta en el proveedor externo
  - `card_last_four`, `card_network` — campos de tarjeta
  - `credit_limit` — límite de crédito
  - `responsible_user_id` — persona responsable del instrumento
  - `default_for` — array de usos por defecto (payroll, suppliers, tax, etc.)
  - `display_order` — orden en selectores y listas
  - `metadata_json` — campo extensible JSONB
- **FX tracking en payment tables** — `income_payments` y `expense_payments` tienen:
  - `exchange_rate_at_payment` — tipo de cambio al momento del pago
  - `amount_clp` — monto equivalente en CLP al tipo de cambio del pago
  - `fx_gain_loss_clp` — diferencia entre CLP al tipo de cambio del pago vs tipo de cambio del documento
- **FX auto-calculado** en `recordPayment()` y `recordExpensePayment()` via `resolveExchangeRateToClp()`
- **Bidirectional FX resolver** — `resolveExchangeRate({ fromCurrency, toCurrency })` en `shared.ts`
- **Provider catalog** — 20 proveedores con logos SVG en `public/images/logos/payment/`:
  - 10 bancos chilenos (BCI, Chile, Santander, Estado, Scotiabank, Itaú, BICE, Security, Falabella, Ripley)
  - 3 redes de tarjeta (Visa, Mastercard, Amex)
  - 4 fintech (PayPal, Wise, MercadoPago, Global66)
  - 3 plataformas (Deel, Stripe, Previred)
- **Admin Center CRUD** — `/admin/payment-instruments` con TanStack table, 4 KPIs, drawer de creación por categoría
- **`PaymentInstrumentChip`** — componente con logo SVG + fallback a Avatar initials
- **Selectores de instrumento** en RegisterCashIn/OutDrawer, CreateIncome/ExpenseDrawer
- **Columna instrumento** en CashInListView y CashOutListView con logo
- **KPI "Resultado cambiario"** en CashPositionView

### Archivos clave TASK-281

| Archivo | Función |
|---------|---------|
| `migrations/20260408091711953_evolve-accounts-to-payment-instruments.sql` | DDL evolución accounts + FX columns |
| `src/config/payment-instruments.ts` | Catálogo de proveedores, categorías, logos |
| `src/components/greenhouse/PaymentInstrumentChip.tsx` | Chip con logo + fallback |
| `src/app/api/admin/payment-instruments/route.ts` | GET list + POST create |
| `src/app/api/admin/payment-instruments/[id]/route.ts` | GET detail + PUT update |
| `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentsListView.tsx` | Admin list view |
| `src/views/greenhouse/admin/payment-instruments/CreatePaymentInstrumentDrawer.tsx` | Drawer de creación |

## Delta 2026-04-08 — Reconciliation settlement orchestration completed (TASK-282)

- **Conciliación quedó `ledger-first` de forma operativa**
  - candidatos y matching alineados a `income_payments` / `expense_payments`
  - `matched_settlement_leg_id` persistido en `bank_statement_rows`
  - `auto-match`, `match`, `unmatch` y `exclude` ya usan el store Postgres sin duplicar eventos de pago en las routes
- **Settlement orchestration quedó utilizable desde runtime**
  - helper `getSettlementDetailForPayment()` para inspección del settlement group real de un payment
  - helper `recordSupplementalSettlementLegForPayment()` para agregar `internal_transfer`, `funding`, `fx_conversion` y `fee`
  - endpoint `GET/POST /api/finance/settlements/payment`
  - drawer UI `SettlementOrchestrationDrawer` accesible desde el historial de pagos/cobros
- **Registro operativo de caja ya soporta configuración multi-leg**
  - `POST /api/finance/expenses/[id]/payments` acepta `exchangeRateOverride`, `settlementMode`, `fundingInstrumentId`, `feeAmount`, `feeCurrency`, `feeReference`
  - `POST /api/finance/income/[id]/payments` acepta `exchangeRateOverride`, `feeAmount`, `feeCurrency`, `feeReference`
  - `RegisterCashOutDrawer` y `RegisterCashInDrawer` ya exponen esos campos operativos
- **Settlement + reconciliación ya publican y consumen eventos canónicos**
  - catálogo con `finance.internal_transfer.recorded` y `finance.fx_conversion.recorded`
  - projections `client_economics`, `operational_pl`, `commercial_cost_attribution` y `period_closure_status` escuchan settlement/reconciliation relevante
  - `data-quality` audita drift entre `payments`, `settlement_groups`, `settlement_legs` y períodos cerrados/reconciliados
- **UX operativa de conciliación**
  - `ReconciliationDetailView` muestra snapshots de instrumento/proveedor/moneda del período
  - permite `Marcar conciliado` y `Cerrar período` usando `PUT /api/finance/reconciliation/[id]`
  - la acción queda bloqueada hasta tener extracto importado, diferencia en cero y sin rows pendientes

## Delta 2026-04-08 — Bank & Treasury module completed (TASK-283)

- **Nueva tabla `greenhouse_finance.account_balances`**
  - snapshot diario por instrumento (`account_id`, `balance_date`)
  - persiste `opening_balance`, `period_inflows`, `period_outflows`, `closing_balance`
  - guarda equivalente CLP, FX usado, resultado cambiario, conteo transaccional y estado de cierre del período
  - UNIQUE `(account_id, balance_date)` para materialización idempotente
- **Materialización reactiva de tesorería**
  - helper `materializeAccountBalance()` y readers en `src/lib/finance/account-balances.ts`
  - projection `accountBalancesProjection` escucha:
    - `finance.income_payment.recorded`
    - `finance.expense_payment.recorded`
    - `finance.settlement_leg.recorded|reconciled|unreconciled`
    - `finance.internal_transfer.recorded`
    - `finance.fx_conversion.recorded`
    - `finance.reconciliation_period.reconciled|closed`
  - la UI `Banco` lee el snapshot materializado como source of truth
- **Transferencias internas como movimiento canónico de tesorería**
  - helper `recordInternalTransfer()` en `src/lib/finance/internal-transfers.ts`
  - crea `settlement_group` con `settlement_mode = 'internal_transfer'`
  - crea legs `internal_transfer` para salida/entrada y `fx_conversion` cuando la transferencia cruza monedas
  - rematerializa balances de ambas cuentas desde la fecha del movimiento
- **Nuevas APIs**
  - `GET/POST /api/finance/bank`
    - overview por instrumento
    - coverage de `payment_account_id`
    - asignación retroactiva de cobros/pagos a una cuenta
  - `GET/POST /api/finance/bank/[accountId]`
    - detalle de cuenta
    - historial de 12 meses
    - movimientos recientes
    - cierre de período por cuenta
  - `POST /api/finance/bank/transfer`
    - alta de transferencias internas standalone
- **Nueva superficie UI**
  - página `GET /finance/bank`
  - vista `BankView`
  - drawers:
    - `AccountDetailDrawer`
    - `AssignAccountDrawer`
    - `InternalTransferDrawer`
  - access view registrado como `finanzas.banco`
- **Integración con el ecosistema**
  - `Banco`, `Cobros`, `Pagos`, `Conciliación` y `Posición de caja` comparten ahora la misma base instrument-aware
  - los drawers operativos de caja ya consumen `/api/finance/accounts` en vez de la route admin-only de instrumentos

---

## Delta 2026-04-07 — Products catalog + Quote Line Items (TASK-211)

Dos nuevas tablas en `greenhouse_finance`:

### `greenhouse_finance.products`

Catalogo de productos sincronizado desde HubSpot o creado manualmente.

- ID: `GH-PROD-{hubspot_product_id}` para HubSpot, UUID para manual
- Columnas clave: `name`, `sku`, `unit_price`, `cost_of_goods_sold`, `is_recurring`, `billing_frequency`
- Margen calculado en API: `(unit_price - cost_of_goods_sold) / unit_price * 100`
- Sync: cron diario `hubspot-products-sync` (8 AM)

### `greenhouse_finance.quote_line_items`

Line items transaccionales vinculados a quotes. FK a `quotes(quote_id)` y opcionalmente a `products(product_id)`.

- ID: `GH-LI-{hubspot_line_item_id}` para HubSpot
- Synced automaticamente con cada quote sync (TASK-210)
- Creados localmente en outbound quotes con product picker

### Sinergia con TASK-210

- Quote sync ahora sincroniza line items despues de cada quote
- Quote outbound persiste line items en transaccion
- CreateQuoteDrawer tiene product picker que auto-fill nombre + precio

### Endpoints

- `GET /api/finance/products` — catalogo con filtros (source, active, search)
- `POST /api/finance/products/hubspot` — crear producto en HubSpot + local
- `GET /api/finance/quotes/{id}/lines` — line items de una quote con JOIN a products

### Archivos clave

| Archivo | Funcion |
|---------|---------|
| `migrations/20260407193443222_create-products-and-quote-line-items.sql` | DDL |
| `src/lib/hubspot/sync-hubspot-products.ts` | Inbound product sync |
| `src/lib/hubspot/sync-hubspot-line-items.ts` | Inbound line items sync per quote |
| `src/lib/hubspot/create-hubspot-product.ts` | Outbound product creation |
| `src/app/api/cron/hubspot-products-sync/route.ts` | Cron endpoint |
| `src/views/greenhouse/finance/ProductCatalogView.tsx` | UI catalogo |
| `scripts/backfill-hubspot-products.ts` | Backfill one-time |

## Delta 2026-04-07 — HubSpot Quotes bidirectional integration (TASK-210)

`greenhouse_finance.quotes` es ahora multi-source. Nuevas columnas: `source_system` (`nubox`/`hubspot`/`manual`), `hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at`.

### Inbound (HubSpot → Greenhouse)

- Cloud Run service `hubspot-greenhouse-integration` expone `GET /companies/{id}/quotes`
- Client: `getHubSpotGreenhouseCompanyQuotes()` en `src/lib/integrations/hubspot-greenhouse-service.ts`
- Sync: `syncAllHubSpotQuotes()` en `src/lib/hubspot/sync-hubspot-quotes.ts`
- Cron: `GET /api/cron/hubspot-quotes-sync` cada 6 horas, con readiness gate
- Identity resolution: `hubspot_company_id` → `organization_id` → `space_id` + `client_id`
- ID format: `QUO-HS-{hubspot_quote_id}` (coexiste con `QUO-NB-{nubox_sale_id}`)
- Status mapping: HubSpot `hs_status` → Greenhouse normalized (`DRAFT`→`draft`, `APPROVAL_NOT_NEEDED`→`sent`, etc.)

### Outbound (Greenhouse → HubSpot)

- Cloud Run service expone `POST /quotes` (crea quote + line items + asociaciones)
- Client: `createHubSpotGreenhouseQuote()` en `src/lib/integrations/hubspot-greenhouse-service.ts`
- Logic: `createHubSpotQuote()` en `src/lib/hubspot/create-hubspot-quote.ts`
- API: `POST /api/finance/quotes/hubspot` con validacion
- Patron: resolver org → call Cloud Run → persist local → outbox event (transaccional)

### API update

- `GET /api/finance/quotes` ahora devuelve `source`, `hubspotQuoteId`, `hubspotDealId`
- Nuevo query param: `?source=hubspot|nubox|manual`
- `isFromNubox` se mantiene como campo derivado de backward compat

### Outbox events

- `finance.quote.synced` — inbound sync desde HubSpot
- `finance.quote.created` — outbound creation hacia HubSpot (con `direction: 'outbound'`)

### Archivos clave

| Archivo | Funcion |
|---------|---------|
| `migrations/20260407182811937_add-hubspot-quotes-columns.sql` | DDL + backfill |
| `src/lib/hubspot/sync-hubspot-quotes.ts` | Inbound sync |
| `src/lib/hubspot/create-hubspot-quote.ts` | Outbound create |
| `src/app/api/cron/hubspot-quotes-sync/route.ts` | Cron endpoint |
| `src/app/api/finance/quotes/hubspot/route.ts` | POST outbound API |
| `scripts/backfill-hubspot-quotes.ts` | Backfill one-time |

## Delta 2026-04-05 — schema drift in Finance lists now surfaces as explicit degraded payload

Las routes Finance que antes respondían vacío ante `relation/column does not exist` ya no deben ocultar drift de schema como si fuera ausencia sana de datos.

Carriles ajustados:

- `purchase-orders`
- `hes`
- `quotes`
- `intelligence/operational-pl`

Nuevo contrato runtime:

- la shape base de lista se preserva (`items` / `total` o `snapshots`)
- el payload agrega `degraded: true`, `errorCode` y `message`
- el consumer puede distinguir explícitamente schema drift de un estado realmente vacío

Objetivo:

- no romper consumidores existentes que esperan listas
- evitar que Finance oculte incidentes reales como “sin datos”

## Delta 2026-04-05 — create routes reuse request-scoped IDs across dual-store fallback

`POST /api/finance/income` y `POST /api/finance/expenses` ya no deben recalcular un segundo identificador si el path Postgres-first alcanzó a generar uno antes de caer al fallback BigQuery.

Nuevo contrato runtime:

- el request mantiene un ID canónico por operación de create
- si PostgreSQL ya generó `income_id` o `expense_id`, BigQuery fallback debe reutilizar ese mismo valor
- solo cuando no existía ID previo y no se pudo generar en el carril Postgres, el fallback puede asignar uno propio

Objetivo:

- evitar duplicidad lógica cross-store por recalcular secuencias distintas en una misma operación
- preservar el comportamiento de fallback sin degradar integridad básica del ledger

## Delta 2026-04-03 — Currency comparison helpers como módulo compartido de Finance

`src/lib/finance/currency-comparison.ts` es un módulo de funciones puras (sin `'server-only'`) que vive en Finance pero es importable desde cualquier módulo client o server:

- `consolidateCurrencyEquivalents(totals, usdToClp)` — consolida `{ USD, CLP }` → totales CLP y USD usando la tasa canónica
- `computeCurrencyDelta(current, compare, rate, label)` — delta % entre períodos con referencia CLP
- `payrollTrendDirection(deltaPct)` / `formatDeltaLabel(deltaPct, label)` — formateo para `HorizontalWithSubtitle` props

Regla: las conversiones multi-currency deben pasar por estos helpers, no math inline. La tasa se resuelve server-side vía `resolveExchangeRateToClp()` y se pasa como `fxRate` al client.

## Delta 2026-04-03 — Nubox sales/purchases are document ledgers, not pure cash events

Se formaliza una aclaración semántica importante para Finance:

- `greenhouse_finance.income` y `greenhouse_finance.expenses` son ledgers operativos de **devengo/documento**
- cuando el source es `Nubox`, los registros representan primero:
  - documentos de venta
  - documentos de compra
  - notas/ajustes tributarios asociados
- esos registros **no deben leerse como equivalentes directos a cobro/pago**

Carriles correctos:

- venta emitida / documento de venta:
  - `greenhouse_finance.income`
  - fecha relevante: `invoice_date`
- compra / obligación documentada:
  - `greenhouse_finance.expenses`
  - fecha relevante: `document_date`
- cobro real:
  - `greenhouse_finance.income_payments`
  - fecha relevante: `payment_date`
- pago real:
  - `greenhouse_finance.expenses.payment_date`
  - más conciliación y bank movements cuando aplique

Regla operativa:

- las surfaces Finance no deben presentar una factura de Nubox como si fuera por sí misma un cobro
- ni una compra de Nubox como si fuera por sí misma un pago
- el módulo puede seguir usando `income` / `expenses` para P&L devengado, pero debe distinguir visualmente documento/devengo vs caja

### `greenhouse_finance.expense_payments` — Pagos contra compras

Tabla simétrica a `income_payments`. Cada fila es un pago individual ejecutado contra un documento de compra.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `payment_id` | TEXT PK | Prefijo `exp-pay-` + UUID |
| `expense_id` | TEXT FK | Referencia al documento de compra |
| `payment_date` | DATE | Fecha del pago real |
| `amount` | NUMERIC(14,2) | Monto pagado (> 0) |
| `currency` | TEXT | Moneda del pago |
| `reference` | TEXT | Referencia bancaria o comprobante |
| `payment_method` | TEXT | transfer, credit_card, etc. |
| `payment_source` | TEXT | manual, payroll_system, nubox_sync, bank_statement |
| `is_reconciled` | BOOLEAN | Vinculado a extracto bancario |

**Trigger `trg_sync_expense_amount_paid`**: Después de INSERT/UPDATE/DELETE, recalcula `expenses.amount_paid = SUM(expense_payments.amount)` y deriva `payment_status`.

**Evento outbox**: `finance.expense_payment.recorded` — consumido por client-economics, commercial-cost-attribution, operational-pl, period-closure-status.

## Delta 2026-04-07 — labor_cost_clp separado en client_economics + type consolidation

`client_economics` ahora tiene una columna `labor_cost_clp` dedicada para el costo laboral (de `commercial_cost_attribution`), separada de `direct_costs_clp` (allocaciones + gastos directos) e `indirect_costs_clp`.

Cambios estructurales:

- **Migración**: `20260407171920933_add-labor-cost-clp-to-client-economics.sql` — agrega columna + backfill desde `commercial_cost_attribution.commercial_labor_cost_target`
- **Compute pipeline**: `computeClientEconomicsSnapshots` ahora trackea `laborCosts` separado de `directCosts` en el `clientMap`
- **Sanitizer**: `sanitizeSnapshotForPresentation` requiere `laborCostClp` (no opcional) — `totalCosts = labor + direct + indirect`. Si un consumer no lo pasa, TypeScript lo rechaza.
- **360 facet**: `AccountClientProfitability.laborCostCLP` expuesto por `fetchEconomicsFacet` → query incluye `COALESCE(ce.labor_cost_clp, 0)`
- **Finance legacy**: `getOrganizationFinanceSummary` incluye `labor_cost_clp` en el SELECT y en `OrganizationClientFinance`
- **Tipos consolidados**: `OrganizationClientFinance` y `OrganizationFinanceSummary` definidas una sola vez en `src/views/greenhouse/organizations/types.ts`. El backend (`organization-store.ts`) importa y re-exporta — no hay duplicados.

Impacto en UI:
- Tab Economics: "Costo laboral" usa `c.laborCostCLP` (antes hardcoded `0`), "C. Directos" = `costCLP - laborCostCLP`
- Tab Finance: nueva columna "Costo laboral" entre Ingreso y C. Directos
- Trend chart: ordenado cronológicamente (ASC) en vez de DESC

---

## Delta 2026-03-30 — Commercial cost attribution ya es contrato operativo de plataforma

Finance ya no debe tratar la atribución comercial como una recomposición local entre bridges de payroll, assignments y overhead.

Estado canónico vigente:

- existe una capa materializada específica:
  - `greenhouse_serving.commercial_cost_attribution`
- esta capa consolida por período y `member_id`:
  - costo base laboral
  - labor comercial atribuida
  - carga interna excluida
  - overhead comercial atribuible
- la capa expone además explainability por cliente/período y health semántico mínimo

Regla arquitectónica:

- `client_labor_cost_allocation` sigue existiendo, pero queda como bridge/input interno
- readers nuevos de Finance no deben volver a depender de `client_labor_cost_allocation` directamente
- el contrato compartido para costo comercial pasa a ser:
  - reader shared de `commercial_cost_attribution`
  - o serving derivado que ya lo consuma (`operational_pl_snapshots`)

Matriz de consumo:

- Finance base / `client_economics`
  - debe consumir `commercial_cost_attribution`
- Cost Intelligence / `operational_pl`
  - debe consumir `commercial_cost_attribution`
- Agency / economics por espacio
  - debe seguir sobre `operational_pl_snapshots`
- People / person finance
  - debe seguir sobre `member_capacity_economics`
  - usando `commercial_cost_attribution` solo para explain cuando aplique

## Delta 2026-03-31 — Expense ledger hardening y intake reactivo desde Payroll

`Finance > Expenses` quedó alineado como ledger canónico con un contrato más explícito para clasificación y tenant isolation:

- el ledger ahora modela de forma separada:
  - `space_id`
  - `source_type`
  - `payment_provider`
  - `payment_rail`
- el drawer de egresos dejó de tratar `Nomina` y `Prevision` como tabs manuales y pasó a una taxonomía visible por naturaleza del gasto:
  - `Operacional`
  - `Tooling`
  - `Impuesto`
  - `Otro`
- `payroll_period.exported` quedó documentado como trigger reactivo para materializar expenses system-generated de:
  - `payroll`
  - `social_security`
- `Finance` sigue siendo el owner del ledger; `Cost Intelligence` consume y atribuye sin recomputar el costo desde cero.
- La regla anti-doble-conteo de payroll se mantiene: los expenses derivados deben convivir con `operational_pl` sin duplicar carga laboral.

## Delta 2026-03-30 — revenue aggregation usa client_id canónico

Regla canónica vigente para agregaciones financieras:

- `client_economics` y `operational_pl` deben agregar revenue por `client_id` comercial canónico.
- Si un income histórico solo trae `client_profile_id`, el runtime debe traducirlo vía `greenhouse_finance.client_profiles` antes de agrupar.
- No se debe usar `client_profile_id` como sustituto directo de `client_id` en snapshots o serving ejecutivo nuevo.

## Delta 2026-04-02 — downstream org-first cutover y residual legacy

`TASK-191` avanza el contrato downstream de Finance para que la entrada operativa deje de depender exclusivamente de `clientId`:

- `purchase-orders` y `hes` deben aceptar `organizationId` como anchor org-first, con `clientId` solo como bridge de compatibilidad cuando el storage legacy lo requiera.
- `expenses`, `expenses/bulk`, `cost allocations` y `client_economics` deben resolver scope downstream desde un helper compartido en vez de repetir bridges ad hoc en UI y API.
- La selección de clientes en drawers Finance debe preferir el identificador org-first y mostrar `clientId` solo como bridge residual.

Regla de persistencia:

- `client_id` sigue siendo un bridge operativo en varias tablas y readers.
- No se debe prometer eliminación física de `client_id` hasta una lane explícita de schema evolution.
- Los readers/materializers que siguen materializando por `client_id` deben documentarse como compat boundary, no como contrato de entrada.

## Delta 2026-04-02 — materialized serving org-first compatibility keys

`TASK-192` endurece la capa materializada de Finance sin eliminar todavía el bridge legado:

- `greenhouse_finance.cost_allocations` ahora persiste `organization_id` y `space_id` además de `client_id`.
- `greenhouse_finance.client_economics` ahora persiste `organization_id` junto al snapshot mensual.
- `greenhouse_serving.commercial_cost_attribution` ahora persiste `organization_id` como contexto compartido de attribution.
- `client_id` sigue vivo como compat boundary para storage/readers legacy, pero ya no es la única llave persistida disponible en serving financiero.
- `GET /api/finance/intelligence/allocations` y `GET /api/finance/intelligence/client-economics` ya pueden resolver lectura org-first sin exigir siempre un bridge legacy previo.

Matiz importante de schema:

- estas columnas nuevas dejan el modelo `org-aware`, pero todavía no `org-enforced`
- en esta lane se agregaron columnas, índices y backfill, pero no `FK` ni `NOT NULL` nuevos sobre `organization_id` / `space_id`
- el bridge canónico real sigue combinando:
  - `greenhouse_finance.client_profiles`
  - `greenhouse_core.spaces`
  - y, para allocations, `greenhouse_finance.expenses.space_id`
- una lane futura de schema cleanup podrá endurecer constraints físicos cuando desaparezcan los consumers legacy que todavía exigen flexibilidad de bridge

## Delta 2026-03-30 — Cost Intelligence ya opera como layer de management accounting

Finance sigue siendo el owner del motor financiero central, pero ya no es la única surface que expone semántica de rentabilidad.

Estado canónico vigente:

- `GET /api/finance/dashboard/pnl` sigue siendo la referencia central del cálculo financiero mensual.
- Cost Intelligence ya materializa esa semántica en serving propio, sin redefinir un P&L paralelo:
  - `greenhouse_serving.period_closure_status`
  - `greenhouse_serving.operational_pl_snapshots`
- `/finance/intelligence` ya es la surface principal de cierre operativo y lectura de P&L del módulo.
- Los consumers downstream ya empezaron a leer ese serving:
  - Agency
  - Organization 360
  - People 360
  - Home
  - Nexa

Regla arquitectónica:

- Finance mantiene ownership de ingresos, gastos, reconciliación, FX y semántica del P&L central.
- Cost Intelligence actúa como layer de materialización y distribución operativa sobre esa base.
- Nuevos consumers que necesiten margen, closure status o snapshots operativos deberían preferir `operational_pl_snapshots` y `period_closure_status` antes de recomputar on-read.

## Delta 2026-03-30 — Atribución comercial debe excluir assignments internos

Se formaliza una regla que ya existía implícitamente en `Agency > Team` y `member_capacity_economics` y ahora también aplica a Finance / Cost Intelligence:

- assignments internos como `space-efeonce`, `efeonce_internal` y `client_internal` pueden seguir existiendo para operación interna
- esos assignments no deben competir como cliente comercial en:
  - atribución de costo laboral
  - auto-allocation comercial
  - snapshots de `operational_pl`
- consecuencia práctica:
  - un colaborador puede tener carga interna operativa y al mismo tiempo `1.0 FTE` comercial hacia un cliente sin que Finance le parta la nómina 50/50 contra `Efeonce`

Regla de implementación:

- la truth comercial compartida debe salir de una regla canónica reusable, no de filtros distintos por consumer
- Cost Intelligence puede purgar snapshots obsoletos de una revisión para evitar que scopes internos antiguos sigan visibles después del recompute

## Overview

Finance es el módulo más grande del portal: 49 API routes, 13 páginas, 28 archivos de librería. Gestiona facturación, gastos, reconciliación bancaria, indicadores económicos, integración DTE/Nubox, y la capa de inteligencia financiera (economics, allocations, P&L).

## Data Architecture

### Dual-Store: Postgres-First with BigQuery Fallback

| Tabla                         | Store primario                          | BigQuery                                | Estado                                                                      |
| ----------------------------- | --------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `income`                      | Postgres (`greenhouse_finance`)         | `fin_income` (fallback)                 | Migrado                                                                     |
| `income_payments`             | Postgres only                           | No existe en BQ                         | Nativo Postgres                                                             |
| `expenses`                    | Postgres (`greenhouse_finance`)         | `fin_expenses` (fallback)               | Migrado                                                                     |
| `accounts`                    | Postgres                                | `fin_accounts` (fallback)               | Migrado                                                                     |
| `suppliers`                   | Postgres                                | `fin_suppliers` (fallback)              | Migrado                                                                     |
| `exchange_rates`              | Postgres                                | `fin_exchange_rates` (fallback)         | Migrado                                                                     |
| `economic_indicators`         | Postgres                                | `fin_economic_indicators` (fallback)    | Migrado                                                                     |
| `cost_allocations`            | Postgres only                           | No existe en BQ                         | Nativo Postgres; persiste `organization_id`/`space_id` + `client_id` compat |
| `client_economics`            | Postgres (`greenhouse_finance`)         | No                                      | Nativo; persiste `organization_id` + `client_id` compat                     |
| `reconciliation_periods`      | Postgres                                | `fin_reconciliation_periods` (fallback) | Migrado                                                                     |
| `bank_statement_rows`         | Postgres                                | `fin_bank_statement_rows` (fallback)    | Migrado                                                                     |
| `dte_emission_queue`          | Postgres only                           | No                                      | TASK-139                                                                    |
| `commercial_cost_attribution` | Serving Postgres (`greenhouse_serving`) | No                                      | Canónico materializado; persiste `organization_id` + `client_id` compat     |

Nota operativa:

- `commercial_cost_attribution` existe en el schema snapshot y ya es contrato vigente del sistema, pero su DDL base sigue asegurado por runtime/store code además de las migraciones incrementales; todavía no vive como create-table canónico separado dentro de `scripts/` o una migración histórica dedicada.

### BigQuery Cutover Plan

Ver `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` sección "Finance BigQuery → Postgres Cutover Plan" para el plan de eliminación de fallbacks.

Flag de control: `FINANCE_BIGQUERY_WRITE_ENABLED` (default: true).

Estado operativo post `TASK-166`:

- `income`, `expenses`, `accounts`, `suppliers`, `exchange_rates`, `reconciliation` y los sync helpers principales ya respetan el guard fail-closed cuando PostgreSQL falla y el flag está apagado.
- `clients` (`create/update/sync`) ya opera Postgres-first sobre `greenhouse_finance.client_profiles`; BigQuery queda solo como fallback transicional cuando PostgreSQL no está disponible y el flag sigue activo.
- `clients` list/detail ya operan org-first sobre `greenhouse_core.organizations WHERE organization_type IN ('client', 'both')`, con `client_profiles.organization_id` como FK fuerte.
- `client_id` se preserva como bridge operativo para modules, `purchase_orders`, `hes`, `income`, `client_economics` y `v_client_active_modules`; el cutover actual no elimina esa clave legacy.
- El residual de `Finance Clients` queda reducido a fallback transicional, no a dependencia estructural del request path.

### Delta 2026-04-08 — Ledger-first reconciliation & settlement foundation

- `Finance > Conciliación` ya converge al mismo contrato canónico que `Cobros` y `Pagos`: `income_payments` / `expense_payments` son la unidad primaria de caja conciliable cuando existe ledger real.
- `reconciliation_periods` ahora guarda snapshots del instrumento (`instrument_category_snapshot`, `provider_slug_snapshot`, `provider_name_snapshot`, `period_currency_snapshot`) para que la conciliación no dependa del estado mutable del catálogo.
- `bank_statement_rows` ahora soporta importación idempotente mediante `source_import_batch_id`, `source_import_fingerprint`, `source_imported_at` y `source_payload_json`.
- `greenhouse_finance.settlement_groups` y `greenhouse_finance.settlement_legs` formalizan la base de settlement orchestration para pagos directos y cadenas multi-leg (`internal_transfer`, `funding`, `fx_conversion`, `payout`, `fee`).
- La reconciliación payment-level quedó validada end-to-end contra staging: reimportar el mismo statement row no duplica filas y el loop `unmatch -> match` vuelve a sincronizar `bank_statement_rows`, `income_payments` / `expense_payments` y `settlement_legs` sobre el mismo `reconciliation_row_id`.
- La semántica operativa queda explícita:
  - `pagado/cobrado` != `conciliado`
  - transferencia interna o funding no liquida la obligación
  - el leg que liquida una obligación es el `payout` o `receipt` hacia la contraparte final
- Eventos outbox nuevos de primer nivel del dominio:
  - `finance.income_payment.reconciled`
  - `finance.income_payment.unreconciled`
  - `finance.expense_payment.reconciled`
  - `finance.expense_payment.unreconciled`
  - `finance.settlement_leg.recorded`
  - `finance.settlement_leg.reconciled`
  - `finance.settlement_leg.unreconciled`
  - `finance.reconciliation_period.reconciled`
  - `finance.reconciliation_period.closed`

## P&L Endpoint — Motor Financiero Central

### `GET /api/finance/dashboard/pnl`

Este es el **endpoint más importante del módulo Finance**. Construye un P&L operativo completo por período mensual combinando datos de 3 schemas en 6 queries paralelas.

### Parámetros

| Param   | Default    | Descripción     |
| ------- | ---------- | --------------- |
| `year`  | Año actual | Año del período |
| `month` | Mes actual | Mes del período |

### Queries ejecutadas (en paralelo)

```
Query 1: Income (devengado por invoice_date)
  → greenhouse_finance.income
  → total_amount_clp, partner_share, record_count

Query 2: Collected Revenue (caja por payment_date)
  → greenhouse_finance.income_payments JOIN income
  → collected_clp (pagos reales recibidos)

Query 3: Expenses por cost_category
  → greenhouse_finance.expenses
  → GROUP BY cost_category (direct_labor, indirect_labor, operational, infrastructure, tax_social)

Query 4: Payroll (desde módulo de nómina)
  → greenhouse_payroll.payroll_entries JOIN payroll_periods
  → Solo períodos approved/exported
  → Split CLP/USD: gross, net, deductions, bonuses
  → Headcount (COUNT DISTINCT member_id)

Query 5: Linked Payroll Expenses
  → greenhouse_finance.expenses WHERE payroll_entry_id IS NOT NULL
  → Detecta gastos ya vinculados a entries de nómina (evita doble conteo)

Query 6: Exchange Rate
  → greenhouse_finance.exchange_rates
  → Último USD/CLP para conversión de nómina en dólares
```

### Cálculos derivados

```
Revenue:
  totalRevenue     = SUM(income.total_amount_clp) del período
  partnerShare     = SUM(income.partner_share_amount × exchange_rate)
  netRevenue       = totalRevenue - partnerShare
  collectedRevenue = SUM(income_payments donde payment_date en período)
  accountsReceivable = totalRevenue - collectedRevenue

Payroll (multi-moneda):
  payrollGross     = SUM(gross_clp) + SUM(gross_usd) × usdToClp
  payrollNet       = SUM(net_clp) + SUM(net_usd) × usdToClp
  payrollDeductions = SUM(deductions_clp) + SUM(deductions_usd) × usdToClp
  payrollBonuses   = SUM(bonuses_clp) + SUM(bonuses_usd) × usdToClp

Anti-doble-conteo:
  unlinkedPayrollCost = MAX(0, payrollGross - linkedPayrollExpenses)
  → Payroll cost no representado aún como expense → se suma a directLabor

Costs (por categoría):
  directLabor      = expenses[direct_labor] + unlinkedPayrollCost
  indirectLabor    = expenses[indirect_labor]
  operational      = expenses[operational]
  infrastructure   = expenses[infrastructure]
  taxSocial        = expenses[tax_social]
  totalExpenses    = SUM(all categories) + unlinkedPayrollCost

Margins:
  grossMargin      = netRevenue - directLabor
  grossMarginPct   = (grossMargin / netRevenue) × 100
  operatingExpenses = indirectLabor + operational + infrastructure
  ebitda           = grossMargin - operatingExpenses
  ebitdaPct        = (ebitda / netRevenue) × 100
  netResult        = netRevenue - totalExpenses
  netMarginPct     = (netResult / netRevenue) × 100
```

### Response shape

```json
{
  "year": 2026,
  "month": 3,
  "revenue": {
    "totalRevenue": 20706000,
    "partnerShare": 0,
    "netRevenue": 20706000,
    "collectedRevenue": 15200000,
    "accountsReceivable": 5506000,
    "invoiceCount": 8
  },
  "costs": {
    "directLabor": 3339382,
    "indirectLabor": 0,
    "operational": 1200000,
    "infrastructure": 499279,
    "taxSocial": 0,
    "totalExpenses": 5038661,
    "unlinkedPayrollCost": 3339382
  },
  "margins": {
    "grossMargin": 17366618,
    "grossMarginPercent": 83.87,
    "operatingExpenses": 1699279,
    "ebitda": 15667339,
    "ebitdaPercent": 75.67,
    "netResult": 15667339,
    "netMarginPercent": 75.67
  },
  "payroll": {
    "headcount": 4,
    "totalGross": 3339382,
    "totalNet": 3102918,
    "totalDeductions": 236464,
    "totalBonuses": 229006
  },
  "completeness": "complete",
  "missingComponents": []
}
```

### Quién consume este endpoint

| Consumer                      | Qué usa                                   | Para qué                                                        |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `FinanceDashboardView.tsx`    | Todo el response                          | Card "Facturado vs Costos", Card "Costo de Personal", P&L table |
| KPI "Ratio nómina / ingresos" | `payroll.totalGross / revenue.netRevenue` | Working capital metric                                          |
| Card "Costo de Personal"      | `payroll.*`                               | Desglose bruto, líquido, descuentos, bonos                      |

### Reglas de negocio críticas

1. **Solo períodos `approved` o `exported`** — no incluye nóminas en `draft` o `calculated`
2. **Multi-moneda** — entries en USD se convierten con el último tipo de cambio disponible
3. **Anti-doble-conteo** — si un expense tiene `payroll_entry_id`, su monto no se suma al payroll
4. **Partner share** — se descuenta del revenue total para obtener netRevenue

### Expense ledger contract

La surface de `expenses` expone y persiste un contrato más rico para lecturas y writes nuevos:

- `space_id` para aislamiento por tenant
- `source_type` para distinguir gasto manual, derivado o system-generated
- `payment_provider` y `payment_rail` para separar proveedor de rail/método operativo
- `cost_category` sigue siendo la dimensión analítica usada por P&L y consumers downstream

Para el intake reactivo de nómina:

- `payroll_period.exported` es la señal canónica
- el materializador debe crear gastos para nómina y cargas sociales cuando falten en el ledger
- la publicación downstream sigue usando `finance.expense.created|updated`; no se introdujo un evento nuevo específico para tooling

5. **`completeness`** — `'complete'` solo si hay payroll Y expenses; `'partial'` si falta alguno

## Dashboard Summary Endpoint

### `GET /api/finance/dashboard/summary`

Endpoint complementario al PnL que provee métricas de working capital.

| Campo                   | Cálculo                            | Fuente                                                     |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `incomeMonth`           | Income cash del mes actual         | income_payments                                            |
| `expensesMonth`         | Expenses cash del mes actual       | expenses (paid)                                            |
| `netFlow`               | incomeMonth - expensesMonth        | Derivado                                                   |
| `receivables`           | Facturas pendientes de cobro (CLP) | income WHERE payment_status IN (pending, partial, overdue) |
| `payables`              | Gastos pendientes de pago (CLP)    | expenses WHERE payment_status = 'pending'                  |
| `dso`                   | (receivables / revenue) × 30       | Derivado                                                   |
| `dpo`                   | (payables / expenses) × 30         | Derivado                                                   |
| `payrollToRevenueRatio` | Desde `total-company-cost.ts`      | Payroll module                                             |
| `cash` / `accrual`      | Métricas duales por base contable  | Income/expenses                                            |

## Other Dashboard Endpoints

### `GET /api/finance/dashboard/cashflow`

Cash flow projection basado en pagos reales (income_payments) y gastos pagados.

### `GET /api/finance/dashboard/aging`

AR/AP aging analysis con buckets de 30/60/90+ días.

### `GET /api/finance/dashboard/by-service-line`

Revenue y costs desglosados por línea de servicio (globe, digital, reach, wave, crm).

### Cash management endpoints (TASK-280)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/finance/expenses/[id]/payments` | GET | Pagos registrados contra un documento de compra |
| `/api/finance/expenses/[id]/payments` | POST | Registrar pago contra documento de compra |
| `/api/finance/cash-in` | GET | Lista consolidada de cobros (income_payments) |
| `/api/finance/cash-out` | GET | Lista consolidada de pagos (expense_payments) |
| `/api/finance/cash-position` | GET | Posición de caja: cuentas, por cobrar/pagar, serie 12 meses |

## Outbox Events

### Emitidos por Finance (13 event types)

| Event Type                            | Aggregate          | Cuándo                           |
| ------------------------------------- | ------------------ | -------------------------------- |
| `finance.income.created`              | income             | Nueva factura                    |
| `finance.income.updated`              | income             | Factura modificada               |
| `finance.expense.created`             | expense            | Nuevo gasto                      |
| `finance.expense.updated`             | expense            | Gasto modificado                 |
| `finance.income_payment.created`      | income_payment     | Pago registrado                  |
| `finance.income_payment.recorded`     | income_payment     | Pago finalizado                  |
| `finance.cost_allocation.created`     | cost_allocation    | Gasto asignado a cliente         |
| `finance.cost_allocation.deleted`     | cost_allocation    | Asignación eliminada             |
| `finance.exchange_rate.upserted`      | exchange_rate      | Tipo de cambio actualizado       |
| `finance.economic_indicator.upserted` | economic_indicator | Indicador económico sincronizado |
| `finance.dte.discrepancy_found`       | dte_reconciliation | Discrepancia DTE detectada       |

### Consumidos (proyecciones reactivas)

| Projection                  | Eventos que la disparan                                                                          | Resultado                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `client_economics`          | income._, expense._, payment._, allocation._, payroll._, assignment._, membership.\*             | Recomputa snapshot de rentabilidad por cliente |
| `member_capacity_economics` | expense.updated, exchange*rate.upserted, payroll.*, assignment.\_                                | Recalcula costo por FTE                        |
| `notification_dispatch`     | dte.discrepancy_found, income.created, expense.created, payment.recorded, exchange_rate.upserted | Notificaciones in-app + email                  |

## Notification Mappings

Finance genera 5 tipos de notificación via webhook bus:

| Evento                            | Categoría       | Recipients     |
| --------------------------------- | --------------- | -------------- |
| `finance.income_payment.recorded` | `finance_alert` | Finance admins |
| `finance.expense.created`         | `finance_alert` | Finance admins |
| `finance.dte.discrepancy_found`   | `finance_alert` | Finance admins |
| `finance.income.created`          | `finance_alert` | Finance admins |
| `finance.exchange_rate.upserted`  | `finance_alert` | Finance admins |

## Cross-Module Bridges

### Finance ↔ Payroll

| Bridge                      | Dirección                                            | Mecanismo                                       |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Labor cost in P&L           | Payroll → Finance                                    | PnL endpoint lee `payroll_entries` directamente |
| Expense linking             | Finance → Payroll                                    | `expenses.payroll_entry_id` + `member_id`       |
| Cost allocation             | Payroll → Finance                                    | `client_labor_cost_allocation` serving view     |
| Commercial cost attribution | Payroll/Capacity/Finance → Finance/Cost Intelligence | `commercial_cost_attribution` serving table     |
| Period status               | Payroll → Finance                                    | PnL solo incluye `approved`/`exported`          |

### Finance ↔ People

| Bridge             | Dirección        | Mecanismo                                   |
| ------------------ | ---------------- | ------------------------------------------- |
| Member cost        | Finance → People | `GET /api/people/[memberId]/finance-impact` |
| Capacity economics | Payroll → People | `member_capacity_economics` serving view    |
| Cost/revenue ratio | Finance → People | Finance impact card en HR Profile tab       |

### Finance ↔ Agency

| Bridge               | Dirección        | Mecanismo                                                                               |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| Space revenue/margin | Finance → Agency | `getSpaceFinanceMetrics()` + `GET /api/agency/finance-metrics`                          |
| Org economics        | Finance → Agency | `operational_pl_snapshots` org-first, con fallback a `client_economics.organization_id` |

## Cost Allocation System

### Métodos disponibles

| Método             | Cuándo                               | Implementación                    |
| ------------------ | ------------------------------------ | --------------------------------- |
| `manual`           | Admin asigna explícitamente          | UI en `/finance/cost-allocations` |
| `fte_weighted`     | Distribución por FTE del member      | `auto-allocation-rules.ts`        |
| `revenue_weighted` | Distribución por ingreso del cliente | `auto-allocation-rules.ts`        |
| `headcount`        | Distribución por headcount           | Disponible, no wired              |

### Auto-allocation (TASK-138)

Reglas declarativas ejecutadas fire-and-forget al crear un expense:

1. Expense type `payroll` + `member_id` → allocate to member's clients by FTE
2. Cost category `infrastructure` + no `client_id` → distribute by revenue weight
3. Already has `client_id` → no auto-allocation
4. No match → leave as unallocated overhead

## Canonical Helpers

| Helper                          | Archivo                    | Propósito                                   |
| ------------------------------- | -------------------------- | ------------------------------------------- |
| `getLatestPeriodCompanyCost()`  | `total-company-cost.ts`    | Costo empresa = gross + employer charges    |
| `resolveExchangeRateToClp()`    | `shared.ts`                | Resuelve tipo de cambio, error si no existe |
| `checkExchangeRateStaleness()`  | `shared.ts`                | Detecta rates >7 días                       |
| `resolveAutoAllocation()`       | `auto-allocation-rules.ts` | Auto-asignación de gastos a clientes        |
| `resolveFinanceClientContext()` | `canonical.ts`             | Resuelve clientId/orgId/profileId           |
| `reconcilePaymentTotals()`      | `payment-ledger.ts`        | Reconcilia amount_paid vs SUM(payments)     |

## Data Quality

`GET /api/finance/data-quality` retorna 6 checks:

| Check                      | Qué verifica                                       |
| -------------------------- | -------------------------------------------------- |
| `payment_ledger_integrity` | amount_paid = SUM(income_payments.amount)          |
| `exchange_rate_freshness`  | Rate USD/CLP no tiene >7 días                      |
| `orphan_expenses`          | Gastos sin client_id (excluye tax/social_security) |
| `income_without_client`    | Ingresos sin client_id                             |
| `dte_pending_emission`     | Emisiones DTE en cola de retry                     |
| `overdue_receivables`      | Facturas vencidas (due_date < today)               |

Integrado en Admin Center > Ops Health como subsistema "Finance Data Quality".

## File Reference

| Archivo                                          | Propósito                                     |
| ------------------------------------------------ | --------------------------------------------- |
| `src/lib/finance/shared.ts`                      | Tipos, validadores, helpers compartidos       |
| `src/lib/finance/postgres-store.ts`              | Slice 1: accounts, suppliers, rates           |
| `src/lib/finance/postgres-store-slice2.ts`       | Slice 2: income, expenses, payments (primary) |
| `src/lib/finance/postgres-store-intelligence.ts` | Client economics snapshots                    |
| `src/lib/finance/payment-ledger.ts`              | Income payment recording                      |
| `src/lib/finance/reconciliation.ts`              | BigQuery reconciliation (@deprecated)         |
| `src/lib/finance/postgres-reconciliation.ts`     | Postgres reconciliation (primary)             |
| `src/lib/finance/exchange-rates.ts`              | Exchange rate sync                            |
| `src/lib/finance/economic-indicators.ts`         | UF, UTM, IPC sync                             |
| `src/lib/finance/dte-coverage.ts`                | DTE/Nubox reconciliation metrics              |
| `src/lib/finance/dte-emission-queue.ts`          | DTE emission retry queue                      |
| `src/lib/finance/auto-allocation-rules.ts`       | Cost allocation automation                    |
| `src/lib/finance/total-company-cost.ts`          | Canonical company cost helper                 |
| `src/lib/finance/payroll-cost-allocation.ts`     | Labor cost bridge to payroll                  |
| `src/app/api/finance/dashboard/pnl/route.ts`     | P&L endpoint (motor central)                  |
| `src/app/api/finance/dashboard/summary/route.ts` | Working capital metrics                       |
| `src/app/api/finance/data-quality/route.ts`      | Data quality checks                           |
