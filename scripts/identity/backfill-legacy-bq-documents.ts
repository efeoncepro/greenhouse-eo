/**
 * TASK-784 Slice 6 — Backfill from BigQuery `greenhouse.member_profiles`
 * to `greenhouse_core.person_identity_documents`.
 *
 * Reads members with non-null `identity_document_number` from BQ, resolves
 * `identity_profile_id` via PG `members` table, and inserts as
 * `source='legacy_bigquery_member_profile'` + `verification_status='pending_review'`.
 *
 * Idempotent: re-running is safe. The partial UNIQUE constraint
 * (profile_id, document_type, country_code) WHERE pending_review|verified
 * blocks duplicates; we explicitly check value_hash before insert to skip
 * exact dupes.
 *
 * Usage (dry-run by default):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/backfill-legacy-bq-documents.ts
 *
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/backfill-legacy-bq-documents.ts --commit
 *
 * Flags:
 *   --commit            Actually persist (default: dry-run, prints sample).
 *   --limit=<N>         Cap rows to process (default: all).
 *   --member-id=<id>    Process a single member.
 */

import { randomUUID } from 'node:crypto'

import { BigQuery } from '@google-cloud/bigquery'

import { withTransaction, query } from '@/lib/db'
import { writePersonIdentityDocumentAuditEntry } from '@/lib/person-legal-profile/audit'
import { formatDisplayMask, maskGenericDocument } from '@/lib/person-legal-profile/mask'
import { computeValueHash } from '@/lib/person-legal-profile/normalize'
import { publishOutboxEvent } from '@/lib/sync/publish-event'


interface CliOptions {
  commit: boolean
  limit: number | null
  memberId: string | null
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)

  return {
    commit: args.includes('--commit'),
    limit: (() => {
      const arg = args.find(a => a.startsWith('--limit='))

      return arg ? Number.parseInt(arg.slice('--limit='.length), 10) : null
    })(),
    memberId: (() => {
      const arg = args.find(a => a.startsWith('--member-id='))

      return arg ? arg.slice('--member-id='.length) : null
    })()
  }
}

interface BqMemberProfileRow {
  member_id: string
  identity_document_type: string | null
  identity_document_number: string | null
}

interface PgMemberRow {
  member_id: string
  identity_profile_id: string | null
  legal_name: string | null
  primary_email: string | null
  [key: string]: unknown
}

const KNOWN_TYPE_MAP: Record<string, string> = {
  rut: 'CL_RUT',
  RUT: 'CL_RUT',
  passport: 'GENERIC_PASSPORT',
  PASSPORT: 'GENERIC_PASSPORT',
  dni: 'GENERIC_NATIONAL_ID',
  DNI: 'GENERIC_NATIONAL_ID',
  cpf: 'BR_CPF',
  CPF: 'BR_CPF',
  ssn: 'US_SSN',
  SSN: 'US_SSN'
}

const inferDocumentType = (legacyType: string | null): string => {
  if (!legacyType) return 'GENERIC_NATIONAL_ID'

  const normalized = legacyType.trim()

  return KNOWN_TYPE_MAP[normalized] ?? 'GENERIC_NATIONAL_ID'
}

const inferCountry = (documentType: string): string => {
  if (documentType.startsWith('CL_')) return 'CL'
  if (documentType.startsWith('AR_')) return 'AR'
  if (documentType.startsWith('BR_')) return 'BR'
  if (documentType.startsWith('CO_')) return 'CO'
  if (documentType.startsWith('MX_')) return 'MX'
  if (documentType.startsWith('PE_')) return 'PE'
  if (documentType.startsWith('UY_')) return 'UY'
  if (documentType.startsWith('US_')) return 'US'
  if (documentType.startsWith('EU_')) return 'EU'

  return 'CL' // default for legacy Chile-heavy data
}

const cleanLegacyValue = (raw: string): string => raw.replace(/[.\s-]/g, '').toUpperCase()

