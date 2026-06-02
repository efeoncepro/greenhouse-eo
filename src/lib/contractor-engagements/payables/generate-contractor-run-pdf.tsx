import 'server-only'

/**
 * TASK-980 — "Nómina de Contractors" PDF (reporte de período).
 *
 * Espejo del reporte de payroll (TASK-782) + infraestructura del comprobante
 * contractor (TASK-960): Geist body (DESIGN.md), logo data-URI, masthead con el
 * eslogan canónico (Poppins, `EfeonceSloganPdf`), footer institucional canónico
 * (`EfeoncePdfFooter`), `renderToStream` → Buffer.
 *
 * Consume el `ContractorRunReport` (el reader hace el IO) — montos VERBATIM.
 * Subtotales mutuamente excluyentes por grupo/moneda (retención SII solo
 * honorarios → F29; neto pagado solo `paid` → banco). Un solo acento verde en el
 * neto. Nota contable: el neto es lo pagado; la retención SII se remesa al SII.
 */

import fs from 'fs'
import path from 'path'

import { Fragment } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'

import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { EfeoncePdfFooter } from '@/lib/finance/pdf/efeonce-pdf-footer'
import { EfeonceSloganPdf } from '@/lib/finance/pdf/efeonce-slogan-pdf'
import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import type {
  ContractorRunReport,
  ContractorRunReportRegimeGroupSummary,
  ContractorRunReportRow
} from './run-report-reader'

export const CONTRACTOR_RUN_REPORT_TEMPLATE_VERSION = '1'

const LOGO_PATH = path.join(process.cwd(), 'public/branding/logo-full.png')
let cachedLogoDataUri: string | null | undefined

