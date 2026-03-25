# TASK-044 - Organization Executive Snapshot

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `32`
- Domain: `account360`
- GitHub Project: `Greenhouse Delivery`

## Summary

Crear un snapshot ejecutivo unificado por organización para consolidar economics, projects, DTE coverage y health operativo en una sola superficie reusable para la ficha de organización, Home y futuros consumers externos.

## Why This Task Exists

El repo ya cerró varios bridges críticos:

- `TASK-010` unificó economics por organización
- `TASK-014` resolvió proyectos por organización
- `TASK-013` agregó DTE coverage por organización
- `TASK-015` expandió inteligencia financiera

Pero esas piezas siguen expuestas como endpoints o stores separados. La organización todavía no tiene un snapshot ejecutivo único equivalente a lo que `Person 360` aspira a ser para personas.

## Goal

- Definir una proyección ejecutiva por organización y período
- Unificar la lectura principal de salud organizacional en una API reusable
- Separar snapshot ejecutivo de breakdowns especializados por finanzas, proyectos o reconciliación
- Preparar una base estable para Home, dashboards ejecutivos y futuras APIs externas

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:

- `organization_360` sigue siendo el backbone canónico de organización; el snapshot ejecutivo debe extenderlo o apoyarse en él, no competir con otro objeto paralelo
- el snapshot principal debe usar IDs canónicos (`organization_id`, `space_id`, `client_id`) y periodización explícita
- el endpoint ejecutivo debe entregar summary reusable; los breakdowns finos permanecen en endpoints especializados

## Dependencies & Impact

### Depends on

- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`
- `src/lib/account-360/organization-economics.ts`
- `src/lib/account-360/organization-projects.ts`
- `src/app/api/organizations/[id]/dte-coverage/route.ts`
- `TASK-010 - Organization Economics Dashboard`
- `TASK-013 - Nubox Finance Reconciliation Bridge`
- `TASK-014 - Projects Account 360 Bridge`
- `TASK-015 - Financial Intelligence Layer`

### Impacts to

- `TASK-009 - Greenhouse Home Nexa`
- `TASK-040 - Data Node Architecture v2`
- vistas ejecutivas de organización y surfaces futuras de reporting
- cualquier consumer que hoy tenga que pedir varias rutas para entender una organización

### Files owned

- `scripts/setup-postgres-organization-executive.sql`
- `src/lib/account-360/organization-executive.ts`
- `src/app/api/organizations/[id]/executive/route.ts`
- `src/app/api/organizations/[id]/route.ts`
- `src/views/greenhouse/organizations/**`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

## Current Repo State

### Ya existe

- economics por organización ya existe en runtime
- projects por organización ya existe en runtime
- DTE coverage por organización ya existe en runtime
- `organization_360` ya entrega backbone de spaces y people

### Gap actual

- no existe una proyección ejecutiva que consolide esas lecturas en una sola respuesta principal
- la ficha de organización depende de varias superficies separadas para armar contexto ejecutivo
- Home y futuros consumers no tienen un summary reusable de organización con health cross-module
- no hay una frontera clara entre “snapshot ejecutivo” y “breakdown detallado”

## Scope

### Slice 1 - Snapshot y store ejecutivo

- definir la estructura del snapshot ejecutivo por organización y período
- crear store reusable para leer summary ejecutivo y breakdowns mínimos enlazados
- incorporar economics, health delivery/proyectos y tax health en una sola respuesta principal

### Slice 2 - API principal de organización

- crear endpoint ejecutivo unificado
- decidir si la ficha principal de organización debe consumirlo directo o delegarlo desde la ruta existente
- dejar trazabilidad explícita de freshness y período del snapshot

### Slice 3 - Adopción en surfaces

- adaptar la vista de organización para usar el summary ejecutivo como fuente primaria del overview
- dejar el snapshot listo para reutilización en Home o export/APIs futuras
- agregar tests de contrato y de degradación cuando falte una de las fuentes secundarias

## Out of Scope

- rehacer tabs especializadas de Finance, Projects o DTE Reconciliation
- crear BI analítico completo en tiempo real
- resolver Campaign 360 o Business Units dentro de esta lane
- reemplazar todos los endpoints especializados existentes

## Acceptance Criteria

- [ ] existe un snapshot ejecutivo por organización y período con contrato explícito
- [ ] `GET /api/organizations/[id]/executive` retorna economics, health operativo y tax health consolidados
- [ ] la ficha de organización puede usar el summary ejecutivo como fuente principal de overview
- [ ] los breakdowns especializados siguen vivos pero desacoplados del summary principal
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre contrato y degradación controlada del snapshot
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre detalle de organización y endpoint ejecutivo nuevo
