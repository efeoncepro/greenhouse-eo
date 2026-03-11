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
        p: { xs: 4, md: 5 },
        borderRadius: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.92)} 0%, ${alpha(
          theme.palette.info.main,
          0.78
        )} 52%, ${alpha(theme.palette.primary.dark, 0.92)} 100%)`,
        color: 'common.white',
        height: '100%',
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
      <Grid container spacing={6} sx={{ position: 'relative', zIndex: 1, alignItems: 'center' }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2.5}>
            <Chip
              label={eyebrow}
              sx={{
                width: 'fit-content',
                color: 'common.white',
                borderColor: alpha(theme.palette.common.white, 0.32),
                backgroundColor: alpha(theme.palette.common.white, 0.12)
              }}
              variant='outlined'
            />
            <Stack spacing={1.25}>
              <Typography id={headingId} variant='h3' sx={{ color: 'common.white', maxWidth: 620 }}>
                {title}
              </Typography>
              <Typography id={descriptionId} sx={{ color: alpha(theme.palette.common.white, 0.76), maxWidth: 620 }}>
                {description}
              </Typography>
            </Stack>
            <Grid container spacing={2} component='ul' role='list' sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {highlights.map(item => (
                <Grid key={item.label} component='li' size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      backdropFilter: 'blur(12px)',
                      backgroundColor: alpha(theme.palette.common.white, 0.12),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      minHeight: 92
                    }}
                  >
                    <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.78) }}>
                      {item.label}
                    </Typography>
                    <Typography variant='h4' sx={{ color: 'common.white' }}>
                      {item.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2.5} sx={{ height: '100%' }}>
            <Box
              role='group'
              aria-label={`${summaryLabel}: ${summaryValue}. ${summaryDetail}`}
              sx={{
                flex: 1,
                minHeight: 216,
                borderRadius: 4,
                display: 'grid',
                alignContent: 'center',
                p: { xs: 3, md: 4 },
                background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.16)} 0%, ${alpha(
                  theme.palette.common.white,
                  0.06
                )} 100%)`,
                border: `1px solid ${alpha(theme.palette.common.white, 0.22)}`,
                boxShadow: `0 22px 60px ${alpha(theme.palette.common.black, 0.22)}`
              }}
            >
              <Stack spacing={1.25}>
                <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.72) }}>
                  {summaryLabel}
                </Typography>
                <Typography variant='h1' sx={{ color: 'common.white' }}>
                  {summaryValue}
                </Typography>
                <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.76), maxWidth: 240 }}>
                  {summaryDetail}
                </Typography>
              </Stack>
            </Box>

            {badges.length > 0 ? (
              <Box
                aria-labelledby={scopeId}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.common.white, 0.08),
                  border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`
                }}
              >
                <Stack spacing={1.5}>
                  <Typography id={scopeId} variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.72) }}>
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
                          backgroundColor: alpha(theme.palette.common.white, 0.12)
                        }}
                      />
                    ))}
                    {hiddenBadgesCount > 0 ? (
                      <Chip
                        size='small'
                        label={`+${hiddenBadgesCount} more`}
                        sx={{
                          color: 'common.white',
                          backgroundColor: alpha(theme.palette.common.white, 0.08),
                          border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`
                        }}
                        variant='outlined'
                      />
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ExecutiveHeroCard
