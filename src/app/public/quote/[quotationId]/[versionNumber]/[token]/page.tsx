import { notFound } from 'next/navigation'

import { query } from '@/lib/db'
import { computeVerificationToken, computePdfContentHash } from '@/lib/finance/pdf/qr-verification'
import { DEFAULT_LEGAL_ENTITY } from '@/lib/finance/pdf/tokens'

export const dynamic = 'force-dynamic'

interface QuotationVerifyRow extends Record<string, unknown> {
  quotation_number: string
  current_version: number
  currency: string
  quote_date: string | Date | null
  valid_until: string | Date | null
  client_name_cache: string | null
  total_price: string | number | null
  tax_amount_snapshot: string | number | null
  status: string | null
}

interface LineCountRow extends Record<string, unknown> {
  count: string | number | null
}

const formatDate = (value: string | Date | null): string => {
  if (!value) return '—'
  const iso = value instanceof Date ? value.toISOString() : value
  const parts = iso.slice(0, 10).split('-')

  if (parts.length !== 3) return iso.slice(0, 10)

  const [y, m, d] = parts

  return `${d}/${m}/${y}`
}

const isExpired = (validUntil: string | Date | null): boolean => {
  if (!validUntil) return false
  const iso = validUntil instanceof Date ? validUntil.toISOString() : validUntil
  const validUntilDate = new Date(iso.slice(0, 10))
  const today = new Date()

  today.setHours(0, 0, 0, 0)

  return validUntilDate < today
}

const formatCurrency = (value: number, currency: string): string => {
  if (currency === 'CLP') {
    return `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.round(value))}`
  }

  if (currency === 'USD') {
    return `US$${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2 }).format(value)}`
  }

  return `${currency} ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2 }).format(value)}`
}

interface PageProps {
  params: Promise<{ quotationId: string; versionNumber: string; token: string }>
}

export default async function QuoteVerificationPage({ params }: PageProps) {
  const { quotationId, versionNumber: versionStr, token } = await params
  const versionNumber = Number(versionStr)

  if (!Number.isFinite(versionNumber) || versionNumber < 1) {
    notFound()
  }

  // Lookup the quotation header
  const rows = await query<QuotationVerifyRow>(
    `SELECT q.quotation_number, q.current_version, q.currency, q.quote_date, q.valid_until,
            q.client_name_cache, q.total_price, q.tax_amount_snapshot, q.status
       FROM greenhouse_commercial.quotations q
       WHERE q.quotation_id = $1`,
    [quotationId]
  )

  const header = rows[0]

  if (!header) {
    return renderInvalidPage('Esta cotización no existe en nuestros registros.')
  }

  const lineCountRows = await query<LineCountRow>(
    `SELECT COUNT(*)::int AS count
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2`,
    [quotationId, versionNumber]
  )

  const lineCount = Number(lineCountRows[0]?.count ?? 0)
  const total = Number(header.total_price ?? 0) + Number(header.tax_amount_snapshot ?? 0)
  const currency = String(header.currency || 'CLP').toUpperCase()

  // Recompute the expected token using the same content hash binding the PDF
  // generator used. If the document was altered offline (different total/lines)
  // the hashes won't match and we surface "documento inválido".
  const expectedHash = computePdfContentHash({
    quotationId,
    versionNumber,
    total,
    currency,
    lineCount
  })

  const expectedToken = computeVerificationToken({
    quotationId,
    versionNumber,
    pdfHash: expectedHash
  })

  if (!expectedToken) {
    // Secret no configured server-side: cannot verify. Soft-fail.
    return renderInvalidPage(
      'La verificación no está disponible en este momento. Por favor contacta a tu account lead.'
    )
  }

  if (expectedToken !== token) {
    return renderInvalidPage(
      'El documento que estás validando ha sido modificado o el código QR no es auténtico.'
    )
  }

  // Valid — render success
  const expired = isExpired(header.valid_until)

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle(expired ? '#ff6500' : '#6ec207')}>
          {expired ? 'COTIZACIÓN VÁLIDA · VENCIDA' : 'COTIZACIÓN VÁLIDA'}
        </div>
        <h1 style={titleStyle}>Documento auténtico</h1>
        <p style={subtitleStyle}>
          Esta cotización corresponde a un documento emitido por{' '}
          <strong>{DEFAULT_LEGAL_ENTITY.legalName}</strong> y verificado contra
          nuestros registros.
        </p>
        <dl style={dlStyle}>
          <dt style={dtStyle}>Número</dt>
          <dd style={ddStyle}>{header.quotation_number}</dd>
          <dt style={dtStyle}>Versión</dt>
          <dd style={ddStyle}>v{versionNumber}</dd>
          <dt style={dtStyle}>Cliente</dt>
          <dd style={ddStyle}>{header.client_name_cache || 'Sin cliente registrado'}</dd>
          <dt style={dtStyle}>Fecha de emisión</dt>
          <dd style={ddStyle}>{formatDate(header.quote_date)}</dd>
          <dt style={dtStyle}>Válida hasta</dt>
          <dd style={ddStyle}>
            {formatDate(header.valid_until)}
            {expired ? <span style={expiredChipStyle}> · VENCIDA</span> : null}
          </dd>
          <dt style={dtStyle}>Total</dt>
          <dd style={ddStyle}><strong>{formatCurrency(total, currency)}</strong></dd>
          <dt style={dtStyle}>Líneas</dt>
          <dd style={ddStyle}>{lineCount}</dd>
        </dl>
        <p style={metaStyle}>
          {DEFAULT_LEGAL_ENTITY.legalName} · RUT {DEFAULT_LEGAL_ENTITY.taxId}
          <br />
          Si tienes dudas sobre la autenticidad de este documento contacta a tu account lead.
        </p>
      </div>
    </main>
  )
}

function renderInvalidPage(message: string) {
  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle('#bb1954')}>DOCUMENTO INVÁLIDO</div>
        <h1 style={titleStyle}>No pudimos verificar este documento</h1>
        <p style={subtitleStyle}>{message}</p>
        <p style={metaStyle}>
          {DEFAULT_LEGAL_ENTITY.legalName} · RUT {DEFAULT_LEGAL_ENTITY.taxId}
        </p>
      </div>
    </main>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 16px',
  background: '#F8F7FA',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '40px 32px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  borderTop: '4px solid #023c70'
}

const badgeStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 999,
  background: color,
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  marginBottom: 16
})

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  color: '#023c70',
  margin: '0 0 12px 0',
  lineHeight: 1.2
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#2F2B3D',
  lineHeight: 1.55,
  marginBottom: 24
}

const dlStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: 16,
  rowGap: 8,
  margin: '24px 0',
  paddingTop: 20,
  borderTop: '1px solid #E4E5EB'
}

const dtStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#6E6B7B',
  margin: 0,
  alignSelf: 'baseline'
}

const ddStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#2F2B3D',
  margin: 0,
  fontVariantNumeric: 'tabular-nums'
}

const metaStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6E6B7B',
  marginTop: 24,
  paddingTop: 16,
  borderTop: '1px solid #E4E5EB',
  lineHeight: 1.6
}

const expiredChipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  marginLeft: 8,
  background: '#ff6500',
  color: '#FFFFFF',
  borderRadius: 999,
  fontSize: 10,
  letterSpacing: 0.8
}
