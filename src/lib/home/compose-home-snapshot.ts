import 'server-only'

import { withSourceTimeout } from '@/lib/platform-health/with-source-timeout'

import {
  HOME_BLOCK_TTL_MS_DEFAULT,
  HOME_SNAPSHOT_CONTRACT_VERSION,
  type HomeAiInsightsBentoData,
  type HomeBlockEnvelope,
  type HomeClosingCountdownData,
  type HomeHeroAiData,
  type HomePulseStripData,
  type HomeRecentsRailData,
  type HomeReliabilityRibbonData,
  type HomeSnapshotV1,
  type HomeTodayInboxData,
  type HomeUiDensity
} from './contract'
import { resolveHomeBlockFlags } from './flags'
import { HOME_BLOCK_REGISTRY, isBlockEligible, type HomeBlockDefinition, type HomeLoaderContext } from './registry'
import { loadHomeAiInsightsBento } from './loaders/load-ai-insights-bento'
import { loadHomeCalendarRail } from './loaders/load-calendar-rail'
import { loadHomeClosingCountdown } from './loaders/load-closing-countdown'
import { loadHomeHeroAi } from './loaders/load-hero-ai'
import { loadHomePulseStrip } from './loaders/load-pulse-strip'
import { loadHomeRecentsRail } from './loaders/load-recents-rail'
import { loadHomeReliabilityRibbon } from './loaders/load-reliability-ribbon'
import { loadHomeTodayInbox } from './loaders/load-today-inbox'
import { captureHomeError, recordHomeBlockOutcome, recordHomeRender } from './observability'

import type { HomeAudienceKey, TenantEntitlements } from '@/lib/entitlements/types'

export interface ComposeHomeSnapshotInput {
  userId: string
  tenantId: string | null
  tenantType: 'client' | 'efeonce_internal'
  audienceKey: HomeAudienceKey
  roleCodes: string[]
  primaryRoleCode: string
  entitlements: TenantEntitlements
  density: HomeUiDensity
  defaultView: string | null
  optedOutOfV2: boolean
  firstName: string
  fullName?: string | null
  avatarUrl?: string | null
  tenantLabel?: string | null
}

const ALL_LOADERS = {
  'hero-ai': loadHomeHeroAi,
  'pulse-strip': loadHomePulseStrip,
  'today-inbox': loadHomeTodayInbox,
  'closing-countdown': loadHomeClosingCountdown,
  'ai-insights-bento': loadHomeAiInsightsBento,
  'recents-rail': loadHomeRecentsRail,
  'reliability-ribbon': loadHomeReliabilityRibbon,
  'calendar-rail': loadHomeCalendarRail
} as const

type LoaderFor<TBlockId extends keyof typeof ALL_LOADERS> = (typeof ALL_LOADERS)[TBlockId]

const buildHiddenEnvelope = (block: HomeBlockDefinition, fetchedAtMs: number): HomeBlockEnvelope => ({
  blockId: block.blockId,
  slot: block.slot,
  outcome: 'hidden',
  data: null,
  fetchedAtMs,
  ttlMs: 0
})

