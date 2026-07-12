/**
 * Artifact Composer — el CONTRATO de catálogo (TASK-1393 Slice 2).
 *
 * Un catálogo es DATO, no una rama del motor: plantillas + registry + resolvers + validadores +
 * output target + dueño. La regla que define a esta task: **agregar un catálogo nuevo no toca un
 * archivo del motor** — un carrusel 4:5 → PNG set es un directorio con este contrato, no un fork.
 *
 * También vive acá `resolvePlan`: la única fábrica del `ResolvedCompositionManifest`. El autor
 * (humano o agente) entrega `CompositionPlanInput` (intención); el catálogo elige plantilla vía su
 * selector, valida forma + semántica, y sella la resolución con hashes verificables. Lo que se
 * persiste/renderiza productivamente es el manifest — nunca el plan mutable.
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { Page } from 'playwright'

import type { DeckPlan, SlideSpec, TemplateContract, TemplateName } from './contracts'
import type { CompositionPlanInput, ManifestValidatorRun, ResolvedCompositionManifest, ResolvedCompositionSlide } from './plan'
import type { ResolverRegistry } from './resolver-contract'
import { auditRegistry, findTemplate, selectTemplate, type DeckRegistry } from './selector'
import { DeckValidationError, validateDeck, type SlideValidatorMap } from './validate'

/**
 * Destinos de salida del composer. El registry es EXTENSIBLE y FAIL-CLOSED:
 * - `pdf-merged` — un PDF de N páginas (el entregable de una propuesta). Implementado.
 * - `png-set`    — N PNG y NINGÚN PDF (un carrusel social). Implementado.
 * - `pptx-native` / `adobe-express-rest` — destinos ACEPTADOS por ADR (2026-07-12) pero NO
 *   implementados: declararlos ABORTA con `UnimplementedOutputTargetError`, nunca cae en silencio
 *   a PDF. TASK-1395/TASK-1396 los llenan.
 */
export type OutputTarget = 'pdf-merged' | 'png-set' | 'pptx-native' | 'adobe-express-rest'

export const IMPLEMENTED_OUTPUT_TARGETS: ReadonlySet<OutputTarget> = new Set(['pdf-merged', 'png-set'])

export class UnimplementedOutputTargetError extends Error {
  constructor(target: string) {
    super(
      `El outputTarget "${target}" está declarado pero NO implementado. ` +
        `Un destino no implementado aborta — nunca degrada silenciosamente a PDF. ` +
        `Implementados: ${[...IMPLEMENTED_OUTPUT_TARGETS].join(', ')}.`
    )
    this.name = 'UnimplementedOutputTargetError'
  }
}

/** Hook de layout derivado que el catálogo aporta para una plantilla (ej. TimelineFull). */
export type CatalogLayoutHook = (page: Page, slide: SlideSpec) => Promise<void>

/** Violación semántica tipada, determinista y serializable. */
export interface CatalogSemanticViolation {
  code: string
  slideId?: string
  message: string
}

/** Snapshot read-only que un validador semántico puede consultar (nunca DB/red/reloj). */
export interface CatalogSnapshot {
  registry: DeckRegistry
}

/**
 * Punto de extensión de validación SEMÁNTICA por catálogo. El motor lo ejecuta y serializa el
 * resultado, pero NO contiene `if` de pricing, equipo, SLA o propuesta: esas reglas viven
 * declaradas y versionadas en el catálogo/consumer que las aporta. Deterministas por contrato —
 * reciben el plan y el snapshot; jamás consultan DB, red ni el reloj.
 */
export interface CatalogSemanticValidator {
  name: string
  version: string
  validate(plan: DeckPlan, snapshot: CatalogSnapshot): CatalogSemanticViolation[]
}

export class CatalogSemanticError extends Error {
  readonly runs: ManifestValidatorRun[]

