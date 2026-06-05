import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import {
  generateStructuredAnthropic,
  type AnthropicStructuredResult,
  type GenerateStructuredAnthropicInput
} from '@/lib/ai/anthropic'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactSensitive } from '@/lib/observability/redact'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { hashStructuredContent } from '../commands/command-helpers'
import { createWorkforceContractingDraft } from '../commands/create-draft'
import { validateBilingualParity } from '../jurisdiction-packs/parity'
import type { ContractTuple } from '../jurisdiction-packs/types'
import {
  type ContractLanguage,
  type LanguageParityStatus,
  type WorkforceContractingCaseKind,
  type WorkforceContractingStructuredContent
} from '../types'
import {
  createContractingAiRun,
  finalizeContractingAiRun,
  type CreateContractingAiRunInput
} from './ai-run-store'
import {
  WORKFORCE_CONTRACTING_AI_PROVIDER,
  WORKFORCE_CONTRACTING_PROMPT_VERSION,
  getWorkforceContractingDraftModel,
  isWorkforceContractingAiEnabled
} from './config'
import { getJurisdictionPack } from '../jurisdiction-packs/registry'

import {
  buildContractingDraftingPrompt,
  buildContractingInputPacket,
  buildContractingSystemPrompt
} from './input-packet'
import {
  WORKFORCE_CONTRACTING_AI_DRAFT_TOOL,
  aiDraftToStructuredContent,
  parseWorkforceContractingAiDraft,
  type WorkforceContractingAiDraft
} from './schema'

// ── Pure preparation: parse + convert + parity (testable without provider/DB). ──

export interface PreparedAiDraft {
  ok: boolean
  errors: string[]
  aiDraft?: WorkforceContractingAiDraft
  structuredContent?: WorkforceContractingStructuredContent
  parityStatus?: LanguageParityStatus
  parityNotes?: string[]
}

export const prepareDraftFromAiResponse = (rawOutput: unknown): PreparedAiDraft => {
  const parsed = parseWorkforceContractingAiDraft(rawOutput)

  if (!parsed.ok || !parsed.data) {
    return { ok: false, errors: parsed.errors }
  }

  const structuredContent = aiDraftToStructuredContent(parsed.data)
  const parity = validateBilingualParity(structuredContent)

  return {
    ok: true,
    errors: [],
    aiDraft: parsed.data,
    structuredContent,
    parityStatus: parity.status,
    parityNotes: parity.notes
  }
}

// ── Orchestrator (server-only, dependency-injectable for tests). ──

export interface RunContractingAiDraftInput {
  caseId: string
  documentKind: WorkforceContractingCaseKind
  jurisdictionPackCode: string
  contractTuple: ContractTuple
  facts: Record<string, unknown>
  createdByUserId: string
  authoritativeLanguage?: ContractLanguage
}

export interface RunContractingAiDraftResult {
  enabled: boolean
  ok: boolean
  aiRunId?: string
  draftId?: string
  parityStatus?: LanguageParityStatus
  assumptions?: string[]
  reviewerNotes?: string[]
  missingFacts?: WorkforceContractingAiDraft['missingFacts']
  errors?: string[]
}

export interface ContractingAiDeps {
  isEnabled: () => boolean
  generate: <T>(input: GenerateStructuredAnthropicInput) => Promise<AnthropicStructuredResult<T>>
  recordRun: (input: CreateContractingAiRunInput) => Promise<string>
  persistSuccess: (input: {
    aiRunId: string
    caseId: string
    structuredContent: WorkforceContractingStructuredContent
    parityStatus: LanguageParityStatus
    outputHash: string
    usageJson: Record<string, unknown>
    createdByUserId: string
  }) => Promise<{ draftId: string }>
  persistFailure: (input: { aiRunId: string; errorSummary: string }) => Promise<void>
}