export const composeHomeSnapshot = async (input: ComposeHomeSnapshotInput): Promise<HomeSnapshotV1> => {
  const startedAt = Date.now()
  const nowIso = new Date(startedAt).toISOString()

  const ctx: HomeLoaderContext = {
    userId: input.userId,
    tenantId: input.tenantId,
    tenantType: input.tenantType,
    audienceKey: input.audienceKey,
    roleCodes: input.roleCodes,
    primaryRoleCode: input.primaryRoleCode,
    entitlements: input.entitlements,
    defaultView: input.defaultView,
    now: nowIso
  }

  const flagsResolution = await resolveHomeBlockFlags({
    userId: input.userId,
    tenantId: input.tenantId,
    roleCodes: input.roleCodes
  })

  const eligibleBlocks = HOME_BLOCK_REGISTRY.filter(block => isBlockEligible(block, input.audienceKey, input.entitlements))

  const cacheHits = 0
  const cacheMisses = eligibleBlocks.length

  const envelopes = await Promise.all(
    eligibleBlocks.map(async (block): Promise<HomeBlockEnvelope> => {
      const fetchedAtMs = Date.now()

      if (!flagsResolution.enabled[block.blockId]) {
        recordHomeBlockOutcome({
          blockId: block.blockId,
          outcome: 'hidden',
          durationMs: 0,
          cacheHit: false,
          source: block.precomputed ? 'precomputed' : 'realtime',
          audienceKey: input.audienceKey,
          tenantId: input.tenantId,
          errorMessage: 'kill_switch'
        })

        return buildHiddenEnvelope(block, fetchedAtMs)
      }

      const loader = ALL_LOADERS[block.blockId as keyof typeof ALL_LOADERS]

      if (!loader) {
        return buildHiddenEnvelope(block, fetchedAtMs)
      }

      const wrapped = await withSourceTimeout<unknown>(
        async () => {
          if (block.blockId === 'hero-ai') {
            const heroLoader = loader as LoaderFor<'hero-ai'>

            return heroLoader(ctx, {
              firstName: input.firstName,
              fullName: input.fullName,
              avatarUrl: input.avatarUrl,
              tenantLabel: input.tenantLabel
            }) as Promise<HomeHeroAiData>
          }

          const sharedLoader = loader as (ctx: HomeLoaderContext) => Promise<unknown>

          return sharedLoader(ctx)
        },
        { source: `home.${block.blockId}`, timeoutMs: block.timeoutMs }
      )

      if (wrapped.status === 'ok') {
        recordHomeBlockOutcome({
          blockId: block.blockId,
          outcome: 'ok',
          durationMs: wrapped.durationMs,
          cacheHit: false,
          source: block.precomputed ? 'precomputed' : 'realtime',
          audienceKey: input.audienceKey,
          tenantId: input.tenantId
        })

        return {
          blockId: block.blockId,
          slot: block.slot,
          outcome: 'ok',
          data: wrapped.value,
          fetchedAtMs,
          ttlMs: block.cacheTtlMs ?? HOME_BLOCK_TTL_MS_DEFAULT
        } as HomeBlockEnvelope
      }

      if (wrapped.status === 'timeout') {
        recordHomeBlockOutcome({
          blockId: block.blockId,
          outcome: 'degraded',
          durationMs: wrapped.durationMs,
          cacheHit: false,
          source: block.precomputed ? 'precomputed' : 'realtime',
          audienceKey: input.audienceKey,
          tenantId: input.tenantId,
          errorMessage: 'timeout'
        })

        return {
          blockId: block.blockId,
          slot: block.slot,
          outcome: 'degraded',
          data: null,
          degradedSources: [`home.${block.blockId}`],
          degradedSourceLabel: block.blockId,
          fetchedAtMs,
          ttlMs: 5_000,
          errorMessage: wrapped.error ?? 'timeout'
        } as HomeBlockEnvelope
      }

      // status === 'error'
      captureHomeError(new Error(wrapped.error ?? 'home block error'), block.blockId, {
        audience: input.audienceKey,
        tenantId: input.tenantId
      })

      recordHomeBlockOutcome({
        blockId: block.blockId,
        outcome: 'error',
        durationMs: wrapped.durationMs,
        cacheHit: false,
        source: block.precomputed ? 'precomputed' : 'realtime',
        audienceKey: input.audienceKey,
        tenantId: input.tenantId,
        errorMessage: wrapped.error
      })

      return {
        blockId: block.blockId,
        slot: block.slot,
        outcome: 'error',
        data: null,
        degradedSources: [`home.${block.blockId}`],
        degradedSourceLabel: block.blockId,
        fetchedAtMs,
        ttlMs: 5_000,
        errorMessage: wrapped.error ?? 'unknown'
      } as HomeBlockEnvelope
    })
  )

  const counts = envelopes.reduce(
    (acc, envelope) => {
      acc[envelope.outcome] += 1

      return acc
    },
    { ok: 0, degraded: 0, hidden: 0, error: 0 }
  )

  const totalEligible = envelopes.length
  const confidence = totalEligible > 0 ? counts.ok / totalEligible : 1

  const durationMs = Date.now() - startedAt

  recordHomeRender({
    durationMs,
    audienceKey: input.audienceKey,
    tenantId: input.tenantId,
    blocks: totalEligible,
    ok: counts.ok,
    degraded: counts.degraded,
    hidden: counts.hidden,
    errors: counts.error,
    cacheHits,
    cacheMisses,
    contractVersion: HOME_SNAPSHOT_CONTRACT_VERSION
  })

  return {
    contractVersion: HOME_SNAPSHOT_CONTRACT_VERSION,
    audience: input.audienceKey,
    roleCodes: input.roleCodes,
    density: input.density,
    defaultView: input.defaultView,
    optedOutOfV2: input.optedOutOfV2,
    blocks: envelopes,
    meta: {
      renderedAtMs: startedAt,
      composerVersion: 'home-composer.v1',
      confidence: Math.round(confidence * 1000) / 1000,
      cacheHits,
      cacheMisses,
      durationMs
    }
  }
}

export type { HomeAiInsightsBentoData, HomeClosingCountdownData, HomeHeroAiData, HomePulseStripData, HomeRecentsRailData, HomeReliabilityRibbonData, HomeTodayInboxData }
