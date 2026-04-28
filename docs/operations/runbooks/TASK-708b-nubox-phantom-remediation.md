# Runbook — TASK-708b Nubox Phantom Cohort Remediation

> **Tipo de documento:** Runbook operativo
> **Versión:** 1.0
> **Creado:** 2026-04-28 por Julio Reyes (Claude Opus 4.7)
> **Spec técnica:** [`docs/tasks/to-do/TASK-708b-nubox-phantom-cohort-remediation.md`](../../tasks/to-do/TASK-708b-nubox-phantom-cohort-remediation.md)
> **Predecesor:** TASK-708 (cutover Nubox documents-only — completado 2026-04-28)

## Propósito

Remediar deuda histórica de payments contaminados por Nubox-as-cash-SoT, en cohortes con datos validados:

- **Cohorte A** — 23 income_payments con `payment_source='nubox_bank_sync'` y `payment_account_id IS NULL` (1 ya reconciliada)
- **Cohorte B** — 65 expense_payments con prefix `exp-pay-backfill-EXP-NB-*` y `payment_account_id IS NULL`
- **Cohorte C** — 4 settlement_legs con `instrument_id IS NULL` (3 receipt + 1 funding; transversales a A)

La remediación NO destruye audit. Cada phantom queda con `superseded_at NOT NULL` o se "repara" UPDATE in-place poblando `payment_account_id` desde la cartola que lo reconcilia.

---

## Pre-flight checklist

Verificar antes de empezar:

- [ ] TASK-708 mergeada a `develop` (invariantes activas: CHECKs + triggers).
- [ ] Cloud SQL Proxy corriendo en `127.0.0.1:15432` (acceso a `greenhouse-pg-dev`).
- [ ] Capability `finance.cash.adopt-external-signal` y `finance.cash.dismiss-external-signal` deployadas.
- [ ] Operador con email `agent@greenhouse.efeonce.org` o user_id efeonce_admin para audit trail.
- [ ] `pnpm pg:doctor` retorna `healthy: true`.
- [ ] Branch `task/TASK-708b-nubox-phantom-cohort-remediation` checked out.

```bash
pnpm pg:doctor
git checkout task/TASK-708b-nubox-phantom-cohort-remediation
```

---

## Paso 0 — Migración 1 (extender triggers para excluir `superseded_at`)

**Pre-requisito de los siguientes pasos.** Sin esto, los triggers `fn_sync_expense_amount_paid` y `fn_recompute_income_amount_paid` solo excluyen filas con `superseded_by_payment_id` / `superseded_by_otb_id`. El outcome `dismissed_no_cash` (sin replacement) NO sería excluido del SUM.

```bash
pnpm migrate:up
```

Verifica que la migración `20260428143356496_task-708b-extend-amount-paid-triggers-include-superseded-at` aplicó.

**Importante**: NO corras la migración 2 (`20260428143357179_task-708b-validate-settlement-legs-principal-requires-instrument`) aún. Esa va al final, después del apply. La migración 1 sí.

---

## Paso 1 — Inventario reproducible

Captura snapshot de las cohortes ANTES de cualquier mutación. Esto se preserva como evidencia de Acceptance Criteria.

```bash
pnpm finance:task708b-inventory --out docs/operations/runbooks/TASK-708b-evidence-pre-apply-$(date +%Y%m%d).json
```

Output esperado:

```text
[t708b:inventory] evidence written to /Users/.../TASK-708b-evidence-pre-apply-20260428.json
[t708b:inventory] cohort A=23 (32.183.823 CLP), B=65 (8.835.024 CLP), C=4
```

Los counts deben coincidir con las cifras de la spec. Si difieren, detén el runbook e investiga la discrepancia antes de continuar.

---

## Paso 2 — Backfill retroactivo a `external_cash_signals`

Crea las 23 + 65 = 88 signals retroactivas en `external_cash_signals`. Las cohortes ahora aparecen en la cola admin `/finance/external-signals` junto con las señales runtime.

