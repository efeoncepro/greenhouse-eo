# GREENHOUSE — Composición por superficie de «La órbita» en el Artifact Composer V1

> **Tipo de documento:** Spec técnica (arquitectura del lado Greenhouse)
> **Versión:** 1.2
> **Creado:** 2026-09-28 por Claude
> **Última actualización:** 2026-09-28 por Claude (1.2: TASK-1934 — las nueve láminas SEO/AEO: 78 recetas y 57 plantillas (§4), builders en `recipes/seo-aeo/` (§5), prefijos CSS (§7.3), 3× y reglas nuevas (§8), AXIS `v0.3.22`/`v0.3.23` (§10), catálogo de runtime y códigos `variant-both-in-deck` y `figure-source-missing` (§12), pendientes (§13). Antes, 1.1: §12 nueva — plan de deck contra el catálogo de recetas, TASK-1929: catálogo de runtime, `validateDeckPlan`, `proposeDeckPlan` y `pnpm brand:deck-plan`; §9 y §13 al día)
> **Estado:** vigente. Taller local (`pnpm brand:compose`) en `develop`; la ruta productiva gobernada es TASK-1921, en curso.
> **Contrato y valores (AXIS):** ADR [`SURFACE_COMPOSITION_DECISION_V1.md`](https://github.com/efeoncepro/axis-design-system/blob/main/docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md) del repo `efeoncepro/axis-design-system` (contrato `efeonce.surface-composition` 0.1.2, deltas (b)…(n)); guía `docs/agent-composition/surfaces/deck.md` del mismo repo.
> **Norma de marca:** [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) (qué se aprobó por superficie, §2.1 ruta por el composer, §4.6 deck) · catálogo de recetas [`deck-recipes/`](../operations/brand-graphic-line/deck-recipes/README.md).
> **Motor:** [`GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`](GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) (el composer es domain-free; las superficies son catálogos) · invariantes [`COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`](agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md).
> **Tasks:** [TASK-1919](../tasks/complete/TASK-1919-graphic-line-surfaces-artifact-composer.md) (catálogos y mapper) · [TASK-1927](../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) (contrato 0.1.2, marco y documento) · [TASK-1928](../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md) (las recetas restantes: 69 de 69) · [TASK-1929](../tasks/complete/TASK-1929-deck-plan-recipe-catalog-validator.md) (plan de deck contra el catálogo, §12; code complete, en cierre) · [TASK-1934](../tasks/in-progress/TASK-1934-seo-aeo-deck-slides-recipe-catalog-templates.md) (las nueve láminas SEO/AEO: 78 de 78; en curso).
> **Manuales:** [componer por superficie con AXIS](../manual-de-uso/creative/componer-por-superficie-con-axis.md) · [componer un deck con las recetas](../manual-de-uso/creative/componer-deck-con-recetas.md) · runbook del gate [`composer-visual-gate.md`](../operations/runbooks/composer-visual-gate.md).

## 1. Qué es y dónde termina

La línea gráfica de Efeonce «La órbita» se compone **por superficie** (deck, web, DOOH, motion, audiovisual). Esta spec
describe la mitad de Greenhouse de esa composición: cómo un pedido declarado como **intención** sale convertido en un
PDF o un PNG por el Artifact Composer, sin que nadie elija coordenadas ni plantilla.

Tres dueños, sin solaparse:

| Capa | Dueño | Qué hace | Dónde |
|---|---|---|---|
| Valores y contrato | **AXIS** | Tokens (`efeonceGraphicLine.surfaces`, `pieces`, `lines`, paleta), recetas aprobadas, validación del intent y del documento, manifest resuelto | `@efeoncepro/axis-tokens`, `@efeoncepro/axis-ui-contracts`, `@efeoncepro/axis-graphic-line`, `@efeoncepro/axis-brand-assets` |
| Traducción | **Greenhouse** (`src/lib/brand-surfaces`) | Del manifest resuelto a un plan del composer: slots, assets externos y `contentType` | mapper puro, sin filesystem ni render |
| Render | **Artifact Composer** (domain-free) | Selector → validación de slots → llenado → resolvers → layout hooks → PDF/PNG | `src/lib/artifact-composer/**` + catálogos `graphic-line-{deck,stills,overlays}/` |

Reglas de frontera que sostienen el diseño:

- **AXIS es dueño de valores y contratos.** Una plantilla o un builder nunca transcriben un px, un HEX o una familia
  tipográfica que el token o el manifest ya declaran. Si falta un token, se pide en AXIS, se publica y se fija; no se
  inventa en Greenhouse. Excepción declarada: la escala tipográfica interna de las interfaces genéricas del día a día
  (tarjetas, revisión, reporte), que ningún token declara, vive en `graphic-line.css` con su nota.
- **Sólo una receta `approved` tiene plantilla.** Una opción o una pendiente falla con `recipe-not-approved`.
- **El autor elige la receta y la composición (`layout`), nunca la plantilla.** El `contentType` lo deriva el mapper
  desde el manifest; el selector del catálogo elige la plantilla.
- **El motor no importa paquetes ni dominios.** La pintura de la selección y del CTA la inyecta el consumidor
  (`createCatalog(options)`); los tokens llegan al catálogo como snapshot compilado (`pnpm brand:tokens`).
- **Un issue de AXIS detiene todo.** Si `resolveSurfaceComposition` o `resolveSurfaceDocument` devuelven un solo issue,
  no se compone nada: ni la pieza, ni ninguna página de un documento inválido.

## 2. Flujo de punta a punta

```text
intent (efeonce.surface-composition)
  │  ¿receta approved?  ─ no → SurfacePieceError 'recipe-not-approved'
  ▼
resolveSurfaceComposition(intent)            ← @efeoncepro/axis-ui-contracts
  │  issues? ─ sí → SurfacePieceError 'surface-issues' (con los códigos de AXIS)
  ▼
manifest resuelto (canvas, reserves, type, content, selection, use, layout…)
  ▼
builder de la receta  (RecipeBuilder)        ← src/lib/brand-surfaces/recipes/*.ts
  │  { slots, assets, contentType? }
  ▼
plan del composer: 1 SlideSpec { slideId, contentType, slots }  +  SurfaceAssetRequest[]
  ▼
materializar assets (bytes → data URI)       ← scripts/brand-surfaces/compose.ts
  ▼
composeArtifact(catálogo, plan, outDir, { externalAssets })
  │  selector.map[contentType] → plantilla (HTML + slots.json)
  │  resolvers gl-* → layout hooks (selección, CTA, nivel/ítem) → captura
  ▼
PDF 16:9 (deck, pdf-merged) · PNG (stills, overlays, png-set)
  + <id>.surface-manifest.json  + <id>.provenance.json
```

### 2.1 El intent

Un `SurfaceIntent` (`src/lib/brand-surfaces/shared.ts`) declara `contract`, `version`, `surface`, `format`, `role`,
`recipe`, `line` y, según la receta, `use` (`proposal` | `brochure`, contrato 0.1.2), `layout` (siempre explícito; AXIS
nunca lo infiere de los campos presentes), `voice`, `body`, `proof`, `steps`, `photo` (`register`, `subject`,
`plateRef`, `alt`, `native`, `focus`), `selection` y los campos de contenido que la receta acepte. Los builders **no
leen el intent crudo** para el contenido: leen `manifest.content`, que es lo que el contrato aceptó.

### 2.2 `planSurfacePiece` y `planFromManifest`

`planSurfacePiece(intent, { artifactId })` (`src/lib/brand-surfaces/index.ts`):

1. `assertApprovedRecipe`: la receta existe en `efeonceGraphicLine.surfaces.<surface>.recipes.<recipe>` con
   `status: 'approved'`.
2. `resolveSurfaceComposition(intent)`; con issues → `SurfacePieceError('surface-issues', issues)`.
3. `planFromManifest(intent, manifest, options)`, que comparten la pieza suelta y el documento:
   - Una receta en `OUTSIDE_COMPOSER` falla con `recipe-outside-composer` (hoy `audiovisual.close-reveal`: es video).
   - Busca el builder en `BUILDERS[surface][recipe]` y el catálogo en `CATALOG_BY_SURFACE` (`deck` →
     `graphic-line-deck`; `web`, `dooh`, `motion` → `graphic-line-stills`; `audiovisual` → `graphic-line-overlays`).
     Sin builder o sin catálogo: `recipe-without-template`.
   - Llama al builder y valida el `contentType`: si el builder no lo declara, es `<surface>.<recipe>`; si lo declara,
     **tiene que empezar por** `<surface>.<recipe>` (si no, `invalid-intent`).
   - Devuelve `{ catalog, contentType, plan: { artifactId, slides: [{ slideId: '<surface>-<recipe>', contentType, slots }] }, assets, use, layout, manifest }`.

Códigos de error (`SurfacePieceError.code`, `src/lib/brand-surfaces/types.ts`): `surface-issues`,
`recipe-not-approved`, `recipe-without-template`, `recipe-outside-composer`, `missing-photo`, `invalid-intent`.

### 2.3 El builder (`RecipeBuilder`)

```ts
interface RecipeContext {
  intent: SurfaceIntent
  manifest: SurfaceManifest
  recipe: Record<string, unknown> // efeonceGraphicLine.surfaces.<surface>.recipes.<recipe> — el token BASE
}
type RecipeBuilder = (ctx: RecipeContext) => { slots: Record<string, unknown>; assets: SurfaceAssetRequest[]; contentType?: string }
```

- **`recipe` es el token base de la receta, no el de la composición.** Una receta con varias composiciones
  (`section-cine`, `content-day`, `cover-brochure`…) guarda las suyas en `recipe.layouts.<layout>`; el builder las mezcla
  sobre la base igual que lo hace el contrato de AXIS (la composición manda; `selection` se mezcla campo a campo). Caso
  de referencia: `sectionCine` en `recipes/sections.ts`.
- **`contentType` opcional.** Se devuelve cuando la receta tiene una plantilla por composición o por formato:
  `deck.<receta>.<layout>` (p. ej. `deck.cover-brochure.document-selection`, `deck.content-day.tools`) o
  `web.hero-mobile-native.<formato>`. Una composición «por defecto» no lo declara y queda en `deck.<receta>`
  (`section-cine` con `team`, `content-day` con `clock`, `cover-brochure` con `document`/`line`).
- **Medidas desde AXIS, sin inventar.** Las ayudas de `recipes/kit.ts` (`measured`, `css`, `colorVar`, `paletteColor`,
  `topOf`, `typeOf`, `fixedPx`, `layerAsset`, `stageSvg`) fallan si una medida no llegó del token o del manifest; nunca
  ponen un default. Un texto que supera su largo máximo hace fallar la composición con el slot que lo recibe: nunca se
  reduce el cuerpo ni se mueve la órbita para que quepa.
- **Puro.** Pinta SVG con `paintGraphicLine` / `resolveGraphicLineIntent` / `resolveIcon` / `spotlightRecipe` de AXIS
  y declara assets; no lee archivos.

### 2.4 Del plan al render

`pnpm brand:compose -- --intent <intent.json> [--out <dir>] [--artifact-id <id>]` (`scripts/brand-surfaces/compose.ts`):

- Planifica, **materializa los assets antes de crear la carpeta de salida** (si falta un plate no queda salida a
  medias), construye el catálogo con `createCatalog({ selectionPainter, ctaPainter })` y llama a `composeArtifact`.
- Salida por defecto: `.captures/brand-surfaces/<id>/`. Además del PDF/PNG deja `<id>.surface-manifest.json` (el manifest
  de AXIS que gobernó la pieza) y `<id>.provenance.json` (`efeonce.brand-surface-piece.provenance.v1`: sha256 del intent,
  catálogo, `contentType`, sha256 de cada plate y de cada archivo `file`, y las versiones instaladas de
  `axis-ui-contracts`, `axis-tokens`, `axis-graphic-line` y `axis-brand-assets`). Sin fechas: el mismo pedido con los
  mismos plates escribe la misma procedencia.
- Sólo server y CLI: Chromium y la lectura de plates nunca van al browser ni a Vercel. El render productivo del
  composer corre en el Cloud Run Job `artifact-worker` ([`GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`](GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md));
  llevar estas piezas hasta allí es TASK-1921.

## 3. El documento multipágina

Un intent con `pages` es un **documento** (misma detección que `pnpm surface:resolve` en AXIS): un brochure o una
propuesta en un solo PDF.

- Forma (`SurfaceDocumentIntent`, `src/lib/brand-surfaces/document.ts`): `{ contract?, version?, surface: 'deck', format,
  use, line?, sections?, pages }`; cada página es un intent de lámina que puede omitir lo que el documento propaga.
- `planSurfaceDocument(intent, { artifactId })` llama a `resolveSurfaceDocument`. Con issues o con `status` distinto de
  `resolved` falla sin planear ninguna página. Greenhouse no reimplementa reglas: las del conjunto
  (`brochure-cover-first`, `brochure-close-last`, `brochure-needs-service-page`, `document-line-mismatch`,
  `frame-photo-must-alternate`, `document-pages-required`, `document-surface-invalid`) y las de una página
  (`page[i]:<código>`) vienen de AXIS.
- Para cada página arma el intent con lo propagado (`surface`, `format`, `use`, `role`, `recipe`, `line` del `outline`) y
  llama a `planFromManifest`. Todas las páginas deben resolver al mismo catálogo. El `slideId` queda
  `pNN-<surface>-<recipe>` y los assets se unen sin repetir referencia.
- Salida: un PDF 16:9, `<id>.surface-document-manifest.json` (`axis.surface-document.v1`) y `<id>.provenance.json`
  (`efeonce.brand-surface-document.provenance.v1`: intent, `use`, número de páginas, `contentTypes`, plates, archivos y
  versiones de AXIS).
- Ejemplos: `src/lib/brand-surfaces/examples/deck-brochure-document.json` (nueve páginas) y
  `deck-proposal-document.json` (las cuatro `proposal-cinematic` de servicio se verifican como páginas de este
  documento en `recipe-map.json`, con `example: "…#page=N"`).
- El documento completo **no tiene frame** en el gate visual (usa fotos reales); lo cubren los frames de sus páginas.

## 4. El catálogo `graphic-line-deck`

`src/lib/artifact-composer/catalogs/graphic-line-deck/`. PDF 16:9 (`outputTarget: 'pdf-merged'`), brand pack `axis`
con `deck-fonts.css` y `graphic-line-tokens.css`, extensión de pack `graphic-line`. Vive aparte de `deck-axis` (el
catálogo de ofertas a comité y del deck SKY): mezclarlos degradaría lo que ese catálogo protege.

### 4.1 Archivos

| Archivo | Qué es |
|---|---|
| `<plantilla>.html` + `<plantilla>.slots.json` | una plantilla y su contrato de slots. Dos plantillas pueden compartir HTML con contratos distintos (`section-split.html` → `SectionSplit`, `SectionSplitCornerBottom`, `SectionSplitPanelEnd`; `close-brochure.html` → `CloseBrochure`, `CloseBrochurePhoto`) |
| `registry.json` | `contentTypeTaxonomy` (la lista cerrada de `contentType` del catálogo), `templates` (nombre, `prototype` HTML, `slotsRef`, `contentTypes`, `status`) y `selector.map` (`contentType` → plantilla). **57 plantillas**, todas `built` |
| `recipe-map.json` | `efeonce.deck-recipe-map.v1`: receta del catálogo de láminas → `contentType`, intent de ejemplo y mapa de slots (§4.3) |
| `index.ts` | `createCatalog(options)`: resolvers, layout hooks y brand pack (§6) |
| `graphic-line.css` | el molde compartido; cada familia nueva acotada por el prefijo de su raíz (§7) |
| `graphic-line-tokens.css`, `deck-tokens.css`, `deck-fonts.css`, `fonts/`, `assets/` | generados o copiados byte a byte desde AXIS por `pnpm brand:tokens`; no se editan a mano |

### 4.2 Conteo

- **78 de 78** recetas del catálogo de láminas (`EFEONCE_DECK_SLIDE_RECIPES_V1.json`) tienen plantilla.
- **57 plantillas**: 16 de TASK-1927 (que incluyen las seis de TASK-1919), **34 de TASK-1928** y **7 de TASK-1934**
  (`DecisionAiAnswer`, `DecisionAiMarket`, `MethodSurroundCycle`, `DecisionDifference`, `MethodEeat`,
  `DecisionTrafficToRevenue`, `DecisionDiagnosisMap`). Comparten plantilla: las cinco `proposal-service-*` (incluida
  `proposal-service-seo`) → `ProposalService`; `section-cine-team` y `section-cine-services` →
  `SectionCine`; las ocho `cover-brochure-*` (incluida la de selección) → `CoverBrochure`; las cinco
  `proposal-cinematic-{creative,web,aeo,revops,seo}` → `ProposalCinematic`; las dos `cover-proposal-orbit*` y las dos
  `cover-proposal-dawn*` → `CoverProposalOrbit` y `CoverProposalDawn`; las dos `close-brochure-{horizon,dawn}` →
  `CloseBrochurePhoto`; las dos `close-proposal-*` → `CloseProposal`.
- Origen: 9 recetas componían desde TASK-1919, 21 llegaron con TASK-1927, 39 con TASK-1928 (las 38 recetas sin
  plantilla más `cover-brochure-cine-lines-selection`, que estaba bloqueada hasta AXIS `v0.3.21`) y 9 con TASK-1934
  (siete plantillas nuevas y dos reutilizadas).

### 4.3 `recipe-map.json` y la paridad de slots

Cada entrada: `{ contentType, example, slots }`. `example` apunta a un intent de pieza o a una página de un documento
(`archivo.json#page=N`, desde 1). Una receta sin fila no tiene plantilla.

`slots` mapea cada slot de la receta (catálogo JSON) al campo del `slots.json` de su plantilla. Sintaxis de ruta:

| Ruta | Significa |
|---|---|
| `slot` | el slot de primer nivel |
| `slot.campo` | un campo del objeto del slot |
| `slot[].campo` | un campo de cada ítem de una lista |
| `a+b` | dos campos que juntos cubren el slot (la respuesta en dos líneas: la suma alcanza el largo de la receta) |
| `ruta#composite` | el campo imprime más que el slot (p. ej. «Fuente: …»); basta con que alcance |

Las 38 recetas de TASK-1928 y ocho de las nueve de TASK-1934 declaran `slots`; las 31 anteriores declaran
`slots: null` porque su contrato sale del manifest de AXIS, y también `proposal-cinematic-seo`, como sus cuatro
hermanas de cine: su plantilla compartida no admite los largos menores de una sola receta. Ejemplo (`decision-chart`): `"source": "source#composite"`, `"nav": "indicator"`.

### 4.4 Las 78 recetas

| Receta del catálogo | `contentType` | Plantilla | Llegó con | Intent de ejemplo |
|---|---|---|---|---|
| `breather` | `deck.breather` | `Breather` | TASK-1928 | `deck-breather-intent.json` |
| `close-brochure-orbit` | `deck.close-brochure` | `CloseBrochure` | TASK-1927 | `deck-close-brochure-orbit-intent.json` |
| `close-brochure-dawn` | `deck.close-brochure.photo` | `CloseBrochurePhoto` | TASK-1927 | `deck-close-brochure-dawn-intent.json` |
| `close-brochure-horizon` | `deck.close-brochure.photo` | `CloseBrochurePhoto` | TASK-1927 | `deck-close-brochure-horizon-intent.json` |
| `close-proposal-dawn` | `deck.close-proposal` | `CloseProposal` | TASK-1927 | `deck-close-proposal-dawn-intent.json` |
| `close-proposal-horizon` | `deck.close-proposal` | `CloseProposal` | TASK-1927 | `deck-close-proposal-horizon-intent.json` |
| `contact-sheet` | `deck.contact-sheet` | `ContactSheet` | TASK-1928 | `deck-contact-sheet-intent.json` |
| `content-bullets` | `deck.content-bullets` | `ContentBullets` | TASK-1928 | `deck-content-bullets-intent.json` |
| `content-clients` | `deck.content-clients` | `ContentClients` | TASK-1928 | `deck-content-clients-intent.json` |
| `content-day` | `deck.content-day` | `ContentDay` | TASK-1928 | `deck-content-day-intent.json` |
| `content-day-live-progress` | `deck.content-day.live-progress` | `ContentDayProgress` | TASK-1928 | `deck-content-day-live-progress-intent.json` |
| `content-day-live-results` | `deck.content-day.live-results` | `ContentDayResults` | TASK-1928 | `deck-content-day-live-results-intent.json` |
| `content-day-tools` | `deck.content-day.tools` | `ContentDayTools` | TASK-1928 | `deck-content-day-tools-intent.json` |
| `content-focus` | `deck.content-focus` | `ContentFocus` | TASK-1928 | `deck-content-focus-intent.json` |
| `content-measure` | `deck.content-measure` | `ContentMeasure` | TASK-1919 | `deck-content-measure-intent.json` |
| `content-partners` | `deck.content-partners` | `ContentPartners` | TASK-1928 | `deck-content-partners-intent.json` |
| `content-pricing` | `deck.content-pricing` | `ContentPricing` | TASK-1928 | `deck-content-pricing-intent.json` |
| `content-pricing-live` | `deck.content-pricing.live` | `ContentPricingLive` | TASK-1928 | `deck-content-pricing-live-intent.json` |
| `content-pricing-stage` | `deck.content-pricing.stage` | `ContentPricingStage` | TASK-1928 | `deck-content-pricing-stage-intent.json` |
| `content-stack` | `deck.content-stack` | `ContentStack` | TASK-1928 | `deck-content-stack-intent.json` |
| `content-team` | `deck.content-team` | `ContentTeam` | TASK-1928 | `deck-content-team-intent.json` |
| `content-text` | `deck.content-text` | `ContentText` | TASK-1928 | `deck-content-text-intent.json` |
| `cover-brochure-cine-lines` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-cine-lines-intent.json` |
| `cover-brochure-cine-lines-selection` | `deck.cover-brochure.document-selection` | `CoverBrochure` | TASK-1928 | `deck-cover-brochure-cine-lines-selection-intent.json` |
| `cover-brochure-cine-orbit` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-cine-orbit-intent.json` |
| `cover-brochure-cine-team` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-cine-team-intent.json` |
| `cover-brochure-line-brand` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-line-brand-intent.json` |
| `cover-brochure-line-engine` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-line-engine-intent.json` |
| `cover-brochure-line-growth` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-line-growth-intent.json` |
| `cover-brochure-line-revenue` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-line-revenue-intent.json` |
| `cover-brochure-line-voice` | `deck.cover-brochure` | `CoverBrochure` | TASK-1927 | `deck-cover-brochure-line-voice-intent.json` |
| `cover-proposal-dawn` | `deck.cover-proposal.dawn` | `CoverProposalDawn` | TASK-1927 | `deck-cover-proposal-dawn-intent.json` |
| `cover-proposal-dawn-sky` | `deck.cover-proposal.dawn` | `CoverProposalDawn` | TASK-1927 | `deck-cover-proposal-dawn-sky-intent.json` |
| `cover-proposal-orbit` | `deck.cover-proposal` | `CoverProposalOrbit` | TASK-1927 | `deck-cover-proposal-orbit-intent.json` |
| `cover-proposal-orbit-sky` | `deck.cover-proposal` | `CoverProposalOrbit` | TASK-1927 | `deck-cover-proposal-orbit-sky-intent.json` |
| `decision-agenda` | `deck.decision-agenda` | `DecisionAgenda` | TASK-1928 | `deck-decision-agenda-intent.json` |
| `decision-ai-answer` | `deck.decision-ai-answer` | `DecisionAiAnswer` | TASK-1934 | `deck-decision-ai-answer-intent.json` |
| `decision-ai-market` | `deck.decision-ai-market` | `DecisionAiMarket` | TASK-1934 | `deck-decision-ai-market-intent.json` |
| `decision-case` | `deck.decision-case` | `DecisionCase` | TASK-1928 | `deck-decision-case-intent.json` |
| `decision-chart` | `deck.decision-chart` | `DecisionChart` | TASK-1928 | `deck-decision-chart-intent.json` |
| `decision-diagnosis-map` | `deck.decision-diagnosis-map` | `DecisionDiagnosisMap` | TASK-1934 | `deck-decision-diagnosis-map-intent.json` |
| `decision-difference` | `deck.decision-difference` | `DecisionDifference` | TASK-1934 | `deck-decision-difference-intent.json` |
| `decision-next-steps` | `deck.decision-next-steps` | `DecisionNextSteps` | TASK-1928 | `deck-decision-next-steps-intent.json` |
| `decision-plan` | `deck.decision-plan` | `DecisionPlan` | TASK-1928 | `deck-decision-plan-intent.json` |
| `decision-risk` | `deck.decision-risk` | `DecisionRisk` | TASK-1928 | `deck-decision-risk-intent.json` |
| `decision-testimonial` | `deck.decision-testimonial` | `DecisionTestimonial` | TASK-1928 | `deck-decision-testimonial-intent.json` |
| `decision-traffic-to-revenue` | `deck.decision-traffic-to-revenue` | `DecisionTrafficToRevenue` | TASK-1934 | `deck-decision-traffic-to-revenue-intent.json` |
| `decision-why-us` | `deck.decision-why-us` | `DecisionWhyUs` | TASK-1928 | `deck-decision-why-us-intent.json` |
| `method-eeat` | `deck.method-eeat` | `MethodEeat` | TASK-1934 | `deck-method-eeat-intent.json` |
| `method-hybrid-workforce` | `deck.method-hybrid-workforce` | `MethodHybridWorkforce` | TASK-1928 | `deck-method-hybrid-workforce-intent.json` |
| `method-hybrid-workforce-scene` | `deck.method-hybrid-workforce.scene` | `MethodHybridWorkforceScene` | TASK-1928 | `deck-method-hybrid-workforce-scene-intent.json` |
| `method-score-ring` | `deck.method-score-ring` | `MethodScoreRing` | TASK-1928 | `deck-method-score-ring-intent.json` |
| `method-staircase` | `deck.method-staircase` | `MethodStaircase` | TASK-1919 | `deck-method-staircase-intent.json` |
| `method-staircase-flat` | `deck.method-staircase.flat` | `MethodStaircaseFlat` | TASK-1928 | `deck-method-staircase-flat-intent.json` |
| `method-surround-cycle` | `deck.method-surround-cycle` | `MethodSurroundCycle` | TASK-1934 | `deck-method-surround-cycle-intent.json` |
| `proposal-cinematic-aeo` | `deck.proposal-cinematic` | `ProposalCinematic` | TASK-1919 | `deck-proposal-document.json#page=3` |
| `proposal-cinematic-creative` | `deck.proposal-cinematic` | `ProposalCinematic` | TASK-1919 | `deck-proposal-document.json#page=1` |
| `proposal-cinematic-revops` | `deck.proposal-cinematic` | `ProposalCinematic` | TASK-1919 | `deck-proposal-document.json#page=4` |
| `proposal-cinematic-seo` | `deck.proposal-cinematic` | `ProposalCinematic` | TASK-1934 | `deck-proposal-cinematic-seo-intent.json` |
| `proposal-cinematic-web` | `deck.proposal-cinematic` | `ProposalCinematic` | TASK-1919 | `deck-proposal-document.json#page=2` |
| `proposal-cinematic-nexa` | `deck.proposal-cinematic.hero` | `ProposalCinematicHero` | TASK-1927 | `deck-proposal-cinematic-hero-intent.json` |
| `proposal-cinematic-nexa-lines` | `deck.proposal-cinematic.lines` | `ProposalCinematicLines` | TASK-1927 | `deck-proposal-cinematic-lines-intent.json` |
| `proposal-service-aeo` | `deck.proposal-service` | `ProposalService` | TASK-1928 | `deck-proposal-service-aeo-intent.json` |
| `proposal-service-creative` | `deck.proposal-service` | `ProposalService` | TASK-1928 | `deck-proposal-service-creative-intent.json` |
| `proposal-service-revops` | `deck.proposal-service` | `ProposalService` | TASK-1928 | `deck-proposal-service-revops-intent.json` |
| `proposal-service-seo` | `deck.proposal-service` | `ProposalService` | TASK-1934 | `deck-proposal-service-seo-intent.json` |
| `proposal-service-web` | `deck.proposal-service` | `ProposalService` | TASK-1928 | `deck-proposal-service-web-intent.json` |
| `section-bleed` | `deck.section-bleed` | `SectionBleed` | TASK-1928 | `deck-section-bleed-intent.json` |
| `section-cine-services` | `deck.section-cine.services` | `SectionCine` | TASK-1928 | `deck-section-cine-services-intent.json` |
| `section-cine-team` | `deck.section-cine` | `SectionCine` | TASK-1928 | `deck-section-cine-team-intent.json` |
| `section-cine-about` | `deck.section-cine.about` | `SectionCineAbout` | TASK-1928 | `deck-section-cine-about-intent.json` |
| `section-cine-purpose` | `deck.section-cine.purpose` | `SectionCinePurpose` | TASK-1928 | `deck-section-cine-purpose-intent.json` |
| `section-classic` | `deck.section-classic` | `SectionClassic` | TASK-1919 | `deck-section-classic-intent.json` |
| `section-lens` | `deck.section-lens` | `SectionLens` | TASK-1928 | `deck-section-lens-intent.json` |
| `section-split` | `deck.section-split` | `SectionSplit` | TASK-1919 | `deck-section-split-intent.json` |
| `section-split-corner-bottom` | `deck.section-split.corner-bottom` | `SectionSplitCornerBottom` | TASK-1927 | `deck-section-split-corner-bottom-intent.json` |
| `section-split-panel-end` | `deck.section-split.panel-end` | `SectionSplitPanelEnd` | TASK-1927 | `deck-section-split-panel-end-intent.json` |
| `triptych` | `deck.triptych` | `Triptych` | TASK-1919 | `deck-triptych-intent.json` |

Los intents viven en `src/lib/brand-surfaces/examples/`. La tabla se deriva de `recipe-map.json` + `registry.json`; si
difiere del código, manda el código (y `pnpm brand:deck-recipes -- --check` lo detecta en el índice humano).

## 5. Builders por archivo

Todos en `src/lib/brand-surfaces/recipes/`, registrados en `BUILDERS.deck` de `src/lib/brand-surfaces/index.ts`
(`DECK_BUILDERS` ya incluye `FRAME_BUILDERS` y `proposal-service`).

| Archivo | Recetas AXIS (clave del builder) | Notas |
|---|---|---|
| `deck.ts` | `proposal-cinematic` (ramifica por `layout`: `service`, `hero`, `lines`; en `service`, la nota del pie `reserves.note`/`type.note` y `bodyUnderSelection` cuando la selección va abajo, TASK-1934), `section-classic`, `section-split`, `content-measure`, `triptych`, `method-staircase` (`steps` y `flat`; la plana devuelve `deck.method-staircase.flat`) | Define `RecipeContext`/`RecipeBuilder` y `progressIndicatorLayer` (el indicador «sección n de N» pintado por AXIS; acepta `ringOpacity` y un `center` medido, que usa la sección a sangre). `DECK_BUILDERS` agrupa el marco y `proposal-service` |
| `frame.ts` | `cover-brochure` (`document`, `line`, `document-selection`), `cover-proposal` (`orbit`, `dawn`), `close-brochure` (`orbit`, `photo`), `close-proposal` | Marco del documento (TASK-1927). `answerSelection` exige un solo cursor de colaborador delegado por AXIS y `targetKind: 'text'`; con `document-selection` devuelve `contentType: 'deck.cover-brochure.document-selection'`. Contacto desde `EFEONCE_CONTACT` |
| `proposal-service.ts` | `proposal-service` | La propuesta sobria: una receta AXIS para las cinco recetas del catálogo (la línea cambia el acento). Desde TASK-1934 la lente admite un plate de cine (la SEO usa SE1) y orienta el recorte con `photo.focus` si el intent lo trae |
| `method.ts` | `decision-plan`, `method-score-ring`, `method-hybrid-workforce` (`ladder` y `scene`) | La escalera, con su composición `flat`, vive en `deck.ts` |
| `close.ts` | `breather`, `decision-next-steps`, `content-pricing` (`table`, `stage`, `live`) | Montos siempre `[MONTO]`; contacto desde `EFEONCE_CONTACT`. Exporta `documentVars` y `platformSvg`, que reusan otras familias |
| `proof.ts` | `content-focus`, `content-clients`, `content-partners`, `decision-risk`, `decision-case`, `decision-chart`, `decision-testimonial`, `decision-why-us` | Cifras por `figures` del contrato con fuente obligatoria; logos de terceros como asset `logo`; barras desde su número |
| `sections.ts` | `section-lens`, `section-bleed`, `section-cine` (`team`, `services`, `about`, `purpose`), `content-team`, `content-stack` | La lente de `section-lens` es un asset `painted`. Exporta `liveVoiceFrame` (voz de las láminas «vivas») |
| `content.ts` | `contact-sheet`, `content-text`, `content-bullets`, `content-day` (`clock`, `tools`, `live-progress`, `live-results`), `decision-agenda` | La lente del reloj aplica `photo.focus` como recorte dirigido del plate |
| `seo-aeo.ts` + `seo-aeo/<receta>.ts` | `decision-ai-answer`, `decision-ai-market`, `method-surround-cycle`, `decision-difference`, `method-eeat`, `decision-traffic-to-revenue`, `decision-diagnosis-map` | Las siete láminas SEO/AEO de TASK-1934, un archivo por lámina en `recipes/seo-aeo/`, agregadas en `SEO_AEO_BUILDERS` (`recipes/seo-aeo.ts`, dentro de `BUILDERS.deck`). Voz «viva» con `liveVoiceFrame` de `sections.ts` (la pregunta baja a dos líneas desde `questionWrapChars`). Cifras por `figures` con fuente; datos de muestra exigidos mientras el intent sea ilustrativo (`evidenceRef` con datos del cliente); interfaz de IA sólo en SVG genérico |
| `kit.ts` | — | Ayudas compartidas de TASK-1928 (§2.3). No decide copy ni geometría de ninguna receta |
| `stills.ts`, `overlays.ts` | `web.*`, `dooh.*`, `motion.*`, `audiovisual.*` | Catálogos `graphic-line-stills` y `graphic-line-overlays` (TASK-1919); fuera del alcance del deck |

## 6. Assets externos y cómo se materializan

El builder declara `SurfaceAssetRequest[]`; quien compone los convierte en bytes (data URI) antes del render, porque el
render bloquea la red y no lee rutas externas. La clave de cada asset es su referencia sin el prefijo `asset-ref:`.

| `kind` | Referencia | Qué declara | Cómo lo materializa `compose.ts` |
|---|---|---|---|
| `plate` | `asset-ref:plate:<id>` | `path` del plate aprobado y `fit` (ancho × alto) | `sharp` con `fit: 'cover'` centrado → JPEG 90 |
| `plate` con `focus` | igual | `focus: { xOfWidth?, yOfHeight? }` (0–1 del archivo) | recorte dirigido (`focusedCrop`): escala para cubrir la caja y corre la ventana hacia el foco. Sólo cuando el intent declara `photo.focus`; hoy lo aplica la lente de `content-day` |
| `svg` | `asset-ref:layer:<id>`, `asset-ref:icon:<glyph>-<line>-…` | el SVG ya pintado por AXIS (órbita, lente, progreso, ícono) | data URI SVG tal cual |
| `painted` | `asset-ref:layer:<id>` | un SVG pintado por el motor de la línea gráfica con un **marcador** donde va la foto, más `photo.path` y `photo.fit` | recorta el plate, lo convierte en data URI JPEG y reemplaza el marcador dentro del SVG; falla si el SVG no lleva el marcador. Lo usa la lente de `section-lens` |
| `file` | `asset-ref:file:<id>` | un archivo que se entrega tal cual: el logo del cliente de la portada de propuesta, las fotos del squad de `content-team`, los isotipos de herramientas del stack y del día a día, el isotipo de Efeonce | SVG o PNG sin recorte; otra extensión falla |
| `logo` | `asset-ref:file:<id>` | logo de tercero normalizado: `tone`, `inkArea`, `maxWidth`, `maxHeight`, y opcionales `knockout`, `recolor`, `recolorBox` | `normalizedLogo`: rasteriza, mide el área de tinta, escala para que todos los logos tengan la misma (dentro de su caja) y lo pinta en UN tono. `knockout` descarta el fondo casi blanco de un logo en caja; `recolor` (la excepción tonal: Aguas Andinas y UC de Temuco) reemplaza colores por tonos del mismo color en vez de aplanar, y `recolorBox` compensa su menor peso. Sale como SVG con su tamaño intrínseco (PNG a 2× adentro) |

Los plates viven fuera de git (`ai-generations/**/*.png`): si falta uno, el comando falla con el aviso y no deja salida.
La procedencia registra el sha256 de los `plate` y los `file`.

> Estado de código: esta materialización es la de `scripts/brand-surfaces/compose.ts` en `develop`. TASK-1921 (en curso,
> otra sesión) construye la ruta productiva; cuando cierre, su spec dirá dónde queda la materialización compartida.

## 7. Resolvers, hooks y CSS

### 7.1 Resolvers (`graphic-line-shared/resolvers.ts`)

Convierten valores semánticos del plan en presentación. Los valores de marca salen de `graphic-line-tokens.json`
(snapshot que genera `pnpm brand:tokens`); el motor no importa AXIS.

| Resolver | Para qué |
|---|---|
| `gl-line` | clase de tono de la línea de servicio en la raíz; el fondo es siempre el de Efeonce |
| `gl-answer` | escribe la respuesta y ajusta el aire de la esfera según la última letra (esfera y palabra no se separan) |
| `gl-steps-layout` | pasos en fila (`inline`) o en columnas (`columns`) |
| `gl-split-layout` | composición de la sección partida (`corner-top`, `corner-bottom`, `panel-end`) |
| `gl-current-stop` | parada actual del plan (1–3) |
| `gl-label-side` | lado del rótulo (`start`, `end`) |
| `gl-chosen-day`, `gl-chosen-time` | día (1–5) y hora (1–4) elegidos en la agenda |
| `gl-recommended` | plan recomendado de la cotización (1–3) |
| `gl-align` | alineación de un rótulo (`start`, `end`, `center`); lo usa el reloj del día (TASK-1928) |
| `gl-item-role` | ficha al frente (`lead`) o detrás (`rest`) (TASK-1928) |
| `gl-figure-size` | cifra grande o chica (`large`, `small`); lo usa «por qué elegirnos» (TASK-1928) |
| `gl-alt`, `gl-backdrop-alt` | texto alternativo de la foto o del fondo (una órbita decorativa va vacío) |
| `gl-icon-ref`, `gl-layer-ref`, `gl-plate-ref`, `gl-file-ref`, `gl-backdrop-ref` | validan la referencia `asset-ref:` de su tipo y la ponen en `src` |
| `gl-css` | una custom property `--gl-*` numérica con unidad (nunca color ni familia) |
| `gl-color` | un color resuelto por AXIS como `--gl-<nombre>-color=#rrggbb` |
| `gl-slogan-run` | un tramo del eslogan: peso, itálica y color |
| `gl-px-<campo>`, `gl-share-<campo>` | medidas de la lista cerrada `GRAPHIC_LINE_LAYOUT_VARS` / `GRAPHIC_LINE_SHARE_VARS` como custom properties |

### 7.2 Layout hooks (`graphic-line-deck/index.ts`)

La selección y el CTA se dibujan sobre límites **reales** del DOM ya lleno, así que son layout hooks y no slots. Sus
pintores los inyecta el consumidor: `createCatalog({ selectionPainter, ctaPainter })`. Sin pintor y con selección o CTA
en el plan, el render **falla** (una lámina aprobada con selección no puede salir sin ella). El pintor canónico de
Greenhouse resuelve `efeonce.collaboration-selection` con `resolveCollaborationSelectionIntent` y lo pinta con el
adaptador `renderCollaborationSelection`. Los dos hooks esperan `document.fonts.ready` antes de medir.

**Selección (`makeSelectionHook`, `graphic-line-shared/selection-hook.ts`).** Plantillas: `ProposalCinematic`,
`ProposalCinematicHero`, `ProposalCinematicLines`, `ProposalService`, `MethodHybridWorkforce`,
`MethodHybridWorkforceScene`, `CoverBrochure`, `CoverProposalOrbit`, `CoverProposalDawn`, `DecisionTestimonial`,
`ContentText`, `ContentDay` (`TEMPLATES_WITH_SELECTION`).

- Objetivo: `[data-gl-selection-target]`. `targetKind` `text` mide la tinta del texto (rango de letras) con un aire del
  16 % del alto; `object` y `group` miden la caja.
- `textPad: 'per-line'`: el aire se calcula sobre el alto de **una** línea (la fuerza híbrida con respuesta en dos
  líneas); sin él, sobre el alto total, como se aprobaron las láminas hasta TASK-1927.
- `also`: cursores adicionales sobre el mismo objetivo (etiqueta, ancla, acción `select`|`resize`, tipo y color
  opcional); llegan al pintor como `extraCursors`.
- `targets`: varias selecciones con cajas ya medidas en coordenadas del lienzo (la escena de la fuerza híbrida); no se
  mide el DOM.
- Valida ancla (`top-start`, `top-end`, `bottom-end`, `bottom-start`), tipo de participante, color `#rrggbb` y que la
  pintura quede dentro del lienzo.

**Selección por ítem o nivel (`levelSelectionHook`).** Envuelve al hook de selección: con `selection.level` marca la
fila `[data-gl-level-row]` n.º N (1 = abajo) y con `selection.item` el ítem `[data-gl-select-item]` n.º N como
objetivo; si no existe, falla. Plantillas: `MethodStaircase`, `MethodStaircaseFlat`, `ContentPricing`,
`ContentPricingStage` y `ContentClients`, `ContentPartners`, `DecisionRisk`, `DecisionCase`, `DecisionChart`,
`DecisionWhyUs`, `ContentTeam`, `ContactSheet`, `ContentBullets`, `DecisionAgenda`.

**Cursor del lector / CTA (`makeCtaHook`, `graphic-line-shared/cta-hook.ts`).** Plantillas: `CloseBrochure`,
`MethodScoreRing`, `DecisionNextSteps`, `ContentPricingLive`, `SectionCine`, `ContentDayProgress`, `ContentDayResults`
(`TEMPLATES_WITH_READER_CURSOR`, `cursorScale: 1`). Objetivo `[data-gl-cta-target]`; el descriptor
`[data-gl-cta-descriptor]` se coloca bajo lo pintado. Por defecto el marco es `open-brackets` sobre un grupo; con
`cta.variant: 'eight-handles'` es un marco de ocho manijas sobre **texto** (la sección de servicios, TASK-1928), que
recorta la caja al alto de la tinta (16 % arriba, 9,6 % abajo). Una receta que mide su propio CTA manda
`cta.cursorScale` y `cta.descriptorGapPx`.

**Portada con selección (`document-selection`).** `CoverBrochure` marca la respuesta con `data-gl-selection-target` y
declara el slot opcional `selection`; el builder lo llena sólo con `layout: 'document-selection'`. AXIS `v0.3.21`
(delta (l) del ADR) fija la composición: misma columna y foto que `document`, ocho manijas sobre la respuesta («Crecer.»)
—nunca sobre la persona—, **un** cursor de colaborador «Nexa» (`participantKind: person`) en `bottom-end`, escala 1,1,
overlay `none`; la respuesta baja 28 px (`column.answerWithSelectionExtraPx`) y la evidencia queda 130 px bajo ella
(`bodyBelowAnswerPx.withSelection`). La firma es el logo (sin burbuja URL). `document` y `line` siguen rechazando
selección (`selection-not-in-recipe`).

### 7.3 CSS acotado por prefijo

`graphic-line.css` es el molde compartido del catálogo. Cada familia nueva declara en la raíz de su plantilla una clase
propia y sus reglas van bajo ese prefijo, para que una familia no mueva los frames de otra. Prefijos vigentes
(ledger del gate): marco `.gl-frame`; `lines` `.gl-pl`; propuesta sobria `.gl-ps`; método `.gl-mf`, `.gl-dp`, `.gl-sr`,
`.gl-hw`, `.gl-url-lum`; cotización y cierre `.gl-br`, `.gl-ns`, `.gl-pt`, `.gl-pcs`, `.gl-pv`, `.gl-flow-voice`;
prueba `.gl-cf`, `.gl-cc`, `.gl-cpt`, `.gl-dr`, `.gl-dc`, `.gl-dch`, `.gl-dt`, `.gl-dw`; secciones `.gl-sec`, `.gl-tm`,
`.gl-stk`, `.gl-live-voice`; contenido `.gl-cs`, `.gl-ct`, `.gl-cb`, `.gl-cd`, `.gl-cdl` (`.gl-cdt`, `.gl-cdp`, `.gl-cdr`),
`.gl-ag`; SEO/AEO (TASK-1934) `.gl-aa`, `.gl-am`, `.gl-sur`, `.gl-df`, `.gl-ee`, `.gl-ttr`, `.gl-dm`. Lección registrada: la escena de la cotización usa `.gl-pcs` porque compartir `.gl-ps` con la propuesta sobria
movía su frame.

## 8. Decisiones de norma que viven en las plantillas

Sobre la referencia aprobada manda la norma (`EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6). Estas decisiones están en el
código, no en una revisión a ojo:

| Decisión | Cómo se aplica | Cómo se verifica |
|---|---|---|
| **D1** — el acento nunca en texto de menos de 24 px | kickers, cabeceras, rótulos y etiquetas chicas en navy (papel) o en el texto claro (oscuro) | auditoría renderizada del gate, regla `accent-text-min-size`, en todos los frames |
| **3×** — la respuesta mide al menos 3 veces la pregunta | respuestas a 120 px en cotizaciones, plan, clientes, partners, testimonio y las siete SEO/AEO (DeckIARespuesta, DeckDiferencia y DeckEEAT subieron a 120 px; en DeckIARespuesta la ventana trasera se corrió a 860 y se angostó a 450) | auditoría renderizada, regla `answer-ratio`, en `ANSWER_RATIO_CONTENT_TYPES`: `deck.content-pricing`, `.stage`, `.live`, `deck.content-clients`, `deck.decision-plan`, `deck.content-partners` y las siete de TASK-1934 (`deck.decision-ai-answer`, `deck.decision-ai-market`, `deck.method-surround-cycle`, `deck.decision-difference`, `deck.method-eeat`, `deck.decision-traffic-to-revenue`, `deck.decision-diagnosis-map`) |
| **Cifras con fuente visible** | toda cifra llega por `figures` (valor, rótulo y fuente obligatoria); la lámina imprime «Fuente: …» | AXIS rechaza la cifra sin fuente (`surface-issues`); test del mapper |
| **Lámina interior con foto: sin logo** | las secciones de cine no llevan el logo chico de portada; el eyebrow vuelve al margen | plantilla sin nodo de logo; frame del gate |
| **Sin velo sobre la foto** | «quiénes somos» y «por qué lo hacemos» sin degradado lateral | regla `no-scrim` del token de AXIS; la plantilla no tiene capa de velo |
| **Montos como `[MONTO]`** | los montos se imprimen como marcador | intents de ejemplo; frame |
| **Contacto desde `EFEONCE_CONTACT`** | `src/config/efeonce-brand.ts`, nunca del intent | test «el contacto de los próximos pasos sale de los datos de Efeonce» |
| **Datos de muestra marcados** (AXIS `illustrative-data-marked`) | «Ejemplo ilustrativo» en `decision-ai-answer` y «Datos de muestra» en `decision-diagnosis-map` mientras `dataOrigin` sea `illustrative` (por defecto); con `dataOrigin: 'client'` el builder exige `evidenceRef` | tests del builder (sin la marca no compone) |
| **Interfaz de IA genérica** (AXIS `generic-ai-interface`) | la interfaz del motor es SVG genérico; los nombres de motores sólo como texto en el diagnóstico | test sobre el HTML: sólo SVG, sin nombres ni colores de productos |
| **Burbuja URL en partners** | en el pie de `content-partners` | frame del gate |
| **Logos de terceros normalizados** | un tono, el mismo peso óptico; excepción tonal declarada | asset `logo` (§6) |
| **Barras desde su número** | índice, antes = 100 | builder de `decision-chart` |

La auditoría renderizada vive en `graphic-line-shared/rendered-audit.ts` (`auditGraphicLineRendered`) y la corre el gate
sobre cada probe de los catálogos de La órbita: una violación falla el gate igual que un píxel.

## 9. Gates y tests

| Gate / test | Qué asegura |
|---|---|
| `pnpm composer:visual-gate --catalog=graphic-line` | **73 frames a 0 px** (57 del deck, 9 de stills, 7 de overlays) + auditoría renderizada D1 y 3×. Los siete frames de las plantillas de TASK-1934 y el re-congelado de `ProposalCinematic` (la nota del pie mueve su probe) se congelaron el 2026-09-28 tras la aprobación visual del operador (`c652f4f83`, ledger (o)) |
| `pnpm composer:visual-gate --catalog=glitch` | 26 frames a 0 px del catálogo de Glitch (comparte motor, manifest y ledger) |
| `--selftest` / `--freeze` | dos corridas deben dar 0 px antes de congelar; `--freeze` es **single-owner, serializado y atómico con su commit**, y cada frame cambiado se declara antes en la sección nueva sin sellar de `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`, que el freeze sella (runbook §5; TASK-1927: entradas (b)–(e); TASK-1928: (f), (h)–(n); (g) es Glitch) |
| `src/lib/brand-surfaces/__tests__/recipe-map.test.ts` | el intent de ejemplo de cada receta planifica al `contentType` que promete `recipe-map.json` |
| `src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts` | cada slot de la receta tiene campo, tipo compatible, obligatoriedad y el mismo largo máximo (en plantilla compartida manda el mayor) |
| `src/lib/brand-surfaces/__tests__/example-plans.test.ts` | snapshot del plan de cada `*-intent.json` (catálogo, `contentType`, slots, assets): un bump de AXIS o un cambio del mapper no mueve el plan de un intent publicado sin declararlo |
| `plan-surface-piece.test.ts`, `document.test.ts`, `frame-recipes.test.ts`, `deck-recipes.test.ts`, `stills-recipes.test.ts`, `overlays-recipes.test.ts` | reglas del mapper, del documento y de cada familia |
| `graphic-line-shared/__tests__/graphic-line-catalogs.test.ts`, `rendered-audit.test.ts` | guard de literales en plantillas y la auditoría renderizada |
| `scripts/brand-surfaces/__tests__/graphic-line-tokens-sync.test.ts` y `pnpm brand:tokens --check` | el snapshot compilado coincide con la versión instalada de `axis-tokens` |
| `pnpm brand:deck-recipes -- --check` | valida el catálogo de recetas y que el índice del README coincida; la columna «Plantilla» se deriva de `recipe-map.json` y exige que cada `contentType` exista en `registry.json`. Desde TASK-1929 también falla si el catálogo de runtime `src/lib/brand-surfaces/deck-recipes/catalog.generated.json` no coincide con el JSON aprobado (§12.1) |
| `src/lib/brand-surfaces/deck-recipes/__tests__/*.test.ts` | el plan de deck contra el catálogo (§12.8): validador, propuesta del agente con el cliente simulado y deriva del catálogo de runtime |

El probe del gate no usa fotos reales: `plate:probe`, `icon:probe`, `layer:probe` y `file:probe` son SVG sintéticos
(`GRAPHIC_LINE_PROBE_ASSETS`), así que ISSUE-122 no aplica. El probe **rellena todo slot opcional** (salvo
`"example": null`): por eso el frame `CoverBrochure` incluye la selección desde el ledger (n). La otra cara: **el gate
nunca ejercita el camino «ausente»** de un slot opcional, y los snapshots de planes no renderizan. Todo slot opcional
nuevo en una plantilla compartida lleva un test que compone una receta existente sin él (caso TASK-1934: la nota del
pie de `proposal-cinematic` rompía la página creativa sin nota; corregido en `af32d9353`, test
`src/lib/brand-surfaces/__tests__/proposal-cinematic-note.test.ts`). Runbook:
[`composer-visual-gate.md`](../operations/runbooks/composer-visual-gate.md).

## 10. AXIS: liberar y consumir

Serie publicada para TASK-1927 y TASK-1928 (tag del repo AXIS → `axis-tokens` / `axis-ui-contracts`):

| Tag | Versiones | Qué trajo | Commit Greenhouse |
|---|---|---|---|
| `v0.3.11` | 0.3.11 / 0.3.9 | contrato 0.1.2 (deltas (b) y (c)) | `0d8a2b025` |
| `v0.3.12` | 0.3.12 / 0.3.10 | Glitch (TASK-1922) | `4dfb147f7` |
| `v0.3.13` | 0.3.13 / 0.3.11 | tokens del marco (delta (e)) | `884df13ac` |
| `v0.3.14` | 0.3.14 / 0.3.12 | tipografía de las contraportadas | `d24e62c4e` |
| `v0.3.15` | 0.3.15 / 0.3.13 | propuesta sobria (delta (f)) | `ab23fdd90` |
| `v0.3.16` | 0.3.16 / 0.3.14 | método (delta (g)) | `2c7c67c5d` |
| `v0.3.17` | 0.3.17 / 0.3.15 | cotización, próximos pasos y respiro (delta (h)) | `39b9c7006` |
| `v0.3.18` | 0.3.18 / 0.3.16 | prueba (delta (i)) | `82964f2b4` |
| `v0.3.19` | 0.3.19 / 0.3.17 | secciones y quiénes somos (delta (j)) | `3def01768` |
| `v0.3.20` | 0.3.20 / 0.3.18 | contenido y día a día (delta (k)) | `c3c290e16` |
| `v0.3.21` | 0.3.21 / 0.3.19 | `cover-brochure` · `document-selection` (delta (l)) | `88ce23831` |
| `v0.3.22` | 0.3.22 / 0.3.20 | las nueve láminas SEO/AEO (delta (m), TASK-1934) | `ed6995084` |
| `v0.3.23` | 0.3.23 / 0.3.21 | medidas que pidieron las plantillas SEO/AEO (delta (n)) | `434b10ddb` |

**Pines vigentes** (`package.json`): `@efeoncepro/axis-tokens` `0.3.23`, `@efeoncepro/axis-ui-contracts` `0.3.21`,
`@efeoncepro/axis-graphic-line` `0.7.0`, `@efeoncepro/axis-brand-assets` `0.3.5`, `@efeoncepro/axis-ui-registry`
`0.3.1`. Transitivos: `axis-ui-contracts` 0.3.21 fija `axis-tokens` 0.3.23 exacto; `axis-graphic-line` 0.7.0 sigue
fijando `axis-tokens` 0.3.12 y `axis-ui-contracts` 0.3.10, que el lockfile instala sólo para él.

Cambios de contrato de la serie TASK-1928 (aditivos, misma 0.1.2): una composición puede declarar `progress: false`;
`voice.maxWords` por receta (el testimonio cita hasta seis palabras; el resto sigue en tres); pasos sin íconos
(`steps.icons: false`) y con mínimo (`steps.min`); colores por nombre de paleta; `section-cine` ganó `about` y
`purpose`; `content-day` ganó `tools`, `live-progress` y `live-results`; `cover-brochure` ganó `document-selection`.
Serie TASK-1934 (aditiva, misma 0.1.2): siete recetas nuevas `approved` en estilo «vivo» (`deckLiveVoice`,
`deckStage`, `deckPlatform`, `deckGlass`); reglas `generic-ai-interface` e `illustrative-data-marked`; `proposal-service`
admite un plate de cine en la lente; `proposal-cinematic` suma `reserves.note`/`type.note` y `bodyUnderSelection`
(648 px, 25 px en 640); y, en `v0.3.23`, las medidas que las plantillas encontraron al construirse (entre ellas
`questionWrapChars` 20 en `decision-traffic-to-revenue` y `decision-diagnosis-map`, y la ventana trasera de
`decision-ai-answer` en 860 con 450 de ancho).

Secuencia para subir AXIS (detalle y credenciales en
[`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`](../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)):

1. En AXIS: tokens + contrato + prueba; subir la versión de `axis-tokens` y republicar `axis-ui-contracts` (fija la
   versión exacta de tokens, así que un token nuevo sólo llega con una versión de contratos que lo fije).
2. Antes de publicar, validar el consumidor contra el build local: copiar `packages/tokens/dist` del checkout de AXIS
   sobre `node_modules/@efeoncepro/axis-tokens/dist`, componer y correr el gate; después reinstalar. La copia nunca se
   commitea.
3. Publicar el tag de AXIS (con autorización del operador).
4. En Greenhouse: fijar las versiones exactas en `package.json` e instalar con credencial efímera (`.npmrc` temporal con
   `${NODE_AUTH_TOKEN}` y `NODE_AUTH_TOKEN="$(gh auth token)"` dentro de un subshell; el token nunca se imprime ni se
   guarda).
5. `pnpm brand:tokens` (y `pnpm glitch:tokens` si el bump toca `glitchLine`), `pnpm brand:tokens --check`, tests del
   mapper y `pnpm composer:visual-gate --catalog=graphic-line`; un píxel movido por el bump se explica y se declara.

## 11. Agregar una receta nueva, paso a paso

1. **AXIS primero.** La receta debe estar `approved` en `efeonceGraphicLine.surfaces.deck.recipes` y AXIS debe medir
   todo lo que la lámina pinta (reservas, tipografía, color, piezas). Lo que falte se pide en AXIS y se espera la
   publicación (§10).
2. **Builder.** En el archivo de su familia (`recipes/<familia>.ts`), un `RecipeBuilder` que lee `manifest.content` y
   los tokens con las ayudas de `kit.ts`, mezcla el token de la composición sobre la base si la receta tiene varias, y
   devuelve `slots`, `assets` y, si corresponde, `contentType: 'deck.<receta>.<layout>'`. Registrarlo en el
   `*_BUILDERS` de la familia (ya incluido en `BUILDERS.deck`).
3. **Plantilla.** `<plantilla>.html` sin valores de diseño literales (cada medida como custom property obligatoria) y
   `<plantilla>.slots.json` con los largos de la receta. En `registry.json`: agregar el `contentType` a
   `contentTypeTaxonomy`, la plantilla a `templates` y la entrada a `selector.map`.
4. **CSS.** Reglas en `graphic-line.css` bajo un prefijo nuevo, único, en la raíz de la plantilla (§7.3).
5. **Hooks.** Si lleva selección, agregar la plantilla a `TEMPLATES_WITH_SELECTION` (o a `levelSelectionHook` si la
   selección toma un ítem o un nivel) y marcar el objetivo en el HTML; si lleva cursor del lector, a
   `TEMPLATES_WITH_READER_CURSOR`. Si la norma exige 3×, agregar el `contentType` a `ANSWER_RATIO_CONTENT_TYPES`.
6. **Ejemplo y mapa.** `src/lib/brand-surfaces/examples/deck-<receta>-intent.json` (montos `[MONTO]`, fotos de ejemplo
   marcadas) y la fila en `recipe-map.json` con `contentType`, `example` y `slots`.
7. **Tests.** `recipe-map.test.ts`, `recipe-slot-parity.test.ts` y el snapshot de `example-plans.test.ts` (el snapshot
   nuevo es un alta; uno existente que cambia se declara).
8. **Índice.** `pnpm brand:deck-recipes` y `pnpm brand:deck-recipes -- --check`.
9. **Mirar.** `pnpm brand:compose -- --intent …` con el plate real y comparar contra la referencia aprobada.
10. **Gate.** `pnpm composer:visual-gate --catalog=graphic-line --selftest`, declarar el alta en una sección nueva de `BASELINE_DELTAS.md`,
    `--freeze` con el árbol del composer limpio salvo tu cambio, y commit atómico.

## 12. Plan de deck contra el catálogo (TASK-1929)

Antes de componer, un deck se puede **planear**: la lista ordenada de láminas, cada una nombrada por el **id de su
receta** en el catálogo aprobado (`EFEONCE_DECK_SLIDE_RECIPES_V1.json`), nunca por plantilla ni `contentType`. TASK-1929
agrega tres piezas: el catálogo legible en runtime, un validador determinista del plan y un agente que propone planes y
falla cerrado. Nada de esto compone, persiste ni confirma: es el paso anterior a `pnpm brand:compose` (§2) y el paso
`propose` del ciclo propose → confirm → execute.

Código: `src/lib/brand-surfaces/deck-recipes/` (`index.ts`, `catalog.ts`, `catalog.generated.json`, `types.ts`,
`issues.ts`, `validate.ts`, `propose.ts`). CLI: `scripts/brand-surfaces/deck-plan.ts`. Generador:
`scripts/creative/deck-recipes/render-index.mjs`.

### 12.1 El catálogo de runtime (artefacto generado)

- `catalog.generated.json` lo **escribe** `pnpm brand:deck-recipes` (el mismo generador que el índice del README del
  catálogo) desde el JSON aprobado de `docs/operations/brand-graphic-line/deck-recipes/` y los intents de ejemplo que
  `recipe-map.json` asigna a cada receta. Lleva `$comment` de «GENERADO, no se edita a mano». Pesa ~200 KB.
- Esquema `efeonce.deck-recipes.runtime.v1`: `source` (`schema`, `version`, `approvedAt` del JSON aprobado; hoy
  `efeonce.deck-slide-recipes.v1` 1.0.0, aprobado el 2026-09-27), `axisRecipeFamilies` (las cinco familias de AXIS:
  `cover-classic`, `close-classic`, `proposal-cinematic`, `section-cine`, `cover-brochure`) y `recipes`: las **78**,
  todas con `template` y con página de AXIS.
- Por receta sólo campos estructurados, nunca las notas en prosa: `id`, `name`, `family`, `documents`, `surface`,
  `photo { uses, plate }` (el plate es la ruta del archivo; `null` si la lámina no lleva foto: 44 de 78 llevan),
  `pairs { coverClose, variant, sequence }` (desde `pairsWith` por relación), `slots [{ name, type, required,
  maxChars }]`, `template` (el `contentType` de `recipe-map.json`, o `null`) y `axis { recipe, layout, role, theme,
  uses, progress, page }`. `page` es el intent de ejemplo **sin** lo que propaga el documento (`contract`, `version`,
  `surface`, `format`, `use`, `progress`).
- `pnpm brand:deck-recipes -- --check` no escribe y falla si el índice del README **o** el catálogo de runtime difieren
  de lo que generaría («el catálogo de runtime … no coincide con el JSON aprobado: corre «pnpm brand:deck-recipes»»).
  El generador acepta `--module <ruta>` para escribir o comparar otro destino.
- **Ningún módulo de `src/` lee el JSON de `docs/` con `fs`**: `catalog.ts` importa el artefacto. Lo asegura un test
  (§12.8).

`catalog.ts` expone `deckRecipeCatalog`, `getDeckRecipe(id)`, `listDeckRecipes(document?)`, `isAxisFamily(id)` y
`roleOf(recipe)` (el `axis.role`, o `cover`/`close` por familia). `getDeckRecipe` acepta además `cover-classic` y
`close-classic` de AXIS como recetas sin plantilla de catálogo, **sólo para `pitch` y `qbr`** (fueron reemplazadas en
brochure y propuesta el 2026-09-27); cualquier otra familia de AXIS, como `proposal-cinematic`, **no** es receta.

### 12.2 Tipos

`types.ts`:

| Tipo | Forma |
|---|---|
| `DeckDocumentKind` | `'proposal' \| 'brochure' \| 'pitch' \| 'qbr'` (`DECK_DOCUMENT_KINDS`) |
| `DeckPlan` | `{ document, line?, diagnosisDone?, slides }`. `line` es la línea del marco (AXIS: `growth`, `brand`, `engine`, `voice`, `revenue`); `diagnosisDone` marca una propuesta enviada después del diagnóstico |
| `DeckPlanSlide` | `{ recipeId, slots?, plateRef?, progress?, purpose? }`. Sin `slots` la lámina es un **esqueleto** y sus slots no se validan; `plateRef` reemplaza el plate de la receta (TASK-1931 lo servirá por `assetId`); `progress { sections, current }` fija la navegación; `purpose` no se valida |
| `DeckPlanIssue` | `{ code, severity: 'error' \| 'warning', source: 'axis' \| 'catalog' \| 'agent', slideIndex?, recipeId?, slot?, detail }` |
| `DeckPlanValidation` | `{ ok, issues }`; `ok` es `false` si hay al menos un `error` |

### 12.3 `validateDeckPlan(plan)`: dos capas

Pura, determinista e isomórfica: no lee archivos, no llama a la red, no escribe. Orden de evaluación:

0. **Forma.** `document` válido y al menos una lámina; si no, `plan-invalid` y termina.
1. **Cada lámina a su receta.** Sin `recipeId` → `plan-invalid`; una plantilla nombrada → `template-named-instead-of-recipe`;
   `slots` que no es objeto → `plan-invalid`; id que no está → `recipe-unknown` (con mensaje propio si es una familia
   de AXIS).
2. **Piso de AXIS.** Corre sólo si el documento es `proposal` o `brochure` (los que AXIS valida como documento), si
   **todas** las láminas resolvieron a receta y si todas tienen página de AXIS. Arma el documento con la página de
   ejemplo de cada receta en el orden del plan y lo valida `resolveSurfaceDocument` de `@efeoncepro/axis-ui-contracts`
   (`surface: 'deck'`, `format: '16x9'`, `use` = el documento). La línea es la del plan, o la de la página de la
   portada, o `growth`; la portada y el cierre pierden su `line` (el marco toma la del documento) y una página de
   servicio conserva la suya. `progress` sale del plan o se deriva del orden de las secciones (`role: 'section'`) para
   las recetas que lo llevan. Cada issue de AXIS entra con `severity: 'error'`, `source: 'axis'` y **su código tal
   cual**; un código de página `page[i]:<código>` se reporta como `<código>` en la lámina `i`. Códigos que aparecen en
   la práctica: `brochure-cover-first`, `brochure-close-last`, `brochure-needs-service-page`, `frame-photo-must-alternate`,
   `document-line-mismatch`, `use-not-for-recipe`, `progress-required`.
3. **Reglas del catálogo** (`source: 'catalog'`), las que AXIS no conoce (tabla de §12.4).

Greenhouse no reimplementa ninguna regla de AXIS (§1): el piso es AXIS, y el catálogo sólo agrega lo que el contrato no
sabe del catálogo de recetas (ids, documentos por receta, parejas, variantes, plates, slots, cifras con fuente y ritmo).

### 12.4 Códigos del catálogo

`DECK_PLAN_ISSUE_CODES` (`issues.ts`) fija la severidad de cada código; todos llevan `source: 'catalog'`.

| Código | Severidad | Cuándo |
|---|---|---|
| `plan-invalid` | error | sin `document` válido, sin láminas, lámina sin `recipeId` o `slots` que no es objeto |
| `template-named-instead-of-recipe` | error | la lámina trae `template` o `contentType`, o su id empieza con `deck.` o con mayúscula |
| `recipe-unknown` | error | el id no está en el catálogo (una familia de AXIS tampoco, salvo los marcos clásicos en pitch y QBR) |
| `recipe-not-for-document` | error | el documento no está en `documents` de la receta; se omite si AXIS ya dijo `use-not-for-recipe` en esa lámina |
| `frame-count` | error | más de una portada o más de un cierre (cubre también «el eslogan dos veces») |
| `frame-order` | error | la portada no es la primera o el cierre no es el último; se omite si AXIS ya dijo `brochure-cover-first` o `brochure-close-last` |
| `pair-cover-close-mismatch` | error | el cierre no es pareja aprobada (`pairsWith` `cover↔close`, por id o por familia de AXIS) de la portada; sólo si alguna de las dos declara parejas |
| `next-steps-after-diagnosis` | error | una receta de la familia `next-steps` (`decision-next-steps`, `decision-diagnosis-map`) en una propuesta con `diagnosisDone: true` (desde TASK-1934 se decide por familia, no por id) |
| `variant-both-in-deck` | error | dos variantes de la misma lámina (`pairsWith` `variant`, en cualquiera de las dos direcciones) en el mismo plan, **seguidas o no**; se reporta en la segunda. Reemplaza a `variant-adjacent` (TASK-1934, decisión del operador del 2026-09-28); dos portadas o dos cierres ya los rechaza `frame-count` |
| `plate-repeated` | error | el mismo plate (el `plateRef` de la lámina o el de la receta) en dos láminas del plan |
| `slot-unknown` | error | un slot que la receta no tiene (por ejemplo, un eslogan en una portada: ninguna portada tiene ese slot) |
| `slot-type-invalid` | error | el valor no calza con el tipo del slot (texto para `text`/`richText`/`enum`/`date`, lista para `list`, escalar u objeto para `number`/`money`/`metric`) |
| `slot-required-missing` | error | falta un slot obligatorio (vacío, `null`, texto en blanco o lista vacía) |
| `slot-over-max-chars` | error | supera `maxChars`: `text`, largo total; `richText`, por línea (salto o `<br>`) y sin `**` ni etiquetas; `list`, por ítem |
| `figure-source-missing` | error | una cifra (objeto con `value`) en un slot del plan sin `source`, o un ítem así en una lista (TASK-1934). Límite conocido: una cifra escrita como texto plano en un slot `metric` («68 %») no se detecta |
| `recipe-without-template` | warning | la lámina no tiene plantilla en el composer: una receta sin ella (hoy ninguna de las 78; se prueba con un catálogo simulado) o la portada/cierre clásicos de AXIS que el plan admite en pitch y QBR (`cover-classic`, `close-classic`): el plan es válido, pero ese deck no se compone de punta a punta |
| `section-split-corner-adjacent` | warning | dos `section-split` seguidas con la misma esquina (sin `layout`, cuenta como `corner-top`) |
| `rhythm-paper-run` | warning | tres láminas de papel (`theme: 'light'`) seguidas; un solo aviso por tramo, en la tercera |

Los slots sólo se validan en las láminas que traen `slots`. Un aviso no hace `ok: false`.

**Reglas de la norma que no tienen código propio, y por qué** (lo documenta también el encabezado de `issues.ts`):

| Regla | Quién la cubre |
|---|---|
| Foto y sin foto se alternan entre portada y cierre | AXIS, `frame-photo-must-alternate` (piso, sólo proposal y brochure) |
| El eslogan nunca en la portada | `slot-unknown`: ninguna portada del catálogo tiene slot de eslogan |
| El eslogan una sola vez | `frame-count`: el eslogan va sólo en el cierre y hay un solo cierre |
| El mensaje del cierre y las familias que un documento excluye | `recipe-not-for-document` (campo `documents` de cada receta) |
| El orden de una secuencia | **ninguna, retirada a propósito:** `pairsWith` con `sequence` dice qué láminas van juntas, no en qué orden (medido el 2026-09-28: `proposal-cinematic-nexa-lines` lista la portada como secuencia); una regla `sequence-order` daría avisos falsos |
| Ritmo papel/oscuro | quedó como `rhythm-paper-run`, sólo papel: lo oscuro es el fondo base del deck y tres oscuras seguidas es la norma |

### 12.5 Una regla, una voz (`AXIS_EQUIVALENT`)

Cuando AXIS y el catálogo podrían reportar lo mismo sobre la misma lámina, habla AXIS. `AXIS_EQUIVALENT` mapea cada
código del catálogo a sus equivalentes de AXIS; si AXIS ya emitió uno de ellos (en esa lámina, o en cualquiera para
`frame-order`), el del catálogo no se agrega:

| Código del catálogo | Equivalente de AXIS |
|---|---|
| `recipe-not-for-document` | `use-not-for-recipe` |
| `frame-order` | `brochure-cover-first`, `brochure-close-last` |

En pitch y QBR no corre el piso de AXIS, así que esas reglas las reporta sólo el catálogo.

### 12.6 `proposeDeckPlan(context)`: el agente propone y falla cerrado

`propose.ts` es `import 'server-only'`: llama al cliente LLM canónico.

- **Contexto por allowlist** (`normalizeDeckPlanContext`): sólo `document`, `audience` (`room` | `reading`), `line`,
  `diagnosisDone`, `sections` (1 a 20 temas), `availableFacts` (hasta 20 **nombres** de hechos, sin valores) y `brief`.
  Cada texto hasta 200 caracteres. Cualquier otra clave —un id de organización, un monto, un dato personal— lanza
  `DeckPlanContextError` antes de llamar al modelo.
- **Modelo:** `generateStructuredAnthropic` de `@/lib/ai/anthropic` con `DECK_PLAN_MODEL = 'claude-sonnet-5'`, tool
  forzado `propose_deck_plan` y `maxTokens` 4096. El prompt lleva el contexto y el catálogo **del documento**
  (`listDeckRecipes(document)`) en forma corta: id, nombre, familia, papel, foto, plate, `coverClose` y `variant`.
- **Salida restringida:** el schema del tool acota `recipeId` a un `enum` con los ids de ese catálogo; el modelo
  devuelve `slides [{ recipeId, purpose }]` + `rationale`. **No escribe contenido ni cifras.** El plan se arma con el
  `document`, la `line` y el `diagnosisDone` del contexto y se corta a 40 láminas.
- **Validación y un reintento:** el plan pasa por `validateDeckPlan`. Si trae errores, un solo reintento
  (`DECK_PLAN_MAX_ATTEMPTS = 2`) con `previousPlan` y `fixTheseIssues` (código, lámina y detalle de cada error).
- **Resultado (`DeckPlanProposal`):**
  - éxito → `{ ok: true, plan, issues, rationale, model, attempts, usage }`; `issues` sólo puede traer avisos;
  - errores tras el reintento → `{ ok: false, issues, rejectedPlan, model, attempts, usage }`; el plan rechazado sirve
    sólo para diagnóstico;
  - el proveedor falla → `{ ok: false, issues: [{ code: 'proposal-unavailable', severity: 'error', source: 'agent' }], … }`,
    sin filtrar el error del proveedor.
- **No escribe nada.** Un plan con errores nunca sale como bueno. La confirmación humana, la persistencia y el camino
  por API, Nexa y MCP son de TASK-1932 (§12.9).

### 12.7 CLI `pnpm brand:deck-plan`

`tsx --require ./scripts/lib/server-only-shim.cjs scripts/brand-surfaces/deck-plan.ts`:

| Uso | Qué hace | Salida |
|---|---|---|
| `pnpm brand:deck-plan -- --plan <plan.json>` | valida el plan | cada issue con `✗` (error) o `!` (aviso), código, `[source]`, lámina, slot y detalle; exit 1 si hay error, 2 si no puede leer el archivo |
| `pnpm brand:deck-plan -- --propose --context <context.json> [--out <plan.json>]` | pide el plan al agente, lo valida y lo imprime; con `--out` escribe el plan propuesto | modelo, intentos, tokens de entrada y salida y un **costo estimado** con una tarifa de referencia de USD 3 / 15 por millón (no es la factura); exit 1 sin plan válido, 2 con contexto inválido |

`--propose` necesita en local las credenciales del cliente canónico: `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key`
y `GCP_PROJECT=efeonce-group` con ADC vigente, si `.env.local` no las trae. Según el inventario de la task, una corrida
real el 2026-09-28 con `fixtures/context-brochure.json` entregó un plan válido de 16 láminas en el segundo intento (el
primero no tenía página de servicio: AXIS `brochure-needs-service-page`), 17 918 + 2 368 tokens, ≈ USD 0,09, con un
aviso `rhythm-paper-run`.

### 12.8 Tests y fixtures

`src/lib/brand-surfaces/deck-recipes/__tests__/`:

| Archivo | Qué asegura |
|---|---|
| `validate.test.ts` | el catálogo tiene 78 de 78 recetas con plantilla y página de AXIS; los planes golden de brochure, propuesta, pitch y QBR pasan sin issues; los 15 casos adversariales; `variant-both-in-deck` con las dos propuestas SEO separadas (y sin falso positivo con `proposal-service-seo` + `proposal-service-aeo`); `figure-source-missing` en `figures`; un caso que dispara y otro que no por cada código; «una regla, una voz» contra AXIS; ningún módulo de `src/` abre el JSON de `docs/` con `fs` |
| `recipe-without-template.test.ts` | el aviso con un catálogo simulado; los golden de pitch y QBR lo verifican en sus marcos clásicos |
| `catalog-drift.test.ts` | corre `pnpm brand:deck-recipes -- --check`: el artefacto coincide con el JSON aprobado y los ejemplos |
| `propose.test.ts` | con el cliente canónico simulado: golden, el enum de ids del documento, reintento, rechazo tras el reintento, proveedor caído, receta inventada y la allowlist del contexto |

Fixtures: `golden-brochure.json` (7 láminas), `golden-proposal.json` (9), `golden-pitch.json` (6; desde TASK-1934
lleva `content-measure` en vez de `content-text`, que es variante de `decision-why-us`), `golden-qbr.json`
(5), `adversarial.json` (15 casos) y `context-brochure.json` (el contexto de la corrida real). La task registra 52 tests
verdes.

### 12.9 Fronteras

- **Entrada pura vs `server-only`.** `@/lib/brand-surfaces/deck-recipes` (`index.ts`) exporta sólo lo isomórfico:
  catálogo, tipos, códigos (`DECK_PLAN_ISSUE_CODES`, `AXIS_EQUIVALENT`) y `validateDeckPlan`; se puede usar en un
  componente cliente. La propuesta se importa aparte desde `@/lib/brand-surfaces/deck-recipes/propose` y sólo corre en
  el servidor.
- **Qué no hace y quién es dueño:**

| Qué | Dueña |
|---|---|
| Confirmación humana, persistencia del plan, endpoint, acción de Nexa y tool MCP (el contrato gobernado de Full API Parity se completa ahí) | TASK-1932 |
| Llenar los slots con datos reales (logo del cliente, montos, equipo, métricas, casos) | TASK-1930 |
| Registrar y elegir plates por `assetId` (el validador sólo detecta el plate repetido dentro de un plan) | TASK-1931 |
| Componer el plan por la ruta productiva (command/API, `artifact-worker`, MCP); hoy se compone lámina a lámina o como documento con `pnpm brand:compose` | TASK-1921 |
| Los pendientes de QA del catálogo (el logo en la órbita del cierre, filas 15 y 16 de §6 de la norma) | TASK-1933 |

## 13. Límites conocidos y pendientes

- **Ruta productiva:** TASK-1921 (in-progress, otra sesión): command/API, consumer del `artifact-worker`, MCP; debe
  aceptar también el intent de documento. Hasta que cierre, `pnpm brand:compose` es el taller local.
- **TASK-1929 (complete, 2026-09-28):** el plan de un deck se valida contra el catálogo y un agente lo propone
  (§12). Falta cerrar la task: documentación, gates de cierre y `pnpm build`. El plan todavía no se confirma, no se
  persiste ni se compone de un paso: eso es TASK-1932 y TASK-1921.
- **TASK-1930:** datos reales en los slots (logo del cliente, montos, equipo, métricas, casos).
- **TASK-1931:** banco de plates gobernado.
- **TASK-1932:** Proposal Studio arma el deck desde las recetas (Nexa/MCP), con la confirmación humana del plan.
- **Abiertos de QA del catálogo:** el logo dentro de la órbita en el cierre (ninguna contraportada aprobada lo lleva
  así; TASK-1933); isotipos sin registro de procedencia; el plate P1 repetido (regla de uso). El plate P1
  (`P1-deck-lente-edicion.png`) lo comparten en el catálogo `section-lens`, `section-bleed` y `content-measure`: desde
  TASK-1929, usar dos de ellas en el mismo plan falla con `plate-repeated`, salvo que una traiga otro plate en
  `plateRef`.
- **Preguntas abiertas de TASK-1919 y TASK-1927** (lente del caminero, barrido del indicador de la sección partida, etc.):
  norma §7.
- **TASK-1934 (en curso):** los frames del gate de las siete plantillas SEO/AEO y el re-congelado de
  `ProposalCinematic` quedaron a 0 px el 2026-09-28 (aprobación visual del operador; `--freeze` single-owner en
  `c652f4f83`, ledger (o)); la propuesta cine sin nota vuelve a componer (`af32d9353`, con test). Sigue abierto: el plate SE1 se declara por
  ruta local y se siembra en el banco de TASK-1931; `figure-source-missing` no ve una cifra escrita como texto plano en
  un slot `metric`.
- **Las cinco `proposal-cinematic` sin mapa de slots** (`slots: null` en `recipe-map.json`): la plantilla cine admite
  textos más largos que los de cada receta; el freno es `slot-over-max-chars` de `validateDeckPlan`, probado con un
  fixture adversarial. Mapearlas juntas: TASK-1933.
- **`questionWrapChars` es una aproximación por caracteres:** decide si la pregunta de una lámina «viva» baja a dos
  líneas contando caracteres, no midiendo el texto. En TASK-1934 falló con preguntas de 21–22 caracteres que sí bajan a
  dos líneas a 470 px; AXIS `v0.3.23` lo fijó en 20 para `decision-traffic-to-revenue` y `decision-diagnosis-map`.
- **Salida PPTX:** no existe para este catálogo (depende de la matriz de TASK-1395).
