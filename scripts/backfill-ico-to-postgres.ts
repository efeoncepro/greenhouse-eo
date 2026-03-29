/**
 * Backfill: BigQuery ico_engine.metrics_by_member → Postgres ico_member_metrics
 * Then compute person_operational_360 for all members.
 *
 * Usage: npx tsx scripts/backfill-ico-to-postgres.ts
 */
import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  console.log('=== Backfill ICO member metrics → Postgres ===\n')

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  // Dynamic imports to work around server-only
  const { BigQuery } = await import('@google-cloud/bigquery')
  const projectId = getGoogleProjectId()
  const bq = new BigQuery(getGoogleAuthOptions())

  console.log('Reading from BigQuery ico_engine.metrics_by_member...')

  const [rows] = await bq.query({
    query: `SELECT member_id, period_year, period_month,
             rpa_avg, rpa_median, otd_pct, ftr_pct,
             cycle_time_avg_days, throughput_count, pipeline_velocity,
             stuck_asset_count, stuck_asset_pct,
             total_tasks, completed_tasks, active_tasks
           FROM \`${projectId}.ico_engine.metrics_by_member\`
           ORDER BY period_year DESC, period_month DESC`
  })

  console.log(`BigQuery rows: ${rows.length}`)

  if (rows.length === 0) {
    console.log('No data in BigQuery — nothing to sync')
    process.exit(0)
  }

  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('../src/lib/postgres/client')

  let inserted = 0

  for (const r of rows as Array<Record<string, unknown>>) {
    try {
      await runGreenhousePostgresQuery(`
        INSERT INTO greenhouse_serving.ico_member_metrics (
          member_id, period_year, period_month,
          rpa_avg, rpa_median, otd_pct, ftr_pct,
          cycle_time_avg_days, throughput_count, pipeline_velocity,
          stuck_asset_count, stuck_asset_pct,
          total_tasks, completed_tasks, active_tasks, materialized_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
          rpa_avg=EXCLUDED.rpa_avg, rpa_median=EXCLUDED.rpa_median,
          otd_pct=EXCLUDED.otd_pct, ftr_pct=EXCLUDED.ftr_pct,
          cycle_time_avg_days=EXCLUDED.cycle_time_avg_days,
          throughput_count=EXCLUDED.throughput_count, pipeline_velocity=EXCLUDED.pipeline_velocity,
          stuck_asset_count=EXCLUDED.stuck_asset_count, stuck_asset_pct=EXCLUDED.stuck_asset_pct,
          total_tasks=EXCLUDED.total_tasks, completed_tasks=EXCLUDED.completed_tasks,
          active_tasks=EXCLUDED.active_tasks, materialized_at=NOW()
      `, [
        String(r.member_id), Number(r.period_year), Number(r.period_month),
        r.rpa_avg != null ? Number(r.rpa_avg) : null,
        r.rpa_median != null ? Number(r.rpa_median) : null,
        r.otd_pct != null ? Number(r.otd_pct) : null,
        r.ftr_pct != null ? Number(r.ftr_pct) : null,
        r.cycle_time_avg_days != null ? Number(r.cycle_time_avg_days) : null,
        r.throughput_count != null ? Number(r.throughput_count) : null,
        r.pipeline_velocity != null ? Number(r.pipeline_velocity) : null,
        r.stuck_asset_count != null ? Number(r.stuck_asset_count) : null,
        r.stuck_asset_pct != null ? Number(r.stuck_asset_pct) : null,
        r.total_tasks != null ? Number(r.total_tasks) : null,
        r.completed_tasks != null ? Number(r.completed_tasks) : null,
        r.active_tasks != null ? Number(r.active_tasks) : null
      ])

      inserted++
    } catch (e) {
      console.error(`Failed for ${r.member_id}:`, (e as Error).message?.slice(0, 80))
    }
  }

  console.log(`\nSync complete: ${inserted} rows inserted/updated to ico_member_metrics`)

  // Now compute person_operational_360 for all members
  console.log('\n=== Computing person_operational_360 ===\n')

  const members = await runGreenhousePostgresQuery<{ member_id: string }>(
    `SELECT DISTINCT member_id FROM greenhouse_serving.ico_member_metrics`
  )

  console.log(`Members to process: ${members.length}`)

  // Import compute functions
  const { computeDerivedMetrics } = await import('../src/lib/person-intelligence/compute')
  const { getExpectedMonthlyThroughput, getUtilizationPercent, computeCapacityBreakdown, getCapacityHealth } = await import('../src/lib/team-capacity/shared')

  let computed = 0

  for (const { member_id: memberId } of members) {
    try {
      // Get latest ICO metrics
      const icoRows = await runGreenhousePostgresQuery<Record<string, unknown>>(
        `SELECT * FROM greenhouse_serving.ico_member_metrics
         WHERE member_id = $1
         ORDER BY period_year DESC, period_month DESC LIMIT 1`,
        [memberId]
      )

      if (icoRows.length === 0) continue

      const ico = icoRows[0]

      // Get assignments
      const assignments = await runGreenhousePostgresQuery<Record<string, unknown>>(
        `SELECT fte_allocation, contracted_hours_month
         FROM greenhouse_core.client_team_assignments
         WHERE member_id = $1 AND active = TRUE`,
        [memberId]
      )

      const totalFte = assignments.reduce((s, a) => s + Number(a.fte_allocation || 0), 0)
      const totalContracted = assignments.reduce((s, a) => s + (Number(a.contracted_hours_month) || Math.round(Number(a.fte_allocation || 0) * 160)), 0)

      // Get compensation
      const compRows = await runGreenhousePostgresQuery<Record<string, unknown>>(
        `SELECT version_id, base_salary, remote_allowance, currency
         FROM greenhouse_payroll.compensation_versions
         WHERE member_id = $1 AND effective_from <= CURRENT_DATE
           AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
         ORDER BY effective_from DESC LIMIT 1`,
        [memberId]
      )

      const comp = compRows[0] ?? null
      const monthlyBase = comp ? Number(comp.base_salary || 0) : 0
      const monthlyRemote = comp ? Number(comp.remote_allowance || 0) : 0
      const monthlyTotalComp = comp ? monthlyBase + monthlyRemote : null

      // Get role category
      const memberRows = await runGreenhousePostgresQuery<Record<string, unknown>>(
        `SELECT role_category FROM greenhouse_core.members WHERE member_id = $1`,
        [memberId]
      )

      const roleCategory = (memberRows[0]?.role_category as string) || 'unknown'

      // Compute
      const activeTasks = Number(ico.active_tasks || 0)
      const expectedThroughput = getExpectedMonthlyThroughput({ roleCategory: roleCategory as 'design', fteAllocation: totalFte })

      const utilizationPct = expectedThroughput > 0
        ? getUtilizationPercent({ activeAssets: activeTasks, expectedMonthlyThroughput: expectedThroughput })
        : 0

      const capacity = computeCapacityBreakdown({
        fteAllocation: totalFte,
        contractedHoursMonth: totalContracted || null,
        utilizationPercent: utilizationPct
      })

      const derived = computeDerivedMetrics(
        {
          rpaAvg: ico.rpa_avg != null ? Number(ico.rpa_avg) : null,
          otdPct: ico.otd_pct != null ? Number(ico.otd_pct) : null,
          ftrPct: ico.ftr_pct != null ? Number(ico.ftr_pct) : null,
          throughputCount: ico.throughput_count != null ? Number(ico.throughput_count) : null,
          activeTasks: ico.active_tasks != null ? Number(ico.active_tasks) : null
        },
        { totalFte, contractedHoursMonth: totalContracted, roleCategory: roleCategory as 'design' },
        { monthlyTotalComp }
      )

      // Upsert to person_operational_360
      await runGreenhousePostgresQuery(`
        INSERT INTO greenhouse_serving.person_operational_360 (
          member_id, period_year, period_month,
          rpa_avg, rpa_median, otd_pct, ftr_pct,
          cycle_time_avg_days, throughput_count, pipeline_velocity,
          stuck_asset_count, stuck_asset_pct, total_tasks, completed_tasks, active_tasks,
          utilization_pct, allocation_variance, cost_per_asset, cost_per_hour,
          quality_index, dedication_index,
          role_category, total_fte_allocation,
          contracted_hours_month, assigned_hours_month, used_hours_month, available_hours_month,
          expected_throughput, capacity_health, overcommitted, active_assignment_count,
          compensation_currency, monthly_base_salary, monthly_total_comp, compensation_version_id,
          source, engine_version, materialized_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
          $32, $33, $34, $35,
          'backfill', 'v2.0.0-person-intelligence', NOW()
        )
        ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
          rpa_avg=EXCLUDED.rpa_avg, otd_pct=EXCLUDED.otd_pct, ftr_pct=EXCLUDED.ftr_pct,
          utilization_pct=EXCLUDED.utilization_pct, allocation_variance=EXCLUDED.allocation_variance,
          cost_per_asset=EXCLUDED.cost_per_asset, cost_per_hour=EXCLUDED.cost_per_hour,
          quality_index=EXCLUDED.quality_index, dedication_index=EXCLUDED.dedication_index,
          total_fte_allocation=EXCLUDED.total_fte_allocation,
          capacity_health=EXCLUDED.capacity_health, overcommitted=EXCLUDED.overcommitted,
          monthly_total_comp=EXCLUDED.monthly_total_comp,
          source='backfill', materialized_at=NOW()
      `, [
        memberId, Number(ico.period_year), Number(ico.period_month),
        ico.rpa_avg != null ? Number(ico.rpa_avg) : null,
        ico.rpa_median != null ? Number(ico.rpa_median) : null,
        ico.otd_pct != null ? Number(ico.otd_pct) : null,
        ico.ftr_pct != null ? Number(ico.ftr_pct) : null,
        ico.cycle_time_avg_days != null ? Number(ico.cycle_time_avg_days) : null,
        ico.throughput_count != null ? Number(ico.throughput_count) : null,
        ico.pipeline_velocity != null ? Number(ico.pipeline_velocity) : null,
        ico.stuck_asset_count != null ? Number(ico.stuck_asset_count) : null,
        ico.stuck_asset_pct != null ? Number(ico.stuck_asset_pct) : null,
        Number(ico.total_tasks || 0), Number(ico.completed_tasks || 0), Number(ico.active_tasks || 0),
        derived.utilizationPct, derived.allocationVariance,
        derived.costPerAsset, derived.costPerHour,
        derived.qualityIndex, derived.dedicationIndex,
        roleCategory, totalFte,
        capacity.contractedHoursMonth, capacity.assignedHoursMonth,
        capacity.usedHoursMonth ?? 0, capacity.availableHoursMonth,
        expectedThroughput, getCapacityHealth(utilizationPct),
        capacity.overcommitted, assignments.length,
        comp?.currency as string ?? null, comp ? monthlyBase : null,
        monthlyTotalComp, comp?.version_id as string ?? null
      ])

      computed++
    } catch (e) {
      console.error(`Failed for ${memberId}:`, (e as Error).message?.slice(0, 80))
    }
  }

  console.log(`\nComputed: ${computed} members in person_operational_360`)

  // Final counts
  const icoCount = await runGreenhousePostgresQuery('SELECT COUNT(*)::text as cnt FROM greenhouse_serving.ico_member_metrics')
  const po360Count = await runGreenhousePostgresQuery('SELECT COUNT(*)::text as cnt FROM greenhouse_serving.person_operational_360')

  console.log(`\nFinal counts:`)
  console.log(`  ico_member_metrics: ${icoCount[0]?.cnt}`)
  console.log(`  person_operational_360: ${po360Count[0]?.cnt}`)

  await closeGreenhousePostgres()
  console.log('\nDone.')
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
