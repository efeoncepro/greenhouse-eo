import 'server-only'

import type { PoolClient } from 'pg'

import type { AiProposal, OpeningPublicCopyProposal } from '@/types/hiring-assessment-ai'
import type { UpdateHiringOpeningInput } from '@/types/hiring'

import { HiringValidationError } from '../errors'
import { updateHiringOpening } from '../store'

/**
 * TASK-1385 — Efecto downstream del confirm de un `opening_public_copy` (llamado SOLO desde
 * `confirmAiProposal`, dentro de su tx). Mergea el copy propuesto con la edición humana y lo
 * aplica vía el writer canónico `updateHiringOpening` — el LLM nunca tuvo write path al opening.
 * Solo mapea campos de COPY público; `note` es interna de la propuesta y NUNCA se escribe.
 * El publish sigue siendo una acción humana aparte (publishOpening + su gate 422).
 */
export const applyOpeningPublicCopy = async (
  client: PoolClient,
  proposal: AiProposal,
  override: Partial<OpeningPublicCopyProposal> | undefined,
  actorUserId: string,
): Promise<string> => {
  const proposed = proposal.proposed as unknown as OpeningPublicCopyProposal
  const merged: OpeningPublicCopyProposal = { ...proposed, ...(override ?? {}) }

  for (const [field, value] of [
    ['publicTitle', merged.publicTitle],
    ['publicSummary', merged.publicSummary],
    ['publicDescription', merged.publicDescription],
  ] as const) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new HiringValidationError(
        'El copy a confirmar necesita título, resumen y descripción no vacíos.',
        'vacancy_ai_incomplete_copy',
        400,
        { field },
      )
    }
  }

  const input: UpdateHiringOpeningInput = {
    publicTitle: merged.publicTitle.trim(),
    publicSummary: merged.publicSummary.trim(),
    publicDescription: merged.publicDescription.trim(),
  }

  if (merged.publicRequirements !== undefined) input.publicRequirements = merged.publicRequirements
  if (merged.publicNiceToHave !== undefined) input.publicNiceToHave = merged.publicNiceToHave
  if (merged.publicArea !== undefined) input.publicArea = merged.publicArea
  if (merged.publicSkillTags !== undefined) input.publicSkillTags = merged.publicSkillTags
  if (merged.publicSeniority !== undefined) input.publicSeniority = merged.publicSeniority
  if (merged.publicProcessNotes !== undefined) input.publicProcessNotes = merged.publicProcessNotes

  const opening = await updateHiringOpening(proposal.targetRef, input, actorUserId, client)

  return opening.openingId
}
