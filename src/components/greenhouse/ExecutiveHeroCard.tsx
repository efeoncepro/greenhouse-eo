'use client'

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

  return (
    <Box
      sx={{
        p: { xs: 4, md: 6 },
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
          <Stack spacing={3}>
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
            <Stack spacing={1.5}>
              <Typography variant='h3' sx={{ color: 'common.white', maxWidth: 680 }}>
                {title}
              </Typography>
              <Typography sx={{ color: alpha(theme.palette.common.white, 0.76), maxWidth: 760 }}>{description}</Typography>
            </Stack>
            <Stack direction='row' flexWrap='wrap' gap={1.5}>
              {badges.map(badge => (
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
            </Stack>
            <Grid container spacing={2}>
              {highlights.map(item => (
                <Grid key={item.label} size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      backdropFilter: 'blur(12px)',
                      backgroundColor: alpha(theme.palette.common.white, 0.12),
                      border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      minHeight: 104
                    }}
                  >
                    <Typography variant='h4' sx={{ color: 'common.white' }}>
                      {item.value}
                    </Typography>
                    <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.78) }}>
                      {item.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
            <Box
              sx={{
                width: { xs: 220, md: 260 },
                height: { xs: 220, md: 260 },
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                p: 4,
                textAlign: 'center',
                background: `radial-gradient(circle at 30% 30%, ${alpha(theme.palette.common.white, 0.3)} 0%, ${alpha(
                  theme.palette.common.white,
                  0.08
                )} 42%, ${alpha(theme.palette.common.white, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.common.white, 0.22)}`,
                boxShadow: `0 22px 60px ${alpha(theme.palette.common.black, 0.22)}`
              }}
            >
              <Stack spacing={1} alignItems='center'>
                <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.72) }}>
                  {summaryLabel}
                </Typography>
                <Typography variant='h1' sx={{ color: 'common.white' }}>
                  {summaryValue}
                </Typography>
                <Typography variant='body2' sx={{ color: alpha(theme.palette.common.white, 0.76), maxWidth: 180 }}>
                  {summaryDetail}
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ExecutiveHeroCard
