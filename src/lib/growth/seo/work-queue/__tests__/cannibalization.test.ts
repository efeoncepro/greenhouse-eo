import { describe, expect, it } from 'vitest'

import { deriveBrandToken, evaluateCannibalization, isBrandQuery } from '../cannibalization'
import { getPriorityScoreConfig } from '../score-versions'

const V1 = getPriorityScoreConfig('incremental-clicks-v1')
const V2 = getPriorityScoreConfig('incremental-clicks-v2')

describe('TASK-1700 v2 — predicado de canibalización', () => {
  describe('etiqueta de marca desde el dominio', () => {
    it.each([
      ['berel.com', 'berel'],
      ['www.berel.com', 'berel'],
      ['https://berel.com/', 'berel'],
      ['berel.com.mx', 'berel'],
      ['efeoncepro.com', 'efeoncepro']
    ])('%s → %s', (domain, expected) => {
      expect(deriveBrandToken(domain)).toBe(expected)
    })

    it('sin dominio no hay etiqueta, y el predicado degrada a v1 en vez de adivinar', () => {
      expect(deriveBrandToken(null)).toBeNull()
      expect(deriveBrandToken('')).toBeNull()
      expect(isBrandQuery('lo que sea', null)).toBe(false)
    })
  })

  describe('clasificación de marca', () => {
    it('la subcadena atrapa las variantes reales del caso Berel', () => {
      expect(isBrandQuery('pinturas berel precios', 'berel')).toBe(true)
      expect(isBrandQuery('berelex', 'berel')).toBe(true)
      expect(isBrandQuery('pintura berel', 'berel')).toBe(true)
    })

    it('no-marca es no-marca', () => {
      expect(isBrandQuery('pinturas', 'berel')).toBe(false)
      expect(isBrandQuery('sellador', 'berel')).toBe(false)
    })

    it('pliega acentos: la normalización de keywords baja a minúsculas pero NO quita tildes', () => {
      expect(isBrandQuery('pintúras beréL', 'berel')).toBe(true)
    })

    it('🔴 tolera UN error de tipeo: era el modo de falla dominante medido en berel.com', () => {
      // Los siete salieron de producción: gente buscando la marca y escribiéndola mal.
      // Ninguno contiene "berel", y sin esta tolerancia entraban como canibalización — a
      // `bereñ` (38 páginas) el operador recibía "fusiona 38 URLs" por un error de tipeo.
      for (const typo of ['bereñ', 'pintura verel', 'pinturas bere', 'berol', 'berrl', 'pintura betel', 'berem']) {
        expect(isBrandQuery(typo, 'berel'), `"${typo}" debería leerse como marca`).toBe(true)
      }
    })

    it('la tolerancia no se desborda: dos errores ya no es la marca', () => {
      expect(isBrandQuery('vwrol', 'berel')).toBe(false)
      // Palabras cortas quedan fuera de la tolerancia: con 3 letras, distancia 1 no discrimina.
      expect(isBrandQuery('sol', 'col')).toBe(false)
    })

    it('🔴 una etiqueta corta exige palabra completa: la subcadena se comería whisky', () => {
      expect(isBrandQuery('whisky barato', 'sky')).toBe(false)
      expect(isBrandQuery('skyline', 'sky')).toBe(false)
      expect(isBrandQuery('vuelos sky', 'sky')).toBe(true)
    })
  })

  describe('veredicto', () => {
    const base = { normalizedKeyword: 'pinturas', brandToken: 'berel' }

    it('🔴 el caso que motivó v2: 41 páginas con el 99,3 % en una NO es canibalización', () => {
      const v = evaluateCannibalization(
        { ...base, competingPages: 41, mainPageImpressions: 99_300, totalImpressions: 100_000 },
        V2
      )

      expect(v.cannibalized).toBe(false)
      expect(v.mainPageShare).toBeCloseTo(0.993, 3)
    })

    it('v1 sobre el MISMO caso decía que sí — por eso hubo bump', () => {
      expect(
        evaluateCannibalization(
          { ...base, competingPages: 41, mainPageImpressions: 99_300, totalImpressions: 100_000 },
          V1
        ).cannibalized
      ).toBe(true)
    })

    it('dilución real sí es canibalización', () => {
      expect(
        evaluateCannibalization(
          { ...base, competingPages: 3, mainPageImpressions: 4_000, totalImpressions: 10_000 },
          V2
        ).cannibalized
      ).toBe(true)
    })

    it('🔴 una query de marca diluida NO es canibalización: el sitio ocupa su propia SERP', () => {
      const v = evaluateCannibalization(
        {
          normalizedKeyword: 'pinturas berel precios',
          brandToken: 'berel',
          competingPages: 30,
          mainPageImpressions: 3_000,
          totalImpressions: 30_000
        },
        V2
      )

      expect(v.isBrand).toBe(true)
      expect(v.cannibalized).toBe(false)
    })

    it('🔴 el share se mide sobre TODAS las páginas, aunque la ganadora no sea fusionable', () => {
      // Regresión medida: al excluir la home también del denominador, `pinturas` pasaba de
      // 99,3 % de concentración a 13,2 % y volvía a salir "canibalizada" — el caso exacto
      // que v2 corrige. Su página dominante ERA la home. Contar páginas fusionables y medir
      // concentración son dos preguntas distintas, y mezclarlas invierte el veredicto.
      const v = evaluateCannibalization(
        { ...base, competingPages: 37, mainPageImpressions: 99_600, totalImpressions: 100_000 },
        V2
      )

      expect(v.cannibalized).toBe(false)
      expect(v.mainPageShare).toBeCloseTo(0.996, 3)
    })

    it('una sola página nunca canibaliza, y el share no se puede afirmar', () => {
      const v = evaluateCannibalization(
        { ...base, competingPages: 1, mainPageImpressions: 500, totalImpressions: 500 },
        V2
      )

      expect(v.cannibalized).toBe(false)
      expect(v.mainPageShare).toBeNull()
    })

    it('sin impresiones no se divide por cero ni se inventa un share', () => {
      const v = evaluateCannibalization(
        { ...base, competingPages: 4, mainPageImpressions: 0, totalImpressions: 0 },
        V2
      )

      expect(v.cannibalized).toBe(false)
      expect(v.mainPageShare).toBeNull()
    })

    it('el umbral es inclusivo: exactamente 0,70 califica', () => {
      expect(
        evaluateCannibalization(
          { ...base, competingPages: 2, mainPageImpressions: 700, totalImpressions: 1_000 },
          V2
        ).cannibalized
      ).toBe(true)
      expect(
        evaluateCannibalization(
          { ...base, competingPages: 2, mainPageImpressions: 701, totalImpressions: 1_000 },
          V2
        ).cannibalized
      ).toBe(false)
    })
  })
})
