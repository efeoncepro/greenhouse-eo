'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import type { HomeReliabilityRibbonData, ReliabilityModuleStatus } from '@/lib/home/contract'

interface HomeReliabilityRibbonProps {
  data: HomeReliabilityRibbonData
}

const STATUS_TONE: Record<ReliabilityModuleStatus, { color: ThemeColor; icon: string; label: string }> = {
  healthy: { color: 'success', icon: 'tabler-circle-check-filled', label: 'OK' },
  degraded: { color: 'warning', icon: 'tabler-alert-circle', label: 'Degradado' },
  down: { color: 'error', icon: 'tabler-circle-x-filled', label: 'Caído' },
  unknown: { color: 'secondary', icon: 'tabler-circle-dotted', label: '—' }
}

const MODULE_ICON: Record<string, string> = {
  finance: 'tabler-cash',
  delivery: 'tabler-target',
  cloud: 'tabler-cloud',
  home: 'tabler-home',
  'integrations.notion': 'tabler-brand-notion',
  'integrations.teams': 'tabler-brand-microsoft-teams'
}

/**
 * Smart Home v2 Reliability Ribbon — dense status-dot list.
 *
 * Inspired by Vercel/GitHub status pages: status dot + module name +
 * incident count when > 0. No `LinearProgress` per row (too noisy when
 * everything is healthy). Total height stays within 6 modules ≈ 220px,
 * keeping the aside balanced against the main column.
 */
export const HomeReliabilityRibbon = ({ data }: HomeReliabilityRibbonProps) => {
  const router = useRouter()
  const rollupTone = STATUS_TONE[data.rollup]
  const healthy = data.modules.filter(m => m.status === 'healthy').length

  return (
    <Card component='aside' aria-label='Estado de plataforma'>
      <CardHeader
        avatar={<i className={classnames(rollupTone.icon, 'text-xl', `text-${rollupTone.color}`)} />}
        title='Estado de plataforma'
        subheader={`${healthy}/${data.modules.length} módulos · ${rollupTone.label}`}
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Abrir Reliability', 'Ver incidentes']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent className='flex flex-col gap-3 pbe-5'>
        {data.modules.map(module => {
          const tone = STATUS_TONE[module.status]
          const icon = MODULE_ICON[module.moduleKey] ?? 'tabler-puzzle'

          return (
            <Stack
              key={module.moduleKey}
              direction='row'
              alignItems='center'
              spacing={2}
              sx={{
                py: 0.75,
                px: 2,
                borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
                cursor: 'pointer',
                transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1)',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => router.push('/admin/operations')}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: theme => theme.palette[tone.color].main,
                  boxShadow: theme => `0 0 0 3px color-mix(in oklch, ${theme.palette[tone.color].main} 22%, transparent)`,
                  flexShrink: 0,
                  '&::after':
                    module.status === 'healthy'
                      ? {
                          content: '""',
                          position: 'absolute',
                          inset: -4,
                          borderRadius: '50%',
                          bgcolor: theme => theme.palette[tone.color].main,
                          opacity: 0.35,
                          animation: 'gh-status-heartbeat 2.4s cubic-bezier(0.2, 0, 0, 1) infinite'
                        }
                      : undefined,
                  '@media (prefers-reduced-motion: reduce)': {
                    '&::after': { animation: 'none' }
                  },
                  '@keyframes gh-status-heartbeat': {
                    '0%': { transform: 'scale(1)', opacity: 0.35 },
                    '60%': { transform: 'scale(1.55)', opacity: 0 },
                    '100%': { transform: 'scale(1.55)', opacity: 0 }
                  }
                }}
              />
              <i className={classnames(icon, 'text-[16px]')} style={{ opacity: 0.65 }} />
              <Typography variant='body2' sx={{ fontWeight: 500, flex: 1, minWidth: 0 }} noWrap color='text.primary'>
                {module.label}
              </Typography>
              {module.incidentsOpen > 0 ? (
                <Chip
                  size='small'
                  variant='tonal'
                  color={tone.color}
                  label={`${module.incidentsOpen}`}
                  sx={{ height: 22, minWidth: 28, fontVariantNumeric: 'tabular-nums' }}
                />
              ) : (
                <Typography variant='caption' color='text.secondary'>{tone.label}</Typography>
              )}
            </Stack>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default HomeReliabilityRibbon
