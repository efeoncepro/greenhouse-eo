# TASK-1113 — Nexa floating chat: flicker de render + scroll trabado durante streaming

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `bug`
- Epic: `[optional]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-1113-nexa-chat-flicker-scroll`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El panel flotante de Nexa **parpadea (flicker) mientras renderiza la respuesta** y **cuesta subir el scroll** durante/después del streaming. La respuesta es correcta (recupera + cita), pero la UX del render se siente inestable. Es un bug de **front-end** (re-render en loop + pelea entre scroll del usuario y auto-scroll-to-bottom), **independiente** de la activación de flags/retrieval que lo expuso (TASK-1085/1091/1094, 2026-06-13).

## Why This Task Exists

Al activar Nexa knowledge retrieval + el router en producción (2026-06-13), el operador observó que la respuesta de Nexa **renderiza pero parpadea** y que **el scroll hacia arriba se traba** dentro del panel flotante. El backend está correcto (evidencia: respuesta con citas `[n]`, `Fuentes:`, packet con score/freshness — captura del operador). El síntoma es de la capa de presentación del chat conversacional de Nexa, que hasta ahora se ejercitaba poco con respuestas largas + streaming + bloques de citas/packet. Es deuda de UX que conviene cerrar antes de exponer Nexa knowledge más ampliamente.

## Goal

