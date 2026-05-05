'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import { alpha, useTheme } from '@mui/material/styles'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

import { LEGAL_PROFILE_COPY } from './copy'

interface LegalProfileHeroProps {
  completed: number
  total: number
  variant: 'default' | 'empty' | 'complete'
}

/**
 * TASK-784 flat redesign — Hero compact dentro del container unico.
 *
 * NO Card wrapper, NO border externo. Vive dentro del container raiz que
 * provee LegalProfileTab. Layout 2-cols desktop (intro + progress meter),
 * 1-col mobile.
 *
 * Privacy moved to legal-card footer (no acordeon dentro del hero).
 */
const LegalProfileHero = ({ completed, total, variant }: LegalProfileHeroProps) => {
  const theme = useTheme()
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const isComplete = variant === 'complete'

  const accentColor = isComplete ? theme.palette.success.main : theme.palette.primary.main
  const accentBg = alpha(accentColor, 0.12)

  return (
    <Box
      role='region'
      aria-labelledby='legal-hero-title'
      sx={{
        display: 'grid',
        gap: 6,
        gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
        alignItems: 'center',
        px: 6,
        py: 5,
        ...(isComplete && {
          background: `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.04)}, transparent)`
        })
      }}
    >
      <Stack direction='row' spacing={3} alignItems='flex-start'>
        <Box
          aria-hidden='true'
          sx={{
            width: 40,
            height: 40,
            borderRadius: theme.shape.customBorderRadius.md,
            backgroundColor: accentBg,
            color: accentColor,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <i
            className={isComplete ? 'tabler-shield-check' : 'tabler-shield-lock'}
            style={{ fontSize: 20 }}
          />
        </Box>
        <Box>
          <Typography
            variant='subtitle1'
            id='legal-hero-title'
            sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.3 }}
          >
            {isComplete ? LEGAL_PROFILE_COPY.hero.titleComplete : LEGAL_PROFILE_COPY.hero.title}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ display: 'block', maxWidth: '56ch', lineHeight: 1.5, fontSize: 13 }}
          >
            {isComplete
              ? LEGAL_PROFILE_COPY.hero.leadComplete
              : variant === 'empty'
                ? LEGAL_PROFILE_COPY.hero.leadEmpty
                : LEGAL_PROFILE_COPY.hero.leadDefault}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ minWidth: { md: 220 } }} role='status' aria-live='polite'>
        <Stack
          direction='row'
          alignItems='baseline'
          justifyContent='space-between'
          sx={{ mb: 1 }}
        >
          <Typography
            variant='caption'
            sx={{
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              fontSize: 11
            }}
          >
            {LEGAL_PROFILE_COPY.hero.progressLabel}
          </Typography>
          <Typography
            variant='subtitle1'
            component='span'
            sx={{
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.01em',
              fontWeight: 600,
              color: isComplete ? 'success.main' : 'text.primary'
            }}
          >
            <AnimatedCounter value={completed} format='integer' />
            <Box component='span' sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {' '}
              / {total}
            </Box>
          </Typography>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={percent}
          aria-label={`${LEGAL_PROFILE_COPY.hero.progressLabel}: ${completed} de ${total}`}
          sx={{
            height: 6,
            borderRadius: theme.shape.customBorderRadius.xl,
            backgroundColor: alpha(theme.palette.text.primary, 0.06),
            '& .MuiLinearProgress-bar': {
              borderRadius: theme.shape.customBorderRadius.xl,
              ...(isComplete && { backgroundColor: theme.palette.success.main })
            }
          }}
        />
      </Box>
    </Box>
  )
}

export default LegalProfileHero
