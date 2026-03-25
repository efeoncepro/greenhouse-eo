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

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

interface DeliveryData {
  identityProfileId: string
  memberId: string
  displayName: string
  projects: { ownedCount: number; activeOwnedCount: number }
  tasks: { totalAssigned: number; active: number; completed30d: number; overdue: number; avgRpa30d: number | null; onTimePct30d: number | null }
  crm: { ownedCompanies: number; ownedDeals: number; openDealsAmount: number }
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const MyDeliveryView = () => {
  const [data, setData] = useState<DeliveryData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/my/delivery')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  if (!data) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant='h6'>Sin datos de delivery</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mi Delivery'
            subheader='Proyectos, tareas y CRM'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-list-check' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Proyectos' stats={String(data.projects.ownedCount)} avatarIcon='tabler-folders' avatarColor='primary' subtitle={`${data.projects.activeOwnedCount} activos`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Tasks activas' stats={String(data.tasks.active)} avatarIcon='tabler-list-check' avatarColor='info' subtitle={`${data.tasks.totalAssigned} asignadas`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Completadas 30d' stats={String(data.tasks.completed30d)} avatarIcon='tabler-check' avatarColor='success' subtitle='Últimos 30 días' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Vencidas' stats={String(data.tasks.overdue)} avatarIcon='tabler-alert-triangle' avatarColor={data.tasks.overdue > 0 ? 'error' : 'secondary'} subtitle='Requieren atención' />
      </Grid>

      {/* CRM */}
      {(data.crm.ownedCompanies > 0 || data.crm.ownedDeals > 0) && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='CRM' subheader='Empresas y negocios que gestionas' />
            <Divider />
            <CardContent sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant='h4'>{data.crm.ownedCompanies}</Typography>
                <Typography variant='caption' color='text.secondary'>Empresas</Typography>
              </Box>
              <Box>
                <Typography variant='h4'>{data.crm.ownedDeals}</Typography>
                <Typography variant='caption' color='text.secondary'>Negocios</Typography>
              </Box>
              {data.crm.openDealsAmount > 0 && (
                <Box>
                  <Typography variant='h4'>{fmt(data.crm.openDealsAmount)}</Typography>
                  <Typography variant='caption' color='text.secondary'>Pipeline abierto</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Overdue alert */}
      {data.tasks.overdue > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <i className='tabler-alert-triangle' style={{ fontSize: 24, color: 'var(--mui-palette-error-main)' }} />
              <Box>
                <Typography variant='subtitle1' fontWeight={600}>
                  {data.tasks.overdue} task{data.tasks.overdue !== 1 ? 's' : ''} vencida{data.tasks.overdue !== 1 ? 's' : ''}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Revisa tus tasks activas y prioriza las que tienen fecha vencida.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default MyDeliveryView
