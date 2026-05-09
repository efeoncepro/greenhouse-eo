# Greenhouse Reliability Control Plane V1

> Spec canónica del `Reliability Control Plane` de Greenhouse EO. Define el registry por módulo, el modelo unificado de señales, el contrato de evidencia y cómo `Admin Center`, `Ops Health` y `Cloud & Integrations` consumen la lectura consolidada sin duplicar fuentes.
>
> Versión: `1.6`
> Estado: `vigente`
> Creada: `2026-04-25` por TASK-600
> Última actualización: `2026-05-09` por ISSUE-073 / TASK-607 (smoke-lane flaky semantics + Actions Node 24)

---

## Delta 2026-05-09 — ISSUE-073 / TASK-607 flaky semantics + GitHub Actions runtime

El resultado canónico de un smoke lane Playwright se deriva del outcome final de cada spec, no del primer intento. Playwright puede reportar `flaky` cuando un intento falla y un retry pasa; ese estado no debe contarse como `failed_tests` porque el lane terminó recuperado y el workflow sigue siendo verde.

Contrato vigente:

- `scripts/lib/smoke-lane-report.ts` es el parser canónico reusable para reportes Playwright publicados por CI.
- `failed_tests` cuenta solo specs cuyo último intento terminó en `failed | timedOut | interrupted`.
- `summary_json.flakyCount` cuenta specs con intento fallido previo y último intento `passed`.
- `status='failed'` solo si existe al menos una falla final; si no hay fallas finales y hay flaky specs, `status='flaky'`.
- El log esperado incluye `flaky=<n>`: `[smoke-lane-publish] lane=<lane> status=<passed|failed|flaky> total=<n> passed=<n> failed=<n> flaky=<n> skipped=<n>`.
- Las navegaciones E2E autenticadas deben usar `gotoAuthenticated()` o `gotoWithTransientRetries()` para absorber cold-start/red transitoria con retries acotados. HTTP 4xx/5xx, redirects de auth y asserts funcionales siguen fallando loud.
- Los workflows GitHub usan actions compatibles con runtime Node.js 24: `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-artifact@v5`, `pnpm/action-setup@v6`, `google-github-actions/auth@v3`, `google-github-actions/setup-gcloud@v3`.

Steady state esperado:

- Una suite Playwright con `33 passed, 3 flaky` publica `failed_tests=0`, `summary_json.flakyCount=3` y `status='flaky'`.
- No quedan referencias a las actions target antiguas (`checkout/setup-node/upload-artifact@v4`, `pnpm/action-setup@v4`, `google-github-actions/auth/setup-gcloud@v2`) en `.github/workflows/`.
- Los warnings de GitHub Actions por Node.js 20 de actions desaparecen; `node-version: 20` de los jobs se mantiene separado y solo controla el runtime de app/tests.

## Delta 2026-05-09 — ISSUE-072 smoke-lane publisher reliability

Los smoke lanes Playwright publican su resultado en `greenhouse_sync.smoke_lane_runs` mediante `pnpm sync:smoke-lane <lane-key>`. Esa publicación es best-effort respecto del resultado E2E, pero no debe fallar de forma cotidiana ni generar ruido permanente en GitHub Actions.

Contrato vigente:

- `pnpm sync:smoke-lane` carga `scripts/lib/server-only-shim.cjs` porque importa primitives server-side (`src/lib/postgres/client.ts`, Secret Manager).
- El workflow Playwright autentica con WIF y usa `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`.
- El service account GitHub debe tener `roles/cloudsql.client` para Cloud SQL Connector.
- `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF` debe ser nombre canónico de Secret Manager o ruta completa; no `secret:version`.
- El publisher usa `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=1`.
- La primitive Postgres compartida reintenta con backoff acotado errores transitorios de conexión (`53300`, `080xx`, `57P0x`, TLS/reset/too many connections).

Steady state esperado en CI:

- Playwright puede pasar o fallar por razones funcionales del producto.
- El paso `Publish smoke-lane results to PG` debe terminar OK y registrar logs `[smoke-lane-publish] lane=<lane> status=<passed|failed|flaky>`.
- No deben aparecer annotations `sync:smoke-lane <lane> failed (non-blocking)`.
- Si reaparecen, se debe tratar como incidente operacional nuevo y revisar en este orden: server-only shim, secret ref, WIF/IAM, Cloud SQL saturation, schema/grants.

## Delta 2026-05-03 — TASK-768 subsystem `Finance Data Quality` (2 signals nuevos para economic_category)

Cierra ISSUE-065 (KPI Nómina sub-counted ~$3M abril 2026 por mis-clasificación). Agrega 2 signals al subsystem existente para detectar filas en `expenses` / `income` con `economic_category IS NULL` (pre-cutover legacy o trigger bypass).

### Signals nuevos

