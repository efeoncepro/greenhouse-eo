/**
 * Artifact Composer — gate visual a CERO píxeles (TASK-1393 · Slice 0).
 *
 *   pnpm composer:visual-gate               # el gate: recompone las 40 imágenes y diffea vs baseline
 *   pnpm composer:visual-gate --selftest    # 0a: prueba de DETERMINISMO (2 corridas, mismo commit)
 *   pnpm composer:visual-gate --freeze      # 0b/0d: congela/re-promueve el baseline (declarado)
 *
 * Por qué existe: las tres operaciones centrales de TASK-1393 (tokenizar 80 bases de color, mover
 * las fuentes al brand pack, compilar el molde) PARECEN preservadoras de valor y no lo son — y las
 * tres fallan SIN poner un test en rojo. La estética del deck costó horas de trabajo del operador;
 * este gate hace que un error no pueda cerrar la task.
 *
 * El contrato:
 *   - Baseline congelado y COMMITTEADO en `scripts/frontend/baselines/artifact-composer/**`:
 *     las 25 plantillas del catálogo (payload sintético compartido con el guard de composability —
 *     mismo sintetizador, mismo píxel) + las 15 láminas reales del deck SKY.
 *   - Umbral: CERO píxeles (`threshold: 0`, `maxChangedPixels: 0`). No "se ve parecido".
 *   - Rebaseline EXPLÍCITO, nunca silencioso: `--freeze` se niega a promover un frame cambiado que
 *     no esté declarado en `BASELINE_DELTAS.md` (contrato de dos vías, como el `KNOWN_BROKEN` de
 *     composability: la lista no puede mentir). Además sella un digest del manifest dentro del
 *     ledger; el gate verifica ese digest — editar el manifest o los PNG a mano, sin pasar por la
 *     promoción declarada, TAMBIÉN falla el gate.
 *
 * Determinismo: si `--selftest` falla, se arregla el RENDER (Chromium pineado, deviceScaleFactor 1,
 * `document.fonts.ready`, sin `Date.now()` en plantillas) — NUNCA se relaja el umbral. Un gate de
 * cero píxeles sobre un render no-determinista es un gate que miente.
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { Browser } from 'playwright'

// Barrel del primitive — cero deep-imports (TASK-1393: el motor vive en artifact-composer/).
import {
  composeDeck,
  fillSlide,
  launchComposerBrowser,
  loadRegistry,
  loadTemplateContract,
  synthesizeProbeSlots,
  type DeckPlan,
  type SlideSpec
} from '@/lib/artifact-composer'

import { compareImages, loadPng } from '../frontend/lib/visual-diff'

const ROOT = process.cwd()

/** ⚠️ Debe seguir al catálogo: hoy los templates viven en docs/ (se mudan en Slice 1b). */
const TEMPLATES_DIR = path.resolve(ROOT, 'docs/architecture/tender-deck-composer-prototypes')

/** El deck real que protege este gate: 15 láminas de la oferta SKY. */
const SKY_PLAN_PATH = path.resolve(ROOT, 'docs/commercial/tenders/sky-blog-2026/deck-plan.json')

const BASELINE_DIR = path.resolve(ROOT, 'scripts/frontend/baselines/artifact-composer')
const MANIFEST_PATH = path.join(BASELINE_DIR, 'baseline-manifest.json')
const DELTAS_PATH = path.join(BASELINE_DIR, 'BASELINE_DELTAS.md')

/** Área de trabajo efímera (gitignored). Dirs fijos: un re-run pisa el anterior, no acumula. */
const WORK_DIR = path.resolve(ROOT, '.captures/composer-visual-gate')

const CONCURRENCY = 4

interface BaselineManifest {
  surface: 'artifact-composer'
  /** rel path del frame → sha256 del PNG. Orden alfabético: el manifest es diffeable. */
  frames: Record<string, string>
}

const sha256 = (buffer: Buffer | string): string => crypto.createHash('sha256').update(buffer).digest('hex')

const sha256File = async (filePath: string): Promise<string> => sha256(await fs.readFile(filePath))

