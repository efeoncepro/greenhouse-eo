import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'

import type { HomeBlockId, HomeBlockOutcome, HomeSnapshotV1 } from './contract'

/**
 * Lightweight in-process metrics for the Smart Home composer.
 *
 * The full Reliability Control Plane registers `home` as a module via
 * `incidentDomainTag: 'home'`, so any `captureWithDomain(err, 'home', ...)`
 * call surfaces in the dashboard automatically. The functions below add
 * structured logs (counter-style) the cloud log analyzer can mine, and a
 * single Sentry breadcrumb per render — without growing a per-block
 * Prometheus dependency.
 *
 * Stable log fields (so log queries don't drift):
 *   event=home.block.outcome
 *   event=home.render.completed
 */

export interface RecordHomeBlockOutcomeInput {
  blockId: HomeBlockId
  outcome: HomeBlockOutcome
  durationMs: number
  cacheHit: boolean
  source?: 'precomputed' | 'realtime'
  audienceKey: string
  tenantId?: string | null
  errorMessage?: string | null
}

export const recordHomeBlockOutcome = (input: RecordHomeBlockOutcomeInput): void => {
  if (process.env.NODE_ENV === 'test') return

  const payload = {
    event: 'home.block.outcome',
    blockId: input.blockId,
    outcome: input.outcome,
    durationMs: Math.round(input.durationMs),
    cacheHit: input.cacheHit,
    source: input.source ?? 'realtime',
    audienceKey: input.audienceKey,
    tenantId: input.tenantId ?? null,
    errorMessage: input.errorMessage ?? null
  }

  if (input.outcome === 'error') {
    console.warn('[home.observability]', JSON.stringify(payload))

    return
  }

  if (input.outcome === 'degraded' || input.durationMs > 1500) {
    console.info('[home.observability]', JSON.stringify(payload))
  }
}

export interface RecordHomeRenderInput {
  durationMs: number
  audienceKey: string
  tenantId: string | null
  blocks: number
  ok: number
  degraded: number
  hidden: number
  errors: number
  cacheHits: number
  cacheMisses: number
  contractVersion: string
  /**
   * TASK-780 — Shell variant rendered for this request. Lets log analytics
   * compute V2 / legacy split per audience without joining against the flag
   * resolver state at query time.
   */
  homeVersion?: HomeVersionTag
}

export const recordHomeRender = (input: RecordHomeRenderInput): void => {
  if (process.env.NODE_ENV === 'test') return

  const confidence = input.blocks > 0 ? input.ok / input.blocks : 0

  console.info(
    '[home.observability]',
    JSON.stringify({
      event: 'home.render.completed',
      contractVersion: input.contractVersion,
      durationMs: Math.round(input.durationMs),
      audienceKey: input.audienceKey,
      tenantId: input.tenantId,
      homeVersion: input.homeVersion ?? 'v2',
      blocks: input.blocks,
      ok: input.ok,
      degraded: input.degraded,
      hidden: input.hidden,
      errors: input.errors,
      cacheHits: input.cacheHits,
      cacheMisses: input.cacheMisses,
      confidence: Math.round(confidence * 1000) / 1000
    })
  )
}

/**
 * Forward a block-level error to Sentry with `domain=home`. Returns the
 * Sentry event id when available so the renderer can surface it for
 * support workflows.
 *
 * TASK-780 — `homeVersion` tag distinguishes errors per shell variant
 * (`v2` vs `legacy`). Lets reliability dashboards compare incident rates
 * between the two during rollout, and gives the deprecation gate a hard
 * objective signal: legacy can be removed once `homeVersion=v2` errors
 * stay ≤ legacy errors for 30 consecutive days.
 */
export type HomeVersionTag = 'v2' | 'legacy'

export const captureHomeError = (
  err: unknown,
  blockId: HomeBlockId,
  extra?: Record<string, unknown>,
  homeVersion: HomeVersionTag = 'v2'
): string | undefined =>
  captureWithDomain(err, 'home', {
    extra: { blockId, homeVersion, ...extra },
    tags: { blockId, home_version: homeVersion }
  })

/**
 * Forward a shell-level error to Sentry with `domain=home`. Use for errors
 * in the page layer (composer, identity lookup, flag resolution) that are
 * not scoped to a single block.
 */
export const captureHomeShellError = (
  err: unknown,
  homeVersion: HomeVersionTag,
  extra?: Record<string, unknown>
): string | undefined =>
  captureWithDomain(err, 'home', {
    extra: { homeVersion, ...extra },
    tags: { home_version: homeVersion }
  })

export const summarizeOutcomes = (snapshot: HomeSnapshotV1) => {
  return snapshot.blocks.reduce(
    (acc, block) => {
      acc.total += 1
      acc[block.outcome] += 1

      return acc
    },
    { total: 0, ok: 0, degraded: 0, hidden: 0, error: 0 } as {
      total: number
      ok: number
      degraded: number
      hidden: number
      error: number
    }
  )
}
