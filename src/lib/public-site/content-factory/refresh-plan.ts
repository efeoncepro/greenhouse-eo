import { createHash } from 'node:crypto'

import type {
  ContentFactoryPostBlockEditability,
  ContentFactoryPostDeepInspection,
  ContentFactoryPostDeepInspectionBlock,
  ContentFactoryRefreshPlan,
  ContentFactoryRefreshPlanChangeCandidate
} from './contracts'

export const CONTENT_FACTORY_REFRESH_PLAN_CONTRACT_VERSION = 'contentFactoryRefreshPlan.v1' as const

export type PrepareGutenbergRefreshPlanOptions = {
  generatedAt?: string
  objective?: string
  maxEditableTextCandidates?: number
}

const DEFAULT_OBJECTIVE =
  'Plan guided refresh candidates for an existing Gutenberg post without mutating WordPress.'

const TEXT_EDITABLE_BLOCKS = new Set(['core/paragraph', 'core/heading', 'core/list-item', 'core/quote', 'core/pullquote'])
const STRUCTURE_BLOCKS_TO_PRESERVE = new Set(['yoast-seo/table-of-contents', 'core/list', 'core/separator'])

const hashJson = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export const buildRefreshPlanSourceFingerprint = (inspection: ContentFactoryPostDeepInspection) =>
  hashJson({
    post: {
      id: inspection.post.id,
      modified: inspection.post.modified,
      contentLength: inspection.post.contentLength
    },
    seo: inspection.seo,
    blocks: inspection.blocks.map(block => ({
      path: block.path,
      blockName: block.blockName,
      fingerprint: block.fingerprint
    }))
  })

const snippet = (text: string, limit = 180) => {
  const normalized = text.replace(/\s+/g, ' ').trim()

  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized
}

const riskForEditability = (editability: ContentFactoryPostBlockEditability): 'low' | 'medium' | 'high' => {
  if (editability === 'safe_text_edit') return 'low'
  if (editability === 'safe_attrs_edit' || editability === 'preserve_structure') return 'medium'

  return 'high'
}

const textCandidate = (block: ContentFactoryPostDeepInspectionBlock): ContentFactoryRefreshPlanChangeCandidate => ({
  operation: 'update_text',
  targetPath: block.path,
  nativeKind: 'blockName',
  key: block.blockName,
  fingerprint: block.fingerprint,
  editability: block.editability,
  currentText: snippet(block.text),
  rationale: 'Text block can be refined after a human/agent brief while preserving the native Gutenberg block type.',
  risk: riskForEditability(block.editability),
  guardrails: [
    'Match both path and fingerprint before applying a future patch.',
    'Preserve blockName and surrounding structure.',
    'Patch a draft/private clone first; never patch the published source directly.'
  ]
})

const preserveCandidate = (block: ContentFactoryPostDeepInspectionBlock): ContentFactoryRefreshPlanChangeCandidate => ({
  operation: 'preserve',
  targetPath: block.path,
  nativeKind: 'blockName',
  key: block.blockName,
  fingerprint: block.fingerprint,
  editability: block.editability,
  currentText: snippet(block.text),
  rationale: 'Structural/editor block should be preserved unless the refresh brief explicitly changes document structure.',
  risk: 'medium',
  guardrails: [
    'Do not remove or reorder without a reviewed structure diff.',
    'Preserve child blocks unless the target path is explicitly listed in a future patch plan.'
  ]
})

const mediaCandidate = (block: ContentFactoryPostDeepInspectionBlock): ContentFactoryRefreshPlanChangeCandidate => ({
  operation: 'reconcile_media',
  targetPath: block.path,
  nativeKind: 'media',
  key: block.blockName,
  fingerprint: block.fingerprint,
  editability: block.editability,
  rationale: 'Media block must preserve or explicitly reconcile WordPress attachment id, rendered src, dimensions and alt text.',
  risk: block.risks.length > 0 ? 'medium' : 'low',
  guardrails: [
    'Do not invent or replace media IDs.',
    'Preserve the existing asset unless the refresh brief explicitly requests a replacement.',
    'If replaced later, upload/reconcile media first and patch only a draft/private clone.'
  ]
})

const linkCandidate = (
  link: ContentFactoryPostDeepInspection['links'][number],
  index: number
): ContentFactoryRefreshPlanChangeCandidate => ({
  operation: 'review_link',
  targetPath: `links.${index}`,
  nativeKind: 'link',
  key: link.href,
  currentText: snippet(link.text),
  rationale:
    link.kind === 'external_url'
      ? 'External links should be reviewed for source quality, UTM hygiene and current destination before refresh.'
      : 'Internal anchors should be preserved with the heading outline unless the section title changes.',
  risk: link.kind === 'external_url' ? 'medium' : 'low',
  guardrails: [
    'Do not rewrite URLs without explicit source validation.',
    'If heading text changes later, regenerate or validate matching internal anchors.'
  ]
})