### Dry-run (default)

```bash
pnpm finance:task708b-backfill-signals
```

Salida esperada:

```text
[t708b:backfill] mode=DRY-RUN cohort=ALL
[t708b:backfill:A] inspected=23 created=0 alreadyExisted=0 errors=0
[t708b:backfill:B] inspected=65 created=0 alreadyExisted=0 errors=0
[t708b:backfill] DRY-RUN: no changes were applied. Re-run with --apply to materialize.
```

### Apply

```bash
pnpm finance:task708b-backfill-signals --apply
```

Salida esperada:

```text
[t708b:backfill:A] inspected=23 created=23 alreadyExisted=0 errors=0
[t708b:backfill:B] inspected=65 created=65 alreadyExisted=0 errors=0
```

**Idempotencia**: si re-corres `--apply`, debe reportar `alreadyExisted=23`/`alreadyExisted=65` y `created=0`.

Verifica vía la cola admin `/finance/external-signals?status=unresolved` que aparezcan 88 signals nuevas.

---

## Paso 3 — Clasificación automática

Para cada signal, propone outcome (`repaired_with_account` / `superseded_replaced` / `dismissed_no_cash`) basado en evidencia:

1. ¿Existe `bank_statement_row` reconciliada que apunte al phantom payment? → `repaired_with_account` con `account_id` del period.
2. ¿D5 rules (TASK-708 seed: `nubox CLP+bank_transfer→santander-clp`) emiten `resolved` con cuenta única? → `repaired_with_account`.
3. Sino → `dismissed_no_cash` (default conservador).

```bash
pnpm finance:task708b-classify --out docs/operations/runbooks/TASK-708b-classification-$(date +%Y%m%d).json
```

Salida esperada:

```text
[t708b:classify] inspecting 88 signals...
[t708b:classify] report written to ...
[t708b:classify] outcomes: { repaired_with_account: ~25, superseded_replaced: 0, dismissed_no_cash: ~63 }
```

### Revisión humana firmada

Abre el JSON de classification y revisa cada propuesta. Casos especiales a verificar:

- **PAY-NUBOX-inc-3699924** ($6.9M CLP, 2026-03-06): debería estar como `repaired_with_account` con `resolvedAccountId='santander-clp'` y `evidence.matchedBankStatementRowId='santander-clp_2026_03_3bf2f840e20a'`. La cartola ya existe en `bank_statement_rows`.
- **Cohorte B (65 expenses)**: la mayoría debería ser `dismissed_no_cash` (backfill optimista sin evidencia bancaria).
- Cualquier propuesta que parezca incorrecta → editar manualmente el JSON antes del apply, o documentar override en este runbook.

Firma del operador (anota acá):

```text
Reviewed by: [nombre operador]
Date: [YYYY-MM-DD]
Edits made to classification JSON: [ninguna | descripción]
```

---

## Paso 4 — Apply por chunks

### Dry-run primero

```bash
pnpm finance:task708b-apply \
  --report docs/operations/runbooks/TASK-708b-classification-YYYYMMDD.json \
  --actor jreysgo@gmail.com
```

Verifica el output: cada signal aparece con su outcome propuesto y `account=`. No se aplica nada.

### Apply real

Aplica en chunks de 10 (default). Cada chunk es transaccional; un error en una row no aborta el resto.

```bash
pnpm finance:task708b-apply \
  --report docs/operations/runbooks/TASK-708b-classification-YYYYMMDD.json \
  --actor jreysgo@gmail.com \
  --apply \
  --chunk-size 10
```

Filtros opcionales para procesar cohortes por separado:

```bash
# Solo Cohorte A (income)
pnpm finance:task708b-apply --report ... --actor ... --apply --filter-cohort A

# Solo Cohorte B (expense)
pnpm finance:task708b-apply --report ... --actor ... --apply --filter-cohort B
```

Salida esperada al cierre:

