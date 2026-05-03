'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Tab from '@mui/material/Tab'

import { toast } from 'sonner'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

import EmptyState from '@/components/greenhouse/EmptyState'

type PlacementDetail = {
  placementId: string
  publicId: string | null
  assignmentId: string
  providerId: string | null
  clientName: string | null
  memberName: string | null
  providerName: string | null
  businessUnit: string
  status: string
  lifecycleStage: string
  billingRateAmount: number | null
  billingRateCurrency: string | null
  costRateAmount: number | null
  costRateCurrency: string | null
  payRegimeSnapshot: string | null
  contractTypeSnapshot: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  placementNotes: string | null
  onboardingItems: Array<{
    onboardingItemId: string
    itemLabel: string
    category: string
    status: string
    blockerNote: string | null
  }>
  events: Array<{
    staffAugEventId: string
    eventType: string
    description: string | null
    createdAt: string
  }>
  latestSnapshot: null | {
    periodId: string
    projected_revenue_clp?: number
    projectedRevenueClp?: number
    payrollEmployerCostClp?: number
    commercialLoadedCostClp?: number
    toolingCostClp?: number
    grossMarginProxyPct?: number | null
    snapshotStatus?: string
  }
}

const STATUS_COLOR: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'primary' | 'error'> = {
  pipeline: 'secondary',
  onboarding: 'info',
  active: 'success',
  renewal_pending: 'warning',
  renewed: 'primary',
  ended: 'error'
}

const STATUS_LABEL: Record<string, string> = {
  pipeline: 'Pipeline',
  onboarding: 'Onboarding',
  active: 'Activo',
  renewal_pending: 'Renovación',
  renewed: 'Renovado',
  ended: 'Cerrado'
}

const ONBOARDING_COLOR: Record<string, 'secondary' | 'warning' | 'info' | 'success'> = {
  pending: 'secondary',
  blocked: 'warning',
  in_progress: 'info',
  done: 'success'
}

const formatMoney = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (amount == null) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

interface Props {
  placementId: string
}

