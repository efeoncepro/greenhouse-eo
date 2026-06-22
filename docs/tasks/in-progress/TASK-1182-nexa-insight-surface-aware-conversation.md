# TASK-1182 — Nexa Insight Surface-Aware Conversation (Bridge Slice 2)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-1182-nexa-insight-surface-aware-conversation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el lado Insights → Chat del Nexa Insight ↔ Conversation Bridge: un CTA "Pregúntale a Nexa sobre este insight" en la pantalla del insight abre el chat flotante **ya enfocado** en ese insight, transportando un `focusRef` nuevo en el `runtimeContext` del turno para que Nexa ancle la respuesta sin que el usuario tenga que pegar el ID. Slice 2 del bridge (Slice 1 = TASK-1181, ya en develop).

## Why This Task Exists

TASK-1181 hizo que Nexa pueda leer/listar insights cuando se lo piden por texto, pero **el chat sigue sin saber qué está mirando el usuario**: `NexaRuntimeContext` no tiene conciencia de superficie. Hoy, si estás en `/nexa/insights/[id]` y quieres preguntarle a Nexa sobre ese insight, tienes que abrir el chat aparte y describir el insight de memoria (o pegar el ID). Falta el puente inverso: que la pantalla del insight **siembre** la conversación con el insight enfocado. El hook ya está previsto (`NexaSuggestedPrompt.entityRef` es forward-compat explícito para esto) pero no hay productor.

## Goal

- Desde `/nexa/insights/[id]` (y la lista), un CTA abre el chat flotante con un prompt semilla + el insight enfocado.
- Nexa responde anclada al insight enfocado (lo pre-resuelve con el reader canónico usando el subject del turno) sin pedir el ID al usuario.
- Cero relajación de autorización: `focusRef` es contexto, no permiso — el gate sigue siendo subject + capability (el reader filtra).
- Aditivo y reversible: `focusRef?` opcional en el contrato; sin schema, sin capability nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_DECISION_V1.md` (ADR — esta task es el Plano 2 / Slice 2)
- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md` (spec — §2.2)
- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md` + `experience/suggested-prompts.md`
- `DESIGN.md` + tokens AXIS (CTA tokenizado)

Reglas obligatorias:

- **NUNCA** dejar que `focusRef` amplíe lo legible: es contexto del turno, el gate sigue siendo subject + capability; el insight enfocado se pre-resuelve con `readNexaInsightDrill` usando el subject del turno (mismo anti-oracle que TASK-1181).
- **NUNCA** crear un `surfaceContext` paralelo ni un canal de apertura del chat nuevo: reusar `NEXA_FLOATING_OPEN_EVENT` (CustomEvent) — el mismo que ya usa `KnowledgeCenterView`.
- **NUNCA** queryear `ico_ai_signal_enrichments` directo: el pre-resolve pasa por el reader canónico.
- **SIEMPRE** versionar el contrato si se agrega `focusRef` a `NexaRuntimeContext` de forma que rompa consumers (debe ser **aditivo opcional** → no rompe).
- **SIEMPRE** validar el copy del CTA con `greenhouse-ux-writing` y ubicarlo en `src/lib/copy/nexa.ts` (`GH_NEXA`).

## Normative Docs

- `.claude/skills/greenhouse-nexa-conversational/skill.md` (recargar — runtime del chat + doc-gate)
- `docs/tasks/complete/TASK-1181-nexa-chat-insight-addressable-read-parity.md` [verificar carpeta al tomarla] (Slice 1, los tools que esta task complementa)

## Dependencies & Impact

### Depends on

- TASK-1181 (tools `get_insight`/`list_insights` + reader como cliente) — ya en `develop`
- `src/lib/nexa/nexa-contract.ts` — `NexaRuntimeContext` (campo `focusRef?` aditivo)
- `src/app/api/home/nexa/route.ts` — arma `runtimeContext` desde la sesión/request
- `src/lib/nexa/nexa-service.ts` — `generateResponse` (pre-resolve del insight enfocado)
- `src/lib/nexa/floating-events.ts` — `NEXA_FLOATING_OPEN_EVENT`; `src/components/greenhouse/NexaFloatingButton.tsx` (listener) [verificar shape del `detail` del CustomEvent]
- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` — `readNexaInsightDrill` (pre-resolve)
- `src/views/greenhouse/nexa/insights/NexaInsightDetailView.tsx` + `NexaInsightListItemCard.tsx` (CTA)
- `src/lib/copy/nexa.ts` — `GH_NEXA` (copy del CTA)

