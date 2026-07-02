# TASK-1318 — Growth Forms full name destination split

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `copy`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1318-growth-forms-full-name-destination-split.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `optional`
- Status real: `code complete, rollout pendiente`
- Rank: `TBD`
- Domain: `growth|public-site|hubspot`
- Blocked by: `production code rollout approval / release control plane`
- Branch: `develop` (`codex:task-hook` declared `task/TASK-1318-growth-forms-full-name-destination-split`; operator requested immediate execution without branch switch)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte la captura de nombre en Growth Forms en una capacidad reusable: los formularios pueden mostrar un solo campo `Nombre completo`, preservar ese valor y derivar `firstName`/`lastName` server-side antes de entregar a destinos. El primer consumidor es el formulario AEO `/aeo-2/`, que debe cambiar el label visible de `Nombre` a `Nombre completo` y mapear HubSpot a sus propiedades nativas `firstname` y `lastname`.

## Why This Task Exists

El formulario AEO live hoy muestra `Nombre` y entrega el campo `firstName -> firstname`. HubSpot separa nombre y apellido en propiedades nativas de contacto (`firstname`, `lastname`), pero agregar un segundo campo visible de apellido al diagnóstico aumenta fricción sin resolver nombres complejos de forma perfecta. La brecha real está en Growth Forms: falta una política declarativa de normalización de nombres que sirva a todos los formularios y mantenga los detalles de destino fuera del browser.

## Goal

- Agregar una política reusable de Growth Forms para derivar `firstName`/`lastName` desde un campo visible `fullName`.
- Publicar AEO vNext con label `Nombre completo`, `autocomplete="name"` y destination mapping `firstName -> firstname`, `lastName -> lastname`.
- Preservar el valor raw `fullName`; nunca fabricar apellido si el usuario ingresa un solo token.
- Verificar contrato local, destino HubSpot y label live sin exponer mapping de destino al browser.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`

Reglas obligatorias:

- HubSpot sigue siendo destination adapter; Greenhouse es source of truth de fields, validation, policy, persistence y delivery.
- El browser nunca recibe HubSpot `formGuid`, `fieldMapping`, portal credentials ni nombres de propiedades de destino.
- Versiones publicadas son inmutables: AEO se cambia publicando vNext, no editando la versión v7.
- Names son PII ligera: preservar raw para auditoría operativa, pero no loggear valores ni exponerlos en telemetry.
- La normalización debe ser conservadora y declarativa; no usar regex libre administrable ni heurísticas que fabriquen apellidos.

## Normative Docs

- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/commands.ts`
- `src/lib/growth/forms/destinations/hubspot/adapter.ts`
- `src/lib/growth/forms/dispatch.ts`
- `scripts/growth/activate-aeo-reference-copy-contract.ts`
- `scripts/hubspot/upsert-form-fields.ts`
- `scripts/hubspot/examples/upsert-aeo-brand-website-field.json`
- `docs/ui/wireframes/TASK-1318-growth-forms-full-name-destination-split.md`

## Dependencies & Impact

### Depends on

- Growth Forms backend/API parity (`TASK-1229`) and HubSpot secure-submit adapter (`TASK-1230`) complete.
- AEO renderer live via `<greenhouse-form>` (`TASK-1298`) and v7 published contract.
- HubSpot destination form `8649e76c-8b01-41f3-9b0c-5713d7b4dba6` in portal `48713323`.

### Blocks / Impacts

- Impacts AEO public lead capture and any future Growth Form that wants a single full-name field.
- Improves downstream HubSpot contact quality by sending native `firstname`/`lastname` when possible.
- Creates a pattern for future per-field derived values without moving destination mapping into UI.

### Files owned

