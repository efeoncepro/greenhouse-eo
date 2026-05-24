// TASK-909 Slice 1 — tests anti-regresión para greenhouse/no-inline-ftr-calculation.
//
// Confirma que la rule:
//   1. Detecta el recompute del VEREDICTO FTR (P1 client_change_round_final +
//      literal 'pass'/'fail', P2 rpa.value === 0 ? 'pass' : 'fail', P3
//      lectura legacy formula.ftr).
//   2. NO reporta sobre agregados BQ legítimos que comparan
//      `client_change_round_final = 0` SIN el literal del veredicto (dashboard,
//      capability-queries, sla-compliance — "tareas sin ajustes").
//   3. NO reporta sobre el consumo canonical (import calculateFtr).
//
// Pattern fuente: no-extract-epoch-from-date-subtraction (TASK-893) — full
// source scan.

import { RuleTester } from 'eslint'

import rule from '../no-inline-ftr-calculation.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const validCases = [
  {
    code: `import { calculateFtr } from '@/lib/notion-metrics/calculate-ftr'`,
    name: 'consumo canonical del helper (no recompute)'
  },
  {
    code: '`SELECT COUNTIF(client_change_round_final = 0) AS without_client_adjustments FROM tareas`',
    name: 'agregado BQ legítimo (= 0 sin literal pass/fail) — NO es recompute FTR'
  },
  {
    code: '`SELECT COUNTIF(client_change_round_final > 0) AS with_client_adjustments, SUM(client_change_round_final) AS total FROM tareas`',
    name: 'agregados de rondas de cliente (sin veredicto)'
  },
  {
    code: '`SELECT t.client_change_round_final, t.rpa FROM notion_ops.tareas t WHERE t.completed_at IS NOT NULL`',
    name: 'select de columna client_change_round_final (passthrough, sin veredicto)'
  },
  {
    code: `const status = ftrResult.value === 'pass' ? 'Aprobado' : 'Con cambios'`,
    name: 'lectura del FtrResult.value canonical (consumer correcto, no recompute)'
  },
  {
    code: '`SELECT formula.cumplimiento FROM notion_ops.tareas`',
    name: 'lectura de otra propiedad formula Notion (no FTR)'
  },
  {
    code: `const label = isPassing ? 'pass' : 'fail'`,
    name: "ternario con 'pass'/'fail' sin client_change_round_final ni .value === 0"
  }
]

const invalidCases = [
  // ─── P1 — CASE WHEN client_change_round_final = 0 THEN 'pass' (SQL) ───────
  {
    code: `\`SELECT CASE WHEN client_change_round_final = 0 THEN 'pass' ELSE 'fail' END AS ftr FROM tareas\``,
    name: 'CASE WHEN client_change_round_final = 0 THEN pass (recompute SQL)',
    errors: 1
  },
  // ─── P1 mirror — 'pass' ... client_change_round_final ────────────────────
  {
    code: `\`SELECT IF(rpa = 0, 'pass', 'fail') AS verdict, client_change_round_final FROM tareas WHERE client_change_round_final = 0\``,
    name: "literal 'pass' en proximidad a client_change_round_final (mirror)",
    errors: 1
  },
  // ─── P2 — rpa.value === 0 ? 'pass' : 'fail' (TS ternary, multi-node) ──────
  {
    code: `const ftr = rpa.value === 0 ? 'pass' : 'fail'`,
    name: 'ternario TS recomputa veredicto FTR (lógica duplicada de calculateFtr)',
    errors: 1
  },
  {
    code: `const verdict = result.value === 0 ? 'pass' : 'fail'`,
    name: 'ternario TS sobre result.value === 0 (duplicación)',
    errors: 1
  },
  // ─── P3 — lectura legacy formula.ftr de Notion ───────────────────────────
  {
    code: `const ftr = notionPage.formula.ftr`,
    name: 'lectura legacy de propiedad Notion formula.ftr',
    errors: 1
  },
  {
    code: `const ftr = notionPage.formula['FTR']`,
    name: 'lectura legacy de propiedad Notion formula["FTR"]',
    errors: 1
  }
]

ruleTester.run('no-inline-ftr-calculation', rule, {
  valid: validCases.map(c => ({ code: c.code, name: c.name })),
  invalid: invalidCases.map(c => ({
    code: c.code,
    name: c.name,
    errors: Array(c.errors).fill({ message: /veredicto FTR|no-inline-ftr/ })
  }))
})

console.log('✓ no-inline-ftr-calculation: 7 valid + 6 invalid passed')
