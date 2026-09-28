/**
 * pnpm glitch:compose -- --manifest <edicion.json> [--out <dir>] [--only carousel,stills,overlays] [--check-published]
 *
 * Compone una edición de Glitch con el Artifact Composer (TASK-1923). Sólo Glitch. También compone un GLITCH FLASH
 * (manifiesto con `edition.kind: 'flash'`, operador 2026-09-28): carrusel de tres láminas (portada, la noticia,
 * contraportada), Threads y los banners del blog, sin número de edición ni rotación. Mismo contrato de salidas; los
 * archivos se llaman `glitch-flash-<slug>-*` y la procedencia declara `editionKind: "flash"`.
 *
 *   manifiesto → `planGlitchEdition` (portada por rotación, contrato efeonce.glitch-line) → fotos materializadas al
 *   tamaño exacto de su hueco → falla en bytes calculada sobre la foto ya procesada → carrusel (PDF), piezas sueltas
 *   (PNG) y overlays del video (PNG con alfa) → manifiestos resueltos y la procedencia de la edición.
 *
 * Qué hace además del plan:
 *   - Lee el tamaño de cada foto para que el mapper lleve rostros y lente al recorte del hueco (`fitRegion`).
 *   - La licencia de Guttery la dice el brand pack (`fonts.json`, extensión glitch, `embedRights`): sin ella, la
 *     muletilla del narrador no se compone (`font-license-missing`).
 *   - Verifica el carrusel contra los límites de LinkedIn para documentos (peso, páginas, tamaño de página único) y
 *     falla con `carousel-too-heavy` antes de entregar un PDF que la plataforma rechazaría.
 *   - La procedencia (`glitch-<n>.provenance.json`) no lleva fechas: la misma edición produce el mismo archivo. Si una
 *     foto del Flash sale con la excepción de prensa aprobada, la procedencia la registra en `licenseExceptions`.
 *   - Numeración contra lo PUBLICADO (fuente de verdad: el blog, `pnpm glitch:editions`): con `--check-published`, una
 *     edición semanal cuyo número ya está publicado falla con `edition-number-already-published` (y sin respuesta del
 *     blog, con `published-editions-unavailable`). Sin el flag, la verificación es de mejor esfuerzo: sólo avisa. Un
 *     manifiesto de ejemplo (`example: true`, nunca se publica) no consulta el blog salvo que se pida el flag.
 *
 * Es el taller local. La ruta productiva (API + artifact-worker + MCP) es TASK-1921.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'


import { composeArtifact } from '@/lib/artifact-composer'
import { resolvePlan } from '@/lib/artifact-composer/catalog'
import { GLITCH_CATALOG_FACTORIES } from '@/lib/artifact-composer/catalogs/glitch'
import {
  attachFractures,
  checkGlitchEditionNumber,
  fetchPublishedGlitchEditions,
  GlitchPieceError,
  isGlitchFlashPlan,
  planGlitchManifest,
  type GlitchCatalogPlan
} from '@/lib/glitch-composition'
import { materializeGlitchAssets } from '@/lib/glitch-composition/materialize'

import { glitchAxisVersions } from './glitch-tokens'
import { toGlitchPieceError } from './errors'
import { checkCarouselForLinkedIn, LINKEDIN_DOCUMENT_LIMITS } from './linkedin'

const ONLY = ['carousel', 'stills', 'overlays'] as const

type Only = (typeof ONLY)[number]

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`)

  return i === -1 ? undefined : process.argv[i + 1]
}

const sha256 = (buf: Buffer | string) => crypto.createHash('sha256').update(buf).digest('hex')

/**
 * El número de la edición semanal contra lo publicado en el blog. `strict` (`--check-published`) falla cerrado; sin él,
 * sólo avisa (y un ejemplo ni consulta). Nada de esto entra a la procedencia: el blog cambia, la edición no.
 */
const verifyPublishedNumbering = async (number: number, { strict, example }: { strict: boolean; example: boolean }) => {
  if (!strict && example) {
    console.log(`ℹ Manifiesto de ejemplo: el #${number} no se verifica contra lo publicado (usa --check-published para verificarlo).`)

    return
  }

  let check: ReturnType<typeof checkGlitchEditionNumber>
  let last: number | null

  try {
    const published = await fetchPublishedGlitchEditions({ timeoutMs: strict ? 10_000 : 5_000 })

    check = checkGlitchEditionNumber(number, published)
    last = published.lastNumber
  } catch (error) {
    if (strict) throw error

    const reason = error instanceof GlitchPieceError ? error.message : String(error)

    console.warn(`⚠ No se pudo verificar la numeración contra lo publicado: ${reason} Usa --check-published para exigirla.`)

    return
  }

  for (const warning of check.warnings) console.warn(`⚠ ${warning}`)

  if (check.issue) {
    if (strict) throw new GlitchPieceError(`El #${number} no es la próxima edición: el blog ya la publicó.`, 'edition-number-already-published', [check.issue])

    console.warn(`⚠ [${check.issue.code}] ${check.issue.message}. Usa --check-published para bloquear.`)

    return
  }

  if (check.status === 'ok') console.log(`✓ Numeración: el #${number} sigue a la última publicada (#${last}).`)
}

