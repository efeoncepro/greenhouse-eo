# Creative Studio (Efeonce Globe) — Arquitectura

> **Este es el hogar canónico de la documentación de arquitectura de Efeonce Globe / Creative Studio.**
> La documentación de Globe vive en **`greenhouse-eo`**, no en el repo hermano `efeonce-globe`.

## Por qué la doc vive acá y no en `efeonce-globe`

EPIC-028 fija la frontera del ecosistema:

> *Greenhouse es el único control plane operativo: registra `TASK-###`, dependencias, lifecycle,
> hooks, lint, QA, **cierre documental y handoff** incluso cuando los paths de implementación viven
> en el repositorio hermano. Globe posee **código, datos, infraestructura, ejecución creativa y
> evidencia técnica**.*

Traducción operativa:

| Vive en Greenhouse (`greenhouse-eo`) | Vive en Globe (`efeonce-globe`) |
|---|---|
| Arquitectura, ADRs, specs técnicas | Código (contracts, domain, adapters, app, SDK) |
| Runbooks operativos | Infraestructura (Terraform) |
| Documentación funcional + manuales | **Evidencia técnica** (bootstrap, QA audits, brand-shell evidence) |
| Handoff + changelog + lifecycle de tasks | Ejecución creativa + assets + runs |

Un agente que trabaja el **código** de Globe (en `efeonce-globe`) lee la arquitectura **desde acá**.
Nunca se crea documentación gobernante nueva en `efeonce-globe/docs/**`.

## Dónde vive cada capa de doc de Globe en Greenhouse

| Capa | Ubicación canónica |
|---|---|
| Arquitectura / specs técnicas / ADRs | **`docs/architecture/creative-studio/`** (este directorio) |
| Decisiones a nivel ecosistema | `docs/architecture/EFEONCE_CREATIVE_STUDIO_*` + índice `docs/architecture/DECISIONS_INDEX.md` |
| Runbooks operativos | `docs/operations/creative-studio/` |
| Documentación funcional (lenguaje simple) | `docs/documentation/creative-studio/` |
| Manuales de uso / runbooks operables | `docs/manual-de-uso/creative-studio/` |
| Modelo de negocio / créditos | `docs/business-models/creative-studio/` |
| Programa / EPIC | `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` |
| Continuidad + cronología | `Handoff.md` + `changelog.md` (modelo de contexto de Greenhouse) |

## Índice de arquitectura (repatriado — TASK-1492)

La arquitectura de Globe vive acá (repatriada de `efeonce-globe/docs/architecture/**` por TASK-1492;
la historia previa es auditable en el git log del repo hermano):

- [PLATFORM_FOUNDATION_V1.md](PLATFORM_FOUNDATION_V1.md) — invariantes de la plataforma (monorepo Node 24, boundary Globe↔Greenhouse, surfaces).
- [EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md](EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md) — el esqueleto de contratos server-side (Full API Parity, trusted context, coverage matrix; TASK-1481).
- [EFEONCE_GLOBE_MODEL_LAB_V1.md](EFEONCE_GLOBE_MODEL_LAB_V1.md) — sandbox gobernado: spend fence, private-ingest, kill switch, provider seam (TASK-1457).
- [EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md](EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md) — golden briefs + rúbricas + verdict pending-human (TASK-1458).
- [GREENHOUSE_CONNECTIVITY_V1.md](GREENHOUSE_CONNECTIVITY_V1.md) — identidad federada, WIF/ADC, auth de caller api-mode (ADR-001).
- [DECISIONS_INDEX.md](DECISIONS_INDEX.md) — índice de decisiones **scoped a Globe** (distinto del `docs/architecture/DECISIONS_INDEX.md` de Greenhouse).
- [GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md](GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md) — brecha diseño↔backend del Studio Workbench (fuente de TASK-1493…1499).

Runbooks operativos de Globe: [`docs/operations/creative-studio/`](../../operations/creative-studio/README.md).

## Decisiones canónicas ya en Greenhouse

- [EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md](../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md)
- [EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md](../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
- [EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md](../EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md)
- Skill de arquitectura de Globe: `.claude/skills/greenhouse-globe/SKILL.md`
