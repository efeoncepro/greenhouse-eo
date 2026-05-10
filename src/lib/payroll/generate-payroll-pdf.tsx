import 'server-only'

import fs from 'fs'
import path from 'path'

import { Fragment } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'
import { formatCurrency as formatLocaleCurrency } from '@/lib/format'

import { getPayrollEntries, getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { getOperatingEntityIdentity, type OperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { getAdjustmentsByEntry } from '@/lib/payroll/adjustments/apply-adjustment'
import {
  getEntryAdjustmentBreakdown,
  type EntryAdjustmentBreakdown
} from '@/lib/payroll/adjustments/breakdown'
import {
  buildReceiptPresentation,
  groupEntriesByRegime,
  RECEIPT_REGIME_BADGES,
  RECEIPT_REGIME_DISPLAY_ORDER,
  type ReceiptInfoBlock,
  type ReceiptInfoBlockVariant,
  type ReceiptPresenterEntry,
  type ReceiptRegime
} from '@/lib/payroll/receipt-presenter'

const LOGO_PATH = path.join(process.cwd(), 'public/branding/logo-full.png')
let cachedLogoDataUri: string | null | undefined

const getLogoDataUri = (): string | null => {
  if (cachedLogoDataUri !== undefined) return cachedLogoDataUri

  try {
    const logoBytes = fs.readFileSync(LOGO_PATH)

    cachedLogoDataUri = `data:image/png;base64,${logoBytes.toString('base64')}`
  } catch (error) {
    console.warn('[payroll-pdf] Logo asset unavailable; rendering text fallback.', {
      logoPath: LOGO_PATH,
      error: error instanceof Error ? error.message : String(error)
    })
    cachedLogoDataUri = null
  }

  return cachedLogoDataUri
}

/**
 * Bump this constant whenever the receipt/report PDF template changes
 * (branding, layout, fields, colors). Stale cached PDFs with a different
 * version are lazily regenerated on next access.
 *
 * v4 (2026-05-04, TASK-758): canonical 4-regime presenter consumed via
 * `buildReceiptPresentation` (chile_dependent / honorarios / international_deel
 * / international_internal). Adds `Tipo de contrato` field, contextual employee
 * field per regime, gratificación legal, salud split obl/vol, infoBlocks
 * (Boleta SII / Pago Deel / Régimen internacional), excluded terminal state
 * with degraded hero, "Monto bruto registrado" hero variant for Deel, and
 * removes filas-fantasma in honorarios/Deel.
 */
export const RECEIPT_TEMPLATE_VERSION = '4'

const BRAND_BLUE = '#023c70'
const BRAND_LIGHT = '#F7F9FC'
const BRAND_ACCENT_BG = '#E8EFF7'
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#666666'
const TEXT_FAINT = '#999999'
const BORDER_LIGHT = '#e0e0e0'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const fmtCurrency = (value: number | null, currency: string): string => {
  return formatLocaleCurrency(
    value,
    currency as 'CLP' | 'USD',
    currency === 'USD' ? { currencySymbol: 'US$' } : {},
    currency === 'USD' ? 'en-US' : undefined
  )
}

// ─── Styles ──────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: TEXT_PRIMARY
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  headerRight: {
    textAlign: 'right' as const,
    alignItems: 'flex-end' as const
  },
  companyBlock: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND_BLUE,
    paddingLeft: 8,
    marginTop: 6
  },
  companyText: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 1
  },
  headerAccent: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND_BLUE,
    marginBottom: 16
  },
  periodLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY
  },
  periodSub: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2
  },

  // ── Document title ──
  docTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_BLUE,
    letterSpacing: 2,
    textAlign: 'center' as const,
    marginBottom: 16
  },

  // ── Employee info box ──
  employeeBox: {
    backgroundColor: BRAND_LIGHT,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const
  },
  employeeField: {
    width: '50%',
    marginBottom: 6
  },
  employeeLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 1
  },
  employeeValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold'
  },

  // ── Section headers ──
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 14,
    marginBottom: 6
  },
  sectionAccent: {
    width: 3,
    height: 12,
    backgroundColor: BRAND_BLUE,
    marginRight: 6
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_BLUE,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const
  },

  // ── Table rows ──
  tableRow: {
    flexDirection: 'row' as const,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_LIGHT
  },
  tableRowAlt: {
    backgroundColor: BRAND_LIGHT
  },
  tableLabel: {
    width: '60%',
    fontSize: 9
  },
  tableValue: {
    width: '40%',
    fontSize: 9,
    textAlign: 'right' as const,
    fontFamily: 'Helvetica'
  },
  tableTotalRow: {
    flexDirection: 'row' as const,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1.5,
    borderTopColor: BRAND_BLUE,
    backgroundColor: BRAND_ACCENT_BG
  },
  tableTotalLabel: {
    width: '60%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold'
  },
  tableTotalValue: {
    width: '40%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right' as const
  },

  // ── Net total hero ──
  netHero: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: BRAND_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16
  },
  netHeroLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },
  netHeroValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },

  // ── Degraded hero (excluded terminal state) ──
  netHeroDegraded: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: TEXT_FAINT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    opacity: 0.85
  },

  // ── Info blocks (info / warning / error) ──
  infoBlock: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0375DB',
    backgroundColor: '#EAF4FB',
    borderRadius: 2
  },
  infoBlockWarning: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#d99c1f',
    backgroundColor: '#FFF8E6',
    borderRadius: 2
  },
  infoBlockError: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#c0392b',
    backgroundColor: '#FFF0F0',
    borderRadius: 2
  },
  infoBlockTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY,
    marginBottom: 3
  },
  infoBlockBody: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.45
  },
  infoBlockMeta: {
    fontSize: 8,
    color: TEXT_FAINT,
    marginTop: 4,
    letterSpacing: 0.4
  },

  // ── Footer ──
  footer: {
    position: 'absolute' as const,
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: BORDER_LIGHT,
    paddingTop: 6,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const
  },
  footerText: {
    fontSize: 7,
    color: TEXT_FAINT
  },
  footerCenter: {
    fontSize: 7,
    color: TEXT_FAINT,
    textAlign: 'center' as const
  },

  // ── Period report table ──
  reportTableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: BRAND_BLUE,
    paddingVertical: 5,
    paddingHorizontal: 4
  },
  reportTableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7
  },
  reportTableRow: {
    flexDirection: 'row' as const,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_LIGHT
  },
  reportTableRowAlt: {
    backgroundColor: BRAND_LIGHT
  },
  reportTableCell: {
    fontSize: 7
  },
  reportTableCellRight: {
    fontSize: 7,
    textAlign: 'right' as const
  },
  reportTotalsRow: {
    flexDirection: 'row' as const,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: BRAND_ACCENT_BG,
    borderTopWidth: 1.5,
    borderTopColor: BRAND_BLUE
  },
  reportTotalsCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right' as const
  }
})

