import 'server-only'

import { randomUUID } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-910 Slice 1 — Demo members synthetic registration canonical helpers.
 *
 * Canonical primitives para registrar + verificar miembros sintéticos del demo
 * teamspace Notion (`Demo Greenhouse`, Notion ID 36339c2f-...4ca0f5-...). Estos
 * members tienen `is_demo=TRUE` (column shipped TASK-910 Slice 0 migration) y
 * NUNCA tocan payroll real — defense in depth en TASK-910 Slice 5 (bonus
 * helpers + fetchKpisForPeriod filter).
 *
 * **Garantías canonical**:
 * - Email canónico de domain demo controlado: `demo-{name}@demo.greenhouse.efeonce.org`
 *   (operator NUNCA usa real email — anti-confusion + safety)
 * - `is_demo=TRUE` SIEMPRE (helper rechaza intento de registrar non-demo)
 * - `tenant_type` NO existe en members table — el discriminator canonical es
 *   `is_demo` boolean (decision canonical Slice 0 Discovery: tenant_type vive
 *   en client_users/clients, NO en members)
 * - Idempotent: re-correr el setup script con mismo email → UPDATE (no error)
 * - Member IDs son opaque UUIDs (NOT prefix `demo-` — sigue convención canonical)
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md
 * - ADR: docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md §9
 * - Migration Slice 0: migrations/20260519120713456_task-910-demo-teamspace-sandbox-foundation.sql
 * - Defense-in-depth Slice 5: src/lib/payroll/fetch-kpis-for-period.ts + bonus-proration.ts
 */

export interface DemoMemberRecord {
  readonly memberId: string
  readonly displayName: string
  readonly primaryEmail: string
  readonly notionUserId: string | null
  readonly isDemo: true
  readonly active: boolean
  readonly status: string
}

export interface RegisterDemoMemberInput {
  readonly displayName: string
  readonly syntheticEmail: string
  readonly syntheticNotionUserId?: string | null
  readonly roleTitle?: string | null
}

const DEMO_EMAIL_DOMAIN_SUFFIX = '@demo.greenhouse.efeonce.org'

const assertDemoEmail = (email: string): void => {
  const normalized = email.trim().toLowerCase()

  if (!normalized.endsWith(DEMO_EMAIL_DOMAIN_SUFFIX)) {
    throw new Error(
      `[demo-members] Email "${email}" inválido — debe terminar en "${DEMO_EMAIL_DOMAIN_SUFFIX}" (canonical demo domain)`
    )
  }
}

/**
 * Predicate canonical: TRUE si el member es sintético del demo teamspace.
 *
 * Defense in depth: TASK-910 Slice 5 bonus helpers usan esta función
 * pre-check (return $0 bonus + qualifies=false si demo). NUNCA modificar
 * para retornar `true` por error — payroll real depende de esto.
 */
export const isDemoMember = (
  member: { readonly isDemo?: boolean | null } | null | undefined
): boolean => {
  if (!member) {
    return false
  }

  return member.isDemo === true
}

/**
 * Registra (idempotent SELECT-then-UPDATE-or-INSERT) un demo member
 * sintético en `greenhouse_core.members`. Rechaza inputs con email fuera del
 * domain canonical demo (anti-confusion contra emails reales).
 *
 * **Tuple canonical**: `(international_internal, international, internal)` —
 * semánticamente "international member operado internamente". CHECK
 * constraint `members_contract_payroll_tuple_check` restringe a 3 tuples
 * canonical; usamos esta porque demo NUNCA tiene payroll real path
 * (defense in depth Slice 5 enforces $0 bonus via is_demo filter).
 *
 * **Idempotency**: 2-step (SELECT WHERE primary_email → UPDATE existing OR
 * INSERT new). primary_email NO tiene UNIQUE constraint en members table —
 * único en `public_id`, lo cual implicaría exposure publica innecesaria.
 * El helper canonical es la única boundary que crea demo members, así que
 * race condition es teórica solamente.
 */
