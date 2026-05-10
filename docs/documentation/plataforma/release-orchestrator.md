> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-10 por Claude
> **Documentacion tecnica:** [TASK-851](../../tasks/in-progress/TASK-851-production-release-orchestrator-workflow.md), [CLAUDE.md §Production Release Orchestrator invariants](../../../CLAUDE.md), [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)

# Orquestador de Release a Producción

## Que es

Greenhouse promueve código de `develop` (staging) a `main` (production) varias veces al mes. Antes de TASK-851 ese flujo era manual y propenso a errores. El **orquestador** (`production-release.yml`) lo convierte en una sola corrida workflow GitHub Actions con 8 jobs canónicos, audit completo y verificación post-deploy.

Es el **brazo activo** del control plane de releases junto al **preflight** (CLI que valida antes de actuar) y al **watchdog** (alerta en runtime cada 30 min).

## Por que existe

Antes del orquestador, el release `develop → main` requería:

1. Correr preflight a mano localmente
2. Crear PR develop → main
3. Mergear y esperar que Vercel deploy
4. Aprobar el environment Production en CADA worker workflow individualmente (4 aprobaciones)
5. Inspeccionar logs Vercel y Cloud Run para confirmar READY
6. Validar manualmente que cada Cloud Run revision serving expone el SHA correcto

Cualquier paso skipeado o desincronizado dejaba el ecosistema en estado mixto. El incidente 2026-04-26 → 2026-05-09 es exactamente la clase de bug que esto evita: 4 workflows production en estado `waiting` por días, workers Cloud Run desincronizados con `main`, descubierto solo cuando el dashboard reliability alertó 14 días después.

## Que hace (8 jobs canónicos)

```text
workflow_dispatch (operator: target_sha + opcionalmente bypass_reason)
        |
        v
   ┌────────────────────────────────────────┐
   │  1. Preflight (TASK-850 CLI)           │ → 12 checks; bloquea si error
   ├────────────────────────────────────────┤
   │  2. Record manifest started            │ → INSERT release_manifests + outbox
   ├────────────────────────────────────────┤
   │  3. Approval gate (Production env)     │ → required reviewers
   ├────────────────────────────────────────┤
   │  4. Workers deploy (parallel × 4)      │
   │     - ops-worker                       │
   │     - commercial-cost-worker           │ → cada uno verifica GIT_SHA
   │     - ico-batch-worker                 │   matches EXPECTED_SHA
   │     - hubspot-greenhouse-integration   │
   ├────────────────────────────────────────┤
   │  5. Wait Vercel READY                  │ → poll API hasta encontrar deploy
   ├────────────────────────────────────────┤
   │  6. Post-release health check          │ → ping /api/auth/health
   ├────────────────────────────────────────┤
   │  7. Transition to released | degraded  │ → state machine final
   ├────────────────────────────────────────┤
   │  8. Summary                            │ → GITHUB_STEP_SUMMARY
   └────────────────────────────────────────┘
        |
        v
   release_manifests row con state=released o degraded
   + 7 outbox events platform.release.* v1 emitidos
   + audit completo en release_state_transitions
```

## Como decide

El orquestador toma decisiones binarias claras en cada job:

- **Preflight rojo** → abortar antes de cualquier mutación
- **Worker GIT_SHA mismatch** → exit 1 fail-loud (Cloud Build cache, tag drift, deploy aborted)
- **Vercel timeout 900s** → abortar
- **Health soft-fail (exit 78)** → release `degraded` (operador decide rollback o forward-fix), NO aborta el orquestador

## Como integra con el ecosystem

```text
TASK-848 V1.0 manifest tables ─────┐
TASK-849 watchdog (alerta runtime)─┼─→ El orquestador consume TODO esto
TASK-850 preflight CLI ────────────┤   y orquesta el release end-to-end
TASK-851 worker workflow_call  ────┤
TASK-851 worker deploy.sh verify ──┘
                                  ↓
                      production-release.yml
                                  ↓
                  [opcional] TASK-853 Azure Bicep deploy
                                  ↓
                      release_manifests final state
                                  ↓
                  [TASK-854] Dashboard UI lee historico
```

## Roles + permisos

Reusa capabilities ya existentes (least-privilege per TASK-848):

| Capability | Quien tiene | Que habilita |
|---|---|---|
| `platform.release.execute` | EFEONCE_ADMIN, DEVOPS_OPERATOR | Disparar `production-release.yml` workflow |
| `platform.release.preflight.execute` | EFEONCE_ADMIN, DEVOPS_OPERATOR | El job preflight invoca esto |
| `platform.release.bypass_preflight` | EFEONCE_ADMIN solo | Usar `bypass_preflight_reason` >=20 chars |
| `platform.release.rollback` | EFEONCE_ADMIN | `pnpm release:rollback` post-degraded |

## Costos

- Workflow run total: ~5-15 min P95 (preflight 1-2min + approval variable + workers 5-10min parallel + vercel wait 1-3min + health 30s + transitions 30s)
- GitHub Actions minutos: ~30-60 min compute aggregate (1 orchestrator + 4 worker matrix in parallel)
- Vercel API: 30 polls @ 30s = 1 request/30s during wait window
- GCP API: ~12 gcloud run revisions describe calls per release
- Sin costos persistentes — el manifest row ocupa <1KB en PG

## Roadmap

| Fase | Estado | Descripción |
|---|---|---|
| V1.0 (TASK-848) | SHIPPED 2026-05-10 | Foundation: tablas, capabilities, signals, concurrency fix, rollback CLI |
| V1.1 watchdog (TASK-849) | SHIPPED 2026-05-10 | Detector + alertas Teams cada 30min |
| V1.1 preflight (TASK-850) | SHIPPED 2026-05-10 | CLI 12 checks fail-fast |
| **V1.1 orchestrator (TASK-851)** | **SHIPPED 2026-05-10** | **Workflow end-to-end + worker SHA verification** |
| V1.1 Azure gating (TASK-853) | Por venir | Job condicional Bicep deploy gated por diff |
| V1.2 observability (TASK-854) | Por venir | 2 signals nuevos + dashboard UI consume manifest historico |

## Referencias

- [Manual de uso operador](../../manual-de-uso/plataforma/release-orchestrator.md)
- [Runbook production-release](../../operations/runbooks/production-release.md)
- [Spec arquitectónica completa](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- [Decisions index ADR](../../architecture/DECISIONS_INDEX.md)