// ─── Shared components ──────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionAccent} />
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
)

const PdfHeader = ({ operatingEntity, monthName, year, docType, periodId }: {
  operatingEntity: OperatingEntityIdentity | null
  monthName: string
  year: number
  docType: string
  periodId: string
}) => {
  const logoSrc = getLogoDataUri()

  return (
    <>
      <View style={s.header}>
        <View>
          {logoSrc ? (
            <Image src={logoSrc} style={{ width: 120, height: 28 }} />
          ) : (
            <Text style={s.companyText}>Efeonce Greenhouse</Text>
          )}
        <View style={s.companyBlock}>
          <Text style={s.companyText}>{operatingEntity?.legalName ?? 'Efeonce Group SpA'}</Text>
          {operatingEntity?.taxId && <Text style={s.companyText}>{`RUT ${operatingEntity.taxId}`}</Text>}
          {operatingEntity?.legalAddress && <Text style={s.companyText}>{operatingEntity.legalAddress}</Text>}
        </View>
      </View>
      <View style={s.headerRight}>
        <Text style={s.periodLabel}>{`${monthName} ${year}`}</Text>
        <Text style={s.periodSub}>{docType}</Text>
        <Text style={s.periodSub}>{periodId}</Text>
      </View>
    </View>
      <View style={s.headerAccent} />
    </>
  )
}

const PdfFooter = ({ operatingEntity, monthName, year, generatedAt }: {
  operatingEntity: OperatingEntityIdentity | null
  monthName: string
  year: number
  generatedAt: string
}) => (
  <View style={s.footer}>
    <Text style={s.footerText}>{`${operatingEntity?.legalName ?? 'Efeonce Group SpA'} — ${monthName} ${year}`}</Text>
    <Text style={s.footerCenter}>efeoncepro.com</Text>
    <Text style={s.footerText}>{`Generado: ${generatedAt}`}</Text>
  </View>
)

