export type ParsedFundingBody = Readonly<{
  globeWorkspaceId: string
  poolId: string
  grantCredits: number
  monthlyCap?: number
  periodStart: string
  periodEnd: string
}>

export const parseFundingBody = (raw: unknown): ParsedFundingBody | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined

  const value = raw as Record<string, unknown>
  const globeWorkspaceId = text(value.globeWorkspaceId)
  const poolId = text(value.poolId)
  const periodStart = text(value.periodStart)
  const periodEnd = text(value.periodEnd)
  const grantCredits = value.grantCredits

  if (!globeWorkspaceId || !poolId || !periodStart || !periodEnd) return undefined
  if (!Number.isSafeInteger(grantCredits) || (grantCredits as number) <= 0) return undefined
  if (Date.parse(periodStart) >= Date.parse(periodEnd)) return undefined

  const monthlyCap = value.monthlyCap

  if (monthlyCap !== undefined && (!Number.isSafeInteger(monthlyCap) || (monthlyCap as number) <= 0)) {
    return undefined
  }

  return {
    globeWorkspaceId,
    poolId,
    grantCredits: grantCredits as number,
    ...(monthlyCap === undefined ? {} : { monthlyCap: monthlyCap as number }),
    periodStart,
    periodEnd
  }
}

export type ParsedConfirmBody = Readonly<{
  globeWorkspaceId: string
  proposalId: string
  fingerprint: string
}>

export const parseConfirmBody = (raw: unknown): ParsedConfirmBody | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined

  const value = raw as Record<string, unknown>
  const globeWorkspaceId = text(value.globeWorkspaceId)
  const proposalId = text(value.proposalId)
  const fingerprint = text(value.fingerprint)

  if (!globeWorkspaceId || !proposalId || !fingerprint) return undefined

  return { globeWorkspaceId, proposalId, fingerprint }
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
