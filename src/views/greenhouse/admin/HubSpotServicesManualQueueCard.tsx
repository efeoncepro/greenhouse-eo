'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'
import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

type OrphanReason = 'no_company_association' | 'no_greenhouse_space' | 'unknown'

type OrphanServiceItem = {
  webhookInboxEventId: string
  receivedAt: string
  hubspotServiceId: string | null
  hubspotCompanyId: string | null
  reason: OrphanReason
  ageDays: number
  rawErrorMessage: string
}

type OrphanServicesResponse = {
  items: OrphanServiceItem[]
  total: number
  stale: number
}

type RetryResult = {
  hubspotCompanyId?: string
  created?: number
  updated?: number
  skipped?: number
  errors?: string[]
  spaceAutoCreated?: boolean
  totalCreated?: number
  totalUpdated?: number
  totalErrors?: number
}

const reasonLabel: Record<OrphanReason, string> = {
  no_company_association: 'Sin company asociada',
  no_greenhouse_space: 'Sin space Greenhouse',
  unknown: 'Revisar payload'
}

const reasonTone: Record<OrphanReason, 'warning' | 'error' | 'secondary'> = {
  no_company_association: 'error',
  no_greenhouse_space: 'warning',
  unknown: 'secondary'
}

const formatDateTime = (value: string) =>
  formatGreenhouseDateTime(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago'
  }, 'es-CL')

const hubspotServiceUrl = (serviceId: string) =>
  `https://app.hubspot.com/contacts/48713323/record/0-162/${encodeURIComponent(serviceId)}`

const hubspotCompanyUrl = (companyId: string) =>
  `https://app.hubspot.com/contacts/48713323/company/${encodeURIComponent(companyId)}`

const HubSpotServicesManualQueueCard = () => {
  const [items, setItems] = useState<OrphanServiceItem[]>([])
  const [stale, setStale] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [retryingCompanyId, setRetryingCompanyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/integrations/hubspot/orphan-services', { cache: 'no-store' })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        throw new Error(typeof body.error === 'string' ? body.error : 'No pudimos cargar la cola manual.')
      }

      const body = await response.json() as OrphanServicesResponse

      setItems(body.items)
      setStale(body.stale)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar la cola manual.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const summary = useMemo(() => ({
    total: items.length,
    withoutCompany: items.filter(item => item.reason === 'no_company_association').length,
    withoutSpace: items.filter(item => item.reason === 'no_greenhouse_space').length
  }), [items])

  const retryCompany = async (hubspotCompanyId: string) => {
    setRetryingCompanyId(hubspotCompanyId)
    setActionMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/integrations/hubspot/orphan-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubspotCompanyId })
      })

      const body = await response.json().catch(() => ({})) as RetryResult & { error?: string }

      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'No pudimos reintentar esta company.')
      }

      setActionMessage(
        `Company ${hubspotCompanyId}: ${body.created ?? 0} creados, ${body.updated ?? 0} actualizados, ${body.skipped ?? 0} omitidos.`
      )
      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos reintentar esta company.')
    } finally {
      setRetryingCompanyId(null)
    }
  }

  const runGlobalSync = async () => {
    setSyncingAll(true)
    setActionMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/ops/services-sync', { method: 'POST' })
      const body = await response.json().catch(() => ({})) as RetryResult & { error?: string }

      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'No pudimos ejecutar el sync global.')
      }

      setActionMessage(
        `Sync global: ${body.totalCreated ?? 0} creados, ${body.totalUpdated ?? 0} actualizados, ${body.totalErrors ?? 0} errores.`
      )
      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos ejecutar el sync global.')
    } finally {
      setSyncingAll(false)
    }
  }

  return (
    <ExecutiveCardShell
      title='HubSpot services manual queue'
      subtitle='Cola de p_services 0-162 que no pudieron materializarse automáticamente en Greenhouse.'
      action={(
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          <Button variant='outlined' size='small' onClick={() => void loadQueue()} disabled={loading || syncingAll}>
            Actualizar
          </Button>
          <Button variant='contained' size='small' onClick={() => void runGlobalSync()} disabled={loading || syncingAll}>
            {syncingAll ? 'Sincronizando...' : 'Ejecutar safety-net'}
          </Button>
        </Stack>
      )}
    >
      <Stack spacing={3}>
        <Stack
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }
          }}
        >
          <ExecutiveMiniStatCard title='Pendientes' value={String(summary.total)} detail='Eventos organization_unresolved abiertos' tone={summary.total > 0 ? 'warning' : 'success'} />
          <ExecutiveMiniStatCard title='Sin company' value={String(summary.withoutCompany)} detail='Requiere corregir asociación en HubSpot' tone={summary.withoutCompany > 0 ? 'error' : 'success'} />
          <ExecutiveMiniStatCard title='Sin space' value={String(summary.withoutSpace)} detail='Puede reintentarse desde Greenhouse' tone={summary.withoutSpace > 0 ? 'warning' : 'success'} />
          <ExecutiveMiniStatCard title='Stale' value={String(stale)} detail='Más de 7 días sin resolver' tone={stale > 0 ? 'error' : 'success'} />
        </Stack>

        {error ? <Alert severity='error'>{error}</Alert> : null}
        {actionMessage ? <Alert severity='success'>{actionMessage}</Alert> : null}

        {loading ? (
          <Alert severity='info' variant='outlined'>Cargando cola manual de HubSpot services...</Alert>
        ) : items.length === 0 ? (
          <Alert severity='success' variant='outlined'>
            No hay services huérfanos pendientes. Webhook y safety-net están convergiendo con Greenhouse.
          </Alert>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Service HubSpot</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Edad</TableCell>
                  <TableCell>Última señal</TableCell>
                  <TableCell align='right'>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.webhookInboxEventId} hover>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {item.hubspotServiceId ?? 'Sin service id'}
                        </Typography>
                        {item.hubspotServiceId ? (
                          <Button
                            component='a'
                            href={hubspotServiceUrl(item.hubspotServiceId)}
                            target='_blank'
                            rel='noopener noreferrer'
                            size='small'
                            variant='text'
                            sx={{ width: 'fit-content', p: 0, minWidth: 0 }}
                          >
                            Abrir en HubSpot
                          </Button>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {item.hubspotCompanyId ? (
                        <Button
                          component='a'
                          href={hubspotCompanyUrl(item.hubspotCompanyId)}
                          target='_blank'
                          rel='noopener noreferrer'
                          size='small'
                          variant='text'
                          sx={{ p: 0, minWidth: 0 }}
                        >
                          {item.hubspotCompanyId}
                        </Button>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>Sin company</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={reasonTone[item.reason]}
                        label={reasonLabel[item.reason]}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color={item.ageDays > 7 ? 'error.main' : 'text.secondary'}>
                        {item.ageDays} día{item.ageDays === 1 ? '' : 's'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDateTime(item.receivedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Button
                        size='small'
                        variant='outlined'
                        disabled={!item.hubspotCompanyId || retryingCompanyId === item.hubspotCompanyId}
                        onClick={() => item.hubspotCompanyId ? void retryCompany(item.hubspotCompanyId) : undefined}
                      >
                        {retryingCompanyId === item.hubspotCompanyId ? 'Reintentando...' : 'Reintentar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </ExecutiveCardShell>
  )
}

export default HubSpotServicesManualQueueCard
