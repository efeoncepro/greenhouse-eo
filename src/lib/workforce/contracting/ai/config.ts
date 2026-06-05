import 'server-only'

// TASK-1019 Slice 3 — Workforce Contracting AI drafting config.
// Feature flag canonical: WORKFORCE_CONTRACTING_AI_ENABLED (default false in V1.0
// until staging validation + HR/Legal sign-off). Controls ONLY Claude drafting.

export const isWorkforceContractingAiEnabled = (): boolean =>
  process.env.WORKFORCE_CONTRACTING_AI_ENABLED === 'true'

/**
 * Drafting model. Legal/HR drafting prefers a high-capability model over Haiku.
 * Lives here (not in nexa-models.ts) because it is NOT a user-pickable Nexa model.
 */
export const getWorkforceContractingDraftModel = (): string =>
  process.env.WORKFORCE_CONTRACTING_AI_MODEL?.trim() || 'claude-sonnet-4-6'

export const WORKFORCE_CONTRACTING_AI_PROVIDER = 'anthropic'
// v3 (2026-06-05): persona nacional E internacional, regida por la jurisdicción de la
// entidad contratante/matriz (no hardcodea Chile); idioma prevalente dinámico; cláusula
// de ley aplicable+foro para contratos internacionales; cláusulas obligatorias/prohibidas
// enumeradas. (v2: persona laboralista chilena pack-aware.)
export const WORKFORCE_CONTRACTING_PROMPT_VERSION = 'workforce_contracting_ai_draft.v3'
