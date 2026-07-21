# TASK-1439 — Link Hub client productization and pilot

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-030`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|agency|delivery|social`
- Blocked by: `TASK-1438|TASK-1436`
- Branch: `task/TASK-1439-link-hub-client-productization-pilot`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Convierte el piloto Efeonce en una capacidad entregable a clientes: define onboarding/roles/responsabilidades/SLA/continuidad, registra el servicio/entregable canónico, configura un primer cliente sobre el mismo motor, conecta URL estándar y custom domain opcional, y valida aislamiento de marca/datos/analytics sin fork.

## Why This Task Exists

Que Efeonce use Link Hub no prueba que sea operable como servicio. Cliente implica brand book, approvals, DNS externo, ownership de contenido, tenant access, privacidad, handoff y continuidad/offboarding. Sin productización, el primer cliente produciría procedimientos improvisados y customizaciones difíciles de retirar.

## Goal

- Definir el contrato de servicio y responsabilidades Efeonce/cliente.
- Onboardear una marca cliente sin código ni assets/copy Efeonce mezclados.
- Probar URL inmediata y dominio personalizado opcional con rollback.
- Entregar analytics ejecutivo, acceso y offboarding/export claros.

<!-- ZONE 1 -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/context/10_experiencia-cliente.md`
- `docs/context/14_modelo-negocio-asaas.md`
- `docs/services/README.md`

Reglas obligatorias:

- Primer cliente usa el mismo aggregate/renderer/cockpit; cero conditional/fork por marca.
- Brand book, voz, assets, approvals y compliance del cliente reemplazan defaults Efeonce.
- Efeonce-managed V1; self-service cliente sólo si capabilities/entitlements ya están probados y aprobados.
- No mezclar analytics/asset/domain de dos clientes.
- Offboarding conserva/exporta historia acordada y desactiva dominio/acceso de forma auditada.

## Normative Docs

- `.codex/skills/social-media-studio/efeonce/CLIENT_DELIVERY.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/services/README.md`

## Dependencies & Impact

### Depends on

- `TASK-1438` pilot evidence/go decision.
- `TASK-1436` custom domains.
- Existing client organization/space, authorized brand assets and DNS owner.

### Blocks / Impacts

- Future client self-service or packaging/pricing tasks if evidence supports them.

### Files owned

- `docs/services/social-media-link-hub/README.md`
- `docs/manual-de-uso/**link-hub**`
- `docs/documentation/**link-hub**`
- `docs/audits/growth/**client-link-hub**`

## Current Repo State

### Already exists

- Client organizations/spaces/access, service catalog model, social client-delivery doctrine and Link Hub Efeonce pilot foundation.

### Gap

- No productized Link Hub service contract, onboarding/runbook or client runtime evidence.

## Modular Placement Contract

- Topology impact: `none`
- Current home: existing Link Hub runtime; this task owns service/onboarding/pilot evidence.
- Future candidate home: `remain-shared`
- Boundary: client configuration/brand/domain/access via canonical commands; service docs define human responsibilities.
- Server/browser split: n/a; no new runtime code unless a discovered gap becomes its own task.
- Build impact: `none`.
- Extraction blocker: client DNS, brand approval, tenant access and contractual/privacy expectations.

<!-- ZONE 2 intentionally empty -->

<!-- ZONE 3 -->

## Scope

### Slice 1 — Service contract and onboarding

- Register outcome, scope, block set, responsibilities, approvals, evidence, support, continuity/offboarding in `docs/services`.
- Create operator/client manuals with DNS and content approval RACI.

### Slice 2 — First client configuration

- Choose authorized pilot, bind real organization/space/brand/assets, publish on standard URL and validate isolation.
- No client code; any product gap opens a new task before workaround.

### Slice 3 — Optional custom domain and measurement

- Coordinate CNAME, verify DNS/TLS/host, smoke all links/forms and reconcile analytics.

### Slice 4 — Acceptance and continuity

- Client approval, 7d observation, executive report, support/rollback/offboarding exercise and go/no-go for broader offer.

## Out of Scope

- Pricing/package decision, mass onboarding, arbitrary client self-service, custom code themes, social publishing or native platform analytics ingestion.

## Detailed Spec

The service contract must state that the client owns brand/content/domain authorization; Efeonce owns platform operation and configured delivery. Domain setup may require one DNS action by the client. Analytics report prioritizes clicks/conversions by declared objective and exposes source limitations.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Service/RACI -> pilot binding -> standard URL -> custom domain -> 7d acceptance.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| brand/data leak | tenant | low | two-tenant test + approval | access/asset mismatch |
| custom request becomes fork | product | medium | block registry + new-task gate | client-specific code diff |
| DNS delay | external | medium | standard URL fallback | domain pending stale |
| unclear responsibility | service | medium | RACI/SLA/offboarding | unresolved approval |

### Feature flags / cutover

- Allowlist first client/page/domain; broader enablement only after acceptance.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revise docs before signature | n/a | sí |
| 2 | pause client page/access | <10 min | sí |
| 3 | disable custom; return standard/previous URL | <15 min | sí |
| 4 | offboard/export per contract | agreed SLA | sí/contractual |

### Production verification sequence

1. Tenant/access/brand review.
2. Standard URL anonymous/device smoke.
3. Client sign-off.
4. Optional DNS/TLS/custom host smoke.
5. 24h/7d observation + report + go/no-go.

### Out-of-band coordination required

Client brand/content/DNS/privacy approval and named Efeonce service owner.

<!-- ZONE 4 -->

## Acceptance Criteria

- [ ] Given a client, When configured, Then all content/theme/assets/domain/analytics are tenant-scoped and no Efeonce/client-other data appears.
- [ ] Given an unsupported request, When evaluated, Then it is rejected/deferred to a product task rather than implemented as client conditional.
- [ ] Given no DNS action, When launched, Then standard Efeonce URL works; custom domain remains optional.
- [ ] Given service delivery, When accepted, Then RACI, approvals, support, measurement, rollback and offboarding are documented.
- [ ] Given first client, When observed 7 days, Then evidence supports explicit go/no-go and residual risks.

## Verification

- `pnpm task:lint --task TASK-1439`
- two-tenant access/brand/analytics test evidence
- anonymous standard/custom domain and HTTPS smoke
- client approval + 24h/7d observation
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] Lifecycle/index/Handoff/changelog/service/manual/docs synchronized.
- [ ] Client evidence contains no secrets/PII beyond authorized operational record.
- [ ] `pnpm docs:closure-check` executed.

## Follow-ups

- Pricing/package, scaled onboarding or client self-service only after pilot evidence.

## Open Questions

- Pilot client and commercial packaging require human selection; they do not block architecture/task registration.
