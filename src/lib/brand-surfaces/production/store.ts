import 'server-only'

/**
 * TASK-1921 — store de la cola de render de piezas de marca (`greenhouse_brand`). Único escritor de sus tablas: el
 * command de encolado y el consumer del `artifact-worker` pasan por aquí; nadie hace UPDATE suelto.
 *
 * Mecanismo (el de TASK-1846): claim atómico con `FOR UPDATE SKIP LOCKED`, lease que vence y fence token que sube en
 * cada claim — finalizar con un token viejo no escribe nada, así un worker lento no pisa al que lo reemplazó. Cada
 * transición deja su evento append-only y, al cerrar, su evento de outbox en la MISMA transacción.
 */

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import {
  BRAND_RENDER_NON_RETRYABLE_FAILURES,
  isBrandRenderJobTransitionAllowed,
  type BrandRenderActor,
  type BrandRenderCatalogName,
  type BrandRenderFailureCode,
  type BrandRenderFamily,
  type BrandRenderJobState,
  type BrandRenderOutputTarget,
  type BrandRenderRequestState
} from './contracts'
import { BrandRenderFenceLostError } from './errors'
import { publishBrandRenderJobCompleted, publishBrandRenderJobFailed, publishBrandRenderRequested } from './events'

type DbClient = Pick<PoolClient, 'query'>

const withClient = async <T>(client: DbClient | undefined, fn: (c: DbClient) => Promise<T>): Promise<T> =>
  client ? fn(client) : withGreenhousePostgresTransaction((c) => fn(c))

export const DEFAULT_BRAND_RENDER_LEASE_MINUTES = 15

/** Cuota por organización en el claim (misma razón que Insights: una org no monopoliza el Job compartido). */
export const DEFAULT_BRAND_RENDER_ORG_CONCURRENCY = 2

