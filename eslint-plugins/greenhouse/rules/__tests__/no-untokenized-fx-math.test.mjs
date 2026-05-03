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
  }
]

ruleTester.run('greenhouse/no-untokenized-fx-math', rule, {
  valid: validCases,
  invalid: invalidCases.map(c => ({
    ...c,
    errors: Array.from({ length: c.errors }, () => ({
      message: /anti-patrón TASK-766/u
    }))
  }))
})