const main = async () => {
  const opts = parseArgs()

  console.log('[TASK-784 backfill] mode:', opts.commit ? 'COMMIT' : 'DRY-RUN')
  console.log('[TASK-784 backfill] limit:', opts.limit ?? 'unlimited')
  if (opts.memberId) console.log('[TASK-784 backfill] member_id:', opts.memberId)

  const projectId = process.env.GREENHOUSE_BQ_PROJECT_ID || 'efeonce-group'
  const bq = new BigQuery({ projectId })

  const limitClause = opts.limit ? `LIMIT ${Number.parseInt(String(opts.limit), 10)}` : ''

  const memberClause = opts.memberId
    ? `AND member_id = '${opts.memberId.replace(/'/g, "''")}'`
    : ''

  const sql = `
    SELECT member_id,
           identity_document_type,
           identity_document_number
    FROM \`${projectId}.greenhouse.member_profiles\`
    WHERE identity_document_number IS NOT NULL
      AND TRIM(identity_document_number) != ''
      ${memberClause}
    ${limitClause}
  `

  console.log('[TASK-784 backfill] querying BigQuery...')
  const [rows] = (await bq.query({ query: sql })) as [BqMemberProfileRow[], unknown]

  console.log(`[TASK-784 backfill] BQ rows: ${rows.length}`)

  let inserted = 0
  let skipped = 0
  let errors = 0
  const samples: Array<Record<string, string>> = []

  for (const bqRow of rows) {
    if (!bqRow.identity_document_number) {
      skipped += 1
      continue
    }

    try {
      const memberRows = await query<PgMemberRow>(
        `SELECT member_id, identity_profile_id, legal_name, primary_email
         FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
        [bqRow.member_id]
      )

      const member = memberRows[0]

      if (!member?.identity_profile_id) {
        console.warn(`[TASK-784 backfill] skip ${bqRow.member_id}: no identity_profile_id`)
        skipped += 1
        continue
      }

      const documentType = inferDocumentType(bqRow.identity_document_type)
      const country = inferCountry(documentType)
      const normalized = cleanLegacyValue(bqRow.identity_document_number)
      const valueHash = await computeValueHash(normalized)
      const displayMask = formatDisplayMask(documentType as 'CL_RUT', maskGenericDocument(normalized))

      // Idempotency: skip if exact same hash already exists for profile.
      const existing = await query<{ document_id: string; verification_status: string; [key: string]: unknown }>(
        `SELECT document_id, verification_status
         FROM greenhouse_core.person_identity_documents
         WHERE profile_id = $1 AND value_hash = $2 LIMIT 1`,
        [member.identity_profile_id, valueHash]
      )

      if (existing[0]) {
        skipped += 1
        continue
      }

      if (samples.length < 5) {
        samples.push({
          memberId: bqRow.member_id,
          profileId: member.identity_profile_id,
          documentType,
          country,
          displayMask
        })
      }

      if (!opts.commit) {
        continue
      }

      // Persist atomically — schema emits no triggers fail with greenhouse_runtime grants.
      await withTransaction(async client => {
        const documentId = `pid-${randomUUID()}`

        await client.query(
          `INSERT INTO greenhouse_core.person_identity_documents (
             document_id, profile_id, country_code, document_type, issuing_country,
             value_full, value_normalized, value_hash, display_mask,
             verification_status, source,
             declared_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9,
             'pending_review', 'legacy_bigquery_member_profile',
             NOW()
           )
           ON CONFLICT DO NOTHING`,
          [
            documentId,
            member.identity_profile_id,
            country,
            documentType,
            country,
            normalized, // value_full = stored as cleaned legacy form
            normalized,
            valueHash,
            displayMask
          ]
        )

        await writePersonIdentityDocumentAuditEntry(client, {
          documentId,
          profileId: member.identity_profile_id!,
          action: 'declared',
          actorUserId: null,
          diff: { source: 'legacy_bigquery_member_profile', backfill: true }
        })

        await publishOutboxEvent(
          {
            aggregateType: 'person_identity_document',
            aggregateId: documentId,
            eventType: 'person.identity_document.declared',
            payload: {
              documentId,
              profileId: member.identity_profile_id,
              documentType,
              countryCode: country,
              source: 'legacy_bigquery_member_profile',
              backfill: true
            }
          },
          client
        )
      })

      inserted += 1
    } catch (err) {
      errors += 1
      console.error(
        `[TASK-784 backfill] error processing ${bqRow.member_id}:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  console.log('\n[TASK-784 backfill] summary:')
  console.log(`  rows processed   : ${rows.length}`)
  console.log(`  inserted         : ${inserted}`)
  console.log(`  skipped (dupes)  : ${skipped}`)
  console.log(`  errors           : ${errors}`)
  console.log(`  mode             : ${opts.commit ? 'COMMIT' : 'DRY-RUN (no writes)'}`)

  if (!opts.commit && samples.length) {
    console.log('\n[TASK-784 backfill] sample masked rows that WOULD be inserted:')

    for (const s of samples) {
      console.log(' ', s)
    }

    console.log('\nRe-run with --commit to actually persist.')
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[TASK-784 backfill] fatal:', err)
    process.exit(1)
  })