- `src/lib/growth/forms/name-normalization.ts`
- `src/lib/growth/forms/commands.ts`
- `src/lib/growth/forms/destinations/hubspot/adapter.ts`
- `src/lib/growth/forms/__tests__/*`
- `scripts/growth/activate-aeo-reference-copy-contract.ts`
- `scripts/hubspot/examples/upsert-aeo-lastname-field.json`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- AEO form definition `fdef-efeonce-aeo-diagnostic`, `form_key=b120566a-dd1a-43c8-956a-4e0121e805b8`, published v7 `fver-f2f8abde-3b11-42b3-bf78-a309ef7678ad`.
- AEO field schema currently includes `firstName` with label `Nombre`, required, `autocomplete="given-name"`.
- AEO HubSpot mapping currently includes `firstName -> firstname`, but no `lastName -> lastname`.
- HubSpot adapter reads `submission.normalized_fields_json` and allowlists only mapped fields.
- HubSpot native contact properties for name parts are `firstname` and `lastname`.

### Gap

- Growth Forms lacks a reusable server-side name derivation policy.
- AEO asks for one visible name field but downstream HubSpot needs two native contact fields.
- If we only rename `firstName` to `Nombre completo`, HubSpot would receive the whole string as `firstname` and `lastname` remains empty.
- If we add a visible `Apellido` field to AEO, we increase friction for a diagnostic intake and still do not solve compound names perfectly.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite`
- Usuario / rol: visitante publico solicitando diagnóstico AEO.
- Momento del flujo: primer campo del formulario en `/aeo-2/#diagnostico`.
- Resultado perceptible esperado: el campo se entiende como nombre completo, sin agregar un segundo input.
- Friccion que debe reducir: pedir apellido por separado en un formulario de baja fricción.
- No-goals UX: rediseñar la card, modificar layout, motion, selectores, trust copy o CTA.

### Surface & system decision

- Surface: WordPress AEO conversion card rendered by `<greenhouse-form>`.
- Composition Shell: `no aplica` — landing WordPress existente, no vista Greenhouse React.
- Primitive decision: `reuse` — Growth Forms portable renderer; no primitive nueva.
- Adaptive density / The Seam: `no aplica` — no hay layout/card nuevo.
- Floating/Sidecar/Dialog decision: N/A.
- Copy source: Growth Forms `field_schema` published contract.
- Access impact: `none`.

### State inventory

- Default: label visible `Nombre completo`.
- Loading: renderer existing skeleton; unchanged.
- Empty: N/A.
- Error: required error references full name if updated by activation script.
- Degraded / partial: one-token full name derives only first name; raw `fullName` preserved.
- Permission denied: unchanged.
- Long content: no layout change; renderer input handles text.
- Mobile / compact: unchanged; field remains one column/paired row per renderer rules.
- Keyboard / focus: unchanged.
- Reduced motion: unchanged.

### Interaction contract

- Primary interaction: type full name once.
- Hover / focus / active: unchanged renderer behavior.
- Pending / disabled: unchanged submit behavior.
- Escape / click-away: N/A.
- Focus restore: unchanged renderer invalid-submit behavior.
- Latency feedback: unchanged.
- Toast / alert behavior: unchanged.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: unchanged.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: N/A.
- Reduced-motion fallback: existing renderer fallback.
- Non-goal motion: no new motion for a copy/backend enrichment change.

### Implementation mapping

- Route / surface: `https://efeoncepro.com/aeo-2/#diagnostico`, widget `convers`.
- Primitive / variant / kind: `<greenhouse-form>`, `formKind=diagnostic_intake`, `style_variant=diagnostic_premium`.
- Component candidates: none; field label comes from `field_schema`.
- Copy source: AEO vNext published Growth Forms contract.
- Data reader / command: `submitForm` enriches `normalizedFields` from a declared `validation_schema_json.namePolicy`.
- API parity: public submit API is the single write path; destination mapping remains in Greenhouse and adapter.
- Access / capability: existing public surface/Turnstile/email gate.
- States to implement: full name split with 1 token, 2 tokens, 3+ tokens.

### GVC scenario plan

- Scenario file: use `pnpm public-website:verify-aeo-live-contract`; add focused Playwright if needed for label assertion.
- Route: `https://efeoncepro.com/aeo-2/#diagnostico`
- Viewports: desktop `1440x1200`, mobile `390x1100`.
- Required steps: load, scroll to conversion, assert label `Nombre completo`, assert formKey unchanged, assert no overflow.
- Required captures: conversion card desktop/mobile if live form version is published.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root.
- Assertions: label exact, no standalone `Nombre`, `security.captcha` preserved, `heroans` hash unchanged if WordPress is touched.
- Scroll-width checks: desktop and mobile 390.
- Reduced-motion / focus evidence: unchanged; rely on existing renderer verifier unless a regression is detected.

