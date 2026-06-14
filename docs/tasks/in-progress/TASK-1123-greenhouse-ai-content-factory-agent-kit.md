# TASK-1123 — Greenhouse AI Content Factory Agent Kit

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-019`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform|commercial|marketing-ops|integrations|wordpress|ai|content`
- Blocked by: `none`
- Branch: `develop` (operator override; no worktree)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar **Greenhouse AI Content Factory** como un Agent Kit gobernado para que Codex, Claude Code, Nexa y futuros agentes creen, refresquen y corrijan contenido WordPress para `efeoncepro.com` usando el runtime real: Gutenberg para posts, Elementor/Ohio para landings, HubSpot/UTM para attribution y el bridge WordPress para drafts seguros. No crea un chat ni un editor nuevo; crea recursos, contratos, recipes, catálogos, ejemplos dorados, validators y primitives API-first consumibles por agentes y, más adelante, por MCP.

## Why This Task Exists

La capacidad buscada no es "un chatbot que escribe contenido". Codex y Claude ya pueden operar si tienen contexto fiable. El gap real es que el conocimiento del sitio vive disperso entre discovery docs, skills, inspecciones y memoria de sesión. Sin un Agent Kit, cada agente tendría que redescubrir cómo construir un bloque Gutenberg, cuándo usar un widget Ohio, cómo inspeccionar `_elementor_data`, cómo entender settings de tema/Ohio/Elementor, cómo hacer un refresh de una página existente sin romperla, cómo evitar CSS hardcodeado, cómo preparar un draft firmado y cómo respetar Full API Parity.

Además, la fábrica no puede limitarse a "crear desde cero". Debe soportar:

- `create`: generar un post/landing nuevo desde una idea o brief.
- `refresh`: actualizar/refinar una página, post o módulo existente aprovechando su estructura real.
- `fix`: diagnosticar y corregir problemas existentes de layout, copy, SEO, CTA, blocks, widgets, settings o theme metas.

El enfoque correcto es:

```text
AI generates structured drafts.
Greenhouse governs contracts, validation, review, audit and API parity.
WordPress renders draft/private content.
Existing content is inspected before it is edited.
MCP is a downstream adapter, not the source of truth.
```

## Goal

