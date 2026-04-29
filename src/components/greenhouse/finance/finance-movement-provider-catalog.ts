import { alpha } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'

import type { FinanceMovementProviderIdentity } from './finance-movement-feed.types'

type ProviderVisualRecord = FinanceMovementProviderIdentity & {
  aliases: string[]
}

const withBorder = (source: string) => alpha(source, 0.2)

export const FINANCE_MOVEMENT_PROVIDER_CATALOG: Record<string, ProviderVisualRecord> = {
  hubspot: {
    providerId: 'hubspot',
    providerName: 'HubSpot',
    iconUrl: '/images/integrations/hubspot.svg',
    logoStatus: 'verified',
    initials: 'hs',
    tone: {
      source: GH_COLORS.role.media.source,
      bg: GH_COLORS.role.media.bg,
      text: GH_COLORS.role.media.text,
      border: withBorder(GH_COLORS.role.media.source)
    },
    aliases: ['hubspot', 'marketing hub', 'sales hub', 'service hub', 'data hub']
  },
  envato: {
    providerId: 'envato',
    providerName: 'Envato',
    iconUrl: null,
    logoStatus: 'fallback',
    initials: 'ev',
    tone: {
      source: GH_COLORS.brand.greenhouseGreen,
      bg: '#edf7f0',
      text: GH_COLORS.brand.greenhouseGreen,
      border: withBorder(GH_COLORS.brand.greenhouseGreen)
    },
    aliases: ['envato', 'elements']
  },
  github: {
    providerId: 'github',
    providerName: 'GitHub',
    iconUrl: null,
    logoStatus: 'fallback',
    initials: 'gh',
    tone: {
      source: GH_COLORS.role.account.source,
      bg: GH_COLORS.role.account.bg,
      text: GH_COLORS.role.account.text,
      border: withBorder(GH_COLORS.role.account.source)
    },
    aliases: ['github', 'git hub']
  },
  google: {
    providerId: 'google',
    providerName: 'Google',
    iconUrl: null,
    logoStatus: 'fallback',
    initials: 'G',
    tone: {
      source: GH_COLORS.role.development.source,
      bg: GH_COLORS.role.development.bg,
      text: GH_COLORS.role.development.text,
      border: withBorder(GH_COLORS.role.development.source)
    },
    aliases: ['google', 'workspace', 'google play']
  },
  adobe: {
    providerId: 'adobe',
    providerName: 'Adobe',
    iconUrl: null,
    logoStatus: 'fallback',
    initials: 'Ad',
    tone: {
      source: GH_COLORS.role.design.source,
      bg: GH_COLORS.role.design.bg,
      text: GH_COLORS.role.design.text,
      border: withBorder(GH_COLORS.role.design.source)
    },
    aliases: ['adobe', 'creative cloud']
  },
  notion: {
    providerId: 'notion',
    providerName: 'Notion',
    iconUrl: '/images/integrations/notion.svg',
    logoStatus: 'verified',
    initials: 'N',
    tone: {
      source: GH_COLORS.brand.midnightNavy,
      bg: GH_COLORS.role.account.bg,
      text: GH_COLORS.brand.midnightNavy,
      border: withBorder(GH_COLORS.brand.midnightNavy)
    },
    aliases: ['notion']
  }
}

const normalizeSearchText = (value: string | null | undefined): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const inferFinanceMovementProviderId = (input: {
  title?: string | null
  counterparty?: string | null
  instrumentName?: string | null
}): string | null => {
  const searchText = normalizeSearchText([input.title, input.counterparty, input.instrumentName].filter(Boolean).join(' '))

  if (!searchText) return null

  const match = Object.values(FINANCE_MOVEMENT_PROVIDER_CATALOG).find(provider =>
    provider.aliases.some(alias => searchText.includes(normalizeSearchText(alias)))
  )

  return match?.providerId ?? null
}
