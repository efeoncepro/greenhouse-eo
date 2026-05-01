'use client'

// Health grid del header de /finance/payment-orders.
// Spec: docs/mockups/payment-orders-mockup.html sección "DRIFT HEALTH".
//
// Dos cards:
//   1. Bridge Payroll → Obligations: stats del último periodo materializado
//   2. Drift obligations vs expenses: comparación per periodo (últimos 4)

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { PaymentObligationsHealthGrid } from '@/lib/finance/payment-obligations/health-grid'

const formatTimestamp = (iso: string | null) => {
  if (!iso) return 'Aún no materializado'

  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const driftMeta: Record<
  PaymentObligationsHealthGrid['drift'][number]['label'],
  { label: string; color: 'success' | 'warning' | 'error' }
> = {
  sin_drift: { label: 'Sin drift', color: 'success' },
  pending_obligations: { label: 'Faltan obligations', color: 'error' },
  pending_bridge: { label: 'Bridge pendiente', color: 'warning' },
  count_diff: { label: 'Drift count', color: 'warning' }
}

const PaymentOrdersHealthGrid = () => {
  const [data, setData] = useState<PaymentObligationsHealthGrid | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const r = await fetch('/api/admin/finance/payment-obligations/health-grid')

        if (!r.ok) return
        const json = (await r.json()) as PaymentObligationsHealthGrid

        if (!cancelled) setData(json)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Grid container spacing={3}>
      {/* Card 1 — Bridge Payroll → Obligations */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card
          elevation={0}
          sx={theme => ({
            border: `1px solid ${theme.palette.success.main}33`,
            backgroundColor: `${theme.palette.success.main}0A`,
            height: '100%'
          })}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box
                  sx={theme => ({
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.success.main
                  })}
                />
                <Typography variant='subtitle2'>Bridge Payroll → Obligations</Typography>
              </Stack>

              {loading ? (
                <LinearProgress />
              ) : !data ? (
                <Typography variant='caption' color='text.secondary'>
                  Sin datos disponibles
                </Typography>
              ) : (
                <>
                  <Typography variant='caption' color='text.secondary'>
                    Última materialización:{' '}
                    <strong>{formatTimestamp(data.bridge.lastMaterializedAt)}</strong>
                    {data.bridge.lastPeriodId ? ` · periodo ${data.bridge.lastPeriodId}` : ''}
                  </Typography>

                  <Stack spacing={0.75} sx={{ pt: 1 }}>
                    <HealthRow label='Entries activos' value={data.bridge.activeEntriesCount} />
                    <HealthRow label='Net pay obligations' value={data.bridge.employeeNetPayCount} />
                    <HealthRow label='SII honorarios' value={data.bridge.employeeWithheldCount} />
                    {data.bridge.providerPayrollCount > 0 ? (
                      <HealthRow
                        label='Provider Deel placeholder'
                        value={data.bridge.providerPayrollCount}
                      />
                    ) : null}
                    <HealthRow
                      label='Employer SS Previred'
                      value={data.bridge.employerSocialSecurityCount}
                    />
                  </Stack>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Card 2 — Drift obligations vs expenses */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card
          elevation={0}
          sx={theme => ({
            border: `1px solid ${theme.palette.divider}`,
            height: '100%'
          })}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box
                  sx={theme => ({
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: data && data.drift.every(d => d.label === 'sin_drift')
                      ? theme.palette.success.main
                      : theme.palette.warning.main
                  })}
                />
                <Typography variant='subtitle2'>Drift obligations vs expenses</Typography>
              </Stack>
              <Typography variant='caption' color='text.secondary'>
                Comparación per periodo · Cero diferencia tolerada
              </Typography>

              {loading ? (
                <LinearProgress />
              ) : !data || data.drift.length === 0 ? (
                <Typography variant='caption' color='text.secondary' sx={{ pt: 1 }}>
                  Sin periodos materializados
                </Typography>
              ) : (
                <Stack spacing={0.75} sx={{ pt: 1 }}>
                  {data.drift.map(row => {
                    const meta = driftMeta[row.label]

                    return (
                      <Stack
                        key={row.periodId}
                        direction='row'
                        spacing={1}
                        alignItems='center'
                        justifyContent='space-between'
                      >
                        <Typography variant='body2'>Periodo {row.periodId}</Typography>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={meta.color}
                          label={row.note ?? meta.label}
                        />
                      </Stack>
                    )
                  })}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

const HealthRow = ({ label, value }: { label: string; value: number }) => (
  <Stack direction='row' justifyContent='space-between' alignItems='center'>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography
      variant='body2'
      fontWeight={600}
      sx={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {value}
    </Typography>
  </Stack>
)

export default PaymentOrdersHealthGrid
