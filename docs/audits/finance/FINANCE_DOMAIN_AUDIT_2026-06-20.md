# FINANCE_DOMAIN_AUDIT_2026-06-20

## Status

- Date: 2026-06-20
- Scope: revisión end-to-end del dominio Finance en `greenhouse-eo` — rutas API, UI, lógica de dominio (`src/lib/finance/**`), syncs/integraciones externas, outbox→reactive projections, estado de la BD viva y señales de salud
- Auditor: Claude (Opus 4.8) usando la skill `greenhouse-finance-accounting-operator`
- Addendum auditor: Codex (GPT-5) usando `greenhouse-finance-accounting-operator` y `pnpm codex:task-hook TASK-1184` como contexto operativo
- Mode: `audit`
- Runtime checked: Cloud SQL dev/staging vía `pnpm pg:connect --shell` (proxy Cloud SQL, read-only)
- Mutation policy: **read-only**; no se modificó runtime ni datos
- External benchmarks: IFRS 15, IAS 7, COSO (SoD, control activities), Chile SII/DTE/VAT
- Criticality: alta
- Business sensitivity: alta
- Predecesora: [FINANCE_DOMAIN_AUDIT_2026-05-03](FINANCE_DOMAIN_AUDIT_2026-05-03.md)

## Executive Summary

El dominio Finance está **arquitectónicamente maduro y sano en datos**. Las defensas canónicas (VIEWs CLP-normalizadas, `economic_category`, OTB cascade-supersede, payment-order atómico, outbox→reactive) están operando y **todas las señales de drift críticas están en cero** en runtime vivo (2026-06-20).

El trabajo real no es corrupción de datos: son **gaps de borde y backlog operativo**:

1. Un cron de reintento DTE huérfano (sin scheduler).
2. Dos crons que viven en Vercel cron (solo corren en prod, no en staging) → indicadores económicos y FX LATAM stale en staging.
3. Una cola de revisión de `economic_category` con 171 ítems `pending` sin drenar.
4. Tres issues abiertos con usuario afectado (ISSUE-045, ISSUE-055, ISSUE-058).
5. Cuatro tasks `in-progress` cuyos invariantes ya están escritos pero el lifecycle no se cerró.
6. Una vista viva sin ítem de menú (`/finance/external-signals`).

Conclusión práctica Claude: **Finance transaccional está bien defendido; el foco de mejora es robustez de infraestructura de syncs (paridad staging), higiene de lifecycle y drenaje de backlog de clasificación — no remediación de datos.**

Delta Codex: esa conclusión se sostiene para **transactional finance / treasury / payment ledgers**, pero no debe extenderse a **Management Accounting / Cost Attribution / Cost Intelligence**. La capa `commercial_cost_attribution` presenta handlers reactivos en `failed` por `permission denied for schema greenhouse_serving`, no materializa mayo/junio y deja `operational_pl` con costos `0` en junio. Por tanto, el estado correcto del dominio es: **transaccional sano; management accounting degradado y no apto todavía como baseline canónico de margen para mayo/junio.**

## Audit Scope

### Forma del dominio (inventario)

| Capa | Cantidad |
|---|---|
| Rutas API (`src/app/api/finance/**`) | 156 archivos (~140 `route.ts`) |
| Páginas UI (`(dashboard)/finance/**`) | 38 pages |
| Subdominios de lógica (`src/lib/finance/*`) | 28 carpetas + ~70 módulos |
| Migraciones finance | 74 |
| Tablas en `greenhouse_finance` | 66 |
| VIEWs canónicas | 4 |
| Eventos outbox finance (histórico) | 40.745 (100% `published`) |

Subsistemas: Income/DTE · Expenses/Payables · Ledger/Settlement (`settlement_groups` + `settlement_legs`) · Bank/Treasury · Reconciliación · Payment Orders/Obligations · Payment Instruments · FX/Currency · Economic Category · Expense Distribution · Quotes/Quote-to-Cash · Contractor Payables · VAT Chile · Cost Allocation/Intelligence · Shareholder CCA · Beneficiary Payment Profiles.

### Architecture / docs reviewed

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `.codex/skills/greenhouse-finance-accounting-operator/references/greenhouse-finance-runtime-map.md`
- `docs/architecture/agent-invariants` (secciones finance embebidas)
- `docs/issues/open/ISSUE-045`, `ISSUE-055`, `ISSUE-058`
- `src/lib/navigation/route-reachability-manifest.ts`
- `vercel.json` + `services/ops-worker/deploy.sh`

