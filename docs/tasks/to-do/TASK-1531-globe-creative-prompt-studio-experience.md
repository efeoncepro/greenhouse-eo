# TASK-1531 — Globe Creative Prompt Studio Experience

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1531-globe-creative-prompt-studio.md`
- Flow: `docs/ui/flows/TASK-1531-globe-creative-prompt-studio-flow.md`
- Motion: `docs/ui/motion/TASK-1531-globe-creative-prompt-studio-motion.md`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño listo; bloqueada por el outcome estructurado de TASK-1530`
- Rank: `TBD`
- Domain: `creative|ui|ai`
- Blocked by: `TASK-1530`
- Branch: `task/TASK-1531-globe-creative-prompt-studio-experience`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Transformar el botón `Mejorar` en una experiencia rica de **Creative Prompt Studio** dentro del Producer. El
usuario verá qué intención entendió el agente, para qué target preparó la propuesta, qué restricciones preservó,
qué decisiones sugirió y qué requiere revisión, manteniendo el original intacto hasta aceptar.

## Why This Task Exists

En producción se observó una espera aproximada de 36 segundos sin feedback; el control parece roto. La propuesta
actual, cuando aparece, tampoco comunica expertise: entrega texto sin explicar target fit, preservación, inferencias
o advertencias. TASK-1530 resuelve el agente y contrato; esta task hace esa inteligencia comprensible, controlable
y valiosa sin convertir el composer en chat ni card wall.

## Goal

- Feedback perceptible en menos de 100 ms después de la acción.
- Relación legible fuente→interpretación→propuesta→decisión.
- Control humano explícito sobre aceptar, ajustar original o descartar.
- Estados completos, accesibles y robustos bajo latencia, error y respuestas tardías.
- Calidad visual premium en desktop y mobile, validada contra dirección y GVC.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- Consume exclusivamente los contracts/fixtures promovidos por TASK-1530.
- Browser no interpreta perfiles, llama LLMs ni recibe provider/system internals.
- El original conserva autoridad hasta `accept`; generar media sigue siendo acción separada.
- Reusar Producer Console/Globe tokens y el baseline de TASK-1505.
- No escribir JSX antes del first-fold checkpoint y los gates UI.

## Normative Docs

- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/ui/visual-directions/TASK-1531-globe-creative-prompt-studio-direction.md`
- `docs/ui/wireframes/TASK-1531-globe-creative-prompt-studio.md`
- `docs/ui/flows/TASK-1531-globe-creative-prompt-studio-flow.md`
- `docs/ui/motion/TASK-1531-globe-creative-prompt-studio-motion.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1530` — Creative Prompt Engineer contract/outcome/fixtures.
- `TASK-1505` — Producer visual baseline.
- `TASK-1519` — human BFF execution bridge.

### Files owned

- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-client.ts`
- `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs`
- Tests focales/fixtures del Studio Web

## Current Repo State

### Already exists

- Prompt bar, CTA `Mejorar`, proposal container y accept/reject.
- BFF/client command path y live region.
- Producer Console premium baseline y GVC fixture.

### Gap

- Pending, slow, partial, denied y stale-response no son estados coherentes.
- Live region puede anunciar un run no relacionado.
- No hay creative read, target lens, provenance, preservation rail ni change map.
- La propuesta no ofrece una comparación comprensible ni recovery rico.
- Mobile/focus/reduced-effects no tienen evidencia para este flujo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web Producer Console`
- Future candidate home: `portal`
- Boundary: `CreativePromptProposalV2 + globe.lab.prompt.* from TASK-1530`
- Server/browser split: `browser owns presentation epoch/focus/disclosure; domain owns target, agent semantics, commands, evidence and policy`
- Build impact: `Studio Web TS/CSS/tests/GVC only; no UI framework or provider dependency`
- Extraction blocker: `same-origin session/BFF, Producer state, capability manifest and proposal lifecycle`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario/rol: operador creativo autenticado.
- Momento: idea escrita y target elegido, antes de estimate/generation.
- Resultado: entender y controlar la mejora como colaboración experta.
- Fricción: control muerto, caja negra, pérdida de intención y sobrecarga técnica por modelo.
- No-goals: chat, autoaceptación, model picker del enhancer o nueva route.

### Surface & system decision

- Surface: `/producer`, composer.
- Composition Shell: no aplica; extensión localizada del Producer Console.
- Primitive decision: `extend` — registrar `Creative Prompt Workbench` como pattern del Producer.
- Adaptive density/The Seam: aplica, desktop multi-region→mobile single-column.
- Floating/Sidecar/Dialog: rechazados; workbench inline.
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`.
- Access: capability/grant existente, denial visible y fail-closed.

### State inventory

