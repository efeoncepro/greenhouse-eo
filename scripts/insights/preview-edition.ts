/**
 * Vista previa LOCAL de una edición de Efeonce Insights con el código del árbol de trabajo (TASK-1847).
 *
 * Recorre la cadena completa que recorre producción —adapters (sólo lectura) → planner → validador de
 * cifras → mapper → composer— sobre la ventana y los módulos que la edición pidió, y deja el PDF en
 * `.captures/insights-preview/`. No escribe nada en la base, no encola, no toca el worker.
 *
 * Para qué: revisar el documento con DATOS REALES antes de desplegar. Todos los defectos del canary de
 * 2026-09-22 (validador, OTD, figuras, barra invisible, deck recortado) salieron con datos reales; una
 * edición de demostración sin datos los escondía todos.
 *
 * Ojo: vuelve a recolectar la evidencia con el código actual, así que el resultado es lo que produciría
 * una edición NUEVA (o revisada) con esta ventana, no el plan ya sellado de esa edición.
 *
 * Usage (con el Cloud SQL Proxy arriba, `pnpm pg:connect`, y el entorno apuntando a él):
 *   GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false \
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/preview-edition.ts \
 *     --edition=insed-... --org=org-... [--output=report_pdf|deck_pdf|both] [--editorial-v2] [--plan-only]
 *
 * TASK-1888 — `--editorial-v2` recorre el contrato editorial v2 como lo haría la generación con
 * `INSIGHTS_EDITORIAL_V2_ENABLED=true`: evidencia v2 (FTR y metas ICO), portada resuelta con la preferencia y los
 * logos reales (sólo lectura) y plan v2. `--plan-only` imprime el resumen del plan (familias, lecturas, esenciales,
 * portada) y no compone: sirve para inspeccionar el contrato mientras los catálogos cambian.
 */

import { rename } from 'node:fs/promises'
import path from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

import { composeArtifact } from '@/lib/artifact-composer'
import { insightsDeckCatalog } from '@/lib/artifact-composer/catalogs/insights-deck'
import { insightsReportCatalog } from '@/lib/artifact-composer/catalogs/insights-report'
import { collectInsightEvidence } from '@/lib/efeonce-insights/adapters/collect-evidence'
import { resolveInsightCoverForEdition } from '@/lib/efeonce-insights/commands/cover-preference'
import { buildDeterministicPlan } from '@/lib/efeonce-insights/editorial/deterministic-planner'
import { validateEditorialPlan } from '@/lib/efeonce-insights/editorial/plan-validation'
import { buildInsightsDeckPlanInput } from '@/lib/efeonce-insights/render/insights-deck-mapper'
import { buildInsightReportPlanInput } from '@/lib/efeonce-insights/render/report-mapper'
import { getInsightEditionById } from '@/lib/efeonce-insights/stores/edition-store'
import { getInsightReportById } from '@/lib/efeonce-insights/stores/report-store'
import { resolveInsightWindows } from '@/lib/efeonce-insights/window'

const arg = (name: string): string | undefined => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))

  return hit ? hit.slice(name.length + 3) : undefined
}

const main = async () => {
  const editionId = arg('edition')
  const organizationId = arg('org')
  const output = arg('output') ?? 'both'
  const editorialV2 = process.argv.includes('--editorial-v2')
  const planOnly = process.argv.includes('--plan-only')

  if (!editionId || !organizationId || !['report_pdf', 'deck_pdf', 'both'].includes(output)) {
    throw new Error('Uso: --edition=insed-... --org=org-... [--output=report_pdf|deck_pdf|both]')
  }

  const edition = await getInsightEditionById(undefined, organizationId, editionId)

  if (!edition) throw new Error(`No existe la edición ${editionId} en ${organizationId}`)

  const report = await getInsightReportById(undefined, organizationId, edition.reportId)

  if (!report) throw new Error(`No existe el reporte de la edición ${editionId}`)

  const request = edition.request
  const windows = resolveInsightWindows(request.period, request.comparison)

  const content = await collectInsightEvidence({
    organizationId,
    audience: request.audience,
    modules: request.modules,
    windows,
    projectIds: request.projectIds ?? [],
    editorialV2
  })

  const cover = editorialV2 ? await resolveInsightCoverForEdition({ organizationId, requested: request.brand.coverTheme ?? null }) : null
  const plan = buildDeterministicPlan(content, { modules: request.modules, locale: request.locale, editorialV2, cover })
  const violations = validateEditorialPlan(plan, content)

  console.log(`${report.reportCode} · ${content.facts.length} hechos · ${content.rejections.length} rechazos · ${violations.length} violaciones`)

  // Un plan que el validador rechaza no se compone: producción tampoco lo haría.
  if (violations.length > 0) {
    for (const violation of violations) console.log(`  ✗ ${violation.where}: ${violation.detail}`)
    process.exit(1)
  }

  if (planOnly) {
    const summary = {
      contract: editorialV2 ? 'v2' : 'v1',
      chapters: plan.chapters.map(chapter => ({
        module: chapter.module,
        families: chapter.charts.map(chart => `${chart.family}:${chart.chartId}`),
        readings: (chapter.readings ?? []).map(reading => ({ chartId: reading.chartId, keyFigure: reading.keyFigure?.value ?? null, meaning: reading.meaning.text, nextStep: reading.nextStep?.text ?? null })),
        opening: chapter.opening?.text ?? null
      })),
      essentials: (plan.essentials ?? []).map(claim => claim.text),
      scopeLines: plan.scopeLines ?? [],
      cover: plan.cover ?? null,
      referenceFacts: content.facts.filter(fact => fact.role === 'reference').map(fact => `${fact.metricId}=${fact.value}`)
    }

    console.log(JSON.stringify(summary, null, 2))
    process.exit(0)
  }

  const snapshot = { snapshotId: 'preview', editionId, ...content } as never
  const targets = output === 'both' ? ['report_pdf', 'deck_pdf'] : [output]

  for (const target of targets) {
    const isDeck = target === 'deck_pdf'

    const input = isDeck
      ? buildInsightsDeckPlanInput({ edition, report, plan, snapshot })
      : buildInsightReportPlanInput({ edition, report, plan, snapshot })

    const outDir = path.join(process.cwd(), '.captures', 'insights-preview', `${report.reportCode}-${target}`)
    const result = (await composeArtifact(isDeck ? insightsDeckCatalog : insightsReportCatalog, input as never, outDir)) as { pdfPath?: string }
    const pdf = result.pdfPath ? path.join(outDir, `${report.reportCode}-${target}.pdf`) : null

    if (result.pdfPath && pdf) await rename(result.pdfPath, pdf)

    console.log(`  ${target}: ${input.slides.length} ${isDeck ? 'láminas' : 'páginas'} → ${pdf ?? outDir}`)
  }

  process.exit(0)
}

main().catch(error => {
  console.error('FALLÓ:', error instanceof Error ? `${error.name}: ${error.message}` : error)
  process.exit(1)
})
