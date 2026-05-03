import type { GreenhouseDeepLinkResolutionContext } from './types'

const DEFAULT_LOCAL_BASE_URL = 'http://localhost:3000'

const trimUrlValue = (value?: string | null) => value?.replace(/\\[rn]/g, '').trim() || ''

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizeBaseUrlCandidate = (value?: string | null) => {
  const trimmed = trimUrlValue(value)

  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return stripTrailingSlash(trimmed)
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed) || trimmed.startsWith('localhost:')) {
    return stripTrailingSlash(`https://${trimmed}`)
  }

  return stripTrailingSlash(trimmed)
}

export const resolveGreenhouseBaseUrl = (context: GreenhouseDeepLinkResolutionContext = {}) => {
  const env = context.env || process.env

  const explicitBaseUrl = normalizeBaseUrlCandidate(context.baseUrl)

  if (explicitBaseUrl) {
    return explicitBaseUrl
  }

  const nextAuthUrl = normalizeBaseUrlCandidate(env.NEXTAUTH_URL)

  if (nextAuthUrl) {
    return nextAuthUrl
  }

  const appUrl = normalizeBaseUrlCandidate(env.NEXT_PUBLIC_APP_URL)

  if (appUrl) {
    return appUrl
  }

  const vercelUrl = trimUrlValue(env.VERCEL_URL)

  if (vercelUrl) {
    return normalizeBaseUrlCandidate(`https://${vercelUrl}`)
  }

  return DEFAULT_LOCAL_BASE_URL
}

export const joinGreenhouseAbsoluteUrl = (baseUrl: string, href: string) => {
  if (/^https?:\/\//i.test(href)) {
    return href
  }

  const normalizedBaseUrl = stripTrailingSlash(baseUrl)
  const normalizedHref = href.startsWith('/') ? href : `/${href}`

  return `${normalizedBaseUrl}${normalizedHref}`
}
