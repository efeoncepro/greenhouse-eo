# TASK-1183 — Nexa Answer → Insight Cross-Citation (Bridge Slice 3)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-1183-nexa-answer-insight-cross-citation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el círculo del Nexa Insight ↔ Conversation Bridge: cuando Nexa responde usando los insight tools (`get_insight`/`list_insights`), el resultado en el chat muestra un CTA navegable "Ver el insight" que deep-linkea al detalle canónico `/nexa/insights/[id]`. El dato ya existe (`raw.drillHref` lo emite TASK-1181); esta task solo lo renderiza como acción. UI-only, sin backend.

## Why This Task Exists

TASK-1181 hace que Nexa lea/liste insights y **ya incluye `raw.drillHref` en el resultado de cada tool**, pero el chat no lo expone como CTA navegable: hoy Nexa puede mencionar el enlace en el texto, pero no hay un affordance consistente para saltar al detalle. Falta el plano Answer → Insights del bridge: que la conversación **siempre apunte de vuelta** al detalle canónico con un botón, no solo con texto. Con esto las dos superficies quedan mutuamente referenciadas (desde el insight preguntas — TASK-1182 — y desde la respuesta vuelves al insight).

## Goal

- El render del resultado de `get_insight`/`list_insights` en el chat muestra un CTA "Ver el insight" por insight, usando `raw.drillHref`.
- El CTA navega a `/nexa/insights/[id]` (deep-link canónico, NO ruta compuesta a mano).
- Cero backend: consume `raw.drillHref` que ya emite TASK-1181.
- Accesible (teclado/focus) y tokenizado (sin HEX/px inline).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_DECISION_V1.md` (ADR — Plano 3 / Slice 3)
- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md` (spec — §2.3)
- `docs/architecture/nexa-intelligence/knowledge/evidence-and-citations.md` (patrón de citas/acciones en el render)
- `DESIGN.md` + tokens AXIS

Reglas obligatorias:

- **SIEMPRE** emitir el deep-link vía `buildNexaInsightDrillHref` (o consumir el `raw.drillHref` ya construido por TASK-1181); NUNCA componer `/nexa/insights/...` a mano en el render.
- **NUNCA** romper los invariantes del runtime del chat (markdown memo, tool-once render, no smooth-scroll) al agregar el CTA en `NexaToolRenderers`.
- **NUNCA** duplicar la lógica de navegación: el render emite intent/usa el href; el host navega.
- **SIEMPRE** validar el copy del CTA con `greenhouse-ux-writing` (en `GH_NEXA`).

## Normative Docs

- `.claude/skills/greenhouse-nexa-conversational/skill.md` (runtime del chat + NexaToolRenderers + doc-gate)

## Dependencies & Impact

### Depends on

