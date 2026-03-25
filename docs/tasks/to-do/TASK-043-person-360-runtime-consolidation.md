# TASK-043 - Person 360 Runtime Consolidation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `31`
- Domain: `people`
- GitHub Project: `Greenhouse Delivery`

## Summary

Consolidar `Person 360` como una lectura serving-first y homogénea para la ficha principal de persona, reduciendo el fan-out actual de stores heterogéneos y los fallbacks por sub-query que hoy mantienen a `People` en una etapa híbrida.

## Why This Task Exists

El portal ya tiene una ficha de persona con mucho valor real, pero su runtime sigue ensamblando múltiples piezas desde stores distintos:

- identidad
- memberships
- finance
- payroll
- HR
- delivery
- métricas operativas
- ICO

Ese ensamblaje funciona, pero no está aún formalizado como un read model maduro. El resultado es un `Person 360` fuerte en alcance funcional, pero todavía costoso de mantener y con mayor riesgo de inconsistencias entre tabs y APIs.

## Goal

- Definir un contrato serving-first para la ficha de persona
- Reducir fan-out y fallback por sub-query en el path normal de `People`
- Separar snapshot principal de persona de los drill-downs especializados
- Dejar a `Person 360` listo para ser consumido por otras superficies sin reorquestar lógica dominio por dominio

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:

- la ficha principal de persona debe consumir snapshots maduros cuando existan, no recomponer siempre desde fuentes de dominio dispersas
- la consolidación no debe borrar drill-downs especializados; debe encapsularlos detrás de fronteras claras
- el runtime principal de `People` debe ser legible, testeable y observable sin depender de orquestación implícita entre varios stores

## Dependencies & Impact

### Depends on

- `TASK-042 - Person Operational Serving Cutover`
- `src/lib/people/get-person-detail.ts`
- `src/lib/person-360/get-person-finance.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `greenhouse_serving.person_360`
- `greenhouse_serving.person_finance_360`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

### Impacts to

- `People` detail API y tabs principales
- `TASK-019 - Staff Augmentation Module`
- `TASK-018 - SCIM User Provisioning`
- cualquier surface futura que necesite snapshot operativo de persona sin rehacer joins de dominio

### Files owned

- `scripts/setup-postgres-person-runtime-360.sql`
- `src/lib/people/get-person-detail.ts`
- `src/lib/person-360/get-person-runtime.ts`
- `src/app/api/people/[memberId]/route.ts`
- `src/types/people.ts`
- `src/views/greenhouse/people/**`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

## Current Repo State

### Ya existe

- `person_360` ya materializa backbone de identidad y facetas canónicas
- `person_finance_360` ya concentra finanzas por persona
- `ico_member_metrics` ya concentra performance ICO por persona
- `People` ya entrega una ficha rica y usable en producción

### Gap actual

- la ficha de persona sigue dependiendo de composición ad hoc de múltiples stores
- el fallback por sub-query complica el comportamiento esperado del endpoint principal
- no existe un snapshot principal explícito que delimite qué pertenece a la lectura core de persona y qué queda como enrichment o drill-down
- otras superficies del portal no pueden reutilizar `Person 360` sin repetir parte de la orquestación actual

## Scope

### Slice 1 - Contrato de snapshot principal

- definir qué campos entran al snapshot runtime de persona
- separar claramente summary principal, enrichments y drill-downs
- crear store runtime dedicado para la ficha de persona

### Slice 2 - Cutover de API y tipos

- adaptar `GET /api/people/[memberId]` al nuevo store consolidado
- ajustar tipos compartidos de `People` al contrato definitivo
- reducir caminos de fallback y dejar trazabilidad explícita cuando se usen

### Slice 3 - Consumo UI y pruebas

- adaptar tabs principales para leer el contrato consolidado sin duplicar fetches innecesarios
- agregar tests de contrato y de degradación controlada
- validar que el nuevo runtime no rompe permisos ni superficies actuales

## Out of Scope

- rediseñar el layout de la ficha de persona
- crear nuevos módulos de HR o Finance
- eliminar todos los endpoints secundarios de persona
- resolver toda la reconciliación CRM pendiente de Person 360

## Acceptance Criteria

- [ ] existe un contrato serving-first explícito para la ficha principal de persona
- [ ] `GET /api/people/[memberId]` usa el nuevo store consolidado
- [ ] el fan-out del endpoint principal se reduce de forma material y visible en código
- [ ] los fallbacks quedan encapsulados y observables, no dispersos por sub-query
- [ ] tabs principales de `People` consumen el contrato consolidado sin romper funcionalidad actual
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre contrato principal y casos de degradación
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual de la ficha de persona en al menos 2 perfiles con contextos distintos
