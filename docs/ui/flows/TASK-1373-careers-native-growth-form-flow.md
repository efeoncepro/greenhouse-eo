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

## Non-Goals

- No candidate account login.
- No public display of application status.
- No identity document upload in public apply V1.
- No custom Careers-only submit endpoint after migration.
