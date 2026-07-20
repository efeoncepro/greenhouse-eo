# Creative Studio (Efeonce Globe) — Operations / Runbooks

> **Hogar canónico de los runbooks operativos de Efeonce Globe / Creative Studio.**
> La documentación operativa de Globe vive en **`greenhouse-eo`**, no en `efeonce-globe`.

## Por qué acá

EPIC-028 fija que Greenhouse es el único control plane operativo y documental: registra lifecycle,
QA, cierre documental y handoff, **incluso cuando la implementación vive en el repo hermano**. Globe
posee código, infra y evidencia técnica. Un runbook (cómo operar/verificar/diagnosticar la
plataforma) es **documentación operativa** → vive acá. La **evidencia técnica** puntual (bootstrap,
QA audits, brand-shell evidence) es de Globe.

Ver el racional completo y el mapa doc↔repo en
[`docs/architecture/creative-studio/README.md`](../../architecture/creative-studio/README.md).

## Qué vive acá (se puebla con la repatriación — TASK-1492)

Runbooks operativos de Globe, repatriados desde `efeonce-globe/docs/operations/**`:

- API Contract Spine — runbook (cómo extender/llamar/verificar el spine)
- IaC keyless — runbook (Terraform/OpenTofu, deploy sin llaves, protocolo de import)
- Autenticación local + smoke internal-only

> Mientras TASK-1492 no cierre, parte de estos runbooks sigue en `efeonce-globe/docs/operations/`.
> Estado vigente de la repatriación: `Handoff.md`, no este índice.

## Relacionados en Greenhouse

- Doc funcional (lenguaje simple): [`docs/documentation/creative-studio/`](../../documentation/creative-studio/)
- Manuales de uso: [`docs/manual-de-uso/creative-studio/`](../../manual-de-uso/creative-studio/)
- Arquitectura: [`docs/architecture/creative-studio/`](../../architecture/creative-studio/)
- Programa: [`docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
