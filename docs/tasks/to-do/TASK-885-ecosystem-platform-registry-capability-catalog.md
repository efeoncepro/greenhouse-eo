# TASK-885 — Ecosystem Platform Registry + Capability Catalog

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-884`
- Branch: `task/TASK-885-ecosystem-platform-registry-capability-catalog`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializa el registro de plataformas del ecosistema y su catalogo de capabilities namespaced (`kortex.*`, `verk.*`, `website.*`) para que Greenhouse pueda gobernar accesos cross-platform sin mezclar esos permisos con las capabilities internas del portal.

## Why This Task Exists

Greenhouse ya tiene `sister_platform_bindings` y un catalogo de entitlements internos, pero no existe una capa donde Kortex, Verk o el sitio publico declaren sus capacidades gobernables. Sin catalogo explicito, Greenhouse no puede asignar usuarios a plataformas hermanas de forma segura ni auditable.

## Goal

- Crear registry de plataformas del ecosistema.
- Crear catalogo de capabilities por plataforma con owner semantico.
- Seed inicial para `kortex`, `verk`, `public_website` y `greenhouse`.
- Agregar helpers server-only para listar plataformas/capabilities activas.
- Exponer read API admin/ecosystem-safe para consumers posteriores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No meter capabilities de Kortex/Verk dentro de `ENTITLEMENT_MODULES` como si fueran modulos Greenhouse sin justificar.
- El owner semantico de `kortex.*` es Kortex; Greenhouse solo gobierna assignment/audit.
- Si se agregan capabilities a TS catalog, deben tener migration a registry o un registry propio con parity test equivalente.
- No borrar capabilities historicas; deprecar con timestamp.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-884`
- `greenhouse_core.sister_platform_bindings`
- `greenhouse_core.sister_platform_consumers`
- `greenhouse_core.capabilities_registry`
- `src/lib/capabilities-registry/deprecate.ts`

### Blocks / Impacts

- `TASK-886`
- `TASK-887`
- `TASK-888`
- `TASK-889`

### Files owned

