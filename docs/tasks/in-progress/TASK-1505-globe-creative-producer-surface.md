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
- Status real: `Desplegada internal-only y smoke humano verde; generación positiva bloqueada por readiness/tenancy`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `none`
- Branch: `task/TASK-1505-globe-creative-producer-surface`
- Legacy ID: `none`
- GitHub Issue: `none`

## Checkpoint 2026-07-22 — cierre del ownership UI local

- El composer exige un estimate server-side vigente antes de habilitar `Generate`; cualquier cambio de prompt,
  shape, seed o negative constraint invalida la cotización.
- Seed lock/input/reroll y negative prompt serializan `recipe` y `StructuredBriefV1.notes` por los contratos
  existentes. No se agregó schema, endpoint ni campo vendor.
- Los seis modos dependientes de assets consultan `globe.asset.provenance.list` por workspace y fallan cerrados
  ante policy, acceso o dependencia no disponible.
- La suite rica GVC `.captures/2026-07-22T23-03-58_globe-creative-producer/` cubre 1440 y 390 px, presupuesto,
  feed, viewer con medio real, foco, teclado y reduced motion: 38 frames, 0 errores, rubric enterprise PASS.
- Scorecard: 4.72/5, mínimo 4.6, cero blockers visuales. Globe pasa `pnpm check && pnpm build`; Studio Web
  185/185 tests.
- Estado honesto: `code complete, rollout pendiente`. No hubo deploy, migrations, IAM, grants, flags, workers,
  provider canary ni gasto; esos gates permanecen en sus tasks dueñas.

## Checkpoint 2026-07-23 — superficie desplegada y dry-run vivo sin gasto

- API y Studio se desplegaron por los workflows keyless canónicos; el front door conserva HTTP `301`, HTTPS
  `200` y la API anónima `403`. Migraciones `0001…0023` quedaron limpias.
- El SSO humano y el BFF ejecutaron capabilities reales con actor/workspace server-derived; los negativos de
  workspace ajeno, actor spoofed y CSRF fallaron cerrado.
- El canary autenticado confirmó catálogo, rutas, circuitos, rights y estimates para Image/Video/Audio. El costo
  total estimado fue 32 créditos, pero `execute` no corrió: tenancy efectiva devolvió `access_denied` y las tres
  readiness attestations `not_found`.
- La UI sigue mostrando esos modos como gated, que es el comportamiento aceptado. `TASK-1505` permanece
  `in-progress` porque aún no existe evidencia operacional positiva para todas las capacidades aprobadas.

## Checkpoint 2026-07-22 — integración avanzada, deuda source-led y rollout pendientes

- El renderer/controller/client de `efeonce-globe/apps/studio-web` materializa el baseline completo: composer
  Image/Video/Audio, referencias privadas, rutas/shapes/estimate/hard cap, Style DNA/presets, biblioteca editorial,
  hero/masonry, viewer, compare, recreate, inpaint, bulk, créditos, review/comments/share, estados honestos,
  command palette, coach y footer operativo.
- Se preservaron estética y craft del HTML aprobado: paleta exacta, jerarquía, superficies, iconografía Tabler
  self-hosted, wordmark/isotype Globe y logo Efeonce oficiales, motion/microinteracciones y recomposición 390 px.
- Referencias dejaron de ser affordance decorativo: rutas separadas `ref/still/reference-v1` y
  `ref/motion/reference-v1`, policy de cantidad/media pre-spend, bytes resueltos server-side y lineage por hashes
  autorizados; la API recibe handles, nunca base64/bytes.
- La auditoría source-led completa de `docs/ui/reviews/TASK-1505/approved-source-parity-audit-2026-07-22.md`
  reemplaza el PASS anterior: score 4.19/5 y `BLOCK` por deuda material en viewer, inpaint, presupuesto,
  command palette, cuenta y evidencia de estados. No existe baseline durable promovible todavía.
- Verificación local Globe: `pnpm check` y `pnpm build` verdes. Studio: 173/173; Domain: 278/278;
  Creative Runner: 206/206; Contracts: 32/32. OpenTofu valida y sus 28 contratos de
  infraestructura pasan.
