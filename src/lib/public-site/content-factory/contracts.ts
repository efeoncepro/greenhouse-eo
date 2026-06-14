export type ContentFactoryLane =
  | 'post_draft_gutenberg'
  | 'landing_draft_elementor'
  | 'refresh_existing_gutenberg_post'
  | 'refresh_existing_elementor_landing'
  | 'fix_existing_public_site_module'

export type ContentFactoryBrief = {
  contractVersion: 'contentFactoryBrief.v1'
  intent: 'create' | 'refresh' | 'fix'
  lane: ContentFactoryLane
  objective: string
  audience: string
  target?: {
    wordpressPostId?: number
    url?: string
    moduleId?: string
    editorModel?: 'gutenberg_blocks' | 'elementor_document' | 'unknown'
  }
  offer?: string
  serviceKey?: string
  campaignId?: string
  hubspotCampaignId?: string
  primaryKeyword?: string
  secondaryKeywords?: string[]
  tone: 'efeonce_expert' | 'educational' | 'conversion' | 'thought_leadership'
  locale: 'es-CL' | 'en-US' | 'pt-BR'
  cta: {
    kind: 'hubspot_form' | 'hubspot_meeting' | 'external_url' | 'greenhouse_capture'
    target: string
  }
}

export type ContentFactoryGeneratedDraft = {
  contractVersion: 'contentFactoryGeneratedDraft.v1'
  intent: 'create' | 'refresh' | 'fix'
  lane: ContentFactoryLane
  sourceBriefId?: string
  sourceInspectionId?: string
  sourceWordPressPostId?: number
  title: string
  slug: string
  excerpt?: string
  seo: {
    title: string
    description: string
    indexPolicy: 'index' | 'noindex'
  }
  draft:
    | {
        kind: 'gutenberg_post'
        postContent: string
        observedBlocks: string[]
      }
    | {
        kind: 'elementor_landing'
        manifest: unknown
        widgets: string[]
      }
  attribution?: {
    campaignId?: string
    hubspotCampaignId?: string
    utm?: Record<string, string>
  }
}

export type ContentFactoryValidationFinding = {
  severity: 'info' | 'warning' | 'block'
  code: string
  message: string
  path?: string
}

export type ContentFactoryValidation = {
  contractVersion: 'contentFactoryValidation.v1'
  status: 'pass' | 'warning' | 'block'
  findings: ContentFactoryValidationFinding[]
  summary?: Record<string, unknown>
}

export type ContentFactoryDraftSmokePlan = {
  contractVersion: 'contentFactoryDraftSmokePlan.v1'
  generatedAt: string
  mode: 'dry_run'
  sendsWordPressWrite: false
  sourceDraft: {
    title: string
    slug: string
    lane: ContentFactoryLane
    draftKind: 'gutenberg_post' | 'elementor_landing'
  }
  validation: ContentFactoryValidation
  bridgeRequest: {
    contractVersion: 'greenhouse-wp-bridge-draft.v1'
    method: 'POST'
    route: '/greenhouse-wp-bridge/v1/drafts'
    postType: 'post' | 'page' | 'landing'
    status: 'draft' | 'private'
    greenhouseManifestId: string
    body: {
      contractVersion: 'greenhouse-wp-bridge-draft.v1'
      greenhouseManifestId: string
      postType: 'post' | 'page' | 'landing'
      status: 'draft' | 'private'
      title: string
      slug: string
      content: string
      excerpt?: string
      seo?: ContentFactoryGeneratedDraft['seo']
      attribution?: ContentFactoryGeneratedDraft['attribution']
    }
    signedHeaders: Record<string, string>
    canonicalRequestPreview: string
  }
  rolloutPreconditions: Array<{
    code: string
    status: 'pending' | 'satisfied'
    notes: string
  }>
  rollback: {
    strategy: 'trash_smoke_draft_by_manifest_id'
    notes: string
  }
}

export const resolveContentFactoryValidationStatus = (
  findings: ContentFactoryValidationFinding[]
): ContentFactoryValidation['status'] => {
  if (findings.some(finding => finding.severity === 'block')) return 'block'
  if (findings.some(finding => finding.severity === 'warning')) return 'warning'

  return 'pass'
}