const PlacementDetailView = ({ placementId }: Props) => {
  const [detail, setDetail] = useState<PlacementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/agency/staff-augmentation/placements/${placementId}`, { cache: 'no-store' })

        if (!res.ok) {
          setError('No pudimos cargar el detalle del placement.')
          setDetail(null)

          return
        }

        const json = (await res.json()) as PlacementDetail

        setDetail(json)
      } catch {
        setError('No pudimos cargar el placement. Verifica tu conexión e intenta de nuevo.')
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [placementId])

  const updateOnboardingItem = async (itemId: string, status: string) => {
    try {
      await fetch(`/api/agency/staff-augmentation/placements/${placementId}/onboarding/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const res = await fetch(`/api/agency/staff-augmentation/placements/${placementId}`, { cache: 'no-store' })

      if (res.ok) {
        setDetail(await res.json())
        toast.success('Item de onboarding actualizado')
      }
    } catch {
      toast.error('No se pudo actualizar el item. Intenta de nuevo.')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 12 }}>
        <CircularProgress />
        <Typography variant='body2' color='text.secondary'>Cargando detalle del placement...</Typography>
      </Box>
    )
  }

  if (!detail) {
    return (
      <EmptyState
        icon={error ? 'tabler-cloud-off' : 'tabler-file-off'}
        title={error ? 'No pudimos cargar el placement' : 'Placement no encontrado'}
        description={error || 'No encontramos un placement con ese identificador.'}
        action={
          error
            ? <Button variant='outlined' onClick={() => window.location.reload()}>Reintentar</Button>
            : <Button component={Link} href='/agency/staff-augmentation' variant='outlined'>Volver a Staff Augmentation</Button>
        }
      />
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ pt: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar variant='rounded' sx={{ width: 64, height: 64, mb: 2, bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-users-plus' style={{ fontSize: 30 }} />
            </Avatar>
            <Typography variant='h5' sx={{ textAlign: 'center', mb: 1 }}>{detail.memberName || detail.publicId || detail.placementId}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>{detail.clientName || 'Cliente'}</Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={STATUS_COLOR[detail.status] || 'secondary'}
              label={STATUS_LABEL[detail.status] || detail.status}
              sx={{ mb: 3 }}
            />
            <Divider sx={{ width: '100%', mb: 3 }} />

            <Box sx={{ width: '100%', display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant='caption' color='text.secondary'>Placement ID</Typography>
                <Typography variant='body2'>{detail.publicId || detail.placementId}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Assignment base</Typography>
                <Typography variant='body2'>{detail.assignmentId}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Provider</Typography>
                <Typography variant='body2'>{detail.providerName || 'Directo / sin provider'}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Billing rate</Typography>
                <Typography variant='body2'>{formatMoney(detail.billingRateAmount, detail.billingRateCurrency)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Cost snapshot</Typography>
                <Typography variant='body2'>{formatMoney(detail.costRateAmount, detail.costRateCurrency)}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader title='Placement 360' subheader='Finance, Payroll, provider context y checklist operativo sobre el assignment.' />
          <Divider />
          <TabContext value={tab}>
            <CustomTabList onChange={(_event, value) => setTab(value)} sx={{ px: 4, pt: 2 }}>
              <Tab value='overview' label='Resumen' />
              <Tab value='onboarding' label='Onboarding' />
              <Tab value='events' label='Eventos' />
            </CustomTabList>
            <TabPanel value='overview'>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant='outlined'>
                    <CardHeader title='Contrato y setup' />
                    <CardContent sx={{ display: 'grid', gap: 2 }}>
                      <Typography variant='body2'><strong>Pay regime:</strong> {detail.payRegimeSnapshot || '—'}</Typography>
                      <Typography variant='body2'><strong>Tipo de contrato:</strong> {detail.contractTypeSnapshot || '—'}</Typography>
                      <Typography variant='body2'><strong>Inicio:</strong> {detail.contractStartDate || '—'}</Typography>
                      <Typography variant='body2'><strong>Término:</strong> {detail.contractEndDate || '—'}</Typography>
                      <Typography variant='body2'><strong>Business Unit:</strong> {detail.businessUnit}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant='outlined'>
                    <CardHeader title='Snapshot económico' subheader={detail.latestSnapshot?.periodId ? `Periodo ${detail.latestSnapshot.periodId}` : 'Aún sin snapshot'} />
                    <CardContent sx={{ display: 'grid', gap: 2 }}>
                      <Typography variant='body2'><strong>Revenue proxy:</strong> {formatMoney(detail.latestSnapshot?.projectedRevenueClp, 'CLP')}</Typography>
                      <Typography variant='body2'><strong>Payroll employer cost:</strong> {formatMoney(detail.latestSnapshot?.payrollEmployerCostClp, 'CLP')}</Typography>
                      <Typography variant='body2'><strong>Loaded cost:</strong> {formatMoney(detail.latestSnapshot?.commercialLoadedCostClp, 'CLP')}</Typography>
                      <Typography variant='body2'><strong>Tooling:</strong> {formatMoney(detail.latestSnapshot?.toolingCostClp, 'CLP')}</Typography>
                      <Typography variant='body2'><strong>Margin proxy:</strong> {detail.latestSnapshot?.grossMarginProxyPct != null ? `${detail.latestSnapshot.grossMarginProxyPct}%` : '—'}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Card variant='outlined'>
                    <CardHeader title='Notas operativas' />
                    <CardContent>
                      <Typography variant='body2' color='text.secondary'>
                        {detail.placementNotes || 'Todavía no hay notas operativas registradas para este placement.'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Card variant='outlined'>
                    <CardHeader title='Drilldowns' subheader='Consumidores conectados a este placement canónico.' />
                    <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button component={Link} href='/agency/team' variant='outlined' startIcon={<i className='tabler-users-group' />}>
                        Ver equipo
                      </Button>
                      <Button component={Link} href='/hr/payroll' variant='outlined' startIcon={<i className='tabler-receipt' />}>
                        Revisar payroll
                      </Button>
                      {detail.providerId ? (
                        <Button
                          component={Link}
                          href={`/admin/ai-tools?tab=catalog&providerId=${encodeURIComponent(detail.providerId)}`}
                          variant='outlined'
                          startIcon={<i className='tabler-robot' />}
                        >
                          Abrir AI Tooling
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
            <TabPanel value='onboarding'>
              <Box sx={{ display: 'grid', gap: 3 }}>
                {detail.onboardingItems.map(item => (
                  <Card key={item.onboardingItemId} variant='outlined'>
                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant='body2' fontWeight={600}>{item.itemLabel}</Typography>
                        <Typography variant='caption' color='text.secondary'>{item.category}</Typography>
                        {item.blockerNote ? <Typography variant='body2' color='warning.main' sx={{ mt: 1 }}>{item.blockerNote}</Typography> : null}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <CustomChip round='true' size='small' variant='tonal' color={ONBOARDING_COLOR[item.status] || 'secondary'} label={item.status} />
                        {item.status !== 'done' ? <Button size='small' variant='outlined' onClick={() => updateOnboardingItem(item.onboardingItemId, 'done')}>Marcar listo</Button> : null}
                        {item.status !== 'blocked' ? <Button size='small' color='warning' onClick={() => updateOnboardingItem(item.onboardingItemId, 'blocked')}>Bloquear</Button> : null}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </TabPanel>
            <TabPanel value='events'>
              <Box sx={{ display: 'grid', gap: 2 }}>
                {detail.events.map(event => (
                  <Card key={event.staffAugEventId} variant='outlined'>
                    <CardContent>
                      <Typography variant='body2' fontWeight={600}>{event.description || event.eventType}</Typography>
                      <Typography variant='caption' color='text.secondary'>{event.eventType} · {new Date(event.createdAt).toLocaleString('es-CL')}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </TabPanel>
          </TabContext>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PlacementDetailView
