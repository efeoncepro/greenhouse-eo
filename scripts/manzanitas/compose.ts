/**
 * pnpm manzanitas:compose -- --intent <pieza.json> [--out <dir>] [--only carousel,stills]
 *
 * Compone una pieza de Marketing con Manzanitas con el Artifact Composer (TASK-1939). Sólo MCM: el registro complementa
 * La órbita y nunca se mezcla con Glitch.
 *
 *   intent del contrato `efeonce.manzanitas-register` → `planManzanitasIntent` (resuelve con el contrato y falla cerrado
 *   con sus códigos) → fotos al tamaño del lienzo, la Lente de La órbita con la foto adentro y la órbita del paso →
 *   carrusel (PDF) y láminas sueltas (PNG) → manifiestos resueltos y la procedencia de la pieza.
 *
 * El intent es el del contrato más dos campos por lámina: `photo.path` (la foto real, relativa al archivo del intent) y
 * los rótulos del gráfico (`chart.caption`, `figureLabel`, `columnLabels`, `keyLabels`, `rateHeader`).
 *
 * Qué hace además del plan:
 *   - Pinta los gráficos con `manzanitasChartSvg` y corre los chequeos del registro sobre cada uno (`painters.ts`).
 *   - Verifica el carrusel contra los límites de LinkedIn para documentos y falla con `carousel-too-heavy` antes de
 *     entregar un PDF que la plataforma rechazaría.
 *   - La procedencia (`<artifactId>.provenance.json`) no lleva fechas: el mismo intent produce el mismo archivo.
 *
 * Es el taller local. No publica ni agenda: la pieza sale para revisión humana.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { PDFDocument } from 'pdf-lib'

import { composeArtifact } from '@/lib/artifact-composer'
import { resolvePlan } from '@/lib/artifact-composer/catalog'
import { MANZANITAS_CATALOG_FACTORIES } from '@/lib/artifact-composer/catalogs/manzanitas'
import { ManzanitasPieceError, planManzanitasIntent, type ManzanitasCatalogPlan } from '@/lib/manzanitas-composition'
import { materializeManzanitasAssets } from '@/lib/manzanitas-composition/materialize'

import { toManzanitasPieceError } from './errors'
import { manzanitasAxisVersions } from './manzanitas-tokens'
import { manzanitasChartPainter } from './painters'

const ONLY = ['carousel', 'stills'] as const

type Only = (typeof ONLY)[number]

/**
 * Límites de LinkedIn para documentos (el carrusel se sube como documento). Fuente: LinkedIn Help, «Upload and share
 * documents on LinkedIn» (https://www.linkedin.com/help/linkedin/answer/a518909), verificado el 2026-09-27.
 */
