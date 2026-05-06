'use client'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomIconButton from '@core/components/mui/IconButton'
import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import type { ClosingTrafficLight, HomeClosingCountdownData, HomeClosingCountdownItem } from '@/lib/home/contract'

const TASK407_ARIA_CIERRES_EN_CURSO = "Cierres en curso"


interface HomeClosingCountdownProps {
  data: HomeClosingCountdownData
}

const TRAFFIC_LIGHT_TO_COLOR: Record<ClosingTrafficLight, ThemeColor> = {
  green: 'success',
  yellow: 'warning',
  red: 'error'
}

const TRAFFIC_LIGHT_TO_LABEL: Record<ClosingTrafficLight, string> = {
  green: 'En camino',
  yellow: 'Atención',
  red: 'Crítico'
}

const formatHoursRemaining = (hours: number | null): string => {
  if (hours == null) return 'sin fecha límite'
  if (hours < 0) return `vencido hace ${Math.abs(hours)} h`
  if (hours < 24) return `quedan ${hours} h`

  return `quedan ${Math.round(hours / 24)} d`
}

/**
 * Smart Home v2 Closing Countdown — port of Vuexy `AssignmentProgress`.
 * Each row: dual CircularProgress (track + value), title + meta column,
 * directional chevron CTA. Compact and dense — matches the rest of the
 * widget catalog without inventing new layout.
 */
export const HomeClosingCountdown = ({ data }: HomeClosingCountdownProps) => {
  const router = useRouter()

  if (!data || data.items.length === 0) return null

  return (
    <Card component='section' aria-label={TASK407_ARIA_CIERRES_EN_CURSO}>
      <CardHeader
        avatar={<i className='tabler-flag text-xl' />}
        title='Cierres en curso'
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Ver historial', 'Configurar alertas']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent className='flex flex-col gap-8'>
        {data.items.map((item: HomeClosingCountdownItem) => {
          const tone = TRAFFIC_LIGHT_TO_COLOR[item.trafficLight]
          const label = TRAFFIC_LIGHT_TO_LABEL[item.trafficLight]
          const value = item.readinessPct ?? 0

          return (
            <div
              key={item.closingId}
              className='flex items-center gap-4 cursor-pointer'
              onClick={() => item.ctaHref && router.push(item.ctaHref)}
            >
              <div className='relative flex items-center justify-center'>
                <CircularProgress
                  variant='determinate'
                  size={54}
                  value={100}
                  thickness={3}
                  className='absolute text-[var(--mui-palette-customColors-trackBg)]'
                />
                <CircularProgress
                  variant='determinate'
                  size={54}
                  value={value}
                  thickness={3}
                  color={tone}
                  sx={{ '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
                />
                <Typography
                  className='absolute font-medium'
                  color='text.primary'
                  sx={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}
                >
                  {`${Math.round(value)}%`}
                </Typography>
              </div>
              <div className='flex justify-between items-center is-full gap-4'>
                <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography className='font-medium' color='text.primary' noWrap>
                    {item.label} · {item.periodLabel}
                  </Typography>
                  <Typography variant='body2' color={`${tone}.main`}>
                    <i className={classnames(tone === 'success' ? 'tabler-check' : 'tabler-alert-circle', 'text-base align-middle me-1')} />
                    {label} · {formatHoursRemaining(item.hoursRemaining)}
                  </Typography>
                </Stack>
                <CustomIconButton
                  size='small'
                  variant='tonal'
                  color='secondary'
                  className='min-is-fit'
                  aria-label={item.ctaLabel ?? 'Continuar cierre'}
                >
                  <i className='tabler-chevron-right' />
                </CustomIconButton>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default HomeClosingCountdown
