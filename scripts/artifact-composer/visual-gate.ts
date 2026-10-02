/**
 * Artifact Composer — gate visual a CERO píxeles (TASK-1393 · Slice 0).
 *
 *   pnpm composer:visual-gate                              # gate global (todos los catálogos + deck SKY)
 *   pnpm composer:visual-gate --catalog=insights            # gate aislado de los catálogos Insights
 *   pnpm composer:visual-gate --catalog=insights --selftest # determinismo de Insights (2 corridas)
 *   pnpm composer:visual-gate --catalog=insights --freeze   # promueve sólo los frames declarados de Insights
 *   pnpm composer:visual-gate --catalog=graphic-line        # gate aislado de los catálogos de La órbita (TASK-1919)
 *   pnpm composer:visual-gate --catalog=graphic-line --freeze
 *   pnpm composer:visual-gate --catalog=glitch              # gate aislado de los catálogos de Glitch (TASK-1923)
 *   pnpm composer:visual-gate --catalog=glitch --freeze
 *   pnpm composer:visual-gate --catalog=manzanitas          # gate aislado de Marketing con Manzanitas (TASK-1939)
 *   pnpm composer:visual-gate --catalog=manzanitas --freeze
 *   pnpm composer:visual-gate --freeze                      # congela/re-promueve el baseline completo
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
 *     no esté declarado en la sección SIN SELLAR de `BASELINE_DELTAS.md` (`baseline-deltas-ledger.ts`;
 *     cada promoción sella su sección y las viejas ya no autorizan nada) (contrato de dos vías, como el `KNOWN_BROKEN` de
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

import { lensRecipe, orbitSvg } from '@efeoncepro/axis-graphic-line'

import { evaluatePromotion, sealUnsealedSections } from './baseline-deltas-ledger'

// Barrel del primitive — cero deep-imports (TASK-1393: el motor vive en artifact-composer/).
import {
  composeArtifact,
  fillSlide,
  launchComposerBrowser,
  loadRegistry,
  loadTemplateContract,
  synthesizeProbeSlots,
  type DeckPlan,
  type SlideSpec
} from '@/lib/artifact-composer'
import { deckAxisCatalog, deckAxisCatalogDir } from '@/lib/artifact-composer/catalogs/deck-axis'
import { insightsDeckCatalog, insightsDeckCatalogDir } from '@/lib/artifact-composer/catalogs/insights-deck'
import { insightsReportCatalog, insightsReportCatalogDir } from '@/lib/artifact-composer/catalogs/insights-report'
import { createCatalog as createGraphicLineDeck, graphicLineDeckCatalogDir } from '@/lib/artifact-composer/catalogs/graphic-line-deck'
import {
  createCatalog as createGraphicLineOverlays,
  graphicLineOverlaysCatalogDir
} from '@/lib/artifact-composer/catalogs/graphic-line-overlays'
import { createCatalog as createGraphicLineStills, graphicLineStillsCatalogDir } from '@/lib/artifact-composer/catalogs/graphic-line-stills'
import { createGlitchStillsCatalog, glitchCatalogDir } from '@/lib/artifact-composer/catalogs/glitch'
import { createManzanitasStillsCatalog, manzanitasCatalogDir } from '@/lib/artifact-composer/catalogs/manzanitas'
import { MANZANITAS_STEP_ORBIT } from '@/lib/manzanitas-composition'
import {
  auditGraphicLineRendered,
  type RenderedAuditViolation
} from '@/lib/artifact-composer/catalogs/graphic-line-shared/rendered-audit'

import { greenhouseCtaPainter, greenhouseSelectionPainter } from '../brand-surfaces/compose'
import { manzanitasChartPainter } from '../manzanitas/painters'

import { compareImages, loadPng } from '../frontend/lib/visual-diff'

const ROOT = process.cwd()

/** El home del catálogo lo declara el propio catálogo (Slice 1b: los assets viven con él). */

