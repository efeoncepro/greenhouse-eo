/**
 * Tender Deck Composer — el pipeline determinista.
 *
 * Este es el "resto determinista" del ADR (§5-ter): selector → validación → slot-fill → render.
 * NADA acá llama a un LLM. Los tres nodos de juicio (orquestador, chapter-author, verifier) viven
 * AGUAS ARRIBA y su salida es un `DeckPlan` — JSON puro. Este módulo lo consume.
 *
 * Por eso el `DeckPlan` es el artefacto auditable: se guarda, se versiona, se replaya. El PDF es
 * una derivación suya, no la fuente.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import type { DeckPlan, SlideSpec, SlotViolation, TemplateContract, TemplateName } from './contracts'
import { auditRegistry, findTemplate, selectTemplate, type DeckRegistry } from './selector'
import { launchComposerBrowser, mergeSlidePdfs, renderSlide } from './render'
import { validateDeck } from './validate'

export interface DeckAssets {
  /** Dir con `registry.json`, las plantillas `.html` y sus `*.slots.json`. */
  templatesDir: string
}

export class DeckValidationError extends Error {
  readonly violations: SlotViolation[]

  constructor(violations: SlotViolation[]) {
    const detail = violations
      .map(v => `  [${v.slideId} · ${v.template} · ${v.slot}] ${v.code}: ${v.message}`)
      .join('\n')

    super(`El deck no pasa la validación de slots (${violations.length} problema(s)):\n${detail}`)
    this.name = 'DeckValidationError'
    this.violations = violations
  }
}

export class MissingSlotContractError extends Error {
  constructor(template: TemplateName) {
    super(
      `La plantilla "${template}" no tiene contrato de slots (falta su *.slots.json). ` +
        `Sin contrato no se puede componer: el renderer sólo llena slots DECLARADOS.`
    )
    this.name = 'MissingSlotContractError'
  }
}

/**
 * El autor declara INTENCIÓN (`contentType`), nunca AUTORIDAD DE PRESENTACIÓN (`template`).
 * Un `DeckPlan` histórico que traiga `template` sólo es válido si coincide EXACTAMENTE con lo que
 * el selector deriva de su `contentType` — una discrepancia aborta (TASK-1393 Slice 1). Ninguna
 * ruta nueva acepta `template` como autoridad de un autor: usar `CompositionPlanInput`.
 */
export class TemplateAuthorityError extends Error {
  constructor(slideId: string, declared: TemplateName, selected: TemplateName) {
    super(
      `La lámina "${slideId}" declara template="${declared}", pero el selector del catálogo deriva ` +
        `"${selected}" para su contentType. El autor no elige plantilla: declara la intención ` +
        `(contentType + slots) y el catálogo resuelve.`
    )
    this.name = 'TemplateAuthorityError'
  }
}

export const loadRegistry = async (assets: DeckAssets): Promise<DeckRegistry> => {
  const raw = await fs.readFile(path.join(assets.templatesDir, 'registry.json'), 'utf8')
  const registry = JSON.parse(raw) as DeckRegistry

  const problems = auditRegistry(registry)

  if (problems.length > 0) {
    throw new Error(`El registry del deck está corrupto:\n  - ${problems.join('\n  - ')}`)
  }

  return registry
}

export const loadTemplateContract = async (
  assets: DeckAssets,
  registry: DeckRegistry,
  template: TemplateName
): Promise<TemplateContract> => {
  const entry = findTemplate(registry, template)

  if (!entry?.slotsRef) {
    throw new MissingSlotContractError(template)
  }

  const raw = await fs.readFile(path.join(assets.templatesDir, entry.slotsRef), 'utf8')

  return JSON.parse(raw) as TemplateContract
}

/**
 * Resuelve la plantilla de cada lámina desde su content-type. Determinista: es el lookup del
 * registry, no un juicio.
 */
export const planSlides = (
  registry: DeckRegistry,
  chapters: Array<{ slideId: string; contentType: string; slots: SlideSpec['slots'] }>
): SlideSpec[] =>
  chapters.map(chapter => ({
    slideId: chapter.slideId,
    contentType: chapter.contentType,
    template: selectTemplate(registry, chapter.contentType),
    slots: chapter.slots
  }))

export interface ComposeResult {
  deckPlan: DeckPlan
  slidePaths: string[]
  /** El entregable: un PDF de N páginas. */
  pdfPath: string
  pdfBytes: number
  /** Advertencias que NO frenan la composición, pero el humano debe ver antes de subir la oferta. */
  warnings: string[]
}

