# TASK-703 — Canonical Opening Trial Balance + Liability Accounts (TC, CCA, future loans)

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Crítico`
- Effort: `Alto`
- Type: `implementation + remediation`
- Status real: `In Progress`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop`

## Summary

Cierra de raíz dos huecos arquitectónicos que TASK-702 dejó parcialmente resueltos: (1) las cuentas tipo `credit_card` y `shareholder_account` se modelaban con la convención asset (saldo positivo = dinero a favor) cuando son liability (saldo positivo = deuda); (2) el `accounts.opening_balance` se setteaba implícitamente para "que cuadre" sin trazabilidad ni audit. Esta task introduce el modelo canónico de **Opening Trial Balance (OTB)** + clasificación `account_kind` (asset|liability) + factories TS para los 3 patrones nuevos de pago (TC empresa, TC personal accionista, reembolso al accionista) + soporte FX en expenses anclados a CCA + reconstrucción de openings históricos auditables.

## Why This Task Exists

TASK-702 dejó saldos cuadrando contra cartolas reales en CLP/USD/Global66 pero:

1. **TC `santander-corp-clp` muestra $1.709.305 "saldo a favor"** cuando la realidad es deuda con Mastercard (~$1.110.897 al 27/04). El motor `materializeAccountBalance` no distingue assets de liabilities. Tu observación: "los signos están invertidos respecto a una cuenta bancaria" en una TC.

2. **CCA `sha-cca-julio-reyes-clp` muestra $1.949.078** que es la suma de "Transf a Julio Reyes" del período. Eso refleja "lo que la empresa le transfirió" pero NO "lo que la empresa le debe" — el CCA es liability bidireccional: gastos personales del accionista que la empresa cubrirá AUMENTAN deuda; reembolsos REDUCEN deuda. Hoy solo se modelan los reembolsos, sin el lado expense pagado vía tarjeta personal del accionista (*1879).

3. **El opening del CCA al 28/02 fue setteado a $0 sin justificación auditable** — coincidencia o no, no hay evidencia documentada. Si el accionista pagó Deel $1038.26 USD el 02/02 con TC personal y solo recibió $200k CLP de reembolso al 23/02, el opening real no era $0. Mismo riesgo para cualquier liability futuro (otro accionista, préstamo intercompañía, wallet con saldo migrado).

4. **El expense USD pagado vía TC personal del accionista** (caso real: Deel $903.19 USD el 04/04 cargado a *1879) requiere modelar correctamente: el CCA está en CLP, el expense en USD, el reembolso es CLP→CLP. Sin convención clara surge drift FX silencioso.

5. **Pagos a colaboradores via Deel** (Melkin Hernández Nicaragua) son nómina internacional que escala junto con los pagos via Global66 (Daniela España, Andrés Colombia). Necesita un patrón consistente: `expense kind=payroll` + `member_id` + `tool_catalog_id`, anclado al payment_account_id correcto (TC empresa o TC personal accionista) según cómo se haya pagado.

6. **Disponemos de extracto TC marzo + datos Deel** que permiten reconstruir histórico real, bajando el opening de "estimated" a "reconciled" para 2 cuentas más.

## Goal

