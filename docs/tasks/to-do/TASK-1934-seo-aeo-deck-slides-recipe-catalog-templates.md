# TASK-1934 — Las nueve láminas SEO/AEO aprobadas del deck «La órbita»: catálogo, plantillas del Artifact Composer, AXIS Lab y validador

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Perfil inferido (ajustable):** `backend-data` con `Backend impact: reader`, igual que TASK-1929, porque la task
> amplía la fuente de verdad del catálogo (`EFEONCE_DECK_SLIDE_RECIPES_V1.json` → `catalog.generated.json`) y cambia
> reglas de `validateDeckPlan`, que consumen la CLI, TASK-1921, TASK-1930 y TASK-1932. El grueso del trabajo son
> plantillas del catálogo `graphic-line-deck` (tooling, como TASK-1928). No hay base de datos, endpoint ni UI del portal:
> la vista ampliada del AXIS Lab ya existe y sólo recibe datos. P2 porque hoy esas láminas salen como maqueta de
> dirección declarada, no porque algo esté roto.

## Summary

El 2026-09-28 el operador aprobó nueve láminas nuevas del deck «La órbita» sobre SEO/AEO (canvas «La órbita», página
Deck, títulos «✅ APROBADA · …»). Hoy sólo existen como referencia aprobada y como código de dirección fuera del
catálogo. Esta task las lleva al flujo real: entran como recetas al catálogo (69 → 78); tienen plantilla en
`graphic-line-deck` con slots de datos, tokens AXIS y frame a 0 px; se publican en el AXIS Lab con su vista ampliada; y
`validateDeckPlan` las acepta en sus familias y documentos. Además, el validador pasa a rechazar una propuesta SEO sobria
y su versión cine en el mismo deck, y una cifra de mercado sin fuente.

## Why This Task Exists

- **Aprobadas pero no componibles.** Las nueve láminas viven en `ai-generations/2026-09-27_deck-recetas/render-src/`
  (`vive.mjs`: MX1…MX3 y MD1…MD4; `deck2.mjs`: `P5-seo` con `proposal()` y `P5b-seo-te-encuentran`) y en referencias
  locales fuera de git (`references-2026-09-28/`). El composer nunca renderiza una lámina que no está en su registro, y
  `validateDeckPlan` responde `recipe-unknown` a cualquier id que no esté en el catálogo. Una propuesta o un brochure de
  SEO/AEO hoy mezcla láminas de plantilla con láminas armadas a mano.
- **Las reglas que las hacen seguras no están en código.** El brief exige cifras siempre con fuente
  (DeckMercadoIA cita HubSpot 2026, McKinsey 2025 y SparkToro 2026), datos ilustrativos marcados («Ejemplo
  ilustrativo», «Datos de muestra») y una interfaz de IA genérica que no imite ChatGPT ni Gemini. Sin plantilla, cada
  deck vuelve a depender de que alguien lo revise a ojo.
- **El validador deja pasar lo que la norma prohíbe.** El README del catálogo dice que dentro de un par `variant` «se
  elige una», pero `variant-adjacent` (`src/lib/brand-surfaces/deck-recipes/validate.ts`) sólo rechaza dos variantes
  **seguidas**. La propuesta SEO sobria y la cine son alternativas: con el código de hoy, un plan que las pone separadas
  por otra lámina pasa limpio.
- **Sin dueña.** TASK-1928 cerró las 69 recetas de entonces, TASK-1929 el validador, TASK-1933 los pendientes de QA de
  esas 69 y TASK-1921 la ruta productiva. Ninguna tiene estas nueve (barrido en `TASK_ID_REGISTRY.md`, nota 2026-09-28).

## Goal

- El catálogo de recetas tiene 78 recetas con el mismo esquema `efeonce.deck-slide-recipes.v1`, y
  `pnpm brand:deck-recipes -- --check` pasa.
- Las nueve recetas componen desde su intent de ejemplo con `pnpm brand:compose`. Cada una tiene frame en
  `pnpm composer:visual-gate --catalog=graphic-line` a 0 px, aprobado antes a ojo contra su referencia.
- Las nueve reglas del brief (fuente de cifras, datos ilustrativos, IA genérica, una órbita, 3×, acento ≥ 24 px, montos,
  selección por contrato) se sostienen por test o por el gate, no por revisión.
- El AXIS Lab muestra las 78 láminas con su vista ampliada, y `validateDeckPlan` acepta las nuevas en sus familias y
  documentos, con dos reglas nuevas: alternativas nunca juntas y cifra sin fuente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (Artifact Composer domain-free; un autor
  nunca elige `template`; sólo el `ResolvedCompositionManifest` llega a render; render hermético)
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md` (cómo se agrega una receta del deck; §12 validador)
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§2.1 ruta por el composer, §4.6 deck y
  «Recetas por lámina», §6 reglas verificables, §7 estado)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (voz pregunta–respuesta, órbita, firma, burbuja URL)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` y `EFEONCE_DECK_SLIDE_RECIPES_V1.json`
- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md` (alcance del cine: `proposal-cinematic` sí)
- `docs/operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md` (AXIS posee valores y contratos)
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` (release y consumo de los paquetes AXIS)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- Repo AXIS local `/Users/jreye/Documents/axis-design-system`: `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md`,
  `docs/agent-composition/surfaces/deck.md`, `packages/tokens/src/tokens.ts` (`efeonceGraphicLine.surfaces.deck`) y
  `packages/contracts/src/surface-composition.ts`

Reglas obligatorias:

- **AXIS es dueño de valores y contratos.** Ninguna plantilla transcribe un px, un HEX o una familia tipográfica que un
  token o el manifest ya declaran. Las medidas de `prompts.composition` son dirección, no valores. Si falta un token, una
  receta o una composición, se agrega en AXIS de forma **aditiva**, con test de contrato y release; después se fija la
  versión en Greenhouse. Nunca se parchea un valor en Greenhouse.
- **Una receta entra al composer sólo si AXIS la declara `approved`.** Mientras AXIS no la publique,
  `planSurfacePiece` responde `recipe-not-approved`; la receta sigue siendo maqueta declarada.
- **El autor elige la receta, nunca la plantilla.** El `contentType` (`deck.<receta>[.<layout>]`) lo deriva
  `src/lib/brand-surfaces` del manifest; el plan que nombra una plantilla es inválido (`template-named-instead-of-recipe`).
