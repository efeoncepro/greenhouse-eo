import 'server-only'
import { isXrayToken, digestXrayToken, xrayContentHash } from './token'
import { readXrayByDigest, consumeXrayRate } from './store'
import type { XrayPublicResult } from './types'

export interface XrayPublicDependencies {
  read: typeof readXrayByDigest
  rate: typeof consumeXrayRate
  now: () => number
}

export function createXrayPublicReader(deps: XrayPublicDependencies) {
  return async ({
    token,
    clientIp,
    env = process.env
  }: {
    token: string
    clientIp: string | null
    env?: Readonly<Record<string, string | undefined>>
  }): Promise<XrayPublicResult> => {
    if (env.AEO_XRAY_SHARING_ENABLED !== 'true') return { status: 'not_found' }
    if (!isXrayToken(token)) return { status: 'not_found' }

    try {
      const ip = digestXrayToken(`xray:ip:${env.AEO_XRAY_RATE_SALT ?? 'xray-public-v1'}:${clientIp ?? 'unknown'}`)

      if (!(await deps.rate(ip, 120))) return { status: 'rate_limited' }
      const digest = digestXrayToken(token)

      if (!(await deps.rate(digestXrayToken(`xray:grant:${digest}`), 60))) return { status: 'rate_limited' }
      const r = await deps.read(digest)

      if (!r) return { status: 'not_found' }
      if (!r.organizationActive) return { status: 'not_found' }
      if (r.revokedAt || r.withdrawnAt) return { status: 'gone' }
      if (Date.parse(r.expiresAt) <= deps.now()) return { status: 'not_found' }
      if (r.modelVersion !== '1.0' || r.contentHash !== xrayContentHash(r.manifest) || r.manifest.status !== 'resolved')
        return { status: 'unavailable' }

      return {
        status: 'ok',
        body: {
          modelVersion: '1.0',
          header: { title: r.manifest.title, preparedFor: r.manifest.preparedFor, editionId: r.editionId },
          model: r.manifest,
          expiresAt: r.expiresAt
        }
      }
    } catch {
      return { status: 'unavailable' }
    }
  }
}

export const resolvePublicXray = createXrayPublicReader({
  read: readXrayByDigest,
  rate: consumeXrayRate,
  now: Date.now
})
