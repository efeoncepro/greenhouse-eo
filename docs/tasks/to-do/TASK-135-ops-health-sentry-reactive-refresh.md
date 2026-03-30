# TASK-135 - Ops Health Sentry Reactive Refresh

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `54`
- Domain: `cloud`

## Summary

Hacer que la sección `Incidentes Sentry` en `Ops Health` deje de ser una foto estática del momento de carga y pase a comportarse como una superficie operativa viva: refresco automático, refresco manual y fallback `stale` con último snapshot bueno cuando Sentry falle.

## Why This Task Exists

`TASK-133` cerró el surfacing de incidentes Sentry dentro del portal, pero la experiencia actual sigue siendo demasiado estática para una vista operativa que suele quedarse abierta en pantalla:

- si aparece un incidente nuevo, el usuario depende de recargar la página
- si Sentry falla en una consulta puntual, se pierde contexto útil aunque haya un snapshot reciente válido
- no existe una señal explícita de recencia, polling o estado `stale`

Para que `Ops Health` sirva realmente como consola de monitoreo ligera, la sección de Sentry debe comportarse más como un panel reactivo y menos como un render único.

## Goal

- agregar refresco automático liviano para incidentes Sentry dentro de `Ops Health`
- mantener un snapshot server-side canónico con caché corta y recencia visible
- conservar el último estado bueno cuando Sentry falle, marcándolo como `stale`
- ofrecer un affordance explícito de `Refrescar ahora` para uso manual

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-133-ops-health-sentry-incident-surfacing.md`

Reglas obligatorias:

- `Ops Health` sigue siendo una lectura del estado operativo, no la fuente de verdad de incidentes.
- La consulta a Sentry debe seguir concentrada en la capa canónica `src/lib/cloud/*`.
- El auto-refresh no debe castigar innecesariamente a Sentry ni degradar el rendimiento del portal.

## Dependencies & Impact

### Depends on

- `TASK-133` - surfacing base de incidentes Sentry
- `TASK-122` - cloud governance layer institucionalization
- `SENTRY_INCIDENTS_AUTH_TOKEN` o `SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF`

### Impacts to

- `Ops Health`
- `Cloud & Integrations`
- futuras lanes de observabilidad reactiva y incident response

### Files owned

- `src/lib/cloud/observability.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/internal/health/route.ts`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `docs/tasks/to-do/TASK-135-ops-health-sentry-reactive-refresh.md`

## Current Repo State

### Ya existe

- reader server-side de incidentes Sentry
- bloque canónico `sentryIncidents` en health y operaciones
- manejo fail-soft para `401/403` y fallos de consulta
- surface institucional en `Ops Health` y `Cloud & Integrations`

### Gap actual

- la UI no se refresca sola
- no hay acción explícita de refresco manual
- no se conserva automáticamente el último snapshot bueno con semántica `stale`
- la recencia de la señal no comunica todavía una política operativa clara de polling/caché

## Scope

### Slice 1 - Snapshot canónico con recencia

- definir una caché corta server-side para la consulta de incidentes Sentry
- exponer metadata de recencia y condición `fresh` vs `stale`
- conservar el último snapshot bueno cuando una consulta nueva falle

### Slice 2 - Refresh UX en Ops Health

- agregar auto-refresh periódico en la UI
- agregar affordance explícito `Refrescar ahora`
- mostrar claramente cuándo la lectura está fresca, desactualizada o degradada

### Slice 3 - Guardrails operativos

- evitar polling agresivo o sin control
- degradar con copy útil cuando Sentry no responda
- no convertir una falla externa puntual en un error disruptivo del portal

## Out of Scope

- abrir/cerrar/resolver issues de Sentry desde el portal
- streaming en tiempo real tipo websocket
- reemplazar dashboards nativos o alertas de Sentry/Slack
- extender el polling reactivo a todo `Ops Health` en esta misma lane

## Acceptance Criteria

- [ ] `Ops Health` refresca automáticamente el bloque de incidentes Sentry con un intervalo corto y explícito
- [ ] existe acción manual de `Refrescar ahora`
- [ ] cuando Sentry falle, la UI conserva el último snapshot bueno y lo muestra como `stale`
- [ ] la recencia del snapshot queda visible para el usuario operativo
- [ ] la consulta a Sentry sigue centralizada en la capa canónica del dominio Cloud
- [ ] `pnpm lint` pasa
- [ ] `pnpm test` pasa
- [ ] `pnpm build` pasa

## Verification

- `pnpm exec eslint src/lib/cloud src/lib/operations src/views/greenhouse/admin src/app/api/internal/health`
- `pnpm exec vitest run`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- validación manual en `Ops Health` con:
  - incidente visible sin recargar la página
  - botón `Refrescar ahora`
  - degradación a `stale` si falla una consulta posterior a un snapshot bueno
