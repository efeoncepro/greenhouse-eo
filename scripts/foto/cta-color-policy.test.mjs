import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'

import { campaignColorPolicySchema, resolveCtaColorPolicy, resolveColorPolicyPath } from './cta-color-policy.mjs'
import { validarPiezaEsquema } from './cta-esquema.mjs'

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cta-color-test-'))

  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))

  const policy = {
    version: 1, id: 'test-v1', campaignId: 'CMP-999',
    direction: { paletteReason: 'Paleta de prueba explícita.', sceneRole: 'La foto conserva su color.', textRole: 'El texto organiza la lectura.', actionRole: 'El CTA se identifica por su borde.' },
    palette: ['inkOnDark', 'inkOnLight', 'accentSurface'],
    treatments: [{ id: 'neutral', strategy: 'neutral', prominence: 'delimitada', variant: 'outline', inkToken: 'inkOnDark', surfaceToken: 'inkOnDark', reason: 'Contraste de luminancia sobre fondo oscuro.' }]
  }

  const cta = { variant: 'outline', prominencia: 'delimitada', inkToken: 'inkOnDark', surfaceToken: 'inkOnDark', colorPolicy: { version: 1, campaignId: 'CMP-999', source: 'policy.json', sha256: '', treatment: 'neutral', reason: 'Conecta la acción con la tipografía de esta escena.' } }

  const write = () => {
    const bytes = JSON.stringify(policy)

    fs.writeFileSync(path.join(dir, 'policy.json'), bytes)
    cta.colorPolicy.sha256 = createHash('sha256').update(bytes).digest('hex')
  }

  write()
  
return { dir, policy, cta, write, resolve: () => resolveCtaColorPolicy(cta, dir) }
}

test('legacy permanece sin política ni tokens nuevos', () => {
  const cta = { variant: 'auto' }

  assert.equal(resolveCtaColorPolicy(cta, '/inexistente'), null)
  assert.deepEqual(cta, { variant: 'auto' })
})

test('resuelve roles reales sin modificar el plan y mantiene revisión visual pendiente', t => {
  const f = fixture(t); const before = structuredClone(f.cta)
  const r = f.resolve()

  assert.deepEqual(r.roles, { ink: { token: 'inkOnDark', value: '#ffffff' }, border: { token: 'inkOnDark', value: '#ffffff' } })
  assert.equal(r.visualReview, 'required')
  assert.deepEqual(f.cta, before)
})

test('reproducción desde otra carpeta conserva exactamente la decisión', t => {
  const f = fixture(t)
  const piece = { cta: f.cta }
  const moved = resolveColorPolicyPath(piece, f.dir)

  assert.deepEqual(resolveCtaColorPolicy(moved.cta, os.tmpdir()), f.resolve())
  assert.equal(piece.cta.colorPolicy.source, 'policy.json')
})

test('política alterada, ausente o JSON inválido falla sin fallback', t => {
  const f = fixture(t)

  fs.appendFileSync(path.join(f.dir, 'policy.json'), ' ')
  assert.throws(f.resolve, /sha256: la política cambió/)
  fs.unlinkSync(path.join(f.dir, 'policy.json'))
  assert.throws(f.resolve, /ausente, ilegible/)
  fs.writeFileSync(path.join(f.dir, 'policy.json'), '{')
  f.cta.colorPolicy.sha256 = createHash('sha256').update('{').digest('hex')
  assert.throws(f.resolve, /JSON inválido/)
})

test('no acepta campaña distinta, tratamiento inexistente ni versiones desconocidas', t => {
  const f = fixture(t)

  f.cta.colorPolicy.campaignId = 'CMP-998'
  assert.throws(f.resolve, /otra campaña/)
  f.cta.colorPolicy.campaignId = 'CMP-999'; f.cta.colorPolicy.treatment = 'otro'
  assert.throws(f.resolve, /tratamiento no existe/)
  f.cta.colorPolicy.treatment = 'neutral'; f.policy.version = 2; f.write()
  assert.throws(f.resolve, /política cromática/)
  f.policy.version = 1; f.write(); f.cta.colorPolicy.version = 2
  assert.throws(f.resolve, /cta.colorPolicy/)
})

