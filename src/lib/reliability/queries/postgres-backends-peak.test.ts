import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/google-credentials', () => ({ createGoogleAuth: vi.fn() }))

import { pickBackendsPeak, resolveCloudSqlMonitoringTarget } from './postgres-backends-peak'

describe('postgres-backends-peak (TASK-1876 Slice 3)', () => {
  it('derives the Cloud SQL monitoring target from the instance connection name', () => {
    expect(resolveCloudSqlMonitoringTarget('efeonce-group:us-east4:greenhouse-pg-dev')).toEqual({
      project: 'efeonce-group',
      databaseId: 'efeonce-group:greenhouse-pg-dev'
    })
    expect(resolveCloudSqlMonitoringTarget(undefined)).toBeNull()
    expect(resolveCloudSqlMonitoringTarget('greenhouse-pg-dev')).toBeNull()
  })

  it('picks the maximum point across series (the ISSUE-174 minute)', () => {
    const peak = pickBackendsPeak(
      {
        timeSeries: [
          {
            points: [
              { interval: { endTime: '2026-09-18T11:04:00Z' }, value: { int64Value: '16' } },
              { interval: { endTime: '2026-09-18T11:05:00Z' }, value: { int64Value: '99' } },
              { interval: { endTime: '2026-09-18T11:06:00Z' }, value: { int64Value: '87' } }
            ]
          }
        ]
      },
      24
    )

    expect(peak).toEqual({ peak: 99, peakAt: '2026-09-18T11:05:00Z', windowHours: 24 })
  })

  it('returns null when there are no points (never invents an ok)', () => {
    expect(pickBackendsPeak({}, 24)).toBeNull()
    expect(pickBackendsPeak({ timeSeries: [{ points: [] }] }, 24)).toBeNull()
  })
})
