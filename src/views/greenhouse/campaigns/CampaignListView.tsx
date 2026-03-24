'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

// ── Types ──

interface CampaignItem {
  campaignId: string
  eoId: string
  displayName: string
  description: string | null
  campaignType: string
  status: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  projectCount: number
  budgetClp: number | null
  channels: string[]
}

// ── Helpers ──

const STATUS_COLORS: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'primary'> = {
  draft: 'secondary',
  planning: 'info',
  active: 'success',
  paused: 'warning',
  completed: 'primary',
  archived: 'secondary'
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  planning: 'Planificación',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  archived: 'Archivada'
}

const TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'secondary'> = {
  campaign: 'primary',
  launch: 'success',
  seasonal: 'warning',
  sprint_group: 'info',
  always_on: 'secondary'
}

const TYPE_LABELS: Record<string, string> = {
  campaign: 'Campaña',
  launch: 'Lanzamiento',
  seasonal: 'Temporada',
  sprint_group: 'Grupo de ciclos',
  always_on: 'Always-on'
}

const formatClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Component ──

const CampaignListView = () => {
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState('campaign')
  const [formSpaceId, setFormSpaceId] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formBudget, setFormBudget] = useState('')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      // TODO: get spaceId from session for client users
      if (formSpaceId) params.set('spaceId', formSpaceId)
      if (statusFilter) params.set('status', statusFilter)

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
  }, [statusFilter, formSpaceId])

  useEffect(() => { void fetchCampaigns() }, [fetchCampaigns])

  const handleCreate = async () => {
    if (!formName || !formSpaceId) return

    setSaving(true)

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: formSpaceId,
          displayName: formName,
          description: formDesc || null,
          campaignType: formType,
          plannedStartDate: formStartDate || null,
          plannedEndDate: formEndDate || null,
          budgetClp: formBudget ? Number(formBudget) : null
        })
      })

      if (res.ok) {
        const created = await res.json()

        setDialogOpen(false)
        setFormName('')
        setFormDesc('')
        setFormType('campaign')
        setFormStartDate('')
        setFormEndDate('')
        setFormBudget('')
        router.push(`/campaigns/${created.campaignId}`)
      }
    } catch {
      // Silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Campañas'
            subheader='Iniciativas agrupadas por Space'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-flag' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <CustomTextField
                  select
                  size='small'
                  label='Estado'
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </CustomTextField>
                <Button variant='contained' size='small' onClick={() => setDialogOpen(true)}>
                  <i className='tabler-plus' style={{ marginRight: 4 }} /> Nueva campaña
                </Button>
              </Box>
            }
          />
        </Card>
      </Grid>

      {/* Campaign Grid */}
      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : campaigns.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-flag-off' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
                <Typography variant='h6' sx={{ mt: 2 }}>Sin campañas</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Crea tu primera campaña para agrupar proyectos bajo una iniciativa.
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
              onClick={() => router.push(`/campaigns/${c.campaignId}`)}
              sx={{
                border: t => `1px solid ${t.palette.divider}`,
                cursor: 'pointer',
                '&:hover': { boxShadow: t => t.shadows[4] },
                height: '100%'
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Typography variant='h6' sx={{ flex: 1, mr: 1 }}>{c.displayName}</Typography>
                  <CustomChip
                    round='true'
                    size='small'
                    variant='tonal'
                    color={STATUS_COLORS[c.status] || 'secondary'}
                    label={STATUS_LABELS[c.status] || c.status}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <CustomChip
                    round='true'
                    size='small'
                    variant='tonal'
                    color={TYPE_COLORS[c.campaignType] || 'secondary'}
                    label={TYPE_LABELS[c.campaignType] || c.campaignType}
                  />
                  {c.budgetClp != null && (
                    <CustomChip round='true' size='small' variant='tonal' color='success' label={formatClp(c.budgetClp)} />
                  )}
                </Box>

                <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <i className='tabler-calendar' style={{ fontSize: 14 }} />
                  {formatDate(c.plannedStartDate)} — {formatDate(c.plannedEndDate)}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <i className='tabler-folders' style={{ fontSize: 14 }} />
                    {c.projectCount} proyecto{c.projectCount !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.disabled' }}>
                    {c.eoId}
                  </Typography>
                </Box>

                {c.channels.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {c.channels.slice(0, 3).map(ch => (
                      <CustomChip key={ch} round='true' size='small' variant='tonal' color='secondary' label={ch} />
                    ))}
                    {c.channels.length > 3 && (
                      <Typography variant='caption' color='text.disabled'>+{c.channels.length - 3}</Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Nueva campaña</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
          <CustomTextField
            label='Nombre de la campaña'
            value={formName}
            onChange={e => setFormName(e.target.value)}
            required
          />
          <CustomTextField
            label='Descripción'
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            multiline
            rows={2}
          />
          <CustomTextField
            label='Space ID'
            value={formSpaceId}
            onChange={e => setFormSpaceId(e.target.value)}
            placeholder='SPC-...'
            required
          />
          <CustomTextField
            select
            label='Tipo de campaña'
            value={formType}
            onChange={e => setFormType(e.target.value)}
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </CustomTextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CustomTextField
              type='date'
              label='Fecha inicio planificada'
              value={formStartDate}
              onChange={e => setFormStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: 1 }}
            />
            <CustomTextField
              type='date'
              label='Fecha fin planificada'
              value={formEndDate}
              onChange={e => setFormEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: 1 }}
            />
          </Box>
          <CustomTextField
            type='number'
            label='Presupuesto (CLP)'
            value={formBudget}
            onChange={e => setFormBudget(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={saving || !formName || !formSpaceId}
          >
            {saving ? 'Creando…' : 'Crear campaña'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default CampaignListView
