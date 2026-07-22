import { describe, expect, it } from 'vitest'

import { scenario } from './globe-creative-producer.scenario'

describe('globe Creative Producer capture sequence', () => {
  it('clears residual keyboard-equivalent focus before the full-page frame', () => {
    const fullPageIndex = scenario.steps.findIndex(step => step.kind === 'mark' && step.label === 'producer-full-page')
    const focusReset = scenario.steps[fullPageIndex - 1]

    expect(fullPageIndex).toBeGreaterThan(0)
    expect(focusReset).toMatchObject({ kind: 'click', selector: '#producer-title' })
  })
})
