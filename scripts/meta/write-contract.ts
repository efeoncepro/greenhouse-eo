import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

import { z } from 'zod'

import { EFEONCE_META_PROFILE as p, MetaReadError } from './client'

export const WRITE_COMMANDS = {
  'campaigns create': 'campaign_create', 'adsets create': 'adset_create',
  'creatives create': 'creative_create', 'ads create': 'ad_create',
  'posts publish': 'facebook_post_publish', 'photos publish': 'facebook_photo_publish',
  'instagram container create': 'instagram_container_create', 'instagram publish': 'instagram_publish',
  'comments reply': 'facebook_comment_reply', 'instagram comments reply': 'instagram_comment_reply'
} as const
export type MetaWriteOperation = typeof WRITE_COMMANDS[keyof typeof WRITE_COMMANDS]
export type MetaWritePlan = {
  operation: MetaWriteOperation; params: Record<string, unknown>; targetId?: string; parentId?: string
  dependencyReceipt?: string; dependencyDigest?: string
}
export type MetaCreatedObject = { id: string; postId?: string }

const id = z.string().regex(/^\d{1,40}$/)
const postId = z.string().regex(new RegExp(`^${p.pageId}_[0-9]{1,40}$`))
const commentId = z.string().regex(/^[0-9]{1,40}(?:_[0-9]{1,40})?$/)
const text = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v) && !/\bEAA[A-Za-z0-9]{30,}|Bearer\s+\S{30,}/i.test(v), 'unsafe_text')

export const publicUrl = z.string().max(2048).refine(value => {
  try {
    const u = new URL(value)
    const host = u.hostname.replace(/^\[|\]$/g, '')

    return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && !u.port &&
      host.includes('.') && !isIP(host) && !/(^|\.)(localhost|local|internal)$/.test(host)
  } catch { return false }
}, 'public_https_url_without_credentials_query_or_fragment_required')
const paused = z.literal('PAUSED').default('PAUSED')
const budget = z.number().int().positive().max(1_000_000_000_000)

const targeting = z.object({
  geo_locations: z.object({ countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(30) }).strict(),
  age_min: z.number().int().min(18).max(65).optional(), age_max: z.number().int().min(18).max(65).optional(),
}).strict().refine(v => (v.age_min ?? 18) <= (v.age_max ?? 65), 'invalid_age_range')

const schemas = {
  campaign_create: z.object({ name: text(250), objective: z.enum(['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION']), special_ad_categories: z.array(z.string().regex(/^[A-Z_]{1,64}$/)).max(10).default([]), buying_type: z.literal('AUCTION').default('AUCTION'), status: paused }).strict(),
  adset_create: z.object({
    name: text(250), campaign_id: id, status: paused, targeting,
    optimization_goal: z.enum(['IMPRESSIONS', 'REACH', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'LEAD_GENERATION', 'OFFSITE_CONVERSIONS', 'POST_ENGAGEMENT', 'THRUPLAY', 'CONVERSATIONS']),
    billing_event: z.literal('IMPRESSIONS').default('IMPRESSIONS'), bid_strategy: z.literal('LOWEST_COST_WITHOUT_CAP').default('LOWEST_COST_WITHOUT_CAP'),
    daily_budget: budget.optional(), lifetime_budget: budget.optional(),
    start_time: z.string().datetime({ offset: true }).optional(), end_time: z.string().datetime({ offset: true }).optional(),
    promoted_object: z.object({ pixel_id: z.literal(p.pixelId).optional(), page_id: z.literal(p.pageId).optional(), custom_event_type: z.string().regex(/^[A-Z_]{1,64}$/).optional() }).strict().optional()
  }).strict().refine(v => Number(v.daily_budget !== undefined) + Number(v.lifetime_budget !== undefined) === 1, 'one_explicit_budget_required')
    .refine(v => !v.lifetime_budget || Boolean(v.end_time), 'lifetime_budget_requires_end_time')
    .refine(v => !v.start_time || !v.end_time || Date.parse(v.start_time) < Date.parse(v.end_time), 'invalid_schedule')
    .refine(v => v.optimization_goal !== 'OFFSITE_CONVERSIONS' || v.promoted_object?.pixel_id === p.pixelId, 'own_pixel_required')
    .refine(v => v.optimization_goal !== 'LEAD_GENERATION' || v.promoted_object?.page_id === p.pageId, 'own_page_required'),
  creative_create: z.object({ name: text(250), object_story_id: postId }).strict(),
  ad_create: z.object({ name: text(250), adset_id: id, creative: z.object({ creative_id: id }).strict(), status: paused }).strict(),
  facebook_post_publish: z.object({ message: text(5000), link: publicUrl.optional() }).strict(),
  facebook_photo_publish: z.object({ url: publicUrl, caption: text(2200).optional() }).strict(),
  instagram_container_create: z.discriminatedUnion('media_type', [
    z.object({ media_type: z.literal('IMAGE'), image_url: publicUrl, caption: text(2200).optional(), alt_text: text(1000).optional() }).strict(),
    z.object({ media_type: z.literal('REELS'), video_url: publicUrl, caption: text(2200).optional(), share_to_feed: z.boolean().default(true) }).strict()
  ]),
  instagram_publish: z.object({ creation_receipt: z.string().min(1).max(4096) }).strict(),
  facebook_comment_reply: z.object({ post_id: postId, comment_id: commentId, message: text(2000) }).strict(),
  instagram_comment_reply: z.object({ media_id: id, comment_id: id, message: text(2200) }).strict()
}

