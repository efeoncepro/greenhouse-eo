'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { HorizontalWithSubtitle } from '@/components/card-statistics'

import type { PayrollPeriodDownstreamSummary } from '@/lib/finance/payment-orders/payroll-status-reader'

const TASK407_ARIA_CARGANDO_ESTADO_DOWNSTREAM_DEL_PERIODO = "Cargando estado downstream del periodo"


interface Props {
  periodId: string
  /**
   * Optional pre-fetched summary. When provided, the card uses it as the
   * source of truth instead of fetching by itself. This lets sibling
   * components (e.g. PayrollEntryTable) share a single fetch per period.
   */
  summary?: PayrollPeriodDownstreamSummary | null
  loading?: boolean
  error?: string | null
}

const PayrollPaymentStatusCard = ({ periodId, summary: externalSummary, loading: externalLoading, error: externalError }: Props) => {
  const isControlled = externalSummary !== undefined || externalLoading !== undefined || externalError !== undefined

  const [summary, setSummary] = useState<PayrollPeriodDownstreamSummary | null>(externalSummary ?? null)
  const [loading, setLoading] = useState(externalLoading ?? !isControlled)
  const [error, setError] = useState<string | null>(externalError ?? null)

  useEffect(() => {
    if (isControlled) {
      setSummary(externalSummary ?? null)
      setLoading(externalLoading ?? false)
      setError(externalError ?? null)

      return
    }

    if (!periodId) {
      setSummary(null)
      setLoading(false)

      return
    }

    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/admin/finance/payment-orders/payroll-status?periodId=${encodeURIComponent(periodId)}`)

        if (!res.ok) {
          const body = await res.json().catch(() => null)

          throw new Error(body?.error || 'No pudimos cargar el estado downstream del periodo.')
        }

        const data = (await res.json()) as PayrollPeriodDownstreamSummary

        if (active) {
          setSummary(data)
        }
      } catch (loadError) {
        if (active) {
          setSummary(null)
          setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el estado downstream del periodo.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [periodId, isControlled, externalSummary, externalLoading, externalError])

  // Defensa contra summary mal-formado: byEntry puede ser undefined si la
  // respuesta del API quedo a medio camino (e.g. degradado, version incompatible).
  const blockedEntries = summary?.byEntry?.filter(entry => entry.state === 'blocked_no_profile') ?? []
  const blockedColor: 'warning' | 'secondary' = (summary?.totalBlocked ?? 0) > 0 ? 'warning' : 'secondary'

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Estado de pago downstream'
        subheader='Seguimiento de obligaciones, ordenes pagadas y conciliacion para este periodo.'
      />
      <Divider />
      <CardContent>
        {loading && (
          <Box sx={{ py: 2 }} role='status' aria-live='polite'>
            <LinearProgress aria-label={TASK407_ARIA_CARGANDO_ESTADO_DOWNSTREAM_DEL_PERIODO} />
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
              Cargando estado de pago...
            </Typography>
          </Box>
        )}

        {!loading && error && (
          <Alert severity='error' role='status' aria-live='polite'>
            {error}
          </Alert>
        )}

        {!loading && !error && summary && (
          <Stack spacing={3}>
            <Grid container spacing={6} role='status' aria-live='polite'>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle
                  title='Obligaciones'
                  stats={`${summary.totalObligations} de ${summary.totalEntries}`}
                  subtitle={summary.totalEntries === 0 ? 'Sin entries en el periodo' : 'Generadas para este periodo'}
                  avatarIcon='tabler-file-invoice'
                  avatarColor='info'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle
                  title='Ordenes pagadas'
                  stats={`${summary.totalOrdersPaid}`}
                  subtitle={
                    summary.totalObligations > 0
                      ? `De ${summary.totalObligations} obligaciones`
                      : 'Aun sin obligaciones'
                  }
                  avatarIcon='tabler-cash-banknote'
                  avatarColor='success'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle
                  title='Conciliadas'
                  stats={`${summary.totalReconciled}`}
                  subtitle={
                    summary.totalOrdersPaid > 0
                      ? `De ${summary.totalOrdersPaid} pagadas`
                      : 'Sin pagos para conciliar'
                  }
                  avatarIcon='tabler-circle-check'
                  avatarColor='success'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle
                  title='Bloqueadas'
                  stats={`${summary.totalBlocked}`}
                  subtitle={
                    summary.totalBlocked > 0
                      ? 'Requieren perfil de pago'
                      : 'Sin bloqueos'
                  }
                  avatarIcon='tabler-alert-triangle'
                  avatarColor={blockedColor}
                />
              </Grid>
            </Grid>

            {blockedEntries.length > 0 && (
              <Alert
                severity='warning'
                icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
                action={
                  <Button
                    component={Link}
                    href='/finance/payment-profiles'
                    size='small'
                    variant='outlined'
                    color='warning'
                  >
                    Resolver en perfiles de pago
                  </Button>
                }
              >
                <AlertTitle>Hay {blockedEntries.length} colaborador{blockedEntries.length === 1 ? '' : 'es'} sin perfil de pago</AlertTitle>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  No podemos generar la orden de pago hasta que cada uno tenga un perfil activo.
                </Typography>
                <Box component='ul' sx={{ m: 0, pl: 2.5 }}>
                  {blockedEntries.slice(0, 8).map(entry => (
                    <li key={entry.entryId}>
                      <Typography variant='body2' component='span'>
                        {entry.memberName ?? entry.memberId}
                        {entry.blockReason ? ` — ${entry.blockReason}` : ''}
                      </Typography>
                    </li>
                  ))}
                  {blockedEntries.length > 8 && (
                    <li>
                      <Typography variant='caption' color='text.secondary'>
                        Y {blockedEntries.length - 8} mas...
                      </Typography>
                    </li>
                  )}
                </Box>
              </Alert>
            )}

            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              <Button
                component={Link}
                href={`/finance/payment-orders?periodId=${encodeURIComponent(periodId)}`}
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-list-details' aria-hidden='true' />}
              >
                Ver ordenes del periodo
              </Button>
              <Button
                component={Link}
                href='/finance/payment-orders'
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-calendar-event' aria-hidden='true' />}
              >
                Ver calendario de pagos
              </Button>
            </Stack>
          </Stack>
        )}

        {!loading && !error && !summary && (
          <Typography variant='body2' color='text.secondary'>
            Selecciona un periodo para ver su estado downstream.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default PayrollPaymentStatusCard
