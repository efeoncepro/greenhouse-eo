# TASK-1285 — Persistencia canónica de la URL/web del cliente en la organización

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `sync`
- Epic: `none`
- Status real: `Hecho`
- Rank: `TBD`
- Domain: `account-360`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La URL/web del cliente vivía sólo en el raw layer (`greenhouse_crm.companies.website_url`, de HubSpot domain/website) y NUNCA se promovía a la organización canónica (`greenhouse_core.organizations.website_url` quedaba NULL). Esta task persiste la web de forma canónica: un helper de normalización único (`normalizeWebsiteUrl`), wiring de los write paths (puerta HubSpot + SSOT account-360), backfill idempotente de las 256 orgs existentes, y un reliability signal de drift que hace el gap auto-convergente.

## Why This Task Exists

Detectado al provisionar AEO para Grupo Berel (TASK-1277/1278): su web `berel.com` estaba en HubSpot (se usó para poblar el logo) pero `organizations.website_url` era NULL — el grader necesita la web del cliente como atributo canónico de la org, y el Account-360 debería mostrarla. El gap era sistémico: 256 orgs con web en el raw layer pero NULL en la org canónica. No es un parche para Berel: es la persistencia robusta del atributo para todos.

## Goal

- `normalizeWebsiteUrl` como SSOT del transform (solo http(s), normaliza, junk→null).
- `organizations.website_url` poblada por los write paths canónicos (puerta HubSpot company→org + `upsertCanonicalOrganization`).
- Backfill idempotente de las orgs existentes desde el raw layer (no pisa valores presentes).
- Reliability signal de drift (web en crm pero NULL en org) con steady=0.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` (raw layer → proyección canónica)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (HubSpot inbound companies)

Reglas obligatorias:

- La normalización vive en UN helper (`normalizeWebsiteUrl`); NUNCA inline en un writer (anti-drift de formato).
- Solo http(s) (safety: bloquea `javascript:`/`data:` que terminarían en un `<a href>`).
- COALESCE-preserve: el backfill y el UPDATE default NUNCA pisan una `website_url` no-vacía (human-edited).

## Normative Docs

- `docs/tasks/complete/TASK-991-canonical-client-birth-lifecycle.md` (SSOT `upsertCanonicalOrganization`)
- `docs/tasks/complete/TASK-1277-aeo-entitlement-metering-platform.md` (consumer: grader profile de la org)

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations.website_url` (columna ya existente, nullable).
- `greenhouse_crm.companies.website_url` (raw layer, ya poblado por el sync de HubSpot).

### Blocks / Impacts

- **TASK-1277/1278** (AEO): el grader profile de la org puede leer la web canónica.
- Account-360 / Person-Organization model: la web es ahora un atributo canónico de la org.

### Files owned

- `src/lib/account-360/normalize-website-url.ts` (+ test)
- `src/lib/account-360/organization-identity.ts` (`upsertCanonicalOrganization` websiteUrl)
- `src/lib/commercial/party/commands/create-party-from-hubspot-company.ts` (websiteUrl en el INSERT)
- `src/lib/hubspot/sync-hubspot-companies.ts` (propaga website_url del raw layer)
- `scripts/account-360/backfill-organization-website-url.ts`
- `src/lib/reliability/queries/organization-website-url-unsynced.ts` (+ wire-up)

## Current Repo State

### Already exists

- Columna `organizations.website_url` (nullable) + raw layer `crm.companies.website_url` poblado.
- SSOT `upsertCanonicalOrganization` (TASK-991) + puerta HubSpot `createPartyFromHubSpotCompany`.

### Gap

- Ningún write path persistía `website_url` en la org; 256 orgs con web en crm pero NULL en la org.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: `greenhouse_core.organizations.website_url` (proyección canónica del raw `greenhouse_crm.companies`)
- Consumidores afectados: grader AEO (TASK-1277), Account-360, UI de org
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `upsertCanonicalOrganization` (SSOT TASK-991), `createPartyFromHubSpotCompany` (puerta HubSpot company→org).
- Contrato nuevo: `normalizeWebsiteUrl(raw)` (helper puro) + param `websiteUrl` en los writers + signal `commercial.organization.website_url_unsynced`.
- Backward compatibility: `compatible` (param opcional, COALESCE-preserve, columna ya existía).
- Full API parity: el atributo lo persiste el writer canónico; los consumers (grader/UI/Nexa) lo leen de la org, no del raw.

### Data model and invariants

- Entidades: `greenhouse_core.organizations` (write), `greenhouse_crm.companies` (read en backfill/signal).
- Invariantes:
  - La normalización vive sólo en `normalizeWebsiteUrl` (sin drift de formato entre writers).
  - Solo http(s); junk → NULL (honest, no inventa dominio).
  - Backfill/UPDATE default NUNCA pisan una `website_url` no-vacía.
- Tenant/space boundary: n/a (atributo de org, no per-tenant).
- Idempotency/concurrency: backfill idempotente (UPDATE guard `website_url IS NULL OR ''`); normalize idempotente.
- Audit/outbox/history: n/a (atributo no-sensible, no transición de estado); el signal de drift es la capa de observabilidad.

