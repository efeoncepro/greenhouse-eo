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
import {
  buildReceiptPresentation,
  type ReceiptInfoBlock,
  type ReceiptInfoBlockVariant,
  type ReceiptPresenterEntry
} from '@/lib/payroll/receipt-presenter'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()

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

const MONTH_NAMES = GREENHOUSE_COPY.months.long

// MUI Alert severity tokens map 1:1 with our infoBlock variants.
const ALERT_SEVERITY: Record<ReceiptInfoBlockVariant, 'info' | 'warning' | 'error'> = {
  info: 'info',
  warning: 'warning',
  error: 'error'
}

const ReceiptRow = ({ label, value, bold, indent }: { label: string; value: string; bold?: boolean; indent?: boolean }) => (
  <TableRow sx={bold ? { bgcolor: 'action.hover' } : undefined}>
    <TableCell sx={{ py: 0.75, pl: indent ? 4 : 2, fontWeight: bold ? 700 : 400, color: indent ? 'text.secondary' : 'text.primary' }}>
      {label}
    </TableCell>
    <TableCell align='right' sx={{ py: 0.75, fontWeight: bold ? 700 : 400 }}>{value}</TableCell>
  </TableRow>
)

const InfoBlockAlert = ({ block }: { block: ReceiptInfoBlock }) => (
  <Alert severity={ALERT_SEVERITY[block.variant]} variant='outlined' sx={{ mb: 2 }}>
    <Typography variant='body2' fontWeight={700}>{block.title}</Typography>
    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
      {block.body}
    </Typography>
    {block.meta && (
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ display: 'block', mt: 0.5, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}
      >
        {block.meta}
      </Typography>
    )}
  </Alert>
)

