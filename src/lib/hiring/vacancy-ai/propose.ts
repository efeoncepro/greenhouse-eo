import 'server-only'

import { createHash } from 'crypto'

import type { AiProposal } from '@/types/hiring-assessment-ai'

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { getHiringOpeningById, getTalentDemandById } from '../store'
import { getTemplateWithModules, listCompetencies } from '../assessment/store'
import { createAiProposal } from '../assessment/ai/proposal-store'
import { HIRING_VACANCY_COPY_PROMPT_VERSION, isHiringVacancyAiEnabled } from './config'
import { buildVacancyPromptInputFromRecords, type VacancyPromptInput } from './prompt'
import { runPublicCopyGeneration, type PublicCopyGenerationResult } from './providers'

export interface ProposeOpeningPublicCopyInput {
  openingId: string
  /** Template de assessment cuyas competencias alimentan el aviso (el opening no tiene FK; lo elige el operador). */
  templateId?: string
}

export interface ProposeOpeningPublicCopyResult {
  proposal: AiProposal | null
  status: PublicCopyGenerationResult['status']
  provider: string
  model: string
}

/**
 * TASK-1385 — Propone con IA el copy público (`public_*`) de una vacante desde inputs
 * allowlist-safe (propose→confirm). La IA NUNCA ve verdad interna (budget/rate/risk/notas/cliente):
 * el prompt consume exclusivamente `VacancyPromptInput` (proyección explícita campo a campo).
 * El LLM NUNCA escribe el opening — solo `confirmAiProposal` (humano) aplica vía
 * `updateHiringOpening`. Propuesta append-only en el ledger con dedupe por digest.
 */
export const proposeOpeningPublicCopy = async (
  input: ProposeOpeningPublicCopyInput,
  actorUserId: string | null,
): Promise<ProposeOpeningPublicCopyResult> => {
  if (!isHiringVacancyAiEnabled()) {
    throw new HiringValidationError('La asistencia de IA para vacantes está deshabilitada.', 'vacancy_ai_disabled', 409)
  }

  const opening = await getHiringOpeningById(input.openingId)

  if (!opening) {
    throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')
  }

  const demand = await getTalentDemandById(opening.demandId)

  if (!demand) {
    throw new HiringNotFoundError('La demanda de talento no existe.', 'talent_demand_not_found')
  }

  let template = null
  let competencyCatalog: Awaited<ReturnType<typeof listCompetencies>> = []

  if (input.templateId) {
    template = await getTemplateWithModules(input.templateId)

    if (!template) {
      throw new HiringNotFoundError('La plantilla de assessment no existe.', 'assessment_template_not_found')
    }

    competencyCatalog = await listCompetencies()
  }

  const promptInput: VacancyPromptInput = buildVacancyPromptInputFromRecords(
    opening,
    demand,
    template,
    competencyCatalog,
  )

  const generation = await runPublicCopyGeneration(promptInput)

  if (generation.status !== 'ok' || !generation.copy) {
    return { proposal: null, status: generation.status, provider: generation.provider, model: generation.model }
  }

  const inputDigest = createHash('sha256')
    .update(`${opening.openingId}|${HIRING_VACANCY_COPY_PROMPT_VERSION}|${JSON.stringify(promptInput)}`)
    .digest('hex')

  const proposal = await createAiProposal(
    {
      kind: 'opening_public_copy',
      targetRef: opening.openingId,
      proposed: generation.copy as unknown as Record<string, unknown>,
      provider: generation.provider,
      model: generation.model,
      promptVersion: HIRING_VACANCY_COPY_PROMPT_VERSION,
      inputDigest,
      usage: generation.usage,
    },
    actorUserId,
  )

  return { proposal, status: 'ok', provider: generation.provider, model: generation.model }
}
