import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringValidationError } from '../errors'
import { HIRING_DATA_ORIGIN_VALUES, isSyntheticDataOrigin, type HiringDataOrigin } from './contracts'

/**
 * TASK-1739 Slice 4 — Marcado gobernado de procedencia sobre datos YA existentes.
 *
 * Protocolo canónico del dominio, idéntico al de la remediación de nombres (ADR D4 de TASK-1736):
 * `dry-run → allowlist humana revisada línea a línea → apply con actor + motivo → rollback por
 * registro`. Un flag jamás autoriza un backfill; la puerta es capability + poda humana.
 *
 * Las heurísticas del plan son **propuestas con la evidencia citada**, nunca veredictos, y su
 * confianza depende de la ENTIDAD (recalibrado contra la base real el 2026-08-18):
 * - En las raíces de demanda el AUTOR es señal fuerte: `task-1372-smoke` explica 8 vacantes + 8
 *   demandas, el cluster sintético más grande, y se identifica sin una sola regex de nombre.
 * - En personas el autor es INÚTIL (`created_by` es NULL en 55 de 61 fichas) y la señal fuerte es el
 *   dominio de correo: `@example.com` explica 7 de las 9 postulaciones sintéticas llegadas por
 *   careers.
 * - El nombre es señal BAJA y nunca alcanza sola: hay un falso positivo demostrado (una respuesta
 *   real de candidato que dice "pequeñas pruebas o pilotos" hace match con /PRUEBA/).
 */

export const DATA_ORIGIN_REASON_MIN = 10

/** `@efeoncepro.com` es el dominio corporativo REAL: jamás es señal de sintético. */
const SYNTHETIC_EMAIL_DOMAINS = new Set(['example.com', 'live-test.invalid', 'efeonce.test'])

/** Autores que sólo puede haber escrito un fixture o un smoke. Nunca un user-id humano real. */
const SYNTHETIC_AUTHORS = new Set([
  'task-1372-smoke',
  'user-live-test',
  'user-live-test-proposal',
  'user-live-test-2',
  'user-live-test-3',
  'user-live-test-racer',
  'user-smoke-test',
])

export type DataOriginRecordType = 'identity_profile' | 'talent_demand' | 'hiring_opening'

export type SignalConfidence = 'alta' | 'media' | 'baja'

export interface DataOriginSignal {
  signal: string
  confidence: SignalConfidence
  detail: string
}

export interface DataOriginMarkCandidate {
  recordType: DataOriginRecordType
  recordId: string
  currentOrigin: HiringDataOrigin
  signals: DataOriginSignal[]
  /** Razones por las que este registro NO se puede marcar. Si hay alguna, el apply lo rechaza. */
  blockers: string[]
}

export interface DataOriginMarkPlan {
  generatedAt: string
  candidates: DataOriginMarkCandidate[]
}

/** Vida laboral: marcar sintética a una persona con relación laboral tocaría payroll. Prohibido. */
const WORK_LIFE_BLOCKERS: { table: string; column: string; label: string }[] = [
  { table: 'greenhouse_core.members', column: 'identity_profile_id', label: 'es colaborador (members)' },
  {
    table: 'greenhouse_hr.contractor_engagements',
    column: 'identity_profile_id',
    label: 'tiene engagement de contractor',
  },
  { table: 'greenhouse_payroll.final_settlements', column: 'identity_profile_id', label: 'tiene finiquito' },
  {
    table: 'greenhouse_core.person_legal_entity_relationships',
    column: 'profile_id',
    label: 'tiene relación legal vigente',
  },
]

/**
 * Blockers de TODO el lote en 4 consultas, no 4 por candidato.
 *
 * La primera versión consultaba por registro: con 10 candidatos eran 40 viajes secuenciales a Cloud
 * SQL y el plan se pasaba de 15 s. El costo crece con el universo a marcar, justo cuando el plan más
 * se necesita. Cada tabla se consulta por separado (no un UNION) para que una tabla ausente en un
 * entorno degrade sólo su propia señal en vez de tumbar el plan entero.
 */