/** Digest canónico del manifest — es lo que BASELINE_DELTAS.md sella en cada promoción. */
const manifestDigest = (manifest: BaselineManifest): string => {
  const canonical = Object.keys(manifest.frames)
    .sort()
    .map(frame => `${frame}=${manifest.frames[frame]}`)
    .join('\n')

  return sha256(canonical)
}

const DIGEST_MARKER = /<!-- manifest-digest: ([0-9a-f]{64}) -->/

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++

      results[index] = await task(items[index]!, index)
    }
  })

  await Promise.all(workers)

  return results
}

/**
 * Renderiza las 25 plantillas del catálogo con el payload sintético compartido
 * (`synthesizeProbeSlots`) — el MISMO que usa `template-composability.test.ts`. Si el probe del
 * test y el del baseline divergieran, el gate compararía láminas distintas y mentiría.
 */
const renderCatalogProbes = async (browser: Browser, outDir: string): Promise<string[]> => {
  const registry = await loadRegistry({ templatesDir: TEMPLATES_DIR })

  await fs.mkdir(path.join(outDir, 'templates'), { recursive: true })

  const frames = await mapWithConcurrency(registry.templates, CONCURRENCY, async entry => {
    const contract = await loadTemplateContract({ templatesDir: TEMPLATES_DIR }, registry, entry.name)

    const slide = {
      slideId: `probe-${entry.name}`,
      contentType: entry.contentTypes[0],
      template: entry.name,
      slots: synthesizeProbeSlots(contract)
    } as unknown as SlideSpec

    const rel = path.join('templates', `${entry.name}.png`)

    // Mismo camino que `template-composability.test.ts`: fill SIN `assertSlideFitsCanvas`. El probe
    // sintético es un payload mínimo de regresión visual, no una lámina de oferta — sus literales
    // ("brandName") pueden desbordar cajas legítimamente chicas. La geometría real la ejercitan las
    // 15 láminas SKY (composeDeck → assert completo) y el propio test de composability.
    const page = await browser.newPage({
      viewport: contract.viewport,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce'
    })

    try {
      await fillSlide(page, path.join(TEMPLATES_DIR, entry.prototype), slide, contract)
      await page.screenshot({ path: path.join(outDir, rel) })
    } finally {
      await page.close()
    }

    return rel
  })

  return frames
}

/** Compone el deck SKY completo (el camino REAL: validate → fill → geometry gate → PNG). */
const renderSkyDeck = async (outDir: string): Promise<string[]> => {
  const deckPlan = JSON.parse(await fs.readFile(SKY_PLAN_PATH, 'utf8')) as DeckPlan
  const skyDir = path.join(outDir, 'sky')

  const { slidePaths } = await composeDeck({ templatesDir: TEMPLATES_DIR }, deckPlan, skyDir, {
    concurrency: CONCURRENCY
  })

  return slidePaths.map(slidePath => path.join('sky', path.basename(slidePath)))
}

/** Render completo del set del baseline (25 probes + 15 láminas SKY) en `runDir`. */
const renderAll = async (runDir: string): Promise<string[]> => {
  await fs.rm(runDir, { recursive: true, force: true })
  await fs.mkdir(runDir, { recursive: true })

  const browser = await launchComposerBrowser()

  try {
    const probeFrames = await renderCatalogProbes(browser, runDir)
    const skyFrames = await renderSkyDeck(runDir)

    return [...probeFrames, ...skyFrames].sort()
  } finally {
    await browser.close()
  }
}

interface FrameDiff {
  frame: string
  status: 'match' | 'exceeded' | 'dimension_mismatch' | 'missing_current' | 'missing_baseline'
  changedPixels?: number
  diffPath?: string
}

