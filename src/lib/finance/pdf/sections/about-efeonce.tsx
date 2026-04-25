import 'server-only'

import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { PdfColors, PdfFonts, PdfRadii, PdfSpacing, SUB_BRAND_ASSETS } from '../tokens'

import { PageFooter, PageHeader, SectionHeading, publicAssetPath, sectionBodyStyle } from './shared'

import type { QuotationPdfLegalEntity, QuotationPdfSubBrand } from '../contracts'

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
    fontSize: 11,
    color: PdfColors.text,
    lineHeight: 1.6,
    marginBottom: PdfSpacing.s5
  },
  brands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PdfSpacing.s4
  },
  brandCard: {
    width: '48%',
    backgroundColor: PdfColors.paper,
    borderWidth: 1,
    borderColor: PdfColors.divider,
    borderStyle: 'solid',
    borderRadius: PdfRadii.md,
    padding: PdfSpacing.s4
  },
  brandCardActive: { borderWidth: 2, borderColor: PdfColors.accent },
  brandHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PdfSpacing.s3
  },
  brandLogo: { height: 28, width: 'auto' },
  brandChip: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1,
    color: PdfColors.paper,
    backgroundColor: PdfColors.accent,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    textTransform: 'uppercase'
  },
  brandPitch: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.textMuted,
    lineHeight: 1.5
  },
  stats: {
    marginTop: PdfSpacing.s6,
    padding: PdfSpacing.s5,
    backgroundColor: PdfColors.primary,
    borderRadius: PdfRadii.md,
    flexDirection: 'row',
    gap: PdfSpacing.s4
  },
  stat: { flex: 1 },
  statValue: {
    fontFamily: PdfFonts.heading,
    fontSize: 22,
    color: PdfColors.paper,
    lineHeight: 1.05
  },
  statLabel: {
    fontFamily: PdfFonts.body,
    fontSize: 8,
    color: PdfColors.paperOnPrimary,
    marginTop: PdfSpacing.s1,
    letterSpacing: 0.5
  }
})

const BRAND_ORDER: Array<keyof typeof SUB_BRAND_ASSETS> = ['globe', 'wave', 'reach', 'efeonce']

const BRAND_PITCHES: Record<keyof typeof SUB_BRAND_ASSETS, string> = {
  globe: 'Marketing performance + media multicanal para marcas enterprise en mercados regulados (banca, salud, retail).',
  wave: 'Producto digital y data: dashboards, telemetría, analítica avanzada para equipos de negocio.',
  reach: 'Branding, contenido y storytelling para construir marcas con atributos diferenciadores.',
  efeonce: 'Operación, finanzas, governance corporativo y plataforma tecnológica compartida.'
}

interface AboutEfeoncePageProps {
  quotationNumber: string
  versionNumber: number
  activeSubBrand: QuotationPdfSubBrand
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}

export const AboutEfeoncePage = (props: AboutEfeoncePageProps) => (
  <Page size='A4' style={styles.page}>
    <PageHeader quotationNumber={props.quotationNumber} versionNumber={props.versionNumber} />
    <SectionHeading
      eyebrow='02 · Quiénes somos'
      title='Una agencia, cuatro especializaciones'
      subtitle='Efeonce opera bajo cuatro líneas de negocio que comparten plataforma operativa, governance y reportería.'
    />
    <View style={styles.body}>
      <Text style={styles.intro}>
        Somos un grupo agencia con sede en Santiago de Chile, footprint en LATAM
        y +12 años entregando programas de crecimiento para clientes enterprise.
      </Text>
      <View style={styles.brands}>
        {BRAND_ORDER.map(code => {
          const assets = SUB_BRAND_ASSETS[code]
          const isActive = code === props.activeSubBrand

          return (
            <View
              key={code}
              style={[styles.brandCard, isActive ? styles.brandCardActive : {}]}
            >
              <View style={styles.brandHead}>
                <Image
                  src={publicAssetPath(assets.fullLogoPath)}
                  style={styles.brandLogo}
                />
                {isActive ? <Text style={styles.brandChip}>Esta propuesta</Text> : null}
              </View>
              <Text style={styles.brandPitch}>{BRAND_PITCHES[code]}</Text>
            </View>
          )
        })}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>+120</Text>
          <Text style={styles.statLabel}>Profesionales</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Años en mercado</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Países LATAM</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>+80</Text>
          <Text style={styles.statLabel}>Marcas activas</Text>
        </View>
      </View>
    </View>
    <PageFooter {...props} />
  </Page>
)
