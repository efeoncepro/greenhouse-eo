'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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

import type { PayrollEntryExplain } from '@/types/payroll'

import { formatCurrency, formatDecimal, formatFactor, formatPercent, formatPeriodLabel } from './helpers'

type Props = {
  open: boolean
  entryId: string | null
  memberName: string | null
  onClose: () => void
}

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' fontWeight={500}>
      {value}
    </Typography>
  </Box>
)

type PayrollEntryExplainAllowances = PayrollEntryExplain['entry'] & {
  chileColacionAmount?: number | null
  chileMovilizacionAmount?: number | null
  chileColacion?: number | null
  chileMovilizacion?: number | null
  colacionAmount?: number | null
  movilizacionAmount?: number | null
  totalHaberesNoImponibles?: number | null
}

const PayrollEntryExplainDialog = ({ open, entryId, memberName, onClose }: Props) => {
  const [data, setData] = useState<PayrollEntryExplain | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !entryId) {
      setData(null)
      setError(null)

      return
    }

    let active = true

    const loadExplain = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/hr/payroll/entries/${entryId}/explain`)

        if (!res.ok) {
          const payload = await res.json().catch(() => null)

          throw new Error(payload?.error || 'No se pudo cargar el detalle de cálculo.')
        }

        const payload = (await res.json()) as PayrollEntryExplain

        if (active) {
          setData(payload)
        }
      } catch (loadError) {
        if (active) {
          setData(null)
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el detalle de cálculo.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadExplain()

    return () => {
      active = false
    }
  }, [open, entryId])

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth closeAfterTransition={false}>
      <DialogTitle>Detalle de cálculo — {memberName || 'Colaborador'}</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
            <CircularProgress size={28} />
          </Stack>
        )}

        {!loading && error && <Alert severity='error'>{error}</Alert>}

        {!loading && !error && data && (
          <Stack spacing={3}>
            {data.calculation.warnings.length > 0 && (
              <Stack spacing={1}>
                {data.calculation.warnings.map(warning => (
                  <Alert key={warning} severity='warning'>
                    {warning}
                  </Alert>
                ))}
              </Stack>
            )}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>
                  Contexto del período
                </Typography>
                <Stack spacing={1.5}>
                  <DetailItem
                    label='Período imputable'
                    value={formatPeriodLabel(data.period.year, data.period.month)}
                  />
                  <DetailItem label='Estado' value={data.period.status} />
                  <DetailItem
                    label='Fuente KPI'
                    value={data.entry.kpiDataSource === 'ico' ? 'ICO' : data.entry.kpiDataSource === 'manual' ? 'Manual' : 'Legacy'}
                  />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>
                  Compensación aplicada
                </Typography>
                <Stack spacing={1.5}>
                  <DetailItem
                    label='Versión'
                    value={data.compensationVersion ? `v${data.compensationVersion.version}` : data.entry.compensationVersionId}
                  />
                  <DetailItem
                    label='Vigencia'
                    value={data.compensationVersion?.effectiveFrom || '—'}
                  />
                  <DetailItem
                    label='Motivo'
                    value={data.compensationVersion?.changeReason || '—'}
                  />
                </Stack>
              </Grid>
            </Grid>

            <Divider />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>
                  KPI y bonos
                </Typography>
                <Stack spacing={1.5}>
                  <DetailItem label='OTD usado' value={formatPercent(data.entry.kpiOtdPercent)} />
                  <DetailItem label='Factor OTD' value={formatFactor(data.entry.bonusOtdProrationFactor)} />
                  <DetailItem label='Bono OTD pagado' value={formatCurrency(data.entry.bonusOtdAmount, data.entry.currency)} />
                  <DetailItem label='RpA usado' value={formatDecimal(data.entry.kpiRpaAvg)} />
                  <DetailItem label='Factor RpA' value={formatFactor(data.entry.bonusRpaProrationFactor)} />
                  <DetailItem label='Bono RpA pagado' value={formatCurrency(data.entry.bonusRpaAmount, data.entry.currency)} />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>
                  Asistencia y ajustes
                </Typography>
                <Stack spacing={1.5}>
                  <DetailItem label='Días hábiles' value={String(data.entry.workingDaysInPeriod ?? '—')} />
                  <DetailItem label='Ausentes + no pagados' value={String(data.calculation.deductibleDays)} />
                  <DetailItem
                    label='Ratio de asistencia aplicado'
                    value={data.calculation.attendanceRatio != null ? formatFactor(data.calculation.attendanceRatio) : '—'}
                  />
                  <DetailItem
                    label='Base efectiva'
                    value={formatCurrency(data.calculation.effectiveBaseSalary, data.entry.currency)}
                  />
                  <DetailItem
                    label='Teletrabajo efectivo'
                    value={formatCurrency(data.calculation.effectiveRemoteAllowance, data.entry.currency)}
                  />
                  <DetailItem
                    label={data.entry.fixedBonusLabel ? `Bono fijo efectivo (${data.entry.fixedBonusLabel})` : 'Bono fijo efectivo'}
                    value={formatCurrency(data.calculation.effectiveFixedBonusAmount, data.entry.currency)}
                  />
                </Stack>
              </Grid>
            </Grid>

            <Divider />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>
                  Totales
                </Typography>
                <Stack spacing={1.5}>
                  {(() => {
                    const entryWithAllowances = data.entry as PayrollEntryExplainAllowances

                    const colacion =
                      entryWithAllowances.chileColacionAmount ??
                      entryWithAllowances.chileColacion ??
                      entryWithAllowances.colacionAmount ??
                      0

                    const movilizacion =
                      entryWithAllowances.chileMovilizacionAmount ??
                      entryWithAllowances.chileMovilizacion ??
                      entryWithAllowances.movilizacionAmount ??
                      0

                    const totalNoImponible = colacion + movilizacion

                    return totalNoImponible > 0
                      ? <DetailItem label='Haberes no imponibles' value={formatCurrency(totalNoImponible, data.entry.currency)} />
                      : null
                  })()}
                  <DetailItem
                    label='AFP total'
                    value={formatCurrency(data.entry.chileAfpAmount, data.entry.currency)}
                  />
                  <DetailItem
                    label='AFP cotización'
                    value={formatCurrency(data.entry.chileAfpCotizacionAmount, data.entry.currency)}
                  />
                  <DetailItem
                    label='AFP comisión'
                    value={formatCurrency(data.entry.chileAfpComisionAmount, data.entry.currency)}
                  />
                  <DetailItem
                    label='Bonos variables totales'
                    value={formatCurrency(data.calculation.totalVariableBonus, data.entry.currency)}
                  />
                  <DetailItem label='Bruto' value={formatCurrency(data.entry.grossTotal, data.entry.currency)} />
                  <DetailItem
                    label='Descuentos'
                    value={data.entry.payRegime === 'chile' ? formatCurrency(data.entry.chileTotalDeductions, 'CLP') : '—'}
                  />
                  <DetailItem
                    label='Neto calculado'
                    value={formatCurrency(data.entry.netTotalCalculated, data.entry.currency)}
                  />
                  <DetailItem
                    label='Neto final'
                    value={formatCurrency(data.entry.netTotal, data.entry.currency)}
                  />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>
                  Señales operativas
                </Typography>
                <Stack spacing={1.5}>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    <CustomChip
                      round='true'
                      size='small'
                      label={data.calculation.usesManualKpi ? 'KPI manual' : 'KPI automático'}
                      color={data.calculation.usesManualKpi ? 'warning' : 'success'}
                    />
                    <CustomChip
                      round='true'
                      size='small'
                      label={data.calculation.usesManualOverride ? 'Override manual' : 'Sin override'}
                      color={data.calculation.usesManualOverride ? 'warning' : 'secondary'}
                    />
                    <CustomChip
                      round='true'
                      size='small'
                      label={data.calculation.hasAttendanceAdjustment ? 'Base ajustada' : 'Sin ajuste asistencia'}
                      color={data.calculation.hasAttendanceAdjustment ? 'info' : 'secondary'}
                    />
                  </Stack>
                  {data.entry.manualOverrideNote && (
                    <DetailItem label='Motivo override' value={data.entry.manualOverrideNote} />
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PayrollEntryExplainDialog
