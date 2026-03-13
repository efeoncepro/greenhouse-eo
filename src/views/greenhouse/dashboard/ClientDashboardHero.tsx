'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { BusinessLineBadge } from '@/components/greenhouse'
import { GH_CLIENT_NAV, GH_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { ModuleBadge } from './config'

type ClientDashboardHeroProps = {
  clientName: string
  subtitle: string
  badges: ModuleBadge[]
  updatedAtLabel: string
}

const ClientDashboardHero = ({ clientName, subtitle, badges, updatedAtLabel }: ClientDashboardHeroProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        p: { xs: 3.5, md: 4.5 },
        borderRadius: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.92)} 0%, ${alpha(
          theme.palette.info.main,
          0.78
        )} 48%, ${alpha(theme.palette.primary.dark, 0.95)} 100%)`,
        color: 'common.white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          insetInlineEnd: -50,
          insetBlockStart: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.26)} 0%, ${alpha(
            theme.palette.common.white,
            0
          )} 72%)`
        }}
      />

      <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' gap={2}>
          <Stack spacing={1}>
            <Typography variant='overline' sx={{ color: alpha(theme.palette.common.white, 0.78), letterSpacing: '0.08em' }}>
              {clientName}
            </Typography>
            <Typography
              variant='h3'
              sx={{
                color: 'common.white',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.08,
                fontSize: { xs: '1.8rem', md: '2.35rem' }
              }}
            >
              {GH_CLIENT_NAV.dashboard.label}
            </Typography>
          </Stack>
          <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.78), textAlign: { xs: 'left', md: 'right' } }}>
            {updatedAtLabel}
          </Typography>
        </Stack>

        <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.78), maxWidth: 720 }}>
          {GH_MESSAGES.subtitle_pulse}
        </Typography>

        <Typography variant='body1' sx={{ color: alpha(theme.palette.common.white, 0.92), maxWidth: 820, lineHeight: 1.6 }}>
          {subtitle}
        </Typography>

        {badges.length > 0 ? (
          <Stack direction='row' gap={1} flexWrap='wrap'>
            {badges.map(badge => (
              badge.surface === 'business-line' && badge.brand ? (
                <BusinessLineBadge key={badge.key} brand={badge.brand} negative />
              ) : (
                <Chip
                  key={badge.key}
                  size='small'
                  label={badge.label}
                  sx={{
                    color: 'common.white',
                    fontWeight: 600,
                    backgroundColor: alpha(theme.palette.common.white, 0.14),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`
                  }}
                />
              )
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  )
}

export default ClientDashboardHero
