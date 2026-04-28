# Plantilla — External Signal Cohort Remediation

> **Tipo de documento:** Plantilla reusable de runbook
> **Versión:** 1.0
> **Creada:** 2026-04-28 por Julio Reyes (Claude Opus 4.7)
> **Heredera de:** [`TASK-708b-nubox-phantom-remediation.md`](./TASK-708b-nubox-phantom-remediation.md)

## Cuándo usar esta plantilla

Cuando emerja una cohorte histórica de payments contaminados desde un `source_system` distinto a Nubox (Previred, file imports, HubSpot, Stripe, etc.), copia este archivo a `<TASK-ID>-<source>-phantom-remediation.md` y sustituye los placeholders. El framework canónico (`external-cash-signals` + `cohort-backfill` + `historical-remediation`) está diseñado para reusarse — no inventes scripts nuevos cuando lo siguiente alcanza.

## Pre-requisitos arquitectónicos

- TASK-708 cerrada (invariantes activas: CHECKs `payment_account_id NOT NULL after_cutover`, triggers `fn_sync_*_amount_paid` con exclusión `superseded_at`, `external_cash_signals` con UNIQUE idempotente).
- TASK-708b cerrada (patrón canónico: helper `dismissPhantomPayment`, módulo `historical-remediation`, migración VALIDATE idempotente self-checking, cascade supersede atómico).
- Capabilities `finance.cash.adopt-external-signal` y `finance.cash.dismiss-external-signal` deployadas.

## Pasos canónicos (heredados de TASK-708b)

### 0. Identificar la cohorte

Antes de crear scripts, query directa para validar el shape:

```sql
SELECT payment_source, COUNT(*),
       COUNT(*) FILTER (WHERE payment_account_id IS NULL) AS without_account,
       COUNT(*) FILTER (WHERE superseded_at IS NOT NULL) AS already_superseded,
       SUM(amount::numeric) AS total_amount,
       MIN(payment_date) AS earliest, MAX(payment_date) AS latest
FROM greenhouse_finance.income_payments
WHERE payment_source = '<NEW_SOURCE>'
GROUP BY 1;
```

Repetir para `expense_payments` si aplica.

### 1. Extender helpers `cohort-backfill.ts`

Agregar `listCohort<X>Evidence` y `backfillCohort<X>ToSignals` siguiendo el patrón de Cohorte A/B en `src/lib/finance/external-cash-signals/cohort-backfill.ts`. **Reusa `recordSignal`**; no escribas SQL directo a `external_cash_signals`.

Reglas duras:

- `source_system` = nombre del nuevo source (e.g., `'previred'`, `'bank_file'`).
- `source_event_id` = identificador externo determinístico que garantice idempotencia (e.g., `previred-planilla-<id>` para Previred, `bank-file-<batch>-<row>` para file imports).
- Filtros con alias explícito (`ip.payment_account_id IS NULL`, no solo `payment_account_id IS NULL`) para evitar ambigüedad en JOINs.
- Resolver `space_id` desde el documento padre (income/expense → organization → spaces) con fallback al default canónico.

### 2. Reglas D5 seed

Agregar reglas en `account_signal_matching_rules` para el nuevo `source_system` ANTES de correr classify. Sin reglas, todo cae a `dismissed_no_cash`.

```sql
INSERT INTO greenhouse_finance.account_signal_matching_rules (
  rule_id, source_system, space_id, match_predicate_json,
  resolved_account_id, priority, is_active, created_by, rule_provenance, notes
) VALUES (
  'rule-<source>-<pattern>',
  '<source_system>',
  NULL,  -- global, o space_id específico
  '{"payment_method_in":["..."], "currency_eq":"...", ...}'::jsonb,
  '<account_id>',
  100, TRUE, 'system:<task-id>', 'migration_seed',
  '<descripción del patrón observado en la cohorte>'
);
```

### 3. Política D3 (review por defecto)

```sql
INSERT INTO greenhouse_finance.external_signal_auto_adopt_policies (
  policy_id, source_system, space_id, mode, is_active, created_by, notes
) VALUES (
  'policy-<source>-global-review',
  '<source_system>', NULL, 'review', TRUE, 'system:<task-id>',
  'Default conservador: revisión humana hasta validar 50+ adopciones manuales sin falsos positivos.'
);
```

### 4. Scripts CLI per-cohorte

Copiar `scripts/finance/task708b-{inventory,backfill-signals,classify,apply}.ts` y adaptar:

