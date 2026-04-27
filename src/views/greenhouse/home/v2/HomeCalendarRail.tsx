'use client'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import classnames from 'classnames'

import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import type { CalendarEventKind, HomeCalendarEvent, HomeCalendarRailData } from '@/lib/home/contract'

interface HomeCalendarRailProps {
  data: HomeCalendarRailData
}

const KIND_META: Record<CalendarEventKind, { icon: string; color: ThemeColor }> = {
  closing: { icon: 'tabler-calendar-check', color: 'primary' },
  leave_window: { icon: 'tabler-beach', color: 'info' },
  sprint_end: { icon: 'tabler-flag', color: 'warning' },
  cycle_review: { icon: 'tabler-target', color: 'primary' },
  invoice_due: { icon: 'tabler-cash', color: 'success' },
  meeting: { icon: 'tabler-users', color: 'info' },
  holiday: { icon: 'tabler-confetti', color: 'success' }
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatDayBlock = (iso: string): { day: string; month: string } => {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return { day: '—', month: '' }

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTH_SHORT[date.getMonth()] ?? ''
  }
}

const formatRelative = (iso: string): string => {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return ''
  const diffDays = Math.round((date.getTime() - Date.now()) / 86400000)

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'mañana'
  if (diffDays > 1 && diffDays < 7) return `en ${diffDays} días`
  if (diffDays < 0) return `hace ${Math.abs(diffDays)} d`

  return date.toLocaleDateString('es-CL', { dateStyle: 'medium' })
}

const EventRow = ({ event }: { event: HomeCalendarEvent }) => {
  const router = useRouter()
  const meta = KIND_META[event.kind] ?? { icon: 'tabler-calendar', color: 'secondary' as ThemeColor }
  const day = formatDayBlock(event.startsAt)
  const relative = formatRelative(event.startsAt)

  return (
    <Stack
      direction='row'
      spacing={2}
      alignItems='center'
      sx={{
        py: 1,
        px: 1.5,
        borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
        cursor: event.href ? 'pointer' : 'default',
        transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': event.href ? { bgcolor: 'action.hover' } : undefined
      }}
      onClick={() => event.href && router.push(event.href)}
    >
      <Box
        sx={{
          width: 40,
          minWidth: 40,
          height: 40,
          borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
          border: theme => `1px solid ${theme.palette.divider}`,
          bgcolor: theme => `color-mix(in oklch, ${theme.palette[meta.color].main} 8%, ${theme.palette.background.paper})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant='caption' sx={{ fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }} color={`${meta.color}.main`}>
          {day.day}
        </Typography>
        <Typography variant='caption' sx={{ fontSize: 9, lineHeight: 1, mt: 0.25, textTransform: 'uppercase', letterSpacing: 0.5 }} color='text.secondary'>
          {day.month}
        </Typography>
      </Box>
      <Stack flex={1} minWidth={0} spacing={0.25}>
        <Typography variant='body2' sx={{ fontWeight: 500 }} color='text.primary' noWrap>
          {event.title}
        </Typography>
        <Stack direction='row' spacing={0.75} alignItems='center'>
          <i className={classnames(meta.icon, 'text-[14px]')} style={{ color: 'currentColor', opacity: 0.6 }} />
          <Typography variant='caption' color='text.secondary'>
            {relative}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  )
}

/**
 * Smart Home v2 Calendar Rail — agenda compact-list pattern.
 *
 * Surfaces the next 7 days of payroll closings, sprint endings, leave
 * windows. Each row: date block (day + month) + title + kind icon +
 * relative timestamp ("hoy" / "mañana" / "en N días"). Linear's "Up
 * next" + Vercel's "Upcoming" pattern.
 *
 * Hides entirely when there are no upcoming events — the aside stays
 * tight when the operation is calm.
 */
export const HomeCalendarRail = ({ data }: HomeCalendarRailProps) => {
  if (!data || data.events.length === 0) return null

  return (
    <Card component='aside' aria-label='Próximos eventos'>
      <CardHeader
        avatar={<i className='tabler-calendar-event text-xl' />}
        title='Próximos eventos'
        subheader={`${data.events.length} en los próximos 7 días`}
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Ver calendario completo', 'Sincronizar']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent className='flex flex-col gap-1 pbe-4'>
        {data.events.map(event => (
          <EventRow key={event.eventId} event={event} />
        ))}
      </CardContent>
    </Card>
  )
}

export default HomeCalendarRail