const loadWorkLifeBlockers = async (profileIds: string[]): Promise<Map<string, string[]>> => {
  const byProfile = new Map<string, string[]>()

  if (profileIds.length === 0) return byProfile

  for (const probe of WORK_LIFE_BLOCKERS) {
    const rows = await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT DISTINCT ${probe.column} AS profile_id FROM ${probe.table} WHERE ${probe.column} = ANY($1::text[])`,
      [profileIds],
    ).catch(() => [])

    for (const row of rows) {
      byProfile.set(row.profile_id, [...(byProfile.get(row.profile_id) ?? []), probe.label])
    }
  }

  return byProfile
}

/** Variante por registro para el apply, que opera en lotes de 1. */
const listWorkLifeBlockers = async (profileId: string): Promise<string[]> =>
  (await loadWorkLifeBlockers([profileId])).get(profileId) ?? []

/**
 * Plan READ-ONLY. No muta nada. Devuelve propuestas con su evidencia para que un humano pode.
 *
 * NO imprime ni retorna nombres ni correos completos: sólo el identificador y la señal que disparó.
 * El operador que necesite ver la persona la abre en el portal, donde el acceso queda auditado.
 */
export const planSyntheticOriginMarking = async (): Promise<DataOriginMarkPlan> => {
  const candidates: DataOriginMarkCandidate[] = []

  // ── Raíces de demanda: el AUTOR es la señal fuerte ──────────────────────────
  const authors = [...SYNTHETIC_AUTHORS]

  const demandRows = await runGreenhousePostgresQuery<{
    demand_id: string
    created_by: string
    data_origin: string
  }>(
    `SELECT demand_id, created_by, data_origin
       FROM greenhouse_hiring.talent_demand
      WHERE created_by = ANY($1::text[]) AND data_origin = 'real'
      ORDER BY created_at`,
    [authors],
  )

  for (const row of demandRows) {
    candidates.push({
      recordType: 'talent_demand',
      recordId: row.demand_id,
      currentOrigin: row.data_origin as HiringDataOrigin,
      signals: [
        {
          signal: 'created_by_sintetico',
          confidence: 'alta',
          detail: `creada por ${row.created_by}, autor que sólo usan fixtures y smokes`,
        },
      ],
      blockers: [],
    })
  }

  const openingRows = await runGreenhousePostgresQuery<{
    opening_id: string
    created_by: string
    data_origin: string
    published_at: Date | null
  }>(
    `SELECT opening_id, created_by, data_origin, published_at
       FROM greenhouse_hiring.hiring_opening
      WHERE created_by = ANY($1::text[]) AND data_origin = 'real'
      ORDER BY created_at`,
    [authors],
  )

  for (const row of openingRows) {
    const signals: DataOriginSignal[] = [
      {
        signal: 'created_by_sintetico',
        confidence: 'alta',
        detail: `creada por ${row.created_by}, autor que sólo usan fixtures y smokes`,
      },
    ]

    if (row.published_at) {
      signals.push({
        signal: 'estuvo_publicada',
        confidence: 'alta',
        detail: 'llegó a estar publicada en el careers real — revisar si atrajo postulantes externos',
      })
    }

    candidates.push({
      recordType: 'hiring_opening',
      recordId: row.opening_id,
      currentOrigin: row.data_origin as HiringDataOrigin,
      signals,
      blockers: [],
    })
  }

  // ── Personas: el dominio de correo es la señal fuerte; el autor NO sirve ─────
  const profileRows = await runGreenhousePostgresQuery<{
    profile_id: string
    email_domain: string | null
    local_part: string | null
    data_origin: string
  }>(
    `SELECT p.profile_id,
            split_part(p.canonical_email, '@', 2) AS email_domain,
            split_part(p.canonical_email, '@', 1) AS local_part,
            p.data_origin
       FROM greenhouse_core.identity_profiles p
       JOIN greenhouse_hiring.candidate_facet cf ON cf.identity_profile_id = p.profile_id
      WHERE p.data_origin = 'real'
      ORDER BY p.profile_id`,
  )

  // Primero se resuelven las señales; los blockers se consultan UNA vez para todo el lote.
  const profileCandidates: DataOriginMarkCandidate[] = []

  for (const row of profileRows) {
    const signals: DataOriginSignal[] = []
    const domain = (row.email_domain ?? '').toLowerCase()
    const local = (row.local_part ?? '').toLowerCase()

    if (SYNTHETIC_EMAIL_DOMAINS.has(domain)) {
      signals.push({
        signal: 'dominio_reservado',
        confidence: 'alta',
        detail: `correo en @${domain}, dominio que nunca corresponde a una persona real`,
      })
    }

    if (local.includes('+test') || local.includes('+smoke')) {
      signals.push({
        signal: 'sufijo_de_prueba',
        confidence: 'media',
        detail: 'el correo usa un sufijo +test/+smoke, que también puede ser un alias legítimo',
      })
    }

    if (signals.length === 0) continue

    profileCandidates.push({
      recordType: 'identity_profile',
      recordId: row.profile_id,
      currentOrigin: row.data_origin as HiringDataOrigin,
      signals,
      blockers: [],
    })
  }

  const blockersByProfile = await loadWorkLifeBlockers(profileCandidates.map(c => c.recordId))

  for (const candidate of profileCandidates) {
    candidates.push({ ...candidate, blockers: blockersByProfile.get(candidate.recordId) ?? [] })
  }

  return { generatedAt: new Date().toISOString(), candidates }
}

export interface DataOriginMarkAllowlistEntry {
  recordType: DataOriginRecordType
  recordId: string
  /** Valor esperado en DB al momento del apply (CAS). Si no coincide, la fila se salta. */
  expectedCurrentOrigin: HiringDataOrigin
  proposedOrigin: HiringDataOrigin
}

export type DataOriginMarkOutcome = 'applied' | 'skipped' | 'needs_review'

export type DataOriginMarkReasonCode =
  | 'cas_mismatch'
  | 'already_marked'
  | 'work_life_blocker'
  | 'record_not_found'
  | 'proposed_is_real'

export interface DataOriginMarkEntryResult {
  recordType: DataOriginRecordType
  recordId: string
  outcome: DataOriginMarkOutcome
  reasonCode?: DataOriginMarkReasonCode
  auditId?: string
  /** Postulaciones cuya copia derivada se re-derivó por esta marca. */
  propagatedApplications?: number
}

export interface ApplySyntheticOriginMarkingInput {
  entries: DataOriginMarkAllowlistEntry[]
  actorUserId: string
  reason: string
}

export interface ApplySyntheticOriginMarkingSummary {
  applied: number
  skipped: number
  needsReview: number
  results: DataOriginMarkEntryResult[]
}

const TABLE_BY_RECORD_TYPE: Record<DataOriginRecordType, { table: string; idColumn: string }> = {
  identity_profile: { table: 'greenhouse_core.identity_profiles', idColumn: 'profile_id' },
  talent_demand: { table: 'greenhouse_hiring.talent_demand', idColumn: 'demand_id' },
  hiring_opening: { table: 'greenhouse_hiring.hiring_opening', idColumn: 'opening_id' },
}

/**
 * Apply en LOTES DE 1 con compare-and-set. Si la fila cambió entre el dry-run y el apply, se salta y
 * se reporta — jamás se pisa. Reejecutar el mismo allowlist es idempotente.
 *
 * **Propaga siempre.** Marcar una raíz NO toca la fila de `hiring_application`, así que el trigger de
 * derivación no dispararía solo y la copia quedaría obsoleta en el 100 % de los marcados: el desk
 * seguiría mostrando el fantasma recién marcado. Por eso el apply toca las postulaciones
 * dependientes dentro de la MISMA transacción y deja que el trigger recalcule.
 */
export const applySyntheticOriginMarking = async (
  input: ApplySyntheticOriginMarkingInput,
): Promise<ApplySyntheticOriginMarkingSummary> => {
  const actorUserId = typeof input.actorUserId === 'string' ? input.actorUserId.trim() : ''

  if (!actorUserId) {
    throw new HiringValidationError('Falta el actor del apply.', 'hiring_invalid_input', 400)
  }

  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''

  if (reason.length < DATA_ORIGIN_REASON_MIN) {
    throw new HiringValidationError(
      `El motivo del apply debe tener al menos ${DATA_ORIGIN_REASON_MIN} caracteres.`,
      'hiring_invalid_input',
      400,
    )
  }

  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    throw new HiringValidationError('La allowlist está vacía: nada que aplicar.', 'hiring_invalid_input', 400)
  }

  const keys = input.entries.map(entry => `${entry.recordType}:${entry.recordId}`)

  if (new Set(keys).size !== keys.length) {
    throw new HiringValidationError(
      'La allowlist tiene registros duplicados: revísala antes de aplicar.',
      'hiring_invalid_input',
      400,
    )
  }

  const results: DataOriginMarkEntryResult[] = []

  for (const entry of input.entries) {
    if (!TABLE_BY_RECORD_TYPE[entry.recordType]) {
      throw new HiringValidationError('Tipo de registro inválido en la allowlist.', 'hiring_invalid_input', 400, {
        recordType: entry.recordType,
      })
    }

    if (!(HIRING_DATA_ORIGIN_VALUES as readonly string[]).includes(entry.proposedOrigin)) {
      throw new HiringValidationError('La procedencia propuesta no es válida.', 'hiring_invalid_data_origin', 400)
    }

    // Marcar algo como `real` no es un backfill de procedencia: para deshacer una marca existe el
    // rollback, que parte del audit y deja rastro de por qué se revirtió.
    if (!isSyntheticDataOrigin(entry.proposedOrigin)) {
      results.push({
        recordType: entry.recordType,
        recordId: entry.recordId,
        outcome: 'needs_review',
        reasonCode: 'proposed_is_real',
      })
      continue
    }

    // Guarda dura: una persona con vida laboral jamás se marca sintética (tocaría payroll).
    if (entry.recordType === 'identity_profile') {
      const blockers = await listWorkLifeBlockers(entry.recordId)

      if (blockers.length > 0) {
        results.push({
          recordType: entry.recordType,
          recordId: entry.recordId,
          outcome: 'needs_review',
          reasonCode: 'work_life_blocker',
        })
        continue
      }
    }

    const result = await withGreenhousePostgresTransaction(async client => {
      const { table, idColumn } = TABLE_BY_RECORD_TYPE[entry.recordType]

      const current = await client.query(
        `SELECT data_origin FROM ${table} WHERE ${idColumn} = $1 FOR UPDATE`,
        [entry.recordId],
      )

      const row = current.rows[0] as { data_origin: string } | undefined

      if (!row) {
        return {
          recordType: entry.recordType,
          recordId: entry.recordId,
          outcome: 'needs_review' as const,
          reasonCode: 'record_not_found' as const,
        }
      }

      if (row.data_origin === entry.proposedOrigin) {
        return {
          recordType: entry.recordType,
          recordId: entry.recordId,
          outcome: 'skipped' as const,
          reasonCode: 'already_marked' as const,
        }
      }

      // CAS: la fila cambió desde el dry-run ⇒ no se pisa.
      if (row.data_origin !== entry.expectedCurrentOrigin) {
        return {
          recordType: entry.recordType,
          recordId: entry.recordId,
          outcome: 'needs_review' as const,
          reasonCode: 'cas_mismatch' as const,
        }
      }

      await client.query(`UPDATE ${table} SET data_origin = $1 WHERE ${idColumn} = $2`, [
        entry.proposedOrigin,
        entry.recordId,
      ])

      // Propagación: se toca la fila dependiente para que el trigger recalcule su copia derivada.
      let propagated = 0

      if (entry.recordType === 'identity_profile' || entry.recordType === 'hiring_opening') {
        const column = entry.recordType === 'identity_profile' ? 'identity_profile_id' : 'opening_id'

        const touched = await client.query(
          `UPDATE greenhouse_hiring.hiring_application
              SET data_origin = data_origin
            WHERE ${column} = $1`,
          [entry.recordId],
        )

        propagated = touched.rowCount ?? 0
      }

      const audit = await client.query(
        `INSERT INTO greenhouse_hiring.hiring_data_origin_audit
           (record_type, record_id, action, before_value, after_value, actor_user_id, reason)
         VALUES ($1, $2, 'mark', $3, $4, $5, $6)
         RETURNING audit_id`,
        [entry.recordType, entry.recordId, row.data_origin, entry.proposedOrigin, actorUserId, reason],
      )

      return {
        recordType: entry.recordType,
        recordId: entry.recordId,
        outcome: 'applied' as const,
        auditId: (audit.rows[0] as { audit_id: string }).audit_id,
        propagatedApplications: propagated,
      }
    })

    results.push(result)
  }

  return {
    applied: results.filter(r => r.outcome === 'applied').length,
    skipped: results.filter(r => r.outcome === 'skipped').length,
    needsReview: results.filter(r => r.outcome === 'needs_review').length,
    results,
  }
}

export interface RollbackSyntheticOriginMarkingInput {
  auditId: string
  actorUserId: string
  reason: string
}

export type RollbackOutcome = 'applied' | 'needs_review'

export interface RollbackSyntheticOriginMarkingResult {
  outcome: RollbackOutcome
  reasonCode?: 'audit_not_found' | 'not_a_mark' | 'cas_mismatch' | 'before_value_unavailable'
  recordType?: DataOriginRecordType
  recordId?: string
  restoredTo?: HiringDataOrigin
}

/**
 * Rollback POR REGISTRO desde el audit. CAS sobre el `after_value` de ese apply: si el valor vigente
 * ya no es el que dejó esa marca (alguien corrigió después), no se toca y se reporta.
 */
export const rollbackSyntheticOriginMarking = async (
  input: RollbackSyntheticOriginMarkingInput,
): Promise<RollbackSyntheticOriginMarkingResult> => {
  const actorUserId = typeof input.actorUserId === 'string' ? input.actorUserId.trim() : ''
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''

  if (!actorUserId) throw new HiringValidationError('Falta el actor del rollback.', 'hiring_invalid_input', 400)

  if (reason.length < DATA_ORIGIN_REASON_MIN) {
    throw new HiringValidationError(
      `El motivo del rollback debe tener al menos ${DATA_ORIGIN_REASON_MIN} caracteres.`,
      'hiring_invalid_input',
      400,
    )
  }

  return withGreenhousePostgresTransaction(async client => {
    const auditRows = await client.query(
      `SELECT record_type, record_id, action, before_value, after_value
         FROM greenhouse_hiring.hiring_data_origin_audit WHERE audit_id = $1`,
      [input.auditId],
    )

    const audit = auditRows.rows[0] as
      | { record_type: DataOriginRecordType; record_id: string; action: string; before_value: string | null; after_value: string | null }
      | undefined

    if (!audit) return { outcome: 'needs_review', reasonCode: 'audit_not_found' }
    if (audit.action !== 'mark') return { outcome: 'needs_review', reasonCode: 'not_a_mark' }
    if (!audit.before_value) return { outcome: 'needs_review', reasonCode: 'before_value_unavailable' }

    const { table, idColumn } = TABLE_BY_RECORD_TYPE[audit.record_type]

    const current = await client.query(`SELECT data_origin FROM ${table} WHERE ${idColumn} = $1 FOR UPDATE`, [
      audit.record_id,
    ])

    const row = current.rows[0] as { data_origin: string } | undefined

    if (!row) return { outcome: 'needs_review', reasonCode: 'audit_not_found' }

    if (row.data_origin !== audit.after_value) {
      return {
        outcome: 'needs_review',
        reasonCode: 'cas_mismatch',
        recordType: audit.record_type,
        recordId: audit.record_id,
      }
    }

    await client.query(`UPDATE ${table} SET data_origin = $1 WHERE ${idColumn} = $2`, [
      audit.before_value,
      audit.record_id,
    ])

    if (audit.record_type === 'identity_profile' || audit.record_type === 'hiring_opening') {
      const column = audit.record_type === 'identity_profile' ? 'identity_profile_id' : 'opening_id'

      await client.query(
        `UPDATE greenhouse_hiring.hiring_application SET data_origin = data_origin WHERE ${column} = $1`,
        [audit.record_id],
      )
    }

    await client.query(
      `INSERT INTO greenhouse_hiring.hiring_data_origin_audit
         (record_type, record_id, action, before_value, after_value, actor_user_id, reason)
       VALUES ($1, $2, 'rollback', $3, $4, $5, $6)`,
      [audit.record_type, audit.record_id, audit.after_value, audit.before_value, actorUserId, reason],
    )

    return {
      outcome: 'applied',
      recordType: audit.record_type,
      recordId: audit.record_id,
      restoredTo: audit.before_value as HiringDataOrigin,
    }
  })
}
