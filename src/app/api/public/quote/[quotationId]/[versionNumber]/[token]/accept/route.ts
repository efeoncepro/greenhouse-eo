import { NextResponse } from 'next/server'

import { sendSlackAlert } from '@/lib/alerts/slack-notify'
import { recordQuoteAcceptance } from '@/lib/finance/quote-share/accept-quote'
import { loadPublicQuoteView } from '@/lib/finance/quote-share/load-quote-for-public-view'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ quotationId: string; versionNumber: string; token: string }>
}

interface AcceptRequestBody {
  acceptedByName?: string
  acceptedByRole?: string
  shortCode?: string
}

const getClientIp = (request: Request): string | null => {
  const headers = request.headers

  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || null
  )
}

/**
 * TASK-631 Fase 2 — Public acceptance endpoint.
 *
 * POST /api/public/quote/[quotationId]/[versionNumber]/[token]/accept
 * Body: { acceptedByName, acceptedByRole?, shortCode? }
 *
 * Validates the HMAC token (same as the public page does), then records
 * the acceptance. Idempotent — re-accepting returns the original record.
 *
 * No auth required (public endpoint), but the HMAC token is the
 * authentication: only someone with a valid PDF/short link can accept.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { quotationId, versionNumber: versionStr, token } = await params
  const versionNumber = Number(versionStr)

  if (!Number.isFinite(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: 'Invalid version' }, { status: 400 })
  }

  // Re-validate token via the same path the page uses
  const result = await loadPublicQuoteView({ quotationId, versionNumber, token })

  if (result.kind === 'not-found' || result.kind === 'invalid-token') {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
  }

  if (result.kind === 'no-secret') {
    return NextResponse.json(
      { error: 'Acceptance not available — server misconfiguration' },
      { status: 503 }
    )
  }

  // Parse body
  const body = (await request.json().catch(() => ({}))) as AcceptRequestBody

  if (!body.acceptedByName?.trim()) {
    return NextResponse.json(
      { error: 'acceptedByName is required' },
      { status: 400 }
    )
  }

  const acceptanceResult = await recordQuoteAcceptance({
    quotationId,
    versionNumber,
    acceptedByName: body.acceptedByName,
    acceptedByRole: body.acceptedByRole ?? null,
    acceptedViaShortCode: body.shortCode ?? null,
    acceptedIp: getClientIp(request)
  })

  if (acceptanceResult.kind === 'not-found') {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  if (acceptanceResult.kind === 'version-mismatch') {
    return NextResponse.json(
      {
        error: 'Version mismatch',
        currentVersion: acceptanceResult.currentVersion,
        message: 'Hay una versión más reciente de esta cotización. Por favor refresca la página.'
      },
      { status: 409 }
    )
  }

  // Best-effort Slack notification (only on FIRST acceptance, not idempotent re-accepts)
  if (!acceptanceResult.alreadyAccepted) {
    sendSlackAlert(
      `:white_check_mark: *Cotización ${result.view.quotationNumber} v${versionNumber} aceptada*\n` +
        `Cliente: ${result.view.clientName ?? 'sin nombre'}\n` +
        `Aceptada por: *${acceptanceResult.record.acceptedByName}*${acceptanceResult.record.acceptedByRole ? ` (${acceptanceResult.record.acceptedByRole})` : ''}\n` +
        `Total: ${result.view.totals.total} ${result.view.currency}`
    ).catch(() => {})
  }

  return NextResponse.json({
    accepted: true,
    acceptedAt: acceptanceResult.record.acceptedAt,
    acceptedByName: acceptanceResult.record.acceptedByName,
    alreadyAccepted: acceptanceResult.alreadyAccepted
  })
}
