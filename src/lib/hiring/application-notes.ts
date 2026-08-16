import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { isViewerBlindForApplicationEvaluation } from './assessment/instances'
import { HiringNotFoundError, HiringValidationError } from './errors'

// ══════════════════════════════════════════════════════════════════════════
// TASK-1735 — Expediente de Evaluación: notas append-only per-application.
// La nota es narrativa de evaluación (no score): nunca toca score/match_score/
// explainability_json ni el proposal ledger de TASK-1361 — los referencia via
// context_json. Internal-only: jamás candidate-facing ni en el review packet MCP.
// ══════════════════════════════════════════════════════════════════════════

export const HIRING_APPLICATION_NOTE_KINDS = ['cv_analysis', 'assessment_review', 'interview_note', 'general'] as const
export type HiringApplicationNoteKind = (typeof HIRING_APPLICATION_NOTE_KINDS)[number]

export const HIRING_APPLICATION_NOTE_SOURCES = ['human', 'agent'] as const
export type HiringApplicationNoteSource = (typeof HIRING_APPLICATION_NOTE_SOURCES)[number]

export const HIRING_APPLICATION_NOTE_BODY_MAX = 8000

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

export interface RecordHiringApplicationNoteInput {
  applicationId: string
  kind: HiringApplicationNoteKind
  bodyMd: string
  authorUserId: string
  source?: HiringApplicationNoteSource
  contextJson?: Record<string, unknown>
}

interface NoteRow extends Record<string, unknown> {
  note_id: string
  application_id: string
  kind: string
  body_md: string
  author_user_id: string
  source: string
  context_json: unknown
  created_at: string | Date
}

const NOTE_COLUMNS = `note_id, application_id, kind, body_md, author_user_id, source, context_json, created_at`

const normalizeNote = (row: NoteRow): HiringApplicationNote => ({
  noteId: row.note_id,
  applicationId: row.application_id,
  kind: row.kind as HiringApplicationNoteKind,
  bodyMd: row.body_md,
  authorUserId: row.author_user_id,
  source: row.source as HiringApplicationNoteSource,
  contextJson: (row.context_json ?? {}) as Record<string, unknown>,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
})

const assertNoteInput = (input: RecordHiringApplicationNoteInput): void => {
  if (!input.applicationId || typeof input.applicationId !== 'string') {
    throw new HiringValidationError('Falta el identificador de la postulación.', 'hiring_invalid_input', 400)
  }

  if (!HIRING_APPLICATION_NOTE_KINDS.includes(input.kind)) {
    throw new HiringValidationError('El tipo de nota no es válido.', 'hiring_note_invalid_kind', 400)
  }

  const body = typeof input.bodyMd === 'string' ? input.bodyMd.trim() : ''

  if (body.length === 0 || body.length > HIRING_APPLICATION_NOTE_BODY_MAX) {
    throw new HiringValidationError(
      `La nota debe tener entre 1 y ${HIRING_APPLICATION_NOTE_BODY_MAX} caracteres.`,
      'hiring_note_invalid_body',
      400
    )
  }

  if (!input.authorUserId || typeof input.authorUserId !== 'string') {
    throw new HiringValidationError('Falta el autor de la nota.', 'hiring_invalid_input', 400)
  }

  if (input.source !== undefined && !HIRING_APPLICATION_NOTE_SOURCES.includes(input.source)) {
    throw new HiringValidationError('El origen de la nota no es válido.', 'hiring_note_invalid_source', 400)
  }
}

/**
 * Command canónico: registra una nota append-only del expediente y publica el evento
 * outbox (payload IDs-only) en la MISMA transacción. Corrección = nota nueva que
 * referencia la anterior via context_json.supersedesNoteId; nunca UPDATE/DELETE.
 * `client` opcional para participar en la tx del caller (TASK-1735: el confirm del
 * dossier materializa la nota ATÓMICAMENTE con la marca de la propuesta).
 */
