# TASK-613 — Finance Clients Detail → Organization Workspace Convergence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-008`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-611, TASK-612`
- Branch: `task/TASK-613-finance-clients-organization-workspace-convergence`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Converger el detalle de `/finance/clients/[id]` al mismo Organization Workspace compartido, preservando compatibilidad con `clientProfileId` y con el runtime financiero actual. La meta no es borrar Finance Clients, sino convertirlo en un entrypoint financiero del mismo objeto organización.

## Why This Task Exists

Hoy `Finance Clients` sigue siendo una surface aparte del objeto organización:

- usa `clientProfileId` como route key principal
- renderiza un detalle más pobre y finance-only
- no hereda enriquecimiento del Organization Workspace
- obliga a mantener layouts y contratos paralelos para la misma cuenta

El backend ya avanzó mucho hacia org-first con `TASK-181` y `TASK-191`, pero el detalle visible para usuario todavía no refleja ese cambio. Mientras eso siga así:

- la experiencia se siente inconsistente
- cada mejora de Organization 360 no llega automáticamente a Finance
- la identidad de la cuenta sigue partida entre organización y perfil financiero

## Goal

- Hacer que `/finance/clients/[id]` resuelva y monte el Organization Workspace compartido.
- Mantener `clientProfileId` como compat route key mientras exista deuda legacy.
- Mostrar el facet financiero como foco por defecto sin perder acceso a otras facets autorizadas.
- Preservar el contrato operativo de Finance mientras la experiencia converge.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `organizationId` es el anchor canónico de la experiencia; `clientProfileId` queda como bridge de compatibilidad.
- El detail de Finance no debe perder información financiera especializada al converger con el shell compartido.
- La route `/finance/clients/[id]` sigue existiendo como entrypoint y no debe romper deep-links actuales.
- Toda resolución de identidad debe seguir siendo tenant-safe y compatible con consumers financieros existentes.

## Normative Docs

- `docs/tasks/in-progress/TASK-181-finance-clients-organization-canonical-source.md`
- `docs/tasks/in-progress/TASK-191-finance-organization-first-downstream-consumers-cutover.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-611`
- `TASK-612`
- `src/views/greenhouse/finance/ClientDetailView.tsx`
- `src/views/greenhouse/finance/ClientsListView.tsx`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/route.ts`
- `src/lib/finance/canonical.ts`

### Blocks / Impacts

- coherencia futura de directorios y entrypoints organization-first
- futuras convergencias de proveedores o otras vistas B2B
- simplificación de enriquecimiento cross-domain de cuentas

### Files owned

- `src/views/greenhouse/finance/ClientDetailView.tsx`
- `src/views/greenhouse/finance/ClientsListView.tsx`
- `src/app/(dashboard)/finance/clients/[id]/page.tsx`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/route.ts`
- `src/lib/finance/canonical.ts`

## Current Repo State

### Already exists

- `Finance Clients` ya lee org-first en runtime y expone `organizationId` de forma aditiva.
- `client_profiles.organization_id` ya es la FK fuerte del lado Finance.
- `OrganizationView` ya existe como workspace cross-domain más rico.

### Gap

- `/finance/clients/[id]` sigue renderizando una experiencia propia y más pobre
- la route sigue anclada conceptualmente a `clientProfileId`
- no existe adopción del shell compartido ni del modelo facet-driven
- Finance no hereda automáticamente el enriquecimiento de Organization 360

## Scope

### Slice 1 — Identity resolution bridge for Finance entrypoint

- Formalizar el resolver `clientProfileId -> organizationId` para el detail entrypoint.
- Endurecer el contract del detail para que siempre que exista organización, el workspace se monte organization-first.

### Slice 2 — Finance detail adoption of shared workspace

- Reemplazar el detail actual por el shell compartido del Organization Workspace.
- Configurar `entrypointContext='finance'` y `defaultFacet='finance'`.
- Preservar surface/labels/acciones financieras necesarias.

### Slice 3 — Compatibility and transition hardening

- Mantener compatibilidad con list navigation actual.
- Definir degradación explícita para casos legacy donde un `client_profile` todavía no resuelve organización.
- Evitar regresiones en drawers o consumers que siguen navegando desde `clientProfileId`.

### Slice 4 — Tests and docs

- Cubrir el bridge de resolución y el rendering del detail convergido.
- Actualizar documentación funcional/arquitectónica de Finance Clients.

## Out of Scope

- Reescribir el listado completo de `/finance/clients` como directory organization-first unificado.
- Eliminar `clientProfileId` del runtime entero.
- Converger proveedores en esta misma task.

## Detailed Spec

La semántica esperada es:

- `Finance Clients` sigue siendo una vista válida para usuarios financieros
- pero su detail ya no es un objeto aparte, sino una proyección financiera del mismo Organization Workspace

Cuando el caller entra por `/finance/clients/[id]`, el sistema debe:

1. resolver identidad canónica
2. montar el shell compartido
3. abrir el facet financiero por defecto
4. habilitar otras facets si los entitlements lo permiten

Para perfiles legacy sin organización vinculada, la UI debe degradar explícitamente y señalar remediación en vez de abrir una experiencia falsa parcialmente mapeada.

## Acceptance Criteria

- [ ] `/finance/clients/[id]` monta el Organization Workspace compartido cuando el perfil resuelve `organizationId`.
- [ ] El facet financiero queda como vista por defecto del entrypoint Finance.
- [ ] La navegación actual basada en `clientProfileId` sigue funcionando durante la transición.
- [ ] Existe degradación explícita y segura para perfiles que todavía no resuelven organización.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `/finance/clients` y `/finance/clients/[id]`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` y/o doc funcional de clientes quedó alineado con el detail convergido

## Follow-ups

- directory/list convergence de `Finance Clients`
- convergencia equivalente para suppliers si el programa organization-first se extiende al lado vendor
