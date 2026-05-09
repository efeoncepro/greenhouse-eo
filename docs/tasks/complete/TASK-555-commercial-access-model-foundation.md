# TASK-555 — Commercial Access Model Foundation

## Delta 2026-05-06

- **TASK-813** (HubSpot p_services 0-162 sync activation) consume el namespace `commercial.*` definido por esta task y registra capabilities nuevas que deben quedar previstas en el contrato:
  - `commercial.service_engagement.sync` — invocar sync de un service desde HubSpot (FINANCE_ADMIN + EFEONCE_ADMIN, server-only).
  - `commercial.service_engagement.resolve_orphan` — UI admin para resolver huérfanos HubSpot sin org Greenhouse (FINANCE_ADMIN + EFEONCE_ADMIN).
  - `commercial.service_engagement.archive_legacy` — script-level capability para el cleanup script de fantasmas.
- Soft dep: TASK-813 espera tener el routeGroup `commercial` listo para no entrar bajo `finanzas.*` transicional. Si TASK-555 no cierra antes, TASK-813 documenta la transition path y el rebanding posterior.

## Delta 2026-05-07

- `commercial` queda formalizado como route group broad de navegación/surface.
- Se materializan views `comercial.pipeline`, `comercial.cotizaciones`, `comercial.contratos`, `comercial.sow`, `comercial.acuerdos_marco` y `comercial.productos`.
- Compatibilidad transicional: quotes acepta `comercial.cotizaciones` y `finanzas.cotizaciones` mientras la ruta siga bajo `/finance/quotes`.
- No se crea startup policy comercial ni familia de roles `sales`.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-002`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `develop` (user-requested direct execution; no task branch)
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Crear la foundation de acceso para `Comercial` como dominio del portal: `routeGroup commercial`, namespace `comercial.*` para surfaces y compatibilidad transicional con `finanzas.*` sobre los paths legacy existentes.

## Why This Task Exists

Separar solo el sidebar no alcanza. Hoy los checks de acceso a quotes siguen amarrados a `finanzas.cotizaciones` y al fallback `routeGroup: finance`. Sin una foundation de access model, la separacion de dominio queda cosmética.

## Goal

- introducir `routeGroup: commercial`
- introducir namespace `comercial.*`
- mantener compat transicional con `finanzas.*` mientras las rutas sigan bajo `/finance/...`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- documentar explícitamente qué cambia en `routeGroups`, `views` y `entitlements`
- no cambiar `startup policy` en este corte

## Dependencies & Impact

### Depends on

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/finance/quotation-access.ts`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

### Blocks / Impacts

- `TASK-556`
- `TASK-557`

### Files owned

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/finance/quotation-access.ts`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- el modulo `commercial` ya existe en el catálogo de entitlements
- `quotation-access` sigue leyendo `finanzas.cotizaciones` + fallback `routeGroup: finance`

### Gap

- no existe `routeGroup: commercial`
- no existe namespace de surfaces `comercial.*`
- no hay contrato de compatibilidad formal entre surfaces legacy `finanzas.*` y target `comercial.*`

## Scope

### Slice 1 — Route group foundation

- agregar `commercial` al modelo de route groups y su proyección documental/runtime
- definir binding transicional de roles existentes al nuevo carril

### Slice 2 — Surface namespace and compat

- introducir `comercial.*` en guards/helpers relevantes
- dejar compat explícita con `finanzas.*` donde aún existan surfaces sobre `/finance/...`

## Out of Scope

- crear la familia de roles `sales`, `sales_lead` o `commercial_admin`
- cambiar URLs
- reescribir todos los guards del portal en un solo lote

## Detailed Spec

La task debe resolver sobre ambos planos:

- `views` / `authorizedViews` / `view_code`
- `entitlements` / `module + capability + action + scope`

La ausencia de esa separación se considera diseño incompleto.

## Acceptance Criteria

- [x] Existe un contrato explícito para `routeGroup: commercial`
- [x] Las surfaces comerciales objetivo tienen namespace `comercial.*` documentado y soportado
- [x] Los checks legacy necesarios siguen funcionando mientras existan rutas `/finance/...`

## Verification

- `pnpm pg:doctor` -> pass
- `pnpm pg:connect:migrate` -> pass; migration `20260507065816822_task-555-commercial-access-model-foundation.sql` aplicada y tipos Kysely regenerados
- `pnpm test src/lib/finance/__tests__/quotation-access.test.ts src/lib/entitlements/runtime.test.ts src/lib/admin/view-access-catalog.test.ts src/lib/admin/view-access-resolution.test.ts src/lib/admin/internal-role-visibility.test.ts` -> pass, 5 files / 56 tests
- `pnpm lint`
- `pnpm tsc --noEmit`
- revisión manual de docs de acceso actualizadas

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] la task deja documentado el mapa transicional `finanzas.* -> comercial.*`

## Follow-ups

- `TASK-556`
- `TASK-557`
