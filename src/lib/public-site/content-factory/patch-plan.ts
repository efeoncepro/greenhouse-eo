import type {
  ContentFactoryPatchBrief,
  ContentFactoryPatchBriefChange,
  ContentFactoryPatchPlan,
  ContentFactoryPatchPlanOperation,
  ContentFactoryRefreshPlan,
  ContentFactoryRefreshPlanChangeCandidate
} from './contracts'

export const CONTENT_FACTORY_PATCH_BRIEF_CONTRACT_VERSION = 'contentFactoryPatchBrief.v1' as const
export const CONTENT_FACTORY_PATCH_PLAN_CONTRACT_VERSION = 'contentFactoryPatchPlan.v1' as const

export type PrepareGutenbergPatchPlanOptions = {
  generatedAt?: string
}

const OPERATION_COMPATIBILITY: Record<
  ContentFactoryPatchBriefChange['operation'],
  ContentFactoryRefreshPlanChangeCandidate['operation'][]
> = {
  update_text: ['update_text'],
  review_seo: ['review_seo'],
  review_link: ['review_link'],
  preserve: ['preserve', 'reconcile_media']
}

const normalizeText = (value: string | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const isValidHttpUrl = (value: string | undefined) => {
  if (!value) return false

  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const candidateKey = (candidate: Pick<ContentFactoryRefreshPlanChangeCandidate, 'operation' | 'targetPath'>) =>
  `${candidate.operation}:${candidate.targetPath}`

const buildCandidateIndex = (refreshPlan: ContentFactoryRefreshPlan) => {
  const index = new Map<string, ContentFactoryRefreshPlanChangeCandidate>()

  for (const candidate of refreshPlan.changeCandidates) {
    index.set(candidateKey(candidate), candidate)
  }

  return index
}

const findCandidate = (
  refreshPlan: ContentFactoryRefreshPlan,
  index: Map<string, ContentFactoryRefreshPlanChangeCandidate>,
  change: ContentFactoryPatchBriefChange
) => {
  const compatibleOperations = OPERATION_COMPATIBILITY[change.operation]

  for (const operation of compatibleOperations) {
    const candidate = index.get(`${operation}:${change.targetPath}`)

    if (candidate) return candidate
  }

  return refreshPlan.changeCandidates.find(
    candidate => candidate.targetPath === change.targetPath && compatibleOperations.includes(candidate.operation)
  )
}

const validateChangeAgainstCandidate = (
  change: ContentFactoryPatchBriefChange,
  candidate: ContentFactoryRefreshPlanChangeCandidate | undefined
) => {
  const blockers: ContentFactoryPatchPlanOperation['blockers'] = []
  const warnings: ContentFactoryPatchPlanOperation['warnings'] = []

  if (!candidate) {
    blockers.push({
      code: 'candidate_not_found',
      message: `No compatible refresh candidate exists for ${change.operation} at ${change.targetPath}.`
    })
  }

  if (candidate?.fingerprint && change.expectedFingerprint && candidate.fingerprint !== change.expectedFingerprint) {
    blockers.push({
      code: 'fingerprint_mismatch',
      message: `Expected fingerprint ${change.expectedFingerprint} but refresh candidate has ${candidate.fingerprint}.`
    })
  }

  if (candidate?.risk === 'high') {
    blockers.push({
      code: 'high_risk_candidate',
      message: 'High-risk candidates require a dedicated task before patch planning.'
    })
  }

  if (change.operation === 'update_text' && !normalizeText(change.proposedText)) {
    blockers.push({
      code: 'proposed_text_required',
      message: 'update_text changes require proposedText.'
    })
  }

  if (change.operation === 'update_text' && candidate?.editability !== 'safe_text_edit') {
    blockers.push({
      code: 'target_not_safe_text_edit',
      message: 'update_text is only allowed for safe_text_edit candidates.'
    })
  }

  if (change.operation === 'review_seo' && !normalizeText(change.proposedText)) {
    blockers.push({
      code: 'proposed_seo_text_required',
      message: 'review_seo changes require proposedText.'
    })
  }

  if (change.operation === 'review_link') {
    warnings.push({
      code: 'link_changes_need_source_validation',
      message: 'Link changes remain review-gated until the destination/source is validated.'
    })

    if (change.proposedHref && !isValidHttpUrl(change.proposedHref) && !change.proposedHref.startsWith('#')) {
      blockers.push({
        code: 'proposed_href_invalid',
        message: 'proposedHref must be http(s) or an internal anchor.'
      })
    }
  }

  if (change.operation === 'preserve' && change.proposedText) {
    warnings.push({
      code: 'preserve_ignores_proposed_text',
      message: 'Preserve operations ignore proposedText.'
    })
  }

  return { blockers, warnings }
}

const operationStatus = (
  blockers: ContentFactoryPatchPlanOperation['blockers'],
  warnings: ContentFactoryPatchPlanOperation['warnings']
): ContentFactoryPatchPlanOperation['status'] => {
  if (blockers.length > 0) return 'blocked'
  if (warnings.length > 0) return 'needs_review'

  return 'ready'
}

const buildOperation = (
  change: ContentFactoryPatchBriefChange,
  candidate: ContentFactoryRefreshPlanChangeCandidate | undefined
): ContentFactoryPatchPlanOperation => {
  const { blockers, warnings } = validateChangeAgainstCandidate(change, candidate)

  return {
    operation: change.operation,
    targetPath: change.targetPath,
    nativeKind: candidate?.nativeKind ?? 'blockName',
    key: candidate?.key ?? 'unknown',
    fingerprint: candidate?.fingerprint,
    currentText: candidate?.currentText,
    proposedText: change.operation === 'preserve' ? undefined : change.proposedText,
    proposedHref: change.proposedHref,
    rationale: change.rationale,
    risk: candidate?.risk ?? 'high',
    status: operationStatus(blockers, warnings),
    blockers,
    warnings,
    guardrails: [
      ...(candidate?.guardrails ?? []),
      'Apply only to a draft/private clone after revalidating the source fingerprint.',
      'Never patch the published source object from this plan.'
    ]
  }
}

export const prepareGutenbergPatchPlan = (
  refreshPlan: ContentFactoryRefreshPlan,
  brief: ContentFactoryPatchBrief,
  options: PrepareGutenbergPatchPlanOptions = {}
): ContentFactoryPatchPlan => {
  if (refreshPlan.contractVersion !== 'contentFactoryRefreshPlan.v1') {
    throw new Error('content_factory_patch_plan_requires_refresh_plan_v1')
  }

  if (brief.contractVersion !== CONTENT_FACTORY_PATCH_BRIEF_CONTRACT_VERSION) {
    throw new Error('content_factory_patch_plan_requires_patch_brief_v1')
  }

  const planBlockers: ContentFactoryPatchPlan['readiness']['blockers'] = []
  const planWarnings: ContentFactoryPatchPlan['readiness']['warnings'] = []

  if (refreshPlan.readiness.status === 'blocked') {
    planBlockers.push({
      code: 'source_refresh_plan_blocked',
      message: 'Refresh plan is blocked; resolve source inspection blockers before patch planning.'
    })
  }

  if (brief.target.wordpressPostId !== refreshPlan.target.wordpressPostId) {
    planBlockers.push({
      code: 'target_post_mismatch',
      message: `Brief targets ${brief.target.wordpressPostId}, refresh plan targets ${refreshPlan.target.wordpressPostId}.`
    })
  }

  if (brief.target.sourceFingerprint !== refreshPlan.target.sourceFingerprint) {
    planBlockers.push({
      code: 'source_fingerprint_mismatch',
      message: 'Brief source fingerprint does not match the refresh plan source fingerprint.'
    })
  }

  if (!brief.constraints.preservePublishedSource || !brief.constraints.requireDraftClone) {
    planBlockers.push({
      code: 'unsafe_patch_constraints',
      message: 'Patch brief must preserve the published source and require a draft/private clone.'
    })
  }

  if (!brief.constraints.preserveMedia) {
    planWarnings.push({
      code: 'media_not_preserved',
      message: 'Brief allows media changes; any media change remains review-gated and requires asset reconciliation.'
    })
  }

  if (!brief.constraints.preserveStructure) {
    planWarnings.push({
      code: 'structure_not_preserved',
      message: 'Brief allows structure changes; any structural change needs a reviewed outline diff.'
    })
  }

  const candidateIndex = buildCandidateIndex(refreshPlan)
  const operations = brief.changes.map(change => buildOperation(change, findCandidate(refreshPlan, candidateIndex, change)))

  for (const operation of operations) {
    for (const blocker of operation.blockers) {
      planBlockers.push({
        code: `${operation.targetPath}.${blocker.code}`,
        message: blocker.message
      })
    }

    for (const warning of operation.warnings) {
      planWarnings.push({
        code: `${operation.targetPath}.${warning.code}`,
        message: warning.message
      })
    }
  }

  return {
    contractVersion: CONTENT_FACTORY_PATCH_PLAN_CONTRACT_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: 'plan_only',
    sendsWordPressWrite: false,
    modifiesPublishedSource: false,
    objective: brief.objective,
    target: refreshPlan.target,
    sourceRefreshPlan: {
      contractVersion: refreshPlan.contractVersion,
      generatedAt: refreshPlan.generatedAt,
      sourceFingerprint: refreshPlan.target.sourceFingerprint
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
      status: planBlockers.length > 0 ? 'blocked' : planWarnings.length > 0 ? 'needs_review' : 'ready_for_draft_clone',
      blockers: planBlockers,
      warnings: planWarnings
    },
    operations,
    nextStep: {
      command: 'prepare_existing_post_refresh_draft_clone',
      status: 'not_implemented',
      notes:
        'The next command should create or prepare a draft/private clone plan. It is intentionally not implemented in this plan-only slice.'
    },
    rollback: {
      strategy: 'no_runtime_change_plan_only',
      notes: 'This patch plan is a local artifact only. It performs no WordPress mutation, so rollback is deleting the artifact.'
    }
  }
}

export const summarizeGutenbergPatchPlan = (plan: ContentFactoryPatchPlan) => ({
  contractVersion: plan.contractVersion,
  generatedAt: plan.generatedAt,
  mode: plan.mode,
  sendsWordPressWrite: plan.sendsWordPressWrite,
  modifiesPublishedSource: plan.modifiesPublishedSource,
  objective: plan.objective,
  target: plan.target,
  sourceRefreshPlan: plan.sourceRefreshPlan,
  readiness: plan.readiness,
  safetyPolicy: plan.safetyPolicy,
  operationCounts: plan.operations.reduce<Record<string, number>>((counts, operation) => {
    counts[operation.status] = (counts[operation.status] ?? 0) + 1

    return counts
  }, {}),
  operations: plan.operations,
  nextStep: plan.nextStep,
  rollback: plan.rollback
})
