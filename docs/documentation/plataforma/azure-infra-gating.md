> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-10 por Claude
> **Documentacion tecnica:** [TASK-853](../../tasks/in-progress/TASK-853-azure-infra-release-gating.md), [CLAUDE.md §Azure Infra Release Gating invariants](../../../CLAUDE.md), [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)

# Azure Infra Release Gating

## Que es

Greenhouse despliega 2 stacks en Azure: **Logic Apps** (Teams notifications) y **Bot Service** (Teams Bot). Antes de TASK-853, cada release production reaplicaba ambos Bicep templates aunque no hubiera cambios reales — riesgo innecesario.

Con TASK-853, el **Bicep apply real** corre solo cuando:

- Hay cambios en `infra/azure/<sub>/**` entre el último deploy y el target SHA, **O**
- El operador pasa `force_infra_deploy=true` explícitamente

El **health check Azure** (verificar que la federación WIF + providers + Resource Group siguen vivos) corre **siempre** como preflight, incluso cuando el apply skip.

## Por qué existe

Bicep apply puede ser destructivo:

- `delete-on-deletion` semantics — si quitás un recurso del template, Azure lo borra del RG.
- Federated credential rotation — si cambias el subject WIF, los workflows quedan sin acceso temporalmente.
- App Service config reset — webhooks externos pueden quedar rotos.

Reaplicar sin necesidad expone a esos riesgos sin beneficio. TASK-853 cierra ese gap haciendo el apply **idempotente y observable**: siempre hay un job que documenta por qué se hizo o no se hizo el apply.

## Cómo funciona (5 jobs canónicos)

```text
push:main / workflow_dispatch / workflow_call (orchestrator TASK-851)
        |
        v
   ┌──────────────────────────────────────────┐
   │  1. health-check (siempre)               │ → WIF + providers + RG
   ├──────────────────────────────────────────┤
   │  2. validate (Bicep build lint)          │ → az bicep build
   ├──────────────────────────────────────────┤
   │  3. diff-detection                       │ → decide should_deploy
   │     - force_infra_deploy=true → true     │
   │     - push event → true                  │
   │     - workflow_call sin force → git diff │
   ├──────────────────────────────────────────┤
   │  4a. deploy (si should_deploy=true)      │ → az deployment group create
   │  4b. skip-deploy-summary                 │ → ::notice:: + summary
   └──────────────────────────────────────────┘
        |
        v
   Resource Group con apply o skipped + health verde
```

## Cómo integra con el ecosystem

```text
TASK-848 V1.0 manifest tables ─────┐
TASK-849 watchdog ─────────────────┤
TASK-850 preflight CLI ────────────┤
TASK-851 orchestrator workflow ────┤
TASK-851 worker workflow_call ─────┤
TASK-853 Azure infra gating ───────┘
                                  ↓
                production-release.yml
                                  ↓
            8 jobs end-to-end con 4 workers Cloud Run
            + 2 Azure stacks gated en paralelo
                                  ↓
                  release_manifests final state
```

## Roles + permisos

Reusa capabilities ya existentes (least-privilege per TASK-848):

| Capability | Quien tiene | Que habilita |
|---|---|---|
| `platform.release.execute` | EFEONCE_ADMIN, DEVOPS_OPERATOR | Disparar production-release.yml (que invoca Azure jobs) |
| `platform.release.bypass_preflight` | EFEONCE_ADMIN solo | Usar bypass_preflight_reason (NO afecta Azure gating) |

El flag `force_infra_deploy=true` no requiere capability adicional — está dentro del scope de `platform.release.execute`. La idea es que cualquier operador con permisos para disparar release también puede forzar reapply Bicep si lo necesita.

## Costos

- Health check Azure: ~30-60s per workflow (login + provider register + RG ensure idempotent)
- Validate Bicep build: ~10-20s
- Diff detection: <5s (git diff local en runner)
- Bicep apply (cuando corre): ~1-3 min Logic Apps, ~2-4 min Bot Service
- Skip total cost: ~45-90s per workflow (health + validate + diff-detection sin apply)
- En el ~80% de releases sin diff Azure → ahorro de ~3-7 min de critical path total

## Roadmap

| Fase | Estado | Descripción |
|---|---|---|
| V1.0 (TASK-848) | SHIPPED 2026-05-10 | Foundation tablas + capabilities + signals + concurrency fix + rollback CLI |
| V1.1 watchdog (TASK-849) | SHIPPED 2026-05-10 | Detector + alertas Teams cada 30 min |
| V1.1 preflight (TASK-850) | SHIPPED 2026-05-10 | CLI 12 checks fail-fast |
| V1.1 orchestrator (TASK-851) | SHIPPED 2026-05-10 | Workflow end-to-end + worker SHA verification |
| **V1.1 Azure gating (TASK-853)** | **SHIPPED 2026-05-10** | **Health check + Bicep apply gated por diff/force** |
| V1.2 observability (TASK-854) | Por venir | Dashboard UI + 2 signals (deploy duration p95, last status) |
| V2.0 Azure rollback auto | Eventual | `what-if` mandatory + restore desde commit previo + smoke test |

## Referencias

- [Manual de uso operador](../../manual-de-uso/plataforma/azure-infra-gating.md)
- [Runbook production-release §6](../../operations/runbooks/production-release.md)
- [Spec arquitectónica completa](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- [Decisions index ADR](../../architecture/DECISIONS_INDEX.md)
