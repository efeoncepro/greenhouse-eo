'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

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
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { ConfirmDialog } from '@/components/dialogs'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { PayrollEntry, PayrollPeriod, PayrollPeriodReadiness } from '@/types/payroll'
import {
  canEditPayrollPeriodMetadata,
  doesPayrollPeriodUpdateRequireReset
} from '@/lib/payroll/period-lifecycle'
import PayrollEntryTable from './PayrollEntryTable'
import { buildPayrollCurrencySummary, formatPeriodLabel, formatTimestamp, periodStatusConfig } from './helpers'

type Props = {
  period: PayrollPeriod | null
  entries: PayrollEntry[]
  onRefresh: () => void
  onCreatePeriod: () => void
  createPeriodLabel: string
  isHistoricalSelection?: boolean
}

const PayrollPeriodTab = ({ period, entries, onRefresh, onCreatePeriod, createPeriodLabel, isHistoricalSelection }: Props) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [editMetaOpen, setEditMetaOpen] = useState(false)
  const [editYear, setEditYear] = useState<number | ''>('')
  const [editMonth, setEditMonth] = useState<number | ''>('')
  const [editTaxTable, setEditTaxTable] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [readiness, setReadiness] = useState<PayrollPeriodReadiness | null>(null)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const periodId = period?.periodId ?? null

  useEffect(() => {
    if (!periodId) {
      setReadiness(null)
      setReadinessError(null)

      return
    }

    let active = true

    const loadReadiness = async () => {
      setReadinessLoading(true)
      setReadinessError(null)

      try {
        const res = await fetch(`/api/hr/payroll/periods/${periodId}/readiness`)

        if (!res.ok) {
          const data = await res.json().catch(() => null)

          throw new Error(data?.error || 'No se pudo cargar el readiness del período.')
        }

        const data = (await res.json()) as PayrollPeriodReadiness

        if (active) {
          setReadiness(data)
        }
      } catch (loadError) {
        if (active) {
          setReadiness(null)
          setReadinessError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el readiness del período.')
        }
      } finally {
        if (active) {
          setReadinessLoading(false)
        }
      }
    }

    void loadReadiness()

    return () => {
      active = false
    }
  }, [periodId, period?.status, entries.length])

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
  }, [period, onRefresh, startTransition])

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

  const handleClosePeriod = useCallback(async () => {
    if (!period) return

    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await fetch(`/api/hr/payroll/periods/${period.periodId}/close`, { method: 'POST' })

      if (!res.ok) {
        const data = await res.json()

        setError(data.error || 'Error al cerrar período')

        return
      }

      const data = await res.json().catch(() => null)

      if (data?.notificationDispatch?.error) {
        setError(data.notificationDispatch.error)

        return
      }

      setNotice('El período se cerró y se disparó la notificación de exportación.')
      onRefresh()
    })
  }, [period, onRefresh])

  const handleResendExportReady = useCallback(async () => {
    if (!period) return

    setError(null)
    setNotice(null)
    setResendLoading(true)

    try {
      const res = await fetch(`/api/hr/payroll/periods/${period.periodId}/resend-export-ready`, {
        method: 'POST'
      })

      if (!res.ok) {
        const data = await res.json()

        setError(data.error || 'Error al reenviar la notificación')

        return
      }

      setNotice('Se reenviaron el correo y los adjuntos de exportación.')
      onRefresh()
    } finally {
      setResendLoading(false)
    }
  }, [period, onRefresh])

  const handleDownloadCsv = useCallback(async () => {
    if (!period) return

    const res = await fetch(`/api/hr/payroll/periods/${period.periodId}/csv`)

    if (!res.ok) {
      const data = await res.json()

      setError(data.error || 'Error al descargar CSV')

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
  }, [period])

  const handleDownloadPdf = useCallback(async () => {
    if (!period) return

    const res = await fetch(`/api/hr/payroll/periods/${period.periodId}/pdf`)

    if (!res.ok) {
      const data = await res.json()

      setError(data.error || 'Error al descargar PDF')

      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `nomina_${period.periodId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [period])

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

    setEditYear(period.year)
    setEditMonth(period.month)
    setEditTaxTable(period.taxTableVersion ?? '')
    setEditNotes(period.notes ?? '')
    setEditMetaOpen(true)
  }, [period])

  const handleSaveMeta = useCallback(async () => {
    if (!period) return

    setEditSaving(true)
    setError(null)

    try {
      const nextYear = editYear === '' ? period.year : editYear
      const nextMonth = editMonth === '' ? period.month : editMonth

      const res = await fetch(`/api/hr/payroll/periods/${period.periodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: nextYear,
          month: nextMonth,
          taxTableVersion: editTaxTable || null,
          notes: editNotes || null
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
  }, [period, editYear, editMonth, editTaxTable, editNotes, onRefresh])

  if (!period) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 8 }}>
          <Stack alignItems='center' spacing={2} textAlign='center'>
            <i className='tabler-calendar-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography variant='h6'>No hay período abierto</Typography>
            <Typography color='text.secondary'>
              El siguiente ciclo sugerido es {createPeriodLabel}. Si ya cerraste el período anterior, crea el nuevo borrador para continuar.
            </Typography>
            <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={onCreatePeriod}>
              Crear período {createPeriodLabel}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const status = periodStatusConfig[period.status]
  const canEditPeriod = canEditPayrollPeriodMetadata(period.status)
  const nextYearPreview = editYear === '' ? period.year : editYear
  const nextMonthPreview = editMonth === '' ? period.month : editMonth

  const resetWarning =
    canEditPeriod && doesPayrollPeriodUpdateRequireReset({
      currentYear: period.year,
      currentMonth: period.month,
      currentUfValue: period.ufValue,
      currentTaxTableVersion: period.taxTableVersion,
      nextYear: typeof nextYearPreview === 'number' ? nextYearPreview : period.year,
      nextMonth: typeof nextMonthPreview === 'number' ? nextMonthPreview : period.month,
      nextUfValue: period.ufValue,
      nextTaxTableVersion: editTaxTable || null
    })

  const grossSummary = buildPayrollCurrencySummary(entries, entry => entry.grossTotal)
  const netSummary = buildPayrollCurrencySummary(entries, entry => entry.netTotal)
  const deductionsSummary = buildPayrollCurrencySummary(entries, entry => entry.chileTotalDeductions ?? 0)

  return (
    <>
      {isHistoricalSelection && (
        <Alert severity='info' sx={{ mb: 4 }}>
          Estás viendo un período histórico seleccionado desde Historial. El período abierto o vigente sigue mostrándose en el resumen superior.
        </Alert>
      )}

      {/* Period totals KPI row */}
      {entries.length > 0 && (
        <Grid container spacing={6} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Bruto total'
              stats={grossSummary.hasMixedCurrency ? 'Mixto' : grossSummary.summaryLabel}
              avatarIcon='tabler-coins'
              avatarColor='warning'
              subtitle={grossSummary.hasMixedCurrency ? grossSummary.summaryLabel : `${entries.length} colaborador${entries.length !== 1 ? 'es' : ''}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Descuentos'
              stats={deductionsSummary.hasMixedCurrency ? 'Mixto' : deductionsSummary.summaryLabel}
              avatarIcon='tabler-receipt-tax'
              avatarColor='error'
              subtitle={deductionsSummary.hasMixedCurrency ? deductionsSummary.summaryLabel : 'Previsión + impuesto'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Neto total'
              stats={netSummary.hasMixedCurrency ? 'Mixto' : netSummary.summaryLabel}
              avatarIcon='tabler-wallet'
              avatarColor='success'
              subtitle={netSummary.hasMixedCurrency ? netSummary.summaryLabel : 'A pagar'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Valor UF'
              stats={period.ufValue ? period.ufValue.toLocaleString('es-CL') : '—'}
              avatarIcon='tabler-chart-dots'
              avatarColor='info'
              subtitle={period.ufValue ? 'Sincronizado' : 'Pendiente de sincronizar'}
            />
          </Grid>
        </Grid>
      )}

      {/* UF warning for Chile entries without UF */}
      {!period.ufValue && entries.some(e => e.payRegime === 'chile') && period.status === 'draft' && (
        <Alert severity='warning' sx={{ mb: 4 }}>
          La UF del período aún no está sincronizada. Si el indicador existe para ese mes, se tomará automáticamente al calcular.
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
              {readinessLoading && <CircularProgress size={18} color='inherit' />}
            </Stack>
          }
          subheader={
            <Typography variant='body2' color='text.secondary'>
              {entries.length} colaborador{entries.length !== 1 ? 'es' : ''}
            </Typography>
          }
          action={
            <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                    disabled={isPending || readinessLoading || readiness?.ready === false}
                  >
                    Calcular
                  </Button>
                </>
              )}
              {period.status === 'calculated' && canEditPeriod && (
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
                  {canEditPeriod && (
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
                  )}
                  <Button
                    variant='contained'
                    size='small'
                    color='warning'
                    startIcon={<i className='tabler-mail-forward' />}
                    onClick={handleClosePeriod}
                    disabled={isPending}
                    aria-label={`Cerrar y notificar el período ${formatPeriodLabel(period.year, period.month)}`}
                  >
                    Cerrar y notificar
                  </Button>
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
                    onClick={handleDownloadPdf}
                    disabled={isPending}
                    aria-label={`Descargar PDF del período ${formatPeriodLabel(period.year, period.month)}`}
                  >
                    Descargar PDF
                  </Button>
                  <Button
                    variant='tonal'
                    size='small'
                    color='success'
                    startIcon={<i className='tabler-file-spreadsheet' />}
                    onClick={() => window.open(`/api/hr/payroll/periods/${period.periodId}/excel`, '_blank')}
                    disabled={isPending}
                    aria-label={`Abrir Excel del período ${formatPeriodLabel(period.year, period.month)}`}
                    >
                      Ver Excel
                    </Button>
                    <Button
                      variant='tonal'
                      size='small'
                      startIcon={<i className='tabler-file-export' />}
                      onClick={handleDownloadCsv}
                      disabled={isPending}
                      aria-label={`Descargar CSV del período ${formatPeriodLabel(period.year, period.month)}`}
                    >
                      Descargar CSV
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
                    onClick={handleDownloadPdf}
                    disabled={isPending}
                    aria-label={`Descargar PDF del período ${formatPeriodLabel(period.year, period.month)}`}
                  >
                    Descargar PDF
                  </Button>
                  <Button
                    variant='tonal'
                    size='small'
                    color='success'
                    startIcon={<i className='tabler-file-spreadsheet' />}
                    onClick={() => window.open(`/api/hr/payroll/periods/${period.periodId}/excel`, '_blank')}
                    disabled={isPending}
                    aria-label={`Abrir Excel del período ${formatPeriodLabel(period.year, period.month)}`}
                  >
                    Ver Excel
                  </Button>
                  <Button
                    variant='tonal'
                    size='small'
                    startIcon={<i className='tabler-file-export' />}
                    onClick={handleDownloadCsv}
                    disabled={isPending}
                    aria-label={`Descargar CSV del período ${formatPeriodLabel(period.year, period.month)}`}
                  >
                    Descargar CSV
                  </Button>
                  <Button
                    variant='contained'
                    size='small'
                    color='secondary'
                    startIcon={<i className='tabler-mail-forward' />}
                    onClick={handleResendExportReady}
                    disabled={isPending || resendLoading}
                    aria-label={`Reenviar correo de exportación del período ${formatPeriodLabel(period.year, period.month)}`}
                  >
                    Reenviar correo
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

          {notice && (
            <Alert severity='success' sx={{ mb: 2 }} onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          )}

          {readinessError && (
            <Alert severity='warning' sx={{ mb: 2 }} onClose={() => setReadinessError(null)}>
              {readinessError}
            </Alert>
          )}

          {readiness && (
            <Stack spacing={2} sx={{ mb: 3 }}>
              {readiness.blockingIssues.map(issue => (
                <Alert key={issue.code} severity='error'>
                  {issue.message}
                </Alert>
              ))}
              {readiness.warnings.map(issue => (
                <Alert key={issue.code} severity='warning'>
                  {issue.message}
                </Alert>
              ))}
              {readiness.attendanceDiagnostics.notes.map(note => (
                <Alert key={note} severity='info'>
                  {note}
                </Alert>
              ))}
              {(readiness.blockingIssues.length > 0 || readiness.warnings.length > 0) && (
                <Alert severity='info'>
                  Readiness del período:
                  {' '}
                  {readiness.includedMemberIds.length}
                  {' '}
                  colaborador(es) entrarían al cálculo;
                  {' '}
                  {readiness.missingCompensationMemberIds.length}
                  {' '}
                  quedarían fuera por compensación;
                  {' '}
                  {readiness.missingKpiMemberIds.length}
                  {' '}
                  no tienen KPI ICO;
                  {' '}
                  {readiness.missingAttendanceMemberIds.length}
                  {' '}
                  no muestran señales de asistencia/licencias.
                </Alert>
              )}
            </Stack>
          )}

          {entries.length === 0 && period.status === 'draft' ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Stack alignItems='center' spacing={1}>
                <i className='tabler-calculator' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                <Typography color='text.secondary'>
                  Período en borrador. Revisa el readiness y luego presiona &quot;Calcular&quot; para generar la nómina.
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
            <Stack direction='row' spacing={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Año imputable'
                value={editYear}
                onChange={e => setEditYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Mes imputable'
                value={editMonth}
                onChange={e => setEditMonth(Number(e.target.value))}
              >
                {[
                  'Enero',
                  'Febrero',
                  'Marzo',
                  'Abril',
                  'Mayo',
                  'Junio',
                  'Julio',
                  'Agosto',
                  'Septiembre',
                  'Octubre',
                  'Noviembre',
                  'Diciembre'
                ].map((label, index) => (
                  <MenuItem key={label} value={index + 1}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Stack>
            <Alert severity='info'>
              La UF se sincroniza automáticamente desde indicadores económicos según el mes imputable guardado para este período.
            </Alert>
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
            {resetWarning && (
              <Alert severity='warning'>
                Cambiar mes/año imputable o tabla impositiva reiniciará este período a borrador y eliminará las entries calculadas para que puedas recalcularlo con los valores correctos del período.
              </Alert>
            )}
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
