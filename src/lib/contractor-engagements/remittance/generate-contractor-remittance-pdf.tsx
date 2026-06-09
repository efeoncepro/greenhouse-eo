import 'server-only'

/**
 * TASK-960 Slice 3 — Contractor Remittance Advice ("Comprobante de Pago") PDF.
 *
 * react-pdf renderer that consumes the SAME `RemittancePresentation` struct as the
 * MUI viewer → zero content drift (pattern TASK-758). Reproduces the APPROVED viewer
 * visual direction: ONE accent (green `#2E7D32` on the net), neutral document title,
 * neutral regime chip, neutral disclaimer box, Efeonce logo as the only brand mark.
 * NO signature — a remittance advice does not require one (approved mockup decision).
 *
 * Mirrors the TASK-758 receipt PDF infrastructure (logo data-URI, Geist (canonical body font, DESIGN.md),
 * StyleSheet, renderToStream → Buffer) but with the OPPOSITE legal framing: no
 * "líquido a pagar" laboral; a non-employment disclaimer; references the provider's
 * own tax document.
 */

import fs from 'fs'
import path from 'path'

import { Fragment } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'

import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'
import { getPdfTypography } from '@/lib/finance/pdf/pdf-typography'

import { axisSemanticSubValues } from '@/lib/design-tokens/semantic-sub-values'

import type { RemittancePresentation } from './types'

// TASK-1043 — tipografía derivada del SoT (familia + peso). Tamaños en pt
// propios del medio; las familias salen del adapter (cero 'Geist Bold' literal).
const t = getPdfTypography()

const LOGO_PATH = path.join(process.cwd(), 'public/branding/logo-full.png')
let cachedLogoDataUri: string | null | undefined

const getLogoDataUri = (): string | null => {
  if (cachedLogoDataUri !== undefined) return cachedLogoDataUri

  try {
    const logoBytes = fs.readFileSync(LOGO_PATH)

    cachedLogoDataUri = `data:image/png;base64,${logoBytes.toString('base64')}`
  } catch (error) {
    console.warn('[remittance-pdf] Logo asset unavailable; rendering text fallback.', {
      logoPath: LOGO_PATH,
      error: error instanceof Error ? error.message : String(error)
    })
    cachedLogoDataUri = null
  }

  return cachedLogoDataUri
}

/**
 * Bump whenever the remittance PDF template changes (branding, layout, fields,
 * colors). Stale cached PDFs with a different version are lazily regenerated.
 *
 * v1 (2026-05-31, TASK-960): one-accent sober legal layout consuming the canonical
 * RemittancePresentation struct (issuer → beneficiary + provider doc → breakdown →
 * payment → non-employment disclaimer). Bilingual via the resolved struct.
 * v2 (2026-05-31): body font migrated Helvetica → Geist (canonical body, DESIGN.md)
 * via ensurePdfFontsRegistered() — aligns the contractor remittance with the canonical
 * font so it matches the contractor payment report (TASK-980). Slogan stays Poppins.
 * v3 (2026-06-06, TASK-1043): tipografía gobernada por el adapter `getPdfTypography()`
 * (familia + peso derivan del SoT; tamaños pt propios del medio). El neto pasa a
 * `kpiValue` (Geist ExtraBold 14, canon SoT KPI=800); labels normalizados ±0.5pt.
 */
export const REMITTANCE_TEMPLATE_VERSION = '3'

const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#5c5c5c'
const TEXT_FAINT = '#999999'
const BORDER_LIGHT = '#e0e0e0'
// Success ink (AA on white): canonical token SoT (TASK-1048 → Fase B success.ink).
const NET_ACCENT = axisSemanticSubValues.success.ink
const NEUTRAL_BG = '#f7f7f7'
const CHIP_BG = '#eeeeee'

const money = (amount: number, currency: string, locale: RemittancePresentation['locale']): string =>
  formatCurrency(amount, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, locale)

const s = StyleSheet.create({
  page: {
    ...t.body,
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 56,
    color: TEXT_PRIMARY
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  issuerBlock: { flexDirection: 'column', maxWidth: 280 },
  logo: { width: 110, height: 26, objectFit: 'contain', marginBottom: 10 },
  issuerName: { ...t.bodyStrong, marginBottom: 2 },
  issuerLine: { ...t.caption, color: TEXT_MUTED, marginBottom: 1 },

  headerRight: { flexDirection: 'column', alignItems: 'flex-end', maxWidth: 240 },
  title: { ...t.titleLg, color: TEXT_PRIMARY, marginBottom: 6 },
  chip: {
    ...t.micro,
    backgroundColor: CHIP_BG,
    color: TEXT_MUTED,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
    marginBottom: 6
  },
  number: { ...t.subtitle, marginBottom: 2 },
  paymentDate: { ...t.caption, color: TEXT_MUTED },

  divider: { borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT, marginVertical: 16 },

  partiesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  partyCol: { flexDirection: 'column', width: '48%' },
  sectionLabel: {
    ...t.micro,
    color: TEXT_FAINT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5
  },
  partyName: { ...t.bodyStrong, marginBottom: 2 },
  partyLine: { ...t.caption, color: TEXT_MUTED, marginBottom: 1 },

  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 7
  },
  breakdownLabel: { ...t.body, color: TEXT_MUTED },
  breakdownAmount: { ...t.body, color: TEXT_PRIMARY },
  breakdownAmountMuted: { ...t.body, color: TEXT_MUTED },
  netDivider: { borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT, marginVertical: 6 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  netLabel: { ...t.numericAmount },
  netAmount: { ...t.kpiValue, color: NET_ACCENT },
  fxCaption: { ...t.micro, color: TEXT_MUTED, marginTop: 5 },

  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },

  disclaimerBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: NEUTRAL_BG,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    borderRadius: 4
  },
  disclaimerText: { ...t.caption, color: TEXT_MUTED, lineHeight: 1.4 },

  footerNote: { ...t.micro, color: TEXT_FAINT, marginTop: 16 }
})