- TASK-1181 — los tools `get_insight`/`list_insights` ya emiten `raw.drillHref` (single + por item). Ya en `develop`.
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx` — render de resultados de tools en el chat [verificar nombre/ubicación]
- `src/lib/ico-engine/ai/nexa-insight-href.ts` — `buildNexaInsightDrillHref` (si se necesita reconstruir)
- `src/lib/copy/nexa.ts` — `GH_NEXA` (copy del CTA)

### Blocks / Impacts

- Cierra el bridge (Planos 1-3). No bloquea otras tasks.

### Files owned

- `src/views/greenhouse/home/components/NexaToolRenderers.tsx` [verificar]
- `src/lib/copy/nexa.ts`

## Current Repo State

### Already exists

- `raw.drillHref` en el resultado de `get_insight` (single) y `list_insights` (por item) — TASK-1181.
- `NexaToolRenderers` renderiza los resultados de tools en el chat flotante + Home.
- Deep-link puro `buildNexaInsightDrillHref`.

### Gap

- No hay un CTA navegable "Ver el insight" en el render del resultado de los insight tools (hoy solo texto).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: interno viendo una respuesta de Nexa sobre insights en el chat
- Momento del flujo: Nexa respondió usando `get_insight`/`list_insights`
- Resultado perceptible esperado: un CTA "Ver el insight" lleva al detalle canónico en un click
- Friccion que debe reducir: tener que copiar/buscar el insight para ver el detalle completo
- No-goals UX: NO abrir un panel nuevo; NO cambiar el layout del tool card más allá de sumar el CTA

### Surface & system decision

- Surface: render del resultado de tool en `NexaToolRenderers` (chat flotante + Home)
- Composition Shell: `no aplica`
- Primitive decision: `reuse` — link/botón del Design System
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: N/A (navegación)
- Copy source: `src/lib/copy/nexa.ts` (`GH_NEXA`)
- Access impact: `none` (el insight ya pasó el anti-oracle en el tool)

### State inventory

- Default: CTA visible cuando el resultado trae `raw.drillHref`
- Loading: N/A
- Empty: si no hay `drillHref` (estado gap/degraded) → no se muestra CTA
- Error: N/A
- Degraded / partial: sin `drillHref` → sin CTA (no inventar enlace)
- Permission denied: N/A (el tool ya filtró)
- Long content: la lista muestra un CTA por item (cap razonable)
- Mobile / compact: CTA accesible en mobile
- Keyboard / focus: CTA enfocable + Enter
- Reduced motion: sin motion nuevo

### Interaction contract

- Primary interaction: click/Enter en "Ver el insight" → navega a `raw.drillHref`
- Hover / focus / active: estados del link/botón del Design System
- Pending / disabled: N/A
- Escape / click-away: N/A
- Focus restore: navegación de página estándar
- Latency feedback: N/A
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: N/A
- Reduced-motion fallback: heredado
- Non-goal motion: sin animaciones nuevas

### Visual verification

- GVC scenario: extender el scenario del chat con tool-use de insights → capturar el card con el CTA
- Viewports: desktop + mobile 390px
- Required captures: tool card de `get_insight` y de `list_insights` con el/los CTA
- Required `data-capture` markers: en el card del resultado
- Scroll-width check: sin scroll horizontal nuevo
- Accessibility/focus checks: CTA con aria-label, foco/teclado
- Before/after evidence: card sin/con CTA
- Known visual debt: ninguna

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — CTA "Ver el insight" en el render de los insight tools

- Copy en `GH_NEXA` (validado con `greenhouse-ux-writing`).
- En `NexaToolRenderers`, para los resultados de `get_insight` (single) y `list_insights` (por item), renderizar un CTA navegable que use `raw.drillHref`. Sin `drillHref` → sin CTA.
- GVC desktop + mobile de ambos casos.

## Out of Scope

- Acción gobernada sobre el insight (Slice 4).
- Cambios a los tools/backend de TASK-1181.
- El CTA inverso desde la pantalla del insight (eso es TASK-1182).
- El render del canvas/lente `NexaAnswersCanvas` (flag-gated, fuera del chat live).

## Detailed Spec

El dato ya existe: `raw.drillHref` (single) y `raw.insights[].drillHref` (lista) los emite TASK-1181. Esta task es puramente de presentación en `NexaToolRenderers`. Verificar en Discovery el componente exacto y el shape del `raw` que recibe el renderer.

## Rollout Plan & Risk Matrix

N/A — additive UI change, no production runtime impact, no rollback needed más allá de revert PR. El CTA solo aparece cuando `raw.drillHref` existe; sin productor no cambia nada. Razón: cambio aditivo de presentación que consume un campo ya emitido, sin schema, sin contrato nuevo, sin flag.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Romper un invariante del runtime del chat (remount loop / markdown memo) al tocar el renderer | UI / nexa | low | Seguir el patrón tool-once + React.memo de `NexaToolRenderers`; medir remounts en GVC | falla visible (flicker/loop) |

### Feature flags / cutover

Sin flag — additive, immediate cutover. Revert = revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (quita el CTA) | <5 min | sí |

### Production verification sequence

1. `pnpm local:check:ui` verde local.
2. Staging: agent-session interno → preguntar por un insight → el card muestra "Ver el insight" → navega al detalle.
3. GVC desktop + mobile mirado.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El resultado de `get_insight` muestra un CTA "Ver el insight" que navega a `raw.drillHref`.
- [ ] El resultado de `list_insights` muestra un CTA por item con su `drillHref`.
- [ ] Sin `drillHref` (gap/degraded) → no se muestra CTA (no se inventa enlace).
- [ ] El CTA es accesible (teclado/focus/aria) y tokenizado (sin HEX/px inline).
- [ ] No se rompe ningún invariante del runtime del chat (sin remount loop, sin flicker).
- [ ] GVC desktop + mobile capturado y mirado.

## Verification

- `pnpm local:check:ui` (lint + tsc + design:lint + build)
- `pnpm vitest run src/lib/nexa` (si toca lógica del renderer)
- GVC `pnpm fe:capture` (tool card con CTA, desktop + mobile)
- Smoke con agent-session interno en staging

## Closing Protocol

- [ ] `Lifecycle` sincronizado · archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `## Delta` en el spec del bridge marcando Slice 3 hecho (bridge Planos 1-3 cerrados)
- [ ] `pnpm test` full + `pnpm build` antes de mover a `complete/`

## Follow-ups

- Bridge Slice 4: acción gobernada sobre insight (TASK-1184).
- Exponer el mismo CTA en el canvas/lente `NexaAnswersCanvas` cuando su flag se promueva.

## Open Questions

- ¿Cap de CTAs en `list_insights` (uno por item hasta N) o solo en los top? (Default: por item del top que ya devuelve el tool.)
