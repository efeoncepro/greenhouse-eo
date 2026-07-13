# Plan — TASK-1368 Hiring Activation Lane UI

## Checkpoint

- Priority: `P1`
- Effort: `Medio`
- Required checkpoint: `human`
- Status: `in-progress; plan checkpoint pendiente antes de código funcional`
- Goal: implementar la lane "Contrataciones listas" con alta fidelidad visual y funcional a la UI fuente, excluyendo solo el chrome global del prototipo, y conectada exclusivamente a los contracts reales de TASK-770.
- Branch strategy: permanecer en `develop` por instrucción del operador; sin subagentes; commit y push remoto al finalizar si los gates pasan.

## Request normalization

- Source actor: `human`; pidió fidelidad alta al HTML de Hiring Activation y análisis específico de `support.js`.
- Fuente visual: `/Users/jreye/Documents/carreers/Hiring-activation/Ejecutar tarea 1368.zip`.
- Surface real: `HR > Onboarding & Offboarding`, route target `/hr/onboarding?lane=hiring-activation`.
- Route drift resuelto: `/hr/workforce/activation` ya es Workforce Activation canónico (`equipo.workforce_activation`) y no se reemplaza.
- Page intent: carril operativo para People Ops donde un hire seleccionado pasa por review, creación de member, apertura de onboarding y cierre del bridge de activación.
- Data shape: queue + KPI strip + detail sidecar/drawer + journey + readiness checklist + dialogs de acciones reales.
- Action density: media-alta; las acciones de negocio son commands API gobernados, no mutaciones client-side.
- Repeatability: componente de lane module-local, sin nueva primitive global.

## Discovery summary

### Artefacto aprobado

- El ZIP contiene `Hiring Activation Lane.dc.html`, `_ds/`, assets de marca, uploads documentales y `support.js`.
- `support.js` es un runtime genérico de Design Component: parsea/ejecuta scripts `x-dc`, monta React y da soporte al prototipo. No contiene lógica de dominio reutilizable y no se debe portar al portal.
- La lógica de dominio del prototipo vive en el script embebido del HTML: seed cases, `deriveStatus`, journey, checklist readiness, dialogs, toasts y mutaciones simuladas.
- Elementos a conservar sin el chrome global:
  - Header/tabs de Onboarding & Offboarding con tab `Contrataciones listas`.
  - KPI strip de 4 cards, queue list-detail, selected row, empty/loading/error/flag-off.
  - Detail panel derecho con avatar, status, meta grid, journey vertical, readiness checklist, blocker banner, footer sticky, CTA primario y activación gated.
  - Dialogs de confirmación/remediación, toast bottom-center, focus trap/restoration, hover/focus states.
  - Motion `fade/rise/slide/pop/toast/skeleton` mapeada a tokens/theme y reduced-motion.

### Dependencias y drift

- TASK-770 está `complete` y expone:
  - `GET /api/hr/hiring-activation`
  - `GET /api/hr/hiring-activation/[id]`
  - `POST /api/hr/hiring-activation/[id]/(review|create-member|open-onboarding|complete|cancel)`
- Flags runtime: `HIRING_ACTIVATION_ENABLED` y `HIRING_HANDOFF_BRIDGES_ENABLED`; la UI debe renderizar `enabled:false` explícito.
- El task doc apuntaba a `docs/tasks/to-do/TASK-770...`; el SoT real está en `docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md`.
- El prototipo simula `resolveItem` para contract/legal_data/template. El API real no tiene command `resolve-blocker`; la UI no debe fingir resolución. Debe mostrar guía/links y ejecutar solo commands reales. La foundation backend para payloads ricos/command real queda registrada como `TASK-1400`.
- `ready_to_activate` no es estado persistido. Se deriva de `detail.readyToActivate` y solo habilita `Activar` en el detalle.
- El KPI "Activadas este mes" no tiene reader histórico en TASK-770. Se conservará el slot visual, pero el dato saldrá solo del contrato disponible; si no hay fuente, se mostrará como no disponible/0 con copy honesta, no mock.

## Solution quality assessment

- Causa raíz UI: el bridge existe pero People Ops no tiene superficie visible para operarlo.
- Decisión de implementación: `reuse + route-local lane`, no nueva primitive ni reemplazo de Workforce Activation.
  - Reusar `HrOnboardingView`, MUI/Vuexy, `CustomChip`, `GreenhouseBreadcrumbs`, `CompositionShell` si encaja sin romper la shell existente, dialogs/drawer/snackbar MUI y copy `getMicrocopy`.
  - El detail debe comportarse como inspector lateral visualmente fiel al prototipo. Si `AdaptiveSidecarLayout` conserva la geometría y mobile fallback, usarlo; si no, usar `Drawer` route-local documentado por fidelidad visual y porque no crea patrón reusable.
  - Los cards nuevos nacen con `minWidth: 0`, container-safe layout y sin overflow de página.
