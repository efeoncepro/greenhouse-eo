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
    --ghf-success: #1f9d57;
    --ghf-celebration: #ffb703;
    --ghf-radius: 8px;
    --ghf-gap: 16px;
    --ghf-focus: #2563eb;
    --ghf-field-shadow: 0 1px 2px rgba(16, 22, 43, 0.04);
    --ghf-field-shadow-focus: 0 0 0 4px rgba(37, 99, 235, 0.14);
    --ghf-action-shadow: 0 10px 24px rgba(16, 22, 43, 0.10);
    --ghf-action-shadow-hover: 0 14px 30px rgba(16, 22, 43, 0.14);

    display: block;
    container-type: inline-size;
    font-family: var(--ghf-font);
    color: var(--ghf-fg);
    background: var(--ghf-bg);
    -webkit-text-size-adjust: 100%;
  }

  [data-ghf-style-variant="diagnostic_premium"] {
    --ghf-accent: #36c8bf;
    --ghf-accent-contrast: #052b42;
    --ghf-fg: #101827;
    --ghf-muted: #68758a;
    --ghf-field-bg: #ffffff;
    --ghf-border: #d9e4ee;
    --ghf-border-strong: #9fb0c4;
    --ghf-error: #a73b2e;
    --ghf-error-bg: #fff7f5;
    --ghf-success: #17885f;
    --ghf-celebration: #ffb703;
    --ghf-radius: 12px;
    --ghf-gap: 18px;
    --ghf-focus: #24b8b0;
    --ghf-field-shadow: 0 1px 0 rgba(16, 24, 39, 0.02), 0 10px 26px rgba(16, 24, 39, 0.035);
    --ghf-field-shadow-focus: 0 0 0 4px rgba(54, 200, 191, 0.18), 0 14px 34px rgba(16, 24, 39, 0.07);
    --ghf-action-shadow: 0 16px 34px rgba(54, 200, 191, 0.28), 0 2px 8px rgba(5, 43, 66, 0.08);
    --ghf-action-shadow-hover: 0 20px 44px rgba(54, 200, 191, 0.34), 0 4px 12px rgba(5, 43, 66, 0.10);
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
      --ghf-success: #34d399;
      --ghf-celebration: #ffd166;
      --ghf-field-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
      --ghf-field-shadow-focus: 0 0 0 4px rgba(108, 140, 255, 0.18);
      --ghf-action-shadow: 0 10px 24px rgba(0, 0, 0, 0.34);
      --ghf-action-shadow-hover: 0 14px 30px rgba(0, 0, 0, 0.42);
    }
  }

  /* TASK-1297 — appearance="bare" (chromeless): el renderer no dibuja card; este modo
     neutraliza el único fill (--ghf-bg) para integrarlo dentro de una card del host sin
     card-on-card. Afford­ance transversal: cualquier host opta sin escribir CSS scoped. */
  greenhouse-form[data-appearance="bare"],
  .ghf-scope[data-appearance="bare"] { --ghf-bg: transparent; background: transparent; }

  greenhouse-form *,
  greenhouse-form *::before,
  greenhouse-form *::after,
  .ghf-scope *,
  .ghf-scope *::before,
  .ghf-scope *::after { box-sizing: border-box; }

  .ghf-form { display: flex; flex-direction: column; gap: var(--ghf-gap); margin: 0; }
  .ghf-fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--ghf-gap);
    transform-origin: 50% 0%;
    animation: ghf-step-surface-in 200ms cubic-bezier(0.2, 0, 0, 1);
  }
  .ghf-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Adaptive density: en contenedores anchos, los campos "paired" pueden compartir fila. */
  @container (min-width: 520px) {
    .ghf-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ghf-field--full { grid-column: 1 / -1; }
  }

  .ghf-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; position: relative; z-index: 0; }
  .ghf-field:focus-within { z-index: 40; }
  .ghf-field[data-overlay-open="true"] { z-index: 80; }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-field { gap: 8px; }
  .ghf-label { display: inline-flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; line-height: 1.3; color: var(--ghf-fg); }
  .ghf-field-icon {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    inline-size: 22px;
    block-size: 22px;
    border: 1px solid color-mix(in srgb, var(--ghf-border) 72%, transparent);
    border-radius: 999px;
    color: var(--ghf-muted);
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
  }
  .ghf-required { color: var(--ghf-error); margin-inline-start: 2px; }
  .ghf-optional { color: var(--ghf-muted); font-weight: 400; margin-inline-start: 4px; }
  .ghf-help { font-size: 0.8125rem; color: var(--ghf-muted); line-height: 1.4; }
  .ghf-help a {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    color: var(--ghf-accent);
    border-radius: 6px;
    text-decoration: none;
    transition: color 140ms ease, background-color 140ms ease;
  }
  .ghf-help a:hover {
    color: color-mix(in srgb, var(--ghf-accent) 74%, var(--ghf-fg));
    background-color: transparent;
    text-decoration: none;
  }
  .ghf-help a:focus-visible {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 3px;
    text-decoration: none;
  }

  .ghf-input,
  .ghf-textarea,
  .ghf-select,
  .ghf-file-input {
    font: inherit;
    color: var(--ghf-fg);
    background: var(--ghf-field-bg);
    border: 1px solid var(--ghf-border);
    border-radius: var(--ghf-radius);
    padding: 10px 12px;
    width: 100%;
    min-height: 44px;
    line-height: 1.4;
    box-shadow: var(--ghf-field-shadow);
    transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease, background-color 140ms ease;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-input,
  [data-ghf-style-variant="diagnostic_premium"] .ghf-textarea,
  [data-ghf-style-variant="diagnostic_premium"] .ghf-select,
  [data-ghf-style-variant="diagnostic_premium"] .ghf-file-input {
    min-height: 52px;
    padding: 14px 16px;
    border-radius: var(--ghf-radius);
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-select { padding-inline-end: 44px; }
  .ghf-textarea { min-height: 96px; resize: vertical; }
  .ghf-select { appearance: none; }
  .ghf-input:hover,
  .ghf-textarea:hover,
  .ghf-select:hover,
  .ghf-file-input:hover { border-color: var(--ghf-border-strong); }

  .ghf-input:focus-visible,
  .ghf-textarea:focus-visible,
  .ghf-select:focus-visible,
  .ghf-file-input:focus-visible,
  .ghf-tel-country:focus-visible,
  .ghf-btn:focus-visible {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 2px;
  }
  .ghf-input:focus-visible,
  .ghf-textarea:focus-visible,
  .ghf-select:focus-visible,
  .ghf-file-input:focus-visible,
  .ghf-tag-input:focus-within {
    box-shadow: var(--ghf-field-shadow-focus);
  }

  .ghf-field[data-invalid="true"] .ghf-input,
  .ghf-field[data-invalid="true"] .ghf-textarea,
  .ghf-field[data-invalid="true"] .ghf-select,
  .ghf-field[data-invalid="true"] .ghf-file-input,
  .ghf-field[data-invalid="true"] .ghf-tag-input {
    border-color: var(--ghf-error);
    background: var(--ghf-field-bg);
    box-shadow: 0 0 0 3px rgba(179, 35, 56, 0.10);
  }

  .ghf-error {
    display: flex; align-items: flex-start; gap: 6px;
    font-size: 0.8125rem; line-height: 1.4; color: var(--ghf-error);
  }
  .ghf-error::before { content: "!"; flex: 0 0 auto; font-weight: 700; }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-error {
    gap: 8px;
    color: var(--ghf-error);
    font-weight: 600;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-error::before {
    display: inline-grid;
    place-items: center;
    inline-size: 16px;
    block-size: 16px;
    border-radius: 999px;
    color: var(--ghf-error);
    background: var(--ghf-error-bg);
    font-size: 0.6875rem;
    line-height: 1;
  }

  /* TASK-1256 Slice 1c — estado reactivo: ✓ verde al validar (reward early). */
  .ghf-control { position: relative; display: block; min-width: 0; }
  .ghf-control-icon {
    position: absolute;
    inset-inline-start: 14px;
    top: 50%;
    z-index: 1;
    display: inline-grid;
    place-items: center;
    inline-size: 18px;
    block-size: 18px;
    color: var(--ghf-muted);
    pointer-events: none;
    transform: translateY(-50%);
  }
  .ghf-control-icon svg,
  .ghf-file-dropzone-icon svg,
  .ghf-btn-icon svg {
    display: block;
    inline-size: 1em;
    block-size: 1em;
    stroke: currentColor;
  }
  .ghf-control-icon .ghf-icon-text,
  .ghf-file-dropzone-icon .ghf-icon-text {
    font-size: 0.75em;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1;
  }
  .ghf-control--with-icon .ghf-input,
  .ghf-control--with-icon .ghf-select,
  .ghf-control--with-icon .ghf-textarea {
    padding-inline-start: 44px;
  }
  .ghf-control--textarea .ghf-control-icon {
    top: 16px;
    transform: none;
  }
  .ghf-status-icon { position: absolute; right: 12px; top: 22px; pointer-events: none; display: none; line-height: 1; }
  .ghf-select-icon {
    position: absolute;
    inset-inline-end: 16px;
    top: 50%;
    inline-size: 9px;
    block-size: 9px;
    border-inline-end: 2px solid var(--ghf-muted);
    border-block-end: 2px solid var(--ghf-muted);
    pointer-events: none;
    transform: translateY(-65%) rotate(45deg);
    transition: transform 140ms ease, border-color 140ms ease;
  }
  .ghf-control--select:focus-within > .ghf-select-icon {
    border-color: var(--ghf-accent);
    transform: translateY(-45%) rotate(45deg);
  }
  .ghf-select-composite {
    position: relative;
    min-width: 0;
  }
  .ghf-select-composite[data-open="true"] {
    z-index: 1;
  }
  .ghf-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: start;
    cursor: pointer;
  }
  .ghf-select-trigger .ghf-select-icon {
    position: static;
    flex: 0 0 auto;
    inline-size: 18px;
    block-size: 18px;
    display: grid;
    place-items: center;
    border: 0;
    transform: none;
    margin: 0;
  }
  .ghf-select-trigger .ghf-select-icon::before {
    content: "";
    inline-size: 8px;
    block-size: 8px;
    border-inline-end: 2px solid var(--ghf-muted);
    border-block-end: 2px solid var(--ghf-muted);
    transform: translateY(-2px) rotate(45deg);
    transition: transform 140ms ease, border-color 140ms ease;
  }
  .ghf-select-composite[data-open="true"] .ghf-select-trigger {
    border-color: var(--ghf-focus);
    box-shadow: var(--ghf-field-shadow-focus);
  }
  .ghf-select-composite[data-open="true"] .ghf-select-icon {
    border-color: transparent;
  }
  .ghf-select-composite[data-open="true"] .ghf-select-icon::before {
    border-color: var(--ghf-accent);
    transform: translateY(2px) rotate(225deg);
  }
  .ghf-select-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ghf-select-trigger[data-placeholder="true"] .ghf-select-value {
    color: var(--ghf-muted);
  }
  .ghf-select-list {
    position: absolute;
    z-index: 90;
    inset-inline: 0;
    top: calc(100% + 8px);
    display: grid;
    gap: 4px;
    max-height: 280px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid var(--ghf-border);
    border-radius: var(--ghf-radius);
    background: var(--ghf-field-bg);
    box-shadow: 0 24px 56px rgba(16, 24, 39, 0.16), 0 4px 14px rgba(16, 24, 39, 0.08);
  }
  .ghf-select-list[hidden] { display: none; }
  .ghf-select-option {
    position: relative;
    min-height: 40px;
    display: flex;
    align-items: center;
    padding: 9px 12px 9px 34px;
    border-radius: 9px;
    color: var(--ghf-fg);
    font-size: 0.9375rem;
    line-height: 1.25;
    cursor: pointer;
    user-select: none;
    transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;
  }
  .ghf-select-option::before {
    content: "";
    position: absolute;
    inset-inline-start: 12px;
    color: var(--ghf-accent);
    font-weight: 800;
  }
  .ghf-select-option[aria-selected="true"]::before { content: "✓"; }
  .ghf-select-option:hover,
  .ghf-select-option[data-active="true"] {
    background: rgba(54, 200, 191, 0.12);
    color: var(--ghf-fg);
  }
  .ghf-select-option[aria-selected="true"] {
    background: rgba(54, 200, 191, 0.18);
    color: var(--ghf-fg);
    font-weight: 700;
  }

  .ghf-file { display: grid; gap: 6px; min-width: 0; }
  .ghf-file-input::file-selector-button {
    margin-inline-end: 12px;
    border: 1px solid var(--ghf-border);
    border-radius: calc(var(--ghf-radius) - 2px);
    background: color-mix(in srgb, var(--ghf-accent) 8%, var(--ghf-field-bg));
    color: var(--ghf-fg);
    font: inherit;
    font-weight: 700;
    padding: 7px 10px;
  }
  .ghf-file-status {
    margin: 0;
    color: var(--ghf-muted);
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .ghf-tag-input {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 44px;
    width: 100%;
    padding: 8px 10px;
    color: var(--ghf-fg);
    background: var(--ghf-field-bg);
    border: 1px solid var(--ghf-border);
    border-radius: var(--ghf-radius);
    box-shadow: var(--ghf-field-shadow);
    transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-tag-input {
    min-height: 52px;
    padding: 10px 12px;
    border-radius: var(--ghf-radius);
  }
  .ghf-tag-input:hover { border-color: var(--ghf-border-strong); }
  .ghf-tag-list { display: contents; }
  .ghf-tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-height: 32px;
    padding: 5px 6px 5px 11px;
    border: 1px solid color-mix(in srgb, var(--ghf-accent) 36%, var(--ghf-border));
    border-radius: 999px;
    color: color-mix(in srgb, var(--ghf-fg) 86%, var(--ghf-accent));
    background: color-mix(in srgb, var(--ghf-accent) 9%, var(--ghf-field-bg));
    font-size: 0.875rem;
    line-height: 1.2;
  }
  .ghf-tag-label {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .ghf-tag-remove {
    display: inline-grid;
    place-items: center;
    inline-size: 24px;
    block-size: 24px;
    border: 0;
    border-radius: 999px;
    color: var(--ghf-muted);
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 1rem;
    line-height: 1;
    transition: color 140ms ease, background-color 140ms ease, transform 140ms ease;
  }
  .ghf-tag-remove:hover {
    color: var(--ghf-fg);
    background: color-mix(in srgb, var(--ghf-accent) 14%, transparent);
  }
  .ghf-tag-remove:focus-visible {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 2px;
  }
  .ghf-tag-entry {
    flex: 1 1 12rem;
    min-width: min(100%, 12rem);
    min-height: 32px;
    padding: 4px 2px;
    border: 0;
    outline: 0;
    color: var(--ghf-fg);
    background: transparent;
    font: inherit;
    line-height: 1.4;
  }
  .ghf-tag-entry::placeholder {
    color: color-mix(in srgb, var(--ghf-muted) 78%, transparent);
  }
  .ghf-tag-entry:disabled { cursor: not-allowed; }

  .ghf-field[data-status="success"] .ghf-status-icon { display: block; color: var(--ghf-success); }
  .ghf-field[data-status="success"] .ghf-status-icon::before { content: "✓"; font-weight: 700; }
  .ghf-field[data-status="success"] .ghf-input { border-color: var(--ghf-success); padding-right: 36px; }

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

  /* TASK-1256 Slice 1d — resumen de errores accesible (patrón GOV.UK). */
  .ghf-error-summary {
    border: 1px solid var(--ghf-error); border-inline-start-width: 4px;
    border-radius: var(--ghf-radius); background: var(--ghf-error-bg);
    padding: 12px 16px; display: grid; gap: 8px;
  }
  .ghf-error-summary:focus-visible { outline: 2px solid var(--ghf-focus); outline-offset: 2px; }
  .ghf-error-summary-title { margin: 0; font-weight: 700; color: var(--ghf-error); font-size: 0.9375rem; }
  .ghf-error-summary-list { margin: 0; padding-inline-start: 18px; display: grid; gap: 4px; }
  .ghf-error-summary-list a { color: var(--ghf-error); text-underline-offset: 2px; }

  /* TASK-1256 Slice 1d — hint "listo para enviar / faltan N". */
  .ghf-actions-wrap { display: grid; gap: 10px; min-width: 0; }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-actions-wrap { justify-items: center; }
  .ghf-readiness {
    width: fit-content;
    max-width: 100%;
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--ghf-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
  }
  .ghf-readiness:empty { display: none; }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-readiness {
    width: min(100%, 420px);
    margin-inline: auto;
    justify-self: center;
  }
  .ghf-readiness[data-ready="true"] { color: var(--ghf-success); font-weight: 650; }
  .ghf-readiness[data-ready="true"]::before { content: "✓"; font-weight: 700; }

  /* TASK-1256 Slice 1d — contador de caracteres. */
  .ghf-counter { margin: 2px 0 0; font-size: 0.75rem; color: var(--ghf-muted); text-align: end; }
  .ghf-counter[data-near="true"] { color: var(--ghf-error); }

  /* TASK-1256 Slice 1d — aviso de borrador recuperado. */
  .ghf-draft-note { margin: 0; font-size: 0.8125rem; color: var(--ghf-muted); display: flex; align-items: center; gap: 6px; }
  .ghf-draft-note::before { content: "↩"; flex: 0 0 auto; }

  /* TASK-1256 Slice 1d — micro-motion (neutralizado por el bloque reduced-motion global). */
  .ghf-field[data-status="success"] .ghf-status-icon { animation: ghf-pop 180ms ease-out; }
  .ghf-error { animation: ghf-fade 160ms ease-out; }

  /* TASK-1256 — teléfono internacional: selector de país + input nacional. */
  .ghf-tel { display: flex; align-items: stretch; gap: 8px; min-width: 0; }
  .ghf-tel-country {
    font: inherit; color: var(--ghf-fg); background: var(--ghf-field-bg);
    border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
    padding: 10px 8px; min-height: 44px; flex: 0 0 auto; max-width: 9.5rem; cursor: pointer;
  }
  .ghf-tel-country:hover { border-color: var(--ghf-border-strong); }
  .ghf-tel-input { flex: 1 1 auto; min-width: 0; }
  .ghf-tel-input-shell { position: relative; display: block; flex: 1 1 auto; min-width: 0; }
  .ghf-tel-input-shell .ghf-tel-input { width: 100%; }
  .ghf-field[data-invalid="true"] .ghf-tel-country { border-color: var(--ghf-error); }

  .ghf-check {
    position: relative;
    display: flex;
    align-items: flex-start;
    min-height: 48px;
    padding: 12px 14px;
    border: 1px solid var(--ghf-border);
    border-radius: var(--ghf-radius);
    background: color-mix(in srgb, var(--ghf-field-bg) 94%, var(--ghf-accent));
    cursor: pointer;
    transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
  }
  .ghf-check:hover {
    border-color: var(--ghf-border-strong);
    background: color-mix(in srgb, var(--ghf-field-bg) 90%, var(--ghf-accent));
  }
  .ghf-check input {
    position: absolute;
    inset-block-start: 12px;
    inset-inline-start: 14px;
    z-index: 1;
    inline-size: 24px;
    block-size: 24px;
    margin: 0;
    padding: 0;
    border: 0;
    opacity: 0;
    cursor: pointer;
  }
  .ghf-check span {
    position: relative;
    min-height: 24px;
    padding-inline-start: 36px;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: var(--ghf-fg);
  }
  .ghf-check span::before {
    content: "";
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 24px;
    block-size: 24px;
    border: 1.5px solid var(--ghf-border-strong);
    border-radius: 7px;
    background: var(--ghf-field-bg);
    box-shadow: var(--ghf-field-shadow);
    transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
  }
  .ghf-check span::after {
    content: "";
    position: absolute;
    display: none;
    inset-block-start: 4px;
    inset-inline-start: 9px;
    inline-size: 6px;
    block-size: 12px;
    border: solid var(--ghf-accent-contrast);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .ghf-check input:checked + span::before {
    border-color: var(--ghf-accent);
    background: var(--ghf-accent);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--ghf-accent) 28%, transparent);
  }
  .ghf-check input:checked + span::after { display: block; }
  .ghf-check input:focus-visible + span::before {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 3px;
  }
  .ghf-check a { color: var(--ghf-accent); }

  .ghf-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-actions {
    width: min(100%, 560px);
    justify-content: center;
    align-items: center;
  }
  .ghf-btn {
    font: inherit; font-weight: 600;
    min-height: 44px; padding: 10px 20px;
    border-radius: var(--ghf-radius); border: 1px solid transparent;
    cursor: pointer;
    background: var(--ghf-accent); color: var(--ghf-accent-contrast);
    box-shadow: var(--ghf-action-shadow);
    transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease, opacity 140ms ease;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 52px;
    min-width: 0;
    padding: 13px 26px;
    font-weight: 700;
    letter-spacing: 0 !important;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn:not(.ghf-btn--ghost) {
    flex: 1 1 300px;
    max-width: 380px;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn--ghost {
    flex: 0 0 auto;
    min-width: 112px;
    box-shadow: 0 8px 18px rgba(16, 24, 39, 0.06);
  }
  .ghf-btn-arrow {
    display: inline-block;
    transform: translateX(0);
    transition: transform 140ms ease;
  }
  .ghf-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--ghf-action-shadow-hover); filter: saturate(1.04); }
  .ghf-btn:hover:not(:disabled) .ghf-btn-arrow { transform: translateX(3px); }
  .ghf-btn:active:not(:disabled) { transform: translateY(0); box-shadow: var(--ghf-action-shadow); filter: saturate(0.98); }
  .ghf-btn[aria-disabled="true"],
  .ghf-btn:disabled { opacity: 0.7; cursor: progress; }
  .ghf-btn--ghost { background: transparent; color: var(--ghf-fg); border-color: var(--ghf-border-strong); }
  .ghf-btn--skip { color: var(--ghf-fg); opacity: 0.78; border-color: transparent; box-shadow: none; }
  .ghf-btn--skip:hover:not(:disabled) { opacity: 1; color: var(--ghf-fg); border-color: var(--ghf-border); box-shadow: none; filter: none; }

  @container (max-width: 520px) {
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions {
      width: 100%;
      align-items: stretch;
    }
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn,
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn--ghost,
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn:not(.ghf-btn--ghost) {
      flex: 1 1 100%;
      width: 100%;
      max-width: none;
    }
  }

  @container (max-width: 520px) {
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions {
      width: 100%;
      align-items: stretch;
    }
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn,
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn--ghost,
    [data-ghf-style-variant="diagnostic_premium"] .ghf-actions .ghf-btn:not(.ghf-btn--ghost) {
      flex: 1 1 100%;
      width: 100%;
      max-width: none;
    }
  }

  /* TASK-1298 — hostile-host hardening.
     WordPress/Ohio can apply aggressive input/select/button declarations (including
     background images on selects and default dark button skins). These rules keep the
     portable renderer visually stable while preserving host theming through --ghf-* tokens. */
  greenhouse-form .ghf-form .ghf-input,
  greenhouse-form .ghf-form .ghf-textarea,
  greenhouse-form .ghf-form .ghf-select,
  greenhouse-form .ghf-form .ghf-tag-input,
  .ghf-scope .ghf-form .ghf-input,
  .ghf-scope .ghf-form .ghf-textarea,
  .ghf-scope .ghf-form .ghf-select,
  .ghf-scope .ghf-form .ghf-tag-input {
    font: inherit !important;
    color: var(--ghf-fg) !important;
    background: var(--ghf-field-bg) !important;
    background-color: var(--ghf-field-bg) !important;
    border: 1px solid var(--ghf-border) !important;
    box-shadow: var(--ghf-field-shadow) !important;
    letter-spacing: normal !important;
    text-transform: none !important;
  }

  greenhouse-form .ghf-form .ghf-input:focus-visible,
  greenhouse-form .ghf-form .ghf-textarea:focus-visible,
  greenhouse-form .ghf-form .ghf-select:focus-visible,
  greenhouse-form .ghf-form .ghf-tag-input:focus-within,
  .ghf-scope .ghf-form .ghf-input:focus-visible,
  .ghf-scope .ghf-form .ghf-textarea:focus-visible,
  .ghf-scope .ghf-form .ghf-select:focus-visible,
  .ghf-scope .ghf-form .ghf-tag-input:focus-within {
    box-shadow: var(--ghf-field-shadow-focus) !important;
  }

  greenhouse-form .ghf-form .ghf-field[data-invalid="true"] .ghf-input,
  greenhouse-form .ghf-form .ghf-field[data-invalid="true"] .ghf-textarea,
  greenhouse-form .ghf-form .ghf-field[data-invalid="true"] .ghf-select,
  greenhouse-form .ghf-form .ghf-field[data-invalid="true"] .ghf-tag-input,
  .ghf-scope .ghf-form .ghf-field[data-invalid="true"] .ghf-input,
  .ghf-scope .ghf-form .ghf-field[data-invalid="true"] .ghf-textarea,
  .ghf-scope .ghf-form .ghf-field[data-invalid="true"] .ghf-select,
  .ghf-scope .ghf-form .ghf-field[data-invalid="true"] .ghf-tag-input {
    border-color: var(--ghf-error) !important;
    background-color: var(--ghf-field-bg) !important;
    box-shadow: 0 0 0 3px rgba(179, 35, 56, 0.10) !important;
  }

  greenhouse-form .ghf-form .ghf-select,
  .ghf-scope .ghf-form .ghf-select,
  greenhouse-form .ghf-form .ghf-tel-country,
  .ghf-scope .ghf-form .ghf-tel-country {
    background-image: none !important;
    background-repeat: no-repeat !important;
    text-transform: none !important;
  }

  greenhouse-form .ghf-form .ghf-tag-entry,
  .ghf-scope .ghf-form .ghf-tag-entry {
    font: inherit !important;
    color: var(--ghf-fg) !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
  }

  greenhouse-form .ghf-form .ghf-btn,
  greenhouse-form .ghf-success-card .ghf-btn,
  .ghf-scope .ghf-form .ghf-btn,
  .ghf-scope .ghf-success-card .ghf-btn {
    font: inherit !important;
    font-weight: 600 !important;
    background: var(--ghf-accent) !important;
    color: var(--ghf-accent-contrast) !important;
    border-color: transparent !important;
    box-shadow: var(--ghf-action-shadow) !important;
    text-transform: none !important;
    letter-spacing: normal !important;
  }

  greenhouse-form .ghf-form .ghf-btn:hover:not(:disabled),
  greenhouse-form .ghf-success-card .ghf-btn:hover:not(:disabled),
  .ghf-scope .ghf-form .ghf-btn:hover:not(:disabled),
  .ghf-scope .ghf-success-card .ghf-btn:hover:not(:disabled) {
    box-shadow: var(--ghf-action-shadow-hover) !important;
  }

  greenhouse-form .ghf-form .ghf-btn--ghost,
  .ghf-scope .ghf-form .ghf-btn--ghost {
    background: transparent !important;
    color: var(--ghf-fg) !important;
    border-color: var(--ghf-border-strong) !important;
  }
  greenhouse-form .ghf-form .ghf-btn--skip,
  .ghf-scope .ghf-form .ghf-btn--skip {
    color: var(--ghf-fg) !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }

  .ghf-summary { color: var(--ghf-error); font-size: 0.875rem; }
  .ghf-progress-shell { display: grid; gap: 10px; min-width: 0; }
  .ghf-progress {
    font-size: 0.8125rem;
    color: var(--ghf-muted);
    font-weight: 600;
  }
  .ghf-progress:focus-visible {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 4px;
    border-radius: 8px;
  }
  .ghf-stepper { min-width: 0; }
  .ghf-stepper-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .ghf-stepper-item {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid var(--ghf-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--ghf-field-bg) 84%, transparent);
    color: var(--ghf-muted);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.2;
    transition: border-color 160ms cubic-bezier(0.2, 0, 0, 1), background-color 160ms cubic-bezier(0.2, 0, 0, 1), color 160ms cubic-bezier(0.2, 0, 0, 1), transform 160ms cubic-bezier(0.2, 0, 0, 1);
  }
  .ghf-stepper-item[data-state="current"] {
    color: var(--ghf-fg);
    border-color: color-mix(in srgb, var(--ghf-accent) 48%, var(--ghf-border));
    background: color-mix(in srgb, var(--ghf-accent) 10%, var(--ghf-field-bg));
  }
  .ghf-stepper-item[data-state="complete"] {
    color: var(--ghf-fg);
    border-color: color-mix(in srgb, var(--ghf-success) 34%, var(--ghf-border));
  }
  .ghf-stepper-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: var(--ghf-field-bg);
    color: currentColor;
    border: 1px solid currentColor;
    font-size: 0.72rem;
    font-weight: 800;
    transition: background-color 160ms cubic-bezier(0.2, 0, 0, 1), color 160ms cubic-bezier(0.2, 0, 0, 1);
  }
  .ghf-stepper-item[data-state="complete"] .ghf-stepper-marker {
    background: color-mix(in srgb, var(--ghf-success) 14%, var(--ghf-field-bg));
    color: var(--ghf-success);
  }
  .ghf-stepper-label {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  @container (max-width: 460px) {
    .ghf-stepper-list {
      grid-template-columns: repeat(auto-fit, minmax(42px, 1fr));
      gap: 6px;
    }
    .ghf-stepper-item {
      min-height: 38px;
      padding: 6px;
      border-radius: 999px;
      justify-content: center;
    }
    .ghf-stepper-label {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .ghf-stepper-marker {
      width: 24px;
      height: 24px;
    }
    .ghf-actions-wrap {
      width: 100%;
    }
    .ghf-actions {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }
    .ghf-btn,
    [data-ghf-style-variant="diagnostic_premium"] .ghf-btn {
      width: 100%;
      min-width: 0;
    }
  }
  .ghf-intake-summary {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--ghf-border) 82%, transparent);
    border-radius: var(--ghf-radius);
    background: color-mix(in srgb, var(--ghf-field-bg) 78%, transparent);
  }
  .ghf-intake-summary__title {
    margin: 0;
    color: var(--ghf-fg);
    font-size: 0.8125rem;
    font-weight: 700;
  }
  .ghf-intake-summary__meta {
    margin: 0;
    color: var(--ghf-muted);
    font-size: 0.78rem;
    line-height: 1.35;
  }
  .ghf-intake-summary__list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .ghf-intake-summary__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    max-width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--ghf-border);
    border-radius: 999px;
    color: var(--ghf-muted);
    font-size: 0.78rem;
    line-height: 1.2;
  }
  .ghf-intake-summary__item span:last-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .ghf-status { font-size: 0.9375rem; line-height: 1.5; }
  .ghf-status--success {
    border: 1px solid rgba(31, 157, 87, 0.24);
    border-radius: var(--ghf-radius);
    background: rgba(31, 157, 87, 0.08);
    color: var(--ghf-fg);
    padding: 14px 16px;
    font-weight: 600;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-status--success {
    border-color: rgba(23, 136, 95, 0.28);
    background: rgba(23, 136, 95, 0.08);
    box-shadow: 0 14px 34px rgba(16, 24, 39, 0.06);
  }
  .ghf-status--error { color: var(--ghf-error); }

  .ghf-success-card {
    position: relative;
    isolation: isolate;
    display: grid;
    justify-items: center;
    gap: 18px;
    width: 100%;
    min-width: 0;
    max-width: 640px;
    margin-inline: auto;
    padding: 28px 24px;
    border: 1px solid color-mix(in srgb, var(--ghf-success) 24%, var(--ghf-border));
    border-radius: max(14px, var(--ghf-radius));
    background: color-mix(in srgb, var(--ghf-bg) 96%, var(--ghf-field-bg));
    color: var(--ghf-fg);
    box-shadow: 0 18px 44px rgba(16, 24, 39, 0.07);
    overflow: hidden;
    transform-origin: 50% 0%;
    animation: ghf-success-card-in 360ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .ghf-success-card::before {
    content: "";
    position: absolute;
    inset: 0 28% auto;
    height: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ghf-success) 72%, var(--ghf-accent));
    opacity: 0.72;
    transform: scaleX(0);
    transform-origin: center;
    animation: ghf-success-line 560ms cubic-bezier(0.16, 1, 0.3, 1) 70ms both;
    z-index: 0;
  }
  .ghf-success-card__mark,
  .ghf-success-card__content {
    position: relative;
    z-index: 1;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-success-card {
    padding: 30px 28px;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    overflow: visible;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-success-card::before {
    content: none;
    display: none;
  }
  [data-ghf-style-variant="diagnostic_premium"] .ghf-success-card:focus-visible {
    outline: none;
  }
  .ghf-success-card:focus { outline: none; }
  .ghf-success-card:focus-visible {
    outline: 3px solid var(--ghf-focus);
    outline-offset: 4px;
  }
  .ghf-success-card__mark {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    margin-block-start: 0;
    border-radius: 0;
    color: color-mix(in srgb, var(--ghf-success) 84%, var(--ghf-fg));
    background: transparent;
    border: 0;
    box-shadow: none;
    flex: 0 0 auto;
    animation: ghf-success-mark-land 440ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both;
  }
  .ghf-success-card__mark::before {
    content: none;
  }
  .ghf-success-card__mark-glyph {
    display: inline-flex;
    width: 88px;
    height: 88px;
    line-height: 1;
    transform-origin: center;
    animation: ghf-success-check 320ms cubic-bezier(0.16, 1, 0.3, 1) 210ms both;
  }
  .ghf-success-card__mark-glyph svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .ghf-success-card__mark-disc {
    fill: color-mix(in srgb, var(--ghf-success) 14%, var(--ghf-field-bg));
    stroke: color-mix(in srgb, var(--ghf-success) 74%, var(--ghf-accent));
    stroke-width: 2.4;
  }
  .ghf-success-card__mark-check {
    stroke: color-mix(in srgb, var(--ghf-success) 72%, var(--ghf-fg));
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ghf-success-card__spark {
    stroke: color-mix(in srgb, var(--ghf-accent) 76%, var(--ghf-success));
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .ghf-success-card__spark--dot {
    stroke-width: 5;
  }
  .ghf-success-card__party-popper-fill {
    fill: var(--ghf-accent);
  }
  .ghf-success-card__party-popper-ribbon {
    fill: color-mix(in srgb, var(--ghf-fg) 72%, var(--ghf-accent));
  }
  .ghf-success-card__party-popper-rim {
    fill: var(--ghf-success);
  }
  .ghf-success-card__party-popper-highlight {
    fill: var(--ghf-bg);
  }
  .ghf-success-card__party-popper-confetti-warm {
    fill: var(--ghf-celebration);
  }
  .ghf-success-card__content {
    display: grid;
    justify-items: center;
    gap: 12px;
    min-width: 0;
    text-align: center;
  }
  .ghf-success-card__content > * {
    animation: ghf-success-content-rise 360ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .ghf-success-card__content > *:nth-child(1) { animation-delay: 80ms; }
  .ghf-success-card__content > *:nth-child(2) { animation-delay: 120ms; }
  .ghf-success-card__content > *:nth-child(3) { animation-delay: 160ms; }
  .ghf-success-card__content > *:nth-child(4) { animation-delay: 190ms; }
  .ghf-success-card__content > *:nth-child(5) { animation-delay: 220ms; }
  .ghf-success-card__title,
  .ghf-success-card__body,
  .ghf-success-card__reward-title,
  .ghf-success-card__reward-body,
  .ghf-success-card__support {
    margin: 0;
  }
  .ghf-success-card__title {
    max-width: 24rem;
    font-size: clamp(1.18rem, 1rem + 0.55vw, 1.45rem);
    line-height: 1.22;
    font-weight: 780;
    color: var(--ghf-fg);
  }
  .ghf-success-card__body,
  .ghf-success-card__step,
  .ghf-success-card__reward-body,
  .ghf-success-card__support {
    max-width: 32rem;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--ghf-muted);
  }
  .ghf-success-card__body {
    max-width: 34rem;
  }
  .ghf-success-card__steps {
    display: grid;
    gap: 8px;
    max-width: 34rem;
    margin: 4px 0 0;
    padding: 0;
    list-style-position: inside;
    text-align: start;
  }
  .ghf-success-card__step::marker {
    color: var(--ghf-success);
    font-weight: 800;
  }
  .ghf-success-card__reward {
    position: relative;
    display: grid;
    gap: 8px;
    min-width: 0;
    margin-block-start: 2px;
    padding: 12px;
    border: 1px solid var(--ghf-border);
    border-radius: max(6px, calc(var(--ghf-radius) - 2px));
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--ghf-accent) 8%, transparent), transparent 54%),
      color-mix(in srgb, var(--ghf-field-bg) 88%, transparent);
    overflow: hidden;
  }
  .ghf-success-card__reward::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: color-mix(in srgb, var(--ghf-success) 52%, var(--ghf-accent));
    opacity: 0.72;
  }
  .ghf-success-card__reward-title {
    font-size: 0.92rem;
    line-height: 1.35;
    font-weight: 700;
    color: var(--ghf-fg);
  }
  .ghf-success-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: center;
    min-width: 0;
    width: min(100%, 420px);
    margin-block-start: 4px;
  }
  .ghf-success-card__action,
  .ghf-success-card__reward-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: auto;
    min-width: 0;
    max-width: 100%;
    text-align: center;
    text-decoration: none;
    overflow-wrap: anywhere;
    transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease, background-color 160ms ease;
  }
  .ghf-success-card__action-icon {
    display: inline-grid;
    place-items: center;
    inline-size: 1em;
    block-size: 1em;
    flex: 0 0 auto;
    color: currentColor;
  }
  .ghf-success-card__action-icon svg {
    display: block;
    inline-size: 1em;
    block-size: 1em;
    stroke: currentColor;
  }
  .ghf-success-card__action:hover,
  .ghf-success-card__reward-action:hover {
    filter: saturate(1.04);
    text-decoration: none;
    transform: translateY(-1px);
  }
  .ghf-success-card__action:focus-visible,
  .ghf-success-card__reward-action:focus-visible {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 3px;
    text-decoration: none;
  }
  .ghf-success-card__action:active,
  .ghf-success-card__reward-action:active {
    transform: translateY(0);
  }
  .ghf-success-card__support {
    margin-block-start: 2px;
    font-size: 0.8125rem;
  }

  [data-ghf-style-variant="careers-html-fidelity"] {
    --ghf-font: "Geist", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --ghf-accent: #0375db;
    --ghf-accent-contrast: #ffffff;
    --ghf-fg: #2f2b3d;
    --ghf-muted: #6b6876;
    --ghf-bg: #ffffff;
    --ghf-field-bg: #ffffff;
    --ghf-border: #dbdbdb;
    --ghf-border-strong: #c4c3cc;
    --ghf-error: #dc2e39;
    --ghf-error-bg: #fbe1e3;
    --ghf-success: #157f47;
    --ghf-celebration: #6ec207;
    --ghf-focus: #0375db;
    --ghf-radius: 6px;
    --ghf-gap: 16px;
    --ghf-field-shadow: none;
    --ghf-field-shadow-focus: 0 0 0 3px rgba(3, 117, 219, 0.14);
    --ghf-action-shadow: none;
    --ghf-action-shadow-hover: 0 16px 32px rgba(0, 36, 63, 0.26), 0 5px 12px rgba(0, 36, 63, 0.14);
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-progress-shell {
    display: grid;
    gap: 9px;
    min-width: 0;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-progress-meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    color: var(--ghf-muted);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    line-height: 1.167;
    text-transform: uppercase;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-progress-percent {
    color: #396504;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-progress-track {
    position: relative;
    block-size: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #fafafa;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-progress-bar {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, #0375db, #6ec207);
    transition: width 300ms cubic-bezier(0.2, 0, 0, 1);
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-fields,
  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-section {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-fields {
    gap: 28px;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-section-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    inline-size: 28px;
    block-size: 28px;
    border-radius: 9px;
    background: #004070;
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-section-title {
    flex: 0 0 auto;
    color: var(--ghf-fg);
    font-size: 1.02rem;
    font-weight: 800;
    line-height: 1.25;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-careers-section-rule {
    flex: 1 1 auto;
    block-size: 1px;
    background: var(--ghf-border);
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-field {
    gap: 7px;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-label {
    font-size: 0.875rem;
    font-weight: 600;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-field-icon {
    display: none;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-control-icon {
    inline-size: 18px;
    block-size: 18px;
    color: color-mix(in srgb, var(--ghf-accent) 72%, var(--ghf-muted));
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-control--with-icon:focus-within .ghf-control-icon {
    color: var(--ghf-accent);
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-control--with-icon .ghf-input,
  [data-ghf-style-variant="careers-html-fidelity"] .ghf-control--with-icon .ghf-select,
  [data-ghf-style-variant="careers-html-fidelity"] .ghf-control--with-icon .ghf-textarea {
    padding-inline-start: 46px;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-input,
  [data-ghf-style-variant="careers-html-fidelity"] .ghf-textarea,
  [data-ghf-style-variant="careers-html-fidelity"] .ghf-select,
  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-input {
    min-height: 48px;
    padding: 12px 14px;
    border-width: 1px;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file {
    display: grid;
    gap: 8px;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-input {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    border: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-dropzone {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 80px;
    padding: 16px 18px;
    border: 1.5px dashed var(--ghf-border-strong);
    border-radius: var(--ghf-radius);
    background: #fafafa;
    color: var(--ghf-fg);
    cursor: pointer;
    transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-dropzone:hover {
    border-color: var(--ghf-accent);
    background: color-mix(in srgb, var(--ghf-accent) 7%, var(--ghf-field-bg));
    transform: translateY(-1px);
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-input:focus-visible + .ghf-file-dropzone {
    outline: 2px solid var(--ghf-focus);
    outline-offset: 3px;
    box-shadow: var(--ghf-field-shadow-focus);
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-dropzone-icon {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    inline-size: 46px;
    block-size: 46px;
    border-radius: 13px;
    color: #024c8f;
    background: #d7e9f9;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-dropzone-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-dropzone-title {
    color: var(--ghf-fg);
    font-weight: 800;
    line-height: 1.25;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-dropzone-hint {
    color: var(--ghf-muted);
    font-size: 0.8125rem;
    line-height: 1.35;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    max-width: 100%;
    margin: 0;
    padding: 6px 9px;
    border-radius: 999px;
    color: var(--ghf-success);
    background: color-mix(in srgb, var(--ghf-success) 10%, var(--ghf-field-bg));
    font-weight: 700;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-status:empty {
    display: none;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-file-status::before {
    content: "✓";
    font-weight: 800;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-check {
    border-width: 1.5px;
    background: #fafafa;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-actions {
    justify-content: stretch;
    padding-block-start: 18px;
    border-block-start: 1px solid var(--ghf-border);
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 46px;
    padding: 12px 20px;
    font-weight: 600;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-btn-icon {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    inline-size: 18px;
    block-size: 18px;
    color: currentColor;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-btn-icon[data-icon="spinner"] {
    animation: ghf-spin 0.8s linear infinite;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-btn:not(.ghf-btn--ghost) {
    flex: 1 1 100%;
    width: 100%;
    max-width: none;
  }

  [data-ghf-style-variant="careers-html-fidelity"] .ghf-readiness {
    font-weight: 700;
  }

  @container (max-width: 520px) {
    [data-ghf-style-variant="careers-html-fidelity"] .ghf-actions {
      display: grid;
      grid-template-columns: 1fr;
    }

    [data-ghf-style-variant="careers-html-fidelity"] .ghf-btn,
    [data-ghf-style-variant="careers-html-fidelity"] .ghf-btn:not(.ghf-btn--ghost) {
      width: 100%;
      max-width: none;
    }
  }

  @container (max-width: 420px) {
    .ghf-success-card {
      gap: 12px;
      padding: 22px 16px;
    }
    .ghf-success-card__mark {
      width: 78px;
      height: 78px;
    }
    .ghf-success-card__mark-glyph {
      width: 78px;
      height: 78px;
    }
    .ghf-success-card__actions,
    .ghf-success-card__reward {
      width: 100%;
    }
    .ghf-success-card__action,
    .ghf-success-card__reward-action {
      width: 100%;
    }
  }

  .ghf-skeleton { display: grid; gap: var(--ghf-gap); }
  .ghf-skeleton-row { height: 64px; border-radius: var(--ghf-radius); background: var(--ghf-error-bg); background:
    linear-gradient(90deg, var(--ghf-border) 0%, var(--ghf-field-bg) 50%, var(--ghf-border) 100%);
    background-size: 200% 100%; animation: ghf-shimmer 1.4s ease-in-out infinite; opacity: 0.5; }
  .ghf-skeleton-row:nth-child(1) { width: 60%; height: 28px; }

  .ghf-honeypot {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @keyframes ghf-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @keyframes ghf-spin { to { transform: rotate(360deg); } }
  @keyframes ghf-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes ghf-fade { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }
  @keyframes ghf-step-surface-in {
    from { opacity: 0.82; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes ghf-success-card-in {
    from { opacity: 0.88; transform: translateY(10px) scale(0.985); filter: blur(0.5px); }
    72% { filter: blur(0); }
    to { opacity: 1; transform: none; filter: none; }
  }
  @keyframes ghf-success-line { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 0.88; } }
  @keyframes ghf-success-mark-land {
    0% { opacity: 0.76; transform: translateY(6px) scale(0.74); }
    58% { opacity: 1; transform: translateY(-1px) scale(1.04); }
    100% { opacity: 1; transform: none; }
  }
  @keyframes ghf-success-ring {
    0% { opacity: 0; transform: scale(0.58); }
    38% { opacity: 0.86; }
    100% { opacity: 0; transform: scale(1.28); }
  }
  @keyframes ghf-success-check {
    from { opacity: 0.72; transform: rotate(-16deg) scale(0.48); }
    to { opacity: 1; transform: none; }
  }
  @keyframes ghf-success-content-rise {
    from { transform: translateY(5px); }
    to { transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    greenhouse-form *, greenhouse-form *::before, greenhouse-form *::after,
    .ghf-scope *, .ghf-scope *::before, .ghf-scope *::after {
      animation-duration: 0.001ms !important; animation-delay: 0ms !important;
      transition-duration: 0.001ms !important; transition-delay: 0ms !important;
    }
  }

  @media (forced-colors: active) {
    .ghf-input, .ghf-textarea, .ghf-select, .ghf-file-input, .ghf-tag-input, .ghf-check { border-color: ButtonText; }
    .ghf-btn { border-color: ButtonText; }
    .ghf-field[data-invalid="true"] .ghf-input { border-color: Mark; }
    .ghf-success-card,
    .ghf-success-card__mark,
    .ghf-success-card__reward {
      border-color: ButtonText;
    }
    .ghf-success-card__aura,
    .ghf-success-card::before,
    .ghf-success-card__mark::before,
    .ghf-success-card__reward::before {
      display: none;
    }
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