### Design decision log

- Decision: keep a single visible full-name field for AEO and split on submit by declared Growth Forms policy.
- Alternatives considered: visible `Nombre` + `Apellido`; visible `Nombre` only; custom HubSpot full-name property.
- Why this pattern: AEO is conversion-oriented and should stay low-friction; HubSpot already has native contact `firstname`/`lastname`, and server-side derivation avoids leaking mapping to the browser.
- Reuse / extend / new primitive: extend backend policy; reuse renderer and HubSpot adapter.
- Open risks: names are culturally complex; the normalizer must be conservative and preserve raw `fullName`.

### Visual verification

- GVC scenario: `pnpm public-website:verify-aeo-live-contract`
- Viewports: desktop + mobile 390.
- Required captures: conversion card after publish if changed live.
- Required `data-capture` markers: `.gh-aeo-conversion`.
- Scroll-width check: no page overflow.
- Accessibility/focus checks: existing renderer invalid-submit checks.
- Before/after evidence: label before `Nombre`; after `Nombre completo`.
- Known visual debt: none expected; no layout or style change.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: Growth Forms published `validation_schema_json`, `field_schema_json`, `normalized_fields_json` and HubSpot destination mapping.
- Consumidores afectados: public submit API, destination dispatcher, HubSpot secure-submit, public AEO renderer.
- Runtime target: `production|external`.

### Contract surface

- Contrato existente a respetar: `PublicFormSubmitInput`, `submitForm`, `form_destination.mapping_json.fieldMapping`, HubSpot secure-submit body.
- Contrato nuevo o modificado: `namePolicy` in `validation_schema_json` with mode `split_full_name`, `sourceField`, `firstNameField`, `lastNameField`, optional confidence field.
- Backward compatibility: `compatible` — policy off by default; old forms continue unchanged.
- Full API parity: public submit API remains the single governed write path; browser submits raw field, server derives destination-safe fields.

### Data model and invariants

- Entidades/tablas/views afectadas: no schema migration; existing `greenhouse_growth.form_versions`, `form_submissions`, `form_destinations`.
- Invariantes que no se pueden romper:
  - Published versions are immutable; AEO change creates vNext.
  - Raw `fullName` persists exactly normalized for whitespace but not destructively split away.
  - One-token names do not create a fabricated `lastName`.
  - Destination adapter sends only mapped properties; `fullName` is not sent to HubSpot unless explicitly mapped.
  - HubSpot native properties are `firstname` and `lastname`.
- Tenant/space boundary: public form surface and destination policies unchanged; no tenant-derived name logic.
- Idempotency/concurrency: submit persistence remains existing transaction; enrichment is deterministic and side-effect free.
- Audit/outbox/history: existing submission ledger and destination attempts remain audit surface; no new outbox.

### Migration, backfill and rollout

- Migration posture: `none` (new version publish only).
- Default state: policy disabled unless `validation_schema_json.namePolicy` declares it.
- Backfill plan: none; existing submissions are historical truth and are not rewritten.
- Rollback path: publish/deprecate back to previous AEO version or revert activation script; no DB rollback.
- External coordination: HubSpot destination form may need `lastname` in field groups; use governed upsert helper dry-run/apply before live delivery smoke.

### Security and access

- Auth/access gate: existing public surface allowlist, CORS, Turnstile and email gate.
- Sensitive data posture: PII-light contact name; never log raw values.
- Error contract: no raw HubSpot/provider errors to public submit; existing adapter errors remain sanitized.
- Abuse/rate-limit posture: unchanged existing public submit defenses.

### Runtime evidence

- Local checks: unit tests for name split policy and HubSpot body mapping.
- DB/runtime checks: read current AEO version/destination; publish vNext only after dry-run; verify current published version after apply.
- Integration checks: HubSpot form upsert dry-run/apply for `lastname` if missing; secure-submit smoke where safe.
- Reliability signals/logs: existing `growth.forms.hubspot_submit_failed` catches destination failures.
- Production verification sequence: publish AEO vNext, run `pnpm public-website:verify-aeo-live-contract`, verify field label and destination mapping.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