/**
 * Los catálogos que el gate fotografía. Cada uno escribe en SU carpeta de frames: así un catálogo
 * nuevo no puede pisar el baseline de otro, y el de `deck-axis` conserva su ruta histórica
 * (`templates/`) sin renombrar nada.
 *
 * Este es el harness real del Composer: compone cada plantilla con el payload sintético compartido
 * y captura el frame. Un harness web aparte sería una copia peor —y rompería la autocontención del
 * catálogo, que se sirve por `file://` con sus assets relativos.
 */
/**
 * Bytes sintéticos y DETERMINISTAS para los assets externos de los probes de La órbita (TASK-1919): la foto, los
 * íconos y las capas de la órbita llegan como `asset-ref:*` que en producción materializa quien compone. Un SVG
 * rasteriza igual en cada corrida (no hay foto real: ISSUE-122 no aplica) y no depende de archivos fuera de git.
 */
const svgDataUri = (svg: string): string => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const GRAPHIC_LINE_PROBE_ASSETS: Readonly<Record<string, string>> = {
  'plate:probe': svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1a2b"/><stop offset="1" stop-color="#3d5a73"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><circle cx="1320" cy="430" r="190" fill="#8aa1b4"/><rect x="1120" y="600" width="400" height="480" rx="120" fill="#5b7488"/></svg>'
  ),
  'icon:probe': svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="#ffffff" stroke-width="3"/></svg>'
  ),
  // El logo de un cliente (portadas de propuesta): un rótulo sintético, nunca la marca de un cliente real.
  'file:probe': svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="200" viewBox="0 0 460 200"><rect x="30" y="50" width="400" height="100" rx="50" fill="#ffffff"/></svg>'
  ),
  'layer:probe': svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><circle cx="1400" cy="540" r="300" fill="none" stroke="#36c8bf" stroke-width="4"/></svg>'
  )
}

const graphicLineProbe = <T extends object>(catalog: T) => ({ ...catalog, externalAssets: GRAPHIC_LINE_PROBE_ASSETS })

/**
 * Glitch (TASK-1923): una sola entrada para sus tres catálogos, que comparten carpeta y registry (el probe fotografía
 * las 26 plantillas con los mismos resolvers y el mismo hook de la falla). La foto de cada hueco llega como
 * `asset-ref:photo:probe`: un SVG sintético y determinista (nunca una foto real: ISSUE-122 no aplica). La falla en
 * bytes del probe es la del `example` de su slot (vacía): la geometría real la prueban los tests de la falla.
 */
const GLITCH_PROBE_ASSETS: Readonly<Record<string, string>> = {
  'photo:probe': svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#2f4258"/><rect x="120" y="140" width="320" height="220" rx="18" fill="#cfe4fa" fill-opacity="0.25"/><circle cx="820" cy="300" r="120" fill="#cfe4fa" fill-opacity="0.6"/><rect x="660" y="430" width="320" height="370" rx="110" fill="#cfe4fa" fill-opacity="0.45"/></svg>'
  )
}

/**
 * Marketing con Manzanitas (TASK-1939): una sola entrada para sus dos catálogos, que comparten carpeta y registry (el
 * probe fotografía las 18 plantillas con los mismos resolvers, el painter de gráficos y el hook del eslogan). La foto
 * llega como `asset-ref:photo:probe` (un SVG sintético, nunca una foto real: ISSUE-122 no aplica); la Lente y la órbita
 * del paso se pintan con `@efeoncepro/axis-graphic-line` sobre esa misma foto sintética, como lo hace el comando.
 */
const MANZANITAS_PROBE_PHOTO = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#0b1a2b"/><circle cx="540" cy="560" r="170" fill="#8aa1b4"/><rect x="330" y="760" width="420" height="590" rx="150" fill="#5b7488"/><rect x="0" y="1080" width="1080" height="270" fill="#1d2a38"/></svg>'
)

