import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  buildCanonicalQuoteUrl,
  buildShortQuoteUrl,
  buildShortQuoteUrlLabel
} from '../url-builder'

const originalNextAuthUrl = process.env.NEXTAUTH_URL
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

describe('url-builder', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://greenhouse.efeoncepro.com'
    delete process.env.NEXTAUTH_URL
  })

  afterEach(() => {
    if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL
    else process.env.NEXTAUTH_URL = originalNextAuthUrl

    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('builds canonical URL with id, version and token', () => {
    const url = buildCanonicalQuoteUrl({
      quotationId: 'quo-abc',
      versionNumber: 3,
      token: 'tok-xyz'
    })

    expect(url).toBe('https://greenhouse.efeoncepro.com/public/quote/quo-abc/3/tok-xyz')
  })

  it('builds short URL with the /q/[code] path', () => {
    const url = buildShortQuoteUrl('A3kF9pX')

    expect(url).toBe('https://greenhouse.efeoncepro.com/q/A3kF9pX')
  })

  it('strips protocol from short URL label', () => {
    const label = buildShortQuoteUrlLabel('A3kF9pX')

    expect(label).toBe('greenhouse.efeoncepro.com/q/A3kF9pX')
  })

  it('strips trailing slash from base URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/'

    const url = buildShortQuoteUrl('XyZ123A')

    expect(url).toBe('https://example.com/q/XyZ123A')
    expect(url).not.toContain('//q/')
  })
})
