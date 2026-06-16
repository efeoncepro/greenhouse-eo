# TASK-1149 — Nexa: downgrade determinístico de headers estructurales en la respuesta del chat

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `copy`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|knowledge|ui`
- Blocked by: `none`
- Branch: `task/TASK-1149-nexa-answer-structural-heading-downgrade`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Capa determinística server-side que convierte los headers Markdown (`# / ## / ###` al inicio de línea) en **negrita** (`**Título**`) en el texto del turno de Nexa, ANTES de devolverlo/persistirlo. Cierra el gap que detectó el nightly de TASK-1127: el provider Claude (auto-router) genera headers `##` que el contrato de voz prohíbe en el panel del chat, y el prompt no lo garantiza (el LLM es probabilístico).

## Why This Task Exists

El prompt V2 (`answerFormatting`, v2.1.0, TASK-1138) ya prohíbe headers ("No uses headers (#, ##) en tu respuesta: en este panel basta negrita + viñetas"), pero **el cumplimiento es probabilístico**: Claude los usa más que Gemini. El nightly de TASK-1127 lo detectó en staging (caso K6 falla por `answer contains raw Markdown heading (## regression — voice contract bans structural markers)`).

Hoy el render del chat (`MarkdownTextPrimitive` en `NexaThread.tsx`) muestra ese `## Título` como un **heading H2**, que en un panel denso de producto es demasiado pesado (regla product-UI ≠ marketing de `modern-ui`). Y el QA matrix evalúa el texto crudo del endpoint, por eso lo marca.

Reforzar el prompt no *garantiza* el resultado (el LLM no obedece al 100% — ya se vio con el gate K6) y arrastra la ceremonia de versionado del prompt. La garantía honesta es una **capa determinística** (defense-in-depth: el prompt reduce la frecuencia, el downgrade cierra el caso) que cubre TODOS los providers sin depender del humor de cada LLM. Ya existe el patrón en el repo: `toPlainExcerpt` (`strip-markdown-excerpt.ts`) baja `##` para los excerpts — falta aplicar el mismo principio a la respuesta del chat (downgrade a negrita, no a texto plano).

## Goal

- Un helper puro de downgrade de headers (`# / ## / ###` → `**negrita**`) que **preserva los bloques de código** (no toca `##` dentro de ``` ``` para no romper un ejemplo citado).
- Aplicarlo en `NexaService` sobre el texto del turno antes de devolver/persistir → el endpoint sale limpio (el QA matrix lo recibe limpio, K6 pasa sin tocar el test) + el usuario nunca ve un H2 + se persiste limpio.
- Cobertura determinística de todos los providers (Gemini, Claude, futuros) sin tocar el prompt.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/README.md` (índice de capas — SSOT de la inteligencia)
- `docs/architecture/nexa-intelligence/system-prompt/current.md` (módulo `answerFormatting` — el prompt YA prohíbe headers)
- `docs/architecture/nexa-intelligence/knowledge/retrieval-answer-quality.md` (la QA matrix evalúa el texto crudo del modelo)
- `docs/architecture/nexa-intelligence/technical/llm-models.md` (Gemini/Claude + caveats por provider)

Reglas obligatorias:

- **NUNCA** confiar solo en el prompt para *garantizar* formato — el LLM es probabilístico. La garantía vive en la capa determinística.
- **SSOT**: extender `src/lib/nexa/strip-markdown-excerpt.ts` (donde ya vive el downgrade de Markdown), NO crear un módulo/helper paralelo.
- **NUNCA** editar el prompt para resolver esto (esta task NO toca `nexa-system-prompt.ts`; el contrato ya lo prohíbe — acá lo *garantizamos*).
- **Preservar** los bloques de código (no bajar `##` dentro de ``` ```): el contrato de voz exime los headers que son "parte real de un ejemplo citado".
- **NUNCA** aplanar todo el Markdown de la respuesta (eso es `toPlainExcerpt`, para previews). Acá solo se downgradean los HEADERS a negrita; negritas/viñetas/links se preservan (es la respuesta renderizable del chat).
- **SIEMPRE** el QA matrix debe medir lo que el usuario ve (texto post-limpieza). Como la limpieza es server-side, el `content` del endpoint ya sale limpio → el assert `RAW_MARKDOWN_HEADING` se cumple sin tocar el test.
- El `cleanNexaAnswer` del cliente (`NexaThread.tsx`) NO se toca — sigue manejando el `[n]` colgante durante el streaming typewriter (inherentemente cliente).

## Normative Docs

