import 'server-only'

import { Document, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'

import { getPayrollEntries, getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const fmtCurrency = (value: number | null, currency: string): string => {
  if (value === null) return '—'

  return currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`
}

const fmtPercent = (value: number | null): string => {
  if (value === null) return '—'

  return `${value.toFixed(1)}%`
}

const fmtFactor = (value: number | null): string => {
  if (value === null) return '—'

  return `${(value * 100).toFixed(1)}%`
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 40,
    color: '#1a1a1a'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32'
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#2E7D32'
  },
  companyDetail: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#2E7D32'
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  metaLabel: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9
  },
  metaValue: {
    fontSize: 9
  },
  table: {
    marginTop: 8
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingVertical: 5,
    paddingHorizontal: 4
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0'
  },
  tableRowAlt: {
    backgroundColor: '#f5f5f5'
  },
  tableCell: {
    fontSize: 7
  },
  tableCellRight: {
    fontSize: 7,
    textAlign: 'right'
  },
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1.5,
    borderTopColor: '#2E7D32'
  },
  totalsCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#999999',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 6
  },
  receiptSection: {
    marginBottom: 14
  },
  receiptTable: {
    marginTop: 4
  },
  receiptRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0'
  },
  receiptLabel: {
    width: '55%',
    fontSize: 9
  },
  receiptValue: {
    width: '45%',
    fontSize: 9,
    textAlign: 'right'
  },
  receiptTotalRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1.5,
    borderTopColor: '#2E7D32'
  },
  receiptTotalLabel: {
    width: '55%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold'
  },
  receiptTotalValue: {
    width: '45%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right'
  }
})

// ─── Period Report PDF ────────────────────────────────────────────

const COL_WIDTHS = {
  name: '20%',
  regime: '8%',
  currency: '6%',
  base: '10%',
  bonus: '9%',
  gross: '10%',
  deductions: '10%',
  net: '10%'
}

const PeriodReportDocument = ({ period, entries }: { period: PayrollPeriod; entries: PayrollEntry[] }) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const generatedAt = new Date().toISOString().split('T')[0]

  const chileEntries = entries.filter(e => e.payRegime === 'chile')
  const intlEntries = entries.filter(e => e.payRegime === 'international')

  const totalGrossClp = chileEntries.reduce((s, e) => s + e.grossTotal, 0)
  const totalNetClp = chileEntries.reduce((s, e) => s + e.netTotal, 0)
  const totalDeductionsClp = chileEntries.reduce((s, e) => s + (e.chileTotalDeductions ?? 0), 0)
  const totalGrossUsd = intlEntries.reduce((s, e) => s + e.grossTotal, 0)
  const totalNetUsd = intlEntries.reduce((s, e) => s + e.netTotal, 0)

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>Greenhouse EO</Text>
            <Text style={styles.companyDetail}>Reporte de nómina</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, textAlign: 'right' as const }}>{`${monthName} ${period.year}`}</Text>
            <Text style={{ ...styles.companyDetail, textAlign: 'right' as const }}>{period.periodId}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={{ marginBottom: 12 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Estado:</Text>
            <Text style={styles.metaValue}>{period.status}</Text>
          </View>
          {period.ufValue != null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Valor UF:</Text>
              <Text style={styles.metaValue}>{`$${period.ufValue.toLocaleString('es-CL')}`}</Text>
            </View>
          )}
          {period.approvedAt && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Aprobado:</Text>
              <Text style={styles.metaValue}>{period.approvedAt}</Text>
            </View>
          )}
        </View>

        {/* Table */}
        <View style={styles.table}>
          <Text style={styles.subtitle}>{`Detalle — ${entries.length} miembros`}</Text>

          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.name }}>Nombre</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.regime }}>Régimen</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.currency }}>Mon.</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.base, textAlign: 'right' as const }}>Base</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.bonus, textAlign: 'right' as const }}>Bono OTD</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.bonus, textAlign: 'right' as const }}>Bono RpA</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.gross, textAlign: 'right' as const }}>Bruto</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.deductions, textAlign: 'right' as const }}>Descuentos</Text>
            <Text style={{ ...styles.tableHeaderCell, width: COL_WIDTHS.net, textAlign: 'right' as const }}>Neto</Text>
          </View>

          {entries.map((entry, i) => (
            <View key={entry.entryId} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={{ ...styles.tableCell, width: COL_WIDTHS.name }}>{entry.memberName}</Text>
              <Text style={{ ...styles.tableCell, width: COL_WIDTHS.regime }}>{entry.payRegime === 'chile' ? 'CL' : 'INT'}</Text>
              <Text style={{ ...styles.tableCell, width: COL_WIDTHS.currency }}>{entry.currency}</Text>
              <Text style={{ ...styles.tableCellRight, width: COL_WIDTHS.base }}>{fmtCurrency(entry.adjustedBaseSalary ?? entry.baseSalary, entry.currency)}</Text>
              <Text style={{ ...styles.tableCellRight, width: COL_WIDTHS.bonus }}>{fmtCurrency(entry.bonusOtdAmount, entry.currency)}</Text>
              <Text style={{ ...styles.tableCellRight, width: COL_WIDTHS.bonus }}>{fmtCurrency(entry.bonusRpaAmount, entry.currency)}</Text>
              <Text style={{ ...styles.tableCellRight, width: COL_WIDTHS.gross }}>{fmtCurrency(entry.grossTotal, entry.currency)}</Text>
              <Text style={{ ...styles.tableCellRight, width: COL_WIDTHS.deductions }}>{fmtCurrency(entry.chileTotalDeductions, entry.currency)}</Text>
              <Text style={{ ...styles.tableCellRight, width: COL_WIDTHS.net }}>{fmtCurrency(entry.netTotal, entry.currency)}</Text>
            </View>
          ))}

          {chileEntries.length > 0 && (
            <View style={styles.totalsRow}>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.name, textAlign: 'left' as const }}>Total Chile</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.regime }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.currency }}>CLP</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.base }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.gross }}>{fmtCurrency(totalGrossClp, 'CLP')}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.deductions }}>{fmtCurrency(totalDeductionsClp, 'CLP')}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.net }}>{fmtCurrency(totalNetClp, 'CLP')}</Text>
            </View>
          )}

          {intlEntries.length > 0 && (
            <View style={styles.totalsRow}>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.name, textAlign: 'left' as const }}>Total Internacional</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.regime }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.currency }}>USD</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.base }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.gross }}>{fmtCurrency(totalGrossUsd, 'USD')}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.deductions }}>{' '}</Text>
              <Text style={{ ...styles.totalsCell, width: COL_WIDTHS.net }}>{fmtCurrency(totalNetUsd, 'USD')}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{`Greenhouse EO — Nómina ${monthName} ${period.year}`}</Text>
          <Text>{`Generado: ${generatedAt}`}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ─── Individual Receipt PDF ───────────────────────────────────────

const ReceiptDocument = ({ entry, period }: { entry: PayrollEntry; period: PayrollPeriod }) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const currency = entry.currency
  const isChile = entry.payRegime === 'chile'
  const generatedAt = new Date().toISOString().split('T')[0]

  const entryWithAllowances = entry as PayrollEntry & {
    chileColacionAmount?: number | null
    chileMovilizacionAmount?: number | null
    chileColacion?: number | null
    chileMovilizacion?: number | null
    colacionAmount?: number | null
    movilizacionAmount?: number | null
    totalHaberesNoImponibles?: number | null
  }

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

  const hasAttendanceAdjustment = entry.adjustedBaseSalary != null && entry.adjustedBaseSalary !== entry.baseSalary
  const effectiveFixedBonusAmount = entry.adjustedFixedBonusAmount ?? entry.fixedBonusAmount

  const haberesRows: [string, string][] = [
    ['Sueldo base', fmtCurrency(entry.baseSalary, currency)]
  ]

  if (hasAttendanceAdjustment) {
    haberesRows.push(
      ['Sueldo base ajustado (por inasistencia)', fmtCurrency(entry.adjustedBaseSalary, currency)]
    )
  }

  haberesRows.push(
    ['Asignación teletrabajo', fmtCurrency(entry.remoteAllowance, currency)]
  )

  if (hasAttendanceAdjustment && entry.adjustedRemoteAllowance != null) {
    haberesRows.push(
      ['Teletrabajo ajustado (por inasistencia)', fmtCurrency(entry.adjustedRemoteAllowance, currency)]
    )
  }

  if (entry.fixedBonusAmount > 0) {
    haberesRows.push([
      entry.fixedBonusLabel ? `Bono fijo (${entry.fixedBonusLabel})` : 'Bono fijo',
      fmtCurrency(entry.fixedBonusAmount, currency)
    ])
  }

  if (entry.adjustedFixedBonusAmount != null && entry.adjustedFixedBonusAmount !== entry.fixedBonusAmount) {
    haberesRows.push([
      entry.fixedBonusLabel
        ? `Bono fijo ajustado (${entry.fixedBonusLabel})`
        : 'Bono fijo ajustado (por inasistencia)',
      fmtCurrency(effectiveFixedBonusAmount, currency)
    ])
  }

  if (colacion > 0) {
    haberesRows.push(['Colación', fmtCurrency(colacion, currency)])
  }

  if (movilizacion > 0) {
    haberesRows.push(['Movilización', fmtCurrency(movilizacion, currency)])
  }

  haberesRows.push(
    [`Bono OTD (${fmtPercent(entry.kpiOtdPercent)} → factor ${fmtFactor(entry.bonusOtdProrationFactor)})`, fmtCurrency(entry.bonusOtdAmount, currency)],
    [`Bono RpA (${entry.kpiRpaAvg != null ? entry.kpiRpaAvg.toFixed(1) : '—'} → factor ${fmtFactor(entry.bonusRpaProrationFactor)})`, fmtCurrency(entry.bonusRpaAmount, currency)]
  )

  if (entry.bonusOtherAmount > 0) {
    haberesRows.push(
      [`Bono adicional${entry.bonusOtherDescription ? ` (${entry.bonusOtherDescription})` : ''}`, fmtCurrency(entry.bonusOtherAmount, currency)]
    )
  }

  const attendanceRows: [string, string][] = entry.workingDaysInPeriod != null ? [
    ['Días hábiles en período', String(entry.workingDaysInPeriod)],
    ['Días presentes', String(entry.daysPresent ?? '—')],
    ['Días ausentes', String(entry.daysAbsent ?? 0)],
    ['Días licencia', String(entry.daysOnLeave ?? 0)],
    ['Días licencia no remunerada', String(entry.daysOnUnpaidLeave ?? 0)]
  ] : []

  const deductionRows: [string, string][] = []

  if (isChile) {
    deductionRows.push([
      `AFP ${entry.chileAfpName ?? ''} (${entry.chileAfpRate != null ? (entry.chileAfpRate * 100).toFixed(2) : '—'}%)`,
      fmtCurrency(entry.chileAfpAmount, currency)
    ])

    if (entry.chileAfpCotizacionAmount != null || entry.chileAfpComisionAmount != null) {
      deductionRows.push(
        ['↳ Cotización', fmtCurrency(entry.chileAfpCotizacionAmount, currency)],
        ['↳ Comisión', fmtCurrency(entry.chileAfpComisionAmount, currency)]
      )
    }

    deductionRows.push(
      [`Salud (${entry.chileHealthSystem ?? '—'})`, fmtCurrency(entry.chileHealthAmount, currency)],
      [`Seguro cesantía (${entry.chileUnemploymentRate != null ? (entry.chileUnemploymentRate * 100).toFixed(1) : '—'}%)`, fmtCurrency(entry.chileUnemploymentAmount, currency)],
      ['Impuesto único', fmtCurrency(entry.chileTaxAmount, currency)]
    )
  }

  if (isChile && entry.chileApvAmount != null && entry.chileApvAmount > 0) {
    deductionRows.push(['APV', fmtCurrency(entry.chileApvAmount, currency)])
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>Greenhouse EO</Text>
            <Text style={styles.companyDetail}>Recibo de remuneraciones</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, textAlign: 'right' as const }}>{`${monthName} ${period.year}`}</Text>
            <Text style={{ ...styles.companyDetail, textAlign: 'right' as const }}>{period.periodId}</Text>
          </View>
        </View>

        {/* Employee info */}
        <View style={styles.receiptSection}>
          <Text style={styles.subtitle}>Datos del colaborador</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Nombre:</Text>
            <Text style={styles.metaValue}>{entry.memberName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Email:</Text>
            <Text style={styles.metaValue}>{entry.memberEmail}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Régimen:</Text>
            <Text style={styles.metaValue}>{isChile ? 'Chile' : 'Internacional'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Moneda:</Text>
            <Text style={styles.metaValue}>{currency}</Text>
          </View>
        </View>

        {/* Haberes */}
        <View style={styles.receiptSection}>
          <Text style={styles.subtitle}>Haberes</Text>
          <View style={styles.receiptTable}>
            {haberesRows.map(([label, value], i) => (
              <View key={`h-${i}`} style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>{label}</Text>
                <Text style={styles.receiptValue}>{value}</Text>
              </View>
            ))}
            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>Total bruto</Text>
              <Text style={styles.receiptTotalValue}>{fmtCurrency(entry.grossTotal, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Attendance */}
        {attendanceRows.length > 0 && (
          <View style={styles.receiptSection}>
            <Text style={styles.subtitle}>Asistencia</Text>
            <View style={styles.receiptTable}>
              {attendanceRows.map(([label, value], i) => (
                <View key={`a-${i}`} style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{label}</Text>
                  <Text style={styles.receiptValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Deductions (Chile only) */}
        {deductionRows.length > 0 && (
          <View style={styles.receiptSection}>
            <Text style={styles.subtitle}>Descuentos legales</Text>
            <View style={styles.receiptTable}>
              {deductionRows.map(([label, value], i) => (
                <View key={`d-${i}`} style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{label}</Text>
                  <Text style={styles.receiptValue}>{value}</Text>
                </View>
              ))}
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Total descuentos</Text>
                <Text style={styles.receiptTotalValue}>{fmtCurrency(entry.chileTotalDeductions, currency)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Net total */}
        <View style={{ ...styles.receiptSection, marginTop: 8 }}>
          <View style={{ ...styles.receiptTotalRow, backgroundColor: '#2E7D32', paddingVertical: 10 }}>
            <Text style={{ ...styles.receiptTotalLabel, color: '#ffffff', fontSize: 12 }}>Líquido a pagar</Text>
            <Text style={{ ...styles.receiptTotalValue, color: '#ffffff', fontSize: 12 }}>{fmtCurrency(entry.netTotal, currency)}</Text>
          </View>
          {entry.manualOverride && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 7, color: '#666666' }}>
                {`* Monto neto ajustado manualmente${entry.manualOverrideNote ? `: ${entry.manualOverrideNote}` : ''}`}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{`Greenhouse EO — Recibo ${monthName} ${period.year}`}</Text>
          <Text>{`Generado: ${generatedAt}`}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ─── Public API ──────────────────────────────────────────────────

export const generatePayrollPeriodPdf = async (periodId: string): Promise<Buffer> => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate reports.', 409)
  }

  const entries = await getPayrollEntries(periodId)
  const stream = await renderToStream(<PeriodReportDocument period={period} entries={entries} />)

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

export const generatePayrollReceiptPdf = async (entryId: string): Promise<Buffer> => {
  const entry = await getPayrollEntryById(entryId)

  if (!entry) {
    throw new PayrollValidationError('Payroll entry not found.', 404)
  }

  const period = await getPayrollPeriod(entry.periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate receipts.', 409)
  }

  const stream = await renderToStream(<ReceiptDocument entry={entry} period={period} />)

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}
