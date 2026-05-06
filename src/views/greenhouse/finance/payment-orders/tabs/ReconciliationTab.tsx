'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()

interface ReconciliationPeriodSummary {
  periodId: string
  accountId: string
  accountLabel: string | null
  year: number
  month: number
  status: 'open' | 'matched' | 'reconciled' | 'closed' | string
  totalDifference: number | null
  currency: string
}

interface OrphanSnapshot {
  snapshotId: string
  accountId: string
  accountLabel: string | null
  declaredAt: string
  closingBalance: number
  currency: string
}

const MONTHS_ES = GREENHOUSE_COPY.months.short

const statusMeta: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  open: { label: 'Abierta', color: 'warning' },
  matched: { label: 'En matching', color: 'info' },
  reconciled: { label: 'Conciliada', color: 'success' },
  closed: { label: 'Cerrada', color: 'secondary' }
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const ReconciliationTab = () => {
  const [periods, setPeriods] = useState<ReconciliationPeriodSummary[]>([])
  const [orphanSnapshots, setOrphanSnapshots] = useState<OrphanSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth() + 1

        const r = await fetch(`/api/finance/reconciliation?year=${year}&month=${month}`)

        if (!r.ok) throw new Error('No fue posible cargar conciliación')

        const json = await r.json()

        if (!cancelled) {
          setPeriods((json.items as ReconciliationPeriodSummary[]) ?? [])
          setOrphanSnapshots((json.orphanSnapshots as OrphanSnapshot[]) ?? [])
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error de red')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const today = new Date()
  const currentLabel = `${MONTHS_ES[today.getMonth()]} ${today.getFullYear()}`

  return (
    <Stack spacing={4}>
      <Alert
        severity='info'
        icon={<i className='tabler-info-circle' aria-hidden='true' />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Las órdenes de pago marcadas como pagadas crean automáticamente <code>expense_payments</code> que el
        workbench de conciliación matchea contra cartolas. Esta vista resume el estado del periodo actual.
      </Alert>

      {loading ? <LinearProgress /> : null}
      {error ? <Alert severity='error'>{error}</Alert> : null}

      <Stack spacing={2}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
          <Typography variant='subtitle1'>Periodos de conciliación · {currentLabel}</Typography>
          <Button
            component={Link}
            href='/finance/reconciliation'
            variant='outlined'
            size='small'
            endIcon={<i className='tabler-external-link' aria-hidden='true' />}
          >
            Abrir workbench
          </Button>
        </Stack>

        {!loading && periods.length === 0 && orphanSnapshots.length === 0 ? (
          <EmptyState
            icon='tabler-target-off'
            title='Sin periodos abiertos este mes'
            description='Aún no se han declarado snapshots ni creado periodos de conciliación para este mes. Comienza desde el módulo Banco o desde el workbench.'
            action={
              <Button
                component={Link}
                href='/finance/reconciliation'
                variant='outlined'
              >
                Ir a conciliación
              </Button>
            }
          />
        ) : null}

        {periods.length > 0 ? (
          <Stack spacing={1.5}>
            {periods.map(p => {
              const meta = statusMeta[p.status] ?? { label: p.status, color: 'secondary' as const }

              return (
                <Box
                  key={p.periodId}
                  sx={theme => ({
                    p: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap'
                  })}
                >
                  <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant='body2' fontWeight={500}>
                      {p.accountLabel ?? p.accountId}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Periodo {p.year}-{String(p.month).padStart(2, '0')} · {p.periodId}
                    </Typography>
                  </Stack>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    {p.totalDifference !== null && p.totalDifference !== 0 ? (
                      <Typography
                        variant='caption'
                        color={p.totalDifference > 0 ? 'warning.main' : 'error.main'}
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        Diferencia {formatAmount(p.totalDifference, p.currency)}
                      </Typography>
                    ) : null}
                    <Chip size='small' variant='tonal' color={meta.color} label={meta.label} />
                    <Button
                      component={Link}
                      href={`/finance/reconciliation/${encodeURIComponent(p.periodId)}`}
                      size='small'
                      variant='text'
                      endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
                    >
                      Abrir
                    </Button>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        ) : null}
      </Stack>

      {orphanSnapshots.length > 0 ? (
        <Stack spacing={2}>
          <Typography variant='subtitle1'>Snapshots sin periodo</Typography>
          <Alert severity='warning' icon={<i className='tabler-alert-triangle' aria-hidden='true' />}>
            Hay {orphanSnapshots.length} snapshot{orphanSnapshots.length === 1 ? '' : 's'} declarado
            {orphanSnapshots.length === 1 ? '' : 's'} sin un periodo asociado. Crea el periodo desde el
            workbench para iniciar el matching.
          </Alert>
          <Stack spacing={1.5}>
            {orphanSnapshots.map(s => (
              <Box
                key={s.snapshotId}
                sx={theme => ({
                  p: 2,
                  border: `1px dashed ${theme.palette.warning.main}`,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap'
                })}
              >
                <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant='body2' fontWeight={500}>
                    {s.accountLabel ?? s.accountId}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Saldo declarado: {formatAmount(s.closingBalance, s.currency)} ·{' '}
                    {new Date(s.declaredAt).toLocaleDateString('es-CL')}
                  </Typography>
                </Stack>
                <Button
                  component={Link}
                  href='/finance/reconciliation'
                  size='small'
                  variant='outlined'
                >
                  Crear periodo
                </Button>
              </Box>
            ))}
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )
}

export default ReconciliationTab
