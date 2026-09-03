/**
 * TASK-1806 Slice 2 — Render PURO del artefacto de decisión en Markdown (sin IO, sin `server-only`).
 *
 * Es la cara legible de `EtvShadowEvaluationResult`: por celda, no sólo promedio; declara comparabilidad,
 * ventana GSC, normalización mensual, límites y la regla de oro (GSC se compara, nunca se promedia).
 * NUNCA imprime payloads crudos, tokens, secretos ni PII: sólo dominios de la cohorte, cifras y códigos.
 */

import type { EtvMethodologyVersion } from './contracts'
import type { EtvShadowCellEvaluation, EtvShadowDecision, EtvShadowFinding, EtvShadowThresholds } from './shadow-decision'
import { assessEtvShadowHistory } from './shadow-decision'

export type EtvShadowLatencySummary = {
  requests: number
  meanMs: number | null
  maxMs: number | null
  byMethodology: Record<EtvMethodologyVersion, { requests: number; meanMs: number | null; maxMs: number | null }>
}

export type EtvShadowEvaluationResult = {
  cohortId: string
  runId: string | null
  captureDate: string
  evaluationDate: string
  mode: 'exact_ab' | 'temporal_canary'
  thresholds: EtvShadowThresholds
  cells: EtvShadowCellEvaluation[]
  decision: EtvShadowDecision
  /** Todas las celdas con `summary.json` comparten hash de inputs y `requested = providerEffective`. */
  inputsEquivalent: boolean
  cost: { forecastUsd: number; realUsd: number }
  latency: EtvShadowLatencySummary
  /** Declaraciones de método que el artefacto debe llevar sí o sí. */
  declarations: string[]
}

const n = (value: number | null | undefined): string => (value === null || value === undefined ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: 2 }))

const p = (value: number | null | undefined): string => (value === null || value === undefined ? 'n/d' : `${(value * 100).toFixed(1)} %`)

const severityLabel: Record<EtvShadowFinding['severity'], string> = { blocking: 'BLOQUEANTE', warning: 'aviso', info: 'info' }

const decisionLabel: Record<EtvShadowDecision['decision'], string> = {
  go_rebaseline: 'go + rebaseline',
  go_breakpoint: 'go + breakpoint',
  hold: 'hold',
  no_go: 'no-go'
}

const gscCell = (evaluation: EtvShadowCellEvaluation): string => {
  const gsc = evaluation.gsc

  if (!gsc) return '—'
  if (gsc.status === 'not_applicable') return `n/a (${gsc.reason})`
  if (gsc.status === 'not_comparable') return `no comparable (${gsc.reason})`

  return `${n(gsc.monthlyClicks)} clics/mes · más cerca: ${gsc.calibration.closer ?? 'n/d'}`
}

