import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  runIcoEngineQuery,
  getIcoEngineProjectId,
  CANONICAL_LATE_DROP_SQL,
  CANONICAL_OVERDUE_SQL,
  buildPeriodFilterSQL
} from '@/lib/ico-engine/shared'
import { ICO_DATASET } from '@/lib/ico-engine/schema'
import { computeMemberMetricsBatch } from '@/lib/ico-engine/read-metrics'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1169 — OTD imputable alineado a la cohorte member×month del bono.
 *
 * Produce el OTD corregido por freeze (M2) sobre la MISMA cohorte member×month
 * que usa el bono, en SHADOW. Ningún consumer productivo lo lee — el bono no
 * cambia (el cutover es TASK-1170).
 *
 * Diseño B′-PG (ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.10):
 *
 * - **Baseline legacy** = recompute LIVE del reader canónico del bono
 *   (`computeMemberMetricsBatch`). NO el `metrics_by_member` materializado crudo:
 *   un probe 2026-06-19 mostró que el materializado de períodos cerrados está
 *   stale (congelado al 19-may; completados-tarde posteriores no re-materializan)
 *   y el bono recomputa live cuando está stale. El cutover (TASK-1170)
 *   re-materializa con la lógica corregida, así que el baseline relevante es el
 *   live, consistente con la enumeración de candidatos (también live).
 * - **Candidatos mejorables** = de BQ `v_tasks_enriched` con la expresión
 *   canónica del bono (`CANONICAL_LATE_DROP_SQL` / `CANONICAL_OVERDUE_SQL`). El
 *   freeze mejora el OTD por DOS mecanismos:
 *     - numerador: `late_drop → on_time` (sube on_time).
 *     - denominador: `overdue → carry_over` (sale del denominador OTD).
 * - **Flips** = intersección de candidatos con el M2 shadow PG
 *   `task_attributable_lateness_shadow` (`bucket_no_freeze` → `bucket_attributable`).
 * - **Corregido** = `(on_time + numFlips) / (eligible − denomDrops)`.
 *
 * Harness auto-validante: `cohort_reproduced` exige que la enumeración de
 * candidatos reproduzca el legacy (late_drop + overdue) ANTES de confiar el
 * corregido. Si no reproduce → `cohort_mismatch` + `otd_pct_corrected = null`
 * (degradación honesta, NUNCA 0).
 */

export const OTD_ATTRIBUTABLE_MEMBER_MONTH_FORMULA_VERSION = 'otd_attributable_member_month_v1.0'

export type OtdAttributableMemberMonthDataStatus =
  | 'valid' // cohorte reproducida + cobertura de freeze completa → corregido confiable
  | 'cohort_mismatch' // candidatos ≠ legacy → corregido null
  | 'unavailable' // sin tareas elegibles (cohorte vacía) → ambos null
  | 'no_freeze_data' // cohorte ok pero cobertura de freeze incompleta → corregido = lower bound

export interface MemberMonthLegacyBaseline {
  memberId: string
  onTimeCount: number
  lateDropCount: number
  overdueCount: number
  otdPctLegacy: number | null
}

export interface MemberMonthCorrectionInput {
  memberId: string
  legacy: MemberMonthLegacyBaseline
  /** task_source_ids late_drop en la cohorte del bono (de v_tasks_enriched). */
  lateDropCandidateIds: readonly string[]
  /** task_source_ids overdue en la cohorte del bono (de v_tasks_enriched). */
  overdueCandidateIds: readonly string[]
  /** Subconjunto de candidatos con fila válida en el M2 shadow (cobertura). */
  freezeCoveredCandidateIds: readonly string[]
  /** late_drop que el freeze flipea a on_time (⊆ lateDropCandidateIds). */
  numeratorFlipIds: readonly string[]
  /** overdue que el freeze flipea a carry_over (⊆ overdueCandidateIds). */
  denominatorDropIds: readonly string[]
}

export interface MemberMonthOtdRow {
  memberId: string
  periodYear: number
  periodMonth: number
  otdPctLegacy: number | null
  onTimeCount: number
  lateDropCount: number
  overdueCount: number
  eligibleTaskCount: number
  otdPctCorrected: number | null
  numeratorFlipCount: number
  denominatorDropCount: number
  improvableCandidateCount: number
  freezeCoveredCount: number
  cohortReproduced: boolean
  dataStatus: OtdAttributableMemberMonthDataStatus
  formulaVersion: string
}

const roundOtd = (numerator: number, denominator: number): number =>
  denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0

/**
 * SSOT puro de la matemática del OTD corregido + degradación honesta. Sin IO,
 * determinístico, idempotente — testeable contra fixtures.
 */
