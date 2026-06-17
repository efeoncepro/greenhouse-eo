---
paths:
  - "src/lib/finance/**"
---

# Finance ledger/bank/CLP/FX — invariantes (auto-load por path)

Antes de tocar finanzas, **invocá la skill MANDATORIA `greenhouse-finance-accounting-operator`** y cargá **`docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` → §"Invariantes operativos para agentes — Finance"**.

Reglas duras: **NUNCA** computar drift de settlement como `amount_paid - SUM(income_payments)` solo (usar la VIEW/helper canónico); **NUNCA** `SUM(ep.amount * exchange_rate_to_clp)` ni leer `expense_payments`/`income_payments` directo para KPIs CLP (lint `greenhouse/no-untokenized-fx-math`; usar las VIEWs `*_normalized`); **NUNCA** MERGE/UPDATE/INSERT BigQuery dentro de un route handler (projection reactiva via outbox).
