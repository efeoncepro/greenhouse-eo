import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildCycleTimeDaysExpression, buildCycleTimeJoinClause } from './cycle-time-formula'

const PROJECT = 'efeonce-group'
const ORIGINAL = process.env.CT_DAYS_CANONICAL_FORMULA_ENABLED

beforeEach(() => {
  delete process.env.CT_DAYS_CANONICAL_FORMULA_ENABLED
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CT_DAYS_CANONICAL_FORMULA_ENABLED
  else process.env.CT_DAYS_CANONICAL_FORMULA_ENABLED = ORIGINAL
})

describe('TASK-912 Slice 4 — cycle_time_days formula (flag-gated)', () => {
  describe('OFF (default) — legacy byte-idéntica + sin JOIN', () => {
    it('expresión = legacy DATE_DIFF(completed/now, created/synced)', () => {
      const expr = buildCycleTimeDaysExpression()

      expect(expr).toContain('DATE_DIFF(')
      expect(expr).toContain('COALESCE(DATE(dt.completed_at), CURRENT_DATE())')
      expect(expr).toContain('COALESCE(DATE(dt.created_at), DATE(dt.synced_at))')
      // NO referencia a transiciones ni al alias ctw
      expect(expr).not.toContain('ctw')
      expect(expr).not.toContain('task_status_transitions')
    })

    it('JOIN clause vacío (estructura de la VIEW idéntica al legacy)', () => {
      expect(buildCycleTimeJoinClause(PROJECT)).toBe('')
    })

    it('explícitamente OFF también', () => {
      process.env.CT_DAYS_CANONICAL_FORMULA_ENABLED = 'false'
      expect(buildCycleTimeJoinClause(PROJECT)).toBe('')
      expect(buildCycleTimeDaysExpression()).not.toContain('ctw')
    })
  })

  describe('ON — canónica V1 (En curso start + descuento Bloqueado, de-correlada)', () => {
    beforeEach(() => {
      process.env.CT_DAYS_CANONICAL_FORMULA_ENABLED = 'true'
    })

    it('expresión usa ctw.first_en_curso_at + descuenta ctw.blocked_days', () => {
      const expr = buildCycleTimeDaysExpression()

      expect(expr).toContain('COALESCE(DATE(ctw.first_en_curso_at), DATE(dt.created_at), DATE(dt.synced_at))')
      expect(expr).toContain('- COALESCE(ctw.blocked_days, 0)')
    })

    it('JOIN clause de-correlado: LEFT JOIN subquery GROUP BY task_source_id (no correlacionada)', () => {
      const join = buildCycleTimeJoinClause(PROJECT)

      expect(join).toContain('LEFT JOIN (')
      expect(join).toContain('greenhouse_conformed.task_status_transitions')
      expect(join).toContain('GROUP BY task_source_id')
      expect(join).toContain('LEAD(transitioned_at) OVER')
      expect(join).toContain('ctw ON ctw.task_source_id = dt.task_source_id')
      expect(join).toContain("to_status IN ('En curso'") // start = En curso (+ aliases)
    })
  })
})
