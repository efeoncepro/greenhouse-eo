import { describe, expect, it } from 'vitest'

import {
  ETV_LABS_FAMILIES,
  ETV_PROVIDER_CUTOFF_ISO,
  EtvMethodologyPolicyError,
  assertSingleEtvMethodology,
  buildEtvMethodologyProvenance,
  buildEtvMethodologyRequest,
  deriveProviderEffectiveEtvMethodology,
  listEtvLabsFamilies,
  resolveConfiguredEtvMethodology,
  resolveEtvHistoricalCalculationBasis,
  resolveEtvReadMethodology,
  summarizeEtvLabsFamilies,
  toEtvMethodologyReadState
} from '..'

const BEFORE_CUTOFF = new Date('2026-10-15T12:00:00.000Z')
const AT_CUTOFF = new Date(ETV_PROVIDER_CUTOFF_ISO)
const ONE_MS_BEFORE_CUTOFF = new Date(AT_CUTOFF.getTime() - 1)

const DOMAIN_RANK_OVERVIEW = '/v3/dataforseo_labs/google/domain_rank_overview/live'

const expectPolicyError = (fn: () => unknown, code: string) => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(EtvMethodologyPolicyError)
    expect((error as EtvMethodologyPolicyError).code).toBe(code)

    return
  }

  throw new Error(`expected EtvMethodologyPolicyError(${code})`)
}

describe('TASK-1805 — matriz contractual de 14 familias', () => {
  it('refleja el contrato: 14 familias, 6 consumidas / 7 caminos, 3 ignoradas, 5 no habilitadas', () => {
    expect(summarizeEtvLabsFamilies()).toEqual({
      families: 14,
      consumedFamilies: 6,
      consumerPaths: 7,
      ignoredCallers: 3,
      notEnabled: 5
    })
  })

  it('cada familia no habilitada nombra su task dueña y no tiene caller', () => {
    const notEnabled = listEtvLabsFamilies('provider_supported_not_enabled')

    expect(notEnabled.map(family => family.slug).sort()).toEqual([
      'categories_for_domain',
      'domain_metrics_by_categories',
      'historical_bulk_traffic_estimation',
      'page_intersection',
      'serp_competitors'
    ])

    for (const family of notEnabled) {
      expect(family.ownerTask).toMatch(/^TASK-18(08|09|10|11)$/)
      expect(family.consumerPaths).toHaveLength(0)
    }
  })

  it('las familias con caller apuntan a archivos reales del repo', async () => {
    const { existsSync } = await import('node:fs')
    const { resolve } = await import('node:path')

    for (const family of ETV_LABS_FAMILIES) {
      for (const consumerPath of family.consumerPaths) {
        expect(existsSync(resolve(process.cwd(), consumerPath)), `${family.slug} → ${consumerPath}`).toBe(true)
      }
    }
  })

  it('los endpoints son únicos y todos son Labs Google', () => {
    const endpoints = ETV_LABS_FAMILIES.map(family => family.googleEndpoint)

    expect(new Set(endpoints).size).toBe(endpoints.length)
    for (const endpoint of endpoints) expect(endpoint.startsWith('/v3/dataforseo_labs/google/')).toBe(true)
  })
})

describe('TASK-1805 — configuración cerrada', () => {
  it('ausente → legacy explícito con source=default (nunca provider default)', () => {
    expect(resolveConfiguredEtvMethodology({} as NodeJS.ProcessEnv)).toMatchObject({
      version: 'legacy_static_v1',
      source: 'default',
      envName: 'GROWTH_SEO_ETV_METHODOLOGY_VERSION'
    })
    expect(resolveEtvReadMethodology({} as NodeJS.ProcessEnv)).toMatchObject({ version: 'legacy_static_v1', source: 'default' })
  })

  it('valor válido → env; se normaliza espacios/mayúsculas', () => {
    expect(
      resolveConfiguredEtvMethodology({ GROWTH_SEO_ETV_METHODOLOGY_VERSION: ' Improved_Layout_Clickstream_V2 ' } as NodeJS.ProcessEnv)
    ).toMatchObject({ version: 'improved_layout_clickstream_v2', source: 'env' })
  })

  it('valor fuera del vocabulario → falla cerrado (invalid_etv_methodology_config)', () => {
    expectPolicyError(
      () => resolveConfiguredEtvMethodology({ GROWTH_SEO_ETV_METHODOLOGY_VERSION: 'improved' } as NodeJS.ProcessEnv),
      'invalid_etv_methodology_config'
    )
    expectPolicyError(
      () => resolveEtvReadMethodology({ GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION: 'unknown_methodology' } as NodeJS.ProcessEnv),
      'invalid_etv_methodology_config'
    )
  })
})

