# TASK-1530 — Globe Model-Aware Prompt Enhancement and Responsive UX

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
- Wireframe: `docs/ui/wireframes/TASK-1530-globe-model-aware-prompt-enhancement.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño listo; runtime actual responde sin feedback y con reescritura genérica`
- Rank: `TBD`
- Domain: `creative|ai|ui`
- Blocked by: `none`
- Branch: `task/TASK-1530-globe-model-aware-prompt-enhancement`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir `Mejorar` del Globe Producer en una capacidad perceptiblemente responsiva y consciente de la ruta
generativa. El command existente seguirá siendo propose→accept/reject, pero recibirá contexto client-safe del
composer, resolverá server-side un perfil versionado por ruta y expondrá estados honestos durante la latencia.

## Why This Task Exists

El 2026-07-23 se reprodujo en `https://globe.efeoncepro.com/producer` con una sesión humana autenticada: tras
pulsar `Mejorar`, la propuesta apareció aproximadamente 36 segundos después. Durante la espera no hubo loading,
`aria-busy`, bloqueo de duplicados ni anuncio pertinente; la propuesta permaneció oculta y el live region conservó
el estado de otra generación. Para una persona, el control parece no funcionar.

El gap no termina en UX. `producer-controller.ts` envía sólo `{ input: { kind: 'text', prompt } }`, mientras
`VertexPromptEnhancer` aplica una reescritura genérica con `gemini-2.5-flash`. No recibe la ruta/modelo, modalidad,
shape, estilo, operación o referencias del composer. La mejora puede ser legible sin estar optimizada para el
motor que producirá Image, Video o Audio.

## Goal

- Dar feedback inmediato, accesible y recuperable mientras se prepara una propuesta.
- Preservar la intención y restricciones del usuario y compilar una propuesta según la ruta generativa elegida.
- Mantener el enhancer intercambiable entre LLMs y seleccionar el default mediante evals, no por acoplamiento.
- Medir latencia, aceptación, costo y fidelidad antes de promover el comportamiento.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- Globe es plataforma hermana: código/runtime en `../efeonce-globe`; task, arquitectura y handoff en Greenhouse.
- El browser declara intención y selecciones client-safe; nunca nombres wire de provider, secretos o autoridad.
- `referenceRoute + catalogVersion` resuelven server-side el perfil efectivo; el nombre público del modelo no es
  una clave de routing.