export interface BrandRenderRequestRecord {
  requestId: string
  organizationId: string
  family: BrandRenderFamily
  idempotencyKey: string
  summary: Record<string, unknown>
  sourceAssetIds: string[]
  axisVersions: Record<string, string>
  state: BrandRenderRequestState
  requestedByKind: BrandRenderActor['kind']
  requestedByUserId: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BrandRenderJobRecord {
  jobId: string
  requestId: string
  organizationId: string
  catalogName: BrandRenderCatalogName
  outputTarget: BrandRenderOutputTarget
  artifactId: string
  manifestHash: string
  constraints: Record<string, unknown>
  deadline: string | null
  state: BrandRenderJobState
  failureCode: BrandRenderFailureCode | null
  failureDetail: string | null
  attempts: number
  maxAttempts: number
  leaseExpiresAt: string | null
  fenceToken: number
  outputAssetIds: string[]
  outputReport: Record<string, unknown> | null
  provenance: Record<string, unknown> | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

const REQUEST_COLUMNS = `request_id, organization_id, family, idempotency_key, request_summary, source_asset_ids, axis_versions,
  state, requested_by_kind, requested_by_user_id, started_at, finished_at, created_at, updated_at`

const JOB_COLUMNS = `job_id, request_id, organization_id, catalog_name, output_target, artifact_id, manifest_hash, constraints,
  deadline, state, failure_code, failure_detail, attempts, max_attempts, lease_expires_at, fence_token, output_asset_ids,
  output_report, provenance, started_at, finished_at, created_at, updated_at`

const iso = (value: unknown): string | null => (value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : null)

const mapRequest = (row: Record<string, unknown>): BrandRenderRequestRecord => ({
  requestId: row.request_id as string,
  organizationId: row.organization_id as string,
  family: row.family as BrandRenderFamily,
  idempotencyKey: row.idempotency_key as string,
  summary: (row.request_summary ?? {}) as Record<string, unknown>,
  sourceAssetIds: (row.source_asset_ids ?? []) as string[],
  axisVersions: (row.axis_versions ?? {}) as Record<string, string>,
  state: row.state as BrandRenderRequestState,
  requestedByKind: row.requested_by_kind as BrandRenderActor['kind'],
  requestedByUserId: (row.requested_by_user_id as string | null) ?? null,
  startedAt: iso(row.started_at),
  finishedAt: iso(row.finished_at),
  createdAt: iso(row.created_at)!,
  updatedAt: iso(row.updated_at)!
})

const mapJob = (row: Record<string, unknown>): BrandRenderJobRecord => ({
  jobId: row.job_id as string,
  requestId: row.request_id as string,
  organizationId: row.organization_id as string,
  catalogName: row.catalog_name as BrandRenderCatalogName,
  outputTarget: row.output_target as BrandRenderOutputTarget,
  artifactId: row.artifact_id as string,
  manifestHash: row.manifest_hash as string,
  constraints: (row.constraints ?? {}) as Record<string, unknown>,
  deadline: iso(row.deadline),
  state: row.state as BrandRenderJobState,
  failureCode: (row.failure_code as BrandRenderFailureCode | null) ?? null,
  failureDetail: (row.failure_detail as string | null) ?? null,
  attempts: Number(row.attempts ?? 0),
  maxAttempts: Number(row.max_attempts ?? 3),
  leaseExpiresAt: iso(row.lease_expires_at),
  fenceToken: Number(row.fence_token ?? 0),
  outputAssetIds: (row.output_asset_ids ?? []) as string[],
  outputReport: (row.output_report as Record<string, unknown> | null) ?? null,
  provenance: (row.provenance as Record<string, unknown> | null) ?? null,
  startedAt: iso(row.started_at),
  finishedAt: iso(row.finished_at),
  createdAt: iso(row.created_at)!,
  updatedAt: iso(row.updated_at)!
})

// ─── Encolado ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface NewBrandRenderJob {
  catalogName: BrandRenderCatalogName
  outputTarget: BrandRenderOutputTarget
  artifactId: string
  manifest: Record<string, unknown>
  manifestHash: string
  assetRequests: Record<string, unknown>
  constraints: Record<string, unknown>
}

export const findBrandRenderRequestByIdempotency = async (organizationId: string, idempotencyKey: string, client?: DbClient) => {
  const rows = client
    ? (await client.query<Record<string, unknown>>(`SELECT ${REQUEST_COLUMNS} FROM greenhouse_brand.brand_render_requests WHERE organization_id = $1 AND idempotency_key = $2`, [organizationId, idempotencyKey])).rows
    : await runGreenhousePostgresQuery<Record<string, unknown>>(`SELECT ${REQUEST_COLUMNS} FROM greenhouse_brand.brand_render_requests WHERE organization_id = $1 AND idempotency_key = $2`, [organizationId, idempotencyKey])

  return rows[0] ? mapRequest(rows[0]) : null
}

/**
 * Inserta el pedido, sus jobs, su evento y el outbox en la transacción del caller. Si otro pedido idéntico ganó la
 * carrera (índice único de idempotencia), devuelve el existente sin crear nada.
 */
export const insertBrandRenderRequest = async (
  client: DbClient,
  input: {
    organizationId: string
    family: BrandRenderFamily
    idempotencyKey: string
    summary: Record<string, unknown>
    sourceAssetIds: string[]
    axisVersions: Record<string, string>
    actor: BrandRenderActor
    jobs: NewBrandRenderJob[]
  }
): Promise<{ request: BrandRenderRequestRecord; jobs: BrandRenderJobRecord[]; created: boolean }> => {
  const inserted = await client.query<Record<string, unknown>>(
    `INSERT INTO greenhouse_brand.brand_render_requests
       (organization_id, family, idempotency_key, request_summary, source_asset_ids, axis_versions, requested_by_kind, requested_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (organization_id, idempotency_key) DO NOTHING
     RETURNING ${REQUEST_COLUMNS}`,
    [
      input.organizationId,
      input.family,
      input.idempotencyKey,
      JSON.stringify(input.summary),
      input.sourceAssetIds,
      JSON.stringify(input.axisVersions),
      input.actor.kind,
      input.actor.userId
    ]
  )

  if (!inserted.rows[0]) {
    const existing = (await findBrandRenderRequestByIdempotency(input.organizationId, input.idempotencyKey, client))!

    return { request: existing, jobs: await listBrandRenderJobs(existing.requestId, client), created: false }
  }

  const request = mapRequest(inserted.rows[0])
  const jobs: BrandRenderJobRecord[] = []

  for (const job of input.jobs) {
    const row = await client.query<Record<string, unknown>>(
      `INSERT INTO greenhouse_brand.brand_render_jobs
         (request_id, organization_id, catalog_name, output_target, artifact_id, manifest, manifest_hash, asset_requests, constraints)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${JOB_COLUMNS}`,
      [
        request.requestId,
        input.organizationId,
        job.catalogName,
        job.outputTarget,
        job.artifactId,
        JSON.stringify(job.manifest),
        job.manifestHash,
        JSON.stringify(job.assetRequests),
        JSON.stringify(job.constraints)
      ]
    )

    jobs.push(mapJob(row.rows[0]!))
  }

  await client.query(
    `INSERT INTO greenhouse_brand.brand_render_events (request_id, organization_id, from_state, to_state, detail, actor_kind)
     VALUES ($1, $2, NULL, 'pending', $3, $4)`,
    [request.requestId, input.organizationId, JSON.stringify({ jobs: jobs.map((j) => j.jobId), family: input.family }), input.actor.kind]
  )

  await publishBrandRenderRequested(client as never, {
    version: 1,
    requestId: request.requestId,
    organizationId: input.organizationId,
    family: input.family,
    jobs: jobs.map((j) => ({ jobId: j.jobId, catalogName: j.catalogName, manifestHash: j.manifestHash })),
    actorKind: input.actor.kind
  })

  return { request, jobs, created: true }
}

// ─── Lectura ────────────────────────────────────────────────────────────────────────────────────────────────────

export const listBrandRenderJobs = async (requestId: string, client?: DbClient): Promise<BrandRenderJobRecord[]> => {
  const sql = `SELECT ${JOB_COLUMNS} FROM greenhouse_brand.brand_render_jobs WHERE request_id = $1 ORDER BY catalog_name`
  const rows = client ? (await client.query<Record<string, unknown>>(sql, [requestId])).rows : await runGreenhousePostgresQuery<Record<string, unknown>>(sql, [requestId])

  return rows.map(mapJob)
}

export const getBrandRenderRequest = async (organizationId: string, requestId: string): Promise<BrandRenderRequestRecord | null> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${REQUEST_COLUMNS} FROM greenhouse_brand.brand_render_requests WHERE organization_id = $1 AND request_id = $2`,
    [organizationId, requestId]
  )

  return rows[0] ? mapRequest(rows[0]) : null
}

export const listBrandRenderRequests = async (organizationId: string, limit = 20): Promise<BrandRenderRequestRecord[]> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${REQUEST_COLUMNS} FROM greenhouse_brand.brand_render_requests WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [organizationId, Math.min(Math.max(limit, 1), 100)]
  )

  return rows.map(mapRequest)
}

/** El manifiesto sellado y los pedidos de assets de un job (sólo el worker los lee). */
export const getBrandRenderJobPayload = async (jobId: string): Promise<{ manifest: Record<string, unknown>; assetRequests: Record<string, unknown> } | null> => {
  const rows = await runGreenhousePostgresQuery<{ manifest: Record<string, unknown>; asset_requests: Record<string, unknown> }>(
    `SELECT manifest, asset_requests FROM greenhouse_brand.brand_render_jobs WHERE job_id = $1`,
    [jobId]
  )

  return rows[0] ? { manifest: rows[0].manifest, assetRequests: rows[0].asset_requests } : null
}

// ─── Claim y transiciones (sólo el worker) ────────────────────────────────────────────────────────────────────

const recordEvent = (client: DbClient, job: { jobId: string; requestId: string; organizationId: string }, from: string | null, to: string, detail: Record<string, unknown>, actor: string) =>
  client.query(
    `INSERT INTO greenhouse_brand.brand_render_events (job_id, request_id, organization_id, from_state, to_state, detail, actor_kind)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [job.jobId, job.requestId, job.organizationId, from, to, JSON.stringify(detail), actor]
  )

