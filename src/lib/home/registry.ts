import 'server-only'

import type { HomeAudienceKey, TenantEntitlements } from '@/lib/entitlements/types'

import type { HomeBlockId, HomeSlotKey } from './contract'

/**
 * Declarative Home Block Registry.
 *
 * Every block of the Smart Home is described here:
 *   - which audiences see it
 *   - which capability gate to honor (in addition to the audience filter)
 *   - which slot it occupies
 *   - how long the data may live in cache
 *   - what to render while loading
 *   - whether the block is precomputed (Pulse Strip) or realtime (Inbox)
 *
 * The composer iterates this list, the renderer maps slots to React
 * components by `componentKey`. Adding a new block is one entry here +
 * one loader + one component — never a fork in JSX.
 */

export interface HomeLoaderContext {
  userId: string
  tenantId: string | null
  tenantType: 'client' | 'efeonce_internal'
  audienceKey: HomeAudienceKey
  roleCodes: string[]
  primaryRoleCode: string
  entitlements: TenantEntitlements
  /** Snapshot of `client_users.home_default_view` (or null if unset). */
  defaultView: string | null
  /** ISO timestamp passed in for tests so output is deterministic. */
  now: string
}

export interface HomeBlockDefinition {
  blockId: HomeBlockId
  slot: HomeSlotKey
  audiences: ReadonlyArray<HomeAudienceKey>
  /** Optional capability gate evaluated against `entitlements`. */
  requiresCapability?: (entitlements: TenantEntitlements) => boolean
  /** Sort priority within a slot (lower renders first). */
  priority: number
  /** Maximum lifetime in the in-process cache. */
  cacheTtlMs: number
  /** Per-source timeout passed to `withSourceTimeout`. */
  timeoutMs: number
  /** TRUE when the data is materialized by a cron — composer reads from snapshot table. */
  precomputed: boolean
  /** UI fallback when data is null. */
  fallback: 'skeleton' | 'hide' | 'degraded-card'
  /** Renderer key — maps to a React component in `HomeBlockRenderer.tsx`. */
  componentKey: HomeBlockId
}

export const HOME_BLOCK_REGISTRY: ReadonlyArray<HomeBlockDefinition> = [
  {
    blockId: 'hero-ai',
    slot: 'hero',
    audiences: ['admin', 'internal', 'hr', 'finance', 'collaborator', 'client'],
    priority: 0,
    cacheTtlMs: 30_000,
    timeoutMs: 1_500,
    precomputed: false,
    fallback: 'skeleton',
    componentKey: 'hero-ai'
  } satisfies HomeBlockDefinition,
  {
    blockId: 'pulse-strip',
    slot: 'pulse',
    audiences: ['admin', 'internal', 'hr', 'finance', 'collaborator', 'client'],
    priority: 10,
    cacheTtlMs: 30_000,
    timeoutMs: 2_000,
    precomputed: true,
    fallback: 'skeleton',
    componentKey: 'pulse-strip'
  } satisfies HomeBlockDefinition,
  {
    blockId: 'closing-countdown',
    slot: 'main',
    audiences: ['admin', 'internal', 'finance', 'hr'],
    requiresCapability: entitlements =>
      entitlements.moduleKeys.includes('finance') || entitlements.moduleKeys.includes('hr'),
    priority: 20,
    cacheTtlMs: 60_000,
    timeoutMs: 2_000,
    precomputed: false,
    fallback: 'hide',
    componentKey: 'closing-countdown'
  } satisfies HomeBlockDefinition,
  {
    blockId: 'today-inbox',
    slot: 'main',
    audiences: ['admin', 'internal', 'hr', 'finance', 'collaborator'],
    priority: 30,
    cacheTtlMs: 15_000,
    timeoutMs: 3_000,
    precomputed: false,
    fallback: 'skeleton',
    componentKey: 'today-inbox'
  } satisfies HomeBlockDefinition,
  {
    blockId: 'ai-insights-bento',
    slot: 'main',
    audiences: ['admin', 'internal', 'finance', 'hr', 'client'],
    priority: 40,
    cacheTtlMs: 60_000,
    timeoutMs: 2_500,
    precomputed: false,
    fallback: 'skeleton',
    componentKey: 'ai-insights-bento'
  } satisfies HomeBlockDefinition,
  {
    blockId: 'recents-rail',
    slot: 'aside',
    audiences: ['admin', 'internal', 'hr', 'finance', 'collaborator', 'client'],
    priority: 50,
    cacheTtlMs: 30_000,
    timeoutMs: 1_500,
    precomputed: false,
    fallback: 'hide',
    componentKey: 'recents-rail'
  } satisfies HomeBlockDefinition,
  {
    blockId: 'reliability-ribbon',
    slot: 'aside',
    audiences: ['admin', 'internal'],
    priority: 60,
    cacheTtlMs: 30_000,
    timeoutMs: 2_000,
    precomputed: false,
    fallback: 'hide',
    componentKey: 'reliability-ribbon'
  } satisfies HomeBlockDefinition
]

export const isBlockEligible = (
  block: HomeBlockDefinition,
  audience: HomeAudienceKey,
  entitlements: TenantEntitlements
): boolean => {
  if (!block.audiences.includes(audience)) return false
  if (block.requiresCapability && !block.requiresCapability(entitlements)) return false

  return true
}

export const getRegisteredBlock = (blockId: HomeBlockId): HomeBlockDefinition | undefined =>
  HOME_BLOCK_REGISTRY.find(block => block.blockId === blockId)

export const HOME_SLOT_ORDER: ReadonlyArray<HomeSlotKey> = ['hero', 'pulse', 'main', 'aside', 'footer']