- La mejora es una propuesta. Nunca reemplaza el texto ni ejecuta una generación sin aceptación explícita.
- Un fallo del enhancer deja el prompt original intacto y usa errores canónicos sanitizados.
- No se promete “mejor resultado”; se mide probabilidad de mejora con evals y revisión humana.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `.codex/skills/software-architect-2026/SKILL.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
- `docs/ui/wireframes/TASK-1530-globe-model-aware-prompt-enhancement.md`

## Dependencies & Impact

### Depends on

- `TASK-1493` — foundation existente de structured briefs, recipes, prompt history y enhancement.
- `TASK-1500` — catálogo versionado y `referenceRoute` como source of truth de rutas.
- `TASK-1505` — Producer prompt-first y propuesta inline aprobados.
- `TASK-1519` — human execution bridge/BFF para commands gobernados.

### Blocks / Impacts

- Mejora la calidad de entrada de Image/Video/Audio sin cambiar sus adapters de generación.
- Cualquier perfil nuevo debe versionarse junto con evidencia contra la versión del catálogo que soporta.
- `TASK-1493` figura `to-do` aunque su foundation existe en runtime; reconciliar ese lifecycle es cierre
  documental separado y no autoriza reimplementar el capability.

### Files owned

- `../efeonce-globe/packages/contracts/src/structured-briefs.ts`
- `../efeonce-globe/packages/domain/src/structured-briefs.ts`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/apps/creative-runner/src/prompt-enhancer.ts`
- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-client.ts`
- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Tests focales y fixture GVC de esos módulos
- Arquitectura/handoff de Creative Studio en Greenhouse si Discovery confirma delta normativo

## Current Repo State

### Already exists

- `globe.lab.prompt.enhance`, `.enhancement.accept`, `.enhancement.reject` y `.prompt.history`.
- `PromptEnhancerPort`, spend fence de un crédito, idempotencia, proposal evidence y store durable.
- `VertexPromptEnhancer` keyless usando `gemini-2.5-flash`.
- Catálogo versionado con ruta, capability, modelo público, modalidad, constraints e input modes.
- Prompt bar, CTA `Mejorar` y propuesta inline con acciones aceptar/descartar.

### Gap

- La UI no presenta pending ni protege de duplicados durante una latencia observada de ~36 s.
- El live region puede anunciar un run no relacionado mientras la mejora está en curso.
- El payload no identifica ruta/catalog version ni el contexto semántico del composer.
- El enhancer usa una política genérica y no existe registry de perfiles por ruta/capability.
- Faltan evals que comparen fidelidad y utilidad por Image/Video/Audio, además de señales de latencia/costo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages/contracts + packages/domain + apps/creative-runner + apps/studio-web`
- Future candidate home: `remain-shared`
- Boundary: `PromptEnhancerPort and globe.lab.prompt.* commands; Producer UI, HTTP, SDK, CLI, worker and E2E are consumers`
- Server/browser split: `browser sends redacted composer context; profile resolution, provider transport, policies, secrets and evidence remain server-only`
- Build impact: `no new heavy dependency; Globe package/app builds and existing GVC fixture change`
- Extraction blocker: `trusted workspace/actor context, catalog version resolution, spend fence and provider transport must stay transactionally coherent`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador creativo autenticado con Producer.
- Momento del flujo: antes de estimate/generación, con prompt y ruta elegidos.
- Resultado perceptible esperado: feedback inmediato y una propuesta relevante, revisable y trazable.
- Fricción que debe reducir: control que parece muerto, clicks repetidos y reescrituras genéricas.
- No-goals UX: chat, modal nuevo, reemplazo automático o promesa de éxito.

### Surface & system decision

- Surface: `/producer`, prompt bar del composer.
- Composition Shell: `no aplica` — se extiende el pattern propio Producer Console ya aprobado.
- Primitive decision: `extend` — capability button, live region y proposal band existentes.
- Adaptive density / The Seam: `aplica` — propuesta y acciones recomponen a columna en 390 px.
- Floating/Sidecar/Dialog decision: no se agrega; la propuesta permanece inline.
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Access impact: `entitlements`; se preservan capability manifest y trusted context existentes.

### State inventory

- Default: prompt editable y CTA disponible sólo con texto válido.
- Loading: `Analizando tu prompt…`, `aria-busy`, dedupe e invalidación por epoch/signature.
- Empty: focus al textarea sin request.
- Error: mensaje canónico, correlation id y reintento seguro.
- Degraded / partial: propuesta con advertencias cuando no se puede certificar una interpretación agregada.
- Permission denied: razón honesta sin aparentar disponibilidad.
- Long content: prompt/propuesta hasta límites contractuales con wrap y acceso al valor completo.
- Mobile / compact: acciones apiladas, 44 px y cero overflow.
- Keyboard / focus: no se roba foco durante pending; aceptar devuelve foco al textarea.
- Reduced motion: mismos estados sin animación.

### Interaction contract

- Primary interaction: `Mejorar` → propuesta → `Usar propuesta`.
- Hover / focus / active: equivalencia teclado/touch y focus visible.
- Pending / disabled: un request en vuelo por signature; no doble reserva ni doble command.
- Escape / click-away: no aplica; no hay overlay.
- Focus restore: textarea tras aceptar/descartar; CTA tras error.
- Latency feedback: inmediato; timeout soft visible sin declarar que el server canceló si el outcome es desconocido.
- Toast / alert behavior: live announcement complementa el estado persistente inline.