export interface ComposeOptions {
  /**
   * Cuántas láminas se renderizan a la vez. Cada una es una página de Chromium: subirlo acelera
   * (un deck de 25 láminas en serie son ~40s), pero cada página cuesta RAM. 4 es un punto sano.
   */
  concurrency?: number
  /**
   * Límite de tamaño del PDF, en MB.
   *
   * ⚠️ Esto NO es performance: en una licitación es **admisibilidad**. Los portales (Mercado Público,
   * Wherex) rechazan archivos sobre cierto peso, y una oferta que no sube queda fuera del proceso.
   * Default 20 MB, que es el techo típico. Ajustalo al que diga el RFP.
   */
  maxPdfMb?: number
}

const DEFAULT_CONCURRENCY = 4
const DEFAULT_MAX_PDF_MB = 20

/** Corre las tareas de a `limit` en paralelo, preservando el orden del resultado. */
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
 * Compone el deck: valida TODO antes de renderizar NADA.
 *
 * El orden importa. Validar lámina por lámina mientras se renderiza dejaría un deck a medio producir
 * cuando la lámina 7 falla — y un PDF parcial de una oferta es peor que ningún PDF: parece completo.
 * Se valida el deck entero, y si algo falla, no se emite nada.
 */
export const composeDeck = async (
  assets: DeckAssets,
  deckPlan: DeckPlan,
  outDir: string,
  options: ComposeOptions = {}
): Promise<ComposeResult> => {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const maxPdfMb = options.maxPdfMb ?? DEFAULT_MAX_PDF_MB

  const registry = await loadRegistry(assets)

  // Adaptador del DeckPlan histórico: si el plan trae `template`, debe ser EXACTAMENTE lo que el
  // selector deriva de su contentType. El autor nunca es autoridad de presentación.
  for (const slide of deckPlan.slides) {
    const selected = selectTemplate(registry, slide.contentType)

    if (slide.template !== selected) {
      throw new TemplateAuthorityError(slide.slideId, slide.template, selected)
    }
  }

  const contracts = new Map<TemplateName, TemplateContract>()

  for (const slide of deckPlan.slides) {
    if (contracts.has(slide.template)) continue

    contracts.set(slide.template, await loadTemplateContract(assets, registry, slide.template))
  }

  const violations = validateDeck(deckPlan.slides, contracts)

  if (violations.length > 0) {
    throw new DeckValidationError(violations)
  }

  await fs.mkdir(outDir, { recursive: true })

  // El DeckPlan se persiste JUNTO al render: es lo que permite el replay determinista.
  await fs.writeFile(path.join(outDir, 'deck-plan.json'), JSON.stringify(deckPlan, null, 2), 'utf8')

  // Launch determinista canónico: mismos slots → mismo píxel (ver `launchComposerBrowser`).
  const browser = await launchComposerBrowser()

  try {
    const rendered = await mapWithConcurrency(deckPlan.slides, concurrency, async (slide, index) => {
      const contract = contracts.get(slide.template)!
      const entry = findTemplate(registry, slide.template)!
      const templateHtmlPath = path.join(assets.templatesDir, entry.prototype)
      const stem = path.join(outDir, `${String(index + 1).padStart(2, '0')}-${slide.slideId}`)

      // El PNG es para revisión visual; el PDF (vectorial) es lo que se ensambla en el entregable.
      await renderSlide(browser, templateHtmlPath, slide, contract, { kind: 'png', outPath: `${stem}.png` })
      await renderSlide(browser, templateHtmlPath, slide, contract, { kind: 'pdf', outPath: `${stem}.pdf` })

      return { png: `${stem}.png`, pdf: `${stem}.pdf` }
    })

    const pdfPath = path.join(outDir, `${deckPlan.tenderId}.pdf`)

    await mergeSlidePdfs(
      rendered.map(slide => slide.pdf),
      pdfPath
    )

    const { size: pdfBytes } = await fs.stat(pdfPath)
    const warnings: string[] = []
    const pdfMb = pdfBytes / 1_048_576

    if (pdfMb > maxPdfMb) {
      warnings.push(
        `El PDF pesa ${pdfMb.toFixed(1)} MB y supera el límite de ${maxPdfMb} MB. ` +
          `En una licitación esto es ADMISIBILIDAD, no performance: si el portal rechaza el archivo, ` +
          `la oferta queda fuera. Causa habitual: el merge no deduplica imágenes — un asset repetido ` +
          `en N láminas se embebe N veces. Bajá el peso de los assets o dividí el deck.`
      )
    }

    return { deckPlan, slidePaths: rendered.map(slide => slide.png), pdfPath, pdfBytes, warnings }
  } finally {
    await browser.close()
  }
}
