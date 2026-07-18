/**
 * TASK-1340 — Growth CTA renderer: capa CSS pública (tokens `--gh-cta-*`).
 *
 * Mismo rationale que el precedente forms (`src/growth-forms-renderer/styles.ts`):
 * NO usamos `@layer` a propósito — en light DOM una capa nombrada queda por debajo
 * de los resets sin-capa del host; en su lugar, selectores scopeados
 * `greenhouse-cta .ghc-*` cuya specificity gana sobre resets genéricos.
 *
 * VERSATILIDAD DE DISEÑO (contrato, no accidente):
 *  - TODO valor visual es un token `--gh-cta-*` con default compilado — el host
 *    (WP/Think/preview) puede re-tematizar el card completo sin tocar el bundle.
 *  - 3 style variants nombradas (`default` | `spotlight` | `minimal`) elegidas por
 *    `cta_version.style_variant` (DATO gobernado, no código por página). Variante
 *    desconocida ⇒ `default` (fail-safe).
 *  - Slot visual opcional (`visualAssetRef`) + layout por container query: apilado
 *    en angosto, horizontal con visual lateral en ancho. Tipografía heredada del
 *    host por defecto (`font-family: inherit`) — el card se siente nativo en cada
 *    surface; `--gh-cta-font` la sobreescribe si el host lo quiere.
 *
 * PARIDAD preview↔público POR CONSTRUCCIÓN: todo selector usa
 * `:is(greenhouse-cta, .ghc-scope)` — el custom element público y el host del
 * preview interno comparten las MISMAS reglas (variantes, container queries,
 * estados); un scope nunca puede driftar del otro (bug atrapado en GVC 2026-07-18).
 *
 * Anti-CLS: el elemento reserva `--gh-cta-reserve` de alto durante la carga y el
 * card entra DENTRO de ese espacio (motion doc). El único colapso posible es el
 * fail-closed (sin contrato ⇒ sin card), aceptado por contrato de la spec.
 */

export const RENDERER_STYLE_ID = 'greenhouse-cta-styles'

