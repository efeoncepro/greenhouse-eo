import { describe, expect, it, vi } from 'vitest'

import type { AnthropicStructuredResult } from '@/lib/ai/anthropic'

import type { ContractTuple } from '../jurisdiction-packs/types'
import { prepareDraftFromAiResponse, runContractingAiDraft, type ContractingAiDeps } from './draft-adapter'
import { GOLDEN_CL_DEPENDENT_DRAFT } from './eval-fixtures'

const TUPLE: ContractTuple = { contractType: 'indefinido', payRegime: 'chile', payrollVia: 'internal' }

const baseInput = {
  caseId: 'wcc-test',
  documentKind: 'employment_contract' as const,
  jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
  contractTuple: TUPLE,
  facts: { full_name: 'Camila Torres', gross_amount: '1950000', currency: 'CLP' },
  createdByUserId: 'user-1'
}

const structuredResult = (data: unknown): AnthropicStructuredResult<unknown> => ({
  data,
  model: 'claude-sonnet-4-6',
  stopReason: 'tool_use',
  usage: { inputTokens: 100, outputTokens: 200 }
})

describe('prepareDraftFromAiResponse', () => {
  it('prepares structured content + parity from a golden draft', () => {
    const prepared = prepareDraftFromAiResponse(GOLDEN_CL_DEPENDENT_DRAFT)

    expect(prepared.ok).toBe(true)
    expect(prepared.parityStatus).toBe('pass')
    expect(prepared.structuredContent?.localizedDrafts['en-US'].sections.length).toBeGreaterThan(0)
  })

  it('fails on invalid output', () => {
    expect(prepareDraftFromAiResponse({ nope: true }).ok).toBe(false)
  })
})

describe('runContractingAiDraft', () => {
  it('returns disabled when the flag is off (never calls the provider)', async () => {
    const generate = vi.fn()
    const result = await runContractingAiDraft(baseInput, { isEnabled: () => false, generate })

    expect(result.enabled).toBe(false)
    expect(result.ok).toBe(false)
    expect(generate).not.toHaveBeenCalled()
  })

  it('persists a draft on a valid bilingual response (advisory, no auto-approve)', async () => {
    let captured: Parameters<ContractingAiDeps['persistSuccess']>[0] | undefined

    const persistSuccess = vi.fn(async (arg: Parameters<ContractingAiDeps['persistSuccess']>[0]) => {
      captured = arg

      return { draftId: 'wcd-123' }
    })

    const persistFailure = vi.fn(async () => undefined)

    const deps: Partial<ContractingAiDeps> = {
      isEnabled: () => true,
      generate: vi.fn(async () => structuredResult(GOLDEN_CL_DEPENDENT_DRAFT)) as ContractingAiDeps['generate'],
      recordRun: vi.fn(async () => 'wcar-1'),
      persistSuccess,
      persistFailure
    }

    const result = await runContractingAiDraft(baseInput, deps)

    expect(result.enabled).toBe(true)
    expect(result.ok).toBe(true)
    expect(result.aiRunId).toBe('wcar-1')
    expect(result.draftId).toBe('wcd-123')
    expect(result.parityStatus).toBe('pass')
    expect(persistSuccess).toHaveBeenCalledTimes(1)
    expect(persistFailure).not.toHaveBeenCalled()
    // The persisted content is bilingual structured content (not approval/PDF/sign).
    expect(captured?.structuredContent.localizedDrafts['es-CL'].sections.length).toBeGreaterThan(0)
    expect(captured?.structuredContent.localizedDrafts['en-US'].sections.length).toBeGreaterThan(0)
  })

  it('records a failed run on schema-invalid output (no draft persisted)', async () => {
    const persistSuccess = vi.fn(async () => ({ draftId: 'never' }))
    const persistFailure = vi.fn(async () => undefined)

    const result = await runContractingAiDraft(baseInput, {
      isEnabled: () => true,
      generate: vi.fn(async () => structuredResult({ garbage: true })) as ContractingAiDeps['generate'],
      recordRun: vi.fn(async () => 'wcar-2'),
      persistSuccess,
      persistFailure
    })

    expect(result.ok).toBe(false)
    expect(result.aiRunId).toBe('wcar-2')
    expect(persistFailure).toHaveBeenCalledTimes(1)
    expect(persistSuccess).not.toHaveBeenCalled()
  })

  it('records a failed run when the provider throws', async () => {
    const persistFailure = vi.fn(async () => undefined)

    const result = await runContractingAiDraft(baseInput, {
      isEnabled: () => true,
      generate: vi.fn(async () => {
        throw new Error('provider down')
      }) as ContractingAiDeps['generate'],
      recordRun: vi.fn(async () => 'wcar-3'),
      persistFailure
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(['provider_error'])
    expect(persistFailure).toHaveBeenCalledTimes(1)
  })
})
