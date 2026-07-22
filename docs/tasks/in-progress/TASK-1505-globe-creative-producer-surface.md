# TASK-1505 — Globe Creative Producer Surface (UI)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1505-globe-creative-producer-surface.md`
- Flow: `docs/ui/flows/TASK-1505-globe-creative-producer-surface-flow.md`
- Motion: `docs/ui/motion/TASK-1505-globe-creative-producer-surface-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Dirección aprobada; implementación first fold en ejecución sobre bridge code-complete`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `none`
- Branch: `task/TASK-1505-globe-creative-producer-surface`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar en Globe el **Creative Producer aprobado**: una superficie prompt-first y cross-modal para componer, estimar, generar, explorar, refinar, organizar, revisar y compartir activos de imagen, video y audio. El HTML aprobado es el target completo, no una intención ni una lista recortable. La UI se entrega por slices sobre contracts gobernados y mantiene las capacidades aún no operativas visibles con estado honesto cuando corresponda.

## Why This Task Exists

Los backends Producer ya avanzaron más que la shell humana, mientras que el diseño aprobado evolucionó más que el scope histórico de esta task. El gap real no es “hacer un formulario de prompt”: es convertir una referencia interactiva hoy 100% in-memory en un cliente humano accesible, tenant-safe, con API parity y estados runtime honestos. La task debe preservar la experiencia aprobada sin convertir atajos del prototipo—timers, C2PA constante o estado local de negocio—en comportamiento productivo.

## Goal

