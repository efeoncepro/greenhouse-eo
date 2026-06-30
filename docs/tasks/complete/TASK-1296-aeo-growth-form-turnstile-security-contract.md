# TASK-1296 — AEO Growth Form Turnstile security contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `optional`
- Status real: `Complete 2026-06-30; produccion serializa security.captcha y POST falla cerrado sin token`
- Rank: `TBD`
- Domain: `growth|public-site`
- Blocked by: `none`
- Branch: `codex/aeo-forms-turnstile-followup`

## Summary

Publicar una nueva version del form `efeonce-aeo-diagnostic` que declare `security.captcha` con Turnstile invisible y site key publica. El renderer ya sabe emitir `captchaToken`; produccion ya serializa `render_contract.security.captcha` en el `GET` publico. La task queda cerrada sin tocar WordPress live.

## Why This Task Exists

TASK-1294 completo la paridad tecnica del renderer, pero AEO necesitaba una version publicada que declarara la metadata browser-safe `security.captcha` y un deploy productivo que la serializara en el render contract publico. Sin esa metadata, `<greenhouse-form>` no ejecuta Turnstile aunque el runtime ya pueda hacerlo.

## Goal

- Clonar la version publicada vigente de AEO sin modificar versiones publicadas in-place.
- Agregar `ui_policy_json.security.captcha` browser-safe con Turnstile invisible.
- Publicar la nueva version y deprecar la anterior por commands canonicos.
- Verificar que la version publicada contiene `security.captcha`, que el `POST` sigue fail-closed sin token y que el `GET` publico expone `security.captcha` cuando el deploy de TASK-1294 este en produccion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`

Reglas obligatorias:

- Nunca escribir `_elementor_data` ni tocar WordPress en esta task.
- Nunca modificar una version `published` in-place; clonar, publicar y deprecar.
- Exponer solo site key publica, provider, mode, required y execution. Nunca `TURNSTILE_SECRET`, HubSpot GUIDs, property mapping ni tokens.
- Mantener AEO `/aeo-2/` en bridge HTML hasta una task WordPress/visual separada.

## Normative Docs

- `docs/tasks/complete/TASK-1294-growth-forms-renderer-turnstile-captcha-token.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `TASK-1294` complete.
- Existing commands in `src/lib/growth/forms/commands.ts`.
- Existing AEO activation script pattern: `scripts/growth/activate-aeo-email-gate.ts`.

### Blocks / Impacts

- Follow-up WordPress migration from bridge HTML to `<greenhouse-form>`.
- Generic renderer smoke for AEO.

### Files owned

- `scripts/growth/activate-aeo-turnstile-security.ts`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

## Current Repo State

### Already exists

- AEO form slug `efeonce-aeo-diagnostic`.
- Surface `fhsf-efeonce-aeo-diagnostic`.
- Public site key `0x4AAAAAADqwX2R7v-k9pItv`.
- Public GET returns the current published v3 version and serializes `render_contract.security.captcha`.
- TASK-1294 added renderer support for `security.captcha`.

### Gap

- The AEO v3 form version declares `ui_policy_json.security.captcha`; production public GET serializes that policy into `render_contract.security`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_growth.form_version.ui_policy_json`
- Consumidores afectados: public render API, `<greenhouse-form>`, future WordPress/Astro hosts
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `RenderContract.security.captcha`
- Contrato nuevo o modificado: AEO published form version must include:

```json
{
  "security": {
    "captcha": {
      "provider": "turnstile",
      "required": true,
      "mode": "invisible",
      "siteKey": "0x4AAAAAADqwX2R7v-k9pItv",
      "execution": "submit"
    }
  }
}
```

- Backward compatibility: compatible; bridge WordPress sigue usando su propio Turnstile hasta migracion visual.
- Full API parity: public API exposes the contract; no host-specific logic.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_version`, `greenhouse_growth.form_destination`.
- Invariantes:
  - version published immutable;
  - destination copied from the previous published version;
  - email gate and field schemas preserved;
  - site key public only; secret server-only.
- Tenant/space boundary: existing public surface/origin checks unchanged.
- Idempotency/concurrency: script must no-op if current published version already has matching captcha config.
- Audit/outbox/history: lifecycle uses existing commands and version statuses.

### Migration, backfill and rollout

- Migration posture: no schema migration; data/version rollout only.
- Default state: dry-run first.
- Backfill plan: none.
- Rollback path: republish/deprecate back to previous version via existing commands if new contract breaks render.
- External coordination: none; Turnstile secret is already configured for prod per ledger, but smoke must not expose it.