// ─── Period Report PDF ────────────────────────────────────────────

// TASK-782 — 10 columnas canónicas (porcentajes per spec aprobada en mockup).
// Desc. previs. y Retención SII separadas: chile_dependent llena la primera con `—` en la segunda; honorarios al revés.
const COL_WIDTHS = {
  name: '17%',
  regime: '7%',
  currency: '5%',
  base: '9%',
  otd: '8%',
  rpa: '8%',
  gross: '9%',
  prevDeductions: '10%',
  siiRetention: '10%',
  net: '9%'
}

const REGIME_GROUP_LABELS: Record<ReceiptRegime, string> = {
  chile_dependent: 'Chile dependiente',
  honorarios: 'Honorarios',
  international_deel: 'Internacional Deel',
  international_internal: 'Internacional interno'
}

// TASK-782 — currency canónica por régimen para el subtotal row.
const REGIME_CURRENCY: Record<ReceiptRegime, 'CLP' | 'USD'> = {
  chile_dependent: 'CLP',
  honorarios: 'CLP',
  international_deel: 'USD',
  international_internal: 'USD'
}

const formatStatus = (status: string): string => {
  if (status === 'exported') return 'Exportado'
  if (status === 'approved') return 'Aprobado'
  if (status === 'calculated') return 'Calculado'
  if (status === 'reopened') return 'Reabierto'
  if (status === 'draft') return 'Borrador'

  return status
}

// TASK-782 — Excluded entries: bruto/neto = $0, columnas dim "—".
const isExcludedEntry = (entry: PayrollEntry): boolean => {
  return entry.grossTotal === 0 && entry.netTotal === 0
}