export const renderEtvShadowReportMarkdown = (result: EtvShadowEvaluationResult): string => {
  const lines: string[] = []
  const t = result.thresholds
  const validCells = result.cells.filter(cell => cell.validity.valid).length

  lines.push(`# Shadow legacy/improved ETV — resultados y decisión (${result.captureDate} · cohorte ${result.cohortId})`)
  lines.push('')
  lines.push(`- Task: \`TASK-1806\` Slice 2 · preregistro: \`${t.preregistration}\``)
  lines.push(`- Fecha de captura: ${result.captureDate} · fecha de evaluación: ${result.evaluationDate} · run: ${result.runId ?? 'sin summary.json'}`)
  lines.push(`- Modo declarado: \`${result.mode}\` (${result.mode === 'exact_ab' ? 'dos requests por celda, inputs idénticos salvo la fórmula' : 'comparación temporal, NO paridad simultánea'})`)
  lines.push(`- Celdas: ${result.cells.length} (${validCells} válidas para calibración) · inputs equivalentes en todas: ${result.inputsEquivalent ? 'sí' : 'no'}`)
  lines.push(`- Costo: forecast USD ${result.cost.forecastUsd.toFixed(4)} · real USD ${result.cost.realUsd.toFixed(4)}`)
  lines.push('')
  lines.push(`## Decisión: **${decisionLabel[result.decision.decision]}** · tratamiento histórico: ${result.decision.historicalTreatment ?? 'ninguno (sin cutover voluntario)'}`)
  lines.push('')

  for (const line of result.decision.rationale) lines.push(`- ${line}`)

  lines.push('')
  lines.push('> Esta decisión NO autoriza cutover: la aprobación del tratamiento histórico y del cutover son actos separados del operador (preregistro §7).')
  lines.push('')
  lines.push('## Declaraciones de método')
  lines.push('')

  for (const declaration of result.declarations) lines.push(`- ${declaration}`)

  lines.push('')
  lines.push('## Hallazgos')
  lines.push('')

  if (result.decision.findings.length === 0) {
    lines.push('- Sin hallazgos.')
  } else {
    for (const finding of result.decision.findings) {
      lines.push(`- [${severityLabel[finding.severity]}] \`${finding.code}\`${finding.cell !== undefined ? ` · celda ${finding.cell}` : ''} — ${finding.detail}`)
    }
  }

  lines.push('')
  lines.push('## Por celda (intra-DataForSEO; comparación, nunca promedio)')
  lines.push('')
  lines.push('| # | Sujeto | Familia | Rol | Válida | ETV org. legacy → improved | Δ rel. | organic.count legacy → improved | Δ rel. | Traffic cost Δ rel. | Jaccard top-N | GSC |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|')

  for (const cell of result.cells) {
    const c = cell.comparison

    lines.push(
      `| ${cell.cellIndex} | ${cell.subject} | ${cell.familySlug}${cell.purpose === 'prospect' ? ' (prospecto)' : ''}${cell.period ? ` ${cell.period.fromMonth}..${cell.period.toMonth}` : ''} | ${cell.role} | ${
        cell.validity.valid ? 'sí' : `no (${cell.validity.reasons.join(', ')})`
      } | ${n(c?.organicEtv.legacy)} → ${n(c?.organicEtv.improved)} | ${p(c?.organicEtv.relative)} | ${n(c?.organicCount.legacy)} → ${n(c?.organicCount.improved)} | ${p(
        c?.organicCount.relative
      )} | ${p(c?.organicEstimatedTrafficCostUsd.relative)} | ${c?.membership.jaccard === null || c?.membership.jaccard === undefined ? 'n/d' : c.membership.jaccard.toFixed(3)} | ${gscCell(cell)} |`
    )
  }

  const calibrated = result.cells.filter(cell => cell.gsc?.status === 'comparable')

  lines.push('')
  lines.push('## Calibración contra GSC (§5.1) — benchmark first-party, se compara, NO se promedia')
  lines.push('')

  if (calibrated.length === 0) {
    lines.push('- Ninguna celda con benchmark GSC comparable.')
  } else {
    lines.push('| # | Sujeto | Familia | Propiedad | Ventana | Clics ventana | Clics/mes (×30/28) | Legacy err. abs / rel / dir | Improved err. abs / rel / dir | Más cerca |')
    lines.push('|---|---|---|---|---|---|---|---|---|---|')

    for (const cell of calibrated) {
      if (cell.gsc?.status !== 'comparable') continue

      const g = cell.gsc
      const cal = g.calibration

      lines.push(
        `| ${cell.cellIndex} | ${cell.subject} | ${cell.familySlug} | ${g.siteUrl} | ${g.window.startDate}..${g.window.endDate} (${g.window.days} d, país ${g.window.country}) | ${n(g.windowClicks)} | ${n(
          g.monthlyClicks
        )} | ${n(cal.legacy.absoluteError)} / ${p(cal.legacy.relativeError)} / ${cal.legacy.direction ?? 'n/d'} | ${n(cal.improved.absoluteError)} / ${p(cal.improved.relativeError)} / ${
          cal.improved.direction ?? 'n/d'
        } | ${cal.closer ?? 'n/d'} |`
      )
    }
  }

  const membership = result.cells.filter(cell => (cell.familySlug === 'relevant_pages' || cell.familySlug === 'subdomains') && cell.comparison)

  lines.push('')
  lines.push('## Estabilidad de membresía top-N (§5.2)')
  lines.push('')

  if (membership.length === 0) {
    lines.push('- Sin celdas de membresía.')
  } else {
    lines.push('| # | Sujeto | Familia | Jaccard | Compartidos | Entradas (improved) | Salidas (legacy) | Cambios de rango |')
    lines.push('|---|---|---|---|---|---|---|---|')

    for (const cell of membership) {
      const m = cell.comparison?.membership

      if (!m) continue

      lines.push(
        `| ${cell.cellIndex} | ${cell.subject} | ${cell.familySlug} | ${m.jaccard === null ? 'n/d' : m.jaccard.toFixed(3)} | ${m.shared} | ${m.entries.length}${m.entries.length ? `: ${m.entries.slice(0, 5).join(', ')}${m.entries.length > 5 ? '…' : ''}` : ''} | ${
          m.exits.length
        }${m.exits.length ? `: ${m.exits.slice(0, 5).join(', ')}${m.exits.length > 5 ? '…' : ''}` : ''} | ${m.rankChanges.length} |`
      )
    }
  }

  const history = assessEtvShadowHistory(result.cells, t)

  lines.push('')
  lines.push('## Historia (§5.3) — ratio improved/legacy por mes y base de cálculo')
  lines.push('')

  if (!history) {
    lines.push('- Sin celdas históricas del sujeto de calibración.')
  } else {
    lines.push('| Mes | Legacy ETV | Improved ETV | Ratio improved/legacy | Base improved |')
    lines.push('|---|---|---|---|---|')

    for (const point of history.ratioByMonth) {
      lines.push(`| ${point.month} | ${n(point.legacy)} | ${n(point.improved)} | ${point.ratio === null ? 'n/d' : point.ratio.toFixed(4)} | ${point.basis ?? '—'} |`)
    }

    lines.push('')
    lines.push(
      `- Discontinuidad ${t.historicalBreak.beforeMonth}→${t.historicalBreak.afterMonth} (salto relativo del ratio): ${p(history.discontinuity)} · variación mensual mediana legacy: ${p(
        history.legacyMedianMonthlyVariation
      )}.`
    )
    lines.push('- Los meses anteriores a 2026-07 bajo improved son `calibrated_approximation` (ratio de julio por dominio), nunca recomputación keyword por keyword; no sirven para YoY sin disclosure.')
  }

  const prospects = result.cells.filter(cell => cell.purpose === 'prospect')

  lines.push('')
  lines.push('## Prospecto (§5.4)')
  lines.push('')

  if (prospects.length === 0) {
    lines.push('- Sin celda prospecto.')
  } else {
    lines.push('| # | Sujeto | Suma orgánica legacy → improved | Δ rel. | Filas muestra / límite | Truncado legacy / improved |')
    lines.push('|---|---|---|---|---|---|')

    for (const cell of prospects) {
      const pt = cell.comparison?.prospectTraffic

      lines.push(
        `| ${cell.cellIndex} | ${cell.subject} | ${n(pt?.legacy)} → ${n(pt?.improved)} | ${p(pt?.relative)} | ${cell.operability ? 'ver summary' : 'n/d'} | ${pt ? `${pt.legacyTruncated} / ${pt.improvedTruncated}` : 'n/d'} |`
      )
    }
  }

  lines.push('')
  lines.push('## Operabilidad (§5.5)')
  lines.push('')
  lines.push(`- Requests con latencia: ${result.latency.requests} · media ${n(result.latency.meanMs)} ms · máx ${n(result.latency.maxMs)} ms`)

  for (const [methodology, stats] of Object.entries(result.latency.byMethodology)) {
    lines.push(`  - ${methodology}: ${stats.requests} requests · media ${n(stats.meanMs)} ms · máx ${n(stats.maxMs)} ms`)
  }

  lines.push('| # | Sujeto | Familia | Legacy status / ms / USD | Improved status / ms / USD | Inputs equivalentes | Evidencia legacy | Evidencia improved |')
  lines.push('|---|---|---|---|---|---|---|---|')

  for (const cell of result.cells) {
    const o = cell.operability

    lines.push(
      `| ${cell.cellIndex} | ${cell.subject} | ${cell.familySlug} | ${o ? `${o.legacy.statusCode ?? 'n/d'} / ${n(o.legacy.latencyMs)} / ${o.legacy.costUsd === null ? 'n/d' : o.legacy.costUsd.toFixed(5)}` : 'sin summary'} | ${
        o ? `${o.improved.statusCode ?? 'n/d'} / ${n(o.improved.latencyMs)} / ${o.improved.costUsd === null ? 'n/d' : o.improved.costUsd.toFixed(5)}` : 'sin summary'
      } | ${o?.inputsEquivalent === null || o?.inputsEquivalent === undefined ? 'n/d' : o.inputsEquivalent ? 'sí' : 'NO'} | ${cell.evidence.legacy.methodologyEvidence ?? 'n/d'} (${cell.evidence.legacy.capturedAt ?? 'n/d'}) | ${
        cell.evidence.improved.methodologyEvidence ?? 'n/d'
      } (${cell.evidence.improved.capturedAt ?? 'n/d'}) |`
    )
  }

  lines.push('')
  lines.push('## Límites')
  lines.push('')
  lines.push('- GSC es benchmark del dominio propio con propiedad activa; los competidores (comex.com.mx) sólo se comparan intra-DataForSEO.')
  lines.push('- Efeonce CL es celda de borde (ETV de un dígito): mide nulls/ceros/estabilidad; no veta ni certifica.')
  lines.push('- Un `go` no convierte el proxy del proveedor en clics medidos; la "alineación" prometida por el proveedor no es dato observado.')
  lines.push('- Los umbrales son los del preregistro; cambiarlos exige una versión nueva del preregistro, nunca un ajuste después de ver resultados.')
  lines.push('- Este artefacto no contiene payloads del proveedor, tokens ni datos personales; la evidencia cruda vive en las tablas formula-aware append-only y en `summary.json`.')
  lines.push('')

  return lines.join('\n')
}