- Materializar la jerarquía aprobada `composer → unified library → candidate viewer/refinement → organization/review/share` en `efeonce-globe`.
- Exponer Image, Video y Audio como modos de una sola consola con prompt, referencias, modelos/rutas, shapes, estimate, budgets y prioridad gobernados.
- Entregar el feed/librería cross-modal, acciones individuales y batch, provenance/lineage/audit, refinamientos, colaboración, sharing y aceleradores del operador presentes en la fuente aprobada.
- Cumplir desktop y mobile 390 px, teclado/foco, reduced motion, scroll-width, source fidelity y score premium sin inventar estado backend.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`

Reglas obligatorias:

- El runtime vive en `efeonce-globe`; Greenhouse gobierna task, arquitectura, QA y evidencia.
- La fuente aprobada se preserva por capacidad, jerarquía y flujo. Un slice puede quedar gated; no se elimina silenciosamente.
- Browser → same-origin human execution bridge/BFF → API privada. El browser no llama directo a una API IAM-private ni interpreta metadata `ui` como enforcement.
- Toda acción de negocio consume reader/command server-side compartido con SDK/MCP/CLI. No hay provider, DB, storage, budgets, reviews ni asset mutations en estado local de componentes.
- Rutas/shapes son fail-closed; el modelo público es visible, el slug/provider cost/margin no entra al DOM.
- Progress, settlement, rights, provenance y C2PA se muestran solo desde evidencia real.
- Cross-workspace responde `not_found`; cambiar tenant/proyecto invalida selección, caches y estimaciones scoped.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
- `.codex/skills/greenhouse-globe/SKILL.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`

## Dependencies & Impact

### Depends on

Hard start dependency satisfecha en código:

- `TASK-1519` — Human Execution Bridge and Surface Enforcement; code-complete local en `efeonce-globe@9bb54f1`
  y broker `greenhouse-eo@3e7b1c0c0`. Su rollout/flag sigue siendo gate de promoción, no de implementación UI.

Capability gates por slice (no bloquean construir la composición con fixtures tipados, pero sí declarar la capacidad operativa):

- `TASK-1500`, `TASK-1501`, `TASK-1502`, `TASK-1503` — catálogo, shape discriminado, estimate y output retrieval/basic actions; complete en código según runtime audit.
- `TASK-1504` — expansión Image/Video/Audio y outputs por descriptor; in-progress local, rollout pendiente.
- `TASK-1467` — private ingest, rights y provenance/C2PA.
- `TASK-1468`, `TASK-1482` — ledger/reservations/budgets; el spend fence no reemplaza wallet/budget.
- `TASK-1469` — run durable, idempotency, cancel/retry/progress/priority/reconciliation.
- `TASK-1493`, `TASK-1494` — recipes/prompt history/styles y reference intelligence.
- `TASK-1496`, `TASK-1497`, `TASK-1498` — recreate/variation, inpaint y unified feed/lineage.
- `TASK-1472` — approval, comments, share/release boundary.
- `TASK-1511` — tenancy/projects durables.
- `TASK-1520` — collections and bulk asset operations.

### Blocks / Impacts

- Prima primitives/patterns compartidos por `TASK-1474` Workbench, sin compartir su layout brief-first.
- Hace visible deuda backend que debe permanecer en su task dueña; no autoriza endpoints ad hoc para “hacer funcionar el botón”.
- La promoción cliente/comercial y su host/runtime quedan fuera de esta task interna hasta el gate dueño.

### Files owned

- `../efeonce-globe/apps/studio-web/` — route, UI, BFF client integration, states and Globe Producer patterns.
- Producer copy module dentro de `../efeonce-globe/apps/studio-web/` o package canónico de copy que confirme Discovery.
- `docs/ui/wireframes/TASK-1505-globe-creative-producer-surface.md`
- `docs/ui/flows/TASK-1505-globe-creative-producer-surface-flow.md`
- `docs/ui/motion/TASK-1505-globe-creative-producer-surface-motion.md`
- `docs/ui/reviews/TASK-1505-globe-creative-producer-surface.scorecard.json`
- GVC scenario/dossier de `TASK-1505` bajo los paths canónicos de captura.

Los contracts, migrations, workers, ledgers, asset commands y access bridge pertenecen a sus tasks backend dueñas.

## Current Repo State

### Already exists

- La fuente aprobada completa vive originalmente en `/Users/jreye/Documents/Globe/Producer/Suite de IA Generativa Creativa/Globe Creative Producer.dc.html`; la copia versionada se registra en `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html` con SHA-256 `7d0d689b7daeb6e409ae01c1bf478d700ea09059e0f20f7da3c85a53bb10e93f`.
- El prototipo ejecuta todos los flujos aprobados mediante estado local, handlers y timers. Sirve como contrato visual/interactivo, no como runtime.
- `TASK-1500…1503` materializaron catálogo, contrato/estimate y retrieval/actions base. `TASK-1504` tiene slices locales de modalidades aún no promovidos completamente.
- Globe tiene shell interna y front door en `https://globe.efeoncepro.com`; la UI actual en `apps/studio-web` sigue siendo foundation y no existe una `/producer` productiva.

### Gap