### Motion & microinteractions

- Motion primitive: `CSS` existente y tokenizado; no motion contract nuevo.
- Enter / exit: reveal sutil de la propuesta sólo si motion está habilitado.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: tokens Globe existentes.
- Reduced-motion fallback: propuesta aparece sin transición.
- Non-goal motion: spinner global, loops decorativos o progreso inventado.

### Implementation mapping

- Route / surface: `../efeonce-globe/apps/studio-web`, `/producer`.
- Primitive / variant / kind: Producer prompt bar + inline enhancement proposal.
- Component candidates: `producer-ui.ts`, `producer-controller.ts`, `producer-client.ts`.
- Copy source: `producer-copy.ts`.
- Data reader / command: `globe.lab.prompt.*`.
- API parity: una capability transport-neutral; UI, SDK/CLI/worker/E2E comparten contrato.
- Access / capability: `GLOBE_LAB_EXPERIMENT_CAPABILITY` y coverage actual.
- States to implement: idle, pending, ready, warning, error, denied, stale-response ignored.

### GVC scenario plan

- Scenario file: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs`
- Route: `/producer?gvc=task-1530-prompt-enhancement`
- Viewports: `1440×1000`, `390×844`
- Quality profile: `premium`
- Required steps: Image/Video/Audio; pending; ready; accept/reject; timeout/error; route change during request.
- Required captures: idle, pending, ready, warning, error, accepted.
- Required `data-capture` markers: los definidos en el wireframe.
- Assertions: original intacto, dedupe, stale response ignored, route/model client-safe visible.
- Scroll-width checks: `scrollWidth === clientWidth`.
- Reduced-motion / focus evidence: sí.
- Review dossier: required bajo `.captures/`.
- Baseline decision / surface ID: delta sobre `globe.creative-producer-surface`.

### Design decision log

- Decision: feedback y propuesta inline, con contexto resuelto por ruta.
- Alternatives considered: modal, toast-only, reemplazo automático y chat.
- Why this pattern: preserva continuidad fuente→propuesta y minimiza superficie/carga cognitiva.
- Reuse / extend / new primitive: `extend`.
- Open risks: latencia larga, perfiles stale y detalle inventado.

### Visual verification

- GVC scenario: `task-1530-prompt-enhancement`.
- Viewports: `1440×1000`, `390×844`.
- Required captures: pending/ready/error en ambas modalidades de viewport.
- Required `data-capture` markers: prompt bar y estados enhancement.
- Scroll-width check: obligatorio.
- Accessibility/focus checks: teclado, live region, busy/disabled y focus restore.
- Before/after evidence: screenshot/runtime actual vs delta.
- Known visual debt: none accepted for the prompt interaction.
- Visual scorecard: `docs/ui/reviews/TASK-1530-globe-model-aware-prompt-enhancement.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/source fidelity/template resistance >= 4.5`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `PRODUCER_ROUTE_CATALOG + PromptEnhancerPort + globe.lab.prompt.*`
- Consumidores afectados: `UI|HTTP|SDK|CLI|worker|E2E`
- Runtime target: `local|internal Cloud Run web/API/worker`

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/structured-briefs.ts` y API Contract Spine.
- Contrato nuevo o modificado: versión aditiva de `EnhancePromptPayloadV1`, proposal evidence y perfil resuelto.
- Backward compatibility: `compatible`; caller legacy sin target usa perfil neutral explícito y medido.
- Full API parity: resolución/validación vive en domain/runner; UI sólo consume el command.

### Data model and invariants

