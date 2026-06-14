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

export type GutenbergHeadingOutlineItem = {
  level: number
  text: string
  index: number
}

export type GutenbergBlogpostCompositionProfile = {
  contractVersion: 'gutenbergBlogpostCompositionProfile.v1'
  key: 'efeonce_blogpost'
  description: string
  requiredBlocks: string[]
  recommendedBlocks: string[]
  tableOfContentsBlock: 'yoast-seo/table-of-contents'
  minHeadingCount: number
  minLevel2HeadingCount: number
  minStructuredBlockCount: number
  maxHeadingJump: number
  disallowedGeneratedBlocks: string[]
  mediaBlocks: string[]
  enrichmentBlocks: string[]
}

export type GutenbergBlockPatternCatalogEntry = {
  blockName: string
  role:
    | 'structure'
    | 'body'
    | 'navigation'
    | 'media'
    | 'conversion'
    | 'layout'
    | 'legacy'
    | 'third_party'
  generationPolicy: 'allowed' | 'recommended' | 'requires_source_asset' | 'inspect_only'
  refreshPolicy: 'preserve' | 'patch_carefully' | 'replace_with_review' | 'inspect_only'
  description: string
  requires?: string[]
  constraints: string[]
  example?: string
}

export type GutenbergBlockPatternCatalog = {
  contractVersion: 'gutenbergBlockPatternCatalog.v1'
  key: 'efeonce_gutenberg_blogpost'
  generatedAt?: string
  source: {
    recipePath: string
    validatorProfile: 'EFEONCE_BLOGPOST_COMPOSITION_PROFILE'
    observedRuntimeSample: string
  }
  entries: GutenbergBlockPatternCatalogEntry[]
}

export type ContentFactoryPostBlockEditability =
  | 'safe_text_edit'
  | 'safe_attrs_edit'
  | 'media_requires_reconcile'
  | 'preserve_structure'
  | 'inspect_only'

export type ContentFactoryPostDeepInspectionBlock = {
  path: string
  depth: number
  blockName: string
  attrs: Record<string, unknown>
  text: string
  innerBlockCount: number
  fingerprint: string
  editability: ContentFactoryPostBlockEditability
  risks: string[]
  media?: {
    id?: number | null
    attachmentUrl?: string | false | null
    renderedSrc?: string | null
    alt?: string
    width?: number | string | null
    height?: number | string | null
  }
  href?: string | null
}

export type ContentFactoryPostDeepInspection = {
  contractVersion: 'contentFactoryPostDeepInspection.v1'
  scannedAt: string
  source: 'wp_cli_parse_blocks'
  safetyPolicy: {
    writesWordPressContent: false
    publishesContent: false
    clearsCache: false
    createsBackup: false
    sendsSecretsToOutput: false
  }
  post: {
    id: number
    type: string
    status: string
    slug: string
    title: string
    modified: string
    permalink: string
    contentLength: number
  }
  seo: {
    yoastTitle: string
    yoastDescription: string
    primaryCategory: string
  }
  summary: {
    totalBlocks: number
    topLevelBlocks: number
    counts: Record<string, number>
    maxDepth: number
    linkCount: number
    nonEmptyFreeformCount: number
    mediaIssueCount: number
  }
  headingOutline: Array<{
    path: string
    level: number
    text: string
  }>
  blocks: ContentFactoryPostDeepInspectionBlock[]
  links: Array<{
    href: string
    text: string
    kind: 'internal_anchor' | 'internal_url' | 'external_url' | 'unknown'
  }>
  mediaIssues: Array<{
    path: string
    blockName: string
    code: 'attachment_url_missing' | 'rendered_src_missing' | 'attachment_render_mismatch'
    message: string
  }>
  editabilityLegend: Record<ContentFactoryPostBlockEditability, string>
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
