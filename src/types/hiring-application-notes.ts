/**
 * TASK-1735 / TASK-1737 — Contrato puro del Expediente de Evaluación (notas
 * append-only per-application). Vive en `src/types/` (sin `server-only`) para que
 * el client component del tab Expediente comparta enums/límites con el primitive
 * canónico `src/lib/hiring/application-notes.ts` sin duplicarlos (espejo del patrón
 * `hiring-dossier-ai.ts`).
 */

export const HIRING_APPLICATION_NOTE_KINDS = ['cv_analysis', 'assessment_review', 'interview_note', 'general'] as const
export type HiringApplicationNoteKind = (typeof HIRING_APPLICATION_NOTE_KINDS)[number]

export const HIRING_APPLICATION_NOTE_SOURCES = ['human', 'agent'] as const
export type HiringApplicationNoteSource = (typeof HIRING_APPLICATION_NOTE_SOURCES)[number]

export const HIRING_APPLICATION_NOTE_BODY_MAX = 8000

/** Kinds que cargan juicio evaluativo — bajo el gate anti-anclaje, las AJENAS se omiten. */
export const HIRING_SCORE_BEARING_NOTE_KINDS = ['cv_analysis', 'assessment_review', 'interview_note'] as const

export interface HiringApplicationNote {
  noteId: string
  applicationId: string
  kind: HiringApplicationNoteKind
  bodyMd: string
  authorUserId: string
  source: HiringApplicationNoteSource
  contextJson: Record<string, unknown>
  createdAt: string
}

export interface HiringApplicationNotesView {
  notes: HiringApplicationNote[]
  /** Notas omitidas por el gate anti-anclaje para ESTE viewer (0 si no hay bloqueo). */
  hiddenNoteCount: number
  /** true = el viewer tiene scorecard propio abierto y el payload viene filtrado. */
  viewerBlindUntilScorecardSubmitted: boolean
}
