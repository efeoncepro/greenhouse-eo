'use client'


import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import ViewTransitionLink from '@/components/greenhouse/motion/ViewTransitionLink'

import CustomChip from '@core/components/mui/Chip'

import { getMicrocopy } from '@/lib/copy'
import { GH_CLIENT_ONBOARDING } from '@/lib/copy/client-onboarding'

// TASK-1013 Slice 2 — cross-surface discoverability banner. Shown on the
// organization detail (Account 360) when the org has an in-flight onboarding
// lifecycle case, linking to its timeline. Renders null when there's no active
// case (honest: no banner = no onboarding in flight). Reused by the legacy view
// and the V2 workspace shell so the indicator is identical on both.

type OnboardingStatus = 'draft' | 'in_progress' | 'blocked'

const M = getMicrocopy()
const T = GH_CLIENT_ONBOARDING.onboardingCases

const META: Record<OnboardingStatus, { label: string; banner: string; color: 'warning' | 'info' | 'error' }> = {
  draft: { label: T.statusDraft, banner: T.orgBannerDraft, color: 'warning' },
  in_progress: { label: M.states.inProgress, banner: T.orgBannerInProgress, color: 'info' },
  blocked: { label: M.states.blocked, banner: T.orgBannerBlocked, color: 'error' }
}

const OnboardingCaseBanner = ({
  organizationId,
  status
}: {
  organizationId: string
  status?: OnboardingStatus | null
}) => {
  const theme = useTheme()

  if (!status) return null

  const meta = META[status]

  return (
    <Box
      role='status'
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        px: 4,
        py: 2.5,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette[meta.color].main, 0.24)}`,
        bgcolor: alpha(theme.palette[meta.color].main, 0.06)
      }}
    >
      <Stack direction='row' alignItems='center' spacing={2} sx={{ minWidth: 0 }}>
        <i className='tabler-rocket' style={{ color: theme.palette[meta.color].main }} aria-hidden='true' />
        <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={meta.label} />
        <Typography variant='body2'>{meta.banner}</Typography>
      </Stack>
      <Button
        component={ViewTransitionLink}
        href={`/agency/clients/${organizationId}/lifecycle`}
        size='small'
        variant='outlined'
        endIcon={<i className='tabler-arrow-right' />}
      >
        {T.orgOpenTimelineCta}
      </Button>
    </Box>
  )
}

export default OnboardingCaseBanner