- `finance.expenses.economic_category_unresolved`
  - Kind: `drift`
  - Severity rule: `count > 0 → error`; `count === 0 → ok`
  - Steady value: `0` post-cleanup manual queue + VALIDATE atomic
  - Reader: `getExpensesEconomicCategoryUnresolvedSignal` (`src/lib/reliability/queries/economic-category-unresolved.ts`)
  - Query: `SELECT COUNT(*) FROM greenhouse_finance.expenses WHERE economic_category IS NULL`

- `finance.income.economic_category_unresolved`
  - Kind: `drift`
  - Severity rule: idem
  - Reader: `getIncomeEconomicCategoryUnresolvedSignal`

### Builder canónico

`buildFinanceEconomicCategoryUnresolvedSignals` en `src/lib/reliability/signals.ts:1029-1041` — `Promise.all` sobre los 2 readers, retorna `ReliabilitySignal[]`. Mismo pattern que `buildFinanceClpDriftSignals` (TASK-766).

### Subsystem rollup

Subsystem: `Finance Data Quality` (existente). Cualquiera de los 2 signals con `count > 0` flips el subsystem a `error`, lo que escala al rollup `Finance` y al payload de `/api/admin/platform-health` con `safeMode.financeReadSafe=false`.

### Reclassification path documentado

El AI Observer (TASK-638) capta el signal y enlaza a los endpoints admin canónicos:

```http
PATCH /api/admin/finance/expenses/{id}/economic-category
PATCH /api/admin/finance/income/{id}/economic-category
Body: { economicCategory, reason (min 10 chars), bulkContext? }
Capabilities: finance.expenses.reclassify_economic_category | finance.income.reclassify_economic_category
              (FINANCE_ADMIN + EFEONCE_ADMIN, least-privilege)
```

Los endpoints atómicamente: UPDATE economic_category + INSERT audit log + UPDATE manual_queue → resolved + outbox event v1.

### Steady state esperado

Post-backfill (Slice 3): drift inicial = 161 expenses + 19 income en manual queue (esperado, son Nubox imports con `expense_type='supplier'` sin metadata para auto-resolve).

Post-cleanup manual queue (UI Slice 6 + operador): drift = 0. Migration follow-up hace `VALIDATE CONSTRAINT expenses_economic_category_required_after_cutover` atomic.

Post-cutover (CHECK NOT NULL VALIDATED): cualquier reaparición de count > 0 indica trigger bypass o admin override SQL directo. AI Observer alerta.

**Spec canónica**: `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`.

---

## Delta 2026-05-03 — TASK-766 module `finance.payment_orders` (2 signals nuevos para CLP drift)

Cierra el incidente 2026-05-02 (KPIs en `/finance/cash-out` inflados 88× por anti-patrón `SUM(ep.amount × exchange_rate_to_clp)` aplicado a payments con `currency != document.currency`). Agrega 2 signals al subsystem `Finance Data Quality` para detectar payments con `currency != 'CLP' AND amount_clp IS NULL` — la condición que el anti-patrón explotaba.

### Signals nuevos

| `signalKey` | Kind | Severity rule | Steady value | Reader |
| --- | --- | --- | --- | --- |
| `finance.expense_payments.clp_drift` | `drift` | `count > 0 → error`; `count === 0 → ok` | `0` | `getExpensePaymentsClpDriftSignal` (`src/lib/reliability/queries/expense-payments-clp-drift.ts`) |
| `finance.income_payments.clp_drift` | `drift` | `count > 0 → error`; `count === 0 → ok` | `0` | `getIncomePaymentsClpDriftSignal` (`src/lib/reliability/queries/income-payments-clp-drift.ts`) |

Ambos consultan la VIEW canónica `expense_payments_normalized` / `income_payments_normalized` con `WHERE has_clp_drift = TRUE`. Reusan los helpers `getExpensePaymentsClpDriftCount` / `getIncomePaymentsClpDriftCount` para no duplicar SQL.

### Builder + wiring

- `buildFinanceClpDriftSignals` en `src/lib/reliability/signals.ts` — `Promise.all` sobre los 2 readers, retorna `ReliabilitySignal[]`.
- `getReliabilityOverview` extendido en `src/lib/reliability/get-reliability-overview.ts` con `ReliabilityOverviewSources.financeClpDrift?: { expense, income }`. Pre-fetch `.catch(() => null)` para no romper rollup si la VIEW está en degradación.
- Subsystem rollup: `Finance Data Quality` (existente). Cualquiera de los 2 signals con `count > 0` flips el subsystem a `error`, lo que escala al rollup `Finance` y al payload de `/api/admin/platform-health` con `safeMode.financeReadSafe=false`.

### Repair path documentado

El AI Observer (TASK-638) capta el signal y enlaza al endpoint admin canónico:

```http
POST /api/admin/finance/payments-clp-repair
Body: { kind: 'expense_payments' | 'income_payments', dryRun?: true, ... }
Capability: finance.payments.repair_clp (FINANCE_ADMIN + EFEONCE_ADMIN)
```

El endpoint resuelve rate histórico al `payment_date` desde `greenhouse_finance.exchange_rates` y poblá `amount_clp + exchange_rate_at_payment + requires_fx_repair=FALSE` per-row atomic. Idempotente. Outbox audit `finance.payments.clp_repaired` v1.

