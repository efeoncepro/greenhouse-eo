# TASK-925 — `provision-tenant`: control plane de onboarding/provisioning de tenants Notion

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (control plane del ADR GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1)`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|platform|reliability`
- Blocked by: `TASK-924 (Golden Template canónico — contra qué verificar/instalar) + migración de cómputo a Greenhouse LIVE (RpA V2 + OTD redefinition TASK-921/922/923). NO construir antes de la migración: se terraformearía el mundo legacy de fórmulas frágiles (ADR §9 sequencing).`
- Branch: `task/TASK-925-notion-tenant-provisioning-control-plane`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar el **control plane idempotente `provision-tenant`** que "adopta" un teamspace Notion recién duplicado del Golden Template y lo deja listo para el motor ICO/delivery — sin setup manual de fórmulas per-cliente. Flujo de 5 pasos: **verify** schema vs canónico (TASK-924) → **install** propiedades `[GH]` read-only vía API → **register** data sources (reusa `/register`) → **subscribe** webhooks (TASK-912 + TASK-921) → **smoke** readiness. Más onboarding state machine append-only + 3 reliability signals.

Responde la pregunta operativa "¿hay que pedir setup manual de RpA/OTD por cada cliente nuevo?" → **no**: duplicar template + `provision-tenant`.

## Why This Task Exists

El ADR `GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1` identifica el gap: hoy `/register` conecta un data source cuyo schema se armó a mano; no existe la rutina cohesiva que verifica el schema canónico, instala las `[GH]` props, suscribe webhooks y verifica readiness. Sin esto, cada cliente nuevo es trabajo manual (no escala) y fuente de drift (el problema que cerró TASK-742 para estados, replicado en propiedades).

## Goal

- `provision-tenant(input)` idempotente (admin endpoint + CLI), 5 pasos:
  1. **VERIFY** — `diffTenantSchemaVsCanonical` (TASK-924); drift de estado → reporta + bloquea; props `[GH]` faltantes → install.
  2. **INSTALL** — crea las `[GH]` read-only faltantes vía Notion API (create/update data source), Notion-Version explícito, read-only por permisos.
  3. **REGISTER** — reusa lógica de `/api/integrations/notion/register` (persiste data sources en `space_notion_sources` PG + BQ, `sync_enabled`).
  4. **SUBSCRIBE** — suscribe webhooks para el data source (status transitions TASK-912 + due_date changes TASK-921), con HMAC.
  5. **SMOKE** — readiness check: el tenant produce métricas (status canónico, captura llega, compute central las toma). Degradación honesta → estado `degraded`, no falso OK.
- Onboarding state machine append-only (`discovered → template_cloned → schema_verified → gh_props_installed → registered → webhooks_subscribed → ready` + `drift_detected`/`degraded`), persistida en extensión de `space_notion_sources` o tabla `notion_tenant_provisioning` (decidir).
- 3 reliability signals: `integrations.notion.tenant_schema_drift`, `tenant_unprovisioned`, `tenant_not_ready` (steady=0).
- Idempotente: re-correr = onboarding **y** reparación de drift de tenant existente.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1.md` — ADR canónico (§5 flujo, §6 state machine, §9 sequencing, §10 signals, §12 hard rules)
- `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1` — vocabulary canónico (enforce al onboarding, NO aliases)
- TASK-924 — Golden Template canónico + diff helper
- TASK-912 (captura status) + TASK-921 (captura due_date) — webhooks a suscribir
- notion-platform skill — create/update data source vía API, HMAC, re-fetch, Notion-Version, rate limit, `captureWithDomain('integrations.notion', ...)`

Reglas obligatorias (ADR §12):

- **NUNCA** instalar fórmulas de cómputo ICO — solo `[GH]` targets read-only.
- **NUNCA** agregar aliases de estado per-cliente — enforce 11 estados V1.
- **NUNCA** construir/ejecutar esto para el mundo legacy de fórmulas — solo post-migración de cómputo.
- **NUNCA** confiar payload webhook ni omitir HMAC al suscribir.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion', { tags: { source: 'tenant_provisioning', stage } })`.
- **SIEMPRE** idempotente + verify-before-install + smoke con degradación honesta.
- **SIEMPRE** reusar discover/register/`space_notion_sources` — no paralelizar el registro.

## Dependencies & Impact

### Depends on
- **TASK-924** (Golden Template canónico + diff)
- **Migración de cómputo LIVE** (RpA V2 + OTD redefinition: TASK-921/922/923 + cutover) — sequencing duro ADR §9
- `/api/integrations/notion/{discover,register}` (existen)
- TASK-912 + TASK-921 (webhooks)

### Blocks / Impacts
- Habilita onboarding de cliente N sin trabajo manual de métricas.
- Tenants existentes (Efeonce/Sky): `provision-tenant` re-corrible detecta/repara su drift (no los rompe).

### Files owned (estimado)
- `src/lib/notion-tenant-template/provision-tenant.ts` (+ tests) — NEW (orquestador 5 pasos)
- `src/app/api/admin/integrations/notion/provision-tenant/route.ts` — NEW (admin endpoint, capability gate)
- `scripts/notion/provision-tenant.ts` — NEW (CLI)
- `migrations/<ts>_notion-tenant-provisioning-state.sql` — NEW (state machine, si tabla nueva)
- `src/lib/reliability/queries/notion-tenant-*.ts` — NEW (3 signals)

## Current Repo State

### Already exists
- `/api/integrations/notion/discover` + `/register` + `space_notion_sources`
- Admin tenant Notion routes (governance/parity-audit/data-quality)
- Captura webhooks (TASK-912/921)

### Gap
- No existe el adopt routine cohesivo (verify/install/subscribe/smoke)
- No existe state machine de onboarding ni signals de provisioning

## Out of Scope
- Golden Template canónico (artefacto) → TASK-924.
- Crear teamspaces por API (Notion no lo permite; el humano duplica el template).
- UI Admin Center "Onboard tenant" → follow-up (V1 = admin endpoint + CLI).
- Migrar el cómputo (es prerequisito, no parte de esta task).

## Acceptance Criteria
- [ ] `provision-tenant` idempotente (5 pasos) + tests (happy, drift, install faltante, smoke degraded, re-run no-op)
- [ ] Admin endpoint + CLI con capability gate
- [ ] State machine append-only persistida + audit por transición
- [ ] 3 reliability signals wired (schema_drift/unprovisioned/not_ready), steady=0
- [ ] Verify-before-install + smoke con degradación honesta (no falso OK)
- [ ] Re-correr sobre Efeonce/Sky existentes = no-op / reporta drift, NO los rompe
- [ ] `pnpm test` + `pnpm build` verde
- [ ] Task movida a `complete/`

## Follow-ups
- UI Admin Center "Onboard tenant" (V1.1).
