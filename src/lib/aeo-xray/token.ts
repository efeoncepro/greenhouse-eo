import { createHash, randomBytes } from 'node:crypto'

export const generateXrayToken = () => `xrg_${randomBytes(32).toString('base64url')}`
export const isXrayToken = (value: unknown): value is string =>
  typeof value === 'string' && /^xrg_[A-Za-z0-9_-]{43}$/.test(value)
export const digestXrayToken = (value: string) => createHash('sha256').update(value).digest('hex')

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, canonical(child)])
    )

  return value
}

export const xrayContentHash = (value: unknown) => digestXrayToken(JSON.stringify(canonical(value)))

export const xrayShareUrl = (token: string, env: Readonly<Record<string, string | undefined>> = process.env) => {
  const base = new URL(env.AEO_XRAY_PUBLIC_BASE_URL?.trim() || 'https://think.efeoncepro.com')

  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/' ||
    !isXrayToken(token)
  )
    throw new Error('invalid_xray_public_base')

  return `${base.origin}/aeo-xray/r/${token}`
}