- Video y Audio avanzados ya serializan rutas/shapes reales para Crear, Elementos, Cuadros, Movimiento, Editar,
  Locución, Cambiar voz y Traducir; el registro de voces quedó visible sólo bajo su entitlement y sin IDs vendor.
- El runtime local incluye workers one-shot separados para ejecución Producer y asset governance, callback
  Fal público estrecho hacia la API IAM-private, leases renovables/fenced, rutas/circuitos operator-only y
  autoridad versionada de derechos para outputs generados/derivados hasta la migración `0022`.
- Estado honesto: no hay claim de ambiente vivo. El dry-run del arnés canario contra
  `globe-api-internal` devuelve `authentication_required` y no publica las nuevas capabilities porque el SHA
  desplegado sigue siendo `b12451db2d6e`. Migrations `0004…0022`, buckets/IAM, secretos, grants, flags,
  workers y los canarios billables reales siguen siendo gates de rollout antes de cerrar la task.

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
- `TASK-1504` — expansión Image/Video/Audio y outputs por descriptor; code complete local, rollout pendiente.
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

- Scenario file: `scripts/frontend/scenarios/globe-creative-producer.scenario.ts`.
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

- [x] The complete approved feature inventory is implemented or visibly gated with an owning backend task; no approved capability is silently removed.
- [x] `Execution profile: ui-ux`, `UI impact: flow`, wireframe, flow and motion paths are valid.
- [x] `UI ready` flipped to `yes` only after source, mapping, scenario and first-fold contracts became real; `pnpm task:lint --task TASK-1505` and `pnpm ui:readiness-check --task TASK-1505` pass.
- [x] Source-led baseline matches SHA-256 and the direction contract is referenced by runtime evidence.
- [x] Primitive lookup records `reuse|extend|new`; no parallel component/pattern is introduced without registry contract.
- [x] Full API parity holds for every business action; no provider/DB/storage/budget/review/share logic exists in browser components.
- [x] Copy is centralized in Globe and covers every required state/action/error/aria label.
- [x] Loading, empty, estimating, generating, ready, failed, degraded, policy/budget blocked, permission, long-content, mobile and reduced-motion states are covered.
- [x] The composer shows the estimated cost before generating (route × output-shape), from a current server estimate, and the primary `Generate` action is gated on that estimate.
- [x] Seed control (lock / numeric input / reroll) and negative-prompt field are wired, not permanently disabled stubs; their GVC markers (`producer-seed`, `producer-shape`, `producer-asset-actions`) exist.
- [x] Every mode button reflects its real authority: a mode whose enabling capability is off (asset provenance / references) renders as gated, never enabled.
- [x] Progress is attempt/state honest and C2PA/provenance is evidence-backed.
- [x] Tabs, dialogs, viewer, selection, bulk actions, delete confirmation, live regions and focus restore pass keyboard/accessibility review.
- [x] Desktop and every 390 px overlay satisfy `scrollWidth <= clientWidth`.
- [x] GVC premium desktop/mobile/reduced-motion captures and review dossier exist; scorecard average is `>=4.5`, every dimension `>=4`, critical/source fidelity dimensions `>=4.5`.
- [x] `greenhouse-ui-review` and `greenhouse-ui-enterprise-review` return no `BLOCK` before closure.

## Verification

- `pnpm task:lint --task TASK-1505`
- `pnpm ui:wireframe-check --task TASK-1505`
- `pnpm ui:flow-check --task TASK-1505`
- `pnpm ui:motion-check --task TASK-1505`
- `pnpm ui:readiness-check --task TASK-1505`
- Globe runtime: `pnpm check && pnpm build` — PASS, Studio Web 185/185.
- GVC local contract-backed: `pnpm fe:capture globe-creative-producer --env=local --task=TASK-1505` — PASS;
  `.captures/2026-07-22T23-03-58_globe-creative-producer/`.
- Review: `pnpm fe:capture:review .captures/2026-07-22T23-03-58_globe-creative-producer --env=local` — PASS.
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

