import { headers } from 'next/headers'

import { loadPublicQuoteView } from '@/lib/finance/quote-share/load-quote-for-public-view'
import { recordShareView } from '@/lib/finance/quote-share/view-tracker'
import { DEFAULT_LEGAL_ENTITY } from '@/lib/finance/pdf/tokens'
import { PublicQuoteView } from '@/views/greenhouse/finance/public-quote/PublicQuoteView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ quotationId: string; versionNumber: string; token: string }>
  searchParams?: Promise<{ via?: string }>
}

/**
 * TASK-631 — Public quote page.
 *
 * Replaces the verification-only earlier implementation with a full
 * shareable quote view (cover + scope + pricing + terms + actions). The
 * HMAC token verification still gates access — invalid tokens render
 * an error state instead of leaking quote data.
 *
 * URLs that resolve here:
 * - Direct canonical: /public/quote/[id]/[v]/[token]
 * - Short alias: /q/[code] → 301 → here
 * - QR scan from PDF: same canonical URL embedded in the QR
 */
export default async function PublicQuotePage({ params, searchParams }: PageProps) {
  const { quotationId, versionNumber: versionStr, token } = await params
  const versionNumber = Number(versionStr)
  const search = (await searchParams) ?? {}

  if (!Number.isFinite(versionNumber) || versionNumber < 1) {
    return renderInvalidTokenPage()
  }

  const result = await loadPublicQuoteView({ quotationId, versionNumber, token })

  if (result.kind === 'not-found' || result.kind === 'invalid-token') {
    return renderInvalidTokenPage()
  }

  if (result.kind === 'no-secret') {
    return renderNoSecretPage()
  }

  // Best-effort view tracking (don't block render on failure)
  const headerList = await headers()

  recordShareView({
    quotationId,
    versionNumber,
    shortCode: search.via ?? null,
    ipAddress:
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headerList.get('x-real-ip')
      || null,
    userAgent: headerList.get('user-agent'),
    referer: headerList.get('referer')
  }).catch(() => {})

  // result.kind === 'ok' — render full view
  const pdfDownloadUrl = `/api/finance/quotes/${quotationId}/pdf?download=1`
  const acceptUrl = `/api/public/quote/${quotationId}/${versionNumber}/${token}/accept`

  return (
    <PublicQuoteView
      view={result.view}
      pdfDownloadUrl={pdfDownloadUrl}
      acceptUrl={acceptUrl}
      shortCode={search.via ?? null}
    />
  )
}

const renderInvalidTokenPage = () => (
  <div style={pageStyle}>
    <div style={{ ...cardStyle, borderTop: '4px solid #bb1954' }}>
      <svg width='56' height='56' viewBox='0 0 24 24' fill='none' stroke='#bb1954' strokeWidth='1.5' style={{ display: 'block', margin: '0 auto 16px' }}>
        <circle cx='12' cy='12' r='10' />
        <path d='M9 9l6 6M15 9l-6 6' />
      </svg>
      <h1 style={titleStyle}>No pudimos verificar este enlace</h1>
      <p style={subtitleStyle}>
        El link que estás abriendo es inválido, fue revocado, o el documento fue alterado.
        Si recibiste este link de Efeonce, contacta a tu account lead para que te emita una nueva cotización.
      </p>
      <p style={metaStyle}>
        <strong>{DEFAULT_LEGAL_ENTITY.legalName}</strong> · RUT {DEFAULT_LEGAL_ENTITY.taxId}
        <br />
        Si tienes dudas sobre la autenticidad de este link, escríbenos a contacto@efeoncepro.com.
      </p>
    </div>
  </div>
)

const renderNoSecretPage = () => (
  <div style={pageStyle}>
    <div style={cardStyle}>
      <h1 style={titleStyle}>Verificación no disponible</h1>
      <p style={subtitleStyle}>
        El sistema de verificación está temporalmente no disponible. Por favor contacta a tu
        account lead para confirmar la autenticidad del documento.
      </p>
      <p style={metaStyle}>
        <strong>{DEFAULT_LEGAL_ENTITY.legalName}</strong> · RUT {DEFAULT_LEGAL_ENTITY.taxId}
      </p>
    </div>
  </div>
)

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
  maxWidth: 480,
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '40px 32px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  textAlign: 'center'
}

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: '#023c70',
  margin: '0 0 12px 0',
  lineHeight: 1.2
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#2F2B3D',
  lineHeight: 1.55,
  marginBottom: 24
}

const metaStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#A5A3AE',
  marginTop: 24,
  paddingTop: 16,
  borderTop: '1px solid #E4E5EB',
  lineHeight: 1.6
}
