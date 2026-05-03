import { describe, expect, it } from 'vitest'

import { extractRutsFromText } from '../identity-lookup'

describe('TASK-768 extractRutsFromText', () => {
  it('extrae RUT chileno con DV numérico', () => {
    expect(extractRutsFromText('Transf.Internet a 27.836.817-3')).toEqual(['27.836.817-3'])
  })

  it('normaliza DV K minúscula a mayúscula', () => {
    expect(extractRutsFromText('Transf.Internet a 20.557.199-k')).toEqual(['20.557.199-K'])
  })

  it('extrae múltiples RUTs', () => {
    const text = 'Transferencia desde 12.345.678-9 a 76.123.456-K via banco'

    expect(extractRutsFromText(text)).toEqual(['12.345.678-9', '76.123.456-K'])
  })

  it('no extrae números que no son RUTs (cuentas bancarias, fechas, etc.)', () => {
    expect(extractRutsFromText('Pago factura 12345 fecha 2026-04-15')).toEqual([])
    expect(extractRutsFromText('Cuenta 0078123456789')).toEqual([])
  })

  it('retorna array vacío para input nulo o vacío', () => {
    expect(extractRutsFromText(null)).toEqual([])
    expect(extractRutsFromText(undefined)).toEqual([])
    expect(extractRutsFromText('')).toEqual([])
  })

  it('extrae RUT con múltiples segmentos (15.123.456-7)', () => {
    expect(extractRutsFromText('PAGO 15.123.456-7')).toEqual(['15.123.456-7'])
  })

  it('NO extrae RUT mal formado (sin guión / sin DV)', () => {
    expect(extractRutsFromText('Pago 12.345.678 sin DV')).toEqual([])
    expect(extractRutsFromText('Pago 12345678-9 sin puntos')).toEqual([])
  })
})