- El chrome global del HTML (sidebar/topbar/search/demo controls/theme/lang) se descarta y queda en Vuexy/portal.
- No se copian HEX, font sizes, tiempos ni CSS crudos del prototipo; se mapean a `theme.palette.*`, `theme.spacing`, radius del theme y motion tokens/transitions.

## Access model

- Route group/view: `equipo.onboarding` en `/hr/onboarding`; no se crea viewCode nuevo.
- Capability read/action real:
  - Queue/detail/review/complete/cancel: `hiring.activation.review`
  - create-member: `workforce.member.intake.update`
  - open-onboarding: `hr.onboarding_instance`
- Workforce Activation (`/hr/workforce/activation`) se mantiene como deep link para completar ficha cuando exista `memberId`.
- Person 360: usar el HR profile existente y agregar card/section de journey si `identityProfileId` permite leer `getHiringJourneyForPerson`.

## Architecture decision

- ADRs existentes aplicables: Hiring ATS, HRIS, Full API Parity, Composition Shell, Primitive+Variants+Kinds, Adaptive Sidecar, Motion Primitive, UI Platform.
- No se requiere ADR nuevo: no cambia source of truth, schema, access model global, navigation global ni UI platform. Es consumer UI de contracts ya aceptados.
- Delta documental requerido: TASK-1368 plan/lifecycle, registry, handoff; al cierre, changelog/manual si la UI queda operable.

## Modular Placement Contract

- Current home: `src/views/greenhouse/hr-onboarding/**` + `src/app/(dashboard)/hr/onboarding/page.tsx`.
- Future extractable home: módulo HR/Lifecycle; no crear `apps/*` ni `packages/*`.
- Boundary: UI client consume `/api/hr/hiring-activation/**`; no importa readers `server-only` en client.
- Server split: sin nuevos tables/migrations. Si se agrega enrichment de Person 360, será optional field desde reader existente, no nuevo aggregate.
- Build impact: Next.js dashboard bundle; mantener imports module-local y evitar duplicar runtime del prototipo.
- Extraction blocker: ninguno nuevo; el route query y copy namespace quedan extraction-ready.

## Backend/data contract

- Source of truth: TASK-770 (`src/lib/workforce/hiring-activation/**`) + TASK-356 handoff queue + Workforce readiness existing resolver.
- UI DTO: definir types browser-safe module-local o en un archivo client-safe; no importar `readers.ts` desde client.
- No mutación local de estado autoritativo: después de cada command, refrescar queue/detail desde API.
- Error handling: canonical API error → alert/toast accionable, sin raw stack ni silent catch.
- PII: no mostrar `value_full`; cualquier legal data sensible sigue en person-legal-profile y fuera de esta UI salvo link/guía autorizada.

## Approved behavior inventory

1. Lane/tabs: `Onboarding`, `Offboarding`, `Contrataciones listas` con badge de cola; keyboard/focus correcto.
2. KPI strip visualmente fiel; datos derivados solo de queue/detail real.
3. Queue: skeleton, loaded, selected, hover/focus, empty, flag-off, error, mobile stacking y `data-capture="activation-lane"`.
4. Detail sidecar/drawer: header, People 360 link, status chip, meta grid, journey vertical, degraded journey, readiness rows, blocker banner y footer sticky.
5. Actions: `review`, `create-member`, `open-onboarding`, `complete`, `cancel`; pending labels, disabled reasons y refresh post-command.
6. Dialogs: confirmar activación, cancelar con reason, remediación informativa para blockers sin command directo; focus trap + restore.
7. Toasts: éxito/error bottom-center, no duplicados, reduced-motion.
8. Person 360: card/sección de Hiring journey dentro de HR profile, no card paralela fuera del lifecycle laboral.
9. Cross-cutting: es-CL/en-US dictionary, no copy reusable hardcodeada, no page overflow 1440/390, console clean.

## Skills

