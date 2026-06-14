import { signPublicSiteBridgeRequest } from '../bridge-signing'
import type {
  ContentFactoryExistingPostRefreshDraftPlan,
  ContentFactoryPatchPlan
} from './contracts'

export const CONTENT_FACTORY_EXISTING_POST_REFRESH_DRAFT_PLAN_CONTRACT_VERSION =
  'contentFactoryExistingPostRefreshDraftPlan.v1' as const

export const PUBLIC_SITE_BRIDGE_EXISTING_POST_REFRESH_CONTRACT_VERSION =
  'greenhouse-wp-bridge-existing-post-refresh.v1' as const

export type PrepareExistingPostRefreshDraftPlanOptions = {
  generatedAt?: string
  manifestId?: string
  status?: 'draft' | 'private'
  slug?: string
  actor?: string
  environment?: string
  secret?: string
  timestamp?: number
  requestId?: string
}

const ROUTE = '/greenhouse-wp-bridge/v1/drafts/from-existing-post'
const SYNTHETIC_DRY_RUN_SECRET = 'content-factory-existing-post-refresh-dry-run-secret'

const redactHeaders = (headers: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase().includes('signature') ? `${value.slice(0, 18)}...redacted` : value
    ])
  )

const compactTimestamp = (iso: string) => iso.replace(/[-:T.Z]/g, '').slice(0, 14)

const safeIdPart = (value: string) => value.replace(/[^a-zA-Z0-9._:-]/g, '-').replace(/-+/g, '-')

const buildManifestId = (patchPlan: ContentFactoryPatchPlan, generatedAt: string) =>
  safeIdPart(
    `content-factory.refresh.post-${patchPlan.target.wordpressPostId}.${patchPlan.target.slug}.${compactTimestamp(generatedAt)}`
  ).slice(0, 120)

const buildDraftSlug = (patchPlan: ContentFactoryPatchPlan, generatedAt: string) =>
  safeIdPart(`${patchPlan.target.slug}-gh-refresh-${compactTimestamp(generatedAt)}`).toLowerCase()

