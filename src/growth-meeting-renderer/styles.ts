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
  --gh-meeting-radius: 18px;
  --gh-meeting-radius-small: 11px;
  --gh-meeting-radius-mobile: 8px;
  --gh-meeting-shadow: 0 24px 64px rgba(1, 24, 37, 0.12), 0 1px 3px rgba(1, 24, 37, 0.08);
  --gh-meeting-shadow-float: 0 10px 24px rgba(7, 31, 45, 0.11);
  --gh-meeting-duration-press: 80ms;
  --gh-meeting-duration-hover: 140ms;
  --gh-meeting-duration: 200ms;
  --gh-meeting-duration-long: 280ms;
  --gh-meeting-ease: cubic-bezier(0.2, 0, 0, 1);
  --gh-meeting-font: inherit;
  --gh-meeting-host-bottom-inset: 0px;

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
  scroll-margin-top: 96px;
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
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-retry { justify-self: start; margin-top: 18px; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form { display: grid; gap: 18px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field { display: grid; gap: 8px; min-width: 0; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-label { color: var(--gh-meeting-muted); font-size: 0.74rem; font-weight: 760; letter-spacing: 0.02em; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-control {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--gh-meeting-line-strong) 88%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--gh-meeting-paper) 96%, var(--gh-meeting-accent-soft));
  box-shadow: 0 1px 0 rgba(7, 31, 45, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  transition:
    border-color var(--gh-meeting-duration) var(--gh-meeting-ease),
    box-shadow var(--gh-meeting-duration) var(--gh-meeting-ease),
    background var(--gh-meeting-duration) var(--gh-meeting-ease),
    transform var(--gh-meeting-duration) var(--gh-meeting-ease);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-control:hover {
  border-color: color-mix(in srgb, var(--gh-meeting-accent-strong) 48%, var(--gh-meeting-line-strong));
  background: var(--gh-meeting-paper);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-control:focus-within {
  border-color: var(--gh-meeting-accent-strong);
  background: var(--gh-meeting-on-ink-strong);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--gh-meeting-accent) 20%, transparent), 0 10px 24px rgba(7, 31, 45, 0.08);
  transform: translateY(-1px);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field-icon {
  position: absolute;
  inset-inline-start: 16px;
  display: inline-block;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  font-size: 20px;
  line-height: 1;
  color: color-mix(in srgb, var(--gh-meeting-muted) 84%, transparent);
  pointer-events: none;
  transition: color var(--gh-meeting-duration) var(--gh-meeting-ease), transform var(--gh-meeting-duration) var(--gh-meeting-ease);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-control:focus-within .ghm-field-icon {
  color: var(--gh-meeting-accent-strong);
  transform: scale(1.06);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-input {
  width: 100%;
  min-height: 56px;
  padding: 14px 48px 14px 48px;
  border: 0;
  border-radius: inherit;
  outline: 0;
  color: var(--gh-meeting-text);
  background: transparent;
  font-size: 0.95rem;
  font-weight: 600;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-validation-icon {
  position: absolute;
  inset-inline-end: 16px;
  width: 19px;
  height: 19px;
  font-size: 19px;
  line-height: 1;
  color: transparent;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.72);
  transition: color 160ms var(--gh-meeting-ease), opacity 160ms var(--gh-meeting-ease), transform 180ms var(--gh-meeting-ease);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='valid'] .ghm-validation-icon,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='invalid'] .ghm-validation-icon,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='pending'] .ghm-validation-icon {
  opacity: 1;
  transform: scale(1);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='valid'] .ghm-validation-icon { color: var(--gh-meeting-success, #177245); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='invalid'] .ghm-validation-icon { color: var(--gh-meeting-danger); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='pending'] .ghm-validation-icon {
  color: var(--gh-meeting-accent-strong);
  animation: ghm-spin 800ms linear infinite;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='invalid'] .ghm-control {
  border-color: var(--gh-meeting-danger);
  background: color-mix(in srgb, var(--gh-meeting-danger) 4%, var(--gh-meeting-paper));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gh-meeting-danger) 9%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='valid'] .ghm-control {
  border-color: color-mix(in srgb, var(--gh-meeting-success, #177245) 42%, var(--gh-meeting-line-strong));
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='pending'] .ghm-control {
  border-color: color-mix(in srgb, var(--gh-meeting-accent-strong) 56%, var(--gh-meeting-line-strong));
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='invalid'] .ghm-field-icon { color: var(--gh-meeting-danger); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check { display: flex; align-items: flex-start; min-height: 44px; gap: 8px; color: var(--gh-meeting-muted); font-size: 0.82rem; line-height: 1.45; cursor: pointer; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check-group { display: grid; gap: 6px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check input {
  appearance: none;
  flex: 0 0 44px;
  width: 44px;
  min-width: 44px;
  height: 44px;
  margin: 0;
  border: 0;
  border-radius: 12px;
  background-color: transparent;
  background-image: linear-gradient(var(--gh-meeting-paper), var(--gh-meeting-paper));
  background-position: center;
  background-size: 24px 24px;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 0 1.5px transparent;
  cursor: pointer;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check input::before {
  content: '';
  display: block;
  width: 24px;
  height: 24px;
  margin: 10px;
  border: 1.5px solid var(--gh-meeting-line-strong);
  border-radius: 7px;
  background: var(--gh-meeting-paper);
  transition: border-color var(--gh-meeting-duration) var(--gh-meeting-ease), background var(--gh-meeting-duration) var(--gh-meeting-ease), box-shadow var(--gh-meeting-duration) var(--gh-meeting-ease);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check input:checked::before {
  border-color: var(--gh-meeting-accent-strong);
  background: var(--gh-meeting-accent);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--gh-meeting-accent-strong) 24%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check-group[data-validation='invalid'] .ghm-check input::before {
  border-color: var(--gh-meeting-danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gh-meeting-danger) 10%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check-group[data-validation='valid'] .ghm-check input::before { border-color: var(--gh-meeting-success, #177245); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check > span { padding-block: 8px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field-feedback {
  min-height: 1.1em;
  margin: 0;
  color: var(--gh-meeting-muted);
  font-size: 0.76rem;
  line-height: 1.4;
  opacity: 1;
  transform: translateY(0);
  transition: color 160ms var(--gh-meeting-ease), opacity 160ms var(--gh-meeting-ease), transform 180ms var(--gh-meeting-ease);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field-feedback:empty { opacity: 0; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='valid'] .ghm-field-feedback,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check-group[data-validation='valid'] .ghm-field-feedback { color: var(--gh-meeting-success, #177245); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field[data-validation='invalid'] .ghm-field-feedback,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check-group[data-validation='invalid'] .ghm-field-feedback { color: var(--gh-meeting-danger); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-field-error { margin: 0; color: var(--gh-meeting-danger); font-size: 0.76rem; line-height: 1.4; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-email-verification { color: var(--gh-meeting-muted); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-email-verification.is-error { color: var(--gh-meeting-danger); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-email-verification.is-success { color: var(--gh-meeting-success, #177245); }
@keyframes ghm-spin { to { transform: rotate(360deg); } }
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

/* Calendar Command Center — premium depth, state continuity and agenda density. */
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene {
  isolation: isolate;
  background:
    radial-gradient(circle at 73% 0%, color-mix(in srgb, var(--gh-meeting-accent) 8%, transparent), transparent 30%),
    var(--gh-meeting-paper);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal {
  position: relative;
  overflow: hidden;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal > *:not(.ghm-signal-atmosphere) {
  position: relative;
  z-index: 1;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal-atmosphere {
  position: absolute;
  inset: auto -90px -70px auto;
  width: 240px;
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--gh-meeting-accent) 35%, transparent);
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--gh-meeting-accent) 13%, transparent), transparent 62%);
  box-shadow:
    0 0 0 28px color-mix(in srgb, var(--gh-meeting-accent) 4%, transparent),
    0 0 0 72px color-mix(in srgb, var(--gh-meeting-accent) 2%, transparent);
  pointer-events: none;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step { position: relative; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step:not(:last-child)::after {
  content: '';
  position: absolute;
  inset: calc(100% + 1px) auto auto 8px;
  width: 1px;
  height: 7px;
  background: color-mix(in srgb, currentColor 48%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-work {
  position: relative;
  background: color-mix(in srgb, var(--gh-meeting-paper) 95%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='details'] .ghm-form,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-message {
  animation: ghm-panel-enter var(--gh-meeting-duration-long) var(--gh-meeting-ease) both;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-navigation {
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--gh-meeting-line) 84%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--gh-meeting-paper-alt) 82%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-button {
  border: 0;
  background: transparent;
  transition: color var(--gh-meeting-duration) var(--gh-meeting-ease),
    background var(--gh-meeting-duration) var(--gh-meeting-ease),
    transform var(--gh-meeting-duration) var(--gh-meeting-ease);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-button:hover:not(:disabled) {
  color: var(--gh-meeting-ink);
  background: var(--gh-meeting-paper);
  transform: scale(1.04);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar { border-spacing: 6px; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar th {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day {
  position: relative;
  background: color-mix(in srgb, var(--gh-meeting-paper) 90%, transparent);
  box-shadow: inset 0 0 0 1px transparent;
  transition: transform var(--gh-meeting-duration) var(--gh-meeting-ease),
    border-color var(--gh-meeting-duration) var(--gh-meeting-ease),
    background var(--gh-meeting-duration) var(--gh-meeting-ease),
    box-shadow var(--gh-meeting-duration) var(--gh-meeting-ease);
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day:hover {
  box-shadow: var(--gh-meeting-shadow-float);
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true'] {
  box-shadow: 0 12px 24px color-mix(in srgb, var(--gh-meeting-ink) 22%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true']::after {
  content: '';
  position: absolute;
  inset: 6px 6px auto auto;
  width: 6px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--gh-meeting-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--gh-meeting-accent) 16%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-available { font-size: 0.58rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day--unavailable { color: color-mix(in srgb, var(--gh-meeting-muted) 72%, transparent); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-timezone-lens::before {
  content: '◷';
  margin-inline-end: 7px;
  color: var(--gh-meeting-accent-strong);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--gh-meeting-accent-soft) 28%, transparent), transparent 170px),
    var(--gh-meeting-paper-alt);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0 1px;
  color: var(--gh-meeting-muted);
  font-size: 0.62rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot-group::after {
  content: '';
  flex: 1;
  height: 1px;
  background: color-mix(in srgb, var(--gh-meeting-line) 72%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot {
  position: relative;
  min-height: 54px;
  padding: 11px 14px 11px 18px;
  background: color-mix(in srgb, var(--gh-meeting-paper) 92%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot::before {
  content: '';
  position: absolute;
  inset: 11px auto 11px 7px;
  width: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--gh-meeting-accent-strong) 40%, transparent);
  transform: scaleY(0.45);
  transition: transform var(--gh-meeting-duration) var(--gh-meeting-ease),
    background var(--gh-meeting-duration) var(--gh-meeting-ease);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot:hover::before,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot[data-selected='true']::before {
  background: var(--gh-meeting-accent);
  transform: scaleY(1);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot[data-selected='true'] {
  box-shadow: 0 10px 22px color-mix(in srgb, var(--gh-meeting-ink) 18%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--gh-meeting-accent) 16%, transparent), transparent 52%),
    var(--gh-meeting-paper);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--gh-meeting-ink) 8%, transparent);
  animation: ghm-selection-enter var(--gh-meeting-duration) var(--gh-meeting-ease) both;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary:hover:not(:disabled) {
  box-shadow: 0 12px 24px color-mix(in srgb, var(--gh-meeting-accent-strong) 22%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary:active:not(:disabled) { transform: scale(0.98); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-input {
  transition: color var(--gh-meeting-duration) var(--gh-meeting-ease);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-loading {
  position: relative;
  color: var(--gh-meeting-muted);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-loading::before {
  content: '';
  width: min(100%, 460px);
  height: 250px;
  margin-bottom: 24px;
  border-radius: 18px;
  background: linear-gradient(110deg, var(--gh-meeting-paper-alt) 8%, var(--gh-meeting-accent-soft) 18%, var(--gh-meeting-paper-alt) 33%);
  background-size: 220% 100%;
  animation: ghm-shimmer 1.5s linear infinite;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-message[data-kind='success']::before {
  content: '✓';
  display: grid;
  place-items: center;
  width: 64px;
  aspect-ratio: 1;
  margin-bottom: 24px;
  border-radius: 50%;
  color: var(--gh-meeting-ink);
  background: var(--gh-meeting-accent);
  box-shadow: 0 0 0 12px color-mix(in srgb, var(--gh-meeting-accent) 14%, transparent);
  font-size: 1.6rem;
  font-weight: 800;
}

@keyframes ghm-panel-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ghm-selection-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes ghm-shimmer { to { background-position-x: -220%; } }

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
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-action { grid-column: 2; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection { grid-row: 1 / span 4; margin-top: 0; }
}

@container (max-width: 650px) {
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene { display: block; min-height: 0; border-radius: 18px; overflow: hidden; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal { padding: 22px 20px 20px; border-inline-end: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal-atmosphere { inset: auto -100px -130px auto; opacity: 0.72; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-eyebrow { margin-bottom: 10px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-title { max-width: 12ch; font-size: clamp(2rem, 9cqi, 2.5rem); line-height: 0.96; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-intro { max-width: 34ch; margin: 13px 0; font-size: 0.86rem; line-height: 1.5; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-facts { display: flex; flex-wrap: wrap; margin-top: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-steps { grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 15px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step { gap: 5px; font-size: 0.68rem; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step:not(:last-child)::after { inset: 50% 4px auto auto; width: 14px; height: 1px; transform: translateY(-50%); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-work { padding: 26px 14px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-panel-header { display: grid; gap: 12px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-navigation { grid-template-columns: 44px minmax(0, 1fr) 44px; width: 100%; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar { margin-inline: 0; border-spacing: 1px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar td { height: 50px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-blank { min-height: 48px; border-radius: var(--gh-meeting-radius-mobile); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-available { width: 6px; height: 6px; margin-top: 4px; overflow: hidden; border-radius: 50%; color: transparent; font-size: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day .ghm-calendar-available { background: var(--gh-meeting-accent-strong); }
  :is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true'] .ghm-calendar-available { background: var(--gh-meeting-accent); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda { display: flex; padding: 26px 18px 20px; border-top: 1px solid var(--gh-meeting-line); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slots { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: none; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot-group,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-empty { grid-column: 1 / -1; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot { min-width: 0; padding-inline-end: 10px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot-duration { font-size: 0.66rem; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection { margin-top: 18px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-action { position: sticky; bottom: 12px; z-index: 2; box-shadow: 0 12px 28px color-mix(in srgb, var(--gh-meeting-ink) 18%, transparent); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fields { grid-template-columns: 1fr; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form-actions { flex-direction: column-reverse; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-form-actions > * { width: 100%; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-inline-error { align-items: stretch; flex-direction: column; }
}

/* Semantic recipes are resolved from the component box. Container queries above
   remain progressive-enhancement fallbacks for hosts running an older bundle. */
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-guided-back { display: none; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='command'] {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(430px, 1.45fr) minmax(280px, 0.85fr);
  min-height: 650px;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='command'] .ghm-agenda {
  display: flex;
  grid-column: auto;
  border-block-start: 0;
  border-inline-start: 1px solid var(--gh-meeting-line);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(260px, 0.88fr);
  min-height: 0;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-signal {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 24px;
  padding: 20px clamp(22px, 3cqi, 34px);
  border-inline-end: 0;
  border-block-end: 1px solid color-mix(in srgb, var(--gh-meeting-on-ink-strong) 12%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-eyebrow,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-intro,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-signal-atmosphere { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-title { max-width: none; font-size: clamp(1.45rem, 3cqi, 2.1rem); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-facts { align-self: center; margin: 0; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-steps { grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); margin-top: 10px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-work { grid-column: 1; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-agenda {
  grid-column: 2;
  display: flex;
  border-block-start: 0;
  border-inline-start: 1px solid var(--gh-meeting-line);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 18px;
  overflow: clip;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-signal {
  display: block;
  padding: 20px;
  border-inline-end: 0;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-signal-atmosphere,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-eyebrow,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-intro { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-title { max-width: none; font-size: clamp(1.6rem, 8cqi, 2.1rem); line-height: 1.02; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-facts { margin-top: 10px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-steps { grid-template-columns: repeat(3, 1fr); margin-top: 14px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-work,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-agenda { padding: 24px 16px 20px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-agenda {
  display: flex;
  border-inline-start: 0;
  border-block-start: 1px solid var(--gh-meeting-line);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='schedule'][data-navigation='calendar'] .ghm-agenda { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='schedule'][data-navigation='slots'] .ghm-work { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='schedule'][data-navigation='slots'] .ghm-guided-back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  align-self: flex-start;
  margin: 0 0 14px;
  padding: 0;
  border: 0;
  gap: 6px;
  color: var(--gh-meeting-muted);
  background: transparent;
  font-size: 0.78rem;
  font-weight: 750;
  cursor: pointer;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-slots { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-slot-group,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-empty { grid-column: 1 / -1; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-agenda-action { position: static; margin-top: 18px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-fields { grid-template-columns: 1fr; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-form-actions { flex-direction: column-reverse; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-form-actions > * { width: 100%; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-agenda {
  padding-block-end: max(20px, var(--gh-meeting-host-bottom-inset));
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-mobile-appointment { display: grid; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--gh-meeting-line); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-mobile-appointment > .ghm-agenda-kicker { grid-column: 1 / -1; grid-row: 1; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-mobile-appointment .ghm-selection { grid-column: 1 / -1; grid-row: 2; width: 100%; margin-top: 0; padding-top: 10px; border-top: 0; }

/* Temporal Operations Desk — 2026 premium pass. */
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-icon,
:is(efeonce-meeting-scheduler, .ghm-scope) [class*='tabler-'] {
  display: inline-block;
  flex: 0 0 auto;
  width: 1em;
  height: 1em;
  font-size: 1.05rem;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='command'] {
  grid-template-columns: minmax(230px, 0.58fr) minmax(470px, 1.52fr) minmax(310px, 0.9fr);
  min-height: 610px;
  background: var(--gh-meeting-paper);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-signal {
  padding: clamp(24px, 2.4cqi, 34px);
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--gh-meeting-ink-soft) 48%, transparent), transparent 52%),
    var(--gh-meeting-ink);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-live-status,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  gap: 7px;
  margin: 0 0 22px;
  color: var(--gh-meeting-on-ink-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-status {
  margin-bottom: 20px;
  color: var(--gh-meeting-success);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gh-meeting-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gh-meeting-accent) 14%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-title {
  max-width: 11ch;
  font-size: clamp(1.75rem, 2.35cqi, 2.65rem);
  line-height: 1.02;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-intro {
  margin: 18px 0 24px;
  font-size: 0.86rem;
  line-height: 1.55;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-facts { gap: 10px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fact { gap: 10px; font-size: 0.76rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fact::before { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-fact-icon { color: var(--gh-meeting-accent); font-size: 0.98rem; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-steps { gap: 0; margin-top: 24px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step {
  min-height: 34px;
  gap: 10px;
  border-top: 1px solid color-mix(in srgb, var(--gh-meeting-on-ink) 10%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step::before {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid color-mix(in srgb, currentColor 55%, transparent);
  border-radius: 50%;
  font-size: 0.58rem;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-step:not(:last-child)::after { display: none; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-work { padding: clamp(28px, 3.2cqi, 46px); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-panel-header {
  align-items: center;
  padding-bottom: 20px;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-identity { display: grid; gap: 4px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-eyebrow {
  color: var(--gh-meeting-accent-strong);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-panel-title { font-size: clamp(1.35rem, 2cqi, 1.7rem); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-navigation {
  grid-template-columns: 40px minmax(132px, auto) 40px;
  gap: 3px;
  padding: 3px;
  border-radius: 13px;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-button { width: 44px; height: 44px; border-radius: 10px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-month-label { color: var(--gh-meeting-text); font-size: 0.82rem; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar {
  margin-top: 14px;
  border: 1px solid var(--gh-meeting-line);
  border-radius: 13px;
  border-spacing: 0;
  overflow: hidden;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar th {
  height: 34px;
  border-bottom: 1px solid var(--gh-meeting-line);
  background: var(--gh-meeting-paper-alt);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar td {
  height: 64px;
  border-inline-end: 1px solid color-mix(in srgb, var(--gh-meeting-line) 72%, transparent);
  border-block-end: 1px solid color-mix(in srgb, var(--gh-meeting-line) 72%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar td:last-child { border-inline-end: 0; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar tbody tr:last-child td { border-block-end: 0; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-blank {
  min-height: 63px;
  border-radius: 0;
}
:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day {
  align-items: flex-start;
  justify-content: flex-start;
  padding: 9px 9px 7px;
  border: 0;
  background: transparent;
  box-shadow: none;
}
:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true'] {
  color: var(--gh-meeting-on-ink-strong);
  background: var(--gh-meeting-ink-soft);
  box-shadow: inset 0 0 0 2px var(--gh-meeting-accent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-today='true']:not([data-selected='true']) .ghm-calendar-number {
  color: var(--gh-meeting-accent-strong);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-number { font-size: 0.9rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day--unavailable { color: var(--gh-meeting-muted); font-weight: 600; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-available { margin-top: auto; font-size: 0.54rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-today-label { position: absolute; inset: 9px 8px auto auto; font-size: 0.5rem; font-weight: 800; text-transform: uppercase; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-check { position: absolute; inset: 8px 8px auto auto; color: var(--gh-meeting-accent); font-size: 0.85rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day[data-selected='true']::after { display: none; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-availability-meter {
  display: flex;
  gap: 2px;
  width: 100%;
  margin-top: 4px;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-availability-meter > span {
  flex: 1;
  height: 2px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--gh-meeting-line-strong) 45%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) [data-availability='low'] .ghm-availability-meter > span:first-child,
:is(efeonce-meeting-scheduler, .ghm-scope) [data-availability='medium'] .ghm-availability-meter > span:nth-child(-n+2),
:is(efeonce-meeting-scheduler, .ghm-scope) [data-availability='high'] .ghm-availability-meter > span {
  background: var(--gh-meeting-accent-strong);
}
:is(efeonce-meeting-scheduler, .ghm-scope) [data-selected='true'] .ghm-availability-meter > span { background: var(--gh-meeting-accent); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-empty {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 10px;
  align-items: center;
  margin-top: 14px;
  padding: 13px 15px;
  border: 1px solid color-mix(in srgb, var(--gh-meeting-line-strong) 58%, transparent);
  border-radius: 11px;
  color: var(--gh-meeting-text);
  background: color-mix(in srgb, var(--gh-meeting-paper-alt) 82%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-empty-icon {
  grid-row: 1 / span 2;
  color: var(--gh-meeting-accent-strong);
  font-size: 1.2rem;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-empty-title { font-size: 0.82rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-empty-body {
  color: var(--gh-meeting-muted);
  font-size: 0.72rem;
  line-height: 1.4;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-density-legend,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-timezone-lens {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  color: var(--gh-meeting-muted);
  background: transparent;
  font-size: 0.68rem;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-density-dot { width: 18px; height: 3px; border-radius: 3px; background: var(--gh-meeting-accent-strong); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-timezone-lens::before { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-timezone-icon { color: var(--gh-meeting-accent-strong); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda {
  padding: clamp(26px, 2.5cqi, 36px);
  background: var(--gh-meeting-paper-alt);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-kicker { margin-bottom: 10px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-date { font-size: 1.02rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-help { margin: 8px 0 18px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slots { gap: 7px; max-height: 270px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot {
  min-height: 48px;
  padding: 9px 12px 9px 16px;
  border-color: var(--gh-meeting-line);
  border-radius: 9px;
  box-shadow: none;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot[data-selected='true'] {
  color: var(--gh-meeting-ink);
  background: var(--gh-meeting-accent-soft);
  border-color: var(--gh-meeting-accent-strong);
  box-shadow: inset 3px 0 0 var(--gh-meeting-accent-strong);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot[data-selected='true'] .ghm-slot-duration { color: var(--gh-meeting-accent-strong); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot-check { margin-inline-start: auto; color: var(--gh-meeting-accent-strong); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection {
  gap: 4px;
  margin-top: 18px;
  padding: 16px 0 0;
  border: 0;
  border-top: 1px solid var(--gh-meeting-line);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection-label { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection-icon { color: var(--gh-meeting-accent-strong); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection .ghm-agenda-time { margin-top: 2px; font-size: 2rem; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-secondary { border-radius: 11px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-action { justify-content: space-between; gap: 12px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-action-icon { font-size: 1rem; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check input {
  appearance: none;
  position: relative;
  flex: 0 0 44px;
  width: 44px;
  min-width: 44px;
  height: 44px;
  margin: 0;
  background: none;
  box-shadow: none;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check input:checked::before {
  background: var(--gh-meeting-accent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-check input:checked::after {
  content: '';
  position: absolute;
  inset: 16px auto auto 16px;
  width: 12px;
  height: 7px;
  border-inline-start: 2px solid var(--gh-meeting-ink);
  border-block-end: 2px solid var(--gh-meeting-ink);
  transform: rotate(-45deg);
}

@media (hover: hover) and (pointer: fine) {
  :is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day:not([data-selected='true']):hover {
    z-index: 1;
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--gh-meeting-accent-soft) 38%, var(--gh-meeting-paper));
    box-shadow: inset 0 0 0 1px var(--gh-meeting-accent-strong);
  }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot:hover {
    transform: none;
    border-color: var(--gh-meeting-accent-strong);
    background: color-mix(in srgb, var(--gh-meeting-accent-soft) 34%, var(--gh-meeting-paper));
  }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary:hover:not(:disabled) { transform: translateY(-1px); }
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day:active,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slot:active,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-primary:active:not(:disabled) {
  transform: scale(0.98);
  transition-duration: var(--gh-meeting-duration-press);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-agenda-status,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-slots,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-selection {
  animation: ghm-causal-enter var(--gh-meeting-duration) var(--gh-meeting-ease) both;
}

@keyframes ghm-causal-enter {
  from { opacity: 0.88; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-live-status,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-live-status { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='command'] .ghm-fact:nth-child(3),
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='split'] .ghm-timezone-lens,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-timezone-lens { display: none; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-signal { padding: 18px 20px 16px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-title { font-size: clamp(1.45rem, 7cqi, 1.8rem); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-facts { gap: 7px 16px; margin-top: 9px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'] .ghm-steps { margin-top: 10px; }

/* Meeting Confirmation Receipt — the entire scheduler resolves into one success shell. */
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] {
  position: relative;
  min-height: 560px;
  background: var(--gh-meeting-paper);
  animation: ghm-confirmation-shell-enter 360ms var(--gh-meeting-ease) both;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed']::after {
  content: '';
  position: absolute;
  z-index: 8;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 28%, color-mix(in srgb, var(--gh-meeting-accent) 24%, transparent) 50%, transparent 72%);
  transform: translateX(-115%);
  animation: ghm-confirmation-sweep 560ms var(--gh-meeting-ease) both;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-signal {
  justify-content: center;
  background:
    radial-gradient(circle at 18% 82%, color-mix(in srgb, var(--gh-meeting-accent) 17%, transparent), transparent 35%),
    linear-gradient(155deg, var(--gh-meeting-ink-soft), var(--gh-meeting-ink) 72%);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-signal-atmosphere {
  width: 310px;
  opacity: 0.75;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-assurance {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 34px;
  padding-top: 18px;
  border-top: 1px solid color-mix(in srgb, var(--gh-meeting-on-ink-strong) 14%, transparent);
  color: var(--gh-meeting-on-ink-muted);
  font-size: 0.75rem;
  line-height: 1.45;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-assurance-icon { color: var(--gh-meeting-accent); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation {
  display: grid;
  align-content: center;
  max-width: 620px;
  min-height: 100%;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-icon-shell {
  display: grid;
  place-items: center;
  width: 42px;
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--gh-meeting-success) 25%, transparent);
  border-radius: 50%;
  color: var(--gh-meeting-success);
  background: color-mix(in srgb, var(--gh-meeting-accent-soft) 78%, var(--gh-meeting-paper));
  box-shadow: 0 0 0 7px color-mix(in srgb, var(--gh-meeting-accent) 7%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-icon { font-size: 1.25rem; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-eyebrow,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-label {
  color: var(--gh-meeting-accent-strong);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-title {
  max-width: 13ch;
  margin: 0;
  color: var(--gh-meeting-ink);
  font-size: clamp(2rem, 3.6cqi, 3.6rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-body {
  max-width: 56ch;
  margin: 18px 0 28px;
  color: var(--gh-meeting-muted);
  font-size: 0.94rem;
  line-height: 1.62;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-receipt {
  position: relative;
  display: grid;
  gap: 5px;
  padding: 22px 24px;
  border: 1px solid var(--gh-meeting-line);
  border-inline-start: 4px solid var(--gh-meeting-accent-strong);
  border-radius: 14px;
  background: color-mix(in srgb, var(--gh-meeting-paper-alt) 72%, var(--gh-meeting-paper));
  box-shadow: 0 12px 30px color-mix(in srgb, var(--gh-meeting-ink) 7%, transparent);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-label { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-label-icon { color: var(--gh-meeting-success); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-date { color: var(--gh-meeting-ink); font-size: 1rem; line-height: 1.35; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-time {
  color: var(--gh-meeting-ink);
  font-size: clamp(1.65rem, 3cqi, 2.35rem);
  font-variant-numeric: tabular-nums;
  font-weight: 760;
  letter-spacing: -0.035em;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 10px;
  padding-top: 13px;
  border-top: 1px solid var(--gh-meeting-line);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-fact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--gh-meeting-muted);
  font-size: 0.75rem;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-fact-icon { color: var(--gh-meeting-accent-strong); }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-aside {
  justify-content: center;
  background: color-mix(in srgb, var(--gh-meeting-paper-alt) 72%, var(--gh-meeting-paper));
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-next { display: grid; align-content: center; width: 100%; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-title {
  margin: 0 0 24px;
  color: var(--gh-meeting-ink);
  font-size: 1.25rem;
  letter-spacing: -0.025em;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-list { display: grid; gap: 18px; margin: 0; padding: 0; list-style: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  color: var(--gh-meeting-text);
  font-size: 0.82rem;
  line-height: 1.5;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-icon {
  margin-top: 3px;
  color: var(--gh-meeting-accent-strong);
  font-size: 1rem;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-help {
  margin: 24px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--gh-meeting-line);
  color: var(--gh-meeting-muted);
  font-size: 0.72rem;
  line-height: 1.55;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-signal {
  padding: 24px 20px;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-live-status,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-eyebrow,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-intro,
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation-assurance { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-work { padding: 30px 18px max(28px, var(--gh-meeting-host-bottom-inset)); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation { min-height: 0; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation-title { font-size: clamp(2rem, 9cqi, 2.45rem); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation-body { margin-block: 16px 24px; font-size: 0.9rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation-receipt { padding: 19px 20px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-receipt-time { font-size: clamp(1.45rem, 7.5cqi, 1.85rem); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation-next { margin-top: 30px; padding-top: 26px; border-top: 1px solid var(--gh-meeting-line); }

@keyframes ghm-confirmation-shell-enter {
  from { opacity: 0.72; transform: scale(0.992); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes ghm-confirmation-sweep {
  0% { opacity: 0; transform: translateX(-115%); }
  28% { opacity: 1; }
  100% { opacity: 0; transform: translateX(115%); }
}

@container (max-width: 650px) {
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-footer { align-items: flex-start; flex-direction: column; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar td { height: 50px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-day,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-blank { min-height: 49px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day { align-items: center; justify-content: center; padding: 5px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) button.ghm-calendar-day { min-width: 45px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-available,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-today-label { display: none; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-availability-meter { width: 18px; margin-top: 4px; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-calendar-check { inset: 4px 4px auto auto; font-size: 0.66rem; }
}

/* Confirmation shell v2 — light temporal workspace, no portal header or card stack. */
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] {
  display: grid;
  grid-template-columns: minmax(190px, 0.52fr) minmax(440px, 1.38fr) minmax(260px, 0.78fr);
  min-height: 590px;
  background:
    radial-gradient(circle at 55% 12%, color-mix(in srgb, var(--gh-meeting-accent) 9%, transparent), transparent 31%),
    linear-gradient(120deg, var(--gh-meeting-paper), color-mix(in srgb, var(--gh-meeting-paper-alt) 58%, var(--gh-meeting-paper)));
  animation: ghm-confirmation-resolve 420ms var(--gh-meeting-ease) both;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed']::after { display: none; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-signal {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  justify-content: space-between;
  padding: 34px 28px;
  border: 0;
  border-inline-end: 1px solid color-mix(in srgb, var(--gh-meeting-accent-strong) 18%, var(--gh-meeting-line));
  color: var(--gh-meeting-ink);
  background:
    radial-gradient(circle at 30% 88%, color-mix(in srgb, var(--gh-meeting-accent) 20%, transparent), transparent 36%),
    color-mix(in srgb, var(--gh-meeting-accent-soft) 46%, var(--gh-meeting-paper));
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-signal-atmosphere { display: none; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-live-status {
  display: inline-flex;
  margin: 0;
  color: var(--gh-meeting-accent-strong);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-eyebrow {
  margin: auto 0 10px;
  color: var(--gh-meeting-accent-strong);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-title {
  max-width: 9ch;
  color: var(--gh-meeting-ink);
  font-size: clamp(1.55rem, 2cqi, 2.1rem);
  line-height: 1.02;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-intro {
  margin: 16px 0 0;
  color: var(--gh-meeting-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-assurance {
  margin-top: 24px;
  padding-top: 16px;
  border-color: color-mix(in srgb, var(--gh-meeting-accent-strong) 18%, transparent);
  color: var(--gh-meeting-muted);
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-work {
  grid-column: 2;
  grid-row: 1;
  padding: clamp(38px, 4cqi, 64px);
  background: transparent;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation { max-width: 680px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-status { margin-bottom: 18px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-icon-shell {
  width: 36px;
  border: 0;
  color: var(--gh-meeting-paper);
  background-color: var(--gh-meeting-success);
  box-shadow: 0 0 0 7px color-mix(in srgb, var(--gh-meeting-accent) 10%, transparent);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-icon { font-size: 1.05rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-title {
  max-width: 15ch;
  font-size: clamp(2.35rem, 3.25cqi, 3.35rem);
  line-height: 0.96;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-body { margin-block: 16px 34px; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-receipt {
  display: grid;
  gap: 6px;
  padding: 25px 0 23px;
  border: 0;
  border-block: 1px solid var(--gh-meeting-line);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-receipt::before {
  content: '';
  position: absolute;
  inset: -1px auto auto 0;
  width: 118px;
  height: 2px;
  background: var(--gh-meeting-accent-strong);
  transform-origin: left;
  animation: ghm-confirmation-line 520ms 120ms var(--gh-meeting-ease) both;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-label { margin-bottom: 10px; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-date { font-size: 0.95rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-time {
  font-size: clamp(2.25rem, 3.5cqi, 3.75rem);
  line-height: 1.02;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-receipt-facts { margin-top: 15px; padding-top: 15px; }

:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-confirmation-aside {
  grid-column: 3;
  grid-row: 1;
  display: flex;
  justify-content: center;
  padding: clamp(34px, 3.2cqi, 52px) clamp(26px, 2.8cqi, 44px);
  border: 0;
  border-inline-start: 1px solid var(--gh-meeting-line);
  background: transparent;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-title { margin-bottom: 30px; font-size: 1.05rem; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-list { gap: 24px; counter-reset: confirmation-step; }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-item {
  position: relative;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 12px;
  font-size: 0.78rem;
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-item:not(:last-child)::after {
  content: '';
  position: absolute;
  inset: 24px auto -17px 8px;
  width: 1px;
  background: var(--gh-meeting-line);
}
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-next-icon { color: var(--gh-meeting-success); }
:is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-help { margin-top: 30px; }

@keyframes ghm-confirmation-resolve {
  from { opacity: 0; clip-path: inset(0 0 7% 0 round var(--gh-meeting-radius)); transform: translateY(8px); }
  to { opacity: 1; clip-path: inset(0 round var(--gh-meeting-radius)); transform: translateY(0); }
}

@keyframes ghm-confirmation-line {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@container (max-width: 980px) {
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] {
    grid-template-columns: minmax(0, 1.35fr) minmax(250px, 0.75fr);
    min-height: 0;
  }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-signal {
    grid-column: 1 / -1;
    grid-row: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px 24px;
    padding: 22px 30px;
    border-inline-end: 0;
    border-block-end: 1px solid color-mix(in srgb, var(--gh-meeting-accent-strong) 18%, var(--gh-meeting-line));
  }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-live-status,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-eyebrow,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-intro { display: none; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-title { max-width: none; font-size: 1.45rem; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-assurance { margin: 0; padding: 0; border: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-work { grid-column: 1; grid-row: 2; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] .ghm-confirmation-aside { grid-column: 2; grid-row: 2; }
}

@container (max-width: 650px) {
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-phase='confirmed'] { display: flex; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-signal {
    display: block;
    padding: 18px 20px;
    background: color-mix(in srgb, var(--gh-meeting-accent-soft) 52%, var(--gh-meeting-paper));
  }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-title {
    color: var(--gh-meeting-ink);
    font-size: 1.25rem;
  }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-work { padding: 30px 20px max(28px, var(--gh-meeting-host-bottom-inset)); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation-title { font-size: clamp(2rem, 9cqi, 2.4rem); }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-confirmation-receipt { padding-inline: 0; }
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-scene[data-recipe='guided'][data-phase='confirmed'] .ghm-receipt-time { font-size: clamp(1.8rem, 9cqi, 2.35rem); }
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
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-secondary,
  :is(efeonce-meeting-scheduler, .ghm-scope) .ghm-confirmation-receipt { border: 1px solid CanvasText; }
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
