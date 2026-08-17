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

/**
 * Techo del cuerpo de la nota — espejo EXACTO del CHECK `hiring_application_note_body_md_check`
 * (migration `20260817000658897_task-1735-hiring-note-body-max-20000`). El original (8000) era
 * conservador sin fundamento para narrativa de evaluación con evidencia citada y truncaba
 * análisis reales; si se vuelve a mover, la migración y esta constante cambian JUNTAS.
 */
export const HIRING_APPLICATION_NOTE_BODY_MAX = 20000

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
  /**
   * TASK-1735 — noteId de la nota que la reemplaza (derivado en el reader desde el
   * `context_json.supersedesNoteId` de la nota posterior). Cuando existe, esta nota
   * es historia: los consumers la marcan como superada y jamás la muestran como vigente.
   */
  supersededByNoteId?: string | null
}

export interface HiringApplicationNotesView {
  notes: HiringApplicationNote[]
  /** Notas omitidas por el gate anti-anclaje para ESTE viewer (0 si no hay bloqueo). */
  hiddenNoteCount: number
  /** true = el viewer tiene scorecard propio abierto y el payload viene filtrado. */
  viewerBlindUntilScorecardSubmitted: boolean
}
