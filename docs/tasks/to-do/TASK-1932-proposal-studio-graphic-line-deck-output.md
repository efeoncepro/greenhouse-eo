# TASK-1932 — Proposal Studio arma el deck «La órbita» desde recetas: render en `artifact-worker` y acción Nexa/MCP

## Delta 2026-09-28 — TASK-1930 dejó `bindDeckSlots`

- Firma final: `bindDeckSlots(plan: DeckPlan, context: unknown): Promise<DeckSlotBindingResult>` (`server-only`,
  `@/lib/brand-surfaces/deck-recipes/bindings`) con `context = { kind: 'proposal', ownerOrgId, proposalId, audience,
  facts? } | { kind: 'brand', audience, facts? }`; el núcleo puro es `bindDeckSlotsWith(plan, sources)`. Devuelve
  `{ ok, plan, bindings: SlotBinding[], issues }`; cada `SlotBinding` es `{ slideIndex, recipeId, slot, binder,
  status: 'bound'|'unbound', source?: 'account-360'|'proposal-evidence'|'economic-facts'|'roster-facts'|'intent',
  evidenceRef?, evidenceRefs?, asOf?, reason?, dataOrigin? }`. Los issues del binding llegan con `source: 'binding'`
  (`binding-internal-evidence`, `binding-evidence-unknown` = error; `binding-fact-unused` = aviso). Errores:
  `DeckBindingContextError` (contexto o propuesta de otra organización) y `DeckBindingReadError` (lectura, ya
  capturada con `captureWithDomain`).
- Para esta task: llamar `bindDeckSlots` con el contexto ya autorizado por `assertProposalStudioAccessForSubject`,
  mostrar la tabla de `bindings` en el preview (propose → confirm) y **no encolar el render si `ok` es `false`**. El
  rastro va al manifest y a la procedencia del asset. Los valores de logo, foto y logos del muro llegan como
  `{ assetId, alt }` (el cliente con `variant: 'on-dark'|'default'`): el mapper a intent resuelve el asset.
- Montos: siempre `[MONTO]` hasta TASK-1417; equipo: `content-team` no compone hasta TASK-1418.

## Delta 2026-09-28 — TASK-1934 suma nueve recetas SEO/AEO y cambia dos reglas del plan

- El catálogo tiene **78 recetas**, todas con plantilla en `graphic-line-deck` y página de AXIS (axis-tokens 0.3.23,
  axis-ui-contracts 0.3.21). contentTypes nuevos: `deck.decision-ai-answer`, `deck.decision-ai-market`,
  `deck.method-surround-cycle`, `deck.decision-difference`, `deck.method-eeat`, `deck.decision-traffic-to-revenue`,
  `deck.decision-diagnosis-map`; `proposal-service-seo` y `proposal-cinematic-seo` usan `deck.proposal-service` y
  `deck.proposal-cinematic` (`service`). El consumer del `artifact-worker` las renderiza sin cambio de código; los íconos 3D
  del ciclo y los logos de fuente del mercado son assets del repo (`file`/`logo`) que el Job debe poder materializar.
- `validateDeckPlan`: **`variant-both-in-deck`** reemplaza a `variant-adjacent` (dos recetas de un par `variant` nunca en
  el mismo deck, seguidas o no); código nuevo **`figure-source-missing`** (una cifra en los `slots` del plan sin
  `source`); `next-steps-after-diagnosis` rige por familia `next-steps` (incluye `decision-diagnosis-map`). La acción
  Nexa/MCP y el endpoint muestran estos códigos tal cual.

## Delta 2026-09-28 — TASK-1929 dejó el plan de deck contra el catálogo

- Entrada pura e isomórfica `@/lib/brand-surfaces/deck-recipes`: `validateDeckPlan(plan: DeckPlan): { ok, issues: DeckPlanIssue[] }`
  (`DeckPlan = { document: 'proposal'|'brochure'|'pitch'|'qbr', line?, diagnosisDone?, slides: { recipeId, slots?, plateRef?, progress?, purpose? }[] }`;
  `DeckPlanIssue = { code, severity: 'error'|'warning', source: 'axis'|'catalog'|'agent', slideIndex?, recipeId?, slot?, detail }`),
  `getDeckRecipe`, `listDeckRecipes` y el catálogo de runtime `catalog.generated.json` (lo regenera `pnpm brand:deck-recipes`).
