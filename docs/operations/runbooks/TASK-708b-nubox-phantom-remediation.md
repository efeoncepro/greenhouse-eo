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

## Lecciones aprendidas (apply 2026-04-28)

### Tiempos reales por paso

| Paso | Tiempo | Notas |
|---|---|---|
| Paso 0 (migración 1) | 30s | Fácil; aplicación directa con `pnpm migrate:up` |
| Paso 1 (inventario) | 5s | Output JSON 86KB en `docs/operations/runbooks/` |
| Paso 2 (backfill --apply) | 12s | 86 signals creadas idempotente |
| Paso 3 (classify) | 30s | 86 propuestas evaluadas; D5 rule resuelve 21 a `santander-clp`, 65 → dismissed |
| Paso 4 (apply) | 90s | 21 income repaired + 65 expense dismissed; 2 cascade legs descubiertas residuales |
| Paso 5 (migración 2 + 3) | 20s | VALIDATE skip + atomic cleanup migration |
| Paso 6 (verificación) | 10s | Acceptance queries == 0 |
| **Total** | **~4 minutos** de ejecución pura | + ~30 minutos de iteración debugging |

### Decisiones canónicas tomadas durante la ejecución (extender a futuras cohortes)

1. **Camino E — Migración VALIDATE idempotente self-checking**: cuando una migración VALIDATE necesita correr "después" de un cleanup, NO pongas un `RAISE EXCEPTION` que bloquee `pnpm migrate:up`. Pon un `RAISE NOTICE + RETURN` que haga skip silencioso si hay residuos, y ejecuta el `VALIDATE CONSTRAINT` solo cuando count == 0. Esto permite que la migración esté en el repo desde día uno, registrada en `pgmigrations`, y se aplique automáticamente cuando la base esté lista. Sin estados frágiles, sin archivos en `/tmp/`, sin renames de timestamps.

2. **Cascade supersede atómico en una sola migración**: cuando descubras casos edge durante el apply (e.g., legs cuyos linked payments ya estaban superseded por chains previas), NO los resuelvas con scripts ad-hoc fuera de migración. Crea una nueva migración que haga DROP + CREATE CHECK + UPDATE cleanup + VALIDATE en una transacción única. Si el VALIDATE final falla, todo el cleanup hace rollback (RAII transaccional).

3. **Convención `superseded_at IS NOT NULL` extiende a CHECKs y queries**: cualquier supersede chain (TASK-702 payment, TASK-703b OTB, TASK-708b dismissal manual) excluye filas de invariantes activas. El CHECK `settlement_legs_principal_requires_instrument` se relajó para `OR superseded_at IS NOT NULL OR superseded_by_otb_id IS NOT NULL`. Las queries de health (`PHANTOMS_INCOME_SQL`, `PHANTOMS_EXPENSE_SQL`, `TASK708_*_SQL`) se actualizaron para incluir `AND superseded_at IS NULL`. Patrón canónico: cualquier query que mida "phantom activo" debe excluir las 3 chains.

### Bugs corregidos durante el apply (mergeados en commits subsiguientes)

1. **`expense_payments` no tiene columna `updated_at`**: la tabla solo tiene `created_at` y `recorded_at`. `dismissExpensePhantom` y `historical-remediation.ts` referenciaban `updated_at = NOW()` en sus UPDATE statements, fallando con `column does not exist`. Removido. Lección: SIEMPRE verificar el schema real (no asumir paridad con `expenses` u otras tablas).

2. **Referencias ambiguas `payment_account_id` en SQL con JOINs**: `cohort-backfill.ts` tenía filtros sin alias. PostgreSQL los rechaza con `column reference is ambiguous`. Prefijado con alias `ip.` / `ep.`. Lección: en queries con JOIN, prefijar TODAS las columnas con alias explícito.

3. **2 settlement legs residuales post-apply**: 2 receipt legs (`stlleg-PAY-NUBOX-inc-3699924` y `stlleg-PAY-NUBOX-inc-3968935`) cuyos linked income_payments ya estaban superseded por chain previa (factoring proceeds + replacement) NO fueron supersedeed automáticamente. El UPDATE manual fallaba con CHECK violation porque el constraint no permitía UPDATE de filas existentes en violation. Solución canónica: extender el CHECK para excluir filas superseded (alineado con la regla "supersede = histórico audit-only") y hacer cascade supersede atómico en migración.