export const recordHiringApplicationNote = async (
  input: RecordHiringApplicationNoteInput,
  txClient: PoolClient | null = null
): Promise<HiringApplicationNote> => {
  assertNoteInput(input)

  const execute = async (client: PoolClient) => {
    const app = await client.query(
      `SELECT application_id FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
      [input.applicationId]
    )

    if (!app.rows[0]) {
      throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
    }

    const inserted = await client.query(
      `INSERT INTO greenhouse_hiring.hiring_application_note
         (application_id, kind, body_md, author_user_id, source, context_json)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING ${NOTE_COLUMNS}`,
      [
        input.applicationId,
        input.kind,
        input.bodyMd.trim(),
        input.authorUserId,
        input.source ?? 'human',
        JSON.stringify(input.contextJson ?? {})
      ]
    )

    const note = normalizeNote(inserted.rows[0] as NoteRow)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringApplication,
        aggregateId: note.applicationId,
        eventType: EVENT_TYPES.hiringApplicationNoteRecorded,
        payload: { noteId: note.noteId, applicationId: note.applicationId, kind: note.kind, actorUserId: note.authorUserId }
      },
      client
    )

    return note
  }

  if (txClient) return execute(txClient)

  return withGreenhousePostgresTransaction(execute)
}

// ── Gate anti-anclaje del expediente (TASK-1737, Delta (3) de TASK-1735) ──
// Kinds que cargan juicio evaluativo: bajo el predicado, las AJENAS se omiten del payload.
export const HIRING_SCORE_BEARING_NOTE_KINDS = ['cv_analysis', 'assessment_review', 'interview_note'] as const

export interface HiringApplicationNotesView {
  notes: HiringApplicationNote[]
  /** Notas omitidas por el gate anti-anclaje para ESTE viewer (0 si no hay bloqueo). */
  hiddenNoteCount: number
  /** true = el viewer tiene scorecard propio abierto y el payload viene filtrado. */
  viewerBlindUntilScorecardSubmitted: boolean
}

const isNoteHiddenForBlindViewer = (note: HiringApplicationNote, viewerUserId: string): boolean => {
  // Todo lo `agent` espera el scorecard propio (el análisis IA lee scores por construcción).
  if (note.source === 'agent') return true

  // Juicio evaluativo AJENO se oculta; las notas propias y las `general` ajenas pasan.
  return (
    (HIRING_SCORE_BEARING_NOTE_KINDS as readonly string[]).includes(note.kind) &&
    note.authorUserId !== viewerUserId
  )
}

/**
 * Reader canónico: notas del expediente de una application, más reciente primero.
 *
 * Anti-anclaje (TASK-1737, mismo predicado que `listResponses`/`listPeerScorecardResults`):
 * con `viewerUserId` y scorecard propio ABIERTO, el payload omite las notas score-bearing
 * de OTROS autores y toda nota `source='agent'` — la ceguera la garantiza este reader,
 * no la UI. Sin `viewerUserId` (llamadas server-internas) NO se filtra.
 */
export const listHiringApplicationNotes = async (
  applicationId: string,
  viewerUserId?: string | null
): Promise<HiringApplicationNotesView> => {
  if (!applicationId || typeof applicationId !== 'string') {
    throw new HiringValidationError('Falta el identificador de la postulación.', 'hiring_invalid_input', 400)
  }

  const rows = await runGreenhousePostgresQuery<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM greenhouse_hiring.hiring_application_note
     WHERE application_id = $1
     ORDER BY created_at DESC, note_id DESC`,
    [applicationId]
  )

  const all = rows.map(normalizeNote)

  const blind = viewerUserId ? await isViewerBlindForApplicationEvaluation(applicationId, viewerUserId) : false

  if (!blind || !viewerUserId) {
    return { notes: all, hiddenNoteCount: 0, viewerBlindUntilScorecardSubmitted: false }
  }

  const visible = all.filter(note => !isNoteHiddenForBlindViewer(note, viewerUserId))

  return {
    notes: visible,
    hiddenNoteCount: all.length - visible.length,
    viewerBlindUntilScorecardSubmitted: true
  }
}
