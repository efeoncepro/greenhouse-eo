import 'server-only'

import { loadBusinessLineMetadata } from './metadata'

export interface ResolvedHubSpotBusinessLine {
  moduleCode: string
  hubspotEnumValue: string
  label: string
}

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? ''

export const resolveHubSpotBusinessLine = async (
  input: string | null | undefined
): Promise<ResolvedHubSpotBusinessLine | null> => {
  const needle = normalize(input)

  if (!needle) return null

  const businessLines = await loadBusinessLineMetadata()

  const match = businessLines.find(item =>
    [
      item.moduleCode,
      item.hubspotEnumValue,
      item.label,
      item.labelFull,
      item.notionLabel
    ].some(candidate => normalize(candidate) === needle)
  )

  if (!match) return null

  return {
    moduleCode: match.moduleCode,
    hubspotEnumValue: match.hubspotEnumValue,
    label: match.label
  }
}
