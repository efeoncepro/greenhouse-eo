# TASK-1102 — Nexa Answers multi-turno: compaction + View Transitions

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa|content`
- Blocked by: `none` (mockup-first) · valor real con `TASK-1101` (runtime) · contrato de turno en `TASK-1095`
- Branch: `task/TASK-1102-nexa-answers-multiturn-compaction`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cuando una conversación de Nexa Answers acumula **N>2 turnos**, el turno previo debe **compactarse** (de `answerBubble` completo a `compactAnswer`) con una **coreografía visible** estilo AI Mode: el turno anterior "se encoge" hacia el historial mientras el nuevo entra, vía la **View Transitions API** (Tier 3 motion — declarativa, compositor-only, reduced-motion-safe). Hoy `NexaAnswersCanvas` ya soporta `previousTurns: NexaAnswersCompactAnswerBlock[]` pero la transición de "respuesta viva → turno compactado" es un swap duro, sin continuidad espacial.

## Why This Task Exists

El contrato de continuidad de turno existe (`previousTurns`, `followUpQuestion`, `renderPreviousTurn`) pero la **transición** entre el turno actual rico y su versión compactada al llegar el siguiente turno es un corte seco. En una experiencia conversacional embebida enterprise-grade (AI Mode / Perplexity threads), esa compactación es una de las microinteracciones que más comunica "esto sigue siendo una conversación, no respuestas sueltas" (motion job: **wayfinding** + **spatial continuity**). Sin ella, multi-turno se siente como una lista que se reimprime.

## Goal

- Coreografiar la transición `answered → compacted` del turno saliente con View Transitions API (same-document), `view-transition-name` por turno.
- El turno nuevo entra (settle stagger ya existente) mientras el previo se compacta a `compactAnswer` y migra al historial — sin reflow brusco ni pérdida de contexto.
- Fallback honesto: navegadores sin View Transitions → cross-fade (CSS) ; `prefers-reduced-motion` → swap instantáneo sin translate.
- Verificar la coreografía con GVC (frames before/during/settled) + reduced-motion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — DEPENDENCIES & IMPACT
     ═══════════════════════════════════════════════════════════ -->

## Dependencies & Impact

**Depende de:**
- `TASK-1095` — contrato de turno (`NexaAnswerTurn`) SSOT. La compactación opera sobre ese contrato, no sobre un shape local.
- Motion primitive Greenhouse — usar el tier correcto (View Transitions, no GSAP): la jerarquía de motion del repo permite Tier 3 detrás de un helper canónico.

**Relación:**
- `TASK-1101` (runtime) — el valor real aparece con turnos reales; pero la coreografía se construye y verifica mockup-first en `/knowledge/mockup/nexa-answers` (que ya tiene `previousImpactTurn` + estado `compacted`/`followup`).
- `TASK-1093` (complete) — `inlineFollowUp` + rehidratación de evidencia histórica; coordinar para que la compactación preserve el acceso a la evidencia del turno previo (peek histórico).

**Archivos owned:**
- `src/components/greenhouse/primitives/nexa-answers-canvas/NexaAnswersCanvas.tsx` (`renderPreviousTurn`, branch `previousTurns`, settle Motion)
- Posible helper canónico `src/components/greenhouse/motion/` para View Transitions same-document (si no existe, evaluar primitivarlo — ver Out of scope).

**Impacta a:** cualquier surface conversacional multi-turno (Answer Trace TASK-1089, Nexa Chat TASK-1078) que adopte el patrón.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

> Tier de motion: **View Transitions API (Tier 3)** — NO GSAP. Es un swap de estado same-document (turno vivo → turno compactado), exactamente el caso de uso canónico de `document.startViewTransition`. Compositor-only, accesible, FLIP automático.

### Slice 1 — `view-transition-name` por turno + helper de transición

- Asignar `view-transition-name: nexa-turn-<id>` al contenedor de cada turno (el vivo y su `compactAnswer`).
- Helper canónico que envuelve la mutación de estado (agregar turno nuevo / mover el previo a `previousTurns`) en `document.startViewTransition(() => mutate())`, con guard de soporte (`if (document.startViewTransition)`).
- `prefers-reduced-motion: reduce` → ejecutar la mutación sin transición (swap instantáneo).

### Slice 2 — CSS de la coreografía

- `::view-transition-old(nexa-turn-<id>)` → el turno vivo se encoge + fade (de `answerBubble` a la altura de `compactAnswer`), 300–400ms `--ease-emphasized`.
- `::view-transition-new(...)` → el turno nuevo entra (consistente con el settle stagger existente).
- Dirección canónica: el previo migra **hacia arriba** (al historial); el nuevo aparece donde estaba el vivo.
- Fallback sin View Transitions → cross-fade 200ms (no slide).

### Slice 3 — Preservación de evidencia histórica + a11y

- El turno compactado conserva acceso a su proof/peek (coordinar TASK-1093 rehidratación). `compactAnswer` muestra `trustLabel` ("3 fuentes") + permite re-expandir.
- `aria-live` anuncia el turno nuevo sin re-anunciar el compactado; foco no se roba del composer (Arch Gate A6 de TASK-1096).
- Sin CLS: la altura del historial se reserva (el compactAnswer tiene altura conocida).

### Slice 4 — Mockup + GVC

- En el mockup, una interacción que dispara turno N+1 (el `followup` stage ya existe) con la coreografía.
- GVC: frames `before` (turno vivo) / `during` (compactando) / `settled` (compactado en historial + nuevo vivo) + `reducedMotion:'capture'` (swap instantáneo) + keyboard.

## Verification

- `pnpm local:check` verde.
- GVC desktop + mobile: coreografía de compactación + reduced-motion (swap honesto) + 0 findings.
- Fallback sin View Transitions (emular) → cross-fade, sin error.
- a11y: foco preservado en composer, anuncio único del turno nuevo.

## Out of Scope

- Si emerge necesidad de View Transitions en >1 surface, primitivar el helper (`src/components/greenhouse/motion/`) es un follow-up — acá se usa inline/local si es el único consumer.
- Cutover a runtime (turnos reales) = TASK-1101; acá es la coreografía mockup-first.

## Notas de origen

Propuesta E3 de la sesión TASK-1096 (2026-06-13). El canvas ya soporta `previousTurns` + estados `compacted`/`followup`; falta la coreografía de transición.