### Steady state esperado

Post-backfill (Slice 2 migration `20260503015255538`): **drift = 0** en producción.

Post-cutover (2026-05-03): el CHECK constraint `payments_amount_clp_required_after_cutover` (NOT VALID + VALIDATE) impide INSERT/UPDATE de non-CLP sin `amount_clp`. Cualquier reaparición de `count > 0` significa: (a) supersede activo en una fila legacy, (b) bug en `recordExpensePayment` o `recordIncomePayment` (helpers canónicos), o (c) bypass directo del helper. AI Observer alerta con runbook al endpoint repair.

**Spec canónica**: `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`.

---

## Delta 2026-05-02 — TASK-765 module `finance.payment_orders` (3 signals nuevos)

Cierra el incidente 2026-05-01 (payment_orders zombie sin impacto en banco). Agrega 3 signals al subsystem `Finance Data Quality` para detectar el path payment_order → expense_payment → settlement_leg → account_balances cuando se rompe.

### Module entry

```ts
{
  moduleKey: 'finance.payment_orders',
  label: 'Payment Orders → Bank Settlement',
  description: 'Path canónico payroll → expenses → payment_orders → expense_payments → settlement_legs → account_balances',
  domain: 'finance',
  subsystemId: 'finance_data_quality',
  incidentDomainTag: 'finance',
  expectedSignalKinds: ['drift', 'dead_letter', 'lag', 'incident'],
  filesOwned: [
    'src/lib/finance/payment-orders/**',
    'src/lib/finance/payroll-expense-reactive.ts',
    'src/lib/sync/projections/record-expense-payment-from-order.ts',
    'src/lib/sync/projections/finance-expense-reactive-intake.ts',
    'src/app/api/admin/finance/payroll-expense-rematerialize/**',
    'src/app/api/admin/finance/payment-orders/[orderId]/recover/**'
  ]
}
```

Rolea al subsystem existente `Finance Data Quality` — no crea nuevo subsystem. La severidad agregada del módulo se computa con la regla canónica: peor severidad concreta entre los 4 signals esperados.

### Signal 1 — `finance.payment_orders.paid_without_expense_payment`

| Campo | Valor |
| --- | --- |
| Kind | `drift` |
| Severidad cuando count > 0 | `error` |
| Steady state | `0` |
| Source | `getPaidOrdersWithoutExpensePaymentSignal` |
| Reader | [`src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts`](../../src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts) |

Query canónica:

```sql
SELECT COUNT(*)::int AS n
FROM greenhouse_finance.payment_orders po
WHERE po.state = 'paid'
  AND po.paid_at < NOW() - INTERVAL '15 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_finance.payment_order_lines pol
     WHERE pol.order_id = po.order_id
       AND pol.expense_payment_id IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_sync.outbox_events oe
     WHERE oe.aggregate_id = po.order_id
       AND oe.event_type = 'finance.payment_order.settlement_blocked'
       AND oe.occurred_at > NOW() - INTERVAL '7 days'
  );
```

**Qué representa**: orders en `state='paid'` hace > 15 minutos cuya line(s) NO tienen `expense_payment_id` y que NO han emitido un evento `settlement_blocked` reciente (últimos 7 días). Es la divergencia exacta del incidente 2026-05-01: la order quedó "Pagada" en UI sin impacto en `account_balances` y nadie alertó.

**Bajo qué condiciones se prende**:

- Path no-atómico falla post-Slice 5 (recovery legacy o bug futuro en `markPaymentOrderPaidAtomic`).
- Proyector reactivo `record_expense_payment_from_order` skipea silenciosamente (no debería ocurrir post-Slice 4 — es safety net del safety net).
- Una migración o seed manual setea `state='paid'` directo en DB bypass del trigger.

**Por qué excluye orders con `settlement_blocked` reciente**: ese caso ya está señalado por `payment_orders_dead_letter` + el banner del DetailDrawer. Doble-conteo crearía ruido.

### Signal 2 — `finance.payment_orders.dead_letter`

| Campo | Valor |
| --- | --- |
| Kind | `dead_letter` |
| Severidad cuando count > 0 | `error` |
| Steady state | `0` |
| Source | `getPaymentOrdersDeadLetterSignal` |
| Reader | [`src/lib/reliability/queries/payment-orders-dead-letter.ts`](../../src/lib/reliability/queries/payment-orders-dead-letter.ts) |

Query canónica:

```sql
SELECT COUNT(*)::int AS n
FROM greenhouse_sync.outbox_reactive_log
WHERE handler = ANY(ARRAY[
    'record_expense_payment_from_order:finance.payment_order.paid',
    'finance_expense_reactive_intake:payroll_period.exported'
  ])
  AND result = 'dead-letter'
  AND acknowledged_at IS NULL
  AND recovered_at IS NULL;
```

**Qué representa**: dead-letters NO acknowledged y NO recovered en los 2 handlers críticos del path:

