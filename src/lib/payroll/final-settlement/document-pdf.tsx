import 'server-only'

import { createElement } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import type { FinalSettlementDocumentSnapshot } from './document-types'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#1A1A2E',
    lineHeight: 1.42,
    backgroundColor: '#FFFFFF'
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '2 solid #0375DB',
    paddingBottom: 14,
    marginBottom: 16
  },
  logo: {
    width: 136,
    height: 36,
    objectFit: 'contain'
  },
  headerMeta: {
    width: 210,
    textAlign: 'right'
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 5,
    color: '#023C70'
  },
  subtitle: {
    color: '#667085',
    fontSize: 8
  },
  statusBand: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 9,
    border: '1 solid #DBDBDB',
    backgroundColor: '#F5F9FC',
    marginBottom: 14
  },
  statusText: {
    fontSize: 9,
    fontWeight: 700,
    color: '#023C70'
  },
  pill: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    border: '1 solid #0375DB',
    color: '#023C70',
    fontSize: 7,
    textTransform: 'uppercase'
  },
  section: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    color: '#023C70'
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12
  },
  column: {
    flex: 1
  },
  label: {
    color: '#667085',
    fontSize: 7,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  value: {
    fontSize: 9,
    marginBottom: 6
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#023C70',
    color: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 6
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1 solid #DBDBDB',
    paddingVertical: 6,
    paddingHorizontal: 6
  },
  tableCell: {
    flex: 1
  },
  wideCell: {
    flex: 1.4
  },
  smallCell: {
    flex: 0.75
  },
  amountCell: {
    width: 88,
    textAlign: 'right'
  },
  evidence: {
    color: '#667085',
    fontSize: 7
  },
  totalBox: {
    marginTop: 7,
    padding: 10,
    border: '1 solid #0375DB',
    backgroundColor: '#F5F9FC'
  },
  netPayable: {
    fontSize: 11,
    fontWeight: 700,
    color: '#023C70'
  },
  warning: {
    padding: 8,
    border: '1 solid #F79009',
    backgroundColor: '#FFFBEA',
    marginTop: 8
  },
  signatures: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    marginTop: 32
  },
  signatureLine: {
    flex: 1,
    borderTop: '1 solid #667085',
    paddingTop: 6,
    textAlign: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7,
    color: '#667085',
    borderTop: '1 solid #DBDBDB',
    paddingTop: 8
  }
})

const logoPath = `${process.cwd()}/public/branding/logo-full.png`

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value == null || value === '' ? 'Pendiente' : String(value)}</Text>
  </View>
)

const legalTreatmentLabel: Record<string, string> = {
  remuneration: 'Remuneración',
  legal_indemnity: 'Indemnización legal',
  authorized_deduction: 'Deducción autorizada',
  informational: 'Informativo'
}

const taxTreatmentLabel: Record<string, string> = {
  taxable_monthly: 'Tributable',
  non_income: 'No renta',
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
  ready: 'Listo para emisión formal',
  needs_review: 'Requiere revisión previa',
  blocked: 'Bloqueado para emisión formal'
}

const readableEvidence = (evidence: Record<string, unknown> | undefined) => {
  if (!evidence) return 'Evidencia no adjunta'

  const source = typeof evidence.source === 'string' ? evidence.source : null
  const label = typeof evidence.label === 'string' ? evidence.label : null
  const code = typeof evidence.code === 'string' ? evidence.code : null
  const reason = typeof evidence.reason === 'string' ? evidence.reason : null

  return label ?? reason ?? source ?? code ?? 'Evidencia estructurada'
}

