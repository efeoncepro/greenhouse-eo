import { describe, expect, it } from 'vitest'
import type { Page } from 'playwright'

import { analyzeLayoutIntegrity } from './layout-integrity'

const stubPage = (impl: () => unknown): Page => ({ evaluate: async () => impl() }) as unknown as Page

describe('layout-integrity severity mapping', () => {
  it('maps raw issues to warning findings by default (warning-first)', async () => {
    const page = stubPage(() => [
      { code: 'layout_horizontal_overflow', message: 'overflow' },
      { code: 'layout_target_too_small', message: 'small', selector: 'button.x' }
    ])

    const findings = await analyzeLayoutIntegrity(page, 'first-fold', { enabled: true })

    expect(findings).toHaveLength(2)
    expect(findings.every(f => f.severity === 'warning')).toBe(true)
    expect(findings.every(f => f.category === 'layout')).toBe(true)
    expect(findings[0].frameLabel).toBe('first-fold')
  })

  it('escalates to error when failOnViolations is set', async () => {
    const page = stubPage(() => [{ code: 'layout_element_overflow', message: 'x' }])
    const findings = await analyzeLayoutIntegrity(page, 'f', { enabled: true, failOnViolations: true })

    expect(findings[0].severity).toBe('error')
  })

  it('degrades honestly to a probe-failed warning when the page evaluate throws', async () => {
    const page = stubPage(() => {
      throw new Error('detached frame')
    })

    const findings = await analyzeLayoutIntegrity(page, 'f', { enabled: true, failOnViolations: true })

    expect(findings).toHaveLength(1)
    expect(findings[0].code).toBe('layout_probe_failed')
    expect(findings[0].severity).toBe('warning')
  })
})