`N/A — no new business capability`. This task modifies an existing public submit command and destination enrichment policy. The governed programmatic path remains the existing public submit API plus admin/versioning scripts; no UI-only behavior is introduced.

## Hybrid Execution Justification

- Why not split: the visible UI change is one label and is not independently safe without the backend destination split; the backend change is small, reversible and schema-free.
- Primary execution profile: `backend-data`.
- Contract boundary: Growth Forms backend policy owns derivation and destination fields; renderer only displays the published label.
- Risk controls: policy off by default, AEO vNext publish rather than in-place mutation, HubSpot dry-run before apply, local tests for split edge cases and mapping.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reusable Growth Forms name policy

- Add a server-side name normalization module with conservative `splitFullName` semantics.
- Wire the policy into `submitForm` after field validation/normalization and before persistence/destination dispatch.
- Add unit tests for one-token, two-token, multi-token, whitespace and existing-field preservation cases.

### Slice 2 — AEO vNext contract and HubSpot mapping

- Update the AEO activation script to publish `fullName` label `Nombre completo`, `autocomplete="name"`, and `validation_schema_json.namePolicy`.
- Update destination mapping to send derived `firstName -> firstname` and `lastName -> lastname`.
- Add a HubSpot upsert config for the destination form `lastname` field and run dry-run/apply if access is available.

### Slice 3 — Verification, docs and rollout evidence

- Run local tests and task gates.
- Publish AEO vNext only after dry-run confirms the new contract.
- Verify live label and unchanged AEO public contract with the existing verifier.
- Update runtime docs, handoff and changelog.

## Out of Scope

- Adding a visible `Apellido` field to AEO.
- Rewriting historical submissions.
- Redesigning the AEO form/card or renderer.
- Creating custom HubSpot properties for full name.
- Changing Greenhouse schema or adding migrations.
- Making a universal human-name parser; this is conservative destination enrichment only.

## Detailed Spec

`namePolicy` expected shape:

```json
{
  "mode": "split_full_name",
  "sourceField": "fullName",
  "firstNameField": "firstName",
  "lastNameField": "lastName",
  "confidenceField": "nameParseConfidence"
}
```

Split semantics:

- Trim and collapse whitespace.
- Empty string: no derived fields; required validation should already block if field is required.
- One token: `firstName=token`, no `lastName`.
- Two tokens: first token is `firstName`, second token is `lastName`.
- Three or more tokens: first token is `firstName`, remaining tokens joined as `lastName`.
- Existing explicit `firstName`/`lastName` values win over derived values to avoid overwriting forms that already collect separate fields.
- Preserve `fullName` in `normalized_fields_json`.

HubSpot mapping:

- Native contact `firstname` receives derived `firstName`.
- Native contact `lastname` receives derived `lastName` only when present.
- Do not map `fullName` to HubSpot for AEO.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (backend policy + tests) -> Slice 2 (AEO vNext + HubSpot field upsert) -> Slice 3 (publish/live verification/docs). Do not publish AEO vNext before the HubSpot destination form can accept `lastname`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nombre complejo se divide imperfectamente | HubSpot data quality | medium | conservative split, raw `fullName` preserved, one-token no fabricated lastname | CRM review / submission samples |
| HubSpot form rechaza `lastname` por no estar en fieldGroups | HubSpot secure-submit | medium | dry-run/apply governed upsert before publish; secure-submit smoke if possible | `growth.forms.hubspot_submit_failed` |
| Existing forms get unexpected name derivation | Growth Forms | low | policy off by default; tests confirm no-op without namePolicy | unit tests |
| AEO label changes but mapping still sends whole name to firstname | HubSpot data quality | medium | tests for adapter body + destination mapping verification after publish | HubSpot test submission |

### Feature flags / cutover

Sin flag — additive and policy-gated by form version. Cutover happens by publishing AEO vNext; rollback is publish/deprecate back to v7.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert code; policy absent/no-op | <10 min | si |
| Slice 2 | do not publish vNext or republish previous mapping | <10 min | si |
| Slice 3 | deprecate vNext and restore v7 as current published version via script/manual command | <15 min | si |

