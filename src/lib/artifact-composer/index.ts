/**
 * Artifact Composer — API pública del primitive (TASK-1393).
 *
 * El motor de composición domain-free de Greenhouse: selector → validación → slot-fill →
 * resolvers → geometría → render. NO sabe qué es una licitación, un carrusel ni una marca — las
 * superficies son CATÁLOGOS (dato) y la marca es un INPUT (brand pack).
 * ADR: `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
 *
 * Reglas del paquete (nace package-shaped, extraction-ready para EPIC-027):
 *   - El paquete tiene DOS entradas públicas (ISSUE-177, 2026-09-22), como dos subpath exports de un
 *     `package.json`:
 *       · este barrel — el motor COMPLETO (render en Chromium, pdf-lib, catálogos, quality gates). Lo
 *         importan con valores sólo el worker (`services/artifact-worker`), los scripts y los tests.
 *         Desde `src/` (código que puede terminar en una función de Vercel) sólo se importan TIPOS.
 *       · `./pure` — el subconjunto liviano (paginación, geometría, figura de barras, hash del
 *         manifest y tipos) para encolar, mapear y sellar desde Vercel sin arrastrar el motor.
 *     Un valor de este barrel en código de Vercel llevó una función a 441 MB (límite 250 MB).
 *   - Cero deep-imports a los internals del motor desde consumers: se importa desde una de las dos
 *     entradas (o desde el barrel de un catálogo bajo `catalogs/<nombre>`, que sólo cargan el worker,
 *     los scripts y los tests). En `src/**` lo hace cumplir la regla eslint
 *     `greenhouse/no-worker-only-module-in-vercel-code`, que rechaza todo deep-import —incluso de tipos—
 *     y todo valor de este barrel.
 *   - El motor NUNCA importa de un dominio (`commercial/`, `growth/`, …) ni trae Next-isms
 *     (`server-only`). Frontera mecánica: eslint `no-restricted-imports` + el boundary test
 *     `__tests__/package-boundary.test.ts` rompen el build ante una violación.
 *   - Dependencias declaradas del motor: `playwright`, `pdf-lib`, `pngjs` y `node:*`. Nada más.
 */

// El contrato de catálogo (dato, no código del motor) + resolución del plan autorable → manifest
export {
  loadRegistry,
  loadTemplateContract,
  resolvePlan,
  runSemanticValidators,
  CatalogSemanticError,
  MissingSlotContractError,
  UnimplementedOutputTargetError,
  IMPLEMENTED_OUTPUT_TARGETS,
  type ArtifactCatalog,
  type CatalogLayoutHook,
  type CatalogSemanticValidator,
  type CatalogSemanticViolation,
  type CatalogSnapshot,
  type OutputTarget
} from './catalog'

// El pipeline (valida TODO antes de renderizar NADA + emite según el outputTarget del catálogo)
export { composeArtifact, TemplateAuthorityError, type ComposeOptions, type ComposeResult } from './compose'

// Contratos de plantilla/plan (browser-safe)
export type {
  ContentType,
  DeckPlan,
  OverflowPolicy,
  SlideSpec,
  SlotConstraints,
  SlotContract,
  SlotFieldContract,
  SlotItemContract,
  SlotType,
  SlotValue,
  SlotValues,
  SlotViolation,
  TemplateContract,
  TemplateName
} from './contracts'

// El plan autorable vs el plan resuelto (browser-safe): el autor declara intención, nunca template
export type {
  CompositionPlanInput,
  CompositionSlideInput,
  ManifestValidatorRun,
  ResolvedCompositionManifest,
  ResolvedCompositionSlide
} from './plan'

// El contrato de resolvers (la TABLA la aporta el catálogo; el dispatch fail-closed es del motor)
export {
  resolveFieldDirective,
  UnknownResolverValueError,
  type FieldDirective,
  type FieldEffect,
  type ResolverContext,
  type ResolverDef,
  type ResolverRegistry
} from './resolver-contract'

// Selector determinista + audit de cierre referencial del registry
export {
  auditRegistry,
  findTemplate,
  selectTemplate,
  UnknownContentTypeError,
  type DeckRegistry,
  type RegistryTemplate
} from './selector'

// Validación fail-closed (`overflow: reject`, evidencia anti-fabricación) + reglas por-plantilla
export {
  validateDeck,
  validateSlide,
  DeckValidationError,
  type SlideValidator,
  type SlideValidatorMap
} from './validate'

// Render en DOM real de Chromium + geometry gate + launch determinista canónico
export {
  assertSlideFitsCanvas,
  fillSlide,
  launchComposerBrowser,
  mergeSlidePdfs,
  renderSlide,
  SlideGeometryError,
  SlotFillError,
  type CatalogRenderRuntime,
  type ClippedSlot,
  type RenderTarget
} from './render'

// Sintetizador de payloads mínimos (guard de composability + gate visual: un solo probe)
export { synthesizeProbeSlots, synthesizeSlotValue } from './synthesize'
export {
  assertAllImagesResolved,
  assertNoFontFallback,
  assertSlideHasInk,
  measureSlideInk,
  SlideQualityError,
  type SlideInkMetrics
} from './quality-gates'

// TASK-1846 — hash canónico del manifest (domain-free: lo comparten todos los consumers del worker)
export { canonicalManifestJson, hashResolvedManifest } from './manifest-hash'
export {
  BlockTooTallError,
  paginateFlow,
  type FlowBlock,
  type PageBudget,
  type PaginatedPage
} from './paginate'
export {
  barGeometry,
  ChartGeometryError,
  lineGeometry,
  MAX_SLICES,
  resolveScale,
  scatterGeometry,
  sliceGeometry,
  type AxisScale,
  type BarGeometry,
  type GeometrySeries,
  type LineGeometry,
  type LinePoint,
  type ScatterPoint,
  type SliceGeometry
} from './chart-geometry'
export {
  bulletGeometry,
  funnelGeometry,
  gaugeGeometry,
  heatmapGeometry,
  upsetGeometry,
  vennTwoGeometry,
  waffleGeometry,
  waterfallGeometry,
  WAFFLE_CELLS,
  type BulletGeometry,
  type FunnelStage,
  type FunnelStageGeometry,
  type GaugeGeometry,
  type HeatmapCell,
  type HeatmapCellGeometry,
  type UpsetGeometry,
  type UpsetIntersection,
  type VennTwoGeometry,
  type WaffleCellGeometry,
  type WaterfallBar,
  type WaterfallStep
} from './chart-geometry'

