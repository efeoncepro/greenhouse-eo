# TASK-127 - Cloud Architecture Posture Consolidation

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform / cloud / governance`

## Summary

Crear una lane explícita para evaluar la arquitectura Cloud actual con semáforo por dominio, cerrar drift documental residual y dejar un plan de consolidación/remediación posterior. No busca rehacer el trabajo ya cerrado en `TASK-096`, `TASK-098`, `TASK-099`, `TASK-102`, `TASK-103` o `TASK-124`, sino sintetizar el estado real que dejaron y convertirlo en una baseline institucional más fácil de operar, explicar y seguir endureciendo.

## Why This Task Exists

El dominio Cloud ya quedó mucho más sólido que al inicio del track:

- `WIF` ya está validado en `preview`, `staging` y `production`
- Secret Manager ya cubre secretos críticos con helper canónico y postura visible
- Cloud SQL ya tiene hardening externo, connector, SSL, pool razonable y restore test verificado
- Observability ya quedó operativa con health posture, `Sentry` y `Slack`
- cron auth y security headers ya tienen baseline

Pero todavía falta una capa de consolidación arquitectónica:

- algunas decisiones quedaron repartidas entre tasks, `Handoff`, `project_context` y docs de arquitectura
- el estado “real” por dominio no siempre está resumido en un solo scorecard operativo
- faltan follow-ons institucionales explícitos para remanentes como:
  - `CSP` enforcement (`TASK-126`)
  - FinOps / cost visibility (`TASK-103`)
  - hygiene posterior de secretos y posture tightening
- no existe todavía una task dedicada a responder con precisión:
  - qué parte de la arquitectura Cloud ya está `verde`
  - qué parte sigue `amarillo`
  - qué parte sigue `rojo`
  - qué remediaciones concretas deben venir después y en qué orden

## Goal

- Consolidar la arquitectura Cloud actual en un scorecard corto, operativo y verificable
- Dejar una lectura por dominio con semáforo (`verde`, `amarillo`, `rojo`)
- Reducir drift entre arquitectura, operating model, task index y estado real de repo/GCP/Vercel
- Dejar follow-ons explícitos y no ambiguos para la siguiente ola de hardening

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- no reabrir tasks ya cerradas sin evidencia nueva de regresión o drift real
- distinguir claramente entre:
  - baseline ya cerrada
  - remanente operativo
  - follow-on futuro
- no mezclar esta task con implementación funcional de producto ni con un nuevo hardening bigbang
- si se detecta drift nuevo, derivarlo a tasks concretas en vez de inflar esta lane

## Dependencies & Impact

### Depends on

- `TASK-096` cerrada
- `TASK-098` cerrada
- `TASK-099` cerrada
- `TASK-102` cerrada
- `TASK-103` suficientemente estabilizada para evaluar FinOps real
- `TASK-124` cerrada
- `TASK-126` ya creada como follow-on de `CSP`

### Impacts to

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/tasks/README.md`
- futuros follow-ons del dominio Cloud

### Files owned

- `docs/tasks/to-do/TASK-127-cloud-architecture-posture-consolidation.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `Handoff.md`
- `project_context.md`

## Current Repo State

### Ya existe

- baseline Cloud institucionalizada en `src/lib/cloud/*`
- runtime health y posture en `GET /api/internal/health`
- `WIF` y connector como baseline real de acceso GCP/Cloud SQL
- Secret Manager crítico ya operativo
- Observability externa ya validada
- restore verification de Cloud SQL ya documentada

### Gap actual

- falta una lectura única del estado Cloud por dominio
- la arquitectura todavía se entiende mejor leyendo varias tasks cerradas que un scorecard consolidado
- algunos follow-ons ya existen, pero no están priorizados desde una vista institucional única
- falta un plan breve de “next hardening wave” posterior al baseline actual

## Scope

### Slice 1 - Scorecard Cloud consolidado

- construir una lectura semáforo por dominio, por ejemplo:
  - identidad GCP / auth
  - secretos
  - red / perimeter
  - database resilience
  - observability
  - cron / control plane
  - headers / browser security
  - FinOps / cost controls
- cada dominio debe quedar con:
  - estado actual
  - evidencia
  - riesgo residual
  - siguiente acción recomendada

### Slice 2 - Alineación documental

- limpiar drift entre:
  - arquitectura
  - operating model
  - task index
  - docs vivos
- asegurar que lo `cerrado` no siga sonando como `pendiente`
- dejar referencias cruzadas simples a follow-ons activos

### Slice 3 - Next wave plan

- proponer orden corto y explícito para la siguiente ola Cloud
- separar:
  - follow-ons bloqueantes
  - follow-ons recomendados
  - hygiene oportunista
- confirmar qué va en task existente y qué amerita task nueva

## Out of Scope

- implementar budgets, alerts o guards nuevos dentro de esta task
- migrar más secretos a Secret Manager dentro de esta task
- endurecer `CSP` dentro de esta task
- hacer cambios de runtime en GCP o Vercel salvo una verificación menor
- reabrir lanes cerradas solo para reescribir su historia

## Acceptance Criteria

- [ ] existe una lectura Cloud consolidada con semáforo por dominio
- [ ] cada dominio tiene evidencia y riesgo residual explícitos
- [ ] arquitectura y operating model dejan de depender de leer múltiples tasks cerradas para entender el estado actual
- [ ] follow-ons Cloud quedan explícitos, no implícitos
- [ ] `TASK-103`, `TASK-126` y cualquier remanente nuevo quedan bien ubicados dentro del plan posterior
- [ ] no se reabre artificialmente ninguna task cerrada

## Verification

- revisión documental cruzada de:
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
  - `docs/tasks/README.md`
  - `Handoff.md`
  - `project_context.md`
- `rg -n "TASK-096|TASK-098|TASK-099|TASK-102|TASK-103|TASK-124|TASK-126" docs`
- validación manual de coherencia entre repo, docs y estado operativo conocido
