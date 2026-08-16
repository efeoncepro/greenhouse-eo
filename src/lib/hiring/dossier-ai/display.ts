import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { HiringApplicationNote } from '@/types/hiring-application-notes'
import type { DossierProposal, EvaluationDossierDraft } from '@/types/hiring-dossier-ai'

import { buildCompetencyKeyReplacer } from './generate'

// ══════════════════════════════════════════════════════════════════════════
// TASK-1737 — Capa de display AL SERVIR (fix propuestas v1 almacenadas).
// El fix de generación (prompt v2 + sanitizer) limpia las keys snake_case en
// propuestas NUEVAS, pero el ledger `hiring_application_dossier_proposal` es
// inmutable por diseño: las propuestas v1 ya almacenadas conservan las keys en
// `proposed_json` y el GET las servía verbatim. Este módulo es el punto único
// server-side que traduce key→nombre humano EN LECTURA (dossier de la propuesta
// y notas source='agent') sin mutar jamás las filas almacenadas.
//
// INVARIANTE del panel (render estructurado): la traducción es SIEMPRE el mismo
// replacer puro aplicado al string almacenado — nunca re-sanitiza ni re-clampa.
// Así `clean(note.bodyMd almacenado) ≡ clean(render(dossier almacenado))` se
// preserva byte a byte cuando el humano confirmó sin editar, y el panel sigue
// eligiendo la rama estructurada en vez del fallback markdown.
// ══════════════════════════════════════════════════════════════════════════

type CompetencyNameRow = {
  competency_key: string
  competency_name: string | null
}

/**
 * Mapa key→nombre humano de las competencias del assessment de la application.
 * Query liviana (espejo de las fuentes del packet: responses + competency results,
 * sin filtro de status — la traducción de display debe cubrir cualquier propuesta
 * histórica). Devuelve solo pares con nombre real distinto de la key.
 */
export const getCompetencyNameMapForApplication = async (applicationId: string): Promise<Record<string, string>> => {
  const rows = await runGreenhousePostgresQuery<CompetencyNameRow>(
    `SELECT c.key AS competency_key, c.name AS competency_name
       FROM greenhouse_hiring.hiring_assessment a
       JOIN greenhouse_hiring.hiring_assessment_response r ON r.assessment_id = a.assessment_id
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = r.competency_id
      WHERE a.application_id = $1
     UNION
     SELECT c.key AS competency_key, c.name AS competency_name
       FROM greenhouse_hiring.hiring_assessment a
       JOIN greenhouse_hiring.hiring_competency_result cr ON cr.assessment_id = a.assessment_id
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = cr.competency_id
      WHERE a.application_id = $1`,
    [applicationId]
  )

  const map: Record<string, string> = {}

  for (const row of rows) {
    const name = (row.competency_name ?? '').trim()

    if (row.competency_key && name && name !== row.competency_key) {
      map[row.competency_key] = name
    }
  }

  return map
}

type TextCleaner = (text: string) => string

const cleanClaims = (raw: unknown, clean: TextCleaner): Array<{ afirmacion: string; evidencia: string }> => {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((claim): claim is { afirmacion?: unknown; evidencia?: unknown } => Boolean(claim) && typeof claim === 'object')
    .map(claim => ({
      afirmacion: typeof claim.afirmacion === 'string' ? clean(claim.afirmacion) : '',
      evidencia: typeof claim.evidencia === 'string' ? clean(claim.evidencia) : ''
    }))
}

const cleanStrList = (raw: unknown, clean: TextCleaner): string[] => {
  if (!Array.isArray(raw)) return []

  return raw.filter((item): item is string => typeof item === 'string').map(clean)
}

/**
 * Traducción display-only del dossier almacenado: aplica el replacer campo a campo,
 * SIN re-clampar ni descartar contenido (el borrador ya pasó el sanitizer al persistirse;
 * re-sanitizarlo podría divergir del bodyMd de la nota y romper el render estructurado).
 * Devuelve null si el shape almacenado no es usable.
 */
const translateDraftForDisplay = (dossier: unknown, clean: TextCleaner): EvaluationDossierDraft | null => {
  if (!dossier || typeof dossier !== 'object') return null
  const d = dossier as Record<string, unknown>

  if (typeof d.resumenEjecutivo !== 'string' || d.resumenEjecutivo.trim().length === 0) return null

  return {
    resumenEjecutivo: clean(d.resumenEjecutivo),
    coherencias: cleanClaims(d.coherencias, clean),
    gaps: cleanClaims(d.gaps, clean),
    focosEntrevista: cleanStrList(d.focosEntrevista, clean),
    noVerificable: cleanStrList(d.noVerificable, clean)
  }
}

/**
 * Traducción display-only de una propuesta: traduce key→nombre humano los strings del
 * `proposed.dossier` almacenado. Devuelve una COPIA — nunca muta la propuesta ni la
 * fila del ledger. Si el dossier almacenado no tiene forma usable o el mapa está vacío,
 * devuelve la propuesta original tal cual.
 */
export const translateDossierProposalForDisplay = (
  proposal: DossierProposal,
  competencyNameByKey: Record<string, string>
): DossierProposal => {
  if (Object.keys(competencyNameByKey).length === 0) return proposal

  const translated = translateDraftForDisplay(proposal.proposed.dossier, buildCompetencyKeyReplacer(competencyNameByKey))

  if (!translated) return proposal

  return {
    ...proposal,
    proposed: { ...proposal.proposed, dossier: translated }
  }
}

/**
 * Traducción display-only del bodyMd de notas `source='agent'` (materializadas desde
 * propuestas v1 con keys). Las notas humanas NO se tocan; keys desconocidas quedan
 * intactas. El GET del dossier traduce `proposalBodyMd` con el MISMO replacer sobre el
 * render del dossier almacenado, así la comparación nota-confirmada ≡ render canónico
 * del panel se preserva byte a byte.
 */
export const translateAgentNoteBodiesForDisplay = (
  notes: HiringApplicationNote[],
  competencyNameByKey: Record<string, string>
): HiringApplicationNote[] => {
  if (Object.keys(competencyNameByKey).length === 0) return notes

  const clean = buildCompetencyKeyReplacer(competencyNameByKey)

  return notes.map(note => (note.source === 'agent' ? { ...note, bodyMd: clean(note.bodyMd) } : note))
}
