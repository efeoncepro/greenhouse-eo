import 'server-only'

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { RenderQuotationPdfInput } from './contracts'

const COLOR_PRIMARY = '#0375DB'
const COLOR_SECONDARY = '#6E6B7B'
const COLOR_BORDER = '#E4E5EB'
const COLOR_SURFACE = '#F4F5FA'
const COLOR_TEXT = '#2F2B3D'
const COLOR_TEXT_MUTED = '#6E6B7B'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLOR_TEXT,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 32
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLOR_PRIMARY,
    borderBottomStyle: 'solid'
  },
  brand: {
    flexDirection: 'column'
  },
  brandMark: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: COLOR_PRIMARY,
    letterSpacing: 1
  },
  brandTagline: {
    fontSize: 8,
    color: COLOR_TEXT_MUTED,
    marginTop: 2
  },
  quoteMeta: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  quoteMetaTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: COLOR_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  quoteMetaNumber: {
    fontSize: 10,
    marginTop: 4,
    color: COLOR_PRIMARY
  },
  quoteMetaRow: {
    fontSize: 8,
    color: COLOR_TEXT_MUTED,
    marginTop: 2
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: COLOR_PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6
  },
  clientBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18
  },
  clientColumn: {
    flexDirection: 'column',
    flex: 1,
    paddingRight: 16
  },
  clientLabel: {
    fontSize: 8,
    color: COLOR_TEXT_MUTED,
    marginBottom: 2
  },
  clientValue: {
    fontSize: 10,
    color: COLOR_TEXT,
    marginBottom: 2
  },
  descriptionBlock: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: COLOR_SURFACE,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLOR_PRIMARY,
    borderLeftStyle: 'solid'
  },
  descriptionText: {
    fontSize: 9,
    color: COLOR_TEXT,
    lineHeight: 1.4
  },
  table: {
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR_BORDER,
    borderTopStyle: 'solid'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLOR_PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 6
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
    borderBottomStyle: 'solid'
  },
  tableRowAlt: {
    backgroundColor: COLOR_SURFACE
  },
  colLabel: {
    flex: 3
  },
  colQty: {
    flex: 1,
    textAlign: 'right'
  },
  colUnit: {
    flex: 1,
    textAlign: 'center'
  },
  colPrice: {
    flex: 1.4,
    textAlign: 'right'
  },
  colSubtotal: {
    flex: 1.6,
    textAlign: 'right'
  },
  cellText: {
    fontSize: 9,
    color: COLOR_TEXT
  },
  cellLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: COLOR_TEXT,
    marginBottom: 2
  },
  cellDescription: {
    fontSize: 8,
    color: COLOR_TEXT_MUTED,
    lineHeight: 1.35
  },
  totalsBlock: {
    alignSelf: 'flex-end',
    width: '45%',
    marginBottom: 20
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: COLOR_PRIMARY,
    borderTopStyle: 'solid',
    marginTop: 4
  },
  totalsLabel: {
    fontSize: 9,
    color: COLOR_TEXT_MUTED
  },
  totalsValue: {
    fontSize: 9,
    color: COLOR_TEXT
  },
  totalsLabelFinal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: COLOR_PRIMARY
  },
  totalsValueFinal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: COLOR_PRIMARY
  },
  termsBlock: {
    marginBottom: 12
  },
  termItem: {
    marginBottom: 10
  },
  termTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: COLOR_TEXT,
    marginBottom: 3
  },
  termBody: {
    fontSize: 8,
    color: COLOR_TEXT_MUTED,
    lineHeight: 1.4
  },
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLOR_BORDER,
    borderTopStyle: 'solid',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerText: {
    fontSize: 7,
    color: COLOR_SECONDARY
  }
})

const formatDateDMY = (iso: string | null): string => {
  if (!iso) return '—'
  const value = iso.slice(0, 10)
  const parts = value.split('-')

  if (parts.length !== 3) return value

  const [y, m, d] = parts

  return `${d}/${m}/${y}`
}

const getCurrencySymbol = (currency: string): string => {
  const upper = currency.toUpperCase()

  if (upper === 'CLP' || upper === 'CLF') return '$'
  if (upper === 'USD') return 'US$'

  return `${upper} `
}

const formatCurrency = (value: number, currency: string): string => {
  const upper = currency.toUpperCase()
  const symbol = getCurrencySymbol(upper)

  if (upper === 'CLP') {
    return `${symbol}${new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))}`
  }

  return `${symbol}${new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`
}