export function buildMetaWritePlan(operation: MetaWriteOperation, input: unknown): MetaWritePlan {
  if (!Object.hasOwn(schemas, operation)) throw new MetaReadError('unknown_write_operation', 2)
  const parsed = schemas[operation].safeParse(input)

  if (!parsed.success) throw new MetaReadError('invalid_write_input', 2)
  const params = { ...parsed.data } as Record<string, unknown>
  const plan: MetaWritePlan = { operation, params }

  if (operation === 'facebook_post_publish' || operation === 'facebook_photo_publish') params.published = true
  if (operation === 'instagram_container_create' && params.media_type === 'IMAGE') delete params.media_type

  if (operation === 'instagram_publish') {
    plan.dependencyReceipt = String(params.creation_receipt)
    plan.params = {}
  }

  if (operation === 'facebook_comment_reply' || operation === 'instagram_comment_reply') {
    plan.targetId = String(params.comment_id)
    plan.parentId = String(params.post_id ?? params.media_id)
    delete params.comment_id; delete params.post_id; delete params.media_id
  }

  return plan
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]))

  return value
}

export function writePlanDigest(plan: MetaWritePlan): string {
  return createHash('sha256').update(JSON.stringify(canonical({ profile: p, ...plan }))).digest('hex')
}

export function writeCatalog() {
  return {
    commands: Object.entries(WRITE_COMMANDS).map(([command, operation]) => ({ command, operation, input: '--input private-payload.json', default: 'validate_and_preview_only', execution: '--apply --confirm <planDigest> --receipt <private-receipt.json>' })),
    verification: 'write verify --receipt <private-receipt.json>',
    scope: 'Efeonce fixed assets. Campaign/adset/ad PAUSED; creative uses own Page post. FB text/link/photo; IG image/reel; own-comment replies.',
    boundaries: ['No activation, arbitrary Graph writes, delete, DM, carousel or Facebook video in this version.', 'No automatic retry of POST. Unknown outcome requires reconciliation; local receipt does not provide provider idempotency.', 'Publishing a payload requires its own operator authorization; --confirm binds reviewed bytes and is not a substitute for that authorization.'],
    inputs: {
      campaign_create: ['name', 'objective', 'special_ad_categories?'], adset_create: ['name', 'campaign_id', 'optimization_goal', 'targeting.geo_locations.countries', 'daily_budget OR lifetime_budget', 'end_time for lifetime', 'promoted_object when required'],
      creative_create: ['name', 'object_story_id (own Page post)'], ad_create: ['name', 'adset_id', 'creative.creative_id'],
      facebook_post_publish: ['message', 'link?'], facebook_photo_publish: ['url', 'caption?'],
      instagram_container_create: ['media_type IMAGE + image_url OR REELS + video_url', 'caption?', 'alt_text? (IMAGE)', 'share_to_feed? (REELS)'],
      instagram_publish: ['creation_receipt (verified own container receipt)'],
      facebook_comment_reply: ['post_id', 'comment_id', 'message'], instagram_comment_reply: ['media_id', 'comment_id', 'message']
    }
  }
}
