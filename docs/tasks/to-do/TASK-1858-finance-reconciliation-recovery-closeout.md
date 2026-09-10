# TASK-1858 — Cierre de la recuperación de conciliación bancaria ago–sep 2026: rollout ISSUE-169, drift FX no-CLP, rutina mensual y regularizaciones Payroll/CCA

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar lo que quedó abierto tras la recuperación de conciliación bancaria de agosto–septiembre 2026 (commits
`2dad8aba5` → `5c0bbeec1` en `develop`): llevar a producción el fix de saldos en moneda extranjera y del día
genesis (`ISSUE-169`), extender el detector `finance.account_balances.fx_drift` a cuentas USD/MXN, dejar la
conciliación mensual como rutina operable (cartola → import → plan → cierre), regularizar en Payroll lo que la
caja dejó al descubierto (honorarios brutos, sueldo accionista sin entry, nómina Deel de abril) y anclar la
cuenta corriente accionista a su saldo real.

## Why This Task Exists

La recuperación se hizo local-first y con datos reales sobre el Cloud SQL compartido, pero: (1) el ops-worker de
Cloud Run corre el código previo al fix y, al recomputar saldos por eventos, vuelve a sumar CLP en cuentas
USD/MXN (ocurrió con el cobro HubSpot del 13/08; se rematerializó a mano); (2) el detector de drift excluye
explícitamente cuentas no-CLP, por eso el bug pasó meses invisible; (3) tres registros de Payroll no describen lo
que salió del banco (Humberly bruto sin retención, sueldo accionista sin entry, nómina abril de Melkin marcada
pagada desde la TC) y Finance no debe mutar `payroll_entries`; (4) el CCA acumula desde febrero sin las
cartolas de mayo–julio, así que su saldo (−4,1 M al 10/09) no es bank-authoritative; (5) sin rutina, en cuatro
meses vuelve a pasar lo mismo.

## Goal

- El fix `ISSUE-169` corre en los 6 runtimes (Vercel + Cloud Run) y `finance.account_balances.fx_drift` cubre
  cuentas USD/MXN con steady = 0.
- La rutina mensual de conciliación queda como checklist operable en el manual, con las 5 cuentas activas y sus
  fuentes, y Nubox como fuente de los pagos de proveedores que hoy se resuelven por plan.
- Payroll regulariza: entry 2026-07 de Humberly (bruto 300.000 vs 450.000 pagados), política de retención SII
  no practicada, entry/sueldo empresarial de Julio Reyes, y la nómina 2026-04 de Melkin (TC vs tarjeta personal).
- El CCA queda anclado (OTB) al saldo real al 01/08/2026 con regla explícita de qué entra (reembolsos Deel) y
  qué no (sueldo).
- El crédito 420051383906 tiene `original_amount` y plazo desde el estado de cuenta trimestral.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (§Delta 2026-09-10 — recuperación ago–sep; §TASK-774; §TASK-703b)
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Finance NUNCA muta `payroll_entries`/`compensation_versions`: las regularizaciones de Payroll se piden al
  dominio (skill `greenhouse-payroll-auditor`) y Finance sólo re-vincula caja.
- Todo saldo se re-ancla con OTB bank-authoritative + `cascade_supersede_pre_otb_transactions`; nunca UPDATE
  directo de `account_balances`.
- Prender/desplegar es multi-runtime: el consumer reactivo de saldos vive en el `ops-worker` (Cloud Run), no
  sólo en Vercel (`FEATURE_FLAG_STATE_LEDGER.md` §multi-runtime).
- Promoción a producción sólo por el control plane (`greenhouse-production-release`).

## Normative Docs

- `docs/issues/resolved/ISSUE-169-account-balances-foreign-currency-and-genesis-day.md`
- `docs/manual-de-uso/finance/conciliacion-bancaria-operacion.md` (v1.1)
- `docs/documentation/finance/conciliacion-bancaria.md` (v1.6)
- `scripts/finance/reconciliation-plans/2026-08-09.json`, `deel-2026-08-09.json`, `deel-2026-05-07.json`,
  `ledger-2026-08-09.json` (el juicio humano registrado de la recuperación)

## Dependencies & Impact

### Depends on

- Commits en `develop` `2dad8aba5`, `1b2238378`, `4ee8c7a17`, `8b8bc2544`, `5c0bbeec1` (adapters, engine de
  planes, fix ISSUE-169, loans V1, CLIs).
- `src/lib/reliability/queries/account-balances-fx-drift.ts` (hoy `WHERE a.currency = 'CLP'`).
- `src/lib/sync/projections/account-balances.ts` (consumer reactivo en ops-worker).
- Payroll: entries `2026-07_humberly-henriquez`, `2026-04_melkin-hernandez`; member `julio-reyes` sin entries.