- `server-only`: `proposeDeckPlan(context)` en `@/lib/brand-surfaces/deck-recipes/propose` → `{ ok: true, plan, issues, rationale, model, attempts, usage }`
  o `{ ok: false, issues, rejectedPlan, model, attempts, usage }`; contexto por allowlist (`normalizeDeckPlanContext`, `DeckPlanContextError`).
  No escribe: es el paso `propose`. CLI local `pnpm brand:deck-plan -- --plan | --propose --context`.
- Para esta task: la acción Nexa/MCP y el endpoint envuelven estas dos funciones sin reimplementarlas; el plan confirmado es el `plan` de un `ok: true` (o uno editado por la persona que vuelve a pasar `validateDeckPlan`).

## Delta 2026-09-27 — TASK-1928 dejó las plantillas

- TASK-1928 dejó **69 de 69** recetas del catálogo con plantilla en `graphic-line-deck` (commits `ab23fdd90`,
  `2c7c67c5d`, `39b9c7006`, `82964f2b4`, `3def01768`, `c3c290e16`, `64be8aa16`, `88ce23831`; AXIS `v0.3.21`). La última,
  `cover-brochure-cine-lines-selection`, compone desde 2026-09-28 con la composición `document-selection` de
  `cover-brochure` (contentType `deck.cover-brochure.document-selection`). El mapa receta →
  contentType vive en `src/lib/artifact-composer/catalogs/graphic-line-deck/recipe-map.json` y el índice publicado en
  `docs/operations/brand-graphic-line/deck-recipes/README.md` (columna «Plantilla»).
- Composiciones nuevas con su contentType propio: `content-pricing` (`table`, `.stage`, `.live`), `section-cine` (`team`
  por defecto, `.services`, `.about`, `.purpose`), `content-day` (`clock` por defecto, `.tools`, `.live-progress`,
  `.live-results`), `method-staircase.flat`, `method-hybrid-workforce.scene`.
- Assets que el render productivo (`artifact-worker`) debe materializar igual que `scripts/brand-surfaces/compose.ts`:
  `plate` (con `focus` opcional: recorte dirigido), `svg`, `file`, `logo` (normalización de logos de terceros) y
  `painted` (capa pintada por el motor de la línea gráfica con la foto inyectada). Sin eso, las láminas con logos de
  clientes/partners o con la lente de sección no componen en productivo.

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
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm|content|platform`
- Blocked by: `TASK-1921, TASK-1930, TASK-1931`
- Branch: `Greenhouse develop; efeonce-mcp main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Relación de programa:** esta task conecta el deck «La órbita» con el aggregate `Proposal` de Proposal Studio
> (TASK-1392/1393 y siguientes, EPIC-029). No se declara bajo EPIC-029 para no reabrir su alcance; el operador decide
> si la adopta.

## Summary

Con plantillas (TASK-1928), plan validado (TASK-1929), datos reales (TASK-1930), plates gobernados (TASK-1931) y ruta
productiva de piezas (TASK-1921), falta que el deck salga como producto. Esta task hace que una `Proposal` guarde el
plan de recetas confirmado por una persona, que el render pase por el consumer de Proposal del Job `artifact-worker`
con el catálogo `graphic-line-deck`, y que el PDF quede como asset versionado (`kind=deck`). El PPTX sale sólo cuando la
matriz de TASK-1395 cubra esas plantillas; si no, falla cerrado, nunca raster. Suma una acción gobernada de Nexa y una
tool MCP federada para proponer el deck (propose → confirm → execute): para una propuesta confirma por el command de
Proposal; para un brochure, pitch o QBR confirma por el command de documento de TASK-1921.

## Why This Task Exists

