// TASK-1385 — Vacancy AI: redacción asistida del copy público de una vacante (propose→confirm).
// La IA propone desde inputs allowlist-safe; el confirm humano aplica vía updateHiringOpening.

export { isHiringVacancyAiEnabled, getHiringVacancyCopyModel, HIRING_VACANCY_COPY_PROMPT_VERSION, HIRING_VACANCY_COPY_PROVIDER } from './config'
export {
  buildVacancyPromptInputFromRecords,
  buildVacancyCopyPrompt,
  VACANCY_COPY_SYSTEM_PROMPT,
  type VacancyPromptInput,
  type VacancyCompetencyInput,
} from './prompt'
export { sanitizeOpeningPublicCopy, OPENING_PUBLIC_COPY_JSON_SCHEMA, type OpeningPublicCopyRawOutput } from './contracts'
export { runPublicCopyGeneration, type PublicCopyGenerationResult, type PublicCopyDeps } from './providers'
export {
  proposeOpeningPublicCopy,
  type ProposeOpeningPublicCopyInput,
  type ProposeOpeningPublicCopyResult,
} from './propose'
export { applyOpeningPublicCopy } from './apply'