### Blocks / Impacts

- Habilita el Slice 3 del bridge (cross-citación `drillDown` desde la respuesta).
- Toca el contrato `NexaRuntimeContext` (consumido por todos los tools) — el cambio es aditivo opcional.

### Files owned

- `src/lib/nexa/nexa-contract.ts`
- `src/app/api/home/nexa/route.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/views/greenhouse/nexa/insights/NexaInsightDetailView.tsx`
- `src/views/greenhouse/nexa/insights/NexaInsightListItemCard.tsx`
- `src/lib/copy/nexa.ts`
- el client del chat que arma el POST a `/api/home/nexa` [verificar: `NexaFloatingPanel`/`use-nexa-runtime.ts`]

## Current Repo State

### Already exists

- Tools `get_insight`/`list_insights` + reader anti-oracle como cliente (TASK-1181).
- `NEXA_FLOATING_OPEN_EVENT` (CustomEvent) abre el chat flotante; `KnowledgeCenterView` ya lo despacha con `detail`.
- `NexaSuggestedPrompt.entityRef` (forward-compat) + `suggested-prompts-data-aware.ts` ya modelan "entidad + id que Nexa resuelve con sus tools".
- `readNexaInsightDrill(id, subject)` para el pre-resolve.

### Gap

- `NexaRuntimeContext` no tiene `focusRef` (sin conciencia de superficie).
- `NexaService` no pre-resuelve un insight enfocado.
- No hay CTA "Pregúntale a Nexa" en la pantalla del insight ni wiring del `detail` del CustomEvent para sembrar prompt + focusRef.
- El client del chat no thread-ea `focusRef` al POST de `/api/home/nexa` [verificar dónde se arma el body].

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: interno (colaborador/operador) viendo un insight en `/nexa/insights/[id]` o la lista
- Momento del flujo: está mirando el insight y quiere profundizar/preguntar sin reescribir el contexto
- Resultado perceptible esperado: un CTA abre el chat flotante ya enfocado; la primera respuesta de Nexa habla de ESE insight
- Friccion que debe reducir: tener que abrir el chat aparte y describir/pegar el insight de memoria
- No-goals UX: NO abrir una superficie de chat nueva ni un panel propio del dominio; NO autoenviar un mensaje sin que el usuario confirme el envío (el seed pre-llena, el usuario manda)

### Surface & system decision

- Surface: `NexaInsightDetailView` (CTA primario) + `NexaInsightListItemCard` (CTA secundario por item, opcional en este slice)
- Composition Shell: `no aplica` — es un CTA dentro de vistas existentes
- Primitive decision: `reuse` — botón/CTA del Design System existente; el chat es el flotante canónico
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: reusar el **chat flotante** vía `NEXA_FLOATING_OPEN_EVENT`; NO dialog nuevo
- Copy source: `src/lib/copy/nexa.ts` (`GH_NEXA`) — validado con `greenhouse-ux-writing`
- Access impact: `none` (el CTA se muestra donde ya hay acceso al insight; `focusRef` no amplía acceso)

### State inventory

