// TASK-893 hotfix #3 (2026-05-16) — tests anti-regresión para
// greenhouse/no-extract-epoch-from-date-subtraction.
//
// Confirma que la rule:
//   1. Detecta los 7 patterns peligrosos (CURRENT_DATE, ::date cast, *_date
//      column, MAX/MIN(*_date), effective_from - start_date).
//   2. NO reporta sobre patterns seguros (NOW() - timestamptz, ::timestamptz
//      cast, EXTRACT(DAY FROM ...) sin EPOCH).
//   3. NO reporta sobre prose o strings cortos no-SQL.

import { RuleTester } from 'eslint'

import rule from '../no-extract-epoch-from-date-subtraction.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const validCases = [
  {
    code: '`SELECT EXTRACT(EPOCH FROM (NOW() - finished_at)) AS seconds FROM source_sync_runs`',
    name: 'NOW() - timestamptz column (interval result)'
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (a.created_at - a.updated_at)) FROM assets`',
    name: 'timestamptz - timestamptz subtraction'
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM ((x)::timestamptz - (y)::timestamptz)) AS seconds`',
    name: 'explicit cast to timestamptz both sides (canonical fix #3)'
  },
  {
    code: '`SELECT (CURRENT_DATE - MAX(balance_date))::int AS days_stale FROM account_balances`',
    name: 'canonical fix #1 — direct integer subtraction without EXTRACT (recommended pattern)'
  },
  {
    code: '`SELECT EXTRACT(DAY FROM (NOW() - finished_at)) FROM source_sync_runs`',
    name: 'EXTRACT(DAY FROM ...) without EPOCH (no bug class)'
  },
  {
    code: '`SELECT * FROM members WHERE active = TRUE`',
    name: 'simple query without EXTRACT'
  },
  {
    code: '"EXTRACT(EPOCH FROM ...) prose"',
    name: 'short string (prose) is not analyzed (< 40 chars)'
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM s.lifecycle_stage_since) FROM party_lifecycle_snapshots`',
    name: 'EXTRACT EPOCH from a single timestamptz column (not subtraction)'
  }
]

const invalidCases = [
  {
    code: '`SELECT EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(ab.balance_date)))::int / 86400 FROM account_balances ab`',
    name: 'CURRENT_DATE - MAX(date) — exact bug class ledger-health.ts:161',
    errors: 1
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (MAX(ab.balance_date) - CURRENT_DATE))::int FROM account_balances ab`',
    name: 'mirror — MAX(date) - CURRENT_DATE',
    errors: 1
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (lc.effective_from - lo.start_date)) / 86400 FROM latest_comp lc JOIN latest_onboarding lo ON lo.member_id = lc.member_id`',
    name: 'effective_from - start_date — exact bug class TASK-893 source-date-disagreement.ts:64',
    errors: 1
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (col1::date - col2)) FROM some_table`',
    name: 'X::date - Y — cast to date dispara bug',
    errors: 1
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (some_col - col2::date)) FROM some_table`',
    name: 'X - Y::date — mirror cast a date',
    errors: 1
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (m.hire_date - CURRENT_DATE))::int AS days_since FROM members m`',
    name: 'column .*_date - CURRENT_DATE',
    errors: 1
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (MIN(ab.balance_date) - period_start_date)) FROM account_balances ab`',
    name: 'MIN(*_date) subtraction',
    errors: 1
  },
  {
    code: '`SELECT EXTRACT(EPOCH FROM (MAX(eff_date) - hire_date)) AS seconds FROM some_table`',
    name: 'MAX(*_date) - column ending in _date',
    errors: 1
  }
]

ruleTester.run(
  'no-extract-epoch-from-date-subtraction',
  rule,
  {
    valid: validCases.map(c => ({ code: c.code, name: c.name })),
    invalid: invalidCases.map(c => ({
      code: c.code,
      name: c.name,
      errors: Array(c.errors).fill({ message: /TASK-893 hotfix/ })
    }))
  }
)

 
console.log('✓ no-extract-epoch-from-date-subtraction: 8 valid + 8 invalid passed')