const seoCandidates = (inspection: ContentFactoryPostDeepInspection): ContentFactoryRefreshPlanChangeCandidate[] => [
  {
    operation: 'review_seo',
    targetPath: 'seo.yoastTitle',
    nativeKind: 'seo',
    key: 'yoastTitle',
    currentText: inspection.seo.yoastTitle,
    rationale: 'SEO title may be refreshed after the new editorial angle is approved.',
    risk: 'medium',
    guardrails: ['Keep the current title unless a reviewed refresh brief improves keyword/positioning intent.']
  },
  {
    operation: 'review_seo',
    targetPath: 'seo.yoastDescription',
    nativeKind: 'seo',
    key: 'yoastDescription',
    currentText: inspection.seo.yoastDescription,
    rationale: 'SEO description may be refreshed after validating the target search intent and CTA.',
    risk: 'medium',
    guardrails: ['Do not change index policy or canonical behavior in this plan-only lane.']
  }
]

const collectChangeCandidates = (
  inspection: ContentFactoryPostDeepInspection,
  options: Required<Pick<PrepareGutenbergRefreshPlanOptions, 'maxEditableTextCandidates'>>
) => {
  const textBlocks = inspection.blocks
    .filter(block => block.editability === 'safe_text_edit' && TEXT_EDITABLE_BLOCKS.has(block.blockName) && block.text.trim())
    .slice(0, options.maxEditableTextCandidates)
    .map(textCandidate)

  const structuralBlocks = inspection.blocks
    .filter(block => STRUCTURE_BLOCKS_TO_PRESERVE.has(block.blockName))
    .map(preserveCandidate)

  const mediaBlocks = inspection.blocks.filter(block => block.media).map(mediaCandidate)
  const linkBlocks = inspection.links.map(linkCandidate)

  return [...seoCandidates(inspection), ...textBlocks, ...structuralBlocks, ...mediaBlocks, ...linkBlocks]
}

export const prepareGutenbergRefreshPlan = (
  inspection: ContentFactoryPostDeepInspection,
  options: PrepareGutenbergRefreshPlanOptions = {}
): ContentFactoryRefreshPlan => {
  if (inspection.contractVersion !== 'contentFactoryPostDeepInspection.v1') {
    throw new Error('content_factory_refresh_plan_requires_deep_inspection_v1')
  }

  if (inspection.post.type !== 'post') {
    throw new Error('content_factory_refresh_plan_requires_wordpress_post')
  }

  const blockers = inspection.mediaIssues.map(issue => ({
    code: `media_issue_${issue.code}`,
    message: `${issue.path}: ${issue.message}`
  }))

  const inspectOnlyWithContent = inspection.blocks.filter(
    block => block.editability === 'inspect_only' && block.text.trim() && block.blockName !== 'core/freeform'
  )

  for (const block of inspectOnlyWithContent) {
    blockers.push({
      code: 'inspect_only_block_has_content',
      message: `${block.path}: ${block.blockName} has content and needs a dedicated serializer policy before refresh.`
    })
  }

  const warnings: ContentFactoryRefreshPlan['readiness']['warnings'] = []

  if (inspection.post.status === 'publish') {
    warnings.push({
      code: 'published_source_plan_only',
      message: 'Source post is published. Future changes must target a draft/private clone, never the published source.'
    })
  }

  if (inspection.summary.nonEmptyFreeformCount > 0) {
    warnings.push({
      code: 'legacy_freeform_content_present',
      message: 'Non-empty core/freeform blocks exist; preserve them unless a migration task owns conversion.'
    })
  }

  const maxEditableTextCandidates = options.maxEditableTextCandidates ?? 80

  return {
    contractVersion: CONTENT_FACTORY_REFRESH_PLAN_CONTRACT_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: 'plan_only',
    sendsWordPressWrite: false,
    objective: options.objective ?? DEFAULT_OBJECTIVE,
    target: {
      wordpressPostId: inspection.post.id,
      url: inspection.post.permalink,
      slug: inspection.post.slug,
      status: inspection.post.status,
      editorModel: 'gutenberg_blocks',
      sourceScannedAt: inspection.scannedAt,
      sourceModified: inspection.post.modified,
      sourceFingerprint: buildRefreshPlanSourceFingerprint(inspection)
    },
    sourceInspection: {
      contractVersion: inspection.contractVersion,
      summary: inspection.summary,
      headingOutlineCount: inspection.headingOutline.length,
      mediaIssueCount: inspection.mediaIssues.length
    },
    safetyPolicy: {
      writesWordPressContent: false,
      publishesContent: false,
      modifiesPublishedSource: false,
      clearsCache: false,
      createsBackup: false,
      sendsSecretsToOutput: false
    },
    readiness: {
      status: blockers.length > 0 ? 'blocked' : 'ready_for_brief',
      blockers,
      warnings
    },
    changeCandidates: collectChangeCandidates(inspection, { maxEditableTextCandidates }),
    rollback: {
      strategy: 'no_runtime_change_plan_only',
      notes:
        'This refresh plan is a local artifact only. It performs no WordPress mutation, so rollback is deleting the artifact.'
    }
  }
}

export const summarizeGutenbergRefreshPlan = (plan: ContentFactoryRefreshPlan) => ({
  contractVersion: plan.contractVersion,
  generatedAt: plan.generatedAt,
  mode: plan.mode,
  sendsWordPressWrite: plan.sendsWordPressWrite,
  objective: plan.objective,
  target: plan.target,
  sourceInspection: plan.sourceInspection,
  readiness: plan.readiness,
  safetyPolicy: plan.safetyPolicy,
  candidateCounts: plan.changeCandidates.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.operation] = (counts[candidate.operation] ?? 0) + 1

    return counts
  }, {}),
  topChangeCandidates: plan.changeCandidates.slice(0, 80),
  rollback: plan.rollback
})
