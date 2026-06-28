/**
 * TASK-1266 — Growth AI Visibility · Readiness scoring engine (Slice 2).
 *
 * Computa el `ReadinessScore { structural, agentic }` PURO + determinista desde los
 * `ProbeResult[]` persistidos. Espeja exactamente la honestidad del scorer de percepción
 * (computeGraderScore): una dimensión sin evidencia medible (probe no corrido / skipped /
 * failed / score null) → `status='empty'`, score null, EXCLUIDA del promedio ponderado del
 * eje (renormalizando pesos). NUNCA 0 cuando no se probó; el 0 medido (ej. sin JSON-LD) SÍ
 * cuenta. Los dos ejes NUNCA se fusionan entre sí ni con el score de percepción.
 */

import { type ProbeAxis, type ProbeKind, type ProbeResult } from '../probes/contracts'
import {
  AI_READINESS_SCORE_VERSION,
  readinessDimensionsForAxis,
  type ReadinessScoreVersion
} from './readiness-config'

export interface ReadinessDimensionScore {
  key: ProbeKind
  axis: ProbeAxis
  label: string
  weight: number
  /** 0..100 medido, o null (sin evidencia) → excluido del promedio del eje. */
  score: number | null
  status: 'ok' | 'empty'
  /** Razón renderizable (del probe, o por qué quedó sin medir). */
  reason: string | null
}

export interface AxisReadinessScore {
  axis: ProbeAxis
  /** Promedio ponderado de las dimensiones medidas del eje, o null si ninguna se midió. */
  overallScore: number | null
  dimensions: ReadinessDimensionScore[]
  coverage: {
    /** Dimensiones del eje con un probe ejecutado (cualquier status). */
    probed: number
    /** Dimensiones con score medible (entran al promedio). */
    measured: number
  }
}

export interface ReadinessScore {
  scoreVersion: ReadinessScoreVersion
  structural: AxisReadinessScore
  agentic: AxisReadinessScore
}

const round1 = (value: number): number => Math.round(value * 10) / 10

const buildAxis = (axis: ProbeAxis, byKind: Map<ProbeKind, ProbeResult>): AxisReadinessScore => {
  const dimensions: ReadinessDimensionScore[] = readinessDimensionsForAxis(axis).map(config => {
    const result = byKind.get(config.key)
    const measured = result != null && result.score != null

    return {
      key: config.key,
      axis: config.axis,
      label: config.label,
      weight: config.weight,
      score: measured ? result.score : null,
      status: measured ? 'ok' : 'empty',
      reason: result?.reason ?? 'Probe no ejecutado.'
    }
  })

  const scored = dimensions.filter((d): d is ReadinessDimensionScore & { score: number } => d.score !== null)
  const weightSum = scored.reduce((sum, d) => sum + d.weight, 0)

  const overallScore =
    weightSum === 0 ? null : round1(scored.reduce((sum, d) => sum + d.score * d.weight, 0) / weightSum)

  return {
    axis,
    overallScore,
    dimensions,
    coverage: {
      probed: dimensions.filter(d => byKind.has(d.key)).length,
      measured: scored.length
    }
  }
}

/** Computa el ReadinessScore de los dos ejes desde los probe results. PURO. */
export const computeReadinessScore = (probeResults: ProbeResult[]): ReadinessScore => {
  const byKind = new Map<ProbeKind, ProbeResult>()

  for (const result of probeResults) {
    byKind.set(result.probeKind, result)
  }

  return {
    scoreVersion: AI_READINESS_SCORE_VERSION,
    structural: buildAxis('structural', byKind),
    agentic: buildAxis('agentic', byKind)
  }
}
