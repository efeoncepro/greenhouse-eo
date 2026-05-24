import { describe, expect, it } from 'vitest'

import { buildOtdBucketSql, classifyOtdBucket } from './classify-otd-bucket'
import { OTD_BUCKET_FORMULA_VERSION } from './otd-bucket-types'

// Mes vigente de referencia para los tests (todo en mayo 2026 para pasar el gate
// esMesActual salvo donde se prueba explícitamente lo contrario).
const ASOF = new Date('2026-05-20T12:00:00Z')
const DUE = new Date('2026-05-15T00:00:00Z')

describe('classifyOtdBucket — M1 paridad (freeze OFF)', () => {
  it('on_time: Aprobado completado antes del due (mismo mes)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: DUE,
      completedAt: new Date('2026-05-14T10:00:00Z'),
      asOf: ASOF
    })

    expect(r.bucket).toBe('on_time')
    expect(r.dataStatus).toBe('valid')
    expect(r.frozenDaysApplied).toBe(0)
    expect(r.formulaVersion).toBe(OTD_BUCKET_FORMULA_VERSION)
  })

  it('on_time: completado exactamente en el due (boundary <= 0)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: DUE,
      completedAt: new Date('2026-05-15T23:00:00Z'),
      asOf: ASOF
    })

    expect(r.bucket).toBe('on_time')
  })

  it('late_drop: Aprobado completado después del due', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: DUE,
      completedAt: new Date('2026-05-18T10:00:00Z'),
      asOf: ASOF
    })

    expect(r.bucket).toBe('late_drop')
    expect(r.dataStatus).toBe('valid')
  })

  it('on_time: Aprobado sin completed_at (Notion fueATiempo=true)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: DUE,
      completedAt: null,
      asOf: ASOF
    })

    expect(r.bucket).toBe('on_time')
  })

  it('overdue: abierta y now > due (mismo mes)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'En curso',
      dueDate: DUE,
      completedAt: null,
      asOf: ASOF // 20 > 15
    })

    expect(r.bucket).toBe('overdue')
  })

  it('carry_over: abierta y now <= due (mismo mes)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'En curso',
      dueDate: new Date('2026-05-25T00:00:00Z'),
      completedAt: null,
      asOf: ASOF // 20 <= 25
    })

    expect(r.bucket).toBe('carry_over')
  })

  it('not_applicable + unavailable: sin due_date', () => {
    const r = classifyOtdBucket({
      taskStatus: 'En curso',
      dueDate: null,
      completedAt: null,
      asOf: ASOF
    })

    expect(r.bucket).toBe('not_applicable')
    expect(r.dataStatus).toBe('unavailable')
  })

  it('not_applicable + valid: estado Cancelado (excluida)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Cancelado',
      dueDate: DUE,
      completedAt: null,
      asOf: ASOF
    })

    expect(r.bucket).toBe('not_applicable')
    expect(r.dataStatus).toBe('valid')
  })

  it('not_applicable + valid: estado Archivado (excluida)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Archivado',
      dueDate: DUE,
      completedAt: new Date('2026-05-10T00:00:00Z'),
      asOf: ASOF
    })

    expect(r.bucket).toBe('not_applicable')
    expect(r.dataStatus).toBe('valid')
  })

  it('not_applicable + valid: due_date fuera del mes vigente (gate esMesActual)', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: new Date('2026-03-15T00:00:00Z'), // marzo, asOf mayo
      completedAt: new Date('2026-03-20T00:00:00Z'), // fue late, pero NA por mes
      asOf: ASOF
    })

    expect(r.bucket).toBe('not_applicable')
    expect(r.dataStatus).toBe('valid')
  })

  it('normaliza estados legacy: "Listo" → Aprobado → late_drop', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Listo', // alias legacy Efeonce → Aprobado
      dueDate: DUE,
      completedAt: new Date('2026-05-18T00:00:00Z'),
      asOf: ASOF
    })

    expect(r.bucket).toBe('late_drop')
  })

  it('normaliza estados legacy: "Done" → Aprobado → on_time', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Done',
      dueDate: DUE,
      completedAt: new Date('2026-05-10T00:00:00Z'),
      asOf: ASOF
    })

    expect(r.bucket).toBe('on_time')
  })

  it('idempotente: dos invocaciones con mismos inputs → mismo result', () => {
    const inputs = {
      taskStatus: 'En curso',
      dueDate: DUE,
      completedAt: null,
      asOf: ASOF
    }

    expect(classifyOtdBucket(inputs)).toEqual(classifyOtdBucket(inputs))
  })
})

