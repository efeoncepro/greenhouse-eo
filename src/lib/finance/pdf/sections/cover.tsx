import 'server-only'

import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { formatDateDMY } from '../formatters'
import { PdfColors, PdfFonts, PdfPage, PdfRadii, PdfSpacing } from '../tokens'

import { publicAssetPath, resolveLegalEntity, resolveSubBrandAssets } from './shared'

import type {
  QuotationPdfLegalEntity,
  QuotationPdfSalesRep,
  QuotationPdfSubBrand
} from '../contracts'

const styles = StyleSheet.create({
  page: {
    backgroundColor: PdfColors.paper,
    color: PdfColors.text,
    paddingBottom: 0,
    fontFamily: PdfFonts.body,
    fontSize: 10
  },

  header: {
    paddingTop: PdfPage.paddingY,
    paddingHorizontal: PdfPage.paddingX,
    paddingBottom: PdfSpacing.s6,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PdfSpacing.s3
  },
  brandLogo: { height: 40, width: 'auto' },
  brandDivider: { width: 1, height: 32, backgroundColor: PdfColors.divider },
  subBrand: { flexDirection: 'row', alignItems: 'center', gap: PdfSpacing.s2 },
  subBrandIsotipo: { height: 28, width: 'auto' },
  subBrandLabel: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.2,
    color: PdfColors.textMuted,
    textTransform: 'uppercase'
  },
  meta: { alignItems: 'flex-end' },
  metaEyebrow: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.2,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  metaId: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 11,
    color: PdfColors.primary,
    letterSpacing: 0.5
  },

  hero: {
    paddingTop: PdfSpacing.s12,
    paddingHorizontal: PdfPage.paddingX,
    paddingBottom: PdfSpacing.s10
  },
  heroEyebrow: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 8,
    letterSpacing: 2,
    color: PdfColors.accent,
    textTransform: 'uppercase',
    marginBottom: PdfSpacing.s2
  },
  heroTitle: {
    fontFamily: PdfFonts.heading,
    fontSize: 36,
    color: PdfColors.primary,
    letterSpacing: -0.5,
    lineHeight: 1.05,
    marginBottom: PdfSpacing.s3
  },
  heroSubtitle: {
    fontFamily: PdfFonts.body,
    fontSize: 11,
    color: PdfColors.text,
    lineHeight: 1.5,
    maxWidth: 380
  },

  parties: {
    paddingTop: PdfSpacing.s6,
    paddingHorizontal: PdfPage.paddingX,
    paddingBottom: PdfSpacing.s8,
    flexDirection: 'row',
    gap: PdfSpacing.s8
  },
  party: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: PdfColors.primary,
    borderTopStyle: 'solid',
    paddingTop: PdfSpacing.s3
  },
  partyEyebrow: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.5,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: PdfSpacing.s2
  },
  partyName: {
    fontFamily: PdfFonts.heading,
    fontSize: 14,
    color: PdfColors.primary,
    lineHeight: 1.2,
    marginBottom: 2
  },
  partyDetail: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.textMuted,
    lineHeight: 1.5
  },
  partyContact: {
    marginTop: PdfSpacing.s2,
    paddingTop: PdfSpacing.s2,
    borderTopWidth: 1,
    borderTopColor: PdfColors.divider,
    borderTopStyle: 'solid'
  },
  partyContactRow: {
    flexDirection: 'row',
    paddingVertical: 1
  },
  partyContactLabel: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    width: 60
  },
  partyContactValue: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.text,
    flex: 1
  },

  highlights: {
    marginHorizontal: PdfPage.paddingX,
    marginBottom: PdfSpacing.s6,
    padding: PdfSpacing.s4,
    paddingLeft: PdfSpacing.s5,
    backgroundColor: PdfColors.surface,
    borderRadius: PdfRadii.md,
    borderLeftWidth: 3,
    borderLeftColor: PdfColors.accent,
    borderLeftStyle: 'solid',
    flexDirection: 'row',
    gap: PdfSpacing.s5
  },
  highlight: { flex: 1 },
  highlightLabel: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.2,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: PdfSpacing.s1
  },
  highlightValue: {
    fontFamily: PdfFonts.heading,
    fontSize: 16,
    color: PdfColors.primary,
    lineHeight: 1.1
  },
  highlightHint: {
    fontFamily: PdfFonts.body,
    fontSize: 8,
    color: PdfColors.textMuted,
    marginTop: 2
  },

  validity: {
    marginHorizontal: PdfPage.paddingX,
    paddingVertical: PdfSpacing.s3,
    paddingHorizontal: PdfSpacing.s4,
    borderWidth: 1,
    borderColor: PdfColors.divider,
    borderStyle: 'solid',
    borderRadius: PdfRadii.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  validityText: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.text,
    flex: 1,
    paddingRight: PdfSpacing.s4
  },
  validityDate: {
    fontFamily: PdfFonts.bodyBold,
    color: PdfColors.primary
  },
  validityChip: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1,
    color: PdfColors.paper,
    backgroundColor: PdfColors.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    textTransform: 'uppercase'
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: PdfSpacing.s4,
    paddingHorizontal: PdfPage.paddingX,
    borderTopWidth: 1,
    borderTopColor: PdfColors.divider,
    borderTopStyle: 'solid',
    backgroundColor: PdfColors.paper,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  footerLegal: {
    fontFamily: PdfFonts.body,
    fontSize: 7,
    color: PdfColors.textMuted,
    lineHeight: 1.4,
    flex: 1,
    maxWidth: '60%'
  },
  footerLegalName: {
    fontFamily: PdfFonts.bodyBold,
    color: PdfColors.primary
  },
  footerPage: {
    fontFamily: PdfFonts.body,
    fontSize: 7,
    color: PdfColors.textMuted,
    textAlign: 'right'
  },
  footerPageStrong: {
    fontFamily: PdfFonts.bodyBold,
    color: PdfColors.primary
  }
})

