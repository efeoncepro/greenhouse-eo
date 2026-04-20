# Epic Index

Panel operativo de epics del repo.

## Convencion vigente

- Los epics nuevos deben usar `EPIC-###` como ID estable.
- Un epic es un programa cross-domain de varios slices o varias tasks, no una unidad de implementación directa.
- Un epic no reemplaza las tasks: las tasks siguen siendo la unidad ejecutable y pueden declarar `Epic: EPIC-###` en `## Status`.
- Los epics viven bajo `docs/epics/to-do/`, `docs/epics/in-progress/` y `docs/epics/complete/`.
- Plantilla copiable para crear epics:
  - [EPIC_TEMPLATE.md](EPIC_TEMPLATE.md)
- Registro canónico de IDs:
  - [EPIC_ID_REGISTRY.md](EPIC_ID_REGISTRY.md)
- Modelo operativo canónico:
  - [`../operations/EPIC_OPERATING_MODEL_V1.md`](../operations/EPIC_OPERATING_MODEL_V1.md)

## Bootstrap actual

- siguiente ID disponible: `EPIC-002`
- `EPIC-001` — Document Vault + Signature Orchestration Platform. Primer epic del repo. Formaliza la plataforma documental transversal de Greenhouse sobre GCS + `greenhouse_core.assets` + webhook bus canónico, con ZapSign como provider de firma y no como source of truth documental. Child tasks: `TASK-489`, `TASK-490`, `TASK-491`, `TASK-492`, `TASK-493`, `TASK-494`, `TASK-495`. Spec: `to-do/EPIC-001-document-vault-signature-orchestration-platform.md`.

## Tabla operativa

| Epic ID | Archivo | Priority | Impact | Effort | Lifecycle | Resumen |
| --- | --- | --- | --- | --- | --- | --- |
| `EPIC-001` | [EPIC-001-document-vault-signature-orchestration-platform.md](to-do/EPIC-001-document-vault-signature-orchestration-platform.md) | `P1` | `Muy alto` | `Alto` | `to-do` | Crea la primera plataforma documental transversal del repo: registry/versioning, gestor documental, rendering, firma electrónica provider-neutral, convergencia HR + Finance/Legal y capa reusable para MSA, SOW, contratos laborales y órdenes de trabajo. |
