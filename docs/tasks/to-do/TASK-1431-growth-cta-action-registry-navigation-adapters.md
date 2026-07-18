# TASK-1431 — Growth CTA Action Registry and governed navigation adapters

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1431-growth-cta-action-registry-navigation-adapters.md`
- Flow: `docs/ui/flows/TASK-1431-growth-cta-action-registry-navigation-adapters-flow.md`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-023`
- Status real: `Definida`
- Rank: `2`
- Domain: `growth|public-site|platform`
- Blocked by: `none`
- Branch: `task/TASK-1431-growth-cta-action-registry-navigation-adapters`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplaza el action router cerrado sobre `open_growth_form` por un registry tipado y extensible, con validación/resolución server-side y proyección browser-safe. V1 conserva `open_growth_form` y agrega navegación gobernada para `link_url`, `open_think_tool` y `book_meeting`; adapters con semántica propia de assets, forms embebidos o CRM quedan demand-driven.

## Why This Task Exists

El motor ya tiene la frontera correcta, pero `CTA_ACTION_KINDS`, el schema, el router y el renderer están acoplados a un único literal. Agregar cada destino copiando condicionales en server, custom element y cockpit produciría drift. Implementar ahora todos los destinos también sería especulativo: `download_asset`, `embed_growth_form` y `hubspot_handoff` requieren contratos y riesgos distintos. El seam robusto es un registry con familias de ejecución explícitas y adapters agregables sin reescribir el motor.

## Goal

- Un registry canónico modela policy schema, resolver server-side, proyección browser-safe y clase de ejecución por action kind.
- `open_growth_form`, `link_url`, `open_think_tool` y `book_meeting` funcionan end-to-end sin exponer policy interna ni PII.
- El cockpit y futuros consumers pueden descubrir actions soportadas sin duplicar enums o reglas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- El registry y los resolvers viven en `src/lib/growth/ctas/`; API, renderer, cockpit, Nexa/MCP y CLI son consumers.
- El browser recibe solo una unión discriminada ya resuelta; nunca policy, destination mapping, secretos, PII ni candidate set.
- Navegación acepta solo destinos HTTPS o relativos gobernados; `book_meeting` es navegación, nunca mutación CRM silenciosa.
- Un action kind sin adapter/resolver registrado no se puede publicar ni renderizar.

## Normative Docs

- `docs/tasks/complete/TASK-1339-growth-cta-engine-foundation.md`
- `docs/tasks/complete/TASK-1340-growth-cta-portable-renderer-surfaces.md`
- `docs/tasks/to-do/TASK-1430-growth-cta-authoring-reporting-cockpit.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `src/lib/growth/ctas/contracts.ts`
- `src/lib/growth/ctas/action-router.ts`
- `src/lib/growth/ctas/render-contract.ts`
- `src/growth-cta-renderer/contract.ts`
- `src/growth-cta-renderer/action.ts`
- `src/growth-cta-renderer/element.ts`

### Blocks / Impacts

- `TASK-1430` consume metadata/contratos del registry para authoring sin mantener una lista paralela.
- Public render API, preview y `<greenhouse-cta>` deben cambiar juntos para conservar parity.
- Futuras actions `download_asset`, `embed_growth_form` y `hubspot_handoff` se agregan como adapters, no como forks del router.

### Files owned

- `src/lib/growth/ctas/contracts.ts`
- `src/lib/growth/ctas/action-registry.ts`
- `src/lib/growth/ctas/action-router.ts`
- `src/lib/growth/ctas/render-contract.ts`
- `src/lib/growth/ctas/__tests__/`
- `src/growth-cta-renderer/contract.ts`
- `src/growth-cta-renderer/action.ts`
- `src/growth-cta-renderer/element.ts`
- `src/growth-cta-renderer/__tests__/`
- `docs/documentation/growth/motor-cta-popup.md`
- `docs/manual-de-uso/growth/operar-motor-cta.md`

## Current Repo State

### Already exists

- `action_policy_json` es JSONB sin CHECK por kind; no requiere migración para ampliar la unión.
- `resolveCtaAction()` valida y resuelve `open_growth_form` contra el reader publicado de Growth Forms.
- El renderer recibe un `onPrimary` inyectado, por lo que ya existe un seam para un executor por action kind.
- Parity tests protegen el contrato server/browser.

### Gap

- `CTA_ACTION_KINDS`, `ctaActionPolicySchema`, `ctaRenderActionSchema`, mirror y executor son monomórficos.
- No hay registry único ni metadata reusable por cockpit/API.
- Navegación genérica, Think y Meetings todavía no tienen resolución segura ni ejecución portable.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/ctas/` para registry/resolvers y `src/growth-cta-renderer/` para executor browser-safe
- Future candidate home: `domain-package`
- Boundary: unión `CtaActionPolicy` server-only, `CtaRenderAction` browser-safe y registry/resolver canónico consumido por API/UI/agentes
- Server/browser split: schemas de policy, destination validation y resolvers quedan server-only; el bundle recibe kind, href/form refs allowlisted y presentation hints mínimos
- Build impact: sin SDK nuevo, filesystem input ni entrypoint global; el bundle público cambia aditivamente y conserva parity test
- Extraction blocker: resolución de Growth Forms, configuración de destinos y compatibilidad coordinada del contrato versionado con hosts públicos

