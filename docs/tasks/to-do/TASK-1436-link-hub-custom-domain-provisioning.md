# TASK-1436 — Link Hub custom domain provisioning

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-030`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|platform|integrations|ops`
- Blocked by: `TASK-1433|TASK-1434`
- Branch: `task/TASK-1436-link-hub-custom-domain-provisioning`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Implementa el adapter gobernado para registrar, inspeccionar, verificar, activar y deshabilitar dominios Link Hub desde Greenhouse. Mantiene `links.efeoncepro.com/<slug>` como fallback inmediato y permite que `links.cliente.com` resuelva el mismo `link_page_id` después de DNS y TLS verificados.

## Why This Task Exists

Un registro guardado en DB no prueba que DNS/SSL estén listos. Operar dominios manualmente en Vercel crea un segundo panel y rompe la promesa de control Greenhouse. La integración debe devolver records exactos del proveedor, modelar estados honestos, evitar reassignment destructivo y preservar la URL estándar durante fallas.

## Goal

- Provisionar custom domains desde un command/reader provider-neutral.
- Mostrar records DNS exactos y health/TLS con timestamps.
- Resolver host custom al mismo aggregate sin duplicar contenido/eventos.
- Mantener fallback, audit, idempotencia y rollback.

<!-- ZONE 1 -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Vercel es adapter, no SSOT; IDs/status de dominio viven provider-neutral en Greenhouse.
- Nunca hardcodear CNAME/A global cuando provider inspection devuelve valores project-specific.
- No usar `--force` ni reasignar dominio existente sin conflict flow y confirmación explícita.
- `active` exige DNS + certificate/HTTPS smoke.
- Standard URL nunca deja de funcionar por custom-domain failure.

## Normative Docs

- `.codex/skills/vercel-operations/SKILL.md`
- `.codex/skills/vercel-operations/references/official-vercel-reference.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1433` domain binding/page lookup and commands.
- `TASK-1434` host-aware renderer.
- Vercel project/team ownership discovered explicitly; no relink casual de `.vercel/`.

### Blocks / Impacts

- Custom-domain path of `TASK-1439`; Efeonce standard host in `TASK-1438` also validates base DNS.

### Files owned

- `src/lib/growth/link-hubs/domains/**`
- `src/app/api/growth/link-hubs/**/domains/**`
- migrations delta for `link_hub_domains` if not materialized by TASK-1433
- reliability/domain docs and operational runbook

## Current Repo State

### Already exists

- Vercel CLI/team, custom domain workflow, health/reliability patterns and domain intent docs.

### Gap