- Filter SQL para el nuevo `payment_source` y prefix.
- Wiring a `backfillCohort<X>ToSignals`.
- Agregar entries en `package.json` para `pnpm finance:task<ID>-<step>`.

### 5. Migración VALIDATE idempotente (Camino E)

Si la nueva cohorte requiere un `VALIDATE CONSTRAINT` final:

```sql
DO $$
DECLARE
  violation_count INT;
  is_validated BOOLEAN;
BEGIN
  SELECT convalidated INTO is_validated
  FROM pg_constraint
  WHERE conname = '<constraint_name>'
    AND conrelid = '<schema>.<table>'::regclass;

  IF is_validated IS TRUE THEN
    RAISE NOTICE '<TASK-ID>: <constraint_name> already validated. No-op.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM <schema>.<table>
  WHERE <invariant_violation_predicate>;

  IF violation_count > 0 THEN
    RAISE NOTICE '<TASK-ID>: skipping VALIDATE — % residual violation(s) remain. Run apply runbook before this constraint can be enforced. Migration is registered as no-op until cleanup is complete.', violation_count;

    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE <schema>.<table> VALIDATE CONSTRAINT <constraint_name>';

  RAISE NOTICE '<TASK-ID>: <constraint_name> validated successfully — base is clean.';
END$$;
```

### 6. Cascade supersede de legs (anticipar)

Cualquier cohorte con factoring/replacement chains va a tener legs cuyos linked payments ya están superseded por chain previa. Anticipa una migración cleanup atómico que:

1. Relax el CHECK relevante para excluir filas superseded (alineado con la convención canónica).
2. UPDATE cascade supersede de legs cuyos linked payments ya están superseded.
3. VALIDATE final atómico.

Patrón en `migrations/20260428151421785_task-708b-cascade-supersede-legs-and-relax-check-for-superseded.sql`.

### 7. Verificación post-apply

Acceptance Criteria queries por cohorte (count == 0):

```sql
SELECT COUNT(*) FROM <table>
WHERE <cohort_filter>
  AND payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_by_otb_id IS NULL
  AND superseded_at IS NULL;
```

`ledger-health.task708.paymentsPendingAccountResolution{Runtime,Historical}` deben converger a 0 para el `payment_source` de la nueva cohorte. Si no, hay residuos.

## Reglas duras heredadas

- **Cero `DELETE` destructivo**: solo UPDATE de supersede chains.
- **Idempotencia natural**: re-correr scripts no duplica, no daña, reporta `alreadyResolved/alreadyDismissed`.
- **Audit firmada**: `actorUserId` obligatorio en cada apply, queda en `resolved_by_user_id` y outbox events.
- **Reusar helpers**: `dismissIncomePhantom`, `dismissExpensePhantom`, `adoptSignalManually`, `evaluateSignalAccount` son agnósticos de `source_system`. Cualquier task puede invocarlos con el `payment_source` correcto.
- **Migración VALIDATE NO bloquea `pnpm migrate:up`**: usar el patrón Camino E (skip silencioso si hay residuos).

## Anti-patrones evitar

- ❌ Inventar nuevos helpers de supersede para cada cohorte. Reusa `dismissPhantomPayment`.
- ❌ Borrar phantom payments. Solo supersede.
- ❌ Migración VALIDATE con `RAISE EXCEPTION` que bloquee `migrate:up`. Usa `RAISE NOTICE + RETURN`.
- ❌ Scripts ad-hoc de cleanup fuera de migración. Usa migración atómica (DROP + CREATE + UPDATE + VALIDATE en una transacción).
- ❌ Asumir que el schema de la nueva tabla espeja `expenses`/`income`. Verifica columnas reales (e.g., `expense_payments` NO tiene `updated_at`).
- ❌ SQL con columnas sin alias en JOINs. Prefijar con `ip.`/`ep.` siempre.

## Referencias canónicas

- TASK-708 spec: `docs/tasks/complete/TASK-708-nubox-documents-only-and-reconciliation-sot-cutover.md` (cuando cierre)
- TASK-708b runbook ejecutado: `docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md`
- Helpers: `src/lib/finance/external-cash-signals/{cohort-backfill,historical-remediation}.ts`
- Helper dismiss: `src/lib/finance/payment-instruments/dismiss-phantom.ts`
- Migración pattern: `migrations/20260428143356496` + `20260428150455638` + `20260428151421785`
