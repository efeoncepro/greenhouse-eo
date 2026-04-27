'use client'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import type { HomeReliabilityRibbonData, ReliabilityModuleStatus } from '@/lib/home/contract'

interface HomeReliabilityRibbonProps {
  data: HomeReliabilityRibbonData
}

const STATUS_TONE: Record<ReliabilityModuleStatus, { color: ThemeColor; icon: string; label: string; progress: number }> = {
  healthy: { color: 'success', icon: 'tabler-circle-check-filled', label: 'OK', progress: 100 },
  degraded: { color: 'warning', icon: 'tabler-alert-circle', label: 'Degradado', progress: 50 },
  down: { color: 'error', icon: 'tabler-circle-x-filled', label: 'Caído', progress: 15 },
  unknown: { color: 'secondary', icon: 'tabler-circle-dotted', label: '—', progress: 0 }
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
 * Smart Home v2 Reliability Ribbon — port of Vuexy `EarningReports` row
 * pattern: avatar + label/sublabel + status chip + linear progress.
 * Compact, dense, no improvisation.
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
        subheader={`${healthy} de ${data.modules.length} módulos OK · rollup ${rollupTone.label}`}
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Abrir Reliability', 'Ver incidentes']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent className='flex flex-col gap-4'>
        {data.modules.map(module => {
          const tone = STATUS_TONE[module.status]
          const icon = MODULE_ICON[module.moduleKey] ?? 'tabler-puzzle'

          return (
            <div
              key={module.moduleKey}
              className='flex items-center gap-4 cursor-pointer'
              onClick={() => router.push('/admin/operations')}
            >
              <CustomAvatar skin='light' variant='rounded' color={tone.color} size={34}>
                <i className={classnames(icon, 'text-[18px]')} />
              </CustomAvatar>
              <div className='flex flex-wrap justify-between items-center gap-x-4 gap-y-1 is-full'>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography className='font-medium' color='text.primary' noWrap>
                    {module.label}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={tone.progress}
                    color={tone.color}
                    sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                  />
                </Stack>
                <Chip
                  size='small'
                  variant='tonal'
                  color={tone.color}
                  label={module.incidentsOpen > 0 ? `${module.incidentsOpen}` : tone.label}
                  sx={{ height: 22, fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default HomeReliabilityRibbon
