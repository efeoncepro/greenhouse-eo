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
 * Logo del cliente (TASK-1889): si la portada sellada lo pide (`asset-ref:org-logo:<id>`), los bytes se leen con
 * el MISMO lector acotado del worker (`readOrganizationLogoForRender`: sólo el logo adjunto de esa organización).
 * Ese lector registra el acceso en la bitácora de assets: es la única escritura del script, y es auditoría.
 *
 * Ojo: vuelve a recolectar la evidencia con el código actual, así que el resultado es lo que produciría
 * una edición NUEVA (o revisada) con esta ventana, no el plan ya sellado de esa edición.
 *
 * Usage (con el Cloud SQL Proxy arriba, `pnpm pg:connect`, y el entorno apuntando a él):
 *   GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false \
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/preview-edition.ts \
 *     --edition=insed-... --org=org-... [--output=report_pdf|deck_pdf|both] [--editorial-v2] [--plan-only] [--ai-authoring]
 *
 * TASK-1888 — `--editorial-v2` recorre el contrato editorial v2 como lo haría la generación con
 * `INSIGHTS_EDITORIAL_V2_ENABLED=true`: evidencia v2 (FTR y metas ICO), portada resuelta con la preferencia y los
 * logos reales (sólo lectura) y plan v2. `--plan-only` imprime el resumen del plan (familias, lecturas, esenciales,
 * portada) y no compone: sirve para inspeccionar el contrato mientras los catálogos cambian.
 *
 * `--ai-authoring` pasa el plan determinista por la autoría IA ACOTADA exactamente como la generación con
 * `INSIGHTS_AUTHORING_AI_ENABLED=true` (`authorPlanWithBoundedAi`: reescribe texto validado, nunca cifras; si discrepa,
 * gana el determinista) e imprime el provenance (modelo, tokens, intentos, motivo de fallback). Llama a Gemini: tiene
 * costo y requiere autorización del operador. Sigue sin escribir en la base.
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
import { authorPlanWithBoundedAi } from '@/lib/efeonce-insights/editorial/ai-authoring'
import { buildDeterministicPlan } from '@/lib/efeonce-insights/editorial/deterministic-planner'
import { validateEditorialPlan } from '@/lib/efeonce-insights/editorial/plan-validation'
import { buildInsightsDeckPlanInput } from '@/lib/efeonce-insights/render/insights-deck-mapper'
import { buildInsightReportPlanInput } from '@/lib/efeonce-insights/render/report-mapper'
import { getInsightEditionById } from '@/lib/efeonce-insights/stores/edition-store'
import { getInsightReportById } from '@/lib/efeonce-insights/stores/report-store'
import { readOrganizationLogoForRender } from '@/lib/storage/greenhouse-assets'
import { resolveInsightWindows } from '@/lib/efeonce-insights/window'

const arg = (name: string): string | undefined => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))

  return hit ? hit.slice(name.length + 3) : undefined
}

/** Referencias `asset-ref:org-logo:<id>` en los slots (misma forma que el consumer del worker). */
const ORG_LOGO_REF = /^asset-ref:(org-logo:([A-Za-z0-9_-]+))$/

const collectOrgLogoRefs = (value: unknown, found = new Map<string, string>()): Map<string, string> => {
  if (typeof value === 'string') {
    const match = ORG_LOGO_REF.exec(value)

    if (match) found.set(match[1]!, match[2]!)
  } else if (Array.isArray(value)) {
    for (const item of value) collectOrgLogoRefs(item, found)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectOrgLogoRefs(item, found)
  }

  return found
}

const main = async () => {
  const editionId = arg('edition')
  const organizationId = arg('org')
  const output = arg('output') ?? 'both'
  const editorialV2 = process.argv.includes('--editorial-v2')
  const planOnly = process.argv.includes('--plan-only')
  const aiAuthoring = process.argv.includes('--ai-authoring')

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
  const deterministic = buildDeterministicPlan(content, { modules: request.modules, locale: request.locale, editorialV2, cover })
  let plan = deterministic

  if (aiAuthoring && validateEditorialPlan(deterministic, content).length === 0) {
    const authored = await authorPlanWithBoundedAi(deterministic, content)

    plan = authored.plan
    console.log(`autoría IA: ${JSON.stringify({ ...authored.provenance, fallbackReason: authored.fallbackReason })}`)
  }

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
        readings: (chapter.readings ?? []).map(reading => ({ chartId: reading.chartId, keyFigure: reading.keyFigure?.value ?? null, conclusion: reading.conclusion?.text ?? null, meaning: reading.meaning?.text ?? null, nextStep: reading.nextStep?.text ?? null })),
        opening: chapter.opening?.text ?? null,
        claims: chapter.claims.map(item => item.text)
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
    const externalAssets: Record<string, string> = {}

    for (const [key, assetId] of collectOrgLogoRefs(input)) {
      externalAssets[key] = (await readOrganizationLogoForRender({ organizationId, assetId, accessMetadata: { purpose: 'insights-preview-edition', editionId } })).dataUri
    }

    const result = (await composeArtifact(isDeck ? insightsDeckCatalog : insightsReportCatalog, input as never, outDir, { externalAssets })) as { pdfPath?: string }
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
