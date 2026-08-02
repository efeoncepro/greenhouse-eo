import fs from 'node:fs'
import path from 'node:path'

export const CLOSURE_SCHEMA_VERSION = 1

export const CLOSURE_STATUSES = Object.freeze([
  'workshop_only',
  'proposal_registered',
  'render_queued',
  'render_completed',
  'verified'
])

const STATUS_RANK = new Map(CLOSURE_STATUSES.map((status, index) => [status, index]))
const MANIFEST_HASH_RE = /^[a-f0-9]{64}$/i

const PROPOSAL_ASSET_KINDS = new Set([
  'technical_offer',
  'economic_offer',
  'deck',
  'other_doc'
])

const REQUIRED_VERIFICATION_CHECKS = [
  'proposalVisible',
  'renderJobCompleted',
  'versionedAssetVisible',
  'audienceConfirmed',
  'sourceReviewed'
]

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0

const isIsoTimestamp = value => isNonEmptyString(value) && !Number.isNaN(Date.parse(value))

const addIssue = (issues, code, message) => {
  issues.push({ code, message })
}

const addRequiredString = (issues, value, pathName) => {
  if (!isNonEmptyString(value)) {
    addIssue(issues, 'invalid_field', `${pathName} debe ser un string no vacío.`)
  }
}

const addRequiredTimestamp = (issues, value, pathName) => {
  if (!isIsoTimestamp(value)) {
    addIssue(issues, 'invalid_timestamp', `${pathName} debe ser una fecha ISO válida.`)
  }
}

const rankOf = status => STATUS_RANK.get(status) ?? -1

const validateRegistration = (issues, registration, proposalId) => {
  if (!isRecord(registration)) {
    addIssue(issues, 'missing_registration', 'registration es obligatorio desde proposal_registered.')

return
  }

  addRequiredString(issues, registration.surface, 'registration.surface')
  addRequiredTimestamp(issues, registration.registeredAt, 'registration.registeredAt')

  if (registration.actorKind !== 'member') {
    addIssue(issues, 'human_registration_required', 'La Proposal debe registrarse con actorKind="member".')
  }

  addRequiredString(issues, registration.actorMemberId, 'registration.actorMemberId')

  if (registration.proposalId !== proposalId) {
    addIssue(issues, 'proposal_id_mismatch', 'registration.proposalId debe coincidir con proposalId.')
  }
}

const validateRenderJobs = (issues, renderJobs, status) => {
  if (!Array.isArray(renderJobs)) {
    addIssue(issues, 'invalid_render_jobs', 'renderJobs debe ser un array.')

return []
  }

  if (rankOf(status) >= rankOf('render_queued') && renderJobs.length === 0) {
    addIssue(issues, 'missing_render_job', 'El cierre declara render pero no registra ningún renderJob.')
  }

  const completedJobs = []

  for (const [index, job] of renderJobs.entries()) {
    const prefix = `renderJobs[${index}]`

    if (!isRecord(job)) {
      addIssue(issues, 'invalid_render_job', `${prefix} debe ser un objeto.`)
      continue
    }

    addRequiredString(issues, job.renderJobId, `${prefix}.renderJobId`)
    addRequiredString(issues, job.artifactPurpose, `${prefix}.artifactPurpose`)
    addRequiredString(issues, job.outputTarget, `${prefix}.outputTarget`)

    if (job.audience !== 'client_facing') {
      addIssue(issues, 'client_audience_required', `${prefix}.audience debe ser client_facing.`)
    }

    if (!isNonEmptyString(job.state)) {
      addIssue(issues, 'invalid_render_state', `${prefix}.state debe declarar el estado real del job.`)
    }

    if (!MANIFEST_HASH_RE.test(String(job.manifestHash ?? ''))) {
      addIssue(issues, 'missing_manifest_hash', `${prefix}.manifestHash debe ser el hash sha256 del manifest resuelto.`)
    }

    if (job.state === 'completed') {
      completedJobs.push(job)
      addRequiredString(issues, job.outputPdfAssetId, `${prefix}.outputPdfAssetId`)

      if (!Array.isArray(job.outputPreviewAssetIds) || job.outputPreviewAssetIds.length === 0) {
        addIssue(issues, 'missing_previews', `${prefix}.outputPreviewAssetIds debe contener al menos una preview.`)
      }
    }
  }

  if (rankOf(status) >= rankOf('render_completed') && completedJobs.length === 0) {
    addIssue(issues, 'render_not_completed', 'El cierre declara render_completed/verified, pero ningún job está completed.')
  }

  return completedJobs
}

