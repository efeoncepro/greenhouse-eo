import 'server-only'

import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type {
  QuotationPdfLegalEntity,
  QuotationPdfMilestone,
  QuotationPdfPaymentMethods
} from '../contracts'
import { PdfColors, PdfFonts, PdfRadii, PdfSpacing } from '../tokens'

import { PageFooter, PageHeader, SectionHeading, sectionBodyStyle } from './shared'

const styles = StyleSheet.create({
  page: {
    backgroundColor: PdfColors.paper,
    paddingBottom: 72,
    fontFamily: PdfFonts.body,
    fontSize: 10
  },
  body: sectionBodyStyle,
  intro: {
    fontFamily: PdfFonts.body,
    fontSize: 9.5,
    color: PdfColors.text,
    lineHeight: 1.55,
    marginBottom: PdfSpacing.s5
  },
  timeline: {
    paddingLeft: PdfSpacing.s5,
    marginBottom: PdfSpacing.s6,
    position: 'relative'
  },
  milestone: {
    marginBottom: PdfSpacing.s4,
    flexDirection: 'row',
    gap: PdfSpacing.s3
  },
  milestoneMarker: {
    width: 12,
    height: 12,
    backgroundColor: PdfColors.accent,
    borderRadius: 999,
    marginTop: 3,
    marginRight: PdfSpacing.s3
  },
  milestoneBody: { flex: 1 },
  milestoneDate: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 8,
    letterSpacing: 1,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  milestoneTitle: {
    fontFamily: PdfFonts.heading,
    fontSize: 11,
    color: PdfColors.primary,
    marginBottom: 2
  },
  milestoneDetail: {
    fontFamily: PdfFonts.body,
    fontSize: 8.5,
    color: PdfColors.textMuted,
    lineHeight: 1.45
  },
  milestoneAmount: {
    fontFamily: PdfFonts.heading,
    fontSize: 12,
    color: PdfColors.primary
  },
  paymentMethods: {
    padding: PdfSpacing.s4,
    backgroundColor: PdfColors.surface,
    borderRadius: PdfRadii.md,
    borderLeftWidth: 3,
    borderLeftColor: PdfColors.accent,
    borderLeftStyle: 'solid'
  },
  paymentMethodsTitle: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.5,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: PdfSpacing.s2
  },
  paymentMethodsBody: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.text,
    lineHeight: 1.5
  }
})

interface InvestmentTimelinePageProps {
  quotationNumber: string
  versionNumber: number
  milestones: QuotationPdfMilestone[]
  paymentMethods: QuotationPdfPaymentMethods | null
  intro: string | null
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}

export const InvestmentTimelinePage = (props: InvestmentTimelinePageProps) => (
  <Page size='A4' style={styles.page}>
    <PageHeader quotationNumber={props.quotationNumber} versionNumber={props.versionNumber} />
    <SectionHeading
      eyebrow='05 · Cronograma de inversión'
      title='Calendario de pagos y entregables'
      subtitle='Pagos los primeros 5 días hábiles del periodo correspondiente.'
    />
    <View style={styles.body}>
      {props.intro ? <Text style={styles.intro}>{props.intro}</Text> : null}
      <View style={styles.timeline}>
        {props.milestones.map((m, idx) => (
          <View key={idx} style={styles.milestone} wrap={false}>
            <View style={styles.milestoneMarker} />
            <View style={styles.milestoneBody}>
              <Text style={styles.milestoneDate}>{m.dateLabel}</Text>
              <Text style={styles.milestoneTitle}>{m.title}</Text>
              {m.detail ? <Text style={styles.milestoneDetail}>{m.detail}</Text> : null}
            </View>
            <Text style={styles.milestoneAmount}>{m.amountLabel}</Text>
          </View>
        ))}
      </View>
      {props.paymentMethods ? (
        <View style={styles.paymentMethods}>
          <Text style={styles.paymentMethodsTitle}>Métodos de pago aceptados</Text>
          <Text style={styles.paymentMethodsBody}>{props.paymentMethods.description}</Text>
        </View>
      ) : null}
    </View>
    <PageFooter {...props} />
  </Page>
)
