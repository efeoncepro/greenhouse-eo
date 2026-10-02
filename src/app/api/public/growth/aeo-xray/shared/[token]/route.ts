import { XRAY_PUBLIC_HEADERS, XRAY_PUBLIC_STATUS } from '@/lib/aeo-xray/http'
import { resolvePublicXray } from '@/lib/aeo-xray/public-reader'

export const dynamic = 'force-dynamic'

/** No session: a revocable 256-bit bearer authorizes exactly one immutable edition. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    const result = await resolvePublicXray({
      token,
      clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    })

    return Response.json(result.status === 'ok' ? result.body : { code: result.status }, {
      status: XRAY_PUBLIC_STATUS[result.status],
      headers: { ...XRAY_PUBLIC_HEADERS, ...(result.status === 'rate_limited' ? { 'Retry-After': '60' } : {}) }
    })
  } catch {
    // Never capture an exception containing this request URL or authored manifest.
    return Response.json({ code: 'unavailable' }, { status: 503, headers: XRAY_PUBLIC_HEADERS })
  }
}