const defaultDeps: ContractingAiDeps = {
  isEnabled: isWorkforceContractingAiEnabled,
  generate: generateStructuredAnthropic,
  recordRun: createContractingAiRun,
  persistSuccess: async ({ aiRunId, caseId, structuredContent, parityStatus, outputHash, usageJson, createdByUserId }) =>
    withGreenhousePostgresTransaction(async client => {
      const draft = await createWorkforceContractingDraft(
        { caseId, structuredContent, createdByUserId, source: 'claude_ai' },
        client
      )

      await finalizeContractingAiRun(
        aiRunId,
        { status: 'succeeded', outputHash, languageParityStatus: parityStatus, usageJson, draftId: draft.draftId },
        client
      )

      return { draftId: draft.draftId }
    }),
  persistFailure: async ({ aiRunId, errorSummary }) =>
    finalizeContractingAiRun(aiRunId, { status: 'failed', errorSummary })
}

/**
 * Generate a bilingual Claude draft for a contracting case. Advisory-only:
 * NEVER auto-approves, auto-renders PDF, auto-sends email or auto-signs. Persists
 * an auditable ai_run + a draft (source=claude_ai). Returns a disabled result when
 * the WORKFORCE_CONTRACTING_AI_ENABLED flag is off.
 */
export const runContractingAiDraft = async (
  input: RunContractingAiDraftInput,
  deps: Partial<ContractingAiDeps> = {}
): Promise<RunContractingAiDraftResult> => {
  const d: ContractingAiDeps = { ...defaultDeps, ...deps }

  if (!d.isEnabled()) {
    return { enabled: false, ok: false, errors: ['workforce_contracting_ai_disabled'] }
  }

  const { packet } = buildContractingInputPacket({
    facts: input.facts,
    documentKind: input.documentKind,
    jurisdictionPackCode: input.jurisdictionPackCode,
    contractTuple: input.contractTuple,
    authoritativeLanguage: input.authoritativeLanguage
  })

  const model = getWorkforceContractingDraftModel()
  const inputSnapshotHash = hashStructuredContent(packet)

  const aiRunId = await d.recordRun({
    caseId: input.caseId,
    provider: WORKFORCE_CONTRACTING_AI_PROVIDER,
    model,
    promptVersion: WORKFORCE_CONTRACTING_PROMPT_VERSION,
    inputSnapshotHash
  })

  try {
    const result = await d.generate<unknown>({
      model,
      system: buildContractingSystemPrompt(input.jurisdictionPackCode),
      prompt: buildContractingDraftingPrompt(packet, getJurisdictionPack(input.jurisdictionPackCode)),
      toolName: WORKFORCE_CONTRACTING_AI_DRAFT_TOOL.name,
      toolDescription: WORKFORCE_CONTRACTING_AI_DRAFT_TOOL.description,
      inputSchema: WORKFORCE_CONTRACTING_AI_DRAFT_TOOL.inputSchema as unknown as Anthropic.Messages.Tool.InputSchema,
      maxTokens: 8192
    })

    const prepared = prepareDraftFromAiResponse(result.data)

    if (!prepared.ok || !prepared.structuredContent || !prepared.parityStatus || !prepared.aiDraft) {
      await d.persistFailure({ aiRunId, errorSummary: `schema_invalid: ${prepared.errors.join('; ')}` })

      return { enabled: true, ok: false, aiRunId, errors: prepared.errors }
    }

    const persisted = await d.persistSuccess({
      aiRunId,
      caseId: input.caseId,
      structuredContent: prepared.structuredContent,
      parityStatus: prepared.parityStatus,
      outputHash: hashStructuredContent(result.data),
      usageJson: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
      createdByUserId: input.createdByUserId
    })

    return {
      enabled: true,
      ok: true,
      aiRunId,
      draftId: persisted.draftId,
      parityStatus: prepared.parityStatus,
      assumptions: prepared.aiDraft.assumptions,
      reviewerNotes: prepared.aiDraft.reviewerNotes,
      missingFacts: prepared.aiDraft.missingFacts
    }
  } catch (error) {
    captureWithDomain(error, 'workforce', {
      tags: { source: 'contracting_ai_draft', stage: 'generate' },
      extra: { caseId: input.caseId, aiRunId }
    })
    await d.persistFailure({ aiRunId, errorSummary: redactSensitive(String(error)) })

    return { enabled: true, ok: false, aiRunId, errors: ['provider_error'] }
  }
}
