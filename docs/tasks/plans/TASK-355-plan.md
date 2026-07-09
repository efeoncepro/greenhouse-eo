# Plan — TASK-355 Hiring Desk Internal Workspaces & Publication Governance

## Checkpoint

- Priority: `P1`
- Effort: `Alto`
- Required checkpoint: `human`
- Status: `code complete 2026-07-09; rollout/dependencies pending`
- Goal: implementar el HTML interactivo aprobado con fidelidad visual y conductual de alto detalle, conectado a contratos reales y sin copiar semántica demo al runtime.
- Branch strategy: permanecer en `develop` por confirmación del goal; excepción documentada, sin push remoto automático.

## Request normalization

- Source actor: `human`; referencia visual iterada y aprobada con Claude Design.
- Surface: módulo interno `/agency/hiring/**` bajo el portal autenticado existente.
- Page intent: control room operacional de contratación, con governance, list/detail, Kanban y decisiones de alto impacto.
- Data shape: KPIs + tabla paginada + lanes Kanban + Application 360 federado + diff de publicación.
- Data quality: fuerte para Hiring foundation/publication/assessment engine; parcial para documentos y review UI porque TASK-1362/TASK-1363 siguen `to-do`.
- Action density: alta.
- Repeatability: shell y drag-list compartidos; composición y adapters de dominio module-local.

## Discovery summary

### Artefacto aprobado

- Fuente completa revisada: `~/Documents/carreers/Hiring-Desk/Hiring-Desk/Hiring Desk.dc.html` (151 KB) + `support.js` + AXIS bundle local.
- Los uploads de task, wireframe, flow, motion y master flow son byte-identical a los archivos canónicos del repo.
- Se renderizó el HTML real con Playwright a 1440×900 y se inspeccionaron Demand Desk, Pipeline, Application 360, Assessment, Publication y el drawer de Nueva demanda.
- El contrato no es una captura: incluye locale es/en, dark mode, tabs por teclado, loading/empty/error, drawer con templates/dirty-state/discard/split action/atajo, Kanban drag + menú teclado + optimistic/rollback, dialogs con focus trap, assign/copy link, AI propose→confirm, PII reveal con reason, decisión/supersede/historial append-only, publication state-machine y reduced-motion.

### Dependencias y drift

- TASK-353 está `complete`; el `Blocked by: TASK-353` de TASK-355 era stale y fue retirado.
- TASK-354, TASK-1360 y TASK-1361 ya aportan careers, assessment engine y AI propose→confirm.
- TASK-1362 (candidate document resolver) y TASK-1363 (taking/review UI) siguen `to-do`. TASK-355 debe dejar adapters/slots reales y estados degradados explícitos; no inventar documentos ni scorecards autoritativos.
- `hiring.application.decided` todavía no existe en `EVENT_TYPES`; el publisher de TASK-355 necesita registrar el contrato mínimo para que TASK-356 lo consuma después.
- `hiring_application` ya posee snapshot de decisión/handoff. El reason estructurado se guardará en `explainability_json.decisionHistory[]` bajo row lock y transacción, preservando history append-only sin introducir un segundo aggregate prematuro; el snapshot current permanece en columnas canónicas.
- La spec ya fue corregida al namespace vigente: `gestion.hiring`, `gestion.hiring_demand`, `gestion.hiring_pipeline`, `gestion.hiring_publication` y `gestion.hiring_application_detail`, manteniendo rutas `/agency/hiring/**`.
- `GreenhouseDragList` hoy solo reordena una lista y no tiene contrato cross-lane/keyboard. Se extenderá de forma additive para agrupación/transfer; el menú “Mover a etapa” y la state machine optimistic quedan en el consumer Hiring.

## Solution quality assessment

- Causa raíz UI: no existe ningún consumer interno del dominio Hiring; el HTML aprobado define tanto la jerarquía como el comportamiento faltante.
- Causa raíz de interacción: el primitive drag actual no expresa transferencias entre lanes ni accesibilidad no-drag.
- Decisión: `reuse + extend`, no nueva primitive paralela.
  - Reusar `CompositionShell`, `GreenhouseBreadcrumbs`, `MetricSummaryCard`, `GreenhouseDragList`, `GreenhouseDatePicker`, `EmptyState`, `CustomTextField`, MUI Dialog/Drawer, chips y motion tokens.
  - Extender `GreenhouseDragList` con props backward-compatible para group/transfer y semántica list; mantener keyboard move en `HiringPipelineBoard` porque depende de stages y command de Hiring.
  - Usar composición `single` para Demand/Pipeline/Publication y `leadPlusContext` para Application 360.
  - Mantener el drawer de creación como MUI Drawer route-local: es una creación de entidad con dirty confirmation, no un inspector contextual reusable.
