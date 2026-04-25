import { NextResponse } from 'next/server'

import {
  resolveQuoteShortLink,
  trackShortLinkAccess
} from '@/lib/finance/quote-share/short-link'
import { buildCanonicalQuoteUrl } from '@/lib/finance/quote-share/url-builder'

export const dynamic = 'force-dynamic'

/**
 * TASK-631 — Short URL resolver.
 *
 * `GET /q/[shortCode]` →
 *   - 301 to canonical /public/quote/[id]/[v]/[token] when the link is active
 *   - 410 Gone with status hint when the link is revoked or expired
 *   - 404 Not Found when the short code doesn't exist
 *
 * Access tracking is best-effort: failures are logged but never block the
 * redirect. Browsers cache the 301 → second hits don't even reach this
 * route, so the access count under-reports compared to "true views". This
 * is acceptable — for accurate view tracking we instrument the public
 * quote page itself.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params

  const result = await resolveQuoteShortLink(shortCode)

  if (!result) {
    return new NextResponse('Not found', { status: 404 })
  }

  if (result.status === 'revoked') {
    return NextResponse.redirect(
      buildCanonicalQuoteUrl({
        quotationId: 'revoked',
        versionNumber: 1,
        token: 'revoked'
      }),
      { status: 410 }
    )
  }

  if (result.status === 'expired') {
    return NextResponse.redirect(
      buildCanonicalQuoteUrl({
        quotationId: 'expired',
        versionNumber: 1,
        token: 'expired'
      }),
      { status: 410 }
    )
  }

  // Best-effort tracking — never block the redirect on this
  trackShortLinkAccess(shortCode).catch(() => {})

  return NextResponse.redirect(
    buildCanonicalQuoteUrl({
      quotationId: result.link.quotationId,
      versionNumber: result.link.versionNumber,
      token: result.link.fullToken
    }),
    { status: 301 }
  )
}