- `account_kind` derivado en `accounts` con valores `asset` y `liability`. TC y CCA quedan liability.
- `materializeAccountBalance` invierte la convención de signo cuando `account_kind='liability'`: closing = opening + outflows − inflows. Inflows (reembolsos a TC, transferencias a CCA) reducen deuda; outflows (cargos a TC, gastos pagados con tarjeta personal del accionista) aumentan deuda.
- Tabla `account_opening_trial_balance` con declaraciones OTB explícitas, supersedibles, audit-trail-preservadas.
- Helpers TS canónicos para 3 patrones nuevos: `createCompanyCardExpense`, `createShareholderCardExpense`, `createShareholderReimbursementSettlement`.
- Soporte FX automático en `createShareholderCardExpense` cuando expense USD entra al CCA CLP.
- Reconstrucción del histórico CCA Julio Reyes (Deel + cualquier otro tooling con *1879) y del opening TC con datos del extracto marzo.
- UI `/finance/bank` muestra label correcto por kind: "Saldo disponible" para asset, "Deuda actual" para liability.
- Drift guard: cuenta liability sin OTB activa rompe build (no se puede deployar drift de saldo histórico).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md` (foundation)

Reglas obligatorias (CLAUDE.md):

- VIEW canónica `income_settlement_reconciliation` y helper `account-balances-rematerialize` mantienen su contrato. Cualquier cambio al motor de saldos debe pasar la validación contra cartolas (CLP $4.172.563, USD US$1,94, Global66 $380).
- OTB sigue el patrón canónico anti-DELETE: cuando se revisa una OTB, se inserta una nueva con `superseded_by` apuntando a la anterior. Mismo shape que `superseded_by_payment_id` en payments.
- Cuando un expense está en moneda no-CLP y se ancla a un instrumento CLP (CCA), se persiste `amount`, `amount_clp`, `exchange_rate_at_payment` (columnas existentes) y el motor de saldos del instrumento CLP suma `amount_clp` (no `amount`).
- Outbox events anclados — la OTB declaration emite `finance.account.opening_trial_balance.declared` para que cost_attribution + reliability re-materialicen.

## Dependencies & Impact

### Depends on

- TASK-702 cerrada (esta task se construye encima)
- Migración `20260427194307630` (canonical anchors + supersede) ya aplicada
- Migración `20260427194308180` (loan_accounts scaffold) ya aplicada
- VIEW `income_settlement_reconciliation`
- Tabla `greenhouse_ai.tool_catalog` para anclar Deel
- Función `resolveExchangeRateToClp` en `payment-ledger.ts` (FX rate por fecha)

### Blocks / Impacts

- `commercial_cost_attribution` y `client_economics` — los expense_payments con anchor canónico vía las nuevas factories disparan outbox events que las re-materializaciones consumen. Cost attribution per cliente debe seguir cuadrando.
- Reliability dashboard — el endpoint `/api/admin/finance/ledger-health` ya creado por TASK-702 se extiende para detectar liabilities sin OTB activa como nueva dimensión de drift.
- TASK-518 (ApexCharts deprecation) — sin impacto.
- Cron de Cloud Run `ops-finance-rematerialize-balances` ya en producción debe consumir el motor invertido sin cambios de signature (es una refactorización interna).

### Files owned

- `migrations/<ts>_task-703-account-kind-and-opening-trial-balance.sql`
- `src/lib/finance/account-opening-trial-balance.ts`
- `src/lib/finance/account-balances.ts` (modificar `materializeAccountBalance` para liability invertida)
- `src/lib/finance/account-balances-rematerialize.ts` (consumir OTB en lugar de `accounts.opening_balance`)
- `src/lib/finance/payment-instruments/anchored-payments.ts` (extender con 3 nuevas factories)
- `src/lib/finance/payment-instruments/__tests__/anchored-payments-shareholder.test.ts`
- `src/lib/finance/ledger-health.ts` (agregar dimensión "liability sin OTB")
- `scripts/finance/declare-opening-trial-balance.ts` (CLI)
- `scripts/finance/backfill-shareholder-card-historical.ts`
- `src/views/greenhouse/finance/BankView.tsx` (label dinámico por account_kind)
- `docs/documentation/finance/conciliacion-bancaria.md` (extender con sección OTB + liabilities)
- `docs/tasks/in-progress/TASK-703-...md` (este archivo)

## Current Repo State

### Already exists (TASK-702 foundation)

- `expenses` con FK anchors `payroll_entry_id`, `tool_catalog_id`, `loan_account_id`, `tax_type`
- `income_payments` y `expense_payments` con `superseded_by_payment_id`
- `factoring_operations` con `fee_amount` desglosado
- `payment_provider_catalog` con FK desde `accounts.provider_slug`
- `account_balances` daily snapshots
- 12 factories anchored payments en `anchored-payments.ts`
- `materializeAccountBalance` con FX support
- `rematerializeAccountBalanceRange` idempotente
- VIEW `income_settlement_reconciliation`
- `/api/admin/finance/ledger-health` endpoint
- Cron Cloud Run `ops-finance-rematerialize-balances` daily
- TC empresa cartola marzo disponible: `data/bank/EstadoCuentaTC-XXXXXXXXXXXX2505-20260427.pdf`
- 9 pagos Deel históricos visibles en `app.deel.com/payments/history` (REC-2025-1 al REC-2026-7)
- Saldos CLP/USD/Global66 cuadran banco real al 27/04

### Gap

- `account_kind` no existe — TC y CCA usan convención asset incorrecta
- `account_opening_trial_balance` table no existe — opening implícito via `accounts.opening_balance`
- 3 factories nuevas faltan: TC empresa explicit, TC personal accionista, reembolso shareholder
- Histórico CCA pre-28/02 nunca registrado canónicamente (gastos *1879 y transferencias antiguas a Julio)
- Los 5 pagos Deel del período (3 *2505 + 2 *1879) no están registrados como expense_payment con anchor `tool_catalog_id=deel` + `member_id=melkin`
- TC empresa opening al 28/02 desconocido (la cartola PDF de marzo permite reconstruirlo)
- UI `/finance/bank` muestra "Saldo estimado" para liability cuando debería mostrar "Deuda actual"
- `getFinanceLedgerHealth` no chequea liabilities sin OTB

## Scope

### Slice 1 — Schema (account_kind + OTB table)

- Migración `<ts>_task-703-account-kind-and-opening-trial-balance.sql`:
  - Add column `accounts.account_kind` GENERATED ALWAYS AS (CASE WHEN instrument_category IN ('credit_card','shareholder_account') THEN 'liability' ELSE 'asset' END) STORED.
  - CREATE TABLE `account_opening_trial_balance` con columnas: obtb_id, account_id (FK), genesis_date, opening_balance, opening_balance_clp, declared_by_user_id, declared_at, declaration_reason, audit_status (CHECK estimated|reconciled|audited), evidence_refs (JSONB), superseded_by (self-FK), superseded_at, superseded_reason, created_at.
  - INDEX para reverse lookup.
  - GRANTs runtime/migrator/app.

### Slice 2 — Engine: liability sign inversion

- `materializeAccountBalance`: leer `accounts.account_kind`. Si liability:
  - Closing = opening + outflows − inflows (signo invertido)
  - period_inflows / period_outflows mantienen su semántica del POV bancario (cargo TC = outflow visible; pago TC = inflow visible) pero el closing los aplica al revés.
- `getDailyMovementSummary`: sin cambios — sigue agregando legs y payments por dirección.
- `rematerializeAccountBalanceRange` priorize OTB sobre `accounts.opening_balance` cuando exista.

### Slice 3 — OTB helper + CLI

- `src/lib/finance/account-opening-trial-balance.ts`:
  - `declareOpeningTrialBalance({ accountId, genesisDate, openingBalance, declaredBy, reason, evidenceRefs, auditStatus })` — INSERT idempotente.
  - `getActiveOpeningTrialBalance(accountId)` — SELECT WHERE superseded_by IS NULL.
  - `superseseOTBWithRevision({ obtbId, newOpening, reason, evidenceRefs })` — INSERT new + UPDATE old.
- CLI `pnpm finance:declare-opening-balance --account=X --date=Y --amount=Z --reason="..." --status=estimated|reconciled|audited`.

### Slice 4 — 3 nuevas factories

En `anchored-payments.ts`:

- `createCompanyCardExpense({ toolCatalogId, memberId?, amount, currency, paymentDate, description?, supplierName?, ... })` — anchored a `payment_account_id=santander-corp-clp` (or whatever credit_card account), `payment_method='company_credit_card'`. FX auto si currency != CLP.
- `createShareholderCardExpense({ toolCatalogId, memberId?, amount, currency, paymentDate, ccaInstrumentId='sha-cca-julio-reyes-clp', shareholderCardLast4, ... })` — anchored a CCA instrument (liability), `payment_method='shareholder_personal_card'`, `payment_provider='Tarjeta personal {shareholderName} (*{last4})'`. FX automático: persiste `amount` en USD/EUR + `amount_clp` derivado al rate del día.
- `createShareholderReimbursementSettlement({ amount, paymentDate, sourceAccountId='santander-clp', ccaInstrumentId, linkedExpensePaymentIds?: string[] })` — settlement_group internal_transfer entre asset CLP y liability CLP. Optional linking a expense_payments cubiertos.

### Slice 5 — Discovery + scaffold catalogs

- Verificar que `melkin-hernandez` (o equivalente) existe en `team_members`. Si no, scaffold mínimo con `country='NI'`, `pay_regime='deel_contractor'`.
- Verificar que `deel` está en `greenhouse_ai.tool_catalog` con `tool_id='deel'`. Si no existe, INSERT.
- Lectura del PDF `data/bank/EstadoCuentaTC-XXXXXXXXXXXX2505-20260427.pdf` (extracto TC marzo + cierre 06/04) para extraer movimientos de marzo y derivar saldo apertura TC al 28/02 + verificación de cierres.

### Slice 6 — Backfill histórico

`scripts/finance/backfill-shareholder-card-historical.ts`:

- Carga los 9 pagos Deel históricos (REC-2025-1 a REC-2026-7) con la tarjeta correcta (*1879 personal o *2505 empresa) según mapping ya conocido.
- Para *1879: crea expense + expense_payment via `createShareholderCardExpense` con FX al día. Currency USD, amount_clp derivado.
- Para *2505: crea expense + expense_payment via `createCompanyCardExpense` con FX al día. Currency USD, amount_clp derivado.
- Identifica las "Transf a Julio Reyes" del período conciliable y las modela via `createShareholderReimbursementSettlement` reemplazando los `internal_transfer` settlements crudos creados en TASK-702.
- Idempotente: cada expense + payment + settlement_group con deterministic ID.

### Slice 7 — Declarar OTBs

CLI invocations o helper script que declara OTB para los 7 instrumentos:

- santander-clp: 28/02, $5,703,909, audit_status='reconciled' (derivado de cartola CLP saldo running 25/02)
- santander-usd-usd: 28/02, USD 2,591.94, 'reconciled' (cartola USD)
- global66-clp: 28/02, $380, 'reconciled' (cuadre febrero)
- santander-corp-clp: 28/02, $X (derivado del PDF TC marzo), 'reconciled'
- sha-cca-julio-reyes-clp: 28/02, $Y (derivado del backfill histórico), 'estimated' o 'reconciled' según completitud de datos
- deel-clp: 28/02, $0, 'reconciled' (transit account, sin saldo)
- previred-clp: 28/02, $0, 'reconciled' (idem)

### Slice 8 — UI labels

- `src/views/greenhouse/finance/BankView.tsx`: cuando `account.kind === 'liability'`, label "Deuda estimada" en color rojo si > 0.
- Para CCA: mostrar 2 columnas explícitas — "Lo que la empresa te debe" (suma expense_payments shareholder_card) y "Reembolsos transferidos" (suma settlement_groups internal_transfer hacia CCA). Diff = saldo OTB.

### Slice 9 — Health endpoint extension

- Agregar dimensión 5 a `getFinanceLedgerHealth`: liabilities sin OTB activa (filter `accounts.account_kind='liability' AND NOT EXISTS active OTB`).
- Health endpoint devuelve 503 si alguna liability sin OTB.

### Slice 10 — Validación end-to-end

- Re-correr `pnpm finance:rematerialize-balances --all --as-of 2026-04-27`.
- Verificar:
  - santander-corp-clp closing al 27/04 ≈ deuda real al cierre de cartola (ahora con signo correcto)
  - sha-cca-julio-reyes-clp closing al 27/04 = $211.93 USD × FX (~$201,334 CLP) si el único expense personal sin reembolsar es el del 15/04
  - bancos asset siguen cuadrando exacto
- `pnpm test`, `pnpm lint`, `npx tsc --noEmit` verde.
- `pnpm catalog:check` OK.
- Commit + push + mover TASK-703 a complete/.

## Out of Scope

- Refactor de `commercial_cost_attribution` (los outbox events propagan correctamente; downstream calculations cuadran)
- Generalización a otras monedas más allá de USD/EUR/CLP (cuando aparezca otra, se extiende `resolveExchangeRateToClp`)
- UI completa de "OTB declaration drawer" (CLI por ahora; UI en task derivada)
- Migración del histórico pre-genesis (cualquier dato anterior al primer OTB se considera fuera del sistema canónico — opcional declarar genesis más temprano si se consigue data)

## Acceptance Criteria

- [ ] Migración aplicada a `greenhouse-pg-dev`
- [ ] Tabla `account_opening_trial_balance` con 7 OTBs activas (una por cuenta)
- [ ] `materializeAccountBalance` invierte signo correctamente para liability accounts
- [ ] TC `santander-corp-clp` closing 27/04 muestra deuda con Mastercard, no saldo a favor
- [ ] CCA `sha-cca-julio-reyes-clp` closing 27/04 muestra deuda viva pendiente (≈ Apr 15 expense $201,334 CLP si todo lo demás está reembolsado, o el residual real según backfill)
- [ ] Bancos CLP/USD/Global66 closing 27/04 mantienen cuadre exacto (drift 0)
- [ ] 5 pagos Deel del período (3 *2505 + 2 *1879) están en `expense_payments` con anchor `tool_catalog_id=deel` + `member_id=melkin-hernandez-id`
- [ ] Histórico Deel pre-período declarado en backfill (los 4 receipts pre-28/02)
- [ ] `/finance/bank` UI muestra "Deuda estimada" para liability accounts
- [ ] `/api/admin/finance/ledger-health` devuelve 200 OK (todas liability con OTB activa)
- [ ] `pnpm test`: 100% verde
- [ ] `npx tsc --noEmit`: 0 errores
- [ ] `pnpm lint`: 0 errores
- [ ] `pnpm catalog:check`: OK
- [ ] Migración del cron Cloud Run sigue funcionando con la nueva convención (no requiere re-deploy si signature de helpers no cambió)

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm catalog:check`
- `pnpm finance:rematerialize-balances --all --as-of 2026-04-27` produce saldos correctos
- `curl /api/admin/finance/ledger-health` returns 200 healthy