const claimRow = async (client: DbClient, jobId: string, from: string, leaseMinutes: number): Promise<BrandRenderJobRecord> => {
  // El fence SUBE en cada claim: cualquier ejecución anterior queda con un token viejo y su cierre no escribe nada.
  const updated = await client.query<Record<string, unknown>>(
    `UPDATE greenhouse_brand.brand_render_jobs
        SET state = 'running', started_at = now(), attempts = attempts + 1,
            lease_expires_at = now() + make_interval(mins => $2), fence_token = fence_token + 1, updated_at = now()
      WHERE job_id = $1
      RETURNING ${JOB_COLUMNS}`,
    [jobId, leaseMinutes]
  )

  const job = mapJob(updated.rows[0]!)

  await recordEvent(client, job, from, 'running', { claim: 'skip_locked', reclaimed: from === 'running' }, 'worker')
  await client.query(
    `UPDATE greenhouse_brand.brand_render_requests SET state = 'running', started_at = COALESCE(started_at, now()), updated_at = now()
      WHERE request_id = $1 AND state = 'pending'`,
    [job.requestId]
  )

  return job
}

export const claimNextBrandRenderJob = async (input?: {
  agingMinutes?: number
  leaseMinutes?: number
  orgConcurrency?: number
  client?: DbClient
}): Promise<BrandRenderJobRecord | null> =>
  withClient(input?.client, async (client) => {
    const candidate = await client.query<{ job_id: string; state: string }>(
      `SELECT job_id, state
         FROM greenhouse_brand.brand_render_jobs AS j
        WHERE (j.state = 'queued' OR (j.state = 'running' AND j.lease_expires_at IS NOT NULL AND j.lease_expires_at < now()))
          AND (j.deadline IS NULL OR j.deadline > now())
          AND (
            SELECT count(*) FROM greenhouse_brand.brand_render_jobs AS activos
             WHERE activos.organization_id = j.organization_id AND activos.state = 'running'
               AND activos.lease_expires_at IS NOT NULL AND activos.lease_expires_at > now()
          ) < $2
        ORDER BY LEAST(COALESCE(j.deadline, 'infinity'::timestamptz), j.created_at + make_interval(mins => $1)) ASC, j.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
      [input?.agingMinutes ?? 30, input?.orgConcurrency ?? DEFAULT_BRAND_RENDER_ORG_CONCURRENCY]
    )

    const row = candidate.rows[0]

    return row ? claimRow(client, row.job_id, row.state, input?.leaseMinutes ?? DEFAULT_BRAND_RENDER_LEASE_MINUTES) : null
  })

/** Replay dirigido (`RENDER_JOB_ID`): sólo un job en cola o con lease vencido. */
export const claimBrandRenderJobById = async (jobId: string, input?: { leaseMinutes?: number; client?: DbClient }): Promise<BrandRenderJobRecord | null> =>
  withClient(input?.client, async (client) => {
    const candidate = await client.query<{ job_id: string; state: string }>(
      `SELECT job_id, state FROM greenhouse_brand.brand_render_jobs
        WHERE job_id = $1 AND (state = 'queued' OR (state = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < now()))
        FOR UPDATE SKIP LOCKED`,
      [jobId]
    )

    const row = candidate.rows[0]

    return row ? claimRow(client, row.job_id, row.state, input?.leaseMinutes ?? DEFAULT_BRAND_RENDER_LEASE_MINUTES) : null
  })

/** Estado del pedido derivado de sus jobs (partial_failed cuando uno salió y otro no: decir otra cosa mentiría). */
const rollupRequestState = async (client: DbClient, requestId: string): Promise<void> => {
  const counts = await client.query<{ state: string; n: number }>(
    `SELECT state, count(*)::int AS n FROM greenhouse_brand.brand_render_jobs WHERE request_id = $1 GROUP BY state`,
    [requestId]
  )

  const by = new Map(counts.rows.map((r) => [r.state, Number(r.n)]))
  const total = [...by.values()].reduce((a, b) => a + b, 0)
  const completed = by.get('completed') ?? 0
  const cancelled = by.get('cancelled') ?? 0
  const failed = (by.get('failed') ?? 0) + (by.get('dead_letter') ?? 0)

  if (total - completed - cancelled - failed > 0) return

  const state = cancelled === total ? 'cancelled' : completed === total ? 'completed' : completed > 0 ? 'partial_failed' : 'failed'

  await client.query(
    `UPDATE greenhouse_brand.brand_render_requests SET state = $2, finished_at = now(), updated_at = now(),
            cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END
      WHERE request_id = $1`,
    [requestId, state]
  )
}

const transitionJob = (input: {
  jobId: string
  toState: BrandRenderJobState
  fenceToken?: number
  set: string
  params: unknown[]
  detail: Record<string, unknown>
  client?: DbClient
}): Promise<BrandRenderJobRecord> =>
  withClient(input.client, async (client) => {
    const current = await client.query<Record<string, unknown>>(`SELECT ${JOB_COLUMNS} FROM greenhouse_brand.brand_render_jobs WHERE job_id = $1 FOR UPDATE`, [input.jobId])
    const row = current.rows[0]

    if (!row) throw new Error(`El job ${input.jobId} no existe.`)

    const from = row.state as BrandRenderJobState

    if (!isBrandRenderJobTransitionAllowed(from, input.toState)) throw new Error(`Transición ilegal del job: ${from} → ${input.toState}.`)
    if (input.fenceToken !== undefined && Number(row.fence_token ?? 0) !== input.fenceToken) throw new BrandRenderFenceLostError(input.jobId, input.fenceToken)

    const updated = await client.query<Record<string, unknown>>(
      `UPDATE greenhouse_brand.brand_render_jobs SET state = $2, updated_at = now(), ${input.set} WHERE job_id = $1 RETURNING ${JOB_COLUMNS}`,
      [input.jobId, input.toState, ...input.params]
    )

    const job = mapJob(updated.rows[0]!)

    await recordEvent(client, job, from, input.toState, input.detail, 'worker')
    await rollupRequestState(client, job.requestId)

    const payload = {
      version: 1 as const,
      requestId: job.requestId,
      jobId: job.jobId,
      organizationId: job.organizationId,
      catalogName: job.catalogName,
      state: job.state,
      attempts: job.attempts,
      failureCode: job.failureCode,
      outputAssetIds: job.outputAssetIds
    }

    if (job.state === 'completed') await publishBrandRenderJobCompleted(client as never, payload)
    else if (job.state === 'dead_letter') await publishBrandRenderJobFailed(client as never, payload)

    return job
  })

export const markBrandRenderJobCompleted = (input: {
  jobId: string
  fenceToken: number
  outputAssetIds: string[]
  outputReport: Record<string, unknown>
  provenance: Record<string, unknown>
  client?: DbClient
}): Promise<BrandRenderJobRecord> =>
  transitionJob({
    client: input.client,
    jobId: input.jobId,
    fenceToken: input.fenceToken,
    toState: 'completed',
    set: `finished_at = now(), lease_expires_at = NULL, output_asset_ids = $3, output_report = $4, provenance = $5`,
    params: [input.outputAssetIds, JSON.stringify(input.outputReport), JSON.stringify(input.provenance)],
    detail: { outputAssetIds: input.outputAssetIds }
  })

/** Un fallo reintentable vuelve a la cola (hasta agotar intentos); uno terminal va a `dead_letter`. */
export const markBrandRenderJobFailed = async (input: {
  jobId: string
  fenceToken?: number
  failureCode: BrandRenderFailureCode
  failureDetail: string
  client?: DbClient
}): Promise<BrandRenderJobRecord> => {
  const rows = await runGreenhousePostgresQuery<{ attempts: number; max_attempts: number }>(
    `SELECT attempts, max_attempts FROM greenhouse_brand.brand_render_jobs WHERE job_id = $1`,
    [input.jobId]
  )

  const exhausted = rows[0] ? Number(rows[0].attempts) >= Number(rows[0].max_attempts) : true
  const terminal = exhausted || BRAND_RENDER_NON_RETRYABLE_FAILURES.has(input.failureCode)

  return transitionJob({
    client: input.client,
    jobId: input.jobId,
    fenceToken: input.fenceToken,
    toState: terminal ? 'dead_letter' : 'queued',
    set: terminal
      ? `finished_at = now(), lease_expires_at = NULL, failure_code = $3, failure_detail = $4`
      : `lease_expires_at = NULL, failure_code = $3, failure_detail = $4`,
    params: [input.failureCode, input.failureDetail.slice(0, 2000)],
    detail: { failureCode: input.failureCode, terminal }
  })
}

/** ¿Hay trabajo para el despachador? (cola o lease vencido; sin tocar nada). */
export const hasDispatchableBrandRenderJob = async (): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT count(*)::int AS n FROM greenhouse_brand.brand_render_jobs
      WHERE (state = 'queued' OR (state = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < now()))
        AND (deadline IS NULL OR deadline > now())`
  )

  return Number(rows[0]?.n ?? 0) > 0
}