const PeriodReportDocument = ({ period, entries, operatingEntity }: { period: PayrollPeriod; entries: PayrollEntry[]; operatingEntity: OperatingEntityIdentity | null }) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const generatedAt = new Date().toISOString().split('T')[0]

  // TASK-782 — group entries by canonical regime using exported helper.
  const groups = groupEntriesByRegime(entries)

  // Per-regime totals + per-currency aggregates.
  const totalsByRegime = RECEIPT_REGIME_DISPLAY_ORDER.map(regime => {
    const groupEntries = groups[regime]
    const isHonorarios = regime === 'honorarios'

    return {
      regime,
      entries: groupEntries,
      count: groupEntries.length,
      totalGross: groupEntries.reduce((sum, e) => sum + e.grossTotal, 0),
      totalNet: groupEntries.reduce((sum, e) => sum + e.netTotal, 0),
      // Previsional deductions: only chile_dependent has them. Honorarios chileTotalDeductions
      // === siiRetentionAmount per motor — DO NOT mix into the previsional pool.
      totalPrevDeductions: regime === 'chile_dependent'
        ? groupEntries.reduce((sum, e) => sum + (e.chileTotalDeductions ?? 0), 0)
        : 0,
      // SII retention: only honorarios.
      totalSiiRetention: isHonorarios
        ? groupEntries.reduce((sum, e) => sum + (e.siiRetentionAmount ?? 0), 0)
        : 0
    }
  })

  const totalGrossClp = totalsByRegime
    .filter(g => REGIME_CURRENCY[g.regime] === 'CLP')
    .reduce((sum, g) => sum + g.totalGross, 0)

  const totalNetClp = totalsByRegime
    .filter(g => REGIME_CURRENCY[g.regime] === 'CLP')
    .reduce((sum, g) => sum + g.totalNet, 0)

  const totalGrossUsd = totalsByRegime
    .filter(g => REGIME_CURRENCY[g.regime] === 'USD')
    .reduce((sum, g) => sum + g.totalGross, 0)

  // TASK-782 — Summary strip ampliado: contadores per-régimen visibles solo si N > 0.
  const summaryItems: Array<{ label: string; value: string }> = [
    { label: 'COLABORADORES', value: String(entries.length) },
    { label: 'ESTADO', value: formatStatus(period.status) }
  ]

  for (const { regime, count } of totalsByRegime) {
    if (count > 0) {
      summaryItems.push({ label: `# ${RECEIPT_REGIME_BADGES[regime].code}`, value: String(count) })
    }
  }

  if (totalGrossClp > 0) {
    summaryItems.push({ label: 'BRUTO CLP', value: fmtCurrency(totalGrossClp, 'CLP') })
    summaryItems.push({ label: 'NETO CLP', value: fmtCurrency(totalNetClp, 'CLP') })
  }

  if (totalGrossUsd > 0) {
    summaryItems.push({ label: 'BRUTO USD', value: fmtCurrency(totalGrossUsd, 'USD') })
  }

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <PdfHeader operatingEntity={operatingEntity} monthName={monthName} year={period.year} docType="Reporte de nómina" periodId={period.periodId} />

        <Text style={s.docTitle}>REPORTE DE NÓMINA</Text>

        {/* Summary strip ampliado */}
        <View style={{ backgroundColor: BRAND_LIGHT, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14 }}>
          {summaryItems.map((item, i) => (
            <View key={i} style={{ flex: 1, paddingHorizontal: 6, borderRightWidth: i < summaryItems.length - 1 ? 0.5 : 0, borderRightColor: BORDER_LIGHT }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica', color: TEXT_MUTED, letterSpacing: 1, marginBottom: 2 }}>{item.label}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: TEXT_PRIMARY }}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Meta row — UF + UTM + Aprobado + Tabla tributaria (ítems sólo si están poblados) */}
        {(period.ufValue != null || period.approvedAt || period.taxTableVersion) && (
          <View style={{ flexDirection: 'row', marginBottom: 10, gap: 16, flexWrap: 'wrap' }}>
            {period.ufValue != null && (
              <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
                {`UF: ${formatLocaleCurrency(period.ufValue, 'CLP')}`}
              </Text>
            )}
            {period.approvedAt && (
              <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
                {`Aprobado: ${period.approvedAt}`}
              </Text>
            )}
            {period.taxTableVersion && (
              <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
                {`Tabla tributaria: ${period.taxTableVersion}`}
              </Text>
            )}
          </View>
        )}

        {/* Section header */}
        <SectionHeader title={`Detalle — ${entries.length} colaboradores agrupados por régimen`} />

        {/* Header row — 10 columnas canónicas */}
        <View style={s.reportTableHeader}>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.name }}>Nombre</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.regime, textAlign: 'center' as const }}>Régimen</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.currency, textAlign: 'center' as const }}>Mon.</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.base, textAlign: 'right' as const }}>Base</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.otd, textAlign: 'right' as const }}>OTD</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.rpa, textAlign: 'right' as const }}>RpA</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.gross, textAlign: 'right' as const }}>Bruto</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.prevDeductions, textAlign: 'right' as const }}>Desc. previs.</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.siiRetention, textAlign: 'right' as const }}>Retención SII</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.net, textAlign: 'right' as const }}>Neto</Text>
        </View>

        {/* Per-regime sections (canonical order, omit groups with N=0) */}
        {totalsByRegime.map(group => {
          if (group.count === 0) return null
          const isHonorarios = group.regime === 'honorarios'
          const isChileDep = group.regime === 'chile_dependent'
          const groupCurrency = REGIME_CURRENCY[group.regime]
          const dimCell = { ...s.reportTableCellRight, color: TEXT_FAINT }

          return (
            <Fragment key={group.regime}>
              {/* Group divider row */}
              <View style={{ flexDirection: 'row', backgroundColor: '#d6e0eb', paddingVertical: 6, paddingHorizontal: 6 }}>
                <Text style={{ width: '100%', fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_BLUE, letterSpacing: 1, textTransform: 'uppercase' as const }}>
                  {`${REGIME_GROUP_LABELS[group.regime]} · ${group.count} colaboradores`}
                </Text>
              </View>

              {/* Entry rows */}
              {group.entries.map((entry, i) => {
                const excluded = isExcludedEntry(entry)
                const dim = excluded ? { color: TEXT_FAINT } : {}

                return (
                  <View key={entry.entryId} style={[s.reportTableRow, i % 2 === 1 ? s.reportTableRowAlt : {}]}>
                    <Text style={{ ...s.reportTableCell, width: COL_WIDTHS.name, ...dim }}>
                      {entry.memberName}{excluded ? ' (excluido)' : ''}
                    </Text>
                    <Text style={{ ...s.reportTableCell, width: COL_WIDTHS.regime, textAlign: 'center' as const }}>
                      {RECEIPT_REGIME_BADGES[group.regime].code}
                    </Text>
                    <Text style={{ ...s.reportTableCell, width: COL_WIDTHS.currency, textAlign: 'center' as const }}>
                      {entry.currency}
                    </Text>
                    <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.base, ...dim }}>
                      {excluded ? '—' : fmtCurrency(entry.adjustedBaseSalary ?? entry.baseSalary, entry.currency)}
                    </Text>
                    <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.otd, ...dim }}>
                      {excluded ? '—' : fmtCurrency(entry.bonusOtdAmount, entry.currency)}
                    </Text>
                    <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.rpa, ...dim }}>
                      {excluded ? '—' : fmtCurrency(entry.bonusRpaAmount, entry.currency)}
                    </Text>
                    <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.gross }}>
                      {fmtCurrency(entry.grossTotal, entry.currency)}
                    </Text>
                    <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.prevDeductions, ...(isChileDep && !excluded ? {} : { color: TEXT_FAINT }) }}>
                      {isChileDep && !excluded
                        ? fmtCurrency(entry.chileTotalDeductions, entry.currency)
                        : '—'}
                    </Text>
                    <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.siiRetention, ...(isHonorarios && !excluded ? {} : { color: TEXT_FAINT }) }}>
                      {isHonorarios && !excluded
                        ? fmtCurrency(entry.siiRetentionAmount ?? null, entry.currency)
                        : '—'}
                    </Text>
                    <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.net }}>
                      {fmtCurrency(entry.netTotal, entry.currency)}
                    </Text>
                  </View>
                )
              })}

              {/* Per-regime subtotal row */}
              <View style={s.reportTotalsRow}>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.name, textAlign: 'left' as const, paddingLeft: 6 }}>
                  {`Total ${REGIME_GROUP_LABELS[group.regime]}`}
                </Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.regime }}>{' '}</Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.currency, textAlign: 'center' as const }}>{groupCurrency}</Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.base }}>{' '}</Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.otd }}>{' '}</Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.rpa }}>{' '}</Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.gross }}>{fmtCurrency(group.totalGross, groupCurrency)}</Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.prevDeductions, ...(isChileDep ? {} : dimCell) }}>
                  {isChileDep ? fmtCurrency(group.totalPrevDeductions, groupCurrency) : '—'}
                </Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.siiRetention, ...(isHonorarios ? {} : dimCell) }}>
                  {isHonorarios ? fmtCurrency(group.totalSiiRetention, groupCurrency) : '—'}
                </Text>
                <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.net }}>{fmtCurrency(group.totalNet, groupCurrency)}</Text>
              </View>
            </Fragment>
          )
        })}

        <PdfFooter operatingEntity={operatingEntity} monthName={monthName} year={period.year} generatedAt={generatedAt} />
      </Page>
    </Document>
  )
}

