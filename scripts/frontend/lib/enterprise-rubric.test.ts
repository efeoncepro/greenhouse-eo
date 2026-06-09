import { describe, expect, it } from 'vitest'

import { computeRubricVerdict } from './enterprise-rubric'
import type { CaptureFinding } from './manifest'

const finding = (severity: CaptureFinding['severity']): CaptureFinding => ({
  severity,
  category: 'enterprise',
  code: 'enterprise_placeholder_text',
  message: 'x'
})

describe('computeRubricVerdict', () => {
  it('passes with no findings', () => {
    expect(computeRubricVerdict([])).toBe('pass')
  })

  it('warns when only warnings are present', () => {
    expect(computeRubricVerdict([finding('warning'), finding('info')])).toBe('warning')
  })

  it('blocks when any error is present', () => {
    expect(computeRubricVerdict([finding('warning'), finding('error')])).toBe('blocked')
  })
})
