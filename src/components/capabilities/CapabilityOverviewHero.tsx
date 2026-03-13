'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'

type CapabilityOverviewHeroHighlight = {
  label: string
  value: string
}

type CapabilityOverviewHeroProps = {
  eyebrow: string
  title: string
  description: string
  highlights: CapabilityOverviewHeroHighlight[]
  summaryLabel: string
  summaryValue: string
  summaryDetail: string
  badges: string[]
}

const highlightIcons = ['tabler-briefcase', 'tabler-eye', 'tabler-chart-dots', 'tabler-bolt']

const CapabilityOverviewHero = ({
  eyebrow,
  title,
  description,
  highlights,
  summaryLabel,
  summaryValue,
  summaryDetail,
  badges
}: CapabilityOverviewHeroProps) => {
  const theme = useTheme()
  const visibleBadges = badges.slice(0, 4)
  const hiddenBadgesCount = Math.max(0, badges.length - visibleBadges.length)

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 5,
        color: 'common.white',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.98)} 0%, ${alpha(
          theme.palette.info.main,
          0.88
        )} 48%, ${alpha(theme.palette.primary.dark, 0.98)} 100%)`
      }}
    >
      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          insetInlineEnd: { xs: -80, md: -20 },
          insetBlockStart: -60,
          width: { xs: 200, md: 280 },
          height: { xs: 200, md: 280 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.22)} 0%, ${alpha(
            theme.palette.common.white,
            0
          )} 72%)`
        }}
      />

      <Grid container spacing={4} sx={{ position: 'relative', zIndex: 1, p: { xs: 3.5, md: 4.5 } }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
                <Chip
                  label={eyebrow}
                  size='small'
                  sx={{
                    width: 'fit-content',
                    color: 'common.white',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    backgroundColor: alpha(theme.palette.common.white, 0.16),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.24)}`
                  }}
                />
                <Typography
                  variant='h2'
                  sx={{
                    color: 'common.white',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: { xs: 1.1, md: 1.02 },
                    fontSize: { xs: '2rem', md: '3rem' }
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  variant='body1'
                  sx={{
                    color: alpha(theme.palette.common.white, 0.88),
                    maxWidth: 620,
                    lineHeight: 1.55
                  }}
                >
                  {description}
                </Typography>
              </Stack>
            </Box>

            <Grid container spacing={2.5}>
              {highlights.map((item, index) => (
                <Grid key={item.label} size={{ xs: 12, sm: 6, xl: 4 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      borderRadius: 3,
                      backgroundColor: alpha(theme.palette.common.white, 0.12),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
                      minHeight: 84
                    }}
                  >
                    <CustomAvatar
                      skin='light-static'
                      color='primary'
                      variant='rounded'
                      sx={{
                        width: 52,
                        height: 52,
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: 'common.white',
                        backgroundColor: alpha(theme.palette.primary.dark, 0.58)
                      }}
                    >
                      <i className={highlightIcons[index] || 'tabler-chart-pie'} />
                    </CustomAvatar>
                    <Box>
                      <Typography variant='h5' sx={{ color: 'common.white', fontWeight: 800, lineHeight: 1.1 }}>
                        {item.value}
                      </Typography>
                      <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.82) }}>
                        {item.label}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box
            sx={{
              height: '100%',
              p: { xs: 3, md: 3.5 },
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 3,
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.22)} 0%, ${alpha(
                theme.palette.common.white,
                0.08
              )} 100%)`,
              border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
              boxShadow: `0 18px 48px ${alpha(theme.palette.common.black, 0.16)}`
            }}
          >
            <Box>
              <Typography
                variant='overline'
                sx={{ color: alpha(theme.palette.common.white, 0.8), fontWeight: 700, letterSpacing: '0.08em' }}
              >
                {summaryLabel}
              </Typography>
              <Typography
                variant='h1'
                sx={{
                  mt: 1,
                  color: 'common.white',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  fontSize: { xs: '3rem', md: '4rem' },
                  lineHeight: 1
                }}
              >
                {summaryValue}
              </Typography>
              <Typography variant='body2' sx={{ mt: 1.5, color: alpha(theme.palette.common.white, 0.88), lineHeight: 1.6 }}>
                {summaryDetail}
              </Typography>
            </Box>

            {badges.length > 0 ? (
              <Stack spacing={1.25}>
                <Typography variant='caption' sx={{ color: alpha(theme.palette.common.white, 0.76) }}>
                  Scope visible
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {visibleBadges.map(badge => (
                    <Chip
                      key={badge}
                      label={badge}
                      size='small'
                      sx={{
                        color: 'common.white',
                        fontWeight: 600,
                        backgroundColor: alpha(theme.palette.common.white, 0.14)
                      }}
                    />
                  ))}
                  {hiddenBadgesCount > 0 ? (
                    <Chip
                      label={`+${hiddenBadgesCount} more`}
                      size='small'
                      variant='outlined'
                      sx={{
                        color: 'common.white',
                        borderColor: alpha(theme.palette.common.white, 0.24),
                        backgroundColor: alpha(theme.palette.common.white, 0.06)
                      }}
                    />
                  ) : null}
                </Box>
              </Stack>
            ) : null}
          </Box>
        </Grid>
      </Grid>
    </Card>
  )
}

export default CapabilityOverviewHero
