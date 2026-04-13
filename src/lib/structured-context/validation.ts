import { createHash } from 'node:crypto'

import type {
  JsonObject,
  JsonValue,
  ReactiveReplayContextDocument,
  StructuredContextKind,
  StructuredContextKindPolicy,
  StructuredContextValidationResult
} from './types'

const SECRET_LIKE_KEY_PATTERN = /(password|secret|private[_-]?key|access[_-]?token|refresh[_-]?token|cookie|authorization)/i

const GENERIC_MAX_DOCUMENT_BYTES = 64 * 1024

export const STRUCTURED_CONTEXT_KIND_POLICIES: Record<StructuredContextKind, StructuredContextKindPolicy> = {
  'integration.raw_payload': {
    contextKind: 'integration.raw_payload',
    defaultDataClassification: 'confidential',
    defaultAccessScope: 'restricted_ops',
    defaultRetentionPolicyCode: 'integration_raw_30d',
    maxDocumentBytes: GENERIC_MAX_DOCUMENT_BYTES
  },
  'integration.normalized_payload': {
    contextKind: 'integration.normalized_payload',
    defaultDataClassification: 'internal',
    defaultAccessScope: 'restricted_ops',
    defaultRetentionPolicyCode: 'integration_normalized_90d',
    maxDocumentBytes: GENERIC_MAX_DOCUMENT_BYTES
  },
  'event.replay_context': {
    contextKind: 'event.replay_context',
    defaultDataClassification: 'internal',
    defaultAccessScope: 'restricted_ops',
    defaultRetentionPolicyCode: 'ops_replay_90d',
    maxDocumentBytes: 32 * 1024
  },
  'agent.audit_report': {
    contextKind: 'agent.audit_report',
    defaultDataClassification: 'internal',
    defaultAccessScope: 'internal',
    defaultRetentionPolicyCode: 'agent_audit_30d',
    maxDocumentBytes: 32 * 1024
  },
  'agent.execution_plan': {
    contextKind: 'agent.execution_plan',
    defaultDataClassification: 'internal',
    defaultAccessScope: 'internal',
    defaultRetentionPolicyCode: 'agent_plan_30d',
    maxDocumentBytes: 24 * 1024
  },
  'agent.assumption_set': {
    contextKind: 'agent.assumption_set',
    defaultDataClassification: 'internal',
    defaultAccessScope: 'internal',
    defaultRetentionPolicyCode: 'agent_working_set_14d',
    maxDocumentBytes: 16 * 1024
  },
  'agent.result_summary': {
    contextKind: 'agent.result_summary',
    defaultDataClassification: 'internal',
    defaultAccessScope: 'internal',
    defaultRetentionPolicyCode: 'agent_result_30d',
    maxDocumentBytes: 24 * 1024
  }
}

export class StructuredContextValidationError extends Error {
  readonly errors: string[]

  constructor(errors: string[]) {
    super(errors.join(' | '))
    this.name = 'StructuredContextValidationError'
    this.errors = errors
  }
}

const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
  value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

type JsonPrimitive = string | number | boolean | null

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

const isJsonValue = (value: unknown): value is JsonValue => {
  if (isJsonPrimitive(value)) return true
  if (Array.isArray(value)) return value.every(item => isJsonValue(item))
  if (!isPlainObject(value)) return false

  return Object.values(value).every(item => isJsonValue(item))
}

export const isJsonObject = (value: unknown): value is JsonObject =>
  isPlainObject(value) && Object.values(value).every(item => isJsonValue(item))

const canonicalize = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(item => canonicalize(item))
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<JsonObject>((accumulator, key) => {
        accumulator[key] = canonicalize(value[key])

        return accumulator
      }, {})
  }

  return value
}

export const computeStructuredContextHash = (document: JsonObject) =>
  createHash('sha256').update(JSON.stringify(canonicalize(document))).digest('hex')

export const computeStructuredContextDocumentBytes = (document: JsonObject) =>
  Buffer.byteLength(JSON.stringify(document), 'utf8')

const collectSecretLikeKeys = (value: JsonValue, prefix = ''): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectSecretLikeKeys(item, `${prefix}[${index}]`))
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const ownViolation = SECRET_LIKE_KEY_PATTERN.test(key) ? [path] : []

    return [...ownViolation, ...collectSecretLikeKeys(child, path)]
  })
}

const isNonNegativeInteger = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

const isOptionalText = (value: unknown) =>
  value === undefined || value === null || typeof value === 'string'

const validateEventReplayContext = (document: JsonObject): string[] => {
  const errors: string[] = []
  const candidate = document as Partial<ReactiveReplayContextDocument>

  if (typeof candidate.runId !== 'string' || candidate.runId.trim().length === 0) {
    errors.push('event.replay_context.runId debe ser string no vacío.')
  }

  if (
    candidate.status !== 'running' &&
    candidate.status !== 'succeeded' &&
    candidate.status !== 'failed' &&
    candidate.status !== 'partial' &&
    candidate.status !== 'cancelled'
  ) {
    errors.push('event.replay_context.status debe ser running|succeeded|failed|partial|cancelled.')
  }

  if (typeof candidate.sourceSystem !== 'string' || candidate.sourceSystem.trim().length === 0) {
    errors.push('event.replay_context.sourceSystem debe ser string no vacío.')
  }

  if (!isOptionalText(candidate.triggeredBy)) {
    errors.push('event.replay_context.triggeredBy debe ser string, null o undefined.')
  }

  if (!isOptionalText(candidate.sourceObjectType)) {
    errors.push('event.replay_context.sourceObjectType debe ser string, null o undefined.')
  }

  if (candidate.eventsProcessed !== undefined && candidate.eventsProcessed !== null && !isNonNegativeInteger(candidate.eventsProcessed)) {
    errors.push('event.replay_context.eventsProcessed debe ser entero >= 0.')
  }

  if (candidate.eventsFailed !== undefined && candidate.eventsFailed !== null && !isNonNegativeInteger(candidate.eventsFailed)) {
    errors.push('event.replay_context.eventsFailed debe ser entero >= 0.')
  }

  if (
    candidate.projectionsTriggered !== undefined &&
    candidate.projectionsTriggered !== null &&
    !isNonNegativeInteger(candidate.projectionsTriggered)
  ) {
    errors.push('event.replay_context.projectionsTriggered debe ser entero >= 0.')
  }

  if (candidate.durationMs !== undefined && candidate.durationMs !== null && !isNonNegativeInteger(candidate.durationMs)) {
    errors.push('event.replay_context.durationMs debe ser entero >= 0.')
  }

  if (!isOptionalText(candidate.notes)) {
    errors.push('event.replay_context.notes debe ser string, null o undefined.')
  }

  if (!isOptionalText(candidate.errorMessage)) {
    errors.push('event.replay_context.errorMessage debe ser string, null o undefined.')
  }

  return errors
}