### Security and access

- Auth/access gate: script runs from trusted repo/server context.
- Sensitive data posture: no PII change.
- Error contract: publish compiler blocking reasons must fail loud.
- Abuse/rate-limit posture: server-side Turnstile verification unchanged.

### Runtime evidence

- Dry-run output.
- Apply output with new `formVersionId`.
- Public GET with ACAO from `https://efeoncepro.com` showing v3 and `security.captcha`.
- Public submit without token still returns `captcha_failed/missing_token`.
- No WordPress mutation.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime evidence is listed.
- [ ] Sensitive domains have no raw data leaks.

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

### Slice 1 — Activation script

- Add dry-run/apply script modelled after `activate-aeo-email-gate.ts`.
- Preserve current fields, validation, destinations and policies.
- Add `ui_policy_json.security.captcha`.

### Slice 2 — Apply and smoke

- Run dry-run.
- Run apply.
- Verify public GET returns v3 now, and exposes `security.captcha` after TASK-1294 code deployment.
- Verify POST without token remains fail-closed.

### Slice 3 — Docs

- Update AEO/Growth Forms docs with new published version and status.

## Out of Scope

- Replacing the live WordPress bridge with `<greenhouse-form>`.
- Elementor mutation, Kinsta purge, Playwright visual validation of the landing.
- Changing Turnstile secret, CORS, HubSpot destination or email verification semantics.

## Detailed Spec

Script should be idempotent:

- If current published version already has matching `security.captcha`, print no-op.
- Otherwise clone current version with same fields/policies, set captcha metadata, copy destinations, publish new version, deprecate old version.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Dry-run before apply.
- Public GET verification before docs final; if production code has not deployed TASK-1294 yet, document the rollout boundary explicitly.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Wrong captcha site key blocks future generic renderer submit | growth/public-site | medium | bridge remains live; smoke GET/POST; rollback to previous version | `captcha_failed` spike |
| Destination lost when cloning version | HubSpot delivery | low | copy destinations and print count | submissions accepted but dispatch skipped |
| Secret accidentally exposed | security | low | only write public siteKey; rg output | code/docs review |

### Feature flags / cutover

Sin flag nuevo. Existing `GROWTH_FORMS_PUBLIC_API_ENABLED` gates public render/submit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert script | <10 min | si |
| Slice 2 | publish previous config as new version or deprecate new version and restore previous via command script | <15 min | si |
| Slice 3 | revert docs | <10 min | si |

### Production verification sequence

1. Dry-run.
2. Apply.
3. Public GET contract with `Origin: https://efeoncepro.com`.
4. Public POST without token returns `captcha_failed/missing_token`.
5. Docs updated.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] AEO published form version v3 declares `ui_policy_json.security.captcha` in the source-of-truth form policy.
- [x] Public render contract `GET` exposes `security.captcha` in production.
- [x] Previous email gate and HubSpot destination remain intact.
- [x] Public GET has ACAO, returns v3, and does not expose secrets/mapping.
- [x] Public POST without token remains fail-closed.
- [x] No WordPress/Elementor mutation happens in this task.
- [x] Docs list the new published version and leave bridge migration as follow-up.

## Verification

- `pnpm codex:task-hook TASK-1296 --develop`
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-turnstile-security.ts`
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-turnstile-security.ts --apply`
- `curl -i -sS -H 'Origin: https://efeoncepro.com' 'https://greenhouse.efeoncepro.com/api/public/growth/forms/efeonce-aeo-diagnostic?surfaceId=fhsf-efeonce-aeo-diagnostic'`
- `curl -i -sS -H 'Origin: https://efeoncepro.com' -H 'Content-Type: application/json' --data '{"surfaceId":"fhsf-efeonce-aeo-diagnostic","fields":{"firstName":"QA","email":"qa@efeoncepro.com","brandWebsite":"efeoncepro.com"},"consent":true}' 'https://greenhouse.efeoncepro.com/api/public/growth/forms/efeonce-aeo-diagnostic/submit'`
- `pnpm task:lint --task TASK-1296`
- `pnpm docs:closure-check`

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real.
- [x] archivo movido a `complete/` si se cierra.
- [x] `docs/tasks/README.md` sincronizado.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [x] `Handoff.md` actualizado.
- [x] `changelog.md` actualizado.
- [x] docs Growth Forms/AEO actualizados.

