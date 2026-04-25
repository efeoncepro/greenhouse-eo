import 'server-only'

import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { QuotationPdfLegalEntity, QuotationPdfTerm } from '../contracts'
import { PdfColors, PdfFonts, PdfSpacing } from '../tokens'

import { PageFooter, PageHeader, SectionHeading, sectionBodyStyle } from './shared'

const styles = StyleSheet.create({
  page: {
    backgroundColor: PdfColors.paper,
    paddingBottom: 72,
    fontFamily: PdfFonts.body,
    fontSize: 9
  },
  body: sectionBodyStyle,
  term: {
    marginBottom: PdfSpacing.s4,
    paddingBottom: PdfSpacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'solid'
  },
  termTitle: {
    fontFamily: PdfFonts.heading,
    fontSize: 10,
    color: PdfColors.primary,
    marginBottom: PdfSpacing.s2
  },
  termBody: {
    fontFamily: PdfFonts.body,
    fontSize: 8.5,
    color: PdfColors.text,
    lineHeight: 1.55
  }
})

interface TermsPageProps {
  quotationNumber: string
  versionNumber: number
  terms: QuotationPdfTerm[]
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}

export const TermsPage = (props: TermsPageProps) => {
  const ordered = [...props.terms].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Page size='A4' style={styles.page}>
      <PageHeader quotationNumber={props.quotationNumber} versionNumber={props.versionNumber} />
      <SectionHeading
        eyebrow='06 · Términos y condiciones'
        title='Marco contractual'
        subtitle='Condiciones generales aplicables a esta propuesta. El contrato formal se firma por separado.'
      />
      <View style={styles.body}>
        {ordered.map((term, idx) => (
          <View key={`${term.title}-${idx}`} style={styles.term} wrap={false}>
            <Text style={styles.termTitle}>
              {idx + 1}. {term.title}
            </Text>
            <Text style={styles.termBody}>{term.bodyResolved}</Text>
          </View>
        ))}
      </View>
      <PageFooter {...props} />
    </Page>
  )
}