## UI/UX Contract

### Experience brief

- Primary user: visitante que activa un CTA publicado en Think o WordPress.
- User moment: decide continuar hacia un form, herramienta Think, recurso interno/externo o agenda.
- Job to be done: ejecutar la acción prometida una vez, con destino predecible y recovery seguro.
- Primary decision signal: el label del CTA coincide con un destino gobernado y la acción no produce popup, redirect o mutación inesperada.
- Non-goals: nuevo layout, nueva primitive, modal propio, download delivery, CRM handoff o rediseño del card.

### Surface and system decision

- Surface: `<greenhouse-cta>` en Think/WordPress y preview existente.
- Primitive decision: `reuse` del renderer/action callback de TASK-1340; no nace primitive.
- Composition Shell: `n/a`, superficie pública portable.
- Floating/Sidecar/Dialog decision: `open_growth_form` conserva su contrato; navegación no abre UI nueva.
- Copy source: content versionado del CTA; no se agregan strings visibles reutilizables.

### State inventory

- Loading / skeleton: sin cambio.
- Ready / populated: primary action habilitada cuando el render action resolvió.
- Empty: action inválida impide publish/render.
- Error: executor falla cerrado, restaura primary y emite error sanitizado.
- Pending / disabled: primary deshabilitada durante ejecución para evitar doble activación.
- Success: navegación iniciada o Growth Form abierto.
- Permission denied: no aplica al visitante; policy inválida se bloquea server-side.
- Degraded / partial: destino no resoluble no cruza al renderer.
- Mobile / compact: comportamiento nativo del mismo botón, sin surface adicional.

### Interaction contract

- Primary interaction: click/Enter/Space → dispatch por `action.kind` → form o navegación segura.
- Secondary interaction: dismiss existente, fuera del registry de destinos.
- Keyboard: botón real; la navegación conserva semántica y el form mantiene foco/recovery existente.
- Escape / click-away: solo aplica al Growth Form según su contrato.
- Focus restore: si la ejecución falla, vuelve a habilitarse el mismo botón; navegación entrega el foco al destino.
- Destructive confirmations: ninguna acción V1 muta CRM o datos de negocio.

### Motion & microinteractions

- Motion primitive: ninguna nueva; se conserva feedback de pending/press existente.
- Enter / exit: `n/a` para navegación.
- Feedback: disabled mientras ejecuta y error fail-closed.
- Reduced motion: sin cambio respecto del renderer.
- Non-goal motion: transiciones de página o animaciones por action kind.

