'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { SeoMetricTone } from '@/lib/growth/seo/client/resolve-seo-metric-signal'

export type { SeoMetricTone }

export interface SeoPrimaryMetricProps {
  label: string
  signalLabel: string
  value: string
  hint: string
  tone?: SeoMetricTone
  iconClassName?: string
}

const SeoPrimaryMetric = ({
  label,
  signalLabel,
  value,
  hint,
  tone = 'primary',
  iconClassName = 'tabler-chart-line'
}: SeoPrimaryMetricProps) => {
  const theme = useTheme()

  const semantic = tone === 'success' || tone === 'warning' || tone === 'error' || tone === 'info'
    ? theme.greenhouseSemantic[tone]
    : null

  const palette = tone === 'default'
    ? { ink: 'text.primary', accent: 'text.secondary', wash: 'action.hover' }
    : semantic
      ? { ink: 'text.primary', accent: 'text.secondary', wash: 'action.hover' }
      : { ink: 'text.primary', accent: 'primary.dark', wash: 'primary.lighterOpacity' }

  return (
    <Box
      data-ui-kpi='primary'
      data-kpi-tone={tone}
      sx={{
        minWidth: 0,
        py: { xs: 0.5, sm: 1 },
        bgcolor: 'transparent',
        color: palette.ink
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction='row' spacing={1.5} alignItems='flex-start' sx={{ minWidth: 0 }}>
          <Box
            aria-hidden='true'
            sx={theme => ({
              display: 'grid',
              placeItems: 'center',
              inlineSize: { xs: 36, sm: 40 },
              blockSize: { xs: 36, sm: 40 },
              flexShrink: 0,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: palette.wash,
              color: palette.accent
            })}
          >
            <i className={iconClassName} aria-hidden='true' style={{ fontSize: 18 }} />
          </Box>
          <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant='subtitle2' color={palette.ink} fontWeight={800} noWrap>
              {signalLabel}
            </Typography>
            <Typography variant='caption' color='text.secondary' noWrap>
              {label}
            </Typography>
          </Stack>
          <Typography
            variant='kpiValue'
            component='p'
            color='text.primary'
            sx={{ lineHeight: 0.9, flexShrink: 0, letterSpacing: '-0.045em' }}
          >
            {value}
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 620, textWrap: 'pretty' }}>
          {hint}
        </Typography>
      </Stack>
    </Box>
  )
}

export default SeoPrimaryMetric
