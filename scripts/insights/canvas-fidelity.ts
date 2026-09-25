/**
 * TASK-1889 — gate de fidelidad al canvas aprobado.
 *
 *   pnpm insights:canvas-fidelity                      # todas las plantillas con fixture del canvas
 *   pnpm insights:canvas-fidelity --only=Portada       # sólo las referencias que contengan «Portada»
 *   pnpm insights:canvas-fidelity --gray               # además, la hoja en escala de grises
 *
 * Qué mide: cada plantilla de `insights-report` / `insights-deck`, compuesta con un fixture que trae
 * los MISMOS datos de ejemplo que su página del canvas, contra la página aprobada a tamaño nativo
 * (`docs/ui/visual-directions/TASK-1889-.../paginas/<Board>.png`). `pixelmatch` con umbral 0,1;
 * criterio ≤ 1 % de píxeles distintos por página (contrato de fidelidad de la task).
 *
 * Por qué por el camino real: el fixture se valida contra el contrato de slots, se llena en el DOM de
 * Chromium con el mismo `fillSlide` que usa el worker y se mide con `assertSlideFitsCanvas`. Una
 * plantilla que sólo se parece al canvas cuando se abre a mano no cuenta.
 *
 * Los fixtures viven FUERA de los catálogos (`scripts/insights/canvas-fixtures/`): viajan al worker
 * los catálogos, no los datos de ejemplo. Nunca se usan en producción.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import sharp from 'sharp'

import {
  assertSlideFitsCanvas,
  fillSlide,
  launchComposerBrowser,
  loadRegistry,
  loadTemplateContract,
  validateSlide,
  type ArtifactCatalog,
  type SlideSpec,
  type SlotValues
} from '@/lib/artifact-composer'
import { insightsDeckCatalog } from '@/lib/artifact-composer/catalogs/insights-deck'
import { insightsReportCatalog } from '@/lib/artifact-composer/catalogs/insights-report'

const ROOT = process.cwd()
const FIXTURES_DIR = path.join(ROOT, 'scripts/insights/canvas-fixtures')
const REFERENCE_DIR = path.join(ROOT, 'docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas')
const REVIEW_DIR = path.join(ROOT, 'docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/fidelity')
const WORK_DIR = path.join(ROOT, '.captures/insights-canvas-fidelity')

/** Criterio del contrato: ≤ 1 % de píxeles distintos por página. */
export const MAX_DIFF_RATIO = 0.01

const CATALOGS: Record<string, ArtifactCatalog> = {
  report: insightsReportCatalog,
  deck: insightsDeckCatalog
}

interface CanvasFixture {
  /**
   * Página del canvas (`paginas/<reference>.png`). `null` = pieza que el canvas NO diseñó (portada,
   * apertura y contraportada del deck): se renderiza para revisión del operador, sin medición.
   */
  reference: string | null
  /** Nombre del render cuando no hay referencia (`derivada-<nombre>.png` en el dossier). */
  name?: string
  /** Catálogo: `report` (A4) o `deck` (16:9). */
  catalog: keyof typeof CATALOGS
  contentType: string
  slots: SlotValues
  /** Diferencias conocidas y aceptadas, con su región (se copian al dossier). */
  knownDifferences?: string[]
}

interface FidelityRow {
  reference: string
  template: string
  changed: number
  total: number
  ratio: number
  pass: boolean
}

const readFixtures = async (only?: string): Promise<{ file: string; fixture: CanvasFixture }[]> => {
  const out: { file: string; fixture: CanvasFixture }[] = []

  for (const kind of Object.keys(CATALOGS)) {
    const dir = path.join(FIXTURES_DIR, kind)
    const files = await fs.readdir(dir).catch(() => [] as string[])

    for (const file of files.filter(name => name.endsWith('.json')).sort()) {
      const fixture = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as CanvasFixture

      if (only && !(fixture.reference ?? fixture.name ?? '').includes(only)) continue

      out.push({ file: path.join(dir, file), fixture })
    }
  }

  return out
}

/** Referencia | render, a tamaño nativo, con una franja de 24 px entre ambas. */
const sideBySide = async (reference: Buffer, render: Buffer, outPath: string, gray: boolean): Promise<void> => {
  const meta = await sharp(reference).metadata()
  const width = meta.width!
  const height = meta.height!
  const gap = 24

  const prep = (buffer: Buffer) => (gray ? sharp(buffer).grayscale().png().toBuffer() : Promise.resolve(buffer))

  await sharp({
    create: { width: width * 2 + gap, height, channels: 4, background: { r: 60, g: 64, b: 72, alpha: 1 } }
  })
    .composite([
      { input: await prep(reference), left: 0, top: 0 },
      { input: await prep(render), left: width + gap, top: 0 }
    ])
    .png()
    .toFile(outPath)
}