- `record_expense_payment_from_order:finance.payment_order.paid` — proyección que materializa expense_payments + settlement_legs cuando una order pasa a `paid`.
- `finance_expense_reactive_intake:payroll_period.exported` — proyección que materializa expenses desde payroll exportado (root cause del incidente 2026-05-01).

Alineado con el partial index `outbox_reactive_log_active_dead_letters_idx` (TASK 2026-04-26).

**Bajo qué condiciones se prende**:

- Resolver throw post-Slice 4 con `expense_unresolved`, `out_of_scope_v1`, `cutover_violation` o `materializer_dead_letter`.
- Materializer payroll falla con error no recuperable (drift de columnas, FK violation).
- Reactor agotó retries (`maxRetries=1` para `finance_expense_reactive_intake`, `maxRetries=2` para `record_expense_payment_from_order`).

**Cómo se apaga**: operador hace `acknowledged_at` (issue conocido sin fix) o `recovered_at` (post-fix vía `/api/admin/finance/payroll-expense-rematerialize` o `/api/admin/finance/payment-orders/[orderId]/recover`).

### Signal 3 — `finance.payroll_expense.materialization_lag`

| Campo | Valor |
| --- | --- |
| Kind | `lag` |
| Severidad cuando count > 0 | `warning` (no error) |
| Steady state | `0` |
| Source | `getPayrollExpenseMaterializationLagSignal` |
| Reader | [`src/lib/reliability/queries/payroll-expense-materialization-lag.ts`](../../src/lib/reliability/queries/payroll-expense-materialization-lag.ts) |

Query canónica:

```sql
SELECT COUNT(*)::int AS n
FROM greenhouse_payroll.payroll_periods pp
WHERE pp.status = 'exported'
  AND pp.exported_at < NOW() - INTERVAL '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_finance.expenses e
     WHERE e.payroll_period_id = pp.period_id
       AND e.expense_type = 'payroll'
       AND e.source_type = 'payroll_generated'
  );
```

**Qué representa**: períodos payroll exportados hace > 1 hora que aún no tienen filas en `greenhouse_finance.expenses` con `expense_type='payroll' AND source_type='payroll_generated'`. Captura precisamente la falla upstream del incidente 2026-05-01: el reactor falló, el período quedó sin expenses, y las payment_orders downstream se aprobaron y cerraron como zombie sobre vacío.

**Bajo qué condiciones se prende**:

- Reactor `finance_expense_reactive_intake` en dead-letter (signal 2 también prende).
- Outbox `payroll_period.exported` no se publicó (bug en payroll export path).
- Cloud Run `ops-worker` caído (signal cloud también prende).

**Severidad warning, no error**: el path es asincrónico — un período recién exportado puede tardar minutos en materializar. Solo después de 1h el lag se vuelve sospechoso. Si signal 2 (dead_letter) prende junto, el operador sabe que es bug, no propagación normal.

### Por qué los 3 signals juntos

Los 3 cubren capas distintas del mismo path:

- **Lag (signal 3)** detecta el problema **upstream** — el período payroll no llegó a `expenses` aún.
- **Dead-letter (signal 2)** detecta el problema **a mitad de pipeline** — el reactor agotó retries.
- **Drift (signal 1)** detecta el problema **downstream** — la order ya está `paid` pero el ledger no refleja el movimiento.

Si los 3 = 0, el path está sano. Si 1 prende y los otros no, es señal de un bug específico en esa capa. Si los 3 prenden simultáneos, el path está roto end-to-end (caso del incidente 2026-05-01).

### Wiring en `RELIABILITY_REGISTRY`