## Delta 2026-07-22 — Approved-surface parity gaps (live-verified against the deployed runtime)

The Producer was driven end to end through the federated SSO against the live services
(`globe-studio-internal` / `globe-api-internal`, revision `978b202`→`9ef2d21`) with an authenticated
agent session. The surface loads, authenticates, mounts, resolves the 10-route catalog and **creates
real runs** (`state: prepared`). That closed the transport: three bugs were fixed and deployed this
session — the browser client now sends `x-idempotency-key` (every write used to die 400 at the BFF),
`isBrokerIdentity` derives the internal workspace from `tenantId` (the `clientId` guard 502'd every
internal login), and the credit ledger replay receipt is keyed by command (migration `0023`). The
internal workspace was funded (500k credits) through the governed `globe.credits.allocate` spine.

What Codex scaffolded but did **not** cable — the honest gap list, each mapped to its owner. This task
owns the surface-wiring items; the backend-enablement items are owned elsewhere and are declared as
dependencies, not duplicated here.

1. **Estimate before generate is dead code (this task).** `requestEstimate()` (`producer-controller.ts:1377`)
   and `estimateIsCurrent()` (`:2933`) have zero callers; the composer never shows cost before spending,
   which violates the approved invariant "Costo estimado antes de gastar · ruta × formato". Worse,
   `producer-controller.test.ts:69-70` pins the absence (forbids the estimate button) and `:42` asserts
   `client.estimate(payload)` by reading text **inside the dead function** — a test certifying a call
   nobody makes. Fix: wire the estimate control + gate `Generate` on a current server estimate, and
   retire the blocking assertions. The reader itself exists (TASK-1502); only the wiring is missing.
2. **Seed control and negative prompt are permanently-disabled stubs (this task).** Seed renders only a
   title + "Podrás fijarlo cuando la ruta publique este control" (`producer-ui.ts:126-128`); the negative
   field is `<input disabled data-producer-advanced="negative">` with no reader in the controller.
   Missing GVC markers: `producer-seed`, `producer-shape`, `producer-asset-actions` (`grep` → 0).
3. **No 390 px breakpoint (this task).** Declared breakpoints stop at 430 px; AC-11 cannot be met and its
   `[x]` was reverted above. `producer-ui.test.ts` only asserts a `max-width` media query exists, not the
   value.
4. **Gated modes render as enabled buttons (this task — honesty bug).** Modes whose real enabler is off
   (references / asset provenance) gate on `globe.lab.experiment.prepare` (`coverage.ui='available'`)
   instead of the ingest capability, so 6 of the 9 composer modes present enabled affordances that fail
   on use. The surface must reflect the mode's actual authority.

**Dependencies (not owned here) that also gate the approved surface:**

- **Style DNA → TASK-1494.** `analyze` requires two ports (`ReferenceAssetIdentityPort`,
  `ReferenceAnalysisExecutorPort`) that have no implementation in the repo and are not injected in
  `app.ts:815-821`. The button renders enabled and opens an empty picker; `producer_styles` /
  `reference_profiles` are empty in the live DB. Delta recorded on TASK-1494.
- **References / 6 of 9 modes → TASK-1467.** `GLOBE_ASSET_PROVENANCE_ENABLED=false` in both live services;
  the binary-ingest handler returns `policy_blocked` before it authenticates (`app.ts:1143`). Delta
  recorded on TASK-1467.
- **Governed generation (why the button still 409s) → TASK-1463.** With the ledger funded, `execute`
  still fails `conflict` because the model-readiness registry is empty (0 promoted routes); the compiler
  rejects `route_not_promoted` before any provider call. Promotion is a two-step human gate by design
  (`requireHuman`, distinct maker/promoter, non-fake evidence) — the commercial control, not a bug. The
  policy-per-workspace decision (single-authority internal workspace) is pending an ADR.

This Delta corrects the record: nine acceptance criteria were flipped to `[x]` in an uncommitted change
that also carried the `BLOCK` verdict (scorecard fidelity 3.8, avg 4.39). The surface is not closed;
its honest state is the list above.
