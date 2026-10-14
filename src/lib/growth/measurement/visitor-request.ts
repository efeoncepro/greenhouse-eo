import 'server-only'

import { isIP } from 'node:net'

/** Only the visitor-facing ingress calls this. Workers must reuse its encrypted snapshot. */
export const readVisitorMeasurementRequest = (headers: Pick<Headers, 'get'>) => {
  const normalizeIp = (value: string | null) => {
    const first = value?.split(',')[0]?.trim().replace(/^"|"$/g, '')

    if (!first) return null
    if (isIP(first)) return first
    const bracketed = first.match(/^\[([a-fA-F0-9:]+)\](?::\d{1,5})?$/)?.[1]

    if (bracketed && isIP(bracketed) === 6) return bracketed
    const ipv4 = first.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/)?.[1]

    return ipv4 && isIP(ipv4) === 4 ? ipv4 : null
  }

  // Vercel supplies/sanitizes forwarded headers at this public request boundary.
  const ip = normalizeIp(headers.get('x-forwarded-for')) || normalizeIp(headers.get('x-real-ip'))
  const rawAgent = headers.get('user-agent')?.trim()
  const userAgent = rawAgent && rawAgent.length <= 1024 && !/[\r\n\0]/.test(rawAgent) ? rawAgent : null

  return { ip, userAgent }
}
