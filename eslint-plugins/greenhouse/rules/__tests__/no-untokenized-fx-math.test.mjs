// TASK-766 Slice 3 — tests para la lint rule greenhouse/no-untokenized-fx-math.
//
// Confirma que la rule:
//   1. Detecta el anti-patrón canónico ep.amount × exchange_rate_to_clp
//      en sus 4 variantes (expense + income, con/sin COALESCE).
//   2. NO reporta sobre código limpio (helpers canónicos, queries que ya
//      usan amount_clp).
//   3. Detecta también string literals largos con SQL embebido (no solo
//      template literals).
//
// Pattern heredado de los tests de no-untokenized-copy (TASK-265).

import { RuleTester } from 'eslint'

import rule from '../no-untokenized-fx-math.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const validCases = [
  {
    code: '`SELECT SUM(ep.payment_amount_clp) FROM greenhouse_finance.expense_payments_normalized`',
    name: 'canonical VIEW read (no anti-pattern)'
  },
  {
    code: '`SELECT ep.amount, ep.amount_clp FROM greenhouse_finance.expense_payments`',
    name: 'reads amount_clp column directly (TASK-708 canonical)'
  },
  {
    code: '`SELECT SUM(amount_clp) FROM greenhouse_finance.income_payments`',
    name: 'income canonical via amount_clp'
  },
  {
    code: 'const sql = "SELECT 1"',
    name: 'short string literal — not SQL'
  },
  {
    code: '`UPDATE greenhouse_finance.expense_payments SET amount_clp = $1 WHERE payment_id = $2`',
    name: 'mutator setting amount_clp (recordExpensePayment pattern)'
  },
  // ─── TASK-774 valid cases ────────────────────────────────────────────────
  {
    code: '`SELECT SUM(amount) FROM movements WHERE direction = $1`',
    name: 'TASK-774: SUM(amount) over subselect alias (account-balances pattern)'
  },
  {
    code: '`SELECT COALESCE(sl.amount_clp, CASE WHEN sl.currency = ${l_clp} THEN sl.amount END) AS amount FROM greenhouse_finance.settlement_legs sl`',
    name: 'TASK-774: settlement_legs COALESCE inline (account-balances canonical)'
  },
  {
    code: '`SELECT epn.payment_amount_clp FROM greenhouse_finance.expense_payments_normalized epn`',
    name: 'TASK-774: read VIEW canonical with epn alias'
  }
]

const invalidCases = [
  {
    code:
      '`SELECT SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1)) FROM greenhouse_finance.expense_payments ep JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id`',
    errors: 1,
    name: 'expense_payments × COALESCE(rate) — incident HubSpot CCA shape'
  },
  {
    code:
      '`SELECT ep.amount * exchange_rate_to_clp AS calc FROM greenhouse_finance.expense_payments ep`',
    errors: 1,
    name: 'expense_payments × rate sin COALESCE'
  },
  {
    code:
      '`SELECT SUM(ip.amount * COALESCE(i.exchange_rate_to_clp, 1)) FROM greenhouse_finance.income_payments ip JOIN greenhouse_finance.income i ON i.income_id = ip.income_id`',
    errors: 1,
    name: 'income_payments × COALESCE(rate)'
  },
  {
    code: '`SELECT ip.amount * exchange_rate_to_clp FROM greenhouse_finance.income_payments ip`',
    errors: 1,
    name: 'income_payments × rate sin COALESCE'
  },
  {
    code:
      'const SQL = "SELECT SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1)) FROM greenhouse_finance.expense_payments ep JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id"',
    errors: 1,
    name: 'plain string literal (>30 chars) con anti-pattern'
  },
  // ─── TASK-774 invalid cases ──────────────────────────────────────────────
  {
    code: '`SELECT SUM(ep.amount) FROM greenhouse_finance.expense_payments ep WHERE payment_account_id = $1`',
    errors: 1,
    name: 'TASK-774: SUM(ep.amount) directo sin VIEW canonical'
  },
  {
    code: '`SELECT SUM(ip.amount) FROM greenhouse_finance.income_payments ip WHERE payment_account_id = $1`',
    errors: 1,
    name: 'TASK-774: SUM(ip.amount) directo sin VIEW canonical'
  },
  {
    code: '`SELECT SUM(sl.amount) FROM greenhouse_finance.settlement_legs sl WHERE instrument_id = $1`',
    errors: 1,
    name: 'TASK-774: SUM(sl.amount) sin COALESCE amount_clp'
  }
]

ruleTester.run('greenhouse/no-untokenized-fx-math', rule, {
  valid: validCases,
  invalid: invalidCases.map(c => ({
    ...c,
    errors: Array.from({ length: c.errors }, () => ({
      message: /anti-patr/u
    }))
  }))
})
