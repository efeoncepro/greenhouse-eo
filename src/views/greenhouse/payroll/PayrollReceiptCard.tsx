'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'
import type { EntryAdjustmentBreakdown } from '@/lib/payroll/adjustments/breakdown'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { formatCurrency, formatFactor, formatPercent } from './helpers'

type EmployerInfo = {
  legalName: string
  taxId?: string
  legalAddress?: string
}

type Props = {
  entry: PayrollEntry
  period: PayrollPeriod
  employerInfo?: EmployerInfo
  // TASK-745d — opcional para back-compat. Cuando se pasa, el preview
  // refleja exactamente lo que ira al PDF.
  adjustmentsBreakdown?: EntryAdjustmentBreakdown
}

type PayrollEntryWithAllowances = PayrollEntry & {
  chileColacionAmount?: number | null
  chileMovilizacionAmount?: number | null
  chileColacion?: number | null
  chileMovilizacion?: number | null
  colacionAmount?: number | null
  movilizacionAmount?: number | null
  totalHaberesNoImponibles?: number | null
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const ReceiptRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <TableRow sx={bold ? { bgcolor: 'action.hover' } : undefined}>
    <TableCell sx={{ py: 0.75, fontWeight: bold ? 700 : 400 }}>{label}</TableCell>
    <TableCell align='right' sx={{ py: 0.75, fontFamily: 'monospace', fontWeight: bold ? 700 : 400 }}>{value}</TableCell>
  </TableRow>
)

