'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import esLocale from '@fullcalendar/core/locales/es'

import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

export interface GreenhouseCalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  allDay?: boolean
  color?: string
  extendedProps?: Record<string, unknown>
}

type Props = {
  events: GreenhouseCalendarEvent[]
  initialDate: string
  height?: number | 'auto'
}

const GreenhouseCalendar = ({ events, initialDate, height = 'auto' }: Props) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Box
      sx={{
        '& .fc': {
          '--fc-border-color': theme.palette.divider,
          '--fc-page-bg-color': theme.palette.background.paper,
          '--fc-neutral-bg-color': theme.palette.action.hover,
          '--fc-list-event-hover-bg-color': theme.palette.action.hover,
          '--fc-today-bg-color': theme.palette.primary.lightOpacity,
          fontFamily: theme.typography.fontFamily
        },
        '& .fc .fc-toolbar-title': {
          fontSize: theme.typography.h5.fontSize,
          fontWeight: 600
        },
        '& .fc .fc-button': {
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
          textTransform: 'none',
          boxShadow: 'none'
        },
        '& .fc .fc-button-primary:not(:disabled).fc-button-active, & .fc .fc-button-primary:not(:disabled):active': {
          backgroundColor: theme.palette.primary.main,
          borderColor: theme.palette.primary.main,
          color: theme.palette.common.white
        },
        '& .fc .fc-event': {
          borderRadius: theme.shape.borderRadius,
          border: 'none',
          paddingInline: theme.spacing(0.5)
        }
      }}
    >
      <FullCalendar
        key={`${initialDate}-${isMobile ? 'mobile' : 'desktop'}`}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={isMobile ? 'listMonth' : 'dayGridMonth'}
        initialDate={initialDate}
        locale={esLocale}
        timeZone='America/Santiago'
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: isMobile ? 'listMonth' : 'dayGridMonth,timeGridWeek,listMonth'
        }}
        height={height}
        events={events}
        dayMaxEvents={3}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
      />
    </Box>
  )
}

export default GreenhouseCalendar