- El chrome global del HTML (sidebar/topbar/theme) se mapeará al layout Vuexy existente; no se duplicará dentro de la vista.

## Access model

- `routeGroups`: `internal`/`admin` como fallback defensivo actual del área Agency.
- `views`: cinco viewCodes `gestion.hiring*` en `VIEW_REGISTRY`, seed `view_registry` y grants explícitos solo a roles internos pertinentes.
- `entitlements`: capabilities existentes `hiring.{demand,opening,application}.*`; cada route/write conserva dual gate.
- `startup policy`: sin cambio.
- Navegación: agregar Hiring dentro de `GH_AGENCY_NAV.teamAndTalent` y filtrar por `gestion.hiring`; rutas hermanas se alcanzan por tabs y el detail dinámico por row/card.
- Reachability: main route por menú; pipeline/publication declaradas como child routes por `tab`; `[applicationId]` es detail dinámico.

## Architecture decision

- ADRs existentes: Hiring ATS architecture, Composition Shell, UI Primitive Variants/Kinds, 360 Object Model, Identity/Entitlements y route reachability.
- No se requiere ADR nuevo: no cambia el source of truth ni crea una plataforma UI paralela.
- Delta documental requerido: registrar el contrato as-built de `hiring.application.decided`, reason history en `explainability_json` y la extensión additive de `GreenhouseDragList`.

## Backend/data contract

- Source of truth: `greenhouse_hiring.{talent_demand,hiring_opening,hiring_application}` + identity profile/candidate facet por readers canónicos.
- Commands existentes: create/update demand/opening, publish/unpublish opening, update application stage, assessment assign/AI confirm.
- Command nuevo: `decideHiringApplication` + `POST /api/hiring/applications/[id]/decide`.
- Invariantes: humano decide; score advisory; reason obligatorio; supersede conserva history; row lock evita re-decisión concurrente perdida; audit/outbox en la misma transacción; canonical errors; capability gate.
- Migration: solo view registry/role grants. No DDL de negocio para decision reason.
- Rollback: revert rutas/registry TS + down migration del seed; commands son additive.

## Approved behavior inventory

1. Demand Desk: KPIs, filtros/search server-side, skeleton/loaded/empty/filtered/error, tabla/drilldown, responsive stacking.
2. Nueva demanda: drawer full-height, templates, identity/context/compensation sections, skills chips, public preview, 140-char counter, dirty/discard, validation/focus, sticky footer, create/create+publish/create+another, Cmd/Ctrl+Enter, toasts/live region.
3. Pipeline: opening selector, query, six canonical mapped lanes, internal horizontal scroll, adaptive cards, empty lanes, drag lift/drop target, keyboard move menu, optimistic saving, rollback, focus retention and aria-live.
4. Application 360: header/back/stage, Overview/Assessment/Documents/Decision/Activity, masked PII banner, advisory affinity, portfolio, per-facet loading/degraded states.
5. Assessment: assign dialog/link/copy, pending state, scorecard, AI suggestion collapsed until human action, edit/confirm and advisory copy. Render real data when adapters exist; otherwise explicit degraded slot.
6. Documents: masked/revealed states, capability-aware reveal, mandatory reason, audit feedback. Render real resolver when TASK-1362 exists; otherwise explicit degraded slot.
7. Decision: action cards, destination/date/entity/reason, inline validation, alertdialog, loading/success, supersede and append-only history.
8. Publication: allowlist diff, internal-only exclusions, draft/published/paused/closed actions, confirmation dialogs and careers revalidation.
9. Cross-cutting: es-CL/en-US dictionaries, dark theme inheritance, tokenized motion, reduced-motion parity, focus restoration, semantic data-capture markers, no page-level horizontal overflow.

## Skills

- Preflight/lifecycle: `greenhouse-task-execution-hook`, `greenhouse-task-planner`.
- UI architecture: `greenhouse-ui-orchestrator`, `greenhouse-product-ui-architect`.
- Implementation/Vuexy: `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert`.
- UX/a11y/copy: `greenhouse-ux-content-accessibility`.
- Hiring/fairness/PII: `greenhouse-talent-people-operator`.
- Browser evidence: `playwright`, then GVC.
- Closure: `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`.