## Live runtime health (2026-06-20)

Sondas de drift ejecutadas contra Cloud SQL (read-only). **Todas las señales críticas en steady state:**

| Señal | Esperado | Real | Estado |
|---|---|---|---|
| `expense_payments` requiring FX repair | 0 | 0 / 121 | ✅ |
| `income_payments` requiring FX repair | 0 | 0 / 27 | ✅ |
| `expenses.economic_category` sin resolver | 0 | 0 / 226 | ✅ |
| `income.economic_category` sin resolver | 0 | 0 / 75 | ✅ |
| `payment_orders` paid sin `expense_payment` (drift) | 0 | 0 | ✅ |
| Outbox finance pendiente/dead-letter | 0 | 0 (40.745 published) | ✅ |
| `account_balances` frescura (8 cuentas) | hoy | 2026-06-20 | ✅ |
| DTE emission queue stuck | 0 | cola vacía | ✅ |

Cuentas con saldo rematerializado al día: `santander-clp`, `santander-usd`, `santander-corp-clp`, `global66-clp`, `global-66-mxn`, `deel-clp`, `previred-clp`, `sha-cca-julio-reyes-clp`. El cron `ops-finance-rematerialize-balances` (5am Santiago) está corriendo correctamente.

`payment_orders` por estado: 5 `paid`, 3 `cancelled`, 1 `pending_approval`.

### Management accounting / cost intelligence caveat (Codex addendum)

Las sondas transaccionales no cubren por sí solas la salud de P&L operativo. La revisión Codex encontró:

| Señal | Real | Estado |
|---|---|---|
| `greenhouse_serving.commercial_cost_attribution` | filas solo para 2026-02, 2026-03 y 2026-04; sin mayo/junio | ❌ |
| `commercial_cost_attribution:*` handlers reactivos | `failed` con `permission denied for schema greenhouse_serving` | ❌ |
| `operational_pl_snapshots` junio 2026 | revenue materializado con costo `0` | ❌ |
| `greenhouse_serving.finance_ai_enrichment_runs` | 66 ejecuciones | 🟡 |
| `greenhouse_serving.finance_ai_signals` / `finance_ai_signal_enrichments` | 0 filas | 🟡 |

El outbox principal puede estar `published` y aun así dejar consumidores reactivos degradados. En este caso el problema vive en la proyección/consumer y en permisos/runtime DDL, no en la cola principal.

## Mapa de syncs e integraciones

### Lane canónico — Cloud Scheduler + ops-worker (corre en staging **y** prod)

| Job | Schedule | Propósito |
|---|---|---|
| `ops-outbox-publish` | `*/2 * * * *` | PG outbox → BQ raw |
| `ops-reactive-finance` | `*/5 * * * *` | Materializa projections finance |
| `ops-nubox-sync` | `30 7 * * *` | Ingesta Nubox 3 fases (API→BQ raw→conformed→PG) |
| `ops-nubox-balance-sync` | `0 */4 * * *` | Balances Nubox → PG + outbox `finance.balance_divergence.detected` |
| `ops-nubox-quotes-hot-sync` | `*/15 * * * *` | Quotes hot path |
| `ops-finance-rematerialize-balances` | `0 5 * * *` | Rematerialize rolling 7 días de `account_balances` |
| `ops-finance-fx-drift-remediate` | `15 5 * * *` | Remediación acotada FX drift (TASK-842) |
| `ops-finance-ledger-health` | `30 5 * * *` | Probe de drift + alerta Sentry |
| `ops-reconciliation-auto-match` | `45 7 * * *` | Auto-match de statements bancarios |
| `ops-quotation-lifecycle` | `0 7 * * *` | Expiración/renovación de cotizaciones |
| `ops-hubspot-quotes-sync` / `-products-sync` | `0 */6` / `0 8` | Outbound a HubSpot |

### Integraciones externas

