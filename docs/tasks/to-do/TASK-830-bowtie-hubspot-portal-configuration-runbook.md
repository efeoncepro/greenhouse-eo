# TASK-830 — Bow-tie HubSpot Portal Configuration Runbook + Drift Detection

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `runbook + verification`
- Epic: `Bow-tie V1.0`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / integrations.hubspot`
- Blocked by: `none` (bloquea TASK-831/832/833)
- Branch: `task/TASK-830-bowtie-hubspot-config`

## Summary

Configura el portal HubSpot Efeonce (`48713323`) per `spec/Arquitectura_BowTie_Efeonce_v1_1.md`: 7 stages custom en empresas + 2 stages contactos + 5 properties motion + 13 properties contractuales + 6 properties Deal + pipeline Renewal + deal_sub_types. Documenta el setup como runbook reproducible y agrega un script de verificación que detecta config drift entre lo que el Bow-tie demanda y lo que el portal tiene actualmente.

## Why This Task Exists

El Bow-tie Efeonce v1.1 depende críticamente de configuración HubSpot que no existe hoy:

- Sin los 7 stages custom, `Company.lifecyclestage` no puede aceptar valores `active_account|self_serve_customer|project_customer|onboarding|former_customer`
- Sin las 13 properties contractuales, TASK-831 no tiene destino donde proyectar
- Sin las 4 motion properties, TASK-832 no puede setear `is_at_risk`
- Sin pipeline Renewal, los workflows `set_in_renewal` y `auto_create_renewal_deal` no existen

Toda la cadena Greenhouse → HubSpot está bloqueada hasta que esta config esté en producción. Y como es config no-code en HubSpot Developer Portal, debe documentarse como runbook idempotente para que un operador pueda ejecutarla y un script verificarla periódicamente (drift detection).

## Goal

- Runbook canónico `docs/operations/HUBSPOT_BOWTIE_CONFIGURATION_V1.md` con pasos exactos para configurar HubSpot
- 7 stages custom Company + 2 stages Contact + 5 properties motion + 13 properties contractuales + 6 properties Deal creados en portal
- Pipeline Renewal creado con stages `Identification → Engagement → Negotiation → Won/Lost`
- Property `dealtype` (HubSpot default) con valores enum extendidos a los 7 deal sub_types del Bow-tie §8.2
- Script `pnpm hubspot:verify-bowtie-config` que valida config matches spec (read-only)
- Reliability signal `commercial.hubspot.config_drift` (steady=0)

## Architecture Alignment

Revisar y respetar:

- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §3-§8 — fuente canónica de stages, properties, deal_sub_types
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` — contrato puente
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — webhook canonical pattern
- `services/hubspot_greenhouse_integration/` — bridge Cloud Run que escribirá las properties

Reglas obligatorias:

- Runbook idempotente: re-ejecutar es safe (HubSpot UI permite verificar existencia antes de crear)
- Verification script usa HubSpot API read-only (no muta config) con `HUBSPOT_ACCESS_TOKEN` desde GCP Secret Manager
- Drift signal severity=`error` cuando count > 0 (config divergente bloquea Bow-tie)
- Property internal names exactos per spec (case-sensitive)
- NUNCA borrar properties existentes que tengan datos — extender enum, no reemplazar
- NUNCA crear stages custom con valores que coliden con HubSpot defaults (`subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead`, `opportunity`, `customer`, `evangelist`, `other` ya existen)
- Documentar todos los pasos como markdown numerado con screenshots opcionales en `docs/operations/screenshots/hubspot-bowtie/`

## Normative Docs

