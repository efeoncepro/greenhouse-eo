import 'server-only'

import type { HiringApplicationStage } from '@/types/hiring'

/**
 * TASK-1689 — Política de etapas candidate-facing.
 *
 * SOLO las etapas de este mapa generan email de avance al candidato, y SIEMPRE con su
 * nombre público — un nombre de etapa interna del pipeline (sourced/screening/client_review/
 * decision_pending/handoff_ready/...) NUNCA llega a un email. Las etapas terminales
 * (selected/backup/rejected/withdrawn) son propiedad del command decide y las cubre el
 * email de decisión, no éste.
 */
const CANDIDATE_FACING_STAGE_LABELS: Partial<Record<HiringApplicationStage, { es: string; en: string }>> = {
  shortlisted: { es: 'Preselección', en: 'Shortlist' },
  interview: { es: 'Entrevista', en: 'Interview' },
}

export const resolveCandidateFacingStageLabel = (
  stage: string,
  locale: 'es' | 'en' = 'es',
): string | null => {
  const entry = CANDIDATE_FACING_STAGE_LABELS[stage as HiringApplicationStage]

  return entry ? entry[locale] : null
}
