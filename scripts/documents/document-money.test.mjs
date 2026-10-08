import test from 'node:test'
import assert from 'node:assert/strict'

import { currencyInfo, toMinor, fromMinor, taxMinor, formatMoney, createMoneyPresentation } from './document-money.mjs'

const fx = {
  from: 'USD',
  to: 'PEN',
  rate: '3.437',
  date: '2026-10-06',
  source: 'BCRPData SBS venta',
  sourceUrl: 'https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04640PD/html',
  purpose: 'reference_conversion'
}

const context = (snapshot = fx) =>
  createMoneyPresentation({ currency: 'USD', date: '2026-10-08', presentation: { currency: 'PEN', fx: snapshot } })

test('decimales ISO, separadores locales y límites seguros', () => {
  assert.equal(currencyInfo('CLP').precision, 0)
  assert.equal(currencyInfo('PEN').precision, 2)
  assert.equal(currencyInfo('KWD').precision, 3)
  assert.equal(formatMoney(4800000, 'CLP'), '$4.800.000')
  assert.equal(formatMoney(272210.4, 'PEN'), 'S/ 272,210.40')
  assert.equal(toMinor('12.34', 'USD'), 1234n)
  assert.throws(() => toMinor('12.345', 'PEN'), /decimales/)
  assert.throws(() => toMinor(10.5, 'CLP'), /decimales/)
  assert.throws(() => toMinor('9007199254740992', 'USD'), /segura/)
  assert.throws(() => fromMinor(9007199254740991n, 'PEN'), /segura/)
  assert.throws(() => currencyInfo('ZZZ'), /ISO/)
})

test('half-up decimal exacto en impuestos y conversión, incluidos casos frontera', () => {
  assert.equal(taxMinor(50n, 0.19), 10n)
  assert.equal(taxMinor(5n, 0.1), 1n)
  const p = context({ ...fx, rate: '1.005' })

  assert.equal(p.convert(1), 1.01)
  assert.equal(p.convert(0.01), 0.01)
  assert.equal(formatMoney(1.005, 'USD'), 'US$1,01')
})

test('suma de programa, proyectos e hitos sin doble conversión', () => {
  const p = context()

  assert.equal(p.convert(79200), 272210.4)
  assert.equal(p.convert(89200), 306580.4)
  assert.equal(p.convert(54000) + p.convert(25200), p.convert(79200))
  assert.equal(p.convert(4500), 15466.5)
  assert.equal(p.convert(500, 2), 859.25)
  assert.equal(p.convert(89200, 12), 25548.37) // no convertir un promedio USD ya redondeado
  assert.equal(p.sourceCurrency, 'USD')
})

test('rechaza tasa ausente, cero, invertida, sin fuente o con fecha futura', () => {
  for (const snapshot of [
    undefined,
    { ...fx, rate: 0 },
    { ...fx, from: 'PEN', to: 'USD' },
    { ...fx, source: '' },
    { ...fx, date: '2026-10-09' },
    { ...fx, sourceUrl: 'http://example.com' },
    { ...fx, sourceUrl: 'https://user:password@example.com' }
  ])
    assert.throws(() => context(snapshot === undefined ? null : snapshot))
  assert.throws(
    () => createMoneyPresentation({ currency: 'USD', presentation: { currency: 'USD', fx }, date: '2026-10-08' }),
    /iguales/
  )
  assert.throws(() => context().convert(100, 0), /Divisor/)
})