- **Nubox** = gateway de DTE (no SII directo, vía `src/lib/nubox/emission.ts`) + fuente inbound de facturación (3 fases). Códigos DTE: 33/34/56/61/38/39/41/52.
- **mindicador.cl** = USD/CLP + UF/UTM/IPC (fallback `open.er-api.com`). IMM es `manual_only`.
- **FX LATAM** (COP/PEN/MXN) vía TRM/SUNAT/Banxico con circuit breakers (`src/lib/finance/fx/sync-orchestrator.ts`).
- **HubSpot** = income→invoice, products, quotes (todo outbound vía reactive projections). Ruta `quotes/hubspot` deprecada (410 Gone, TASK-463).

### Reactive projections finance (consumidores de outbox)

`account_balances`, `provider_bq_sync`, `income_hubspot_outbound`, `vat_monthly_position`, `operational_pl`, `client_economics`, `member_capacity_economics`, `commercial_cost_attribution`, `record_expense_payment_from_order` (read-only safety net), `contractor_payable_*`, `quotation_*`, `product_catalog_*`, `deal_pipeline`, `contract_mrr_arr`.

## Findings

### F1 — `economic_category_manual_queue`: 171 ítems `pending` (🟡 backlog operativo)

La data no está rota (0 `economic_category` unresolved en expenses/income), pero el clasificador automático encoló 171 ítems de baja confianza para confirmación humana y nadie los está drenando. Es el ítem más "vivo" de la auditoría.

- **Impacto:** clasificación analítica de baja confianza acumulándose; no afecta fiscal (`expense_type`/`income_type`) ni cash.
- **Acción sugerida:** triagear/drenar la cola; revisar si hay reglas declarativas (`known_regulators`/`known_payroll_vendors`) que cubrirían el grueso.

### F2 — `/api/cron/dte-emission-retry` huérfano (🟠 gap latente)

La ruta de reintento/dead-letter de DTE existe pero **no está registrada en `vercel.json`, ni en ops-worker `deploy.sh`, ni en GitHub Actions**. Hoy la `dte_emission_queue` está vacía, así que no muerde — pero si una emisión DTE falla y se encola, nada la reintenta.

- **Acción sugerida:** registrar el cron en Cloud Scheduler (lane canónico) o eliminar la ruta si está muerta. Si se registra, agregar reliability signal de `dte_emission_queue` dead-letter.

### F3 — Dos crons en Vercel cron (solo prod, no staging) (🟠 paridad staging)

Exactamente la bug-class que CLAUDE.md advierte (Vercel custom env no corre crons):

- `economic-indicators/sync` (`vercel.json`) — UF/UTM/IPC + co-sync USD/CLP.
- `fx-sync-latam` (3 ventanas) — COP/PEN/MXN.

En staging estos indicadores quedan stale. Además, `exchange-rates/sync` (USD/CLP plano) no tiene scheduler propio — depende de ser llamado o del co-sync de economic-indicators.

- **Acción sugerida:** migrar ambos a Cloud Scheduler / ops-worker, replicando el patrón de TASK-775.

### F4 — `/finance/external-signals` sin ítem de menú (🟠 UI)

`ExternalSignalsView` (vista viva, TASK-708) es alcanzable solo por URL directa; no tiene ítem de navegación. Tracked como follow-up TASK-983 (necesita viewCode + migración seed). La reachability-gate la cubre como child route declarada, así que no es "orphan" formal, pero es un dead-end de UX.

### F5 — Issues abiertos con usuario afectado (🔴)

- **ISSUE-045** — `POST /api/finance/purchase-orders` → HTTP 500: referencia ambigua a `client_id` sin alias en `resolveFinanceClientContext()` (`src/lib/finance/canonical.ts`, JOIN `client_profiles cp LEFT JOIN spaces s`). Coherente con que `purchase_orders` tiene solo 1 fila en prod. **Fix de baja complejidad, alto valor.**
- **ISSUE-055** — Quote builder no puede cotizar rol `ECG-004` (PR Analyst): el pricing engine no tiene cost basis para ese SKU (`Missing cost components for role ECG-004`).
- **ISSUE-058** — Webhook `greenhouse-teams-finance-alerts-webhook` no provisionado en GCP Secret Manager (TASK-669 deploy pendiente) → alertas finance se saltan. Mitigado con flag `provisioning_status='pending_setup'`.

### F6 — Cuatro tasks `in-progress` sin cerrar lifecycle (🟡 higiene)