const MANZANITAS_PROBE_ASSETS: Readonly<Record<string, string>> = {
  'photo:probe': MANZANITAS_PROBE_PHOTO,
  'lens:probe': svgDataUri(
    lensRecipe('post', { photoId: 'photo', photoSrc: MANZANITAS_PROBE_PHOTO, alt: 'Foto sintética del probe', question: '', answer: '', line: 'engine', surface: 'dark' }).svg.replace(
      /<image data-axis-part="signature"[^>]*\/>/,
      ''
    )
  ),
  'orbit:probe': svgDataUri(orbitSvg({ width: 1080, height: 1350, circle: MANZANITAS_STEP_ORBIT, line: 'engine', surface: 'light', channel: 'social', halo: false }).svg)
}

const painters = { selectionPainter: greenhouseSelectionPainter, ctaPainter: greenhouseCtaPainter }

const PROBE_CATALOGS = [
  { catalog: deckAxisCatalog, dir: deckAxisCatalogDir, frameDir: 'templates' },
  { catalog: insightsDeckCatalog, dir: insightsDeckCatalogDir, frameDir: 'templates-insights-deck' },
  { catalog: insightsReportCatalog, dir: insightsReportCatalogDir, frameDir: 'templates-insights-report' },
  { catalog: graphicLineProbe(createGraphicLineDeck(painters)), dir: graphicLineDeckCatalogDir, frameDir: 'templates-graphic-line-deck' },
  { catalog: graphicLineProbe(createGraphicLineStills(painters)), dir: graphicLineStillsCatalogDir, frameDir: 'templates-graphic-line-stills' },
  {
    catalog: graphicLineProbe(createGraphicLineOverlays(painters)),
    dir: graphicLineOverlaysCatalogDir,
    frameDir: 'templates-graphic-line-overlays'
  },
  { catalog: { ...createGlitchStillsCatalog(), externalAssets: GLITCH_PROBE_ASSETS }, dir: glitchCatalogDir, frameDir: 'templates-glitch' },
  {
    catalog: { ...createManzanitasStillsCatalog({ chartPainter: manzanitasChartPainter }), externalAssets: MANZANITAS_PROBE_ASSETS },
    dir: manzanitasCatalogDir,
    frameDir: 'templates-manzanitas'
  }
]

type CatalogScope = 'all' | 'insights' | 'graphic-line' | 'glitch' | 'manzanitas'

const SCOPE_FRAME_PREFIXES: Record<Exclude<CatalogScope, 'all'>, string> = {
  insights: 'templates-insights-',
  'graphic-line': 'templates-graphic-line-',
  glitch: 'templates-glitch',
  manzanitas: 'templates-manzanitas'
}

const SCOPE_LABEL: Record<CatalogScope, string> = {
  all: 'el set completo',
  insights: 'Insights',
  'graphic-line': 'La órbita',
  glitch: 'Glitch',
  manzanitas: 'Marketing con Manzanitas'
}

const frameInScope = (frame: string, scope: CatalogScope): boolean =>
  scope === 'all' || frame.startsWith(SCOPE_FRAME_PREFIXES[scope])

/**
 * Las reglas de La órbita que sólo se ven renderizadas (D1: acento bajo 24 px; 3× en láminas de decisión) se miden
 * sobre cada probe de sus catálogos. Una violación aborta el render: no se congela ni se aprueba un frame que rompe
 * la norma, aunque coincida píxel a píxel con un baseline viejo.
 */
const renderedAuditFindings: { frame: string; violation: RenderedAuditViolation }[] = []

const catalogsInScope = (scope: CatalogScope) =>
  scope === 'all' ? PROBE_CATALOGS : PROBE_CATALOGS.filter(target => target.frameDir.startsWith(SCOPE_FRAME_PREFIXES[scope]))

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
const renderCatalogProbes = async (
  browser: Browser,
  outDir: string,
  targets: ReturnType<typeof catalogsInScope>
): Promise<string[]> => {
  const all: string[] = []

  for (const target of targets) {
    all.push(...(await renderOneCatalogProbes(browser, outDir, target)))
  }

  return all
}