interface CoverPageProps {
  quotationNumber: string
  versionNumber: number
  quoteDate: string
  validUntil: string | null
  clientName: string | null
  organizationName: string | null
  heroTitle: string
  heroSubtitle: string | null
  subBrand: QuotationPdfSubBrand
  salesRep: QuotationPdfSalesRep | null
  legalEntity: QuotationPdfLegalEntity | null
  highlights: Array<{ label: string; value: string; hint: string | null }>
  totalPages: number
}

export const CoverPage = (props: CoverPageProps) => {
  const subBrandAssets = resolveSubBrandAssets(props.subBrand)
  const legal = resolveLegalEntity(props.legalEntity)

  return (
    <Page size='A4' style={styles.page}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image
            src={publicAssetPath('branding/logo-full.png')}
            style={styles.brandLogo}
          />
          {props.subBrand !== 'efeonce' ? (
            <>
              <View style={styles.brandDivider} />
              <View style={styles.subBrand}>
                <Image
                  src={publicAssetPath(subBrandAssets.fullLogoPath)}
                  style={styles.subBrandIsotipo}
                />
                <Text style={styles.subBrandLabel}>Business Line</Text>
              </View>
            </>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaEyebrow}>Propuesta</Text>
          <Text style={styles.metaId}>
            {props.quotationNumber} · v{props.versionNumber}
          </Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Propuesta Comercial</Text>
        <Text style={styles.heroTitle}>{props.heroTitle}</Text>
        {props.heroSubtitle ? (
          <Text style={styles.heroSubtitle}>{props.heroSubtitle}</Text>
        ) : null}
      </View>

      <View style={styles.parties}>
        <View style={styles.party}>
          <Text style={styles.partyEyebrow}>Preparada para</Text>
          <Text style={styles.partyName}>
            {props.clientName ?? 'Sin cliente registrado'}
          </Text>
          {props.organizationName && props.organizationName !== props.clientName ? (
            <Text style={styles.partyDetail}>{props.organizationName}</Text>
          ) : null}
        </View>
        <View style={styles.party}>
          <Text style={styles.partyEyebrow}>Preparada por</Text>
          <Text style={styles.partyName}>
            {props.salesRep?.name ?? 'Equipo Efeonce'}
          </Text>
          {props.salesRep?.role ? (
            <Text style={styles.partyDetail}>{props.salesRep.role}</Text>
          ) : null}
          {props.salesRep?.email || props.salesRep?.phone ? (
            <View style={styles.partyContact}>
              {props.salesRep?.email ? (
                <View style={styles.partyContactRow}>
                  <Text style={styles.partyContactLabel}>Email</Text>
                  <Text style={styles.partyContactValue}>{props.salesRep.email}</Text>
                </View>
              ) : null}
              {props.salesRep?.phone ? (
                <View style={styles.partyContactRow}>
                  <Text style={styles.partyContactLabel}>Teléfono</Text>
                  <Text style={styles.partyContactValue}>{props.salesRep.phone}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {props.highlights.length > 0 ? (
        <View style={styles.highlights}>
          {props.highlights.map((h, idx) => (
            <View key={`${h.label}-${idx}`} style={styles.highlight}>
              <Text style={styles.highlightLabel}>{h.label}</Text>
              <Text style={styles.highlightValue}>{h.value}</Text>
              {h.hint ? <Text style={styles.highlightHint}>{h.hint}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {props.validUntil ? (
        <View style={styles.validity}>
          <Text style={styles.validityText}>
            Esta propuesta es válida hasta el{' '}
            <Text style={styles.validityDate}>{formatDateDMY(props.validUntil)}</Text>
            {' '}— sujeta a los términos y condiciones detallados al final del documento.
          </Text>
          <Text style={styles.validityChip}>Confidencial</Text>
        </View>
      ) : null}

      <View style={styles.footer} fixed>
        <Text style={styles.footerLegal}>
          <Text style={styles.footerLegalName}>{legal.legalName}</Text>
          {' · RUT '}{legal.taxId}{' · '}{legal.address}
          {legal.website ? ` · ${legal.website}` : ''}
        </Text>
        <Text style={styles.footerPage}>
          Propuesta {props.quotationNumber} v{props.versionNumber}
          {'\n'}
          Página <Text style={styles.footerPageStrong}>1</Text>
          {' de '}
          <Text style={styles.footerPageStrong}>{props.totalPages}</Text>
        </Text>
      </View>
    </Page>
  )
}