const getLogoDataUri = (): string | null => {
  if (cachedLogoDataUri !== undefined) return cachedLogoDataUri

  try {
    cachedLogoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`
  } catch {
    cachedLogoDataUri = null
  }

  return cachedLogoDataUri
}

const BRAND_BLUE = '#023c70'
const BRAND_LIGHT = '#F7F9FC'
const SUBTOTAL_BG = '#E8EFF7'
const GROUP_BG = '#d6e0eb'
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#5c5c5c'
const TEXT_FAINT = '#9aa4b2'
const BORDER_LIGHT = '#e0e0e0'
const NET_ACCENT = '#2E7D32'

const STATUS_LABELS: Record<ContractorRunReportRow['status'], string> = {
  pending_readiness: 'Por preparar',
  ready_for_finance: 'Listo Finanzas',
  obligation_created: 'Obligación',
  payment_order_created: 'En orden',
  paid: 'Pagado',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado'
}

const money = (amount: number, currency: string): string =>
  formatCurrency(amount, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, currency === 'USD' ? 'en-US' : 'es-CL')

const s = StyleSheet.create({
  page: { fontFamily: 'Geist', fontSize: 8, paddingTop: 40, paddingBottom: 56, paddingHorizontal: 40, color: TEXT_PRIMARY },

  masthead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  brandZone: { flexDirection: 'column', alignItems: 'center' },
  logo: { width: 116, height: 28, objectFit: 'contain', marginBottom: 6 },
  mastheadRight: { flexDirection: 'column', alignItems: 'flex-end', maxWidth: 240 },
  title: { fontFamily: 'Geist Bold', fontSize: 15, color: TEXT_PRIMARY },
  period: { fontSize: 9, color: TEXT_MUTED, marginTop: 2 },
  issuer: { fontSize: 7.5, color: TEXT_MUTED, marginTop: 4, textAlign: 'right' },
  accentBar: { borderBottomWidth: 2, borderBottomColor: BRAND_BLUE, marginTop: 8, marginBottom: 10 },

  summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: BRAND_LIGHT, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4, marginBottom: 10 },
  kpi: { flexDirection: 'column', marginRight: 18, marginVertical: 2 },
  kpiLabel: { fontSize: 6.5, color: TEXT_FAINT, textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiValue: { fontSize: 10, fontFamily: 'Geist Bold', color: TEXT_PRIMARY },
  kpiNet: { color: NET_ACCENT },

  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  metaItem: { fontSize: 7.5, color: TEXT_MUTED },

  groupDivider: { backgroundColor: GROUP_BG, paddingVertical: 4, paddingHorizontal: 6, marginTop: 8 },
  groupLabel: { fontSize: 8, fontFamily: 'Geist Bold', color: BRAND_BLUE, textTransform: 'uppercase', letterSpacing: 0.6 },

  tableHeader: { flexDirection: 'row', backgroundColor: BRAND_BLUE, paddingVertical: 4, paddingHorizontal: 4 },
  th: { color: '#FFFFFF', fontSize: 6.5, fontFamily: 'Geist Bold' },
  row: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: BORDER_LIGHT },
  rowAlt: { backgroundColor: BRAND_LIGHT },
  td: { fontSize: 7, color: TEXT_PRIMARY },
  tdMuted: { fontSize: 7, color: TEXT_FAINT },
  subtotalRow: { flexDirection: 'row', backgroundColor: SUBTOTAL_BG, paddingVertical: 4, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: BRAND_BLUE },
  subtotalCell: { fontSize: 7, fontFamily: 'Geist Bold', color: TEXT_PRIMARY },

  disclaimerBox: { marginTop: 16, padding: 10, backgroundColor: BRAND_LIGHT, borderWidth: 1, borderColor: BORDER_LIGHT, borderRadius: 4 },
  disclaimerText: { fontSize: 7.5, color: TEXT_MUTED, lineHeight: 1.4 },

  pageNumber: { position: 'absolute', bottom: 56, right: 40, fontSize: 7, color: TEXT_FAINT },
  emptyNote: { fontSize: 10, color: TEXT_MUTED, marginTop: 24, textAlign: 'center' }
})

// Column widths per régime group (sum 100).
const HON_COLS = ['22%', '13%', '12%', '8%', '13%', '12%', '8%', '12%']
const INTL_COLS = ['26%', '16%', '13%', '8%', '15%', '12%', '10%']

const right = { textAlign: 'right' as const }
const center = { textAlign: 'center' as const }

const HonorariosGroup = ({ group }: { group: ContractorRunReportRegimeGroupSummary }) => (
  <View wrap={false}>
    <View style={s.groupDivider}>
      <Text style={s.groupLabel}>{`Honorarios CL · ${group.rows.length} ${group.rows.length === 1 ? 'pago' : 'pagos'}`}</Text>
    </View>
    <View style={s.tableHeader}>
      <Text style={[s.th, { width: HON_COLS[0] }]}>Contractor</Text>
      <Text style={[s.th, { width: HON_COLS[1] }]}>Engagement</Text>
      <Text style={[s.th, { width: HON_COLS[2] }, right]}>Bruto</Text>
      <Text style={[s.th, { width: HON_COLS[3] }, center]}>Tasa</Text>
      <Text style={[s.th, { width: HON_COLS[4] }, right]}>Retención SII</Text>
      <Text style={[s.th, { width: HON_COLS[5] }, right]}>Neto</Text>
      <Text style={[s.th, { width: HON_COLS[6] }, center]}>Estado</Text>
      <Text style={[s.th, { width: HON_COLS[7] }]}>Comprobante</Text>
    </View>
    {group.rows.map((r, i) => (
      <View key={r.contractorPayableId} style={[s.row, ...(i % 2 === 1 ? [s.rowAlt] : [])]}>
        <Text style={[s.td, { width: HON_COLS[0] }]}>{r.contractorName}</Text>
        <Text style={[s.tdMuted, { width: HON_COLS[1] }]}>{r.engagementPublicId}</Text>
        <Text style={[s.td, { width: HON_COLS[2] }, right]}>{money(r.grossAmount, r.currency)}</Text>
        <Text style={[s.tdMuted, { width: HON_COLS[3] }, center]}>{r.withholdingRateSnapshot != null ? `${(r.withholdingRateSnapshot * 100).toFixed(2)}%` : '—'}</Text>
        <Text style={[s.td, { width: HON_COLS[4] }, right]}>{money(r.withholdingAmount, r.currency)}</Text>
        <Text style={[s.td, { width: HON_COLS[5] }, right, { color: NET_ACCENT }]}>{money(r.netPayable, r.currency)}</Text>
        <Text style={[s.tdMuted, { width: HON_COLS[6] }, center]}>{STATUS_LABELS[r.status]}</Text>
        <Text style={[s.tdMuted, { width: HON_COLS[7] }]}>{r.remittanceNumber ?? '—'}</Text>
      </View>
    ))}
    {group.byCurrency.map(sub => (
      <View key={sub.currency} style={s.subtotalRow}>
        <Text style={[s.subtotalCell, { width: HON_COLS[0] }]}>{`Subtotal ${sub.currency}`}</Text>
        <Text style={[s.subtotalCell, { width: HON_COLS[1] }]} />
        <Text style={[s.subtotalCell, { width: HON_COLS[2] }, right]}>{money(sub.grossTotal, sub.currency)}</Text>
        <Text style={[s.subtotalCell, { width: HON_COLS[3] }]} />
        <Text style={[s.subtotalCell, { width: HON_COLS[4] }, right]}>{money(sub.withholdingTotal, sub.currency)}</Text>
        <Text style={[s.subtotalCell, { width: HON_COLS[5] }, right]}>{money(sub.netTotal, sub.currency)}</Text>
        <Text style={[s.subtotalCell, { width: HON_COLS[6] }]} />
        <Text style={[s.subtotalCell, { width: HON_COLS[7] }]} />
      </View>
    ))}
  </View>
)

const InternacionalGroup = ({ group }: { group: ContractorRunReportRegimeGroupSummary }) => (
  <View wrap={false}>
    <View style={s.groupDivider}>
      <Text style={s.groupLabel}>{`Internacional · ${group.rows.length} ${group.rows.length === 1 ? 'pago' : 'pagos'}`}</Text>
    </View>
    <View style={s.tableHeader}>
      <Text style={[s.th, { width: INTL_COLS[0] }]}>Contractor</Text>
      <Text style={[s.th, { width: INTL_COLS[1] }]}>Engagement</Text>
      <Text style={[s.th, { width: INTL_COLS[2] }]}>Canal</Text>
      <Text style={[s.th, { width: INTL_COLS[3] }, center]}>Mon.</Text>
      <Text style={[s.th, { width: INTL_COLS[4] }, right]}>Bruto</Text>
      <Text style={[s.th, { width: INTL_COLS[5] }, right]}>Neto</Text>
      <Text style={[s.th, { width: INTL_COLS[6] }, center]}>Estado</Text>
    </View>
    {group.rows.map((r, i) => (
      <View key={r.contractorPayableId} style={[s.row, ...(i % 2 === 1 ? [s.rowAlt] : [])]}>
        <Text style={[s.td, { width: INTL_COLS[0] }]}>{r.contractorName}</Text>
        <Text style={[s.tdMuted, { width: INTL_COLS[1] }]}>{r.engagementPublicId}</Text>
        <Text style={[s.tdMuted, { width: INTL_COLS[2] }]}>{r.payrollVia}</Text>
        <Text style={[s.tdMuted, { width: INTL_COLS[3] }, center]}>{r.currency}</Text>
        <Text style={[s.td, { width: INTL_COLS[4] }, right]}>{money(r.grossAmount, r.currency)}</Text>
        <Text style={[s.td, { width: INTL_COLS[5] }, right, { color: NET_ACCENT }]}>{money(r.netPayable, r.currency)}</Text>
        <Text style={[s.tdMuted, { width: INTL_COLS[6] }, center]}>{STATUS_LABELS[r.status]}</Text>
      </View>
    ))}
    {group.byCurrency.map(sub => (
      <View key={sub.currency} style={s.subtotalRow}>
        <Text style={[s.subtotalCell, { width: INTL_COLS[0] }]}>{`Subtotal ${sub.currency}`}</Text>
        <Text style={[s.subtotalCell, { width: INTL_COLS[1] }]} />
        <Text style={[s.subtotalCell, { width: INTL_COLS[2] }]} />
        <Text style={[s.subtotalCell, { width: INTL_COLS[3] }]} />
        <Text style={[s.subtotalCell, { width: INTL_COLS[4] }, right]}>{money(sub.grossTotal, sub.currency)}</Text>
        <Text style={[s.subtotalCell, { width: INTL_COLS[5] }, right]}>{money(sub.netTotal, sub.currency)}</Text>
        <Text style={[s.subtotalCell, { width: INTL_COLS[6] }]} />
      </View>
    ))}
  </View>
)

const ContractorRunDocument = ({ report }: { report: ContractorRunReport }) => {
  const logo = getLogoDataUri()
  const generatedAt = report.generatedAt.slice(0, 16).replace('T', ' ')

  return (
    <Document title={`Nómina de Contractors — ${report.monthLabel}`}>
      <Page size='A4' style={s.page}>
        <View style={s.masthead}>
          <View style={s.brandZone}>
            {logo ? <Image src={logo} style={s.logo} /> : <Text style={{ fontFamily: 'Geist Bold', fontSize: 13 }}>Efeonce</Text>}
            <EfeonceSloganPdf fontSize={7.5} />
          </View>
          <View style={s.mastheadRight}>
            <Text style={s.title}>Nómina de Contractors</Text>
            <Text style={s.period}>{report.monthLabel}</Text>
            {report.operatingEntity ? (
              <Text style={s.issuer}>{`${report.operatingEntity.legalName} · RUT ${report.operatingEntity.taxId}`}</Text>
            ) : null}
          </View>
        </View>
        <View style={s.accentBar} />

        <View style={s.summaryStrip}>
          {report.grandTotalsByCurrency.map(sub => (
            <Fragment key={sub.currency}>
              <View style={s.kpi}>
                <Text style={s.kpiLabel}>{`Bruto ${sub.currency}`}</Text>
                <Text style={s.kpiValue}>{money(sub.grossTotal, sub.currency)}</Text>
              </View>
              <View style={s.kpi}>
                <Text style={s.kpiLabel}>{`Retención SII ${sub.currency}`}</Text>
                <Text style={s.kpiValue}>{money(sub.withholdingTotal, sub.currency)}</Text>
              </View>
              <View style={s.kpi}>
                <Text style={s.kpiLabel}>{`Neto ${sub.currency}`}</Text>
                <Text style={[s.kpiValue, s.kpiNet]}>{money(sub.netTotal, sub.currency)}</Text>
              </View>
            </Fragment>
          ))}
        </View>

        <View style={s.metaRow}>
          <Text style={s.metaItem}>{`Tasa SII vigente: ${(report.siiRateForPeriod * 100).toFixed(2)}%`}</Text>
          {report.excluded.length > 0 ? (
            <Text style={s.metaItem}>{`Excluidos (bloqueados / no listos): ${report.excluded.length}`}</Text>
          ) : null}
        </View>

        {report.groups.length === 0 ? (
          <Text style={s.emptyNote}>No hay pagos a contractors en este período.</Text>
        ) : (
          report.groups.map(group =>
            group.group === 'honorarios_cl' ? (
              <HonorariosGroup key={group.group} group={group} />
            ) : (
              <InternacionalGroup key={group.group} group={group} />
            )
          )
        )}

        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerText}>
            El neto es lo pagado al contractor. La retención SII es un pasivo a remesar al SII (F29, día 12/20 del mes
            siguiente), no se le paga al contractor. Este reporte no reemplaza el comprobante individual ni la
            declaración de remesa.
          </Text>
        </View>

        <Text
          style={s.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
        <EfeoncePdfFooter operatingEntity={report.operatingEntity} generatedAt={generatedAt} fixed />
      </Page>
    </Document>
  )
}

export const generateContractorRunPdf = async (report: ContractorRunReport): Promise<Buffer> => {
  await ensurePdfFontsRegistered()

  const stream = await renderToStream(<ContractorRunDocument report={report} />)
  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}