- Skill `greenhouse-nexa-conversational` (`.claude/skills/greenhouse-nexa-conversational/SKILL.md`) — hard rule: "NUNCA mostrar `## crudo` (en respuesta o excerpt)".
- `docs/context/05_voz-tono-estilo.md` — contrato de voz Efeonce.

## Dependencies & Impact

### Depends on

- `src/lib/nexa/strip-markdown-excerpt.ts` (`toPlainExcerpt` — patrón de downgrade existente; el nuevo helper vive acá).
- `src/lib/nexa/nexa-service.ts` (`NexaService.generateResponse` — el output del turno se limpia acá).
- `src/lib/nexa/nexa-provider.ts` + `providers/*` (de donde sale el `text` del turno) `[verificar]`.
- Procedencia: TASK-1138 (módulo `answerFormatting` del prompt), TASK-1127 (el nightly que detectó esto), TASK-1085/1124 (calidad de respuesta).

### Blocks / Impacts

- Mejora la calidad visual de las respuestas de Nexa en el chat para el provider Claude (auto-router en staging/prod).
- Hace que el caso K6 (y cualquier respuesta con headers) pase el QA matrix sin depender del compliance del LLM.

### Files owned

- `src/lib/nexa/strip-markdown-excerpt.ts` (extender con el helper + export)
- `src/lib/nexa/strip-markdown-excerpt.test.ts` `[verificar]` (o el test colocado del módulo)
- `src/lib/nexa/nexa-service.ts` (aplicar el helper al output del turno)
- `docs/architecture/nexa-intelligence/knowledge/retrieval-answer-quality.md` (doc de capa — el doc-gate lo exige al tocar el dominio)
- `docs/architecture/nexa-intelligence/technical/llm-models.md` (si el cambio se documenta como caveat de provider)

## Current Repo State

### Already exists

- `toPlainExcerpt` (`strip-markdown-excerpt.ts`) — ya baja `##`/`**` para los excerpts de citas (precedente del patrón).
- `cleanNexaAnswer` (`NexaThread.tsx`, cliente) — strip de "Fuentes:" + `[n]` colgante al render; **NO** toca headers.
- Prompt V2 `answerFormatting` (v2.1.0) — ya prohíbe headers en la respuesta (capa de generación).
- QA matrix `RAW_MARKDOWN_HEADING` assert (`scripts/nexa-knowledge-qa-matrix.mjs:251`) — detecta `##` en el texto crudo del endpoint.
- Auto-router (TASK-1091/1134): preguntas de conocimiento → Claude (cuando el flag + la key están); failover a Gemini.

### Gap

- La respuesta del chat NO tiene un downgrade determinístico de headers → cuando Claude genera `## Título`, el render lo muestra como un H2 pesado y el QA matrix lo marca.
- El strip de formato vive solo en el cliente (`cleanNexaAnswer`) y no cubre headers; el endpoint devuelve el raw.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite`
- Usuario / rol: usuarios internos que leen respuestas de Nexa en el chat flotante o superficies conversacionales.
- Momento del flujo: lectura de una respuesta Knowledge con secciones.
- Problema de experiencia: los headers Markdown crudos (`##`) se renderizan como H2 pesados dentro de un panel denso; la respuesta debe mantener jerarquía sin parecer un documento/landing.
- Resultado esperado: los títulos estructurales se muestran como negrita en línea propia, preservando viñetas, links y énfasis.

### Surface/system decision

- Primitive/pattern: reuse del render existente `MarkdownTextPrimitive` / `NEXA_MARKDOWN_COMPONENTS`; no se crea primitive nueva.
- Composition/layout: N/A — no cambia layout ni shell.
- Copy source: salida generada por Nexa post-procesada server-side; no introduce microcopy reusable nueva.
- Visual density: respuesta compacta de chat; se elimina el peso visual de H1/H2/H3 sin aplanar todo el Markdown.

### State inventory

- Respuesta con `#`, `##`, `###` al inicio de línea.
- Respuesta sin headers estructurales.
- Respuesta con code fence que contiene `##` y debe preservarse.
- Streaming/render cliente con `cleanNexaAnswer` intacto.

### Interaction contract

- No hay interacción nueva.
- Keyboard/focus/click-away: N/A.
- Loading/pending/error: sin cambios.

### Motion and microinteractions

- Motion rigor: `none`.
- No agrega animaciones ni transiciones.
- Reduced motion: N/A.

### Visual verification