- Definir `Greenhouse AI Content Factory` como capability platform, no como chat.
- Crear contratos `contentFactory.*` API-first para briefs, generated drafts, validations, previews and review evidence.
- Dotar a agentes de recipes, catálogos machine-readable y ejemplos dorados para Gutenberg posts y Elementor/Ohio landings.
- Dotar a agentes de un `Content Intelligence Map` para conocer cada post/página/módulo existente: block/widget tree, settings, theme metas, assets, SEO/Yoast, HubSpot/CTA, anchors `gh-*`, ownership y riesgos de patch.
- Hacer que toda capacidad nazca con Full API Parity: server-side primitives/readers/commands primero; UI/CLI/MCP después como clients/adapters.
- Preparar los primeros flujos ejecutables:
  - AI-assisted `post_draft_gutenberg` que produce un draft/private WordPress Greenhouse-owned, nunca publish.
  - AI-assisted `refresh_existing_gutenberg_post` que clona/deriva un draft privado desde un post existente antes de sugerir cambios.
  - AI-assisted `refresh_existing_elementor_landing` que inspecciona y planifica patches sobre draft/private clone antes de mutar la página viva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/09_marca-efeonce.md`
- `docs/context/10_experiencia-cliente.md`
- `docs/context/11_hubspot-bowtie.md`

Reglas obligatorias:

- **No chat-first:** esta task no construye una UI conversacional. Los agentes ya son la interfaz operativa; el entregable es el kit de contexto, contratos y tooling que los vuelve confiables.
- **Full API Parity primero:** cada capacidad debe tener primitive/readers/commands server-side o un path explícito antes de exponerla en UI, CLI, MCP o agent tool.
- **MCP downstream:** si se diseña MCP, solo puede envolver contratos `api/platform/*` o primitives gobernadas; no puede llamar WordPress, SQL, helpers internos o scripts ad hoc directo.
- **AI produces drafts, not publishes:** AI puede generar briefs, manifests, blocks, copy, SEO y review evidence; no puede publish, delete, clear cache o mutar contenido existente fuera de ownership Greenhouse.
- **Inspect before edit:** ninguna edición/refinamiento/fix sobre contenido existente puede planificarse sin inspección actualizada de WordPress: post/page id, status, editor model, blocks/widgets, settings, theme metas, SEO, assets, CTA, HubSpot, ownership, preview and rollback path.
- **Clone/draft before mutate:** refresh/fix de contenido existente debe trabajar primero sobre draft/private clone o revision Greenhouse-owned. Patches directos sobre published content requieren task/release explícita.
- **Builder dialects separados:** posts usan Gutenberg `blockName`/`post_content`; landings usan Elementor/Ohio `widgetType`/`_elementor_data`. Normalizar para agentes, preservar el dialecto nativo al escribir.
- **WordPress write path draft/private only:** cualquier smoke mutante debe usar `greenhouse-wp-bridge`, HMAC, Application Password, ownership metadata y status `draft|private`.
- **No hardcode CSS/Elementor:** usar inspección, controles nativos, recipes y validators; CSS solo como child-theme/plugin gobernado cuando no exista control nativo.
- **No secretos en prompts, docs, examples, logs o final answers.**

## Normative Docs

- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.claude/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/wp-block-development/SKILL.md`
- `.codex/skills/wp-plugin-development/SKILL.md`
- `.codex/skills/wp-rest-api/SKILL.md`
- `.codex/skills/wp-abilities-api/SKILL.md`
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
- `docs/operations/public-site-kinsta-staging-priority-exploration-20260614.md`
- `docs/operations/discovery-public-website-wordpress-20260614.md`
- `docs/operations/discovery-public-website-elementor-20260614.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md`
- `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md`

## Dependencies & Impact

### Depends on

- `TASK-1111` — read-only WordPress/Kinsta discovery and authenticated inventory.
- `TASK-1122` — runtime repo binding/drift/dry-run for `efeoncepro.com`.
- `TASK-1116` — `greenhouse-wp-bridge` signed draft-only foundation, currently deployed/provisioned with writes disabled.
- Secret refs already used by Public Site tooling:
  - `PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF`
  - `PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF`
- Greenhouse API Platform / Full API Parity architecture.
- Runtime repo: `/Users/jreye/Documents/efeonce-public-site-runtime`.

### Blocks / Impacts

- First real `post_draft_gutenberg` write smoke.
- First real `refresh_existing_gutenberg_post` draft/private clone + patch plan.
- First real `refresh_existing_elementor_landing` draft/private clone + patch plan.
- Future `landing_draft_elementor` manifest/template work.
- Future Greenhouse Public Site UI/API lane.
- Future MCP tools/resources for Content Factory.
- Future Nexa advisory layer for public content production.

### Files owned

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/documentation/public-site/greenhouse-ai-content-factory-agent-kit.md` (new)
- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md` (new)
- `docs/documentation/public-site/elementor-ohio-landing-authoring-recipes.md` (new)
- `docs/documentation/public-site/content-factory-golden-examples/` (new)
- `docs/operations/public-site-content-factory-catalogs/` (new)
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.claude/skills/efeonce-public-site-wordpress/SKILL.md`
- `src/lib/public-site/content-factory/` (new, future implementation)
- `src/lib/public-site/bridge-inspection.ts`
- `scripts/public-website/bridge-inspect.ts`
- `scripts/public-website/bridge-draft-contract.ts`
- `wp-content/plugins/greenhouse-wp-bridge/**` in `/Users/jreye/Documents/efeonce-public-site-runtime`

## Current Repo State

### Already exists

- Public Site skill for Codex/Claude with operational memory of WordPress/Kinsta/Ohio/Elementor/Gutenberg.
- Read-only bridge inspection for:
  - `health`
  - Elementor document summary
  - Gutenberg/block document summary
  - Ohio/HubSpot widget catalog
- Greenhouse reader/API lane: `src/lib/public-site/bridge-inspection.ts` + `GET /api/admin/public-site/bridge-inspection?pageId=<id>`.
- Signed draft contract in code: `GHWPB-HMAC-SHA256`, timestamp window, replay guard, body hash, `draft|private` only.
- Runtime evidence that recent Efeonce posts are Gutenberg (`hasBlocks=true`, no Elementor data), while landings use Elementor/Ohio mixed legacy/modern structures.
- Kinsta staging exploration: Standard Staging appears included by docs unless plan-restricted; Premium Staging is paid. Account availability remains unverified.

### Gap

- No canonical `Greenhouse AI Content Factory` task/spec exists.
- No machine-readable catalog of allowed Gutenberg block patterns, Elementor/Ohio modules, HubSpot/UTM CTA patterns and SEO/Yoast expectations.
- No golden examples for agents to imitate and validate against.
- No `Content Intelligence Map` that lets an agent query how each current page/post/blog/landing is composed: Gutenberg blocks, Elementor widgets, Ohio/page metas, theme settings, assets, SEO and CTA state.
- No server-side Content Factory primitives/readers/commands.
- No typed `contentFactoryBrief.v1`, `contentFactoryGeneratedDraft.v1`, `contentFactoryValidation.v1` or `contentFactoryReview.v1`.
- No validator that checks an AI-generated post/landing draft before it reaches WordPress.
- No safe refresh/edit contract for existing content: clone, diff, patch plan, preview, review, rollback.
- No MCP adapter plan grounded in API Platform contracts.

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

### Slice 1 — Agent Kit Canonical Spec

- Crear `docs/documentation/public-site/greenhouse-ai-content-factory-agent-kit.md`.
- Definir la arquitectura del Agent Kit: skills, recipes, catalogs, golden examples, validators, server-side primitives and adapters.
- Declarar explícitamente que no se construye chat ni UI conversacional.
- Declarar contratos iniciales:
  - `contentFactoryBrief.v1`
  - `contentFactoryGeneratedDraft.v1`
  - `contentFactoryValidation.v1`
  - `contentFactoryReview.v1`
  - `contentFactoryInspectionMap.v1`
  - `contentFactoryRefreshPlan.v1`
- Declarar lanes:
  - `post_draft_gutenberg`
  - `landing_draft_elementor`
  - `refresh_existing_gutenberg_post`
  - `refresh_existing_elementor_landing`
  - `fix_existing_public_site_module`

### Slice 2 — Gutenberg Post Authoring Resources

- Inspeccionar una muestra de posts recientes con `pnpm public-website:bridge-inspect` y/o WP-CLI read-only.
- Crear recipes para componer posts Gutenberg:
  - headings
  - paragraphs
  - images
  - lists
  - groups/columns
  - Yoast table of contents when appropriate
  - legacy `core/freeform` handling
- Crear catálogo machine-readable de blocks permitidos/observados y constraints.
- Crear golden examples con `post_content` válido y metadata esperada.
- Agregar validator inicial para blocks generados por AI.
- Agregar recipes de refresh/fix para posts existentes:
  - mejorar headline/excerpt/SEO sin romper bloques;
  - reorganizar headings/listas;
  - actualizar CTA/links;
  - conservar embeds/media;
  - manejar `core/freeform` legacy sin convertirlo agresivamente.

### Slice 3 — Elementor/Ohio Landing Authoring Resources

- Convertir el inventario Ohio/Elementor existente en recipes operativas para agentes.
- Crear catálogo machine-readable de widgets Ohio/Elementor permitidos/observados, controles importantes y casos de uso.
- Crear golden examples para módulos landing existentes:
  - partner proof
  - hero/headline
  - HubSpot form/CTA
  - service tables/cards
- Declarar constraints de patching: `Document::save()`, ownership metadata, semantic `gh-*` classes, no direct `_elementor_data` writes as default.
- Agregar recipes de refresh/fix para landings existentes:
  - diagnosticar un módulo por `element.id + elType + widgetType + fingerprint`;
  - mapear settings nativos del widget antes de proponer CSS;
  - comparar theme metas Ohio vs Elementor document settings;
  - clonar/duplicar a draft/private antes de patch;
  - generar diff humano revisable por módulo, no por DOM.

### Slice 3b — Content Intelligence Map

- Crear un inventario machine-readable y refrescable por objeto WordPress:
  - posts/blogs: post id, slug, status, editor model, block tree summary, block usage, media refs, SEO/Yoast summary, CTA/links, anchors/classes, excerpt.
  - pages/landings: post id, slug, status, Elementor tree summary, widget usage, Ohio/page metas, template, generated CSS status, assets, HubSpot widgets/forms/meetings, semantic `gh-*` anchors.
  - theme/runtime: active theme, child-theme overrides, relevant CSS files, global Ohio variables, Elementor kit caveats.
- Exponerlo como resources/JSON bajo `docs/operations/public-site-content-factory-catalogs/` y luego como reader `getPublicSiteContentIntelligenceMap`.
- Incluir freshness metadata: scannedAt, source endpoint, bridge version, post modified date and hash/fingerprint.
- Ningún refresh/fix puede usar un map stale sin re-inspection.

#### Slice 3b implementation note — 2026-06-14

- Estado: `in-progress`.
- Owner: Codex on `develop` by explicit operator override; no task branch/worktree.
- First MVP target: read-only `contentFactoryInspectionMap.v1` generated from live `greenhouse-wp-bridge` inspections.
- Canonical samples:
  - `249766` — Gutenberg post sample (`post`, `gutenberg_blocks`).
  - `244079` — Elementor/Ohio landing sample (`page` normalized as `landing`, `elementor_document`).
- Safety: no WordPress writes, no publish, no cache clear, no `wp-config.php`, no secrets in output.
- Code shipped:
  - `src/lib/public-site/content-factory/intelligence-map.ts`
  - `scripts/public-website/content-factory-inspect.ts`
  - `pnpm public-website:content-factory:inspect`
- Evidence generated from versioned bridge inspections because local `gcloud` reauth was expired for direct Secret Manager reads:
  - `docs/operations/public-site-content-factory-catalogs/content-intelligence-map-2026-06-14T18-38-09-337Z.json`
  - `249766`: `gutenberg_blocks`, `81` blocks, `12` normalized modules, no access issues.
  - `244079`: `elementor_document`, `199` Elementor elements, `31` normalized modules, no access issues.
- Fresh live evidence after canonical GCP reauth:
  - `docs/operations/public-site-content-factory-catalogs/content-intelligence-map-2026-06-14T18-43-51-314Z.json`
  - `249766`: `gutenberg_blocks`, `81` blocks, `12` normalized modules, no access issues.
  - `244079`: `elementor_document`, `199` Elementor elements, `32` normalized modules, no access issues.

### Slice 4 — API-First Content Factory Primitives

- Crear módulo `src/lib/public-site/content-factory/` con types, schemas and pure validators.
- Definir readers:
  - `listPublicSiteContentPatterns`
  - `getPublicSiteGoldenExample`
  - `getPublicSiteContentIntelligenceMap`
  - `inspectPublicSiteObjectForRefresh`
  - `validateGeneratedGutenbergDraft`
  - `validateElementorLandingManifest`
  - `validatePublicSiteRefreshPlan`
- Definir commands as contracts, even if implemented as no-op/dry-run first:
  - `prepareGeneratedPostDraft`
  - `prepareGeneratedLandingDraft`
  - `prepareExistingPostRefreshDraft`
  - `prepareExistingLandingRefreshDraft`
  - `preparePublicSiteFixPlan`
  - `requestContentReview`
- Toda lógica reusable vive en primitives; scripts/API/MCP solo envuelven.

### Slice 5 — CLI and Evidence Lane for Agents

- Agregar CLI no-mutante para que agentes generen/validen un draft artifact local:
  - `pnpm public-website:content-factory:validate`
  - `pnpm public-website:content-factory:plan`
  - `pnpm public-website:content-factory:inspect`
  - `pnpm public-website:content-factory:refresh-plan`
- Guardar evidencia en `docs/operations/public-site-content-factory/`.
- No enviar writes WordPress en este slice salvo que `TASK-1116` esté listo para smoke controlado.

### Slice 6 — First Draft Smoke Plan

- Preparar, no necesariamente ejecutar, el primer `post_draft_gutenberg` smoke:
  - disposable slug `greenhouse-smoke-*`
  - status `draft|private`
  - ownership metadata
  - signed HMAC
  - preview/status readback
  - rollback by trashing/deleting the smoke draft only
- Si no hay Kinsta Standard Staging confirmado, documentar production draft/private-only policy with shortest possible write window.
- Preparar, no necesariamente ejecutar, el primer `refresh_existing_gutenberg_post` smoke:
  - seleccionar un post existente;
  - inspeccionar;
  - generar refresh plan;
  - crear draft/private clone o derivative;
  - aplicar cambios al clone, nunca al published original;
  - leer preview/status y documentar rollback.
- Preparar el primer `refresh_existing_elementor_landing` smoke solo como plan hasta que clone/duplicate draft semantics del bridge estén probadas.

### Slice 7 — MCP Adapter Design

- Diseñar el futuro MCP adapter como downstream de API Platform/primitives.
- Enumerar candidate resources/tools:
  - `content_factory_patterns`
  - `get_gutenberg_authoring_recipe`
  - `get_public_site_content_intelligence_map`
  - `validate_generated_post_draft`
  - `prepare_existing_content_refresh_plan`
  - `prepare_wordpress_draft`
  - `inspect_public_site_document`
- No implementar MCP writes hasta que command idempotency, authz, audit and draft smoke estén probados.

## Out of Scope

- Construir un chat o nueva UI conversacional.
- Publicar contenido en WordPress.
- Limpiar cache Kinsta o crear backups Kinsta.
- Bajar privilegios del usuario WordPress técnico en esta task.
- Crear un editor visual de landings en Greenhouse.
- Patch directo sobre páginas publicadas existentes.
- Reescribir masivamente posts legacy o convertir `core/freeform` sin aprobación.
- Convertir `efeoncepro.com` en SPA o reemplazar WordPress.
- MCP-first tools que salten API Platform/primitives.
- AI autonomous publish.

## Detailed Spec

### Core concept

`Greenhouse AI Content Factory` es una capa operativa para agentes:

```text
Brand / commercial context
  + Public Site runtime knowledge
  + Content Intelligence Map
  + Gutenberg / Elementor / Ohio recipes
  + Golden examples
  + Validators
  + Full API parity primitives
  -> AI-generated structured drafts or refresh/fix plans
  -> WordPress draft/private via bridge
  -> human review / approval
```

### Initial contract sketch

```ts
type ContentFactoryBriefV1 = {
  contractVersion: 'contentFactoryBrief.v1'
  intent: 'create' | 'refresh' | 'fix'
  lane:
    | 'post_draft_gutenberg'
    | 'landing_draft_elementor'
    | 'refresh_existing_gutenberg_post'
    | 'refresh_existing_elementor_landing'
    | 'fix_existing_public_site_module'
  objective: string
  audience: string
  target?: {
    wordpressPostId?: number
    url?: string
    moduleId?: string
    editorModel?: 'gutenberg_blocks' | 'elementor_document' | 'unknown'
  }
  offer?: string
  serviceKey?: string
  campaignId?: string
  hubspotCampaignId?: string
  primaryKeyword?: string
  secondaryKeywords?: string[]
  tone: 'efeonce_expert' | 'educational' | 'conversion' | 'thought_leadership'
  locale: 'es-CL' | 'en-US' | 'pt-BR'
  cta: {
    kind: 'hubspot_form' | 'hubspot_meeting' | 'external_url' | 'greenhouse_capture'
    target: string
  }
}

type ContentFactoryGeneratedDraftV1 = {
  contractVersion: 'contentFactoryGeneratedDraft.v1'
  intent: 'create' | 'refresh' | 'fix'
  lane:
    | 'post_draft_gutenberg'
    | 'landing_draft_elementor'
    | 'refresh_existing_gutenberg_post'
    | 'refresh_existing_elementor_landing'
    | 'fix_existing_public_site_module'
  sourceBriefId?: string
  sourceInspectionId?: string
  sourceWordPressPostId?: number
  title: string
  slug: string
  excerpt?: string
  seo: {
    title: string
    description: string
    indexPolicy: 'index' | 'noindex'
  }
  draft:
    | { kind: 'gutenberg_post'; postContent: string; observedBlocks: string[] }
    | { kind: 'elementor_landing'; manifest: unknown; widgets: string[] }
  attribution?: {
    campaignId?: string
    hubspotCampaignId?: string
    utm?: Record<string, string>
  }
}

type ContentFactoryValidationV1 = {
  contractVersion: 'contentFactoryValidation.v1'
  status: 'pass' | 'warning' | 'block'
  findings: Array<{
    severity: 'info' | 'warning' | 'block'
    code: string
    message: string
    path?: string
  }>
}

type ContentFactoryInspectionMapV1 = {
  contractVersion: 'contentFactoryInspectionMap.v1'
  scannedAt: string
  source: 'greenhouse_wp_bridge' | 'wp_cli' | 'manual_import'
  bridgeVersion?: string
  objects: Array<{
    wordpressPostId: number
    url?: string
    slug: string
    postType: 'post' | 'page' | 'landing'
    status: string
    editorModel: 'gutenberg_blocks' | 'elementor_document' | 'classic_or_unknown'
    modifiedGmt?: string
    contentFingerprint?: string
    modules: Array<{
      nativeKind: 'blockName' | 'widgetType' | 'themeMeta' | 'asset' | 'seo' | 'hubspot'
      key: string
      count?: number
      settingsKeys?: string[]
      anchors?: string[]
      risk?: 'low' | 'medium' | 'high'
    }>
  }>
}

type ContentFactoryRefreshPlanV1 = {
  contractVersion: 'contentFactoryRefreshPlan.v1'
  target: {
    wordpressPostId: number
    editorModel: 'gutenberg_blocks' | 'elementor_document'
    sourceFingerprint: string
  }
  mode: 'clone_to_draft' | 'patch_existing_draft' | 'plan_only'
  changes: Array<{
    operation: 'add' | 'update' | 'remove' | 'reorder' | 'settings_patch'
    targetPath: string
    nativeKind: 'blockName' | 'widgetType' | 'themeMeta' | 'seo' | 'hubspot'
    rationale: string
    risk: 'low' | 'medium' | 'high'
  }>
  rollback: {
    strategy: 'trash_clone' | 'revert_patch' | 'manual_restore'
    notes: string
  }
}
```

### Full API Parity contract

Every capability in this task must have a programmatic path:

| Capability | Primitive first | API/CLI/MCP after |
|---|---|---|
| List content patterns | `listPublicSiteContentPatterns` | API/app + CLI + MCP resource |
| Get authoring recipe | `getPublicSiteAuthoringRecipe` | API/app + CLI + MCP resource |
| Inspect existing content | `inspectPublicSiteObjectForRefresh` | API/app + CLI + MCP resource |
| Read intelligence map | `getPublicSiteContentIntelligenceMap` | API/app + CLI + MCP resource |
| Validate generated post | `validateGeneratedGutenbergDraft` | API/app + CLI + MCP tool |
| Validate refresh plan | `validatePublicSiteRefreshPlan` | API/app + CLI + MCP tool |
| Prepare draft plan | `prepareGeneratedPostDraft` | API/app + CLI |
| Prepare existing content refresh | `prepareExistingPostRefreshDraft` / `prepareExistingLandingRefreshDraft` | API/app + CLI; MCP only after write safety |
| Send WordPress draft | `prepareWordPressDraft` / bridge command | API/app first, MCP only after write safety |

UI is not required in this task. If added later, it must consume the same primitives.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (spec) -> Slice 2 (Gutenberg resources) -> Slice 4 (primitives validators) -> Slice 5 (CLI evidence) -> Slice 6 (smoke plan).
- Slice 3 (Elementor resources) can run after Slice 1 and in parallel with Slice 2, but no Elementor write path may ship before validators and ownership constraints exist.
- Slice 3b (Content Intelligence Map) MUST ship before any refresh/fix smoke against existing content.
- Slice 7 (MCP design) must happen after Slice 4; MCP cannot precede primitives/API contracts.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| AI genera HTML/bloques inválidos y rompe preview | WordPress/Gutenberg | medium | validator + golden examples + draft/private only | validation `block` findings, bridge 4xx |
| AI usa widget Elementor no disponible o control inexistente | WordPress/Elementor | medium | widget catalog + recipes + validation against bridge catalog | validation warning/block |
| Refresh/fix toca el objeto publicado equivocado | WordPress public site | medium | inspect-before-edit + source fingerprint + clone/draft before mutate + ownership metadata | validation block, bridge audit mismatch |
| Agent usa inspection stale y pisa cambios recientes de WordPress | WordPress content | medium | freshness metadata + modified date/fingerprint check before patch | stale inspection block |
| Agents bypass Full API Parity with scripts ad hoc | Platform/API | medium | task hard rule + primitives first + docs/skills update | QA/docs closure finding |
| MCP exposes writes before idempotency/audit | MCP/API/security | medium | MCP design-only until commands are stable | task acceptance blocks |
| Content leaks private Greenhouse/client data into public copy | Security/brand | medium | brief schema + public-data-only rule + review checklist | validation block, human review |
| Production write smoke creates public content accidentally | WordPress public site | low | `draft|private`, no publish route, ownership metadata, rollback plan | bridge health/writes status, audit meta |

### Feature flags / cutover

- Initial slices are docs/catalog/validator additive and need no runtime flag.
- Any WordPress write smoke must keep `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED=false` until the smoke window is explicitly approved.
- If a smoke is approved, enable writes only for the shortest possible window and only for `draft|private` Greenhouse-owned disposable objects.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert docs/spec commit | <5 min | si |
| Slice 2 | remove generated catalogs/examples; validators still absent | <10 min | si |
| Slice 3 | remove Elementor recipes/catalog additions | <10 min | si |
| Slice 4 | revert primitives/API contracts before any consumer depends on them | <15 min | si |
| Slice 5 | remove CLI scripts/evidence lane | <10 min | si |
| Slice 6 | if smoke executed, trash/delete only the disposable Greenhouse-owned draft and disable writes | <15 min | si |
| Slice 7 | revert MCP design doc; no runtime adapter in this task | <5 min | si |

### Production verification sequence

1. Verify docs/spec consistency: `pnpm docs:closure-check`, `pnpm docs:context-check`, `pnpm ops:lint --changed`.
2. Verify catalogs/examples do not include secrets or raw Authorization headers.
3. Verify Gutenberg golden examples parse through WordPress `parse_blocks()` or the bridge block inspector.
4. Verify Content Intelligence Map includes post/page id, editor model, module summary, freshness and fingerprint.
5. Verify validators reject invalid block/widget/module shapes and stale refresh plans.
6. Verify CLI dry-run produces evidence without WordPress writes.
7. Only after explicit approval, run a disposable draft/private smoke and read it back through bridge inspection.

### Out-of-band coordination required

- Operator approval before any WordPress write smoke.
- MyKinsta/API confirmation if Standard Staging exists.
- If no staging exists, explicit production draft/private-only policy for disposable smoke object.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Greenhouse AI Content Factory` is documented as an Agent Kit/capability platform, not as a chat product.
- [ ] Initial contracts `contentFactoryBrief.v1`, `contentFactoryGeneratedDraft.v1`, `contentFactoryValidation.v1` and `contentFactoryReview.v1` are documented and/or implemented as typed schemas.
- [ ] Contracts for `contentFactoryInspectionMap.v1` and `contentFactoryRefreshPlan.v1` exist and require source freshness/fingerprint for edits.
- [ ] Gutenberg post authoring recipes exist with at least three golden examples derived from inspected Efeonce posts.
- [ ] Elementor/Ohio landing authoring recipes exist with widget/module constraints and at least two golden module examples.
- [ ] Machine-readable catalogs exist for observed/allowed Gutenberg blocks and Elementor/Ohio widgets.
- [ ] A Content Intelligence Map exists for inspected posts/pages/landings and includes editor model, blocks/widgets, theme metas, SEO/CTA/HubSpot and freshness metadata.
- [ ] Validators reject invalid blocks/widgets, unknown modules, publish attempts and raw unreviewed scripts.
- [ ] Validators reject stale refresh plans and any direct patch against published content without clone/draft policy.
- [ ] Server-side primitives exist before any UI/MCP adapter.
- [ ] CLI evidence lane can validate a generated draft without WordPress writes.
- [ ] The first `post_draft_gutenberg` smoke plan is documented with rollback.
- [ ] The first `refresh_existing_gutenberg_post` smoke plan is documented with clone/draft rollback.
- [ ] `refresh_existing_elementor_landing` is documented as plan-only until clone/duplicate draft semantics are proven.
- [ ] Skills for Codex and Claude are updated so agents know how to use the Content Factory resources.
- [ ] MCP adapter design explicitly states it is downstream of API Platform/primitives and does not bypass them.

## Verification

- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check`
- `pnpm exec tsc --noEmit --pretty false` when TypeScript primitives are added.
- `pnpm exec vitest run src/lib/public-site/content-factory` when validators/primitives are added.
- `pnpm public-website:bridge-inspect -- --page-id <postId> --no-catalog --write` for refreshed Gutenberg evidence.
- `pnpm public-website:content-factory:inspect` once CLI exists.
- `pnpm public-website:content-factory:validate` once CLI exists.

## Closing Protocol

- Move task to `complete/`, update `Lifecycle: complete`, `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` and `EPIC-019`.
- Update:
  - `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
  - `.claude/skills/efeonce-public-site-wordpress/SKILL.md`
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`
- Invoke `greenhouse-documentation-governor` and `greenhouse-qa-release-auditor`.
- If any WordPress draft smoke ran, include evidence path, draft id, rollback status and write flag status.

## Follow-ups / Open Questions

1. Should `Greenhouse AI Content Factory` eventually live under a broader Greenhouse "AI Operations" program, or remain scoped to EPIC-019 until first public-content flows are proven?
2. Which agent consumes the first resources: Codex/Claude local only, Nexa inside Greenhouse, or MCP downstream?
3. Should the first production smoke be a disposable Gutenberg post in production draft/private, or wait for confirmed Kinsta Standard Staging?
4. How much HubSpot campaign metadata is required in V1 vs. deferred to attribution/reporting tasks?
5. Do landings remain Elementor-first for V1, or should new Greenhouse-owned landings migrate gradually toward Gutenberg blocks/patterns?
6. What is the first existing page/post to refresh as a safe smoke: a disposable blog post clone, the HubSpot services page clone, or a low-risk private page?
