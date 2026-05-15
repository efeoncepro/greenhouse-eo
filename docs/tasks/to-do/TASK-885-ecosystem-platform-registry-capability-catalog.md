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

### Slice 5 — Docs & Signals

- Documentar registry en arquitectura.
- Agregar reliability signal de drift catalogo si aplica.

## Out of Scope

- Asignar usuarios a plataformas.
- Provisionar en Kortex/Verk.
- Crear UI completa de Admin Center.
- Reemplazar el catalogo de entitlements interno de Greenhouse.

## Detailed Spec

Tablas sugeridas, sujetas a Discovery:

- `greenhouse_core.ecosystem_platforms`
- `greenhouse_core.ecosystem_platform_capabilities`

Seed inicial sugerido:

- `kortex.crm_intelligence.read`
- `kortex.crm_strategy.run`
- `kortex.hubspot_installation.manage`
- `kortex.operator_console.access`
- `verk.workspace.access`
- `verk.project.manage`
- `public_website.cms.publish`
- `public_website.cms.review`

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