- No Link Hub domain registry/adapter/status machine or programmatic onboarding.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/link-hubs/domains/**` + thin Product API adapters.
- Future candidate home: `domain-package`
- Boundary: provider-neutral domain commands/readers/status; Vercel adapter behind server-only interface.
- Server/browser split: DNS records/status DTO safe; provider tokens/SDK/CLI server-only.
- Build impact: Vercel SDK only if existing/justified; prefer HTTP/CLI pattern without leaking into client bundle.
- Extraction blocker: provider credentials/team/project, hostname routing and TLS lifecycle.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.link_hub_domains` + provider adapter state.
- Consumidores afectados: cockpit, public resolver, reliability, CLI/runbook and E2E.
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: Link Hub ADR, Vercel domain docs and page binding.
- Contrato nuevo o modificado: `requestLinkHubDomain`, `refreshLinkHubDomainStatus`, `disableLinkHubDomain`, `readLinkHubDomainStatus`.
- Backward compatibility: `compatible`; custom domains optional.
- Full API parity: cockpit/API/Nexa/CLI consume commands/readers; DNS mutation by client remains external human step.

### Data model and invariants

- Entidades/tablas/views afectadas: `link_hub_domains` (page, hostname, status, provider ref, requested/verified timestamps, DNS instructions digest).
- Invariantes que no se pueden romper:
  - active hostname único y ligado a un solo page;
  - provider ref no es canonical identity;
  - disable custom no elimina standard URL ni published version;
  - status reflects last verified evidence and freshness.
- Tenant/space boundary: domain.manage capability + page tenant binding; public resolver reads only active mapping.
- Idempotency/concurrency: normalized hostname unique; command key per page+host; advisory/row lock on transitions.
- Audit/outbox/history: append domain transition audit + outbox `domain_requested|active|failed|disabled`.

### Migration, backfill and rollout

- Migration posture: `additive` if TASK-1433 did not include table.
- Default state: adapter OFF; standard URL only.
- Backfill plan: none.
- Rollback path: disable custom mapping/adapter, remove provider assignment through confirmed runbook, keep standard URL.
- External coordination: DNS owner adds records; Vercel project/scope and secret permissions; certificate issuance.

### Security and access

- Auth/access gate: `growth.link_hub.domain.manage`; no admin-coarse bypass.
- Sensitive data posture: provider credentials secret; hostname/records not PII.
- Error contract: `domain_conflict|provider_denied|dns_pending|dns_invalid|certificate_pending|certificate_failed|provider_unavailable`.
- Abuse/rate-limit posture: command quotas/poll backoff; no arbitrary provider calls from public browser.

### Runtime evidence

- Local checks: normalization/state/idempotency/provider adapter contract tests.
- DB/runtime checks: two pages/domain uniqueness and transition smoke.
- Integration checks: staging add/inspect/DNS/TLS/disable on allowlisted test domain.
- Reliability signals/logs: `growth.link_hub.domain_degraded`, `domain_verification_stale`, provider errors redacted.
- Production verification sequence: standard host -> staging custom -> HTTPS -> disable/fallback -> production allowlist.

### Acceptance criteria additions

- [ ] Source of truth/contract/consumers named.
- [ ] Domain uniqueness/tenant/idempotency transitions tested.
- [ ] Rollback and external DNS coordination explicit.
- [ ] Live provider/DNS/TLS evidence exists before `active`.
- [ ] Provider errors/credentials sanitized.

## Capability Definition of Done — Full API Parity gate

- [ ] Provider-neutral commands/readers own behavior.
- [ ] Product API/Nexa/CLI consumers share primitives.
- [ ] Capability/grant, idempotency, audit/outbox/errors/signals ship together.
- [ ] Writes support propose-confirm-execute; no hidden Vercel dashboard dependency.

<!-- ZONE 2 intentionally empty -->

<!-- ZONE 3 -->

## Scope

### Slice 1 — Provider-neutral state machine

- Domain normalize/conflict/transition model, storage, commands/readers and audit.

### Slice 2 — Vercel adapter and exact DNS instructions

- Add/inspect/status/disable behind explicit team/project scope; translate provider records without hardcoding.

### Slice 3 — Verification, TLS and reliability

- Poll/backoff/readback, HTTPS smoke, stale/error signals, runbook and cockpit DTO.

## Out of Scope

- Comprar/transferring domains, changing client DNS directly, wildcard/apex support beyond exact provider result, new deployable.

## Detailed Spec

V1 recommends subdomain CNAME. Apex is accepted only if the provider returns a supported exact plan and the client explicitly chooses it; no task may repoint a client website apex implicitly.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- State machine -> adapter -> staging/live verification.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| takeover/reassignment | domain/security | low | ownership verification, no force | domain_conflict |
| status active without TLS | public | medium | HTTPS cert smoke | certificate_failed |
| provider outage | integration | medium | fallback standard URL | domain_degraded |
| polling quota | provider | medium | backoff/manual refresh limits | provider rate error |

### Feature flags / cutover

- `GROWTH_LINK_HUB_CUSTOM_DOMAINS_ENABLED` default OFF; standard URLs unaffected.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | flag OFF; state retained | <10 min | sí |
| 2 | disable/remove allowlisted test mapping | <30 min | sí |
| 3 | mark disabled and use standard URL | <10 min | sí |

### Production verification sequence

1. Contract tests.
2. Staging custom host add -> DNS -> TLS -> render.
3. Disable -> standard fallback.
4. Prod standard host; custom client only in TASK-1439.

### Out-of-band coordination required

Vercel scope/project permissions and DNS owner action.

<!-- ZONE 4 -->

## Acceptance Criteria

- [ ] Given a subdomain, When requested, Then Greenhouse returns exact provider records/status and no manual Vercel content operation is required.
- [ ] Given pending/failed DNS or TLS, When status is read, Then custom host is not active and standard URL remains live.
- [ ] Given duplicate/cross-tenant hostname, When requested, Then fail closed without reassign/force.
- [ ] Given active domain disabled, When rolled back, Then same page remains available via standard URL.
- [ ] Provider integration is verified in staging and errors/signals contain no secrets.

## Verification

- `pnpm task:lint --task TASK-1436`
- focused tests + DB transition smoke
- `vercel domains inspect`/provider equivalent under explicit scope
- DNS + HTTPS + host routing smoke
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] Lifecycle/index/Handoff/changelog/runbook/ADR synchronized.
- [ ] Feature flag ledger and exact project/scope documented.
- [ ] `pnpm docs:closure-check` executed.

## Follow-ups

- `TASK-1439` first client domain.

## Open Questions

- Exact Vercel project/plan limits and SDK surface must be revalidated at execution; adapter design remains stable.