const validateDeliverables = (issues, deliverables, completedJobs) => {
  if (!Array.isArray(deliverables) || deliverables.length === 0) {
    addIssue(issues, 'missing_versioned_deliverable', 'verified exige al menos un deliverable versionado en Proposal Studio.')

return
  }

  const jobsById = new Map(completedJobs.map(job => [job.renderJobId, job]))

  for (const [index, deliverable] of deliverables.entries()) {
    const prefix = `deliverables[${index}]`

    if (!isRecord(deliverable)) {
      addIssue(issues, 'invalid_deliverable', `${prefix} debe ser un objeto.`)
      continue
    }

    addRequiredString(issues, deliverable.proposalAssetId, `${prefix}.proposalAssetId`)
    addRequiredString(issues, deliverable.assetId, `${prefix}.assetId`)
    addRequiredString(issues, deliverable.renderJobId, `${prefix}.renderJobId`)

    if (!PROPOSAL_ASSET_KINDS.has(deliverable.kind)) {
      addIssue(issues, 'invalid_deliverable_kind', `${prefix}.kind no es un ProposalAssetKind client-facing permitido.`)
    }

    if (deliverable.audience !== 'client_facing') {
      addIssue(issues, 'client_audience_required', `${prefix}.audience debe ser client_facing.`)
    }

    if (deliverable.status !== 'final') {
      addIssue(issues, 'final_asset_required', `${prefix}.status debe ser final.`)
    }

    if (!Number.isInteger(deliverable.version) || deliverable.version < 1) {
      addIssue(issues, 'invalid_asset_version', `${prefix}.version debe ser un entero positivo derivado por el Studio.`)
    }

    const job = jobsById.get(deliverable.renderJobId)

    if (!job) {
      addIssue(issues, 'deliverable_job_mismatch', `${prefix}.renderJobId debe apuntar a un job completed del mismo registro.`)
      continue
    }

    if (deliverable.assetId !== job.outputPdfAssetId) {
      addIssue(issues, 'deliverable_asset_mismatch', `${prefix}.assetId debe coincidir con outputPdfAssetId del job.`)
    }
  }
}

const validateVerification = (issues, verification) => {
  if (!isRecord(verification)) {
    addIssue(issues, 'missing_verification', 'verified exige una verificación autenticada del Proposal Studio.')

return
  }

  if (!['authenticated_portal', 'authenticated_api'].includes(verification.method)) {
    addIssue(issues, 'authenticated_verification_required', 'verification.method debe ser authenticated_portal o authenticated_api.')
  }

  addRequiredString(issues, verification.route, 'verification.route')
  addRequiredTimestamp(issues, verification.verifiedAt, 'verification.verifiedAt')
  addRequiredString(issues, verification.actorMemberId, 'verification.actorMemberId')

  if (!isRecord(verification.checks)) {
    addIssue(issues, 'missing_verification_checks', 'verification.checks debe declarar cada comprobación de cierre.')

return
  }

  for (const check of REQUIRED_VERIFICATION_CHECKS) {
    if (verification.checks[check] !== true) {
      addIssue(issues, 'verification_check_failed', `verification.checks.${check} debe ser true.`)
    }
  }
}

const validatePlanPaths = (issues, workspaceDir, sourcePlans) => {
  if (!Array.isArray(sourcePlans) || sourcePlans.length === 0) {
    addIssue(issues, 'missing_source_plan', 'El registro debe apuntar a al menos un plan fuente dentro del workspace.')

return
  }

  const resolvedWorkspace = path.resolve(workspaceDir)

  for (const [index, sourcePlan] of sourcePlans.entries()) {
    const prefix = `composition.sourcePlans[${index}]`

    if (!isNonEmptyString(sourcePlan) || path.isAbsolute(sourcePlan) || sourcePlan.includes('..') || sourcePlan.startsWith('.captures/')) {
      addIssue(issues, 'non_durable_source_plan', `${prefix} debe ser una ruta relativa versionable; no puede depender de .captures.`)
      continue
    }

    const resolved = path.resolve(resolvedWorkspace, sourcePlan)

    if (!resolved.startsWith(`${resolvedWorkspace}${path.sep}`) || !fs.existsSync(resolved)) {
      addIssue(issues, 'missing_source_plan', `${prefix} no existe dentro del workspace.`)
    }
  }
}