const main = async () => {
  const args = process.argv.slice(2)
  const only = args.find(arg => arg.startsWith('--only='))?.slice('--only='.length)
  const gray = args.includes('--gray')
  const fixtures = await readFixtures(only)

  if (fixtures.length === 0) {
    console.error('No hay fixtures del canvas que coincidan.')
    process.exit(1)
  }

  await fs.mkdir(WORK_DIR, { recursive: true })
  await fs.mkdir(REVIEW_DIR, { recursive: true })

  const browser = await launchComposerBrowser()
  const rows: FidelityRow[] = []

  try {
    for (const { file, fixture } of fixtures) {
      const catalog = CATALOGS[fixture.catalog]

      if (!catalog) throw new Error(`${file}: catálogo desconocido «${fixture.catalog}»`)

      const registry = await loadRegistry({ templatesDir: catalog.templatesDir })
      const entry = registry.templates.find(template => template.contentTypes.includes(fixture.contentType))

      if (!entry) throw new Error(`${file}: ningún template del catálogo sirve «${fixture.contentType}»`)

      const contract = await loadTemplateContract({ templatesDir: catalog.templatesDir }, registry, entry.name)

      const slide: SlideSpec = {
        slideId: `canvas-${fixture.reference ?? fixture.name}`,
        contentType: fixture.contentType,
        template: entry.name,
        slots: fixture.slots
      }

      const violations = validateSlide(slide, contract)

      if (violations.length > 0) {
        throw new Error(
          `${file}: el fixture no cumple el contrato de ${entry.name}:\n` +
            violations.map(v => `  - ${v.slot}: ${v.message}`).join('\n')
        )
      }

      const page = await browser.newPage({ viewport: contract.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' })
      let render: Buffer

      try {
        await fillSlide(page, path.join(catalog.templatesDir, entry.prototype), slide, contract, catalog)
        await assertSlideFitsCanvas(page, slide, contract)
        render = await page.screenshot()
      } finally {
        await page.close()
      }

      if (fixture.reference === null) {
        const name = `derivada-${fixture.name ?? entry.name}`

        await fs.writeFile(path.join(REVIEW_DIR, `${name}.png`), render)
        console.log(`· ${name.padEnd(34)} ${entry.name.padEnd(28)} sin referencia: revisión del operador`)
        continue
      }

      const referencePath = path.join(REFERENCE_DIR, `${fixture.reference}.png`)
      const reference = await fs.readFile(referencePath)
      const a = PNG.sync.read(render)
      const b = PNG.sync.read(reference)

      if (a.width !== b.width || a.height !== b.height) {
        throw new Error(`${fixture.reference}: el render mide ${a.width}×${a.height} y la referencia ${b.width}×${b.height}`)
      }

      const diff = new PNG({ width: a.width, height: a.height })
      const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
      const total = a.width * a.height
      const ratio = changed / total

      await fs.writeFile(path.join(WORK_DIR, `${fixture.reference}.render.png`), render)
      await fs.writeFile(path.join(WORK_DIR, `${fixture.reference}.diff.png`), PNG.sync.write(diff))
      await sideBySide(reference, render, path.join(REVIEW_DIR, `${fixture.reference}.png`), false)

      if (gray) await sideBySide(reference, render, path.join(REVIEW_DIR, `${fixture.reference}.gris.png`), true)

      const pass = ratio <= MAX_DIFF_RATIO

      rows.push({ reference: fixture.reference, template: entry.name, changed, total, ratio, pass })
      console.log(
        `${pass ? '✓' : '✗'} ${fixture.reference.padEnd(34)} ${entry.name.padEnd(28)} ` +
          `${String(changed).padStart(7)} px  ${(ratio * 100).toFixed(3)} %`
      )
    }
  } finally {
    await browser.close()
  }

  // La tabla del dossier se reescribe con las filas medidas; las que no se midieron en esta corrida
  // (--only) se conservan desde la tabla anterior.
  const tablePath = path.join(REVIEW_DIR, 'fidelity.json')
  const previous = JSON.parse(await fs.readFile(tablePath, 'utf8').catch(() => '{"rows":[]}')) as { rows: FidelityRow[] }
  const merged = new Map(previous.rows.map(row => [row.reference, row] as const))

  for (const row of rows) merged.set(row.reference, row)

  const sorted = [...merged.values()].sort((x, y) => x.reference.localeCompare(y.reference))

  await fs.writeFile(
    tablePath,
    `${JSON.stringify({ criterion: `≤ ${MAX_DIFF_RATIO * 100} % de píxeles distintos (pixelmatch, umbral 0,1)`, rows: sorted }, null, 2)}\n`
  )

  const failed = rows.filter(row => !row.pass)

  if (failed.length > 0) {
    console.error(`\n✗ ${failed.length} página(s) sobre el ${MAX_DIFF_RATIO * 100} %: ${failed.map(r => r.reference).join(', ')}`)
    process.exit(1)
  }

  console.log(`\n✓ ${rows.length} página(s) dentro del ${MAX_DIFF_RATIO * 100} %.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