### Blocks / Impacts

- `TASK-707b` (Previred backfill) comparte el patrón cascade-supersede + re-match.
- `TASK-719` (OTB Global66 verificación): el ancla de Global66 ya se movió al 31/07 con export oficial —
  registrar Delta.
- Reliability dashboard `/admin/operations` (signal nuevo/extendido).

### Files owned

- `src/lib/reliability/queries/account-balances-fx-drift.ts`
- `src/lib/finance/account-balances.ts`, `src/lib/finance/account-balances-rematerialize.ts` (ya en develop)
- `scripts/finance/otb-declarations/2026-08-sha-cca-reanchor.json` (nuevo)
- `docs/manual-de-uso/finance/conciliacion-bancaria-operacion.md` (§rutina mensual)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (sin flag nuevo; sólo verificación de runtime)

## Current Repo State

### Already exists

- Adapters `src/lib/finance/bank-statements/**` (5 formatos) + `parseBankStatementFile`; ruta de import por
  archivo/texto; drawer con pestaña «Archivo del banco».
- CLIs: `finance:import-statement`, `finance:reconcile-rows`, `finance:ledger-adjust`,
  `finance:record-deel-receipts`, `finance:contractor-settle`, `finance:instrument:create`,
  `finance:declare-otbs --file`.
- `toAccountUnits` (moneda de la cuenta) y materialización del día genesis (`ISSUE-169`), sólo en `develop`.
- `src/lib/finance/loans.ts` (create + funding disbursement); crédito FOGAPE registrado.
- Períodos `reconciled`: Santander CLP ago, Santander USD ago, Banco de Chile ago, Global66 jul/ago/(sep en
  curso), Global66 MXN ago, TC ago.

### Gap

- Producción y Cloud Run con el código previo a `ISSUE-169` (saldos USD/MXN se reescriben en CLP al recomputar).
- `fx_drift` no observa cuentas no-CLP.
- Sin checklist mensual ni fuente automática para pagos de proveedores (hoy `pay_expense` manual por plan).
- Payroll: entry 2026-07 Humberly inconsistente con lo pagado; retención no practicada sin política; sueldo
  accionista sin entry (`createMemberPaymentExpense` como registro de caja provisional); nómina 2026-04 Melkin
  marcada pagada desde TC sin evidencia del estado de cuenta de mayo.
