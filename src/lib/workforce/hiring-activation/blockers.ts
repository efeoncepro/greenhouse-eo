// TASK-1400 — Rich, browser-safe blocker contract for Hiring Activation.
// This file is intentionally pure: readers, UI and Nexa can inspect the same contract
// without importing server-only command code.

import type { WorkforceActivationReadiness, WorkforceActivationIssue } from '@/lib/workforce/activation/types'

import type {
  HiringActivationActionableBlocker,
  HiringActivationBlockedReason,
  HiringActivationBlockerActionContract,
  HiringActivationBlockerPayloadSchema,
  HiringActivationBlockerResolutionAction,
  HiringActivationRequest,
} from './types'
import { HIRING_ACTIVATION_BLOCKED_REASONS, HIRING_ACTIVATION_BLOCKER_RESOLUTION_ACTIONS } from './types'

const SUPPORT_REASON_PAYLOAD_SCHEMA: HiringActivationBlockerPayloadSchema = {
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    reason: {
      type: 'string',
      description: 'Nota operativa opcional. Se usa sólo para contexto humano; la auditoría guarda digest, no el texto.',
      minLength: 1,
      maxLength: 240,
      sensitive: false,
    },
  },
}

export const HIRING_ACTIVATION_BLOCKER_ACTION_CONTRACTS = {
  'retry-create-member': {
    action: 'retry-create-member',
    label: 'Reintentar creación de colaborador',
    description:
      'Vuelve a ejecutar el primitive source-neutral de member después de que People/Identity resuelva el conflicto de identidad.',
    requiredCapability: 'workforce.member.intake.update',
    requiredCapabilityAction: 'update',
    requiredScope: 'tenant',
    payloadSchema: SUPPORT_REASON_PAYLOAD_SCHEMA,
    idempotencyKeyHint: 'hiring_handoff_id + blockerKey + retry-create-member + sha256(payload_normalizado)',
  },
  'retry-open-onboarding': {
    action: 'retry-open-onboarding',
    label: 'Reintentar onboarding',
    description:
      'Vuelve a asegurar el checklist de onboarding después de publicar o corregir la plantilla aplicable.',
    requiredCapability: 'hr.onboarding_instance',
    requiredCapabilityAction: 'create',
    requiredScope: 'tenant',
    payloadSchema: SUPPORT_REASON_PAYLOAD_SCHEMA,
    idempotencyKeyHint: 'hiring_handoff_id + blockerKey + retry-open-onboarding + sha256(payload_normalizado)',
  },
} as const satisfies Record<HiringActivationBlockerResolutionAction, HiringActivationBlockerActionContract>

export const isHiringActivationBlockerResolutionAction = (
  value: unknown,
): value is HiringActivationBlockerResolutionAction =>
  typeof value === 'string' &&
  HIRING_ACTIVATION_BLOCKER_RESOLUTION_ACTIONS.includes(value as HiringActivationBlockerResolutionAction)

export const getHiringActivationBlockerActionContract = (
  action: unknown,
): HiringActivationBlockerActionContract | null =>
  isHiringActivationBlockerResolutionAction(action) ? HIRING_ACTIVATION_BLOCKER_ACTION_CONTRACTS[action] : null

const isHiringActivationBlockedReason = (value: string): value is HiringActivationBlockedReason =>
  HIRING_ACTIVATION_BLOCKED_REASONS.includes(value as HiringActivationBlockedReason)

export const activationBlockerKey = (reason: HiringActivationBlockedReason) => `activation:${reason}`

export const readinessBlockerKey = (code: string) => `readiness:${code}`

export const normalizeHiringActivationBlockerKey = (key: string): string => {
  const trimmed = key.trim()

  if (trimmed.startsWith('activation:') || trimmed.startsWith('readiness:')) return trimmed

  if (isHiringActivationBlockedReason(trimmed)) return activationBlockerKey(trimmed)

  return trimmed
}

const activationAlternativeSurface = (
  reason: HiringActivationBlockedReason,
  request: HiringActivationRequest,
): HiringActivationActionableBlocker['alternativeSurface'] => {
  switch (reason) {
    case 'ambiguous_identity':
    case 'member_conflict':
    case 'member_already_active':
      return {
        label: 'People / Identity',
        href: `/people?profile=${encodeURIComponent(request.identityProfileId)}`,
        owner: 'People Ops',
        lane: 'identity_access',
      }
    case 'onboarding_template_missing':
      return {
        label: 'Plantillas de onboarding',
        href: '/hr/onboarding/templates',
        owner: 'HR Ops',
        lane: 'operational_onboarding',
      }
    case 'handoff_not_approved':
      return {
        label: 'Hiring handoff',
        href: `/agency/hiring?handoff=${encodeURIComponent(request.hiringHandoffId)}`,
        owner: 'Hiring Manager',
      }
    case 'legal_data_missing':
      return {
        label: 'Workforce Activation',
        href: request.memberId
          ? `/hr/workforce/activation?memberId=${encodeURIComponent(request.memberId)}`
          : '/hr/workforce/activation',
        owner: 'People Ops',
        lane: 'legal_profile',
      }
  }
}