Registrados en [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts) bajo el moduleKey `finance.payment_orders`. Composición vía `buildReliabilityOverview()` en [`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) — los 3 signals aparecen automáticamente en el snapshot consumido por `/api/admin/reliability`, Admin Center, Ops Health y AI Observer (TASK-638).

### Spec canónica

[`docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`](../tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md) Slice 7. Contrato del path atómico documentado en [`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`](./GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) Delta 2026-05-02.

---

## 1. Por qué existe

Greenhouse ya tenía señales útiles, pero aisladas:

- `getOperationsOverview()` agregaba subsistemas, backlog reactivo, webhooks, cloud posture, observabilidad y data quality Notion.
- `GET /api/internal/health` exponía postura cloud y checks runtime.
- Sentry, `source_sync_runs`, Playwright smoke y Billing Export viven en planos distintos.

Faltaba una capa estructural que dijera **qué módulos son críticos**, **qué señales les pertenecen** y **cómo se normaliza su estado**. Sin esa base, cada nueva feature de observabilidad agrega más cards, no un sistema de confianza.

El Reliability Control Plane se sienta **encima** de las fuentes existentes — no las reemplaza, las normaliza.

## 2. Principios de diseño

1. **Registry-first.** Empezar declarando qué módulos críticos existen y qué señales les pertenecen, antes de cualquier UI o LLM.
2. **Evidence-first.** Cada señal normalizada apunta a evidencia real: endpoint, helper, incidente, test, run, doc, SQL, métrica.
3. **Module-oriented.** La lectura final responde tres preguntas por módulo: ¿qué está afectado? ¿cuán confiable está hoy? ¿por qué?
4. **Integración incremental.** TASK-586 agrega cost cloud y notion-bq-sync sin redefinir contratos. TASK-599 agrega smoke/component/route sin tocar el modelo.
5. **No duplicar contracts existentes.** `getOperationsOverview()` y `GET /api/internal/health` siguen siendo dueños de su lectura técnica; el control plane consume de ellos.

## 3. Contracts canónicos

Todos los tipos viven en [`src/types/reliability.ts`](../../src/types/reliability.ts).

### 3.1 `ReliabilityModuleDefinition` (registry estático)

Cada entrada del registry declara:

| Campo | Descripción |
|---|---|
| `moduleKey` | Identificador estable del módulo (`finance`, `integrations.notion`, `cloud`, `delivery`). |
| `label` | Nombre visible. |
| `description` | Una línea explicando el alcance operativo. |
| `domain` | Dominio macro (`platform`, `integrations`, `finance`, `delivery`). |
| `routes` | Rutas críticas que operadores esperan navegables. |
| `apis` | APIs críticas. |
| `dependencies` | Dependencias operativas que, si fallan, propagan al módulo. |
| `smokeTests` | Specs de Playwright que protegen el módulo hoy. |
| `filesOwned` | Glob patterns (minimatch) que declaran qué archivos pertenecen al módulo. Consumido por TASK-633 (change-based verification matrix). |
| `expectedSignalKinds` | Tipos de señal que se esperan vivos para este módulo. |

El seed inicial vive en [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts) y persiste como código estático. Persistencia DB se evaluará si Discovery posterior demuestra necesidad.

### 3.2 `ReliabilitySignal` (modelo unificado)

| Campo | Descripción |
|---|---|
| `signalId` | Identificador estable (`cloud.runtime.postgres`, `integrations.notion.data_quality`). |
| `moduleKey` | Módulo al que pertenece. |
| `kind` | `runtime` \| `posture` \| `incident` \| `freshness` \| `data_quality` \| `cost_guard` \| `subsystem` \| `test_lane` \| `billing`. |
| `source` | Helper origen (`getCloudHealthSnapshot`, `getCloudSentryIncidents`, etc). |
| `label` | Etiqueta visible. |
| `severity` | `ok` \| `warning` \| `error` \| `unknown` \| `not_configured` \| `awaiting_data`. |
| `summary` | Resumen humano de lo observado. |
| `evidence[]` | Array de pointers a evidencia real (kind + label + value). |
| `observedAt` | Timestamp de la observación. |

`severity` separa explícitamente `not_configured` y `awaiting_data` de `unknown` para que la señal nunca se asuma sana cuando no está plomada.

### 3.3 `ReliabilityModuleSnapshot` (vista por módulo)

Combina la definición + las señales agregadas + el estado computado:

- `status`: peor severidad agregada de las señales del módulo.
- `confidence`: `high` \| `medium` \| `low` \| `unknown` según ratio de señales esperadas que tienen evidencia concreta.
- `summary`: lectura humana en una línea.
- `signalCounts`: histograma por severidad.
- `missingSignalKinds`: tipos esperados sin plomar (boundary explícito para tasks futuras).

### 3.4 `ReliabilityIntegrationBoundary`

Declara qué task futura va a plomar qué señal:

| Campo | Descripción |
|---|---|
| `taskId` | TASK-586, TASK-599, TASK-103. |
| `moduleKey` | Módulo destino. |
| `expectedSignalKind` | Tipo de señal que se espera. |
| `expectedSource` | Helper que se espera implementar. |
| `status` | `pending` \| `partial` \| `ready`. |
| `note` | Cómo se enchufa al runtime. |

## 4. Reader consolidado

[`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) compone:

1. Subsistemas de `OperationsOverview.subsystems` → señales `kind=subsystem` (mapeadas por nombre a su módulo).
2. `OperationsOverview.cloud.health.runtimeChecks` → señales `kind=runtime` (módulo `cloud`).
3. `OperationsOverview.cloud.health.postureChecks` → señales `kind=posture` (módulo `cloud`).
4. `OperationsOverview.cloud.observability.incidents` → señales `kind=incident` (módulo `cloud`, top 3 abiertos).
5. `OperationsOverview.cloud.observability.posture` → señal posture observabilidad.
6. `OperationsOverview.cloud.bigquery.blockedQueries` → señal `kind=cost_guard` (módulo `cloud`).
7. `OperationsOverview.notionDeliveryDataQuality` → señales `kind=data_quality` para `integrations.notion` y `delivery`.

El reader **no hace fetches propios**: consume el `OperationsOverview` que el caller ya construyó. Si el caller no lo trae, el reader hace un fallback a `getOperationsOverview()`.

## 5. Surfaces consumidoras