### Implementation mapping

- Route / surface: public render API y `<greenhouse-cta>` existentes.
- Components / primitives: `CtaRenderer`, `GreenhouseCtaElement`, action executor.
- Copy source: CTA content contract existente.
- Data reader / command: `resolveCtaAction()` delegando al registry.
- API parity: mismo registry alimenta publish gate, render, preview, cockpit y programmatic consumers.
- Access / capability: author/publish capabilities existentes; visitante solo ejecuta el render contract publicado.

### GVC scenario plan

- Scenario file: extender `scripts/frontend/scenarios/task-1340-growth-cta-renderer.scenario.ts` o crear `task-1431-growth-cta-actions.scenario.ts`.
- Route: preview/runtime CTA existente.
- Viewports: `1440` y `390`.
- Required steps: open form, internal link, Think tool y meeting navigation; invalid destination no renderiza.
- Required captures: ready, pending/failure recovery y form open; navegación se prueba por URL/event assertion.
- Scroll-width: sin cambio de layout, mantener 0.
- Accessibility/focus: button keyboard activation y recovery tras fallo.

### Design decision log

- Decision: registry tipado server-side + unión browser-safe + executor por familia de acción.
- Alternatives considered: condicionales por kind en cada consumer; implementar todos los adapters del ADR; dejar solo `open_growth_form` hasta cada campaña.
- Why this pattern: centraliza invariantes y permite extender sin tocar arbitración, lifecycle o renderer core.
- Reuse / extend / new primitive: `extend` del seam `onPrimary`; cero primitive nueva.
- Open risks: open redirect y drift contract; mitigados por validación de destino y parity tests.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `src/lib/growth/ctas/contracts.ts` + registry/resolver canónico
- Consumidores afectados: publish command, public render API, renderer, preview, cockpit, Nexa/MCP/CLI
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-cta-popup.v1`, `ctaActionPolicySchema`, `ctaRenderActionSchema`
- Contrato nuevo o modificado: registry de actions, unión discriminada policy/render y metadata read-only de kinds soportados
- Backward compatibility: `compatible` — `open_growth_form` conserva shape y comportamiento; nuevas ramas son aditivas
- Full API parity: registry/resolve primitive único; transports y UI no mantienen enums ni validadores paralelos

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.cta_version.action_policy_json` sin cambio estructural
- Invariantes que no se pueden romper:
  - version publicada continúa inmutable y una policy inválida nunca publica/renderiza;
  - browser-safe action no contiene policy, secrets, PII ni mapping interno;
  - `book_meeting` navega a un destino gobernado y no crea Contact/Deal/Meeting por click;
  - `open_think_tool` transporta contexto de campaña allowlisted, nunca identidad directa.
- Tenant/space boundary: lifecycle author/publish conserva capabilities y scope existentes; public execution queda limitada al contrato publicado para la surface autenticada
- Idempotency/concurrency: resolver es puro/read-only; primary se deshabilita durante dispatch para evitar doble ejecución
- Audit/outbox/history: lifecycle/outbox existente; eventos CTA registran `action_kind` allowlisted sin URL completa sensible

### Migration, backfill and rollout

- Migration posture: `none` — JSONB existente y columna event `action_kind` TEXT no requieren alteración
- Default state: actions nuevas no aparecen hasta autorar/publicar una versión; engine flag existente gobierna runtime
- Backfill plan: ninguno; versiones publicadas existentes conservan `open_growth_form`
- Rollback path: revert del registry/contract manteniendo compatibilidad con contratos `open_growth_form`; pausar versiones nuevas antes del revert
- External coordination: smoke de destinos reales en staging; ningún write a HubSpot/GTM requerido

### Security and access