- CCA sin ancla bank-authoritative (genesis 28/02 con huecos mayo–julio).
- `loan_accounts.loan-santander-420051383906` sin `original_amount`/`installment_count`.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/finance/**` (commands/readers), `src/lib/reliability/queries/**` (signal),
  `services/ops-worker` (consumer reactivo que ejecuta `account-balances` projection), `scripts/finance/**` (CLIs).
- Future candidate home: `domain-package`
- Boundary: los commands canónicos de Finance (`materializeAccountBalance`, `rematerializeAccountBalanceRange`,
  `declareOpeningTrialBalance`, `linkStatementRow`) son el primitive; UI, CLI y consumer reactivo son clientes.
- Server/browser split: server-only en su totalidad (commands, CLI y projection); el browser sólo recibe DTOs del período y del saldo.
- Build impact: `none` (sin dependencias nuevas; `xlsx`/`pdfjs-dist` ya presentes).
- Extraction blocker: transacciones PG compartidas entre finance/payroll/contractor y el outbox único.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_finance.account_balances`, `account_opening_trial_balance`,
  `reconciliation_periods`, reliability signal `finance.account_balances.fx_drift`
- Consumidores afectados: `UI (/finance/reconciliation, /finance/bank)`, `ops-worker (projection reactiva)`,
  `Reliability Control Plane`, `CLI`
- Runtime target: `production + worker`

### Contract surface

- Contrato existente a respetar: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` §TASK-774/§Delta
  2026-09-10; `src/lib/finance/account-balances.ts` (`toAccountUnits`)
- Contrato nuevo o modificado: `account-balances-fx-drift` acepta cuentas no-CLP (recompute en moneda de la
  cuenta); nueva OTB CCA; checklist mensual documental
- Backward compatibility: `compatible` (misma firma; sólo amplía cobertura)
- Full API parity: los saldos y períodos ya se operan por commands/readers; la rutina mensual usa la CLI y la
  ruta de import (mismo primitive).

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_finance.account_balances`, `account_opening_trial_balance`
  (append-only, supersede), `settlement_legs` (superseded_by_otb_id)
- Invariantes que no se pueden romper:
  - `genesis_date` = saldo al inicio del día; el día genesis materializa sus movimientos.
  - Cuentas no-CLP suman en su moneda; `closing_balance_clp` = closing × tasa del día.
  - `fx_drift` tolerancia 1 CLP; steady = 0.
- Write-target allowlist: `N/A` (sin tablas nuevas)
- Tenant/space boundary: `space_id` heredado de `accounts`; sin cambios
- Idempotency/concurrency: OTB idempotente (mismo genesis+saldo = no-op); rematerialize es replay determinista
- Audit/outbox/history: eventos `finance.account.opening_trial_balance.declared` ya existentes

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` (fix de corrección; no hay flag)
- Backfill plan: rematerializar las 9 cuentas desde genesis tras el deploy (CLI) y comparar contra las cartolas
- Rollback path: `revert PR` (el código previo vuelve a sumar CLP en USD/MXN; los datos no se pierden)
- External coordination: release develop→main por control plane; deploy de `ops-worker` (workflow Cloud Run)

### Security and access

- Auth/access gate: sin cambios (capabilities `finance.reconciliation.*` existentes)
- Sensitive data posture: `finance` (montos, RUT en glosas de cartola); los PDFs viven en `data/bank/` ignorado
- Error contract: `FinanceValidationError` + `captureWithDomain('finance')`
- Abuse/rate-limit posture: `none with rationale` (CLI y rutas ya gateadas)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/finance/bank-statements src/lib/finance/payment-instruments src/lib/reliability/queries/account-balances-fx-drift.test.ts`
- DB/runtime checks: `pnpm finance:rematerialize-balances --account <cada cuenta>` + comparación con
  `meta.closingBalance` de la cartola; `pnpm pg:doctor`
- Integration checks: forzar un evento de pago en cuenta USD y verificar que el ops-worker no reescribe en CLP
- Reliability signals/logs: `finance.account_balances.fx_drift` (extendido), `sync.outbox.unpublished_lag`
- Production verification sequence: ver §Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist de destinos de escritura del dominio: N/A (sin tablas nuevas).
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Rollout ISSUE-169 a producción y ops-worker

- Release develop→main por `greenhouse-production-release` incluyendo `2dad8aba5…5c0bbeec1`.
- Verificar la revisión activa del `ops-worker` con el código nuevo y rematerializar las 9 cuentas.
- Evidencia: closing por cuenta = cartola (Santander CLP 33.002.610 al 10/09; USD 336,44; Global66 16.468;
  MXN 10; Banco de Chile 3.660.000; TC 1.532.944).

### Slice 2 — `fx_drift` para cuentas USD/MXN

- Extender `account-balances-fx-drift.ts`: recompute en moneda de la cuenta (`toAccountUnits`) y comparar
  contra `closing_balance`; tolerancia 0,01 en la moneda de la cuenta.
- Tests con cuenta USD (pago USD nativo, pago CLP convertido) y reliability overview mostrando el signal.

### Slice 3 — Rutina mensual de conciliación

- Checklist en el manual: fuentes por cuenta (Santander CLP/USD XLSX, TC PDF, Global66 XLS CLP/MXN, Banco de
  Chile PDF), orden (import → auto-match → plan → rematerialize → declarar cierre), y qué escalar.
- Decidir si los pagos de proveedores Nubox (`EXP-NB-*`) se calzan automáticamente por monto/fecha (candidato
  en `listReconciliationCandidatesFromPostgres` para expenses `pending`) o siguen por plan; implementar la
  opción elegida.

### Slice 4 — Regularizaciones Payroll (petición al dominio, no escritura desde Finance)

- Humberly: revisar entry 2026-07 (bruto 300.000 vs pagado 450.000) y política de retención SII no practicada
  (68.625 agosto + julio); decidir si se descuenta o se asume.
- Julio Reyes: crear sueldo empresarial como entry de Payroll y re-vincular los expenses
  `EXP-RECON-20260907-38j4/efpg` (pagos directos) al entry.
- Melkin 2026-04: confirmar con el estado de cuenta TC de mayo si `EXP-202604-005` salió de la TC o de la
  tarjeta personal; si es personal, supersede + REC-2026-8 contractor al CCA.

### Slice 5 — CCA anclado + crédito 420051383906

- OTB `sha-cca-julio-reyes-clp` al 01/08/2026 con saldo acordado con el accionista (Deel REC-2026-8/9/10 menos
  reembolsos mayo–julio) y regla documentada (entra: reembolsos de gastos pagados con tarjeta personal; no
  entra: sueldo).
- `loan_accounts.loan-santander-420051383906`: `original_amount`, `installment_count`, `started_at` desde el
  estado de cuenta trimestral (correo Santander 14/07/2026, PDF `36_16359_420051383906_2026-06-30.pdf`).

## Out of Scope

- Reconstruir mayo–julio 2026 (decisión: re-anclaje).
- Cambiar el motor de auto-match (scoring) más allá de agregar candidatos `pending` de Nubox.
- UI nueva para créditos (calendario de cuotas / saldo insoluto): follow-up separado.
- Importación automática de cartolas (API bancaria / correo): follow-up separado.

## Detailed Spec

Ver `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` §Delta 2026-09-10 (adapters, opening canónico,
`toAccountUnits`, día genesis, loans V1, plan declarativo) y `ISSUE-169`. Para Slice 2, la consulta del detector
debe replicar la regla de `toAccountUnits` en SQL o delegar en TS por cuenta (preferible: leer los movimientos
crudos y reutilizar la función, para que no existan dos implementaciones).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (rollout) → Slice 2 (detector) → Slice 3 (rutina). Slice 2 sin Slice 1 alerta sobre producción con el
  código viejo (ruido); Slice 3 sin Slice 1 documenta una rutina que el worker deshace.
- Slice 4 y 5 pueden correr en paralelo con 2–3 una vez cerrado Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El ops-worker recompute saldos USD/MXN en CLP antes del deploy | finance / cron | high | Slice 1 primero; rematerializar tras el deploy; no tocar cuentas USD/MXN hasta entonces | `finance.account_balances.fx_drift` (tras Slice 2) |
| Release rompe otro consumer del materializer (rematerialize desde genesis) | finance | low | Tests focales verdes; comparación cartola por cuenta en staging | `finance.account_balances.fx_drift` |
| Regularización Payroll cambia netos ya pagados | payroll | medium | Payroll decide; Finance sólo re-vincula; gate `pnpm vitest run src/lib/payroll` | `paid_orders_without_expense_payment` |
| OTB CCA con saldo estimado | finance | medium | `auditStatus=estimated` hasta acuerdo con el accionista | drift snapshot CCA |

### Feature flags / cutover

- Sin flag nuevo. `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` debe estar `true` en el runtime que ejecute
  `finance:contractor-settle` (ya ON en Production/staging según ledger).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + release; rematerializar | 30 min | si |
| Slice 2 | revert PR (signal vuelve a CLP-only) | 10 min | si |
| Slice 3 | doc-only | — | si |
| Slice 4 | supersede de los payments re-vinculados (append-only) | 15 min | parcial |
| Slice 5 | nueva OTB que supersede la anterior | 10 min | si |

### Production verification sequence

1. Release por control plane; watchdog verde; `ops-worker` revisión activa con el commit.
2. `pnpm finance:rematerialize-balances --account santander-usd-usd` y `global-66-mxn-mxn` en producción;
   verificar closing vs cartola.
3. Disparar un evento de pago en cuenta USD (o esperar el próximo) y confirmar que el saldo no cambia de moneda.
4. Signal `fx_drift` = 0 durante 7 días.

### Out-of-band coordination required

- Payroll/HR (Slice 4): decisión sobre retención no practicada y sueldo empresarial.
- Accionista (Slice 5): saldo acordado del CCA al 01/08/2026.
- Santander: estado de cuenta TC de mayo 2026 y estado trimestral del crédito 420051383906 (ya en correo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Producción y `ops-worker` corren `ISSUE-169`; las 9 cuentas rematerializadas calzan con sus cartolas.
- [ ] `finance.account_balances.fx_drift` cubre cuentas USD/MXN y reporta 0 en steady.
- [ ] El manual tiene la checklist mensual con fuente por cuenta y la decisión Nubox implementada.
- [ ] Payroll registró las regularizaciones (Humberly 2026-07, retención no practicada, sueldo empresarial
      Julio, Melkin 2026-04) y Finance re-vinculó los expenses correspondientes.
- [ ] OTB del CCA al 01/08/2026 declarada con evidencia y regla documentada.
- [ ] `loan-santander-420051383906` con `original_amount` e `installment_count`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/finance src/lib/reliability/queries`
- `pnpm finance:rematerialize-balances --account <cuenta>` por cuenta + comparación con cartola
- `pnpm qa:gates --changed` y `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `ISSUE-169` queda con nota de rollout verificado en producción

## Follow-ups

- UI de créditos (calendario de cuotas, saldo insoluto) sobre `loan_accounts`.
- Importación automática de cartolas (correo/API) para Santander y Global66.
- GVC del drawer «Archivo del banco» y del detalle de período conciliado (evidencia visual).

## Open Questions

- ¿La retención SII no practicada a Humberly se descuenta en pagos futuros o la asume la empresa (gasto
  rechazado Art. 21 LIR)?
- ¿Sueldo empresarial de Julio Reyes: monto fijo mensual desde qué período?