/** Diff a CERO píxeles entre dos sets de frames. */
const diffFrames = async (
  frames: string[],
  baselineDir: string,
  currentDir: string,
  diffDir: string
): Promise<FrameDiff[]> => {
  await fs.mkdir(diffDir, { recursive: true })

  const results: FrameDiff[] = []

  for (const frame of frames) {
    const baselinePath = path.join(baselineDir, frame)
    const currentPath = path.join(currentDir, frame)

    const [baselineExists, currentExists] = await Promise.all([
      fs.access(baselinePath).then(() => true, () => false),
      fs.access(currentPath).then(() => true, () => false)
    ])

    if (!baselineExists) {
      results.push({ frame, status: 'missing_baseline' })
      continue
    }

    if (!currentExists) {
      results.push({ frame, status: 'missing_current' })
      continue
    }

    const diffPath = path.join(diffDir, `${frame.replace(/[\\/]/g, '__')}.diff.png`)

    const result = compareImages(loadPng(baselinePath), loadPng(currentPath), {
      threshold: 0,
      maxChangedPixels: 0,
      diffOutputPath: diffPath
    })

    results.push({
      frame,
      status: result.status,
      changedPixels: result.changedPixels,
      diffPath: result.status === 'exceeded' ? diffPath : undefined
    })
  }

  return results
}

const printDiffTable = (diffs: FrameDiff[]): boolean => {
  let clean = true

  for (const diff of diffs) {
    if (diff.status === 'match') continue

    clean = false

    const detail =
      diff.status === 'exceeded'
        ? `${diff.changedPixels} píxel(es) distintos → ${diff.diffPath}`
        : diff.status

    console.error(`  ✗ ${diff.frame} — ${detail}`)
  }

  return clean
}

const readManifest = async (): Promise<BaselineManifest | null> => {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8')) as BaselineManifest
  } catch {
    return null
  }
}

const buildManifest = async (dir: string, frames: string[]): Promise<BaselineManifest> => {
  const manifest: BaselineManifest = { surface: 'artifact-composer', frames: {} }

  for (const frame of [...frames].sort()) {
    manifest.frames[frame] = await sha256File(path.join(dir, frame))
  }

  return manifest
}

/** Lista los PNG presentes en el baseline dir (rel paths), para detectar frames fuera de manifest. */
const listBaselinePngs = async (): Promise<string[]> => {
  const found: string[] = []

  const walk = async (dir: string): Promise<void> => {
    let entries

    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name)

      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile() && entry.name.endsWith('.png')) found.push(path.relative(BASELINE_DIR, full))
    }
  }

  await walk(BASELINE_DIR)

  return found.sort()
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo 0a — selftest de determinismo
// ─────────────────────────────────────────────────────────────────────────────