- Auth/access gate: capabilities `growth.cta.author/publish/read/pause` existentes
- Sensitive data posture: sin PII ni secretos; URLs se sanitizan y no aceptan credenciales/protocolos peligrosos
- Error contract: reasons canónicos `action_policy_invalid|action_kind_unsupported|action_destination_invalid|action_destination_unavailable`, sin raw error
- Abuse/rate-limit posture: public render/ingest conserva límites existentes; navegación usa `noopener` y protección anti-open-redirect

### Runtime evidence

- Local checks: focal tests de registry/router/contract/renderer + parity/no-leak
- DB/runtime checks: no migration; leer una versión existente y confirmar compatibilidad
- Integration checks: staging smoke de form, link relativo/HTTPS, Think y Meetings; destino inválido bloqueado
- Reliability signals/logs: `growth.cta.action_failed` o signal equivalente vigente, con reason class allowlisted
- Production verification sequence: publish de versión allowlisted → preview → staging host smoke → pausar/rollback → habilitación gradual por campaña

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime evidence is listed for registry, public contract and host execution.
- [ ] Errors are canonical and no raw URL policy, PII or secrets leak to telemetry/browser.

## Capability Definition of Done

- [ ] Registry/resolvers live in the primitive, not in API/UI/renderer conditionals duplicated per consumer.
- [ ] Each action has policy schema, resolved browser projection, failure reasons and execution family.
- [ ] Publish and render fail closed for unregistered/invalid actions.
- [ ] Cockpit/programmatic consumers can read supported action metadata without importing server-only resolvers.
- [ ] Existing capabilities/grants and governed lifecycle remain the only write path.
- [ ] Full API parity and propose→confirm→execute remain valid for author/publish.

## Hybrid Execution Justification

- Why not split: the server union and browser mirror/executor must ship atomically; splitting would create a contract version that publishes actions the current bundle cannot execute.
- Primary execution profile: `backend-data`.
- Contract boundary: registry/resolver compiles a browser-safe discriminated union; renderer only dispatches the resolved family.
- Risk controls: no schema migration, additive branches, unchanged `open_growth_form`, parity tests, invalid-action fail-closed and staged destination smoke.

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Detailed Spec

### Registry shape

Crear un registry exhaustivo por `kind` que concentre schema de policy, resolver server-side, browser action kind/family, metadata pública mínima para authoring y error taxonomy. `resolveCtaAction()` delega al entry registrado; no contiene una cadena creciente de `if/switch` con lógica de integración.

La unión V1 queda:

- `open_growth_form` → resuelve `formRef` publicado y proyecta `formSlug/formKey`.
- `link_url` → valida destino relativo o HTTPS gobernado y proyecta navegación segura.
- `open_think_tool` → valida destino Think permitido y contexto de campaña allowlisted; proyecta navegación.
- `book_meeting` → valida destino Meetings gobernado; proyecta navegación, sin CRM write.

`dismiss` permanece como control del renderer y evento de suppression, no como primary destination. `download_asset`, `embed_growth_form` y `hubspot_handoff` quedan fuera hasta que sus adapters tengan consumidor, seguridad y evidencia propias.

### Contract/version posture

Mantener compatibilidad de `greenhouse-growth-cta-popup.v1` si las ramas son aditivas y hosts se actualizan en el mismo rollout. Si discovery demuestra que caches/hosts antiguos pueden recibir una rama desconocida, introducir negociación/capability de renderer o bump versionado antes de publicar nuevas actions; nunca confiar en despliegue simultáneo implícito.

## Scope

### Slice 1 — Registry and typed contracts

- Introducir registry y uniones discriminadas sin cambiar `open_growth_form`.
- Exponer metadata browser-safe/read-only para authoring y parity tests.

### Slice 2 — Governed navigation resolvers

- Implementar `link_url`, `open_think_tool` y `book_meeting` con validación de destino/contexto.
- Integrar publish gate y render compiler fail-closed.

### Slice 3 — Portable executor and evidence

- Generalizar action executor del custom element por familia `growth_form|navigate`.
- Cubrir keyboard, duplicate-click guard, error recovery, telemetry allowlist, staging smoke y docs.

