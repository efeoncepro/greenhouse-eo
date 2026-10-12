import { describe, expect, it } from 'vitest'

import { isMarketCoveredByContract, marketCoveredByContractSql, parseIncludedMarkets } from '../contract-coverage'

const secondary = (marketCode: string) => ({ isPrimary: false, marketCode })

describe('cobertura de mercado por contrato', () => {
  it('el mercado principal va siempre incluido, con cualquier tier y sin declaración', () => {
    expect(isMarketCoveredByContract({ isPrimary: true, marketCode: 'CL' }, { tier: 'trial', marketsIncluded: null })).toBe(
      true
    )
  })

  it('un secundario exige tier contracted Y estar declarado', () => {
    expect(isMarketCoveredByContract(secondary('AR'), { tier: 'contracted', marketsIncluded: ['AR'] })).toBe(true)
    expect(isMarketCoveredByContract(secondary('AR'), { tier: 'contracted', marketsIncluded: ['BR'] })).toBe(false)
    expect(isMarketCoveredByContract(secondary('AR'), { tier: 'contracted', marketsIncluded: null })).toBe(false)
    expect(isMarketCoveredByContract(secondary('AR'), { tier: 'pilot', marketsIncluded: ['AR'] })).toBe(false)
  })

  it('sólo un array cuenta como declaración: el caso que tenía Sky era metadata sin la clave', () => {
    expect(parseIncludedMarkets({ aeo_tier: 'contracted' })).toBeNull()
    expect(parseIncludedMarkets(null)).toBeNull()
    expect(parseIncludedMarkets({ aeo_markets_included: 'AR' })).toBeNull()
    expect(parseIncludedMarkets({ aeo_markets_included: [] })).toEqual([])
    expect(parseIncludedMarkets({ aeo_markets_included: ['AR', 3, 'BR'] })).toEqual(['AR', 'BR'])
  })

  it('el SQL exige array antes de la pertenencia, igual que el predicado TS', () => {
    const sql = marketCoveredByContractSql('m', 'a')

    expect(sql).toContain('m.is_primary OR')
    expect(sql).toContain("jsonb_typeof(a.metadata_json->'aeo_markets_included')='array'")
    expect(sql).toContain('@> to_jsonb(m.market_code::text)')
  })
})
