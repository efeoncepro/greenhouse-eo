import 'server-only'

import { createElement } from 'react'

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import type { FinalSettlementDocumentSnapshot } from './document-types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1F2933',
    lineHeight: 1.45
  },
  header: {
    borderBottom: '1 solid #D7DEE8',
    paddingBottom: 16,
    marginBottom: 18
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 6
  },
  subtitle: {
    color: '#52616F',
    fontSize: 9
  },
  section: {
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 7,
    color: '#102A43'
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
    color: '#66788A',
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
    borderBottom: '1 solid #D7DEE8',
    paddingBottom: 5,
    marginBottom: 4
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1 solid #EDF2F7',
    paddingVertical: 5
  },
  tableCell: {
    flex: 1
  },
  amountCell: {
    width: 96,
    textAlign: 'right'
  },
  totalBox: {
    marginTop: 8,
    padding: 10,
    border: '1 solid #D7DEE8'
  },
  warning: {
    padding: 8,
    border: '1 solid #F0B429',
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
    borderTop: '1 solid #9AA5B1',
    paddingTop: 6,
    textAlign: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#7B8794',
    borderTop: '1 solid #EDF2F7',
    paddingTop: 8
  }
})

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

const FinalSettlementPdfDocument = ({ snapshot }: { snapshot: FinalSettlementDocumentSnapshot }) => {
  const warnings = snapshot.readiness.checks.filter(check => check.status !== 'passed')

  return (
    <Document
      title={`Finiquito ${snapshot.collaborator.legalName || snapshot.collaborator.displayName || snapshot.finalSettlement.memberId}`}
      author='Greenhouse'
    >
      <Page size='LETTER' style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Finiquito de contrato de trabajo</Text>
          <Text style={styles.subtitle}>
            Documento interno generado desde liquidacion final aprobada. Requiere firma o ratificacion externa para cerrar el proceso.
          </Text>
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
            <Text style={styles.tableCell}>Concepto</Text>
            <Text style={styles.tableCell}>Tipo</Text>
            <Text style={styles.amountCell}>Monto</Text>
          </View>
          {snapshot.breakdown.map(line => (
            <View key={line.componentCode} style={styles.tableRow}>
              <Text style={styles.tableCell}>{line.label}</Text>
              <Text style={styles.tableCell}>{line.kind === 'deduction' ? 'Descuento' : 'Haber'}</Text>
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
                <Field label='Liquido a pagar' value={formatCurrency(snapshot.finalSettlement.netPayable)} />
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
