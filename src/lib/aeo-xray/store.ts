import 'server-only'
import { sql, type Generated, type Kysely, type Transaction } from 'kysely'

import { getDb } from '@/lib/db'
import type { AxisAeoXrayManifest } from '@/lib/axis/aeo-xray/aeo-xray'
import type { XrayAuthority, XrayCase, XrayDraft, XrayEdition, XrayGrant } from './types'

type Timestamp = Generated<Date>
type Tables = {
  'greenhouse_core.organizations': { organization_id: string; active: boolean; status: string }
  'greenhouse_xray.cases': {
    case_id: Generated<string>
    organization_id: string
    title: string
    prospect_reference: string
    created_by: string
    created_at: Timestamp
  }
  'greenhouse_xray.drafts': {
    case_id: string
    organization_id: string
    revision: number
    intent_json: unknown
    updated_by: string
    updated_at: Timestamp
  }
  'greenhouse_xray.editions': {
    edition_id: Generated<string>
    organization_id: string
    case_id: string
    draft_revision: number
    model_version: string
    manifest_json: AxisAeoXrayManifest
    content_hash: string
    contract_version: string
    idempotency_key: string
    issued_by: string
    issued_at: Timestamp
    withdrawn_at: Date | null
    withdrawn_by: string | null
  }
  'greenhouse_xray.share_grants': {
    grant_id: Generated<string>
    organization_id: string
    edition_id: string
    token_digest: string
    label: string | null
    created_by: string
    created_at: Timestamp
    expires_at: Date
    revoked_at: Date | null
    revoked_by: string | null
  }
  'greenhouse_xray.events': {
    event_id: Generated<string>
    organization_id: string
    case_id: string
    actor_id: string
    action: string
    resource_id: string
    created_at: Timestamp
  }
  'greenhouse_xray.rate_buckets': { subject_hash: string; window_start: Date; hits: number }
}
type Db = Kysely<Tables> | Transaction<Tables>
const db = async () => (await getDb()).withTables<Tables>() as unknown as Kysely<Tables>
const iso = (v: Date | string | null) => (v ? new Date(v).toISOString() : null)

const edition = (r: Tables['greenhouse_xray.editions'] & { edition_id: string }): XrayEdition => ({
  editionId: r.edition_id,
  caseId: r.case_id,
  organizationId: r.organization_id,
  draftRevision: r.draft_revision,
  idempotencyKey: r.idempotency_key,
  manifest: r.manifest_json,
  withdrawnAt: iso(r.withdrawn_at)
})

const grant = (r: {
  grant_id: string
  edition_id: string
  organization_id: string
  expires_at: Date
  revoked_at: Date | null
  label: string | null
}): XrayGrant => ({
  grantId: r.grant_id,
  editionId: r.edition_id,
  organizationId: r.organization_id,
  expiresAt: iso(r.expires_at)!,
  revokedAt: iso(r.revoked_at),
  label: r.label
})

export interface XraySession {
  findCase(caseId: string): Promise<XrayCase | null>
  listCases(): Promise<XrayCase[]>
  insertCase(title: string, reference: string): Promise<XrayCase>
  draft(caseId: string): Promise<XrayDraft | null>
  writeDraft(caseId: string, revision: number, intent: unknown): Promise<void>
  edition(editionId: string): Promise<XrayEdition | null>
  findEdition(caseId: string, key: string, revision: number): Promise<XrayEdition | null>
  insertEdition(
    caseId: string,
    revision: number,
    key: string,
    manifest: AxisAeoXrayManifest,
    hash: string
  ): Promise<XrayEdition>
  withdraw(editionId: string): Promise<void>
  grant(grantId: string): Promise<XrayGrant | null>
  grants(editionId: string): Promise<XrayGrant[]>
  insertGrant(editionId: string, digest: string, days: number, label: string | null): Promise<XrayGrant>
  revoke(grantId: string): Promise<void>
  event(caseId: string, action: string, resourceId: string): Promise<void>
}
export interface XrayStore {
  transaction<T>(authority: XrayAuthority, fn: (session: XraySession) => Promise<T>): Promise<T>
}