| Surface | Rol |
|---|---|
| `Admin Center` (`/admin`) | Lectura ligera "Confiabilidad por módulo" — 1 card por módulo + chips de totales + boundaries pendientes. Foundation visible. |
| `Ops Health` (`/admin/ops-health`) | Detalle técnico de subsystems, reactive backlog, webhooks. **Sigue siendo dueño** de la lectura técnica. |
| `Cloud & Integrations` (`/admin/integrations`) | Detalle de syncs, posture cloud, secret refs. **Sigue siendo dueño** de la lectura cloud. |
| `GET /api/admin/reliability` | Endpoint protegido `requireAdminTenantContext()`. Reusable por agentes, synthetic monitors y change-based verification. |
| GitHub Action `reliability-verify` (TASK-633) | Job de CI que en cada PR lee el diff, deriva módulos afectados via `filesOwned` y corre solo los smoke specs relevantes. Ver `docs/operations/PLAYWRIGHT_E2E.md` §"Change-Based Verification Matrix". |

La spec impone separación explícita: la nueva surface **no reemplaza** a las especialistas. Es complemento.

## 6. Severidad y aggregation

Mapeos canónicos (`src/lib/reliability/severity.ts`):

| Source | Source value | ReliabilitySeverity |
|---|---|---|
| `CloudHealthStatus` | `ok`/`degraded`/`error`/`not_configured` | `ok`/`warning`/`error`/`not_configured` |
| `CloudPostureStatus` | `ok`/`warning`/`unconfigured` | `ok`/`warning`/`not_configured` |
| `OperationsHealthStatus` | `healthy`/`degraded`/`down`/`not_configured`/`idle` | `ok`/`warning`/`error`/`not_configured`/`awaiting_data` |
| `IntegrationDataQualityStatus` | `healthy`/`degraded`/`broken`/`unknown` | `ok`/`warning`/`error`/`unknown` |
| `CloudSentryIncidentLevel` | `fatal`/`error`/`warning`/`info`/`unknown` | `error`/`error`/`warning`/`ok`/`unknown` |

Aggregation por módulo: peor severidad concreta. Estados pendientes (`not_configured`, `awaiting_data`, `unknown`) **nunca** ocultan un `warning` o `error` real.

Confidence:

- `high` ≥ 80% de señales esperadas tienen evidencia concreta (`ok`/`warning`/`error`).
- `medium` ≥ 50%.
- `low` < 50%.
- `unknown` 0 señales presentes.

### Sentry incident → module attribution (TASK-634)

A partir de TASK-634, los incidentes Sentry NO se atribuyen masivamente al módulo `cloud`. El correlador determinista `correlateIncident()` en [`src/lib/reliability/incident-mapping.ts`](../../src/lib/reliability/incident-mapping.ts) decide:

1. **Path matching**: `incident.location` se evalúa contra los globs `filesOwned` declarados en `RELIABILITY_REGISTRY` (TASK-633). Single source of truth — cuando `filesOwned` cambia, el correlador lo recoge automáticamente.
2. **Title matching**: si no hay match por path, busca substrings (lowercase) en `incident.title` por módulo: `finance` (quote, expense, payroll, nubox, …), `integrations.notion` (notion, notion-bq-sync, delivery_tasks), `delivery` (ico-engine, sprint, reactive worker), `cloud` (cloud sql, bigquery, sentry, vercel cron).
3. **Tie-break por priority**: `finance` > `integrations.notion` > `delivery` > `cloud`. Especializado siempre gana al fallback.
4. **Fallback honesto**: incidentes que no matchean ningún módulo se etiquetan `cloud` con `signalId` con sufijo `.uncorrelated.<id>` para auditarlos como huérfanos.

`buildSentryIncidentSignals` (en `signals.ts`) cap-ea a `MAX_SENTRY_INCIDENTS_PER_MODULE=3` por módulo (no global), de modo que finance siempre ve sus 3 top incidentes incluso cuando cloud tiene muchos uncorrelated.

LLM-assisted enrichment para huérfanos queda como follow-up (Slice 4 del spec). V1 es solo rules-first determinista — input → output reproducible sin estado externo.

## 7. Cómo enchufar TASK-586 y TASK-599

Cada upstream debe:

