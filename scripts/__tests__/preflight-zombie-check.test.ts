import { describe, expect, it } from 'vitest'

import {
  ZOMBIE_PREFLIGHT_SQL,
  buildZombiePreflightReport,
  formatZombiePreflightReport
} from '../commercial/preflight-zombie-check'

describe('TASK-810 preflight zombie check', () => {
  it('uses runtime service scope fields instead of legacy client_id', () => {
    expect(ZOMBIE_PREFLIGHT_SQL).toContain('s.space_id')
    expect(ZOMBIE_PREFLIGHT_SQL).toContain('s.organization_id')
    expect(ZOMBIE_PREFLIGHT_SQL).not.toContain('s.client_id')
  })

  it('matches the DB guard predicate for outcomes and lineage', () => {
    expect(ZOMBIE_PREFLIGHT_SQL).toContain('greenhouse_commercial.engagement_outcomes')
    expect(ZOMBIE_PREFLIGHT_SQL).toContain('greenhouse_commercial.engagement_lineage')
    expect(ZOMBIE_PREFLIGHT_SQL).toContain("s.start_date < CURRENT_DATE - INTERVAL '120 days'")
  })

  it('formats a clean report as OK', () => {
    const report = buildZombiePreflightReport([], '2026-05-07T00:00:00.000Z')

    expect(formatZombiePreflightReport(report)).toContain('violationCount=0')
    expect(formatZombiePreflightReport(report)).toContain('OK:')
  })

  it('formats violations with operator next action', () => {
    const report = buildZombiePreflightReport(
      [
        {
          service_id: 'svc-1',
          space_id: 'space-1',
          organization_id: 'org-1',
          service_name: 'Validation Sprint',
          engagement_kind: 'poc',
          status: 'active',
          start_date: '2026-01-01',
          days_since_start: 126
        }
      ],
      '2026-05-07T00:00:00.000Z'
    )

    const output = formatZombiePreflightReport(report)

    expect(output).toContain('BLOCKED:')
    expect(output).toContain('service_id=svc-1')
    expect(output).toContain('/agency/sample-sprints/[serviceId]/outcome')
  })
})
