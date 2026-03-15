import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'object' && v !== null && 'value' in v) return toStr((v as { value?: unknown }).value)
  return String(v)
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
    // ─── 1. Backfill SSO + auth columns into client_users ────
    console.log('\n--- client_users SSO/auth columns ---')
    const [userRows] = await bq.query({
      query: `
        SELECT
          user_id, microsoft_oid, microsoft_tenant_id, microsoft_email,
          google_sub, google_email, avatar_url,
          password_hash, password_hash_algorithm,
          timezone, default_portal_home_path, last_login_provider
        FROM \`${projectId}.greenhouse.client_users\`
        WHERE active = TRUE
      `
    })
    console.log(`  BigQuery: ${userRows.length} users`)

    let updatedCount = 0

    for (const r of userRows as any[]) {
      const userId = toStr(r.user_id)

      if (!userId) continue

      // Only update if user exists in PG (UPDATE with RETURNING to count affected rows)
      const updated = await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.client_users SET
          microsoft_oid = COALESCE($2, microsoft_oid),
          microsoft_tenant_id = COALESCE($3, microsoft_tenant_id),
          microsoft_email = COALESCE($4, microsoft_email),
          google_sub = COALESCE($5, google_sub),
          google_email = COALESCE($6, google_email),
          avatar_url = COALESCE($7, avatar_url),
          password_hash = COALESCE($8, password_hash),
          password_hash_algorithm = COALESCE($9, password_hash_algorithm),
          timezone = COALESCE($10, timezone),
          default_portal_home_path = COALESCE($11, default_portal_home_path),
          last_login_provider = COALESCE($12, last_login_provider),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id`,
        [
          userId,
          toStr(r.microsoft_oid), toStr(r.microsoft_tenant_id), toStr(r.microsoft_email),
          toStr(r.google_sub), toStr(r.google_email), toStr(r.avatar_url),
          toStr(r.password_hash), toStr(r.password_hash_algorithm),
          toStr(r.timezone), toStr(r.default_portal_home_path), toStr(r.last_login_provider)
        ]
      )

      if (updated.length > 0) updatedCount++
    }
    console.log(`  Updated: ${updatedCount}`)

    // ─── 2. Resolve member_id for internal users ─────────────
    console.log('\n--- Resolve member_id links ---')
    const memberLinked = await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.client_users u SET
        member_id = m.member_id,
        updated_at = CURRENT_TIMESTAMP
      FROM greenhouse_core.members m
      WHERE u.identity_profile_id = m.identity_profile_id
        AND u.identity_profile_id IS NOT NULL
        AND u.member_id IS NULL
        AND m.active = TRUE
      RETURNING u.user_id`
    )
    console.log(`  Linked: ${memberLinked.length}`)

    // ─── 3. Backfill role assignments ────────────────────────
    console.log('\n--- user_role_assignments ---')
    const [roleRows] = await bq.query({
      query: `
        SELECT
          assignment_id, user_id, role_code, client_id,
          scope_level, project_id, campaign_id,
          status, active,
          effective_from, effective_to, assigned_by,
          created_at, updated_at
        FROM \`${projectId}.greenhouse.user_role_assignments\`
      `
    })
    console.log(`  BigQuery: ${roleRows.length} assignments`)

    for (const r of roleRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_core.user_role_assignments (
          assignment_id, user_id, role_code, client_id,
          scope_level, project_id, campaign_id,
          status, active,
          effective_from, effective_to, assigned_by_user_id,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (assignment_id) DO UPDATE SET
          status = EXCLUDED.status,
          active = EXCLUDED.active,
          effective_from = EXCLUDED.effective_from,
          effective_to = EXCLUDED.effective_to,
          updated_at = CURRENT_TIMESTAMP`,
        [
          toStr(r.assignment_id), toStr(r.user_id), toStr(r.role_code),
          toStr(r.client_id), toStr(r.scope_level),
          toStr(r.project_id), toStr(r.campaign_id),
          toStr(r.status) || 'active', toBool(r.active),
          toTs(r.effective_from), toTs(r.effective_to), toStr(r.assigned_by),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Upserted: ${roleRows.length}`)

    // ─── 4. Backfill project scopes ──────────────────────────
    console.log('\n--- user_project_scopes ---')
    const [projScopeRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.user_project_scopes\``
    })
    console.log(`  BigQuery: ${projScopeRows.length} scopes`)

    for (const r of projScopeRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_core.user_project_scopes (scope_id, user_id, project_id, active, created_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (scope_id) DO NOTHING`,
        [
          toStr(r.scope_id), toStr(r.user_id), toStr(r.project_id),
          toBool(r.active), toTs(r.created_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${projScopeRows.length}`)

    // ─── 5. Backfill campaign scopes ─────────────────────────
    console.log('\n--- user_campaign_scopes ---')
    const [campScopeRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.user_campaign_scopes\``
    })
    console.log(`  BigQuery: ${campScopeRows.length} scopes`)

    for (const r of campScopeRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_core.user_campaign_scopes (scope_id, user_id, campaign_id, active, created_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (scope_id) DO NOTHING`,
        [
          toStr(r.scope_id), toStr(r.user_id), toStr(r.campaign_id),
          toBool(r.active), toTs(r.created_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${campScopeRows.length}`)

    // ─── 6. Backfill feature flags ───────────────────────────
    console.log('\n--- client_feature_flags ---')
    const [flagRows] = await bq.query({
      query: `
        SELECT flag_id, client_id, feature_code AS flag_code, active AS enabled, created_at
        FROM \`${projectId}.greenhouse.client_feature_flags\`
      `
    })
    console.log(`  BigQuery: ${flagRows.length} flags`)

    for (const r of flagRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_core.client_feature_flags (flag_id, client_id, flag_code, enabled, created_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (flag_id) DO NOTHING`,
        [
          toStr(r.flag_id), toStr(r.client_id), toStr(r.flag_code),
          toBool(r.enabled), toTs(r.created_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${flagRows.length}`)

    console.log('\n✅ Identity V2 backfill complete')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(err => {
  console.error('❌ Identity V2 backfill failed:', err)
  process.exit(1)
})