- Entidades/tablas/views afectadas: propuestas e historial existentes; no se presume migración.
- Invariantes que no se pueden romper:
  - Fuente nunca muta antes de `accept`.
  - Perfil se resuelve por ruta/catalog version conocida y nunca por slug provider enviado por caller.
  - Restricciones explícitas se preservan o se reporta una advertencia; no se agregan marcas, derechos o hechos.
  - Evidencia registra enhancer model/version, policy/profile version y target route client-safe.
- Tenant/space boundary: workspace y actor se derivan del trusted context server-side.
- Idempotency/concurrency: misma idempotency key devuelve la misma propuesta y reserva una vez; epoch/signature UI
  impide aplicar respuestas tardías.
- Audit/outbox/history: audit del spine + historial sólo tras aceptación; rechazo no entra al history.

### Migration, backfill and rollout

- Migration posture: `none` salvo que Discovery pruebe que evidence durable requiere columna aditiva.
- Default state: capability existente; perfil neutral conserva compatibilidad hasta canario por ruta.
- Backfill plan: none; perfiles son datos versionados en código.
- Rollback path: revertir perfil/resolución target al neutral y conservar proposal/history compatibles.
- External coordination: deploy keyless de API/Studio/Worker; verificar IAM Vertex existente, sin crear secret nuevo.

### Security and access

- Auth/access gate: session → BFF delegation → IAM-private API → capability/trusted context.
- Sensitive data posture: prompts pueden contener contenido cliente; no logs raw ni prompt en métricas.
- Error contract: `invalid_request`, `policy_blocked`, `access_denied`, `dependency_unavailable`, sanitizados.
- Abuse/rate-limit posture: spend fence actual, idempotencia, timeout, circuit/dependency failure y no retry ciego.

### Runtime evidence

- Local checks: `pnpm check && pnpm build` en `../efeonce-globe`; tests nuevos registrados en scripts explícitos.
- DB/runtime checks: confirmar proposal/history durable y reserva settle/release única; sin migración pendiente.
- Integration checks: canario de enhance/accept/reject en rutas promovidas Image/Video/Audio sin generar media.
- Reliability signals/logs: latencia p50/p95, outcomes, timeout/dependency, aceptación/rechazo y créditos; cero prompt raw.
- Production verification sequence: sesión humana → seleccionar ruta → enhance → pending → proposal → accept/reject →
  history → repetir mobile y fallo controlado → readback audit/spend.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional.
- [ ] Runtime evidence prueba settlement único y propuesta/history durable.
- [ ] Métricas y errores no filtran prompts, secretos, slugs ni raw provider errors.

### Capability Definition of Done — Full API Parity

- [ ] La lógica vive en contracts/domain/runner, no en el click handler.
- [ ] Enhance/accept/reject/history conservan command/reader transport-neutral.
- [ ] Authorization fina, idempotencia, audit y errores canónicos pasan conformance.
- [ ] Registry/grant/coverage se verifican para al menos un actor humano real sin ampliar autoridad.
- [ ] SDK/CLI/worker/E2E consumen el mismo contrato; MCP conserva estado explícito.
- [ ] Propose→confirm→execute se mantiene: enhance propone, accept aplica al historial, generación es otra acción.
- [ ] Parity check pasa sin backend alterno ni provider directo desde UI.

## Hybrid Execution Justification

- Why not split: el backend ya existe y el delta UI es el estado perceptible del mismo command; separarlos dejaría
  temporalmente un contrato extendido sin feedback o una UI pendiente sin semántica correcta. No hay DB migration.
- Primary execution profile: `backend-data`.
- Contract boundary: `globe.lab.prompt.*` y `PromptEnhancerPort`; la UI es un consumer delgado.
- Risk controls: slices ordenados, backwards compatibility, dedupe, canario sin generación de media y rollback al
  perfil neutral.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Target-aware contract and profile registry

- Extender el payload con `target` client-safe (`referenceRoute`, `catalogVersion`) y composición relevante
  discriminada por modalidad.
- Resolver server-side la ruta exacta y un `PromptOptimizationProfile` versionado; fallar cerrado ante ruta/version
  incoherente y conservar un perfil neutral para callers legacy.