1. Implementar su helper de fetch (ej. `getGcpBillingOverview`, `getFinanceSmokeLaneStatus`).
2. Agregar un adapter en [`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts) que normalice su output a `ReliabilitySignal[]`.
3. Componer el adapter en `buildReliabilityOverview()`.
4. Mover el `ReliabilityIntegrationBoundary` correspondiente de `pending` → `ready`.

No requiere cambios al contrato ni al UI: las nuevas señales aparecen automáticamente en el módulo correspondiente y el conteo `missingSignalKinds` se reduce.

## 7.1 AI Observer (TASK-638, V1.2)

**Qué es.** Capa narrativa opcional sobre el Reliability Control Plane. Toma el snapshot canónico (`getReliabilityOverview()`), lo sanitiza (PII redaction), y llama a Gemini Flash via Vertex AI con un prompt determinista que produce JSON estricto:

```json
{
  "overviewSummary": "...",
  "overviewSeverity": "ok|warning|error|...",
  "modules": [
    { "moduleKey": "finance", "severity": "warning", "summary": "...", "recommendedAction": "..." }
  ]
}
```

**Por qué existe.** El RCP determinístico ya cubre health, signals, y boundaries. El AI Observer agrega:

- Resumen ejecutivo en lenguaje neutro (un párrafo) para el Admin Center.
- Recomendaciones contextuales por módulo cuando hay error/warning.
- Detección de patrones cross-módulo que no caben en una regla simple.

**No reemplaza** señales determinísticas. Cada `kind='ai_summary'` queda visible junto al resto de signals — el operador puede contrastar la lectura IA con la evidencia bruta.

**Host: ops-worker (NO Vercel cron).** Decisión 2026-04-25:

| Criterio                              | Vercel cron     | Cloud Function | ops-worker (Cloud Run)        |
| ------------------------------------- | --------------- | -------------- | ----------------------------- |
| Timeout safety (Gemini + DB writes)   | 60s cap         | OK             | 540s cap                      |
| WIF nativo para Vertex AI             | ❌ (rotar ADC)  | ✅             | ✅                            |
| Cloud Logging audit (prompt+respuesta)| logs Vercel     | ✅             | ✅                            |
| Setup overhead                        | bajo            | medio          | mínimo (servicio ya existe)   |
| Cloud Scheduler retries               | manual          | ✅             | ✅                            |

ops-worker gana por: ya corre 7+ jobs Scheduler, WIF nativo evita rotar Vertex AI ADC en Vercel, y captura prompt + respuesta en Cloud Logging para audit.

**Kill-switch.** Default OFF (opt-in). Activación explícita: `RELIABILITY_AI_OBSERVER_ENABLED=true` en el Cloud Run service. Sin esto, cada llamada al endpoint `POST /reliability-ai-watch` retorna `skippedReason` con costo cero. Convención **opuesta** a synthetic (default ON) porque cada llamada gasta tokens, dedup-skipped o no.

**Dedup por fingerprint.** Cada observation lleva un fingerprint sha256 truncado del estado relevante (`status`, `confidence`, `signalCounts`, `missingSignalKinds` ordenados). Si el último fingerprint persistido coincide, la observation se descarta — esto evita inflar la tabla cuando el portal está estable durante días.

**Anti-feedback loop.** El runner llama `getReliabilityOverview()` SIN incluir `aiObservations` (default OFF). El consumer de Admin Center lo llama explícitamente con `includeAiObservations=true`. Así el snapshot que entra al prompt nunca contiene resúmenes IA previos.

**Schema.** `greenhouse_ai.reliability_ai_observations` (TASK-638 migration `20260425211608760`):

- PK `observation_id` (`EO-RAI-{uuid8}`)
- `sweep_run_id` (`EO-RAS-{uuid8}`)
- `(scope, module_key, observed_at)` para reads ordenados
- `fingerprint` para dedup lookup
- `summary`, `recommended_action`, `model`, token counts

**Cloud Scheduler.** Job `ops-reliability-ai-watch` cada 1h (`0 */1 * * *`, timezone `America/Santiago`), `triggeredBy=cloud_scheduler`. Frecuencia conservadora porque cada llamada cuesta tokens regardless of dedup.

## 8. Roadmap de follow-ups

- Synthetic monitoring periódico que ejecute las rutas críticas declaradas en el registry.
- Change-based verification matrix: cuando un PR toca un archivo `owned` por un módulo, correr el smoke + signal correspondiente.
- Correlador explicativo (LLM o reglas) que correlacione incidentes Sentry con módulos por path/title.
- Persistencia DB del registry si aparece necesidad de overrides por tenant o de SLOs configurables.

## 9. Cosas que NO hace V1

- No define entitlements nuevos. Reusa `requireAdminTenantContext()`.
- No persiste señales históricas. Cada lectura es snapshot.
- ~~No persiste el registry~~ → **TASK-635 (V1.1)**: registry persistido en `greenhouse_core.reliability_module_registry` + overrides per-tenant en `greenhouse_core.reliability_module_overrides`. Seed estático sigue siendo source of truth para defaults (idempotente al boot vía `INSERT ... ON CONFLICT DO UPDATE`).
- No automatiza remediaciones.
- No implementa synthetic monitoring real (TASK-632 lo implementa con cron Vercel + Agent Auth).
- No reemplaza Sentry, `source_sync_runs`, Playwright ni Billing Export.
- No implementa Admin Center CRUD UI para overrides per-tenant (queda follow-up de TASK-635 cuando aparezca primer caso de uso real).
- No implementa SLO breach detector (solo persiste `sloThresholds` para forward-compat).

## 10. Archivos canónicos

- Tipos: [`src/types/reliability.ts`](../../src/types/reliability.ts)
- Registry estático (defaults): [`src/lib/reliability/registry.ts`](../../src/lib/reliability/registry.ts) — exporta `STATIC_RELIABILITY_REGISTRY` y alias compat `RELIABILITY_REGISTRY`.
- **Registry store DB-backed (TASK-635)**: [`src/lib/reliability/registry-store.ts`](../../src/lib/reliability/registry-store.ts) — `ensureReliabilityRegistrySeed()`, `getReliabilityRegistry(spaceId?)`, `setReliabilityModuleOverride()`, `clearReliabilityModuleOverride()`. Cache TTL 60s + fallback a `STATIC_RELIABILITY_REGISTRY` cuando DB falla.
- **Migration TASK-635**: [`migrations/20260425204554656_task-635-reliability-registry-tables.sql`](../../migrations/20260425204554656_task-635-reliability-registry-tables.sql)
- Severity helpers: [`src/lib/reliability/severity.ts`](../../src/lib/reliability/severity.ts)
- Signal adapters: [`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts)
- Incident correlator: [`src/lib/reliability/incident-mapping.ts`](../../src/lib/reliability/incident-mapping.ts)
- Reader: [`src/lib/reliability/get-reliability-overview.ts`](../../src/lib/reliability/get-reliability-overview.ts) — acepta `options.spaceId` y resuelve registry per-tenant via `registry-store.ts`.
- API: [`src/app/api/admin/reliability/route.ts`](../../src/app/api/admin/reliability/route.ts)
- UI primitive: [`src/components/greenhouse/ReliabilityModuleCard.tsx`](../../src/components/greenhouse/ReliabilityModuleCard.tsx)
- Surface entrypoint: sección en [`src/views/greenhouse/admin/AdminCenterView.tsx`](../../src/views/greenhouse/admin/AdminCenterView.tsx)
- **AI Observer (TASK-638)**:
  - Sanitizer: [`src/lib/reliability/ai/sanitize.ts`](../../src/lib/reliability/ai/sanitize.ts)
  - Prompt builder: [`src/lib/reliability/ai/build-prompt.ts`](../../src/lib/reliability/ai/build-prompt.ts)
  - Kill-switch: [`src/lib/reliability/ai/kill-switch.ts`](../../src/lib/reliability/ai/kill-switch.ts)
  - Persist: [`src/lib/reliability/ai/persist.ts`](../../src/lib/reliability/ai/persist.ts)
  - Reader: [`src/lib/reliability/ai/reader.ts`](../../src/lib/reliability/ai/reader.ts)
  - Runner: [`src/lib/reliability/ai/runner.ts`](../../src/lib/reliability/ai/runner.ts) — host-agnostic
  - Adapter (signals): [`src/lib/reliability/ai/build-ai-summary-signals.ts`](../../src/lib/reliability/ai/build-ai-summary-signals.ts)
  - ops-worker endpoint: `POST /reliability-ai-watch` en [`services/ops-worker/server.ts`](../../services/ops-worker/server.ts)
  - Cloud Scheduler job: `ops-reliability-ai-watch` en [`services/ops-worker/deploy.sh`](../../services/ops-worker/deploy.sh)
  - UI: [`src/components/greenhouse/admin/ReliabilityAiWatcherCard.tsx`](../../src/components/greenhouse/admin/ReliabilityAiWatcherCard.tsx)
  - Migration: [`migrations/20260425211608760_task-638-reliability-ai-observations.sql`](../../migrations/20260425211608760_task-638-reliability-ai-observations.sql)