- **Un texto que supera su `maxChars` falla la composición.** Nunca se reduce el cuerpo ni se mueve la órbita o la foto
  para que quepa.
- **Cifras con fuente o no componen.** Toda cifra de mercado entra por `figures` del contrato AXIS (valor, rótulo y
  fuente obligatoria) y la lámina imprime la fuente. Cambiar la cifra o la fuente exige citar el documento de origen
  (`docs/documentation/public-site/aeo-landing-elementor.md` §market), nunca memoria.
- **Datos ilustrativos siempre marcados.** «Ejemplo ilustrativo» (DeckIARespuesta) y «Datos de muestra»
  (DeckDiagnosticoMapa) no se pueden quitar. Cuando TASK-1930 ligue datos reales, la marca cambia sólo por un hecho
  con `evidenceRef`.
- **Interfaz de IA genérica.** Nunca se imita el cromo de ChatGPT, Gemini u otro motor (logo, color, burbuja, composer
  propio). Los nombres de motores pueden ir como texto en DeckDiagnosticoMapa. Si alguien quiere la interfaz real, eso
  son los recursos AEO candidatos de AXIS (`pnpm aeo:compose` en el repo AXIS), fuera de esta task.
- **Una sola órbita por lámina**, voz con respuesta ≥ 3× la pregunta, acento de línea sólo en texto ≥ 24 px, montos
  `[MONTO]`, y selección y cursores sólo por el contrato `efeonce.collaboration-selection`, con una selección por lámina.
- **Gate visual a cero píxeles.** `--freeze` single-owner, serializado y atómico con su commit y su entrada en
  `BASELINE_DELTAS.md`. El drift de foto raster es `ISSUE-122`, nunca motivo de rebaseline.
- **Una regla, una voz** (TASK-1929). El validador no duplica lo que `resolveSurfaceDocument` de AXIS ya valida. Si una
  regla nueva la emite AXIS, se lee de su resultado.

## Normative Docs

- `ai-generations/2026-09-27_deck-recetas/SEO-AEO-2026-09-28.md` (brief aprobado: tabla de boards, código de dirección,
  plate SE1, fuentes y reglas; hoy sin commitear, ver `### Gap`)
- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`
- `docs/manual-de-uso/creative/componer-recursos-aeo-con-axis.md` (frontera con los recursos AEO de AXIS)
- `docs/operations/runbooks/composer-visual-gate.md`
- `docs/issues/open/ISSUE-122-composer-visual-gate-photo-nondeterminism-concurrency-docs.md`
- `docs/documentation/public-site/aeo-landing-elementor.md` (§market: copy y fuentes de las tres cifras)
- `docs/tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md` (patrones de plantilla ya probados)
- `docs/tasks/complete/TASK-1929-deck-plan-recipe-catalog-validator.md` (catálogo de runtime y códigos del validador)

## Dependencies & Impact

### Depends on

- `TASK-1928` (complete): 69 recetas con plantilla, `recipe-map.json` con `slots`, paridad receta ↔ plantilla
  (`recipe-slot-parity.test.ts`), auditoría renderizada (`graphic-line-shared/rendered-audit.ts`) y gate a 0 px.
- `TASK-1929` (complete): `catalog.generated.json` generado por `pnpm brand:deck-recipes`, `validateDeckPlan`, códigos
  en `issues.ts`, fixtures golden y adversariales, CLI `pnpm brand:deck-plan`.
- AXIS `v0.3.21` (`@efeoncepro/axis-tokens` 0.3.21, `@efeoncepro/axis-ui-contracts` 0.3.19) como base. La publicación
  en AXIS de las recetas nuevas es out-of-band (repo `axis-design-system`) y cada slice de plantilla la espera.
- Código de dirección y brief **commiteados** por la sesión que los produjo:
  `ai-generations/2026-09-27_deck-recetas/render-src/vive.mjs`, `deck2.mjs`, `sel.mjs` (modificados sin commit al
  crear esta task) y `ai-generations/2026-09-27_deck-recetas/SEO-AEO-2026-09-28.md` (sin seguimiento). `renderSource`
  no puede apuntar a un script que el árbol commiteado no tiene.
- Dependencia blanda: `TASK-1931` (banco de plates gobernado, to-do). El plate SE1 se registra ahí; mientras el banco no
  exista, las recetas declaran el plate por ruta local igual que las 69 (`photo.plate`) y los intents de ejemplo usan el
  fixture del probe del gate.

### Blocks / Impacts

- `TASK-1930`: los binders cubren «todo slot `logo`, `money`, `metric`, `person` o de prueba» del catálogo, que pasa de
  69 a 78 recetas. Recibe `## Delta` con los slots nuevos (cifras de mercado, respuesta de ejemplo, datos de muestra
  del diagnóstico).
- `TASK-1931`: la siembra incluye el plate SE1 y las 78 recetas. Recibe `## Delta`.
- `TASK-1932` y `TASK-1921`: el consumer del `artifact-worker` renderiza estas plantillas sin cambio de código. El Job ya
  empaqueta el árbol del catálogo; los assets `file` nuevos (logos e íconos del repo) deben poder subirse por el
  uploader canónico (ya declarado en TASK-1921).
- `TASK-1933`: si esta task deja un pendiente de QA abierto en alguna de las nueve, lo anota en el registro de QA del
  README con su dueña; no toca las filas de TASK-1933.
- `TASK-1395`: la matriz PPTX debe declarar estas plantillas (nativa o falla cerrada).
- `TASK-1923` (Glitch) y cualquier sesión que congele frames: coordinar el orden de `--freeze`.

### Files owned

- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (nueve recetas, `count` 78) y
  `README.md` (índice generado, tabla de familias, códigos, pendientes de QA de las nueve)
- `src/lib/brand-surfaces/deck-recipes/catalog.generated.json` (regenerado), `validate.ts`, `issues.ts`,
  `__tests__/validate.test.ts`, `__tests__/fixtures/golden-*.json`, `__tests__/fixtures/adversarial.json`
- `src/lib/artifact-composer/catalogs/graphic-line-deck/<receta>.html` y `<receta>.slots.json` para las siete recetas con
  plantilla nueva `[nuevos]`, `registry.json`, `recipe-map.json`, `index.ts`; `graphic-line.css` sólo si una excepción
  declarada lo exige
