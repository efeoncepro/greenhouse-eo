export const normalizeGreenhouseAssetScopeValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  return normalized ? normalized : null
}

export const normalizeGreenhouseAssetOwnershipScope = ({
  ownerClientId,
  ownerSpaceId,
  ownerMemberId
}: {
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
}) => ({
  ownerClientId: normalizeGreenhouseAssetScopeValue(ownerClientId),
  ownerSpaceId: normalizeGreenhouseAssetScopeValue(ownerSpaceId),
  ownerMemberId: normalizeGreenhouseAssetScopeValue(ownerMemberId)
})