- Default: CTA visible en el detail
- Loading: al abrir el chat, el estado de "pensando" lo lleva el chat (no se duplica)
- Empty: si el insight ya no aplica/expiró, Nexa lo dice (degradación honesta del reader)
- Error: si el pre-resolve falla, Nexa responde igual sin el ancla + nota honesta; el CTA no rompe
- Degraded / partial: `focusRef` no resoluble → el turno procede sin ancla (no bloquea la conversación)
- Permission denied: si el usuario no puede ver el insight, el reader devuelve `not_found` → Nexa lo trata como sin ancla (anti-oracle)
- Long content: N/A (CTA)
- Mobile / compact: CTA accesible en mobile; el chat flotante ya es responsive
- Keyboard / focus: CTA enfocable + Enter/Space; al abrir el chat, foco al input del chat
- Reduced motion: heredado del chat flotante

### Interaction contract

- Primary interaction: click/Enter en el CTA → `dispatchEvent(NEXA_FLOATING_OPEN_EVENT, { detail: { seedPrompt, focusRef } })`
- Hover / focus / active: estados del botón del Design System
- Pending / disabled: N/A (acción inmediata client-side)
- Escape / click-away: del chat flotante (ya existe)
- Focus restore: al cerrar el chat, foco vuelve al CTA [verificar soporte del flotante]
- Latency feedback: el chat muestra "pensando"; el CTA no espera
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `none` (CTA) — la apertura del chat usa su motion existente
- Enter / exit: heredado del flotante
- Layout morph: N/A
- Stagger: N/A
- Timing / easing token: del Design System
- Reduced-motion fallback: heredado
- Non-goal motion: sin animaciones nuevas

### Visual verification

- GVC scenario: nuevo o extender el de Nexa Insights — capturar el CTA en el detail + el chat abierto enfocado
- Viewports: desktop + mobile 390px
- Required captures: detail con CTA · chat flotante abierto con seed + primera respuesta anclada
- Required `data-capture` markers: en el CTA del detail
- Scroll-width check: sin scroll horizontal en desktop ni mobile al agregar el CTA
- Accessibility/focus checks: CTA con aria-label, foco al input del chat al abrir
- Before/after evidence: detail sin/con CTA
- Known visual debt: ninguna prevista

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `NexaRuntimeContext` (contrato) + `readNexaInsightDrill` (reader, sin cambios)
- Consumidores afectados: `Nexa chat (NexaService) + el client que arma el POST`
- Runtime target: `local` + `staging`

### Contract surface

- Contrato existente a respetar: `NexaRuntimeContext` (`nexa-contract.ts`), `/api/home/nexa` request body, reader anti-oracle
- Contrato nuevo o modificado: campo `focusRef?: { kind: 'nexa_insight'; id: string }` (aditivo opcional) en `NexaRuntimeContext` + aceptación en el body de `/api/home/nexa`
- Backward compatibility: `compatible` (aditivo opcional; sin `focusRef` el comportamiento es idéntico a hoy)
- Full API parity: el chat reusa el reader canónico para el pre-resolve; el `focusRef` es transporte de contexto, no una segunda implementación

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (lectura vía reader)
- Invariantes que no se pueden romper:
  - `focusRef` NO amplía acceso: el pre-resolve usa el subject del turno → reader anti-oracle decide.
  - `focusRef` no resoluble → turno procede sin ancla (degradación honesta), nunca error opaco.
  - `kind` extensible (forward-compat para otros dominios addressable), pero V1 solo `nexa_insight`.
- Tenant/space boundary: derivado del `runtimeContext` (igual que TASK-1181)
- Idempotency/concurrency: N/A (lectura)
- Audit/outbox/history: heredado — el turno queda en `nexa_messages.tool_invocations` / `nexa_turn_telemetry`; opcional registrar `focusRef` en el detail del telemetry (sin PII)

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — campo opcional; sin productor (CTA) no cambia nada
- Backfill plan: N/A
- Rollback path: `revert PR` (quitar el campo + el CTA)
- External coordination: N/A — repo-only

### Security and access

