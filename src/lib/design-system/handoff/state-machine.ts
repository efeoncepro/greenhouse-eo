import type { DesignHandoffStatus } from './types'

export type DesignHandoffErrorCode =
  | 'invalid_figma_url'
  | 'figma_file_not_allowed'
  | 'design_handoff_not_found'
  | 'invalid_design_handoff_transition'
  | 'invalid_design_handoff_input'

export class DesignHandoffError extends Error {
  readonly code: DesignHandoffErrorCode

  constructor(code: DesignHandoffErrorCode, message: string) {
    super(message)
    this.name = 'DesignHandoffError'
    this.code = code
  }
}

const TRANSITIONS: Record<DesignHandoffStatus, readonly DesignHandoffStatus[]> = {
  proposed: ['in_implementation', 'archived'],
  in_implementation: ['implemented', 'archived'],
  implemented: ['archived'],
  archived: []
}

export const DESIGN_HANDOFF_STATUSES: readonly DesignHandoffStatus[] = [
  'proposed',
  'in_implementation',
  'implemented',
  'archived'
]

export const isDesignHandoffStatus = (value: unknown): value is DesignHandoffStatus =>
  typeof value === 'string' && DESIGN_HANDOFF_STATUSES.includes(value as DesignHandoffStatus)

export const assertValidHandoffTransition = ({
  fromStatus,
  toStatus,
  implementedSurfaceKey
}: {
  fromStatus: DesignHandoffStatus
  toStatus: DesignHandoffStatus
  implementedSurfaceKey?: string | null
}) => {
  if (!TRANSITIONS[fromStatus]?.includes(toStatus)) {
    throw new DesignHandoffError(
      'invalid_design_handoff_transition',
      `Invalid design handoff transition: ${fromStatus} -> ${toStatus}`
    )
  }

  if (toStatus === 'implemented' && !implementedSurfaceKey?.trim()) {
    throw new DesignHandoffError(
      'invalid_design_handoff_transition',
      'Implemented design handoffs require an implemented surface key'
    )
  }
}

export const normalizeImplementedSurfaceKey = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim()

  if (!trimmed) return null

  const normalized = trimmed === '/' ? trimmed : trimmed.replace(/\/+$/, '')

  if (!normalized.startsWith('/') || normalized.includes('://')) {
    throw new DesignHandoffError('invalid_design_handoff_input', 'Implemented surface key must be an app route')
  }

  return normalized
}