- Preflight/lifecycle: `greenhouse-task-execution-hook`, `greenhouse-task-planner`.
- UI architecture: `greenhouse-ui-orchestrator`, `greenhouse-product-ui-architect`.
- Implementation/Vuexy: `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert`.
- UX/a11y/copy: `greenhouse-ux-content-accessibility`.
- Microinteractions: `greenhouse-microinteractions-auditor`.
- Visual evidence: `greenhouse-gvc-playwright`.
- Closure: `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`.

## Subagent strategy

`sequential` — no subagentes. El operador no autorizó delegación y los archivos de route/copy/view/Person 360 se solapan.

## Execution order

1. Docs/lifecycle: mover TASK-1368 a `in-progress`, registry/handoff, plan formal y checkpoint humano.
2. Copy/types: crear `hiringActivation` en `src/lib/copy/dictionaries/{es-CL,en-US}/` y extender `types.ts`/indexes.
3. Route/lane wiring: `HrOnboardingView` acepta lane query/prop y agrega tab `Contrataciones listas`; `/hr/onboarding` mantiene overview por defecto.
4. Data adapter: client fetch para queue/detail/actions, estados flag-off/loading/error, y helpers de status/readiness/journey.
5. UI implementation: KPI strip, queue, detail sidecar/drawer, dialogs, toasts, motion tokenizada, responsive 390px.
6. Person 360 journey: optional hiring journey enrichment/card en HR profile, con degraded state si el reader falla o no hay facet.
7. GVC scenario: `scripts/frontend/scenarios/hiring-activation-lane.scenario.ts` para desktop/mobile/keyboard/reduced-motion/overflow.
8. Verificación/cierre: tests/checks, QA/documentation governor, task lifecycle, commit y push.

## Files to create

- `src/views/greenhouse/hr-onboarding/HiringActivationLaneView.tsx`
- `src/lib/copy/dictionaries/es-CL/hiringActivation.ts`
- `src/lib/copy/dictionaries/en-US/hiringActivation.ts`
- `scripts/frontend/scenarios/hiring-activation-lane.scenario.ts`

## Files to modify

- `src/app/(dashboard)/hr/onboarding/page.tsx`
- `src/views/greenhouse/hr-onboarding/HrOnboardingView.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `src/lib/person-360/get-person-hr.ts` and/or `src/lib/people/get-person-detail.ts` if Person 360 enrichment needs server wiring.
- `src/lib/copy/types.ts`
- `src/lib/copy/dictionaries/{es-CL,en-US}/index.ts`
- `docs/tasks/in-progress/TASK-1368-hiring-activation-lane-ui.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- Closure docs/changelog as required by documentation governor.

## Verification plan

- Pre-code/docs: `pnpm task:lint --task TASK-1368`, `pnpm ui:wireframe-check --task TASK-1368`, `pnpm ui:flow-check --task TASK-1368`, `pnpm ui:motion-check --task TASK-1368`, `pnpm ui:readiness-check --task TASK-1368`.
- During implementation: targeted TypeScript/lint checks for changed files; add unit tests if helpers/status mapping become non-trivial.
- Final mechanical gates: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm ops:lint --changed`, `pnpm qa:gates --changed`, task/UI checks.
- GVC: `/hr/onboarding?lane=hiring-activation` at 1440 and 390, loaded/empty/flag-off, detail, dialog, focus, reduced-motion, `scrollWidth==clientWidth`, console clean.
- Runtime caveat: if staging flags/data are OFF, closure state must be `code complete; rollout/smoke pending`, not "operationally live".

## Risk flags

- Source route drift: resolved by not touching `/hr/workforce/activation`.
- Resolver blockers: prototype had fake local mutation; real UI must not claim resolution without command support. Real resolver API = `TASK-1400`.
- Queue-level readiness: true `readyToActivate` only exists in detail; list/KPIs must avoid overclaiming.
- Historical activation KPI: no TASK-770 summary reader; visual card remains honest.
- Flags OFF by default: GVC may need flag-off capture locally/staging if no enabled dataset exists.
- People 360 enrichment can expand scope; keep it optional/degraded and inside HR profile.

## Open questions resolved by this plan

- `support.js`: no port; only behavioral intent from embedded script maps to real APIs.
- Route: `/hr/onboarding?lane=hiring-activation`, not `/hr/workforce/activation`.
- Primitive decision: `reuse route-local lane`, no new platform primitive.
- Backend: no new schema/commands; consume TASK-770.

## Follow-ups created during plan

- `TASK-1400` — Hiring Activation Blocker Resolution API. Backend-data foundation for rich blocker payloads and a governed `resolveHiringActivationBlocker` command. TASK-1368 must not simulate this command before TASK-1400 closes.
