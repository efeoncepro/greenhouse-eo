/**
 * Artifact Composer — entrada LIVIANA del primitive (ISSUE-177).
 *
 * El motor tiene dos entradas públicas y ninguna más:
 *   - `@/lib/artifact-composer` (el barrel `index.ts`): el motor COMPLETO — selector, catálogos, render
 *     en Chromium, pdf-lib, quality gates. Lo consumen el worker de render, los scripts y los tests.
 *   - `@/lib/artifact-composer/pure` (este archivo): el subconjunto que puede viajar a una función de
 *     Vercel — lo que se necesita para ENCOLAR, MAPEAR y SELLAR un render, nunca para ejecutarlo.
 *
 * Por qué existe una segunda entrada: el barrel re-exporta `render.ts` (Playwright y pdf-lib al tope del
 * módulo) y `catalog.ts` (lecturas `node:fs` con rutas de runtime). Un solo import de VALOR desde el
 * barrel en código que corre en Vercel hace que el trazado de archivos meta todo eso en la función:
 * `api/platform/app/insights/catalog` llegó a 441 MB con un límite de 250 MB y rompió el deploy de
 * staging (ISSUE-177). La mitigación inicial fue un deep-import a `paginate`, que viola el "cero
 * deep-imports" del ADR del composer; esta entrada lo resuelve sin romper la regla.
 *
 * Es package-shaped: el día que EPIC-027 extraiga el motor a `packages/artifact-composer`, esto es un
 * subpath export del `package.json` (`"./pure"`), no un interno. Por eso cuenta como API pública y no
 * como deep-import.
 *
 * ⚠️ Contrato de esta entrada — lo verifican `__tests__/pure-entry-boundary.test.ts` (cierre transitivo
 * real, con esbuild) y la regla `greenhouse/no-worker-only-module-in-vercel-code`:
 *   - NUNCA re-exportar algo cuyo cierre transitivo alcance `playwright`, `pdf-lib`, `pngjs`, `node:fs`,
 *     un catálogo (`catalogs/**`) o un brand pack (`brand-packs/**`). Si una función nueva los necesita,
 *     no es liviana: va al barrel y corre en el worker.
 *   - Los tipos se re-exportan con `export type`: no generan import en runtime y no pesan.
 *
 * ADR: `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (Delta 2026-09-22).
 */

// Reparto determinista de un flujo en páginas (función pura: la medición la hace el render, no esto)
export { BlockTooTallError, paginateFlow, type FlowBlock, type PageBudget, type PaginatedPage } from './paginate'

// Geometría de gráficos y figura de barras: del dato a números, sin DOM. Se re-exportan enteros porque
// los módulos son puros de punta a punta; si alguno sumara un import pesado, el boundary test lo corta.
export * from './chart-geometry'
export * from './bar-figure'

// Hash canónico del manifest (sólo `node:crypto`): el command lo sella al encolar y el worker lo compara
export * from './manifest-hash'

// Prefijo de referencia a un asset externo al catálogo (TASK-1889): el mapper lo usa para sellarla.
export { EXTERNAL_ASSET_PREFIX } from './contracts'

// Contratos de plantilla/plan — sólo tipos
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

// El plan autorable vs el plan resuelto — sólo tipos
export type {
  CompositionPlanInput,
  CompositionSlideInput,
  ManifestValidatorRun,
  ResolvedCompositionManifest,
  ResolvedCompositionSlide
} from './plan'

// El contrato de resolvers — sólo tipos (el dispatch vive en el barrel)
export type { FieldDirective, FieldEffect, ResolverContext, ResolverDef, ResolverRegistry } from './resolver-contract'