```text
[t708b:apply] summary: { applied: ~88, alreadyResolved: 0, errors: 0, byOutcome: { ... } }
[t708b:apply] Cohorte C residual after apply: { remainingReceiptLegsWithoutInstrument: 0, remainingPayoutLegsWithoutInstrument: 0 }
[t708b:apply] Cohorte C clean. La migracion task-708b-validate-settlement-legs-principal-requires-instrument puede correr.
```

Si quedan legs residuales (`remainingReceiptLegsWithoutInstrument > 0`), inspecciona y resuelve manualmente antes de continuar:

```sql
-- Identificar legs residuales
SELECT settlement_leg_id, leg_type, linked_payment_type, linked_payment_id, amount, currency
FROM greenhouse_finance.settlement_legs
WHERE leg_type IN ('receipt', 'payout')
  AND instrument_id IS NULL
  AND superseded_at IS NULL;
```

---

## Paso 5 — Migración 2 (VALIDATE final)

Solo cuando Cohorte C esté limpia. Esta migración tiene un guard `DO $$ ... RAISE EXCEPTION` que falla si hay residuos — esa falla es intencional.

```bash
pnpm migrate:up
```

Aplica `20260428143357179_task-708b-validate-settlement-legs-principal-requires-instrument`. El CHECK pasa de `NOT VALID` a enforced para todo dml retroactivo + futuro.

---

## Paso 6 — Verificación de Acceptance Criteria

Corre las queries canónicas de la spec contra producción:

```sql
-- Acceptance #1: cohort A runtime cleanup
SELECT COUNT(*) FROM greenhouse_finance.income_payments
WHERE payment_source = 'nubox_bank_sync'
  AND payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_at IS NULL;
-- Expected: 0

-- Acceptance #2: cohort B backfill cleanup
SELECT COUNT(*) FROM greenhouse_finance.expense_payments
WHERE payment_source = 'manual'
  AND payment_id LIKE 'exp-pay-backfill-EXP-NB-%'
  AND payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_at IS NULL;
-- Expected: 0

-- Acceptance #3: cohort C principal legs without instrument
SELECT COUNT(*) FROM greenhouse_finance.settlement_legs
WHERE leg_type IN ('receipt','payout')
  AND instrument_id IS NULL
  AND superseded_at IS NULL;
-- Expected: 0
```

### ledger-health metric

```bash
pnpm staging:request /api/admin/finance/ledger-health
```

Verifica que `task708.paymentsPendingAccountResolutionHistorical === 0` y que `task708.settlementLegsPrincipalWithoutInstrument === 0`. El `healthy` flag debe ser `true`.

### Reliability Control Plane

`/api/admin/operations` → subsystem `Finance Data Quality`. Las 4 platform integrity metrics TASK-708 deben estar en `status='ok'` con `value=0`.

---

## Rollback

### Si el apply tuvo errores parciales

Las mutaciones son idempotentes — re-correr `task708b-apply` con el mismo report skipea filas ya resueltas y procesa solo las que quedaron.

### Si necesitas revertir un dismissal específico

```sql
-- Reactivar un income_payment phantom dismiss-only (RARO; requiere justificación)
UPDATE greenhouse_finance.income_payments
SET superseded_at = NULL, superseded_reason = NULL
WHERE payment_id = 'PAY-NUBOX-inc-...';

-- Re-recomputar amount_paid del income afectado
SELECT greenhouse_finance.fn_recompute_income_amount_paid('INC-NB-...');
```

### Si la migración 2 (VALIDATE) falla

La migración tiene un guard que reporta el count residual con `RAISE EXCEPTION`. Identificar la(s) fila(s) residual(es) con la query del Paso 4 y resolver manualmente antes de re-correr la migración.

### Si la migración 1 necesita rollback

```bash
pnpm migrate:down
```

Revierte los triggers a su shape post-TASK-708 (sin `superseded_at IS NULL` en la cláusula). Esto puede reintroducir drift en `expense.amount_paid` / `income.amount_paid` para filas dismissed; re-correr el helper de recompute manualmente:

```sql
SELECT greenhouse_finance.fn_recompute_income_amount_paid(income_id) FROM greenhouse_finance.income;
SELECT (SELECT greenhouse_finance.fn_recompute_income_amount_paid(income_id) FROM greenhouse_finance.income LIMIT 1);
```

---

## Caso especial — PAY-NUBOX-inc-3699924 ($6,902,000 CLP)

Este phantom income_payment estaba reconciliado contra `bank_statement_row` `santander-clp_2026_03_3bf2f840e20a` (period account `santander-clp`). La cartola ya existe en el sistema; **no se requiere cartola adicional del cliente o banco**.

Al correr `task708b-classify`, este signal recibe automáticamente outcome `repaired_with_account` con `resolvedAccountId='santander-clp'` y `evidence.matchedBankStatementRowId='santander-clp_2026_03_3bf2f840e20a'`. El apply UPDATE in-place puebla `payment_account_id='santander-clp'` en `income_payments` y `instrument_id='santander-clp'` en la `settlement_leg` asociada. El `bank_statement_row` queda apuntando a la leg ya repared.

Si por alguna razón el classify NO lo detecta (e.g., evolución del schema o cambio de id de bank statement row), corre la query manual:

```sql
SELECT bsr.row_id, rp.account_id, sl.settlement_leg_id, sl.linked_payment_id
FROM greenhouse_finance.bank_statement_rows bsr
JOIN greenhouse_finance.reconciliation_periods rp ON rp.period_id = bsr.period_id
JOIN greenhouse_finance.settlement_legs sl ON sl.settlement_leg_id = bsr.matched_settlement_leg_id
WHERE sl.linked_payment_id = 'PAY-NUBOX-inc-3699924';
```

Si retorna `account_id='santander-clp'`, edita el classification JSON manualmente para forzar `outcome='repaired_with_account'` con `resolvedAccountId='santander-clp'` antes del apply.

---

## Cierre

Tras completar todos los pasos:

- [ ] `pnpm test` verde (incluye 30 tests del módulo external-cash-signals).
- [ ] `pnpm pg:doctor` retorna `healthy: true`.
- [ ] Las 3 queries de Acceptance retornan 0.
- [ ] `ledger-health.task708.paymentsPendingAccountResolutionHistorical === 0`.
- [ ] Reliability Control Plane `Finance Data Quality` rollup `healthy`.
- [ ] Migración VALIDATE aplicada exitosamente.
- [ ] Mover `docs/tasks/to-do/TASK-708b-...md` → `docs/tasks/complete/TASK-708b-...md`.
- [ ] Actualizar `docs/tasks/README.md` y `TASK_ID_REGISTRY.md`.
- [ ] Actualizar `Handoff.md` y `changelog.md` con resultado y lecciones aprendidas.
- [ ] Commit todo lo anterior y mergear a `develop`.

---

## Lecciones aprendidas (post-apply)

> Sección a completar al cierre. Incluir: tiempos reales por paso, decisiones manuales tomadas, ediciones al classification JSON, casos edge encontrados, sugerencias para futuras cohortes (Previred, file imports, HubSpot, Stripe).

---

## Generalización a futuras cohortes

Cuando emerjan cohortes históricas de otros `source_system`, el patrón canónico es:

1. Inventario reproducible (`task708b-inventory.ts` → adapta para nueva fuente).
2. Backfill a `external_cash_signals` con `source_system='<nuevo>'`.
3. Classify usando D5 rules (agregar reglas seed antes de empezar).
4. Apply con misma estrategia (UPDATE in-place para `repaired_with_account`, `dismissPhantomPayment` para `dismissed_no_cash`).
5. VALIDATE final si hay invariantes pendientes.

Los helpers `cohort-backfill.ts` y `historical-remediation.ts` están diseñados para reusarse — agregar nuevas funciones `listCohortXEvidence` / `backfillCohortXToSignals` cuando aparezca la cohorte real.
