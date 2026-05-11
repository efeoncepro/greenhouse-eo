import 'server-only'

import { createHash } from 'node:crypto'

import { createElement } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import { GH_FINIQUITO } from '@/lib/copy/finiquito'
import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'
import { formatCurrency as formatLocaleCurrency, formatDate as formatLocaleDate, formatDateTime as formatLocaleDateTime, formatNumber } from '@/lib/format'
import { formatClpInWords } from '@/lib/payroll/number-to-spanish-words'

import type { FinalSettlementDocumentSnapshot } from './document-types'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 32,
    paddingBottom: 34,
    paddingLeft: 32,
    fontFamily: 'Geist',
    fontSize: 8,
    color: '#1A1A2E',
    lineHeight: 1.38,
    backgroundColor: '#FFFFFF'
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottom: '1.4 solid #D7E2EA',
    marginBottom: 13
  },
  headerLeft: {
    width: 300
  },
  logo: {
    width: 140,
    height: 30,
    objectFit: 'contain',
    marginBottom: 7
  },
  legalBlock: {
    color: '#425466',
    fontSize: 7.6,
    lineHeight: 1.42
  },
  legalName: {
    fontFamily: 'Geist Bold',
    color: '#102A43',
    fontSize: 8.3
  },
  docMeta: {
    width: 214,
    textAlign: 'right'
  },
  statusPill: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#EAF7EF',
    color: '#137A45',
    border: '1 solid #B8E6C9',
    fontFamily: 'Geist Bold',
    fontSize: 7,
    marginBottom: 7
  },
  statusPillBlocked: {
    backgroundColor: '#FFF2F2',
    color: '#A32929',
    border: '1 solid #F1B8B8'
  },
  statusPillReview: {
    backgroundColor: '#FFF7E8',
    color: '#9A5A00',
    border: '1 solid #F3D19B'
  },
  metaText: {
    color: '#667085',
    fontSize: 7.2,
    lineHeight: 1.45
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  titleCopy: {
    width: 335
  },
  title: {
    fontFamily: 'Poppins Bold',
    fontSize: 18,
    lineHeight: 1.18,
    marginBottom: 9,
    color: '#102A43'
  },
  subtitle: {
    color: '#526173',
    fontSize: 8.1,
    lineHeight: 1.45
  },
  netBox: {
    width: 150,
    padding: 12,
    border: '1.4 solid #0375DB',
    backgroundColor: '#F5FBFF',
    borderRadius: 8
  },
  netLabel: {
    color: '#526173',
    fontSize: 7,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  netAmount: {
    fontFamily: 'Poppins Bold',
    color: '#023C70',
    fontSize: 16,
    lineHeight: 1.15,
    marginBottom: 8
  },
  netHelp: {
    color: '#667085',
    fontSize: 7,
    lineHeight: 1.35
  },
  section: {
    marginBottom: 8
  },
  sectionTitle: {
    fontFamily: 'Poppins',
    fontSize: 11,
    marginBottom: 7,
    color: '#102A43'
  },
  partyGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTop: '1 solid #E3E8EF',
    borderLeft: '1 solid #E3E8EF'
  },
  factsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTop: '1 solid #E3E8EF',
    borderLeft: '1 solid #E3E8EF'
  },
  field: {
    width: '50%',
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRight: '1 solid #E3E8EF',
    borderBottom: '1 solid #E3E8EF'
  },
  label: {
    color: '#667085',
    fontSize: 7,
    textTransform: 'uppercase',
    marginBottom: 3
  },
  value: {
    fontFamily: 'Geist Medium',
    fontSize: 8.7,
    color: '#233142'
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1.2 solid #C9D6E2',
    borderTop: '1.2 solid #C9D6E2',
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 7,
    color: '#425466',
    fontFamily: 'Geist Bold'
  },
  tableRow: {
    borderBottom: '1 solid #E3E8EF',
    paddingVertical: 5,
    paddingHorizontal: 7
  },
  tableRowMain: {
    display: 'flex',
    flexDirection: 'row'
  },
  conceptCell: {
    width: 150,
    paddingRight: 8
  },
  treatmentCell: {
    width: 135,
    paddingRight: 8
  },
  evidenceCell: {
    width: 168,
    paddingRight: 8
  },
  amountCell: {
    width: 72,
    textAlign: 'right',
    fontFamily: 'Geist Medium'
  },
  conceptLabel: {
    fontFamily: 'Geist Bold',
    fontSize: 8.3,
    marginBottom: 3
  },
  evidence: {
    color: '#667085',
    fontSize: 7
  },
  calculationText: {
    color: '#526173',
    fontSize: 6.6,
    lineHeight: 1.32
  },
  tagLine: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 999,
    marginRight: 4,
    marginBottom: 3,
    fontSize: 6.6,
    fontFamily: 'Geist Bold'
  },
  tagOk: {
    color: '#137A45',
    backgroundColor: '#EAF7EF',
    border: '1 solid #B8E6C9'
  },
  tagInfo: {
    color: '#035A9E',
    backgroundColor: '#EAF4FF',
    border: '1 solid #BBD9F5'
  },
  tagWarn: {
    color: '#9A5A00',
    backgroundColor: '#FFF7E8',
    border: '1 solid #F3D19B'
  },
  totals: {
    border: '1.2 solid #D7E2EA',
    borderRadius: 8,
    padding: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  totalItem: {
    width: '31%'
  },
  netPayable: {
    fontFamily: 'Poppins Bold',
    fontSize: 11,
    color: '#023C70'
  },
  warning: {
    padding: 8,
    border: '1 solid #F79009',
    backgroundColor: '#FFFBEA',
    marginBottom: 12
  },
  statement: {
    fontSize: 8,
    color: '#344054',
    lineHeight: 1.48
  },
  signatures: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 20
  },
  signatureLine: {
    width: '30%', // TASK-862 Slice D — Era 47% para 2 columnas; ahora 30% para 3 (empleador / trabajador / ministro de fe)
    borderTop: '1 solid #667085',
    paddingTop: 6,
    textAlign: 'center',
    marginRight: 12
  },
  // TASK-862 Slice D — Watermark layer (diagonal "PROYECTO" / "BLOQUEADO" / "RECHAZADO").
  watermarkLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  watermarkText: {
    fontFamily: 'Poppins Bold',
    fontSize: 96,
    letterSpacing: 8,
    textAlign: 'center',
    transform: 'rotate(-30deg)'
  },
  watermarkTextWarning: {
    color: 'rgba(247, 144, 9, 0.10)'
  },
  watermarkTextError: {
    color: 'rgba(187, 25, 84, 0.10)'
  },
  watermarkTextNeutral: {
    color: 'rgba(102, 112, 133, 0.08)'
  },
  // TASK-862 Slice D — Clausulas narrativas PRIMERO-QUINTO.
  clausesSection: {
    marginBottom: 12
  },
  clause: {
    fontSize: 8.4,
    color: '#344054',
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 8
  },
  clauseLabel: {
    fontFamily: 'Geist Bold',
    color: '#102A43'
  },
  // TASK-862 Slice D — Ley 21.389 banner (Alt A / Alt B).
  maintenanceBanner: {
    marginTop: 6,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EAF4FF',
    borderLeft: '3 solid #0375DB',
    borderRadius: 4,
    fontSize: 8.1,
    color: '#035A9E',
    lineHeight: 1.45
  },
  maintenanceBannerTitle: {
    fontFamily: 'Geist Bold',
    marginBottom: 2
  },
  // TASK-862 Slice D — Reserva de derechos block.
  reservaBlock: {
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    border: '1.2 dashed #C9D6E2',
    borderRadius: 6,
    backgroundColor: '#FAFBFD'
  },
  reservaTitle: {
    fontFamily: 'Geist Bold',
    fontSize: 8.4,
    color: '#344054',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6
  },
  reservaInstructions: {
    fontSize: 7.6,
    color: '#667085',
    lineHeight: 1.4,
    marginBottom: 8
  },
  reservaText: {
    fontFamily: 'Geist Medium',
    fontSize: 9,
    // fontStyle italic removed — Geist italic TTF not registered in V1; visual italic
    // would require additional font asset. V1.1 can add Geist-Italic.ttf if needed.
    color: '#1a3a6c',
    lineHeight: 1.5,
    paddingHorizontal: 4
  },
  reservaLines: {
    // Render blank lined area for handwritten reservation (visual mockup of pauta lines)
    height: 60,
    borderBottom: '1 solid #E3E8EF',
    marginTop: 4
  },
  // TASK-862 Slice D — Caja huella dactilar (40x40 mm).
  huellaBox: {
    width: 40,
    height: 40,
    border: '1 dashed #8896a8',
    borderRadius: 4,
    backgroundColor: '#FAFBFD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 'auto',
    paddingHorizontal: 2
  },
  huellaText: {
    fontSize: 6,
    color: '#8896a8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center'
  },
  // TASK-862 Slice D — Ministro de fe column.
  ministroEmpty: {
    color: '#8896a8',
    // fontStyle italic removed — V1.1 follow-up to add Geist-Italic.ttf
  },
  // TASK-862 Slice D — Greenhouse utility branding al footer.
  footerGhBrand: {
    fontFamily: 'Geist Medium',
    fontSize: 6.6,
    color: '#667085'
  },
  netWords: {
    fontSize: 7,
    // fontStyle italic removed — Geist italic TTF not registered in V1; visual italic
    // would require additional font asset. V1.1 can add Geist-Italic.ttf if needed.
    color: '#667085',
    lineHeight: 1.4,
    marginTop: 4
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7,
    color: '#667085',
    borderTop: '1 solid #D7E2EA',
    paddingTop: 7,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
})

