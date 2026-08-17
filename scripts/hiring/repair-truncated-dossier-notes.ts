/**
 * TASK-1735 / defecto 2026-08-16 — Reparación de las notas del expediente que se
 * persistieron TRUNCADAS.
 *
 * Qué pasó: `renderEvaluationDossierMarkdown` cortaba el markdown al techo del CHECK
 * (`length(body_md) BETWEEN 1 AND 8000`) antes del insert. El primer análisis confirmado
 * en producción-local (propuesta `hdsp-384b740a…`) rendía 8168 caracteres y se guardó en
 * exactamente 8000: se perdió el final del documento. Visualmente no se notaba porque el
 * panel renderiza desde `proposedJson`, pero todo consumer del `bodyMd` (API, export,
 * Nexa, MCP) leía un análisis cortado a mitad de frase.
 *
 * Por qué la reparación es posible: el ledger de propuestas conserva el `proposed_json`
 * íntegro — el contenido nunca se perdió, sólo quedó recortado al materializarse.
 *
 * Cómo repara: `hiring_application_note` es append-only por diseño (trigger + grants), así
 * que NO se muta la fila mala. Se registra una nota NUEVA con el texto completo vía el
 * primitive canónico `recordHiringApplicationNote` (mismo kind, `source='agent'`, mismo
 * autor que confirmó), cuyo `context_json` declara `supersedesNoteId` + `reason`. La nota
 * truncada permanece como hecho histórico; la nueva es la vigente.
 *
 * Requisitos: el techo ya ampliado a 20000 en la base (migration
 * `20260817000658897_task-1735-hiring-note-body-max-20000`). El script lo verifica y
 * aborta si el CHECK sigue en 8000 — reparar contra el límite viejo re-truncaría.
 *
 * Uso (con el proxy Cloud SQL arriba: `pnpm pg:connect`):
 *   npx tsx --require dotenv/config --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/hiring/repair-truncated-dossier-notes.ts            # dry-run
 *   ... scripts/hiring/repair-truncated-dossier-notes.ts --apply
 */
import { recordHiringApplicationNote } from '@/lib/hiring/application-notes'
import { renderEvaluationDossierMarkdown } from '@/lib/hiring/dossier-ai/confirm'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { HIRING_APPLICATION_NOTE_BODY_MAX } from '@/types/hiring-application-notes'
import type { EvaluationDossierDraft } from '@/types/hiring-dossier-ai'

const APPLY = process.argv.includes('--apply')

/** Marca que dejaba el render al cortar — es la huella exacta del defecto. */
const TRUNCATION_MARK = '_(Contenido truncado al máximo de la nota.)_'

interface TruncatedNoteRow extends Record<string, unknown> {
  note_id: string
  application_id: string
  kind: string
  author_user_id: string
  body_len: number
  context_json: Record<string, unknown>
  proposal_id: string | null
  proposed_json: Record<string, unknown> | null
  proposal_model: string | null
  proposal_prompt_version: string | null
  proposal_input_digest: string | null
  already_repaired: boolean
}

/**
 * Notas `source='agent'` con la marca de truncado, junto a la propuesta que las originó.
 * `already_repaired` hace el job idempotente: si ya existe una nota que la supersede, se
 * omite (nunca se apilan reparaciones de la misma nota).
 */
const TRUNCATED_NOTES_SQL = `
  SELECT
    n.note_id,
    n.application_id,
    n.kind,
    n.author_user_id,
    length(n.body_md) AS body_len,
    n.context_json,
    p.proposal_id,
    p.proposed_json,
    p.model         AS proposal_model,
    p.prompt_version AS proposal_prompt_version,
    p.input_digest  AS proposal_input_digest,
    EXISTS (
      SELECT 1 FROM greenhouse_hiring.hiring_application_note r
      WHERE r.context_json->>'supersedesNoteId' = n.note_id
    ) AS already_repaired
  FROM greenhouse_hiring.hiring_application_note n
  LEFT JOIN greenhouse_hiring.hiring_application_dossier_proposal p
    ON p.proposal_id = n.context_json->>'dossierProposalId'
  WHERE n.source = 'agent'
    AND n.body_md LIKE '%' || $1 || '%'
  ORDER BY n.created_at ASC`

const assertLimitWidened = async (): Promise<void> => {
  const [row] = await runGreenhousePostgresQuery<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.hiring_application_note'::regclass
       AND conname = 'hiring_application_note_body_md_check'`,
    []
  )

  if (!row) throw new Error('No existe hiring_application_note_body_md_check — base inesperada.')

  if (!row.def.includes(String(HIRING_APPLICATION_NOTE_BODY_MAX))) {
    throw new Error(
      `El CHECK del body sigue en "${row.def}" y el código espera ${HIRING_APPLICATION_NOTE_BODY_MAX}. ` +
        'Aplica la migración antes de reparar: reparar contra el límite viejo vuelve a truncar.'
    )
  }
}

const main = async (): Promise<void> => {
  await assertLimitWidened()

  const rows = await runGreenhousePostgresQuery<TruncatedNoteRow>(TRUNCATED_NOTES_SQL, [TRUNCATION_MARK])

  console.log(`[repair] notas truncadas detectadas: ${rows.length} (${APPLY ? 'APPLY' : 'dry-run'})`)

  for (const row of rows) {
    const label = `${row.note_id} (app ${row.application_id})`

    if (row.already_repaired) {
      console.log(`[skip] ${label} — ya tiene nota que la supersede.`)
      continue
    }

    const dossier = (row.proposed_json?.dossier ?? null) as EvaluationDossierDraft | null

    if (!dossier || typeof dossier.resumenEjecutivo !== 'string') {
      console.log(`[skip] ${label} — sin propuesta reconstruible en el ledger; requiere ojos humanos.`)
      continue
    }

    const fullBody = renderEvaluationDossierMarkdown(dossier)

    if (fullBody.length > HIRING_APPLICATION_NOTE_BODY_MAX) {
      console.log(
        `[skip] ${label} — el render íntegro (${fullBody.length}) excede el techo ${HIRING_APPLICATION_NOTE_BODY_MAX}. ` +
          'No se repara recortando: requiere decisión humana.'
      )
      continue
    }

    console.log(`[repair] ${label}: ${row.body_len} → ${fullBody.length} caracteres`)

    if (!APPLY) continue

    const note = await recordHiringApplicationNote({
      applicationId: row.application_id,
      kind: row.kind as 'cv_analysis' | 'assessment_review' | 'interview_note' | 'general',
      bodyMd: fullBody,
      // Mismo autor que confirmó: la reparación restituye lo que ESA persona aprobó.
      authorUserId: row.author_user_id,
      source: 'agent',
      contextJson: {
        supersedesNoteId: row.note_id,
        dossierProposalId: row.proposal_id,
        reason: 'truncation_repair',
        inputDigest: row.proposal_input_digest,
        model: row.proposal_model,
        promptVersion: row.proposal_prompt_version,
        repairedTruncatedLength: row.body_len,
        repairedFullLength: fullBody.length
      }
    })

    console.log(`[ok] ${label} → nota nueva ${note.noteId}`)
  }

  console.log('[repair] fin.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[repair] falló:', error)
    process.exit(1)
  })
