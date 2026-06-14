export type ContentFactoryLane =
  | 'post_draft_gutenberg'
  | 'landing_draft_elementor'
  | 'refresh_existing_gutenberg_post'
  | 'refresh_existing_elementor_landing'
  | 'fix_existing_public_site_module'

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

export const resolveContentFactoryValidationStatus = (
  findings: ContentFactoryValidationFinding[]
): ContentFactoryValidation['status'] => {
  if (findings.some(finding => finding.severity === 'block')) return 'block'
  if (findings.some(finding => finding.severity === 'warning')) return 'warning'

  return 'pass'
}
