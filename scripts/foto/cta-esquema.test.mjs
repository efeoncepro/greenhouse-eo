import assert from 'node:assert/strict'
import test from 'node:test'

import { validarPiezaEsquema } from './cta-esquema.mjs'

// Una pieza mínima válida, sin depender de ningún plan del repo.
const base = () => ({
  id: 'p',
  plate: 'p.png',
  lead: 'Entrada',
  dominant: 'Titular',
  dominantSize: 140,
  after: 'Cierre',
  logo: { width: 0.2, y: 'auto' },
  cta: { text: 'Hablemos', descriptor: 'Sin costo', variant: 'outline', x: 'columna', fontSize: 40, descriptorSize: 28, paddingX: 24, paddingY: 12, gapAfterNote: 30 }
})

const errores = p => validarPiezaEsquema(p).errores

test('La pieza mínima es válida', () => {
  assert.deepEqual(errores(base()), [])
})

test('La zona de la firma tiene forma: una zona incompleta o invertida se rechaza (antes era z.any())', () => {
  assert.deepEqual(errores({ ...base(), signatureSafeArea: { profile: 'brand-footer-editorial-v1', x0: 0.08, y0: 0.78, x1: 0.88, y1: 0.87 } }), [])
  assert.ok(errores({ ...base(), signatureSafeArea: { x0: 0.1 } }).some(e => /falta `signatureSafeArea\.y0`/.test(e)))
  assert.ok(errores({ ...base(), signatureSafeArea: { x0: 0.5, y0: 0.9, x1: 0.4, y1: 0.95 } }).some(e => /x0 < x1/.test(e)))
  assert.ok(errores({ ...base(), signatureSafeArea: 'axis' }).length > 0)
})

test('Un campo interno del compositor en la raíz se rechaza (no se inyecta estado resuelto)', () => {
  const p = { ...base(), ctaVarianteResuelta: { elegida: 'solid', tokens: { surfaceToken: 'inkOnDark' } } }

  assert.ok(errores(p).some(e => /`ctaVarianteResuelta`: campo interno del compositor/.test(e)))
  assert.deepEqual(validarPiezaEsquema(p).avisos, [], 'no se avisa como «campo que no lee»: se rechaza')
})

test('Las escalas de la selección tienen techo (una etiqueta de 148 px pasaba con escala 5)', () => {
  assert.ok(errores({ ...base(), cta: { ...base().cta, cursorScale: 4.5 } }).some(e => /`cta\.cursorScale` debe ser ≤ 2/.test(e)))
  assert.ok(errores({ ...base(), cta: { ...base().cta, seleccion: { escala: 5 } } }).some(e => /`cta\.seleccion\.escala` debe ser ≤ 2\.5/.test(e)))
  assert.ok(errores({ ...base(), selection: { scale: 3, cursors: [{ id: 'c', kind: 'collaborator', anchor: 'top-start', label: 'Cliente' }] } }).some(e => /`selection\.scale` debe ser ≤ 2\.5/.test(e)))
  assert.deepEqual(errores({ ...base(), cta: { ...base().cta, cursorScale: 1.1 } }), [])
})

test('Las aprobaciones que apagan una medición aceptan el sha del plate', () => {
  const plate = 'a'.repeat(64)

  assert.deepEqual(errores({ ...base(), conceptoReducido: { razon: 'una sola frase de recordación', aprobadoPor: 'julio-reyes', plate } }), [])
  assert.ok(errores({ ...base(), conceptoReducido: { razon: 'una sola frase de recordación', aprobadoPor: 'julio-reyes', plate: 'no-es-un-sha' } }).some(e => /sha256 del plate/.test(e)))
})
