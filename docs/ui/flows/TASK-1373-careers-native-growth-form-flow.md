# TASK-1373 — Careers Native Growth Form Flow

## Flow Summary

Candidate applies to a public Efeonce opening through native Growth Forms. Careers hosts the experience; Growth Forms owns fields, validation, upload, consent, captcha, submit and ATS destination delivery.

## Actors

- Candidate: anonymous public visitor.
- Careers host: `/public/careers/[publicId]/apply`.
- Growth Forms: render contract + public submit API.
- Hiring/ATS: destination adapter creates/reuses `hiring_application`.

## Happy Path

1. Candidate opens `/public/careers/{publicId}/apply`.
2. Careers page loads opening context and host chrome.
3. `<greenhouse-form>` loads the published Careers application render contract.
4. Candidate fills required fields.
5. Candidate optionally uploads CV.
6. Growth Forms validates fields, phone country/mask, consent and file policy.
7. Growth Forms executes Turnstile and accepts submission.
8. Growth Forms stores submission/consent/file metadata and private asset.
9. Growth Forms ATS destination calls the Hiring application command.
10. ATS dedupes or creates application.
11. Candidate sees generic success.

## Error / Recovery Paths

- Opening unavailable: Careers unavailable view, no form render.
- Render contract unavailable: renderer unavailable/retry fallback.
- Invalid field: renderer inline error and focus behavior.
- CV invalid: file field error near uploader.
- Captcha failed: generic retryable error.
- ATS duplicate: generic success, never reveals prior application.
- Destination failure after accepted submit: Growth Forms attempt ledger retries/dead-letters; public copy remains generic.

## State Ownership

- Careers owns: page route, opening title, brand shell, no-JS fallback.
- Growth Forms owns: fields, validation, consent, captcha, upload, submit, success, telemetry.
- Hiring owns: application reconciliation/dedupe/pipeline.

## GVC Markers

- `careers-apply-form`
- `careers-growth-form-host`
- `careers-cv-uploader`
- `careers-apply-success`

## GVC Scenario Plan

- Scenario: `task354-careers-runtime-audit`.
- Route: `/public/careers/EO-OPN-0057/apply` or another published opening returned by the public Careers reader.
- Viewports: desktop 1440 and mobile 390.
- Required evidence: host chrome, native `<greenhouse-form>`, CV uploader marker, success marker when submit path is exercised, and explicit `scrollWidth === clientWidth` checks.
- Latest local evidence: `.captures/2026-07-13T21-01-34_task354-careers-runtime-audit` PASS with native flag ON, no runtime/layout findings, no horizontal overflow.
- Latest staging evidence: `.captures/2026-07-13T22-07-38_task354-careers-runtime-audit` PASS on `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`, desktop 1440 + mobile 390, `apply-form` and `cv-uploader` marked, no runtime/layout findings.

## Design Decision Log

- Careers owns only opening context, brand shell, fallback and the `openingPublicId` initial value; Growth Forms owns fields, validation, captcha, upload, submit, success and telemetry.
- The cutover is guarded by `CAREERS_NATIVE_GROWTH_FORM_ENABLED`; custom `CareersApplyClient` remains the rollback path while production sign-off is pending.
- `form_destination` is intentionally unused for ATS. The accepted Growth Forms event is projected by `growth_hiring_application_from_submission`, preserving a single Hiring command path.
- Success remains generic for accepted and deduped submissions; no candidate state or internal IDs are exposed to the browser.

## Non-Goals

- No candidate account login.
- No public display of application status.
- No identity document upload in public apply V1.
- No custom Careers-only submit endpoint after migration.