## Out of Scope

- `download_asset`, gated delivery o asset registry.
- `embed_growth_form` dentro de modal/placement interruptivo.
- `hubspot_handoff`, Contact/Lead/Deal/Meeting writes o retries CRM.
- Scheduler API/native booking equivalence de TASK-1366; `book_meeting` aquí es solo navegación gobernada.
- Nuevas tablas, migration/backfill, experimentación o targeting adicional.
- Nuevo cockpit/layout; TASK-1430 consume el registry.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 registry/contracts → Slice 2 resolvers/publish gate → Slice 3 renderer/executor.
- No action nueva se publica hasta que el bundle compatible esté desplegado en los hosts objetivo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Open redirect o protocolo peligroso | public renderer | medium | URL parser + allowlist + tests | `growth.cta.action_failed` |
| Contrato nuevo llega a bundle viejo | public hosts | medium | negotiation/bump si discovery lo exige + rollout ordenado | contract/action unsupported |
| Meeting click muta CRM implícitamente | HubSpot | low | navegación-only; sin adapter CRM | audit sin write |
| Enum/schema deriva entre consumers | API/renderer/cockpit | medium | registry metadata + compile-time parity tests | CI parity failure |

### Feature flags / cutover

- Reusar `GROWTH_CTA_ENGINE_ENABLED`; las actions nuevas permanecen inertes hasta publicar una CTA que las use.
- Kill switch/surface pause de TASK-1428 gobierna rollback operativo cuando esté disponible; antes, pausar la versión/surface existente.

### Rollback plan per slice

- Slice 1: revert aditivo; `open_growth_form` sigue compatible.
- Slice 2: no publicar actions nuevas o pausar sus versiones; revert resolvers.
- Slice 3: pausar versiones navigation antes de volver al bundle anterior.

<!-- ZONE 4 — CLOSURE -->

## Acceptance Criteria

- [ ] Registry único y exhaustivo gobierna schema, resolver, projection, metadata y failure reasons.
- [ ] `open_growth_form` conserva compatibilidad y tests actuales.
- [ ] `link_url`, `open_think_tool` y `book_meeting` funcionan end-to-end con destinos seguros.
- [ ] `dismiss` sigue como control/suppression; no se convierte en destination artificial.
- [ ] `download_asset`, `embed_growth_form` y `hubspot_handoff` no se implementan especulativamente.
- [ ] Publish/render bloquean action inválida o bundle no compatible.
- [ ] Browser/telemetry no reciben policy interna, URL credentials, PII ni secretos.
- [ ] TASK-1430 puede consumir metadata del registry sin lista paralela.
- [ ] Wireframe/flow/readiness y GVC assertions pasan en 1440/390.
- [ ] `pnpm task:lint --task TASK-1431` reporta `template=1`, `errors=0`, `warnings=0`.

## Verification

- `pnpm exec vitest run src/lib/growth/ctas src/growth-cta-renderer`
- `pnpm task:lint --task TASK-1431`
- `pnpm ui:wireframe-check --task TASK-1431`
- `pnpm ui:flow-check --task TASK-1431`
- `pnpm ui:readiness-check --task TASK-1431`
- `pnpm fe:capture task-1431-growth-cta-actions --env=staging`
- `pnpm qa:gates --changed --agent codex --task TASK-1431 --runtime --browser --security`

## Closing Protocol

- [ ] Runtime/host parity audit includes every registered action family.
- [ ] EPIC-023, architecture/ADR, functional/manual docs, Handoff and changelog reflect actual shipped actions.
- [ ] TASK lifecycle, README and registry synchronized.
- [ ] `pnpm docs:closure-check` and cross-impact check pass.

## Follow-ups

- `download_asset` when a governed asset-delivery consumer exists.
- `embed_growth_form` when a placement requires embedded/modal form UX.
- `hubspot_handoff` when a bounded CRM write has explicit consent, audit and retry contract.