TASK-929 (ledger drift remediation), TASK-934 (unanchored expense ack), TASK-776 (temporal modes), TASK-871 (rolling anchor) aparecen como `in-progress` en el doc canónico; los invariantes están escritos pero el lifecycle no se movió a `complete`. Verificar estado real y cerrar o reflejar el bloqueo.

### F7 — `commercial_cost_attribution` reactivo fallando por permisos de `greenhouse_serving` (🔴 management accounting)

Los handlers reactivos de `commercial_cost_attribution` aparecen en estado `failed`, con `infra.db_privilege / permission denied for schema greenhouse_serving`. Afecta eventos como:

- `finance.exchange_rate.upserted`
- `membership.created`
- `membership.deactivated`
- `finance.expense.created`
- `payroll_entry.upserted`
- `compensation_version.created`
- `finance.income.created`
- `payroll_period.calculated` / `payroll_period.exported`

Evidencia adicional: la auditoría de reliability del 2026-05-26 ya documentaba el mismo síntoma en proyecciones sobre `greenhouse_serving`; por lo tanto no parece un incidente aislado del día.

Root cause probable: `src/lib/commercial-cost-attribution/store.ts:66` ejecuta `CREATE TABLE IF NOT EXISTS greenhouse_serving.commercial_cost_attribution` desde runtime mediante `ensureCommercialCostAttributionSchema()`. Ese DDL exige privilegios de schema que el rol runtime no debería necesitar. La proyección reactiva en `src/lib/sync/projections/commercial-cost-attribution.ts:157` invoca la materialización y hereda esa falla.

Tratamiento recomendado:

- mover el DDL de `commercial_cost_attribution` a migración gobernada;
- dejar runtime solo con DML/SELECT sobre tablas ya existentes;
- reprocesar handlers fallidos después del fix;
- confirmar que `handler_health` vuelve a `healthy` y que `outbox_reactive_log` no conserva dead letters no recuperados.

### F8 — `operational_pl` de mayo/junio no es confiable como margen canónico (🔴 cost intelligence)

`commercial_cost_attribution` solo tiene materialización efectiva hasta abril 2026. En junio 2026, `operational_pl_snapshots` muestra revenue materializado, pero costo `0`. Ese patrón no debe presentarse como margen real; es una degradación de serving.

Impacto:

- dashboards de profitability / P&L pueden sobreestimar margen;
- Nexa o cualquier insight financiero que use `operational_pl` puede producir recomendaciones con base incompleta;
- cualquier cierre o baseline de margen mayo/junio debe quedar como provisional/degradado hasta rematerializar.

Tratamiento recomendado:

- resolver F7 primero;
- rematerializar `commercial_cost_attribution` para mayo/junio;
- rematerializar `operational_pl_snapshots`;
- agregar un health gate que marque `operational_pl` como degradado cuando falte cost attribution para el período.

### F9 — Auditoría de permisos/capabilities route-by-route pendiente (🟠 controls)

Inventario Codex:

- `206` route files entre `src/app/api/finance`, `src/app/api/admin/finance` y `src/app/api/cost-intelligence`;
- `143` con tokens directos de contexto/session guard (`requireFinanceTenantContext`, `requireInternalTenantContext`, etc.);
- `35` con token textual `can(...)`;
- `63` sin esos tokens directos, incluyendo superficies de Cost Intelligence, Bank, Contracts, Quotes, Reconciliation snapshots y Shareholder Account.

Esto es una heurística textual, no una condena final: algunas rutas pueden delegar auth en helpers internos, share routes o readers. Pero por criticidad financiera no basta con patrón implícito. Requiere revisión route-by-route separando:

- rutas públicas/share intencionales;
- rutas read-only internas;
- mutations con maker-checker/capability explícita;
- sync endpoints y admin-only actions.

### F10 — Finance AI enrichments corren, pero no hay señales persistidas (🟡 Nexa/insights)

`greenhouse_serving.finance_ai_enrichment_runs` tiene ejecuciones recientes, pero `finance_ai_signals` y `finance_ai_signal_enrichments` están vacías. Esto puede explicar degradaciones/404 en superficies Nexa que intenten profundizar insights financieros, y vuelve riesgoso construir acciones gobernadas sobre finance insights sin validar primero el source-of-truth de signals.

Tratamiento recomendado:

