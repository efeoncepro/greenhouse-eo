'use client'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'

import CustomAvatar from '@core/components/mui/Avatar'
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

export const HomeReliabilityRibbon = ({ data }: HomeReliabilityRibbonProps) => {
  const router = useRouter()
  const rollupTone = STATUS_TONE[data.rollup]

  return (
    <Card component='aside' aria-label='Estado de plataforma' variant='outlined'>
      <CardContent sx={{ py: 2 }}>
        <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 1.5 }}>
          <CustomAvatar variant='rounded' skin='light' color={rollupTone.color} size={28}>
            <i className={rollupTone.icon} style={{ fontSize: 14 }} />
          </CustomAvatar>
          <Stack flex={1}>
            <Typography variant='subtitle2'>Estado de plataforma</Typography>
            <Typography variant='caption' color='text.secondary'>
              {data.modules.length} módulos · rollup {rollupTone.label}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          {data.modules.map(module => {
            const tone = STATUS_TONE[module.status]

            const tooltipParts: string[] = [
              `${module.label}: ${tone.label}`
            ]

            if (module.incidentsOpen > 0) tooltipParts.push(`${module.incidentsOpen} incidentes abiertos`)

            if (module.lastIncidentAt) {
              tooltipParts.push(`último: ${new Date(module.lastIncidentAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}`)
            }

            return (
              <Tooltip key={module.moduleKey} title={tooltipParts.join(' · ')}>
                <Chip
                  size='small'
                  variant='outlined'
                  color={tone.color}
                  icon={<i className={tone.icon} style={{ fontSize: 14 }} />}
                  label={module.label}
                  onClick={() => router.push('/admin/operations')}
                  sx={{ cursor: 'pointer', height: 28 }}
                />
              </Tooltip>
            )
          })}
        </Stack>
        {data.degradedSources.length > 0 ? (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1.5 }}>
            Fuentes degradadas: {data.degradedSources.join(', ')}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default HomeReliabilityRibbon