  constructor(runs: ManifestValidatorRun[]) {
    const detail = runs
      .filter(run => run.result === 'fail')
      .flatMap(run => run.violations.map(violationText => `  [${run.name}@${run.version}] ${violationText}`))
      .join('\n')

    super(`El plan no pasa la validación semántica del catálogo:\n${detail}`)
    this.name = 'CatalogSemanticError'
    this.runs = runs
  }
}

/**
 * El contrato completo de un catálogo. TODO lo específico de una superficie vive acá:
 * el motor compone CUALQUIER catálogo que lo satisfaga.
 */
export interface ArtifactCatalog {
  /** Nombre estable (ej. `deck-axis`, `social-carousel`). */
  name: string
  /** Dueño del catálogo. "global" es un valor explícito, no la ausencia de dato (costura ASaaS). */
  ownerOrgId: string
  /** Dir con `registry.json`, las plantillas `.html` y sus `*.slots.json`. */
  templatesDir: string
  outputTarget: OutputTarget
  /** La tabla de resolvers de la superficie (semántica → presentación). */
  resolvers: ResolverRegistry
  /** Reglas de forma por-plantilla (ej. el schedule de TimelineFull). */
  slideValidators?: SlideValidatorMap
  /** Layout derivado post-fill por-plantilla (ej. conectores del timeline). */
  layoutHooks?: Record<TemplateName, CatalogLayoutHook>
  /** Invariantes semánticas del catálogo, versionadas y probadas con fixtures. */
  semanticValidators?: CatalogSemanticValidator[]
  /**
   * Materialización del brand pack dentro del catálogo (CSS compilado + font pack). El manifest
   * resuelto sella su hash y checksums: un replay puede probar QUÉ marca gobernó el render.
   */
  brand?: {
    packName: string
    /** Archivos compilados del pack dentro de `templatesDir` (se hashean juntos, en orden). */
    compiledFiles: string[]
    /** Manifest de fuentes del pack (JSON con `fonts[]: {family, weight, style, sha256}`). */
    fontsManifestPath?: string
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

/** Carga y AUDITA el registry del catálogo (cierre referencial — un registry corrupto no compone). */
export const loadRegistry = async (assets: { templatesDir: string }): Promise<DeckRegistry> => {
  const raw = await fs.readFile(path.join(assets.templatesDir, 'registry.json'), 'utf8')
  const registry = JSON.parse(raw) as DeckRegistry

  const problems = auditRegistry(registry)

  if (problems.length > 0) {
    throw new Error(`El registry del catálogo está corrupto:\n  - ${problems.join('\n  - ')}`)
  }

  return registry
}

export const loadTemplateContract = async (
  assets: { templatesDir: string },
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

/** Ejecuta los validadores semánticos del catálogo. Fail-closed: un `fail` aborta la composición. */
export const runSemanticValidators = (
  catalog: ArtifactCatalog,
  plan: DeckPlan,
  snapshot: CatalogSnapshot
): ManifestValidatorRun[] => {
  const runs: ManifestValidatorRun[] = []

  for (const validator of catalog.semanticValidators ?? []) {
    const violations = validator.validate(plan, snapshot)

    runs.push({
      name: validator.name,
      version: validator.version,
      result: violations.length === 0 ? 'pass' : 'fail',
      violations: violations.map(v => `${v.code}${v.slideId ? ` [${v.slideId}]` : ''}: ${v.message}`)
    })
  }

  return runs
}

const sha256File = async (filePath: string): Promise<string> =>
  crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex')

/** Sella la marca que gobierna el render: hash conjunto del pack compilado + checksums de fuentes. */
export const resolveBrandSeal = async (
  catalog: ArtifactCatalog
): Promise<{
  brandPack: { name: string; hash: string } | null
  fonts: Array<{ family: string; variant: string; checksum: string }> | null
}> => {
  if (!catalog.brand) return { brandPack: null, fonts: null }

  const hash = crypto.createHash('sha256')

  for (const file of catalog.brand.compiledFiles) {
    hash.update(await fs.readFile(path.join(catalog.templatesDir, file)))
  }

  let fonts: Array<{ family: string; variant: string; checksum: string }> | null = null

  if (catalog.brand.fontsManifestPath) {
    const manifest = JSON.parse(await fs.readFile(catalog.brand.fontsManifestPath, 'utf8')) as {
      fonts: Array<{ family: string; weight: number; style: string; sha256: string }>
    }

    fonts = manifest.fonts.map(font => ({
      family: font.family,
      variant: `${font.weight}${font.style === 'italic' ? ' italic' : ''}`,
      checksum: font.sha256
    }))
  }

  return { brandPack: { name: catalog.brand.packName, hash: hash.digest('hex') }, fonts }
}

/**
 * Resuelve un plan AUTORABLE contra el catálogo → `ResolvedCompositionManifest`.
 *
 * Es el único camino por el que la intención de un autor gana autoridad de presentación:
 * 1. El SELECTOR del catálogo elige la plantilla (el autor no puede declararla — el tipo del input
 *    ni siquiera la puede expresar).
 * 2. Validación de FORMA (contratos de slots) + reglas por-plantilla del catálogo.
 * 3. Validación SEMÁNTICA del catálogo — fail-closed.
 * 4. Se sella con hashes de registry/contrato/template: el manifest explica y REPITE el mismo
 *    artefacto sin consultar el reloj, Figma, red ni una base de datos.
 *
 * `brandPack`/`fonts` quedan `null` hasta que Slices 3/4 los materialicen.
 */
export const resolvePlan = async (
  catalog: ArtifactCatalog,
  input: CompositionPlanInput
): Promise<ResolvedCompositionManifest> => {
  const assets = { templatesDir: catalog.templatesDir }
  const registry = await loadRegistry(assets)

  // 1 · El catálogo elige la plantilla — determinista, desde el contentType del autor.
  const slides: SlideSpec[] = input.slides.map(slide => ({
    slideId: slide.slideId,
    contentType: slide.contentType,
    template: selectTemplate(registry, slide.contentType),
    slots: slide.slots
  }))

  // 2 · Forma: contratos de slots + reglas por-plantilla del catálogo.
  const contracts = new Map<TemplateName, TemplateContract>()

  for (const slide of slides) {
    if (!contracts.has(slide.template)) {
      contracts.set(slide.template, await loadTemplateContract(assets, registry, slide.template))
    }
  }

  const violations = validateDeck(slides, contracts, catalog.slideValidators)

  if (violations.length > 0) {
    throw new DeckValidationError(violations)
  }

  // 3 · Semántica del catálogo — fail-closed.
  const validatorRuns = runSemanticValidators(catalog, { tenderId: input.artifactId, slides }, { registry })

  if (validatorRuns.some(run => run.result === 'fail')) {
    throw new CatalogSemanticError(validatorRuns)
  }

  // 4 · Sellado con hashes verificables.
  const registryHash = await sha256File(path.join(catalog.templatesDir, 'registry.json'))
  const resolvedSlides: ResolvedCompositionSlide[] = []

  for (const slide of slides) {
    const entry = findTemplate(registry, slide.template)!

    // loadTemplateContract ya abortó arriba si faltaba el slotsRef; este guard preserva el tipo.
    if (!entry.slotsRef) {
      throw new MissingSlotContractError(slide.template)
    }

    resolvedSlides.push({
      slideId: slide.slideId,
      contentType: slide.contentType,
      slots: slide.slots,
      template: slide.template,
      contractHash: await sha256File(path.join(catalog.templatesDir, entry.slotsRef)),
      templateHash: await sha256File(path.join(catalog.templatesDir, entry.prototype))
    })
  }

  const seal = await resolveBrandSeal(catalog)

  return {
    manifestVersion: 1,
    artifactId: input.artifactId,
    input,
    catalog: {
      name: catalog.name,
      version: (registry as unknown as { version?: string }).version ?? '0',
      registryHash,
      ownerOrgId: catalog.ownerOrgId
    },
    slides: resolvedSlides,
    brandPack: seal.brandPack,
    fonts: seal.fonts,
    validators: validatorRuns
  }
}
