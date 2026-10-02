import { readPublicXrayAsset } from '@/lib/aeo-xray/assets'
import { XRAY_PUBLIC_HEADERS, XRAY_PUBLIC_STATUS } from '@/lib/aeo-xray/http'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string; assetId: string }> }) {
  const { token, assetId } = await params

  try {
    const result = await readPublicXrayAsset({
      token,
      assetId,
      clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    })

    if (result.status !== 'ok') {
      return Response.json(
        { code: result.status },
        {
          status: XRAY_PUBLIC_STATUS[result.status],
          headers: { ...XRAY_PUBLIC_HEADERS, ...(result.status === 'rate_limited' ? { 'Retry-After': '60' } : {}) }
        }
      )
    }

    return new Response(result.bytes, { headers: { ...XRAY_PUBLIC_HEADERS, 'Content-Type': 'image/webp' } })
  } catch {
    return Response.json({ code: 'unavailable' }, { status: 503, headers: XRAY_PUBLIC_HEADERS })
  }
}
