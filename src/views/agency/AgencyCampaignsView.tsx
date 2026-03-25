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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

interface CampaignItem {
  campaignId: string
  eoId: string
  displayName: string
  campaignType: string
  status: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  projectCount: number
  budgetClp: number | null
  spaceId: string
}

const STATUS_COLORS: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'primary'> = {
  draft: 'secondary', planning: 'info', active: 'success', paused: 'warning', completed: 'primary', archived: 'secondary'
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', planning: 'Planificación', active: 'Activa', paused: 'Pausada', completed: 'Completada', archived: 'Archivada'
}

const TYPE_LABELS: Record<string, string> = {
  campaign: 'Campaña', launch: 'Lanzamiento', seasonal: 'Temporada', sprint_group: 'Grupo de ciclos', always_on: 'Always-on'
}

const TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'secondary'> = {
  campaign: 'primary', launch: 'success', seasonal: 'warning', sprint_group: 'info', always_on: 'secondary'
}

const fmtClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

const AgencyCampaignsView = () => {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/campaigns')

      if (res.ok) {
        const data = await res.json()

        setCampaigns(data.items ?? [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const active = campaigns.filter(c => c.status === 'active').length
  const completed = campaigns.filter(c => c.status === 'completed').length
  const avgProjects = campaigns.length > 0 ? Math.round(campaigns.reduce((s, c) => s + c.projectCount, 0) / campaigns.length) : 0
  const totalBudget = campaigns.reduce((s, c) => s + (c.budgetClp ?? 0), 0)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Campañas' subheader='Iniciativas cross-space' avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-speakerphone' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>} />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Total' stats={String(campaigns.length)} avatarIcon='tabler-flag' avatarColor='primary' subtitle='Campañas registradas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Activas' stats={String(active)} avatarIcon='tabler-flame' avatarColor='success' subtitle='En ejecución' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Completadas' stats={String(completed)} avatarIcon='tabler-check' avatarColor='info' subtitle='Finalizadas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Budget total' stats={totalBudget > 0 ? fmtClp(totalBudget) : '—'} avatarIcon='tabler-cash' avatarColor='warning' subtitle={`Avg ${avgProjects} proyectos`} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Listado de campañas' />
          <Divider />
          {campaigns.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant='h6'>Sin campañas registradas</Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Campaña</TableCell>
                    <TableCell align='center'>Tipo</TableCell>
                    <TableCell align='center'>Estado</TableCell>
                    <TableCell>Fechas</TableCell>
                    <TableCell align='right'>Proyectos</TableCell>
                    <TableCell align='right'>Budget</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.map(c => (
                    <TableRow key={c.campaignId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>{c.displayName}</Typography>
                        <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} color='text.disabled'>{c.eoId}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip round='true' size='small' variant='tonal' color={TYPE_COLORS[c.campaignType] || 'secondary'} label={TYPE_LABELS[c.campaignType] || c.campaignType} />
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip round='true' size='small' variant='tonal' color={STATUS_COLORS[c.status] || 'secondary'} label={STATUS_LABELS[c.status] || c.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {formatDate(c.plannedStartDate)} — {formatDate(c.plannedEndDate)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>{c.projectCount}</TableCell>
                      <TableCell align='right'>{c.budgetClp ? fmtClp(c.budgetClp) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default AgencyCampaignsView