describe('classifyOtdBucket — freeze toggle (forward-compat M2)', () => {
  it('frozenDays descuenta atraso: late_drop → on_time cuando frozen cubre el slip', () => {
    // completado 3 días tarde (18 vs 15), pero 3 días fueron no imputables.
    const r = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: DUE,
      completedAt: new Date('2026-05-18T00:00:00Z'),
      asOf: ASOF,
      frozenDays: 3
    })

    expect(r.bucket).toBe('on_time')
    expect(r.frozenDaysApplied).toBe(3)
  })

  it('frozenDays descuenta atraso abierto: overdue → carry_over', () => {
    const r = classifyOtdBucket({
      taskStatus: 'En curso',
      dueDate: DUE, // 15, asOf 20 → 5 días overdue
      completedAt: null,
      asOf: ASOF,
      frozenDays: 6
    })

    expect(r.bucket).toBe('carry_over')
  })

  it('M1 (frozenDays omitido) NO descuenta → paridad cruda', () => {
    const r = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: DUE,
      completedAt: new Date('2026-05-18T00:00:00Z'),
      asOf: ASOF
    })

    expect(r.bucket).toBe('late_drop')
    expect(r.frozenDaysApplied).toBe(0)
  })
})

describe('buildOtdBucketSql — mirror BQ (paridad TS↔SQL)', () => {
  const sql = buildOtdBucketSql()

  it('encodea los 4 buckets + not_applicable', () => {
    expect(sql).toContain("'on_time'")
    expect(sql).toContain("'late_drop'")
    expect(sql).toContain("'overdue'")
    expect(sql).toContain("'carry_over'")
    expect(sql).toContain("'not_applicable'")
  })

  it('replica el gate esMesActual + exclusión + completed branch', () => {
    expect(sql).toContain('EXTRACT(MONTH FROM due_date)')
    expect(sql).toContain("'Cancelado'")
    expect(sql).toContain("'Archivado'")
    expect(sql).toContain("'Aprobado'")
    expect(sql).toContain('DATE_DIFF(DATE(completed_at), due_date, DAY)')
    expect(sql).toContain('DATE_DIFF(CURRENT_DATE(), due_date, DAY)')
  })

  it('M1 default frozenDays = 0 (paridad)', () => {
    expect(sql).toContain('- (0))')
  })

  it('frozenDaysSql custom se inyecta (forward-compat M2)', () => {
    const m2sql = buildOtdBucketSql(undefined, 'gh_frozen_days')

    expect(m2sql).toContain('- (gh_frozen_days))')
  })

  it('soporta nombres de columna custom', () => {
    const aliased = buildOtdBucketSql({
      taskStatus: 't.task_status',
      dueDate: 't.due_date',
      completedAt: 't.completed_at'
    })

    expect(aliased).toContain('t.due_date IS NULL')
  })

  it('applyMonthGate=false omite la cláusula esMesActual (M2)', () => {
    const m2sql = buildOtdBucketSql(undefined, 'gh_frozen_days', false)

    expect(m2sql).not.toContain('EXTRACT(MONTH FROM')
    expect(m2sql).toContain('- (gh_frozen_days))')
  })

  it('applyMonthGate=true (default) mantiene la cláusula esMesActual (M1)', () => {
    expect(sql).toContain('EXTRACT(MONTH FROM due_date)')
  })
})

describe('classifyOtdBucket — applyMonthGate (M2)', () => {
  // due_date fuera del mes vigente (asOf mayo 2026, due marzo 2026)
  const outOfMonth = {
    taskStatus: 'Aprobado',
    dueDate: new Date('2026-03-10T00:00:00Z'),
    completedAt: new Date('2026-03-08T00:00:00Z'),
    asOf: new Date('2026-05-24T12:00:00Z')
  }

  it('M1 (default true) → not_applicable cuando due_date fuera del mes vigente', () => {
    expect(classifyOtdBucket(outOfMonth).bucket).toBe('not_applicable')
  })

  it('M2 (applyMonthGate=false) → clasifica igual sin gate de mes (on_time)', () => {
    expect(classifyOtdBucket({ ...outOfMonth, applyMonthGate: false }).bucket).toBe('on_time')
  })

  it('M2 freeze ON descuenta días no imputables del bucket', () => {
    // due 2026-03-10, completed 2026-03-20 → 10 días tarde crudo; freeze 10 → on_time
    const result = classifyOtdBucket({
      taskStatus: 'Aprobado',
      dueDate: new Date('2026-03-10T00:00:00Z'),
      completedAt: new Date('2026-03-20T00:00:00Z'),
      asOf: new Date('2026-05-24T12:00:00Z'),
      applyMonthGate: false,
      frozenDays: 10
    })

    expect(result.bucket).toBe('on_time')
    expect(result.frozenDaysApplied).toBe(10)
  })
})