## Closing Protocol

- [ ] `Lifecycle` sincronizado a `complete`
- [ ] archivo en `complete/`
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `TASK_ID_REGISTRY.md` actualizado
- [ ] cross-impact ejecutado

## Follow-ups

- UI drawer de "Declarar OTB" (hoy CLI only)
- Soporte multi-shareholder en CCA (TASK-700 ya soporta el modelo multi-cuenta)
- Reliability cron que detecte liability sin OTB y dispare alerta
- Migración del backfill histórico a otras monedas si emerge (EUR direct via Wise por ejemplo)

## Open Questions

- Si Julio aporta data del histórico *1879 pre-28/02 + transferencias pre-19/02, podemos llevar OTB CCA a `audit_status='reconciled'`. Sin esa data queda 'estimated'.

## Delta 2026-04-28 — TASK-703b OTB cascade-supersede

Cuando se intentó cuadrar abril contra OfficeBanking del banco, el OTB original al 06/03 = $802,905 estaba semánticamente **invertido**: el PDF de marzo dice "SALDO ADEUDADO FINAL PERÍODO ANTERIOR -$802,905" — la magnitud es la misma pero el signo indica **crédito a favor del cliente** (sobrepago), no deuda. Convención liability del Greenhouse: balance positivo = deuda con banco; negativo = sobrepago. Anchoring positivo era incorrecto.