export const buildMemberMonthOtdRow = (
  input: MemberMonthCorrectionInput,
  periodYear: number,
  periodMonth: number
): MemberMonthOtdRow => {
  const { legacy } = input
  const onTimeCount = legacy.onTimeCount
  const lateDropCount = legacy.lateDropCount
  const overdueCount = legacy.overdueCount
  const eligibleTaskCount = onTimeCount + lateDropCount + overdueCount

  const lateDropSet = new Set(input.lateDropCandidateIds)
  const overdueSet = new Set(input.overdueCandidateIds)
  const candidateSet = new Set([...lateDropSet, ...overdueSet])
  const improvableCandidateCount = candidateSet.size

  // Cobertura solo de candidatos reales; flips solo dentro de su mecanismo.
  const coveredSet = new Set(
    input.freezeCoveredCandidateIds.filter(id => candidateSet.has(id))
  )

  const freezeCoveredCount = coveredSet.size

  const numeratorFlipCount = input.numeratorFlipIds.filter(
    id => coveredSet.has(id) && lateDropSet.has(id)
  ).length

  const denominatorDropCount = input.denominatorDropIds.filter(
    id => coveredSet.has(id) && overdueSet.has(id)
  ).length

  const base = {
    memberId: input.memberId,
    periodYear,
    periodMonth,
    onTimeCount,
    lateDropCount,
    overdueCount,
    eligibleTaskCount,
    numeratorFlipCount,
    denominatorDropCount,
    improvableCandidateCount,
    freezeCoveredCount,
    formulaVersion: OTD_ATTRIBUTABLE_MEMBER_MONTH_FORMULA_VERSION
  }

  // Degradación honesta: cohorte vacía → null+null, NUNCA 0.
  if (eligibleTaskCount === 0) {
    return {
      ...base,
      otdPctLegacy: null,
      otdPctCorrected: null,
      cohortReproduced: false,
      dataStatus: 'unavailable'
    }
  }

  const otdPctLegacy = legacy.otdPctLegacy ?? roundOtd(onTimeCount, eligibleTaskCount)

  // Harness auto-validante: la enumeración de candidatos DEBE reproducir el
  // legacy (late_drop + overdue). Si no, mi extracción de cohorte está mal →
  // no confiar el corregido.
  const cohortReproduced =
    lateDropSet.size === lateDropCount && overdueSet.size === overdueCount

  if (!cohortReproduced) {
    return {
      ...base,
      otdPctLegacy,
      otdPctCorrected: null,
      cohortReproduced: false,
      dataStatus: 'cohort_mismatch'
    }
  }

  // Corregido: numerador sube por late_drop→on_time; denominador baja por
  // overdue→carry_over (carry_over no cuenta en el denominador OTD).
  const correctedOnTime = onTimeCount + numeratorFlipCount
  const correctedEligible = eligibleTaskCount - denominatorDropCount
  const otdPctCorrected = correctedEligible > 0 ? roundOtd(correctedOnTime, correctedEligible) : null

  // Cobertura de freeze incompleta → corregido es lower bound (algunos
  // candidatos no tienen dato de freeze). 0 candidatos = cobertura trivialmente
  // completa (no hay corrección posible → corregido == legacy).
  const fullFreezeCoverage = freezeCoveredCount === improvableCandidateCount

  return {
    ...base,
    otdPctLegacy,
    otdPctCorrected,
    cohortReproduced: true,
    dataStatus: fullFreezeCoverage ? 'valid' : 'no_freeze_data'
  }
}

// ─── IO: lectura de cohorte (BQ) + freeze (PG) + materialización (PG) ─────────

interface CandidateRow {
  member_id: string
  task_source_id: string
  bucket: 'late_drop' | 'overdue'
}

type ShadowFreezeRow = {
  task_source_id: string
  bucket_no_freeze: string
  bucket_attributable: string
  data_status: string
}

/**
 * Lista de miembros con cohorte en el período (distinct primary_owner_member_id
 * de v_tasks_enriched usando el mismo period filter que el bono).
 */
const readCohortMemberIds = async (
  periodYear: number,
  periodMonth: number
): Promise<string[]> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<{ member_id: string }>(
    `
      SELECT DISTINCT primary_owner_member_id AS member_id
      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE primary_owner_member_id IS NOT NULL AND primary_owner_member_id != ''
        AND (${buildPeriodFilterSQL()})
    `,
    { periodYear, periodMonth }
  )

  
return rows.map(r => r.member_id)
}

/**
 * Baselines legacy member×month computados LIVE con el reader canónico del bono
 * (`computeMemberMetricsBatch`, el mismo helper que su freshness fallback).
 */
