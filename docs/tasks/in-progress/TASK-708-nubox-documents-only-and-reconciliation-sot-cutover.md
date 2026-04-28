# TASK-708 — Nubox Documents-Only SoT + Reconciliation Purity Cutover

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Slice 0 (model hardening) — en ejecución 2026-04-28`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Coordinates with: `TASK-707` (Previred runtime canonical payment) — la nueva invariante `payment_account_id NOT NULL` debe ser validada contra el path Previred antes del enforcement, no después
- Spawns: `TASK-708b` (Nubox phantom cohort remediation) — Slice 5 se promueve a task hermana con runbook propio
- Branch: `task/TASK-708-nubox-documents-only-and-reconciliation-sot-cutover`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Separar de forma canónica la source of truth de documentos y la source of truth de caja, con **invariantes estructurales** (no parches): Nubox debe seguir alimentando `ventas` y `compras`, pero ya no debe crear ni mutar automáticamente `income_payments` / `expense_payments` como si fuera dueño del cash real. Greenhouse pasa a ser la source of truth de `cobros`, `pagos`, `settlement_groups`, `settlement_legs` y `conciliación bancaria`. La defensa vive en el modelo (`CHECK` constraints, FKs, tipos branded), no en `if`s repartidos: `payment_account_id` y `instrument_id` se vuelven obligatorios por SQL y por firma TS; el candidate resolver de conciliación recibe `account_id` posicional obligatorio; los movimientos Nubox sin cuenta resoluble degradan a una lane explícita (`nubox_payment_signals`) que jamás contamina el pool conciliable. La remediación histórica (`TASK-708b`) hereda esas invariantes ya activas para reparar sin reintroducir contaminación.

## Why This Task Exists

Hoy el repo todavía mezcla dos contratos incompatibles:

1. **Contrato correcto**
   - Nubox como fuente de `sales` y `purchases`
   - Greenhouse como source of truth de cash (`income_payments`, `expense_payments`, `settlement_groups`, `settlement_legs`, `bank_statement_rows`, `reconciliation_periods`)
   - conciliación bancaria como proceso que enlaza banco real con pagos/cobros canónicos de Greenhouse

2. **Contrato transicional / defectuoso**
   - `src/lib/nubox/sync-nubox-to-postgres.ts` todavía registra `income_payments` y `expense_payments` desde `nubox_bank_movements`
   - esos pagos/cobros pueden quedar sin `payment_account_id`, o con resolución heurística frágil
   - conciliación luego intenta trabajar sobre esos rows ya contaminados
   - el resultado es que `Ventas`, `Compras`, `Cobros`, `Pagos` y `Banco` se pisan entre sí en vez de colaborar

La evidencia actual en datos (validada en Postgres `efeonce-group:us-east4:greenhouse-pg-dev` el 2026-04-28) confirma el problema en **dos cohortes distintas** del mismo origen sistémico (Nubox-as-cash-SoT):

**Cohorte A — runtime live (`nubox_bank_sync`)**

- `income_payments.payment_source = 'nubox_bank_sync'`: `23` rows
- de esas `23`, `23` (`100%`) quedaron con `payment_account_id IS NULL`
- `1` ya fue reconciliada (`PAY-NUBOX-inc-3699924`, $6,902,000 CLP, 2026-03-06)
- existe `1` `bank_statement_row` reconciliada contra una `settlement_leg` con `instrument_id = NULL`
- `4` settlement legs totales con `instrument_id = NULL` (`3 receipt` + `1 funding`); `1` ya reconciliada
- `24` `income` distintos tienen al menos un `income_payment` sin cuenta resuelta

**Cohorte B — backfill histórico (`manual` con prefijo `exp-pay-backfill-EXP-NB-*`)**

- `expense_payments.payment_source = 'manual'`: `66` rows totales
- de esas, `65` (`98%`) tienen `payment_account_id IS NULL`
- todas referencian `nubox_purchase_id` — son un mirror histórico de "compras pagadas según Nubox" creado fuera del runtime sync
- `0` reconciliadas hoy (no entraron al pool conciliable aún), pero son candidatas latentes apenas se importe la cartola del período correspondiente
- el path runtime de expense en `sync-nubox-to-postgres.ts:713` (raw `INSERT` con `payment_source='nubox_sync'`) **no ha producido filas**, pero está vivo y latente; no se debe asumir resuelto solo porque no hay evidencia de ejecución

**Cohorte de control (sanas)**

- `factoring_proceeds`: `3` rows, `0` con cuenta nula ✓
- `bank_statement` (expense): `46` rows, `0` con cuenta nula ✓
- estos paths son la referencia de "cómo debe lucir un payment canónico"

Eso significa que un sync documental externo no solo contamina la capa de caja en runtime: también dejó deuda histórica que conciliación puede cerrar sobre objetos que ni siquiera saben en qué cuenta ocurrieron. La task tiene que tratar las dos cohortes con tratamientos distintos pero coordinados, no como un solo cleanup.

## Investigation Findings To Preserve

La task debe preservar explícitamente los hallazgos de la investigación sobre conciliación bancaria, porque no son ruido incidental: explican por qué el contrato actual no es confiable. Cada hallazgo se trata con una **invariante estructural** (no un parche puntual) — la solución nace en el modelo de datos y en la API canónica, no en `if`s defensivos repartidos.

1. **Candidate resolver sin scope duro por cuenta**
   - `listReconciliationCandidatesFromPostgres(periodId)` carga el período con su `account_id`, pero luego llama al resolver por rango de fechas sin pasar esa cuenta.
   - En la práctica, conciliación puede sugerir candidatos de otra cuenta si monto/fecha/referencia calzan.
   - Hoy el cross-account match observado es `0`, pero es **suerte estadística**, no una defensa estructural.
   - Solución resiliente: el `account_id` debe ser parámetro **obligatorio** del resolver (no opcional con fallback), garantizado por tipo (`AccountId`) y por SQL (`WHERE` siempre presente, no compuesto dinámicamente).
   - Referencias:
     - `src/lib/finance/postgres-reconciliation.ts:911`
     - `src/lib/finance/postgres-reconciliation.ts:919`
     - `src/lib/finance/postgres-reconciliation.ts:996`
     - `src/lib/finance/postgres-reconciliation.ts:1178`

2. **Validación de cierre de período demasiado laxa**
   - el route de conciliación pasa `true` hardcodeado a `validateReconciledTransitionFromPostgres(periodId, true)`;
   - eso hace que el check de `statement_imported` dependa solo de `statement_row_count`, no del estado persistido real del período.
   - Solución resiliente: eliminar el segundo parámetro de la función. El estado canónico vive en `reconciliation_periods` (columna persistida); cualquier validador que reciba un `periodId` debe leer ese estado y no aceptar bandera externa.
   - Referencias:
     - `src/app/api/finance/reconciliation/[id]/route.ts:96`
     - `src/app/api/finance/reconciliation/[id]/route.ts:100`

3. **Settlement legs reconciliables con `instrument_id = NULL`**
   - el runtime actual permite construir la leg principal usando `paymentAccountId` aunque venga vacío;
   - ya se observó en datos una fila de cartola reconciliada contra una leg sin instrumento/cuenta real.
   - Estado real: `4` legs con `instrument_id IS NULL` (`3 receipt` + `1 funding`), `1` ya reconciliada.
   - Solución resiliente: `CHECK constraint` a nivel SQL — `settlement_legs` con `leg_type IN ('receipt','payout')` no pueden tener `instrument_id IS NULL`. Defensa en el modelo, no en código.
   - Referencias:
     - `src/lib/finance/settlement-orchestration.ts:292`
     - `src/lib/finance/settlement-orchestration.ts:345`

4. **Contaminación de caja desde Nubox bank sync (runtime live)**
   - Nubox sigue creando `income_payments` desde movimientos bancarios via `recordPayment()` con `paymentAccountId` opcional, y `expense_payments` via raw `INSERT` que bypassa por completo `recordExpensePayment()`.
   - eso salta el contrato sano `documento -> cash Greenhouse -> conciliación bancaria`.
   - Solución resiliente: (a) `recordPayment` / `recordExpensePayment` exigen `payment_account_id NOT NULL` por tipo y por `CHECK` SQL; (b) eliminar el raw `INSERT` de expense — todo cash entra por la API canónica o no entra; (c) Nubox sync se demote a productor de **señales documentales** (no payments) cuando no puede resolver cuenta.
   - Referencias:
     - `src/lib/nubox/sync-nubox-to-postgres.ts:680`
     - `src/lib/nubox/sync-nubox-to-postgres.ts:713` (raw `INSERT` expense — divergente, debe eliminarse)
     - `src/lib/nubox/sync-nubox-to-postgres.ts:751`
     - `src/lib/nubox/sync-nubox-to-postgres.ts:800` (income via API canónica pero sin validación de cuenta)

5. **Backfill histórico Nubox como `expense_payments.payment_source='manual'`**
   - `65/66` `expense_payments` con `payment_source='manual'` y `payment_account_id IS NULL`, todos con IDs `exp-pay-backfill-EXP-NB-*` referenciando `nubox_purchase_id`.
   - origen: backfill histórico que mirroreó "compras pagadas según Nubox" como cash sin resolver cuenta — misma raíz sistémica que la cohorte runtime, pero distinto path de creación.
   - `0` reconciliadas hoy, pero **candidatas latentes** apenas se importe cartola del período correspondiente; es deuda con detonante temporal.
   - Solución resiliente: `ledger-health.ts` ya las detecta (línea 89). Falta (a) clasificar nivel de confianza, (b) bloquearlas del candidate pool de conciliación hasta repararlas, (c) tratamiento explícito en `TASK-708b`.
   - Referencias:
     - `src/lib/finance/ledger-health.ts:84-92` (detección ya viva)
     - cohorte: `WHERE payment_source = 'manual' AND payment_id LIKE 'exp-pay-backfill-EXP-NB-%' AND payment_account_id IS NULL`

## Goal

Los goals están redactados como **invariantes estructurales** que debe cumplir el sistema, no como acciones puntuales. Cada uno se vuelve una propiedad verificable por SQL `CHECK`, por tipos TypeScript, o por test de regresión — no por convención humana.

- **Invariante de SoT documental**: Nubox solo escribe sobre tablas de documentos (`income`, `expenses`); ningún path de Nubox toca `income_payments`, `expense_payments`, `settlement_groups`, `settlement_legs` o `bank_statement_rows` por defecto.
- **Invariante de SoT de caja**: cualquier escritura a las tablas de cash pasa por las APIs canónicas (`recordPayment`, `recordExpensePayment`, `orchestrateSettlement`); no hay raw `INSERT` desde código de sync. El acceso DML al schema queda concentrado en un módulo (`payment-ledger.ts` / `expense-payment-ledger.ts` / `settlement-orchestration.ts`).
- **Invariante de cuenta no-nula**: `income_payments.payment_account_id` y `expense_payments.payment_account_id` son `NOT NULL` para toda fila no superseded creada después del cutover. Garantizado por `CHECK` SQL y por firma TS (no `string | null` en input).
- **Invariante de instrumento no-nulo**: `settlement_legs` con `leg_type IN ('receipt','payout')` tienen `instrument_id NOT NULL`. Garantizado por `CHECK` SQL.
- **Invariante de scope de conciliación**: el candidate resolver es función pura `(accountId, dateRange) → Candidate[]`; el `account_id` es parámetro **obligatorio** y se aplica como `WHERE` literal, no se compone condicionalmente.
- **Invariante de cierre de período**: `validateReconciledTransition(periodId)` lee estado persistido en `reconciliation_periods`; no acepta segundo parámetro.
- **Invariante de degradación honesta**: cuando Nubox detecta un movimiento bancario sin cuenta resoluble, escribe a una **lane de señales documentales** explícita (decisión modelado en Open Questions) y NO escribe payment. La señal nunca entra al pool conciliable.
- **Invariante de no-mutación derivada**: un documento (`income.payment_status`, `expenses.payment_status`) solo deriva su estado pagado desde `SUM(payments)` canónicos, nunca desde un hint Nubox. Garantizado porque la columna se computa desde la VIEW de derivación o trigger, no se setea por sync.
- **Reparabilidad sin romper downstream**: la cohorte histórica (Cohorte A + B) se aísla en estado `needs_repair` o se supersedea via mecanismo `superseded_by_payment_id` / `superseded_by_otb_id` ya existente; no se hace `DELETE` manual. La remediación vive en `TASK-708b`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

Reglas obligatorias:

- `ventas` / `compras` y `cobros` / `pagos` son planos distintos; un sync documental no puede adjudicarse ownership del cash real.
- la cuenta bancaria real es obligatoria para cualquier payment reconciliable (`payment_account_id` o `settlement_legs.instrument_id`).
- `reconciliation_periods` solo pueden operar sobre movimientos de su propia cuenta.
- los syncs externos ambiguos deben degradar a estado explícito (`pending_account_resolution`, `unscoped`, `needs_repair`) y no contaminar el pool normal de conciliación.
- `Banco` sigue siendo lector del ledger canónico de Greenhouse, no del estado transitorio de Nubox.

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md`
- `docs/tasks/to-do/TASK-705-banco-read-model-snapshot-cutover.md`
- `docs/tasks/to-do/TASK-707-previred-canonical-payment-runtime-and-backfill.md`

