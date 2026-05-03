// TASK-768 Slice 8 — tests RuleTester para greenhouse/no-untokenized-expense-type-for-analytics

import { RuleTester } from 'eslint'

import rule from '../no-untokenized-expense-type-for-analytics.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const validCases = [
  {
    code: '`SELECT SUM(ep.payment_amount_clp) FROM greenhouse_finance.expense_payments_normalized ep WHERE ep.economic_category = $1`',
    name: 'SQL canonico usa economic_category'
  },
  {
    code: '`SELECT economic_category, COUNT(*) FROM greenhouse_finance.expenses GROUP BY economic_category`',
    name: 'GROUP BY economic_category (canonico)'
  },
  {
    code: 'const sql = "SELECT 1"',
    name: 'short string sin SQL relevante'
  },
  {
    code: '`SELECT i.economic_category FROM greenhouse_finance.income i`',
    name: 'income canonico via economic_category'
  }
]

const invalidCases = [
  {
    code:
      '`SELECT SUM(ep.payment_amount_clp) FILTER (WHERE e.expense_type = \'supplier\') AS supplier_clp FROM greenhouse_finance.expense_payments_normalized ep INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id`',
    errors: 1,
    name: 'FILTER WHERE expense_type — anti-patron analitico'
  },
  {
    code:
      '`SELECT * FROM greenhouse_finance.expenses e WHERE e.expense_type IN (\'tax\', \'social_security\')`',
    errors: 1,
    name: 'WHERE expense_type IN (...)'
  },
  {
    code:
      '`SELECT e.expense_type, COUNT(*) FROM greenhouse_finance.expenses e GROUP BY e.expense_type`',
    errors: 1,
    name: 'GROUP BY expense_type'
  },
  {
    code:
      '`SELECT * FROM greenhouse_finance.income i WHERE i.income_type = \'invoice\'`',
    errors: 1,
    name: 'income_type filter'
  },
  {
    code:
      '`SELECT i.income_type, SUM(amount_paid) FROM greenhouse_finance.income i GROUP BY i.income_type`',
    errors: 1,
    name: 'GROUP BY income_type'
  },
  {
    code:
      '`SELECT SUM(ip.payment_amount_clp) FILTER (WHERE i.income_type = \'invoice\') FROM greenhouse_finance.income_payments_normalized ip JOIN greenhouse_finance.income i ON i.income_id = ip.income_id`',
    errors: 1,
    name: 'FILTER WHERE income_type'
  },
  {
    code:
      'const SQL = "SELECT * FROM greenhouse_finance.expenses e WHERE e.expense_type = \'supplier\' GROUP BY id"',
    errors: 1,
    name: 'plain string literal con anti-patron'
  }
]

ruleTester.run('greenhouse/no-untokenized-expense-type-for-analytics', rule, {
  valid: validCases,
  invalid: invalidCases.map((c) => ({
    ...c,
    errors: Array.from({ length: c.errors }, () => ({
      message: /TASK-768/u
    }))
  }))
})
