import {
  PUBLIC_SITE_BRIDGE_DRAFT_CONTRACT_VERSION,
  signPublicSiteBridgeRequest
} from '../bridge-signing'
import type { ContentFactoryDraftSmokePlan, ContentFactoryGeneratedDraft } from './contracts'
import { validateGeneratedGutenbergDraft } from './gutenberg-validator'

export type PrepareGutenbergDraftSmokePlanOptions = {
  generatedAt?: string
  manifestId?: string
  status?: 'draft' | 'private'
  actor?: string
  environment?: string
  secret?: string
  timestamp?: number
  requestId?: string
}

const DRAFTS_ROUTE = '/greenhouse-wp-bridge/v1/drafts'
const SYNTHETIC_DRY_RUN_SECRET = 'content-factory-smoke-plan-dry-run-secret'

const redactHeaders = (headers: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase().includes('signature') ? `${value.slice(0, 18)}...redacted` : value
    ])
  )

const buildManifestId = (draft: ContentFactoryGeneratedDraft) =>
  `content-factory.${draft.lane}.${draft.slug}`.replace(/[^a-zA-Z0-9._:-]/g, '-')

export const prepareGutenbergDraftSmokePlan = (
  draft: ContentFactoryGeneratedDraft,
  options: PrepareGutenbergDraftSmokePlanOptions = {}
): ContentFactoryDraftSmokePlan => {
  const validation = validateGeneratedGutenbergDraft(draft)

  if (draft.draft.kind !== 'gutenberg_post') {
    throw new Error('content_factory_smoke_plan_requires_gutenberg_post')
  }

  if (validation.status === 'block') {
    throw new Error('content_factory_smoke_plan_validation_blocked')
  }

  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const greenhouseManifestId = options.manifestId ?? buildManifestId(draft)
  const status = options.status ?? 'draft'

  const body: ContentFactoryDraftSmokePlan['bridgeRequest']['body'] = {
    contractVersion: PUBLIC_SITE_BRIDGE_DRAFT_CONTRACT_VERSION,
    greenhouseManifestId,
    postType: 'post' as const,
    status,
    title: draft.title,
    slug: draft.slug,
    content: draft.draft.postContent,
    excerpt: draft.excerpt,
    seo: draft.seo,
    attribution: draft.attribution
  }

  const bodyJson = JSON.stringify(body)

  const signed = signPublicSiteBridgeRequest({
    method: 'POST',
    route: DRAFTS_ROUTE,
    body: bodyJson,
    secret: options.secret ?? SYNTHETIC_DRY_RUN_SECRET,
    actor: options.actor ?? 'content-factory-smoke-plan',
    environment: options.environment ?? 'local-dry-run',
    timestamp: options.timestamp,
    requestId: options.requestId
  })

  return {
    contractVersion: 'contentFactoryDraftSmokePlan.v1',
    generatedAt,
    mode: 'dry_run',
    sendsWordPressWrite: false,
    sourceDraft: {
      title: draft.title,
      slug: draft.slug,
      lane: draft.lane,
      draftKind: draft.draft.kind
    },
    validation,
    bridgeRequest: {
      contractVersion: PUBLIC_SITE_BRIDGE_DRAFT_CONTRACT_VERSION,
      method: 'POST',
      route: DRAFTS_ROUTE,
      postType: 'post',
      status,
      greenhouseManifestId,
      body,
      signedHeaders: redactHeaders(signed.headers),
      canonicalRequestPreview: signed.canonicalRequest
    },
    rolloutPreconditions: [
      {
        code: 'bridge_writes_enabled_window',
        status: 'pending',
        notes: 'GREENHOUSE_WP_BRIDGE_WRITES_ENABLED must be enabled only for an approved short draft/private smoke window.'
      },
      {
        code: 'signed_request_secret_available',
        status: 'pending',
        notes: 'Use PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF at send time; this dry-run uses a synthetic secret.'
      },
      {
        code: 'draft_private_only',
        status: 'satisfied',
        notes: 'Plan targets WordPress status draft/private and never publish.'
      },
      {
        code: 'human_review_required',
        status: 'pending',
        notes: 'A human must review the validation result and payload before any --send path is used.'
      }
    ],
    rollback: {
      strategy: 'trash_smoke_draft_by_manifest_id',
      notes: `If a future smoke creates this draft, rollback should trash only the Greenhouse-owned draft identified by ${greenhouseManifestId}.`
    }
  }
}