- `src/lib/artifact-composer/catalogs/graphic-line-shared/rendered-audit.ts` (`ANSWER_RATIO_CONTENT_TYPES` y reglas
  nuevas de la auditoría)
- `src/lib/brand-surfaces/recipes/proof.ts`, `method.ts`, `proposal-service.ts` y el builder de la familia
  `next-steps` `[verificar]` archivo vigente (`decision-next-steps` vive hoy en `proof.ts` o `deck.ts`)
- `src/lib/brand-surfaces/examples/deck-<receta>-intent.json` para las nueve `[nuevos]`
- `src/lib/brand-surfaces/__tests__/**` (casos nuevos: fuente de cifras, marca de datos ilustrativos, IA genérica)
- `scripts/frontend/baselines/artifact-composer/templates-graphic-line-deck/**`, `BASELINE_DELTAS.md`,
  `baseline-manifest.json`
- `package.json` y `pnpm-lock.yaml` (versión fijada de `@efeoncepro/axis-tokens` y `@efeoncepro/axis-ui-contracts`)
- `scripts/creative/deck-recipes/render-index.mjs` sólo si el operador aprueba una familia nueva (ver Open Questions)
- AXIS (repo hermano): `packages/tokens/src/tokens.ts`, `packages/contracts/src/surface-composition.ts` y su test,
  `apps/lab/public/references/surfaces/deck/<id>.jpg` (nueve), `docs/agent-composition/surfaces/deck-recipes.json`,
  `docs/agent-composition/surfaces/deck-recipes-photo-prompts.json`, `apps/lab/src/test/unit/surfaces.test.ts` (69 → 78)
  y `apps/lab/src/data/deck-recipes.ts` sólo si cambia el tipo de familia
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§4.6 y §7),
  `docs/architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md` (delta),
  `docs/manual-de-uso/creative/componer-deck-con-recetas.md`,
  `docs/documentation/creative/composicion-de-decks-y-brochures.md`
- `.claude/skills/deck-studio/**`, `.claude/skills/efeonce-graphic-line/**` y sus espejos `.codex/skills/**`

## Current Repo State

### Already exists

- Catálogo aprobado de 69 recetas (`efeonce.deck-slide-recipes.v1`, 11 familias: `cover`, `close`, `section`,
  `about`, `content`, `method`, `proof`, `proposal-service`, `pricing`, `next-steps`, `breather`) validado y
  publicado por `pnpm brand:deck-recipes` (`scripts/creative/deck-recipes/render-index.mjs`), que además escribe
  `src/lib/brand-surfaces/deck-recipes/catalog.generated.json`.
- Catálogo `graphic-line-deck` con 69 de 69 recetas mapeadas en `recipe-map.json` (contentType, intent de ejemplo y
  mapa de slots). Dos plantillas ya sirven a dos de las nueve:
  - `deck.proposal-service` (`proposal-service.html`, compartida por AEO, creativo, web y RevOps; cambian línea, foto y
    3 o 4 tarjetas) → candidata para DeckPropuestaSEO con el acento de Engine.
  - `deck.proposal-cinematic` layout `service` (las cuatro `proposal-cinematic-*` de servicio, cuyo ejemplo es una
    página de `deck-proposal-document.json`) → candidata para DeckPropuestaSEOCine.
- Builders por familia en `src/lib/brand-surfaces/recipes/` (`proof.ts`, `method.ts`, `proposal-service.ts`, `deck.ts`,
  `frame.ts`), resolvers `gl-*` y pintores de selección y CTA inyectados por `createCatalog(options)`.
- Auditoría renderizada del gate (3× y acento D1) en `graphic-line-shared/rendered-audit.ts`; cifras con fuente
  obligatoria por `figures` del contrato AXIS (AXIS rechaza con `surface-issues`).
- `validateDeckPlan` con `variant-adjacent`, `slot-required-missing`, `slot-over-max-chars`, `plate-repeated` y
  `next-steps-after-diagnosis` (este último por id, sólo `decision-next-steps`).
- AXIS `v0.3.21`: `efeonceGraphicLine.surfaces.deck` con las recetas aprobadas, Lab con `DeckRecipeCatalog.astro`
  (vista ampliada en `<dialog>` con deep-link `#receta-<id>`) que lee `docs/agent-composition/surfaces/deck-recipes.json`
  (69) y las referencias en `apps/lab/public/references/surfaces/deck/`.
- Assets citados por el brief, verificados en el repo: `public/images/logos/axis/hubspot-logotype.svg`,
  `docs/assets/public-site/aeo-market-logos/sparktoro-logo.svg`, `docs/assets/public-site/aeo-service-icons/v2/`
  (`measure.png`, `create.png`, `distribute.png`, `optimize.png`) y el copy de mercado en
  `docs/documentation/public-site/aeo-landing-elementor.md`.
- Plate SE1 con ficha e isotipo compuesto: `ai-generations/2026-09-28_deck-seo-aeo/plates/SE1-te-encuentran-isotipo.png`
  (+ `.json` del registro de `foto:isotipo`), `fichas/SE1-te-encuentran.json`, `prompts/SE1-te-encuentran.txt`. Los PNG
  están fuera de git (`.gitignore` `/ai-generations/**/*.png`).
- Referencias aprobadas locales: `ai-generations/2026-09-27_deck-recetas/references-2026-09-28/` (MX1…MX3, MD1…MD4,
  P5-seo, P5b-seo-te-encuentran), fuera de git.

### Gap

- Ninguna de las nueve existe en el catálogo JSON, en `catalog.generated.json`, en `recipe-map.json` ni en AXIS.
- Siete necesitan plantilla nueva (DeckIARespuesta, DeckMercadoIA, DeckCicloSurround, DeckDiferencia, DeckEEAT,
  DeckTraficoNegocio, DeckDiagnosticoMapa). Dos reutilizan una plantilla existente y sólo necesitan receta, intent y
  frame, salvo que el Slice 1 mida que su geometría difiere.
- No existe mecanismo verificable para «Ejemplo ilustrativo» / «Datos de muestra» ni para «interfaz de IA genérica».
- `validateDeckPlan` no rechaza dos alternativas no seguidas en el mismo deck ni una cifra sin fuente dentro de un
  plan.
