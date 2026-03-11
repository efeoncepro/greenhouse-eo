'use client'

import { useId } from 'react'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

type ExecutiveHeroHighlight = {
  label: string
  value: string
}

type ExecutiveHeroCardProps = {
  eyebrow: string
  title: string
  description: string
  highlights: ExecutiveHeroHighlight[]
  summaryLabel: string
  summaryValue: string
  summaryDetail: string
  badges: string[]
}

const ExecutiveHeroCard = ({
  eyebrow,
  title,
  description,
  highlights,
  summaryLabel,
  summaryValue,
  summaryDetail,
  badges
}: ExecutiveHeroCardProps) => {
  const theme = useTheme()
  const headingId = useId()
  const descriptionId = useId()
  const scopeId = useId()
  const visibleBadges = badges.slice(0, 3)
  const hiddenBadgesCount = Math.max(0, badges.length - visibleBadges.length)

  return (
    <Box
      component='section'
      role='region'
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      sx={{
        p: { xs: 3.5, md: 4 },
        borderRadius: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.92)} 0%, ${alpha(
          theme.palette.info.main,
          0.78
        )} 52%, ${alpha(theme.palette.primary.dark, 0.92)} 100%)`,
        color: 'common.white',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          insetInlineEnd: { xs: -70, md: -30 },
          insetBlockStart: { xs: -60, md: -40 },
          width: { xs: 180, md: 240 },
          height: { xs: 180, md: 240 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.26)} 0%, ${alpha(
            theme.palette.common.white,
            0
          )} 72%)`
        }}
      />
      <Grid container spacing={{ xs: 3.5, lg: 4 }} sx={{ position: 'relative', zIndex: 1, alignItems: 'start' }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2}>
            <Chip
              label={eyebrow}
              size='small'
              sx={{
                width: 'fit-content',
                color: 'common.white',
                fontWeight: 700,
                letterSpacing: '0.06em',
                borderColor: alpha(theme.palette.common.white, 0.32),
                backgroundColor: alpha(theme.palette.common.white, 0.14)
              }}
              variant='outlined'
            />
            <Stack spacing={1}>
              <Typography
                id={headingId}
                variant='h3'
                sx={{
                  color: 'common.white',
                  maxWidth: 680,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: { xs: 1.16, md: 1.08 },
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.4rem' }
                }}
              >
                {title}
              </Typography>
              <Typography
                id={descriptionId}
                variant='body1'
                sx={{
                  color: alpha(theme.palette.common.white, 0.9),
                  maxWidth: 620,
                  lineHeight: 1.55,
                  fontWeight: 500
                }}
              >
                {description}
              </Typography>
            </Stack>
            <Grid container spacing={1.5} component='ul' role='list' sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {highlights.map(item => (
                <Grid key={item.label} component='li' size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      backdropFilter: 'blur(12px)',
                      backgroundColor: alpha(theme.palette.common.white, 0.14),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      minHeight: 78
                    }}
                  >
                    <Typography
                      variant='overline'
                      sx={{ color: alpha(theme.palette.common.white, 0.82), fontWeight: 700, lineHeight: 1.2 }}
                    >
                      {item.label}
                    </Typography>
                    <Typography variant='h5' sx={{ color: 'common.white', fontWeight: 800, lineHeight: 1.12 }}>
                      {item.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box
            role='group'
            aria-label={`${summaryLabel}: ${summaryValue}. ${summaryDetail}`}
            sx={{
              borderRadius: 4,
              p: { xs: 3, md: 3.5 },
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.18)} 0%, ${alpha(
                theme.palette.common.white,
                0.08
              )} 100%)`,
              border: `1px solid ${alpha(theme.palette.common.white, 0.22)}`,
              boxShadow: `0 20px 50px ${alpha(theme.palette.common.black, 0.18)}`
            }}
          >
            <Stack spacing={2.25}>
              <Stack spacing={0.75}>
                <Typography
                  variant='overline'
                  sx={{ color: alpha(theme.palette.common.white, 0.84), fontWeight: 700, lineHeight: 1.2 }}
                >
                  {summaryLabel}
                </Typography>
                <Typography
                  variant='h2'
                  sx={{
                    color: 'common.white',
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    fontSize: { xs: '2.25rem', md: '2.9rem' }
                  }}
                >
                  {summaryValue}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: alpha(theme.palette.common.white, 0.9), maxWidth: 280, lineHeight: 1.55 }}
                >
                  {summaryDetail}
                </Typography>
              </Stack>

              {badges.length > 0 ? (
                <Stack spacing={1}>
                  <Typography id={scopeId} variant='caption' sx={{ color: alpha(theme.palette.common.white, 0.78) }}>
                    Scope visible
                  </Typography>
                  <Stack direction='row' flexWrap='wrap' gap={1}>
                    {visibleBadges.map(badge => (
                      <Chip
                        key={badge}
                        size='small'
                        label={badge}
                        sx={{
                          color: 'common.white',
                          fontWeight: 600,
                          backgroundColor: alpha(theme.palette.common.white, 0.14)
                        }}
                      />
                    ))}
                    {hiddenBadgesCount > 0 ? (
                      <Chip
                        size='small'
                        label={`+${hiddenBadgesCount} more`}
                        sx={{
                          color: 'common.white',
                          fontWeight: 600,
                          backgroundColor: alpha(theme.palette.common.white, 0.08),
                          border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`
                        }}
                        variant='outlined'
                      />
                    ) : null}
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ExecutiveHeroCard
