'use client'

import { startTransition, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Timeline from '@mui/lab/Timeline'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import { getMicrocopy } from '@/lib/copy'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

import {
  COMMERCIAL_PARTY_CONFLICT_RESOLUTION_LABELS,
  COMMERCIAL_PARTY_CONFLICT_TYPE_LABELS,
  COMMERCIAL_PARTY_STAGE_LABELS,
  COMMERCIAL_PARTY_STAGE_ORDER,
  COMMERCIAL_PARTY_STAGE_TONES,
  resolveCommercialPartySyncHealth,
  type CommercialPartyStage,
  type CommercialPartyDetailData
} from './types'

const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  data: CommercialPartyDetailData | null
  canOverride: boolean
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  return formatGreenhouseDateTime(value, { dateStyle: 'medium', timeStyle: 'short' })
}

const formatSince = (value: string) => {
  const diffMs = Date.now() - Date.parse(value)

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return formatDateTime(value)
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Hace 1 día'
  if (diffDays < 30) return `Hace ${diffDays} días`

  const diffMonths = Math.floor(diffDays / 30)

  if (diffMonths === 1) return 'Hace 1 mes'

  return `Hace ${diffMonths} meses`
}

const transitionTone = (source: string): 'success' | 'warning' | 'info' | 'secondary' => {
  if (source === 'hubspot_sync') return 'info'
  if (source === 'manual') return 'warning'
  if (source === 'bootstrap') return 'secondary'

  return 'success'
}

const kpiTone = (tone: 'success' | 'warning' | 'error' | 'secondary' | 'info') =>
  tone === 'secondary' ? 'info' : tone

const CommercialPartyDetailView = ({ data, canOverride }: Props) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('summary')
  const [transitionOpen, setTransitionOpen] = useState(false)
  const [nextStage, setNextStage] = useState<CommercialPartyStage>(COMMERCIAL_PARTY_STAGE_ORDER[0])
  const [reason, setReason] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  if (!data) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant='h4'>Party no encontrada</Typography>
            <Typography color='text.secondary'>
              La organization consultada no devolvió un snapshot de commercial party lifecycle.
            </Typography>
            <Button component={Link} href='/admin/commercial/parties' variant='contained'>
              Volver a Commercial Parties
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const { party, history, conflicts } = data
  const syncHealth = resolveCommercialPartySyncHealth(party)

  const runAction = async ({
    url,
    body,
    successMessage
  }: {
    url: string
    body: Record<string, unknown>
    successMessage: string
  }) => {
    setPendingAction(url)
    setFeedback(null)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string | null }
        | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.error ?? `No se pudo completar la acción (${response.status}).`
        })

        return
      }

      setFeedback({
        tone: 'success',
        message: successMessage
      })

      startTransition(() => {
        router.refresh()
      })
    } catch {
      setFeedback({
        tone: 'error',
        message: 'No se pudo completar la acción. Intenta de nuevo.'
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleOverride = async () => {
    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setFeedback({
        tone: 'error',
        message: 'Debes indicar un motivo antes de forzar la transición.'
      })

      return
    }

    await runAction({
      url: `/api/admin/commercial/parties/${party.commercialPartyId}/transition`,
      body: {
        toStage: nextStage,
        reason: trimmedReason
      },
      successMessage: 'Transición manual registrada en lifecycle history.'
    })

    setTransitionOpen(false)
    setReason('')
  }

  const handleConflictResolution = async (
    conflictId: string,
    action: 'force_outbound' | 'force_inbound' | 'ignore'
  ) => {
    const labels = {
      force_outbound: 'Conflict resuelto forzando outbound.',
      force_inbound: 'Conflict resuelto forzando inbound.',
      ignore: 'Conflict marcado como ignorado.'
    } as const

    await runAction({
      url: `/api/admin/commercial/parties/conflicts/${conflictId}/resolve`,
      body: {
        action,
        reason: `admin_detail_${action}`
      },
      successMessage: labels[action]
    })
  }

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(13,148,136,0.12) 40%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap='wrap' useFlexGap>
              <CustomChip label={GH_INTERNAL_NAV.adminCommercialParties.label} color='warning' variant='outlined' round='true' />
              <CustomChip
                label={COMMERCIAL_PARTY_STAGE_LABELS[party.lifecycleStage]}
                color={COMMERCIAL_PARTY_STAGE_TONES[party.lifecycleStage]}
                variant='tonal'
                round='true'
              />
              <CustomChip
                label={
                  syncHealth === 'aligned'
                    ? 'Sync alineado'
                    : syncHealth === 'unlinked'
                      ? 'Sin ancla HubSpot'
                      : 'Sync con atención'
                }
                color={syncHealth === 'aligned' ? 'success' : syncHealth === 'unlinked' ? 'secondary' : 'warning'}
                variant='outlined'
                round='true'
              />
            </Stack>
            <Box>
              <Typography variant='h3'>{party.displayName}</Typography>
              <Typography color='text.secondary' sx={{ maxWidth: 920 }}>
                Ficha administrativa de lifecycle para revisar source de stage, bridge financiero, mirror HubSpot,
                timeline de cambios y conflictos de sincronización inmediatos.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/admin/commercial/parties' variant='contained'>
                Volver a la lista
              </Button>
              {canOverride ? (
                <Button variant='outlined' color='warning' onClick={() => setTransitionOpen(true)}>
                  Forzar transición
                </Button>
              ) : null}
              {party.hubspotCompanyId ? (
                <Button component={Link} href={`/admin/accounts/${party.organizationId}`} variant='outlined'>
                  Abrir cuenta relacionada
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {feedback ? <Alert severity={feedback.tone}>{feedback.message}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          title='Stage actual'
          value={COMMERCIAL_PARTY_STAGE_LABELS[party.lifecycleStage]}
          detail={party.lifecycleStageSource ? `Fuente: ${party.lifecycleStageSource}` : 'Fuente no registrada'}
          tone={kpiTone(COMMERCIAL_PARTY_STAGE_TONES[party.lifecycleStage])}
        />
        <ExecutiveMiniStatCard
          title='En este stage desde'
          value={formatSince(party.lifecycleStageSince)}
          detail={formatDateTime(party.lifecycleStageSince)}
          tone='info'
        />
        <ExecutiveMiniStatCard
          title='Client bridge'
          value={party.clientId ? 'Enlazado' : 'Pendiente'}
          detail={party.clientId ?? 'Sin client_id asociado todavía'}
          tone={party.clientId ? 'success' : 'warning'}
        />
        <ExecutiveMiniStatCard
          title='Conflictos abiertos'
          value={String(party.pendingConflictCount)}
          detail={
            party.lastConflictAt
              ? `Último detectado ${formatDateTime(party.lastConflictAt)}`
              : 'Sin conflictos recientes'
          }
          tone={party.pendingConflictCount > 0 ? 'error' : 'success'}
        />
      </Box>

      <TabContext value={activeTab}>
        <Card>
          <CardContent sx={{ pb: 0 }}>
            <CustomTabList onChange={(_, value: string) => setActiveTab(value)} variant='scrollable' pill='true'>
              <Tab icon={<i className='tabler-layout-dashboard' />} value='summary' label='Resumen' iconPosition='start' />
              <Tab icon={<i className='tabler-history' />} value='timeline' label='Timeline' iconPosition='start' />
              <Tab icon={<i className='tabler-alert-triangle' />} value='conflicts' label='Conflictos' iconPosition='start' />
            </CustomTabList>
          </CardContent>

          <TabPanel value='summary' className='p-0'>
            <CardContent>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <ExecutiveCardShell
                    title='Identidad Greenhouse'
                    subtitle='Anclas internas y claves estables usadas por lifecycle, finance y surfaces downstream.'
                  >
                    <Stack spacing={1.5}>
                      <Typography variant='body2'>
                        <strong>organization_id:</strong> {party.organizationId}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>commercial_party_id:</strong> {party.commercialPartyId}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>public_id:</strong> {party.publicId ?? 'Sin public_id visible'}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Legal name:</strong> {party.legalName ?? 'Sin razón social enriquecida'}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Industria:</strong> {party.industry ?? 'Sin industria visible'}
                      </Typography>
                    </Stack>
                  </ExecutiveCardShell>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <ExecutiveCardShell
                    title='Mirror HubSpot'
                    subtitle='Señal fuente para adopción, sync outbound y lectura de drift operacional.'
                  >
                    <Stack spacing={1.5}>
                      <Typography variant='body2'>
                        <strong>hubspot_company_id:</strong> {party.hubspotCompanyId ?? 'Sin ancla'}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Lifecycle HubSpot:</strong> {party.hubspotLifecycleStage ?? 'Sin lifecycle espejo'}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Dominio:</strong> {party.domain ?? 'Sin dominio visible'}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Última actividad espejo:</strong> {formatDateTime(party.hubspotLastActivityAt)}
                      </Typography>
                    </Stack>
                  </ExecutiveCardShell>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <ExecutiveCardShell
                    title='Anclas comerciales'
                    subtitle='Señales downstream que hoy justifican lectura de ownership, active quote o active contract.'
                  >
                    <Stack spacing={1.5}>
                      <Typography variant='body2'>
                        <strong>Quotes activas:</strong> {party.activeQuotes}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Última quote:</strong> {formatDateTime(party.lastQuoteAt)}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Contratos activos:</strong> {party.activeContracts}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Último contrato:</strong> {formatDateTime(party.lastContractAt)}
                      </Typography>
                    </Stack>
                  </ExecutiveCardShell>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <ExecutiveCardShell
                    title='Señal operativa'
                    subtitle='Lectura rápida para priorizar revisión manual o seguir con monitoreo pasivo.'
                  >
                    <Stack spacing={1.5}>
                      <Alert severity={party.pendingConflictCount > 0 ? 'warning' : 'success'} variant='outlined'>
                        {party.pendingConflictCount > 0
                          ? `Esta party tiene ${party.pendingConflictCount} conflicto(s) pendientes y conviene revisar ownership/freshness antes de una transición manual.`
                          : 'No hay conflictos abiertos en el snapshot actual.'}
                      </Alert>
                      <Typography variant='body2'>
                        <strong>Última actividad consolidada:</strong> {formatDateTime(party.lastActivityAt)}
                      </Typography>
                      <Typography variant='body2'>
                        <strong>Última actualización Greenhouse:</strong> {formatDateTime(party.updatedAt)}
                      </Typography>
                    </Stack>
                  </ExecutiveCardShell>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          <TabPanel value='timeline' className='p-0'>
            <CardContent>
              {history.length === 0 ? (
                <Alert severity='info' variant='outlined'>
                  No hay transiciones registradas en `organization_lifecycle_history` para esta party.
                </Alert>
              ) : (
                <Timeline sx={{ my: 0, px: 0 }}>
                  {history.map((item, index) => (
                    <TimelineItem key={item.historyId}>
                      <TimelineSeparator>
                        <TimelineDot color={COMMERCIAL_PARTY_STAGE_TONES[item.toStage]} variant='outlined' />
                        {index < history.length - 1 ? <TimelineConnector /> : null}
                      </TimelineSeparator>
                      <TimelineContent sx={{ pb: 5 }}>
                        <Stack spacing={1}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap='wrap' useFlexGap>
                            <CustomChip
                              label={COMMERCIAL_PARTY_STAGE_LABELS[item.toStage]}
                              color={COMMERCIAL_PARTY_STAGE_TONES[item.toStage]}
                              size='small'
                              variant='tonal'
                              round='true'
                            />
                            <CustomChip
                              label={item.transitionSource}
                              color={transitionTone(item.transitionSource)}
                              size='small'
                              variant='outlined'
                              round='true'
                            />
                          </Stack>
                          <Typography variant='body1' sx={{ fontWeight: 600 }}>
                            {item.fromStage ? `${COMMERCIAL_PARTY_STAGE_LABELS[item.fromStage]} → ` : ''}
                            {COMMERCIAL_PARTY_STAGE_LABELS[item.toStage]}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {formatDateTime(item.transitionedAt)}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Actor: {item.transitionedBy ?? 'Sistema'} · Trigger:{' '}
                            {item.triggerEntityType && item.triggerEntityId
                              ? `${item.triggerEntityType}:${item.triggerEntityId}`
                              : 'No registrado'}
                          </Typography>
                        </Stack>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </CardContent>
          </TabPanel>

          <TabPanel value='conflicts' className='p-0'>
            <CardContent>
              {conflicts.length === 0 ? (
                <Alert severity='success' variant='outlined'>
                  No hay conflictos registrados para esta party.
                </Alert>
              ) : (
                <Stack spacing={2.5}>
                  {conflicts.map(conflict => (
                    <Card key={conflict.conflictId} variant='outlined'>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                            <CustomChip
                              label={COMMERCIAL_PARTY_CONFLICT_TYPE_LABELS[conflict.conflictType]}
                              color='warning'
                              size='small'
                              variant='tonal'
                              round='true'
                            />
                            <CustomChip
                              label={COMMERCIAL_PARTY_CONFLICT_RESOLUTION_LABELS[conflict.resolutionStatus]}
                              color={conflict.resolutionStatus === 'pending' ? 'error' : 'secondary'}
                              size='small'
                              variant='outlined'
                              round='true'
                            />
                          </Stack>
                          <Typography variant='body2' color='text.secondary'>
                            Detectado {formatDateTime(conflict.detectedAt)}
                          </Typography>
                          <Typography variant='body2'>
                            Resuelto por: {conflict.resolvedBy ?? 'Sin operador'} · Aplicado:{' '}
                            {formatDateTime(conflict.resolutionAppliedAt)}
                          </Typography>
                          {conflict.conflictingFields ? (
                            <>
                              <Divider />
                              <Box
                                component='pre'
                                sx={{
                                  m: 0,
                                  p: 2.5,
                                  borderRadius: 1,
                                  overflowX: 'auto',
                                  backgroundColor: 'var(--mui-palette-action-hover)',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {JSON.stringify(conflict.conflictingFields, null, 2)}
                              </Box>
                            </>
                          ) : null}
                          {canOverride && conflict.resolutionStatus === 'pending' ? (
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <Button
                                variant='contained'
                                size='small'
                                disabled={pendingAction !== null}
                                onClick={() => void handleConflictResolution(conflict.conflictId, 'force_outbound')}
                              >
                                Force outbound
                              </Button>
                              <Button
                                variant='outlined'
                                size='small'
                                disabled={pendingAction !== null}
                                onClick={() => void handleConflictResolution(conflict.conflictId, 'force_inbound')}
                              >
                                Force inbound
                              </Button>
                              <Button
                                variant='text'
                                size='small'
                                color='inherit'
                                disabled={pendingAction !== null}
                                onClick={() => void handleConflictResolution(conflict.conflictId, 'ignore')}
                              >
                                Ignorar
                              </Button>
                            </Stack>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </TabPanel>
        </Card>
      </TabContext>

      <Dialog open={transitionOpen} onClose={() => setTransitionOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Forzar transición manual</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Alert severity='warning' variant='outlined'>
              Esta acción registra `operator_override` en el history y puede dejar el party en hold frente al outbound
              automático hasta revisar el conflicto.
            </Alert>
            <CustomTextField
              select
              label='Nuevo stage'
              value={nextStage}
              onChange={event => setNextStage(event.target.value as CommercialPartyStage)}
              fullWidth
            >
              {COMMERCIAL_PARTY_STAGE_ORDER.map(stage => (
                <MenuItem key={stage} value={stage}>
                  {COMMERCIAL_PARTY_STAGE_LABELS[stage]}
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              label='Motivo'
              value={reason}
              onChange={event => setReason(event.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder='Ej. Sales confirmó churn contractual fuera del loop automático.'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransitionOpen(false)} color='inherit'>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            onClick={() => void handleOverride()}
            variant='contained'
            disabled={pendingAction !== null}
            startIcon={pendingAction ? <CircularProgress size={16} color='inherit' /> : undefined}
          >
            Confirmar transición
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default CommercialPartyDetailView