- identificar si finance insights deben venir de `finance_ai_signals`, `nexa-insights` API, `operational_pl`, o una capa nueva;
- asegurar IDs resolubles antes de habilitar drill/actions;
- degradar honestamente cuando un insight financiero no tenga señal persistida.

## Invariantes verificados (no violados)

- VIEWs CLP-normalizadas (`expense_payments_normalized` / `income_payments_normalized`) en uso; 0 drift.
- `economic_category` persistida y resuelta (0 unresolved); separada de `expense_type` fiscal.
- Payment-order atómico (`markPaymentOrderPaidAtomic`): 0 paid sin `expense_payment`.
- Outbox→reactive: 0 eventos finance pendientes/dead-letter.
- OTB cascade + genesis floor: `account_balances` fresco al día sin filas pre-genesis observadas.

## Recommendations (priorizadas)

| # | Acción | Tipo | Esfuerzo | Valor |
|---|---|---|---|---|
| 0 | Remover DDL runtime de `commercial-cost-attribution/store.ts`, migrarlo a schema governance y reintentar handlers fallidos | Management accounting / sync | Medio | Crítico |
| 0.1 | Rematerializar `commercial_cost_attribution` + `operational_pl_snapshots` mayo/junio y marcar snapshots degradados si falta costo | Cost Intelligence | Medio | Crítico |
| 0.2 | Ejecutar auditoría de capabilities sobre las 206 rutas finance/admin/cost-intelligence | Controls / API governance | Medio | Alto |
| 1 | Fix ISSUE-045 (alias `client_id` en `resolveFinanceClientContext`) | Bug runtime | Bajo | Alto |
| 2 | Migrar `economic-indicators/sync` + `fx-sync-latam` a Cloud Scheduler | Robustez/paridad | Medio | Alto |
| 3 | Registrar o eliminar `dte-emission-retry` cron + signal dead-letter | Robustez | Bajo | Medio |
| 4 | Drenar/triagear 171 pending de `economic_category_manual_queue` | Backlog ops | Medio | Medio |
| 5 | Fix ISSUE-055 (cost basis ECG-004) | Bug runtime | Medio | Medio |
| 6 | Provisionar webhook Teams Finance (ISSUE-058 / TASK-669) | Infra | Bajo | Medio |
| 7 | Agregar ítem de menú + viewCode a `/finance/external-signals` (TASK-983) | UI | Bajo | Bajo |
| 8 | Cerrar lifecycle de TASK-929/934/776/871 o reflejar bloqueo | Higiene docs | Bajo | Bajo |

## Escalation / límites de esta auditoría

- Auditoría **read-only** sobre runtime dev/staging vía Cloud SQL Connector; no se ejecutaron writes ni se validó el comportamiento de prod independientemente.
- El addendum Codex también fue **read-only**; no se editó runtime, no se reprocesaron handlers y no se ejecutaron rematerializaciones.
- No se recomputó `account_balances.fx_drift` con la sonda de 90 días (se verificó frescura y ausencia de filas en cola de repair; el recompute completo queda para la remediación si se aborda F3).
- Los conteos `-1` de `reltuples` en tablas pequeñas indican tablas sin `ANALYZE` reciente (no es un defecto; son tablas de baja escritura).
- No es asesoría tributaria/legal de filings (DTE/F29/VAT). Verificar tasas y reglas vigentes contra SII antes de cualquier cierre fiscal.

## Verification performed

- `find`/`grep` sobre `src/app/api/finance`, `src/lib/finance`, `migrations`, `vercel.json`, `services/ops-worker`.
- Lectura del doc canónico `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` + secciones de invariantes.
- SQL read-only contra `greenhouse_finance` (tablas, VIEWs, drift, frescura de balances, outbox lag) vía `pnpm pg:connect --shell`.
- Cross-check de `docs/issues/open/` y `route-reachability-manifest.ts`.
- Codex addendum: `pnpm codex:task-hook TASK-1184`, `pnpm pg:doctor`, inventario `rg` de rutas API/UI/libs/scripts, SQL read-only contra `greenhouse_finance`, `greenhouse_serving`, `greenhouse_cost_intelligence` y `greenhouse_sync`, revisión de `handler_health` / `outbox_reactive_log`, y contraste con `src/lib/commercial-cost-attribution/store.ts` + `src/lib/sync/projections/commercial-cost-attribution.ts`.