## Subagent strategy

`sequential` — no subagents. El operador confirmó trabajar sin delegación; además los slices comparten contratos de routes, copy, DTOs y lifecycle.

## Execution order

1. Reconciliar spec/readiness y promover capturas deterministas del HTML aprobado como baseline visual durable.
2. Implementar shell/rutas/navigation/view registry + readers/DTOs + Demand Desk y drawer conectado a writers reales.
3. Extender `GreenhouseDragList`; implementar Pipeline con drag, keyboard, optimistic/rollback y tests.
4. Implementar Application 360, decision command/API/history/event; integrar adapters assessment/docs con degradación honesta.
5. Implementar Publication Desk y revalidation de careers.
6. Añadir dictionaries, state tests, route/API tests y GVC scenarios desktop/mobile/reduced-motion/keyboard/overflow; iterar contra baseline hasta enterprise-ready.
7. Ejecutar QA release audit, cierre documental y lifecycle. Si 1362/1363 o rollout externo siguen pendientes, dejar TASK-355 `in-progress` como `code complete, dependencias/rollout pendientes`, sin declarar cierre falso.

## Files to create

- `src/app/(dashboard)/agency/hiring/page.tsx`
- `src/app/(dashboard)/agency/hiring/pipeline/page.tsx`
- `src/app/(dashboard)/agency/hiring/publication/page.tsx`
- `src/app/(dashboard)/agency/hiring/[applicationId]/page.tsx`
- `src/app/api/hiring/applications/[id]/decide/route.ts`
- `src/views/greenhouse/agency/hiring/**`
- `src/components/greenhouse/hiring/**`
- `src/lib/hiring/decide.ts` y tests
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`
- `migrations/<timestamp>_task-355-hiring-desk-viewcodes-seed.sql`
- `scripts/frontend/scenarios/task355-hiring-*.scenario.ts`

## Files to modify

- `src/components/greenhouse/GreenhouseDragList.tsx` — group/transfer additive + a11y semantics.
- `src/lib/hiring/index.ts`, `src/lib/sync/event-catalog.ts`, `src/types/hiring.ts` — decide contract/event/types.
- `src/lib/admin/view-access-catalog.ts`, `src/app/(dashboard)/agency/layout.tsx`, `src/lib/navigation/route-reachability-manifest.ts` — access/reachability.
- `src/config/greenhouse-nomenclature.ts`, `src/components/layout/vertical/VerticalMenu.tsx` — navegación interna.
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`, `docs/architecture/ui-platform/PRIMITIVES.md`/`PATTERNS.md` si el as-built lo exige.
- Task lifecycle, registry, Handoff, changelog y documentación funcional/manual al cerrar.

## Verification plan

- Baseline: `pnpm lint`, `pnpm typecheck` antes del primer cambio.
- Por slice: tests dirigidos + lint/typecheck de archivos afectados.
- Final: `pnpm task:lint --task TASK-355`, UI wireframe/flow/motion/readiness checks, `pnpm ops:lint --changed`, `pnpm qa:gates --changed`, tests, typecheck, lint y build.
- DB/runtime: migration apply/status, live decide/outbox/audit, view reachability y `role_view_fallback=0` en dev; staging/prod quedan para release coordinado.
- GVC: 1440 y 390, light/dark, es/en, motion/reduced-motion, keyboard-only Kanban, drag/rollback, drawer dirty/discard, dialogs/focus, `scrollWidth==clientWidth`, console/runtime clean y baseline diff.

## Risk flags

- Assessment/documents no pueden declararse fully live antes de TASK-1362/1363.
- Event seam debe mantenerse compatible con TASK-356.
- Extender drag primitive puede afectar consumers existentes; contrato default debe permanecer byte-compatible y con tests de regresión.
- No exponer el toggle demo “Simular fallo de red” en producción; el mismo failure path se activa solo desde scenario/harness.
- No duplicar sidebar/topbar/theme/locale del HTML dentro del portal real.

## Open questions resolved by this plan

- Primitive decision: `reuse + extend GreenhouseDragList`, no primitive paralela.
- Decision reason: `explainability_json.decisionHistory[]` append-only + snapshot current.
- View namespace: `gestion.hiring*`, alineado al registry real; la spec se corrige antes del seed.
- Missing embeds: adapters + degraded states ahora; integración viva cuando TASK-1362/1363 aterricen.
