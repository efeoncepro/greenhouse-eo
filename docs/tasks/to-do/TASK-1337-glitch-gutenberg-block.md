# TASK-1337 — Public Site Gutenberg Glitch Block

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1337-glitch-gutenberg-block-motion.md`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseno aprobado`
- Rank: `TBD`
- Domain: `public-site|content|ui`
- Blocked by: `none`
- Branch: `task/TASK-1337-glitch-gutenberg-block`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar un bloque Gutenberg propio para el POV editorial de `Glitch de la semana`: visible como **Glitch**, técnico como `efeoncepro/glitch-drop`. El bloque reemplaza el uso semánticamente incorrecto de `core/quote` para comentarios de Efeonce, sin migrar posts históricos en V1.

## Why This Task Exists

Las ediciones semanales de Glitch hoy usan bloques tipo quote para representar el POV de Efeonce sobre cada noticia. Eso sirve visualmente, pero comunica que el texto es una cita externa cuando en realidad es interpretación editorial propia. La diferencia importa para lectura, accesibilidad, consistencia editorial y futura generación/validación de drafts Gutenberg desde Content Factory.

## Goal

- Crear y verificar un bloque Gutenberg dedicado para `Glitch`.
- Mantener el nombre visible/editorial como `Glitch` y el slug técnico estable como `efeoncepro/glitch-drop`.
- Renderizar el bloque como `aside`, no como `blockquote`.
- Probar inserción, guardado, recarga del editor y render front-end en draft/private post.
- Documentar el rollout y dejar histórica/migración fuera de V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/architecture/public-site/README.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`
- `docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md`
- `docs/ui/motion/TASK-1337-glitch-gutenberg-block-motion.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

Reglas obligatorias:

- El nombre visible para editores/lectores es `Glitch`.
- El nombre técnico del bloque debe ser estable y namespaced: `efeoncepro/glitch-drop`, salvo que Discovery encuentre un blocker real y documente alternativa antes de implementar.
- El bloque representa comentario editorial propio; no reemplaza citas externas.
- Front-end V1 debe renderizar `aside` con accessible name, no `blockquote`.
- `apiVersion: 3` y assets declarados en `block.json`.
- Registro server-side vía metadata (`register_block_type_from_metadata()` o equivalente de scaffold oficial).
- No migrar automáticamente `core/quote` histórico; algunas citas son reales.
- No publicar ni activar en producción sin verificación en draft/private y confirmación explícita del operador.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `.codex/skills/wp-block-development/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`

## Dependencies & Impact

### Depends on

