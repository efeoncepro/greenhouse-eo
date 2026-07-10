# Auditoría de cobertura modular en agentes — 2026-07-10

## Objetivo

Verificar que la decisión extraction-ready de `EPIC-026` llegue a las puertas de entrada que pueden alterar arquitectura, placement, build o runtime, sin duplicar el operating model en cada skill.

## Fuente de verdad

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_TEMPLATE.md` (`## Modular Placement Contract`)

## Cobertura Codex

| Scope | Entrada | Cobertura |
|---|---|---|
| repo | `greenhouse-task-planner` | autoría y lint obligatorio |
| repo | `greenhouse-task-execution-hook` | preflight antes de plan/código |
| repo | `software-architect-2026` | current/future home y no-extracción implícita |
| repo local ignorado | `greenhouse-agent` | regla general para el agente Greenhouse |
| global | `greenhouse-task-planner` | espejo gobernado del planner |
| global | `software-architect-2026` | entrypoint global que compone la regla del repo |

## Cobertura Claude

| Capa | Repo/equipo | Global | Responsabilidad modular |
|---|---|---|---|
| arquitectura de sistema | `arch-architect` | `arch-architect` | decisión topológica y ADR |
| frontend/runtime | `frontend-architect` | `frontend-architect` | RSC/client, rutas, caché y dependencias |
| información/rutas | `info-architecture` | `info-architecture` | ruta actual no equivale a deployable futuro |
| accesibilidad | `a11y-architect` | `a11y-architect` | restricciones server/browser sin decidir extracción |
| UI platform | `greenhouse-product-ui-architect`, `greenhouse-ui-orchestrator` | — | candidato `ui-package`, browser/build coupling |
| backend | — | `greenhouse-backend` | adapters finos y candidatos api/worker/domain-package |
| headless/public | `astro` | `headless-architect` | public como candidato, no extracción automática |
| performance/build | `web-perf-design` | `web-perf-design` | costo de build/bundle en el contrato |
| servicios/scheduling | — | `greenhouse-cloud-run-integrations`, `greenhouse-cron-sync-ops` | nuevo deployable o migración exige task/ADR |
| planificación | `greenhouse-task-planner` | `greenhouse-task-planner` | contrato obligatorio y gates |
| ejecución | `implement-task` | `greenhouse-dev` | discovery antes de implementar |

## Criterio de inclusión

Se actualizaron skills capaces de decidir o materializar placement, límites browser/server, dependencias de build, rutas, servicios o deployables. Skills puramente visuales, de copy, auditoría de dominio o proveedor genérico quedan cubiertas por el template, el execution harness y `task:lint`; añadirles la regla completa crearía drift y consumo de contexto sin una nueva puerta arquitectónica.

## Regla de mantenimiento

Las skills solo resumen y enlazan. El operating model conserva el detalle. Si aparece una nueva skill que pueda crear apps, packages, routes, workers, cron/sync o servicios, debe agregarse a esta matriz y al harness aplicable antes de considerarla lista para Greenhouse.
