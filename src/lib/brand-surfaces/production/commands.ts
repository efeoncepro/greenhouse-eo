import 'server-only'

/**
 * TASK-1921 — command de encolado del render de piezas de marca. Es el ÚNICO escritor del pedido: el endpoint del lane
 * App, la tool MCP y (por construcción) Nexa lo llaman igual. El `artifact-worker` sólo lee lo que este command sella.
 *
 * Orden (falla cerrado antes de escribir nada):
 *   1. flag `BRAND_RENDER_ENABLED` (OFF ⇒ 503 `render_disabled`);
 *   2. forma del pedido (zod estricto);
 *   3. autorización: interno + capability + organización de la marca;
 *   4. fuentes: cada foto/plate/logo nombrado existe como fuente de marca (nunca una ruta local);
 *   5. plan con los mappers de TASK-1919/1923 (contrato AXIS y receta aprobada) — un rechazo no crea job;
 *   6. idempotencia: el mismo pedido (intent + fuentes + versiones AXIS) de la misma organización devuelve el existente;
 *   7. una transacción: pedido + jobs sellados + fuentes adjuntas + evento + outbox.
 */

import { createHash } from 'node:crypto'

import { canonicalManifestJson, hashResolvedManifest } from '@/lib/artifact-composer/pure'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { GlitchPieceError } from '@/lib/glitch-composition'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import packageJson from '../../../../package.json'
import { SurfacePieceError } from '../types'
import { assertBrandRenderAccess } from './authz'
import { brandRenderRequestSchema, type BrandRenderActorKind, type BrandRenderRequest } from './contracts'
import { BrandRenderDisabledError, BrandRenderInputError, BrandRenderRejectedError } from './errors'
import { isBrandRenderEnabled } from './flags'
import { glitchPhotoPaths, planBrandRender, type PlannedBrandRender } from './plan'
import { attachBrandSources, readBrandSourceImageSizes, resolveBrandSources } from './sources'
import { findBrandRenderRequestByIdempotency, insertBrandRenderRequest, listBrandRenderJobs, type BrandRenderJobRecord, type BrandRenderRequestRecord } from './store'


const AXIS_PACKAGES = ['@efeoncepro/axis-tokens', '@efeoncepro/axis-ui-contracts', '@efeoncepro/axis-graphic-line', '@efeoncepro/axis-brand-assets'] as const

/**
 * Versiones de AXIS que gobiernan el pedido: las fijadas en el `package.json` versionado (exactas). Se leen del JSON
 * importado —nunca del disco—, así la función de Vercel no traza `node_modules` (ISSUE-177). Si AXIS sube, el mismo
 * intent es un pedido nuevo.
 */
export const brandRenderAxisVersions = (): Record<string, string> => {
  const deps = (packageJson as { dependencies?: Record<string, string> }).dependencies ?? {}

  return Object.fromEntries(AXIS_PACKAGES.map((name) => [name, deps[name] ?? 'desconocida']))
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export interface RequestBrandRenderResult {
  request: BrandRenderRequestRecord
  jobs: BrandRenderJobRecord[]
  /** `true` si el mismo pedido ya existía: no se creó nada. */
  idempotent: boolean
}

const parseRequest = (body: unknown): BrandRenderRequest => {
  const parsed = brandRenderRequestSchema.safeParse(body)

  if (!parsed.success) {
    throw new BrandRenderInputError('El pedido no tiene la forma del contrato.', {
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })).slice(0, 20)
    })
  }

  return parsed.data
}

const payloadOf = (request: BrandRenderRequest) => (request.family === 'glitch_edition' ? request.manifest : request.intent)

const plan = (request: BrandRenderRequest, artifactId: string, photoSizes?: Record<string, { width: number; height: number }>): PlannedBrandRender => {
  try {
    return planBrandRender(request, { artifactId, photoSizes })
  } catch (error) {
    if (error instanceof SurfacePieceError || error instanceof GlitchPieceError) {
      throw new BrandRenderRejectedError(error.message, {
        reason: error.code,
        issues: (error.issues as unknown[]).slice(0, 20).map((issue) =>
          typeof issue === 'object' && issue !== null
            ? { code: (issue as { code?: unknown }).code ?? null, path: (issue as { path?: unknown }).path ?? null, message: (issue as { message?: unknown }).message ?? null }
            : { code: null, path: null, message: String(issue) }
        )
      })
    }

    throw error
  }
}

