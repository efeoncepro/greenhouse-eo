'use client'

import { useCallback, useState, useTransition } from 'react'

import Alert from '@mui/material/Alert'
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
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { ConfirmDialog } from '@/components/dialogs'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
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
  const [editMetaOpen, setEditMetaOpen] = useState(false)
  const [editUf, setEditUf] = useState<number | ''>('')
  const [editTaxTable, setEditTaxTable] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

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
    (entryId: string, field: string, value: number | string | boolean | null) => {
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

  const openEditMeta = useCallback(() => {
    if (!period) return

    setEditUf(period.ufValue ?? '')
    setEditTaxTable(period.taxTableVersion ?? '')
    setEditNotes(period.notes ?? '')
    setEditMetaOpen(true)
  }, [period])

  const handleSaveMeta = useCallback(async () => {
    if (!period) return

    setEditSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/payroll/periods/${period.periodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editUf !== '' && { ufValue: editUf }),
          ...(editTaxTable && { taxTableVersion: editTaxTable }),
          ...(editNotes && { notes: editNotes })
        })
      })

      if (!res.ok) {
        const data = await res.json()

        setError(data.error || 'Error al actualizar período')

        return
      }

      setEditMetaOpen(false)
      onRefresh()
    } finally {
      setEditSaving(false)
    }
  }, [period, editUf, editTaxTable, editNotes, onRefresh])

  if (!period) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Stack alignItems='center' spacing={1}>
            <i className='tabler-calendar-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography color='text.secondary'>
              No hay período seleccionado. Crea un período para comenzar.
            </Typography>
          </Stack>
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
  const primaryCurrency = entries[0]?.currency ?? 'CLP'

  return (
    <>
      {/* Period totals KPI row */}
      {!hasMixedCurrency && entries.length > 0 && (
        <Grid container spacing={6} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Bruto total'
              stats={formatCurrency(totals.gross, primaryCurrency)}
              avatarIcon='tabler-coins'
              avatarColor='warning'
              subtitle={`${entries.length} colaborador${entries.length !== 1 ? 'es' : ''}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Descuentos'
              stats={formatCurrency(totals.deductions, 'CLP')}
              avatarIcon='tabler-receipt-tax'
              avatarColor='error'
              subtitle='Previsión + impuesto'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Neto total'
              stats={formatCurrency(totals.net, primaryCurrency)}
              avatarIcon='tabler-wallet'
              avatarColor='success'
              subtitle='A pagar'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Valor UF'
              stats={period.ufValue ? period.ufValue.toLocaleString('es-CL') : '—'}
              avatarIcon='tabler-chart-dots'
              avatarColor='info'
              subtitle={period.ufValue ? 'Configurado' : 'No configurado'}
            />
          </Grid>
        </Grid>
      )}

      {/* UF warning for Chile entries without UF */}
      {!period.ufValue && entries.some(e => e.payRegime === 'chile') && period.status === 'draft' && (
        <Alert severity='warning' sx={{ mb: 4 }}>
          El valor UF no está configurado. Es necesario para calcular Isapre en régimen CLP.
        </Alert>
      )}

      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-receipt-2' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
          title={
            <Stack direction='row' spacing={2} alignItems='center'>
              <Typography variant='h6'>{formatPeriodLabel(period.year, period.month)}</Typography>
              <CustomChip
                round='true'
                size='small'
                icon={<i className={status.icon} />}
                label={status.label}
                color={status.color === 'default' ? 'secondary' : status.color}
              />
              {isPending && <CircularProgress size={18} />}
            </Stack>
          }
          subheader={
            <Typography variant='body2' color='text.secondary'>
              {entries.length} colaborador{entries.length !== 1 ? 'es' : ''}
            </Typography>
          }
          action={
            <Stack direction='row' spacing={1}>
              {period.status === 'draft' && (
                <>
                  <Button
                    variant='tonal'
                    size='small'
                    color='secondary'
                    startIcon={<i className='tabler-edit' />}
                    onClick={openEditMeta}
                    disabled={isPending}
                  >
                    Editar período
                  </Button>
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<i className='tabler-calculator' />}
                    onClick={handleCalculate}
                    disabled={isPending}
                  >
                    Calcular
                  </Button>
                </>
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
              {period.status === 'approved' && (
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
                    variant='tonal'
                    size='small'
                    color='success'
                    startIcon={<i className='tabler-file-type-pdf' />}
                    onClick={() => window.open(`/api/hr/payroll/periods/${period.periodId}/pdf`, '_blank')}
                    disabled={isPending}
                  >
                    PDF
                  </Button>
                  <Button
                    variant='tonal'
                    size='small'
                    color='success'
                    startIcon={<i className='tabler-file-spreadsheet' />}
                    onClick={() => window.open(`/api/hr/payroll/periods/${period.periodId}/excel`, '_blank')}
                    disabled={isPending}
                  >
                    Excel
                  </Button>
                  <Button
                    variant='tonal'
                    size='small'
                    startIcon={<i className='tabler-file-export' />}
                    onClick={handleExport}
                    disabled={isPending}
                  >
                    CSV
                  </Button>
                </>
              )}
              {period.status === 'exported' && (
                <>
                  <Button
                    variant='tonal'
                    size='small'
                    color='info'
                    startIcon={<i className='tabler-file-type-pdf' />}
                    onClick={() => window.open(`/api/hr/payroll/periods/${period.periodId}/pdf`, '_blank')}
                    disabled={isPending}
                  >
                    PDF
                  </Button>
                  <Button
                    variant='tonal'
                    size='small'
                    color='success'
                    startIcon={<i className='tabler-file-spreadsheet' />}
                    onClick={() => window.open(`/api/hr/payroll/periods/${period.periodId}/excel`, '_blank')}
                    disabled={isPending}
                  >
                    Excel
                  </Button>
                  <Button
                    variant='tonal'
                    size='small'
                    startIcon={<i className='tabler-file-export' />}
                    onClick={handleExport}
                    disabled={isPending}
                  >
                    CSV
                  </Button>
                </>
              )}
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          {error && (
            <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {entries.length === 0 && period.status === 'draft' ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Stack alignItems='center' spacing={1}>
                <i className='tabler-calculator' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                <Typography color='text.secondary'>
                  Período en borrador. Presiona &quot;Calcular&quot; para generar la nómina.
                </Typography>
              </Stack>
            </Box>
          ) : entries.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Stack alignItems='center' spacing={1}>
                <i className='tabler-file-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                <Typography color='text.secondary'>No hay entries para este período.</Typography>
              </Stack>
            </Box>
          ) : (
            <PayrollEntryTable
              entries={entries}
              period={period}
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
        description='Después de aprobar, aún podrás hacer ajustes hasta exportar/cerrar la nómina. Si recalculas o editas entries, el período volverá a Calculado y deberá aprobarse nuevamente antes de exportar.'
        confirmLabel='Sí, aprobar'
        confirmColor='success'
        onConfirm={handleApprove}
      />

      {/* Edit period metadata dialog */}
      <Dialog
        open={editMetaOpen}
        onClose={() => !editSaving && setEditMetaOpen(false)}
        maxWidth='xs'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Editar período</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Valor UF'
              type='number'
              value={editUf}
              onChange={e => setEditUf(e.target.value === '' ? '' : Number(e.target.value))}
              helperText='Necesario para calcular Isapre'
            />
            <CustomTextField
              fullWidth
              size='small'
              label='Versión tabla impositiva'
              value={editTaxTable}
              onChange={e => setEditTaxTable(e.target.value)}
              helperText='Identificador de la tabla SII aplicable'
            />
            <CustomTextField
              fullWidth
              size='small'
              label='Notas'
              multiline
              rows={3}
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setEditMetaOpen(false)} disabled={editSaving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSaveMeta} disabled={editSaving}>
            {editSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default PayrollPeriodTab
