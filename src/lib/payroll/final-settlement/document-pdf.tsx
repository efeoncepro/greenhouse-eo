import 'server-only'

import { createHash } from 'node:crypto'

import { createElement } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import type { FinalSettlementDocumentSnapshot } from './document-types'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 32,
    paddingBottom: 34,
    paddingLeft: 32,
    fontFamily: 'DM Sans',
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
    fontFamily: 'DM Sans Bold',
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
    fontFamily: 'DM Sans Bold',
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
    marginBottom: 3
  },
  netHelp: {
    color: '#667085',
    fontSize: 7
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
    fontFamily: 'DM Sans Medium',
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
    fontFamily: 'DM Sans Bold'
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1 solid #E3E8EF',
    paddingVertical: 5,
    paddingHorizontal: 7
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
    fontFamily: 'DM Sans Medium'
  },
  conceptLabel: {
    fontFamily: 'DM Sans Bold',
    fontSize: 8.3,
    marginBottom: 3
  },
  evidence: {
    color: '#667085',
    fontSize: 7
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
    fontFamily: 'DM Sans Bold'
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
    width: '47%',
    borderTop: '1 solid #667085',
    paddingTop: 6,
    textAlign: 'center',
    marginRight: 20
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Pendiente'

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')

    return `${day}-${month}-${year}`
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

const formatDateTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const shortHash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 8)

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
      : 'Monto líquido calculado en esta versión.'

  return (
    <Document
      title={`Finiquito ${collaboratorName}`}
      author='Greenhouse'
    >
      <Page size='LETTER' style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoPath} style={styles.logo} />
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
              Proyecto de finiquito para relación laboral dependiente en Chile. Su validez queda sujeta a firma o ratificación
              ante ministro de fe cuando corresponda.
            </Text>
          </View>
          <View style={styles.netBox}>
            <Text style={styles.netLabel}>Líquido a pagar</Text>
            <Text style={styles.netAmount}>{formatCurrency(snapshot.finalSettlement.netPayable)}</Text>
            <Text style={styles.netHelp}>{netHelp}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partes</Text>
          <View style={styles.partyGrid}>
            <Field label='Empleador' value={snapshot.employer.legalName} />
            <Field label='Trabajador/a' value={snapshot.collaborator.legalName || snapshot.collaborator.displayName} />
            <Field label='RUT empleador' value={snapshot.employer.taxId} />
            <Field label='RUT trabajador/a' value={snapshot.collaborator.taxId} />
            <Field label='Domicilio empleador' value={snapshot.employer.legalAddress} />
            <Field label='Cargo' value={snapshot.collaborator.jobTitle} />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de haberes, descuentos y retenciones</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.conceptCell}>Concepto</Text>
            <Text style={styles.treatmentCell}>Tratamiento</Text>
            <Text style={styles.evidenceCell}>Respaldo</Text>
            <Text style={styles.amountCell}>Monto</Text>
          </View>
          {snapshot.breakdown.map(line => (
            <View key={line.componentCode} style={styles.tableRow}>
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
              <Text style={styles.evidenceCell}>{readableEvidence(line.evidence)}</Text>
              <Text style={styles.amountCell}>{formatCurrency(line.amount)}</Text>
            </View>
          ))}
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
          <Text style={styles.statement}>
            Este documento resume los haberes, descuentos y pagos asociados al término de la relación laboral. La firma o
            ratificación debe realizarse ante ministro de fe cuando corresponda. La persona trabajadora puede formular reserva
            de derechos al momento de firmar.
          </Text>
        </View>

        <View style={styles.signatures}>
          <Text style={styles.signatureLine}>Representante empleador{'\n'}{snapshot.employer.legalName}</Text>
          <Text style={styles.signatureLine}>Trabajador/a{'\n'}{collaboratorName}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Documento confidencial · {snapshot.employer.legalName} · RUT {snapshot.employer.taxId ?? 'Pendiente'}</Text>
          <Text render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages} · Template ${snapshot.documentTemplateCode} · ${snapshot.documentTemplateVersion}`
          )} />
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
