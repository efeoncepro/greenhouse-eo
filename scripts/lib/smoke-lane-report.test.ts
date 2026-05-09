import { describe, expect, it } from 'vitest'

import {
  deriveSpecStatus,
  flattenPlaywrightReport,
  summarizeSmokeLaneSpecs,
  type PlaywrightReport,
  type PlaywrightSpec
} from './smoke-lane-report'

describe('smoke-lane Playwright report parsing', () => {
  it('classifies a failed retry followed by pass as flaky, not failed', () => {
    const spec: PlaywrightSpec = {
      title: 'session survives cold start',
      tests: [
        {
          results: [
            { status: 'failed', duration: 15_000 },
            { status: 'passed', duration: 1_250 }
          ]
        }
      ]
    }

    expect(deriveSpecStatus(spec)).toBe('flaky')
  })

  it('keeps final failures as failed even when previous attempts ran', () => {
    const spec: PlaywrightSpec = {
      title: 'real regression stays red',
      tests: [
        {
          results: [
            { status: 'timedOut', duration: 15_000 },
            { status: 'failed', duration: 4_000 }
          ]
        }
      ]
    }

    expect(deriveSpecStatus(spec)).toBe('failed')
  })

  it('summarizes final outcomes without counting flaky specs as failed', () => {
    const report: PlaywrightReport = {
      suites: [
        {
          title: 'smoke',
          specs: [
            {
              title: 'green path',
              file: 'smoke/home.spec.ts',
              tests: [{ results: [{ status: 'passed', duration: 100 }] }]
            },
            {
              title: 'cold-start retry',
              file: 'smoke/login-session.spec.ts',
              tests: [
                {
                  results: [
                    { status: 'failed', duration: 15_000 },
                    { status: 'passed', duration: 500 }
                  ]
                }
              ]
            },
            {
              title: 'real failure',
              file: 'smoke/finance.spec.ts',
              tests: [{ results: [{ status: 'failed', duration: 1_000 }] }]
            },
            {
              title: 'not applicable',
              file: 'smoke/skipped.spec.ts',
              tests: [{ results: [{ status: 'skipped', duration: 0 }] }]
            }
          ]
        }
      ]
    }

    const specs = flattenPlaywrightReport(report)

    expect(summarizeSmokeLaneSpecs(specs)).toEqual({
      total: 4,
      passed: 1,
      failed: 1,
      flaky: 1,
      skipped: 1
    })
  })
})
