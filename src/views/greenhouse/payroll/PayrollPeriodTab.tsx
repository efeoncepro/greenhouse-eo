'use client'

import { useCallback, useState, useTransition } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ConfirmDialog } from '@/components/dialogs'
import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'
import PayrollEntryTable from './PayrollEntryTable'
import { formatCurrency, formatPeriodLabel, formatTimestamp, periodStatusConfig } from './helpers'

type Props = {
  period: PayrollPeriod | null
  entries: PayrollEntry[]
  onRefresh: () => void
}

const PayrollPeriodTab = ({ period, entries, onRefresh }: Props) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)

  const handleCalculate = useCallback(() => {
    if (!period) return

    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/hr/payroll/periods/${period.periodId}/calculate`, { method: 'POST' })

      if (!res.ok) {
        const data = await res.json()

        setError(data.error || 'Error al calcular')

        return
      }

      onRefresh()
    })
  }, [period, onRefresh])

  const handleApprove = useCallback(async () => {
    if (!period) return

    setError(null)
    const res = await fetch(`/api/hr/payroll/periods/${period.periodId}/approve`, { method: 'POST' })

    if (!res.ok) {
      const data = await res.json()

      setError(data.error || 'Error al aprobar')

      return
    }

    onRefresh()
  }, [period, onRefresh])

  const handleExport = useCallback(async () => {
    if (!period) return

    const res = await fetch(`/api/hr/payroll/periods/${period.periodId}/export`)

    if (!res.ok) {
      const data = await res.json()

      setError(data.error || 'Error al exportar')

      return
    }

    const csv = await res.text()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `nomina_${period.periodId}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onRefresh()
  }, [period, onRefresh])

  const handleEntryUpdate = useCallback(
    (entryId: string, field: string, value: number) => {
      startTransition(async () => {
        const res = await fetch(`/api/hr/payroll/entries/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value })
        })

        if (!res.ok) {
          const data = await res.json()

          setError(data.error || 'Error al actualizar')

          return
        }

        onRefresh()
      })
    },
    [onRefresh]
  )

  if (!period) {
    return (
      <Card>
        <CardContent>
          <Typography color='text.secondary' textAlign='center' sx={{ py: 6 }}>
            No hay período seleccionado. Crea un período para comenzar.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const status = periodStatusConfig[period.status]
  const totals = entries.reduce(
    (acc, e) => ({
      gross: acc.gross + e.grossTotal,
      net: acc.net + e.netTotal,
      deductions: acc.deductions + (e.chileTotalDeductions ?? 0)
    }),
    { gross: 0, net: 0, deductions: 0 }
  )

  const hasMixedCurrency = new Set(entries.map(e => e.currency)).size > 1

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Stack direction='row' spacing={2} alignItems='center'>
              <Typography variant='h5'>{formatPeriodLabel(period.year, period.month)}</Typography>
              <Chip
                size='small'
                icon={<i className={status.icon} />}
                label={status.label}
                color={status.color}
                variant='tonal'
              />
              {isPending && <CircularProgress size={18} />}
            </Stack>
          }
          subheader={
            <Stack direction='row' spacing={3} sx={{ mt: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                {entries.length} colaborador{entries.length !== 1 ? 'es' : ''}
              </Typography>
              {!hasMixedCurrency && entries.length > 0 && (
                <>
                  <Typography variant='body2' color='text.secondary'>
                    Bruto total: <b>{formatCurrency(totals.gross, entries[0].currency)}</b>
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Neto total: <b>{formatCurrency(totals.net, entries[0].currency)}</b>
                  </Typography>
                </>
              )}
              {period.ufValue && (
                <Typography variant='body2' color='text.secondary'>
                  UF: {period.ufValue.toLocaleString('es-CL')}
                </Typography>
              )}
            </Stack>
          }
          action={
            <Stack direction='row' spacing={1}>
              {period.status === 'draft' && (
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-calculator' />}
                  onClick={handleCalculate}
                  disabled={isPending}
                >
                  Calcular
                </Button>
              )}
              {period.status === 'calculated' && (
                <>
                  <Button
                    variant='tonal'
                    size='small'
                    color='info'
                    startIcon={<i className='tabler-refresh' />}
                    onClick={handleCalculate}
                    disabled={isPending}
                  >
                    Recalcular
                  </Button>
                  <Button
                    variant='contained'
                    size='small'
                    color='success'
                    startIcon={<i className='tabler-circle-check' />}
                    onClick={() => setConfirmApprove(true)}
                    disabled={isPending}
                  >
                    Aprobar
                  </Button>
                </>
              )}
              {(period.status === 'approved' || period.status === 'exported') && (
                <Button
                  variant='tonal'
                  size='small'
                  startIcon={<i className='tabler-file-export' />}
                  onClick={handleExport}
                  disabled={isPending}
                >
                  Exportar CSV
                </Button>
              )}
            </Stack>
          }
        />
        <CardContent>
          {error && (
            <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {entries.length === 0 && period.status === 'draft' ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color='text.secondary'>
                Período en borrador. Presiona &quot;Calcular&quot; para generar la nómina.
              </Typography>
            </Box>
          ) : entries.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color='text.secondary'>No hay entries para este período.</Typography>
            </Box>
          ) : (
            <PayrollEntryTable
              entries={entries}
              periodStatus={period.status}
              onEntryUpdate={handleEntryUpdate}
            />
          )}

          {period.calculatedAt && (
            <Typography variant='caption' color='text.disabled' sx={{ mt: 2, display: 'block' }}>
              Calculado: {formatTimestamp(period.calculatedAt)}
              {period.calculatedBy ? ` por ${period.calculatedBy}` : ''}
            </Typography>
          )}
          {period.approvedAt && (
            <Typography variant='caption' color='text.disabled' sx={{ display: 'block' }}>
              Aprobado: {formatTimestamp(period.approvedAt)}
              {period.approvedBy ? ` por ${period.approvedBy}` : ''}
            </Typography>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmApprove}
        setOpen={setConfirmApprove}
        title='¿Aprobar esta nómina?'
        description='Una vez aprobada, las entries no podrán editarse. Esta acción no se puede revertir.'
        confirmLabel='Sí, aprobar'
        confirmColor='success'
        onConfirm={handleApprove}
      />
    </>
  )
}

export default PayrollPeriodTab