const FinalSettlementPdfDocument = ({ snapshot }: { snapshot: FinalSettlementDocumentSnapshot }) => {
  const warnings = snapshot.readiness.checks.filter(check => check.status !== 'passed')
  const readinessStatus = snapshot.readiness.hasBlockers ? 'blocked' : warnings.length > 0 ? 'needs_review' : 'ready'
  const collaboratorName = snapshot.collaborator.legalName || snapshot.collaborator.displayName || snapshot.finalSettlement.memberId

  return (
    <Document
      title={`Finiquito ${collaboratorName}`}
      author='Greenhouse'
    >
      <Page size='LETTER' style={styles.page}>
        <View style={styles.header}>
          <View>
            <Image src={logoPath} style={styles.logo} />
            <Text style={styles.subtitle}>People Operations · Payroll Chile</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.title}>Finiquito de contrato de trabajo</Text>
            <Text style={styles.subtitle}>Template {snapshot.documentTemplateVersion}</Text>
            <Text style={styles.subtitle}>Snapshot {snapshot.finalSettlement.finalSettlementId}</Text>
          </View>
        </View>

        <View style={styles.statusBand}>
          <View>
            <Text style={styles.statusText}>{readinessLabel[readinessStatus]}</Text>
            <Text style={styles.subtitle}>
              Documento interno generado desde liquidación final aprobada. La firma o ratificación externa cierra el proceso.
            </Text>
          </View>
          <Text style={styles.pill}>{snapshot.finalSettlement.currency}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partes</Text>
          <View style={styles.grid}>
            <View style={styles.column}>
              <Field label='Empleador' value={snapshot.employer.legalName} />
              <Field label='RUT empleador' value={snapshot.employer.taxId} />
              <Field label='Domicilio' value={snapshot.employer.legalAddress} />
            </View>
            <View style={styles.column}>
              <Field label='Trabajador/a' value={snapshot.collaborator.legalName || snapshot.collaborator.displayName} />
              <Field label='RUT trabajador/a' value={snapshot.collaborator.taxId} />
              <Field label='Cargo' value={snapshot.collaborator.jobTitle} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relacion laboral</Text>
          <View style={styles.grid}>
            <View style={styles.column}>
              <Field label='Fecha ingreso' value={snapshot.finalSettlement.hireDateSnapshot} />
              <Field label='Ultimo dia trabajado' value={snapshot.finalSettlement.lastWorkingDay} />
            </View>
            <View style={styles.column}>
              <Field label='Fecha termino' value={snapshot.finalSettlement.effectiveDate} />
              <Field label='Causal' value='Renuncia voluntaria' />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de haberes y descuentos</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.wideCell}>Concepto</Text>
            <Text style={styles.tableCell}>Tratamiento</Text>
            <Text style={styles.tableCell}>Evidencia</Text>
            <Text style={styles.amountCell}>Monto</Text>
          </View>
          {snapshot.breakdown.map(line => (
            <View key={line.componentCode} style={styles.tableRow}>
              <View style={styles.wideCell}>
                <Text>{line.label}</Text>
                <Text style={styles.evidence}>{line.kind === 'deduction' ? 'Descuento' : 'Haber'} · {line.policyCode ?? 'policy pendiente'}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>{legalTreatmentLabel[line.legalTreatment ?? ''] ?? line.legalTreatment ?? 'Pendiente'}</Text>
                <Text style={styles.evidence}>
                  {taxTreatmentLabel[line.taxTreatment ?? ''] ?? line.taxTreatment ?? 'Pendiente'} · {previsionalTreatmentLabel[line.previsionalTreatment ?? ''] ?? line.previsionalTreatment ?? 'Pendiente'}
                </Text>
              </View>
              <Text style={styles.tableCell}>{readableEvidence(line.evidence)}</Text>
              <Text style={styles.amountCell}>{formatCurrency(line.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalBox}>
            <View style={styles.grid}>
              <View style={styles.column}>
                <Field label='Total haberes' value={formatCurrency(snapshot.finalSettlement.grossTotal)} />
              </View>
              <View style={styles.column}>
                <Field label='Total descuentos' value={formatCurrency(snapshot.finalSettlement.deductionTotal)} />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Líquido / pago neto</Text>
                <Text style={styles.netPayable}>{formatCurrency(snapshot.finalSettlement.netPayable)}</Text>
              </View>
            </View>
          </View>
        </View>

        {warnings.length > 0 && (
          <View style={styles.warning}>
            <Text style={styles.sectionTitle}>Advertencias de revision</Text>
            {warnings.map(check => (
              <Text key={check.code}>- {check.message}</Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratificacion y reserva de derechos</Text>
          <Text>
            La persona trabajadora puede aceptar, aceptar con reserva de derechos o rechazar la propuesta en el proceso externo
            correspondiente. Greenhouse registra ese resultado como evidencia, sin ejecutar pagos ni sustituir al ministro de fe.
          </Text>
        </View>

        <View style={styles.signatures}>
          <Text style={styles.signatureLine}>Representante empleador</Text>
          <Text style={styles.signatureLine}>Trabajador/a</Text>
        </View>

        <Text style={styles.footer}>
          Template {snapshot.documentTemplateVersion} · Snapshot {snapshot.finalSettlement.finalSettlementId} · Generado {snapshot.generatedAt}
        </Text>
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
