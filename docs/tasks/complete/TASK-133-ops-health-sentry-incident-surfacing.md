# TASK-133 — Ops Health: Sentry Incident Surfacing

## Delta 2026-03-29

- Cerrada con integración fail-soft de incidentes Sentry en `src/lib/cloud/observability.ts`.
- `getOperationsOverview()` y `GET /api/internal/health` ahora exponen un snapshot canónico separado de la postura base de observability.
- `Ops Health` y `Cloud & Integrations` muestran incidentes abiertos/relevantes con `title`, `location`, `release`, `environment`, `lastSeen` y deep-link.
- Validación ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/webhooks/target-url.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/operations/get-operations-overview.ts src/app/api/internal/health/route.ts src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx src/views/greenhouse/admin/AdminOpsHealthView.tsx src/lib/webhooks/target-url.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Cloud / Ops Health / Observability |
| Sequence | Follow-on de TASK-098 (Observability MVP) y TASK-122 (Cloud Governance Layer) |

## Summary

Exponer en `Ops Health` los errores e incidentes abiertos que Sentry ya detecta en runtime, para que el dominio Cloud deje de depender solo de `/api/internal/health`, logs y alertas indirectas. El objetivo es convertir Sentry en una señal operativa visible dentro del portal, no solo en una herramienta externa para ingenieros.

## Why This Task Exists

Greenhouse ya tiene Sentry operativo desde `TASK-098`, pero hoy los errores relevantes siguen quedando fuera del surface institucional de `Ops Health`. Eso genera un gap claro:

- el portal puede verse “sano” por health checks básicos mientras Sentry ya detectó un fallo real
- el equipo debe salir del portal para revisar incidentes
- `Ops Health` no concentra todavía la mejor señal disponible sobre errores runtime
- no existe un resumen interno de release, endpoint afectado, severidad o recencia de los incidentes abiertos

El incidente reciente en `GET /api/finance/economic-indicators/sync` confirmó esta carencia: Sentry detectó el error antes de que existiera una proyección visible dentro del dominio Cloud.

## Goal

- Incorporar lectura server-side de incidentes abiertos/relevantes desde Sentry.
- Exponer esa lectura en el dominio `Cloud`, preferentemente vía `Ops Health`.
- Mostrar suficiente contexto operativo para triage rápido:
  - endpoint o transacción
  - release
  - environment
  - fecha/hora de última ocurrencia
  - prioridad o nivel
- Mantener la integración fail-soft: si Sentry no responde o falta token, la UI debe degradar sin romper el portal.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `Ops Health` es la ventana incident-facing del dominio Cloud; no duplicar lógica de negocio fuera de `src/lib/cloud/*` o la capa canónica de operaciones.
- La UI debe ser un mirror del estado operativo, no la fuente de verdad.
- La integración con Sentry debe usar secretos y config ya existentes (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) sin introducir credenciales nuevas ad hoc.

## Dependencies & Impact

### Depends on

- `TASK-098` — Observability MVP
- `TASK-122` — Cloud Governance Layer Institutionalization
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

### Impacts to

- `Ops Health`
- `Cloud & Integrations`
- futuras lanes de observabilidad y incident response

### Files owned

- `src/lib/cloud/observability.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/app/api/internal/health/route.ts`
- `docs/tasks/complete/TASK-133-ops-health-sentry-incident-surfacing.md`

## Current Repo State

### Ya existe

- Sentry runtime operativo y validado externamente.
- Señal de observabilidad básica en `cloud/*` y `GET /api/internal/health`.
- Surface institucional de `Ops Health` y `Cloud & Integrations`.

### Gap actual

- No hay lectura interna de incidentes abiertos desde Sentry.
- `Ops Health` no muestra errores reales detectados por Sentry.
- No existe resumen institucional por release, transacción o endpoint fallando.

## Scope

### Slice 1 — Sentry incident reader

- Crear helper server-side para consultar issues/incidentes abiertos de Sentry.
- Normalizar un payload mínimo, estable y fail-soft para el portal.
- Limitar el volumen al top operativo reciente, no al historial completo.

### Slice 2 — Cloud/operations model integration

- Incorporar la señal de Sentry al payload canónico de `getOperationsOverview()`.
- Separar claramente:
  - postura/configuración observability
  - incidentes Sentry activos

### Slice 3 — Ops Health UI

- Mostrar un bloque de incidentes Sentry recientes o abiertos.
- Incluir enlace/contexto suficiente para investigar rápido sin salir a ciegas.
- Mantener empty state claro cuando no haya incidentes o cuando Sentry no esté accesible.

### Slice 4 — Guardrails

- No romper si falta `SENTRY_AUTH_TOKEN`.
- No degradar `overallStatus` del portal solo por falta de lectura externa.
- Registrar fallback o warning operativo cuando Sentry no pueda consultarse.

## Out of Scope

- Resolver automáticamente issues en Sentry desde el portal.
- Sincronizar todo el issue stream histórico.
- Reemplazar alertas Slack o dashboards nativos de Sentry.
- Rehacer el modelo completo de `Ops Health`.

## Acceptance Criteria

- [x] Existe helper server-side para leer incidentes abiertos/relevantes desde Sentry.
- [x] `getOperationsOverview()` incorpora un bloque canónico de incidentes Sentry.
- [x] `Ops Health` muestra al menos endpoint/transacción, release, environment y última ocurrencia.
- [x] La integración degrada sin romper cuando falta token o Sentry no responde.
- [x] `pnpm lint` pasa.
- [x] `pnpm test` pasa.
- [x] `pnpm build` pasa.

## Verification

- `pnpm exec eslint src/lib/cloud src/lib/operations src/views/greenhouse/admin`
- `pnpm exec vitest run`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- Validación manual en `Ops Health` con:
  - incidente abierto visible
  - empty state sin incidente
  - fallback si falla la consulta a Sentry