## Follow-ups

- Task UI/WordPress para cambiar `/aeo-2/` del bridge HTML a `<greenhouse-form>` con backup Elementor, `heroans` guard, Kinsta purge, Playwright/GVC desktop/mobile 390 y smoke dataLayer.

## Open Questions

- Ninguna para esta version. La normalizacion futura puede mover site key a host surface/admin UI.

## Audit / Plan

=== AUDIT: TASK-1296 ===
SUPUESTOS CORRECTOS:
- TASK-1294 ya completó soporte renderer para `RenderContract.security.captcha`.
- AEO live usa bridge HTML, por lo que publicar metadata en el contract no cambia la landing visual.

SUPUESTOS DESACTUALIZADOS:
- Ninguno bloqueante. El contrato público AEO verificado el 2026-06-30 sigue sin `security`.

ARQUITECTURA / DOCS OBLIGATORIOS:
- `docs/architecture/growth-public-forms-runtime-contract.md` — contrato runtime público.
- `docs/documentation/growth/motor-formularios-publicos.md` — estado operativo Growth Forms.
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md` — embed WordPress/Astro.

CÓDIGO EXISTENTE PARA REUTILIZAR:
- `scripts/growth/activate-aeo-email-gate.ts` — patrón dry-run/apply y clone/publish/deprecate.
- `src/lib/growth/forms/commands.ts` — `authorDraftForm`, `publishForm`, `deprecateForm`, `addDestination`.
- `src/lib/growth/forms/store.ts` — readers de versión/destinos.

SCHEMA / RUNTIME REAL:
- Public GET actual: `efeonce-aeo-diagnostic` version `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657`, `hasSecurity=false`.

ACCESS MODEL:
- Script trusted repo/server context; no route/capability nueva.

SKILLS A USAR:
- `greenhouse-task-planner` — task formal registrada.
- `greenhouse-agent` — patrones repo/Next/Greenhouse.
- `greenhouse-documentation-governor` — cierre documental.

SUBAGENTES:
- `sequential` — effort bajo, archivos owned acotados y dependencia lineal dry-run → apply → smoke.

RIESGOS / BLAST RADIUS:
- Cambia la versión publicada del form AEO, pero no toca WordPress live ni destination mapping si el script copia destinos.
- Si la site key fuera incorrecta, el bridge live sigue siendo fallback hasta migración visual.

OPEN QUESTIONS RESUELTAS:
- Site key vive inicialmente en `ui_policy_json.security.captcha.siteKey`; normalización por host surface queda follow-up.
===

Execution evidence 2026-06-30:

- Dry-run without DB env failed safely with "Greenhouse Postgres is not configured".
- Dry-run with Cloud SQL proxy showed current v2 `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657`, missing/different Turnstile config and one destination to copy.
- Apply published v3 `fver-9507f6a7-431d-4215-a699-9c713328b69b`, copied destination `fdst-f72e46fa-09c1-455e-8585-4bce09dd0c46 -> fdst-04bcf89d-ff7c-4b4b-a6b0-4b415f30ae91` and deprecated v2.
- Idempotency dry-run after apply reported current v3 with matching Turnstile config and "Nada que hacer."
- Public `GET` from `https://efeoncepro.com` returns HTTP 200 with ACAO, `formVersionId=fver-9507f6a7-431d-4215-a699-9c713328b69b`, `hasSecurity=true` and `security.captcha={provider:"turnstile",required:true,mode:"invisible",siteKey:"0x4AAAAAADqwX2R7v-k9pItv",execution:"submit"}` on production deploy `greenhouse-drl142ckj`.
- Public `POST` without `captchaToken` returns HTTP 403 `{ "outcome":"captcha_failed", "message":"missing_token" }` with ACAO.
- No WordPress, Elementor, Kinsta or hero mutation was performed.
- Renderer assets `renderer-latest.js` and `renderer-preview.js` respond HTTP 200 and contain the Turnstile/captchaToken path.
- GitHub CI, CI Deep Verification and Playwright E2E smoke for `main` SHA `1ac49552d` are green.

Plan:
1. Agregar script idempotente `scripts/growth/activate-aeo-turnstile-security.ts`.
2. Ejecutar dry-run y revisar plan.
3. Ejecutar apply por commands canónicos.
4. Verificar public GET y POST sin token.
5. Actualizar docs/Handoff/changelog/task lifecycle.