- Default: CTA explica brevemente el valor.
- Loading: feedback inmediato, busy, single-flight.
- Empty: focus source sin request.
- Error: canonical message, correlation y retry/reconcile.
- Degraded/partial: warnings junto a decisiones afectadas.
- Permission denied: razón honesta.
- Long content: wrap, clamp sólo con disclosure accesible.
- Mobile: single-column, 44 px, cero overflow.
- Keyboard/focus: no auto-focus al completar; restore determinista.
- Reduced effects: mismo significado sin transición.

### Interaction contract

- Primary: Mejorar→revisar→Usar propuesta.
- Hover/focus/active: equivalencia teclado/touch y focus visible.
- Pending/disabled: una signature activa; source/target change marca stale.
- Escape/click-away: no aplica, superficie inline.
- Focus restore: textarea tras accept/edit/reject; retry tras error.
- Latency: immediate pending + slow threshold honesto; no porcentaje inventado.
- Toast/alert: estado persistente + live announcement pertinente.

### Motion & microinteractions

- Motion primitive: CSS/tokens Globe según motion contract.
- Enter/exit: reveal causal del workbench.
- Layout morph: sólo invalidación/accept tokenizados.
- Stagger: none.
- Timing/easing: tokens existentes.
- Reduced-motion fallback: estados instantáneos.
- Non-goal: loops decorativos, confetti o progreso ficticio.

### Implementation mapping

- Route/surface: `../efeonce-globe/apps/studio-web`, `/producer`.
- Pattern: Producer prompt bar + `Creative Prompt Workbench`.
- Components: `producer-ui.ts`, `producer-controller.ts`, `producer-client.ts`.
- Copy: `producer-copy.ts`.
- Commands/readers: `globe.lab.prompt.*`.
- API parity: fixtures/outcomes TASK-1530; UI no reimplementa agent policy.
- Access: capability manifest y trusted context existentes.
- States: ready/loading/slow/partial/error/denied/stale/accepted/rejected.

### GVC scenario plan