### Production verification sequence

1. Read current AEO form/destination and confirm v7 baseline.
2. HubSpot upsert dry-run for `lastname`; apply only if missing and dry-run is safe.
3. Publish AEO vNext with `fullName`, `namePolicy` and mapping.
4. Run `pnpm public-website:verify-aeo-live-contract` plus focused label check if needed.
5. Verify destination mapping does not expose in public GET and includes `lastName -> lastname` in server-side destination config.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `submitForm` applies declared `namePolicy` before persisting and dispatching, and is no-op without policy. Evidence: local code + `pnpm vitest run src/lib/growth/forms`.
- [x] Unit tests cover one-token, two-token, multi-token, whitespace and existing explicit name fields.
- [x] AEO vNext field schema displays `Nombre completo` with `key=fullName` and `autocomplete=name`. Evidence: v8 `fver-38d38bbc-6a32-4e2c-bbd7-c0f0fc728c63`.
- [x] AEO vNext validation schema declares `namePolicy.mode=split_full_name`.
- [x] AEO destination mapping sends `firstName -> firstname` and `lastName -> lastname`, and does not map `fullName` to HubSpot.
- [x] HubSpot destination form can accept `lastname` or rollout is blocked with evidence. Evidence: dry-run reported `form_field_exists contacts.lastname`.
- [x] Public render contract does not expose HubSpot mapping or destination form GUID. Evidence: public API verifier remains green.
- [x] `pnpm public-website:verify-aeo-live-contract` passes after publish, or rollout remains explicitly pending.
- [x] `UI ready: yes` is justified by the wireframe implementation mapping, GVC plan and design decision log; `pnpm task:lint --task TASK-1318` passes.
- [ ] Production runtime executes the new server-side split code. Pending: promote/deploy this code through the release control plane, or rollback/mitigate AEO v8.

## Verification

- ✅ `pnpm codex:task-hook TASK-1318`
- ✅ `pnpm task:lint --task TASK-1318`
- ✅ `pnpm ops:lint --changed`
- ✅ `pnpm vitest run src/lib/growth/forms` — 17 files / 135 tests passed.
- ✅ `pnpm typecheck`
- ✅ `pnpm lint`
- ✅ `pnpm build` — completed successfully; Next emitted only an existing broad-pattern warning in `roadmap/work-item-index/reader.ts`.
- ✅ `pnpm docs:closure-check` — passed with advisory warnings tied to broader AEO/skill docs already in the worktree; no feature-flag misses.
- ✅ focused read query for AEO current published version and destination mapping: v8 `fver-38d38bbc-6a32-4e2c-bbd7-c0f0fc728c63`, `fullName` visible, `namePolicy.split_full_name`, mapping `firstName -> firstname`, `lastName -> lastname`, no `fullName` destination mapping.
- ✅ `pnpm hubspot:forms:upsert-fields -- --config scripts/hubspot/examples/upsert-aeo-lastname-field.json` — dry-run found `contacts.lastname` already present on the form; no apply needed.
- ✅ `pnpm growth:forms:activate-aeo-reference-copy -- --apply` — published v8 and deprecated v7.
- ✅ `pnpm public-website:verify-aeo-live-contract` — live label/API/visual contract passed after v8 publish.
- ⚠️ Production deployment not performed: `greenhouse-production-release` requires explicit approval for external production mutation. Runtime submit split remains rollout-pending until this code is promoted.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real.
- [ ] archivo movido a `complete/` si se cierra.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `Handoff.md` actualizado con `/goal` exception, rollout evidence and any pending external blocker.
- [ ] `changelog.md` actualizado.
- [ ] Runtime docs updated if AEO vNext is published.

## Follow-ups

- If conversion data shows quality issues, consider an optional per-form UX mode with separate `Nombre` and `Apellido` fields for high-precision forms.
- Consider exposing name normalization policy in the Growth Forms admin cockpit after this backend contract proves stable.

## Open Questions

- None blocking. The selected UX is `Nombre completo` for AEO, with server-side split and raw value preservation.