- `migrations/*_ecosystem_platform_registry.sql`
- `src/lib/ecosystem-access/platform-registry.ts`
- `src/lib/ecosystem-access/capability-catalog.ts`
- `src/app/api/admin/ecosystem/platforms/route.ts`
- `src/app/api/admin/ecosystem/platforms/[platformKey]/capabilities/route.ts`
- `src/app/api/platform/ecosystem/access/platforms/route.ts`
- `src/types/db.d.ts`
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`

## Current Repo State

### Already exists

- `sister_platform_key` en bindings/consumers.
- API Platform ecosystem lane.
- Admin integrations surface.
- Capability registry para Greenhouse internal entitlements.

### Gap

- No hay registry versionado de plataformas.
- No hay catalogo de capabilities de plataformas hermanas.
- No hay lifecycle/capability deprecation para platform capabilities.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema Foundation

- Crear tablas para plataformas y capabilities del ecosistema.
- Incluir lifecycle `draft|active|suspended|deprecated`.
- Incluir fields de ownership, description, allowed actions/scopes y metadata.

### Slice 2 — Seeds

- Seed `greenhouse`, `kortex`, `verk`, `public_website`.
- Seed capabilities iniciales conservadoras para Kortex/Verk/website.

### Slice 3 — Runtime Helpers

- Helpers server-only para listar plataformas, capabilities activas y validar capability keys.
- Parity tests TS/DB si existe catalogo TS.

### Slice 4 — Read APIs

- Admin read APIs para UI futura.
- Ecosystem read API redacted para consumers.

### Slice 5 — Docs & Lint Rule

- Documentar registry en arquitectura (delta a `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` si el shape difiere).
- Crear lint rule `greenhouse/no-ecosystem-namespace-in-internal-catalog` modo `error` que bloquea entries `kortex.*`/`verk.*`/`public_website.*` en `ENTITLEMENT_CAPABILITY_CATALOG` interno.
- NO crear signal `capability_drift` en este slice — vive en TASK-887 una vez existan assignments contra los cuales medir capability deprecated.

## Out of Scope

- Asignar usuarios a plataformas.
- Provisionar en Kortex/Verk.
- Crear UI completa de Admin Center.
- Reemplazar el catalogo de entitlements interno de Greenhouse.

## Detailed Spec

Tablas canonicas alineadas con `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` §3.4:

### `greenhouse_core.ecosystem_platforms`

Columnas criticas:

- `platform_key` text PK — slug estable (`greenhouse`, `kortex`, `verk`, `public_website`)
- `display_name` text
- `status` text — lifecycle `draft | active | suspended | deprecated`
- `default_provisioning_mode` text — `greenhouse_managed | hybrid_approval | platform_managed_observed | read_only_observed`
- `owner_label` text
- `homepage_url`, `admin_url` text nullable
- `metadata_json` jsonb
- timestamps `activated_at`, `suspended_at`, `deprecated_at`, `created_at`, `updated_at`

CHECK constraint sobre `status` y `default_provisioning_mode` enumerados.

### `greenhouse_core.ecosystem_platform_capabilities`

Columnas criticas:

- `capability_key` text PK — formato `<platform>.<area>.<action>` (e.g. `kortex.crm_intelligence.read`)
- `platform_key` text FK to `ecosystem_platforms`
- `display_label` text
- `description` text
- `allowed_subject_types` text[] NOT NULL — subset de `internal_collaborator | client_user | service_account | external_partner`
- `allowed_scope_types` text[] NOT NULL — subset de `internal | organization | client | space | platform_workspace | platform_installation`
- `allowed_actions` text[] NOT NULL — acciones permitidas (`read | manage | publish | run | ...`)
- `requires_approval` boolean NOT NULL DEFAULT false — sensitive grants exigen segunda firma en TASK-886
- `metadata_json` jsonb
- `deprecated_at` timestamptz nullable
- timestamps

CHECK regex sobre `capability_key` `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` (3 niveles namespace).

### Seed inicial canonico

`requires_approval=true` para sensitive grants (alineado spec V1 §5.1):

| capability_key | allowed_subject_types | allowed_scope_types | allowed_actions | requires_approval |
| --- | --- | --- | --- | --- |
| `kortex.crm_intelligence.read` | internal_collaborator, client_user | client, space, platform_installation | read | false |
| `kortex.crm_strategy.run` | internal_collaborator | client, platform_installation | run | true |
| `kortex.hubspot_installation.manage` | internal_collaborator | platform_installation | manage | true |
| `kortex.operator_console.access` | internal_collaborator | internal | read, manage | false |
| `verk.workspace.access` | internal_collaborator, client_user | internal, organization, client, space | read | false |
| `verk.project.manage` | internal_collaborator | organization, client, space | manage | true |
| `public_website.cms.publish` | internal_collaborator | internal | publish | true |
| `public_website.cms.review` | internal_collaborator | internal | review | false |

### Registries ortogonales — invariante critico

`ecosystem_platform_capabilities` es **un registry separado** del `capabilities_registry` interno de Greenhouse. NUNCA se mezclan. Capabilities con prefix `kortex.*`, `verk.*`, `public_website.*` jamas entran al `ENTITLEMENT_CAPABILITY_CATALOG` interno.

Lint rule canonica `greenhouse/no-ecosystem-namespace-in-internal-catalog` modo `error` debe nacer en este slice y bloquear cualquier intento de mezclar registries.

### Out of scope movido a TASK-887

El draft original mencionaba en Slice 5 un "reliability signal de drift catalogo". Esto se mueve a TASK-887 (donde ya existiran assignments contra los cuales medir capabilities deprecated). El signal canonico es `ecosystem.access.capability_deprecated_assignments` (kind=data_quality, severity=warning si count>0).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- No ejecutar `TASK-886` sin registry y validation helpers.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Catalogo duplica entitlements internos | identity | medium | Separar platform capabilities de Greenhouse entitlements | catalog parity drift |
| Capability mal namespaced genera collision | platform | medium | CHECK/regex + unique key | migration/test failure |
| Deprecation borra historia | DB | low | deprecated_at, no DELETE | audit log |

### Feature flags / cutover

Sin flag — additive schema + read APIs. Consumers writes bloqueados hasta `TASK-886`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Down migration antes de consumers | <30 min | si |
| Slice 2 | Revert seed o marcar deprecated | <30 min | si |
| Slice 3 | Revert helpers | <30 min | si |
| Slice 4 | Retirar rutas read-only | <30 min | si |
| Slice 5 | Revert docs/signal | <15 min | si |

### Production verification sequence

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- Vitest focused para helpers/routes.

## Acceptance Criteria

- Existe registry de plataformas con `kortex`, `verk`, `public_website`.
- Existe catalogo de capabilities por plataforma.
- Capabilities tienen lifecycle y no se eliminan fisicamente.
- APIs read-only devuelven catalogo redacted.
- Helpers validan capability/scope/action antes de cualquier assignment.
- Docs actualizadas.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm vitest run src/lib/ecosystem-access`
