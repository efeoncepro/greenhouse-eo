'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

// ── Types ──

interface CampaignItem {
  campaignId: string
  eoId: string
  displayName: string
  campaignType: string
  status: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  projectCount: number
}

// ── Helpers ──

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

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

// ── Component ──

const GreenhouseClientCampaigns = () => {
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (filter === 'active') params.set('status', 'active')
      if (filter === 'completed') params.set('status', 'completed')

      const res = await fetch(`/api/campaigns?${params}`)

      if (res.ok) {
        const data = await res.json()

        setCampaigns(data.items ?? [])
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { void fetchCampaigns() }, [fetchCampaigns])

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Campañas'
            subheader='Tus iniciativas agrupadas por objetivo'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-flag' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CustomChip label='Todas' variant={filter === 'all' ? 'filled' : 'tonal'} color='primary' onClick={() => setFilter('all')} sx={{ cursor: 'pointer' }} />
                <CustomChip label='Activas' variant={filter === 'active' ? 'filled' : 'tonal'} color='success' onClick={() => setFilter('active')} sx={{ cursor: 'pointer' }} />
                <CustomChip label='Completadas' variant={filter === 'completed' ? 'filled' : 'tonal'} color='secondary' onClick={() => setFilter('completed')} sx={{ cursor: 'pointer' }} />
              </Box>
            }
          />
        </Card>
      </Grid>

      {/* Campaign grid */}
      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        </Grid>
      ) : campaigns.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-flag-off' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
                <Typography variant='h6' sx={{ mt: 2 }}>Sin campañas</Typography>
                <Typography variant='body2' color='text.secondary'>
                  No hay campañas registradas para tu cuenta.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        campaigns.map(c => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={c.campaignId}>
            <Card
              elevation={0}
              onClick={() => router.push(`/campanas/${c.campaignId}`)}
              sx={{ border: t => `1px solid ${t.palette.divider}`, cursor: 'pointer', '&:hover': { boxShadow: t => t.shadows[4] }, height: '100%' }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Typography variant='h6' sx={{ flex: 1, mr: 1 }}>{c.displayName}</Typography>
                  <CustomChip round='true' size='small' variant='tonal' color={STATUS_COLORS[c.status] || 'secondary'} label={STATUS_LABELS[c.status] || c.status} />
                </Box>

                <CustomChip round='true' size='small' variant='tonal' color={TYPE_COLORS[c.campaignType] || 'secondary'} label={TYPE_LABELS[c.campaignType] || c.campaignType} sx={{ alignSelf: 'start' }} />

                <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <i className='tabler-calendar' style={{ fontSize: 14 }} />
                  {formatDate(c.plannedStartDate)} — {formatDate(c.plannedEndDate)}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='caption' color='text.secondary'>
                    <i className='tabler-folders' style={{ fontSize: 14, marginRight: 4 }} />
                    {c.projectCount} proyecto{c.projectCount !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.disabled' }}>
                    {c.eoId}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  )
}

export default GreenhouseClientCampaigns