// ─── Individual Receipt PDF ───────────────────────────────────────

const toReceiptPresenterEntry = (entry: PayrollEntry, period: PayrollPeriod): ReceiptPresenterEntry => {
  const periodDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`

  const aux = entry as PayrollEntry & {
    chileColacion?: number | null
    chileMovilizacion?: number | null
  }

  const colacion =
    entry.chileColacionAmount ?? aux.chileColacion ?? entry.colacionAmount ?? null

  const movilizacion =
    entry.chileMovilizacionAmount ?? aux.chileMovilizacion ?? entry.movilizacionAmount ?? null

  return {
    payRegime: entry.payRegime,
    contractTypeSnapshot: entry.contractTypeSnapshot ?? null,
    payrollVia: entry.payrollVia ?? null,
    currency: entry.currency,
    memberName: entry.memberName,
    memberEmail: entry.memberEmail,
    deelContractId: entry.deelContractId ?? null,
    baseSalary: entry.baseSalary,
    adjustedBaseSalary: entry.adjustedBaseSalary,
    remoteAllowance: entry.remoteAllowance,
    adjustedRemoteAllowance: entry.adjustedRemoteAllowance,
    fixedBonusLabel: entry.fixedBonusLabel,
    fixedBonusAmount: entry.fixedBonusAmount,
    adjustedFixedBonusAmount: entry.adjustedFixedBonusAmount,
    bonusOtdAmount: entry.bonusOtdAmount,
    bonusRpaAmount: entry.bonusRpaAmount,
    bonusOtherAmount: entry.bonusOtherAmount,
    bonusOtherDescription: entry.bonusOtherDescription,
    chileColacionAmount: colacion,
    chileMovilizacionAmount: movilizacion,
    chileGratificacionLegalAmount: entry.chileGratificacionLegalAmount,
    grossTotal: entry.grossTotal,
    netTotal: entry.netTotal,
    kpiOtdPercent: entry.kpiOtdPercent,
    kpiRpaAvg: entry.kpiRpaAvg,
    bonusOtdProrationFactor: entry.bonusOtdProrationFactor,
    bonusRpaProrationFactor: entry.bonusRpaProrationFactor,
    workingDaysInPeriod: entry.workingDaysInPeriod,
    daysPresent: entry.daysPresent,
    daysAbsent: entry.daysAbsent,
    daysOnLeave: entry.daysOnLeave,
    daysOnUnpaidLeave: entry.daysOnUnpaidLeave,
    chileAfpName: entry.chileAfpName,
    chileAfpRate: entry.chileAfpRate,
    chileAfpAmount: entry.chileAfpAmount,
    chileAfpCotizacionAmount: entry.chileAfpCotizacionAmount,
    chileAfpComisionAmount: entry.chileAfpComisionAmount,
    chileHealthSystem: entry.chileHealthSystem,
    chileHealthAmount: entry.chileHealthAmount,
    chileHealthObligatoriaAmount: entry.chileHealthObligatoriaAmount,
    chileHealthVoluntariaAmount: entry.chileHealthVoluntariaAmount,
    chileUnemploymentRate: entry.chileUnemploymentRate,
    chileUnemploymentAmount: entry.chileUnemploymentAmount,
    chileTaxAmount: entry.chileTaxAmount,
    chileApvAmount: entry.chileApvAmount,
    chileTotalDeductions: entry.chileTotalDeductions,
    siiRetentionRate: entry.siiRetentionRate ?? null,
    siiRetentionAmount: entry.siiRetentionAmount ?? null,
    manualOverride: entry.manualOverride,
    manualOverrideNote: entry.manualOverrideNote,
    periodDate
  }
}

const InfoBlockPdf = ({ block }: { block: ReceiptInfoBlock }) => {
  const variantStyle: Record<ReceiptInfoBlockVariant, ReturnType<typeof StyleSheet.create>[string]> = {
    info: s.infoBlock,
    warning: s.infoBlockWarning,
    error: s.infoBlockError
  }

  return (
    <View style={variantStyle[block.variant]}>
      <Text style={s.infoBlockTitle}>{block.title}</Text>
      <Text style={s.infoBlockBody}>{block.body}</Text>
      {block.meta && <Text style={s.infoBlockMeta}>{block.meta}</Text>}
    </View>
  )
}

const ReceiptDocument = ({
  entry,
  period,
  operatingEntity,
  breakdown
}: {
  entry: PayrollEntry
  period: PayrollPeriod
  operatingEntity: OperatingEntityIdentity | null
  breakdown: EntryAdjustmentBreakdown
}) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const generatedAt = new Date().toISOString().split('T')[0]
  const presentation = buildReceiptPresentation(toReceiptPresenterEntry(entry, period), breakdown)

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <PdfHeader
          operatingEntity={operatingEntity}
          monthName={monthName}
          year={period.year}
          docType="Recibo de remuneraciones"
          periodId={period.periodId}
        />

        <Text style={s.docTitle}>RECIBO DE REMUNERACIONES</Text>

        {/* Employee box — 4 fields canonical, contextual field 4 per regime */}
        <View style={s.employeeBox}>
          {presentation.employeeFields.map((field, i) => (
            <View key={`employee-${i}`} style={s.employeeField}>
              <Text style={s.employeeLabel}>{field.label}</Text>
              <Text style={s.employeeValue}>{field.value}</Text>
              {field.meta && (
                <Text style={{ fontSize: 7, color: TEXT_MUTED, marginTop: 1 }}>{field.meta}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Excluded short-circuit — minimal layout per mockup */}
        {presentation.isExcluded && presentation.infoBlock && (
          <InfoBlockPdf block={presentation.infoBlock} />
        )}

        {/* Haberes */}
        {!presentation.isExcluded && (
          <>
            <SectionHeader title="Haberes" />
            {presentation.haberesRows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableLabel, row.variant === 'indent' ? { paddingLeft: 14, color: TEXT_MUTED } : {}]}>
                  {row.label}
                </Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
            <View style={s.tableTotalRow}>
              <Text style={s.tableTotalLabel}>Total bruto</Text>
              <Text style={s.tableTotalValue}>{presentation.grossTotal}</Text>
            </View>
          </>
        )}

        {/* Adjustments banner — bruto efectivo aplicado */}
        {presentation.adjustmentsBanner && <InfoBlockPdf block={presentation.adjustmentsBanner} />}

        {/* Attendance — chile_dependent only */}
        {!presentation.isExcluded && presentation.attendanceRows.length > 0 && (
          <>
            <SectionHeader title="Asistencia" />
            {presentation.attendanceRows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={s.tableLabel}>{row.label}</Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
          </>
        )}

        {/* Deduction section — Descuentos legales / Retención honorarios */}
        {!presentation.isExcluded && presentation.deductionSection && (
          <>
            <SectionHeader title={presentation.deductionSection.title} />
            {presentation.deductionSection.rows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableLabel, row.variant === 'indent' ? { paddingLeft: 14, color: TEXT_MUTED } : {}]}>
                  {row.label}
                </Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
            <View style={s.tableTotalRow}>
              <Text style={s.tableTotalLabel}>{presentation.deductionSection.totalLabel}</Text>
              <Text style={s.tableTotalValue}>{presentation.deductionSection.totalAmount}</Text>
            </View>
          </>
        )}

        {/* Info block — Boleta SII / Pago Deel / Régimen internacional */}
        {!presentation.isExcluded && presentation.infoBlock && (
          <InfoBlockPdf block={presentation.infoBlock} />
        )}

        {/* Fixed deductions */}
        {presentation.fixedDeductionsSection && (
          <>
            <SectionHeader title={presentation.fixedDeductionsSection.title} />
            {presentation.fixedDeductionsSection.rows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={s.tableLabel}>{row.label}</Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
            <View style={s.tableTotalRow}>
              <Text style={s.tableTotalLabel}>{presentation.fixedDeductionsSection.totalLabel}</Text>
              <Text style={s.tableTotalValue}>{presentation.fixedDeductionsSection.totalAmount}</Text>
            </View>
          </>
        )}

        {/* Manual override block */}
        {presentation.manualOverrideBlock && <InfoBlockPdf block={presentation.manualOverrideBlock} />}

        {/* Hero — primary or degraded */}
        <View style={presentation.hero.variant === 'degraded' ? s.netHeroDegraded : s.netHero}>
          <Text style={s.netHeroLabel}>{presentation.hero.label}</Text>
          <Text style={s.netHeroValue}>{presentation.hero.amount}</Text>
        </View>

        {presentation.hero.footnote && (
          <Text style={{ fontSize: 7, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4 }}>
            {presentation.hero.footnote}
          </Text>
        )}

        <PdfFooter
          operatingEntity={operatingEntity}
          monthName={monthName}
          year={period.year}
          generatedAt={generatedAt}
        />
      </Page>
    </Document>
  )
}

// ─── Public API ──────────────────────────────────────────────────

export const generatePayrollPeriodPdf = async (periodId: string): Promise<Buffer> => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate reports.', 409)
  }

  const [entries, operatingEntity] = await Promise.all([
    getPayrollEntries(periodId),
    getOperatingEntityIdentity()
  ])

  const stream = await renderToStream(<PeriodReportDocument period={period} entries={entries} operatingEntity={operatingEntity} />)

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

export const generatePayrollReceiptPdf = async (entryId: string): Promise<Buffer> => {
  const entry = await getPayrollEntryById(entryId)

  if (!entry) {
    throw new PayrollValidationError('Payroll entry not found.', 404)
  }

  const period = await getPayrollPeriod(entry.periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate receipts.', 409)
  }

  const operatingEntity = await getOperatingEntityIdentity()
  const adjustments = await getAdjustmentsByEntry(entryId, { activeOnly: true })
  const breakdown = getEntryAdjustmentBreakdown(adjustments)

  const stream = await renderToStream(
    <ReceiptDocument entry={entry} period={period} operatingEntity={operatingEntity} breakdown={breakdown} />
  )

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}