const formatQuantity = (value: number): string => {
  if (!Number.isFinite(value)) return '0'

  if (Number.isInteger(value)) return String(value)

  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

const todayLabel = (): string => {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const y = now.getFullYear()

  return `${d}/${m}/${y}`
}

interface QuotationPdfDocumentProps {
  input: RenderQuotationPdfInput
}

export const QuotationPdfDocument = ({ input }: QuotationPdfDocumentProps) => {
  const currency = (input.currency || 'CLP').toUpperCase()
  const orderedTerms = [...input.terms].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Document
      title={`${input.quotationNumber} v${input.versionNumber}`}
      author='Efeonce Group'
      subject='Cotización'
      creator='Greenhouse EO'
      producer='Greenhouse EO'
    >
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandMark}>Efeonce</Text>
            <Text style={styles.brandTagline}>Efeonce Group</Text>
          </View>
          <View style={styles.quoteMeta}>
            <Text style={styles.quoteMetaTitle}>Cotización</Text>
            <Text style={styles.quoteMetaNumber}>{input.quotationNumber}</Text>
            <Text style={styles.quoteMetaRow}>Versión v{input.versionNumber}</Text>
            <Text style={styles.quoteMetaRow}>Emitida: {formatDateDMY(input.quoteDate)}</Text>
            {input.validUntil ? (
              <Text style={styles.quoteMetaRow}>Válida hasta: {formatDateDMY(input.validUntil)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.clientBlock}>
          <View style={styles.clientColumn}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.clientLabel}>Razón social / Nombre</Text>
            <Text style={styles.clientValue}>{input.clientName || 'Sin cliente registrado'}</Text>
            {input.organizationName && input.organizationName !== input.clientName ? (
              <>
                <Text style={styles.clientLabel}>Organización</Text>
                <Text style={styles.clientValue}>{input.organizationName}</Text>
              </>
            ) : null}
            <Text style={styles.clientLabel}>Dirección</Text>
            <Text style={styles.clientValue}>—</Text>
          </View>
          <View style={styles.clientColumn}>
            <Text style={styles.sectionTitle}>Detalles</Text>
            <Text style={styles.clientLabel}>Moneda</Text>
            <Text style={styles.clientValue}>{currency}</Text>
            <Text style={styles.clientLabel}>N° de cotización</Text>
            <Text style={styles.clientValue}>{input.quotationNumber}</Text>
            <Text style={styles.clientLabel}>Versión</Text>
            <Text style={styles.clientValue}>v{input.versionNumber}</Text>
          </View>
        </View>

        {input.description ? (
          <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionText}>{input.description}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Detalle de la propuesta</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colLabel]}>Descripción</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unidad</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio unitario</Text>
            <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {input.lineItems.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colLabel]}>
                Sin ítems en esta versión.
              </Text>
            </View>
          ) : (
            input.lineItems.map((item, idx) => (
              <View
                key={`${item.label}-${idx}`}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
                wrap={false}
              >
                <View style={styles.colLabel}>
                  <Text style={styles.cellLabel}>{item.label}</Text>
                  {item.description ? (
                    <Text style={styles.cellDescription}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={[styles.cellText, styles.colQty]}>{formatQuantity(item.quantity)}</Text>
                <Text style={[styles.cellText, styles.colUnit]}>{item.unit || 'unit'}</Text>
                <Text style={[styles.cellText, styles.colPrice]}>
                  {formatCurrency(item.unitPrice, currency)}
                </Text>
                <Text style={[styles.cellText, styles.colSubtotal]}>
                  {formatCurrency(item.subtotalAfterDiscount, currency)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(input.totals.subtotal, currency)}</Text>
          </View>
          {input.totals.totalDiscount > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Descuento</Text>
              <Text style={styles.totalsValue}>
                -{formatCurrency(input.totals.totalDiscount, currency)}
              </Text>
            </View>
          ) : null}
          <View style={styles.totalsRowFinal}>
            <Text style={styles.totalsLabelFinal}>Total</Text>
            <Text style={styles.totalsValueFinal}>
              {formatCurrency(input.totals.total, currency)}
            </Text>
          </View>
        </View>

        {orderedTerms.length > 0 ? (
          <View style={styles.termsBlock}>
            <Text style={styles.sectionTitle}>Términos y condiciones</Text>
            {orderedTerms.map((term, idx) => (
              <View key={`${term.title}-${idx}`} style={styles.termItem} wrap={false}>
                <Text style={styles.termTitle}>{term.title}</Text>
                <Text style={styles.termBody}>{term.bodyResolved}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generado por Greenhouse · Efeonce Group · {todayLabel()}
          </Text>
          <Text style={styles.footerText}>Efeonce Group SpA · Chile</Text>
        </View>
      </Page>
    </Document>
  )
}
