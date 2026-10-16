import { describe, expect, it } from 'vitest'

import { describeDrift, fingerprintSecret, normalizeLiveVersion, serializeSnapshot } from '../snapshot-lib'

// Valores sintéticos con la FORMA de una credencial; ninguno es real.
const FAKE_META_TOKEN = 'EAA' + 'x'.repeat(60)
const FAKE_OPENAI_KEY = 'sk-' + 'y'.repeat(30)

const serverLive = (token: string) => ({
  name: 'v9',
  containerVersionId: '9',
  fingerprint: '123',
  tag: [
    {
      tagId: '7',
      name: 'Meta CAPI',
      type: 'cvt_X',
      parameter: [
        { type: 'template', key: 'pixelId', value: '708931297255942' },
        { type: 'template', key: 'apiAccessToken', value: token }
      ]
    }
  ],
  client: [{ clientId: '1', name: 'GA4', type: 'gaaw_client' }],
  customTemplate: [{ templateId: '30', name: 'Lead ingress', templateData: '___INFO___ code' }],
  builtInVariable: [{ type: 'EVENT_NAME' }, { type: 'CLIENT_NAME' }]
})

describe('normalizeLiveVersion', () => {
  it('tapa el token literal con una huella y nunca deja el valor en el JSON', () => {
    const report = { redacted: [] as string[] }
    const json = serializeSnapshot(normalizeLiveVersion(serverLive(FAKE_META_TOKEN), report))

    expect(json).not.toContain(FAKE_META_TOKEN)
    expect(json).toContain(fingerprintSecret(FAKE_META_TOKEN))
    expect(json).toContain('708931297255942')
    expect(report.redacted).toEqual(['tag/Meta CAPI → apiAccessToken'])
  })

  it('la huella cambia cuando el secreto rota, así la rotación se ve como drift', () => {
    const before = normalizeLiveVersion(serverLive(FAKE_META_TOKEN))
    const after = normalizeLiveVersion(serverLive('EAA' + 'z'.repeat(60)))

    expect(serializeSnapshot(before)).not.toEqual(serializeSnapshot(after))
    expect(describeDrift(before, after)).toEqual(['tags: ~ Meta CAPI'])
  })

  it('conserva una referencia a variable: mover el token a una variable no es un secreto', () => {
    const json = serializeSnapshot(normalizeLiveVersion(serverLive('{{Meta CAPI token}}')))

    expect(json).toContain('{{Meta CAPI token}}')
    expect(json).not.toContain('redacted')
  })

  it('tapa valores con forma de credencial aunque el parámetro tenga nombre inocente', () => {
    const live = { name: 'v1', variable: [{ name: 'Const', parameter: [{ type: 'template', key: 'value', value: FAKE_OPENAI_KEY }] }] }
    const json = serializeSnapshot(normalizeLiveVersion(live))

    expect(json).not.toContain(FAKE_OPENAI_KEY)
  })

  it('descarta ids volátiles y guarda la huella del código de la plantilla, no el código', () => {
    const snapshot = normalizeLiveVersion(serverLive(FAKE_META_TOKEN))
    const json = serializeSnapshot(snapshot)

    expect(json).not.toMatch(/"(tagId|clientId|templateId|fingerprint|containerVersionId)"/)
    expect(json).not.toContain('___INFO___')
    expect(snapshot.customTemplates[0]).toMatchObject({ name: 'Lead ingress', templateDataSha256: expect.stringMatching(/^[0-9a-f]{64}$/) })
    expect(snapshot.builtInVariables).toEqual(['CLIENT_NAME', 'EVENT_NAME'])
  })
})

describe('describeDrift', () => {
  it('lista altas, bajas y cambios por colección', () => {
    const before = normalizeLiveVersion({ name: 'v4', tag: [{ name: 'A', type: 'x' }, { name: 'B', type: 'x' }] })
    const after = normalizeLiveVersion({ name: 'v5', tag: [{ name: 'A', type: 'y' }, { name: 'C', type: 'x' }], client: [{ name: 'GA4', type: 'c' }] })

    expect(describeDrift(before, after)).toEqual([
      'versión: «v4» → «v5»',
      'tags: ~ A',
      'tags: + C',
      'tags: - B',
      'clients: + GA4'
    ])
  })

  it('tolera un snapshot commiteado con el formato anterior (sin clients ni plantillas)', () => {
    const legacy = { name: 'v4', tags: [], triggers: [], variables: [], builtInVariables: [] }

    expect(describeDrift(legacy, normalizeLiveVersion({ name: 'v4' }))).toEqual([])
  })
})
