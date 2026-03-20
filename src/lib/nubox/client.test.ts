import { describe, expect, it } from 'vitest'

import { decodeNuboxXmlPayload } from '@/lib/nubox/client'

describe('decodeNuboxXmlPayload', () => {
  it('returns raw xml bodies unchanged', () => {
    const xml = '<DTE><Folio>114</Folio></DTE>'

    expect(decodeNuboxXmlPayload(xml)).toBe(xml)
  })

  it('decodes Nubox json payloads with base64 xml', () => {
    const xml = '<DTE><Folio>114</Folio></DTE>'

    const payload = JSON.stringify({
      xml: Buffer.from(xml, 'utf8').toString('base64')
    })

    expect(decodeNuboxXmlPayload(payload)).toBe(xml)
  })
})