- No existe el Producer runtime fiel a la fuente aprobada ni un GVC baseline/dossier/scorecard.
- El human execution bridge, grants focales y coverage UI existen en código; faltan apply de IaC/secrets, smoke live y flag.
- Falta cablear o terminar foundations de upload/rights, durable execution, feed, lineage, recipes/styles, refinements, budgets, collections/batch, review/comments/share y tenancy.
- La fuente inspeccionada desborda mobile (`scrollWidth 630` frente a `clientWidth 390`) y necesita correcciones de tabs/dialogs/foco/selección/delete confirmation, progress honesto, C2PA evidence-backed y token/primitives mapping.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web; greenhouse-eo owns governance and evidence`
- Future candidate home: `remain-shared`
- Boundary: `Globe Producer UI as browser client of the governed human bridge and Producer readers/commands`
- Server/browser split: `auth forwarding, private API, providers, storage, rights, budgets and mutations are server-only; browser receives redacted DTOs and keeps presentation state only`
- Build impact: `Globe studio-web build plus source-led GVC scenario; no new Greenhouse runtime bundle`
- Extraction blocker: `human auth/grants, workspace scoping and private API routing must remain coherent with the Globe API spine`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: operador interno Efeonce habilitado por grants Producer; tenant/project explícitos.
- Momento del flujo: producción creativa atómica y su continuidad inmediata—generar, refinar, organizar, revisar y compartir.
- Resultado perceptible esperado: una sola consola rápida y confiable para Image/Video/Audio, con costo/estado/evidencia honestos.
- Fricción que debe reducir: saltos a herramientas externas, incertidumbre pre-spend, activos dispersos y pérdida de contexto entre generación, feedback y derivados.
- No-goals UX: convertir Producer en un DAG técnico, replicar el layout brief-first del Workbench, exponer secretos/slugs/costos vendor o fingir capacidades no respaldadas.

### Surface & system decision

- Surface: internal Globe Producer route, candidata `/producer`, dentro de `apps/studio-web`.
- Composition Shell: `aplica como contrato de composición`, materializado por el pattern propio `Producer Console`
  de Globe (composer, budget/context, unified library y viewer); no importa `CompositionShell` de Greenhouse.
- Primitive decision: `extend` — reusar shell/control/media/dialog foundations de Globe y registrar patterns Producer ausentes; no copiar inline styles del HTML.
- Adaptive density / The Seam: `aplica como principio responsive` mediante patterns/tokens de Globe; no hereda
  primitives de Greenhouse. Composer recompone modalidad y feed/viewer adaptan densidad.
- Floating/Sidecar/Dialog decision: viewer, inpaint, share, onboarding y confirmation son surfaces focus-managed; mobile usa full-height sheet/surface.
- Copy source: módulo centralizado Globe Producer; no strings reusable hardcodeadas.
- Access impact: `routeGroups|entitlements|startup policy` en Globe, resuelto por `TASK-1519`; UI no deriva autorización.

### State inventory

- Default: proyecto/tenant, presupuesto, composer y librería resueltos.
- Loading: shell estable y readers independientes con skeleton localizado.
- Empty: composer accionable + onboarding opcional + biblioteca vacía útil.
- Error: mensajes tipados y sanitizados con recovery por estimate/run/upload/retrieval/review/share.
- Degraded / partial: cada plano—bytes, provenance, review, budget—declara degradación independiente.
- Permission denied: safe state sin filtrar recursos/capabilities.
- Long content: prompts, archivos, colecciones, comentarios y labels conservan acceso al valor completo.
- Mobile / compact: composición 390 px sin ancho mínimo desktop ni scroll horizontal.
- Keyboard / focus: tabs roving, selección semántica, dialogs trap/inert/restore, shortcuts sin conflicto.
- Reduced motion: mismos estados/significado sin morph/scale/stagger/loops.

### Interaction contract

- Primary interaction: componer referencias/ruta/shape y ejecutar `Generate · ✨N`; el candidato durable entra al feed.
- Hover / focus / active: toda acción hover tiene equivalente focus/touch; selección no depende solo de color.
- Pending / disabled: reason visible; estimate stale y policy/budget block no parecen disponibles.
- Escape / click-away: overlays siguen una pila explícita; no descartan prompt/mask/comment dirty sin confirmación.
- Focus restore: al trigger; fallback al heading de región si el trigger ya no existe.
- Latency feedback: estado/attempt real, nunca porcentaje basado en tiempo.
- Toast / alert behavior: feedback efímero complementa, no reemplaza, estado persistente de run/review/share.

### Motion & microinteractions

- Motion primitive: tokens/wrappers canónicos de Globe; contract detallado en Motion.
- Enter / exit: candidatos y surfaces contenidos, causales y breves.
- Layout morph: solo composer/density cuando preserva contexto y foco.
- Stagger: feed inicial corto; off en reduced motion.
- Timing / easing token: tokens Globe, sin literales locales.
- Reduced-motion fallback: direct state/opacity; no spatial motion ni looping.
- Non-goal motion: confetti, parallax, hero decorativo, progress ficticio o transiciones que retrasen control.

### Implementation mapping

- Route / surface: Globe internal Producer route in `apps/studio-web`.
- Primitive / variant / kind: extended Producer Console plus registered composer/feed/viewer/reference/budget/collection/bulk/review patterns.
- Component candidates: resolver contra registry real en Discovery; no asumir nombres del prototipo como componentes existentes.
- Copy source: Globe Producer namespace centralizado.
- Data reader / command: dependency matrix de wireframe/flow; cada capacidad gateada por su task backend.
- API parity: same governed command/readers for UI/SDK/MCP/CLI through human bridge.
- Access / capability: shell + granular catalog/run/assets/budget/review/share grants; workspace/project scope.
- States to implement: inventory completa anterior y estados por modality/capability.

### GVC scenario plan

- Scenario file: `docs/ui/captures/scenarios/TASK-1505-globe-creative-producer-surface.json` (crear en Slice 1).
- Route: `/producer` candidata; confirmar con information architecture antes de código.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required steps: todos los journeys de composer, feed, bulk, viewer/refine, inpaint, review/share, accelerators y tenant switch.
- Required captures: first fold, each modality, key states and every focus-managed surface desktop/mobile.
- Required `data-capture` markers: los definidos en el wireframe.
- Assertions: source feature fidelity, real state honesty, no sensitive routing/cost data, keyboard/focus semantics.
- Scroll-width checks: document and open overlays satisfy `scrollWidth <= clientWidth`.
- Reduced-motion / focus evidence: modality, run, viewer, inpaint, share, onboarding and tenant switch.
- Review dossier: `docs/ui/captures/TASK-1505-globe-creative-producer-surface/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-producer-surface`, promote after accepted first fold.

### Design decision log

- Decision: complete approved HTML is the target; implementation phase gates capabilities rather than removing them.
- Alternatives considered: old narrow composer/feed scope; separate modality apps; Workbench-only collaboration. Rejected in the visual-direction contract.
- Why this pattern: one prompt-first operating loop preserves creative context from generation through review/share.
- Reuse / extend / new primitive: extend Globe registry; new specialized pattern only after registry lookup and anatomy/state/a11y/responsive contract.
- Open risks: backend gates, source mobile overflow, accessibility debt, durable state truth, commercial runtime decision outside this task.

### Visual verification

- GVC scenario: TASK-1505 premium source-led scenario.
- Viewports: desktop 1440×1000 and mobile 390×844.
- Required captures: wireframe journeys/states plus reduced-motion and focus evidence.
- Required `data-capture` markers: wireframe registry.
- Scroll-width check: required for page and each overlay.
- Accessibility/focus checks: tabs, dialogs, selection, destructive confirmation, live regions and restore.
- Before/after evidence: approved source baseline vs runtime captures by hierarchy/capability, not literal CSS.
- Known visual debt: source `630 > 390` overflow and inline token/a11y shortcuts.
- Visual scorecard: `docs/ui/reviews/TASK-1505-globe-creative-producer-surface.scorecard.json`
- Quality threshold: `average >= 4.5; every dimension >= 4; critical/source fidelity >= 4.5`

<!-- ZONE 2 — PLAN MODE: lo completa el agente ejecutor después de Discovery. -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Source-led first fold and shell

- Version/verify source, lock visual direction, implement route/shell/header/context/composer first fold with typed fixtures.
- Create premium GVC scenario and capture desktop/mobile; require explicit `ACCEPT FIRST FOLD` before exhaustive wiring.

### Slice 2 — Composer and reference system

- Implement Image/Video/Audio recomposition, prompt enhancement/history/negative prompt, references/rights/weights/anchors, route/model/constraints, style/seed/auto-route and output shape.
- Wire estimate, budgets/reservations/priority and honest disabled/recovery states through owned contracts.

### Slice 3 — Durable runs and unified library

- Wire generate/cancel/retry/priority and durable attempt states.
- Implement hero/feed, search/filter/sort/density/series/collections and individual/bulk selection/actions.

### Slice 4 — Candidate viewer and refinements

- Implement media viewer, recipe/model/shape/seed/cost, provenance/C2PA/lineage/audit.
- Wire recreate, variation, upscale and regional inpaint with parent rights/lineage.

### Slice 5 — Review, sharing and accelerators

- Implement approval/request changes/comments and read-only share board.
- Implement command palette, onboarding, shortcuts and safe tenant/project switch.

### Slice 6 — Accessibility, source fidelity and premium closure

- Resolve 390 px overflow and tabs/dialog/focus/selection/delete/progress/C2PA defects across all states.
- Complete GVC dossier, scorecard, code/visual/quality/enterprise reviews and runtime evidence.

## Out of Scope

- Implementar dentro de esta UI los schemas, migrations, workers, ledgers, private-ingest, backend commands/readers o grants de sus tasks foundation.
- Exponer el Producer a clientes/GA o decidir aquí el host comercial, pricing/package o rollout externo.
- Convertir Producer en el Workbench brief-first o duplicar su orchestration/delivery layout.
- Copiar literalmente el HTML, sus inline styles, timers o estado de negocio local.

Approval, comments, sharing, budgets, collections, batch actions, provenance, lineage, refinements, onboarding, shortcuts and tenant switch are explicitly **in scope** for the approved target.

## Detailed Spec

The visual direction, wireframe, flow and motion contracts are the detailed UI spec. Backend capability ownership remains in the dependency tasks. During Plan Mode, Discovery must verify the Globe pattern registry, route information architecture, BFF contract and exact file ownership before JSX.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`TASK-1519 → Slice 1 first-fold acceptance → Slice 2 composer contracts → Slice 3 durable runs/library → Slice 4 viewer/refinement → Slice 5 collaboration/accelerators → Slice 6 premium closure`.

Backend capability tasks may advance in parallel, but a UI control is promoted from fixture/policy-blocked only after its server contract and runtime evidence pass. No external rollout is implied.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| source scope silently reduced | UI/product | high | approved inventory + source-fidelity GVC | missing journey/marker or fidelity score <4.5 |
| browser bypasses private API/access | auth/API | high | TASK-1519 BFF + server enforcement | direct private API call or UI-only coverage check |
| fictitious run/budget/provenance state | UI/data | high | evidence-backed DTOs and degraded states | timer percentage, fence-as-wallet or unconditional C2PA |
| mobile compressed desktop | UI | high | 390 recomposition + scroll assertions per overlay | `scrollWidth > clientWidth` |
| local business logic diverges from parity | API/UI | medium | command/reader matrix and contract tests | browser-only mutation or ad hoc endpoint |
| focus/a11y regression across many overlays | UI/a11y | high | canonical dialogs/tabs/selection + keyboard GVC | lost focus, background operable, unlabeled control |

### Feature flags / cutover

- Producer route remains internal and behind the existing Globe surface/coverage controls until TASK-1519 and runtime gates pass.
- Each modality/refinement/collaboration capability follows its backend coverage/flag; the approved surface uses honest `policy-blocked` presentation when not promoted.
- Rollback by slice: disable the affected surface capability/route without deleting durable outputs or contracts; retain the previously verified slice.

### Rollback plan per slice

- Slice 1: route flag off; keep source/GVC docs.
- Slice 2: revert specific composer capability coverage; preserve prompt and valid stable mode.
- Slice 3: disable mutations/library enhancements independently; durable runs/assets remain server-owned.
- Slice 4: hide refinement command entry points through coverage while retaining read-only viewer.
- Slice 5: revoke review/share capabilities; existing records follow backend retention/revoke policy.
- Slice 6: no runtime feature addition; visual regression rolls back focused UI commits/baseline promotion.

### Production verification sequence

1. Local Globe checks and contract tests.
2. First-fold GVC desktop/mobile with fixtures and human acceptance.
3. Staging smoke through human bridge with internal workspace and non-billable/safe providers where applicable.
4. Capability-by-capability real reader/command verification, including failures/degraded states.
5. Full premium GVC review, scorecard and enterprise verdict.
6. Internal route/coverage promotion; no commercial rollout.

### Out-of-band coordination required

- Human grants/IAM/secrets/coverage are owned by `TASK-1519` and must be verified before runtime promotion.
- Backend migrations/workers/provider secrets/flags are applied by their owning tasks, never as incidental UI work.
- Commercial host and external tenant rollout require their dedicated architecture/release decision.

## Acceptance Criteria

<!-- ZONE 4 — VERIFICATION & CLOSING -->

- [ ] The complete approved feature inventory is implemented or visibly gated with an owning backend task; no approved capability is silently removed.
- [ ] `Execution profile: ui-ux`, `UI impact: flow`, wireframe, flow and motion paths are valid.
- [x] `UI ready` flipped to `yes` only after source, mapping, scenario and first-fold contracts became real; `pnpm task:lint --task TASK-1505` and `pnpm ui:readiness-check --task TASK-1505` pass.
- [ ] Source-led baseline matches SHA-256 and the direction contract is referenced by runtime evidence.
- [ ] Primitive lookup records `reuse|extend|new`; no parallel component/pattern is introduced without registry contract.
- [ ] Full API parity holds for every business action; no provider/DB/storage/budget/review/share logic exists in browser components.
- [ ] Copy is centralized in Globe and covers every required state/action/error/aria label.
- [ ] Loading, empty, estimating, generating, ready, failed, degraded, policy/budget blocked, permission, long-content, mobile and reduced-motion states are covered.
- [ ] Progress is attempt/state honest and C2PA/provenance is evidence-backed.
- [ ] Tabs, dialogs, viewer, selection, bulk actions, delete confirmation, live regions and focus restore pass keyboard/accessibility review.
- [ ] Desktop and every 390 px overlay satisfy `scrollWidth <= clientWidth`.
- [ ] GVC premium desktop/mobile/reduced-motion captures and review dossier exist; scorecard average is `>=4.5`, every dimension `>=4`, critical/source fidelity dimensions `>=4.5`.
- [ ] `greenhouse-ui-review` and `greenhouse-ui-enterprise-review` return no `BLOCK` before closure.

## Verification

- `pnpm task:lint --task TASK-1505`
- `pnpm ui:wireframe-check --task TASK-1505`
- `pnpm ui:flow-check --task TASK-1505`
- `pnpm ui:motion-check --task TASK-1505`
- `pnpm ui:readiness-check --task TASK-1505`
- Globe runtime: repository lint/typecheck/test/build commands confirmed in Plan Mode.
- GVC: `pnpm fe:capture <TASK-1505-scenario> --env=staging` and `pnpm fe:capture:review <capture-dir>`.
- `pnpm ui:quality --task TASK-1505`
- `pnpm qa:gates --changed`

## Closing Protocol

- Keep lifecycle and task indexes synchronized with honest runtime status.
- Record exact backend capability gates and internal rollout evidence; code alone is not operational completion.
- Update architecture/manual/handoff/changelog only through their canonical owners and run documentation closure gates.
- Do not move to `complete` while any approved capability lacks either operational evidence or an explicit accepted product decision changing scope.

## Follow-ups

- Commercial client surface/host and external rollout remain owned by the dedicated runtime/release lane.
- Any newly discovered backend capability gap receives its own backend-data task; it is not patched inside `studio-web`.

## Open Questions

- Confirm final internal route name during Plan Mode; `/producer` is the current candidate.
- Confirm whether source visual assets beyond the HTML must also be versioned for reproducible source rendering; the HTML hash remains the minimum immutable baseline.