- `spec/Arquitectura_BowTie_Efeonce_v1_1.md`
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`

## Dependencies & Impact

### Depends on

- HubSpot Developer Portal access (Julio Reyes admin) ✅
- `HUBSPOT_ACCESS_TOKEN` secret en GCP ✅
- HubSpot bridge Cloud Run (TASK-574) ✅ — necesario para verification script

### Blocks / Impacts

- TASK-831 — sin properties contractuales en HubSpot, projection no tiene destino
- TASK-832 — sin motion properties, `is_at_risk` projection imposible
- TASK-833 — sin breakdown en HubSpot, dashboards Bow-tie quedan parcialmente vacíos
- TASK-820 (Delta) — sin stages custom, projection del lifecyclestage al stage 8/9/10 falla

### Files owned

- `docs/operations/HUBSPOT_BOWTIE_CONFIGURATION_V1.md` (runbook nuevo)
- `scripts/integrations/hubspot/verify-bowtie-config.ts` (verification script)
- `src/lib/reliability/queries/hubspot-bowtie-config-drift.ts`
- `src/lib/reliability/registry/commercial-health.ts` (extender)
- `package.json` (script `hubspot:verify-bowtie-config`)

## Current Repo State

### Already exists

- HubSpot bridge Cloud Run con endpoints CRUD properties (TASK-574)
- HubSpot webhook infrastructure (TASK-706/813)
- Reliability platform + subsystem `Commercial Health`

### Gap

- HubSpot portal config Bow-tie incompleto (radiografía marzo 2026 lo documenta)
- No hay runbook reproducible
- No hay verification script automatizado

## Scope

### Slice 1 — Runbook write-up

Crear `docs/operations/HUBSPOT_BOWTIE_CONFIGURATION_V1.md` con secciones:

1. **Pre-requisitos** — admin access portal HubSpot, lista de properties existentes
2. **Lifecycle Stages — empresas (7 custom)**: paso a paso para crear `pql`, `onboarding`, `active_account`, `self_serve_customer`, `project_customer`, `former_customer` (Bow-tie §5.1; `customer` default no se usa post-firma)
3. **Lifecycle Stages — contactos (2 custom)**: agregar `pql` (Customer ya existe default)
4. **Properties motion empresas (4)**: `is_in_expansion`, `is_in_renewal`, `is_at_risk`, `is_advocate` — todas Boolean
5. **Property motion contactos (1)**: `is_advocate_individual` Boolean
6. **Properties contractuales empresas (13)**: `active_msa_id`, `msa_start_date`, `msa_end_date`, `msa_value_monthly`, `active_sows_count`, `active_sows_value_monthly`, `saas_subscriptions` (multi-select Kortex/Verk), `saas_mrr`, `total_mrr`, `customer_since`, `last_expansion_date`, `last_renewal_date`, `lifetime_value_ytd`
7. **Properties Deal (6)**: `deal_sub_type` (enum 7 valores), `expansion_type`, `previous_mrr`, `post_deal_mrr`, `mrr_delta` (calculated), `is_downsell`
8. **Pipeline Renewal**: stages `Identification (10%) → Engagement (30%) → Proposal Sent (60%) → Negotiation (80%) → Won (100%) / Lost (0%)`
9. **Workflow stubs (manual creation V1.0)**: 8 workflows core que el Bow-tie §11 define — documentación, no implementación
10. **Verification checklist** — lista de queries para confirmar setup correcto

### Slice 2 — Verification script

`scripts/integrations/hubspot/verify-bowtie-config.ts`:

- Llama HubSpot API:
  - `GET /properties/v2/companies/properties/lifecyclestage` → assert 7 custom values present
  - `GET /properties/v2/companies/properties/{name}` para cada motion + contractual property
  - `GET /properties/v2/contacts/properties/lifecyclestage` → assert PQL custom value
  - `GET /crm/v3/pipelines/deals` → assert pipeline `Renewal` exists con stages canónicas
  - `GET /properties/v2/deals/properties/dealtype` → assert 7 deal_sub_types enum values
- Devuelve `{ ok: boolean, missing: string[], extras: string[] }`
- Modes:
  - `--mode=ci` → exit code 0 si OK, 1 si missing
  - `--mode=report` → output markdown table con diff
- Idempotente, read-only (zero write side effects)

### Slice 3 — Reliability signal

`src/lib/reliability/queries/hubspot-bowtie-config-drift.ts`:

- Reader async que invoca el verification script
- Devuelve `ReliabilitySignal` con `kind=drift`, `severity=error` si missing > 0, `steady=0`
- Cache TTL 5 min para evitar HubSpot API rate-limit
- Wire-up en `getReliabilityOverview` subsystem `Commercial Health` (luego subsystem `Bow-tie Sync` cuando TASK-833 lo cree)

### Slice 4 — Manual config execution (operator-driven)

- Julio Reyes ejecuta el runbook en HubSpot UI
- Cada paso checklist marcado como done en `Handoff.md`
- Smoke: correr `pnpm hubspot:verify-bowtie-config --mode=report` post-config → expect `missing=[]`

### Slice 5 — Tests

- Unit test del verification script con mock HubSpot responses
- Test reliability signal: simular missing properties → severity=error
- Smoke staging: correr verification real contra portal

## Out of Scope

- Workflow automation (creación de los 19 workflows Bow-tie §11) — V1.1 si emerge necesidad de automatizar
- Dashboards HubSpot-side (Bow-tie §10) — operator crea manualmente; Greenhouse-side cubre TASK-834
- Migración de contactos/empresas existentes a nuevos stages — operator decide caso por caso (Bow-tie §12.1 plan)
- Bidireccional config sync (Greenhouse modifica HubSpot config) — riesgoso, OOS V1.0

## Detailed Spec

Bow-tie §3.2, §5.1, §7, §8.1, §8.2 son la fuente verbatim de los nombres de stages y properties. Internal names canónicos:

```text
Lifecycle Stages empresa custom:
  pql, onboarding, active_account, self_serve_customer, project_customer, former_customer

