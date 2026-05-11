import 'server-only'

import { createHash } from 'node:crypto'

import { createElement } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import { GH_FINIQUITO } from '@/lib/copy/finiquito'
import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'
import { formatCurrency as formatLocaleCurrency, formatDate as formatLocaleDate, formatDateTime as formatLocaleDateTime, formatNumber } from '@/lib/format'
import { resolveLegalRepresentativeSignaturePath } from '@/lib/legal-signatures'
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
    // TASK-863 V1.5 — Title del acto jurídico DOMINA visualmente (B-5).
    // Antes: 18pt competía con KPI 16pt (ratio 1.125x, marketing pattern).
    // Ahora: 20pt vs 14pt KPI (ratio 1.43x) restablece jerarquía legal canónica
    // — notarios y abogados leen primero el acto, después el monto.
    fontFamily: 'Poppins Bold',
    fontSize: 20,
    lineHeight: 1.18,
    marginBottom: 10,
    color: '#102A43'
  },
  subtitle: {
    color: '#526173',
    fontSize: 8.1,
    lineHeight: 1.45
  },
  netBox: {
    // TASK-863 V1.5 — KPI card sutil: padding reducido + amount no-Bold.
    // Marketing pattern → legal pattern.
    width: 150,
    padding: 10,
    border: '1.2 solid #0375DB',
    backgroundColor: '#F5FBFF',
    borderRadius: 6
  },
  netLabel: {
    color: '#526173',
    fontSize: 6.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4
  },
  netAmount: {
    // TASK-863 V1.5 — Poppins SemiBold (no Bold) + 14pt (no 16pt) restablece
    // jerarquía: title >> kpi. Notarios leen primero el acto, después el monto.
    fontFamily: 'Poppins',
    color: '#023C70',
    fontSize: 14,
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
    // TASK-863 V1.2 — Poppins Bold para que los títulos de sección legales
    // (Partes, Relación, Cláusulas, Detalle, Constancia) tengan peso enterprise.
    // Antes: Poppins (SemiBold 600) que se veía débil en context formal.
    fontFamily: 'Poppins Bold',
    fontSize: 12,
    marginBottom: 8,
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
    flexWrap: 'wrap',
    gap: 4
  },
  tag: {
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderRadius: 999,
    marginRight: 6,
    marginBottom: 4,
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
    justifyContent: 'space-between',
    marginTop: 28,
    paddingHorizontal: 4
  },
  signatureColumn: {
    // TASK-863 V1.2 — 3 columnas equilibradas con space-between.
    // TASK-863 V1.4 — position relative para anclar signatureImageEmployer absolute.
    // TASK-863 V1.5 — paddingTop: 36 reserva ESPACIO SIMÉTRICO arriba de la línea
    // en las 3 columnas. Esto resuelve la asimetría visual reportada en audit:
    // empleador tiene firma renderizada en ese espacio, trabajador y ministro
    // dejan el espacio vacío para firma física presencial en notaría. Las 3
    // líneas caen al mismo Y absoluto → balance enterprise.
    width: '30%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 36
  },
  signatureRule: {
    // Linea explicita via View con height + backgroundColor. Antes: borderTop en el contenedor
    // del texto producia lineas visualmente cortas porque el text alignment center afectaba el render.
    width: '100%',
    height: 1.2,
    backgroundColor: '#475467',
    marginBottom: 8
  },
  // TASK-863 V1.5 — Imagen de firma del representante empleador, anclada en el
  // espacio reservado ARRIBA de la línea (paddingTop: 36 del signatureColumn).
  // top: 0 ancla al top del column (dentro del padding); height auto preserva
  // aspect ratio. La firma cruza la línea suavemente desde arriba sin tapar el
  // nombre debajo.
  signatureImageEmployer: {
    position: 'absolute',
    width: 105,
    top: 0,
    left: '50%',
    marginLeft: -52, // centrado horizontal (width/2)
    objectFit: 'contain'
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
  // TASK-863 V1.3 — Footer consolidado en UNA sola banda con 2 rows internos
  // (top: confidencial + paginación) (bottom: metadata técnica + brand).
  // Antes V1.2 había 2 <View fixed> con bottom distinto (18 + 14) que se
  // solapaban visualmente. Ahora 1 View con flexDirection='column'.
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 32,
    right: 32,
    color: '#667085',
    borderTop: '1 solid #D7E2EA',
    paddingTop: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 3
  },
  footerRowMain: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7
  },
  footerRowAudit: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8
  }
})