- Diagnosticar la causa raíz del **flicker** durante el render/streaming de la respuesta de Nexa (hipótesis: re-render del árbol del mensaje en cada token/estado, o remount de bloques de citas/packet).
- Diagnosticar por qué **el scroll del usuario hacia arriba se traba** (hipótesis: auto-scroll-to-bottom imperativo que se re-dispara en cada update y "pelea" con el scroll manual).
- Resolver ambos sin regresión funcional (respuesta + citas + packet + toolbar de feedback intactos), respetando reduced-motion y a11y.
- Verificar con GVC (desktop + mobile) + skills de UI antes de declarar listo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` (§Motion, §Elevation, contrato visual) + `docs/architecture/ui-platform/README.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` (contrato conversacional + provider abstraction TASK-1091)
- Skill `greenhouse-nexa-conversational` (choreography idle→thinking→reasoning→streaming→answered→proof→followup), `modern-ui`, `state-design`, `greenhouse-microinteractions-auditor`, `motion-design` (overlay Greenhouse), `a11y-architect`

Reglas obligatorias:

- **Hook UI canónico**: invocar skills de product design ANTES de tocar JSX + verificar con **GVC en loop** (`pnpm fe:capture`) hasta que se vea enterprise; nunca freehand ni "listo" sin captura mirada.
- **Reduced-motion horneado**: cualquier ajuste de animación/auto-scroll respeta `prefers-reduced-motion` (no-bypassable).
- **NUNCA** introducir un nuevo loop de render para "arreglar" el scroll; la causa raíz es la correcta, no un parche (Solution Quality Contract).
- El streaming NO debe re-montar el árbol del mensaje ya renderizado (estabilidad de keys + memoización).

## Normative Docs

- Skill `greenhouse-nexa-conversational` (superficie y choreography canónica de Nexa)
- Skill `greenhouse-gvc-playwright` (capturar streaming/scroll sin que el GVC tome skeleton/estado intermedio)

## Dependencies & Impact

### Depends on

- Nexa conversational surface ya en runtime (TASK-1078 NexaSenderMark / chat atoms; TASK-1085 retrieval+citations; TASK-1110 composición in-place). El bug vive en esa capa.
- **Posible solape con TASK-1112** (`nexa-chat-answers-experience-unification`, in WIP de otro agente al 2026-06-13). Antes de empezar, verificar si TASK-1112 ya toca/refactoriza el mismo componente — para no duplicar ni colisionar. Si TASK-1112 unifica la experiencia de answers, este fix puede absorberse ahí.

### Blocks / Impacts

- UX de toda superficie que renderice respuestas de Nexa (Home floating chat, lente Humano de `/knowledge`, `/nexa/*`).

### Files owned

- `src/views/greenhouse/**` y `src/components/greenhouse/**` del chat conversacional de Nexa (identificar el/los componentes reales en Discovery — candidatos: `NexaAnswersCanvas`/`NexaAnswers*`, el floating chat expandable, el contenedor scrollable del thread).
- `docs/tasks/...` (lifecycle)

## Current Repo State

### Already exists

- Nexa conversational runtime con streaming + bloques de citas/packet + toolbar de feedback (Útil/No tan útil/Incorrecto).
- Skills de UI + GVC para diseñar y verificar.

### Gap

- El componente del thread re-renderiza/parpadea durante el streaming y el auto-scroll pelea con el scroll manual. Falta diagnóstico de causa raíz (React DevTools profiler / GVC interaction V2) + fix estable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Diagnóstico (read-only, sin fix)

- Reproducir en local/staging (`pnpm dev` + preguntar algo de knowledge → respuesta larga con citas/packet).
- Profiler React (qué re-renderiza y por qué: ¿cada token re-monta el árbol? ¿el bloque de citas/packet remonta?).
- Confirmar la mecánica del scroll: ¿hay un `scrollTo`/`scrollIntoView` imperativo que se re-dispara en cada update? ¿`overflow-anchor`? ¿el auto-scroll-to-bottom no respeta "el usuario subió manualmente"?
- Documentar causa raíz del flicker y del scroll trabado (con evidencia: GVC interaction V2 + profiler).

### Slice 2 — Fix flicker

- Estabilizar keys + memoizar los bloques ya renderizados (mensaje/citas/packet) para que el streaming solo agregue/actualice el último fragmento, no re-monte.
- Aislar el estado que cambia por token del árbol estable.

### Slice 3 — Fix scroll

- Auto-scroll-to-bottom **solo** cuando el usuario está al fondo (sticky-bottom); si el usuario subió, **no** forzar scroll (patrón "scroll lock on user intent"). Considerar `overflow-anchor: auto` / contenedor estable.
- Respetar `prefers-reduced-motion` (sin smooth-scroll si está activo).

## Out of Scope

- Cambios al backend de Nexa (provider/router/retrieval) — funciona bien.
- Rediseño de la experiencia de answers (eso es TASK-1112 si aplica; coordinar).

## Detailed Spec

Discovery primero (Slice 1) — no asumir el componente exacto sin profiler. Hipótesis técnicas a confirmar/descartar:

- **Flicker**: el contenedor del thread re-renderiza todo el árbol en cada update de streaming (estado de texto que vive alto en el árbol), o los bloques de citas/packet remontan por keys inestables / props nuevas cada render. Fix: dividir el "mensaje en streaming" (último, mutable) del "historial" (estable, memoizado); keys estables; `React.memo` en bloques de cita/packet.
- **Scroll trabado**: un efecto que hace `scrollToBottom()` en cada cambio de contenido, sobreescribiendo el scroll manual del usuario. Fix canónico: rastrear `isAtBottom` (con threshold) y solo auto-scrollear si `isAtBottom`; cuando el usuario sube, soltar el lock.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (diagnóstico) → Slice 2 (flicker) → Slice 3 (scroll). El diagnóstico gobierna el fix; no aplicar fixes a ciegas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Memoización rompe el update del último fragmento (texto se "congela") | UI | medium | GVC interaction V2 sobre el streaming real; test de que el último token aparece | no signal — emerge en GVC/manual |
| Scroll-lock rompe el auto-scroll legítimo (mensaje nuevo no baja) | UI | medium | umbral `isAtBottom` + GVC con scroll manual arriba y mensaje nuevo | no signal — GVC |
| Colisión con TASK-1112 (mismo componente) | UI | medium | verificar TASK-1112 en Discovery; coordinar/absorber | revisión humana |

### Feature flags / cutover

- Sin flag — fix de UI aditivo, cutover inmediato al merge. Si el componente está detrás de un flag de rollout de Nexa existente, respetarlo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A (read-only diagnóstico) | — | sí |
| Slice 2 | revert PR | <5 min | sí |
| Slice 3 | revert PR | <5 min | sí |

### Production verification sequence

1. Reproducir en local + profiler (Slice 1) → causa raíz documentada.
2. Aplicar Slice 2 + GVC `fe:capture` del streaming (desktop+mobile) → sin flicker, frames mirados.
3. Aplicar Slice 3 + GVC interaction V2 con scroll manual hacia arriba durante streaming → el scroll del usuario se respeta.
4. Skills `modern-ui` + `greenhouse-microinteractions-auditor` + `a11y-architect` sobre la captura real.
5. Merge → verificar en staging con una respuesta larga real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Verification

- `pnpm local:check:ui` (lint + tsc + design:lint + build) verde.
- GVC: captura del streaming sin flicker + interaction V2 que prueba scroll-lock honesto, desktop + mobile, frames mirados.
- Skills de UI revisaron la captura real (no fixture).
- Sin regresión: respuesta + citas `[n]` + `Fuentes:` + packet + toolbar feedback intactos.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` actualizados.
- [ ] `Handoff.md` + `changelog.md` actualizados.
- [ ] Evidencia GVC adjunta/linkeada.

## Context (origen)

Detectado por el operador el 2026-06-13 al activar Nexa knowledge retrieval + router Anthropic en producción (TASK-1085/1091/1094). La respuesta de Nexa es correcta (cita con fuente, score, freshness); el flicker + scroll trabado son de la capa de render del chat flotante. Explícitamente declarado por el operador como "bug separado para trabajar más en develop".