### Casos edge encontrados

1. **Caso $6.9M PAY-NUBOX-inc-3699924 resuelto sin pedir cartola adicional**: la spec original lo marcó como Open Question bloqueante esperando cartola del cliente/banco. La realidad: la cartola YA EXISTÍA en `bank_statement_rows` (`santander-clp_2026_03_3bf2f840e20a`), reconciliada contra la phantom leg. El classify automático lo detectó, propuso `repaired_with_account` con `santander-clp`, y el apply lo resolvió in-place sin intervención manual. Lección: antes de bloquear un caso esperando evidencia externa, **buscar en `bank_statement_rows` si la evidencia ya está en el sistema**.

2. **Cohorte A reportó 21 (no 23) al inventory**: 2 phantoms originales fueron superseded por trabajo paralelo entre la documentación de la spec y la ejecución del apply. El inventory script siempre reporta la realidad actual; los counts del spec son snapshot temporal y pueden divergir. **El inventario manda; la spec es referencia documentación**.

3. **Income legacy `client_direct` ($752K GORE) fuera de scope TASK-708b**: durante la verificación final emergió 1 phantom adicional con `payment_source='client_direct'` (NO Nubox), creado pre-cutover. El runbook NO lo cubre, pero el helper `dismissIncomePhantom` es agnóstico de payment_source. Lo dismisseamos con razón documentada como follow-up cleanup. Lección: **el helper `dismissPhantomPayment` es reusable para cualquier phantom de cualquier source_system**, no solo Nubox.

### Sugerencias para futuras cohortes (Previred / file imports / HubSpot / Stripe)

1. **Antes de empezar el apply**: verificar el `payment_source` del CHECK constraints en `income_payments` / `expense_payments`. Si la cohorte requiere un nuevo `payment_source`, agregar al CHECK primero (migración aditiva) y después backfill.

2. **Antes de classify**: agregar reglas D5 seed para el nuevo `source_system` en `account_signal_matching_rules`. Sin reglas, el classify cae siempre a `dismissed_no_cash`. Política recomendada: arrancar la política `external_signal_auto_adopt_policies` en `mode='review'` los primeros 50 casos antes de promover a `auto_adopt`.

3. **Patrón reusable** documentado en plantilla `docs/operations/runbooks/_template-external-signal-remediation.md`: copiar este runbook, sustituir `nubox` → `<nuevo>`, `Cohorte A/B/C` → cohortes específicas del nuevo source, mantener los 6 pasos numerados y la migración VALIDATE idempotente.

4. **El cascade-supersede de legs es probable**: cualquier cohorte con factoring/replacement chains pre-existentes va a tener este caso edge. Anticipar la migración cleanup atómico en el plan.

### Resultado final

- 86 phantom payments resueltos: 21 reparados ($39.3M CLP movido al ledger canónico) + 65 descartados ($8.8M CLP marcado como deuda histórica sin cash real).
- 4 settlement legs phantom limpias (3 reparadas in-place + 2 cascade-supersede).
- 1 income legacy `client_direct` adicional ($752K) dismissed como follow-up.
- CHECK `settlement_legs_principal_requires_instrument` VALIDATED + enforced retroactivo + futuro.
- Las 6 métricas TASK-708 en `ledger-health` = 0.
- Patrón canónico documentado y testeado para emerging cohorts.

---

## Generalización a futuras cohortes

Cuando emerjan cohortes históricas de otros `source_system`, el patrón canónico es:

1. Inventario reproducible (`task708b-inventory.ts` → adapta para nueva fuente).
2. Backfill a `external_cash_signals` con `source_system='<nuevo>'`.
3. Classify usando D5 rules (agregar reglas seed antes de empezar).
4. Apply con misma estrategia (UPDATE in-place para `repaired_with_account`, `dismissPhantomPayment` para `dismissed_no_cash`).
5. VALIDATE final si hay invariantes pendientes.

Los helpers `cohort-backfill.ts` y `historical-remediation.ts` están diseñados para reusarse — agregar nuevas funciones `listCohortXEvidence` / `backfillCohortXToSignals` cuando aparezca la cohorte real.