Adicionalmente había **datos phantom pre-OTB** en la chain: account_balances rows desde 2025-05-01 (un materialize antiguo nunca podado), expense_payments y settlement_legs en marzo que llenaban opening con valores erráticos.

**Solución canónica robusta** (no parche):

1. **Migración `20260428000125705_task-703b-otb-cascade-supersede.sql`**:
   - Columnas `superseded_by_otb_id` en `settlement_legs`, `income_payments`, `expense_payments` con FK a `account_opening_trial_balance(obtb_id)`. Misma forma que `superseded_by_payment_id` (TASK-702) pero con semántica diferente: el supersede payment-chain es intra-document; el supersede OTB es anchor-driven (data antes del anchor canónico está fuera del scope del chain corriente).
   - SQL function `cascade_supersede_pre_otb_transactions(account_id, otb_id, genesis_date, reason)` atómica que: (a) UPDATE settlement_legs/income_payments/expense_payments con `transaction_date < genesis_date` marcándolas `superseded_by_otb_id = otb_id`, (b) DELETE account_balances con `balance_date < genesis_date` (proyecciones derivadas, audit valor está en source transactions). Idempotente (solo afecta filas con superseded_by_otb_id IS NULL). Devuelve counts para telemetry.

2. **`declareOpeningTrialBalance`** actualizado:
   - Busca cualquier OTB activa para la cuenta (regardless de date), no solo same-genesis_date.
   - INSERT new OTB primero (FK requirement), luego UPDATE old OTB → `superseded_by = new.obtb_id`.
   - Llama a `cascade_supersede_pre_otb_transactions` automáticamente al declarar.
   - Outbox event `finance.account.opening_trial_balance.declared` ahora incluye `cascadeCounts` para observabilidad.

