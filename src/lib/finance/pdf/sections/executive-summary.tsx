import 'server-only'

import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { PdfColors, PdfFonts, PdfRadii, PdfSpacing } from '../tokens'

import { PageFooter, PageHeader, SectionHeading, sectionBodyStyle } from './shared'

import type { QuotationPdfLegalEntity } from '../contracts'

const styles = StyleSheet.create({
  page: {
    backgroundColor: PdfColors.paper,
    color: PdfColors.text,
    paddingBottom: 72,
    fontFamily: PdfFonts.body,
    fontSize: 10
  },
  body: sectionBodyStyle,
  prose: {
    fontFamily: PdfFonts.body,
    fontSize: 10,
    color: PdfColors.text,
    lineHeight: 1.65,
    marginBottom: PdfSpacing.s3
  },
  kpis: {
    marginTop: PdfSpacing.s5,
    padding: PdfSpacing.s4,
    backgroundColor: PdfColors.paper,
    borderWidth: 1,
    borderColor: PdfColors.divider,
    borderStyle: 'solid',
    borderRadius: PdfRadii.md,
    flexDirection: 'row',
    gap: PdfSpacing.s3
  },
  kpi: { flex: 1 },
  kpiLabel: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.2,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: PdfSpacing.s1
  },
  kpiValue: {
    fontFamily: PdfFonts.heading,
    fontSize: 14,
    color: PdfColors.primary,
    lineHeight: 1.1
  },
  kpiSub: {
    fontFamily: PdfFonts.body,
    fontSize: 7,
    color: PdfColors.textMuted,
    marginTop: 2
  }
})

interface ExecutiveSummaryPageProps {
  quotationNumber: string
  versionNumber: number
  description: string
  kpis: Array<{ label: string; value: string; sub: string | null }>
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}

export const ExecutiveSummaryPage = (props: ExecutiveSummaryPageProps) => (
  <Page size='A4' style={styles.page}>
    <PageHeader quotationNumber={props.quotationNumber} versionNumber={props.versionNumber} />
    <SectionHeading
      eyebrow='01 · Síntesis ejecutiva'
      title='Lo que entregamos en una página'
      subtitle='Resumen para sponsor y comité de aprobación. Si solo lees una sección, que sea esta.'
    />
    <View style={styles.body}>
      <Text style={styles.prose}>{props.description}</Text>
      {props.kpis.length > 0 ? (
        <View style={styles.kpis}>
          {props.kpis.map((k, idx) => (
            <View key={idx} style={styles.kpi}>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiValue}>{k.value}</Text>
              {k.sub ? <Text style={styles.kpiSub}>{k.sub}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
    <PageFooter {...props} />
  </Page>
)