- El brief propone la familia `decision` para DeckDiferencia, y esa familia **no existe** en el esquema: los ids
  `decision-*` viven hoy en `proof`, `content`, `method` y `next-steps`.
- El código de dirección (`vive.mjs`, `deck2.mjs`, `sel.mjs`) está modificado sin commit y el brief sin seguimiento.
- El plate SE1 no está registrado en ningún banco (TASK-1931 no existe como runtime todavía).

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `docs/operations/brand-graphic-line/deck-recipes/` (catálogo aprobado), `src/lib/brand-surfaces/deck-recipes/` (catálogo de runtime y validador puro), `src/lib/artifact-composer/catalogs/graphic-line-deck/` (plantillas), `src/lib/brand-surfaces/recipes/` (builders puros), `scripts/creative/deck-recipes/` y `scripts/brand-surfaces/` (CLI local); AXIS en su repo
- Future candidate home: `worker`
- Boundary: las plantillas sólo se alcanzan por `planSurfacePiece(intent)` / `planSurfaceDocument(intent)`; el plan sólo por `validateDeckPlan(plan)`; consumidores: CLI local, command de TASK-1921, binders de TASK-1930 y command de TASK-1932; nadie lee el JSON de `docs/` en runtime
- Server/browser split: sólo server y CLI; Chromium y la lectura de plates nunca van al browser ni a Vercel; los builders y el validador no tocan filesystem
- Build impact: sin dependencias nuevas; agrega siete plantillas HTML y sus `slots.json` al árbol que el Job `artifact-worker` ya empaqueta, y sube la versión fijada de dos paquetes AXIS
- Extraction blocker: `none` (el render productivo vive en el Job `artifact-worker`; la frontera la cierran TASK-1921 y TASK-1932)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: `EFEONCE_DECK_SLIDE_RECIPES_V1.json` (aprobado por el operador) → `catalog.generated.json`;
  contrato AXIS `efeonce.surface-composition` para recetas, tokens y validación de documento
- Consumidores afectados: CLI `pnpm brand:compose` y `pnpm brand:deck-plan`, command de documento de TASK-1921, binders
  de TASK-1930, command y acción de TASK-1932, AXIS Lab
- Runtime target: `local` en esta task; el render productivo llega por TASK-1921/TASK-1932

### Contract surface

- Contrato existente a respetar: esquema `efeonce.deck-slide-recipes.v1`, `planSurfacePiece`, `planSurfaceDocument`,
  `validateDeckPlan` y sus códigos, `recipe-map.json` (`efeonce.deck-recipe-map.v1`), `figures` y
  `efeonce.collaboration-selection` de AXIS
- Contrato nuevo o modificado: nueve recetas; siete contentTypes `deck.<receta>`; dos códigos nuevos del validador (los
  nombres los fija el plan; propuestos: `variant-both-in-deck` y `figure-source-missing`); regla
  `next-steps-after-diagnosis` extendida si el operador lo confirma
- Backward compatibility: `compatible` para las 69 recetas y sus plantillas. La regla de alternativas puede volver
  inválido un plan que hoy pasa con dos variantes no seguidas; eso es la corrección que pide la norma, y el Slice 4 corre
  los goldens y fixtures existentes antes de cerrar
- Full API parity: todo vive en `src/lib`; la CLI hoy, y API + Nexa + MCP por TASK-1932 sobre las mismas funciones

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla; artefactos versionados en git (JSON aprobado, módulo generado,
  plantillas, baselines)
- Invariantes que no se pueden romper:
  - `catalog.generated.json` coincide byte a byte con lo que produce el generador desde el JSON (`--check`).
  - Cada `slots.json` coincide con los slots de su receta (paridad por test).
  - Ninguna cifra compone ni valida sin fuente.
  - Ningún dato ilustrativo o de muestra compone sin su marca visible.
  - Dos recetas de un mismo par `variant` nunca en el mismo deck (salvo portada y cierre, que ya gobierna
    `frame-count`).
  - Las 69 recetas previas siguen componiendo a 0 px.
- Write-target allowlist: `N/A — no escribe en ninguna tabla`
- Tenant/space boundary: sin datos de cliente; los intents de ejemplo sólo llevan copy aprobado, cifras públicas con
  fuente y datos marcados como muestra
- Idempotency/concurrency: generador y validador puros y deterministas; el único punto de concurrencia es el `--freeze`
  del gate, single-owner
- Audit/outbox/history: sin evento; el historial es git y `BASELINE_DELTAS.md`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: disponible por CLI local; el render productivo lo habilita TASK-1921/TASK-1932 detrás de sus flags
- Backfill plan: sin backfill; la siembra del plate SE1 es de TASK-1931
- Rollback path: `revert PR` en Greenhouse; en AXIS, fijar la versión anterior del paquete
- External coordination: release de AXIS (aditivo) y aprobación visual del operador por lámina

### Security and access

- Auth/access gate: sin endpoint en esta task; los consumers aplican sus capabilities
- Sensitive data posture: sin PII; logos de terceros sólo los del brief, en un tono y con el mismo peso; el colaborador
  «Cliente» es un rol, no una persona
- Error contract: códigos tipados del validador (`DeckPlanIssue`) y `SurfacePieceError.code` del mapper; sin errores
  crudos
- Abuse/rate-limit posture: sin superficie pública; sin llamadas a proveedores

### Runtime evidence

- Local checks: tests del validador por regla nueva (dispara y no dispara), paridad de slots, auditoría renderizada,
  tests de fuente de cifras, marca de datos de muestra e IA genérica, `pnpm brand:deck-recipes -- --check`
