import type { ResolvedGrowthMarket } from '@/lib/growth/markets'

export type MarketSource = 'form_selected' | 'form_default' | 'profile' | 'operator'

export type MatchMode = 'word_ci' | 'word_cs'
export interface BrandAlias {
  name: string
  matchMode: MatchMode
}
export interface MarketCompetitor {
  name: string
  aliases: BrandAlias[]
  matchMode: MatchMode
  position: number
}
export interface GraderMarket {
  marketId: string
  profileId: string
  marketCode: string
  locale: string
  status: 'active' | 'paused' | 'archived'
  isPrimary: boolean
  recurringRegradeEnabled: boolean
  recurringRegradeCadence: 'weekly' | 'monthly' | 'quarterly'
  recurringRegradeNextAt: string | null
}
export interface MatchingSnapshot {
  version: 'matching.v1'
  marketSource?: MarketSource
  brand: { name: string; aliases: BrandAlias[]; websiteUrl: string | null; category: string | null }
  competitors: MarketCompetitor[]
  competitorSetId: string
  setVersion: number
  market: ResolvedGrowthMarket
  providerPolicyVersion: string
}
export class GraderMarketConfigError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode = 409
  ) {
    super(code)
    this.name = 'GraderMarketConfigError'
  }
}

/** Unicode word boundaries, without matching 'Gol' inside 'Google' or 'goal'. */
export const matchesAlias = (text: string, alias: BrandAlias): boolean => {
  const normalize = (s: string) =>
    alias.matchMode === 'word_ci' ? s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() : s.normalize('NFC')

  const name = normalize(alias.name.trim())

  if (name.length < 1) return false

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'u').test(normalize(text))
}

export const validateAliases = (aliases: BrandAlias[]): BrandAlias[] => {
  if (!Array.isArray(aliases) || aliases.length > 20) throw new GraderMarketConfigError('aeo_aliases_invalid', 400)

  const result = aliases.map(alias => {
    if (
      !alias ||
      typeof alias.name !== 'string' ||
      alias.name.trim().length < 1 ||
      alias.name.length > 160 ||
      !['word_ci', 'word_cs'].includes(alias.matchMode)
    )
      throw new GraderMarketConfigError('aeo_aliases_invalid', 400)

    return { name: alias.name.trim(), matchMode: alias.matchMode }
  })

  return result.filter(
    (alias, i) => result.findIndex(other => other.name === alias.name && other.matchMode === alias.matchMode) === i
  )
}

export const validateCompetitors = (
  members: Array<{ name: string; aliases?: BrandAlias[]; matchMode?: MatchMode }>
): MarketCompetitor[] => {
  if (!Array.isArray(members) || members.length > 10) throw new GraderMarketConfigError('aeo_competitors_invalid', 400)

  const result = members.map((member, i) => {
    if (!member || typeof member.name !== 'string') throw new GraderMarketConfigError('aeo_competitors_invalid', 400)
    const name = validateAliases([{ name: member.name, matchMode: member.matchMode ?? 'word_ci' }])[0]

    return { ...name, aliases: validateAliases(member.aliases ?? []), position: i + 1 }
  })

  if (new Set(result.map(member => member.name.toLocaleLowerCase())).size !== result.length)
    throw new GraderMarketConfigError('aeo_competitors_invalid', 400)

  return result
}
