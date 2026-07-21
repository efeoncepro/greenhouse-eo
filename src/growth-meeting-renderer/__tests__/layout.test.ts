import { describe, expect, it } from 'vitest'

import { parseMeetingActivationMode, parseMeetingLayoutRecipe, resolveMeetingLayout } from '../layout'

describe('meeting adaptive layout resolver', () => {
  it.each([
    [319, 700, 'guided'],
    [320, 700, 'guided'],
    [559, 700, 'guided'],
    [560, 700, 'split'],
    [959, 700, 'split'],
    [960, 700, 'command'],
    [1200, 580, 'split'],
  ] as const)('resuelve %spx × %spx como %s', (width, height, expected) => {
    expect(resolveMeetingLayout({ width, height })).toBe(expected)
  })

  it('aplica el máximo solicitado sin permitir que el host fuerce overflow', () => {
    expect(resolveMeetingLayout({ width: 1200, height: 800, maxRecipe: 'guided' })).toBe('guided')
    expect(resolveMeetingLayout({ width: 1200, height: 800, maxRecipe: 'split' })).toBe('split')
  })

  it('usa hysteresis para no oscilar cerca de los cortes', () => {
    expect(resolveMeetingLayout({ width: 570, current: 'guided' })).toBe('guided')
    expect(resolveMeetingLayout({ width: 584, current: 'guided' })).toBe('split')
    expect(resolveMeetingLayout({ width: 548, current: 'split' })).toBe('split')
    expect(resolveMeetingLayout({ width: 535, current: 'split' })).toBe('guided')
    expect(resolveMeetingLayout({ width: 970, height: 700, current: 'split' })).toBe('split')
    expect(resolveMeetingLayout({ width: 984, height: 700, current: 'split' })).toBe('command')
    expect(resolveMeetingLayout({ width: 940, height: 700, current: 'command' })).toBe('command')
    expect(resolveMeetingLayout({ width: 935, height: 700, current: 'command' })).toBe('split')
  })

  it('falla a defaults cerrados para atributos desconocidos', () => {
    expect(parseMeetingLayoutRecipe('mega')).toBe('command')
    expect(parseMeetingActivationMode('popover')).toBe('inline')
  })
})