describe('TASK-1805 — buildEtvMethodologyRequest (fail-closed, endpoint-aware)', () => {
  it('legacy explícito antes del corte → use_improved_etv:false, efectivo legacy, evidencia explicit_request', () => {
    const request = buildEtvMethodologyRequest({ endpoint: DOMAIN_RANK_OVERVIEW, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF })

    expect(request).toMatchObject({
      familySlug: 'domain_rank_overview',
      classification: 'etv_consumed',
      configured: 'legacy_static_v1',
      configuredSource: 'default',
      requested: 'legacy_static_v1',
      providerEffective: 'legacy_static_v1',
      requestedAt: BEFORE_CUTOFF.toISOString(),
      policyVersion: 'etv-policy.v1',
      evidence: 'explicit_request',
      requestParams: { use_improved_etv: false }
    })
  })

  it('improved configurado → use_improved_etv:true en todos los endpoints consumidos', () => {
    const env = { GROWTH_SEO_ETV_METHODOLOGY_VERSION: 'improved_layout_clickstream_v2' } as NodeJS.ProcessEnv

    for (const family of listEtvLabsFamilies('etv_consumed')) {
      const request = buildEtvMethodologyRequest({ endpoint: family.googleEndpoint, env, now: BEFORE_CUTOFF })

      expect(request.requestParams).toEqual({ use_improved_etv: true })
      expect(request.providerEffective).toBe('improved_layout_clickstream_v2')
    }
  })

  it('legacy en o después del corte → legacy_requested_after_cutoff ANTES de la request', () => {
    expectPolicyError(
      () => buildEtvMethodologyRequest({ endpoint: DOMAIN_RANK_OVERVIEW, env: {} as NodeJS.ProcessEnv, now: AT_CUTOFF }),
      'legacy_requested_after_cutoff'
    )

    // Un milisegundo antes sigue siendo legacy válido: el corte es un instante, no un día.
    expect(
      buildEtvMethodologyRequest({ endpoint: DOMAIN_RANK_OVERVIEW, env: {} as NodeJS.ProcessEnv, now: ONE_MS_BEFORE_CUTOFF }).providerEffective
    ).toBe('legacy_static_v1')
  })

  it('improved después del corte sigue siendo válido', () => {
    const request = buildEtvMethodologyRequest({
      endpoint: DOMAIN_RANK_OVERVIEW,
      env: { GROWTH_SEO_ETV_METHODOLOGY_VERSION: 'improved_layout_clickstream_v2' } as NodeJS.ProcessEnv,
      now: AT_CUTOFF
    })

    expect(request.providerEffective).toBe('improved_layout_clickstream_v2')
  })

  it('familias etv_ignored NO reciben el flag: lanza unsupported_etv_methodology', () => {
    for (const family of listEtvLabsFamilies('etv_ignored')) {
      expectPolicyError(
        () => buildEtvMethodologyRequest({ endpoint: family.googleEndpoint, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF }),
        'unsupported_etv_methodology'
      )
    }
  })

  it('familias sin caller NO se habilitan desde la foundation: lanza y nombra la task dueña', () => {
    for (const family of listEtvLabsFamilies('provider_supported_not_enabled')) {
      try {
        buildEtvMethodologyRequest({ endpoint: family.googleEndpoint, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF })
      } catch (error) {
        expect((error as EtvMethodologyPolicyError).code).toBe('unsupported_etv_methodology')
        expect((error as EtvMethodologyPolicyError).details.ownerTask).toBe(family.ownerTask)
        continue
      }

      throw new Error(`${family.slug} debería fallar cerrado`)
    }
  })

  it('endpoint desconocido / no Labs → unsupported_etv_methodology', () => {
    expectPolicyError(
      () => buildEtvMethodologyRequest({ endpoint: '/v3/serp/google/organic/live/advanced', env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF }),
      'unsupported_etv_methodology'
    )
    expectPolicyError(
      () => buildEtvMethodologyRequest({ endpoint: '/v3/dataforseo_labs/google/keyword_overview/live', env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF }),
      'unsupported_etv_methodology'
    )
  })

  it('config inválida falla antes de construir el request', () => {
    expectPolicyError(
      () =>
        buildEtvMethodologyRequest({
          endpoint: DOMAIN_RANK_OVERVIEW,
          env: { GROWTH_SEO_ETV_METHODOLOGY_VERSION: 'true' } as NodeJS.ProcessEnv,
          now: BEFORE_CUTOFF
        }),
      'invalid_etv_methodology_config'
    )
  })

  it('override interno (evaluador) manda sobre la config, sin tocar la config', () => {
    const request = buildEtvMethodologyRequest({
      endpoint: DOMAIN_RANK_OVERVIEW,
      env: {} as NodeJS.ProcessEnv,
      now: BEFORE_CUTOFF,
      methodologyOverride: 'improved_layout_clickstream_v2'
    })

    expect(request.configured).toBe('legacy_static_v1')
    expect(request.requested).toBe('improved_layout_clickstream_v2')
    expect(request.requestParams).toEqual({ use_improved_etv: true })
  })
})