- GVC requerido: sí, evidencia `ui-lite` del chat con una respuesta Knowledge que contenga secciones.
- Viewports: desktop y mobile si el scenario ya existe o se puede capturar sin setup adicional; mínimo desktop para esta task P3/Bajo.
- Check de scroll horizontal: no aplica layout nuevo, pero la captura debe verificar que la respuesta no introduce overflow evidente.
- Acceptance visual: negrita en lugar de H2/H3; ningún `##` visible como heading en el panel.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `api`
- Source of truth afectado: `src/lib/nexa/nexa-service.ts` como capa server-side que construye `NexaResponse.content`.
- Consumidores afectados: `/api/home/nexa`, persistencia del turno, QA matrix, UI del chat.
- Runtime target: `staging` para K6 + local tests.

### Contract surface

- Contrato existente a respetar: `NexaResponse.content` sigue siendo Markdown renderizable.
- Contrato nuevo o modificado: el `content` sale normalizado para no contener headings estructurales `# / ## / ###` fuera de code fences.
- Backward compatibility: `compatible` — preserva Markdown útil, solo baja headings estructurales a negrita.
- Full API parity: la UI consume el mismo response server-side; no se agrega bypass cliente ni endpoint paralelo.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna.
- Invariantes que no se pueden romper:
  - No modificar texto dentro de code fences.
  - No aplanar viñetas, links, negritas ni citas.
  - El helper debe ser idempotente.
- Tenant/space boundary: N/A — no introduce lookup ni acceso por tenant.
- Idempotency/concurrency: helper puro determinístico, sin estado compartido.
- Audit/outbox/history: N/A — no introduce writes nuevos; solo normaliza contenido antes de respuesta/persistencia existente.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: always-on sin flag nuevo, por ser normalización determinística benigna.
- Backfill plan: N/A — no reescribe mensajes históricos.
- Rollback path: revertir la aplicación del helper en `NexaService`.
- External coordination: N/A.

### Security and access