const RemittanceDocument = ({ presentation }: { presentation: RemittancePresentation }) => {
  const { issuer, beneficiary, providerDocument, breakdown, fx, payment, labels, disclaimer, locale } =
    presentation

  const logo = getLogoDataUri()

  const deductionRows = breakdown.filter(r => r.kind !== 'net')
  const netRow = breakdown.find(r => r.kind === 'net')

  return (
    <Document title={`${labels.title} ${presentation.number}`}>
      <Page size='A4' style={s.page}>
        {/* Header: issuer (Operating Entity) + document identity */}
        <View style={s.header}>
          <View style={s.issuerBlock}>
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <Text style={s.issuerName}>{issuer.legalName}</Text>
            <Text style={s.issuerLine}>
              {issuer.taxIdLabel} {issuer.taxId}
            </Text>
            <Text style={s.issuerLine}>{issuer.address}</Text>
          </View>

          <View style={s.headerRight}>
            <Text style={s.title}>{labels.title}</Text>
            <Text style={s.chip}>{labels.regimeLabel}</Text>
            <Text style={s.number}>
              {labels.numberLabel} {presentation.number}
            </Text>
            <Text style={s.paymentDate}>
              {payment.dateLabel}: {payment.dateValue}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Parties: payee | provider document */}
        <View style={s.partiesRow}>
          <View style={s.partyCol}>
            <Text style={s.sectionLabel}>{labels.beneficiarySection}</Text>
            <Text style={s.partyName}>{beneficiary.name}</Text>
            <Text style={s.partyLine}>
              {beneficiary.taxIdLabel}: {beneficiary.taxId}
            </Text>
            <Text style={s.partyLine}>
              {beneficiary.countryLabel}: {beneficiary.country}
            </Text>
          </View>
          <View style={s.partyCol}>
            <Text style={s.sectionLabel}>{labels.providerDocSection}</Text>
            <Text style={s.partyName}>{providerDocument.label}</Text>
            <Text style={s.partyLine}>{providerDocument.value}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Breakdown: gross → withholding → net */}
        <Text style={s.sectionLabel}>{labels.breakdownSection}</Text>
        {deductionRows.map(row => (
          <View key={row.id} style={s.breakdownRow}>
            <Text style={s.breakdownLabel}>{row.label}</Text>
            <Text style={row.negative ? s.breakdownAmountMuted : s.breakdownAmount}>
              {row.negative ? '- ' : ''}
              {money(row.amount, row.currency, locale)}
            </Text>
          </View>
        ))}

        <View style={s.netDivider} />

        {netRow ? (
          <Fragment>
            <View style={s.netRow}>
              <Text style={s.netLabel}>{netRow.label}</Text>
              <Text style={s.netAmount}>{money(netRow.amount, netRow.currency, locale)}</Text>
            </View>
            {fx ? <Text style={s.fxCaption}>{fx.value}</Text> : null}
          </Fragment>
        ) : null}

        <View style={s.divider} />

        {/* Payment details */}
        <View style={s.partiesRow}>
          <View style={s.partyCol}>
            <Text style={s.sectionLabel}>{payment.methodLabel}</Text>
            <Text style={s.partyLine}>{payment.methodValue}</Text>
          </View>
          <View style={s.partyCol}>
            <Text style={s.sectionLabel}>{payment.referenceLabel}</Text>
            <Text style={s.partyLine}>{payment.referenceValue}</Text>
          </View>
        </View>

        {/* Non-employment disclaimer (load-bearing) */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerText}>{disclaimer}</Text>
        </View>

        <Text style={s.footerNote}>{labels.footerNote}</Text>
      </Page>
    </Document>
  )
}

/** Render a remittance advice presentation to a PDF Buffer. */
export const generateContractorRemittancePdf = async (
  presentation: RemittancePresentation
): Promise<Buffer> => {
  await ensurePdfFontsRegistered()
  const stream = await renderToStream(<RemittanceDocument presentation={presentation} />)

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}