const logoPath = `${process.cwd()}/public/branding/logo-full.png`

const formatCurrency = (amount: number) => formatLocaleCurrency(amount, 'CLP')

const formatDecimal = (amount: number) =>
  formatNumber(amount, {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2
  })

const toFiniteNumber = (value: unknown): number | null => {
  const numericValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN

  return Number.isFinite(numericValue) ? numericValue : null
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Pendiente'

  const date = new Date(value)

  if (Number.isNaN(date.getTime()) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  return formatLocaleDate(value, {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatDateTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return formatLocaleDateTime(value, {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const shortHash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 8)

// TASK-862 Slice D — Format YYYY-MM-DD into "DD de mes de YYYY" canonical es-CL para
// clausulas narrativas legales. Fallback al valor crudo si no parsea.
const ES_CL_MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const formatDateLongSpanish = (value: string | null | undefined): string => {
  if (!value) return 'fecha pendiente'

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)

  if (!match) return value

  const [, year, monthStr, day] = match
  const monthIndex = Number(monthStr) - 1

  if (monthIndex < 0 || monthIndex > 11) return value

  return `${Number(day)} de ${ES_CL_MONTH_LABELS[monthIndex]} de ${year}`
}

// TASK-862 Slice D — Watermark resolution segun documentStatus (matriz canonica
// definida en GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC pinada en mockup vinculante).
//   rendered / in_review / approved → "PROYECTO" warning tonal (interno HR)
//   issued → CLEAN (este es el PDF que el trabajador imprime y lleva al notario)
//   signed_or_ratified → CLEAN (post-ratificacion)
//   rejected → "RECHAZADO" error tonal (terminal adverso)
//   voided → "ANULADO" error tonal
//   superseded → "REEMPLAZADO" neutral tonal
const resolveWatermark = (snapshot: FinalSettlementDocumentSnapshot): { text: string; severity: 'warning' | 'error' | 'neutral' } | null => {
  // documentStatus not in snapshot.finalSettlement; we infer from documentReadiness +
  // presence of ratification field. The most authoritative signal is ratification
  // (signed_or_ratified) → no watermark; otherwise readiness.status=blocked → "BLOQUEADO"
  // else if no ratification → "PROYECTO" for internal review states.
  if (snapshot.ratification) return null

  const readinessStatus = snapshot.documentReadiness?.status ?? (snapshot.readiness.hasBlockers ? 'blocked' : 'ready')

  if (readinessStatus === 'blocked') {
    return { text: GH_FINIQUITO.resignation.watermark.proyectoBlocked, severity: 'error' }
  }

  // ready / needs_review pre-ratification: internal HR draft
  return { text: GH_FINIQUITO.resignation.watermark.proyecto, severity: 'warning' }
}

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value == null || value === '' ? 'Pendiente' : String(value)}</Text>
  </View>
)

const legalTreatmentLabel: Record<string, string> = {
  remuneration: 'Remuneración',
  legal_indemnity: 'Compensación legal',
  authorized_deduction: 'Descuento autorizado',
  informational: 'Informativo'
}

const taxTreatmentLabel: Record<string, string> = {
  taxable_monthly: 'Tributable',
  non_income: 'No tributable',
  not_applicable: 'No aplica',
  needs_review: 'Revisar'
}

const previsionalTreatmentLabel: Record<string, string> = {
  contribution_base: 'Imponible',
  not_contribution_base: 'No imponible',
  not_applicable: 'No aplica',
  needs_review: 'Revisar'
}

const readinessLabel: Record<string, string> = {
  ready: 'Listo para firma',
  needs_review: 'Revisión interna requerida',
  blocked: 'Bloqueado para firma'
}

const readinessPillStyle = (status: keyof typeof readinessLabel) => {
  if (status === 'blocked') return [styles.statusPill, styles.statusPillBlocked]
  if (status === 'needs_review') return [styles.statusPill, styles.statusPillReview]

  return styles.statusPill
}

const separationTypeLabel: Record<string, string> = {
  resignation: 'Renuncia voluntaria'
}

const payrollViaLabel: Record<string, string> = {
  internal: 'nómina interna'
}

const readableEvidence = (evidence: Record<string, unknown> | undefined) => {
  if (!evidence) return 'Respaldo pendiente'

  if (evidence.coveredByMonthlyPayroll === true) {
    return 'Remuneración mensual conciliada'
  }

  const source = typeof evidence.source === 'string' ? evidence.source : null
  const label = typeof evidence.label === 'string' ? evidence.label : null
  const reason = typeof evidence.reason === 'string' ? evidence.reason : null

  if (label) return label
  if (reason) return reason

  return source ? 'Respaldo documentado' : 'Respaldo estructurado'
}

const lineEvidenceLabel = (line: FinalSettlementDocumentSnapshot['breakdown'][number]) => {
  if (line.componentCode === 'proportional_vacation') {
    return 'Saldo de vacaciones + regla DT art. 73'
  }

  if (line.componentCode === 'pending_salary' || line.componentCode === 'pending_fixed_allowances') {
    return readableEvidence(line.sourceRef?.payrollOverlapLedger as Record<string, unknown> | undefined)
  }

  return readableEvidence(line.evidence)
}

const lineBasisLabel = (line: FinalSettlementDocumentSnapshot['breakdown'][number]) => {
  const labelByComponent: Record<string, string> = {
    pending_salary: 'Remuneración pendiente de pago',
    pending_fixed_allowances: 'Asignaciones pendientes',
    monthly_gratification_due: 'Gratificación pendiente',
    proportional_vacation: 'Compensación por feriado proporcional',
    used_or_advanced_vacation_adjustment: 'Ajuste de feriado usado o anticipado',
    statutory_deductions: 'Descuento legal o retención',
    authorized_deduction: 'Descuento autorizado con respaldo',
    payroll_overlap_adjustment: 'Ajuste para evitar duplicidad de pago'
  }

  return labelByComponent[line.componentCode] ?? 'Concepto respaldado por cálculo versionado'
}

const lineTreatmentTags = (line: FinalSettlementDocumentSnapshot['breakdown'][number]) => {
  const legal = legalTreatmentLabel[line.legalTreatment ?? ''] ?? line.legalTreatment
  const tax = taxTreatmentLabel[line.taxTreatment ?? ''] ?? line.taxTreatment
  const previsional = previsionalTreatmentLabel[line.previsionalTreatment ?? ''] ?? line.previsionalTreatment

  return [legal, tax, previsional].filter((value): value is string => Boolean(value))
}

const lineCalculationDetails = (line: FinalSettlementDocumentSnapshot['breakdown'][number]) => {
  if (line.componentCode === 'proportional_vacation') {
    const businessVacationDays = toFiniteNumber(line.basis.businessVacationDays)
    const compensatedCalendarDays = toFiniteNumber(line.basis.compensatedCalendarDays)
    const dailyVacationBase = toFiniteNumber(line.basis.dailyVacationBase)
    const details: string[] = []

    if (businessVacationDays != null || compensatedCalendarDays != null) {
      const days = [
        businessVacationDays != null ? `días hábiles a indemnizar ${formatDecimal(businessVacationDays)}` : null,
        compensatedCalendarDays != null ? `días corridos compensados ${formatDecimal(compensatedCalendarDays)}` : null
      ].filter((value): value is string => Boolean(value))

      details.push(`Base de cálculo: ${days.join(' · ')}`)
    }

    if (compensatedCalendarDays != null && dailyVacationBase != null) {
      details.push(`Cálculo: ${formatDecimal(compensatedCalendarDays)} x base diaria ${formatCurrency(dailyVacationBase)} = ${formatCurrency(line.amount)}`)
    } else if (dailyVacationBase != null) {
      details.push(`Base diaria: ${formatCurrency(dailyVacationBase)}`)
    }

    details.push('Fuente: saldo de vacaciones registrado y regla DT de feriado proporcional.')

    return details
  }

  if (line.componentCode === 'pending_salary') {
    const payableDays = toFiniteNumber(line.basis.payableDays)
    const daysInMonth = toFiniteNumber(line.basis.daysInMonth)
    const monthlyBaseSalary = toFiniteNumber(line.basis.monthlyBaseSalary)
    const details: string[] = []

    if (payableDays != null && daysInMonth != null) {
      details.push(`Días remunerados pendientes: ${formatDecimal(payableDays)} de ${formatDecimal(daysInMonth)}`)
    }

    if (monthlyBaseSalary != null) {
      details.push(`Base mensual: ${formatCurrency(monthlyBaseSalary)}`)
    }

    return details
  }

  if (line.componentCode === 'statutory_deductions') {
    const deductionLabels: Array<[string, unknown]> = [
      ['AFP', line.basis.afp],
      ['Salud', line.basis.health],
      ['Cesantía', line.basis.unemployment],
      ['Impuesto único', line.basis.tax],
      ['APV', line.basis.apv]
    ]

    const populatedDeductions = deductionLabels
      .map(([label, value]) => [label, toFiniteNumber(value)] as const)
      .filter(([, value]) => value != null && value > 0)
      .map(([label, value]) => `${label}: ${formatCurrency(value ?? 0)}`)

    return populatedDeductions.length > 0
      ? populatedDeductions
      : ['Sin descuentos legales adicionales en esta propuesta.']
  }

  return []
}

const FinalSettlementPdfDocument = ({ snapshot }: { snapshot: FinalSettlementDocumentSnapshot }) => {
  const documentReadiness = snapshot.documentReadiness ?? {
    status: snapshot.readiness.hasBlockers ? 'blocked' : 'ready',
    hasBlockers: snapshot.readiness.hasBlockers,
    checks: snapshot.readiness.checks.filter(check => check.status === 'blocked')
  }

  const warnings = documentReadiness.checks.filter(check => check.status !== 'passed')
  const readinessStatus = documentReadiness.status
  const collaboratorName = snapshot.collaborator.legalName || snapshot.collaborator.displayName || snapshot.finalSettlement.memberId
  const fingerprint = shortHash(snapshot)
  const documentNumber = `GH-FIN-${new Date(snapshot.generatedAt).getFullYear()}-${snapshot.finalSettlement.finalSettlementId.slice(0, 8)}`
  const regime = `${snapshot.finalSettlement.payRegimeSnapshot === 'chile' ? 'Chile dependiente' : snapshot.finalSettlement.payRegimeSnapshot} · ${payrollViaLabel[snapshot.finalSettlement.payrollViaSnapshot] ?? snapshot.finalSettlement.payrollViaSnapshot}`

  const netHelp = snapshot.finalSettlement.netPayable < 0
    ? 'Monto negativo: requiere regularización antes de firma.'
    : snapshot.finalSettlement.deductionTotal > 0
      ? 'Incluye descuentos o retenciones detallados abajo.'
      : null

  // TASK-862 Slice D — Watermark canónico segun documentStatus inferido.
  const watermark = resolveWatermark(snapshot)

  const watermarkSeverityStyle = watermark
    ? watermark.severity === 'error'
      ? styles.watermarkTextError
      : watermark.severity === 'neutral'
        ? styles.watermarkTextNeutral
        : styles.watermarkTextWarning
    : null

  // TASK-862 Slice D — Monto en letras para clausula segunda + netHelp del net-box.
  const netInWords = snapshot.finalSettlement.netPayable >= 0
    ? formatClpInWords(snapshot.finalSettlement.netPayable)
    : null

  // TASK-862 Slice D — Worker address (TASK-784) para Partes grid.
  const workerAddressDisplay = snapshot.collaborator.addressPresentation
    || [snapshot.collaborator.addressLine1, snapshot.collaborator.city, snapshot.collaborator.region]
      .filter(Boolean)
      .join(', ')
    || null

  // TASK-862 Slice D — Logo del empleador (Slice C). Fallback a Greenhouse hardcoded
  // cuando snapshot.employer.logoAssetId es null. TASK V1.1 reemplaza esto por lectura
  // real del asset binario via /api/assets/private (necesita Vercel function adapter).
  const headerLogoSrc = logoPath

  // TASK-862 Slice D — Clausulas narrativas params canonicos (GH_FINIQUITO).
  const hireDateLong = formatDateLongSpanish(snapshot.finalSettlement.hireDateSnapshot)
  const lastWorkingDayLong = formatDateLongSpanish(snapshot.finalSettlement.lastWorkingDay)
  // Resignation letter ratification date: si tenemos el asset, usamos createdAt-like
  // fallback al lastWorkingDay (no tenemos columna dedicada en V1; el upload del asset
  // tiene timestamp pero el render del PDF no la lee hoy).
  const resignationNoticeRatifiedLong = formatDateLongSpanish(snapshot.finalSettlement.lastWorkingDay)
  const employerLegalName = snapshot.employer.legalName
  const workerTaxIdDisplay = snapshot.collaborator.taxId ?? 'pendiente'
  const netPayableFormatted = formatCurrency(snapshot.finalSettlement.netPayable).replace(/^\$\s*/, '')

  return (
    <Document
      title={`Finiquito ${collaboratorName}`}
      author='Greenhouse'
    >
      <Page size='LETTER' style={styles.page}>
        {/* TASK-862 Slice D — Watermark layer (z-index 0, no afecta layout) */}
        {watermark && watermarkSeverityStyle ? (
          <View style={styles.watermarkLayer} fixed>
            <Text style={[styles.watermarkText, watermarkSeverityStyle]}>{watermark.text}</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={headerLogoSrc} style={styles.logo} />
            <Text style={styles.legalName}>{snapshot.employer.legalName}</Text>
            <Text style={styles.legalBlock}>
              RUT {snapshot.employer.taxId ?? 'Pendiente'}{'\n'}
              {snapshot.employer.legalAddress ?? 'Domicilio legal pendiente'}
            </Text>
          </View>
          <View style={styles.docMeta}>
            <Text style={readinessPillStyle(readinessStatus)}>{readinessLabel[readinessStatus]}</Text>
            <Text style={styles.metaText}>Documento {documentNumber}</Text>
            <Text style={styles.metaText}>Snapshot fs-v{snapshot.finalSettlement.settlementVersion} · Hash {fingerprint}</Text>
            <Text style={styles.metaText}>Generado {formatDateTime(snapshot.generatedAt)}</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>Finiquito de contrato de trabajo</Text>
            <Text style={styles.subtitle}>
              {snapshot.ratification
                ? GH_FINIQUITO.resignation.subtitle.ratified(formatDate(snapshot.ratification.ratifiedAt))
                : GH_FINIQUITO.resignation.subtitle.draft}
            </Text>
          </View>
          <View style={styles.netBox}>
            <Text style={styles.netLabel}>
              {snapshot.ratification
                ? GH_FINIQUITO.resignation.netBoxLabels.ratifiedTitle
                : GH_FINIQUITO.resignation.netBoxLabels.drafTitle}
            </Text>
            <Text style={styles.netAmount}>{formatCurrency(snapshot.finalSettlement.netPayable)}</Text>
            {netInWords ? <Text style={styles.netWords}>{netInWords}</Text> : null}
            {netHelp ? <Text style={styles.netHelp}>{netHelp}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{GH_FINIQUITO.resignation.partiesLabels.sectionTitle}</Text>
          <View style={styles.partyGrid}>
            <Field label={GH_FINIQUITO.resignation.partiesLabels.employer} value={snapshot.employer.legalName} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.worker} value={snapshot.collaborator.legalName || snapshot.collaborator.displayName} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.employerTaxId} value={snapshot.employer.taxId} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.workerTaxId} value={snapshot.collaborator.taxId} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.employerAddress} value={snapshot.employer.legalAddress} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.workerJobTitle} value={snapshot.collaborator.jobTitle} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.workerAddress} value={workerAddressDisplay} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relación y causal</Text>
          <View style={styles.factsGrid}>
            <Field label='Fecha ingreso' value={formatDate(snapshot.finalSettlement.hireDateSnapshot)} />
            <Field label='Último día trabajado' value={formatDate(snapshot.finalSettlement.lastWorkingDay)} />
            <Field label='Fecha término' value={formatDate(snapshot.finalSettlement.effectiveDate)} />
            <Field label='Causal' value={separationTypeLabel[snapshot.finalSettlement.separationType] ?? snapshot.finalSettlement.separationType} />
            <Field label='Régimen' value={regime} />
            <Field label='Respaldo de remuneración mensual' value={readableEvidence(snapshot.sourceSnapshot.payrollOverlapLedger)} />
          </View>
        </View>

        {/* TASK-862 Slice D — Clausulas narrativas PRIMERO-QUINTO (GH_FINIQUITO copy canonico). */}
        <View style={styles.clausesSection}>
          <Text style={styles.sectionTitle}>{GH_FINIQUITO.resignation.clausesSectionTitle}</Text>

          <Text style={styles.clause}>
            {GH_FINIQUITO.resignation.clauses.primero({
              workerName: collaboratorName,
              workerTaxId: workerTaxIdDisplay,
              employerLegalName,
              hireDate: hireDateLong,
              lastWorkingDay: lastWorkingDayLong,
              resignationNoticeRatifiedAt: resignationNoticeRatifiedLong
            })}
          </Text>

          <Text style={styles.clause}>
            {GH_FINIQUITO.resignation.clauses.segundo({
              workerName: collaboratorName,
              workerTaxId: workerTaxIdDisplay,
              employerLegalName,
              hireDate: hireDateLong,
              lastWorkingDay: lastWorkingDayLong,
              resignationNoticeRatifiedAt: resignationNoticeRatifiedLong,
              netPayableFormatted,
              netPayableInWords: netInWords ?? formatClpInWords(0),
              paymentMethod: 'transferencia bancaria'
            })}
          </Text>

          <Text style={styles.clause}>
            {GH_FINIQUITO.resignation.clauses.tercero({
              workerName: collaboratorName,
              workerTaxId: workerTaxIdDisplay,
              employerLegalName,
              hireDate: hireDateLong,
              lastWorkingDay: lastWorkingDayLong,
              resignationNoticeRatifiedAt: resignationNoticeRatifiedLong
            })}
          </Text>

          {/* CUARTO — Ley 21.389 banner (Alt A no_subject / Alt B subject). Renderizado
              SOLO cuando snapshot.maintenanceObligation existe (gating bloquea calculo
              cuando faltaba; defense-in-depth aqui). */}
          {snapshot.maintenanceObligation ? (
            <View style={styles.maintenanceBanner}>
              <Text style={styles.maintenanceBannerTitle}>
                {snapshot.maintenanceObligation.variant === 'not_subject'
                  ? 'CUARTO — Pensión de alimentos (Alt A: no afecto)'
                  : 'CUARTO — Pensión de alimentos (Alt B: afecto)'}
              </Text>
              <Text>
                {snapshot.maintenanceObligation.variant === 'not_subject'
                  ? GH_FINIQUITO.resignation.clauses.cuartoAltA({
                      variant: 'not_subject',
                      declaredByDisplayName: snapshot.maintenanceObligation.declaredByUserId,
                      declaredAt: formatDate(snapshot.maintenanceObligation.declaredAt)
                    })
                  : GH_FINIQUITO.resignation.clauses.cuartoAltB({
                      variant: 'subject',
                      amount: snapshot.maintenanceObligation.amount,
                      beneficiary: snapshot.maintenanceObligation.beneficiary,
                      declaredByDisplayName: snapshot.maintenanceObligation.declaredByUserId,
                      declaredAt: formatDate(snapshot.maintenanceObligation.declaredAt)
                    })}
              </Text>
            </View>
          ) : null}

          <Text style={styles.clause}>{GH_FINIQUITO.resignation.clauses.quintoPrefacio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de haberes, descuentos y retenciones</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.conceptCell}>Concepto</Text>
            <Text style={styles.treatmentCell}>Tratamiento</Text>
            <Text style={styles.evidenceCell}>Respaldo</Text>
            <Text style={styles.amountCell}>Monto</Text>
          </View>
          {snapshot.breakdown.map(line => {
            const calculationDetails = lineCalculationDetails(line)

            return (
              <View key={line.componentCode} style={styles.tableRow}>
                <View style={styles.tableRowMain}>
                  <View style={styles.conceptCell}>
                    <Text style={styles.conceptLabel}>{line.label}</Text>
                    <Text style={styles.evidence}>{lineBasisLabel(line)}</Text>
                  </View>
                  <View style={styles.treatmentCell}>
                    <View style={styles.tagLine}>
                      {lineTreatmentTags(line).map((tag, index) => (
                        <Text
                          key={`${line.componentCode}-${tag}`}
                          style={[
                            styles.tag,
                            index === 0 ? styles.tagInfo : tag.includes('Revisar') ? styles.tagWarn : styles.tagOk
                          ]}
                        >
                          {tag}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View style={styles.evidenceCell}>
                    <Text>{lineEvidenceLabel(line)}</Text>
                    {calculationDetails.map(detail => (
                      <Text key={`${line.componentCode}-${detail}`} style={styles.calculationText}>{detail}</Text>
                    ))}
                  </View>
                  <Text style={styles.amountCell}>{formatCurrency(line.amount)}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.totals}>
            <View style={styles.totalItem}>
              <Text style={styles.label}>Total haberes</Text>
              <Text style={styles.value}>{formatCurrency(snapshot.finalSettlement.grossTotal)}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.label}>Total descuentos / retenciones</Text>
              <Text style={styles.value}>{formatCurrency(snapshot.finalSettlement.deductionTotal)}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.label}>Líquido / pago neto</Text>
              <Text style={styles.netPayable}>{formatCurrency(snapshot.finalSettlement.netPayable)}</Text>
            </View>
          </View>
        </View>

        {warnings.length > 0 && (
          <View style={styles.warning}>
            <Text style={styles.sectionTitle}>Readiness de emisión</Text>
            {warnings.map(check => (
              <Text key={check.code}>- {check.message}</Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Constancia para firma y ratificación</Text>
          <Text style={styles.statement}>{GH_FINIQUITO.resignation.constancia}</Text>
        </View>

        {/* TASK-862 Slice D — Reserva de derechos block. Si el trabajador la consigno
            post-ratificacion, se muestra el texto manuscrito. Si no, espacio en blanco
            con instrucciones y pauta para escritura manual al firmar fisicamente. */}
        <View style={styles.reservaBlock}>
          <Text style={styles.reservaTitle}>
            {snapshot.ratification ? GH_FINIQUITO.resignation.reserva.consignedHeader : GH_FINIQUITO.resignation.reserva.title}
          </Text>
          {snapshot.ratification ? null : (
            <Text style={styles.reservaInstructions}>{GH_FINIQUITO.resignation.reserva.instructions}</Text>
          )}
          {/* TODO Slice E — workerReservationOfRights se pobla via /sign-or-ratify dialog;
              Slice D solo renderiza la presencia de reserva (notes) cuando viene en el
              snapshot via document.workerReservationNotes; el snapshot actual no lo
              expone (lives at document-level not snapshot-level). V1.1: extender snapshot
              para incluirlo. Por ahora dejamos el bloque blanco para escritura manual. */}
          <View style={styles.reservaLines} />
        </View>

        {/* TASK-862 Slice D — 3 columnas de firma: empleador, trabajador (+ huella), ministro de fe. */}
        <View style={styles.signatures}>
          <View style={{ width: '30%', marginRight: 12, textAlign: 'center' }}>
            <View style={styles.signatureLine} />
            <Text>{`Representante empleador\n${snapshot.employer.legalName}`}</Text>
          </View>

          <View style={{ width: '30%', marginRight: 12, textAlign: 'center' }}>
            <View style={styles.signatureLine} />
            <Text>{`Trabajador/a\n${collaboratorName}`}</Text>
            {/* Caja huella 40x40 mm para impresion de huella dactilar fisica. */}
            <View style={styles.huellaBox}>
              <Text style={styles.huellaText}>Huella{'\n'}dactilar</Text>
            </View>
          </View>

          <View style={{ width: '30%', textAlign: 'center' }}>
            <View style={styles.signatureLine} />
            {snapshot.ratification ? (
              <Text>
                {`Ministro de fe\n${snapshot.ratification.ministerName}\nRUT ${snapshot.ratification.ministerTaxId}\n${snapshot.ratification.notaria ?? ''}\n${formatDate(snapshot.ratification.ratifiedAt)}`}
              </Text>
            ) : (
              <Text>
                <Text>{'Ministro de fe\n'}</Text>
                <Text style={styles.ministroEmpty}>{GH_FINIQUITO.resignation.ministro.pending}</Text>
                <Text>{`\n${GH_FINIQUITO.resignation.ministro.pendingSubtitle}\n${GH_FINIQUITO.resignation.ministro.pendingFootnote}`}</Text>
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Documento confidencial · {snapshot.employer.legalName} · RUT {snapshot.employer.taxId ?? 'Pendiente'}</Text>
          <Text render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages} · Template ${snapshot.documentTemplateCode} · ${snapshot.documentTemplateVersion}`
          )} />
        </View>
        {/* TASK-862 Slice D — Greenhouse utility branding al footer (legal entity logo arriba). */}
        <View
          style={[styles.footer, { bottom: 6, borderTop: 'none', paddingTop: 0, justifyContent: 'center' }]}
          fixed
        >
          <Text style={styles.footerGhBrand}>Documento generado con Greenhouse · greenhouse.efeoncepro.com</Text>
        </View>
      </Page>
    </Document>
  )
}

export const renderFinalSettlementDocumentPdf = async (
  snapshot: FinalSettlementDocumentSnapshot
): Promise<Buffer> => {
  await ensurePdfFontsRegistered()

  const element = createElement(FinalSettlementPdfDocument, { snapshot })

  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])
}
