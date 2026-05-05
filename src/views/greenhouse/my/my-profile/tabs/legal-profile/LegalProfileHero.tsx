'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import { alpha, useTheme } from '@mui/material/styles'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

import { LEGAL_PROFILE_COPY } from './copy'

interface LegalProfileHeroProps {
  completed: number
  total: number
  dotsState: ReadonlyArray<'complete' | 'pending' | 'empty'>
  variant: 'default' | 'empty' | 'complete'
}

const LegalProfileHero = ({ completed, total, dotsState, variant }: LegalProfileHeroProps) => {
  const theme = useTheme()
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const isComplete = variant === 'complete'

  const accentColor = isComplete
    ? theme.palette.success.main
    : theme.palette.primary.main

  const accentBg = alpha(accentColor, 0.12)

  return (
    <Card
      elevation={0}
      role='region'
      aria-labelledby='legal-hero-title'
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.customBorderRadius.lg,
        p: 6,
        mb: 6,
        ...(isComplete && {
          borderColor: theme.palette.success.main,
          background: `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.04)}, ${theme.palette.background.paper})`
        })
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 6,
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          alignItems: 'center'
        }}
      >
        <Stack direction='row' spacing={4} alignItems='flex-start'>
          <Box
            aria-hidden='true'
            sx={{
              width: 44,
              height: 44,
              borderRadius: theme.shape.customBorderRadius.md,
              backgroundColor: accentBg,
              color: accentColor,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}
          >
            <i className={isComplete ? 'tabler-shield-check' : 'tabler-shield-lock'} style={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant='h6' id='legal-hero-title' sx={{ mb: 1 }}>
              {isComplete ? LEGAL_PROFILE_COPY.hero.titleComplete : LEGAL_PROFILE_COPY.hero.title}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ maxWidth: '56ch' }}>
              {isComplete
                ? LEGAL_PROFILE_COPY.hero.leadComplete
                : variant === 'empty'
                  ? LEGAL_PROFILE_COPY.hero.leadEmpty
                  : LEGAL_PROFILE_COPY.hero.leadDefault}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ minWidth: { md: 240 } }} role='status' aria-live='polite'>
          <Stack direction='row' alignItems='baseline' justifyContent='space-between' sx={{ mb: 2 }}>
            <Typography
              variant='overline'
              color='text.secondary'
              sx={{ fontWeight: 500 }}
            >
              {LEGAL_PROFILE_COPY.hero.progressLabel}
            </Typography>
            <Typography
              variant='h5'
              component='span'
              sx={{
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                color: isComplete ? 'success.main' : 'text.primary'
              }}
            >
              <AnimatedCounter value={completed} format='integer' />
              <Box component='span' sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {LEGAL_PROFILE_COPY.hero.progressUnit}
              </Box>
            </Typography>
          </Stack>
          <LinearProgress
            variant='determinate'
            value={percent}
            aria-label={`${LEGAL_PROFILE_COPY.hero.progressLabel}: ${completed} de ${total}`}
            sx={{
              height: 8,
              borderRadius: theme.shape.customBorderRadius.xl,
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
              '& .MuiLinearProgress-bar': {
                borderRadius: theme.shape.customBorderRadius.xl,
                ...(isComplete && { backgroundColor: theme.palette.success.main })
              }
            }}
          />
          <Stack direction='row' spacing={2} sx={{ mt: 3 }} aria-hidden='true'>
            {dotsState.map((state, i) => (
              <Box
                key={i}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '1.5px solid',
                  transition: theme.transitions.create(['background-color', 'border-color'], {
                    duration: 200
                  }),
                  ...(state === 'empty' && {
                    backgroundColor: 'transparent',
                    borderColor: 'divider'
                  }),
                  ...(state === 'pending' && {
                    backgroundColor: 'warning.main',
                    borderColor: 'warning.main'
                  }),
                  ...(state === 'complete' && {
                    backgroundColor: 'success.main',
                    borderColor: 'success.main'
                  })
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box
          component='details'
          sx={{
            gridColumn: '1 / -1',
            mt: 2,
            pt: 4,
            borderTop: `1px solid ${theme.palette.divider}`,
            '& > summary': { cursor: 'pointer', listStyle: 'none', userSelect: 'none' },
            '& > summary::-webkit-details-marker': { display: 'none' },
            '&[open] .gh-chevron': { transform: 'rotate(180deg)' }
          }}
        >
          <Box
            component='summary'
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              color: 'text.secondary',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            <i className='tabler-info-circle' style={{ fontSize: 16 }} aria-hidden='true' />
            <span>{LEGAL_PROFILE_COPY.hero.privacyToggle}</span>
            <i
              className='tabler-chevron-down gh-chevron'
              style={{
                fontSize: 16,
                marginLeft: 'auto',
                transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)'
              }}
              aria-hidden='true'
            />
          </Box>
          <Box
            component='ul'
            sx={{
              mt: 3,
              pl: 8,
              color: 'text.secondary',
              fontSize: 13,
              lineHeight: 1.65,
              '& > li': { mb: 1 }
            }}
          >
            {LEGAL_PROFILE_COPY.hero.privacyBullets.map(b => (
              <li key={b}>{b}</li>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  )
}

export default LegalProfileHero