const activationBlockerLabel = (reason: HiringActivationBlockedReason): string => {
  switch (reason) {
    case 'ambiguous_identity':
      return 'Identidad ambigua'
    case 'member_conflict':
      return 'Conflicto de colaborador'
    case 'member_already_active':
      return 'Colaborador ya activo'
    case 'onboarding_template_missing':
      return 'Falta plantilla de onboarding'
    case 'handoff_not_approved':
      return 'Handoff no aprobado'
    case 'legal_data_missing':
      return 'Faltan datos legales'
  }
}

const activationSupportedActions = (
  reason: HiringActivationBlockedReason,
): readonly HiringActivationBlockerActionContract[] => {
  switch (reason) {
    case 'ambiguous_identity':
    case 'member_conflict':
    case 'member_already_active':
      return [HIRING_ACTIVATION_BLOCKER_ACTION_CONTRACTS['retry-create-member']]
    case 'onboarding_template_missing':
      return [HIRING_ACTIVATION_BLOCKER_ACTION_CONTRACTS['retry-open-onboarding']]
    case 'handoff_not_approved':
    case 'legal_data_missing':
      return []
  }
}

const activationStatus = (reason: HiringActivationBlockedReason) =>
  activationSupportedActions(reason).length > 0 ? 'resolvable' : 'not_resolvable'

const buildActivationRequestBlocker = (
  request: HiringActivationRequest,
): HiringActivationActionableBlocker | null => {
  if (request.state !== 'blocked' || !request.blockedReason) return null

  const reason = request.blockedReason

  return {
    key: activationBlockerKey(reason),
    source: 'activation_request',
    status: activationStatus(reason),
    label: activationBlockerLabel(reason),
    detail: request.blockedDetail ?? activationBlockerLabel(reason),
    reason,
    lane: reason === 'onboarding_template_missing' ? 'operational_onboarding' : undefined,
    owner: reason === 'handoff_not_approved' ? 'Hiring Manager' : reason === 'onboarding_template_missing' ? 'HR Ops' : 'People Ops',
    deepLink: activationAlternativeSurface(reason, request)?.href,
    supportedActions: activationSupportedActions(reason),
    alternativeSurface: activationAlternativeSurface(reason, request),
    redaction: activationSupportedActions(reason).length > 0 ? 'payload_digest_only' : 'none',
  }
}

const buildReadinessBlocker = (issue: WorkforceActivationIssue): HiringActivationActionableBlocker => ({
  key: readinessBlockerKey(issue.code),
  source: 'workforce_readiness',
  status: 'not_resolvable',
  label: issue.label,
  detail: issue.detail,
  readinessCode: issue.code as HiringActivationActionableBlocker['readinessCode'],
  lane: issue.lane,
  owner: issue.owner,
  deepLink: issue.deepLink,
  supportedActions: [],
  alternativeSurface: {
    label: issue.label,
    href: issue.deepLink,
    owner: issue.owner,
    lane: issue.lane,
  },
  redaction: 'none',
})

export const deriveHiringActivationBlockers = ({
  request,
  readiness,
}: {
  request: HiringActivationRequest | null
  readiness: WorkforceActivationReadiness | null
}): HiringActivationActionableBlocker[] => {
  const blockers: HiringActivationActionableBlocker[] = []
  const activationBlocker = request ? buildActivationRequestBlocker(request) : null

  if (activationBlocker) blockers.push(activationBlocker)

  for (const issue of readiness?.blockers ?? []) {
    blockers.push(buildReadinessBlocker(issue))
  }

  return blockers
}

export const findHiringActivationBlocker = (
  blockers: readonly HiringActivationActionableBlocker[],
  key: string,
): HiringActivationActionableBlocker | null => {
  const normalized = normalizeHiringActivationBlockerKey(key)

  return (
    blockers.find((blocker) => {
      if (blocker.key === normalized || blocker.key === key.trim()) return true
      if (blocker.reason && activationBlockerKey(blocker.reason) === normalized) return true
      if (blocker.readinessCode && readinessBlockerKey(blocker.readinessCode) === normalized) return true

      return false
    }) ?? null
  )
}
