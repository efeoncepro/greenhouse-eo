import 'server-only'

import { createHash } from 'node:crypto'

import { sql, type Kysely, type Transaction } from 'kysely'

import { getDb } from '@/lib/db'
import type { DB } from '@/types/db'

import { measurementPolicyConfigSchema, validateMeasurementMapping, type MeasurementPolicyMutation, type MeasurementPolicyRevision, type MeasurementPolicyResult, type MeasurementPolicyScope, type MeasurementPolicySource, type MeasurementPolicyState } from './policy-contract'
import { resolveMeasurementSource } from './policy-source'

type Executor = Kysely<DB> | Transaction<DB>
interface Row { policy_id: string; source_kind: MeasurementPolicyScope['sourceKind']; source_key: string; surface_id: string; published_revision_id: string|null; revision_id: string; revision: number; state: MeasurementPolicyState; config_json: unknown }

const dto = (r: Row): MeasurementPolicyRevision => ({ policyId:r.policy_id,revisionId:r.revision_id,revision:r.revision,state:r.state,
  scope:{sourceKind:r.source_kind,sourceKey:r.source_key,surfaceId:r.surface_id}, config:measurementPolicyConfigSchema.parse(r.config_json),publishedRevisionId:r.published_revision_id })

const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])) : v

export const listMeasurementPolicies = async (): Promise<MeasurementPolicyRevision[]> => {
  const rows = await sql<Row>`SELECT p.*,r.* FROM greenhouse_growth.measurement_policy p JOIN greenhouse_growth.measurement_policy_revision r USING(policy_id) ORDER BY p.created_at DESC,r.revision DESC`.execute(await getDb())

  return rows.rows.map(dto)
}

const readRevision = async (db: Executor, id: string) => {
  const result = await sql<Row>`SELECT p.*,r.* FROM greenhouse_growth.measurement_policy p JOIN greenhouse_growth.measurement_policy_revision r USING(policy_id) WHERE r.revision_id=${id}::uuid`.execute(db)

  return result.rows[0] ? dto(result.rows[0]) : null
}

/** Internal lookup: public input cannot supply a revision or an authorization flag. */
export const resolvePublishedMeasurementPolicy = async (scope: MeasurementPolicyScope, sourceVersion: string, origin: string): Promise<MeasurementPolicyRevision|null> => {
  const db = await getDb()

  const rows = await sql<Row>`SELECT p.*,r.* FROM greenhouse_growth.measurement_policy p JOIN greenhouse_growth.measurement_policy_revision r ON r.revision_id=p.published_revision_id
    WHERE p.source_kind=${scope.sourceKind} AND p.source_key=${scope.sourceKey} AND p.surface_id=${scope.surfaceId} AND r.state='published'`.execute(db)

  const row = rows.rows[0]

  if (!row) return null
  const policy = dto(row)
  const source = await resolveMeasurementSource(scope)

  if (!source || policy.config.sourceVersion !== sourceVersion || !policy.config.origins.includes(origin as typeof policy.config.origins[number]) || validateMeasurementMapping(policy.config,source).length) return null

  return policy
}

export const measurementPolicyAllowsDelivery = async (revisionId: string|null|undefined, destination: 'meta'|'google_upd'): Promise<boolean> => {
  if (!revisionId) return false
  const db = await getDb()
  const revision = await readRevision(db, revisionId)

  if (!revision || revision.state !== 'published' || revision.publishedRevisionId !== revisionId || !revision.config.destinations.includes(destination)) return false
  const source = await resolveMeasurementSource(revision.scope)

  return Boolean(source && validateMeasurementMapping(revision.config,source).length===0)
}

