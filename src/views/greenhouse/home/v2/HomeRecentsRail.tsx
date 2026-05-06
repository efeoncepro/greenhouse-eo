'use client'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import { styled } from '@mui/material/styles'
import MuiTimeline from '@mui/lab/Timeline'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import Typography from '@mui/material/Typography'
import type { TimelineProps } from '@mui/lab/Timeline'

import type { ThemeColor } from '@core/types'
import OptionMenu from '@core/components/option-menu'

import type { HomeRecentItem, HomeRecentsRailData } from '@/lib/home/contract'

const TASK407_ARIA_CONTINUA_DONDE_LO_DEJASTE = "Continúa donde lo dejaste"


interface HomeRecentsRailProps {
  data: HomeRecentsRailData
}

const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  }
})

const DOT_COLOR_FOR_KIND: Record<string, ThemeColor> = {
  project: 'primary',
  quote: 'warning',
  client: 'info',
  invoice: 'success',
  payroll_period: 'primary',
  task: 'primary',
  space: 'info',
  view: 'secondary',
  report: 'info'
}

const KIND_LABEL: Record<string, string> = {
  project: 'Proyecto',
  quote: 'Cotización',
  client: 'Cliente',
  invoice: 'Factura',
  payroll_period: 'Nómina',
  task: 'Tarea',
  space: 'Space',
  view: 'Vista',
  report: 'Reporte'
}

const formatRelativeTime = (iso: string): string => {
  const target = new Date(iso).getTime()

  if (Number.isNaN(target)) return ''
  const diffSeconds = Math.max(1, Math.floor((Date.now() - target) / 1000))

  if (diffSeconds < 60) return `hace ${diffSeconds}s`
  const minutes = Math.floor(diffSeconds / 60)

  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)

  if (days < 30) return `hace ${days} d`

  return new Date(iso).toLocaleDateString('es-CL', { dateStyle: 'medium' })
}

interface RecentTimelineItemProps {
  item: HomeRecentItem
  isLast: boolean
}

const RecentTimelineItem = ({ item, isLast }: RecentTimelineItemProps) => {
  const router = useRouter()
  const dotColor = DOT_COLOR_FOR_KIND[item.entityKind] ?? 'secondary'
  const kindLabel = KIND_LABEL[item.entityKind] ?? item.entityKind

  return (
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot color={dotColor} />
        {isLast ? null : <TimelineConnector />}
      </TimelineSeparator>
      <TimelineContent
        onClick={() => router.push(item.href)}
        sx={{
          cursor: 'pointer',
          borderRadius: 1,
          transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-1'>
          <Typography className='font-medium' color='text.primary' noWrap>
            {item.title}
          </Typography>
          <Typography variant='caption'>{formatRelativeTime(item.lastSeenAt)}</Typography>
        </div>
        <Typography variant='body2' noWrap>
          {kindLabel}
          {item.badge ? ` · ${item.badge}` : ''}
        </Typography>
      </TimelineContent>
    </TimelineItem>
  )
}

export const HomeRecentsRail = ({ data }: HomeRecentsRailProps) => {
  const allItems = [...data.items, ...data.draftItems]

  if (allItems.length === 0) return null

  return (
    <Card component='aside' aria-label={TASK407_ARIA_CONTINUA_DONDE_LO_DEJASTE}>
      <CardHeader
        avatar={<i className='tabler-history text-xl' />}
        title='Continúa donde lo dejaste'
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Ver historial completo', 'Limpiar recientes']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent className='flex flex-col gap-6 pbe-5'>
        <Timeline>
          {allItems.slice(0, 8).map((item, index, array) => (
            <RecentTimelineItem key={item.recentId} item={item} isLast={index === array.length - 1} />
          ))}
        </Timeline>
      </CardContent>
    </Card>
  )
}

export default HomeRecentsRail
