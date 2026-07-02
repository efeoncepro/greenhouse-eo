import { describe, expect, it, vi } from 'vitest'

import { resolvePublicBrandCategory } from '../resolve-public-brand-category'

/**
 * TASK-1321 — profile-less category resolution for a public brand (/aeo-2/). The grounded read
 * is stubbed via deps; site content is injected so no network/LLM runs. Asserts the skip
 * contract: no fields / low confidence / unknown node → null (degrade, no run).
 */

const biResult = (fields: Record<string, unknown> | null) => ({
  fields,
  metadata: { providerId: 'anthropic', model: 'x', version: 1, status: fields ? 'ok' : 'disabled', latencyMs: 1, usage: null },
})

const groundedFields = (nodeId: string, confidence: number) => ({
  whatTheBrandDoes: 'sells software',
  candidateCategoryNode: nodeId,
  fineCategory: 'dev tools',
  candidateBusinessModel: 'b2b_product_saas',
  signalsUsed: ['home'],
  confidence,
})

describe('TASK-1321 — resolvePublicBrandCategory', () => {
  it('resolves a confident grounded node to the canonical category', async () => {
    const runner = vi.fn<(input: unknown, options?: unknown) => Promise<never>>(async () => biResult(groundedFields('industry:technology', 0.8)) as never)

    const result = await resolvePublicBrandCategory({
      brandName: 'Acme',
      websiteUrl: 'https://acme.example',
      deps: { siteContent: 'Acme builds software platforms', runBrandIntelligence: runner },
    })

    expect(runner).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      nodeId: 'industry:technology',
      label: { es: 'Tecnologia', en: 'Technology' },
      confidence: 0.8,
      businessModel: 'b2b_product_saas',
    })
  })

  it('skips (null) when the grounded read produced no fields (disabled/no signals/error)', async () => {
    const runner = vi.fn<(input: unknown, options?: unknown) => Promise<never>>(async () => biResult(null) as never)

    const result = await resolvePublicBrandCategory({
      brandName: 'Acme',
      websiteUrl: 'https://acme.example',
      deps: { siteContent: 'text', runBrandIntelligence: runner },
    })

    expect(result).toBeNull()
  })

  it('skips (null) when grounded confidence is below the grounded threshold', async () => {
    const runner = vi.fn<(input: unknown, options?: unknown) => Promise<never>>(async () => biResult(groundedFields('industry:technology', 0.4)) as never)

    const result = await resolvePublicBrandCategory({
      brandName: 'Acme',
      websiteUrl: 'https://acme.example',
      deps: { siteContent: 'text', runBrandIntelligence: runner },
    })

    expect(result).toBeNull()
  })

  it('skips (null) when the grounded node is not a real taxonomy node (hallucinated)', async () => {
    const runner = vi.fn<(input: unknown, options?: unknown) => Promise<never>>(async () => biResult(groundedFields('not_a_real_node', 0.9)) as never)

    const result = await resolvePublicBrandCategory({
      brandName: 'Acme',
      websiteUrl: 'https://acme.example',
      deps: { siteContent: 'text', runBrandIntelligence: runner },
    })

    expect(result).toBeNull()
  })

  it('passes injected site content to the runner (no fetch)', async () => {
    const runner = vi.fn<(input: unknown, options?: unknown) => Promise<never>>(async () => biResult(groundedFields('industry:technology', 0.8)) as never)

    await resolvePublicBrandCategory({
      brandName: 'Acme',
      websiteUrl: 'https://acme.example',
      deps: { siteContent: 'INJECTED CONTENT', runBrandIntelligence: runner },
    })

    const arg = runner.mock.calls[0][0] as Record<string, unknown>

    expect(arg.siteContent).toBe('INJECTED CONTENT')
    expect(arg.brandName).toBe('Acme')
  })
})
