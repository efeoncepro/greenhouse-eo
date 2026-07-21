export const MEETING_RENDERER_STYLE_ID = 'efeonce-meeting-scheduler-styles'

export const MEETING_RENDERER_CSS = `
:is(efeonce-meeting-scheduler, .ghm-scope) {
  --gh-meeting-ink: #071f2d;
  --gh-meeting-ink-soft: #12384a;
  --gh-meeting-surface: #f3f1ea;
  --gh-meeting-paper: #fffdf8;
  --gh-meeting-paper-alt: #f7f8f5;
  --gh-meeting-accent: #3fe0c5;
  --gh-meeting-accent-strong: #087565;
  --gh-meeting-accent-soft: #d9f7f1;
  --gh-meeting-text: #102630;
  --gh-meeting-muted: #62737a;
  --gh-meeting-line: #d5dad6;
  --gh-meeting-line-strong: #aeb9b7;
  --gh-meeting-danger: #b73535;
  --gh-meeting-warning: #9c6200;
  --gh-meeting-success: #087e6b;
  --gh-meeting-focus: #1473e6;
  --gh-meeting-on-ink: #f4fbfa;
  --gh-meeting-on-ink-strong: #ffffff;
  --gh-meeting-on-ink-muted: #bed0d6;
  --gh-meeting-step-muted: #839ba5;
  --gh-meeting-radius: 22px;
  --gh-meeting-radius-small: 10px;
  --gh-meeting-radius-mobile: 8px;
  --gh-meeting-shadow: 0 24px 64px rgba(1, 24, 37, 0.16);
  --gh-meeting-duration: 200ms;
  --gh-meeting-ease: cubic-bezier(0.2, 0, 0, 1);
  --gh-meeting-font: inherit;

  display: block;
  width: 100%;
  color: var(--gh-meeting-text);
  font-family: var(--gh-meeting-font);
  container-type: inline-size;
  box-sizing: border-box;
}

:is(efeonce-meeting-scheduler, .ghm-scope) *,
:is(efeonce-meeting-scheduler, .ghm-scope) *::before,
:is(efeonce-meeting-scheduler, .ghm-scope) *::after { box-sizing: border-box; }

:is(efeonce-meeting-scheduler, .ghm-scope) button,
:is(efeonce-meeting-scheduler, .ghm-scope) input,
:is(efeonce-meeting-scheduler, .ghm-scope) a { font: inherit; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(430px, 1.45fr) minmax(280px, 0.85fr);
  min-height: 650px;
  border: 1px solid color-mix(in srgb, var(--gh-meeting-ink) 16%, transparent);
  border-radius: var(--gh-meeting-radius);
  background: var(--gh-meeting-paper);
  box-shadow: var(--gh-meeting-shadow);
  overflow: clip;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(26px, 3cqi, 42px);
  color: var(--gh-meeting-on-ink);
  background: var(--gh-meeting-ink);
  border-inline-end: 1px solid color-mix(in srgb, var(--gh-meeting-on-ink-strong) 12%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-eyebrow,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-kicker,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection-label {
  margin: 0 0 16px;
  color: var(--gh-meeting-accent-strong);
  font-size: 0.72rem;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal .ghm-eyebrow { color: var(--gh-meeting-accent); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-title {
  max-width: 13ch;
  margin: 0;
  color: var(--gh-meeting-on-ink-strong);
  font-size: clamp(1.9rem, 3cqi, 3.5rem);
  line-height: 1;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-intro {
  max-width: 31ch;
  margin: 22px 0;
  color: var(--gh-meeting-on-ink-muted);
  font-size: 0.94rem;
  line-height: 1.6;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-facts {
  display: grid;
  gap: 7px;
  margin-top: auto;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fact {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gh-meeting-on-ink);
  font-size: 0.8rem;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fact::before {
  content: '';
  width: 7px;
  height: 7px;
  border: 1px solid var(--gh-meeting-accent);
  border-radius: 50%;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-steps {
  display: grid;
  gap: 8px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step {
  counter-increment: step;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--gh-meeting-step-muted);
  font-size: 0.75rem;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step::before {
  content: counter(step, decimal-leading-zero);
  font-variant-numeric: tabular-nums;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step[data-active='true'],
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step[data-complete='true'] { color: var(--gh-meeting-accent); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-work {
  min-width: 0;
  padding: clamp(28px, 4cqi, 54px);
  background: var(--gh-meeting-paper);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--gh-meeting-line);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-panel-title,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form-title,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-message-title,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-date {
  margin: 0;
  color: var(--gh-meeting-ink);
  font-size: clamp(1.25rem, 2cqi, 1.75rem);
  line-height: 1.15;
  letter-spacing: -0.025em;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-label {
  color: var(--gh-meeting-muted);
  font-size: 0.9rem;
  font-weight: 700;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-navigation {
  display: grid;
  grid-template-columns: 44px minmax(120px, auto) 44px;
  align-items: center;
  gap: 7px;
  text-align: center;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--gh-meeting-line);
  border-radius: 50%;
  color: var(--gh-meeting-text);
  background: var(--gh-meeting-paper);
  cursor: pointer;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-button:disabled { opacity: 0.35; cursor: not-allowed; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar {
  width: 100%;
  margin-top: 18px;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 5px;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar th {
  height: 28px;
  color: var(--gh-meeting-muted);
  font-size: 0.72rem;
  font-weight: 750;
  text-align: center;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar th abbr { text-decoration: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar td { height: 66px; padding: 0; vertical-align: middle; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 62px;
  border-radius: var(--gh-meeting-radius-small);
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day {
  border: 1px solid var(--gh-meeting-line-strong);
  color: var(--gh-meeting-text);
  background: var(--gh-meeting-paper);
  cursor: pointer;
  transition: transform var(--gh-meeting-duration) var(--gh-meeting-ease),
    border-color var(--gh-meeting-duration) var(--gh-meeting-ease),
    background var(--gh-meeting-duration) var(--gh-meeting-ease);
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day:hover {
  transform: translateY(-2px);
  border-color: var(--gh-meeting-accent-strong);
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true'] {
  color: var(--gh-meeting-on-ink-strong);
  background: var(--gh-meeting-ink-soft);
  border-color: var(--gh-meeting-ink-soft);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-number {
  font-size: 1rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-available {
  margin-top: 5px;
  color: var(--gh-meeting-accent-strong);
  font-size: 0.62rem;
  font-weight: 700;
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true'] .ghm-calendar-available {
  color: var(--gh-meeting-accent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day--unavailable {
  color: var(--gh-meeting-muted);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-timezone-lens {
  width: fit-content;
  margin-top: 18px;
  padding: 8px 12px;
  border: 1px solid var(--gh-meeting-line);
  border-radius: 999px;
  color: var(--gh-meeting-muted);
  background: var(--gh-meeting-paper-alt);
  font-size: 0.75rem;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(26px, 3cqi, 42px);
  background: var(--gh-meeting-paper-alt);
  border-inline-start: 1px solid var(--gh-meeting-line);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-date { font-size: 1.15rem; text-wrap: balance; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-help,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-empty {
  margin: 9px 0 20px;
  color: var(--gh-meeting-muted);
  font-size: 0.82rem;
  line-height: 1.5;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slots {
  display: grid;
  gap: 9px;
  max-height: 300px;
  padding-inline-end: 3px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 50px;
  padding: 10px 14px;
  border: 1px solid var(--gh-meeting-line-strong);
  border-radius: var(--gh-meeting-radius-small);
  color: var(--gh-meeting-text);
  background: var(--gh-meeting-paper);
  cursor: pointer;
  transition: transform var(--gh-meeting-duration) var(--gh-meeting-ease),
    border-color var(--gh-meeting-duration), background var(--gh-meeting-duration);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot:hover { transform: translateX(2px); border-color: var(--gh-meeting-accent-strong); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot[data-selected='true'] {
  color: var(--gh-meeting-on-ink-strong);
  background: var(--gh-meeting-ink-soft);
  border-color: var(--gh-meeting-ink-soft);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot-time { font-size: 1rem; font-variant-numeric: tabular-nums; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot-duration { color: var(--gh-meeting-muted); font-size: 0.72rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot[data-selected='true'] .ghm-slot-duration { color: var(--gh-meeting-accent); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection {
  display: grid;
  margin-top: 20px;
  padding: 18px;
  border: 1px solid var(--gh-meeting-line);
  border-radius: var(--gh-meeting-radius-small);
  background: var(--gh-meeting-paper);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection-label { margin-bottom: 10px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-date { color: var(--gh-meeting-text); font-size: 0.92rem; line-height: 1.35; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-time {
  margin-top: 6px;
  color: var(--gh-meeting-ink);
  font-size: 2.5rem;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-meta { margin-top: 8px; color: var(--gh-meeting-muted); font-size: 0.76rem; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-weight: 750;
  cursor: pointer;
  transition: transform var(--gh-meeting-duration) var(--gh-meeting-ease), filter var(--gh-meeting-duration);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary { color: var(--gh-meeting-ink); background: var(--gh-meeting-accent); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(0.98); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary:disabled { opacity: 0.5; cursor: not-allowed; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary[aria-disabled='true'] { opacity: 0.5; cursor: not-allowed; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-secondary { color: var(--gh-meeting-text); background: transparent; border-color: var(--gh-meeting-line-strong); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-action { width: 100%; margin-top: 16px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fallback { display: inline-flex; align-items: center; align-self: center; min-height: 44px; margin-top: 8px; color: var(--gh-meeting-muted); font-size: 0.76rem; text-underline-offset: 4px; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form { display: grid; gap: 18px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fields { display: grid; grid-template-columns: 1fr; gap: 14px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field { display: grid; gap: 7px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-label { color: var(--gh-meeting-muted); font-size: 0.78rem; font-weight: 700; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-input {
  width: 100%;
  min-height: 48px;
  padding: 11px 13px;
  border: 1px solid var(--gh-meeting-line-strong);
  border-radius: var(--gh-meeting-radius-small);
  color: var(--gh-meeting-text);
  background: var(--gh-meeting-paper);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-input[aria-invalid='true'] { border-color: var(--gh-meeting-danger); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check { display: flex; align-items: flex-start; min-height: 44px; gap: 10px; color: var(--gh-meeting-muted); font-size: 0.82rem; line-height: 1.45; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check-group { display: grid; gap: 6px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check input { flex: 0 0 24px; width: 24px; min-width: 24px; height: 24px; margin-top: 0; accent-color: var(--gh-meeting-accent-strong); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field-error { margin: 0; color: var(--gh-meeting-danger); font-size: 0.76rem; line-height: 1.4; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form-actions { display: flex; justify-content: space-between; gap: 12px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-error-summary { padding: 12px 14px; border-inline-start: 3px solid var(--gh-meeting-danger); color: var(--gh-meeting-danger); background: color-mix(in srgb, var(--gh-meeting-danger) 7%, transparent); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 20px;
  padding: 12px 14px;
  border-inline-start: 3px solid var(--gh-meeting-warning);
  background: color-mix(in srgb, var(--gh-meeting-warning) 7%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-inline-error p { margin: 0; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-status,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-message {
  display: grid;
  align-content: center;
  min-height: 430px;
  max-width: 48ch;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-message-body { color: var(--gh-meeting-muted); line-height: 1.65; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-message[data-kind='warning'] { border-inline-start: 3px solid var(--gh-meeting-warning); padding-inline-start: 22px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-message[data-kind='success'] { border-inline-start: 3px solid var(--gh-meeting-success); padding-inline-start: 22px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-empty { color: var(--gh-meeting-muted); line-height: 1.5; }

:is(efeonce-meeting-scheduler, .ghm-scope) :focus-visible { outline: 3px solid var(--gh-meeting-focus); outline-offset: 3px; }

@container (max-width: 1000px) {
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene { grid-template-columns: minmax(210px, 0.65fr) minmax(0, 1.35fr); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.65fr);
    gap: 10px 24px;
    border-inline-start: 0;
    border-top: 1px solid var(--gh-meeting-line);
  }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-kicker,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-date,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-help,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slots { grid-column: 1; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-action,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fallback { grid-column: 2; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection { grid-row: 1 / span 4; margin-top: 0; }
}

@container (max-width: 650px) {
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene { display: block; min-height: 0; border-radius: 18px; overflow: hidden; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal { padding: 24px 20px; border-inline-end: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-title { max-width: 14ch; font-size: clamp(2rem, 10cqi, 3rem); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-intro { margin: 15px 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-facts { display: flex; flex-wrap: wrap; margin-top: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-steps { grid-template-columns: repeat(3, 1fr); margin-top: 18px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-work { padding: 24px 8px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-panel-header { display: grid; gap: 12px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar { margin-inline: 0; border-spacing: 1px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar td { height: 50px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-blank { min-height: 48px; border-radius: var(--gh-meeting-radius-mobile); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-available { width: 6px; height: 6px; margin-top: 4px; overflow: hidden; border-radius: 50%; color: transparent; font-size: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day .ghm-calendar-available { background: var(--gh-meeting-accent-strong); }
  :is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true'] .ghm-calendar-available { background: var(--gh-meeting-accent); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda { display: flex; padding: 26px 18px; border-top: 1px solid var(--gh-meeting-line); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slots { max-height: none; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection { margin-top: 18px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fields { grid-template-columns: 1fr; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form-actions { flex-direction: column-reverse; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form-actions > * { width: 100%; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-inline-error { align-items: stretch; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  :is(efeonce-meeting-scheduler, .ghm-scope) *,
  :is(efeonce-meeting-scheduler, .ghm-scope) *::before,
  :is(efeonce-meeting-scheduler, .ghm-scope) *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (forced-colors: active) {
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-input,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-secondary { border: 1px solid CanvasText; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day[data-selected='true'],
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot[data-selected='true'] { outline: 3px solid Highlight; }
}
`

export const ensureMeetingStyles = (doc: Document = document): void => {
  if (doc.getElementById(MEETING_RENDERER_STYLE_ID)) return

  const style = doc.createElement('style')

  style.id = MEETING_RENDERER_STYLE_ID
  style.textContent = MEETING_RENDERER_CSS
  doc.head.append(style)
}
