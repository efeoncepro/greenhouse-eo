import { describe, expect, it } from 'vitest'

import {
  GraderCategoryUnresolvedError,
  assertRunCategoryResolved,
  isRunCategoryBlocked,
  resolveRunCategory
} from '../category-guard'

const GUARD_ON = { GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv
const GUARD_OFF = {} as unknown as NodeJS.ProcessEnv

describe('growth/ai-visibility — category guard', () => {
  it('usa el nodo resuelto del perfil + su label (portal/operador)', () => {
    const resolved = resolveRunCategory({
      categoryNodeId: 'industry:aviation',
      categoryLabel: 'Aerolineas y aviacion',
      categoryConfidence: 0.7,
      rawCategory: 'AIRLINES_AVIATION'
    })

    expect(resolved.nodeId).toBe('industry:aviation')
    expect(resolved.displayLabel).toBe('Aerolineas y aviacion')
    expect(resolved.resolved).toBe(true)
  })

  it('NUNCA expone el enum crudo como displayLabel cuando hay nodo', () => {
    const resolved = resolveRunCategory({ categoryNodeId: 'industry:aviation', rawCategory: 'AIRLINES_AVIATION' })

    expect(resolved.displayLabel).not.toBe('AIRLINES_AVIATION')
    expect(resolved.displayLabel).toBe('Aerolineas y aviacion') // label canónica del catálogo
  })

  it('resuelve free-text crudo (path público) por el prior determinista', () => {
    const resolved = resolveRunCategory({ rawCategory: 'BANKING' })

    expect(resolved.nodeId).toBe('industry:finance')
    expect(resolved.resolved).toBe(true)
  })

  it('nodo unknown sin raw → no resuelto', () => {
    const resolved = resolveRunCategory({ categoryNodeId: 'unknown' })

    expect(resolved.nodeId).toBe('unknown')
    expect(resolved.resolved).toBe(false)
  })

  it('free-text no reconocido → no resuelto (honest)', () => {
    const resolved = resolveRunCategory({ rawCategory: 'marketing y diseño' })

    expect(resolved.resolved).toBe(false)
  })

  it('isRunCategoryBlocked: flag OFF nunca bloquea (default)', () => {
    expect(isRunCategoryBlocked({ categoryNodeId: 'unknown' }, GUARD_OFF)).toBe(false)
  })

  it('isRunCategoryBlocked: flag ON bloquea unknown, deja pasar resuelto', () => {
    expect(isRunCategoryBlocked({ categoryNodeId: 'unknown' }, GUARD_ON)).toBe(true)
    expect(isRunCategoryBlocked({ categoryNodeId: 'industry:aviation', categoryConfidence: 0.7 }, GUARD_ON)).toBe(false)
  })

  it('assertRunCategoryResolved: lanza error canónico con guard ON + no resuelto', () => {
    const unresolved = resolveRunCategory({ categoryNodeId: 'unknown' })

    expect(() => assertRunCategoryResolved(unresolved, GUARD_ON)).toThrow(GraderCategoryUnresolvedError)
    expect(() => assertRunCategoryResolved(unresolved, GUARD_OFF)).not.toThrow()
  })

  it('assertRunCategoryResolved: no lanza con categoría resuelta aunque el guard esté ON', () => {
    const resolved = resolveRunCategory({ categoryNodeId: 'industry:finance', categoryConfidence: 0.7 })

    expect(() => assertRunCategoryResolved(resolved, GUARD_ON)).not.toThrow()
  })
})