## Dependencies & Impact

### Depends on

- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/ledger-health.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`

### Blocks / Impacts

- pureza del ledger de `Cobros`
- pureza del ledger de `Pagos`
- confiabilidad de `Banco`
- clasificación y cierre de `Conciliación`
- downstream de `Ventas` y `Compras` cuando el sistema deduce estado pagado/cobrado
- follow-ups UI y read-model que hoy heredan datos contaminados

### Files owned

- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/ledger-health.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `scripts/finance/`
- `migrations/`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Current Repo State

### Already exists

- `Ventas` y `Compras` ya tienen ingest/sync con Nubox y llaves como `nubox_document_id`, `nubox_purchase_id`
- Greenhouse ya tiene ledgers propios para `income_payments`, `expense_payments`, `settlement_groups`, `settlement_legs`
- existe modelo de conciliación bancaria con `reconciliation_periods`, `bank_statement_rows`, matching y flags `is_reconciled`
- el repo ya reconoce el concepto de `phantom` en `docs/documentation/finance/conciliacion-bancaria.md`
- `ledger-health.ts` ya observa `payment_account_id IS NULL` como señal de salud

### Gap

- Nubox sigue registrando cash (`income_payments` y `expense_payments`) desde movimientos bancarios externos
- el candidate resolver de conciliación no está scopeado por cuenta
- existen `settlement_legs` reconciliables con `instrument_id = NULL`
- el cierre de período aún confía demasiado en parámetros del route handler
- no existe un carril explícito para pagos/cobros documentales detectados sin cuenta resuelta

## Scope

El scope se ordena para que cada slice **endurezca el modelo antes** de cambiar el código que lo usa. Primero las invariantes en SQL/tipos (defensa estructural), después los call sites (que ya no compilan o no insertan si rompen la invariante). Eso evita parchar de afuera hacia adentro.

Slice 0 (modelo) y Slice 1-4 (cutover runtime + scope) son esta task. Slice 5 (remediación histórica) se promueve a `TASK-708b` con su propio runbook. Slice 6 (observabilidad) cierra la task acá.

### Slice 0 — Model hardening (CHECK constraints + tipos + tablas D1/D3/D5)

Defensa estructural que sobrevive a cualquier refactor futuro. Toda invariante nace en SQL/tipo, no en `if`s.

Migraciones:

- `external_cash_signals` (D1) creada con `UNIQUE (source_system, source_event_id)` y CHECKs de enum.
- `external_signal_auto_adopt_policies` (D3) creada con `UNIQUE (source_system, space_id) WHERE is_active`.
- `account_signal_matching_rules` (D5) + `external_signal_resolution_attempts` (D5 audit log) creadas.
- `ALTER TABLE greenhouse_finance.income ADD COLUMN source_payment_status TEXT NULL` y `ALTER TABLE greenhouse_finance.expenses ADD COLUMN source_payment_status TEXT NULL` (D2).
- trigger `derive_income_payment_status_from_canonical_payments()` que recomputa `income.payment_status` desde `SUM(income_payments NOT superseded)` vs `total_amount` en `BEFORE INSERT/UPDATE` sobre `income`, `income_payments`. Idempotente. Mismo trigger para `expenses`.
- trigger cruzado `enforce_promoted_payment_invariant()` (D4) sobre `external_cash_signals`: si `promoted_payment_id IS NOT NULL`, valida que la fila `income_payments`/`expense_payments` exista con `payment_account_id IS NOT NULL` y `superseded_by_payment_id IS NULL`.
- `ALTER TABLE greenhouse_finance.settlement_legs ADD CONSTRAINT settlement_legs_principal_requires_instrument CHECK (leg_type NOT IN ('receipt','payout') OR instrument_id IS NOT NULL) NOT VALID` — `VALIDATE` después de TASK-708b.
- `ALTER TABLE greenhouse_finance.income_payments ADD CONSTRAINT income_payments_account_required_after_cutover CHECK (payment_account_id IS NOT NULL OR superseded_by_payment_id IS NOT NULL OR superseded_by_otb_id IS NOT NULL OR created_at < '<cutover_timestamp>')` — preserva histórico, exige cuenta para todo nuevo.
- mismo `CHECK` para `expense_payments`.

Tipos TypeScript:

- `RecordPaymentInput.paymentAccountId: AccountId` (NO `string | null`); idem `RecordExpensePaymentInput`.
- `AccountId = string & { __brand: 'AccountId' }` branded type, validado por `parseAccountId(raw: string): AccountId` que verifica existencia en `accounts`.
- los call sites que hoy pasan `null` no compilan después de la migración tipo, forzando revisión.

Helpers nuevos:

- `src/lib/finance/external-cash-signals/` módulo con `recordSignal()`, `evaluateSignalAccount()`, `adoptSignalManually()`, `dismissSignal()`. Único punto de escritura sobre `external_cash_signals`.
- `src/lib/finance/external-cash-signals/rule-evaluator.ts` que resuelve reglas D5 contra una señal y retorna `{outcome, matched_rule_id?, account_id?, attempt_log}`.
- `src/lib/finance/external-cash-signals/auto-adopt-policy.ts` resuelve la política D3 vigente para `(source_system, space_id)` con cache TTL 60s.

### Slice 1 — Nubox documents-only cutover

- `sync-nubox-to-postgres.ts` queda restringido a writes sobre `income`, `expenses` y `external_cash_signals` (D1). Cualquier llamada a `recordPayment` / `recordExpensePayment` desde este archivo se elimina.
- el raw `INSERT INTO expense_payments` (línea ~713) se elimina por completo. No se reemplaza por una llamada a la API canónica — Nubox no sabe la cuenta, no debe escribir cash.
- el path income que hoy llama `recordPayment()` también se elimina. Todo movimiento Nubox detectado escribe `external_cash_signals` con `source_system='nubox'` y delega a `evaluateSignalAccount()`:
  - si la regla D5 produce **un solo** match → `account_resolution_status='resolved_high_confidence'`. Si la política D3 para `(nubox, space)` es `auto_adopt`, se llama a `adoptSignalAuto()` que crea el `income_payment` canónico vía `recordPayment()` con `payment_account_id` resuelto. Caso contrario queda `review`.
  - si la regla D5 produce **cero o múltiples** → `unresolved`, queda en la cola admin.
- el `payment_status` del documento (`income`/`expenses`) NO se mutuye desde Nubox. Solo `source_payment_status` se actualiza con lo que dice Nubox (`'pagado'`, etc.). El estado de caja real lo recomputa el trigger D2 desde payments canónicos.
- feature flag `NUBOX_CASH_WRITES_ENABLED` solo para rollback de emergencia; default `false` post-cutover. La implementación bajo el flag escribe a `external_cash_signals` igual; el flag controla solo si se permite el path legacy de fallback durante el primer deploy.

### Slice 2 — Reconciliation matchability policy (módulo central)

- archivo nuevo `src/lib/finance/reconciliation-matchability.ts` que exporta una sola función `getMatchabilityState(payment | leg) → MatchabilityState`.
- enum exhaustivo (TypeScript `discriminated union`, no string suelto):
  - `recorded` — cash registrado, no aplica a conciliación todavía
  - `reconciliable` — `payment_account_id NOT NULL` (income/expense) o `instrument_id NOT NULL` (leg principal)
  - `pending_account_resolution` — señal documental sin cuenta; bloqueado del pool conciliable
  - `needs_repair` — fila histórica contaminada; visible en health, bloqueado del pool
- todos los consumers (resolver, route handler, UI) leen del módulo central. Cero lógica reconciliability dispersa.
- tests de paridad: la misma row no puede recibir dos states distintos según el caller.

### Slice 3 — Candidate scoping by account (firma obligatoria)

- `listReconciliationCandidatesByAccount(accountId: AccountId, dateRange: {start, end}, type, search?, limit?)` reemplaza la firma actual; `accountId` es primer parámetro **posicional obligatorio**, no opcional.
- todas las queries internas aplican `WHERE payment_account_id = $accountId` (income/expense) o `WHERE instrument_id = $accountId` (legs). El `WHERE` no se compone con `if` — siempre presente.
- `listReconciliationCandidatesFromPostgres(periodId)` carga `period.account_id` y delega; ya no llama a la firma date-range solamente.
- test de regresión: query con `accountId='X'` nunca devuelve filas con account distinto.

### Slice 4 — Settlement hardening (modelo + API)

- el `CHECK` constraint del Slice 0 hace imposible la fila contaminada nueva.
- `settlement-orchestration.ts` recibe `instrumentId: string` (no nullable) para `leg_type='receipt'|'payout'`. La firma rechaza el caso en compile time.
- legs `funding`, `fx_conversion`, `internal_transfer` mantienen su contrato actual (instrument puede ser null para staging interno) — no se sobre-restringe lo que ya estaba bien.
- el match manual/automático lee matchability state via Slice 2; legs `pending_account_resolution` o `needs_repair` no aparecen en candidates.

### Slice 5 — Historical remediation → TASK-708b

Se promueve a task hermana con runbook propio. Justificación: la remediación involucra decisiones caso-por-caso sobre `23` cobros + `65` pagos + `4` legs + `1` bank_statement_row reconciliada (montos individuales hasta $6.9M CLP), requiere dry-run + apply explícito, y depende de cartolas reales para reanclar cuenta. No es un slice ejecutable en una sola sesión.

`TASK-708b` queda bloqueada por el cierre de Slices 0-4 acá (necesita las invariantes activas para garantizar que la remediación no se pisa con runtime nuevo).

### Slice 6 — Lifecycle and observability

- `validateReconciledTransitionFromPostgres(periodId)` pierde el segundo parámetro. La firma cambia y rompe call sites — eso es deseado (forzar revisión).
- `ledger-health.ts` se extiende para emitir métricas diferenciadas:
  - `payments_pending_account_resolution_runtime` (Cohorte A — post-cutover debe ser `0`).
  - `payments_pending_account_resolution_historical` (Cohorte B — solo baja con `TASK-708b`).
  - `settlement_legs_principal_without_instrument` (debe ser `0` después del `CHECK VALIDATE`).
  - `reconciled_rows_against_unscoped_target` (cross-account o leg null — debe ser `0`).
  - `external_cash_signals_unresolved_over_threshold` (señales en `unresolved` > N días, configurable por `source_system`).
  - `external_cash_signals_promoted_invariant_violation` (debe ser `0` por construcción del trigger D4; métrica como canary).
- UI `/finance/external-signals` (cola admin) lista señales `unresolved`/`review` con filtro por `source_system × space`, monto, fecha, document_id. CTA "Adoptar manual" requiere capability `finance.cash.adopt-external-signal`.
- cada métrica tiene un test de invariante (`assert metric === 0` en el set runtime) y se publica como signal del módulo `Finance Data Quality` en el Reliability Control Plane.

## Out of Scope

- rediseño visual grande de `Banco`, `Cobros`, `Pagos` o `Conciliación`
- reabrir toda la taxonomía comercial de `Ventas` / `Compras`
- resolver la latencia estructural de `/finance/bank` (vive en `TASK-705`)
- rediseñar Previred completo (vive en `TASK-706` / `TASK-707`)
- cambiar Nubox como fuente de documentos tributarios; aquí se corta solo su ownership sobre cash
- **remediación histórica de Cohorte A y Cohorte B** — vive en `TASK-708b` con runbook propio. Esta task crea la invariante; aquella la aplica al pasado.
- generalización del patrón a otros sources externos (Previred, file imports) — se modela acá pero la migración cross-source vive como follow-up específico

## Resilience Principles

Estos principios mandan sobre cualquier decisión de implementación. Si una solución propuesta los viola, se descarta — no se debilitan los principios.

1. **Defensa en el modelo, no en el call site.** Cualquier invariante que pueda expresarse como `CHECK` SQL, FK, `NOT NULL`, o tipo TypeScript brand, vive ahí. `if (x === null) throw` distribuido es parche.
2. **Firma de función como contrato.** Si un parámetro debe ser obligatorio, es posicional y no nullable. Eliminar `paymentAccountId?: string | null` y reemplazar por `paymentAccountId: AccountId` es preferible a un guard interno.
3. **Una sola lane de escritura por dominio.** Cash entra solo por `recordPayment` / `recordExpensePayment` / `orchestrateSettlement`. Cero raw `INSERT` desde sync, scripts ad-hoc o backfills nuevos. Backfills históricos que sobrevivan deben respaldarse con superseded chain auditable.
4. **Degradación honesta vs falla silente.** Cuando una entrada externa no resuelve cuenta, la lane explícita (`nubox_payment_signals`) la registra con estado `unresolved`. Nunca se "promueve" silenciosamente a payment con `null`. La señal es visible en health checks desde día uno.
5. **Source of truth única por capa.** `Nubox = documento`, `Greenhouse = cash`, `cartola = prueba`. Ningún módulo lee estado de caja desde Nubox; ningún módulo deriva estado documental sin pasar por payments canónicos.
6. **Reparabilidad antes de mutabilidad.** Las cohortes contaminadas se aíslan (`needs_repair`) y se supersedean via mecanismos ya existentes (`superseded_by_payment_id`, `superseded_by_otb_id`). No se hace `DELETE` ni `UPDATE` destructivo. La auditoría sobrevive a la limpieza.
7. **Escalabilidad por composición, no por enum.** El shape `nubox_payment_signals` se diseña como caso particular del patrón `external_cash_signal`; cuando aparezca Previred o file-import bank movements ambiguos, heredan el shape vía discriminator (`source_system`), no por nueva tabla.
8. **Observabilidad first-class.** Cada invariante tiene una métrica que mide su violación; el dashboard la muestra cero o no-cero. Sin métrica no hay invariante — porque no hay forma de saber si se violó.
9. **Tests que materializan la invariante.** Cada `CHECK` constraint y cada firma no-nullable se acompaña de un test que intenta violarla y verifica que falla. Sin test, la invariante muere en el siguiente refactor.

## Detailed Spec

El principio rector de esta task es:

> `Nubox` puede decirnos que una venta o compra existe; no puede adjudicarse que el dinero ya entró o salió de una cuenta Greenhouse sin que Greenhouse tenga un anchor de caja real.

### Target contract

- `Sales` y `Purchases`
  - SoT: `Nubox`
  - función: documento, metadata tributaria, estado contable base

- `Income Payments` y `Expense Payments`
  - SoT: `Greenhouse`
  - función: cash real, cuenta real, settlement real, reconciliación real

- `Settlement Groups` / `Settlement Legs`
  - SoT: `Greenhouse`
  - función: operaciones multi-leg y relación con cuentas/instrumentos

- `Bank Reconciliation`
  - SoT: `Greenhouse`
  - función: enlazar cartola bancaria con movimientos canónicos ya formados

### Design consequences

1. Un `nubox_bank_movement` puede seguir siendo una señal útil, pero no debe crear automáticamente cash canónico cuando no conocemos la cuenta real.
2. La UI puede seguir mostrando hints de “documento marcado como pagado/cobrado en Nubox”, pero eso no debe equivaler a `is_reconciled`, `paid`, `settled` ni alimentar `Banco`.
3. El sistema necesita un estado intermedio explícito para “documento pagado/cobrado según Nubox, pero cash Greenhouse aún no resuelto”.
4. Los phantoms existentes dejan de ser una rareza documental y pasan a tratarse como deuda histórica de SoT.

### Implementation guidance

- `sync-nubox-to-postgres.ts` debe dejar de llamar la lane canónica de `recordPayment()` / inserts `expense_payments` por default cuando la fuente sea un bank movement Nubox.
- Si se conserva ingest de movimientos Nubox para apoyo operativo, debe persistir como staging/audit/hint, no como payment reconciliable.
- `postgres-reconciliation.ts` necesita una `matchability policy` central y reusable, en vez de reglas repartidas entre SQL y routes.
- `settlement-orchestration.ts` debe convertir `instrument_id` en requisito para cualquier leg principal reconciliable.
- `account-balances.ts` y `ledger-health.ts` deben tratar las señales Nubox ambiguas como degraded state explícito, no como cash silencioso.

### Canonical state map

La task debe documentar y respetar este flujo de estados. El principio es simple:

- `Nubox` origina o actualiza el **documento**
- `Greenhouse` registra el **cash**
- `Banco` prueba el **cash real**
- `Conciliación` enlaza **cartola** con **cash Greenhouse**
- el **documento hereda estado** desde el cash, no desde Nubox

#### Venta / cobro

```text
Nubox sale
  -> Greenhouse income
  -> status documental: issued / pending / overdue
  -> espera cash real