- Mantener provider slugs y prompt compilado fuera del contrato cliente.

### Slice 2 — Intent-preserving enhancer and evals

- Separar análisis neutral de intención y compilación específica por perfil, con structured output validado.
- Registrar evidencia `method/model/policy/profile/catalog/route` client-safe y advertencias verificables.
- Crear golden set Image/Video/Audio con constraints adversariales; comparar enhancer candidates por fidelidad,
  utilidad, latencia y costo. El modelo default es el ganador del gate, no una decisión hardcoded de marca.

### Slice 3 — Responsive pending/proposal UX

- Implementar idle/pending/ready/warning/error/denied y stale-response protection dentro del prompt bar.
- Corregir live region, `aria-busy`, dedupe, focus y copy centralizado.
- Preservar el prompt original hasta `accept`; invalidar estimate al aplicar la propuesta.

### Slice 4 — Runtime evidence and rollout

- Ejecutar checks locales, GVC premium desktop/mobile y canario humano Image/Video/Audio sin generación de media.
- Verificar settlement/release único, audit/history durable y señales de latencia/outcome sin prompt raw.
- Desplegar sólo por workflow keyless autorizado y documentar estado real/rollback.

## Out of Scope

- Crear un chat o agente multi-turn.
- Auto-seleccionar/cambiar la ruta generativa sin confirmación.
- Generar media como parte del botón `Mejorar`.
- Prometer resultados garantizados o usar el output generado como juez automático único.
- Migrar de Cloud Run, comprar un producto por asiento o exponer selección de enhancer LLM al browser.
- Reconciliar el lifecycle completo de `TASK-1493`.

## Detailed Spec

El command recibe contexto mínimo y versionado. El domain valida `referenceRoute` contra
`PRODUCER_ROUTE_CATALOG`, deriva capability/modality/constraints y entrega al enhancer un target resuelto. Los
perfiles son datos versionados, no un `switch` en UI ni una colección de system prompts dispersos. El resultado
estructurado distingue propuesta, intención detectada, restricciones preservadas, interpretaciones agregadas,
advertencias y evidencia. Cualquier dato no client-safe queda en manifest/audit interno.

La UI toma una signature de prompt+ruta+modalidad+shape+style+referencias redacted. Sólo la respuesta cuya
signature sigue vigente puede mostrarse o aceptarse. Un timeout del transporte no se interpreta como cancelación
del server ni dispara retry automático; el mismo idempotency key permite reconciliar/reintentar sin doble spend.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- La UI no envía target hasta que el contract/validator sea compatible.
- Ningún perfil se promueve como default sin golden eval y canario de su ruta.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El enhancer cambia intención | AI/domain | medium | structured output, preservation validator, human accept, golden adversarial | preservation warning/reject rate |
| Latencia mantiene apariencia de fallo | UI/provider | high | pending inmediato, p95 budget, timeout honesto | enhancement latency p95 |
| Doble click duplica spend | spend fence | medium | idempotency + UI single-flight | duplicate reservation invariant |
| Catálogo/perfil quedan desalineados | catalog/domain | medium | version pin + load-time drift guard | profile/catalog mismatch |
| Prompt sensible aparece en logs | security/ops | low | métricas redacted, no raw payloads | log redaction test |

### Feature flags / cutover

- Reusar el kill switch/capability vigente de structured prompts; si Discovery requiere rollout por perfil, agregar
  un selector server-side default `neutral`, nunca un toggle browser.
- Cutover por ruta promovida: Image → Video → Audio. Rollback inmediato al perfil neutral + redeploy.

### Rollback plan per slice

- Slice 1: aceptar payload legacy y desactivar resolución target.
- Slice 2: revertir profile selection a neutral; conservar proposals/history compatibles.
- Slice 3: revertir UI al proposal contract anterior sin tocar datos.
- Slice 4: rollback de revisión Cloud Run/digest por workflow; no borrar propuestas/history.