// Build the presenter input from the persisted PayrollEntry. The presenter is
// decoupled from PayrollEntry directly so it can also serve ProjectedPayrollView.
const toPresenterEntry = (entry: PayrollEntry, period: PayrollPeriod): ReceiptPresenterEntry => {
  const periodDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`

  return {
    payRegime: entry.payRegime,
    contractTypeSnapshot: entry.contractTypeSnapshot ?? null,
    payrollVia: entry.payrollVia ?? null,
    currency: entry.currency,

    memberName: entry.memberName,
    memberEmail: entry.memberEmail,
    deelContractId: entry.deelContractId ?? null,

    baseSalary: entry.baseSalary,
    adjustedBaseSalary: entry.adjustedBaseSalary,
    remoteAllowance: entry.remoteAllowance,
    adjustedRemoteAllowance: entry.adjustedRemoteAllowance,
    fixedBonusLabel: entry.fixedBonusLabel,
    fixedBonusAmount: entry.fixedBonusAmount,
    adjustedFixedBonusAmount: entry.adjustedFixedBonusAmount,
    bonusOtdAmount: entry.bonusOtdAmount,
    bonusRpaAmount: entry.bonusRpaAmount,
    bonusOtherAmount: entry.bonusOtherAmount,
    bonusOtherDescription: entry.bonusOtherDescription,

    chileColacionAmount: entry.chileColacionAmount,
    chileMovilizacionAmount: entry.chileMovilizacionAmount,
    chileGratificacionLegalAmount: entry.chileGratificacionLegalAmount,

    grossTotal: entry.grossTotal,
    netTotal: entry.netTotal,

    kpiOtdPercent: entry.kpiOtdPercent,
    kpiRpaAvg: entry.kpiRpaAvg,
    bonusOtdProrationFactor: entry.bonusOtdProrationFactor,
    bonusRpaProrationFactor: entry.bonusRpaProrationFactor,

    workingDaysInPeriod: entry.workingDaysInPeriod,
    daysPresent: entry.daysPresent,
    daysAbsent: entry.daysAbsent,
    daysOnLeave: entry.daysOnLeave,
    daysOnUnpaidLeave: entry.daysOnUnpaidLeave,

    chileAfpName: entry.chileAfpName,
    chileAfpRate: entry.chileAfpRate,
    chileAfpAmount: entry.chileAfpAmount,
    chileAfpCotizacionAmount: entry.chileAfpCotizacionAmount,
    chileAfpComisionAmount: entry.chileAfpComisionAmount,
    chileHealthSystem: entry.chileHealthSystem,
    chileHealthAmount: entry.chileHealthAmount,
    chileHealthObligatoriaAmount: entry.chileHealthObligatoriaAmount,
    chileHealthVoluntariaAmount: entry.chileHealthVoluntariaAmount,
    chileUnemploymentRate: entry.chileUnemploymentRate,
    chileUnemploymentAmount: entry.chileUnemploymentAmount,
    chileTaxAmount: entry.chileTaxAmount,
    chileApvAmount: entry.chileApvAmount,
    chileTotalDeductions: entry.chileTotalDeductions,

    siiRetentionRate: entry.siiRetentionRate ?? null,
    siiRetentionAmount: entry.siiRetentionAmount ?? null,

    manualOverride: entry.manualOverride,
    manualOverrideNote: entry.manualOverrideNote,

    periodDate
  }
}

const PayrollReceiptCard = ({ entry, period, employerInfo, adjustmentsBreakdown }: Props) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const presentation = buildReceiptPresentation(toPresenterEntry(entry, period), adjustmentsBreakdown)

  return (
    <Card
      elevation={0}
      sx={{ border: t => `1px solid ${t.palette.divider}` }}
      aria-label={`Recibo régimen ${presentation.badge.label} — ${entry.memberName}, ${presentation.contractTypeLabel}, ${monthName} ${period.year}, líquido ${presentation.hero.amount}`}
    >
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

        {/* Employee box — 4 fields, 2x2 grid (TASK-758: Tipo de contrato + contextual field) */}
        <Typography variant='subtitle2' sx={{ mb: 1.5 }}>Datos del colaborador</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {presentation.employeeFields.map((field, i) => (
            <Grid size={{ xs: 12, sm: 6 }} key={`employee-field-${i}`}>
              <Typography variant='caption' color='text.secondary'>{field.label}</Typography>
              <Typography variant='body2' fontWeight={500}>{field.value}</Typography>
              {field.meta && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                  {field.meta}
                </Typography>
              )}
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 3 }} />

        {/* Excluded short-circuit — minimal layout per mockup */}
        {presentation.isExcluded && presentation.infoBlock && (
          <InfoBlockAlert block={presentation.infoBlock} />
        )}

        {/* Haberes */}
        {!presentation.isExcluded && (
          <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Haberes</Typography>
            <Table size='small' sx={{ mb: 3 }}>
              <TableBody>
                {presentation.haberesRows.map(row => (
                  <ReceiptRow key={row.key} label={row.label} value={row.amount} indent={row.variant === 'indent'} />
                ))}
                <ReceiptRow label='Total bruto' value={presentation.grossTotal} bold />
              </TableBody>
            </Table>
          </>
        )}

        {/* Attendance — chile_dependent only */}
        {!presentation.isExcluded && presentation.attendanceRows.length > 0 && (
          <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Asistencia</Typography>
            <Table size='small' sx={{ mb: 3 }}>
              <TableBody>
                {presentation.attendanceRows.map(row => (
                  <ReceiptRow key={row.key} label={row.label} value={row.amount} />
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {/* Adjustments banner — bruto efectivo aplicado warning */}
        {presentation.adjustmentsBanner && <InfoBlockAlert block={presentation.adjustmentsBanner} />}

        {/* Deduction section — chile_dependent or honorarios */}
        {!presentation.isExcluded && presentation.deductionSection && (
          <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>{presentation.deductionSection.title}</Typography>
            <Table size='small' sx={{ mb: 3 }}>
              <TableBody>
                {presentation.deductionSection.rows.map(row => (
                  <ReceiptRow key={row.key} label={row.label} value={row.amount} indent={row.variant === 'indent'} />
                ))}
                <ReceiptRow
                  label={presentation.deductionSection.totalLabel}
                  value={presentation.deductionSection.totalAmount}
                  bold
                />
              </TableBody>
            </Table>
          </>
        )}

        {/* Info block — Boleta SII / Pago Deel / Régimen internacional (when not excluded) */}
        {!presentation.isExcluded && presentation.infoBlock && <InfoBlockAlert block={presentation.infoBlock} />}

        {/* Fixed deductions — descuentos pactados */}
        {presentation.fixedDeductionsSection && (
          <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>{presentation.fixedDeductionsSection.title}</Typography>
            <Table size='small' sx={{ mb: 2 }}>
              <TableBody>
                {presentation.fixedDeductionsSection.rows.map(row => (
                  <ReceiptRow key={row.key} label={row.label} value={row.amount} />
                ))}
                <ReceiptRow
                  label={presentation.fixedDeductionsSection.totalLabel}
                  value={presentation.fixedDeductionsSection.totalAmount}
                  bold
                />
              </TableBody>
            </Table>
          </>
        )}

        {/* Manual override block */}
        {presentation.manualOverrideBlock && <InfoBlockAlert block={presentation.manualOverrideBlock} />}

        {/* Hero — Líquido / Monto bruto registrado / Sin pago este período */}
        <Box
          sx={{
            bgcolor: presentation.hero.variant === 'degraded' ? 'text.disabled' : GH_COLORS.role.account.source,
            color: '#fff',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 2,
            mt: 2,
            opacity: presentation.hero.variant === 'degraded' ? 0.85 : 1
          }}
        >
          <Typography variant='subtitle1' fontWeight={700} color='inherit'>{presentation.hero.label}</Typography>
          <Typography
            variant='h6'
            fontWeight={700}
            color='inherit'
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {presentation.hero.amount}
          </Typography>
        </Box>

        {presentation.hero.footnote && (
          <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
            {presentation.hero.footnote}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default PayrollReceiptCard
