#!/usr/bin/env tsx
/**
 * Captura + prepara dossier de audit para `greenhouse-ui-review` skill.
 *
 * Workflow:
 *   1. Corre `pnpm fe:capture <scenario>` (subprocess) y obtiene outputDir
 *   2. Construye un dossier:
 *      - referencias a los frames PNG generados
 *      - prompt estructurado contra el 13-row floor de greenhouse-ui-review
 *      - referencias a tokens canónicos (DESIGN.md + V1)
 *   3. Escribe `review-dossier.md` en el run dir
 *   4. Print del dossier (markdown) listo para pegar a un chat de Claude
 *
 * V1.1 (este commit): SCAFFOLDING. No invoca Claude API directamente.
 * El agente / dev copia-pega el dossier en una conversación de Claude Code
 * con el skill `greenhouse-ui-review` cargado.
 *
 * V1.2 (futuro): integración directa con Anthropic SDK + skill loader →
 * audit automático sin copy-paste. Requiere `@anthropic-ai/sdk` en deps
 * + claude-api skill orchestration.
 *
 * Uso:
 *   pnpm fe:capture:review <scenario-name> --env=staging
 *   pnpm fe:capture:review <existing-capture-dir>    # skip capture, solo dossier
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'

interface FrameMeta {
  index: number
  label: string
  path: string
  tMs: number
  note?: string
  viewportName?: string
}

interface RuntimeSummary {
  consoleErrorCount: number
  pageErrorCount: number
  hydrationWarningCount: number
  httpFailureCount: number
}

interface PerformanceSummary {
  domNodes: number
  requestCount: number
  transferBytes: number
  fcpMs: number
  domContentLoadedMs: number
  jsHeapBytes: number
}

interface VariantMeta {
  name: string
  viewport: { width: number; height: number }
  outputDir: string
  manifestPath: string
  exitCode: number
  frameCount: number
}

interface VariantEvidence extends VariantMeta {
  runtimeSummary?: RuntimeSummary
  performanceSummary?: PerformanceSummary
}

interface ManifestLike {
  scenarioName: string
  qualityProfile?: string
  route: string
  env: string
  viewport: { width: number; height: number }
  viewportName?: string
  frames: FrameMeta[]
  readiness?: { status: string; durationMs: number; error?: string }
  assertions?: Array<{ kind: string; status: string; selector?: string; reason?: string; message?: string }>
  qualityFindings?: Array<{ severity: string; category: string; code: string; message: string; frameLabel?: string }>
  interactions?: Array<{
    name: string
    intent: string
    actionKind: string
    frameLabels: string[]
    viewportName?: string
  }>
  reportHtml?: string
  exitCode?: number
  enterpriseRubric?: { verdict: string; findingCount: number }
  baselineDiffs?: Array<{ frameLabel: string; status: string; diffRatio?: number; viewportName?: string }>
  runtimeSummary?: RuntimeSummary
  performanceSummary?: PerformanceSummary
  variants?: VariantMeta[]
  variantEvidence?: VariantEvidence[]
}

const hydrateMultiViewportEvidence = (captureDir: string, manifest: ManifestLike): ManifestLike => {
  if (!manifest.variants?.length) return manifest

  const children = manifest.variants.map(variant => {
    const childPath = join(captureDir, variant.manifestPath)

    if (!existsSync(childPath)) throw new Error(`Variant manifest missing: ${childPath}`)

    return { variant, manifest: JSON.parse(readFileSync(childPath, 'utf8')) as ManifestLike }
  })

  return {
    ...manifest,
    frames: children.flatMap(({ variant, manifest: child }) =>
      child.frames.map(frame => ({
        ...frame,
        viewportName: child.viewportName ?? variant.name,
        path: join(variant.outputDir, frame.path)
      }))
    ),
    interactions: children.flatMap(({ variant, manifest: child }) =>
      (child.interactions ?? []).map(interaction => ({
        ...interaction,
        viewportName: child.viewportName ?? variant.name
      }))
    ),
    baselineDiffs: children.flatMap(({ variant, manifest: child }) =>
      (child.baselineDiffs ?? []).map(diff => ({
        ...diff,
        viewportName: diff.viewportName ?? child.viewportName ?? variant.name
      }))
    ),
    variantEvidence: children.map(({ variant, manifest: child }) => ({
      ...variant,
      runtimeSummary: child.runtimeSummary,
      performanceSummary: child.performanceSummary
    }))
  }
}

const buildDossier = (captureDir: string, manifest: ManifestLike): string => {
  const frameList = manifest.frames
    .map(
      f =>
        `- **${f.label}**${f.viewportName ? ` (${f.viewportName})` : ''} (\`${f.path}\`, +${f.tMs}ms)${f.note ? ` — ${f.note}` : ''}`
    )
    .join('\n')

  const findings = manifest.qualityFindings?.length
    ? manifest.qualityFindings
        .map(
          f =>
            `- **${f.severity}** \`${f.category}/${f.code}\`${f.frameLabel ? ` (${f.frameLabel})` : ''}: ${f.message}`
        )
        .join('\n')
    : '- Sin findings automáticos.'

  const assertions = manifest.assertions?.length
    ? manifest.assertions
        .map(
          a =>
            `- **${a.status}** \`${a.kind}\`${a.selector ? ` — \`${a.selector}\`` : ''}${a.reason || a.message ? ` — ${a.reason ?? a.message}` : ''}`
        )
        .join('\n')
    : '- Sin assertions declaradas.'

  const interactions = manifest.interactions?.length
    ? manifest.interactions
        .map(
          i =>
            `- \`${i.name}\`${i.viewportName ? ` (${i.viewportName})` : ''} · ${i.actionKind} — ${i.intent}. Frames: ${i.frameLabels.join(', ')}`
        )
        .join('\n')
    : '- Sin interactions V2 declaradas.'

  const errorCount = manifest.qualityFindings?.filter(f => f.severity === 'error').length ?? 0
  const warningCount = manifest.qualityFindings?.filter(f => f.severity === 'warning').length ?? 0

  const verdict =
    manifest.exitCode === 1 || errorCount > 0
      ? '🔴 Requiere iteración'
      : warningCount > 0
        ? '🟡 Revisar antes de implementar'
        : '🟢 Apto para implementar'

  const baselineDiffs = manifest.baselineDiffs?.length
    ? manifest.baselineDiffs
        .map(
          d =>
            `- \`${d.frameLabel}\`${d.viewportName ? ` (${d.viewportName})` : ''}: **${d.status}**${d.diffRatio !== undefined ? ` — ${(d.diffRatio * 100).toFixed(2)}%` : ''}`
        )
        .join('\n')
    : '- Sin contrato baseline activo.'

  const viewportEvidence = manifest.variantEvidence?.length
    ? manifest.variantEvidence
        .map(variant => {
          const runtime = variant.runtimeSummary
          const performance = variant.performanceSummary

          return `- **${variant.name} ${variant.viewport.width}×${variant.viewport.height}** — ${variant.frameCount} frames · exit ${variant.exitCode}${runtime ? ` · runtime ${runtime.consoleErrorCount}/${runtime.pageErrorCount}/${runtime.hydrationWarningCount}/${runtime.httpFailureCount} (console/page/hydration/http)` : ''}${performance ? ` · FCP ${performance.fcpMs}ms · DOM ${performance.domNodes} · ${performance.requestCount} requests` : ''}`
        })
        .join('\n')
    : `- **default ${manifest.viewport.width}×${manifest.viewport.height}** — ${manifest.frames.length} frames`

  return `# UI Review Dossier — ${manifest.scenarioName}

> Generado por \`pnpm fe:capture:review\` el ${new Date().toISOString()}
> **Skill a invocar**: \`greenhouse-ui-review\` (cargá el contexto de DESIGN.md + V1 antes)

## Resumen ejecutivo (GVC)

- **Veredicto automático**: ${verdict}
- **Findings**: ${errorCount} error · ${warningCount} warning
- **Quality profile**: ${manifest.qualityProfile ?? 'legacy'}
- **Rubric enterprise**: ${manifest.enterpriseRubric ? `${manifest.enterpriseRubric.verdict} (${manifest.enterpriseRubric.findingCount} hallazgos)` : 'no evaluado'}
- **Exit code**: ${manifest.exitCode ?? 0}

## Baseline diff (mockup → runtime)

${baselineDiffs}

## Contexto

- **route**: \`${manifest.route}\`
- **env**: \`${manifest.env}\`
- **viewports / runtime**:
${viewportEvidence}
- **capture dir**: \`${captureDir}\`
- **report HTML**: ${manifest.reportHtml ? `\`${manifest.reportHtml}\`` : '`index.html` no registrado'}
- **readiness**: ${manifest.readiness?.status ?? 'skipped'}${manifest.readiness?.error ? ` — ${manifest.readiness.error}` : ''}

## Frames disponibles para análisis

${frameList}

## Findings automáticos GVC

${findings}

## Assertions ligeros

${assertions}

## Evidencia de microinteracciones

${interactions}

## Petición canónica

Invocá la skill \`greenhouse-ui-review\` y evaluá la evidencia contra el estándar premium vigente. No asignes calidad estética desde heurísticas: mirá cada frame desktop/móvil y cada transición.

1. **Dirección y fidelidad** — la visual direction versionada se reconoce; no se transcribió Figma/Claude literalmente ni se degradó a defaults del framework.
2. **Jerarquía y acción** — propósito, dato dominante, ownership y CTA primario se entienden en cinco segundos; secundarios y destructivos no compiten.
3. **Composición** — recipe + \`CompositionShell\` organizan regiones con relaciones claras; sin grid genérico de widgets ni card wallpaper.
4. **Proporción, ritmo y densidad** — ancho, whitespace, alineación óptica y densidad responden al trabajo; spacing/radius/elevation provienen de tokens.
5. **Profundidad** — base, selección, contexto y flotación tienen niveles deliberados; no hay bordes azules ni sombras indiscriminadas.
6. **Economía de superficies** — cada borde/radio/fondo gana una frontera semántica; sin card-on-card, wrappers cromados para spacing ni más de tres contained surfaces compitiendo en el viewport.
7. **Impacto visual** — existe un momento dominante ligado a la tarea (canvas, stage, narrativa o asimetría), no polish uniforme de cards equivalentes.
8. **Tipografía, color e iconografía** — Geist/Poppins, roles semánticos, contraste, numerales y tamaños ópticos consistentes; el color de estado no decora CTAs.
9. **Responsive real** — 390px recompone la lectura y los comandos, mantiene el dato clave y demuestra \`scrollWidth <= clientWidth\`; no es desktop encogido ni una torre de cards.
10. **Estados completos** — ready/loading/empty/partial/error/denied, long content y permission recovery tienen copy, estructura y acción explícitos; nunca ceros falsos.
11. **Interacción causal** — selección, pending/result, teclado, foco y live-region actualizan contenido/decisión, no solo el estilo del control.
12. **Motion enterprise** — tokens 75/150/200/300/400/600, interrupción segura y reduced-motion equivalente; cada frame intermedio conserva contraste AA.
13. **A11y y operabilidad** — WCAG 2.2 AA, focus ring visible, targets, heading order, labels, keyboard y recuperación sin depender de color/motion.
14. **Resistencia a template genérico** — la superficie tiene firma, narrativa y asimetría útil; MUI/Vuexy solo actúan como base accesible bajo primitives Greenhouse.

Entregá score 1–5 con rationale + evidencia por dimensión. PASS exige promedio ≥4.5, ningún score <4 y hierarchy/surface economy/visual impact/fidelity/generic-template resistance ≥4.5; todo score <4.5 necesita next action concreta.

## Output esperado del skill

\`\`\`
# UI Review — ${manifest.scenarioName}

## Summary
- 🔴 N blockers
- 🟡 M modern-bar issues
- 🟢 K polish items

## Blockers (must fix before commit)
1. [frame: label] <issue> → <fix>
...

## Verdict
- PASS / BLOCK / CONDITIONAL PASS
\`\`\`

## Referencias canónicas

- **DESIGN.md** (repo root, contrato agent-facing)
- **GREENHOUSE_DESIGN_TOKENS_V1.md** (spec extendida)
- **mergedTheme.ts** (runtime authority)
- **GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md** (dirección, recipes, gates y scorecard)
- **greenhouse-ai-design-studio** (orquestador canónico de UI)
- **modern-ui-greenhouse-overlay** (canon visual Greenhouse)
`
}

const main = (): void => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      env: { type: 'string', default: 'staging' },
      gif: { type: 'boolean', default: false }
    }
  })

  if (positionals.length !== 1) {
    console.error('Usage: pnpm fe:capture:review <scenario-name> [--env=staging] [--gif]')
    console.error('   OR: pnpm fe:capture:review <existing-capture-dir>')
    process.exit(1)
  }

  const arg = positionals[0]
  let captureDir: string

  if (existsSync(resolve(arg)) && existsSync(join(resolve(arg), 'manifest.json'))) {
    // Mode 2: existing capture dir
    captureDir = resolve(arg)
    console.log(`▶ Re-usando captura existente: ${captureDir}`)
  } else {
    // Mode 1: ejecutar fe:capture primero
    console.log(`▶ Ejecutando pnpm fe:capture ${arg} --env=${values.env}…`)
    const args = ['fe:capture', arg, `--env=${values.env}`]

    if (values.gif) args.push('--gif')

    const captureRun = spawnSync('pnpm', args, { stdio: 'inherit' })

    if (captureRun.status !== 0) {
      console.error('✗ Captura falló — abort review.')
      process.exit(1)
    }

    // Encontrar el run dir más reciente bajo .captures/
    const capturesDir = resolve('.captures')

    const runs = readdirSync(capturesDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.includes(arg))
      .map(d => ({ name: d.name, mtime: 0 }))
      .map(d => ({ ...d, mtime: statSync(join(capturesDir, d.name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    if (runs.length === 0) {
      console.error('✗ No se encontró el dir de captura recién generado.')
      process.exit(1)
    }

    captureDir = join(capturesDir, runs[0].name)
  }

  const manifestPath = join(captureDir, 'manifest.json')
  const rawManifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestLike
  const manifest = hydrateMultiViewportEvidence(captureDir, rawManifest)

  const dossier = buildDossier(captureDir, manifest)
  const dossierPath = join(captureDir, 'review-dossier.md')

  writeFileSync(dossierPath, dossier, 'utf8')

  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  ✅ Dossier listo: ${dossierPath}`)
  console.log('═══════════════════════════════════════════════════')
  console.log('')
  console.log('Siguiente paso:')
  console.log('  1. Abrí Claude Code con el skill greenhouse-ui-review cargado')
  console.log('  2. Adjuntá los frames listados (o pasá el manifest.json)')
  console.log(`  3. Pegá el contenido de ${dossierPath} como prompt`)
  console.log('')
  console.log('  V1.2: este step será automático vía Anthropic SDK orchestration.')
}

main()
