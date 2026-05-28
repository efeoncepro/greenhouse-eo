// TASK-941 / ISSUE-082 — tests anti-regresión para
// greenhouse/no-bq-struct-string-timestamp.
//
// La rule dispara SOLO cuando un struct-type map (>=2 tipos BQ) con un campo
// temporal es ELEMENTO de un ArrayExpression (ARRAY<STRUCT> param de UNNEST DML),
// inline o por referencia a un const. NO dispara sobre flat maps (schemas de
// CREATE TABLE ni params escalares).

import { RuleTester } from 'eslint'

import rule from '../no-bq-struct-string-timestamp.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('no-bq-struct-string-timestamp', rule, {
  valid: [
    {
      name: 'flat schema map (CREATE TABLE) — TIMESTAMP es tipo de columna, correcto',
      code: "const schema = { completed_tasks: 'INT64', computed_at: 'TIMESTAMP', engine_version: 'STRING' }"
    },
    {
      name: 'flat scalar param types map — TIMESTAMP escalar acepta ISO string',
      code: "const PAYROLL_PERIOD_MUTATION_TYPES = { calculatedAt: 'TIMESTAMP', calculatedBy: 'STRING', approvedAt: 'TIMESTAMP' }"
    },
    {
      name: 'struct en array con timestamp ya STRING (fix canonical)',
      code: "const types = { rows: [{ signal_id: 'STRING', period_year: 'INT64', generated_at: 'STRING' }] }"
    },
    {
      name: 'BQ schema como array [{name,type}] — solo 1 valor tipo-BQ por element',
      code: "const schema = [{ name: 'computed_at', type: 'TIMESTAMP', mode: 'NULLABLE' }]"
    },
    {
      name: 'array de objetos arbitrarios sin tipos BQ',
      code: "const items = [{ label: 'TIMESTAMP', hint: 'fecha' }]"
    }
  ],
  invalid: [
    {
      name: 'inline ARRAY<STRUCT> en bigQuery.query con TIMESTAMP',
      code: "bigQuery.query({ query: 'INSERT ... SELECT ... FROM UNNEST(@rows) AS s', params: { rows }, types: { rows: [{ id: 'STRING', n: 'INT64', predicted_at: 'TIMESTAMP' }] } })",
      errors: [{ messageId: 'structTimestamp' }]
    },
    {
      name: 'struct en array con múltiples timestamp (run writer)',
      code: "const types = { rows: [{ run_id: 'STRING', signals_seen: 'INT64', started_at: 'TIMESTAMP', completed_at: 'TIMESTAMP', _synced_at: 'TIMESTAMP' }] }",
      errors: [
        { messageId: 'structTimestamp' },
        { messageId: 'structTimestamp' },
        { messageId: 'structTimestamp' }
      ]
    },
    {
      name: 'named const resuelto dentro de array ([AI_SIGNAL_STRUCT_TYPES])',
      code: "const AI_SIGNAL_STRUCT_TYPES = { signal_id: 'STRING', period_year: 'INT64', generated_at: 'TIMESTAMP' }\nconst types = { rows: [AI_SIGNAL_STRUCT_TYPES] }",
      errors: [{ messageId: 'structTimestamp' }]
    },
    {
      name: 'DATE en struct de array',
      code: "const types = { rows: [{ a: 'STRING', b: 'FLOAT64', original_due_date: 'DATE' }] }",
      errors: [{ messageId: 'structTimestamp' }]
    }
  ]
})