3. **`materializeAccountBalance`** actualizado:
   - `getDailyMovementSummary`, `getDailyFxGainLoss`, `getEarliestMovementDate`, y la query del drawer de detalle filtran `superseded_by_otb_id IS NULL` en las 3 tablas.
   - `resolveMaterializationStartDate` clamps al OTB.genesisDate — el materializer NUNCA camina más temprano que el active OTB.
   - Convención: `OTB.genesisDate` = SOD (start of day). Movements ON genesis_date son post-anchor. Movements antes de genesis_date son pre-anchor (cascade-superseded).

4. **UI fix `getBankOverview` credit_card "Consumido"**:
   - **Antes**: `consumed = periodOutflows` (solo cargos del mes seleccionado — bug en cards revolving porque ignora deuda acumulada de ciclos anteriores).
   - **Después**: `consumed = max(0, closingBalance)` (running cumulative debt — match con bank UI "Cupo utilizado / Deuda"). Negativo (sobrepago) clamp a 0 — match con convención banco que no muestra "deuda negativa".

5. **Re-anchor TC corp**: nueva OTB al 07/04 = $268,442 reconciled (= "MONTO TOTAL FACTURADO A PAGAR" del PDF cycle close 06/04 = cupo utilizado al EOD 06/04 = SOD 07/04). Cascade superseded automáticamente: 2 settlement_legs marzo, 1 settlement_leg 06/04 (pago marzo cycle que aterrizó tarde), 3 expense_payments Deel pre-anchor. Re-materialización via `scripts/finance/rematerialize-account.ts`.

