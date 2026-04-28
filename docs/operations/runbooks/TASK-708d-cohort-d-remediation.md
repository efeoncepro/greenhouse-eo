# Runbook — TASK-708d Cohort D Remediation

> **Tipo de documento:** Runbook operativo
> **Version:** 1.0
> **Creado:** 2026-04-28 por Claude Opus 4.7 + Codex
> **Spec:** [`docs/tasks/to-do/TASK-708d-post-cutover-phantom-cohort-detector.md`](../../tasks/to-do/TASK-708d-post-cutover-phantom-cohort-detector.md)
> **Predecesores:** TASK-708 (Nubox documents-only cutover), TASK-708b (cohorts A/B/C historical remediation)

## Proposito

Cuando el detector Cohorte D dispara `postCutoverPhantomsWithoutBankEvidence > 0`, este runbook guia la clasificacion + remediacion sin destruir audit.

Cohorte D = payment post-cutover (created_at >= 2026-04-28 12:38:18 UTC) cuya cuenta fue inferida por D5 rule (`resolution_method='auto_exact_match'`) **pero** no aparece como cash en `bank_statement_rows`. El caso guia es `PAY-NUBOX-inc-3968936` (Gobierno Regional RM, INC-NB-26004360 — Nubox marco la factura como pagada, D5 atribuyo a santander-clp, pero la cartola del 13/14 abril no muestra +$752,730).

Cuenta inferida ≠ cash probado. Sin esta guardia, un phantom puede engordar saldo y conciliacion sin evidencia bancaria real.

---

## Pre-flight

- [ ] `pnpm pg:doctor` retorna `healthy: true`.
- [ ] Cloud SQL Proxy en `127.0.0.1:15432`.
- [ ] Dashboard `/api/admin/finance/ledger-health` muestra `task708d.postCutoverPhantomsWithoutBankEvidence > 0`.
- [ ] Operador con email `agent@greenhouse.efeonce.org` o user_id `efeonce_admin`.

---

## Paso 1 — Inventario

```bash
node -e "
require('dotenv').config({path:'.env.local'});
const pg = require('pg');
const c = new pg.Client({
  host: process.env.GREENHOUSE_POSTGRES_HOST,
  port: Number(process.env.GREENHOUSE_POSTGRES_PORT),
  user: process.env.GREENHOUSE_POSTGRES_USER,
  password: process.env.GREENHOUSE_POSTGRES_PASSWORD,
  database: process.env.GREENHOUSE_POSTGRES_DATABASE,
  ssl: false
});
c.connect()
  .then(async () => {
    const r = await c.query(\`
      SELECT 'income' AS kind, s.signal_id, s.document_id, ip.payment_id, ip.payment_account_id, ip.payment_date, ip.amount
      FROM greenhouse_finance.external_cash_signals s
      JOIN greenhouse_finance.income_payments ip ON ip.payment_id = s.promoted_payment_id
      WHERE s.promoted_payment_kind = 'income_payment'
        AND s.resolution_method = 'auto_exact_match'
        AND s.account_resolution_status = 'adopted'
        AND s.superseded_at IS NULL
        AND ip.superseded_at IS NULL AND ip.superseded_by_payment_id IS NULL AND ip.superseded_by_otb_id IS NULL
        AND ip.created_at >= TIMESTAMPTZ '2026-04-28 12:38:18.834+00'
        AND NOT EXISTS (SELECT 1 FROM greenhouse_finance.bank_statement_rows bsr
                        WHERE bsr.matched_payment_id = ip.payment_id
                          AND bsr.match_status IN ('manual_matched','auto_matched'))
      ORDER BY ip.payment_date DESC
    \`);
    for (const row of r.rows) console.log(JSON.stringify(row));
    return c.end();
  });
"
```

Salva el output como `docs/operations/runbooks/TASK-708d-evidence-pre-apply-YYYYMMDD.json`.

