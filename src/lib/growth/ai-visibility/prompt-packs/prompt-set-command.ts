import 'server-only'

/**
 * TASK-1290 Slice 2/3 — Growth AI Visibility · Prompt set governed commands (server-only).
 *
 * Commands gobernados del ciclo de vida del set de prompts AEO (Full API parity): autoría (draft)
 * y aprobación (draft→active). Self-guardan con la capability `prompt_set.manage` (reciben un
 * profileId/setId arbitrario). La autoría LLM vive en `author-prompt-set.ts` (Slice 3); acá la
 * orquestación gobernada que la UI de review (TASK-1291) / Nexa consumen.
 */

import { can } from '@/lib/entitlements/runtime'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'

import { resolveArchetypeBaselinePack } from './archetypes/baseline-packs'
import { authorPromptSet, AUTHOR_PROMPT_SET_MAX_OUTPUT_TOKENS, type AuthorPromptSetStatus } from './authoring/author-prompt-set'
import {
  approvePromptSet,
  createDraftPromptSet,
  getActivePromptSet,
  listPromptSets,
  PromptSetLifecycleError,
  type CreateDraftPromptSetInput,
  type GraderPromptSetRow,
  type PromptSetPrompt
} from './prompt-set-store'

export class PromptSetCommandError extends Error {
  readonly code: 'forbidden'

  constructor(message: string) {
    super(message)
    this.name = 'PromptSetCommandError'
    this.code = 'forbidden'
  }
}

const PROMPT_SET_MANAGE_CAPABILITY = 'growth.ai_visibility.prompt_set.manage' as const

const assertCanManage = (subject: TenantEntitlementSubject): void => {
  if (!can(subject, PROMPT_SET_MANAGE_CAPABILITY, 'execute', 'tenant')) {
    throw new PromptSetCommandError('No tienes acceso para gestionar el set de prompts AEO.')
  }
}

/** Crea un `draft` (gobernado). Lo consume la autoría LLM (Slice 3) + un draft manual del operador. */
export const createGraderPromptSetDraft = async (
  input: { subject: TenantEntitlementSubject } & CreateDraftPromptSetInput
): Promise<GraderPromptSetRow> => {
  assertCanManage(input.subject)

  return createDraftPromptSet(input)
}

export interface AuthorGraderPromptSetDraftInput {
  subject: TenantEntitlementSubject
  profileId: string
  brandName: string
  categoryNodeId: string | null
  categoryLabel: string
  businessModel: string
  market: string
  locale: string
  competitors: string[]
  /** Grounding del snapshot brand_intelligence (TASK-1288) — opcional. */
  whatTheBrandDoes?: string | null
  fineCategory?: string | null
  createdBy: string
}

export interface AuthorGraderPromptSetDraftResult {
  draft: GraderPromptSetRow
  /** `ok` = autorado por LLM; el resto = se usó el baseline determinista del arquetipo (fallback honesto). */
  authoringStatus: AuthorPromptSetStatus
}

/**
 * Autora un `draft` para una marca: LLM si está disponible (Query Fan-Out brand-specific), o el
 * baseline determinista del arquetipo como fallback honesto (NUNCA prompts rotos). Gobernado. NO
 * lo activa (eso es `approveGraderPromptSet`, tras el review TASK-1291).
 */
export const authorGraderPromptSetDraft = async (
  input: AuthorGraderPromptSetDraftInput
): Promise<AuthorGraderPromptSetDraftResult> => {
  assertCanManage(input.subject)

  const authored = await authorPromptSet({
    brandName: input.brandName,
    categoryLabel: input.categoryLabel,
    businessModel: input.businessModel,
    market: input.market,
    locale: input.locale,
    competitors: input.competitors,
    whatTheBrandDoes: input.whatTheBrandDoes ?? null,
    fineCategory: input.fineCategory ?? null,
    maxTokens: AUTHOR_PROMPT_SET_MAX_OUTPUT_TOKENS
  })

  // Fallback honesto: sin LLM/flag/schema → el baseline determinista del arquetipo (Slice 1).
  const usingLlm = authored.prompts !== null

  const prompts: PromptSetPrompt[] = usingLlm
    ? authored.prompts!
    : resolveArchetypeBaselinePack(input.businessModel).prompts.map(p => ({ ...p }))

  const draft = await createDraftPromptSet({
    profileId: input.profileId,
    businessModel: input.businessModel,
    categoryNodeId: input.categoryNodeId,
    prompts,
    generationStrategy: usingLlm ? 'llm' : 'template_baseline',
    model: authored.model,
    systemPromptVersion: usingLlm ? authored.systemPromptVersion : null,
    groundingSources: authored.groundingSources,
    createdBy: input.createdBy
  })

  return { draft, authoringStatus: authored.status }
}

/** Aprueba un set (`draft`/`approved` → `active`, congela). Gobernado + atómico (un solo active). */
export const approveGraderPromptSet = async (input: {
  subject: TenantEntitlementSubject
  setId: string
  approvedBy: string
}): Promise<GraderPromptSetRow> => {
  assertCanManage(input.subject)

  return approvePromptSet({ setId: input.setId, approvedBy: input.approvedBy })
}

/** Lectura gobernada del set `active` + el historial de versiones de un perfil (para el review). */
export const readGraderPromptSets = async (input: {
  subject: TenantEntitlementSubject
  profileId: string
}): Promise<{ active: GraderPromptSetRow | null; versions: GraderPromptSetRow[] }> => {
  assertCanManage(input.subject)

  return {
    active: await getActivePromptSet(input.profileId),
    versions: await listPromptSets(input.profileId)
  }
}

export { PromptSetLifecycleError }