- Scenario: `producer-gvc-fixture.mjs`, `task-1531-creative-prompt-studio`.
- Route: `/producer?gvc=task-1531-creative-prompt-studio`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`
- Steps/captures: todos los definidos en wireframe/flow/motion.
- Markers: `creative-prompt-*`.
- Assertions: original, provenance, dedupe, stale, no internals.
- Scroll-width: equality en ambos viewports.
- Reduced-motion/focus: required.
- Review dossier: `.captures/<run>/review/`.
- Baseline decision/surface ID: `globe.creative-producer-surface`, delta tras first-fold approval.

### Design decision log

- Decision: Editorial Workbench.
- Alternatives: invisible polish y conversational copilot.
- Why: hace visible expertise/incertidumbre sin romper prompt-first.
- Reuse/extend/new: extend.
- Risks: densidad, latencia, terminología y texto largo.

### Visual verification

- GVC: `task-1531-creative-prompt-studio`.
- Viewports: desktop/mobile.
- Captures/markers: wireframe inventory completo.
- Scroll-width: obligatorio.
- A11y/focus: teclado, live, zoom, contrast, restore.
- Before/after: runtime observado vs workbench.
- Known debt: none accepted in primary flow.
- Scorecard: `docs/ui/reviews/TASK-1531-globe-creative-prompt-studio.scorecard.json`.
- Threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: none; consume TASK-1530.
- Consumidores: UI sobre HTTP/BFF.
- Runtime target: internal Cloud Run web/API.

### Contract surface

- Existing/new contract: `CreativePromptProposalV2` y `globe.lab.prompt.*` de TASK-1530.
- Compatibility: gated; UI V2 sólo activa con contract revision soportada.
- Full API parity: componente es consumer; toda semántica vive server-side.

### Data model and invariants

- DB: none.
- Original no muta antes de accept; stale response no aplica.
- Tenant: trusted context server-derived.
- Idempotency: fingerprint + key estable; retries reconcilian.
- Audit/history: commands existentes; UI no crea audit paralelo.

### Migration, backfill and rollout

- Migration: none; default UI legacy hasta contract V2 promoted.
- Backfill: none.
- Rollback: feature gate/revert a proposal compacta compatible.
- Coordination: deploy web/API revisiones compatibles.

### Security and access

- Session/BFF/capability; no authority en browser.
- Prompts son sensibles; DOM muestra al actor autorizado, telemetry no captura texto.
- Canonical errors únicamente.
- Single-flight y spend fence server-side.

### Runtime evidence

- Tests controller/UI/client + contract fixtures.
- GVC premium y canario BFF real.
- Signals de latency/outcome sin prompt raw.
- Producción: pending→ready→accept/reject/error/denied/stale.

### Capability Definition of Done — Full API Parity

- [ ] UI sólo consume capability TASK-1530.
- [ ] Accept/reject mantienen authorization, idempotency, audit y errores.
- [ ] No nace endpoint, store ni perfil dentro del click handler.

## Hybrid Execution Justification

- Why not split: la foundation backend/AI ya está aislada en TASK-1530; el impacto command restante es sólo el
  wiring UI de los commands existentes y su state machine de presentación. Separarlo dejaría una UI sin acciones
  verificables o una task backend duplicada sin source of truth propio.
- Primary execution profile: `ui-ux`.
- Contract boundary: `CreativePromptProposalV2 + globe.lab.prompt.*`; TASK-1531 no modifica agent policy/profiles.
- Risk controls: bloqueo por TASK-1530, fixtures contractuales, first-fold gate, rollout por revision compatible,
  epoch/fingerprint, GVC premium y rollback a la proposal compacta.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — First-fold proof

- Implementar fixture-only Editorial Workbench sobre contract V2.
- Capturar desktop/mobile y obtener `ACCEPT FIRST FOLD` antes del wiring exhaustivo.

### Slice 2 — State machine and commands

- Cablear ready/loading/slow/partial/error/denied/stale y accept/edit/reject.
- Corregir live region, fingerprint/epoch, dedupe, focus y estimate invalidation.

### Slice 3 — Responsive, accessibility and motion

- Long content, 200% zoom, keyboard, reduced effects, mobile single-column y no overflow.
- Implementar motion contract sin dependencia nueva.

### Slice 4 — Evidence and rollout

- GVC dossier/scorecard, UI review, enterprise verdict y canario humano por modalidad.
- Activar sólo con contract revision TASK-1530 promovida; rollback a vista compacta.

## Out of Scope

- Agent logic/profiles/evals (TASK-1530).
- Chat/memory, route nueva, provider picker o generación automática.
- Edición manual de proposal dentro del workbench; se edita source y se regenera.

## Detailed Spec

El workbench presenta sólo evidencia observable: intent summary, target público, propuesta, preserved constraints,
creative decisions, assumptions y warnings. Provenance usa `aportado|derivado|sugerido`; nunca “razonamiento”.
El browser mantiene una signature de source+target+composer context. Si cambia, la respuesta anterior puede
reconciliarse pero no sustituye el estado actual.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Evidence |
|---|---|---|
| Densidad abruma | progressive disclosure + one-surface economy | scorecard/usability |
| Latencia parece fallo | pending inmediato + slow state | timing/GVC |
| Respuesta stale aplica | epoch/fingerprint | race test |
| A11y pierde contexto | live + headings + focus restore | keyboard/axe/manual |
| Internals se filtran | client-safe DTO/render allowlist | snapshot/security test |

- Cutover: fixture first fold → staging contract V2 → canary → promoted.
- Rollback: UI gate a proposal compacta; no data rollback.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] First fold desktop/mobile es aceptado antes del wiring completo.
- [ ] Creative read, target, proposal, provenance, preservation y warnings son legibles.
- [ ] Original cambia sólo tras accept; edit/reject/error lo preservan.
- [ ] Pending aparece <100 ms perceptibles y un fingerprint produce un request activo.
- [ ] Slow/error/denied/partial/stale tienen recovery honesto.
- [ ] Copy vive en `producer-copy.ts`; no aparece primitive paralelo.
- [ ] Teclado, live region, focus restore, zoom y reduced effects pasan.
- [ ] `scrollWidth === clientWidth` en 1440 y 390.
- [ ] Wireframe, flow, motion y readiness checks pasan sin findings.
- [ ] GVC dossier y scorecard alcanzan thresholds; enterprise verdict no es BLOCK.
- [ ] Canario Image/Video/Audio no ejecuta media ni filtra internals.
- [ ] `pnpm check && pnpm build` pasan; tests nuevos están registrados.

## Verification

- `pnpm task:lint --task TASK-1531`
- `pnpm ui:wireframe-check --task TASK-1531`
- `pnpm ui:flow-check --task TASK-1531`
- `pnpm ui:motion-check --task TASK-1531`
- `pnpm ui:readiness-check --task TASK-1531`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- GVC premium `1440×1000` + `390×844`, review dossier y scorecard
- canario authenticated BFF por Image/Video/Audio

## Closing Protocol

- [ ] Lifecycle/ruta/README/registry coinciden.
- [ ] Handoff/Globe runtime handoff/changelog reflejan rollout real.
- [ ] Impact check TASK-1505, TASK-1519 y TASK-1530.
- [ ] QA/UI reviews y docs closure ejecutados.

## Follow-ups

- Multi-turn sólo si métricas/usability prueban que el flujo atómico no basta.

## Open Questions

- Validar en first fold cuánta provenance permanece visible vs disclosure en mobile.