---

## Paso 2 — Clasificacion por payment

Para cada payment del inventario decide:

### A) Existe cartola pero no fue importada/matcheada

- Importar la cartola del periodo correspondiente en `/finance/reconciliation`.
- Hacer manual match contra el payment.
- Verificar que el detector cae a 0.

### B) Existe la cartola y muestra el cash, pero el match fue contra otro payment

- Adjudicar manualmente: re-asignar `bank_statement_rows.matched_payment_id` al payment correcto.
- Si el otro payment quedo sin evidencia, evaluar como Cohorte D nuevamente.

### C) NO existe cash en cartola (Nubox marco "paid" sin transferencia real)

Es el caso `PAY-NUBOX-inc-3968936`. Aqui aplica `dismissIncomePhantom` o `dismissExpensePhantom`:

```ts
import { dismissIncomePhantom } from '@/lib/finance/payment-instruments/dismiss-phantom'

await dismissIncomePhantom({
  phantomPaymentId: 'PAY-NUBOX-inc-XXXX',
  reason: 'TASK-708d: Nubox marco la factura como pagada pero cartola SantanderXX entre <fecha> y <fecha+5d> NO muestra inflow de $X. Phantom dismissed sin replacement.',
  actorUserId: 'agent@greenhouse.efeonce.org'
})
```

El helper canonico (TASK-708b + cascade de TASK-715/santander-clp followups):

- Setea `superseded_at` en el payment.
- Cascade-supersede los `settlement_legs.linked_payment_id`.
- Llama `fn_recompute_income_amount_paid` (income volvera a `payment_status='pending'`).
- Emite outbox `finance.income.payment_dismissed_historical` con `cascadedSettlementLegIds`.

### D) Caso ambiguo

- Crear ticket interno con la evidencia que tengas.
- Mantener fuera del fix automatico hasta confirmar con contabilidad.

---

## Paso 3 — Rematerializacion

Solo necesaria si Cohorte C o B reclasificaron cash. Para C (dismiss):

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/rematerialize-account.ts <accountId>
```

El materializer respeta el 3-axis filter (TASK-715/santander-clp followups) asi que el phantom dismissed deja de contarse automaticamente.

---

## Paso 4 — Verificacion

```bash
curl -sS http://localhost:3000/api/admin/finance/ledger-health | jq .task708d
```

Esperado:

```json
{
  "postCutoverPhantomsWithoutBankEvidence": 0,
  "samplePhantoms": []
}
```

Tambien valida `healthy: true` global.

---

## Paso 5 — Cierre

- [ ] Inventario pre-apply guardado como evidencia.
- [ ] Para cada payment dismissado: outbox event + cascadedSettlementLegIds visibles.
- [ ] Saldo del bank account afectado revisado tras rematerializacion.
- [ ] `Handoff.md` actualizado con la batch ejecutada.
- [ ] Si la cohorte se hace recurrente: considerar UI admin (TASK-708d follow-up).

---

## Falsos positivos esperados

- Payment muy reciente cuya cartola aun no fue importada → no es bug, esperar la cartola y matchear.
- Payment de cuenta interna (CCA/wallet) que no transita por `bank_statement_rows` → revisar si la deteccion debe filtrarlo. Hoy el detector solo flagea payments con `payment_account_id` apuntando a cuentas bancarias externas; ajustar SQL si emerge un caso interno legitimo.

## Reglas duras

- **NUNCA** ejecutar `DELETE` sobre `income_payments`, `expense_payments` o `settlement_legs` para "limpiar" Cohorte D. Usar siempre los helpers `dismissIncomePhantom` / `dismissExpensePhantom`.
- **NUNCA** modificar `external_cash_signals.resolution_method` para "ocultar" un caso. La regla D5 es estructural; cambiar el method invalida audit.
- **SIEMPRE** documentar en `superseded_reason` la cartola consultada y por que no aparece el cash.