const PayrollReceiptCard = ({ entry, period, employerInfo, adjustmentsBreakdown }: Props) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const currency = entry.currency
  const isChile = entry.payRegime === 'chile'
  const hasAttendanceAdjustment = entry.adjustedBaseSalary != null && entry.adjustedBaseSalary !== entry.baseSalary
  const effectiveFixedBonusAmount = entry.adjustedFixedBonusAmount ?? entry.fixedBonusAmount
  const entryWithAllowances = entry as PayrollEntryWithAllowances

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

  const afpCotizacion = entry.chileAfpCotizacionAmount ?? null
  const afpComision = entry.chileAfpComisionAmount ?? null
  const hasAfpSplit = (afpCotizacion ?? 0) > 0 || (afpComision ?? 0) > 0

  // Build haberes rows
  const haberesRows: [string, string][] = [
    ['Sueldo base', formatCurrency(entry.baseSalary, currency)]
  ]

  if (hasAttendanceAdjustment) {
    haberesRows.push(['Sueldo base ajustado (por inasistencia)', formatCurrency(entry.adjustedBaseSalary, currency)])
  }

  haberesRows.push(['Asignación teletrabajo', formatCurrency(entry.remoteAllowance, currency)])

  if (hasAttendanceAdjustment && entry.adjustedRemoteAllowance != null) {
    haberesRows.push(['Teletrabajo ajustado (por inasistencia)', formatCurrency(entry.adjustedRemoteAllowance, currency)])
  }

  if (entry.fixedBonusAmount > 0) {
    haberesRows.push([
      entry.fixedBonusLabel ? `Bono fijo (${entry.fixedBonusLabel})` : 'Bono fijo',
      formatCurrency(entry.fixedBonusAmount, currency)
    ])
  }

  if (entry.adjustedFixedBonusAmount != null && entry.adjustedFixedBonusAmount !== entry.fixedBonusAmount) {
    haberesRows.push([
      entry.fixedBonusLabel
        ? `Bono fijo ajustado (${entry.fixedBonusLabel})`
        : 'Bono fijo ajustado (por inasistencia)',
      formatCurrency(effectiveFixedBonusAmount, currency)
    ])
  }

  if (colacion > 0) {
    haberesRows.push(['Colación', formatCurrency(colacion, currency)])
  }

  if (movilizacion > 0) {
    haberesRows.push(['Movilización', formatCurrency(movilizacion, currency)])
  }

  haberesRows.push(
    [`Bono OTD (${formatPercent(entry.kpiOtdPercent)} → factor ${formatFactor(entry.bonusOtdProrationFactor)})`, formatCurrency(entry.bonusOtdAmount, currency)],
    [`Bono RpA (${entry.kpiRpaAvg != null ? entry.kpiRpaAvg.toFixed(1) : '—'} → factor ${formatFactor(entry.bonusRpaProrationFactor)})`, formatCurrency(entry.bonusRpaAmount, currency)]
  )

  if (entry.bonusOtherAmount > 0) {
    haberesRows.push([`Bono adicional${entry.bonusOtherDescription ? ` (${entry.bonusOtherDescription})` : ''}`, formatCurrency(entry.bonusOtherAmount, currency)])
  }

  // Attendance rows
  const attendanceRows: [string, string][] = entry.workingDaysInPeriod != null ? [
    ['Días hábiles en período', String(entry.workingDaysInPeriod)],
    ['Días presentes', String(entry.daysPresent ?? '—')],
    ['Días ausentes', String(entry.daysAbsent ?? 0)],
    ['Días licencia', String(entry.daysOnLeave ?? 0)],
    ['Días licencia no remunerada', String(entry.daysOnUnpaidLeave ?? 0)]
  ] : []

  // Deduction rows (Chile only)
  const deductionRows: [string, string][] = []

  if (isChile) {
    deductionRows.push([
      `AFP ${entry.chileAfpName ?? ''} (${entry.chileAfpRate != null ? (entry.chileAfpRate * 100).toFixed(2) : '—'}%)`,
      formatCurrency(entry.chileAfpAmount, currency)
    ])

    if (hasAfpSplit) {
      deductionRows.push(
        ['↳ Cotización', formatCurrency(afpCotizacion, currency)],
        ['↳ Comisión', formatCurrency(afpComision, currency)]
      )
    }

    deductionRows.push(
      [`Salud (${entry.chileHealthSystem ?? '—'})`, formatCurrency(entry.chileHealthAmount, currency)],
      [`Seguro cesantía (${entry.chileUnemploymentRate != null ? (entry.chileUnemploymentRate * 100).toFixed(1) : '—'}%)`, formatCurrency(entry.chileUnemploymentAmount, currency)],
      ['Impuesto único', formatCurrency(entry.chileTaxAmount, currency)]
    )
  }

  if (isChile && entry.chileApvAmount != null && entry.chileApvAmount > 0) {
    deductionRows.push(['APV', formatCurrency(entry.chileApvAmount, currency)])
  }

  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box>
            <Box component='img' src='/branding/logo-full.svg' alt='Efeonce' sx={{ height: 28, display: 'block', mb: 0.5 }} />
            <Typography variant='caption' display='block' color='text.secondary'>
              {employerInfo?.legalName ?? 'Efeonce Group SpA'}
              {employerInfo?.taxId ? ` · RUT ${employerInfo.taxId}` : ''}
            </Typography>
            {employerInfo?.legalAddress && (
              <Typography variant='caption' display='block' color='text.secondary'>{employerInfo.legalAddress}</Typography>
            )}
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>Recibo de remuneraciones</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant='h6'>{monthName} {period.year}</Typography>
            <Typography variant='caption' color='text.secondary'>{period.periodId}</Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: GH_COLORS.role.account.source, borderWidth: 1, mb: 3 }} />

        {/* Employee info */}
        <Typography variant='subtitle2' sx={{ mb: 1.5 }}>Datos del colaborador</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant='caption' color='text.secondary'>Nombre</Typography>
            <Typography variant='body2' fontWeight={500}>{entry.memberName}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant='caption' color='text.secondary'>Email</Typography>
            <Typography variant='body2'>{entry.memberEmail}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant='caption' color='text.secondary'>Régimen</Typography>
            <Typography variant='body2'>{isChile ? 'Chile' : 'Internacional'}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant='caption' color='text.secondary'>Moneda</Typography>
            <Typography variant='body2'>{currency}</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        {/* Haberes */}
        <Typography variant='subtitle2' sx={{ mb: 1 }}>Haberes</Typography>
        <Table size='small' sx={{ mb: 3 }}>
          <TableBody>
            {haberesRows.map(([label, value], i) => (
              <ReceiptRow key={`h-${i}`} label={label} value={value} />
            ))}
            <ReceiptRow label='Total bruto' value={formatCurrency(entry.grossTotal, currency)} bold />
          </TableBody>
        </Table>

        {/* Attendance */}
        {attendanceRows.length > 0 && (
          <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Asistencia</Typography>
            <Table size='small' sx={{ mb: 3 }}>
              <TableBody>
                {attendanceRows.map(([label, value], i) => (
                  <ReceiptRow key={`a-${i}`} label={label} value={value} />
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {/* Deductions (Chile only) */}
        {deductionRows.length > 0 && (
          <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Descuentos legales</Typography>
            <Table size='small' sx={{ mb: 3 }}>
              <TableBody>
                {deductionRows.map(([label, value], i) => (
                  <ReceiptRow key={`d-${i}`} label={label} value={value} />
                ))}
                <ReceiptRow label='Total descuentos' value={formatCurrency(entry.chileTotalDeductions, currency)} bold />
              </TableBody>
            </Table>
          </>
        )}

        {/* TASK-745d — Adjustments visibility */}
        {adjustmentsBreakdown?.excluded && (
          <Alert severity='error' variant='outlined' sx={{ mb: 2 }}>
            <Typography variant='body2' fontWeight={700}>
              Excluido de esta nómina — {adjustmentsBreakdown.excluded.reasonLabel}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
              {adjustmentsBreakdown.excluded.reasonNote}
            </Typography>
          </Alert>
        )}

        {adjustmentsBreakdown && adjustmentsBreakdown.factorApplied !== 1 && !adjustmentsBreakdown.excluded && (
          <Alert severity='warning' variant='outlined' sx={{ mb: 2 }}>
            <Typography variant='body2'>
              Bruto efectivo aplicado: {(adjustmentsBreakdown.factorApplied * 100).toFixed(0)}% del bruto natural
            </Typography>
          </Alert>
        )}

        {adjustmentsBreakdown && adjustmentsBreakdown.fixedDeductions.length > 0 && (
          <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Descuentos pactados</Typography>
            <Table size='small' sx={{ mb: 2 }}>
              <TableBody>
                {adjustmentsBreakdown.fixedDeductions.map(fd => (
                  <TableRow key={fd.adjustmentId}>
                    <TableCell sx={{ py: 0.75 }}>
                      <Typography variant='body2'>{fd.reasonLabel}</Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        {fd.reasonNote}
                      </Typography>
                    </TableCell>
                    <TableCell align='right' sx={{ py: 0.75, fontFamily: 'monospace' }}>
                      − {formatCurrency(fd.amount, fd.currency as 'CLP' | 'USD')}
                    </TableCell>
                  </TableRow>
                ))}
                <ReceiptRow
                  label='Total descuentos pactados'
                  value={`− ${formatCurrency(adjustmentsBreakdown.totalFixedDeductionAmount, currency)}`}
                  bold
                />
              </TableBody>
            </Table>
          </>
        )}

        {adjustmentsBreakdown?.manualOverride && (
          <Alert severity='info' variant='outlined' sx={{ mb: 2 }}>
            <Typography variant='body2' fontWeight={700}>
              Override manual de neto — {adjustmentsBreakdown.manualOverride.reasonLabel}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
              {adjustmentsBreakdown.manualOverride.reasonNote}
            </Typography>
          </Alert>
        )}

        {/* Net total */}
        <Box
          sx={{
            bgcolor: GH_COLORS.role.account.source,
            color: '#fff',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 2,
            mt: 2
          }}
        >
          <Typography variant='subtitle1' fontWeight={700} color='inherit'>Líquido a pagar</Typography>
          <Typography variant='h6' fontWeight={700} sx={{ fontFamily: 'monospace' }} color='inherit'>
            {formatCurrency(entry.netTotal, currency)}
          </Typography>
        </Box>

        {entry.manualOverride && (
          <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
            * Monto neto ajustado manualmente{entry.manualOverrideNote ? `: ${entry.manualOverrideNote}` : ''}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default PayrollReceiptCard
