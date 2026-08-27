/**
 * TASK-1776 — Writer canónico del hecho de visibilidad por sujeto-página
 * (`seo_url_visibility_snapshots`). La ÚNICA forma de escribir la tabla.
 *
 * Tres productores lo comparten: la captura directa (`ranked_keywords`, cualquier clase de
 * sujeto), `relevant_pages` (cada página → fila `url`) y `subdomains` (cada subdominio →
 * fila `subdomain`).
 *
 * Contrato del hecho (mismo que domain-overview / keyword-market-data):
 * - append-only con `ON CONFLICT ... DO NOTHING` (trigger anti UPDATE/DELETE);
 * - fila con NULLs = "preguntamos y el proveedor no conoce el sujeto" (sin ella se re-compra
 *   para siempre);
 * - costo del batch atribuido a la PRIMERA fila; el presupuesto vive en el ledger del
 *   transporte;
 * - `captured_by_organization_id` es atribución, NUNCA tenant, y NUNCA sale en un DTO.
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { VisibilitySubjectKind } from './resolve-subject'

/** Ventana de frescura: las bases Labs se refrescan por ciclo ~mensual (mismo contrato 1775). */
export const URL_VISIBILITY_FRESHNESS_DAYS = 30

/** Endpoints autorizados a escribir esta tabla (espeja el CHECK de la migración). */
export type SeoUrlVisibilitySourceEndpoint = 'ranked_keywords' | 'relevant_pages' | 'subdomains'

/** Detalle top-N comprado de una corrida `ranked_keywords` (evidencia, no almacén de mercado). */
export interface SeoUrlVisibilityTopKeyword {
  keyword: string
  position: number | null
  url: string | null
  searchVolume: number | null
  etv: number | null
}

export interface SeoUrlVisibilitySnapshotInput {
  subjectKind: VisibilitySubjectKind
  normalizedSubject: string
  rawSubject: string
  locationCode: string
  languageCode: string
  sourceEndpoint: SeoUrlVisibilitySourceEndpoint
  organic: {
    positions: {
      pos1: number | null
      pos2_3: number | null
      pos4_10: number | null
      pos11_20: number | null
      pos21_30: number | null
      pos31_40: number | null
      pos41_50: number | null
      pos51_60: number | null
      pos61_70: number | null
      pos71_80: number | null
      pos81_90: number | null
      pos91_100: number | null
    }
    count: number | null
    etv: number | null
    estimatedPaidTrafficCostUsd: number | null
    isNew: number | null
    isUp: number | null
    isDown: number | null
    isLost: number | null
  }
  paid: { count: number | null; etv: number | null }
  totalRankedKeywords: number | null
  topKeywords: SeoUrlVisibilityTopKeyword[] | null
}

export const buildNullVisibilitySnapshot = (input: {
  subjectKind: VisibilitySubjectKind
  normalizedSubject: string
  rawSubject: string
  locationCode: string
  languageCode: string
  sourceEndpoint: SeoUrlVisibilitySourceEndpoint
}): SeoUrlVisibilitySnapshotInput => ({
  ...input,
  organic: {
    positions: {
      pos1: null,
      pos2_3: null,
      pos4_10: null,
      pos11_20: null,
      pos21_30: null,
      pos31_40: null,
      pos41_50: null,
      pos51_60: null,
      pos61_70: null,
      pos71_80: null,
      pos81_90: null,
      pos91_100: null
    },
    count: null,
    etv: null,
    estimatedPaidTrafficCostUsd: null,
    isNew: null,
    isUp: null,
    isDown: null,
    isLost: null
  },
  paid: { count: null, etv: null },
  totalRankedKeywords: null,
  topKeywords: null
})