Properties motion empresa:
  is_in_expansion, is_in_renewal, is_at_risk, is_advocate

Property motion contacto:
  is_advocate_individual

Properties contractuales empresa (13):
  active_msa_id, msa_start_date, msa_end_date, msa_value_monthly,
  active_sows_count, active_sows_value_monthly, saas_subscriptions, saas_mrr,
  total_mrr, customer_since, last_expansion_date, last_renewal_date, lifetime_value_ytd

Properties Deal (6):
  deal_sub_type, expansion_type, previous_mrr, post_deal_mrr, mrr_delta, is_downsell

Pipeline nuevo: Renewal
  stages: Identification (0.10), Engagement (0.30), Proposal Sent (0.60),
          Negotiation (0.80), Won (1.00), Lost (0.00)
```

## Acceptance Criteria

- [ ] `docs/operations/HUBSPOT_BOWTIE_CONFIGURATION_V1.md` creado con 10 secciones
- [ ] Verification script funciona en CI mode + report mode
- [ ] Reliability signal `commercial.hubspot.config_drift` registrado y wired a overview
- [ ] HubSpot portal `48713323` ejecutado config (post manual run via Julio): 7 stages empresa + 2 stages contacto + 5 motion + 13 contractual + 6 deal + Renewal pipeline + 7 deal_sub_types
- [ ] `pnpm hubspot:verify-bowtie-config --mode=report` post-config retorna `missing=[]`
- [ ] Test unit del script con mocks pasa
- [ ] Drift signal smoke: borrar manualmente una property test del portal → signal reporta count > 0 al refresh
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test scripts/integrations/hubspot src/lib/reliability/queries` verde

## Verification

- `pnpm hubspot:verify-bowtie-config --mode=report` post-config
- `pnpm staging:request /admin/operations` → verificar signal visible bajo Commercial Health
- Smoke browser: editar Company en HubSpot → verificar dropdown lifecyclestage muestra 12 valores totales

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con checklist de portal config ejecutado
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-820 (Delta), TASK-831, TASK-832, TASK-833 desbloqueadas

## Follow-ups

- V1.1: workflows HubSpot automation via API si emerge volume operativo
- V1.1: dashboard HubSpot Revenue Health (Greenhouse-side cubre TASK-834 V1.0)
- V1.2: terraform-style declarative HubSpot config si emerge multi-portal

## Open Questions

- ¿`total_mrr` en HubSpot lo recibe de Greenhouse projected o lo computa HubSpot calculated property? Recomendación spec puente §17 #1: Greenhouse projecta (SSOT). Decisión final del operador al ejecutar runbook.
- ¿Pipeline Renewal default probabilities son las propuestas (10/30/60/80/100)? Decidir con sales antes de ejecutar.
- ¿Migrar contactos/empresas existentes al nuevo modelo en bulk o caso por caso? Bow-tie §12.1 dice "clasificación manual supervisada" — keep manual V1.0.