const logoPath = `${process.cwd()}/public/branding/logo-full.png`

// TASK-863 V1.4 — Resolver de firma del representante legal extraído al modulo
// canonico `@/lib/legal-signatures`. Reusable desde cualquier flow que renderice
// documentos firmados por el representante legal de una organizacion (finiquitos,
// contratos, addenda, cartas formales). NO duplicar la logica aqui — extender
// el modulo central.
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

// TASK-862 Slice D + TASK-863 V1.1 — Watermark resolution canonica.
// Matriz (canonica del spec):
//   rendered / in_review / approved → "PROYECTO" warning (interno HR)
//   issued → CLEAN (PDF para imprimir y llevar al notario)
//   signed_or_ratified → CLEAN (post-ratificacion)
//   blocked → "BLOQUEADO" error
//   rejected → "RECHAZADO" error
//   voided → "ANULADO" error
//   superseded → "REEMPLAZADO" neutral
//
// documentStatus es OPCIONAL para preservar backward-compat (callsites legacy
// que solo pasan snapshot caen al patron inferido por ratification + readiness).
type WatermarkInput = {
  snapshot: FinalSettlementDocumentSnapshot
  documentStatus?: string | null
}

const resolveWatermark = ({ snapshot, documentStatus }: WatermarkInput): { text: string; severity: 'warning' | 'error' | 'neutral' } | null => {
  if (documentStatus) {
    if (documentStatus === 'issued' || documentStatus === 'signed_or_ratified') {
      return null
    }

    if (documentStatus === 'blocked') {
      return { text: GH_FINIQUITO.resignation.watermark.proyectoBlocked, severity: 'error' }
    }

    if (documentStatus === 'rejected') {
      return { text: GH_FINIQUITO.resignation.watermark.rejected, severity: 'error' }
    }

    if (documentStatus === 'voided') {
      return { text: GH_FINIQUITO.resignation.watermark.voided, severity: 'error' }
    }

    if (documentStatus === 'superseded') {
      return { text: GH_FINIQUITO.resignation.watermark.superseded, severity: 'neutral' }
    }

    // rendered / in_review / approved → PROYECTO
    return { text: GH_FINIQUITO.resignation.watermark.proyecto, severity: 'warning' }
  }

  // Backward-compat fallback
  if (snapshot.ratification) return null

  const readinessStatus = snapshot.documentReadiness?.status ?? (snapshot.readiness.hasBlockers ? 'blocked' : 'ready')

  if (readinessStatus === 'blocked') {
    return { text: GH_FINIQUITO.resignation.watermark.proyectoBlocked, severity: 'error' }
  }

  return { text: GH_FINIQUITO.resignation.watermark.proyecto, severity: 'warning' }
}

