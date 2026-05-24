import { describe, expect, it } from 'vitest'

import { buildReport, parseArgs, summarizeActionsCost } from '../../github-actions-cost-audit.mjs'

describe('github actions cost audit', () => {
  it('parses defaults and explicit args', () => {
    const parsed = parseArgs([
      '--repo',
      'efeoncepro/greenhouse-eo',
      '--from',
      '2026-05-01',
      '--to=2026-05-24',
      '--limit-runs',
      '50',
      '--rate-usd=0.006',
      '--workflow',
      'CI',
      '--format',
      'json',
      '--no-jobs'
    ])

    expect(parsed).toMatchObject({
      repo: 'efeoncepro/greenhouse-eo',
      from: '2026-05-01',
      to: '2026-05-24',
      limitRuns: 50,
      rateUsd: 0.006,
      workflow: 'CI',
      format: 'json',
      includeJobs: false
    })
  })

  it('aggregates job minutes by workflow and job', () => {
    const runs = [
      { id: 1, name: 'CI', run_started_at: '2026-05-24T10:00:00Z', updated_at: '2026-05-24T10:15:00Z' },
      {
        id: 2,
        name: 'Playwright E2E smoke',
        run_started_at: '2026-05-24T10:00:00Z',
        updated_at: '2026-05-24T10:20:00Z'
      }
    ]

    const jobsByRunId = new Map([
      [
        '1',
        [
          { name: 'Lint, test and build', started_at: '2026-05-24T10:00:00Z', completed_at: '2026-05-24T10:10:00Z' },
          { name: 'Upload artifacts', started_at: '2026-05-24T10:10:00Z', completed_at: '2026-05-24T10:11:00Z' }
        ]
      ],
      [
        '2',
        [{ name: 'Chromium smoke suite', started_at: '2026-05-24T10:00:00Z', completed_at: '2026-05-24T10:20:00Z' }]
      ]
    ])

    const summary = summarizeActionsCost({ runs, jobsByRunId, rateUsd: 0.006 })

    expect(summary.totals).toEqual({ runs: 2, jobs: 3, minutes: 31, estimatedGrossUsd: 0.19 })
    expect(summary.byWorkflow[0]).toMatchObject({
      name: 'Playwright E2E smoke',
      runs: 1,
      jobs: 1,
      minutes: 20
    })
    expect(summary.byJob[0]).toMatchObject({
      name: 'Playwright E2E smoke / Chromium smoke suite',
      jobs: 1,
      minutes: 20
    })
  })

  it('falls back to run duration when job details are skipped', () => {
    const summary = summarizeActionsCost({
      runs: [
        {
          id: 1,
          name: 'CI',
          run_started_at: '2026-05-24T10:00:00Z',
          updated_at: '2026-05-24T10:12:00Z'
        }
      ],
      jobsByRunId: new Map(),
      rateUsd: 0.006
    })

    expect(summary.totals).toEqual({ runs: 1, jobs: 0, minutes: 12, estimatedGrossUsd: 0.07 })
    expect(summary.byWorkflow[0]).toMatchObject({ name: 'CI', runs: 1, minutes: 12 })
    expect(summary.byJob).toEqual([])
  })

  it('builds a report that keeps invoice source separate from estimate', () => {
    const report = buildReport({
      options: {
        repo: 'efeoncepro/greenhouse-eo',
        from: '2026-05-01',
        to: '2026-05-24',
        rateUsd: 0.006,
        limitRuns: 10,
        workflow: null,
        includeJobs: false
      },
      runs: [
        {
          id: 1,
          name: 'CI',
          run_started_at: '2026-05-24T10:00:00Z',
          updated_at: '2026-05-24T10:10:00Z'
        }
      ],
      jobsByRunId: new Map()
    })

    expect(report.source.billingSourceOfTruth).toContain('getGitHubBillingOverview')
    expect(report.limitations.join(' ')).toContain('official source')
    expect(report.totals.estimatedGrossUsd).toBe(0.06)
  })
})