export const validateClosureRecord = ({ slug, workspaceDir, record }) => {
  const issues = []

  if (!isRecord(record)) {
    return [{ code: 'invalid_record', message: 'proposal-studio.json debe contener un objeto JSON.' }]
  }

  if (record.schemaVersion !== CLOSURE_SCHEMA_VERSION) {
    addIssue(issues, 'unsupported_schema', `schemaVersion debe ser ${CLOSURE_SCHEMA_VERSION}.`)
  }

  if (record.deal !== slug) {
    addIssue(issues, 'deal_mismatch', `deal debe ser "${slug}".`)
  }

  const expectedWorkspacePath = `docs/commercial/tenders/${slug}`

  if (record.workspacePath !== expectedWorkspacePath) {
    addIssue(issues, 'workspace_mismatch', `workspacePath debe ser "${expectedWorkspacePath}".`)
  }

  if (!CLOSURE_STATUSES.includes(record.status)) {
    addIssue(issues, 'invalid_status', `status debe ser uno de: ${CLOSURE_STATUSES.join(', ')}.`)

return issues
  }

  if (!isRecord(record.composition)) {
    addIssue(issues, 'missing_composition', 'composition es obligatorio y debe describir los planes fuente.')
  } else {
    validatePlanPaths(issues, workspaceDir, record.composition.sourcePlans)
  }

  const statusRank = rankOf(record.status)

  if (statusRank === rankOf('workshop_only')) {
    if (record.proposalId !== null) {
      addIssue(issues, 'workshop_has_proposal', 'workshop_only debe mantener proposalId en null.')
    }
  } else {
    addRequiredString(issues, record.proposalId, 'proposalId')
    validateRegistration(issues, record.registration, record.proposalId)
  }

  const completedJobs = validateRenderJobs(issues, record.renderJobs, record.status)

  if (record.status === 'verified') {
    validateDeliverables(issues, record.deliverables, completedJobs)
    validateVerification(issues, record.verification)
  }

  return issues
}

export const closureRecordPath = (repoRoot, slug) =>
  path.join(repoRoot, 'docs', 'commercial', 'tenders', slug, 'proposal-studio.json')

export const tenderWorkspaceDir = (repoRoot, slug) =>
  path.join(repoRoot, 'docs', 'commercial', 'tenders', slug)

export const evaluateTenderWorkspace = ({ repoRoot, slug }) => {
  const workspaceDir = tenderWorkspaceDir(repoRoot, slug)
  const recordPath = closureRecordPath(repoRoot, slug)
  const issues = []

  if (!fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory()) {
    addIssue(issues, 'missing_workspace', `No existe el workspace docs/commercial/tenders/${slug}/.`)

return { slug, passed: false, status: null, recordPath, issues }
  }

  for (const requiredFile of ['README.md', 'artifact-manifest.json', 'oferta-tecnica.md']) {
    if (!fs.existsSync(path.join(workspaceDir, requiredFile))) {
      addIssue(issues, 'missing_workspace_file', `Falta ${requiredFile} en el workspace.`)
    }
  }

  if (!fs.existsSync(recordPath)) {
    addIssue(issues, 'missing_closure_record', 'Falta proposal-studio.json: una composición local no cierra la Proposal.')

return { slug, passed: false, status: null, recordPath, issues }
  }

  let record

  try {
    record = JSON.parse(fs.readFileSync(recordPath, 'utf8'))
  } catch (error) {
    addIssue(issues, 'invalid_json', `No se pudo leer proposal-studio.json: ${error instanceof Error ? error.message : String(error)}`)

return { slug, passed: false, status: null, recordPath, issues }
  }

  issues.push(...validateClosureRecord({ slug, workspaceDir, record }))

  if (record.status !== 'verified') {
    addIssue(issues, 'closure_not_verified', `status=${record.status}: falta completar el cierre canónico y la verificación autenticada.`)
  }

  return {
    slug,
    passed: issues.length === 0 && record.status === 'verified',
    status: record.status ?? null,
    proposalId: record.proposalId ?? null,
    recordPath,
    issues
  }
}
