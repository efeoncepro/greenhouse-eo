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

import { chromium } from 'playwright'

import type { DeckPlan, SlideSpec, SlotViolation, TemplateContract, TemplateName } from './contracts'
import { auditRegistry, findTemplate, selectTemplate, type DeckRegistry } from './selector'
import { renderSlide } from './render'
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
}

/**
 * Compone el deck: valida TODO antes de renderizar NADA.
 *
 * El orden importa. Validar lámina por lámina mientras se renderiza dejaría un deck a medio
 * producir cuando la lámina 7 falla — y un PDF parcial de una oferta es peor que ningún PDF: parece
 * completo. Se valida el deck entero, y si algo falla, no se emite nada.
 */
export const composeDeck = async (
  assets: DeckAssets,
  deckPlan: DeckPlan,
  outDir: string
): Promise<ComposeResult> => {
  const registry = await loadRegistry(assets)

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

  const browser = await chromium.launch()
  const slidePaths: string[] = []

  try {
    for (const [index, slide] of deckPlan.slides.entries()) {
      const contract = contracts.get(slide.template)!
      const entry = findTemplate(registry, slide.template)!
      const templateHtmlPath = path.join(assets.templatesDir, entry.prototype)

      const outPath = path.join(outDir, `${String(index + 1).padStart(2, '0')}-${slide.slideId}.png`)

      await renderSlide(browser, templateHtmlPath, slide, contract, { kind: 'png', outPath })

      slidePaths.push(outPath)
    }
  } finally {
    await browser.close()
  }

  return { deckPlan, slidePaths }
}
