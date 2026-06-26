/**
 * TASK-1231 — Growth Forms portable renderer · CSS portable (skill `modern-ui` + `a11y`).
 *
 * Light DOM: estilos scopeados bajo el tag `greenhouse-form` + prefijo `.ghf-`. NO se
 * usa `@layer` a propósito: en light DOM una capa nombrada queda POR DEBAJO de los
 * resets globales sin-capa del host (MUI/Vuexy `input{}`, etc.) y el host gana — los
 * inputs perdían su borde en el preview Greenhouse. Con selectores scopeados
 * `greenhouse-form .ghf-*` (specificity > `input`) el widget gana sobre los resets
 * genéricos del host (robustez en hosts hostiles), y el host sigue pudiendo
 * personalizar vía los tokens `--ghf-*` (custom properties) o un selector más
 * específico a propósito. Tokens = CSS custom properties `--ghf-*` (NUNCA hex inline);
 * el host las sobreescribe para mapear marca Efeonce/AXIS. Container queries (no @media)
 * para el layout interno → "Adaptive density / The Seam". Dark mode por
 * `prefers-color-scheme`. Focus visible con `outline` (sobrevive forced-colors). Targets ≥24px.
 */
export const RENDERER_STYLE_ID = 'greenhouse-form-styles'

export const RENDERER_CSS = `
  greenhouse-form, .ghf-scope {
    --ghf-font: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --ghf-accent: #10162b;
    --ghf-accent-contrast: #ffffff;
    --ghf-fg: #1a1f2b;
    --ghf-muted: #5b6472;
    --ghf-bg: #ffffff;
    --ghf-field-bg: #ffffff;
    /* Border ≥3:1 vs field bg (WCAG 1.4.11 UI component boundary). */
    --ghf-border: #868c98;
    --ghf-border-strong: #5b6472;
    --ghf-error: #b32338;
    --ghf-error-bg: #fdecef;
    --ghf-radius: 8px;
    --ghf-gap: 16px;
    --ghf-focus: #2563eb;

    display: block;
    container-type: inline-size;
    font-family: var(--ghf-font);
    color: var(--ghf-fg);
    background: var(--ghf-bg);
    -webkit-text-size-adjust: 100%;
  }

  @media (prefers-color-scheme: dark) {
    greenhouse-form:not([data-color-scheme="light"]), .ghf-scope:not([data-color-scheme="light"]) {
      --ghf-fg: #e8ebf0;
      --ghf-muted: #9aa3b2;
      --ghf-bg: #11151c;
      --ghf-field-bg: #181d26;
      /* Border ≥3:1 vs dark field bg (WCAG 1.4.11). */
      --ghf-border: #6b7382;
      --ghf-border-strong: #8a93a3;
      --ghf-accent: #6c8cff;
      --ghf-accent-contrast: #0b0f16;
      --ghf-error: #ff8aa0;
      --ghf-error-bg: #2a151b;
    }
  }

  greenhouse-form *,
  greenhouse-form *::before,
  greenhouse-form *::after,
  .ghf-scope *,
  .ghf-scope *::before,
  .ghf-scope *::after { box-sizing: border-box; }

  .ghf-form { display: flex; flex-direction: column; gap: var(--ghf-gap); margin: 0; }
  .ghf-fields { display: grid; grid-template-columns: 1fr; gap: var(--ghf-gap); }

  /* Adaptive density: en contenedores anchos, los campos "paired" pueden compartir fila. */
  @container (min-width: 520px) {
    .ghf-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ghf-field--full { grid-column: 1 / -1; }
  }

  .ghf-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .ghf-label { font-size: 0.875rem; font-weight: 600; line-height: 1.3; color: var(--ghf-fg); }
  .ghf-required { color: var(--ghf-error); margin-inline-start: 2px; }
  .ghf-optional { color: var(--ghf-muted); font-weight: 400; margin-inline-start: 4px; }
  .ghf-help { font-size: 0.8125rem; color: var(--ghf-muted); line-height: 1.4; }

  .ghf-input,
  .ghf-textarea,
  .ghf-select {
    font: inherit;
    color: var(--ghf-fg);
    background: var(--ghf-field-bg);
    border: 1px solid var(--ghf-border);
    border-radius: var(--ghf-radius);
    padding: 10px 12px;
    width: 100%;
    min-height: 44px;
    line-height: 1.4;
    transition: border-color 120ms ease, box-shadow 120ms ease;
  }
  .ghf-textarea { min-height: 96px; resize: vertical; }
  .ghf-input:hover,
  .ghf-textarea:hover,
  .ghf-select:hover { border-color: var(--ghf-border-strong); }

  .ghf-input:focus-visible,
  .ghf-textarea:focus-visible,
  .ghf-select:focus-visible,
  .ghf-check input:focus-visible,
  .ghf-btn:focus-visible {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 2px;
  }

  .ghf-field[data-invalid="true"] .ghf-input,
  .ghf-field[data-invalid="true"] .ghf-textarea,
  .ghf-field[data-invalid="true"] .ghf-select { border-color: var(--ghf-error); background: var(--ghf-error-bg); }

  .ghf-error {
    display: flex; align-items: flex-start; gap: 6px;
    font-size: 0.8125rem; line-height: 1.4; color: var(--ghf-error);
  }
  .ghf-error::before { content: "!"; flex: 0 0 auto; font-weight: 700; }

  /* TASK-1256 Slice 2 — verificación de correo (estado + typo-suggest). */
  .ghf-verify-status {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.8125rem; line-height: 1.4; color: var(--ghf-muted);
  }
  .ghf-verify-status::before {
    content: ""; flex: 0 0 auto; inline-size: 12px; block-size: 12px; border-radius: 50%;
    border: 2px solid var(--ghf-border); border-top-color: var(--ghf-accent);
    animation: ghf-spin 0.7s linear infinite;
  }
  .ghf-verify-suggest {
    align-self: flex-start; background: none; border: 0; padding: 2px 0;
    font: inherit; font-size: 0.8125rem; color: var(--ghf-accent);
    text-decoration: underline; cursor: pointer; min-height: 24px;
  }
  .ghf-verify-suggest:hover { color: var(--ghf-border-strong); }

  .ghf-check { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
  .ghf-check input { width: 24px; height: 24px; flex: 0 0 auto; accent-color: var(--ghf-accent); }
  .ghf-check span { font-size: 0.875rem; line-height: 1.45; }
  .ghf-check a { color: var(--ghf-accent); }

  .ghf-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .ghf-btn {
    font: inherit; font-weight: 600;
    min-height: 44px; padding: 10px 20px;
    border-radius: var(--ghf-radius); border: 1px solid transparent;
    cursor: pointer;
    background: var(--ghf-accent); color: var(--ghf-accent-contrast);
  }
  .ghf-btn[aria-disabled="true"] { opacity: 0.7; cursor: progress; }
  .ghf-btn--ghost { background: transparent; color: var(--ghf-accent); border-color: var(--ghf-border-strong); }

  .ghf-summary { color: var(--ghf-error); font-size: 0.875rem; }
  .ghf-progress { font-size: 0.8125rem; color: var(--ghf-muted); font-weight: 600; }

  .ghf-status { font-size: 0.9375rem; line-height: 1.5; }
  .ghf-status--error { color: var(--ghf-error); }

  .ghf-skeleton { display: grid; gap: var(--ghf-gap); }
  .ghf-skeleton-row { height: 64px; border-radius: var(--ghf-radius); background: var(--ghf-error-bg); background:
    linear-gradient(90deg, var(--ghf-border) 0%, var(--ghf-field-bg) 50%, var(--ghf-border) 100%);
    background-size: 200% 100%; animation: ghf-shimmer 1.4s ease-in-out infinite; opacity: 0.5; }
  .ghf-skeleton-row:nth-child(1) { width: 60%; height: 28px; }

  .ghf-honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }

  @keyframes ghf-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @keyframes ghf-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    greenhouse-form *, greenhouse-form *::before, greenhouse-form *::after,
    .ghf-scope *, .ghf-scope *::before, .ghf-scope *::after {
      animation-duration: 0.001ms !important; transition-duration: 0.001ms !important;
    }
  }

  @media (forced-colors: active) {
    .ghf-input, .ghf-textarea, .ghf-select { border-color: ButtonText; }
    .ghf-btn { border-color: ButtonText; }
    .ghf-field[data-invalid="true"] .ghf-input { border-color: Mark; }
  }
`

/** Inyecta el CSS una sola vez en el documento host (idempotente). */
export const ensureStylesInjected = (doc: Document = document): void => {
  if (doc.getElementById(RENDERER_STYLE_ID)) return
  const style = doc.createElement('style')

  style.id = RENDERER_STYLE_ID
  style.textContent = RENDERER_CSS
  doc.head.appendChild(style)
}