export const registerDemoMember = async (
  input: RegisterDemoMemberInput
): Promise<DemoMemberRecord> => {
  assertDemoEmail(input.syntheticEmail)

  const normalizedEmail = input.syntheticEmail.trim().toLowerCase()

  // Check existing demo member by primary_email
  const existingRows = await runGreenhousePostgresQuery<{
    member_id: string
    is_demo: boolean
  }>(
    `SELECT member_id, is_demo
     FROM greenhouse_core.members
     WHERE LOWER(primary_email) = $1
     LIMIT 1`,
    [normalizedEmail]
  )

  let row: {
    member_id: string
    display_name: string
    primary_email: string
    notion_user_id: string | null
    is_demo: boolean
    active: boolean
    status: string
  } | undefined

  if (existingRows[0]) {
    // Existing — UPDATE preserving member_id (idempotent re-run safe)
    if (!existingRows[0].is_demo) {
      throw new Error(
        `[demo-members] Invariant violation: member ${existingRows[0].member_id} with email ${normalizedEmail} exists but is_demo=FALSE. Refuse to convert real member to demo.`
      )
    }

    const updated = await runGreenhousePostgresQuery<{
      member_id: string
      display_name: string
      primary_email: string
      notion_user_id: string | null
      is_demo: boolean
      active: boolean
      status: string
    }>(
      `UPDATE greenhouse_core.members
       SET display_name = $2,
           notion_user_id = COALESCE($3, notion_user_id),
           role_title = COALESCE($4, role_title),
           is_demo = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE member_id = $1
       RETURNING member_id, display_name, primary_email, notion_user_id, is_demo, active, status`,
      [
        existingRows[0].member_id,
        input.displayName,
        input.syntheticNotionUserId ?? null,
        input.roleTitle ?? null
      ]
    )

    row = updated[0]
  } else {
    // Not existing — INSERT new
    const memberId = randomUUID()

    const inserted = await runGreenhousePostgresQuery<{
      member_id: string
      display_name: string
      primary_email: string
      notion_user_id: string | null
      is_demo: boolean
      active: boolean
      status: string
    }>(
      `INSERT INTO greenhouse_core.members (
         member_id, display_name, primary_email, notion_user_id,
         is_demo, active, assignable, status, workforce_intake_status,
         contract_type, pay_regime, payroll_via,
         role_title, role_title_source,
         daily_required, prior_work_years,
         created_at, updated_at
       )
       VALUES (
         $1, $2, $3, $4,
         TRUE, TRUE, FALSE, 'active', 'completed',
         'international_internal', 'international', 'internal',
         $5::text, CASE WHEN $5::text IS NOT NULL THEN 'hr_manual' ELSE 'unset' END,
         FALSE, 0,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )
       RETURNING member_id, display_name, primary_email, notion_user_id, is_demo, active, status`,
      [
        memberId,
        input.displayName,
        normalizedEmail,
        input.syntheticNotionUserId ?? null,
        input.roleTitle ?? null
      ]
    )

    row = inserted[0]
  }

  if (!row) {
    throw new Error(`[demo-members] UPSERT did not return row for email ${normalizedEmail}`)
  }

  if (!row.is_demo) {
    throw new Error(
      `[demo-members] Invariant violation: row returned with is_demo=FALSE for email ${normalizedEmail}. Migration TASK-910 Slice 0 may have been reverted.`
    )
  }

  return {
    memberId: row.member_id,
    displayName: row.display_name,
    primaryEmail: row.primary_email,
    notionUserId: row.notion_user_id,
    isDemo: true,
    active: row.active,
    status: row.status
  }
}

/**
 * Lista todos los demo members activos canonical. Útil para audit + setup
 * scripts + reliability signals.
 */
export const listDemoMembers = async (): Promise<readonly DemoMemberRecord[]> => {
  const rows = await runGreenhousePostgresQuery<{
    member_id: string
    display_name: string
    primary_email: string
    notion_user_id: string | null
    is_demo: boolean
    active: boolean
    status: string
  }>(
    `SELECT member_id, display_name, primary_email, notion_user_id, is_demo, active, status
     FROM greenhouse_core.members
     WHERE is_demo = TRUE
     ORDER BY display_name ASC`
  )

  return rows.map(row => ({
    memberId: row.member_id,
    displayName: row.display_name,
    primaryEmail: row.primary_email,
    notionUserId: row.notion_user_id,
    isDemo: true as const,
    active: row.active,
    status: row.status
  }))
}

/**
 * Count canonical de demo members (helper para reliability signal Slice 4
 * `payroll.bonus.demo_member_contamination` defense in depth).
 */
export const countDemoMembers = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM greenhouse_core.members WHERE is_demo = TRUE`
  )

  return Number(rows[0]?.count ?? 0)
}