describe('TASK-1805 — derivaciones', () => {
  it('provider effective se deriva del instante: desde el corte todo es improved', () => {
    expect(deriveProviderEffectiveEtvMethodology('legacy_static_v1', BEFORE_CUTOFF)).toBe('legacy_static_v1')
    expect(deriveProviderEffectiveEtvMethodology('legacy_static_v1', AT_CUTOFF)).toBe('improved_layout_clickstream_v2')
    expect(deriveProviderEffectiveEtvMethodology('improved_layout_clickstream_v2', BEFORE_CUTOFF)).toBe('improved_layout_clickstream_v2')
  })

  it('base histórica: legacy → null; improved → recomputado desde 2026-07, aproximación antes', () => {
    expect(resolveEtvHistoricalCalculationBasis('legacy_static_v1', '2024-03-01')).toBeNull()
    expect(resolveEtvHistoricalCalculationBasis('improved_layout_clickstream_v2', '2026-06-01')).toBe('calibrated_approximation')
    expect(resolveEtvHistoricalCalculationBasis('improved_layout_clickstream_v2', '2026-07')).toBe('fully_recomputed')
    expect(resolveEtvHistoricalCalculationBasis('improved_layout_clickstream_v2', '2026-11-01')).toBe('fully_recomputed')
    expectPolicyError(() => resolveEtvHistoricalCalculationBasis('improved_layout_clickstream_v2', 'julio'), 'invalid_etv_methodology_config')
  })

  it('assertSingleEtvMethodology rechaza una serie mixta y acepta una homogénea', () => {
    const rows = [{ etv_methodology_version: 'legacy_static_v1', id: 1 }, { etv_methodology_version: 'legacy_static_v1', id: 2 }]

    expect(assertSingleEtvMethodology(rows, 'legacy_static_v1')).toHaveLength(2)
    expectPolicyError(
      () => assertSingleEtvMethodology([...rows, { etv_methodology_version: 'improved_layout_clickstream_v2', id: 3 }], 'legacy_static_v1'),
      'mixed_etv_methodology'
    )
    expectPolicyError(() => assertSingleEtvMethodology([{ etv_methodology_version: null, id: 4 }], 'legacy_static_v1'), 'mixed_etv_methodology')
  })

  it('read state: fuera del vocabulario → unknown_methodology', () => {
    expect(toEtvMethodologyReadState('legacy_static_v1')).toBe('legacy_static_v1')
    expect(toEtvMethodologyReadState(null)).toBe('unknown_methodology')
    expect(toEtvMethodologyReadState('improved')).toBe('unknown_methodology')
  })

  it('provenance: sirve una metodología, lista disponibles y declara comparabilidad', () => {
    expect(
      buildEtvMethodologyProvenance({
        served: 'legacy_static_v1',
        rowVersion: 'legacy_static_v1',
        rowEvidence: 'contract_default_pre_cutoff',
        rowPolicyVersion: 'etv-policy.v1',
        available: ['legacy_static_v1', 'legacy_static_v1', 'basura']
      })
    ).toEqual({
      version: 'legacy_static_v1',
      policyVersion: 'etv-policy.v1',
      evidence: 'contract_default_pre_cutoff',
      availableMethodologies: ['legacy_static_v1'],
      comparability: 'single_methodology',
      breakpointDate: null,
      providerCutoffAt: ETV_PROVIDER_CUTOFF_ISO
    })

    expect(
      buildEtvMethodologyProvenance({ served: 'improved_layout_clickstream_v2', rowVersion: null, available: ['legacy_static_v1'] })
    ).toMatchObject({
      version: 'improved_layout_clickstream_v2',
      evidence: 'unknown',
      availableMethodologies: ['legacy_static_v1'],
      comparability: 'not_available_for_method'
    })
  })
})