// TASK-863 V1.2 — Helper render para clausulas narrativas: el prefijo legal
// (PRIMERO/SEGUNDO/TERCERO/QUINTO + ":") sale en Geist Bold para que la
// jerarquia visual de la clausula sea inmediata, como en un contrato chileno
// canonico. El resto del body queda en Geist regular.
const Clause = ({ text }: { text: string }) => {
  const colonIdx = text.indexOf(':')

  if (colonIdx === -1) {
    return <Text style={styles.clause}>{text}</Text>
  }

  return (
    <Text style={styles.clause}>
      <Text style={{ fontFamily: 'Geist Bold' }}>{text.slice(0, colonIdx + 1)}</Text>
      {text.slice(colonIdx + 1)}
    </Text>
  )
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

// TASK-863 V1.2 — badge del PDF refleja documentStatus canónico (no solo readiness).
// Antes el badge mostraba "Listo para firma" basado en readiness.status='ready', lo
// cual era engañoso porque el documento aun podia estar en `rendered` (borrador HR)
// con watermark PROYECTO. Ahora el badge muestra el estado del flow legal real.
const documentStatusLabel: Record<string, string> = {
  rendered: 'Borrador HR',
  in_review: 'En revisión interna',
  approved: 'Aprobado · pendiente de emisión',
  issued: 'Listo para firma',
  signed_or_ratified: 'Firmado / ratificado',
  blocked: 'Bloqueado para emitir',
  rejected: 'Rechazado por trabajador',
  voided: 'Anulado',
  superseded: 'Reemplazado'
}

const documentStatusPillStyle = (status: string) => {
  if (status === 'blocked' || status === 'rejected' || status === 'voided') {
    return [styles.statusPill, styles.statusPillBlocked]
  }

  if (status === 'rendered' || status === 'in_review' || status === 'superseded') {
    return [styles.statusPill, styles.statusPillReview]
  }

  // issued / signed_or_ratified / approved → success (verde)
  return styles.statusPill
}

// Backward-compat: readiness fallback cuando no hay documentStatus explicito.
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

const FinalSettlementPdfDocument = ({
  snapshot,
  documentStatus
}: {
  snapshot: FinalSettlementDocumentSnapshot
  documentStatus?: string | null
}) => {
  const documentReadiness = snapshot.documentReadiness ?? {
    status: snapshot.readiness.hasBlockers ? 'blocked' : 'ready',
    hasBlockers: snapshot.readiness.hasBlockers,
    checks: snapshot.readiness.checks.filter(check => check.status === 'blocked')
  }

  const warnings = documentReadiness.checks.filter(check => check.status !== 'passed')
  const readinessStatus = documentReadiness.status
  const collaboratorName = snapshot.collaborator.legalName || snapshot.collaborator.displayName || snapshot.finalSettlement.memberId
  const fingerprint = shortHash(snapshot)

  // TASK-863 V1.1 — Document ID estable per-settlement, derivado de hash determinístico.
  // Antes: slice(0, 8) del finalSettlementId truncaba slugs humanos ("final-settlement-valentina"
  // → "final-se"). Ahora: hash SHA-256 de los primeros 8 hex chars upper-case (siempre 8 chars,
  // legible, nunca corta palabras).
  const documentIdShort = createHash('sha256')
    .update(snapshot.finalSettlement.finalSettlementId)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase()

  const documentNumber = `GH-FIN-${new Date(snapshot.generatedAt).getFullYear()}-${documentIdShort}`
  const regime = `${snapshot.finalSettlement.payRegimeSnapshot === 'chile' ? 'Chile dependiente' : snapshot.finalSettlement.payRegimeSnapshot} · ${payrollViaLabel[snapshot.finalSettlement.payrollViaSnapshot] ?? snapshot.finalSettlement.payrollViaSnapshot}`

  const netHelp = snapshot.finalSettlement.netPayable < 0
    ? 'Monto negativo: requiere regularización antes de firma.'
    : snapshot.finalSettlement.deductionTotal > 0
      ? 'Incluye descuentos o retenciones detallados abajo.'
      : null

  // TASK-862 Slice D + TASK-863 V1.1 — Watermark canónico segun documentStatus.
  const watermark = resolveWatermark({ snapshot, documentStatus })

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

  // TASK-863 V1.3 — Firma digital del representante legal del empleador (PNG transparente).
  // Convención: snapshot.employer.legalRepresentativeSignaturePath = "efeonce-group-spa.png"
  // resuelve `src/assets/signatures/efeonce-group-spa.png`. Null cuando archivo no existe.
  const employerSignaturePath = resolveLegalRepresentativeSignaturePath(snapshot.employer.legalRepresentativeSignaturePath)

  // TASK-862 Slice D + TASK-863 V1.5 — Clausulas narrativas params canonicos.
  const hireDateLong = formatDateLongSpanish(snapshot.finalSettlement.hireDateSnapshot)
  const lastWorkingDayLong = formatDateLongSpanish(snapshot.finalSettlement.lastWorkingDay)
  // TASK-863 V1.5 — Separar 2 fechas legales de la carta de renuncia (B-1):
  // - signedAt: fecha en que el trabajador firma la carta (fallback al lastWorkingDay
  //   cuando no tenemos columna dedicada todavia en el snapshot V1).
  // - ratifiedAt: fecha de ratificacion ante ministro de fe (post-art. 177); null
  //   pre-ratificacion (snapshot.ratification es null) → la clausula PRIMERO omite
  //   el tramo de ratificacion.
  const resignationNoticeSignedLong = formatDateLongSpanish(snapshot.finalSettlement.lastWorkingDay)

  const resignationNoticeRatifiedLong = snapshot.ratification?.ratifiedAt
    ? formatDateLongSpanish(snapshot.ratification.ratifiedAt)
    : null

  // TASK-863 V1.5 — `isRatified` controla verbo performativo de clausula SEGUNDO (B-2):
  // pre-ratificacion → "declara que recibirá, al momento de la ratificación..."
  // post-ratificacion → "declara haber recibido en este acto..."
  const isRatified = Boolean(snapshot.ratification)
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

        {/* TASK-863 V1.1 — Header simplificado: logo + status pill. La identidad legal completa del
            empleador vive solo en "Partes comparecientes". Metadata técnica (documentNumber, hash,
            timestamp) baja al footer auditoría al final del documento. */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={headerLogoSrc} style={styles.logo} />
          </View>
          <View style={styles.docMeta}>
            {/* TASK-863 V1.2 — badge refleja documentStatus canonico cuando viene del caller.
                Fallback a readiness label cuando renderer legacy lo invoca sin documentStatus. */}
            {documentStatus ? (
              <Text style={documentStatusPillStyle(documentStatus)}>
                {documentStatusLabel[documentStatus] ?? documentStatus}
              </Text>
            ) : (
              <Text style={readinessPillStyle(readinessStatus)}>{readinessLabel[readinessStatus]}</Text>
            )}
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
          {/* TASK-863 V1.2 — Grid Partes simétrica: ambas direcciones en la misma fila,
              cargo del trabajador en su propia fila al final. Antes el cargo se intercalaba
              entre domicilio empleador y domicilio trabajador, dejando el del trabajador huérfano. */}
          <View style={styles.partyGrid}>
            <Field label={GH_FINIQUITO.resignation.partiesLabels.employer} value={snapshot.employer.legalName} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.worker} value={snapshot.collaborator.legalName || snapshot.collaborator.displayName} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.employerTaxId} value={snapshot.employer.taxId} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.workerTaxId} value={snapshot.collaborator.taxId} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.employerAddress} value={snapshot.employer.legalAddress} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.workerAddress} value={workerAddressDisplay} />
            <Field label={GH_FINIQUITO.resignation.partiesLabels.workerJobTitle} value={snapshot.collaborator.jobTitle} />
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

          <Clause text={GH_FINIQUITO.resignation.clauses.primero({
            workerName: collaboratorName,
            workerTaxId: workerTaxIdDisplay,
            employerLegalName,
            hireDate: hireDateLong,
            lastWorkingDay: lastWorkingDayLong,
            resignationNoticeSignedAt: resignationNoticeSignedLong,
            resignationNoticeRatifiedAt: resignationNoticeRatifiedLong
          })} />

          <Clause text={GH_FINIQUITO.resignation.clauses.segundo({
            workerName: collaboratorName,
            workerTaxId: workerTaxIdDisplay,
            employerLegalName,
            hireDate: hireDateLong,
            lastWorkingDay: lastWorkingDayLong,
            resignationNoticeSignedAt: resignationNoticeSignedLong,
            resignationNoticeRatifiedAt: resignationNoticeRatifiedLong,
            netPayableFormatted,
            netPayableInWords: netInWords ?? formatClpInWords(0),
            paymentMethod: 'transferencia bancaria',
            isRatified
          })} />

          <Clause text={GH_FINIQUITO.resignation.clauses.tercero({
            workerName: collaboratorName,
            workerTaxId: workerTaxIdDisplay,
            employerLegalName,
            hireDate: hireDateLong,
            lastWorkingDay: lastWorkingDayLong,
            resignationNoticeSignedAt: resignationNoticeSignedLong,
            resignationNoticeRatifiedAt: resignationNoticeRatifiedLong
          })} />

          {/* CUARTO — Ley 21.389 banner (Alt A no_subject / Alt B subject). Renderizado
              SOLO cuando snapshot.maintenanceObligation existe (gating bloquea calculo
              cuando faltaba; defense-in-depth aqui). */}
          {snapshot.maintenanceObligation ? (
            // TASK-863 V1.3 — wrap={false} fuerza al banner CUARTO entero a saltar a la
            // siguiente página si no cabe en la actual. Antes el title quedaba al final de
            // página 1 y el body se iba a página 2, partiendo visualmente la cláusula legal.
            <View style={styles.maintenanceBanner} wrap={false}>
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

          <Clause text={GH_FINIQUITO.resignation.clauses.quintoPrefacio} />
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

        {/* TASK-862 Slice D + TASK-863 V1.2 — 3 columnas de firma: empleador, trabajador (+ huella), ministro de fe.
            Linea de firma via View explicito (signatureRule) en lugar de borderTop del contenedor, garantiza
            ancho real visible. Container con justify-content space-between + signatureColumn centra cada bloque.
            TASK-863 V1.3 — signatureColumn empleador admite firma digital pre-impresa (Image absoluta sobre línea). */}
        <View style={styles.signatures}>
          <View style={styles.signatureColumn}>
            {employerSignaturePath ? (
              <Image src={employerSignaturePath} style={styles.signatureImageEmployer} />
            ) : null}
            <View style={styles.signatureRule} />
            <Text style={{ textAlign: 'center' }}>{`Representante empleador\n${snapshot.employer.legalName}`}</Text>
          </View>

          <View style={styles.signatureColumn}>
            <View style={styles.signatureRule} />
            <Text style={{ textAlign: 'center' }}>{`Trabajador/a\n${collaboratorName}`}</Text>
            {/* Caja huella 40x40 mm para impresion de huella dactilar fisica. */}
            <View style={styles.huellaBox}>
              <Text style={styles.huellaText}>Huella{'\n'}dactilar</Text>
            </View>
          </View>

          <View style={styles.signatureColumn}>
            <View style={styles.signatureRule} />
            {snapshot.ratification ? (
              <Text style={{ textAlign: 'center' }}>
                {`Ministro de fe\n${snapshot.ratification.ministerName}\nRUT ${snapshot.ratification.ministerTaxId}\n${snapshot.ratification.notaria ?? ''}\n${formatDate(snapshot.ratification.ratifiedAt)}`}
              </Text>
            ) : (
              <Text style={{ textAlign: 'center' }}>
                <Text>{'Ministro de fe\n'}</Text>
                <Text style={styles.ministroEmpty}>{GH_FINIQUITO.resignation.ministro.pending}</Text>
                <Text>{`\n${GH_FINIQUITO.resignation.ministro.pendingSubtitle}\n${GH_FINIQUITO.resignation.ministro.pendingFootnote}`}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* TASK-863 V1.3 — Footer en UNA sola banda fixed: 2 rows internos
            (row 1: confidencial + paginación; row 2: auditoría técnica + brand).
            Antes V1.2 tenía 2 <View fixed> independientes que se solapaban visualmente. */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRowMain}>
            <Text>Documento confidencial · {snapshot.employer.legalName} · RUT {snapshot.employer.taxId ?? 'Pendiente'}</Text>
            <Text render={({ pageNumber, totalPages }) => (
              `Página ${pageNumber} de ${totalPages}`
            )} />
          </View>
          <View style={styles.footerRowAudit}>
            <Text style={[styles.footerGhBrand, { flex: 1 }]}>
              {documentNumber} · Snapshot fs-v{snapshot.finalSettlement.settlementVersion} · Hash {fingerprint} · Generado {formatDateTime(snapshot.generatedAt)} · Template {snapshot.documentTemplateCode} {snapshot.documentTemplateVersion}
            </Text>
            <Text style={styles.footerGhBrand}>Greenhouse · greenhouse.efeoncepro.com</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export const renderFinalSettlementDocumentPdf = async (
  snapshot: FinalSettlementDocumentSnapshot,
  options: { documentStatus?: string | null } = {}
): Promise<Buffer> => {
  await ensurePdfFontsRegistered()

  const element = createElement(FinalSettlementPdfDocument, {
    snapshot,
    documentStatus: options.documentStatus ?? null
  })

  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])
}