- **El deck aprobado no llega al cliente por el producto.** Proposal Studio ya renderiza decks en el Job
  `artifact-worker` (TASK-1391) y versiona sus assets (TASK-1412), pero el consumer de Proposal sólo conoce el catálogo
  `deck-axis` (`services/artifact-worker/consumers/proposal.ts`, mapa `CATALOGS`). Una propuesta comercial con la línea
  gráfica de Efeonce hoy se arma fuera del producto.
- **Proponer un deck debe ser una capacidad, no un script.** El operador pidió un tool MCP / Nexa para proponer el deck
  con el loop propose → confirm → execute. Sin esto, el plan de TASK-1929 sólo existe en la CLI local y viola Full API
  Parity.
- **Dos caminos de documento, un solo primitive.** Una propuesta vive en el aggregate `Proposal` (gates humanos, módulo
  per-ORG, evidencia con audiencia); un brochure o un pitch de marca propia no. La acción de proponer debe ser una y
  confirmar por el command dueño de cada caso, sin duplicar lógica.

## Goal

- Una persona o un agente propone un deck «La órbita» para una `Proposal`; una persona lo confirma; el Job lo renderiza
  a PDF y queda como asset `kind=deck` versionado con procedencia (recetas, plan, rastro de slots, plates por sha256,
  versiones AXIS).
- El PPTX se pide y se entrega sólo si todas las plantillas del plan son nativas en la matriz de TASK-1395; si no, el
  pedido falla con código canónico y el PDF sigue disponible.
- Nexa y la tool MCP federada son consumers del mismo primitive (propose read-only, confirm humano), sin integración
  específica de Nexa.