- Existing public-site runtime checkout: `/Users/jreye/Documents/efeonce-public-site-runtime`.
- Existing WordPress plugin directory: `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins`.
- Existing editorial contract: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`.
- Existing Gutenberg authoring rules: `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`.

### Blocks / Impacts

- Impacts future `Glitch de la semana` authoring in `efeoncepro.com/blog`.
- Impacts future Content Factory Gutenberg generation after the block exists.
- Does not block current blog publishing; `core/quote` remains temporary fallback until V1 ships.
- Does not affect Elementor landing pages, Growth Forms, AI Visibility report, HubSpot sync, finance, payroll or private Greenhouse UI.

### Files owned

- `docs/tasks/to-do/TASK-1337-glitch-gutenberg-block.md`
- `docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md`
- `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/**` `[to create or verify during Discovery]`
- `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/src/glitch-drop/**` `[to create or verify during Discovery]`

## Current Repo State

### Already exists

- The visual design is operator-approved (2026-07-04): editorial callout pattern, wordmark label, upright body, navy accent + navy-tint panel, green as isotype-only. Full spec in the wireframe `## Visual Design Spec` + `## Motion`; verified against an Artifact comparison preview (core/quote vs Glitch, desktop + 390px). Implementation must follow that spec, not re-decide it.
- The functional/technical block contract exists at `docs/documentation/public-site/glitch-drop-gutenberg-block.md`.
- The public-site primitive registry includes planned primitive `Glitch`.
- Gutenberg authoring recipes now treat `efeoncepro/glitch-drop` as the target for Efeonce POV in `Glitch de la semana`.
- The local WordPress runtime has plugin roots under `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins`.
- Current runtime plugins observed locally: `eo-elementor-widgets`, `eo-headless-content`, `eo-vibe-coding-api`, `greenhouse-wp-bridge`.
- Los logos de marca `Glitch` (wordmark) ya están disponibles en el repo, listos para consumir por el bloque:
  - `public/branding/glitch/glitch-dark.svg` — wordmark en blanco (`#fff`) + isotipo verde (`#6ec207`), para **fondos oscuros**.
  - `public/branding/glitch/glitch-light.svg` — wordmark en navy (`#022a4e`) + isotipo verde (`#6ec207`), para **fondos claros**.

### Gap

- No runtime Gutenberg block plugin exists for `Glitch`.
- Editors still need to use quote/freeform fallback for Glitch POV.
- No build/test/deploy rail has been confirmed for an editorial Gutenberg block plugin.
- No draft/private post has proven insert/save/reload/front-end render for the new block.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: Efeonce editor/author and blog reader.
- Momento del flujo: editor adds Efeonce POV after a news item in a weekly Glitch post; reader scans the news item and needs to identify the POV quickly.
- Resultado perceptible esperado: `Glitch` reads as an editorial aside owned by Efeonce, not a quoted source.
- Friccion que debe reducir: misuse of `core/quote`, ambiguous authorship, inconsistent formatting across weekly editions.
- No-goals UX: no redesign of the full Glitch article template, no AI writing assistant, no historical migration, no decorative visual effects in V1.

### Surface & system decision

- Surface: WordPress Gutenberg editor and front-end blog posts on `efeoncepro.com/blog`.
- Composition Shell: `no aplica` — public WordPress/Gutenberg runtime, not private Greenhouse portal.
- Primitive decision: `new` — public-site semantic Gutenberg block `Glitch`.
- Adaptive density / The Seam: `no aplica` — no private Greenhouse card density contract.
- Floating/Sidecar/Dialog decision: none.
- Copy source: `local one-off` for V1 block strings, documented in `docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md`.
- Access impact: `none` — WordPress editor permissions unchanged.

### State inventory

- Default: label `Glitch`, content rendered as aside.
- Loading: N/A, static block/editor component.
- Empty: editor placeholder only; empty content should not be published as meaningful front-end content.
- Error: invalid block/editor warnings must be fixed before rollout; no custom front-end error UI.
- Degraded / partial: missing optional label/tone falls back to `Glitch`/default tone.
- Permission denied: WordPress controls editor access.
- Long content: two compact paragraphs allowed; long content must wrap without horizontal overflow.
- Mobile / compact: front-end block remains readable at 390px.
- Keyboard / focus: content editable via keyboard in Gutenberg.
- Reduced motion: no motion in V1.

### Interaction contract

- Primary interaction: insert block, write/edit POV, save post, reload editor.
- Hover / focus / active: default Gutenberg text editing affordances; front-end block non-interactive.
- Pending / disabled: N/A.
- Escape / click-away: default Gutenberg behavior.
- Focus restore: default Gutenberg behavior.
- Latency feedback: N/A.
- Toast / alert behavior: WordPress editor native notices only.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: none.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: N/A.
- Reduced-motion fallback: N/A.
- Non-goal motion: no decorative label effects, pulsing border, reveal behavior or GSAP/Framer dependency in V1.

### Implementation mapping

- Route / surface: WordPress Gutenberg editor + front-end single post template.
- Primitive / variant / kind: public-site primitive `Glitch`; technical block `efeoncepro/glitch-drop`.
- Component candidates:
  - `@wordpress/create-block` scaffold, dynamic variant.
  - `block.json`, `src/edit.js`, `src/save.js` or dynamic fallback, `render.php`, shared styles.
  - PHP bootstrap registering block metadata on `init`.
- Copy source: block package strings + docs ledger.
- Data reader / command: none.
- API parity: N/A; no business action or state mutation beyond WordPress post content.
- Access / capability: WordPress editor permissions; no Greenhouse entitlement.
- States to implement: default, empty editor placeholder, long content, mobile, editor reload/no-invalid-block.

### GVC scenario plan

- Scenario file: create a proportional public-site WordPress capture/verifier during implementation.
- Route: local/staging private or draft Glitch test post.
- Viewports: desktop `1440x1000`, laptop `1280x900`, mobile `390x844`.
- Required steps: insert block, save draft/private, reload editor, open preview/front-end, capture.
- Required captures: editor canvas, front-end desktop block, front-end mobile block.
- Required `data-capture` markers: `glitch-block` if safe, otherwise selector `.gh-glitch-drop`.
- Assertions: block appears, label is `Glitch`, wrapper is `aside`, no `blockquote`, no invalid block warning, no page horizontal overflow.
- Scroll-width checks: desktop and mobile 390 front-end.
- Reduced-motion / focus evidence: no motion introduced; keyboard editing in Gutenberg checked manually or by Playwright where practical.

### Design decision log

- Decision: create dedicated Gutenberg block with visible name `Glitch`.
- Alternatives considered:
  - Continue with `core/quote`.
  - Register only a `core/quote` style variation.
  - Use visible label `Glitch Drop`.
- Why this pattern: dedicated block fixes semantics and authoring consistency; `Glitch` is shorter and more ownable for readers.
- Reuse / extend / new primitive: new public-site Gutenberg primitive; quote remains temporary fallback only.
- Open risks: build rail for new plugin, exact staging/private verification path, whether tone variants are useful enough for V1.

### Visual verification

- GVC scenario: public-site WordPress verifier/capture to be created during implementation.
- Viewports: 1440, 1280 and 390.
- Required captures: editor block and front-end block.
- Required `data-capture` markers: `glitch-block` if implemented.
- Scroll-width check: front-end desktop/mobile.
- Accessibility/focus checks: `aside` accessible name, keyboard editor access.
- Before/after evidence: compare current quote fallback vs new block in a draft/private Glitch post.
- Known visual debt: final styling must be reviewed in Ohio blog context, not only isolated block editor.

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

### Slice 1 — Runtime discovery and plugin scaffold decision

- Confirm whether `efeonce-editorial-blocks` should be a new plugin or whether an existing public-site plugin is the correct host.
- Verify Node/npm/tooling requirements for `@wordpress/create-block`, `@wordpress/scripts`, local WordPress and activation path.
- Scaffold or prepare the plugin/block structure in the chosen runtime location.
- Confirm the block name remains `efeoncepro/glitch-drop` and the visible title remains `Glitch`.

### Slice 2 — Block implementation

- Implement `block.json` with `apiVersion: 3`, editor assets, shared styles and dynamic render file.
- Implement editor UI with `useBlockProps`, `RichText`, placeholder copy and minimal controls.
- Implement `render.php` with `get_block_wrapper_attributes()`, `aside` semantics and WordPress escaping.
- Implement scoped CSS for editor/front-end using `.gh-glitch-drop` selectors.
- Keep V1 non-interactive and visually static.

### Slice 3 — Verification in draft/private post

- Activate/build the plugin locally or in the approved staging path.
- Insert `Glitch` in a draft/private Glitch-style post.
- Save, reload editor and confirm no invalid block warning.
- Open front-end preview and verify the output is an `aside`, not `blockquote`.
- Capture desktop/mobile evidence and measure page horizontal overflow.

### Slice 4 — Documentation and rollout readiness

- Update the block contract if implementation decisions differ from the initial design.
- Update public-site primitive registry if plugin path/status changes.
- Document activation/deploy/cache/rollback steps for the public-site runtime.
- Leave historical quote migration as a follow-up unless the operator explicitly approves a separate migration task.

## Out of Scope

- Migrating historical `core/quote` blocks to `Glitch`.
- Auto-detecting which quotes are POV vs real citation.
- Redesigning the full `Glitch de la semana` article template.
- Adding AI writing/generation inside the block editor.
- Adding decorative visual effects or complex tone variants unless Discovery proves they are necessary.
- Publishing plugin changes to production without explicit operator approval.

## Detailed Spec

Use `docs/documentation/public-site/glitch-drop-gutenberg-block.md` as the source contract.

### Brand assets disponibles

Los logos de `Glitch` ya están guardados en el repo y quedan disponibles para el bloque (label/branding del `aside`):

| Archivo | Variante | Uso |
|---|---|---|
| `public/branding/glitch/glitch-dark.svg` | wordmark blanco + isotipo verde | fondos oscuros |
| `public/branding/glitch/glitch-light.svg` | wordmark navy + isotipo verde | fondos claros |

Notas para Discovery/implementación:

- Son SVG vectoriales (sin cambios en paths ni colores respecto al original entregado por el operador).
- Los dos son la misma marca en dos variantes por contraste de fondo; el bloque debe elegir la variante según el tema del contexto donde se renderice (Ohio/blog light vs. eventual dark).
- El runtime consumidor es WordPress, no el portal Greenhouse: si el bloque necesita el asset servido desde el runtime público, copiar/publicar el SVG dentro del plugin (`efeonce-editorial-blocks/**`) durante la implementación en vez de referenciar `public/` de greenhouse-eo, y dejar documentado de dónde salió (esta task).

Target content model:

- `content`: editable HTML content, sourced from `.gh-glitch-drop__content`.
- `label`: string, default `Glitch`.
- `tone`: optional enum `insight|risk|opportunity|operator`; defer if it adds scope without editorial value in V1.

Target output:

```html
<aside class="wp-block-efeoncepro-glitch-drop gh-glitch-drop gh-glitch-drop--insight" aria-label="Glitch">
  <p class="gh-glitch-drop__label">Glitch</p>
  <div class="gh-glitch-drop__content">...</div>
</aside>
```

Implementation guardrails:

- Use the official Gutenberg block scaffold where practical.
- Prefer server-side block registration from metadata.
- Do not target global `blockquote` styles.
- Do not add arbitrary color controls in V1.
- Do not rely on editor-only CSS for front-end output.
- Do not change existing published posts during V1 verification.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (discovery/scaffold) -> Slice 2 (block implementation) -> Slice 3 (draft/private verification) -> Slice 4 (docs/rollout readiness).
- No production activation before Slice 3 evidence exists and the operator approves rollout.
- Historical migration is a separate future task after V1 is stable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Block invalid after save/reload | WordPress/Gutenberg | medium | Keep attributes/save/render stable; test editor reload before rollout | Editor invalid block warning |
| Editor styles missing in iframe | WordPress/Gutenberg | medium | Use `apiVersion: 3`; declare editor/front-end assets in `block.json` | Editor visual mismatch |
| Front-end styling conflicts with Ohio/theme CSS | public-site UI | medium | Scope under `.gh-glitch-drop`; verify in real blog context | Visual capture regression |
| Accidentally replacing real quotes | content/editorial | low in V1 | No historical migration in scope | Manual review finds real quote altered |
| New plugin deploy path unclear | public-site ops | medium | Discovery must confirm plugin/build/deploy/rollback before activation | Plugin cannot activate/build locally |

### Feature flags / cutover

Sin feature flag Greenhouse. Cutover is WordPress plugin activation/deploy only:

- Local/staging activation first.
- Production activation only after operator approval.
- Rollback: deactivate plugin or revert runtime plugin deployment. Existing posts are unaffected until they contain the new block.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Remove scaffold or keep unactivated plugin branch | <10 min | si |
| Slice 2 | Revert plugin/block code before activation | <10 min | si |
| Slice 3 | Trash/delete draft/private test post; deactivate plugin | <10 min | si |
| Slice 4 | Revert docs or update contract with corrected rollout status | <10 min | si |

### Production verification sequence

1. Build plugin assets locally.
2. Activate in local/staging WordPress.
3. Insert block into draft/private post.
4. Save and reload editor; verify no invalid block.
5. Preview front-end desktop/mobile; verify `aside`, label `Glitch`, no overflow.
6. If approved, deploy/activate via public-site runtime rail.
7. Purge Kinsta cache if production front-end assets change.
8. Re-run smoke on a production private/draft post before using in the next live Glitch edition.

### Out-of-band coordination required

- Operator/editorial approval before using the block in a live Glitch edition.
- Public-site runtime deploy/activation approval before production.
- Kinsta cache purge after production asset/plugin changes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: primitive`.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log suficientes; si pasa a `yes`, `pnpm task:lint --task TASK-1337` no reporta findings.
- [ ] Se declaro `Wireframe: docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md` y el archivo existe.
- [ ] La task declara que `Flow: none` y un contrato `Motion` explícito de no authored effects porque V1 no coordina rutas/modales/drawers ni necesita motion.
- [ ] El bloque se registra como `efeoncepro/glitch-drop` y se muestra como `Glitch` en el editor.
- [ ] El front-end renderiza un `aside` con accessible name `Glitch`, no un `blockquote`.
- [ ] Insertar -> guardar -> recargar editor no genera "Invalid block".
- [ ] El bloque funciona en draft/private post antes de cualquier uso live.
- [ ] Desktop y mobile 390px no tienen scroll horizontal de pagina causado por el bloque.
- [ ] No se migran posts históricos ni se alteran `core/quote` reales.
- [ ] La documentación de contrato/registry se actualiza si cambia path, nombre, plugin host o rollout.

## Verification

- `pnpm task:lint --task TASK-1337`
- `pnpm ui:wireframe-check --task TASK-1337`
- `pnpm ui:motion-check --task TASK-1337`
- `npm run build` or equivalent inside the WordPress block plugin package
- WordPress editor manual/Playwright check: insert, save, reload, no invalid block warning
- Front-end preview desktop/mobile capture with `scrollWidth === clientWidth`
- `git diff --check`

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done.
Si la implementacion termino pero estos items no se ejecutaron, la task
sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/public-site/glitch-drop-gutenberg-block.md` refleja el contrato final implementado
- [ ] `docs/architecture/public-site/PRIMITIVES.md` refleja el estado real (`planned/block` -> runtime status si aplica)
- [ ] rollback/activation path del plugin quedo documentado

## Follow-ups

- Task futura para migrar Glitch POV históricos desde `core/quote` solo si hay criterio editorial verificable.
- Task futura para enseñar al Content Factory (`TASK-1123`) a emitir el bloque `efeoncepro/glitch-drop` cuando genere drafts de Glitch.

## Open Questions

- Confirmar en Discovery si `efeonce-editorial-blocks` debe ser plugin nuevo o si conviene alojar el bloque en un plugin público existente.
- Confirmar si `tone` aporta valor en V1 o se difiere para mantener el bloque editorialmente simple.