export const requestBrandRender = async (input: {
  subject: TenantEntitlementSubject
  body: unknown
  actorKind?: BrandRenderActorKind
  env?: NodeJS.ProcessEnv
}): Promise<RequestBrandRenderResult> => {
  if (!isBrandRenderEnabled(input.env)) throw new BrandRenderDisabledError()

  const request = parseRequest(input.body)
  const grant = await assertBrandRenderAccess({ subject: input.subject, need: 'create', organizationId: request.organizationId, actorKind: input.actorKind })
  const payload = payloadOf(request)
  const axisVersions = brandRenderAxisVersions()

  // El artifactId sale del pedido (familia + contenido + fuentes): el mismo pedido da el mismo artefacto.
  const artifactId = `brand-${sha256(canonicalManifestJson({ family: request.family, payload, sources: request.sources })).slice(0, 12)}`

  // Glitch necesita el tamaño original de sus fotos ANTES de planificar (rostros y lente sobre la foto original).
  let photoSizes: Record<string, { width: number; height: number }> | undefined

  if (request.family === 'glitch_edition') {
    const photos = await resolveBrandSources({ sourcePaths: glitchPhotoPaths(request.manifest), sources: request.sources })

    photoSizes = await readBrandSourceImageSizes(photos.map((p) => ({ name: p.name, assetId: p.assetId })))
  }

  const planned = plan(request, artifactId, photoSizes)
  const sources = await resolveBrandSources({ sourcePaths: planned.sourcePaths, sources: request.sources })
  const usedSources = Object.fromEntries(sources.map((s) => [s.name, s.assetId]))

  const idempotencyKey = sha256(canonicalManifestJson({ family: request.family, payload, sources: usedSources, axis: axisVersions }))

  const existing = await findBrandRenderRequestByIdempotency(grant.organizationId, idempotencyKey)

  if (existing) return { request: existing, jobs: await listBrandRenderJobs(existing.requestId), idempotent: true }

  const jobs = planned.jobs.map((job) => {
    // Se sella la forma CANÓNICA del input (la misma que el composer emite en su manifiesto): así el drift check del
    // worker compara lo mismo con lo mismo y un campo extra del mapper nunca se lee como deriva.
    const manifest = {
      input: {
        artifactId: job.input.artifactId,
        slides: job.input.slides.map((slide) => ({ slideId: slide.slideId, contentType: slide.contentType, slots: slide.slots }))
      }
    }

    return {
      catalogName: job.catalogName,
      outputTarget: job.outputTarget,
      artifactId: job.artifactId,
      manifest,
      manifestHash: hashResolvedManifest(manifest),
      assetRequests: { kind: job.assets.kind, requests: job.assets.requests, sources: usedSources },
      // Glitch compone carruseles con fotos a sangre: el mismo techo que su taller local (`pnpm glitch:compose`).
      constraints: job.assets.kind === 'glitch' ? { maxPdfMb: 100 } : {}
    }
  })

  const result = await withGreenhousePostgresTransaction(async (client) => {
    const inserted = await insertBrandRenderRequest(client, {
      organizationId: grant.organizationId,
      family: request.family,
      idempotencyKey,
      summary: planned.summary,
      sourceAssetIds: sources.map((s) => s.assetId),
      axisVersions,
      actor: grant.actor,
      jobs
    })

    // `attached_by_user_id` es FK a client_users: un agente o el sistema no son usuarios, así que adjuntan sin autor.
    if (inserted.created) await attachBrandSources({ requestId: inserted.request.requestId, sources, actorUserId: grant.actor.kind === 'member' ? grant.actor.userId : null, client })

    return inserted
  })

  return { request: result.request, jobs: result.jobs, idempotent: !result.created }
}
