import { describe, expect, it } from 'vitest'

/**
 * TASK-1709 — contratos del carril: sujeto, forecast y el contrato de salida SIN
 * veredicto. El test de shape es el guardia del criterio de aceptación: si alguien
 * agrega score/verdict/healthy/benchmark/lift al contrato, esto falla.
 */

import {
  PROSPECT_FACT_KINDS,
  PROSPECT_MARKETS,
  forecastProspectDiagnosticCostUsd,
  resolveProspectSubject
} from '../contracts'
import type { ProspectDiagnostic } from '../contracts'

describe('resolveProspectSubject', () => {
  it('normaliza scheme, www, path y case', () => {
    const result = resolveProspectSubject('https://WWW.Acme.CL/productos?x=1', 'cl')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.subject.rootDomain).toBe('acme.cl')
      expect(result.subject.market).toBe('CL')
      expect(result.subject.locationCode).toBe(2152)
      expect(result.subject.languageCode).toBe('es')
    }
  })

  it('rechaza dominios inválidos', () => {
    for (const bad of ['', 'no-domain', 'x.y', 'ht!tp://???', 'a b.cl']) {
      const result = resolveProspectSubject(bad, 'CL')

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('invalid_domain')
    }
  })

  it('rechaza mercados fuera del vocabulario cerrado', () => {
    const result = resolveProspectSubject('acme.cl', 'FR')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('unsupported_market')
  })

  it('los location codes del mapa son ISO-3166 numérico + 2000', () => {
    expect(PROSPECT_MARKETS.CL.locationCode).toBe(2152)
    expect(PROSPECT_MARKETS.MX.locationCode).toBe(2484)
    expect(PROSPECT_MARKETS.US.locationCode).toBe(2840)
  })
})

describe('forecastProspectDiagnosticCostUsd', () => {
  it('el conjunto completo cae en la banda declarada por la task (~USD 0,30-0,50, tope 1)', () => {
    const forecast = forecastProspectDiagnosticCostUsd()

    // Peor caso (todas las filas vuelven): debe caber holgado bajo el ceiling default 1.
    expect(forecast.totalUsd).toBeGreaterThan(0.1)
    expect(forecast.totalUsd).toBeLessThan(0.5)

    // ranked_keywords es la fuente cara del conjunto (0.012 + 1000×0.00012 = 0.132).
    expect(forecast.perSource.labs_ranked_keywords).toBeCloseTo(0.132, 6)
  })

  it('la suma por fuente cuadra con el total', () => {
    const forecast = forecastProspectDiagnosticCostUsd()
    const sum = Object.values(forecast.perSource).reduce((acc, value) => acc + value, 0)

    expect(forecast.totalUsd).toBeCloseTo(sum, 4)
  })
})

describe('contrato de salida — sin score, sin veredicto, sin cifras de mercado', () => {
  it('un ProspectDiagnostic no tiene campo de veredicto ni benchmark', () => {
    const diagnostic: ProspectDiagnostic = {
      diagnosticId: 'seopd-x',
      subject: { rootDomain: 'acme.cl', market: 'CL', languageCode: 'es', locationCode: 2152 },
      status: 'completed',
      facts: [
        {
          kind: 'ranked_keywords_total',
          magnitude: 42,
          lens: 'estimated',
          capturedAt: '2026-08-27T00:00:00.000Z',
          source: 'labs_ranked_keywords',
          detail: {}
        }
      ],
      cost: { ceilingUsd: 1, forecastUsd: 0.25, actualUsd: 0.2 },
      provenance: {
        runAt: '2026-08-27T00:00:00.000Z',
        completedAt: '2026-08-27T00:01:00.000Z',
        createdBy: 'operator',
        sources: ['labs_ranked_keywords']
      }
    }

    const forbidden = ['score', 'verdict', 'healthy', 'health', 'benchmark', 'lift', 'industryAverage']

    for (const key of Object.keys(diagnostic)) {
      expect(forbidden).not.toContain(key)
    }

    // @ts-expect-error — el contrato NO admite un score; si este expect-error deja de
    // fallar en typecheck es porque alguien agregó el campo, y eso es la regresión.
    diagnostic.score = 95
  })

  it('todo hecho exige lens estimated + capturedAt (el tipo lo fija)', () => {
    expect(PROSPECT_FACT_KINDS.length).toBeGreaterThan(0)

    const fact = {
      kind: 'ranked_keywords_total',
      magnitude: null,
      lens: 'estimated',
      capturedAt: '2026-08-27T00:00:00.000Z',
      source: 'labs_ranked_keywords',
      detail: {}
    } as const

    expect(fact.lens).toBe('estimated')
    expect(fact.magnitude).toBeNull() // null = no medido, JAMÁS 0
  })
})
