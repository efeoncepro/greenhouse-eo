import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1362 — Política de retención de documentos de candidatos NO contratados.
 *
 * La Ley 21.719 no fija un plazo: exige que el tratamiento tenga finalidad y que
 * los datos no se conserven más allá de ella. Terminado el proceso de selección,
 * la finalidad de guardar el CV y la identidad de quien no fue contratado se
 * agota. 12 meses es el plazo declarado por Greenhouse: cubre una reapertura
 * razonable del cargo sin volverse un archivo permanente de PII.
 *
 * QUÉ HACE ESTE MÓDULO Y QUÉ NO:
 * detecta y expone la deuda; NO borra. El borrado de documentos de personas
 * reales es una acción irreversible que exige un comando gobernado con humano en
 * el loop (owner: People Ops) — está declarado como follow-up de esta task, no
 * implementado acá. Un reader que borra en silencio es peor que la deuda.
 *
 * El reloj arranca:
 *   - `rejected` / `withdrawn` → desde `decision_at` + ventana.
 *   - consentimiento retirado → vencido de inmediato: la persona revocó la base
 *     de licitud y ninguna ventana la sobrevive.
 *
 * Quedan FUERA los candidatos `selected`/`backup_selected`: al ser contratados
 * pasan a workforce y les aplica la retención laboral, que es mucho más larga.
 */
export const CANDIDATE_DOCUMENT_RETENTION_MONTHS = 12

/** Override explícito por candidato, ej. `retain_months:24`. Cualquier otro valor se ignora. */
const RETENTION_POLICY_OVERRIDE = /^retain_months:(\d{1,3})$/

export const resolveRetentionMonths = (retentionPolicy: string | null): number => {
  const match = retentionPolicy?.trim().match(RETENTION_POLICY_OVERRIDE)

  if (!match) return CANDIDATE_DOCUMENT_RETENTION_MONTHS

  const months = Number.parseInt(match[1], 10)

  return months > 0 ? months : CANDIDATE_DOCUMENT_RETENTION_MONTHS
}

export type OverdueCandidateRetention = {
  candidateFacetId: string
  identityProfileId: string
  reason: 'consent_withdrawn' | 'retention_window_elapsed'
  closedAt: string | null
  documentCount: number
}

/**
 * `decision_at` y `created_at` son TIMESTAMPTZ (verificado contra PG real), así
 * que el interval math es seguro. NO usar `EXTRACT(EPOCH FROM (date - date))`
 * acá ni en ningún descendiente de esta query: sobre DATE devuelve integer y
 * revienta en runtime (bug class TASK-893).
 */
const OVERDUE_SQL = `
  WITH closed_candidates AS (
    SELECT
      cf.candidate_facet_id,
      cf.identity_profile_id,
      cf.consent_status,
      cf.retention_policy,
      MAX(ha.decision_at) AS closed_at,
      BOOL_OR(ha.decision IN ('selected', 'backup_selected')) AS was_hired
    FROM greenhouse_hiring.candidate_facet cf
    JOIN greenhouse_hiring.hiring_application ha
      ON ha.identity_profile_id = cf.identity_profile_id
    WHERE ha.decision IS NOT NULL
    GROUP BY cf.candidate_facet_id, cf.identity_profile_id, cf.consent_status, cf.retention_policy
  )
  SELECT
    cc.candidate_facet_id,
    cc.identity_profile_id,
    CASE WHEN cc.consent_status = 'withdrawn' THEN 'consent_withdrawn' ELSE 'retention_window_elapsed' END AS reason,
    cc.closed_at,
    COUNT(a.asset_id)::int AS document_count
  FROM closed_candidates cc
  LEFT JOIN greenhouse_core.assets a
    ON a.retention_class = 'hiring_candidate_document'
   AND a.status <> 'deleted'
   AND a.metadata_json->>'candidateFacetId' = cc.candidate_facet_id
  WHERE cc.was_hired = FALSE
    AND (
      cc.consent_status = 'withdrawn'
      OR cc.closed_at < CURRENT_TIMESTAMP - make_interval(months => $1::int)
    )
  GROUP BY cc.candidate_facet_id, cc.identity_profile_id, reason, cc.closed_at
  HAVING COUNT(a.asset_id) > 0
  ORDER BY cc.closed_at ASC
`

type OverdueRow = {
  candidate_facet_id: string
  identity_profile_id: string
  reason: string
  closed_at: string | null
  document_count: number
}

/**
 * Candidatos no contratados cuyos documentos ya deberían haberse borrado.
 * Alimenta el signal `hiring.candidate_document.retention_overdue` y el futuro
 * comando de borrado gobernado.
 *
 * Nota de fidelidad: la ventana se aplica con el default declarado. El override
 * por candidato (`retention_policy`) se resuelve en TS sobre las filas devueltas
 * porque hoy ningún registro lo usa; si eso cambia, moverlo al predicado SQL.
 */
export const listOverdueCandidateRetentions = async (
  retentionMonths: number = CANDIDATE_DOCUMENT_RETENTION_MONTHS,
): Promise<OverdueCandidateRetention[]> => {
  const rows = await runGreenhousePostgresQuery<OverdueRow>(OVERDUE_SQL, [retentionMonths])

  return rows.map(row => ({
    candidateFacetId: row.candidate_facet_id,
    identityProfileId: row.identity_profile_id,
    reason: row.reason as OverdueCandidateRetention['reason'],
    closedAt: row.closed_at,
    documentCount: row.document_count,
  }))
}