- DB/runtime checks: `N/A — sin base de datos`
- Integration checks: build y tests del Lab en AXIS con 78 recetas; composición de las nueve con `pnpm brand:compose`
- Reliability signals/logs: sin señal nueva; la observabilidad llega con el consumer runtime (TASK-1921/TASK-1932)
- Production verification sequence: sin impacto productivo en esta task (ver `## Rollout Plan & Risk Matrix`)

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Esta task no crea tablas; se confirma al cerrar.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Reglas en `src/lib/brand-surfaces/deck-recipes/` y builders en `src/lib/brand-surfaces/recipes/`.
- [ ] **Modelada como recurso/contrato, no como click-handler.** Recetas del catálogo y `validateDeckPlan`.
- [ ] **Read** como función pura reutilizable; esta task no agrega escrituras.
- [ ] **Capability + grant en el MISMO PR:** `N/A — no gatea ni expone endpoint; la capability la aplican TASK-1921/TASK-1932`.
- [ ] **Camino programático declarado:** CLI `pnpm brand:compose` y `pnpm brand:deck-plan`; API, Nexa y MCP por TASK-1932.
- [ ] **Write apto para `propose → confirm → execute`:** `N/A — sin write`; `proposeDeckPlan` ya conoce las recetas nuevas al regenerar el catálogo.
- [ ] **Un primitive, muchos consumers:** CLI, TASK-1921, TASK-1930 y TASK-1932 leen el mismo catálogo y el mismo validador.
- [ ] **Parity check = SÍ** una vez cerrada TASK-1932.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Nueve recetas en el catálogo (69 → 78)

- Confirmar que el código de dirección y el brief están commiteados (ver Depends on). Si no, detenerse y pedirlo.
- Fijar con el operador los ids, las familias y los documentos de las nueve (tabla de propuesta en Detailed Spec),
  incluida la familia de DeckDiferencia (`decision` no existe en el esquema).
- Escribir cada receta con el esquema completo: `id`, `board`, `name`, `family`, `documents`, `surface`, `status`
  `approved`, `approvedAt` `2026-09-28`, `reference` (`references/surfaces/deck/<id>.jpg`), `communicates`, `useWhen`,
  `avoidWhen`, `preferInstead`, `pairsWith`, `slots`, `fixed`, `selection`, `photo`, `prompts.composition`,
  `renderSource` (`script` + `slideId`), `rules`, `notes` y `referenceSource`
  (`ai-generations/2026-09-27_deck-recetas/references-2026-09-28/<slideId>.jpg`).
- `maxChars` de cada slot **medido** sobre la referencia aprobada y el código de dirección (ancho real de la caja a su
  cuerpo tipográfico), no estimado; la medida se anota en `notes` del slot como en las 69.
- `prompts.composition` sólo con tokens AXIS y medidas del canon, sin HEX ni px crudos fuera de la geometría del lienzo.
- `count` 78, `pnpm brand:deck-recipes` reescribe el índice del README y `catalog.generated.json`;
  `pnpm brand:deck-recipes -- --check` pasa.

### Slice 2 — AXIS: recetas, tokens y Lab (release aditivo)

- En `efeonceGraphicLine.surfaces.deck` (`packages/tokens/src/tokens.ts`), las siete recetas nuevas `approved` con sus
  medidas, reglas y `surfaceReference`. Para DeckPropuestaSEO y DeckPropuestaSEOCine, sólo la referencia nueva en
  `proposal-service` y `proposal-cinematic`, salvo que el Slice 1 mida geometría distinta.
- Lo que la lámina pinta y AXIS no mide (monolitos, estaciones del ciclo, letras de vidrio, escalones, informe abierto,
  medidor, franja «¿Y si lo hace mi equipo?») se tokeniza aquí **antes** de escribir la plantilla (lección de
  TASK-1927).
- Test de contrato en `packages/contracts` para las recetas nuevas (incluida la cifra sin fuente → `surface-issues`).
- Lab: las nueve referencias en `apps/lab/public/references/surfaces/deck/<id>.jpg` (desde `references-2026-09-28/`),
  `docs/agent-composition/surfaces/deck-recipes.json` con las 78 recetas tal como las publica Greenhouse (sin
  `referenceSource`), `deck-recipes-photo-prompts.json` con el prompt de SE1, y `surfaces.test.ts` de 69 a 78. La vista
  ampliada (`DeckRecipeCatalog.astro`) las muestra sin cambio de componente; si nace una familia, se extiende
  `DeckRecipeFamily` en `apps/lab/src/data/deck-recipes.ts`.
- Release de `axis-tokens` y `axis-ui-contracts` (patch, aditivo) según el runbook de consumo; Greenhouse fija la versión
  en `package.json` y `pnpm-lock.yaml`.

### Slice 3 — Plantillas del Artifact Composer

- **Reutilizan plantilla:** DeckPropuestaSEO → `deck.proposal-service` (línea `engine`, lente con SE1, cuatro pasos,
  nota «No prometemos rankings…»). DeckPropuestaSEOCine → `deck.proposal-cinematic` layout `service` (plate SE1 con
  isotipo compuesto, cuatro pasos con íconos Trazo). Cada una suma entrada en `recipe-map.json`, intent de ejemplo y
  frame.
- **Plantilla nueva** (HTML + `slots.json` + builder + intent + frame) para las siete restantes, con los patrones de
  TASK-1928: una plantilla por composición, cada medida como custom property obligatoria leída del manifest, resolvers
  `gl-*` y builders del marco de `recipes/frame.ts`.
- Datos como slots: cifras (`figures` con fuente obligatoria), pasos, estaciones, letras, escalones, promesas y checks,
  motores y scores, prompts sin aparición y plan priorizado. Nada del contenido queda escrito en la plantilla.
- Marca de datos: DeckIARespuesta imprime «Ejemplo ilustrativo» y DeckDiagnosticoMapa «Datos de muestra»; la marca es
  obligatoria mientras el intent declare datos de ejemplo.
- IA genérica: la respuesta del motor en DeckIARespuesta y el informe de DeckDiagnosticoMapa se construyen con tokens
  AXIS de superficie genérica, sin logo, color ni forma de un producto de IA.
- Logos de terceros en DeckMercadoIA (HubSpot, SparkToro) como assets `file` normalizados por el compositor (un tono,
  mismo peso); McKinsey como wordmark tipográfico con la misma altura óptica.
- Íconos 3D de DeckCicloSurround desde `docs/assets/public-site/aeo-service-icons/v2/*.png` como assets `file`.
- Selección: DeckIARespuesta y DeckDiagnosticoMapa con colaborador «Cliente» (`participantKind` `role`, como en
  `vive.mjs`) por `efeonce.collaboration-selection`; una selección por lámina.
- `rendered-audit.ts`: las siete plantillas nuevas entran en `ANSWER_RATIO_CONTENT_TYPES` y en la auditoría D1.
- Gate: un frame por receta nueva desde intents deterministas (plates del probe del gate); aprobación a ojo del operador
  contra la referencia **antes** del `--freeze`; alta declarada en `BASELINE_DELTAS.md` en el mismo commit.