export const prepareExistingPostRefreshDraftPlan = (
  patchPlan: ContentFactoryPatchPlan,
  options: PrepareExistingPostRefreshDraftPlanOptions = {}
): ContentFactoryExistingPostRefreshDraftPlan => {
  if (patchPlan.contractVersion !== 'contentFactoryPatchPlan.v1') {
    throw new Error('content_factory_refresh_draft_plan_requires_patch_plan_v1')
  }

  if (patchPlan.readiness.status !== 'ready_for_draft_clone') {
    throw new Error('content_factory_refresh_draft_plan_requires_ready_patch_plan')
  }

  if (patchPlan.operations.some(operation => operation.status !== 'ready')) {
    throw new Error('content_factory_refresh_draft_plan_requires_ready_operations')
  }

  const unsupportedOperation = patchPlan.operations.find(operation => operation.operation !== 'update_text')

  if (unsupportedOperation) {
    throw new Error(`content_factory_refresh_draft_plan_unsupported_operation:${unsupportedOperation.operation}`)
  }

  const operations = patchPlan.operations.map(operation => {
    if (!operation.fingerprint || !operation.proposedText) {
      throw new Error(`content_factory_refresh_draft_plan_missing_operation_fields:${operation.targetPath}`)
    }

    return {
      operation: 'update_text' as const,
      targetPath: operation.targetPath,
      expectedFingerprint: operation.fingerprint,
      proposedText: operation.proposedText,
      rationale: operation.rationale
    }
  })

  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const greenhouseManifestId = options.manifestId ?? buildManifestId(patchPlan, generatedAt)
  const status = options.status ?? 'draft'

  const body: ContentFactoryExistingPostRefreshDraftPlan['bridgeRequest']['body'] = {
    contractVersion: PUBLIC_SITE_BRIDGE_EXISTING_POST_REFRESH_CONTRACT_VERSION,
    greenhouseManifestId,
    sourcePostId: patchPlan.target.wordpressPostId,
    sourceFingerprint: patchPlan.target.sourceFingerprint,
    status,
    slug: options.slug ?? buildDraftSlug(patchPlan, generatedAt),
    operations
  }

  const bodyJson = JSON.stringify(body)

  const signed = signPublicSiteBridgeRequest({
    method: 'POST',
    route: ROUTE,
    body: bodyJson,
    secret: options.secret ?? SYNTHETIC_DRY_RUN_SECRET,
    actor: options.actor ?? 'content-factory-refresh-draft-plan',
    environment: options.environment ?? 'local-dry-run',
    timestamp: options.timestamp,
    requestId: options.requestId
  })

  return {
    contractVersion: CONTENT_FACTORY_EXISTING_POST_REFRESH_DRAFT_PLAN_CONTRACT_VERSION,
    generatedAt,
    mode: 'dry_run',
    sendsWordPressWrite: false,
    modifiesPublishedSource: false,
    sourcePatchPlan: {
      contractVersion: patchPlan.contractVersion,
      generatedAt: patchPlan.generatedAt,
      wordpressPostId: patchPlan.target.wordpressPostId,
      sourceFingerprint: patchPlan.target.sourceFingerprint,
      operationCount: operations.length
    },
    bridgeRequest: {
      contractVersion: PUBLIC_SITE_BRIDGE_EXISTING_POST_REFRESH_CONTRACT_VERSION,
      method: 'POST',
      route: ROUTE,
      status,
      greenhouseManifestId,
      body,
      signedHeaders: redactHeaders(signed.headers),
      canonicalRequestPreview: signed.canonicalRequest
    },
    rolloutPreconditions: [
      {
        code: 'bridge_endpoint_deployed',
        status: 'pending',
        notes: 'greenhouse-wp-bridge must expose the from-existing-post draft refresh endpoint before send.'
      },
      {
        code: 'bridge_writes_enabled_window',
        status: 'pending',
        notes: 'GREENHOUSE_WP_BRIDGE_WRITES_ENABLED must be enabled only for an approved short draft/private refresh window.'
      },
      {
        code: 'signed_request_secret_available',
        status: 'pending',
        notes: 'Use PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF at send time; this dry-run uses a synthetic secret.'
      },
      {
        code: 'source_revalidation_required',
        status: 'satisfied',
        notes: 'The bridge request carries sourceFingerprint plus per-operation block fingerprints and must revalidate both before creating a clone.'
      },
      {
        code: 'draft_private_only',
        status: 'satisfied',
        notes: 'Plan targets WordPress status draft/private and never publish.'
      },
      {
        code: 'human_review_required',
        status: 'pending',
        notes: 'A human must review the generated draft preview before any publish path exists.'
      }
    ],
    rollback: {
      strategy: 'trash_refresh_draft_by_manifest_id',
      notes: `If a future send creates this draft, rollback should trash only the Greenhouse-owned draft identified by ${greenhouseManifestId}.`
    }
  }
}

export const summarizeExistingPostRefreshDraftPlan = (plan: ContentFactoryExistingPostRefreshDraftPlan) => ({
  contractVersion: plan.contractVersion,
  generatedAt: plan.generatedAt,
  mode: plan.mode,
  sendsWordPressWrite: plan.sendsWordPressWrite,
  modifiesPublishedSource: plan.modifiesPublishedSource,
  sourcePatchPlan: plan.sourcePatchPlan,
  bridgeRequest: {
    contractVersion: plan.bridgeRequest.contractVersion,
    method: plan.bridgeRequest.method,
    route: plan.bridgeRequest.route,
    status: plan.bridgeRequest.status,
    greenhouseManifestId: plan.bridgeRequest.greenhouseManifestId,
    body: {
      ...plan.bridgeRequest.body,
      operations: plan.bridgeRequest.body.operations.map(operation => ({
        operation: operation.operation,
        targetPath: operation.targetPath,
        expectedFingerprint: operation.expectedFingerprint,
        proposedText: operation.proposedText,
        rationale: operation.rationale
      }))
    },
    signedHeaders: plan.bridgeRequest.signedHeaders,
    canonicalRequestPreview: plan.bridgeRequest.canonicalRequestPreview
  },
  rolloutPreconditions: plan.rolloutPreconditions,
  rollback: plan.rollback
})