Cash real detectado en Greenhouse
  -> income_payment
  -> opcional settlement_group + settlement_legs
  -> income.amount_paid y income.payment_status derivan desde SUM(income_payments)

Cartola bancaria
  -> bank_statement_row
  -> conciliación contra income_payment o settlement_leg
  -> income_payment.is_reconciled = true
  -> settlement_leg.is_reconciled = true

Resultado final
  -> income puede quedar partial / paid
  -> reconciled expresa prueba bancaria del cash
```

#### Compra / pago

```text
Nubox purchase
  -> Greenhouse expense
  -> status documental: registered / pending / due
  -> espera cash real

Cash real detectado en Greenhouse
  -> expense_payment
  -> opcional settlement_group + settlement_legs
  -> expense.amount_paid y expense.payment_status derivan desde SUM(expense_payments)

Cartola bancaria
  -> bank_statement_row
  -> conciliación contra expense_payment o settlement_leg
  -> expense_payment.is_reconciled = true
  -> settlement_leg.is_reconciled = true

Resultado final
  -> expense puede quedar partial / paid
  -> reconciled expresa prueba bancaria del egreso
```

#### Estados intermedios obligatorios

Para evitar que un documento “pagado según Nubox” contamine caja antes de tiempo, el diseño objetivo necesita estados intermedios explícitos:

- `document_paid_in_source`
  - Nubox dice que el documento fue pagado/cobrado
  - Greenhouse todavía no tiene cash canónico

- `pending_cash_resolution`
  - existe señal operativa de pago/cobro, pero aún no hay `payment_account_id` o settlement válido

- `cash_recorded`
  - Greenhouse ya creó `income_payment` o `expense_payment`

- `cash_reconciled`
  - el payment/settlement ya quedó enlazado a una fila real de cartola

Regla dura:

- `document_paid_in_source` **no** debe mutar por sí solo `income.payment_status = paid` ni `expense.payment_status = paid`
- el estado `paid` del documento debe venir de `amount_paid` derivado desde payments canónicos Greenhouse
- la capa `Banco` solo consume `cash_recorded` / `cash_reconciled`, nunca hints documentales de Nubox

#### Special flows

- **Factoring**
  - el documento puede quedar `paid` aunque el cash recibido sea menor al nominal
  - el `income_payment` registra solo el advance real
  - la diferencia vive como fee/costo financiero

- **Previred / mixed settlements**
  - el documento/gasto puede tener múltiples componentes
  - el cash sale de la cuenta pagadora real
  - la conciliación enlaza la salida bancaria con el settlement/payment canónico, no con un hint externo

- **Manual / imported bank_statement payments**
  - pueden crear cash canónico directamente en Greenhouse
  - luego actualizan el documento por derivación normal

#### What the repo already supports

- write path canónico de cobros en `recordPayment()`
- write path canónico de pagos en `recordExpensePayment()`
- derivación de `amount_paid` y `payment_status` desde las tablas payment ledger
- factoring como ejemplo de documento + cash + diferencia económica desacoplados
- `balance_nubox` / divergences como señal separada del cash real

#### What this task must complete

- impedir que el carril Nubox salte directo de `document_paid_in_source` a `cash_recorded`
- formalizar dónde vive cada estado y cómo se expone
- asegurar que `Ventas` / `Compras` lean estado documental derivado correctamente
- asegurar que `Cobros` / `Pagos` / `Banco` solo lean cash Greenhouse canónico
- asegurar que `Conciliación` solo actúe sobre objetos en estado `cash_recorded`

### Minimum data repair targets

- `income_payments.payment_source = 'nubox_bank_sync'`
- `payment_account_id IS NULL`
- `is_reconciled = TRUE` con `settlement_leg.instrument_id IS NULL`
- matches en `bank_statement_rows` cuya contraparte no comparte `account_id`

## Acceptance Criteria

Cada criterio se valida con un **test automatizado o una query SQL determinística**, no con inspección visual.

Modelo:

- [ ] migración aplicada: `external_cash_signals` (D1) con `UNIQUE (source_system, source_event_id)` y CHECKs de enum
- [ ] migración aplicada: `external_signal_auto_adopt_policies` (D3) con `UNIQUE (source_system, space_id) WHERE is_active`
- [ ] migración aplicada: `account_signal_matching_rules` + `external_signal_resolution_attempts` (D5)
- [ ] migración aplicada: `income.source_payment_status` y `expenses.source_payment_status` (D2)
- [ ] trigger `derive_income_payment_status_from_canonical_payments` activo: `UPDATE income SET payment_status='paid'` desde sync se ignora; estado se recomputa desde payments canónicos. Test: insert payment → status cambia automáticamente; intento de override manual no persiste
- [ ] trigger `enforce_promoted_payment_invariant` (D4) activo: insert de `external_cash_signals` con `promoted_payment_id` apuntando a payment inexistente o con `payment_account_id IS NULL` falla
- [ ] migración aplicada: `settlement_legs_principal_requires_instrument` `CHECK` con `NOT VALID` (validación final post `TASK-708b`)
- [ ] migración aplicada: `income_payments_account_required_after_cutover` `CHECK` activo
- [ ] migración aplicada: `expense_payments_account_required_after_cutover` `CHECK` activo

Tipos y APIs:

- [ ] `AccountId = string & { __brand: 'AccountId' }` exportado desde `src/lib/finance/types/account-id.ts`; `parseAccountId` valida existencia
- [ ] `RecordPaymentInput.paymentAccountId: AccountId` (no nullable); cualquier intento de pasar `null` falla en `tsc`
- [ ] `RecordExpensePaymentInput.paymentAccountId: AccountId` (no nullable); idem
- [ ] `grep -rn "INSERT INTO greenhouse_finance.expense_payments" src/ scripts/` solo lista call sites bajo `expense-payment-ledger.ts`
- [ ] `grep -rn "recordPayment\|recordExpensePayment" src/lib/nubox/` devuelve `0` matches
- [ ] módulo `src/lib/finance/external-cash-signals/` existe con `recordSignal`, `evaluateSignalAccount`, `adoptSignalManually`, `dismissSignal`; único punto de escritura sobre `external_cash_signals`
- [ ] módulo `src/lib/finance/reconciliation-matchability.ts` existe; `grep` confirma cero lógica de matchability fuera del módulo
- [ ] firma `listReconciliationCandidatesByAccount(accountId: AccountId, ...)` exige `accountId` posicional
- [ ] firma `validateReconciledTransitionFromPostgres(periodId)` sin segundo parámetro

Comportamiento:

- [ ] test de regresión: `listReconciliationCandidatesByAccount(accountId='A', ...)` nunca incluye filas con account distinto a `A` (con datos sembrados de 2 cuentas)
- [ ] test de integración: Nubox bank movement con cuenta resoluble por una sola regla activa → escribe `external_cash_signals` + (si política `auto_adopt`) crea `income_payment` con `payment_account_id` resuelto
- [ ] test de integración: Nubox bank movement con cero matches → escribe `external_cash_signals` con `unresolved`, NO toca `income_payments`/`expense_payments`
- [ ] test de integración: Nubox bank movement con dos reglas matcheantes → escribe `external_cash_signals` con `unresolved` y `resolution_outcome='ambiguous'` aunque una regla tenga `priority` mayor; entrada en `external_signal_resolution_attempts` registra ambas reglas
- [ ] test de derivación: `UPDATE income.source_payment_status='pagado'` por sync NO cambia `income.payment_status`. `INSERT income_payments` con monto que cubre `total_amount` SÍ cambia `payment_status` a `'paid'` por trigger
- [ ] capability `finance.cash.adopt-external-signal` existe en `src/config/entitlements/`; UI `/finance/external-signals` la enforce en server action

Observabilidad:

- [ ] `ledger-health.ts` reporta las 6 métricas diferenciadas (4 + 2 nuevas D1/D4); runtime cohorts == 0 inmediatamente post-cutover
- [ ] signal del Reliability Control Plane `finance.data_quality.payments_account_runtime` rolls up a `healthy` en staging post-deploy
- [ ] signal `finance.data_quality.external_signals_promoted_invariant_violation` == 0 (canary del trigger D4)

Coordinación:

- [ ] `TASK-708b` creada con runbook dry-run/apply para remediación histórica; bloqueada hasta cierre de esta task
- [ ] coordinación verificada con `TASK-707` Previred: la nueva invariante no rompe el path Previred (Previred siempre resuelve cuenta — confirmado o ajustado antes del enforcement); evidencia en el archivo de TASK-708 al cierre

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual / API sobre `/api/finance/reconciliation/*`, `/api/finance/bank*`, `Cobros` y `Pagos`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se dejó runbook de remediación histórica con dry-run y apply explícito

## Follow-ups

- `TASK-708b` (creada por esta task): runbook de remediación histórica para Cohorte A (`23` rows `nubox_bank_sync` + `1` reconciliada + `4` legs sin instrumento) y Cohorte B (`65` rows `manual` backfill `exp-pay-backfill-EXP-NB-*`). Dry-run + apply explícito por cohorte; bloqueada hasta cierre de TASK-708.
- task UI específica para diferenciar visualmente "pagado según documento Nubox" vs "pagado en caja Greenhouse" — pill / badge distinto, tooltip que explique la semántica, link a la señal `nubox_payment_signals` cuando aplique.
- generalización del shape `external_cash_signal`: cuando se incorporen sources adicionales (Previred ambiguo, imports de cartola con file format propietario, gateways de pago con webhook), heredar `nubox_payment_signals` vía `source_system` discriminator. Documentar el patrón en `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`.
- coordinación con `TASK-705` (Banco read-model snapshot cutover) para que Banco lea solo cash canónico ya limpio post-TASK-708b.
- coordinación con `TASK-707` (Previred runtime canonical payment) para validar que la nueva invariante `payment_account_id NOT NULL` no rompe Previred — debe verificarse antes del enforcement, no después.
- evaluar si el `CHECK` de `account_required_after_cutover` debe migrar a `NOT NULL` puro una vez que `TASK-708b` cierre (toda la base post-remediación cumple la invariante; el `CHECK` con timestamp se vuelve redundante).

## Resolved Decisions

Las decisiones de modelado aprobadas para esta task. Cada una es una **propiedad estructural** que sobrevive a refactors y escala a sources futuros (Previred, file imports, HubSpot, Stripe) sin migrar tablas vivas.

### D1 — Lane única generalizada `greenhouse_finance.external_cash_signals`

No se crea una tabla específica de Nubox. Desde día uno, una tabla genérica con discriminator `source_system` que hereda el patrón ya usado por `webhook_inbox_events` y `source_sync_runs`.

```sql
CREATE TABLE greenhouse_finance.external_cash_signals (
  signal_id                   TEXT PRIMARY KEY,
  source_system               TEXT NOT NULL,            -- 'nubox','previred','bank_file','hubspot','manual_admin', ...
  source_event_id             TEXT NOT NULL,            -- nubox_movement_id, previred_planilla_id, etc.
  source_payload_json         JSONB NOT NULL,           -- raw upstream, audit-grade
  source_observed_at          TIMESTAMPTZ NOT NULL,
  document_kind               TEXT NOT NULL CHECK (document_kind IN ('income','expense','unknown')),
  document_id                 TEXT,                     -- FK opcional a income.income_id o expenses.expense_id
  signal_date                 DATE NOT NULL,
  amount                      NUMERIC(18,2) NOT NULL,
  currency                    TEXT NOT NULL,
  account_resolution_status   TEXT NOT NULL CHECK (account_resolution_status IN ('unresolved','resolved_high_confidence','resolved_low_confidence','adopted','superseded','dismissed')),
  resolved_account_id         TEXT REFERENCES greenhouse_finance.accounts(account_id),
  resolved_at                 TIMESTAMPTZ,
  resolved_by_user_id         TEXT,
  resolution_method           TEXT CHECK (resolution_method IN ('auto_exact_match','manual_admin','cartola_match','superseded_by_otb')),
  promoted_payment_kind       TEXT CHECK (promoted_payment_kind IN ('income_payment','expense_payment')),
  promoted_payment_id         TEXT,                     -- FK soft a income_payments.payment_id o expense_payments.payment_id
  superseded_at               TIMESTAMPTZ,
  superseded_reason           TEXT,
  space_id                    TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  observed_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_event_id)
);
```

Por qué esta forma:

- **Idempotencia natural** vía `UNIQUE (source_system, source_event_id)`: cualquier sync corre N veces sin duplicar.
- **Cero migración cuando llegue Previred / file imports / HubSpot / Stripe**: insert de un nuevo `source_system` value y listo. No se migran tablas con datos vivos.
- **Promoción audit-grade**: `promoted_payment_id` enlaza la señal con el cash canónico que la resolvió. Cadena `signal → payment → settlement → bank_statement_row` recorrible sin joins ad-hoc.
- **Compatible con `superseded_by_otb_id`** patterns (TASK-703b): la cadena de supersede es un patrón canónico del repo, se reusa.
- **Patrón ya familiar**: el equipo no aprende un patrón nuevo.

### D2 — Estado pagado documental como columna derivada (inmutable desde sync)

El `payment_status` del documento (`income`, `expenses`) deja de ser escribible por código de sync. Es **derivado por trigger o columna generada** desde `SUM(payments canónicos NOT superseded)` vs `total_amount`. Esto elimina por construcción la posibilidad de que Nubox marque "paid" sin cash.

Cambios:

- columna nueva `income.source_payment_status TEXT NULL` y `expenses.source_payment_status TEXT NULL` para conservar lo que dice Nubox (`'pagado'`, `'pendiente'`, etc.) sin contaminar el estado de caja Greenhouse.
- columna `payment_status` se vuelve derivada vía trigger `AFTER INSERT/UPDATE/DELETE` sobre `income_payments` y `expense_payments` (siguiendo el patrón **ya existente** `trg_sync_expense_amount_paid` + `fn_sync_expense_amount_paid` para `expenses` — ver migration `20260427194307630`). Para `income` el trigger se crea de cero como `trg_sync_income_amount_paid` + `fn_sync_income_amount_paid` (no existe predecesor — auditado 2026-04-28).
- el trigger debe excluir filas con `superseded_by_payment_id IS NOT NULL OR superseded_by_otb_id IS NOT NULL` del `SUM(amount)` para que los phantoms supersededos por TASK-708b no contribuyan al total derivado.
- UI muestra ambas con semántica clara: "Nubox indica pagado · caja Greenhouse pendiente".
- ningún módulo de sync escribe `payment_status` ni `amount_paid` directamente. El trigger los recomputa desde la tabla child; cualquier escritura paralela es sobrescrita en el siguiente AFTER trigger.

### D3 — Adopción de señal en dos modos con capability + política por source × space

Adopción manual o automática se controla por una **tabla declarativa de política**, no por código.

```sql
CREATE TABLE greenhouse_finance.external_signal_auto_adopt_policies (
  policy_id        TEXT PRIMARY KEY,
  source_system    TEXT NOT NULL,
  space_id         TEXT REFERENCES greenhouse_core.spaces(space_id),  -- NULL = todos los tenants
  mode             TEXT NOT NULL CHECK (mode IN ('review','auto_adopt')),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes            TEXT,
  UNIQUE (source_system, space_id) WHERE is_active
);
```

- default global para cualquier `(source_system, space_id)` no listado: `mode='review'`.
- modo `auto_adopt` solo se honra cuando D5 produce **una y solo una** regla matcheante (confianza `1.0` binaria).
- modo `review` envía la señal a la cola admin `/finance/external-signals`; un usuario con capability `finance.cash.adopt-external-signal` provee `payment_account_id` explícito. La adopción queda firmada en `resolved_by_user_id` + `resolution_method='manual_admin'`.

### D4 — Invariante cruzada signal ↔ payment

`CHECK` cruzado vía trigger (no `CHECK` directo porque cruza tablas): si `external_cash_signals.promoted_payment_id IS NOT NULL` ⇒ existe la fila correspondiente en `income_payments`/`expense_payments` con `payment_account_id NOT NULL` y `superseded_by_payment_id IS NULL`. Garantiza que ninguna señal puede marcarse "promovida" sin un payment canónico vivo del otro lado.

### D5 — Reglas de matching como datos, no como código

Tabla declarativa que controla cómo se auto-resuelve cuenta. Sin redeploy para agregar/quitar reglas.

```sql
CREATE TABLE greenhouse_finance.account_signal_matching_rules (
  rule_id              TEXT PRIMARY KEY,
  source_system        TEXT NOT NULL,
  space_id             TEXT REFERENCES greenhouse_core.spaces(space_id),  -- NULL = todos los tenants
  match_predicate_json JSONB NOT NULL,                  -- { bank_description_regex, payment_method_in, currency_eq, amount_range, ... }
  resolved_account_id  TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id),
  priority             INT NOT NULL DEFAULT 100,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_by           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ,
  rule_provenance      TEXT NOT NULL CHECK (rule_provenance IN ('admin_ui','migration_seed','imported_from_legacy')),
  notes                TEXT
);

CREATE TABLE greenhouse_finance.external_signal_resolution_attempts (
  attempt_id            TEXT PRIMARY KEY,
  signal_id             TEXT NOT NULL REFERENCES greenhouse_finance.external_cash_signals(signal_id) ON DELETE CASCADE,
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  rules_evaluated       JSONB NOT NULL,                 -- [{rule_id, matched: bool, reason}]
  matched_rule_id       TEXT REFERENCES greenhouse_finance.account_signal_matching_rules(rule_id),
  resolution_outcome    TEXT NOT NULL CHECK (resolution_outcome IN ('resolved','ambiguous','no_match')),
  resolution_account_id TEXT REFERENCES greenhouse_finance.accounts(account_id),
  evaluator_version     TEXT NOT NULL                   -- pinned para reproducibilidad
);
```

Reglas de evaluación:

- una señal se evalúa contra **todas las reglas activas** del `source_system` (filtradas por `space_id` o NULL) ordenadas por `priority`.
- **una sola** regla matchea → `account_resolution_status='resolved_high_confidence'`. Auto-adopt si D3 lo permite para ese `(source_system, space_id)`.
- **dos o más** reglas matchean → `account_resolution_status='unresolved'` con `resolution_outcome='ambiguous'`. La ambigüedad es señal de regla mal escrita; humano revisa.
- **cero** reglas matchean → `account_resolution_status='unresolved'` con `resolution_outcome='no_match'`.
- toda evaluación queda en `external_signal_resolution_attempts` aunque la regla se borre o desactive después; auditoría sobrevive.

Beneficios estructurales:

- agregar reglas para Previred, file imports, etc. sin tocar código.
- regla mal calibrada se desactiva (`is_active=false`); señales ya promovidas conservan su evidencia.
- ambigüedad cae a review humana en vez de adjudicar arbitrariamente — protege contra "regla demasiado golosa".

## Open Questions

Solo restan cuestiones de política iterables, no bloqueantes.

- afinamiento de las primeras reglas seed para Nubox en `account_signal_matching_rules` (qué `bank_description_regex` confiable existe hoy contra los movimientos reales de la Cohorte A — input para `TASK-708b`).
- política de retención: cuánto tiempo se conservan señales en estado `dismissed` o `superseded` antes de archivar.
- si la cola admin `/finance/external-signals` debe enviar notificación Teams al canal de finance cuando hay > N señales en `review` por más de M días.
