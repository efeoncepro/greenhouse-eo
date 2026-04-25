import 'server-only'

import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type {
  QuotationPdfFxFooter,
  QuotationPdfLegalEntity,
  QuotationPdfLineItem,
  QuotationPdfTotals
} from '../contracts'
import { formatCurrency, formatDateDMY, formatQuantity, formatRate } from '../formatters'
import { PdfColors, PdfFonts, PdfRadii, PdfSpacing } from '../tokens'

import { PageFooter, PageHeader, SectionHeading, sectionBodyStyle } from './shared'

const styles = StyleSheet.create({
  page: {
    backgroundColor: PdfColors.paper,
    paddingBottom: 72,
    fontFamily: PdfFonts.body,
    fontSize: 9
  },
  body: sectionBodyStyle,

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PdfColors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  th: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    color: PdfColors.paper,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  colLabel: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colUnit: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.4, textAlign: 'right' },
  colSubtotal: { flex: 1.6, textAlign: 'right' },

  bundleRow: {
    flexDirection: 'row',
    backgroundColor: PdfColors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: PdfColors.primary,
    borderTopStyle: 'solid'
  },
  bundleRowText: {
    fontFamily: PdfFonts.heading,
    fontSize: 9,
    color: PdfColors.primary
  },

  lineRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'solid',
    alignItems: 'flex-start'
  },
  lineRowAlt: { backgroundColor: PdfColors.surface },
  lineLabel: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 8.5,
    color: PdfColors.text
  },
  lineHint: {
    fontFamily: PdfFonts.body,
    fontSize: 7,
    color: PdfColors.textMuted,
    marginTop: 1
  },
  cellText: {
    fontFamily: PdfFonts.body,
    fontSize: 8.5,
    color: PdfColors.text
  },

  summary: {
    marginTop: PdfSpacing.s5,
    marginLeft: 'auto',
    width: 280,
    borderWidth: 1,
    borderColor: PdfColors.divider,
    borderStyle: 'solid',
    borderRadius: PdfRadii.md
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'solid'
  },
  summaryLabel: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.textMuted
  },
  summaryValue: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 9,
    color: PdfColors.text
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: PdfColors.primary
  },
  summaryTotalLabel: {
    fontFamily: PdfFonts.heading,
    fontSize: 9,
    color: PdfColors.paperOnPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  summaryTotalValue: {
    fontFamily: PdfFonts.heading,
    fontSize: 14,
    color: PdfColors.paper
  },

  fxNote: {
    marginTop: PdfSpacing.s4,
    padding: PdfSpacing.s3,
    paddingHorizontal: PdfSpacing.s4,
    borderWidth: 1,
    borderColor: PdfColors.divider,
    borderStyle: 'solid',
    borderRadius: PdfRadii.sm
  },
  fxNoteTitle: {
    fontFamily: PdfFonts.bodyBold,
    fontSize: 8,
    color: PdfColors.text,
    marginBottom: 2
  },
  fxNoteLine: {
    fontFamily: PdfFonts.body,
    fontSize: 8,
    color: PdfColors.textMuted,
    lineHeight: 1.5
  }
})

interface CommercialProposalPageProps {
  quotationNumber: string
  versionNumber: number
  currency: string
  lineItems: QuotationPdfLineItem[]
  totals: QuotationPdfTotals
  fxFooter?: QuotationPdfFxFooter | null
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}

