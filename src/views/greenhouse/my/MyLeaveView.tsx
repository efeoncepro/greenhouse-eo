'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

interface LeaveData {
  leave: {
    vacationAllowance: number
    vacationUsed: number
    vacationReserved: number
    vacationAvailable: number
    personalAllowance: number
    personalUsed: number
    pendingRequests: number
    approvedRequestsThisYear: number
  } | null
}

const MyLeaveView = () => {
  const [data, setData] = useState<LeaveData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/my/leave')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const leave = data?.leave

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mis Permisos'
            subheader='Saldos de vacaciones y días personales'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-calendar-event' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {!leave ? (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <i className='tabler-calendar-off' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
              <Typography variant='h6' sx={{ mt: 2 }}>Sin datos de permisos disponibles</Typography>
              <Typography variant='body2' color='text.secondary'>Los saldos aparecerán cuando el módulo HR esté configurado.</Typography>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        <>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle title='Vacaciones' stats={String(leave.vacationAvailable)} avatarIcon='tabler-beach' avatarColor='success' subtitle={`De ${leave.vacationAllowance} anuales`} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle title='Usadas' stats={String(leave.vacationUsed)} avatarIcon='tabler-calendar-check' avatarColor='info' subtitle='Días tomados' />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle title='Personales' stats={String(leave.personalAllowance - leave.personalUsed)} avatarIcon='tabler-user-heart' avatarColor='primary' subtitle={`De ${leave.personalAllowance} anuales`} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle title='Pendientes' stats={String(leave.pendingRequests)} avatarIcon='tabler-clock' avatarColor={leave.pendingRequests > 0 ? 'warning' : 'secondary'} subtitle='Solicitudes por aprobar' />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title='Resumen del año' />
              <Divider />
              <CardContent sx={{ display: 'flex', gap: 4 }}>
                <Box><Typography variant='h4'>{leave.approvedRequestsThisYear}</Typography><Typography variant='caption' color='text.secondary'>Solicitudes aprobadas</Typography></Box>
                <Box><Typography variant='h4'>{leave.vacationReserved}</Typography><Typography variant='caption' color='text.secondary'>Días reservados</Typography></Box>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default MyLeaveView