### External coordination

- Operador Globe autoriza deploy/canario y confirma la ventana de un crédito por enhancement.
- No se requiere secret nuevo si continúa Vertex keyless; cualquier provider nuevo exige task/ADR y secreto
  gobernado separado.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `EnhancePromptPayload` acepta target/composition versionados y mantiene compatibilidad legacy.
- [ ] El server resuelve ruta/perfil desde catálogo; browser no envía provider slug ni elige transport.
- [ ] Perfiles Image/Video/Audio tienen golden eval con fidelidad de constraints y modelo default justificado.
- [ ] `Mejorar` muestra pending en menos de 100 ms perceptibles, `aria-busy` y evita requests duplicados.
- [ ] Un cambio de prompt/ruta/modalidad durante el request impide que la respuesta tardía sobrescriba el estado.
- [ ] El original sólo cambia tras `accept`; `reject`, error y timeout lo conservan.
- [ ] Proposal evidence identifica profile/policy/catalog/route y no filtra información operator-only.
- [ ] Spend fence reserva/settle/release exactamente una vez por idempotency key.
- [ ] Historial registra sólo propuestas aceptadas y mantiene aislamiento actor+workspace.
- [ ] Copy reusable vive en `producer-copy.ts`; no se crea component/primitive paralelo.
- [ ] Wireframe declarado existe y pasa `pnpm ui:wireframe-check --task TASK-1530`.
- [ ] `UI ready: yes` pasa `pnpm ui:readiness-check --task TASK-1530`.
- [ ] GVC premium prueba desktop+390 px, teclado, focus, preferencia de accesibilidad sin efectos y
  `scrollWidth === clientWidth`.
- [ ] Canario humano en rutas promovidas Image/Video/Audio devuelve propuesta sin ejecutar media.
- [ ] Métricas de latencia/outcome/aceptación/costo no contienen prompt raw.
- [ ] `pnpm check && pnpm build` pasan en Globe y cada test nuevo aparece en el script del package.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- tests focales contracts/domain/creative-runner/studio-web registrados en sus scripts explícitos
- `pnpm task:lint --task TASK-1530`
- `pnpm ui:wireframe-check --task TASK-1530`
- `pnpm ui:readiness-check --task TASK-1530`
- GVC premium `1440×1000` + `390×844` y dossier revisado
- canario authenticated BFF→private API para enhance/accept/reject/history
- readback de audit, spend reservation y prompt history sin exponer contenido

## Closing Protocol

- [ ] `Lifecycle` y ubicación del archivo coinciden con el estado real.
- [ ] `docs/tasks/README.md` quedó sincronizado.
- [ ] `Handoff.md` y `GLOBE_RUNTIME_HANDOFF.md` registran rollout/evidencia real.
- [ ] `changelog.md` registra el cambio visible cuando se despliega.
- [ ] Se ejecutó chequeo de impacto sobre `TASK-1493`, `TASK-1500`, `TASK-1505` y `TASK-1519`.
- [ ] Arquitectura Creative Studio registra profile/eval/rollback si Discovery confirma una decisión nueva.
- [ ] QA no trivial usa `greenhouse-qa-release-auditor` y `pnpm qa:gates --changed`.
- [ ] Cierre documental usa `greenhouse-documentation-governor` y `pnpm docs:closure-check`.

## Follow-ups

- Agente conversacional multi-turn para refinamiento iterativo, sólo si métricas muestran que una operación atómica
  no basta.
- Reconciliación documental del lifecycle de `TASK-1493`.

## Open Questions

- El modelo enhancer default se decide después del benchmark; la arquitectura no presupone GPT, Sonnet o Gemini.
- Confirmar en Discovery si `PromptEnhancementEvidenceV1` admite extensión aditiva sin migration durable.