const validateAgentAuditReport = (document: JsonObject): string[] => {
  const errors: string[] = []
  const summary = document.summary
  const findings = document.findings
  const assumptions = document.assumptions
  const confidence = document.confidence

  if (typeof summary !== 'string' || summary.trim().length === 0) {
    errors.push('agent.audit_report.summary debe ser string no vacío.')
  }

  if (!Array.isArray(findings) || findings.length === 0) {
    errors.push('agent.audit_report.findings debe ser un array no vacío.')
  } else {
    findings.forEach((finding, index) => {
      if (!isPlainObject(finding)) {
        errors.push(`agent.audit_report.findings[${index}] debe ser objeto.`)

        return
      }

      if (
        finding.severity !== 'critical' &&
        finding.severity !== 'high' &&
        finding.severity !== 'medium' &&
        finding.severity !== 'low' &&
        finding.severity !== 'info'
      ) {
        errors.push(`agent.audit_report.findings[${index}].severity inválido.`)
      }

      if (typeof finding.message !== 'string' || finding.message.trim().length === 0) {
        errors.push(`agent.audit_report.findings[${index}].message debe ser string no vacío.`)
      }
    })
  }

  if (assumptions !== undefined) {
    if (!Array.isArray(assumptions) || assumptions.some(item => typeof item !== 'string')) {
      errors.push('agent.audit_report.assumptions debe ser string[].')
    }
  }

  if (
    confidence !== undefined &&
    confidence !== 'low' &&
    confidence !== 'medium' &&
    confidence !== 'high'
  ) {
    errors.push('agent.audit_report.confidence debe ser low|medium|high.')
  }

  return errors
}

const validateAgentExecutionPlan = (document: JsonObject): string[] => {
  const errors: string[] = []
  const title = document.title
  const steps = document.steps

  if (typeof title !== 'string' || title.trim().length === 0) {
    errors.push('agent.execution_plan.title debe ser string no vacío.')
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push('agent.execution_plan.steps debe ser un array no vacío.')
  } else {
    steps.forEach((step, index) => {
      if (!isPlainObject(step)) {
        errors.push(`agent.execution_plan.steps[${index}] debe ser objeto.`)

        return
      }

      if (typeof step.id !== 'string' || step.id.trim().length === 0) {
        errors.push(`agent.execution_plan.steps[${index}].id debe ser string no vacío.`)
      }

      if (typeof step.label !== 'string' || step.label.trim().length === 0) {
        errors.push(`agent.execution_plan.steps[${index}].label debe ser string no vacío.`)
      }

      if (
        step.status !== 'pending' &&
        step.status !== 'in_progress' &&
        step.status !== 'completed' &&
        step.status !== 'blocked'
      ) {
        errors.push(`agent.execution_plan.steps[${index}].status inválido.`)
      }
    })
  }

  return errors
}

const validateByKind = (contextKind: StructuredContextKind, document: JsonObject): string[] => {
  switch (contextKind) {
    case 'event.replay_context':
      return validateEventReplayContext(document)
    case 'agent.audit_report':
      return validateAgentAuditReport(document)
    case 'agent.execution_plan':
      return validateAgentExecutionPlan(document)
    default:
      return []
  }
}

export const getStructuredContextKindPolicy = (contextKind: StructuredContextKind) =>
  STRUCTURED_CONTEXT_KIND_POLICIES[contextKind]

export const validateStructuredContextDocument = <TDocument extends JsonObject>(
  contextKind: StructuredContextKind,
  document: unknown
): StructuredContextValidationResult<TDocument> => {
  const errors: string[] = []
  const policy = getStructuredContextKindPolicy(contextKind)

  if (!isJsonObject(document)) {
    return {
      ok: false,
      errors: ['El documento debe ser un objeto JSON serializable.']
    }
  }

  const secretLikeKeys = collectSecretLikeKeys(document)

  if (secretLikeKeys.length > 0) {
    errors.push(`Se detectaron llaves sensibles prohibidas: ${secretLikeKeys.join(', ')}`)
  }

  const documentBytes = computeStructuredContextDocumentBytes(document)

  if (documentBytes > policy.maxDocumentBytes) {
    errors.push(
      `El documento excede el maximo permitido para ${contextKind}: ${documentBytes} bytes > ${policy.maxDocumentBytes}.`
    )
  }

  errors.push(...validateByKind(contextKind, document))

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    }
  }

  return {
    ok: true,
    errors: [],
    normalizedDocument: document as TDocument,
    documentBytes,
    contentHash: computeStructuredContextHash(document)
  }
}
