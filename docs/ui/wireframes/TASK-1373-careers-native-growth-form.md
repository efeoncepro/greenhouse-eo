# TASK-1373 — Careers Native Growth Form Wireframe

## Purpose

Replace the custom Careers apply form with native `<greenhouse-form>` while preserving the approved Efeonce Careers visual language from `~/Documents/carreers/Efeonce Carrers/Efeonce Careers.dc.html`.

## Surface

- Route: `/public/careers/[publicId]/apply`
- Host shell: `CareersPublicShell`
- Main host marker: `data-capture="careers-apply-form"`

## Layout

```text
Header
  Logo | Trabaja con nosotros | Volver al detalle | locale

Main
  Apply hero
    Eyebrow
    H1 Postulate to {role}
    Short intro

  Growth Form host
    <greenhouse-form
      form-key="{careers application form key}"
      surface="public-careers-nextjs"
      locale="es-CL"
      color-scheme="light"
      appearance="bare"
    >
      no-JS fallback
    </greenhouse-form>

Footer
```

## Field Expectations

- Name and last name keep explicit labels and icon treatment.
- Email uses mail icon.
- Phone uses Growth Forms international selector with country/calling code and phone icon.
- Portfolio uses link icon.
- LinkedIn uses LinkedIn icon.
- CV uses Growth Forms file/upload control backed by private asset handling.
- Consent is rendered by Growth Forms and remains required.
- Submit CTA uses white text on blue and send/pending icon treatment.

## States

- Loading: renderer skeleton inside form host.
- Default: all fields ready, no alert block above the form unless there is a real degraded state.
- Invalid: inline errors plus accessible summary/first invalid focus behavior from renderer.
- Upload error: type/size/empty errors near CV field.
- Captcha error: generic, retryable.
- Success: generic success card; no dedupe/candidate-state leak.
- Renderer unavailable: no-JS/retry fallback.

## Copy

Copy is owned by the Growth Forms published contract plus reusable Careers copy in:

- `src/lib/copy/dictionaries/es-CL/careers.ts`
- `src/lib/copy/dictionaries/en-US/careers.ts`

No reusable visible string should be hardcoded in JSX.

## Implementation Mapping

- Replace local apply form state/submit in `src/components/greenhouse/careers/CareersApplyClient.tsx`.
- Use native Growth Forms renderer from `src/growth-forms-renderer/**`.
- Keep only host chrome, route/opening context, no-JS fallback and any renderer theming tokens in Careers.
- Data command path: Growth Forms public submit -> ATS destination from `TASK-1372`.
- Remove direct fetch from Careers apply component to `/api/public/hiring/applications`.

## GVC Scenario Plan

- Scenario: update `scripts/frontend/scenarios/task354-careers-runtime-audit.scenario.ts` or add a TASK-1373 scenario.
- Viewports: 1440 desktop and 390 mobile.
- Captures:
  - apply hero + first fold
  - form default
  - phone country field
  - CV upload field
  - invalid state
  - success state
- Assertions:
  - no "Postulación segura" decorative info alert above form
  - icons present for key fields
  - phone selector visible
  - no horizontal overflow
  - submit uses Growth Forms events

## Design Decision Log

- Decision: native Growth Forms owns the application form.
- Rejected: continuing a local React form with shared helper imports.
- Reason: one form engine, one consent/Turnstile/telemetry/ATS handoff path.
- Risk: renderer must support application upload and visual fidelity; blocked by `TASK-1372`.
