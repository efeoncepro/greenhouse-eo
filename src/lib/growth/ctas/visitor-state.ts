/**
 * TASK-1428 — Growth CTA engine: visitor state store (arch §11).
 *
 * Estado pseudónimo por sujeto (`visitor` durable consent-gated | `session` fallback
 * conservador) sobre `greenhouse_growth.cta_visitor_state`. Solo hashes (el caller ya
 * pasó por `ctaIdentifierHash`); identificadores crudos JAMÁS llegan acá.
 *
 * Semántica de claves:
 *  - (subject, cta_id) → estado per-CTA: dismiss cooldown, conversión, ventana per-CTA.
 *  - (subject, cta_id IS NULL) → ventana GLOBAL interruptiva del sujeto (cap cross-CTA).
 *
 * Retención (task §Backend/Data Contract): filas `session` expiran a las 48h; filas
 * `visitor` a los 180 días. La purga es OPORTUNISTA (best-effort en el write path,
 * batches acotados) — sin cron nuevo ni runtime adicional; si el volumen la supera,
 * el follow-up es un job Cloud Scheduler (patrón TASK-773).
 */
import 'server-only'

import { query, withTransaction } from '@/lib/db'

import type { CtaVisitorContext, CtaVisitorSubjectKind } from './contracts'
import { ctaIdentifierHash } from './hash'
import type { CtaGlobalWindowSnapshot, CtaSuppressionStateSnapshot } from './suppression'

export interface CtaVisitorSubjectRef {
  kind: CtaVisitorSubjectKind
  hash: string
}

/**
 * Sujetos del visitor state según consent (arch §16.2): la key `visitor` solo habilita
 * state DURABLE con consent granted; `session` es el fallback conservador siempre que
 * exista. Las keys crudas se hashean acá y jamás se persisten.
 */
export const resolveVisitorSubjects = (context: CtaVisitorContext | undefined): CtaVisitorSubjectRef[] => {
  if (!context) return []

  const subjects: CtaVisitorSubjectRef[] = []

  if (context.consentState === 'granted') {
    const visitorHash = ctaIdentifierHash(context.visitorKey)

    if (visitorHash) subjects.push({ kind: 'visitor', hash: visitorHash })
  }

  const sessionHash = ctaIdentifierHash(context.sessionKey)

  if (sessionHash) subjects.push({ kind: 'session', hash: sessionHash })

  return subjects
}

export type CtaVisitorStateRow = {
  state_id: string
  subject_kind: string
  subject_hash: string
  cta_id: string | null
  last_dismissed_at: Date | null
  dismiss_count: number
  converted_at: Date | null
  conversion_ref: string | null
  window_started_at: Date | null
  impressions_in_window: number
  last_impression_at: Date | null
  consent_state: string | null
  created_at: Date
  updated_at: Date
}

/** Retención explícita por kind (días). Documentada en el manual del motor. */
export const CTA_VISITOR_STATE_RETENTION_DAYS: Record<CtaVisitorSubjectKind, number> = {
  visitor: 180,
  session: 2,
}

/** 1 de cada N writes dispara la purga oportunista (best-effort, batch acotado). */
const OPPORTUNISTIC_PURGE_MODULO = 32
const PURGE_BATCH_LIMIT = 500

let writeCounter = 0

/**
 * Snapshot de estado para el arbiter: TODAS las filas de los sujetos presentes que
 * tocan los candidatos (o la ventana global) en UN round-trip.
 */
export const getVisitorStateRows = async (
  subjects: CtaVisitorSubjectRef[],
  ctaIds: string[],
): Promise<CtaVisitorStateRow[]> => {
  if (subjects.length === 0) return []

  const kinds = subjects.map(subject => subject.kind)
  const hashes = subjects.map(subject => subject.hash)

  const rows = await query<CtaVisitorStateRow>(
    `SELECT s.*
       FROM greenhouse_growth.cta_visitor_state s
       JOIN UNNEST($1::text[], $2::text[]) AS subject(kind, hash)
         ON s.subject_kind = subject.kind AND s.subject_hash = subject.hash
      WHERE s.cta_id IS NULL OR s.cta_id = ANY($3::text[])`,
    [kinds, hashes, ctaIds],
  )

  return rows
}

