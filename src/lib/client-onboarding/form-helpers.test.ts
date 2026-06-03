import { describe, expect, it } from 'vitest'

import { toCanonicalSpaceType, currencyForCountry, isTaxIdValidForCountry, normalizeTaxId } from './form-helpers'

// TASK-992 — Regresión del bug que rompía el alta de cliente: el wizard mandaba
// spaceType='client' (vocabulario UI) pero greenhouse_core.spaces.space_type solo
// acepta 'client_space'|'internal_space' (CHECK). El INSERT fallaba (23514) y se
// manifestaba como el genérico "ciclo de vida". El mapper canónico es la única
// traducción UI→DB; estos tests fijan ese contrato.
describe('toCanonicalSpaceType (TASK-992 — space_type CHECK regression)', () => {
  it('mapea el vocabulario UI a los 2 valores canónicos del CHECK', () => {
    expect(toCanonicalSpaceType('client')).toBe('client_space')
    expect(toCanonicalSpaceType('internal')).toBe('internal_space')
    // partner = externo → client_space (no hay valor 'partner_space' en el CHECK)
    expect(toCanonicalSpaceType('partner')).toBe('client_space')
  })

  it('es idempotente sobre los valores canónicos', () => {
    expect(toCanonicalSpaceType('client_space')).toBe('client_space')
    expect(toCanonicalSpaceType('internal_space')).toBe('internal_space')
  })

  it('NUNCA devuelve un valor fuera del CHECK (default seguro = client_space)', () => {
    const allowed = new Set(['client_space', 'internal_space'])

    for (const input of ['client', 'internal', 'partner', 'client_space', 'internal_space', '', 'cualquier_cosa', null, undefined]) {
      expect(allowed.has(toCanonicalSpaceType(input as never))).toBe(true)
    }
  })
})

describe('form-helpers — derivaciones del wizard', () => {
  it('currencyForCountry deriva la moneda esperada (MX→MXN, CL→CLP)', () => {
    expect(currencyForCountry('MX')).toBe('MXN')
    expect(currencyForCountry('CL')).toBe('CLP')
  })

  it('normalizeTaxId limpia puntos/guiones/espacios y normaliza a mayúsculas', () => {
    expect(normalizeTaxId('PBE970101718')).toBe('PBE970101718')
    expect(normalizeTaxId('pbe97.0101-718')).toBe('PBE970101718')
  })

  it('isTaxIdValidForCountry acepta el RFC MX de Berel', () => {
    expect(isTaxIdValidForCountry('PBE970101718', 'MX')).toBe(true)
  })
})