- Auth/access gate: sin cambios; conserva gates existentes del endpoint.
- Sensitive data posture: no introduce datos nuevos ni logs de contenido.
- Error contract: sin cambios; el helper no debe lanzar para input string válido.
- Abuse/rate-limit posture: sin cambios.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/nexa`.
- DB/runtime checks: N/A — sin DB/migration.
- Integration checks: `pnpm qa:nexa-knowledge -- --env=staging --case=K6`.
- Reliability signals/logs: nightly de TASK-1127 cubre regresión posterior.
- Production verification sequence: staging K6 + GVC antes de cerrar; prod queda cubierto por release normal.

### Acceptance criteria additions

- [ ] Source of truth y contract surface quedan nombrados con paths reales.
- [ ] Invariantes de formato, code fences e idempotencia quedan cubiertas por tests.
- [ ] No hay migración/backfill/DB ni writes externos.
- [ ] Staging K6 valida que el endpoint ya no expone headings crudos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Helper puro de downgrade

- Agregar a `src/lib/nexa/strip-markdown-excerpt.ts` un helper puro `downgradeStructuralHeadings(text: string): string` que:
  - Convierte una línea que empieza con `#`, `##`, `###` (+ espacio) en `**<resto de la línea>**` (negrita en su propia línea).
  - **Preserva los bloques de código** (`` ``` `` fences): no toca `##` dentro de un code fence.
  - No toca negritas, viñetas, links, ni el resto del Markdown renderizable.
  - Es idempotente (re-aplicar no cambia el resultado).
- Test del helper (casos: `## Título` → `**Título**`; header dentro de ``` ``` se preserva; sin headers = sin cambios; idempotencia; niveles `#`/`###`).

### Slice 2 — Aplicar en el service + verificar

- Aplicar `downgradeStructuralHeadings` al `text` del turno en `NexaService.generateResponse`, antes de devolver/persistir el `NexaResponse`.
- Verificar contra staging: `pnpm qa:nexa-knowledge -- --env=staging --case=K6` → K6 ya no falla por `raw Markdown heading`.
- Doc de capa (`knowledge/retrieval-answer-quality.md`) — documentar la capa determinística + por qué (defense-in-depth, no se confía en el prompt).

## Out of Scope

- NO reforzar ni versionar el prompt (`nexa-system-prompt.ts`) — el contrato ya prohíbe headers; acá lo garantizamos por la capa determinística.
- NO tocar el `cleanNexaAnswer` del cliente (sigue manejando el `[n]` colgante del streaming).
- NO aplanar todo el Markdown (eso es `toPlainExcerpt`, para previews) — la respuesta del chat preserva negritas/viñetas/links.
- NO cambiar el render (`MarkdownTextPrimitive` / `NEXA_MARKDOWN_COMPONENTS`).
- NO tocar el assert del QA matrix (queda como está; la limpieza server-side hace que el `content` salga limpio).

## Detailed Spec

El flujo canónico tras la task:

```
provider.resolveTurn() → text crudo (puede traer "## Título" de Claude)
  → NexaService: downgradeStructuralHeadings(text) → "**Título**"
    → NexaResponse.content (limpio) → endpoint /api/home/nexa → cliente + persistencia + QA matrix
      → cliente: cleanNexaAnswer (Fuentes + [n] colgante) → MarkdownTextPrimitive (render negrita, no H2)
```

Defense-in-depth (3 capas, ninguna sola decide):
1. **Generación (prompt `answerFormatting`):** pide no usar headers → reduce la frecuencia. (Ya existe; no se toca.)
2. **Determinística (`downgradeStructuralHeadings`, server):** garantiza que ningún header llegue al usuario, en cualquier provider. (Esta task.)
3. **Eval (QA matrix nightly TASK-1127):** mide el `content` del endpoint = lo que el usuario ve (ya limpio) → regresión continua.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (helper + test) → Slice 2 (aplicar en el service + verificar staging). El helper debe estar verde antes de cablearlo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El downgrade rompe un ejemplo de Markdown citado | nexa/render | baja | preservar code fences en el helper + test del caso | QA matrix / revisión visual |
| El downgrade altera contenido no-header (falso positivo del regex) | nexa | baja | regex anclado a inicio de línea + `#{1,3}\s`; tests de idempotencia y no-headers | test del helper |
| Regresión del render (negrita en línea propia se ve raro) | nexa/ui | baja | GVC del chat flotante con una respuesta con secciones | revisión GVC |

### Feature flags / cutover

- Sin flag nuevo: es una limpieza determinística benigna y always-on, consistente con `cleanNexaAnswer`/`toPlainExcerpt` (que no están gateados). Si en review se prefiere gatear, un flag default ON es aceptable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del helper + test | <10 min | sí |
| Slice 2 | revert de la aplicación en `NexaService` (vuelve al texto crudo) | <10 min | sí |

### Production verification sequence

1. `pnpm vitest run src/lib/nexa` (helper + service verdes).
2. `pnpm qa:nexa-knowledge -- --env=staging --case=K6` → K6 sin el issue de `raw Markdown heading`.
3. GVC del chat flotante (una respuesta de conocimiento con secciones) → negrita, no H2.
4. El nightly de TASK-1127 lo cubre de ahí en más.

### Out-of-band coordination required

- Ninguna. Cambio aditivo de formato, sin DB/secrets/integración externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `downgradeStructuralHeadings` baja `# / ## / ###` (inicio de línea) a `**negrita**`, preserva code fences, es idempotente y no toca el resto del Markdown — con tests.
- [ ] El helper se aplica en `NexaService` sobre el texto del turno antes de devolver/persistir.
- [ ] `pnpm qa:nexa-knowledge -- --env=staging --case=K6` ya no reporta `answer contains raw Markdown heading`.
- [ ] El `cleanNexaAnswer` del cliente queda intacto.
- [ ] El prompt (`nexa-system-prompt.ts`) NO se modifica.
- [ ] Doc de capa `knowledge/retrieval-answer-quality.md` actualizado + `pnpm nexa:doc-gate --changed` verde.

## Verification

- `pnpm vitest run src/lib/nexa`
- `pnpm qa:nexa-knowledge -- --env=staging` (K6 limpio)
- `pnpm nexa:doc-gate --changed`
- `pnpm local:check` (lint + tsc)

## Documentation Closure

- Actualizar `docs/architecture/nexa-intelligence/knowledge/retrieval-answer-quality.md` (capa determinística + por qué).
- `changelog.md` + `Handoff.md` con la entrada de cierre.
- Si se documenta como caveat de provider, `technical/llm-models.md`.

## Closing Protocol

- `Lifecycle: complete` + mover a `complete/` + sync `README.md` + `TASK_ID_REGISTRY.md`.
- Evidencia: K6 limpio en staging + GVC del chat (negrita, no H2).
- No mover a `complete` hasta verificar K6 en staging sin el issue de Markdown crudo.

## Follow-ups

- Si emergen otros marcadores estructurales que algún provider use y el contrato prohíba (ej. tablas crudas pesadas en el panel), extender el mismo helper (no crear otro).
