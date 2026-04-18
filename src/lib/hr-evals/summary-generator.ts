import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

export interface EvalSummaryData {
  evalCycleId: string
  memberId: string
  overallRating: number | null
  selfRating: number | null
  peerRating: number | null
  managerRating: number | null
  directReportRating: number | null
  icoRpaAvg: number | null
  icoOtdPercent: number | null
  goalCompletionPct: number | null
}

type AssignmentWithAvgRow = {
  eval_type: string
  avg_rating: number | string | null
}

type IcoMetricsRow = {
  rpa_avg: number | string | null
  otd_pct: number | string | null
}

type GoalAvgRow = {
  avg_progress: number | string | null
}

// ── Helpers ──

const toNullableNum = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

// ── Weights for overall rating ──

const WEIGHTS: Record<string, number> = {
  self: 0.15,
  peer: 0.25,
  manager: 0.50,
  direct_report: 0.10
}

/**
 * Generate a summary data object for a member in a given eval cycle.
 *
 * Steps:
 * 1. Fetch all submitted assignments for this member, averaged by eval_type.
 * 2. Fetch ICO metrics from greenhouse_serving.ico_member_metrics (latest period).
 * 3. Fetch goal completion from greenhouse_hr.goals (active cycle, avg progress_percent).
 * 4. Compute overall_rating as weighted average: self=15%, peer=25%, manager=50%, direct_report=10%.
 */
export async function generateEvalSummary(
  cycleId: string,
  memberId: string
): Promise<EvalSummaryData> {
  // Step 1: Average ratings by eval_type for submitted assignments
  const ratingRows = await runGreenhousePostgresQuery<AssignmentWithAvgRow>(
    `
      SELECT
        a.eval_type,
        AVG(r.rating)::numeric(3,2) AS avg_rating
      FROM greenhouse_hr.eval_assignments a
      JOIN greenhouse_hr.eval_responses r ON r.assignment_id = a.assignment_id
      WHERE a.eval_cycle_id = $1
        AND a.evaluatee_id = $2
        AND a.status = 'submitted'
      GROUP BY a.eval_type
    `,
    [cycleId, memberId]
  )

  const ratingsByType: Record<string, number | null> = {
    self: null,
    peer: null,
    manager: null,
    direct_report: null
  }

  for (const row of ratingRows) {
    ratingsByType[row.eval_type] = toNullableNum(row.avg_rating)
  }

  // Step 2: ICO metrics (latest period for this member)
  let icoRpaAvg: number | null = null
  let icoOtdPercent: number | null = null

  try {
    const icoRows = await runGreenhousePostgresQuery<IcoMetricsRow>(
      `
        SELECT rpa_avg, otd_pct
        FROM greenhouse_serving.ico_member_metrics
        WHERE member_id = $1
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1
      `,
      [memberId]
    )

    if (icoRows.length > 0) {
      icoRpaAvg = toNullableNum(icoRows[0].rpa_avg)
      icoOtdPercent = toNullableNum(icoRows[0].otd_pct)
    }
  } catch {
    // Table may not exist yet; silently skip
  }

  // Step 3: Goal completion (active goal cycle, avg progress for this member)
  let goalCompletionPct: number | null = null

  try {
    const goalRows = await runGreenhousePostgresQuery<GoalAvgRow>(
      `
        SELECT AVG(g.progress_percent)::numeric(5,2) AS avg_progress
        FROM greenhouse_hr.goals g
        JOIN greenhouse_hr.goal_cycles gc ON gc.cycle_id = g.cycle_id
        WHERE g.owner_member_id = $1
          AND gc.status = 'active'
          AND g.status NOT IN ('cancelled')
      `,
      [memberId]
    )

    if (goalRows.length > 0) {
      goalCompletionPct = toNullableNum(goalRows[0].avg_progress)
    }
  } catch {
    // Goals module may not be available; silently skip
  }

  // Step 4: Compute weighted overall rating
  let overallRating: number | null = null
  let totalWeight = 0
  let weightedSum = 0

  for (const [evalType, weight] of Object.entries(WEIGHTS)) {
    const rating = ratingsByType[evalType]

    if (rating !== null) {
      weightedSum += rating * weight
      totalWeight += weight
    }
  }

  if (totalWeight > 0) {
    // Normalize to the weights that actually have data
    overallRating = Math.round((weightedSum / totalWeight) * 100) / 100
  }

  return {
    evalCycleId: cycleId,
    memberId,
    overallRating,
    selfRating: ratingsByType.self,
    peerRating: ratingsByType.peer,
    managerRating: ratingsByType.manager,
    directReportRating: ratingsByType.direct_report,
    icoRpaAvg,
    icoOtdPercent,
    goalCompletionPct
  }
}
