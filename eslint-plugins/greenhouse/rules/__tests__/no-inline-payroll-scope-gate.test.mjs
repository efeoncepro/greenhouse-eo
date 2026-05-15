// TASK-890 Slice 3 — tests para greenhouse/no-inline-payroll-scope-gate.
//
// Confirma que la rule:
//   1. Detecta el gate legacy inline en sus variantes (template literal +
//      string literal, single-line + multi-line con indentation).
//   2. NO reporta sobre codigo limpio que usa el resolver canonico.
//   3. NO reporta sobre el query del resolver canonico que tambien
//      referencia `work_relationship_offboarding_cases` pero NO compone
//      el gate (usa LATERAL JOIN + priority ordering, sin NOT EXISTS).
//
// Pattern heredado de no-untokenized-fx-math (TASK-766).

import { RuleTester } from 'eslint'

import rule from '../no-inline-payroll-scope-gate.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const validCases = [
  {
    code: `import { resolveExitEligibilityForMembers } from '@/lib/payroll/exit-eligibility'`,
    name: 'canonical resolver import (no SQL)'
  },
  {
    code: `import { isMemberInPayrollScope } from '@/lib/payroll/exit-eligibility'`,
    name: 'canonical predicate import (no SQL)'
  },
  {
    code: '`SELECT m.member_id FROM greenhouse_core.members AS m WHERE m.active = TRUE`',
    name: 'simple members query without offboarding gate'
  },
  {
    code: '`SELECT oc.offboarding_case_id FROM greenhouse_hr.work_relationship_offboarding_cases AS oc WHERE oc.member_id = $1`',
    name: 'direct offboarding case read (not a payroll scope gate)'
  },
  {
    code: '`SELECT oc.status, oc.last_working_day FROM greenhouse_hr.work_relationship_offboarding_cases AS oc ORDER BY oc.created_at DESC LIMIT 1`',
    name: 'LATERAL-style canonical resolver query (references table + LWD but no NOT EXISTS gate)'
  },
  {
    code: '"const status = `executed` and lwd is filtered upstream"',
    name: 'short string mentioning executed and lwd as prose (no SQL gate signature)'
  },
  {
    code: '`SELECT * FROM compensation_versions WHERE effective_from <= $2`',
    name: 'compensation versions query (unrelated to offboarding)'
  }
]

const invalidCases = [
  // ─── Legacy gate exacto: NOT EXISTS + status='executed' + last_working_day
  {
    code: `\`
      SELECT cv.*
      FROM greenhouse_core.members AS m
      LEFT JOIN compensation_versions cv ON cv.member_id = m.member_id
      WHERE m.active = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM greenhouse_hr.work_relationship_offboarding_cases AS oc
          WHERE oc.member_id = m.member_id
            AND oc.status = 'executed'
            AND oc.last_working_day IS NOT NULL
            AND oc.last_working_day < $1::date
        )
    \``,
    errors: 1,
    name: 'legacy gate exact match (pgGet path pre-TASK-890)'
  },
  // ─── Variante: gate condensado en una linea
  {
    code: "`SELECT * FROM members m WHERE m.active = TRUE AND NOT EXISTS (SELECT 1 FROM greenhouse_hr.work_relationship_offboarding_cases oc WHERE oc.member_id = m.member_id AND oc.status = 'executed' AND oc.last_working_day < $1)`",
    errors: 1,
    name: 'legacy gate condensed single-line variant'
  },
  // ─── Variante: NOT EXISTS + LWD < $param (sin status filter — igual de roto)
  {
    code: `\`
      SELECT cv.*
      FROM members m
      WHERE m.active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_hr.work_relationship_offboarding_cases oc
          WHERE oc.member_id = m.member_id
            AND oc.last_working_day < $1::date
        )
    \``,
    errors: 1,
    name: 'NOT EXISTS gate without status filter (still wrong)'
  },
  // ─── Variante: EXISTS positivo filtrando por executed
  {
    code: `\`
      SELECT m.member_id
      FROM members m
      WHERE EXISTS (
        SELECT 1
        FROM greenhouse_hr.work_relationship_offboarding_cases AS oc
        WHERE oc.member_id = m.member_id
          AND oc.status = 'executed'
      )
    \``,
    errors: 1,
    name: 'EXISTS subquery filtering by status=executed (consumer recomputing gate)'
  },
  // ─── String literal largo con el patron embebido
  {
    code: `const sql = "SELECT m.member_id FROM members m WHERE m.active = TRUE AND NOT EXISTS (SELECT 1 FROM greenhouse_hr.work_relationship_offboarding_cases oc WHERE oc.member_id = m.member_id AND oc.status = 'executed' AND oc.last_working_day < $1)"`,
    errors: 1,
    name: 'plain string literal with embedded SQL gate'
  }
]

ruleTester.run('no-inline-payroll-scope-gate', rule, {
  valid: validCases.map(({ code, name }) => ({ code, name })),
  invalid: invalidCases.map(({ code, errors, name }) => ({
    code,
    name,
    errors: Array.from({ length: errors }, () => ({
      message: /no-inline-payroll-scope-gate|TASK-890|legacy payroll scope gate|EXISTS subquery filtering offboarding|gate filtering by last_working_day/u
    }))
  }))
})