function session(d: Db, a: XrayAuthority): XraySession {
  const org = a.organizationId

  return {
    async findCase(id) {
      await sql`select pg_advisory_xact_lock(hashtextextended(${org + ':' + id}, 0))`.execute(d)

      const r = await d
        .selectFrom('greenhouse_xray.cases')
        .selectAll()
        .where('organization_id', '=', org)
        .where('case_id', '=', id)
        .executeTakeFirst()

      return r
        ? {
            caseId: r.case_id,
            organizationId: r.organization_id,
            title: r.title,
            prospectReference: r.prospect_reference
          }
        : null
    },
    async listCases() {
      const rows = await d
        .selectFrom('greenhouse_xray.cases')
        .selectAll()
        .where('organization_id', '=', org)
        .orderBy('created_at', 'desc')
        .limit(100)
        .execute()

      return rows.map(r => ({
        caseId: r.case_id,
        organizationId: r.organization_id,
        title: r.title,
        prospectReference: r.prospect_reference
      }))
    },
    async insertCase(title, reference) {
      const r = await d
        .insertInto('greenhouse_xray.cases')
        .values({ organization_id: org, title, prospect_reference: reference, created_by: a.actorUserId })
        .returningAll()
        .executeTakeFirstOrThrow()

      return { caseId: r.case_id, organizationId: org, title: r.title, prospectReference: r.prospect_reference }
    },
    async draft(id) {
      const r = await d
        .selectFrom('greenhouse_xray.drafts')
        .selectAll()
        .where('organization_id', '=', org)
        .where('case_id', '=', id)
        .forUpdate()
        .executeTakeFirst()

      return r ? { caseId: r.case_id, revision: r.revision, intent: r.intent_json } : null
    },
    async writeDraft(id, revision, intent) {
      await d
        .insertInto('greenhouse_xray.drafts')
        .values({
          organization_id: org,
          case_id: id,
          revision,
          intent_json: JSON.stringify(intent),
          updated_by: a.actorUserId
        })
        .onConflict(c =>
          c
            .column('case_id')
            .doUpdateSet({
              revision,
              intent_json: JSON.stringify(intent),
              updated_by: a.actorUserId,
              updated_at: sql`now()`
            })
            .where('greenhouse_xray.drafts.organization_id', '=', org)
        )
        .execute()
    },
    async edition(id) {
      const r = await d
        .selectFrom('greenhouse_xray.editions')
        .selectAll()
        .where('organization_id', '=', org)
        .where('edition_id', '=', id)
        .forUpdate()
        .executeTakeFirst()

      return r ? edition(r as never) : null
    },
    async findEdition(id, key, revision) {
      const r = await d
        .selectFrom('greenhouse_xray.editions')
        .selectAll()
        .where('organization_id', '=', org)
        .where('case_id', '=', id)
        .where(eb => eb.or([eb('idempotency_key', '=', key), eb('draft_revision', '=', revision)]))
        .executeTakeFirst()

      return r ? edition(r as never) : null
    },
    async insertEdition(id, revision, key, manifest, hash) {
      const r = await d
        .insertInto('greenhouse_xray.editions')
        .values({
          organization_id: org,
          case_id: id,
          draft_revision: revision,
          model_version: '1.0',
          manifest_json: sql`${JSON.stringify(manifest)}::jsonb`,
          content_hash: hash,
          contract_version: manifest.version,
          idempotency_key: key,
          issued_by: a.actorUserId,
          withdrawn_at: null,
          withdrawn_by: null
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      return edition(r as never)
    },
    async withdraw(id) {
      await d
        .updateTable('greenhouse_xray.editions')
        .set({ withdrawn_at: sql`now()`, withdrawn_by: a.actorUserId })
        .where('organization_id', '=', org)
        .where('edition_id', '=', id)
        .where('withdrawn_at', 'is', null)
        .execute()
      await d
        .updateTable('greenhouse_xray.share_grants')
        .set({ revoked_at: sql`now()`, revoked_by: a.actorUserId })
        .where('organization_id', '=', org)
        .where('edition_id', '=', id)
        .where('revoked_at', 'is', null)
        .execute()
    },
    async grant(id) {
      const r = await d
        .selectFrom('greenhouse_xray.share_grants')
        .selectAll()
        .where('organization_id', '=', org)
        .where('grant_id', '=', id)
        .executeTakeFirst()

      return r ? grant(r) : null
    },
    async grants(id) {
      return (
        await d
          .selectFrom('greenhouse_xray.share_grants')
          .selectAll()
          .where('organization_id', '=', org)
          .where('edition_id', '=', id)
          .execute()
      ).map(grant)
    },
    async insertGrant(id, digest, days, label) {
      const r = await d
        .insertInto('greenhouse_xray.share_grants')
        .values({
          organization_id: org,
          edition_id: id,
          token_digest: digest,
          label,
          created_by: a.actorUserId,
          expires_at: sql`now() + ${days} * interval '1 day'`,
          revoked_at: null,
          revoked_by: null
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      return grant(r)
    },
    async revoke(id) {
      await d
        .updateTable('greenhouse_xray.share_grants')
        .set({ revoked_at: sql`now()`, revoked_by: a.actorUserId })
        .where('organization_id', '=', org)
        .where('grant_id', '=', id)
        .where('revoked_at', 'is', null)
        .execute()
    },
    async event(id, action, resourceId) {
      await d
        .insertInto('greenhouse_xray.events')
        .values({ organization_id: org, case_id: id, actor_id: a.actorUserId, action, resource_id: resourceId })
        .execute()
    }
  }
}

export const xrayStore: XrayStore = {
  async transaction(a, fn) {
    return (await db()).transaction().execute(trx => fn(session(trx, a)))
  }
}

export async function readXrayByDigest(digest: string) {
  const d = await db()

  const r = await d
    .selectFrom('greenhouse_xray.share_grants as g')
    .innerJoin('greenhouse_xray.editions as e', j =>
      j.onRef('e.edition_id', '=', 'g.edition_id').onRef('e.organization_id', '=', 'g.organization_id')
    )
    .innerJoin('greenhouse_core.organizations as o', 'o.organization_id', 'g.organization_id')
    .select([
      'o.active',
      'o.status',
      'g.expires_at',
      'g.revoked_at',
      'e.withdrawn_at',
      'e.edition_id',
      'e.organization_id',
      'e.case_id',
      'e.manifest_json',
      'e.model_version',
      'e.content_hash'
    ])
    .where('g.token_digest', '=', digest)
    .executeTakeFirst()

  return r
    ? {
        expiresAt: iso(r.expires_at)!,
        revokedAt: iso(r.revoked_at),
        withdrawnAt: iso(r.withdrawn_at),
        editionId: r.edition_id,
        organizationId: r.organization_id,
        caseId: r.case_id,
        manifest: r.manifest_json,
        modelVersion: r.model_version,
        contentHash: r.content_hash,
        organizationActive: r.active && r.status === 'active'
      }
    : null
}

export async function consumeXrayRate(subjectHash: string, limit: number) {
  const d = await db()

  const r = await d
    .insertInto('greenhouse_xray.rate_buckets')
    .values({ subject_hash: subjectHash, window_start: sql`date_trunc('minute', now())`, hits: 1 })
    .onConflict(c =>
      c.columns(['subject_hash', 'window_start']).doUpdateSet({ hits: sql`greenhouse_xray.rate_buckets.hits + 1` })
    )
    .returning('hits')
    .executeTakeFirstOrThrow()

  if (r.hits === 1) {
    await d
      .deleteFrom('greenhouse_xray.rate_buckets')
      .where('window_start', '<', sql<Date>`now() - interval '24 hours'`)
      .execute()
  }

  return r.hits <= limit
}
