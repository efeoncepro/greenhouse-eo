'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useRouter } from 'next/navigation'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import type { ClosingTrafficLight, HomeClosingCountdownData, HomeClosingCountdownItem } from '@/lib/home/contract'

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

const ICON_BY_DOMAIN: Record<HomeClosingCountdownItem['domain'], string> = {
  finance: 'tabler-cash',
  payroll: 'tabler-receipt'
}

const formatHoursRemaining = (hours: number | null): string => {
  if (hours == null) return 'sin fecha límite'
  if (hours < 0) return `vencido hace ${Math.abs(hours)} h`
  if (hours < 24) return `quedan ${hours} h`

  return `quedan ${Math.round(hours / 24)} d`
}

const ClosingItemCard = ({ item }: { item: HomeClosingCountdownItem }) => {
  const router = useRouter()
  const tone = TRAFFIC_LIGHT_TO_COLOR[item.trafficLight]
  const label = TRAFFIC_LIGHT_TO_LABEL[item.trafficLight]
  const icon = ICON_BY_DOMAIN[item.domain]
  const readiness = item.readinessPct ?? 0

  return (
    <Stack
      direction='row'
      spacing={2}
      alignItems='center'
      sx={{
        py: 1.5,
        px: 2,
        borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
        '&:hover': { backgroundColor: 'action.hover' }
      }}
    >
      <CustomAvatar variant='rounded' skin='light' color={tone} size={40}>
        <i className={icon} style={{ fontSize: 22 }} />
      </CustomAvatar>
      <Stack flex={1} spacing={0.5} minWidth={0}>
        <Stack direction='row' alignItems='center' spacing={1.5} flexWrap='wrap' useFlexGap>
          <Typography variant='body2' sx={{ fontWeight: 500 }}>
            {item.label} · {item.periodLabel}
          </Typography>
          <Chip size='small' variant='outlined' color={tone} label={label} />
        </Stack>
        <Stack direction='row' spacing={2} alignItems='center'>
          <LinearProgress
            value={readiness}
            valueBuffer={100}
            variant='determinate'
            color={tone}
            sx={{ flex: 1, height: 6, borderRadius: 3 }}
          />
          <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right' }}>
            {Math.round(readiness)}% listo
          </Typography>
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          {formatHoursRemaining(item.hoursRemaining)}
        </Typography>
      </Stack>
      {item.ctaHref ? (
        <Button
          size='small'
          variant='tonal'
          color={tone}
          onClick={() => item.ctaHref && router.push(item.ctaHref)}
        >
          {item.ctaLabel ?? 'Continuar'}
        </Button>
      ) : null}
    </Stack>
  )
}

export const HomeClosingCountdown = ({ data }: HomeClosingCountdownProps) => {
  if (!data || data.items.length === 0) return null

  return (
    <Card component='section' aria-label='Cierres en curso'>
      <CardHeader
        title={
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <CustomAvatar variant='rounded' skin='light' color='primary' size={32}>
              <i className='tabler-flag' style={{ fontSize: 18 }} />
            </CustomAvatar>
            <Typography variant='h6' component='h2'>Cierres en curso</Typography>
          </Stack>
        }
      />
      <CardContent sx={{ pt: 0, pb: 1, px: 1 }}>
        <Stack spacing={0}>
          {data.items.map(item => (
            <ClosingItemCard key={item.closingId} item={item} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default HomeClosingCountdown