### Slice 4 — Validador del plan

- `catalog.generated.json` regenerado; las nueve recetas son válidas en sus familias y documentos.
- Regla nueva de alternativas: dos recetas de un mismo par `variant` en el mismo deck son error aunque no vayan
  seguidas (portada y cierre siguen en `frame-count`). Se decide en el plan si reemplaza a `variant-adjacent` o convive
  con él, siempre bajo «una regla, una voz».
- Regla nueva de cifra sin fuente: un plan con una lámina de cifras (DeckMercadoIA y las `figures` existentes) cuyo
  ítem no trae fuente es error con código propio; si AXIS ya lo emite en el piso de documento, se lee de su resultado y
  no se duplica.
- `next-steps-after-diagnosis` se extiende a DeckDiagnosticoMapa si el operador lo confirma (ver Open Questions).
- Fixtures: goldens con las recetas nuevas por documento en que aplican; adversariales para SEO sobria + cine en el
  mismo deck, cifra de mercado sin fuente y datos de muestra sin marca. Los goldens y fixtures existentes siguen pasando;
  si alguno usaba dos variantes, se detiene y se consulta al operador.

### Slice 5 — Plate SE1

- Si el banco de TASK-1931 ya existe en runtime: registrar SE1 `pending` con su ficha, sha256 y registro de
  `foto:isotipo` (`SE1-te-encuentran-isotipo.json`), y dejar la aprobación a una persona.
- Si no existe (estado al crear esta task): las recetas declaran `photo.plate`, `ficha` y `prompt` por ruta local, como
  las 69; el `## Delta` de TASK-1931 deja SE1 en su siembra. No se sube ni se registra nada fuera del banco.

### Slice 6 — Documentación y skills

