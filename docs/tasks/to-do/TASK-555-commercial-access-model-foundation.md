# TASK-555 — Commercial Access Model Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-002`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-555-commercial-access-model-foundation`
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

- [ ] Existe un contrato explícito para `routeGroup: commercial`
- [ ] Las surfaces comerciales objetivo tienen namespace `comercial.*` documentado y soportado
- [ ] Los checks legacy necesarios siguen funcionando mientras existan rutas `/finance/...`

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/__tests__/quotation-access.test.ts`
- revisión manual de docs de acceso actualizadas

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] la task deja documentado el mapa transicional `finanzas.* -> comercial.*`

## Follow-ups

- `TASK-556`
- `TASK-557`