const renderOneCatalogProbes = async (
  browser: Browser,
  outDir: string,
  target: (typeof PROBE_CATALOGS)[number]
): Promise<string[]> => {
  const registry = await loadRegistry({ templatesDir: target.dir })

  await fs.mkdir(path.join(outDir, target.frameDir), { recursive: true })

  const frames = await mapWithConcurrency(registry.templates, CONCURRENCY, async entry => {
    const contract = await loadTemplateContract({ templatesDir: target.dir }, registry, entry.name)

    const slide = {
      slideId: `probe-${entry.name}`,
      contentType: entry.contentTypes[0],
      template: entry.name,
      slots: synthesizeProbeSlots(contract)
    } as unknown as SlideSpec

    const rel = path.join(target.frameDir, `${entry.name}.png`)

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
      await fillSlide(page, path.join(target.dir, entry.prototype), slide, contract, target.catalog)
      await page.screenshot({ path: path.join(outDir, rel) })

      if (target.frameDir.startsWith(SCOPE_FRAME_PREFIXES['graphic-line'])) {
        for (const violation of await auditGraphicLineRendered(page, entry.contentTypes)) {
          renderedAuditFindings.push({ frame: rel, violation })
        }
      }
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

  const { slidePaths } = await composeArtifact(deckAxisCatalog, deckPlan, skyDir, {
    concurrency: CONCURRENCY
  })

  return slidePaths.map(slidePath => path.join('sky', path.basename(slidePath)))
}

/** Render completo o sólo los probes de Insights; el deck SKY pertenece al scope global. */
const renderAll = async (runDir: string, scope: CatalogScope = 'all'): Promise<string[]> => {
  await fs.rm(runDir, { recursive: true, force: true })
  await fs.mkdir(runDir, { recursive: true })

  const browser = await launchComposerBrowser()

  renderedAuditFindings.length = 0

  let frames: string[]

  try {
    const probeFrames = await renderCatalogProbes(browser, runDir, catalogsInScope(scope))
    const skyFrames = scope === 'all' ? await renderSkyDeck(runDir) : []

    frames = [...probeFrames, ...skyFrames].sort()
  } finally {
    await browser.close()
  }

  if (renderedAuditFindings.length > 0) {
    throw new Error(
      'La norma de La órbita falla sobre la lámina renderizada:\n' +
        renderedAuditFindings.map(({ frame, violation }) => `  - ${frame} · ${violation.rule}: ${violation.detail}`).join('\n') +
        '\n  Se corrige la plantilla o su token en AXIS; la regla no se relaja.'
    )
  }

  return frames
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

const selftest = async (scope: CatalogScope): Promise<number> => {
  console.log(`\n0a · Determinismo: componiendo ${SCOPE_LABEL[scope]} DOS veces…\n`)

  const runA = path.join(WORK_DIR, 'selftest-a')
  const runB = path.join(WORK_DIR, 'selftest-b')

  const framesA = await renderAll(runA, scope)
  const framesB = await renderAll(runB, scope)

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
- \`--freeze\` se niega a promover un frame cambiado que no esté declarado en la **sección nueva sin
  sellar** (la única entrada sin el marcador \`sealed-by-freeze\`). Una sección ya sellada no autoriza
  nada: cada promoción sella la suya y la próxima necesita una entrada propia.
- El marcador \`manifest-digest\` lo sella la promoción; el gate lo verifica. Editar el manifest o
  los PNG a mano, sin pasar por la promoción declarada, **también falla el gate**.
- El baseline se re-promueve **en el mismo PR** que declara el delta.

## 2026-07-12 — Baseline inicial (TASK-1393 · Slice 0)

- Congelado sobre el commit pre-refactor: 25 plantillas del catálogo (payload sintético compartido
  con \`template-composability.test.ts\`) + 15 láminas reales del deck SKY
  (\`docs/commercial/tenders/sky-blog-2026/deck-plan.json\`).
- Sin deltas: es la fotografía de partida que todo el refactor debe conservar a CERO píxeles.
`

const freeze = async (scope: CatalogScope): Promise<number> => {
  console.log(`\n0b/0d · Congelando baseline (${SCOPE_LABEL[scope]})…\n`)

  const runDir = path.join(WORK_DIR, 'freeze')
  const frames = await renderAll(runDir, scope)
  const nextManifest = await buildManifest(runDir, frames)
  const previous = await readManifest()

  if (scope !== 'all' && !previous) {
    console.error('✗ El freeze por catálogo requiere un baseline global previo para preservar los otros frames.\n')

    return 1
  }

  if (previous) {
    // Re-promoción: cada frame cambiado/nuevo/removido debe estar declarado en BASELINE_DELTAS.md.
    const deltasRaw = await fs.readFile(DELTAS_PATH, 'utf8').catch(() => '')
    const changed: string[] = []

    const allFrames = new Set(
      [...Object.keys(previous.frames), ...Object.keys(nextManifest.frames)].filter(frame => frameInScope(frame, scope))
    )

    for (const frame of allFrames) {
      if (previous.frames[frame] !== nextManifest.frames[frame]) changed.push(frame)
    }

    if (changed.length === 0) {
      console.log('✓ El baseline ya coincide con el render actual: nada que promover.\n')

      return 0
    }

    // Sólo cuenta la sección SIN SELLAR (la declaración de esta promoción). Un frame nombrado en una
    // sección ya sellada —de otra task, de otro mes— NO autoriza re-promoverlo: esa declaración ya
    // se consumió. Antes bastaba con que el nombre apareciera en cualquier parte del archivo, y un
    // cambio compartido re-promovió 10 frames aprobados sin que nadie los declarara (TASK-1928).
    const verdict = evaluatePromotion(deltasRaw, changed.sort(), frame => frameInScope(frame, scope))

    if (!verdict.ok) {
      console.error(verdict.message)

      return 1
    }

    if (verdict.declaredButUnchanged.length > 0) {
      console.warn(
        `  ⚠ Declarados en la sección pero sin cambio en este render (revisa que la entrada no mienta):\n` +
          verdict.declaredButUnchanged.map(frame => `    - ${frame}`).join('\n')
      )
    }

    console.log(
      `  Sección que se sella: ${verdict.section.heading.slice(3)}\n` +
        `  ${changed.length} frame(s) declarados en ella se re-promueven:\n${changed.map(f => `    - ${f}`).join('\n')}`
    )
  }

  // 🔴 El ledger VIVE DENTRO de `BASELINE_DIR`, y abajo hacemos `rm -r` de ese directorio. Hay que
  // leerlo ANTES del borrado: si se lee después, el `readFile` falla, cae al `INITIAL_DELTAS` y la
  // promoción **reescribe el ledger desde cero** — destruyendo la declaración que ella misma acaba
  // de exigir, y con ella las declaraciones YA COMMITEADAS de promociones anteriores.
  //
  // Es exactamente el "rebaseline silencioso" que este archivo existe para impedir, cometido por el
  // guardián. Mordió 4 veces el 2026-07-14 antes de que alguien mirara por qué.
  const deltasRaw = await fs.readFile(DELTAS_PATH, 'utf8').catch(() => INITIAL_DELTAS)

  // En freeze global reemplaza el set completo. El freeze por catálogo sólo toca sus PNGs y fusiona
  // sus hashes con el manifest previo: no rebaselina frames de otros catálogos por accidente.
  const finalManifest: BaselineManifest =
    scope === 'all' || !previous
      ? nextManifest
      : {
          surface: 'artifact-composer',
          frames: {
            ...Object.fromEntries(Object.entries(previous.frames).filter(([frame]) => !frameInScope(frame, scope))),
            ...nextManifest.frames
          }
        }

  if (scope === 'all') await fs.rm(BASELINE_DIR, { recursive: true, force: true })
  await fs.mkdir(BASELINE_DIR, { recursive: true })

  if (scope !== 'all' && previous) {
    const nextFrames = new Set(Object.keys(nextManifest.frames))

    for (const frame of Object.keys(previous.frames)) {
      if (frameInScope(frame, scope) && !nextFrames.has(frame)) {
        await fs.rm(path.join(BASELINE_DIR, frame), { force: true })
      }
    }
  }

  for (const frame of frames) {
    const target = path.join(BASELINE_DIR, frame)

    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.copyFile(path.join(runDir, frame), target)
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(finalManifest, null, 2)}\n`, 'utf8')

  const digest = manifestDigest(finalManifest)

  const digestSealed = DIGEST_MARKER.test(deltasRaw)
    ? deltasRaw.replace(DIGEST_MARKER, `<!-- manifest-digest: ${digest} -->`)
    : deltasRaw.replace('<!-- manifest-digest: PENDING -->', `<!-- manifest-digest: ${digest} -->`)

  // La sección consumida queda sellada: la próxima promoción necesita su propia entrada nueva.
  const sealed = sealUnsealedSections(digestSealed, digest)

  await fs.writeFile(DELTAS_PATH, sealed, 'utf8')

  console.log(`\n✓ Baseline congelado: ${frames.length} frame(s) de ${SCOPE_LABEL[scope]} → ${path.relative(ROOT, BASELINE_DIR)}`)
  console.log(`  manifest-digest sellado en BASELINE_DELTAS.md: ${digest.slice(0, 12)}…`)
  console.log('  Commitealo COMPLETO (PNGs + manifest + BASELINE_DELTAS.md) en el mismo PR.\n')

  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo default — EL GATE
// ─────────────────────────────────────────────────────────────────────────────

const gate = async (scope: CatalogScope): Promise<number> => {
  console.log(`\ncomposer:visual-gate · recomponiendo ${SCOPE_LABEL[scope]} y diffeando a CERO píxeles…\n`)

  const manifest = await readManifest()

  if (!manifest) {
    console.error(
      '✗ No existe baseline congelado. Corre primero:\n' +
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
  const currentFrames = await renderAll(runDir, scope)

  // 3 · El SET debe ser idéntico (una plantilla nueva/renombrada exige re-promoción declarada).
  const scopedManifestFrames = manifestFrames.filter(frame => frameInScope(frame, scope))
  const unexpected = currentFrames.filter(frame => !(frame in manifest.frames))
  const missingCurrent = scopedManifestFrames.filter(frame => !currentFrames.includes(frame))

  if (unexpected.length > 0 || missingCurrent.length > 0) {
    console.error(
      '✗ El set renderizado y el baseline no coinciden para este scope:\n' +
        [...unexpected.map(frame => `  - nuevo: ${frame}`), ...missingCurrent.map(frame => `  - ausente: ${frame}`)].join('\n') +
        '\n  Declaralo en BASELINE_DELTAS.md y re-promové con --freeze.\n'
    )

    return 1
  }

  // 4 · Diff a CERO píxeles.
  const diffs = await diffFrames(scopedManifestFrames, BASELINE_DIR, runDir, path.join(WORK_DIR, 'gate-diff'))
  const clean = printDiffTable(diffs)

  if (!clean) {
    console.error(
      '\n✗ REGRESIÓN VISUAL: el render actual difiere del baseline congelado.\n' +
        '  Si el cambio es intencional: declaralo lámina por lámina en BASELINE_DELTAS.md y corre --freeze.\n' +
        '  Si no lo es: acabás de atrapar la regresión que este gate existe para atrapar.\n'
    )

    return 1
  }

  console.log(`✓ ${scopedManifestFrames.length} frame(s) idénticos al baseline para ${scope} (0 píxeles de diferencia).\n`)

  return 0
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const catalogArg = args.find(arg => arg.startsWith('--catalog='))?.slice('--catalog='.length) ?? 'all'

  if (catalogArg !== 'all' && catalogArg !== 'insights' && catalogArg !== 'graphic-line' && catalogArg !== 'glitch' && catalogArg !== 'manzanitas') {
    console.error(`✗ Catálogo desconocido: ${catalogArg}. Usa --catalog=all, --catalog=insights, --catalog=graphic-line, --catalog=glitch o --catalog=manzanitas.\n`)
    process.exit(1)
  }

  const scope = catalogArg as CatalogScope

  let exitCode: number

  if (args.includes('--selftest')) exitCode = await selftest(scope)
  else if (args.includes('--freeze')) exitCode = await freeze(scope)
  else exitCode = await gate(scope)

  process.exit(exitCode)
}

main().catch(error => {
  console.error('\n✗', error instanceof Error ? error.stack ?? error.message : error, '\n')
  process.exit(1)
})