**Resultado verificado**:

- Closing balance TC corp 27/04 (PG) = **$1,125,449**
- Bank reality 27/04 (OfficeBanking) = **$1,063,381**
- **Gap residual = $62,068** (5.5%)

Sources del gap residual (tracking explícito, no hardcodeo):

- **Vercel refund $14,552** pendiente de capturar como income_payment (incoming abril). Cuando se backfillee → closing baja a $1,110,897 → gap $47,516.
- **Bank holds bancarios ~$96,246**: cupo total OfficeBanking = $1,603,754 vs cupo total PDF = $1,700,000. Diferencia $96,246 son authorizations pendientes que reducen disponible pero no deuda. Estos NO son cargos a registrar en nuestro ledger (no han sido posted) — son fluctuaciones de bank.
- **FX rate diffs en cargos USD** (Vercel/Anthropic/OpenAI/Adobe): nuestras conversiones a CLP usan rate mid-day; banco usa rate al settlement (puede diferir 0.5-2%). Sobre $1.3M de cargos, drift de 0.5% = ~$6.5K.

**Patrón reusable**: el mecanismo OTB cascade-supersede es ahora canónico. Cuando aparezcan otras cuentas liability/asset que necesiten re-anclar (otro accionista, préstamos, wallets), el flujo es: (1) declarar nueva OTB con genesisDate más reciente y opening_balance authoritative del bank, (2) cascade-supersede borra account_balances pre-anchor y marca pre-OTB transactions superseded, (3) re-materializar via `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/rematerialize-account.ts <accountId>`.