/**
 * Merge cross-subject del estado per-CTA: toma la evidencia MÁS restrictiva entre
 * las filas visitor/session (dismiss más reciente, conversión presente, ventana con
 * más impresiones) — dos tabs o un downgrade de consent no relajan la ventana.
 */
export const mergeStateSnapshots = (rows: CtaVisitorStateRow[]): CtaSuppressionStateSnapshot | null => {
  if (rows.length === 0) return null

  const merged: CtaSuppressionStateSnapshot = {
    lastDismissedAt: null,
    convertedAt: null,
    windowStartedAt: null,
    impressionsInWindow: 0,
  }

  for (const row of rows) {
    if (row.last_dismissed_at && (!merged.lastDismissedAt || row.last_dismissed_at > merged.lastDismissedAt)) {
      merged.lastDismissedAt = row.last_dismissed_at
    }

    if (row.converted_at && (!merged.convertedAt || row.converted_at < merged.convertedAt)) {
      merged.convertedAt = row.converted_at
    }

    if (row.impressions_in_window > merged.impressionsInWindow) {
      merged.impressionsInWindow = row.impressions_in_window
      merged.windowStartedAt = row.window_started_at
    }
  }

  return merged
}

export const mergeGlobalWindows = (rows: CtaVisitorStateRow[]): CtaGlobalWindowSnapshot | null => {
  const globals = rows.filter(row => row.cta_id === null)

  if (globals.length === 0) return null

  const top = globals.reduce((max, row) =>
    row.impressions_in_window > max.impressions_in_window ? row : max,
  )

  return { windowStartedAt: top.window_started_at, impressionsInWindow: top.impressions_in_window }
}

/**
 * Persiste el dismiss ANTES de cualquier salida visual (lo llama el ingest al aceptar
 * el evento `dismissed`): upsert idempotente por sujeto — un refresh/remount/multi-tab
 * no reinicia ni duplica la ventana (el cooldown se computa desde el último dismiss).
 */
export const recordCtaDismissal = async (
  subjects: CtaVisitorSubjectRef[],
  ctaId: string,
  consentState: string,
): Promise<void> => {
  for (const subject of subjects) {
    await query(
      `INSERT INTO greenhouse_growth.cta_visitor_state
         (subject_kind, subject_hash, cta_id, last_dismissed_at, dismiss_count, consent_state)
       VALUES ($1, $2, $3, NOW(), 1, $4)
       ON CONFLICT (subject_kind, subject_hash, cta_id)
       DO UPDATE SET
         last_dismissed_at = NOW(),
         dismiss_count = greenhouse_growth.cta_visitor_state.dismiss_count + 1,
         consent_state = EXCLUDED.consent_state`,
      [subject.kind, subject.hash, ctaId, consentState],
    )
  }

  void opportunisticPurge()
}

/**
 * Marca conversión VERIFICADA server-side (el caller ya validó el submission contra
 * Growth Forms — nunca por claim browser). `converted_at` conserva la primera evidencia.
 */
export const recordCtaConversion = async (
  subjects: CtaVisitorSubjectRef[],
  ctaId: string,
  conversionRef: string,
  consentState: string,
): Promise<void> => {
  for (const subject of subjects) {
    await query(
      `INSERT INTO greenhouse_growth.cta_visitor_state
         (subject_kind, subject_hash, cta_id, converted_at, conversion_ref, consent_state)
       VALUES ($1, $2, $3, NOW(), $4, $5)
       ON CONFLICT (subject_kind, subject_hash, cta_id)
       DO UPDATE SET
         converted_at = COALESCE(greenhouse_growth.cta_visitor_state.converted_at, NOW()),
         conversion_ref = COALESCE(greenhouse_growth.cta_visitor_state.conversion_ref, EXCLUDED.conversion_ref),
         consent_state = EXCLUDED.consent_state`,
      [subject.kind, subject.hash, ctaId, conversionRef, consentState],
    )
  }
}

export interface ClaimImpressionInput {
  subject: CtaVisitorSubjectRef
  ctaId: string
  windowHours: number
  maxImpressionsPerWindow: number
  globalCapPerDay: number
  consentState: string
}

