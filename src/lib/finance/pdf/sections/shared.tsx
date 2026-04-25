import 'server-only'

import { resolve } from 'node:path'

import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'

import {
  DEFAULT_LEGAL_ENTITY,
  PdfColors,
  PdfFonts,
  PdfPage,
  PdfRadii,
  PdfSpacing,
  SUB_BRAND_ASSETS,
  type SubBrandCode
} from '../tokens'

import type { QuotationPdfLegalEntity } from '../contracts'

/**
 * Resolves an asset path inside `public/` to an absolute filesystem path
 * usable by `@react-pdf/renderer`'s <Image> component on the server.
 *
 * `process.cwd()` resolves to the Next.js root at runtime in API routes.
 */
export const publicAssetPath = (relativePath: string): string =>
  resolve(process.cwd(), 'public', relativePath)

const sharedStyles = StyleSheet.create({
  pageHeader: {
    paddingTop: PdfSpacing.s5,
    paddingBottom: PdfSpacing.s3,
    paddingHorizontal: PdfPage.paddingX,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pageHeaderLogo: {
    height: 24,
    width: 'auto'
  },
  pageHeaderMeta: {
    fontFamily: PdfFonts.body,
    fontSize: 8,
    color: PdfColors.textMuted,
    textAlign: 'right'
  },
  pageHeaderMetaStrong: {
    fontFamily: PdfFonts.bodyBold,
    color: PdfColors.primary
  },

  pageFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: PdfSpacing.s3,
    paddingBottom: PdfSpacing.s3,
    paddingHorizontal: PdfPage.paddingX,
    borderTopWidth: 1,
    borderTopColor: PdfColors.divider,
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: {
    fontFamily: PdfFonts.body,
    fontSize: 7,
    color: PdfColors.textMuted
  },
  footerLegal: {
    flex: 1,
    maxWidth: '60%'
  },
  footerLegalName: {
    fontFamily: PdfFonts.bodyBold,
    color: PdfColors.primary
  },
  footerPagination: {
    textAlign: 'right'
  },
  footerPaginationStrong: {
    fontFamily: PdfFonts.bodyBold,
    color: PdfColors.primary
  },

  sectionHeading: {
    paddingTop: PdfSpacing.s8,
    paddingBottom: PdfSpacing.s4,
    paddingHorizontal: PdfPage.paddingX
  },
  sectionEyebrow: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 2,
    color: PdfColors.accent,
    marginBottom: PdfSpacing.s2,
    textTransform: 'uppercase'
  },
  sectionTitle: {
    fontFamily: PdfFonts.heading,
    fontSize: 22,
    color: PdfColors.primary,
    letterSpacing: -0.3,
    lineHeight: 1.15
  },
  sectionSubtitle: {
    fontFamily: PdfFonts.body,
    fontSize: 10,
    color: PdfColors.textMuted,
    marginTop: PdfSpacing.s2,
    lineHeight: 1.5,
    maxWidth: 430
  },

  sectionBody: {
    paddingHorizontal: PdfPage.paddingX,
    paddingBottom: PdfSpacing.s6
  }
})

/**
 * PageHeader — top band shown on every non-cover page.
 */
export const PageHeader = ({ quotationNumber, versionNumber }: {
  quotationNumber: string
  versionNumber: number
}) => (
  <View style={sharedStyles.pageHeader} fixed>
    <Image
      src={publicAssetPath('branding/logo-full.png')}
      style={sharedStyles.pageHeaderLogo}
    />
    <Text style={sharedStyles.pageHeaderMeta}>
      Propuesta{' '}
      <Text style={sharedStyles.pageHeaderMetaStrong}>
        {quotationNumber} v{versionNumber}
      </Text>
    </Text>
  </View>
)

/**
 * PageFooter — fixed at the bottom of every non-cover page. Renders legal
 * issuer details + pagination "Página N de M".
 */
export const PageFooter = ({
  quotationNumber,
  versionNumber,
  pageNumber,
  totalPages,
  legalEntity
}: {
  quotationNumber: string
  versionNumber: number
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}) => (
  <View style={sharedStyles.pageFooter} fixed>
    <View style={sharedStyles.footerLegal}>
      <Text style={sharedStyles.footerText}>
        <Text style={sharedStyles.footerLegalName}>{legalEntity.legalName}</Text>
        {' · RUT '}{legalEntity.taxId}{' · Confidencial · No distribuir sin autorización'}
      </Text>
    </View>
    <View style={sharedStyles.footerPagination}>
      <Text style={sharedStyles.footerText}>
        {quotationNumber} v{versionNumber}
        {' · Página '}
        <Text style={sharedStyles.footerPaginationStrong}>{pageNumber}</Text>
        {' de '}
        <Text style={sharedStyles.footerPaginationStrong}>{totalPages}</Text>
      </Text>
    </View>
  </View>
)

/**
 * SectionHeading — the standardized eyebrow + title + subtitle block at
 * the top of every non-cover section.
 */
export const SectionHeading = ({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) => (
  <View style={sharedStyles.sectionHeading}>
    <Text style={sharedStyles.sectionEyebrow}>{eyebrow}</Text>
    <Text style={sharedStyles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={sharedStyles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
)

export const sectionBodyStyle = sharedStyles.sectionBody

/**
 * Resolves the legal entity to use, falling back to DEFAULT_LEGAL_ENTITY
 * when the input is null/undefined.
 */
export const resolveLegalEntity = (
  input: QuotationPdfLegalEntity | null | undefined
): QuotationPdfLegalEntity => input ?? DEFAULT_LEGAL_ENTITY

/**
 * Returns the asset bundle (full logo + isotipo + label + color) for a
 * given sub-brand code.
 */
export const resolveSubBrandAssets = (code: SubBrandCode | undefined) =>
  SUB_BRAND_ASSETS[code ?? 'efeonce']

export const baseRadii = PdfRadii
export const baseColors = PdfColors
export const baseFonts = PdfFonts
export const baseSpacing = PdfSpacing
export const basePage = PdfPage
