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
}

interface ManifestLike {
  scenarioName: string
  route: string
  env: string
  viewport: { width: number; height: number }
  frames: FrameMeta[]
}

const buildDossier = (captureDir: string, manifest: ManifestLike): string => {
  const frameList = manifest.frames
    .map(f => `- **${f.label}** (\`frames/${f.path.replace(/^frames\//, '')}\`, +${f.tMs}ms)${f.note ? ` — ${f.note}` : ''}`)
    .join('\n')

  return `# UI Review Dossier — ${manifest.scenarioName}

> Generado por \`pnpm fe:capture:review\` el ${new Date().toISOString()}
> **Skill a invocar**: \`greenhouse-ui-review\` (cargá el contexto de DESIGN.md + V1 antes)

## Contexto

- **route**: \`${manifest.route}\`
- **env**: \`${manifest.env}\`
- **viewport**: ${manifest.viewport.width}×${manifest.viewport.height}
- **capture dir**: \`${captureDir}\`

## Frames disponibles para análisis

${frameList}

## Petición canónica

Invocá la skill \`greenhouse-ui-review\` y aplicá su checklist de 13 rows contra los frames listados arriba. Por cada frame:

1. **Tipografía** — Geist + Poppins canónicos. No DM Sans (deprecated). Numeric tabular-nums.
2. **Spacing** — múltiplos de 4 desde \`theme.spacing\`. No decimales arbitrarios.
3. **Border radius** — solo \`theme.shape.customBorderRadius.{xs..xl}\` o 9999.
4. **Elevation** — theme shadows; outlined cards \`boxShadow: 0\`.
5. **Icon sizes** — {14, 16, 18, 20, 22}.
6. **Color** — semantic (success/warning/error/info) solo para ESTADOS, nunca CTAs.
7. **Primitivas Vuexy** — \`CustomTextField\`/\`CustomAutocomplete\`/\`CustomChip\`/\`CustomAvatar\`.
8. **Layout** — Card + CardHeader + CardContent, no \`Box + Stack + Typography\`.
9. **Interaction cost** — ≤2 clicks por selector.
10. **Motion** — \`useReducedMotion\`, durations {75,150,200,300,400,600}, easing emphasized decel.
11. **A11y WCAG 2.2 AA** — labels, focus rings ≥2px, targets ≥24×24 (≥44 Greenhouse pin), contrast verificado en light + darkSemi.
12. **Estados** — empty con \`<EmptyState>\` primitive, loading con \`<Skeleton>\`, error con \`role="alert"\`.
13. **Anti-pattern sweep** — sin monospace para números, sin Popover+Select combos, sin \`success/info/warning\` para diferenciación no-semantic, sin \`borderRadius: 2|3|4\` off-scale.

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
- **modern-ui-greenhouse-overlay** skill v1.1 (canon Geist + Poppins)
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
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestLike

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