export const mutateMeasurementPolicyStore = async (input: MeasurementPolicyMutation, actorId: string): Promise<MeasurementPolicyResult> => {
  const db = await getDb()
  const fingerprint = createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex')

  return db.transaction().execute(async tx => {
    // The actor/key lock serializes an idempotency replay even across different policy aggregates.
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${actorId+':'+input.idempotencyKey},0))`.execute(tx)
    const prior = await sql<{request_fingerprint:string;result_json:MeasurementPolicyResult}>`SELECT request_fingerprint,result_json FROM greenhouse_growth.measurement_policy_audit WHERE actor_id=${actorId} AND idempotency_key=${input.idempotencyKey}::uuid`.execute(tx)

    if (prior.rows[0]) return prior.rows[0].request_fingerprint===fingerprint ? prior.rows[0].result_json : {ok:false,error:'conflict',blockingReasons:[]}
    let policyId: string
    let scope: MeasurementPolicyScope

    if (input.action==='draft') {
      scope=input.scope
      const source = await resolveMeasurementSource(scope)

      if (!source) return {ok:false,error:'not_found',blockingReasons:[]}
      const blocked=validateMeasurementMapping(input.config,source)

      if (blocked.length) return {ok:false,blockingReasons:blocked}
      await sql`INSERT INTO greenhouse_growth.measurement_policy(source_kind,source_key,surface_id) VALUES(${scope.sourceKind},${scope.sourceKey},${scope.surfaceId}) ON CONFLICT DO NOTHING`.execute(tx)
      const p = await sql<{policy_id:string}>`SELECT policy_id FROM greenhouse_growth.measurement_policy WHERE source_kind=${scope.sourceKind} AND source_key=${scope.sourceKey} AND surface_id=${scope.surfaceId}`.execute(tx)

      policyId=p.rows[0].policy_id
    } else {
      policyId=input.policyId
      const r=await readRevision(tx,input.revisionId)

      if (!r || r.policyId!==policyId) return {ok:false,error:'not_found',blockingReasons:[]}
      scope=r.scope
    }

    const locked=await sql<{published_revision_id:string|null}>`SELECT published_revision_id FROM greenhouse_growth.measurement_policy WHERE policy_id=${policyId}::uuid FOR UPDATE`.execute(tx)

    if (locked.rows[0].published_revision_id!==input.expectedPublishedRevisionId) return {ok:false,error:'conflict',blockingReasons:[]}
    let revisionId: string

    if(input.action==='draft') {
      const created=await sql<{revision_id:string}>`INSERT INTO greenhouse_growth.measurement_policy_revision(policy_id,revision,config_json,created_by)
        SELECT ${policyId}::uuid,COALESCE(MAX(revision),0)+1,${JSON.stringify(input.config)}::jsonb,${actorId} FROM greenhouse_growth.measurement_policy_revision WHERE policy_id=${policyId}::uuid RETURNING revision_id`.execute(tx)

      revisionId=created.rows[0].revision_id
    } else {
      revisionId=input.revisionId
      const revision=(await readRevision(tx,revisionId))!

      if (input.action==='disable') {
        if(revision.publishedRevisionId!==revisionId || revision.state!=='published') return {ok:false,error:'conflict',blockingReasons:[]}
        await sql`UPDATE greenhouse_growth.measurement_policy SET published_revision_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE policy_id=${policyId}::uuid`.execute(tx)
        await sql`UPDATE greenhouse_growth.measurement_policy_revision SET state='disabled' WHERE revision_id=${revisionId}::uuid`.execute(tx)
      } else {
        const source: MeasurementPolicySource|null=await resolveMeasurementSource(scope)
        const blocked=source?validateMeasurementMapping(revision.config,source):['source_unavailable']

        if(blocked.length) return {ok:false,blockingReasons:blocked}

        if(input.action==='review') {
          if(!['draft','review'].includes(revision.state)) return {ok:false,error:'conflict',blockingReasons:[]}
          await sql`UPDATE greenhouse_growth.measurement_policy_revision SET state='review',reviewed_at=CURRENT_TIMESTAMP WHERE revision_id=${revisionId}::uuid`.execute(tx)
        } else {
          if(revision.state!=='review') return {ok:false,error:'conflict',blockingReasons:[]}
          await sql`UPDATE greenhouse_growth.measurement_policy_revision SET state='superseded' WHERE policy_id=${policyId}::uuid AND state='published'`.execute(tx)
          await sql`UPDATE greenhouse_growth.measurement_policy_revision SET state='published',published_at=CURRENT_TIMESTAMP WHERE revision_id=${revisionId}::uuid`.execute(tx)
          await sql`UPDATE greenhouse_growth.measurement_policy SET published_revision_id=${revisionId}::uuid,updated_at=CURRENT_TIMESTAMP WHERE policy_id=${policyId}::uuid`.execute(tx)
        }
      }
    }

    const result: MeasurementPolicyResult={ok:true,policy:(await readRevision(tx,revisionId))!,blockingReasons:[]}

    await sql`INSERT INTO greenhouse_growth.measurement_policy_audit(policy_id,revision_id,actor_id,action,idempotency_key,request_fingerprint,result_json)
      VALUES(${policyId}::uuid,${revisionId}::uuid,${actorId},${input.action},${input.idempotencyKey}::uuid,${fingerprint},${JSON.stringify(result)}::jsonb)`.execute(tx)

    return result
  })
}
