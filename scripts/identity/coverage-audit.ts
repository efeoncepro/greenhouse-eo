/**
 * TASK-784 Slice 6 — Coverage audit: report which active payroll-Chile-dependent
 * members are MISSING a verified CL_RUT.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/coverage-audit.ts
 *
 * Output: bullet list grouped by status (missing | pending_review | rejected).
 * Used as input for HR ops campaigns.
 */

import { query } from '@/lib/db'

interface MemberRow {
  member_id: string
  identity_profile_id: string | null
  display_name: string | null
  primary_email: string | null
  contract_type: string | null
  pay_regime: string | null
  active: boolean
  [key: string]: unknown
}

interface DocumentRow {
  document_id: string
  profile_id: string
  verification_status: string
  declared_at: string
  [key: string]: unknown
}

const main = async () => {
  console.log('[TASK-784 coverage-audit] reading payroll Chile dependent members…')

  const members = await query<MemberRow>(
    `
      SELECT
        m.member_id,
        m.identity_profile_id,
        m.display_name,
        m.primary_email,
        m.contract_type,
        m.pay_regime,
        m.active
      FROM greenhouse_core.members m
      WHERE m.active = TRUE
        AND COALESCE(m.pay_regime, 'chile') = 'chile'
      ORDER BY m.display_name NULLS LAST
    `
  )

  console.log(`[TASK-784 coverage-audit] active Chile members: ${members.length}`)

  const profileIds = members.map(m => m.identity_profile_id).filter(Boolean) as string[]

  if (profileIds.length === 0) {
    console.log('No profiles to evaluate.')

    return
  }

  const docs = await query<DocumentRow>(
    `
      SELECT document_id, profile_id, verification_status, declared_at::text AS declared_at
      FROM greenhouse_core.person_identity_documents
      WHERE document_type = 'CL_RUT'
        AND country_code = 'CL'
        AND verification_status IN ('pending_review', 'verified', 'rejected')
        AND profile_id = ANY($1::text[])
    `,
    [profileIds]
  )

  const byProfile = new Map<string, DocumentRow>()

  for (const doc of docs) {
    // Prefer 'verified' over 'pending' over 'rejected' if multiple exist
    const existing = byProfile.get(doc.profile_id)

    if (
      !existing ||
      (existing.verification_status !== 'verified' && doc.verification_status === 'verified')
    ) {
      byProfile.set(doc.profile_id, doc)
    }
  }

  const missing: MemberRow[] = []
  const pending: MemberRow[] = []
  const rejected: MemberRow[] = []
  const verified: MemberRow[] = []

  for (const m of members) {
    if (!m.identity_profile_id) continue

    const doc = byProfile.get(m.identity_profile_id)

    if (!doc) {
      missing.push(m)
      continue
    }

    switch (doc.verification_status) {
      case 'verified':
        verified.push(m)
        break
      case 'pending_review':
        pending.push(m)
        break
      case 'rejected':
        rejected.push(m)
        break
    }
  }

  const printGroup = (label: string, list: MemberRow[]) => {
    console.log(`\n=== ${label}: ${list.length} ===`)

    for (const m of list.slice(0, 50)) {
      console.log(`  - ${m.display_name ?? '(sin nombre)'} <${m.primary_email ?? '(sin email)'}> ${m.member_id}`)
    }

    if (list.length > 50) {
      console.log(`  ... y ${list.length - 50} mas`)
    }
  }

  printGroup('SIN documento CL_RUT (missing)', missing)
  printGroup('CL_RUT pendiente de revision', pending)
  printGroup('CL_RUT rechazado', rejected)

  console.log('\n=== Resumen ===')
  console.log(`  Activos Chile      : ${members.length}`)
  console.log(`  Verified CL_RUT    : ${verified.length}`)
  console.log(`  Pendiente revision : ${pending.length}`)
  console.log(`  Rechazado          : ${rejected.length}`)
  console.log(`  Missing            : ${missing.length}`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[TASK-784 coverage-audit] fatal:', err)
    process.exit(1)
  })
