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

## Runbooks (repatriado — TASK-1492)

Runbooks operativos de Globe, repatriados desde `efeonce-globe/docs/operations/**` (la historia previa
es auditable en el git log del repo hermano):

- [EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md](EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) — cómo extender/llamar/verificar el spine.
- [EFEONCE_GLOBE_IAC_RUNBOOK_V1.md](EFEONCE_GLOBE_IAC_RUNBOOK_V1.md) — Terraform/OpenTofu, deploy keyless, protocolo de import.
- [LOCAL_AUTHENTICATION.md](LOCAL_AUTHENTICATION.md) — autenticación local contra Globe (web/api mode).
- [TASK_1454_INTERNAL_SMOKE_RUNBOOK.md](TASK_1454_INTERNAL_SMOKE_RUNBOOK.md) — smoke internal-only.
- [EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md](EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md) — plan de ejecución paralela del EPIC-028.
- [EPIC_028_FRESH_SESSION_PROMPT.md](EPIC_028_FRESH_SESSION_PROMPT.md) — prompt de arranque de sesión para trabajo sobre EPIC-028.
- [GLOBE_PRODUCER_ROLLOUT_AND_CANARY_V1.md](GLOBE_PRODUCER_ROLLOUT_AND_CANARY_V1.md) — rollout interno serializado, políticas exactas y canarios image/video/audio por los commands/readers de la UI.

> **Evidencia técnica** de Globe (NO repatriada, queda en `efeonce-globe/docs/operations/`):
> `BOOTSTRAP_EVIDENCE.md`, `QA_RELEASE_AUDIT_2026-07-19.md`, `TASK_1455_BRAND_SHELL_EVIDENCE.md` —
> son evidencia de ejecución, propiedad de Globe por la regla del control plane.

## Continuidad + cronología del runtime de Globe (repatriado — TASK-1492)

- Continuidad activa del runtime (deploys, rollout, verificación en vivo, hardening): [GLOBE_RUNTIME_HANDOFF.md](GLOBE_RUNTIME_HANDOFF.md). El `Handoff.md` principal de Greenhouse referencia este archivo para el detalle de runtime de Globe.
- Historia / changelog del runtime de Globe: [`docs/changelog/internal/creative-studio-globe.md`](../../changelog/internal/creative-studio-globe.md).

## Relacionados en Greenhouse

- Doc funcional (lenguaje simple): [`docs/documentation/creative-studio/`](../../documentation/creative-studio/)
- Manuales de uso: [`docs/manual-de-uso/creative-studio/`](../../manual-de-uso/creative-studio/)
- Arquitectura: [`docs/architecture/creative-studio/`](../../architecture/creative-studio/)
- Programa: [`docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