export const persistUrlVisibilitySnapshots = async (input: {
  snapshots: readonly SeoUrlVisibilitySnapshotInput[]
  capturedByOrganizationId: string
  providerCostUsd: number
}): Promise<{ rowsWritten: number }> => {
  let rowsWritten = 0

  for (const snapshot of input.snapshots) {
    const rowCost = rowsWritten === 0 ? input.providerCostUsd : 0
    const positions = snapshot.organic.positions

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_growth.seo_url_visibility_snapshots
         (subject_kind, normalized_subject, raw_subject, location_code, language_code,
          capture_date, source_endpoint,
          organic_pos_1, organic_pos_2_3, organic_pos_4_10, organic_pos_11_20, organic_pos_21_30,
          organic_pos_31_40, organic_pos_41_50, organic_pos_51_60, organic_pos_61_70,
          organic_pos_71_80, organic_pos_81_90, organic_pos_91_100,
          organic_count, organic_etv, organic_estimated_paid_traffic_cost,
          organic_is_new, organic_is_up, organic_is_down, organic_is_lost,
          paid_count, paid_etv, total_ranked_keywords, top_keywords,
          captured_by_organization_id, provider_cost)
       VALUES ($1, $2, $3, $4, $5,
               CURRENT_DATE, $6,
               $7, $8, $9, $10, $11,
               $12, $13, $14, $15,
               $16, $17, $18,
               $19, $20, $21,
               $22, $23, $24, $25,
               $26, $27, $28, $29,
               $30, $31)
       ON CONFLICT ON CONSTRAINT seo_url_visibility_capture_unique DO NOTHING`,
      [
        snapshot.subjectKind,
        snapshot.normalizedSubject,
        snapshot.rawSubject,
        snapshot.locationCode,
        snapshot.languageCode,
        snapshot.sourceEndpoint,
        positions.pos1,
        positions.pos2_3,
        positions.pos4_10,
        positions.pos11_20,
        positions.pos21_30,
        positions.pos31_40,
        positions.pos41_50,
        positions.pos51_60,
        positions.pos61_70,
        positions.pos71_80,
        positions.pos81_90,
        positions.pos91_100,
        snapshot.organic.count,
        snapshot.organic.etv,
        snapshot.organic.estimatedPaidTrafficCostUsd,
        snapshot.organic.isNew,
        snapshot.organic.isUp,
        snapshot.organic.isDown,
        snapshot.organic.isLost,
        snapshot.paid.count,
        snapshot.paid.etv,
        snapshot.totalRankedKeywords,
        snapshot.topKeywords ? JSON.stringify(snapshot.topKeywords) : null,
        input.capturedByOrganizationId,
        rowCost
      ]
    )

    rowsWritten += 1
  }

  return { rowsWritten }
}

/**
 * Sujetos con snapshot DENTRO de la ventana de frescura para un mercado, acotado por
 * `sourceEndpoints`: la captura directa exige una fila de `ranked_keywords` (una fila de
 * `relevant_pages`, sin detalle de keywords, no la sustituye); los colectores de páginas y
 * subdominios usan la suya propia.
 *
 * ⚠️ `capture_date` es DATE: la resta con CURRENT_DATE da integer (gate TASK-893).
 */
export const loadFreshVisibilitySubjects = async (input: {
  subjects: ReadonlyArray<{ kind: VisibilitySubjectKind; normalized: string }>
  locationCode: string
  languageCode: string
  sourceEndpoints: readonly SeoUrlVisibilitySourceEndpoint[]
}): Promise<Set<string>> => {
  if (input.subjects.length === 0) return new Set()

  const rows = await runGreenhousePostgresQuery<{ subject_kind: string; normalized_subject: string }>(
    `SELECT DISTINCT subject_kind, normalized_subject
       FROM greenhouse_growth.seo_url_visibility_snapshots
      WHERE (subject_kind, normalized_subject) IN (
              SELECT k, s FROM unnest($1::text[], $2::text[]) AS pairs(k, s)
            )
        AND location_code = $3
        AND language_code = $4
        AND source_endpoint = ANY($5::text[])
        AND (CURRENT_DATE - capture_date) < $6`,
    [
      input.subjects.map(subject => subject.kind),
      input.subjects.map(subject => subject.normalized),
      input.locationCode,
      input.languageCode,
      [...input.sourceEndpoints],
      URL_VISIBILITY_FRESHNESS_DAYS
    ]
  )

  return new Set(rows.map(row => `${row.subject_kind}:${row.normalized_subject}`))
}

/** Clave compuesta del pre-check (kind + sujeto normalizado). */
export const visibilityFreshnessKey = (kind: VisibilitySubjectKind, normalized: string): string =>
  `${kind}:${normalized}`