- README del catálogo: índice generado, familias, códigos nuevos del validador y pendientes de QA de las nueve.
- Norma `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 y §7; spec técnica `GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`
  (delta); manual `componer-deck-con-recetas.md` (láminas SEO/AEO y reglas de cifras y muestras); doc funcional
  `composicion-de-decks-y-brochures.md`.
- Skills `deck-studio` y `efeonce-graphic-line` con las nueve láminas, cuándo usarlas y sus reglas; espejo en `.codex/`
  y `pnpm skills:mirrors`.

## Out of Scope

- Datos reales en los slots (cifras del cliente, diagnóstico real, logo del cliente): TASK-1930.
- Registrar, aprobar o servir plates por `assetId`: TASK-1931. Regenerar SE1 o cualquier plate: TASK-1926.
- Ruta productiva, `artifact-worker`, API, MCP y Proposal Studio: TASK-1921 y TASK-1932.
- La interfaz real de ChatGPT, Gemini u otro motor: recursos AEO de AXIS (`pnpm aeo:compose`), fuera de esta task.
- Pendientes de QA de las 69 recetas previas y decisiones D5 / filas 15–16 de la norma: TASK-1933.
- Salida PPTX (TASK-1395), versión motion o video de estas láminas, y cualquier lámina que el operador no haya aprobado
  el 2026-09-28.
- Publicar las láminas en el sitio público o en redes.

## Detailed Spec

**Las nueve láminas y su destino propuesto** (ids en inglés kebab-case; el Slice 1 los confirma contra AXIS, y si AXIS
ya tiene id para una lámina se reutiliza, regla del README):

| Board canvas | `renderSource` | Id propuesto | Familia propuesta | Plantilla |
|---|---|---|---|---|
| DeckIARespuesta | `vive.mjs` · `MX1-ia-responde` | `decision-ai-answer` | `proof` | nueva |
| DeckMercadoIA | `vive.mjs` · `MX2-mercado` | `decision-ai-market` | `proof` | nueva |
| DeckCicloSurround | `vive.mjs` · `MX3-ciclo` | `method-surround-cycle` | `method` | nueva |
| DeckPropuestaSEO | `deck2.mjs` · `P5-seo` | `proposal-service-seo` | `proposal-service` | `deck.proposal-service` |
| DeckPropuestaSEOCine | `deck2.mjs` · `P5b-seo-te-encuentran` | `proposal-cinematic-seo` | `proposal-service` | `deck.proposal-cinematic` (`service`) |
| DeckDiferencia | `vive.mjs` · `MD1-diferencia` | `decision-difference` | `proof` (el brief dice `decision`, que no existe) | nueva |
| DeckEEAT | `vive.mjs` · `MD2-eeat` | `method-eeat` | `method` | nueva |
| DeckTraficoNegocio | `vive.mjs` · `MD3-trafico-negocio` | `decision-traffic-to-revenue` | `proof` | nueva |
| DeckDiagnosticoMapa | `vive.mjs` · `MD4-diagnostico` | `decision-diagnosis-map` | `next-steps` | nueva |

**Pares a fijar en el Slice 1:**

- `proposal-service-seo` ↔ `proposal-cinematic-seo`: `variant`. Nunca van juntas (regla nueva del Slice 4).
- Por confirmar con el operador: si `proposal-service-seo` y `proposal-service-aeo` son alternativas; si
  `decision-ai-answer` → `decision-ai-market` y `method-surround-cycle` → `method-eeat` son `sequence`; si
  `decision-diagnosis-map` va en `sequence` con `decision-next-steps`.

**Contenido fijo de cada lámina** (del brief; el Slice 1 lo vuelca en `fixed`, `slots` y `rules`):

- DeckIARespuesta: «¿A quién recomienda la IA? A tu competencia.» Mismo prompt, dos respuestas de un motor genérico:
  atrás «Hoy» (tu marca no aparece), al frente «Con AEO» (tu marca 1.ª con citas); colaborador «Cliente»; nota
  «Ejemplo ilustrativo».
- DeckMercadoIA: «¿Dónde busca tu cliente? En la IA.» Tres monolitos: −27 % (HubSpot 2026), 50 % (McKinsey 2025),
  <1 en 100 (SparkToro 2026). Copy y fuentes de `aeo-landing-elementor.md` §market.
- DeckCicloSurround: «¿Cómo se sostiene? En ciclo.» Órbita tendida como loop Surround Discovery, cuatro estaciones
  (Medir, Crear, Distribuir, Optimizar) con íconos 3D y «Tu marca» al centro. La órbita tendida es la única órbita.
- DeckPropuestaSEO: «¿Cómo te encuentran? Con método.» Acento Engine, lente con SE1, cuatro pasos (Diagnóstico · Base
  técnica · Contenido y autoridad · Reporte vivo), nota «No prometemos rankings…».
- DeckPropuestaSEOCine: «¿Te encuentra Google? Y la IA.» Plate cine SE1 con isotipo compuesto, cuatro pasos con íconos
  Trazo, receta AXIS `proposal-cinematic` layout `service`.
- DeckDiferencia: «¿Qué nos hace distintos? Lo puedes ver.» Agencia commodity (cinco promesas tachadas) vs método medible
  (cinco checks), «vs», franja «¿Y si lo hace mi equipo? Complemento, no reemplazo: velocidad, método, foco».
- DeckEEAT: «¿Por qué te citaría la IA? Porque confía.» Cuatro letras de vidrio E-E-A-T con «Lo construimos con…» y
  medidor «Peso de E-E-A-T: SEO clásico Importante / AEO Determinante».
- DeckTraficoNegocio: «¿Dónde termina el SEO? En ingresos.» Cuatro escalones (tráfico calificado → leads → pipeline →
  ingresos), línea «La mayoría de las agencias se detiene aquí», trayectoria de luz.
- DeckDiagnosticoMapa: «¿Qué recibes primero? El mapa.» Informe abierto: score por motor (ChatGPT, AI Overviews,
  Gemini, Perplexity, Copilot, Claude), share of voice, prompts donde no apareces, plan priorizado con colaborador
  «Cliente», «Datos de muestra», ficha «Lectura experta».

**Tests nuevos (sobre el HTML resuelto o el plan):**

| Regla | Dónde se prueba |
|---|---|
| Cifra sin fuente no compone | builder + AXIS `figures` (intent sin fuente → `surface-issues`) |
| Cifra sin fuente no valida | `validate.test.ts` (código nuevo) |
| Datos de ejemplo sin marca no componen | test del builder de DeckIARespuesta y DeckDiagnosticoMapa |
| Interfaz de IA genérica | test sobre el HTML: sin assets de marca de proveedores de IA ni colores fuera de tokens AXIS |
| Respuesta ≥ 3× la pregunta y acento ≥ 24 px | `rendered-audit.ts` en el gate |
| SEO sobria + cine en el mismo deck | `validate.test.ts` (código nuevo) y fixture adversarial |
| Texto sobre `maxChars` falla | paridad de slots y test del slot |

## Rollout Plan & Risk Matrix

Cambio aditivo y repo-only en Greenhouse más un release aditivo de AXIS: agrega recetas, plantillas y dos reglas del
validador. No toca runtime productivo; el render productivo sólo corre en el Job `artifact-worker` y esta task no lo
despliega ni cambia su código.

### Slice ordering hard rule

- Slice 1 (catálogo) → Slice 2 (AXIS publicado y fijado) → Slice 3 (plantillas). Una plantilla nunca antes de que AXIS
  declare su receta `approved`.
- Slice 4 (validador) puede empezar después del Slice 1; sus goldens con recetas nuevas se cierran después del Slice 3
  (necesitan `template`, o darían `recipe-without-template`).
- Slice 5 en cualquier momento después del Slice 1.
- Slice 6 al final, para describir lo que realmente compone.
- Cada `--freeze` del Slice 3 va después de la aprobación visual del operador y en su propio commit.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una plantilla transcribe px/HEX/fuente en vez de leer el token | contrato AXIS | medium | tokenizar en AXIS antes de componer (Slice 2); revisión contra el manifest resuelto | diferencia contra la referencia; literal en la revisión |
| La regla de alternativas invalida planes que hoy pasan | validador | medium | correr goldens y fixtures antes de cerrar; detenerse y consultar si alguno usa dos variantes | test rojo en `validate.test.ts` |
| Una cifra de mercado queda sin fuente o con fuente de memoria | marca / legal | low | `figures` con fuente obligatoria; fuente citada de `aeo-landing-elementor.md` | `surface-issues` o código nuevo del validador |
| La interfaz de la IA se lee como ChatGPT o Gemini | marca / legal | medium | superficie genérica con tokens AXIS; test sobre el HTML | revisión del operador |
| `renderSource` apunta a un script no commiteado | catálogo | medium | precondición del Slice 1 | `git status` del código de dirección |
| Un `--freeze` mezcla frames de otra sesión | gate visual | medium | freeze single-owner y atómico (runbook §3) | diff de `baseline-manifest.json` con frames ajenos |
| El release de AXIS mueve láminas aprobadas | AXIS | low | cambios sólo aditivos; las 69 siguen a 0 px | gate rojo en frames que no se tocaron |

### Feature flags / cutover

Sin flag: aditivo y repo-only. Las recetas nuevas sólo se alcanzan con un intent o un plan que las nombre; los intents y
planes existentes resuelven igual, salvo los que usen dos variantes en el mismo deck, que la norma ya prohibía. El
cutover es inmediato al commit de cada slice.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del JSON, el índice y el módulo generado | < 10 min | sí |
| Slice 2 | fijar en Greenhouse la versión AXIS anterior; en AXIS, release de reversa si hiciera falta | < 30 min | sí |
| Slice 3 | `git revert` del slice (plantillas, builders, ejemplos, frames y su declaración salen juntos) | < 10 min | sí |
| Slice 4 | `git revert` de las reglas y sus fixtures | < 5 min | sí |
| Slice 5 | sin cambio en Greenhouse si el banco no existe; si existe, `retirePlate` de SE1 | < 5 min | sí |
| Slice 6 | `git revert` de docs y skills (+ espejo) | < 5 min | sí |

### Production verification sequence

1. Local por slice: tests focales (`src/lib/brand-surfaces`, `src/lib/brand-surfaces/deck-recipes`,
   `scripts/creative/deck-recipes`), `pnpm brand:deck-recipes -- --check`.
2. AXIS: tests del contrato y del Lab, build del Lab; release; Greenhouse fija la versión y `pnpm install` queda limpio.
3. Local por receta: `pnpm brand:compose -- --intent src/lib/brand-surfaces/examples/deck-<id>-intent.json`, comparación
   contra la referencia aprobada y aprobación del operador.
4. `pnpm composer:visual-gate --catalog=graphic-line --selftest`, `--freeze` de las altas y gate a 0 px (las 69 previas
   incluidas).
5. `pnpm brand:deck-plan -- --plan` sobre goldens (sin issues) y adversariales (issues esperados).
6. Cierre: `pnpm local:check`, `pnpm test` completo y `pnpm build` (este último **requiere autorización previa del
   operador** por consumo de memoria).
7. Push a `develop` y release de AXIS sólo con indicación del operador.

### Out-of-band coordination required

- Operador: ids, familias, documentos y pares (Slice 1), familia de DeckDiferencia, alcance de la regla de alternativas,
  aprobación visual por lámina antes de cada `--freeze`.
- AXIS: release aditivo de `axis-tokens` y `axis-ui-contracts`, y push del Lab.
- Sesión dueña del código de dirección: commit de `vive.mjs`, `deck2.mjs`, `sel.mjs` y del brief.
- Coordinación con cualquier sesión que congele frames del gate (TASK-1923, TASK-1933) antes de cada `--freeze`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El catálogo tiene 78 recetas; las nueve nuevas llevan el esquema completo (incluidos `renderSource`, `referenceSource`, `prompts.composition`, `fixed`, `selection` y `photo`) y `pnpm brand:deck-recipes -- --check` pasa.
- [ ] Cada slot de las nueve tiene `maxChars` medido sobre la referencia aprobada, con la medida anotada en su `notes`.
- [ ] Las nueve recetas están `approved` en AXIS, con su referencia en `apps/lab/public/references/surfaces/deck/<id>.jpg` y en `docs/agent-composition/surfaces/deck-recipes.json`; los tests del Lab esperan 78 y la vista ampliada abre cada una por su deep-link.
- [ ] Greenhouse fija la versión AXIS publicada en `package.json` y `pnpm-lock.yaml`.
- [ ] Las nueve componen desde su intent de ejemplo con `pnpm brand:compose` sin issues de AXIS.
- [ ] Siete plantillas nuevas y dos recetas sobre plantilla existente tienen entrada en `recipe-map.json` con mapa de slots, y `recipe-slot-parity.test.ts` pasa.
- [ ] Ninguna plantilla nueva contiene px, HEX o familia tipográfica literales que un token o el manifest ya declaran (cualquier excepción queda declarada con su nota).
- [ ] `pnpm composer:visual-gate --catalog=graphic-line` queda a 0 px con un frame por receta nueva, cada alta declarada en `BASELINE_DELTAS.md`, y las 69 previas siguen a 0 px.
- [ ] El operador aprobó a ojo cada lámina contra su referencia antes de su `--freeze`.
- [ ] La auditoría renderizada mide respuesta ≥ 3× la pregunta y acento sólo en texto ≥ 24 px en las siete plantillas nuevas.
- [ ] Una cifra de DeckMercadoIA sin fuente hace fallar la composición (test) y el plan (test con código propio).
- [ ] DeckIARespuesta sin «Ejemplo ilustrativo» y DeckDiagnosticoMapa sin «Datos de muestra» no componen (test).
- [ ] Un test sobre el HTML resuelto de DeckIARespuesta y DeckDiagnosticoMapa confirma que no hay assets de marca de proveedores de IA ni colores fuera de los tokens AXIS.
- [ ] `validateDeckPlan` acepta las nueve recetas en sus familias y documentos (goldens) y rechaza `proposal-service-seo` y `proposal-cinematic-seo` en el mismo deck aunque no vayan seguidas (test).
- [ ] Los goldens y fixtures previos de TASK-1929 siguen pasando.
- [ ] El plate SE1 quedó registrado en el banco de TASK-1931, o la receta lo declara por ruta local y TASK-1931 tiene el `## Delta` que lo suma a su siembra.
- [ ] README del catálogo, norma §4.6/§7, spec técnica, manual, doc funcional y skills `deck-studio` y `efeonce-graphic-line` describen las nueve láminas, y `pnpm skills:mirrors` pasa.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre; focales por slice)
- `pnpm brand:deck-recipes -- --check`
- `pnpm brand:compose -- --intent src/lib/brand-surfaces/examples/deck-<id>-intent.json` por receta nueva
- `pnpm composer:visual-gate --catalog=graphic-line` (y `--selftest` antes de cualquier `--freeze`)
- `pnpm brand:deck-plan -- --plan <fixture>` sobre goldens y adversariales
- `pnpm skills:mirrors`
- En AXIS: tests del contrato y del Lab, build del Lab
- `pnpm build` — **requiere autorización explícita del operador** antes de correrlo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en TASK-1930, TASK-1931 y TASK-1932 con la lista final de las nueve recetas, sus contentTypes y los códigos nuevos del validador
- [ ] `pnpm build` corrido con autorización del operador, o el cierre dice `code complete, build pendiente de autorización`