export const RENDERER_CSS = `
greenhouse-cta, .ghc-scope {
  /* ── Tokens re-tematizables por el host ─────────────────────────────── */
  --gh-cta-accent: #023c70;
  --gh-cta-accent-2: #0375db;
  --gh-cta-accent-contrast: #ffffff;
  --gh-cta-fg: #1f2937;
  --gh-cta-fg-muted: #55606e;
  --gh-cta-bg: #ffffff;
  --gh-cta-bg-soft: #f5f7fa;
  --gh-cta-border: #dde3ea;
  --gh-cta-radius: 14px;
  --gh-cta-gap: 12px;
  --gh-cta-pad: 20px;
  --gh-cta-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  --gh-cta-shadow-lift: 0 10px 30px rgba(2, 60, 112, 0.18);
  --gh-cta-focus: #0375db;
  --gh-cta-font: inherit;
  --gh-cta-reserve: 148px;
  --gh-cta-motion-duration: 180ms;
  --gh-cta-motion-ease: cubic-bezier(0.2, 0, 0, 1);
  --gh-cta-z: 2147482000;

  display: block;
  container-type: inline-size;
  font-family: var(--gh-cta-font);
  color: var(--gh-cta-fg);
  box-sizing: border-box;
}

:is(greenhouse-cta, .ghc-scope) *, :is(greenhouse-cta, .ghc-scope) *::before, :is(greenhouse-cta, .ghc-scope) *::after { box-sizing: border-box; }

/* Reserva anti-CLS durante la carga; el card entra dentro de este alto. */
:is(greenhouse-cta, .ghc-scope)[data-ghc-state='loading'] { min-height: var(--gh-cta-reserve); }
:is(greenhouse-cta, .ghc-scope)[data-ghc-state='dismissed'], :is(greenhouse-cta, .ghc-scope)[data-ghc-state='empty'] { display: none; }

/* ── Pares dark (TASK-1429, piso 2026): light-dark() en browsers modernos (una sola
   declaración por token, cero duplicación); el media query queda como fallback legacy.
   Los NOMBRES de token no cambian (contrato público con hosts). ─────────────── */
@supports (color: light-dark(red, blue)) {
  greenhouse-cta, .ghc-scope {
    color-scheme: light dark;
    --gh-cta-fg: light-dark(#1f2937, #e6eaf0);
    --gh-cta-fg-muted: light-dark(#55606e, #9aa6b5);
    --gh-cta-bg: light-dark(#ffffff, #10161f);
    --gh-cta-bg-soft: light-dark(#f5f7fa, #171f2b);
    --gh-cta-border: light-dark(#dde3ea, #263140);
    --gh-cta-shadow: 0 1px 2px light-dark(rgba(15, 23, 42, 0.06), rgba(0, 0, 0, 0.4));
  }

  greenhouse-cta[data-color-scheme='light'], .ghc-scope[data-color-scheme='light'] { color-scheme: light; }
}

/* Fallback legacy (sin light-dark): dark por media query, igual que TASK-1340. */
@supports not (color: light-dark(red, blue)) {
  @media (prefers-color-scheme: dark) {
    greenhouse-cta:not([data-color-scheme='light']), .ghc-scope:not([data-color-scheme='light']) {
      --gh-cta-fg: #e6eaf0;
      --gh-cta-fg-muted: #9aa6b5;
      --gh-cta-bg: #10161f;
      --gh-cta-bg-soft: #171f2b;
      --gh-cta-border: #263140;
      --gh-cta-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
  }
}

/* ── Card base ───────────────────────────────────────────────────────── */
:is(greenhouse-cta, .ghc-scope) .ghc-card {
  position: relative;
  display: grid;
  gap: var(--gh-cta-gap);
  padding: var(--gh-cta-pad);
  background: var(--gh-cta-bg);
  border: 1px solid var(--gh-cta-border);
  border-radius: var(--gh-cta-radius);
  box-shadow: var(--gh-cta-shadow);
  overflow: hidden;
}

:is(greenhouse-cta, .ghc-scope)[data-appearance='bare'] .ghc-card {
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
}

/* Entrada: opacity + translateY corto DENTRO del alto reservado (CLS = 0). */
:is(greenhouse-cta, .ghc-scope) .ghc-card { animation: ghc-enter var(--gh-cta-motion-duration) var(--gh-cta-motion-ease) both; }
@keyframes ghc-enter { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* ── Contenido ───────────────────────────────────────────────────────── */
:is(greenhouse-cta, .ghc-scope) .ghc-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gh-cta-accent);
  background: color-mix(in srgb, var(--gh-cta-accent) 10%, transparent);
  border-radius: 999px;
  padding: 4px 10px;
}

:is(greenhouse-cta, .ghc-scope) .ghc-headline {
  margin: 0;
  font-size: clamp(1.1rem, 2.6cqi + 0.8rem, 1.45rem);
  line-height: 1.25;
  font-weight: 700;
  color: var(--gh-cta-fg);
  text-wrap: balance;
}

:is(greenhouse-cta, .ghc-scope) .ghc-body {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--gh-cta-fg-muted);
  max-width: 60ch;
  text-wrap: pretty;
}

:is(greenhouse-cta, .ghc-scope) .ghc-footnote {
  margin: 0;
  font-size: 0.78rem;
  color: var(--gh-cta-fg-muted);
}

:is(greenhouse-cta, .ghc-scope) .ghc-visual {
  display: none;
  max-width: 100%;
  border-radius: calc(var(--gh-cta-radius) - 4px);
  object-fit: cover;
}

/* ── Acciones ────────────────────────────────────────────────────────── */
:is(greenhouse-cta, .ghc-scope) .ghc-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

:is(greenhouse-cta, .ghc-scope) .ghc-primary {
  appearance: none;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--gh-cta-accent-contrast);
  background: var(--gh-cta-accent);
  border-radius: calc(var(--gh-cta-radius) - 4px);
  padding: 12px 20px;
  min-height: 44px;
  width: 100%;
  transition: filter var(--gh-cta-motion-duration) var(--gh-cta-motion-ease),
    transform var(--gh-cta-motion-duration) var(--gh-cta-motion-ease),
    box-shadow var(--gh-cta-motion-duration) var(--gh-cta-motion-ease);
}

:is(greenhouse-cta, .ghc-scope) .ghc-primary:hover { filter: brightness(1.08); box-shadow: var(--gh-cta-shadow-lift); }
:is(greenhouse-cta, .ghc-scope) .ghc-primary:active { transform: translateY(1px); }

/* Ramp de hover perceptualmente uniforme (TASK-1429): color-mix en OKLCH reemplaza el
   filter en browsers modernos — SOLO en la variante filled default (spotlight/minimal
   tienen su propia semántica de hover). Fallback legacy: el filter de arriba. */
@supports (color: color-mix(in oklch, red, white)) {
  :is(greenhouse-cta, .ghc-scope):not([data-ghc-variant='spotlight']):not([data-ghc-variant='minimal']) .ghc-primary:hover {
    filter: none;
    background: color-mix(in oklch, var(--gh-cta-accent) 86%, white);
  }
}

/* Press con sensación física (TASK-1429, motion doc): linear() SOLO en transform. */
@supports (transition-timing-function: linear(0, 1)) {
  :is(greenhouse-cta, .ghc-scope) .ghc-primary {
    --gh-cta-motion-spring: linear(0, 0.7 40%, 1.04 70%, 1);
    transition: filter var(--gh-cta-motion-duration) var(--gh-cta-motion-ease),
      box-shadow var(--gh-cta-motion-duration) var(--gh-cta-motion-ease),
      transform calc(var(--gh-cta-motion-duration) * 0.8) var(--gh-cta-motion-spring);
  }
}
:is(greenhouse-cta, .ghc-scope) .ghc-primary:focus-visible {
  outline: 2px solid var(--gh-cta-focus);
  outline-offset: 2px;
}
:is(greenhouse-cta, .ghc-scope) .ghc-primary[disabled] { opacity: 0.7; cursor: progress; }

:is(greenhouse-cta, .ghc-scope) .ghc-dismiss {
  appearance: none;
  position: absolute;
  top: 10px;
  right: 10px;
  border: 0;
  cursor: pointer;
  width: 28px;
  height: 28px;
  min-width: 24px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1rem;
  line-height: 1;
  color: var(--gh-cta-fg-muted);
  background: transparent;
  transition: background var(--gh-cta-motion-duration) var(--gh-cta-motion-ease),
    color var(--gh-cta-motion-duration) var(--gh-cta-motion-ease);
}

:is(greenhouse-cta, .ghc-scope) .ghc-dismiss:hover { background: var(--gh-cta-bg-soft); color: var(--gh-cta-fg); }
:is(greenhouse-cta, .ghc-scope) .ghc-dismiss:focus-visible {
  outline: 2px solid var(--gh-cta-focus);
  outline-offset: 2px;
}

/* ── Layout ancho (container query): visual lateral + CTA en línea ───── */
@container (min-width: 560px) {
  :is(greenhouse-cta, .ghc-scope) .ghc-card { grid-template-columns: 1fr auto; align-items: center; column-gap: calc(var(--gh-cta-gap) * 2); }
  :is(greenhouse-cta, .ghc-scope) .ghc-content { grid-column: 1; }
  :is(greenhouse-cta, .ghc-scope) .ghc-actions { grid-column: 2; margin-top: 0; }
  :is(greenhouse-cta, .ghc-scope) .ghc-primary { width: auto; }
  :is(greenhouse-cta, .ghc-scope)[data-ghc-has-visual='true'] .ghc-card { grid-template-columns: 96px 1fr auto; }
  :is(greenhouse-cta, .ghc-scope)[data-ghc-has-visual='true'] .ghc-visual { display: block; width: 96px; height: 96px; }
}

/* inline_banner: énfasis horizontal full-width con fondo suave. */
:is(greenhouse-cta, .ghc-scope)[data-ghc-placement='inline_banner'] .ghc-card { background: var(--gh-cta-bg-soft); }

/* ── Style variants (data-ghc-variant, del contrato) ─────────────────── */

/* spotlight: alto impacto — gradiente de marca, texto claro, sombra elevada. */
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-card {
  background: linear-gradient(135deg, var(--gh-cta-accent) 0%, var(--gh-cta-accent-2) 100%);
  border-color: transparent;
  box-shadow: var(--gh-cta-shadow-lift);
}
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-headline { color: var(--gh-cta-accent-contrast); }
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-body,
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-footnote { color: color-mix(in srgb, var(--gh-cta-accent-contrast) 82%, transparent); }
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-eyebrow {
  color: var(--gh-cta-accent-contrast);
  background: color-mix(in srgb, var(--gh-cta-accent-contrast) 16%, transparent);
}
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-primary {
  color: var(--gh-cta-accent);
  background: var(--gh-cta-accent-contrast);
}
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-dismiss { color: color-mix(in srgb, var(--gh-cta-accent-contrast) 75%, transparent); }
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='spotlight'] .ghc-dismiss:hover { background: color-mix(in srgb, var(--gh-cta-accent-contrast) 14%, transparent); color: var(--gh-cta-accent-contrast); }

/* minimal: editorial — sin card chrome, CTA como link con flecha. */
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='minimal'] .ghc-card { background: transparent; border: 0; box-shadow: none; padding: 8px 0; }
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='minimal'] .ghc-primary {
  background: transparent;
  color: var(--gh-cta-accent);
  padding: 8px 4px;
  min-height: 44px;
  width: auto;
  text-decoration: underline;
  text-underline-offset: 4px;
}
:is(greenhouse-cta, .ghc-scope)[data-ghc-variant='minimal'] .ghc-primary:hover { filter: none; box-shadow: none; text-decoration-thickness: 2px; }

/* ── Form montado por open_growth_form ───────────────────────────────── */
:is(greenhouse-cta, .ghc-scope) .ghc-form-slot { display: grid; gap: var(--gh-cta-gap); }
:is(greenhouse-cta, .ghc-scope)[data-ghc-state='form_open'] .ghc-actions .ghc-primary { display: none; }

/* ══ Slide-in interruptivo (TASK-1429) — shell fijo no modal ═══════════
   Geometría del PLACEMENT (nunca del appearance): edge-aligned en wide,
   bottom + safe-area en compact. Density full|condensed|peek por container
   query del PROPIO shell. Enter/exit con @starting-style + allow-discrete:
   el estado jamás depende de animationend (motion doc TASK-1429). */
:is(greenhouse-cta, .ghc-scope).ghc-slidein {
  position: fixed;
  z-index: var(--gh-cta-z);
  inset-inline-end: 24px;
  inset-inline-start: auto;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  width: min(420px, calc(100vw - 48px));
  margin: 0;
  --ghc-slidein-shift: 20px 0;
}

:is(greenhouse-cta, .ghc-scope).ghc-slidein[data-ghc-state='waiting'] { display: none; }

:is(greenhouse-cta, .ghc-scope).ghc-slidein {
  transition:
    display var(--gh-cta-motion-duration) allow-discrete,
    opacity var(--gh-cta-motion-duration) var(--gh-cta-motion-ease),
    translate var(--gh-cta-motion-duration) var(--gh-cta-motion-ease);
}

/* Entrada desde el borde lógico (wide) / desde abajo (compact). */
@starting-style {
  :is(greenhouse-cta, .ghc-scope).ghc-slidein[data-ghc-state='visible'],
  :is(greenhouse-cta, .ghc-scope).ghc-slidein[data-ghc-state='form_open'] {
    opacity: 0;
    translate: var(--ghc-slidein-shift);
  }
}

/* Salida inversa breve: la persistencia YA ocurrió; display:none llega al final
   de la transición (allow-discrete) sin listeners JS. */
:is(greenhouse-cta, .ghc-scope).ghc-slidein[data-ghc-state='dismissed'] {
  display: none;
  opacity: 0;
  translate: var(--ghc-slidein-shift);
}

:is(greenhouse-cta, .ghc-scope).ghc-slidein .ghc-card {
  animation: none;
  box-shadow: var(--gh-cta-shadow-lift);
  max-height: min(70vh, 560px);
  overflow: auto;
  overscroll-behavior: contain;
}

/* Dismiss del interruptivo: target táctil pleno (wireframe a11y ≥44px). */
:is(greenhouse-cta, .ghc-scope).ghc-slidein .ghc-dismiss { width: 44px; height: 44px; top: 4px; right: 4px; }

/* Compact (viewport angosto): panel inferior dentro de safe areas, nunca un
   falso modal full-screen. */
@media (max-width: 719px) {
  :is(greenhouse-cta, .ghc-scope).ghc-slidein {
    inset-inline: 12px;
    width: auto;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    --ghc-slidein-shift: 0 16px;
  }
}

/* ── Density del slide-in (container del propio shell; wireframe skeletons) ──
   peek (<400px): headline + acción + dismiss — composición real, no clipping.
   condensed (400-559px): + body esencial. full (≥560px): + footnote/visual
   (heredado de las reglas ≥560 existentes). El orden semántico nunca cambia. */
@container (max-width: 559px) {
  :is(greenhouse-cta, .ghc-scope).ghc-slidein .ghc-footnote { display: none; }
}

@container (max-width: 399px) {
  :is(greenhouse-cta, .ghc-scope).ghc-slidein .ghc-body { display: none; }
}

/* ── Skeleton (anti-CLS) ─────────────────────────────────────────────── */
:is(greenhouse-cta, .ghc-scope) .ghc-skeleton {
  display: grid;
  gap: 10px;
  padding: var(--gh-cta-pad);
  border: 1px solid var(--gh-cta-border);
  border-radius: var(--gh-cta-radius);
  min-height: calc(var(--gh-cta-reserve) - 2px);
}
:is(greenhouse-cta, .ghc-scope) .ghc-skeleton-row {
  height: 16px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--gh-cta-border) 0%, var(--gh-cta-bg-soft) 50%, var(--gh-cta-border) 100%);
  background-size: 200% 100%;
  animation: ghc-shimmer 1.4s ease-in-out infinite;
  opacity: 0.55;
}
:is(greenhouse-cta, .ghc-scope) .ghc-skeleton-row:nth-child(1) { width: 34%; height: 22px; }
:is(greenhouse-cta, .ghc-scope) .ghc-skeleton-row:nth-child(2) { width: 82%; }
:is(greenhouse-cta, .ghc-scope) .ghc-skeleton-row:nth-child(3) { width: 46%; height: 36px; border-radius: 10px; }
@keyframes ghc-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.ghc-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ── Reduced motion: estado final directo, cero transform/animación ──── */
@media (prefers-reduced-motion: reduce) {
  :is(greenhouse-cta, .ghc-scope) .ghc-card { animation: none; }
  :is(greenhouse-cta, .ghc-scope) .ghc-skeleton-row { animation: none; }
  :is(greenhouse-cta, .ghc-scope) .ghc-primary, :is(greenhouse-cta, .ghc-scope) .ghc-dismiss { transition: none; }
  /* Slide-in: sin travel — aparece/desaparece en estado final (semántica intacta). */
  :is(greenhouse-cta, .ghc-scope).ghc-slidein { transition: none; translate: none; }
}

/* ── Forced colors (Windows high contrast) ───────────────────────────── */
@media (forced-colors: active) {
  :is(greenhouse-cta, .ghc-scope) .ghc-card { border: 1px solid CanvasText; }
  :is(greenhouse-cta, .ghc-scope) .ghc-primary { border: 1px solid ButtonText; }
  :is(greenhouse-cta, .ghc-scope).ghc-slidein .ghc-card { border: 1px solid CanvasText; }
}
`

/** Inyección idempotente del CSS en el documento del host. */
export const ensureStylesInjected = (doc: Document): void => {
  if (doc.getElementById(RENDERER_STYLE_ID)) return

  const style = doc.createElement('style')

  style.id = RENDERER_STYLE_ID
  style.textContent = RENDERER_CSS
  doc.head.appendChild(style)
}
