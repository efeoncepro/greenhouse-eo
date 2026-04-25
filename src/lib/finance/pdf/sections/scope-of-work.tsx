import 'server-only'

import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { QuotationPdfLegalEntity, QuotationPdfLineItem } from '../contracts'
import { formatQuantity } from '../formatters'
import { renderRichHtmlBlocks } from '../rich-html-renderer'
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
  bundle: {
    marginBottom: PdfSpacing.s5,
    borderWidth: 1,
    borderColor: PdfColors.divider,
    borderStyle: 'solid',
    borderRadius: PdfRadii.md
  },
  bundleHeader: {
    padding: PdfSpacing.s3,
    paddingHorizontal: PdfSpacing.s4,
    backgroundColor: PdfColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  bundleHeaderLeft: { flex: 1 },
  bundleTitle: {
    fontFamily: PdfFonts.heading,
    fontSize: 12,
    color: PdfColors.primary,
    marginBottom: 2
  },
  bundleSku: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1,
    color: PdfColors.textMuted,
    textTransform: 'uppercase'
  },
  bundleChip: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1,
    color: PdfColors.primary,
    backgroundColor: PdfColors.paper,
    borderWidth: 1,
    borderColor: PdfColors.primary,
    borderStyle: 'solid',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    textTransform: 'uppercase'
  },
  bundleBody: { padding: PdfSpacing.s4 },
  lineRow: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'dotted',
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  lineQty: {
    fontFamily: PdfFonts.body,
    fontSize: 8,
    color: PdfColors.textMuted,
    width: 80,
    textAlign: 'right'
  },
  lineLabel: {
    flex: 1
  },
  lineLabelText: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.text
  },
  lineCode: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    color: PdfColors.accent,
    letterSpacing: 0.5,
    marginTop: 1
  }
})

interface ScopeOfWorkPageProps {
  quotationNumber: string
  versionNumber: number
  lineItems: QuotationPdfLineItem[]
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}

interface Bundle {
  id: string
  label: string
  lines: QuotationPdfLineItem[]
}

const groupByBundles = (lines: QuotationPdfLineItem[]): Bundle[] => {
  const bundles = new Map<string, Bundle>()

  for (const line of lines) {
    const id = line.bundleId ?? `single-${line.label}-${lines.indexOf(line)}`
    const label = line.bundleLabel ?? line.label

    if (!bundles.has(id)) {
      bundles.set(id, { id, label, lines: [] })
    }

    bundles.get(id)!.lines.push(line)
  }

  return Array.from(bundles.values())
}

export const ScopeOfWorkPage = (props: ScopeOfWorkPageProps) => {
  const bundles = groupByBundles(props.lineItems)

  return (
    <Page size='A4' style={styles.page}>
      <PageHeader quotationNumber={props.quotationNumber} versionNumber={props.versionNumber} />
      <SectionHeading
        eyebrow='03 · Alcance del trabajo'
        title='Servicios y componentes incluidos'
        subtitle='Cada bundle agrupa los componentes que se activan al iniciar el servicio. Los componentes opcionales se marcan como tales.'
      />
      <View style={styles.body}>
        {bundles.map(bundle => {
          const firstWithRichHtml = bundle.lines.find(l => l.descriptionRichHtml)
          const firstWithDescription = bundle.lines.find(l => l.description || l.descriptionRichHtml)

          return (
            <View key={bundle.id} style={styles.bundle} wrap={false}>
              <View style={styles.bundleHeader}>
                <View style={styles.bundleHeaderLeft}>
                  <Text style={styles.bundleTitle}>{bundle.label}</Text>
                  {bundle.lines[0].productCode ? (
                    <Text style={styles.bundleSku}>SKU {bundle.lines[0].productCode}</Text>
                  ) : null}
                </View>
                <Text style={styles.bundleChip}>
                  {bundle.lines.length > 1 ? 'Bundle' : 'Servicio'}
                </Text>
              </View>
              <View style={styles.bundleBody}>
                {firstWithRichHtml?.descriptionRichHtml
                  ? renderRichHtmlBlocks(firstWithRichHtml.descriptionRichHtml, {
                      baseFontSize: 9,
                      lineHeight: 1.55
                    })
                  : firstWithDescription?.description ? (
                    <Text style={{ fontSize: 9, color: PdfColors.text, lineHeight: 1.55, marginBottom: 8 }}>
                      {firstWithDescription.description}
                    </Text>
                  ) : null}
                {bundle.lines.map((line, lineIdx) => (
                  <View key={lineIdx} style={styles.lineRow}>
                    <View style={styles.lineLabel}>
                      <Text style={styles.lineLabelText}>{line.label}</Text>
                      {line.productCode ? (
                        <Text style={styles.lineCode}>{line.productCode}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.lineQty}>
                      {formatQuantity(line.quantity)} {line.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </View>
      <PageFooter {...props} />
    </Page>
  )
}