- Auth/access gate: `capability` (heredado: el insight se pre-resuelve con el subject del turno → `nexa.insights.read` + anti-oracle)
- Sensitive data posture: insight de delivery scoped por subject; sin PII payroll/finance
- Error contract: contrato canónico es-CL + `captureWithDomain('home')`; sin error crudo al cliente
- Abuse/rate-limit posture: heredado del chat; `focusRef` es un id acotado validado por el reader

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/nexa` (+ test del pre-resolve con `focusRef`)
- DB/runtime checks: smoke con agent-session (collaborator + client) verificando que `focusRef` ajeno → sin ancla (anti-oracle)
- Integration checks: ejercicio real del CTA en staging → chat abre enfocado → primera respuesta habla del insight
- Reliability signals/logs: heredados; sin signal nuevo en V1
- Production verification sequence: ver §Rollout

### Acceptance criteria additions

- [ ] Contract surface (`focusRef` aditivo) + consumers (NexaService + client) nombrados con paths reales.
- [ ] Invariante `focusRef` = contexto, no permiso, explícito + test del anti-oracle en el pre-resolve.
- [ ] Rollback posture explícito (revert PR; sin migración).
- [ ] Runtime evidence listada (vitest + smoke multi-persona + ejercicio real del CTA).

## Hybrid Execution Justification

- Why not split: el contrato `focusRef` y el CTA son inseparables en valor (el CTA no significa nada sin `focusRef`; `focusRef` sin productor es código muerto). El cambio backend es **aditivo y pequeño** (un campo opcional + un pre-resolve que reusa un reader existente, sin schema/migración/riesgo). Splitting agregaría overhead de coordinación sin reducir riesgo real.
- Primary execution profile: `ui-ux` (el entregable perceptible es el CTA + la conversación enfocada).
- Contract boundary: el backend expone `focusRef?` en `NexaRuntimeContext` + lo pre-resuelve con el reader canónico; la UI lo produce vía el CustomEvent existente. La UI es cliente, no dueña de la lógica.
- Risk controls: campo opcional (sin productor = no-op), reusa el reader anti-oracle (cero autorización nueva), sin schema, revert = quitar campo + CTA. Orden interno obligatorio: **Slice 1 (backend `focusRef` + pre-resolve) ANTES de Slice 2 (CTA)**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato `focusRef` + pre-resolve en el servicio (foundation, backend)

- Agregar `focusRef?: { kind: 'nexa_insight'; id: string }` a `NexaRuntimeContext` (aditivo opcional).
- `/api/home/nexa` acepta `focusRef` en el body y lo setea en `runtimeContext`.
- `NexaService.generateResponse`: cuando hay `focusRef.kind === 'nexa_insight'`, pre-resolver con `readNexaInsightDrill(focusRef.id, subject)` (subject del turno) e inyectar un contexto acotado del insight enfocado en el turno (no resoluble → procede sin ancla).
- Tests: `focusRef` ajeno (anti-oracle) → sin ancla; `focusRef` propio/válido → ancla presente; sin `focusRef` → comportamiento idéntico a hoy.

### Slice 2 — CTA "Pregúntale a Nexa sobre este insight" (consumer, UI)

- Copy en `GH_NEXA` (validado con `greenhouse-ux-writing`).
- CTA en `NexaInsightDetailView` (y opcional `NexaInsightListItemCard`): al click → `NEXA_FLOATING_OPEN_EVENT` con `detail: { seedPrompt, focusRef: { kind:'nexa_insight', id } }`.
- El client del chat thread-ea `focusRef` + pre-llena el `seedPrompt` (el usuario confirma el envío).
- GVC desktop + mobile: detail con CTA + chat abierto enfocado.

## Out of Scope

- Cross-citación `drillDown` desde la respuesta del chat de vuelta al insight (Slice 3 del bridge).
- Acción gobernada sobre el insight (Slice 4, ADR propio).
- Generalizar `focusRef` a otros dominios (`finance_ai_signal`, etc.) — el `kind` queda extensible pero V1 solo `nexa_insight`.
- Cambios a los tools de TASK-1181, al materializer o a las métricas ICO.

## Detailed Spec

Ver `GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md` §2.2 (Plano 2). El `detail` del CustomEvent debe verificarse contra el shape que ya consume `NexaFloatingButton` (`KnowledgeCenterView` es el ejemplo trabajado del despacho).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (backend `focusRef` + pre-resolve) **DEBE** cerrar antes que Slice 2 (CTA): el CTA produce un `focusRef` que sin el contrato/pre-resolve no tiene efecto.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `focusRef` usado para leer un insight ajeno | identity / delivery | low | Pre-resolve usa el subject del turno → reader anti-oracle; test multi-persona | sin signal — cubierto por test |
| `focusRef` no resoluble rompe el turno | nexa | low | Degradación honesta: procede sin ancla; test del path | logs `captureWithDomain('home')` |
| El `detail` del CustomEvent no matchea el shape esperado por el listener | UI | medium | Verificar en Discovery el shape real que consume `NexaFloatingButton` | falla visible al abrir el chat |

### Feature flags / cutover

Sin flag — additive, immediate cutover. `focusRef` es opcional; sin el CTA (productor) no cambia nada. Revert = revert PR. (Si en review se quiere gatear el CTA, usar `home_rollout_flags` declarativo, no env var.)

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (quita `focusRef` + pre-resolve) | <10 min | sí |
| Slice 2 | revert PR (quita CTA + wiring) | <10 min | sí |

### Production verification sequence

1. `pnpm vitest run src/lib/nexa` verde local.
2. Staging: agent-session `agent-collaborator` → desde un insight propio, CTA abre el chat enfocado → primera respuesta habla del insight.
3. Staging: agent-session `agent-client` → no ve insights internos; si se fuerza un `focusRef` ajeno, Nexa procede sin ancla (anti-oracle).
4. GVC desktop + mobile mirado.
5. Promoción a prod = decisión del operador.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `NexaRuntimeContext` tiene `focusRef?` opcional; `/api/home/nexa` lo acepta y lo setea.
- [ ] `NexaService` pre-resuelve el insight enfocado con el reader anti-oracle (subject del turno) y ancla la respuesta; no resoluble → procede sin ancla (honesto).
- [ ] El CTA en `NexaInsightDetailView` abre el chat flotante enfocado vía `NEXA_FLOATING_OPEN_EVENT` con `seedPrompt` + `focusRef`.
- [ ] `focusRef` NO amplía acceso (test multi-persona: client/colaborador ajeno → sin ancla).
- [ ] Copy del CTA en `GH_NEXA`, validado con `greenhouse-ux-writing`.
- [ ] GVC desktop + mobile capturado y mirado; sin scroll horizontal nuevo.
- [ ] Sin schema, sin capability nueva, sin flag (additive).

## Verification

- `pnpm vitest run src/lib/nexa`
- `pnpm local:check:ui` (lint + tsc + design:lint + build)
- `pnpm nexa:doc-gate --changed`
- GVC `pnpm fe:capture` (detail + chat enfocado, desktop + mobile)
- Smoke multi-persona con agent-session (collaborator + client) en staging

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] capas `nexa-intelligence/` sincronizadas + doc-gate verde (si toca behavior/experience)
- [ ] `## Delta` en el spec del bridge marcando Slice 2 hecho
- [ ] `pnpm test` full + `pnpm build` antes de mover a `complete/`

## Follow-ups

- Bridge Slice 3: cross-citación `drillDown` desde la respuesta del chat hacia el detalle del insight.
- Bridge Slice 4 (ADR propio): acción gobernada sobre insight (acknowledge/snooze/assign) vía propose→confirm→execute.
- Generalizar `focusRef.kind` a otros dominios addressable (Finance AI signals) cuando emerja.

## Open Questions

- ¿El CTA va solo en el detail, o también por item en la lista en este slice? (Default: detail primario; lista opcional.)
- ¿El `seedPrompt` se autoenvía o solo pre-llena el input? (Default robusto: pre-llena, el usuario confirma — evita turnos no deseados.)
- Shape exacto del `detail` del `NEXA_FLOATING_OPEN_EVENT` que consume `NexaFloatingButton` — `[verificar en Discovery]`.