export const CommercialProposalPage = (props: CommercialProposalPageProps) => {
  const currency = props.currency.toUpperCase()

  // Detect bundle groupings to render bundle header rows
  let lastBundleId: string | null = null

  return (
    <Page size='A4' style={styles.page}>
      <PageHeader quotationNumber={props.quotationNumber} versionNumber={props.versionNumber} />
      <SectionHeading
        eyebrow='04 · Detalle comercial'
        title='Pricing por bundle y línea'
        subtitle='Todos los precios en la moneda indicada. IVA aplicable según país de facturación.'
      />
      <View style={styles.body}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colLabel]}>Descripción</Text>
          <Text style={[styles.th, styles.colQty]}>Cant.</Text>
          <Text style={[styles.th, styles.colUnit]}>Unidad</Text>
          <Text style={[styles.th, styles.colPrice]}>Precio unit.</Text>
          <Text style={[styles.th, styles.colSubtotal]}>Subtotal</Text>
        </View>
        {props.lineItems.length === 0 ? (
          <View style={styles.lineRow}>
            <Text style={[styles.cellText, styles.colLabel]}>Sin ítems en esta versión.</Text>
          </View>
        ) : (
          props.lineItems.map((item, idx) => {
            const bundleHeader = item.bundleId && item.bundleId !== lastBundleId ? (
              <View key={`bundle-${item.bundleId}`} style={styles.bundleRow} wrap={false}>
                <Text style={[styles.bundleRowText, { flex: 7 }]}>
                  {item.bundleLabel ?? item.label}
                </Text>
              </View>
            ) : null

            if (item.bundleId) {
              lastBundleId = item.bundleId
            } else {
              lastBundleId = null
            }

            return (
              <View key={`row-${idx}`}>
                {bundleHeader}
                <View
                  style={[
                    styles.lineRow,
                    idx % 2 === 1 ? styles.lineRowAlt : {}
                  ]}
                  wrap={false}
                >
                  <View style={styles.colLabel}>
                    <Text style={styles.lineLabel}>{item.label}</Text>
                    {item.productCode || item.description ? (
                      <Text style={styles.lineHint}>
                        {item.productCode ? item.productCode : ''}
                        {item.productCode && item.description ? ' · ' : ''}
                        {item.description ? item.description : ''}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.cellText, styles.colQty]}>
                    {formatQuantity(item.quantity)}
                  </Text>
                  <Text style={[styles.cellText, styles.colUnit]}>
                    {item.unit || 'unit'}
                  </Text>
                  <Text style={[styles.cellText, styles.colPrice]}>
                    {formatCurrency(item.unitPrice, currency)}
                  </Text>
                  <Text style={[styles.cellText, styles.colSubtotal]}>
                    {formatCurrency(item.subtotalAfterDiscount, currency)}
                  </Text>
                </View>
              </View>
            )
          })
        )}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal neto</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(props.totals.subtotal, currency)}
            </Text>
          </View>
          {props.totals.totalDiscount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Descuento aplicado</Text>
              <Text style={styles.summaryValue}>
                — {formatCurrency(props.totals.totalDiscount, currency)}
              </Text>
            </View>
          ) : null}
          {props.totals.tax ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{props.totals.tax.label}</Text>
              <Text style={styles.summaryValue}>
                {props.totals.tax.isExempt
                  ? '—'
                  : formatCurrency(props.totals.tax.amount, currency)}
              </Text>
            </View>
          ) : null}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>
              {formatCurrency(props.totals.total, currency)}
            </Text>
          </View>
        </View>

        {props.fxFooter ? (
          <View style={styles.fxNote} wrap={false}>
            <Text style={styles.fxNoteTitle}>Tipo de cambio aplicado</Text>
            <Text style={styles.fxNoteLine}>
              {props.fxFooter.baseCurrency} 1 = {props.fxFooter.outputCurrency}{' '}
              {formatRate(props.fxFooter.rate)}
              {props.fxFooter.rateDateResolved
                ? ` · fecha ${formatDateDMY(props.fxFooter.rateDateResolved)}`
                : ''}
              {props.fxFooter.source ? ` · fuente ${props.fxFooter.source}` : ''}
            </Text>
            {props.fxFooter.composedViaUsd ? (
              <Text style={styles.fxNoteLine}>
                Tasa derivada por composición vía USD.
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <PageFooter {...props} />
    </Page>
  )
}
