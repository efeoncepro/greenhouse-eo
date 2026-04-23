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

- siguiente ID disponible: `EPIC-006`
- `EPIC-005` — Greenhouse como orquestador canónico Commercial↔Delivery (sync HubSpot↔Notion). Reemplaza el sibling `cesargrowth11/notion-hubspot-sync` (polling 15-min, watermark drift, mappings hardcoded). Scope: deals + tasks + companies + contacts. Estrategia real-time híbrida (Notion webhooks primary + reconciliation polling 6h + full-sync on demand). Conflict resolution state-machine por deal stage + LWW fallback. Integration Notion dedicada con grant per-DB. Cutover de un tirón + 48h rollback. Child tasks: `TASK-577` (Notion write bridge), `TASK-578` (mapping registry + identity extension), `TASK-579` (forward orchestrator 4 entidades), `TASK-580` (reverse orchestrator híbrido), `TASK-581` (cutover + retirement), `TASK-582` (monthly project admin surface con preview). Spec: `to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`.
- `EPIC-001` — Document Vault + Signature Orchestration Platform. Primer epic del repo. Formaliza la plataforma documental transversal de Greenhouse sobre GCS + `greenhouse_core.assets` + webhook bus canónico, con ZapSign como provider de firma y no como source of truth documental. Child tasks: `TASK-489`, `TASK-490`, `TASK-491`, `TASK-492`, `TASK-493`, `TASK-494`, `TASK-495`. Spec: `to-do/EPIC-001-document-vault-signature-orchestration-platform.md`.
- `EPIC-002` — Commercial Domain Separation from Finance. Programa cross-domain para separar `Comercial` y `Finanzas` en navegación, surfaces y autorizacion sin mover URLs legacy `/finance/...` en la primera etapa. Child tasks: `TASK-554`, `TASK-555`, `TASK-556`, `TASK-557`. Spec: `to-do/EPIC-002-commercial-domain-separation-from-finance.md`.
- `EPIC-003` — Ops Registry Federated Operational Framework. Programa platform para construir una capa repo-native de indexación, validación y consulta de artefactos operativos, usable por humanos y agentes, y escalable a repos hermanos. Child tasks: `TASK-558`, `TASK-559`, `TASK-560`, `TASK-561`. Spec: `to-do/EPIC-003-ops-registry-federated-operational-framework.md`.

## Tabla operativa

| Epic ID | Archivo | Priority | Impact | Effort | Lifecycle | Resumen |
| --- | --- | --- | --- | --- | --- | --- |
| `EPIC-001` | [EPIC-001-document-vault-signature-orchestration-platform.md](to-do/EPIC-001-document-vault-signature-orchestration-platform.md) | `P1` | `Muy alto` | `Alto` | `to-do` | Crea la primera plataforma documental transversal del repo: registry/versioning, gestor documental, rendering, firma electrónica provider-neutral, convergencia HR + Finance/Legal y capa reusable para MSA, SOW, contratos laborales y órdenes de trabajo. |
| `EPIC-002` | [EPIC-002-commercial-domain-separation-from-finance.md](to-do/EPIC-002-commercial-domain-separation-from-finance.md) | `P1` | `Muy alto` | `Alto` | `to-do` | Separa `Comercial` de `Finanzas` como dominios hermanos del portal, empezando por navegación, surfaces y autorizacion sin mover URLs legacy en la primera etapa. |
| `EPIC-003` | [EPIC-003-ops-registry-federated-operational-framework.md](to-do/EPIC-003-ops-registry-federated-operational-framework.md) | `P1` | `Muy alto` | `Alto` | `to-do` | Crea `Ops Registry` como framework operativo repo-native para indexar, validar y consultar arquitectura, tasks, epics, issues y contexto vivo, con surfaces para humanos/agentes y contrato federado para repos hermanos. |
| `EPIC-005` | [EPIC-005-greenhouse-commercial-delivery-orchestrator.md](to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md) | `P1` | `Muy alto` | `Alto` | `to-do` | Greenhouse como orquestador canónico del flujo HubSpot↔Notion (4 entidades: deals + tasks + companies + contacts). Estrategia híbrida webhooks + reconciliation + full-sync admin. Conflict resolution state-machine por deal stage. Integration Notion dedicada. Cutover de un tirón + 48h rollback. 6 child tasks (`TASK-577`..`TASK-582`). |