- Todo detrás de un flag apagado por defecto en los runtimes que lo leen, registrado en el ledger.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (aggregate `Proposal`, gates humanos en la
  base, módulo `proposal_studio_v1`, proyección allowlisted de render)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` (Job `artifact-worker`, registro de consumers)
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (acción gobernada: el LLM nunca escribe)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` y `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
  §22
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Render sólo en el Job `artifact-worker`; nunca Chromium en Vercel ni en `ops-worker`. El consumer vive en
  `services/artifact-worker/consumers/` y el dominio no importa de `services/`.
- El worker renderiza exactamente el `ResolvedCompositionManifest` persistido al confirmar; sin lógica de negocio en el
  worker.
- La acción gobernada sigue el molde de TASK-1399: el scope sale de la sesión (ningún schema acepta un id de org), el
  preview ejercita los gates reales del command y nunca promete lo que va a fallar, y sólo una persona confirma.
- Un deck `client_facing` con una evidencia `internal` falla cerrado (`render-projection.ts`).
- PPTX: nunca rasterizar una lámina entera ni caer en PDF en silencio; si la matriz no cubre una plantilla, error
  canónico.
- El flag se lee en más de un runtime: se declara en `services/artifact-worker/deploy.sh` y en Vercel, se aplica en la
  revisión activa y se registra en el ledger en el mismo PR.
- Tool MCP nueva = tool, scope, manifiesto, tests y release en `efeonce-mcp`; federar es parte de listo.
- No nace un segundo orquestador de decks: el plan viene de `proposeDeckPlan` (TASK-1929); si hace falta un capítulo
  autorado (diagnóstico, credenciales), se obtiene de los chapter-authors por el orquestador de TASK-1419.

## Normative Docs

- `docs/tasks/complete/TASK-1392-tender-proposal-studio-foundation.md`
- `docs/tasks/complete/TASK-1399-nexa-proposal-studio-governed-actions.md`
- `docs/tasks/complete/TASK-1412-proposal-artifact-versioning-download-contract.md`
- `docs/tasks/to-do/TASK-1395-pptx-native-editable-renderer.md`
- `docs/tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md`
- `docs/operations/runbooks/production-release.md`

## Dependencies & Impact

### Depends on

- `TASK-1921`: consumer de piezas y documentos de marca en el Job, procedencia y asset store; su command de documento
  es el destino del confirm para brochure, pitch y QBR.
- `TASK-1928`: plantillas de las recetas que el plan puede usar.
- `TASK-1929`: `proposeDeckPlan` y `validateDeckPlan`.
- `TASK-1930`: `bindDeckSlots`.
- `TASK-1931`: `resolvePlateForRecipe` y plates por `assetId`.
- `TASK-1395` (sólo para el PPTX): matriz de capacidad `pptx-native`.
- Existentes: `src/lib/commercial/tenders/proposals/render-agent.ts` (`proposeProposalRender`/`confirmProposalRender`),
  `render-jobs.ts` (`catalogName`, flag `ARTIFACT_RENDER_JOBS_ENABLED`), `render-projection.ts`, `assets.ts`
  (`attachProposalAsset`, versión derivada), `src/lib/nexa/actions/proposal-studio.ts`,
  `services/artifact-worker/consumers/proposal.ts`.

### Blocks / Impacts

- Proposal Studio en el portal (`/admin/commercial/proposals`, TASK-1413) muestra la versión nueva del deck en su
  historial sin cambio de UI.
- `artifact-worker` es compartido con Proposal, Insights y (TASK-1921) piezas de marca: el catálogo nuevo no puede
  degradar a los demás.
- `TASK-1419`/`TASK-1416`: comparten el molde de acción gobernada; esta task no reimplementa su orquestador.

### Files owned

- `src/lib/commercial/tenders/proposals/brand-deck/**` `[nuevo]` (propose/confirm del deck «La órbita» sobre el
  aggregate)
- `src/lib/commercial/tenders/proposals/render-agent.ts` (acepta `graphic-line-deck` y el plan confirmado)
- `services/artifact-worker/consumers/proposal.ts` (catálogo `graphic-line-deck` con pintores inyectados)
- `services/artifact-worker/deploy.sh` (declaración del flag)
- `src/lib/nexa/actions/proposal-studio.ts` (acción `propose_brand_deck`) o `src/lib/nexa/actions/brand-deck.ts`
  `[verificar]` según el registro de acciones vigente
- `src/app/api/commercial/proposals/**` (ruta de propose/confirm del deck) `[verificar]` prefijo vigente
- `src/lib/api/canonical-error-response.ts` (códigos nuevos)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `efeonce-mcp/src/providers/**` (tool, scope, manifiesto, tests)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (delta),
  `docs/documentation/**` y `docs/manual-de-uso/**` de Proposal Studio y de la línea gráfica

## Current Repo State

### Already exists

- Aggregate `Proposal` con gates humanos en la base, capabilities `commercial.proposal.{read,manage,gate}`, módulo
  per-ORG `proposal_studio_v1` activo para Efeonce.
- Render de propuestas por el Job `artifact-worker` con cola, claim atómico y outputs versionados; consumer de Proposal
  con mapa `CATALOGS` que hoy sólo contiene `deck-axis`.
- Molde propose → confirm del render (`render-agent.ts`) y acción de Nexa `request_proposal_render` (TASK-1399).
- Versionado derivado de assets y descarga firmada (TASK-1412); superficie del portal (TASK-1413).

### Gap

- El consumer de Proposal no conoce `graphic-line-deck` ni sus pintores de selección y CTA.
- La `Proposal` no tiene forma de recibir un plan de recetas confirmado ni de ligarlo a datos y plates.
- No hay acción de Nexa ni tool MCP para proponer un deck «La órbita».
- El PPTX de estas plantillas no tiene camino, ni siquiera un error honesto.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: propose/confirm en `src/lib/commercial/tenders/proposals/brand-deck/`; endpoint en `src/app/api/commercial/proposals/**`; consumer en `services/artifact-worker/consumers/proposal.ts`; acción en `src/lib/nexa/actions/`; tool en el repositorio `efeonce-mcp`
- Future candidate home: `worker`
- Boundary: `proposeBrandDeck` (read-only: plan + validación + binding + plates) y `confirmBrandDeck` (humano: persiste el manifest y encola) son el único primitive; endpoint, Nexa y MCP lo consumen; el worker sólo renderiza el manifest persistido y adjunta el asset por el command existente
- Server/browser split: sólo server; propose, confirm, credenciales, LLM y render nunca llegan al browser
- Build impact: el Job suma el catálogo `graphic-line-deck` al bundle del consumer de Proposal; Vercel importa sólo el primitive y tipos, sin Chromium
- Extraction blocker: la cola, el aggregate y los assets viven en el PostgreSQL compartido; el Job comparte imagen y despliegue con Insights y piezas de marca

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: aggregate `greenhouse_commercial.proposal*` (render jobs y assets), manifest inmutable del
  render, asset store privado
- Consumidores afectados: endpoint de Proposal Studio, acción de Nexa, tool MCP federada, Job `artifact-worker`,
  portal `/admin/commercial/proposals`
- Runtime target: `staging` y `production` (Vercel + Cloud Run Job `artifact-worker` + gateway `efeonce-mcp`)

### Contract surface

- Contrato existente a respetar: `proposeProposalRender`/`confirmProposalRender`, `RenderConsumer`,
  `attachProposalAsset`, `assertProposalStudioAccessForSubject`, `render-projection.ts`, `canonicalErrorResponse`
- Contrato nuevo o modificado: `proposeBrandDeck`/`confirmBrandDeck`; ruta HTTP de propose y confirm del deck; acción
  de Nexa `propose_brand_deck`; tool MCP de proponer (read-only) con confirmación humana; códigos canónicos nuevos
  (`brand_deck_plan_invalid`, `brand_deck_unbound_slots`, `brand_deck_pptx_not_supported`, `brand_deck_disabled`)
- Backward compatibility: `gated` — detrás del flag; el render de `deck-axis` e Insights no cambia
- Full API parity: endpoint, Nexa y MCP llaman al mismo `proposeBrandDeck`/`confirmBrandDeck`; para documentos de
  marca sin `Proposal`, el confirm delega en el command de TASK-1921

### Data model and invariants

- Entidades/tablas/views afectadas: render jobs y assets de Proposal existentes (sin tabla nueva prevista;
  `[verificar]` en el plan si el plan confirmado necesita columna o fila propia)
- Invariantes que no se pueden romper:
  - Sólo una persona confirma; un agente nunca ejecuta el confirm.
  - El manifest persistido al confirmar es inmutable y el worker renderiza exactamente ese manifest.
  - Un plan inválido (TASK-1929) o con slots `unbound` obligatorios (TASK-1930) no se confirma.
  - Un deck `client_facing` con evidencia `internal` no se encola.
  - Un asset nunca se sobreescribe: cada render es una versión nueva (`kind=deck`, versión derivada).
  - Encender este catálogo no enciende ni degrada `deck-axis` ni Insights.
- Write-target allowlist: declarar en el allowlist de destinos de Proposal cualquier tabla o columna nueva si el
  dominio tiene boundary test
- Tenant/space boundary: la `Proposal` define la organización; el scope sale de la sesión; módulo `proposal_studio_v1`
  por organización
- Idempotency/concurrency: clave = hash del manifest resuelto + propósito (patrón de `render-jobs.ts`); el mismo
  confirm devuelve el job existente; claim atómico del worker
- Audit/outbox/history: eventos outbox al confirmar y al adjuntar el asset (catálogo de eventos de Proposal);
  procedencia del asset con plan, rastro de slots, plates por sha256 y versiones AXIS

### Migration, backfill and rollout

- Migration posture: `none` previsto (`additive` si el plan confirma columna o tabla, con bloque DO)
- Default state: flag OFF en Vercel y en el Job
- Backfill plan: sin backfill
- Rollback path: flag OFF en ambos runtimes (`deploy.sh` + `gcloud run jobs update` y env de Vercel), revert PR
- External coordination: release de `efeonce-mcp` con la tool; deploy del Job por el release control plane

### Security and access

- Auth/access gate: capabilities existentes `commercial.proposal.manage` (propose/confirm) y `commercial.proposal.read`
  sobre `assertProposalStudioAccessForSubject`; para documentos de marca, la capability de TASK-1921; scope MCP de
  escritura propio para la tool
- Sensitive data posture: montos y evidencia de propuestas (confidenciales); sin loaded cost ni margen (TASK-1930)
- Error contract: `canonicalErrorResponse` con códigos nuevos; issues del plan y del binding saneados; `captureWithDomain`
- Abuse/rate-limit posture: idempotencia por manifest; tope de jobs por organización del patrón vigente de Proposal

### Runtime evidence

- Local checks: tests de propose/confirm (plan inválido, slot `unbound`, evidencia interna, idempotencia, actor no
  humano), del consumer con el catálogo real, cobertura de acciones Nexa y tests de la tool en `efeonce-mcp`
- DB/runtime checks: un job de staging recorre propose → confirm → claim → render → asset `kind=deck` versionado
- Integration checks: acción de Nexa en staging; llamada real a la tool MCP federada en staging
- Reliability signals/logs: señal de jobs atascados del consumer de Proposal (existente) filtrada por catálogo; logs
  del Job con su dominio
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** `proposeBrandDeck`/`confirmBrandDeck` en `src/lib`.
- [ ] **Modelada como command sobre el aggregate, no como click-handler.**
- [ ] **Read** (propose) sin escrituras; **write** (confirm) con authorization fina, idempotencia, outbox, errores canónicos y observabilidad.
- [ ] **Capability + grant en el MISMO PR:** reutiliza `commercial.proposal.*` con grants existentes; toda capability nueva que surja va con su grant y coverage test.
- [ ] **Camino programático declarado:** endpoint de Proposal Studio + acción de Nexa + tool MCP federada.
- [ ] **Write apto para `propose → confirm → execute`**, sin integración específica de Nexa.
- [ ] **Un primitive, muchos consumers:** endpoint, Nexa y MCP sin lógica duplicada; brochure/pitch/QBR delegan en TASK-1921.
- [ ] **Parity check = SÍ.**

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

### Slice 1 — Propose y confirm sobre el aggregate

- `proposeBrandDeck({ proposalId, context })`: `proposeDeckPlan` (TASK-1929) → `bindDeckSlots` (TASK-1930) →
  `resolvePlateForRecipe` por lámina con exclusión (TASK-1931) → entrada de documento y `resolveSurfaceDocument` →
  preview con plan, issues, rastro de slots y plates; no escribe.
- `confirmBrandDeck({ proposalId, previewHash, actor })`: sólo actor humano; re-ejecuta los gates; persiste el manifest
  resuelto y encola el job con `catalogName = graphic-line-deck` por `confirmProposalRender` (o su extensión).

### Slice 2 — Consumer de Proposal con el catálogo nuevo

- `services/artifact-worker/consumers/proposal.ts`: agrega `graphic-line-deck` al mapa `CATALOGS` con los pintores de
  selección y CTA inyectados como en `scripts/brand-surfaces/compose.ts` (`createCatalog(options)`); plates por
  `assetId` desde el store; PDF adjunto por `attachProposalAsset` `kind=deck`.
- Smoke: `deck-axis` e Insights renderizan igual con el catálogo nuevo cargado.

### Slice 3 — PPTX honesto

- Pedido de PPTX: si todas las plantillas del plan son nativas en la matriz de TASK-1395, se encola el target
  `pptx-native`; si no, `brand_deck_pptx_not_supported` con la lista de plantillas no cubiertas y el PDF sigue válido.

### Slice 4 — Endpoint y acción de Nexa

- Ruta HTTP de propose y confirm del deck en el prefijo de Proposal Studio, con `canonicalErrorResponse` y gate del
  flag.
- Acción gobernada `propose_brand_deck` (molde TASK-1399): schema sin ids de org, preview que ejercita los gates
  reales, confirm humano; para brochure, pitch o QBR (sin `Proposal`), el confirm delega en el command de documento de
  TASK-1921.

### Slice 5 — Tool MCP federada

- En `efeonce-mcp`: tool de proponer deck (read-only, devuelve el preview) y el camino de confirmación humana vigente del
  gateway; scope, manifiesto regenerado, tests y release; `pnpm mcp:manifest:check`.

### Slice 6 — Flag, ledger y documentación

- Flag (nombre propuesto `PROPOSAL_BRAND_DECK_ENABLED`) declarado en `deploy.sh` y Vercel, fila en el ledger con ambos
  runtimes y en «Pendientes de acción».
- Triple documentación: delta en la arquitectura de Proposal Studio, doc funcional y manual («proponer y confirmar un
  deck La órbita desde Proposal Studio o Nexa»).

## Out of Scope

- Plantillas (TASK-1927, TASK-1928), reglas del plan (TASK-1929), binders (TASK-1930) y banco de plates (TASK-1931).
- El renderer `pptx-native` en sí: TASK-1395.
- La ruta productiva de piezas sueltas y documentos de marca sin `Proposal`: TASK-1921 (esta task sólo delega en ella).
- UI nueva en el portal: el historial de versiones de TASK-1413 ya muestra el asset; una superficie de propuesta de
  deck sería una task `ui-ux` aparte.
- Envío al cliente, firma o publicación: el asset se entrega, no se envía.

## Detailed Spec

**Preview de la acción (lo que ve la persona antes de confirmar):** documento y portada/contraportada elegidas, lista de
láminas con su receta, issues (errores bloquean el confirm; warnings se muestran), tabla de slots con estado y fuente
(`bound`/`unbound`), plates con su id y estado, y qué salidas se pueden pedir (PDF siempre; PPTX según la matriz).

**Procedencia del asset:** versiones AXIS, ids de receta, hash del plan confirmado, rastro de cada slot
(`source`, `evidenceRef`, `asOf`), sha256 de cada plate, id de job, actor que confirmó, fecha.

**Delegación a TASK-1921:** si `context.document ∈ {brochure, pitch, qbr}` y no hay `proposalId`, el confirm llama al
command de documento de TASK-1921 con el mismo manifest; el propose es idéntico.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Todas las dependencias (TASK-1921, 1928, 1929, 1930, 1931) cerradas antes del Slice 1.
- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- Slice 2 MUST desplegarse con el flag OFF en el Job antes de encender el endpoint en cualquier ambiente.
- Slice 5 no se libera hasta que el endpoint esté verificado en staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El catálogo nuevo degrada el render de `deck-axis` o Insights en el Job compartido | artifact-worker | medium | flag propio; smoke de los tres consumers en staging antes de prod | señal de jobs atascados por consumer; logs del Job |
| El flag queda encendido en Vercel y apagado en el Job (o al revés) | release | medium | `deploy.sh` + `--update-env-vars`; verificar la revisión activa; ledger con ambos runtimes | jobs `queued` que no avanzan |
| Un agente confirma un deck | Nexa / MCP | low | confirm sólo con actor `member`; test | test rojo; auditoría del outbox |
| Evidencia interna llega al cliente | Proposal | low | proyección allowlisted fail-closed | `internal_evidence_for_client_facing` |
| PPTX rasterizado o PDF entregado como PPTX | renderer | low | error canónico cuando la matriz no cubre | `brand_deck_pptx_not_supported` |
| La tool MCP se libera con contrato distinto al endpoint | MCP | medium | tests de paridad del manifiesto; smoke real en staging | `mcp:manifest:check` rojo |

### Feature flags / cutover

- `PROPOSAL_BRAND_DECK_ENABLED` (nombre propuesto), default `false` en Vercel (Production, staging, Preview) y en el Job
  `artifact-worker`. Se enciende en staging tras smoke; en producción sólo con aprobación del operador y por el release
  control plane. Revert: `false` en ambos runtimes; tiempo de revert menor a 10 minutos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (sin datos nuevos si no hubo confirm con flag ON) | minutos | sí |
| Slice 2 | flag OFF en el Job vía `deploy.sh` + update; revert del consumer en el siguiente release | < 10 min | sí |
| Slice 3 | revert PR | minutos | sí |
| Slice 4 | flag OFF en Vercel + redeploy | < 10 min | sí |
| Slice 5 | release anterior de `efeonce-mcp` | minutos | sí |
| Slice 6 | revert de docs y fila del ledger al estado real | minutos | sí |

### Production verification sequence

1. Deploy del Job a staging con flag OFF: `deck-axis` e Insights renderizan igual (smoke de ambos).
2. Flag ON en staging (Vercel + Job): propose y confirm de un deck de propuesta sobre una `Proposal` de Efeonce con
   evidencia real; el job recorre encolado → claim → render → asset `kind=deck` con procedencia.
3. Plan inválido y slot obligatorio `unbound`: el confirm se rechaza con código canónico, sin job.
4. Pedido de PPTX con una plantilla no cubierta: `brand_deck_pptx_not_supported`, PDF intacto.
5. Acción de Nexa y tool MCP en staging contra el mismo primitive.
6. Producción por el release control plane con flag OFF; encender sólo con aprobación del operador y repetir 2–5.
7. Vigilar la señal de jobs atascados y los logs del Job durante 7 días.

### Out-of-band coordination required

- Release del repositorio `efeonce-mcp` y alta del scope si se crea uno nuevo.
- Promoción a producción por el release control plane (skill `greenhouse-production-release`), sin pushes a `develop`
  durante un release en vuelo.
- Aprobación del operador del primer deck compuesto por esta ruta antes de encender en producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `proposeBrandDeck` no escribe nada y devuelve plan, issues, rastro de slots y plates (test).
- [ ] `confirmBrandDeck` rechaza un actor no humano, un plan inválido y un slot obligatorio `unbound` con código canónico, sin crear job (tests).
- [ ] Un deck `client_facing` con evidencia `internal` no se encola (test).
- [ ] El consumer de Proposal renderiza `graphic-line-deck` con pintores inyectados y plates por `assetId`, y adjunta el PDF como `kind=deck` con versión derivada.
- [ ] Con el catálogo nuevo cargado, `deck-axis` e Insights renderizan igual en staging (smoke registrado).
- [ ] El pedido de PPTX falla con `brand_deck_pptx_not_supported` cuando la matriz de TASK-1395 no cubre una plantilla, y nunca rasteriza.
- [ ] La procedencia del asset incluye versiones AXIS, recetas, hash del plan, rastro de slots, sha256 de plates, job y actor.
- [ ] La acción `propose_brand_deck` de Nexa y la tool MCP federada llaman al mismo primitive; el confirm es humano; para brochure, pitch o QBR delega en el command de TASK-1921.
- [ ] La tool MCP está federada (tool, scope, manifiesto, tests, release) y `pnpm mcp:manifest:check` pasa.
- [ ] El flag tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` con sus dos runtimes y `pnpm docs:closure-check` pasa.
- [ ] Un deck real recorrió propose → confirm → render → asset en staging, con evidencia en el cierre.
- [ ] Documentación técnica, funcional y manual de uso publicadas.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre)
- `pnpm mcp:manifest:check` y tests de `efeonce-mcp`
- `pnpm staging:request POST <ruta de propose>` y `<ruta de confirm>` con una `Proposal` de Efeonce
- `pnpm docs:closure-check`
- `pnpm build` — sólo con autorización del operador

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] El estado del flag por runtime quedó en el ledger; si queda OFF en producción, el cierre dice `code complete, rollout pendiente`
- [ ] `## Delta` en TASK-1395 y TASK-1921 con lo que esta task consume de cada una

## Follow-ups

- Superficie en el portal para proponer y revisar el deck (task `ui-ux`), si el operador la pide.
- Convergencia con el orquestador de TASK-1419 cuando una propuesta mezcle capítulos autorados y recetas.

## Open Questions

- ¿El plan confirmado vive sólo en el manifest del render job o necesita fila propia en el aggregate para editarse y
  re-renderizarse? Recomendación: sólo manifest (inmutable), y re-proponer para cambiar.
- ¿La tool MCP de proponer es una sola para propuesta y marca propia, o dos tools con scopes distintos? Depende del
  dueño de dominio que fije TASK-1921.
