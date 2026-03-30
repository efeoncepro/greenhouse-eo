const normalizeAssignmentValue = (value: string | null | undefined) => value?.trim().toLowerCase() || ''

export const INTERNAL_COMMERCIAL_CLIENT_IDS = [
  'efeonce_internal',
  'client_internal',
  'space-efeonce'
] as const

export const INTERNAL_COMMERCIAL_CLIENT_NAMES = [
  'efeonce internal',
  'efeonce'
] as const

const INTERNAL_COMMERCIAL_CLIENT_ID_SET = new Set<string>(INTERNAL_COMMERCIAL_CLIENT_IDS)
const INTERNAL_COMMERCIAL_CLIENT_NAME_SET = new Set<string>(INTERNAL_COMMERCIAL_CLIENT_NAMES)

export const isInternalCommercialClientId = (clientId: string | null | undefined) =>
  INTERNAL_COMMERCIAL_CLIENT_ID_SET.has(normalizeAssignmentValue(clientId))

export const isInternalCommercialClientName = (clientName: string | null | undefined) =>
  INTERNAL_COMMERCIAL_CLIENT_NAME_SET.has(normalizeAssignmentValue(clientName))

export const isInternalCommercialAssignment = ({
  clientId,
  clientName
}: {
  clientId: string | null | undefined
  clientName?: string | null | undefined
}) => isInternalCommercialClientId(clientId) || isInternalCommercialClientName(clientName)
