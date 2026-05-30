import { describe, expect, it } from 'vitest'

import { validateScenario, type CaptureScenario } from './scenario'

const baseScenario = (steps: CaptureScenario['steps']): CaptureScenario => ({
  name: 'capture-dsl-test',
  route: '/test',
  viewport: { width: 1440, height: 900 },
  steps
})

describe('frontend capture scenario DSL', () => {
  it('accepts selector-based scroll and clipped section marks', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'wait', selector: 'h1' },
      { kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
      { kind: 'mark', label: 'timeline', clipSelector: '[data-capture="timeline"]' }
    ]))).not.toThrow()
  })

  it('accepts full-page marks for long screens', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'mark', label: 'full-page', fullPage: true }
    ]))).not.toThrow()
  })

  it('rejects ambiguous mark capture modes', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'mark', label: 'bad', fullPage: true, clipSelector: '[data-capture="panel"]' }
    ]))).toThrow('mark no puede combinar fullPage con clipSelector')
  })

  it('rejects capture-only options on non-mark steps', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'scroll', selector: '[data-capture="panel"]', clipSelector: '[data-capture="panel"]' }
    ]))).toThrow('fullPage/clipSelector solo aplican a mark')
  })

  it('rejects scroll-only options on non-scroll steps', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'mark', label: 'bad-scroll-option', scrollTo: 'bottom' }
    ]))).toThrow('scrollBlock/scrollInline/scrollTo solo aplican a scroll')
  })
})
