import assert from 'node:assert/strict'
import test from 'node:test'

import { GL, answerSphere, ctaColors, validateGraphicVoice } from './cta-graphic-voice.mjs'
import { validarPiezaEsquema } from './cta-esquema.mjs'

test('voice is opt-in and fails unsupported or contradictory declarations', () => {
  assert.deepEqual(validateGraphicVoice({ dominant: 'Legacy copy.' }), [])
  const p = { graphicVoice: 'efeonce', align: 'left', lead: '¿Por qué?', dominant: 'Con criterio' }

  assert.deepEqual(validateGraphicVoice(p), [])
  for (const bad of [{ align: 'center' }, { dominant: 'Con criterio.' }, { dominant: 'Una respuesta de cuatro palabras' }, { leadFamily: 'bricolage' }, { dominantTracking: -.07 }])
    assert.ok(validateGraphicVoice({ ...p, ...bad }).length)
  assert.ok(validarPiezaEsquema({ ...p, graphicVoice: 'inventada' }).errores.length)
})

test('sphere follows final line baseline and AXIS optical kerning', () => {
  for (const char of ['r', 'd', 'o', '?']) {
    const s = answerSphere({ lastLine: { right: 600, text: `Marca${char}` }, baseline: 220, size: 100, color: GL.color.teal })

    assert.equal(s.box.bottom, 220)
    assert.equal(s.box.right - s.box.left, 20)
    assert.equal(s.box.left, 600 + 100 * (GL.sphere.opticalGapEm[char] ?? GL.sphere.defaultGapEm))
  }
})

test('Efeonce rejects square outline and solid CTAs without changing text or legacy plans', () => {
  const p = { graphicVoice: 'efeonce', align: 'left', lead: '¿Por qué?', dominant: 'Con criterio' }

  for (const variant of ['outline', 'solid']) {
    for (const radius of [0, undefined]) assert.ok(validateGraphicVoice({ ...p, cta: { variant, radius } }).some(e => e.includes('radio positivo')))
    assert.deepEqual(validateGraphicVoice({ ...p, cta: { variant, radius: 14 } }), [])
  }

  assert.deepEqual(validateGraphicVoice({ ...p, cta: { variant: 'text', radius: 0 } }), [])
  assert.deepEqual(validateGraphicVoice({ cta: { variant: 'outline', radius: 0 } }), [])
})

test('CTA brand aliases resolve to the canonical graphic-line tokens', () => {
  assert.equal(ctaColors.brandAccentOnDark, GL.color.teal)
  assert.equal(ctaColors.brandDark, GL.color.dark)
  assert.equal(ctaColors.inkOnDark, '#ffffff')
})