test('tokens, variante y prominencia deben coincidir; no rellena omisiones ni acepta auto', t => {
  const f = fixture(t); const original = structuredClone(f.cta)

  for (const [key, values] of Object.entries({ inkToken: ['inkOnLight', undefined], surfaceToken: ['accentSurface', undefined], variant: ['solid', 'auto'], prominencia: ['destacada', undefined] })) {
    for (const value of values) {
      f.cta[key] = value
      assert.throws(f.resolve, new RegExp(`cta.${key}`))
      f.cta[key] = original[key]
    }
  }
})

test('todos los tratamientos de campaña deben pertenecer a su paleta', t => {
  const f = fixture(t)

  f.policy.treatments.push({ ...f.policy.treatments[0], id: 'otro', surfaceToken: 'growthOnDark' }); f.write()
  assert.throws(f.resolve, /fuera de la paleta/)
  f.policy.treatments[1].surfaceToken = 'noExiste'; f.write()
  assert.throws(f.resolve, /política cromática/)
})

test('IDs duplicados, campos desconocidos y tintas inventadas son inválidos', t => {
  const f = fixture(t)

  f.policy.treatments.push(structuredClone(f.policy.treatments[0]))
  assert.equal(campaignColorPolicySchema.safeParse(f.policy).success, false)
  f.policy.treatments.pop(); f.policy.desactivarContraste = true
  assert.equal(campaignColorPolicySchema.safeParse(f.policy).success, false)
  delete f.policy.desactivarContraste; f.policy.palette.push('#ffffff')
  assert.equal(campaignColorPolicySchema.safeParse(f.policy).success, false)
})

test('text sólo tiene tinta; solid registra relleno y tinta por separado', t => {
  const f = fixture(t)

  for (const variant of ['text', 'solid']) {
    const chosen = f.policy.treatments[0]

    chosen.variant = f.cta.variant = variant

    if (variant === 'text') { delete chosen.surfaceToken; delete f.cta.surfaceToken }
    else { chosen.surfaceToken = f.cta.surfaceToken = 'inkOnDark'; chosen.inkToken = f.cta.inkToken = 'inkOnLight' }

    f.write()
    assert.deepEqual(Object.keys(f.resolve().roles), variant === 'text' ? ['ink'] : ['ink', 'fill'])
  }
})

test('no simula superficies que no se pintan ni omite las que sí se pintan', t => {
  const f = fixture(t)

  f.policy.treatments[0].variant = 'text'; f.write()
  assert.throws(f.resolve, /text no pinta superficie/)
  f.policy.treatments[0].variant = 'solid'; delete f.policy.treatments[0].surfaceToken; f.write()
  assert.throws(f.resolve, /borde o relleno explícito/)
})

test('el esquema de pieza reconoce la referencia estricta y rechaza URLs y campos desconocidos', t => {
  const f = fixture(t)
  const piece = { id: 'p', plate: 'p.png', lead: 'Entrada', dominant: 'Titular', dominantSize: 140, after: 'Cierre', logo: { width: 0.2, y: 'auto' }, cta: { ...f.cta, text: 'Hablemos', descriptor: 'Agencia creativa', x: 'columna', fontSize: 40, descriptorSize: 28, paddingX: 24, paddingY: 12, gapAfterNote: 30 } }

  assert.deepEqual(validarPiezaEsquema(piece).errores, [])
  piece.cta.colorPolicy.source = 'https://example.com/policy.json'
  assert.ok(validarPiezaEsquema(piece).errores.length)
  piece.cta.colorPolicy.source = 'policy.json'; piece.cta.colorPolicy.bypass = true
  assert.ok(validarPiezaEsquema(piece).errores.length)
})