## Follow-ups

- Versión motion de DeckCicloSurround o DeckTraficoNegocio (trayectoria de luz) si el operador la pide: catálogo
  `graphic-line-overlays` o HyperFrames, en task aparte.
- Retirar `vive.mjs` y los bloques `P5-seo`/`P5b` de `deck2.mjs` como fuente de composición una vez que las nueve salgan
  del catálogo (quedan como registro de dirección).

## Open Questions

- ¿DeckDiferencia va en `proof` (como `decision-why-us` y `decision-risk`) o el operador quiere la familia `decision`?
  Recomendación: `proof`. Una familia nueva obliga a tocar `FAMILIES` en `render-index.mjs`, el tipo
  `DeckRecipeFamily` del Lab y las reglas por documento del validador.
- ¿La regla «alternativas nunca juntas» aplica a todos los pares `variant` del catálogo o sólo a las propuestas sobria
  y cine? Recomendación: a todos, porque el README ya dice «se elige una»; si un golden vigente usa dos variantes, se
  consulta antes de cambiarlo.
- ¿DeckDiagnosticoMapa entra en `next-steps-after-diagnosis` («¿Qué recibes primero?» no aplica si el diagnóstico ya se
  hizo)? Recomendación: sí, por familia `next-steps` en vez de por id.
- ¿`proposal-service-seo` y `proposal-service-aeo` son alternativas en una misma propuesta?
