'use client'

import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'

import { GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamIdentityConfidence, TeamIdentityProvider } from '@/types/team'

type TeamIdentityBadgeGroupProps = {
  providers: TeamIdentityProvider[]
  confidence: TeamIdentityConfidence
}

const providerMeta: Partial<Record<TeamIdentityProvider, { label: string; icon: string; color: 'info' | 'primary' | 'success' | 'warning' }>> = {
  notion: {
    label: GH_TEAM.provider_notion,
    icon: 'tabler-notes',
    color: 'info'
  },
  microsoft: {
    label: GH_TEAM.provider_microsoft,
    icon: 'tabler-brand-windows',
    color: 'primary'
  },
  google: {
    label: GH_TEAM.provider_google,
    icon: 'tabler-brand-google',
    color: 'success'
  },
  hubspot: {
    label: GH_TEAM.provider_hubspot,
    icon: 'tabler-brand-office',
    color: 'warning'
  },
  deel: {
    label: GH_TEAM.provider_deel,
    icon: 'tabler-briefcase',
    color: 'primary'
  }
}

const confidenceMeta: Record<TeamIdentityConfidence, { label: string; color: 'success' | 'warning' | 'default'; icon: string }> = {
  strong: {
    label: GH_TEAM.identity_confidence_strong,
    color: 'success',
    icon: 'tabler-link'
  },
  partial: {
    label: GH_TEAM.identity_confidence_partial,
    color: 'warning',
    icon: 'tabler-link-plus'
  },
  basic: {
    label: GH_TEAM.identity_confidence_basic,
    color: 'default',
    icon: 'tabler-link-off'
  }
}

const formatProviderLabel = (provider: TeamIdentityProvider) =>
  provider
    .split(/[_-]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')

const TeamIdentityBadgeGroup = ({ providers, confidence }: TeamIdentityBadgeGroupProps) => {
  const uniqueProviders = Array.from(new Set(providers))

  return (
    <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
      <Chip
        size='small'
        variant='tonal'
        color={confidenceMeta[confidence].color === 'default' ? undefined : confidenceMeta[confidence].color}
        icon={<i className={confidenceMeta[confidence].icon} />}
        label={confidenceMeta[confidence].label}
      />

      {uniqueProviders.map(provider => (
        <Chip
          key={provider}
          size='small'
          variant='outlined'
          color={providerMeta[provider]?.color || 'default'}
          icon={<i className={providerMeta[provider]?.icon || 'tabler-plug-connected'} />}
          label={providerMeta[provider]?.label || formatProviderLabel(provider)}
        />
      ))}
    </Stack>
  )
}

export default TeamIdentityBadgeGroup