### Migration, backfill and rollout

- Migration posture: `backfill` (la columna ya existía; sin DDL).
- Default state: `enabled` (no flag — atributo no-controvertido, no incurre costo).
- Backfill plan: `scripts/account-360/backfill-organization-website-url.ts` dry-run → `--apply` (256 orgs, solo NULLs).
- Rollback path: revert PR (los writers vuelven a omitir el campo); el backfill no es destructivo (solo llenó NULLs).
- External coordination: ninguna.

### Security and access

- Auth/access gate: n/a (server-side writers + script con perfil PG runtime).
- Sensitive data posture: sin PII (la web es pública).
- Error contract: `captureWithDomain(err,'commercial',…)` en el signal; el helper retorna null en vez de throw.
- Abuse/rate-limit posture: n/a.

### Runtime evidence

- Local checks: `normalize-website-url.test.ts` (11) + `organization-identity.test.ts` (param tuples actualizados) + `create-party-from-hubspot-company.test.ts` verdes.
- DB/runtime checks: backfill `--apply` = 256 orgs; Berel `https://berel.com`; signal steady=0 contra PG real (proxy).
- Reliability signals: `commercial.organization.website_url_unsynced` (kind=drift, warning, steady=0) wired a `/admin/operations`.

### Acceptance criteria additions

- [x] Helper de normalización único (solo http(s), junk→null) + test.
- [x] Writers canónicos (HubSpot company→org + `upsertCanonicalOrganization`) persisten `website_url`.
- [x] Backfill idempotente aplicado (256 orgs; no pisa valores presentes).
- [x] Reliability signal de drift con steady=0.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Helper de normalización

- `normalizeWebsiteUrl(raw)`: trim, asume https si no hay esquema, solo http(s), host lowercase, exige punto, sin query/fragment, sin trailing slash, junk→null. Test (11 casos incl. safety).

### Slice 2 — Wiring de los write paths

- `upsertCanonicalOrganization`: param `websiteUrl` (normalizado, COALESCE-preserve / override).
- `createPartyFromHubSpotCompany`: param `websiteUrl` + columna en ambos INSERT branches.
- `syncHubSpotCompanies`: selecciona `website_url` del raw y lo pasa a la puerta.

### Slice 3 — Backfill + signal

- Backfill idempotente `organizations.website_url = normalize(crm.companies.website_url)` (256 orgs, solo NULLs).
- Reliability signal `commercial.organization.website_url_unsynced` (drift, warning, steady=0) wired al overview.

## Out of Scope

- UI de edición de la web en el Account-360 (consume el atributo; no es esta task).
- Migrar/normalizar `crm.companies.website_url` (raw layer se respeta tal cual).
- Otros atributos de org sin promover (industry ya tiene su propio path TASK-997).

## Detailed Spec

El raw layer ya tenía la web; el gap era la promoción crm→core. La normalización se centraliza en `normalizeWebsiteUrl` (SSOT del transform) y la consumen todos los writers + el backfill, evitando drift de formato. El signal de drift hace el gap auto-convergente: un sync futuro que cree una company sin promover su web lo levanta, y el backfill (re-runnable) lo cierra.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (helper) → Slice 2 (writers) → Slice 3 (backfill + signal).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Backfill pisa una web human-edited | data quality | low | UPDATE guard `website_url IS NULL OR ''` | diff de website_url |
| URI peligrosa persistida | safety | low | `normalizeWebsiteUrl` solo http(s) | — |
| Drift futuro (sync sin promover web) | data quality | medium | reliability signal + backfill re-runnable | `website_url_unsynced > 0` |

### Feature flags / cutover

- Sin flag (atributo no-controvertido, costo $0).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (helper) | <5 min | sí |
| Slice 2 | revert PR (writers) | <5 min | sí |
| Slice 3 | n/a (backfill no destructivo; solo llenó NULLs) | — | sí |

### Production verification sequence

1. Backfill `--apply` contra PG (dev/staging comparten instancia): 256 orgs, Berel `https://berel.com`, signal steady=0.
2. Prod: re-correr el backfill (idempotente) tras el deploy del wiring.

### Out-of-band coordination required

- N/A — repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `normalizeWebsiteUrl` SSOT del transform + test (incl. safety javascript:/data:).
- [x] Writers canónicos persisten `website_url` normalizada (COALESCE-preserve).
- [x] Backfill idempotente aplicado (256 orgs; Berel `https://berel.com`).
- [x] Reliability signal de drift wired, steady=0.

## Verification

- `pnpm vitest run src/lib/account-360 src/lib/commercial/party/commands/create-party-from-hubspot-company.test.ts`
- `pnpm typecheck`
- backfill dry-run + `--apply` contra PG real (proxy)

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` sincronizado
- [x] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado

## Follow-ups

- UI de edición/visualización de la web en el Account-360 (consume el atributo).
- Promover otros atributos del raw layer pendientes si emerge la necesidad (evaluar por demanda).
