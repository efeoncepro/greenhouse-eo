# Greenhouse Docs

Indice maestro de la documentacion no operativa del repo.

## Orden de lectura sugerido

1. Volver a la raiz para contexto operativo inmediato:
   - [README.md](../README.md)
   - [AGENTS.md](../AGENTS.md)
   - [project_context.md](../project_context.md)
   - [Handoff.md](../Handoff.md)
2. Entrar a la categoria de documentacion que corresponda al trabajo.

## Mapa por categoria

### Architecture

- [GREENHOUSE_ARCHITECTURE_V1.md](architecture/GREENHOUSE_ARCHITECTURE_V1.md)
- [MULTITENANT_ARCHITECTURE.md](architecture/MULTITENANT_ARCHITECTURE.md)
- [GREENHOUSE_IDENTITY_ACCESS_V1.md](architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md)
- [GREENHOUSE_INTERNAL_IDENTITY_V1.md](architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md)
- [GREENHOUSE_ID_STRATEGY_V1.md](architecture/GREENHOUSE_ID_STRATEGY_V1.md)
- [GREENHOUSE_360_OBJECT_MODEL_V1.md](architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md)
- [GREENHOUSE_DATA_MODEL_MASTER_V1.md](architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md)
- [GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md](architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md)
- [GREENHOUSE_POSTGRES_CANONICAL_360_V1.md](architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md)
- [GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md](architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md)
- [GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md](architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md)
- [GREENHOUSE_SERVICE_MODULES_V1.md](architecture/GREENHOUSE_SERVICE_MODULES_V1.md)
- [FINANCE_CANONICAL_360_V1.md](architecture/FINANCE_CANONICAL_360_V1.md)
- [Greenhouse_Capabilities_Architecture_v1.md](architecture/Greenhouse_Capabilities_Architecture_v1.md)
- [Greenhouse_Nomenclatura_Portal_v3.md](architecture/Greenhouse_Nomenclatura_Portal_v3.md)

### API

- [GREENHOUSE_API_REFERENCE_V1.md](api/GREENHOUSE_API_REFERENCE_V1.md)
- [GREENHOUSE_INTEGRATIONS_API_V1.md](api/GREENHOUSE_INTEGRATIONS_API_V1.md)
- [GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml](api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml)

### UI

- [GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md](ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md)
- [GREENHOUSE_UI_ORCHESTRATION_V1.md](ui/GREENHOUSE_UI_ORCHESTRATION_V1.md)
- [GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md](ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md)
- [GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md](ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md)
- [GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md](ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md)
- [GREENHOUSE_DASHBOARD_UX_GAPS_V1.md](ui/GREENHOUSE_DASHBOARD_UX_GAPS_V1.md)
- [SKY_TENANT_EXECUTIVE_SLICE_V1.md](ui/SKY_TENANT_EXECUTIVE_SLICE_V1.md)

### Roadmap

- [BACKLOG.md](roadmap/BACKLOG.md)
- [PHASE_TASK_MATRIX.md](roadmap/PHASE_TASK_MATRIX.md)

### Operations

- [DOCUMENTATION_OPERATING_MODEL_V1.md](operations/DOCUMENTATION_OPERATING_MODEL_V1.md)
- [GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md](operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md)
- [HR_PAYROLL_BRANCH_RESCUE_RUNBOOK_V1.md](operations/HR_PAYROLL_BRANCH_RESCUE_RUNBOOK_V1.md)

### Tasks

- [Task Index](tasks/README.md)
- Paneles activos bajo `docs/tasks/`:
  - `in-progress/`
  - `to-do/`
  - `complete/`
- Regla obligatoria:
  - toda `CODEX_TASK_*` debe revisarse contra `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md` y la arquitectura especializada aplicable antes de implementarse