const readLegacyBaselines = async (
  periodYear: number,
  periodMonth: number
): Promise<Map<string, MemberMonthLegacyBaseline>> => {
  const memberIds = await readCohortMemberIds(periodYear, periodMonth)
  const snapshots = await computeMemberMetricsBatch(memberIds, periodYear, periodMonth)

  const map = new Map<string, MemberMonthLegacyBaseline>()

  for (const [memberId, snapshot] of snapshots) {
    const otd = snapshot.metrics.find(metric => metric.metricId === 'otd_pct')?.value ?? null

    map.set(memberId, {
      memberId,
      onTimeCount: snapshot.context.onTimeTasks,
      lateDropCount: snapshot.context.lateDropTasks,
      overdueCount: snapshot.context.overdueTasks,
      otdPctLegacy: otd === null ? null : Number(otd)
    })
  }

  
return map
}

/**
 * Enumera los task_source_ids mejorables (late_drop + overdue) de la cohorte del
 * bono por miembro, usando la MISMA expresión canónica que el bono
 * (`CANONICAL_LATE_DROP_SQL` / `CANONICAL_OVERDUE_SQL` + `buildPeriodFilterSQL`).
 * Usar la expresión canónica (no un derived propio) garantiza que el conteo
 * reproduzca el legacy del bono — base del harness auto-validante. Solo
 * late_drop y overdue son candidatos: el freeze sube on_time (late_drop→on_time)
 * o saca del denominador (overdue→carry_over); on_time/carry_over no mejoran.
 */
const readImprovableCandidates = async (
  periodYear: number,
  periodMonth: number
): Promise<Map<string, { lateDrop: string[]; overdue: string[] }>> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<CandidateRow>(
    `
      SELECT primary_owner_member_id AS member_id, task_source_id,
        CASE WHEN ${CANONICAL_LATE_DROP_SQL} THEN 'late_drop' ELSE 'overdue' END AS bucket
      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE primary_owner_member_id IS NOT NULL AND primary_owner_member_id != ''
        AND task_source_id IS NOT NULL AND task_source_id != ''
        AND (${buildPeriodFilterSQL()})
        AND ((${CANONICAL_LATE_DROP_SQL}) OR (${CANONICAL_OVERDUE_SQL}))
    `,
    { periodYear, periodMonth }
  )

  const map = new Map<string, { lateDrop: string[]; overdue: string[] }>()

  for (const row of rows) {
    const entry = map.get(row.member_id) ?? { lateDrop: [], overdue: [] }

    if (row.bucket === 'late_drop') {
      entry.lateDrop.push(row.task_source_id)
    } else {
      entry.overdue.push(row.task_source_id)
    }

    map.set(row.member_id, entry)
  }

  
return map
}

/**
 * Para un conjunto de task_source_ids candidatos, lee su corrección de freeze
 * desde el M2 shadow PG. Devuelve covered (fila válida) + numeratorFlips
 * (late_drop → on_time) + denominatorDrops (overdue → carry_over).
 */
const readFreezeForCandidates = async (
  candidateIds: readonly string[]
): Promise<{ covered: Set<string>; numeratorFlips: Set<string>; denominatorDrops: Set<string> }> => {
  const covered = new Set<string>()
  const numeratorFlips = new Set<string>()
  const denominatorDrops = new Set<string>()

  if (candidateIds.length === 0) {
    return { covered, numeratorFlips, denominatorDrops }
  }

  const rows = await runGreenhousePostgresQuery<ShadowFreezeRow>(
    `
      SELECT task_source_id, bucket_no_freeze, bucket_attributable, data_status
      FROM greenhouse_delivery.task_attributable_lateness_shadow
      WHERE task_source_id = ANY($1::text[])
    `,
    [Array.from(new Set(candidateIds))]
  )

  for (const row of rows) {
    if (row.data_status !== 'valid') {
      continue
    }

    covered.add(row.task_source_id)

    if (row.bucket_no_freeze === 'late_drop' && row.bucket_attributable === 'on_time') {
      numeratorFlips.add(row.task_source_id)
    } else if (row.bucket_no_freeze === 'overdue' && row.bucket_attributable === 'carry_over') {
      denominatorDrops.add(row.task_source_id)
    }
  }

  
return { covered, numeratorFlips, denominatorDrops }
}

/** Miembros demo a excluir (defense in depth — el bono también los filtra). */
const readDemoMemberIds = async (memberIds: readonly string[]): Promise<Set<string>> => {
  if (memberIds.length === 0) {
    return new Set()
  }

  const rows = await runGreenhousePostgresQuery<{ member_id: string }>(
    `SELECT member_id FROM greenhouse_core.members
     WHERE member_id = ANY($1::text[]) AND is_demo = TRUE`,
    [Array.from(new Set(memberIds))]
  )

  
return new Set(rows.map(r => r.member_id))
}

