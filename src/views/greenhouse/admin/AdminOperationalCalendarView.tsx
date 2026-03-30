'use client'

import { useMemo } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveMiniStatCard, GreenhouseCalendar, GreenhouseDatePicker } from '@/components/greenhouse'
import type { AdminOperationalCalendarOverview } from '@/lib/calendar/get-admin-operational-calendar-overview'

type Props = {
  data: AdminOperationalCalendarOverview
}

const AdminOperationalCalendarView = ({ data }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedDate = useMemo(() => new Date(`${data.monthDateIso}T12:00:00`), [data.monthDateIso])

  const handleMonthChange = (nextDate: Date | null) => {
    if (!nextDate) return

    const params = new URLSearchParams(searchParams.toString())
    const monthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

    params.set('month', monthKey)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={2}>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Chip size='small' color='primary' variant='tonal' label='UI Foundation' />
          <Chip size='small' variant='outlined' label='FullCalendar + DatePicker' />
        </Stack>
        <Typography variant='h4'>Calendario operativo</Typography>
        <Typography color='text.secondary' sx={{ maxWidth: 920 }}>
          Primera vista real que activa la foundation de calendario del portal. Expone feriados nacionales, ventana de cierre
          y último día hábil del mes operativo usando la timezone canónica `America/Santiago`.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          title='Mes operativo'
          value={data.monthKey}
          detail='Controlado desde el date picker de esta vista'
          icon='tabler-calendar-month'
          tone='info'
        />
        <ExecutiveMiniStatCard
          title='Feriados visibles'
          value={String(data.holidaysCount)}
          detail={data.holidaySource === 'nager' ? 'Hidratados desde Nager.Date' : 'Sincronización externa no disponible'}
          icon='tabler-confetti'
          tone={data.holidaySource === 'nager' ? 'success' : 'warning'}
        />
        <ExecutiveMiniStatCard
          title='Ventana de cierre'
          value={`${data.closeWindowBusinessDays} días`}
          detail='Días hábiles iniciales del mes operativo'
          icon='tabler-calendar-time'
          tone='warning'
        />
        <ExecutiveMiniStatCard
          title='Último día hábil'
          value={data.lastBusinessDay}
          detail='Deadline canónico del cierre mensual'
          icon='tabler-flag'
          tone='error'
        />
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent='space-between'>
              <Box sx={{ minWidth: { xs: '100%', lg: 260 } }}>
                <GreenhouseDatePicker
                  label='Mes visible'
                  value={selectedDate}
                  onChange={handleMonthChange}
                  showMonthYearPicker
                  placeholder='MM/AAAA'
                  helperText='Cambia el mes para recalcular feriados y hitos del período.'
                />
              </Box>
              <Alert severity={data.holidaySource === 'nager' ? 'success' : 'warning'} variant='outlined'>
                {data.holidaySource === 'nager'
                  ? 'Los feriados visibles vienen de Nager.Date con contexto operativo Greenhouse.'
                  : 'Nager.Date no respondió; la vista mantiene solo los hitos derivados del calendario operativo.'}
              </Alert>
            </Stack>

            <GreenhouseCalendar events={data.events} initialDate={data.monthDateIso} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default AdminOperationalCalendarView
