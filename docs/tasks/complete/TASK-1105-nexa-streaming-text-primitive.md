# TASK-1105 — `NexaStreamingText` primitive (revelado progresivo never-hidden)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-06-13 — COMPLETADA

- Primitive `NexaStreamingText` creada en `src/components/greenhouse/primitives/nexa-streaming-text/` (component + types + controller con helper puro `computeRevealedPlainText`/`isRevealing` + 7 tests verde).
- 2 modes: `value` (contenido completo → revela `revealedFraction` default 0.6/mín 24 chars + caret — la depiction del canvas) / `stream` (consume `AsyncIterable<string>` shape `NexaChatProvider`, acumula chunks, **abort-safe**: cancela en unmount/corte y asienta lo recibido, `onSettled` callback). Modes = eje funcional; sin kinds de dominio (el revelado es un mecanismo puro, transversal).
- **never-hidden + reduced-motion horneados (CSS-split, sin JS de detección)**: value-mode renderiza vista "llegando" (fracción + caret, visible en motion normal) + vista "asentada" (texto completo, visible bajo `prefers-reduced-motion`) togglando por media query → el contenido NUNCA queda atrapado invisible; bajo reduced-motion colapsa al texto completo sin caret. Caret tokenizado (`primary.main`, `steps(1)`).
- Helper puro `computeRevealedPlainText` = fórmula exacta del canvas (`slice(0, max(24, ceil(len*0.6))).trimEnd()`) + clamps defensivos (NaN→settled, negativo→minChars) → **migración byte-idéntica**.
- Migración canvas: `StreamingAnswerDraft` consume `<NexaStreamingText value={block.body} />`; se borró `StreamingCaret` + el revelado inline (`bodyFull`/`bodyPartial`). **GVC `nexa-answers-surface` verificado visualmente byte-idéntico** (mismo texto ~60% + caret + chip/Detener/título/placeholder; el sha difería solo por la fase del caret parpadeante + el beam del composer — ruido de animación, sin `baseline` que congele); 0 findings nuevos.
- Tier de motion: **CSS/JS de bajo costo** (slicing + caret CSS), NO GSAP — correcto, no es coreografía orquestada.
- Lab `/design-system/nexa-streaming-text` (value@60% / value asentado / stream con replay / modos) + page (guard `plataforma.design_system`) + route-reachability strict (201 rutas, 0 orphans) + catálogo + scenario GVC `design-system-nexa-streaming-text` (0 findings: fullpage + mid-stream + settled). Entrada en `ui-platform/PRIMITIVES.md`.
- **Scope honesto (Slice 3 segment-aware)**: la primitive acepta `NexaExpressiveTextValue` pero revela el **plain-text** (byte-idéntico al canvas, que stream-ea texto plano; las citas aparecen en el answer-bubble ASENTADO, no durante el stream). El revelado a nivel de segmento (citas apareciendo cuando su span se revela) queda como punto de extensión declarado-no-construido (YAGNI: cero consumer actual; el prop ya admite el value type para crecer sin breaking change cuando un stream real con citas inline lo requiera, junto al cableado de TASK-1101/1091).
- Cierre: `local:check` (tsc + lint) verde; barrel `index.ts` exporta componente + types + helpers.

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa`
- Blocked by: `none` (mockup-first) · valor real con `TASK-1101`/`TASK-1091` (stream real) · consumer trigger: `TASK-1078`/`TASK-1089`
- Branch: `task/TASK-1105-nexa-streaming-text-primitive`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extraer el **revelado progresivo de texto** (hoy embebido en `StreamingAnswerDraft` del canvas — titular + cuerpo a mitad con caret) a una **primitive genérica** `NexaStreamingText`, que revela contenido token/chunk-by-chunk con caret, **never-hidden + reduced-motion horneados**, gobernada por los tokens de motion. Consumible por cualquier surface conversacional (canvas, Nexa Chat, Answer Trace) y alimentable tanto por un stream real (`NexaChatProvider`, TASK-1091) como por fixtures.

## Why This Task Exists

El revelado de tokens es el corazón del "feel" de un asistente moderno (AI Mode/ChatGPT) y es genérico: cualquier surface que muestre una respuesta de Nexa llegando lo necesita. Hoy vive acoplado dentro de `StreamingAnswerDraft` (mockup, revelado estático ~60%). Sin una primitive: (a) cada surface reimplementa el caret + el revelado + el contrato never-hidden + reduced-motion, divergiendo; (b) el cableado a un stream real (TASK-1091) tendría que repetirse. La primitive lo resuelve una vez, con el contrato de motion correcto.

## Goal

- `NexaStreamingText` primitive: recibe el texto completo (o un stream de chunks) + revela progresivamente con caret.
- **Never-hidden**: si el JS/stream falla, el contenido queda visible (no atrapado en `opacity:0`/`visibility:hidden`) — mismo contrato que el Motion primitive de Greenhouse.
- **reduced-motion**: `prefers-reduced-motion: reduce` → contenido completo instantáneo, sin caret animado.
- Dos modos de input: `value` (texto completo, revelado simulado por la primitive — mockup) y `stream` (chunks reales del provider — runtime).
- Tokens de motion (velocidad de revelado derivada del SoT, no hardcode); caret tokenizado.
- Soporta `NexaExpressiveText` (segmentos: el revelado respeta `text|emoji|break|citation` — las citas aparecen cuando su span se revela).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — DEPENDENCIES & IMPACT
     ═══════════════════════════════════════════════════════════ -->

## Dependencies & Impact

**Depende de:**
- `NexaExpressiveText` (TASK-1096) — el revelado opera sobre sus segmentos (incl. `citation`).
- Tokens de motion (`motion/core/tokens.ts`) — velocidad/easing del revelado + caret.

**Relación:**
- `TASK-1091` (complete) — `NexaChatProvider` produce el stream real; la primitive lo consume en modo `stream`.
- `TASK-1101` (runtime) — wira la primitive al stream real en el canvas.
- Consumer trigger: `TASK-1078` (Nexa floating) / `TASK-1089` (Answer Trace) la reusan.

**Archivos owned:**
- Nuevo: `src/components/greenhouse/primitives/nexa-streaming-text/` (componente + types + barrel).
- Modificado: `NexaAnswersCanvas.tsx` (`StreamingAnswerDraft` consume la primitive en vez del revelado inline).
- Lab `/admin/design-system/nexa-streaming-text` + route-reachability + scenario GVC.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

> Tier de motion: **CSS/JS de bajo costo** (revelado por slicing del contenido + caret CSS). NO GSAP (no es coreografía orquestada). Never-hidden + reduced-motion son el contrato duro.

### Slice 1 — Primitive `value` mode (revelado simulado)

- Recibe `NexaExpressiveTextValue` completo; revela progresivamente (slicing del plain-text / segmentos) con caret.
- Velocidad derivada de tokens de motion. Never-hidden (si el efecto no corre, muestra el contenido completo). reduced-motion → instantáneo.
- El caret = `StreamingCaret` actual, tokenizado.

### Slice 2 — `stream` mode (chunks reales)

- Acepta un `AsyncIterable`/callback de chunks (shape del `NexaChatProvider`, TASK-1091); acumula y revela conforme llegan.
- Abort-safe: si el stream se corta (control "Detener", TASK-1096), asienta lo recibido (never-hidden).

### Slice 3 — Respeto de segmentos (citas, emoji, break)

- Las citas (`citation`) aparecen cuando su span se revela (no antes); emoji/break preservados.
- a11y: `aria-busy` durante el stream; el live region del status lo lleva la identidad (no duplicar — contrato del canvas).

### Slice 4 — Migración del canvas + Lab + GVC

- `StreamingAnswerDraft` consume la primitive.
- Lab con ambos modos + reduced-motion + abort.
- GVC desktop+mobile + `ui-platform/PRIMITIVES.md` + catálogo `/admin/design-system`.

## Verification

- `pnpm local:check` + `pnpm test` verde.
- GVC: revelado progresivo + caret + reduced-motion (instantáneo) + abort (asienta) + 0 findings.
- Never-hidden: test que verifica que con el efecto desactivado el contenido queda visible.
- Canvas migrado sin regresión (GVC diff del streaming).

## Out of Scope

- El stream real del provider = TASK-1091 (ya existe) + el cableado = TASK-1101. Acá la primitive solo consume el shape.

## Notas de origen

Propuesta P3 de la sesión TASK-1096 (2026-06-13). Componente origen: `StreamingAnswerDraft` + `StreamingCaret` en `NexaAnswersCanvas.tsx`.