/**
 * Construye las filas member×month corregidas para un período, leyendo cohorte
 * de BQ + freeze de PG. NO escribe — read-only (reusado por reconciliación +
 * materializer). Excluye demo members.
 */
export const computeOtdAttributableMemberMonth = async (
  periodYear: number,
  periodMonth: number
): Promise<MemberMonthOtdRow[]> => {
  const [legacyByMember, candidatesByMember] = await Promise.all([
    readLegacyBaselines(periodYear, periodMonth),
    readImprovableCandidates(periodYear, periodMonth)
  ])

  const demoIds = await readDemoMemberIds(Array.from(legacyByMember.keys()))

  // Cobertura de freeze: un solo round-trip PG para todos los candidatos.
  const allCandidateIds = Array.from(candidatesByMember.values()).flatMap(c => [
    ...c.lateDrop,
    ...c.overdue
  ])

  const { covered, numeratorFlips, denominatorDrops } = await readFreezeForCandidates(allCandidateIds)

  const rows: MemberMonthOtdRow[] = []

  for (const [memberId, legacy] of legacyByMember) {
    if (demoIds.has(memberId)) {
      continue
    }

    const candidates = candidatesByMember.get(memberId) ?? { lateDrop: [], overdue: [] }
    const allMemberCandidates = [...candidates.lateDrop, ...candidates.overdue]

    rows.push(
      buildMemberMonthOtdRow(
        {
          memberId,
          legacy,
          lateDropCandidateIds: candidates.lateDrop,
          overdueCandidateIds: candidates.overdue,
          freezeCoveredCandidateIds: allMemberCandidates.filter(id => covered.has(id)),
          numeratorFlipIds: candidates.lateDrop.filter(id => numeratorFlips.has(id)),
          denominatorDropIds: candidates.overdue.filter(id => denominatorDrops.has(id))
        },
        periodYear,
        periodMonth
      )
    )
  }

  
return rows
}

/**
 * Materializa (UPSERT idempotente, last-compute-wins) el OTD corregido
 * member×month a la tabla shadow. SHADOW — ningún consumer productivo lee esto.
 */
export const materializeOtdAttributableMemberMonth = async (
  periodYear: number,
  periodMonth: number
): Promise<{ written: number; rows: MemberMonthOtdRow[] }> => {
  try {
    const rows = await computeOtdAttributableMemberMonth(periodYear, periodMonth)

    for (const row of rows) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_delivery.otd_attributable_member_month_shadow (
            member_id, period_year, period_month,
            otd_pct_legacy, on_time_count, late_drop_count, overdue_count, eligible_task_count,
            otd_pct_corrected, numerator_flip_count, denominator_drop_count,
            improvable_candidate_count, freeze_covered_count,
            cohort_reproduced, data_status, formula_version, computed_at
          ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7, $8,
            $9, $10, $11,
            $12, $13,
            $14, $15, $16, NOW()
          )
          ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
            otd_pct_legacy = EXCLUDED.otd_pct_legacy,
            on_time_count = EXCLUDED.on_time_count,
            late_drop_count = EXCLUDED.late_drop_count,
            overdue_count = EXCLUDED.overdue_count,
            eligible_task_count = EXCLUDED.eligible_task_count,
            otd_pct_corrected = EXCLUDED.otd_pct_corrected,
            numerator_flip_count = EXCLUDED.numerator_flip_count,
            denominator_drop_count = EXCLUDED.denominator_drop_count,
            improvable_candidate_count = EXCLUDED.improvable_candidate_count,
            freeze_covered_count = EXCLUDED.freeze_covered_count,
            cohort_reproduced = EXCLUDED.cohort_reproduced,
            data_status = EXCLUDED.data_status,
            formula_version = EXCLUDED.formula_version,
            computed_at = NOW()
        `,
        [
          row.memberId,
          row.periodYear,
          row.periodMonth,
          row.otdPctLegacy,
          row.onTimeCount,
          row.lateDropCount,
          row.overdueCount,
          row.eligibleTaskCount,
          row.otdPctCorrected,
          row.numeratorFlipCount,
          row.denominatorDropCount,
          row.improvableCandidateCount,
          row.freezeCoveredCount,
          row.cohortReproduced,
          row.dataStatus,
          row.formulaVersion
        ]
      )
    }

    
return { written: rows.length, rows }
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'otd_attributable_member_month_materialize' },
      extra: { periodYear, periodMonth }
    })
    throw error
  }
}
