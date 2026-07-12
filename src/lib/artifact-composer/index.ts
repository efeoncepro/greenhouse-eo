/**
 * Artifact Composer — API pública del primitive (TASK-1393 Slice 1).
 *
 * El motor de composición domain-free de Greenhouse: selector → validación → slot-fill →
 * resolvers → geometría → render. NO sabe qué es una licitación, un carrusel ni una marca — las
 * superficies son CATÁLOGOS (dato) y la marca es un INPUT (brand pack).
 * ADR: `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
 *
 * Reglas del paquete (nace package-shaped, extraction-ready para EPIC-027):
 *   - Los consumers importan SOLO desde este barrel — cero deep-imports.
 *   - El motor NUNCA importa de un dominio (`commercial/`, `growth/`, …) ni trae Next-isms
 *     (`server-only`). Frontera mecánica: eslint `no-restricted-imports` + el boundary test
 *     `__tests__/package-boundary.test.ts` rompen el build ante una violación.
 *   - Dependencias declaradas del motor: `playwright`, `pdf-lib` y `node:*`. Nada más.
 */

// El pipeline (valida TODO antes de renderizar NADA + merge del entregable)
export {
  composeDeck,
  loadRegistry,
  loadTemplateContract,
  planSlides,
  DeckValidationError,
  MissingSlotContractError,
  TemplateAuthorityError,
  type ComposeOptions,
  type ComposeResult,
  type DeckAssets
} from './compose'

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

// Selector determinista + audit de cierre referencial del registry
export {
  auditRegistry,
  findTemplate,
  selectTemplate,
  UnknownContentTypeError,
  type DeckRegistry,
  type RegistryTemplate
} from './selector'

// Validación fail-closed (`overflow: reject`, evidencia anti-fabricación)
export { validateDeck, validateSlide } from './validate'

// Render en DOM real de Chromium + geometry gate + launch determinista canónico
export {
  assertSlideFitsCanvas,
  fillSlide,
  launchComposerBrowser,
  mergeSlidePdfs,
  renderSlide,
  SlideGeometryError,
  SlotFillError,
  type ClippedSlot,
  type RenderTarget
} from './render'

// Sintetizador de payloads mínimos (guard de composability + gate visual: un solo probe)
export { synthesizeProbeSlots, synthesizeSlotValue } from './synthesize'