## Delta 2026-05-03 — TASK-769 Billing como señal esperada de Cloud

TASK-769 promueve `billing` a señal esperada del módulo `cloud` y agrega drivers FinOps con evidencia:

- `STATIC_RELIABILITY_REGISTRY.cloud.expectedSignalKinds` ahora incluye `billing`.
- `buildGcpBillingSignals()` eleva la severidad de `cloud.billing.gcp_export` cuando los drivers determinísticos traen `warning` o `error`.
- Cada driver no-OK se proyecta como señal `cloud.billing.driver.<driverId>` con threshold, share y evidencia de Billing Export.
- La IA FinOps no define severidad del RCP. Solo agrega narrativa persistida y auditable para Admin Center; las alertas y RCP siguen siendo determinísticos.
- Steady state esperado: `cloud.billing.gcp_export` existe siempre que el reader Billing se ejecute; drivers adicionales deberían tender a 0 en operación optimizada.

Artefactos canónicos nuevos:

- Alert sweep: [`src/lib/cloud/gcp-billing-alerts.ts`](../../src/lib/cloud/gcp-billing-alerts.ts)
- FinOps AI runner/persist: [`src/lib/cloud/finops-ai/`](../../src/lib/cloud/finops-ai/)
- Migration: [`migrations/20260503115518831_task-769-cloud-cost-ai-observations.sql`](../../migrations/20260503115518831_task-769-cloud-cost-ai-observations.sql)
- ops-worker endpoint: `POST /cloud-cost-ai-watch` en [`services/ops-worker/server.ts`](../../services/ops-worker/server.ts)
