import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0

  if (typeof v === 'object' && v !== null && 'valueOf' in v) {
    const prim = (v as { valueOf: () => unknown }).valueOf()


return typeof prim === 'number' ? prim : typeof prim === 'string' ? Number(prim) || 0 : 0
  }


return 0
}

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'object' && v !== null && 'value' in v) return toStr((v as { value?: unknown }).value)

return String(v)
}

const toDate = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.split('T')[0] || null
  if (typeof v === 'object' && v !== null && 'value' in v) return toDate((v as { value?: unknown }).value)

return null
}

const toTs = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v || null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object' && v !== null && 'value' in v) return toTs((v as { value?: unknown }).value)

return null
}

const toBool = (v: unknown): boolean => Boolean(v)

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const projectId = process.env.GCP_PROJECT!
  const bq = new BigQuery({ projectId })

  try {
    // ─── 1. Leave Types ────────────────────────────────────────
    // Seed data is already in the DDL (setup-postgres-hr-leave.sql)
    // Only backfill if BigQuery has custom types beyond the defaults
    console.log('\n--- leave_types ---')

    const [typeRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.leave_types\``
    })

    console.log(`  BigQuery: ${typeRows.length} rows`)

    for (const r of typeRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_hr.leave_types (
          leave_type_code, leave_type_name, description,
          default_annual_allowance_days, requires_attachment, is_paid,
          color_token, active, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (leave_type_code) DO UPDATE SET
          leave_type_name = EXCLUDED.leave_type_name,
          description = EXCLUDED.description,
          default_annual_allowance_days = EXCLUDED.default_annual_allowance_days,
          requires_attachment = EXCLUDED.requires_attachment,
          is_paid = EXCLUDED.is_paid,
          color_token = EXCLUDED.color_token,
          active = EXCLUDED.active,
          updated_at = CURRENT_TIMESTAMP`,
        [
          toStr(r.leave_type_code), toStr(r.leave_type_name),
          toStr(r.description),
          toNum(r.default_annual_allowance_days),
          toBool(r.requires_attachment), toBool(r.is_paid),
          toStr(r.color_token), toBool(r.active),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Upserted: ${typeRows.length}`)

    // ─── 2. Leave Balances ─────────────────────────────────────
    console.log('\n--- leave_balances ---')

    const [balanceRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.leave_balances\``
    })

    console.log(`  BigQuery: ${balanceRows.length} rows`)

    for (const r of balanceRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_hr.leave_balances (
          balance_id, member_id, leave_type_code, year,
          allowance_days, carried_over_days, used_days, reserved_days,
          updated_by_user_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (balance_id) DO NOTHING`,
        [
          toStr(r.balance_id), toStr(r.member_id), toStr(r.leave_type_code),
          toNum(r.year),
          toNum(r.allowance_days), toNum(r.carried_over_days),
          toNum(r.used_days), toNum(r.reserved_days),
          toStr(r.updated_by),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Inserted: ${balanceRows.length}`)

    // ─── 3. Leave Requests ─────────────────────────────────────
    console.log('\n--- leave_requests ---')

    const [requestRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.leave_requests\``
    })

    console.log(`  BigQuery: ${requestRows.length} rows`)

    for (const r of requestRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_hr.leave_requests (
          request_id, member_id, leave_type_code,
          start_date, end_date, requested_days, status,
          reason, attachment_url,
          supervisor_member_id, hr_reviewer_user_id,
          decided_at, decided_by, notes,
          created_by_user_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (request_id) DO NOTHING`,
        [
          toStr(r.request_id), toStr(r.member_id), toStr(r.leave_type_code),
          toDate(r.start_date), toDate(r.end_date),
          toNum(r.requested_days), toStr(r.status) || 'pending_supervisor',
          toStr(r.reason), toStr(r.attachment_url),
          toStr(r.supervisor_member_id), toStr(r.hr_reviewer_user_id),
          toTs(r.decided_at), toStr(r.decided_by), toStr(r.notes),
          toStr(r.created_by),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Inserted: ${requestRows.length}`)

    // ─── 4. Leave Request Actions ──────────────────────────────
    console.log('\n--- leave_request_actions ---')

    const [actionRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.leave_request_actions\``
    })

    console.log(`  BigQuery: ${actionRows.length} rows`)

    for (const r of actionRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_hr.leave_request_actions (
          action_id, request_id, action,
          actor_user_id, actor_member_id, actor_name, notes,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (action_id) DO NOTHING`,
        [
          toStr(r.action_id), toStr(r.request_id), toStr(r.action),
          toStr(r.actor_user_id), toStr(r.actor_member_id),
          toStr(r.actor_name), toStr(r.notes),
          toTs(r.created_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Inserted: ${actionRows.length}`)

    console.log('\n✅ HR Leave backfill complete')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(err => {
  console.error('❌ HR Leave backfill failed:', err)
  process.exit(1)
})
