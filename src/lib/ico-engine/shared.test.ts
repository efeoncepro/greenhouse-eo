import { describe, expect, it } from 'vitest'

import {
  CANONICAL_COMPLETED_TASK_SQL,
  CANONICAL_FTR_ELIGIBLE_SQL,
  CANONICAL_FTR_PASSED_SQL,
  CANONICAL_LATE_DROP_SQL,
  CANONICAL_ON_TIME_SQL,
  DONE_STATUSES_SQL,
  buildMetricSelectSQL
} from '@/lib/ico-engine/shared'

describe('ico-engine canonical completion semantics', () => {
  it('requires terminal statuses for completed task semantics', () => {
    expect(CANONICAL_COMPLETED_TASK_SQL).toContain('completed_at IS NOT NULL')
    expect(CANONICAL_COMPLETED_TASK_SQL).toContain(`task_status IN (${DONE_STATUSES_SQL})`)
    expect(CANONICAL_ON_TIME_SQL).toContain(CANONICAL_COMPLETED_TASK_SQL)
    expect(CANONICAL_LATE_DROP_SQL).toContain(CANONICAL_COMPLETED_TASK_SQL)
    expect(CANONICAL_FTR_ELIGIBLE_SQL).toContain(CANONICAL_COMPLETED_TASK_SQL)
    expect(CANONICAL_FTR_PASSED_SQL).toContain(CANONICAL_COMPLETED_TASK_SQL)
  })

  it('keeps RpA and cycle time gated by terminal completion', () => {
    const sql = buildMetricSelectSQL()

    expect(sql).toContain(`WHEN ${CANONICAL_COMPLETED_TASK_SQL} AND rpa_value > 0`)
    expect(sql).toContain(`CASE WHEN ${CANONICAL_COMPLETED_TASK_SQL} THEN cycle_time_days END`)
  })
})