const selftest = async (): Promise<number> => {
  console.log('\n0a · Determinismo: componiendo el set completo DOS veces sobre el mismo commit…\n')

  const runA = path.join(WORK_DIR, 'selftest-a')
  const runB = path.join(WORK_DIR, 'selftest-b')

  const framesA = await renderAll(runA)
  const framesB = await renderAll(runB)

  if (framesA.join('\n') !== framesB.join('\n')) {
    console.error('✗ Las dos corridas no produjeron el mismo SET de frames — eso ya es no-determinismo.')

    return 1
  }

  const diffs = await diffFrames(framesA, runA, runB, path.join(WORK_DIR, 'selftest-diff'))
  const clean = printDiffTable(diffs)

  if (!clean) {
    console.error(
      '\n✗ El render NO es determinista: dos corridas del mismo código difieren en píxeles.\n' +
        '  Se arregla el RENDER (fuentes, animaciones, Date.now, scale factor) — NUNCA se relaja el umbral.\n'
    )

    return 1
  }

  console.log(`✓ Determinista: ${framesA.length} frames, dos corridas, CERO píxeles de diferencia.\n`)

  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo 0b/0d — freeze / re-promoción declarada
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_DELTAS = `# Artifact Composer — BASELINE_DELTAS (contrato de dos vías)

<!-- manifest-digest: PENDING -->

Este ledger existe porque **un rebaseline silencioso es peor que no tener gate**: el gate se
"arregla" promoviendo el baseline y nadie se entera.

**El contrato:**

- Todo cambio de píxel INTENCIONAL se declara acá, **lámina por lámina** (qué frame, qué cambió,
  por qué, quién lo aprobó) **ANTES** de correr \`pnpm composer:visual-gate --freeze\`.
- \`--freeze\` se niega a promover un frame cambiado que no esté declarado en este archivo.
- El marcador \`manifest-digest\` lo sella la promoción; el gate lo verifica. Editar el manifest o
  los PNG a mano, sin pasar por la promoción declarada, **también falla el gate**.
- El baseline se re-promueve **en el mismo PR** que declara el delta.

## 2026-07-12 — Baseline inicial (TASK-1393 · Slice 0)

- Congelado sobre el commit pre-refactor: 25 plantillas del catálogo (payload sintético compartido
  con \`template-composability.test.ts\`) + 15 láminas reales del deck SKY
  (\`docs/commercial/tenders/sky-blog-2026/deck-plan.json\`).
- Sin deltas: es la fotografía de partida que todo el refactor debe conservar a CERO píxeles.
`

const freeze = async (): Promise<number> => {
  console.log('\n0b/0d · Congelando baseline (25 plantillas + deck SKY)…\n')

  const runDir = path.join(WORK_DIR, 'freeze')
  const frames = await renderAll(runDir)
  const nextManifest = await buildManifest(runDir, frames)
  const previous = await readManifest()

  if (previous) {
    // Re-promoción: cada frame cambiado/nuevo/removido debe estar declarado en BASELINE_DELTAS.md.
    const deltasRaw = await fs.readFile(DELTAS_PATH, 'utf8').catch(() => '')
    const changed: string[] = []

    const allFrames = new Set([...Object.keys(previous.frames), ...Object.keys(nextManifest.frames)])

    for (const frame of allFrames) {
      if (previous.frames[frame] !== nextManifest.frames[frame]) changed.push(frame)
    }

    const undeclared = changed.filter(frame => !deltasRaw.includes(frame))

    if (undeclared.length > 0) {
      console.error(
        '✗ Rebaseline NO declarado. Estos frames cambian y no aparecen en BASELINE_DELTAS.md:\n' +
          undeclared.map(frame => `  - ${frame}`).join('\n') +
          '\n\nDeclará cada lámina (qué cambió, por qué, quién lo aprobó) y volvé a correr --freeze.\n'
      )

      return 1
    }

    if (changed.length === 0) {
      console.log('✓ El baseline ya coincide con el render actual: nada que promover.\n')

      return 0
    }

    console.log(`  ${changed.length} frame(s) declarados se re-promueven:\n${changed.map(f => `    - ${f}`).join('\n')}`)
  }

  // Copiar frames al home durable + escribir manifest + sellar digest en el ledger.
  await fs.rm(BASELINE_DIR, { recursive: true, force: true })
  await fs.mkdir(BASELINE_DIR, { recursive: true })

  for (const frame of frames) {
    const target = path.join(BASELINE_DIR, frame)

    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.copyFile(path.join(runDir, frame), target)
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8')

  const digest = manifestDigest(nextManifest)
  const deltasRaw = previous ? await fs.readFile(DELTAS_PATH, 'utf8').catch(() => INITIAL_DELTAS) : INITIAL_DELTAS

  const sealed = DIGEST_MARKER.test(deltasRaw)
    ? deltasRaw.replace(DIGEST_MARKER, `<!-- manifest-digest: ${digest} -->`)
    : deltasRaw.replace('<!-- manifest-digest: PENDING -->', `<!-- manifest-digest: ${digest} -->`)

  await fs.writeFile(DELTAS_PATH, sealed, 'utf8')

  console.log(`\n✓ Baseline congelado: ${frames.length} frames → ${path.relative(ROOT, BASELINE_DIR)}`)
  console.log(`  manifest-digest sellado en BASELINE_DELTAS.md: ${digest.slice(0, 12)}…`)
  console.log('  Commitealo COMPLETO (PNGs + manifest + BASELINE_DELTAS.md) en el mismo PR.\n')

  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo default — EL GATE
// ─────────────────────────────────────────────────────────────────────────────

const gate = async (): Promise<number> => {
  console.log('\ncomposer:visual-gate · recomponiendo el set y diffeando a CERO píxeles…\n')

  const manifest = await readManifest()

  if (!manifest) {
    console.error(
      '✗ No existe baseline congelado. Corré primero:\n' +
        '    pnpm composer:visual-gate --selftest   (probar determinismo)\n' +
        '    pnpm composer:visual-gate --freeze     (congelar el baseline)\n'
    )

    return 1
  }

  // 1 · Integridad del baseline: PNGs ↔ manifest ↔ digest sellado en BASELINE_DELTAS.md.
  const deltasRaw = await fs.readFile(DELTAS_PATH, 'utf8').catch(() => '')
  const sealedDigest = deltasRaw.match(DIGEST_MARKER)?.[1]
  const expectedDigest = manifestDigest(manifest)

  if (sealedDigest !== expectedDigest) {
    console.error(
      '✗ El manifest del baseline NO coincide con el digest sellado en BASELINE_DELTAS.md.\n' +
        '  Un rebaseline sin su promoción declarada también falla el gate (contrato de dos vías).\n' +
        `  sellado=${sealedDigest ?? 'ausente'} esperado=${expectedDigest}\n`
    )

    return 1
  }

  const baselinePngs = await listBaselinePngs()
  const manifestFrames = Object.keys(manifest.frames).sort()

  const extra = baselinePngs.filter(frame => !(frame in manifest.frames))
  const missing = manifestFrames.filter(frame => !baselinePngs.includes(frame))

  if (extra.length > 0 || missing.length > 0) {
    for (const frame of extra) console.error(`  ✗ PNG fuera de manifest: ${frame}`)
    for (const frame of missing) console.error(`  ✗ PNG del manifest ausente: ${frame}`)
    console.error('\n✗ El baseline está corrupto/mutado. Restauralo desde git o re-promové declarando el delta.\n')

    return 1
  }

  for (const frame of manifestFrames) {
    const actual = await sha256File(path.join(BASELINE_DIR, frame))

    if (actual !== manifest.frames[frame]) {
      console.error(
        `✗ ${frame} fue modificado sin promoción declarada (sha ${actual.slice(0, 12)}… ≠ manifest).\n`
      )

      return 1
    }
  }

  // 2 · Recomponer el set actual.
  const runDir = path.join(WORK_DIR, 'gate')
  const currentFrames = await renderAll(runDir)

  // 3 · El SET debe ser idéntico (una plantilla nueva/renombrada exige re-promoción declarada).
  const unexpected = currentFrames.filter(frame => !(frame in manifest.frames))

  if (unexpected.length > 0) {
    console.error(
      '✗ El render actual produce frames que el baseline no conoce (¿plantilla nueva/renombrada?):\n' +
        unexpected.map(frame => `  - ${frame}`).join('\n') +
        '\n  Declaralo en BASELINE_DELTAS.md y re-promové con --freeze.\n'
    )

    return 1
  }

  // 4 · Diff a CERO píxeles.
  const diffs = await diffFrames(manifestFrames, BASELINE_DIR, runDir, path.join(WORK_DIR, 'gate-diff'))
  const clean = printDiffTable(diffs)

  if (!clean) {
    console.error(
      '\n✗ REGRESIÓN VISUAL: el render actual difiere del baseline congelado.\n' +
        '  Si el cambio es intencional: declaralo lámina por lámina en BASELINE_DELTAS.md y corré --freeze.\n' +
        '  Si no lo es: acabás de atrapar la regresión que este gate existe para atrapar.\n'
    )

    return 1
  }

  console.log(`✓ ${manifestFrames.length} frames idénticos al baseline (0 píxeles de diferencia).\n`)

  return 0
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)

  let exitCode: number

  if (args.includes('--selftest')) exitCode = await selftest()
  else if (args.includes('--freeze')) exitCode = await freeze()
  else exitCode = await gate()

  process.exit(exitCode)
}

main().catch(error => {
  console.error('\n✗', error instanceof Error ? error.stack ?? error.message : error, '\n')
  process.exit(1)
})
