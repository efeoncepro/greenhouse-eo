# TASK-935 — Capability governance reconciliation (latent 403s + catalog↔DB parity + regression guard)

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `bugfix|hardening`
- Status real: `In-progress 2026-05-25 (develop, sin branch). Derivada de hallazgos TASK-934.`
- Domain: `identity|platform|finance|delivery`
- Blocked by: `none`
- Branch: `task/TASK-935-capability-governance-reconciliation`

## Summary

Cerrar un bug class sistémico de governance de capabilities descubierto en TASK-934: **13 capabilities se chequean vía `can()` en endpoints `/api/admin/*` pero NINGÚN rol las tiene granteadas en `runtime.ts`** → esos endpoints devuelven 403 incluso para EFEONCE_ADMIN (están shipped pero muertos). Más **4 capabilities seedeadas en DB (TASK-908/912) bajo módulo `delivery` que no existe en el catalog TS** → `parity.live.test` rojo. Se agrega un **guard de regresión** (test puro) que previene la recurrencia del bug class.

## Why This Task Exists

Bug class TASK-873: "capability en TS catalog + DB registry pero sin runtime grant = 403". TASK-934 confirmó 3; el audit comprehensivo encontró **13**. Causa raíz: los specs originales documentaron roles intended (`DEVOPS_OPERATOR`, `commercial_admin`, `operations`) que **nunca existieron como ROLE_CODES**, así que los grants nunca se escribieron. Como los 13 endpoints pasan por `requireAdminTenantContext` (route_group=admin + efeonce_admin) ANTES del `can()`, solo EFEONCE_ADMIN llega — y al no tener la capability, todos 403.

## Los 13 latent-403 (verificados con eval de `can()` sobre superset de roles)

| Capability | action/scope | Endpoint | Grant (rol real) |
|---|---|---|---|
| finance.expenses.reclassify_economic_category | update/tenant | TASK-768 | FINANCE_ADMIN + EFEONCE_ADMIN |
| finance.income.reclassify_economic_category | update/tenant | TASK-768 | FINANCE_ADMIN + EFEONCE_ADMIN |
| finance.payments.repair_clp | update/tenant | TASK-766 | FINANCE_ADMIN + EFEONCE_ADMIN |
| finance.payment_orders.recover | update/tenant | TASK-765 | FINANCE_ADMIN + EFEONCE_ADMIN |
| finance.payroll.rematerialize | update/tenant | TASK-765 | FINANCE_ADMIN + EFEONCE_ADMIN |
| commercial.engagement.recover_outbound | read/tenant + approve/tenant | TASK-837 | FINANCE_ADMIN + EFEONCE_ADMIN |
| platform.release.execute | execute/all | TASK-854 dashboard | EFEONCE_ADMIN (DEVOPS_OPERATOR no existe) |
| client_portal.catalog.manage | read/all | TASK-824 | EFEONCE_ADMIN |
| client_portal.module.read_assignment | read/tenant | TASK-824 | EFEONCE_ADMIN |
| client_portal.module.enable | create/tenant | TASK-824 | EFEONCE_ADMIN (commercial_admin no existe) |
| client_portal.module.disable | delete/tenant | TASK-824 | EFEONCE_ADMIN |
| client_portal.module.override_business_line_default | approve/tenant | TASK-824 | EFEONCE_ADMIN |

Nota: los roles documentados inexistentes (`DEVOPS_OPERATOR`, `commercial_admin`, `operations`) colapsan a EFEONCE_ADMIN — que es el único que pasa `requireAdminTenantContext` para estos endpoints igual. Grant a FINANCE_ADMIN en los de finance/commercial por consistencia con el bloque canónico (aunque moot para estos /api/admin/ endpoints, correcto si la capability se chequea en otro contexto).

## 4 caps DB-only (parity drift TASK-908/912)

`cycle_time.compute.execute` (delivery, execute/all), `correction_transitions.compute.read` (delivery, read/all), `notion.webhook.ingest_status_transitions` (delivery, execute/tenant), `notion.status_transitions.backfill_execute` (delivery, execute/all). Seedeadas en DB sin módulo `delivery` en el catalog TS. NO son can()-checked (auth de CLI/worker, sin 403). Reconciliar = agregar módulo `delivery` + 4 entries.

## Scope

### Slice 1 — Runtime grants (13) + regression guard

- `runtime.ts`: grants para los 13 (finance/commercial 6 en bloque `FINANCE_ADMIN||EFEONCE_ADMIN`; platform/client_portal 6 en bloque `EFEONCE_ADMIN`), tuplas action/scope exactas.
- **Guard de regresión** (test puro, no-DB): parsea `can()` usages + asserta que toda capability del catalog chequeada vía `can()` está granteada a ≥1 rol. Previene el bug class para siempre.

### Slice 2 — Catalog↔DB parity reconciliation

- Agregar módulo `delivery` a `ENTITLEMENT_MODULES` + 4 catalog entries matching DB. Sin runtime grant (no can()-checked).

### Slice 3 — Docs + closeout

- CLAUDE.md: reforzar invariante TASK-873 (el guard ahora lo enforce). changelog/README/registry/Handoff.

## Out of Scope

- Crear roles nuevos (`DEVOPS_OPERATOR` etc.) — colapsan a EFEONCE_ADMIN en V1.
- UI de governance de capabilities.

## Verification

- eval `can()` post-grant: los 13 → true para sus roles.
- guard de regresión verde.
- `pnpm test` full + build.