/** La licencia de Guttery, tal como la declara el brand pack (sello por checksum). */
const narratorFont = () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve('src/lib/artifact-composer/brand-packs/axis/fonts.json'), 'utf8')) as {
    fonts: { family: string; sha256: string; embedRights?: boolean; extension?: string }[]
  }

  const guttery = manifest.fonts.find((f) => f.family === 'Guttery' && f.extension === 'glitch')

  return { status: guttery?.embedRights ? ('licensed' as const) : ('pending' as const), sha256: guttery?.sha256 ?? null }
}

/**
 * El PDF entregado es reproducible: sus fechas internas son la fecha de publicación de la edición (no el reloj del
 * render), así la misma edición da el mismo archivo y la procedencia puede sellarlo.
 */
const stablePdf = async (pdf: Buffer, title: string, publishDate = '1970-01-01') => {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false })
  const date = new Date(`${publishDate}T12:00:00Z`)

  doc.setTitle(title)
  doc.setAuthor('Efeonce')
  doc.setCreator('pnpm glitch:compose')
  doc.setProducer('Artifact Composer · Glitch')
  doc.setCreationDate(date)
  doc.setModificationDate(date)

  return Buffer.from(await doc.save({ useObjectStreams: false }))
}

const main = async () => {
  const manifestPath = arg('manifest')

  if (!manifestPath) {
    console.error('Uso: pnpm glitch:compose -- --manifest <edicion.json> [--out <dir>] [--only carousel,stills,overlays] [--check-published]')
    process.exit(2)
  }

  const checkPublished = process.argv.includes('--check-published')
  const only = new Set((arg('only') ?? ONLY.join(',')).split(',').map((s) => s.trim()) as Only[])
  const unknown = [...only].filter((o) => !ONLY.includes(o))

  if (unknown.length > 0) throw new Error(`--only no reconoce: ${unknown.join(', ')} (usa ${ONLY.join(', ')}).`)

  const raw = fs.readFileSync(manifestPath)
  const manifestDir = path.dirname(path.resolve(manifestPath))

  const input = JSON.parse(raw.toString('utf8')) as {
    edition?: { number?: number; publishDate?: string; kind?: string; slug?: string }
    news?: { photo?: { file?: string } }[]
    cover?: { photo?: { file?: string } | null }
    video?: { hostPhoto?: { file?: string } | null } | null
  }

  const number = input.edition?.number ?? 'x'
  const out = path.resolve(arg('out') ?? (input.edition?.kind === 'flash' ? `.captures/glitch/flash-${input.edition.slug ?? 'x'}` : `.captures/glitch/edicion-${number}`))

  // 1. Tamaño original de cada foto: el mapper lleva rostros y lente al recorte del hueco.
  const files = [...new Set([...(input.news ?? []).map((n) => n.photo?.file), input.cover?.photo?.file, input.video?.hostPhoto?.file].filter((f): f is string => Boolean(f)))]
  const sources = new Map<string, Buffer>()
  const photoSizes: Record<string, { width: number; height: number }> = {}

  for (const file of files) {
    const buf = fs.readFileSync(path.resolve(manifestDir, file))
    const meta = await sharp(buf).rotate().metadata()

    sources.set(file, buf)
    photoSizes[file] = { width: meta.autoOrient?.width ?? meta.width!, height: meta.autoOrient?.height ?? meta.height! }
  }

  // 2. El plan (portada por rotación + contrato AXIS). Falla cerrado antes de materializar nada.
  const narrator = narratorFont()
  const plan = planGlitchManifest(input, { narratorLicenseStatus: narrator.status, photoSizes })
  const flash = isGlitchFlashPlan(plan) ? plan : null
  const fileBase = flash ? `glitch-flash-${flash.slug}` : `glitch-${plan.edition}`
  const title = flash ? flash.title : `Glitch #${plan.edition}`

  // 2b. La numeración de la semanal la manda el blog (lo publicado), no el composer. El Flash no lleva número.
  if (isGlitchFlashPlan(plan)) {
    if (checkPublished) console.log('ℹ Un Glitch Flash no lleva número de edición: --check-published no aplica.')
  } else {
    await verifyPublishedNumbering(plan.edition, { strict: checkPublished, example: Boolean((input as { example?: boolean }).example) })
  }

  // 3. Fotos al tamaño exacto de su hueco + la falla calculada sobre la foto ya procesada (materializador compartido
  //    con el artifact-worker: aquí la fuente es el disco).
  const { externalAssets, cellsBySlide, log: assetLog } = await materializeGlitchAssets(plan.assets, async (file) => {
    const bytes = sources.get(file)

    if (!bytes) throw new Error(`La foto ${file} no está en el manifiesto.`)

    return { bytes, mimeType: null }
  })

  // 4. Render de los tres catálogos (cada uno valida su plan entero antes de pintar nada).
  fs.mkdirSync(out, { recursive: true })

  const outputs: Record<string, unknown> = {}

  const compose = async (key: Only, target: GlitchCatalogPlan, dir: string) => {
    if (!only.has(key) || target.plan.slides.length === 0) return null

    const catalog = GLITCH_CATALOG_FACTORIES[target.catalog]()
    const planWithBytes = attachFractures(target.plan, cellsBySlide)
    const resolved = await resolvePlan(catalog, planWithBytes)
    const deckPlan = { tenderId: planWithBytes.artifactId, slides: resolved.slides.map((s) => ({ slideId: s.slideId, contentType: s.contentType, template: s.template, slots: s.slots })) }
    const result = await composeArtifact(catalog, deckPlan, path.join(out, dir), { externalAssets, maxPdfMb: 100 })

    for (const w of result.warnings) console.warn(`⚠ ${w}`)

    const pngs = result.slidePaths.map((p) => ({ file: path.relative(out, p), sha256: sha256(fs.readFileSync(p)) }))

    outputs[key] = { catalog: target.catalog, templates: resolved.slides.map((s) => `${s.slideId}:${s.template}`), manifestSha256: sha256(JSON.stringify(resolved)), pngs }

    return result
  }

  const carousel = await compose('carousel', plan.carousel, 'carrusel')

  if (carousel?.pdfPath) {
    const pdf = await stablePdf(fs.readFileSync(carousel.pdfPath), title, input.edition?.publishDate)
    const linkedin = await checkCarouselForLinkedIn(pdf)
    const final = path.join(out, `${fileBase}-carrusel.pdf`)

    fs.writeFileSync(final, pdf)
    Object.assign(outputs.carousel as object, { pdf: { file: path.relative(out, final), sha256: sha256(pdf), ...linkedin } })
  }

  await compose('stills', plan.stills, 'sueltas')
  await compose('overlays', plan.overlays, 'overlays')

  // 5. Procedencia de la edición: qué entró, qué la gobernó y qué salió. Sin reloj.
  const provenance = {
    schema: 'glitch.edition-provenance.v1',
    edition: plan.edition,
    // El Flash declara su formato y su slug; la semanal conserva exactamente su forma de siempre.
    ...(flash ? { editionKind: 'flash', slug: flash.slug } : {}),
    // Fotos de terceros publicadas con la excepción de prensa aprobada por pieza (sólo Flash; ausente si no hay).
    ...(flash && flash.licenseExceptions.length > 0 ? { licenseExceptions: flash.licenseExceptions } : {}),
    example: Boolean((input as { example?: boolean }).example),
    manifest: { file: path.basename(manifestPath), sha256: sha256(raw) },
    coverTemplate: plan.coverTemplate,
    axis: glitchAxisVersions(),
    narratorFont: { family: 'Guttery', status: narrator.status, sha256: narrator.sha256 },
    linkedinLimits: LINKEDIN_DOCUMENT_LIMITS,
    assets: assetLog,
    fractures: Object.fromEntries(Object.entries(cellsBySlide).map(([slideId, cells]) => [slideId, { cells: cells.length, sha256: sha256(JSON.stringify(cells)) }])),
    outputs
  }

  const provenancePath = path.join(out, `${fileBase}.provenance.json`)

  fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`)
  console.log(flash ? `✓ ${title} → ${path.relative(process.cwd(), out)}` : `✓ Glitch #${plan.edition} (portada ${plan.coverTemplate}) → ${path.relative(process.cwd(), out)}`)
}

main().catch((raw: unknown) => {
  const error = toGlitchPieceError(raw)

  if (error) {
    console.error(`✗ [${error.code}] ${error.message}`)

    for (const issue of error.issues) console.error(`  - [${issue.code}]${issue.path ? ` ${issue.path}` : ''}: ${issue.message}`)

    process.exit(1)
  }

  console.error(raw)
  process.exit(1)
})