/**
 * Claim ATÓMICO de una exposición interruptiva (solo enforcement ON): serializa por
 * fila con SELECT ... FOR UPDATE — de N tabs/renders concurrentes, exactamente uno
 * obtiene el prompt (task §Frequency and re-entry semantics). Si la ventana per-CTA
 * o la global ya están llenas, el claim NO gana y NADA se incrementa (un intento
 * perdido jamás consume presupuesto de exposición futuro).
 */
export const claimInterruptiveImpression = async (input: ClaimImpressionInput): Promise<{ granted: boolean }> =>
  withTransaction(async client => {
    const { subject } = input

    // Asegura ambas filas (per-CTA + global) sin pisar estado existente.
    await client.query(
      `INSERT INTO greenhouse_growth.cta_visitor_state (subject_kind, subject_hash, cta_id, consent_state)
       VALUES ($1, $2, $3, $4), ($1, $2, NULL, $4)
       ON CONFLICT (subject_kind, subject_hash, cta_id) DO NOTHING`,
      [subject.kind, subject.hash, input.ctaId, input.consentState],
    )

    const locked = await client.query<CtaVisitorStateRow>(
      `SELECT * FROM greenhouse_growth.cta_visitor_state
        WHERE subject_kind = $1 AND subject_hash = $2
          AND (cta_id = $3 OR cta_id IS NULL)
        ORDER BY cta_id NULLS LAST
        FOR UPDATE`,
      [subject.kind, subject.hash, input.ctaId],
    )

    const perCta = locked.rows.find(row => row.cta_id === input.ctaId)
    const global = locked.rows.find(row => row.cta_id === null)

    if (!perCta || !global) return { granted: false }

    const now = Date.now()

    const perCtaWindowLive =
      perCta.window_started_at !== null &&
      now - perCta.window_started_at.getTime() < input.windowHours * 3_600_000

    const globalWindowLive =
      global.window_started_at !== null && now - global.window_started_at.getTime() < 86_400_000

    const perCtaCount = perCtaWindowLive ? perCta.impressions_in_window : 0
    const globalCount = globalWindowLive ? global.impressions_in_window : 0

    if (perCtaCount >= input.maxImpressionsPerWindow || globalCount >= input.globalCapPerDay) {
      return { granted: false }
    }

    await client.query(
      `UPDATE greenhouse_growth.cta_visitor_state
          SET window_started_at = CASE WHEN $2::boolean THEN window_started_at ELSE NOW() END,
              impressions_in_window = CASE WHEN $2::boolean THEN impressions_in_window + 1 ELSE 1 END,
              last_impression_at = NOW()
        WHERE state_id = $1`,
      [perCta.state_id, perCtaWindowLive],
    )

    await client.query(
      `UPDATE greenhouse_growth.cta_visitor_state
          SET window_started_at = CASE WHEN $2::boolean THEN window_started_at ELSE NOW() END,
              impressions_in_window = CASE WHEN $2::boolean THEN impressions_in_window + 1 ELSE 1 END,
              last_impression_at = NOW()
        WHERE state_id = $1`,
      [global.state_id, globalWindowLive],
    )

    return { granted: true }
  })

/**
 * Purga oportunista por retención (best-effort; jamás rompe el write path). Corre
 * 1 de cada N writes, batch acotado por kind.
 */
export const opportunisticPurge = async (): Promise<void> => {
  writeCounter += 1

  if (writeCounter % OPPORTUNISTIC_PURGE_MODULO !== 0) return

  try {
    for (const kind of ['visitor', 'session'] as const) {
      await query(
        `DELETE FROM greenhouse_growth.cta_visitor_state
          WHERE state_id IN (
            SELECT state_id FROM greenhouse_growth.cta_visitor_state
             WHERE subject_kind = $1 AND updated_at < NOW() - ($2 || ' days')::interval
             LIMIT ${PURGE_BATCH_LIMIT}
          )`,
        [kind, String(CTA_VISITOR_STATE_RETENTION_DAYS[kind])],
      )
    }
  } catch {
    // Best-effort: la purga nunca rompe un write de estado; el retention drift es
    // observable por tamaño de tabla (pg_doctor / follow-up job si el volumen crece).
  }
}

/** Test-only: resetea el contador de purga oportunista. */
export const __resetVisitorStatePurgeCounterForTests = (): void => {
  writeCounter = 0
}