export const LINKEDIN_DOCUMENT_LIMITS = { maxBytes: 100 * 1024 * 1024, maxPages: 300, uniformPageSize: true, source: 'https://www.linkedin.com/help/linkedin/answer/a518909', verifiedOn: '2026-09-27' } as const

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`)

  return i === -1 ? undefined : process.argv[i + 1]
}

const sha256 = (buf: Buffer | string) => crypto.createHash('sha256').update(buf).digest('hex')

const checkCarouselForLinkedIn = async (pdf: Buffer) => {
  const doc = await PDFDocument.load(pdf)
  const sizes = new Set(doc.getPages().map((p) => `${Math.round(p.getWidth())}x${Math.round(p.getHeight())}`))
  const measured = { bytes: pdf.length, pages: doc.getPageCount(), pageSizes: [...sizes] }
  const problems: string[] = []

  if (measured.bytes > LINKEDIN_DOCUMENT_LIMITS.maxBytes) problems.push(`pesa ${(measured.bytes / 1_048_576).toFixed(1)} MB (máximo 100 MB)`)
  if (measured.pages > LINKEDIN_DOCUMENT_LIMITS.maxPages) problems.push(`tiene ${measured.pages} páginas (máximo 300)`)
  if (sizes.size > 1) problems.push(`mezcla tamaños de página (${measured.pageSizes.join(', ')})`)

  if (problems.length > 0) {
    throw new ManzanitasPieceError(`El carrusel no se puede subir a LinkedIn como documento: ${problems.join('; ')}.`, 'carousel-too-heavy', problems.map((message) => ({ code: 'carousel-too-heavy', message })))
  }

  return measured
}

/** El PDF entregado es reproducible: fechas internas fijas (no el reloj del render), así la procedencia lo sella. */
const stablePdf = async (pdf: Buffer, title: string) => {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false })
  const date = new Date('1970-01-01T12:00:00Z')

  doc.setTitle(title)
  doc.setAuthor('Efeonce')
  doc.setCreator('pnpm manzanitas:compose')
  doc.setProducer('Artifact Composer · Marketing con Manzanitas')
  doc.setCreationDate(date)
  doc.setModificationDate(date)

  return Buffer.from(await doc.save({ useObjectStreams: false }))
}

const main = async () => {
  const intentPath = arg('intent')

  if (!intentPath) {
    console.error('Uso: pnpm manzanitas:compose -- --intent <pieza.json> [--out <dir>] [--only carousel,stills]')
    process.exit(2)
  }

  const only = new Set((arg('only') ?? ONLY.join(',')).split(',').map((s) => s.trim()) as Only[])
  const unknown = [...only].filter((o) => !ONLY.includes(o))

  if (unknown.length > 0) throw new Error(`--only no reconoce: ${unknown.join(', ')} (usa ${ONLY.join(', ')}).`)

  const raw = fs.readFileSync(intentPath)
  const intentDir = path.dirname(path.resolve(intentPath))
  let intent: Parameters<typeof planManzanitasIntent>[0]

  try {
    intent = JSON.parse(raw.toString('utf8'))
  } catch (error) {
    throw new ManzanitasPieceError(`El intent no es JSON válido: ${(error as Error).message}`, 'intent-invalid')
  }

  // 1. Plan: el contrato resuelve y decide piezas, superficies, «Desliza», cabecera y firma. Nada se elige a mano.
  const plan = planManzanitasIntent(intent)
  const artifactId = plan.stills.plan.artifactId
  const out = path.resolve(arg('out') ?? `.captures/manzanitas/${artifactId}`)

  // 2. Assets: fotos al lienzo exacto, la Lente con la foto adentro y la órbita del paso, como data URI.
  const { externalAssets, log: assetLog } = await materializeManzanitasAssets(plan.assets, async (file) => {
    const resolved = path.resolve(intentDir, file)

    if (!fs.existsSync(resolved)) throw new ManzanitasPieceError(`La foto ${file} no existe.`, 'photo-missing', [{ code: 'photo-missing', message: `No se encontró ${resolved}.` }])

    return { bytes: fs.readFileSync(resolved), mimeType: null }
  })

  fs.mkdirSync(out, { recursive: true })

  const outputs: Record<string, unknown> = {}

  // 3. Render de cada catálogo (cada uno valida su plan entero antes de pintar nada).
  const compose = async (key: Only, target: ManzanitasCatalogPlan | null, dir: string) => {
    if (!target || !only.has(key) || target.plan.slides.length === 0) return null

    const catalog = MANZANITAS_CATALOG_FACTORIES[target.catalog]({ chartPainter: manzanitasChartPainter })
    const resolved = await resolvePlan(catalog, target.plan)
    const deckPlan = { tenderId: target.plan.artifactId, slides: resolved.slides.map((s) => ({ slideId: s.slideId, contentType: s.contentType, template: s.template, slots: s.slots })) }
    const result = await composeArtifact(catalog, deckPlan, path.join(out, dir), { externalAssets, maxPdfMb: 100 })

    for (const w of result.warnings) console.warn(`⚠ ${w}`)

    const pngs = result.slidePaths.map((p) => ({ file: path.relative(out, p), sha256: sha256(fs.readFileSync(p)) }))

    outputs[key] = { catalog: target.catalog, templates: resolved.slides.map((s) => `${s.slideId}:${s.template}`), manifestSha256: sha256(JSON.stringify(resolved)), pngs }

    return result
  }

  const carousel = await compose('carousel', plan.carousel, 'carrusel')

  if (carousel?.pdfPath) {
    const pdf = await stablePdf(fs.readFileSync(carousel.pdfPath), `Marketing con Manzanitas · ${artifactId}`)
    const linkedin = await checkCarouselForLinkedIn(pdf)
    const final = path.join(out, `${artifactId}-carrusel.pdf`)

    fs.writeFileSync(final, pdf)
    Object.assign(outputs.carousel as object, { pdf: { file: path.relative(out, final), sha256: sha256(pdf), ...linkedin } })
  }

  await compose('stills', plan.stills, 'sueltas')

  // 4. Procedencia de la pieza: qué entró, qué la gobernó y qué salió. Sin reloj.
  const provenance = {
    schema: 'manzanitas.piece-provenance.v1',
    artifactId,
    channel: plan.channel,
    topicLine: plan.topicLine,
    intent: { file: path.basename(intentPath), sha256: sha256(raw) },
    axis: manzanitasAxisVersions(),
    linkedinLimits: plan.carousel ? LINKEDIN_DOCUMENT_LIMITS : undefined,
    assets: assetLog,
    outputs
  }

  fs.writeFileSync(path.join(out, `${artifactId}.provenance.json`), `${JSON.stringify(provenance, null, 2)}\n`)
  console.log(`✓ Marketing con Manzanitas · ${artifactId} (${plan.channel}, línea ${plan.topicLine}) → ${path.relative(process.cwd(), out)}`)
}

main().catch((raw: unknown) => {
  const error = toManzanitasPieceError(raw)

  if (error) {
    console.error(`✗ [${error.code}] ${error.message}`)

    for (const issue of error.issues) console.error(`  - [${issue.code}]${issue.path ? ` ${issue.path}` : ''}: ${issue.message}`)

    process.exit(1)
  }

  console.error(raw)
  process.exit(1)
})
