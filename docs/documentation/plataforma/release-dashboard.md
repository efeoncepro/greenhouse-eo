> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-10 por Claude
> **Documentacion tecnica:** [TASK-854](../../tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md), [CLAUDE.md §Release Observability Completion invariants](../../../CLAUDE.md), [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)

# Dashboard de Releases

## Qué es

Última pieza del control plane de releases V1.1. Después de TASK-848 (foundation), TASK-849 (watchdog), TASK-850 (preflight), TASK-851 (orchestrator) y TASK-853 (Azure gating), el operador ahora tiene **una sola vista web** del histórico de releases con audit trail completo + signals reliability completos.

`/admin/releases` muestra todos los releases producción que han pasado por el orquestador, ordenados del más reciente al más antiguo. Cada uno con su estado, duración, operador, y un drawer detalle con comando rollback listo para copiar.

## Por qué existe

Antes de TASK-854:
- Para ver "qué releases corrió este mes" había que abrir GitHub Actions y filtrar manualmente
- Para ver "cuánto tardó el último release" había que inspeccionar logs job por job
- Para ejecutar rollback había que recordar el `release_id` exacto + tipear el comando completo
- Los signals `Platform Release` mostraban solo 3 of 4 esperados (faltaban deploy duration + last status)

Con TASK-854:
- Tabla ordenada con todo el histórico
- p95 de deploy duration visible en `/admin/operations`
- Last status del pipeline visible (steady=`released`)
- Comando rollback con copy-to-clipboard en cada drawer

## Qué muestra

### Tabla principal (`/admin/releases`)

```text
┌──────────────────────────────────────────────────────────────────┐
│ Releases producción                                              │
│ Histórico de promociones develop → main                          │
├──────────────────────────────────────────────────────────────────┤
│ [Banner Alert si last release degraded/aborted < 24h]           │
├──────────────────────────────────────────────────────────────────┤
│  SHA          Estado      Inicio       Duración Operador  Int.  │
│  abc12345...  [released]  hace 2h      8 min    jreye      #1   │
│  def67890...  [degraded]  hace 1d      32 min   codex      #1   │
│  ghi11223...  [released]  hace 3d      6 min    jreye      #2   │
│  ...                                                             │
│                  ← Cargar más releases                           │
└──────────────────────────────────────────────────────────────────┘
```

### Drawer detalle (al click row)

Anchor='right', 480px desktop. Muestra:

- Estado chip color-coded
- Metadata completo (release_id, target_sha, branches, intento, timestamps, duración)
- URL Vercel deployment (si está)
- Comando rollback con copy-to-clipboard + explainer

### Signals nuevos en `/admin/operations`

| Signal | Qué mide | Steady |
|---|---|---|
| `platform.release.deploy_duration_p95` | p95 del tiempo `completed_at - started_at` para releases `released`, ventana 30 días | `ok` (<30 min) |
| `platform.release.last_status` | Estado del último release main + age window thresholds | `ok` (last = `released`) |

## Cómo decide los colores

| Estado | Color chip | Razón |
|---|---|---|
| `released` | success (#6ec207) | Todo verde — release exitoso |
| `degraded` | warning (#ff6500) | Workers + Vercel OK pero health soft-falló — operador decide |
| `aborted` / `rolled_back` | error (#bb1954) | Job falló mid-flight o operador revirtió |
| `preflight` / `ready` / `deploying` / `verifying` | info (#00BAD1) | Release in-flight, no concluido aún |

## Cómo integra con el ecosystem

```text
TASK-848 V1.0 release_manifests + state_transitions ─┐
TASK-849 watchdog (alerta runtime cada 30 min) ──────┤
TASK-850 preflight CLI ──────────────────────────────┤
TASK-851 orchestrator workflow ──────────────────────┤
TASK-851 worker workflow_call + GIT_SHA verify ──────┤
TASK-853 Azure infra gating ─────────────────────────┤
TASK-854 dashboard + 2 signals últimos ──────────────┘
                                                      ↓
                              Control plane V1.1 COMPLETO
                                                      ↓
                              Operator visibility end-to-end
                                                      ↓
                  /admin/releases (tabla + drawer + signals)
```

## Roles + permisos

| Capability | Quien tiene | Qué habilita |
|---|---|---|
| `platform.release.execute` | EFEONCE_ADMIN, DEVOPS_OPERATOR | Ver dashboard `/admin/releases` (read-equivalent V1) + disparar release |
| `platform.release.rollback` | EFEONCE_ADMIN solo | Ejecutar el comando rollback que el drawer expone |
| `platform.release.bypass_preflight` | EFEONCE_ADMIN solo | Override en preflight (no afecta dashboard) |

V1.2 introducirá `platform.release.read_results` granular si emerge necesidad de exponer el dashboard a FINANCE_ADMIN para observabilidad sin escalar a EFEONCE_ADMIN/DEVOPS_OPERATOR.

## Costos

- Server initial fetch: 1 query PG `listRecentReleasesPaginated` (default 30 rows) + 1 query PG `getReleaseLastStatusSignal` (limit 1) en paralelo
- Cursor pagination "Cargar más": 1 query PG con WHERE `started_at < $cursor`
- Cero cron, cero polling, cero materialización background
- TTL implícito: cada navegación re-fetch (no cache cliente > 30s)

## Roadmap

| Fase | Estado | Descripción |
|---|---|---|
| V1.0 (TASK-848) | SHIPPED 2026-05-10 | Foundation tablas + capabilities + signals + concurrency fix + rollback CLI |
| V1.1 watchdog (TASK-849) | SHIPPED 2026-05-10 | Detector + alertas Teams cada 30 min |
| V1.1 preflight (TASK-850) | SHIPPED 2026-05-10 | CLI 12 checks fail-fast |
| V1.1 orchestrator (TASK-851) | SHIPPED 2026-05-10 | Workflow end-to-end + worker SHA verification |
| V1.1 Azure gating (TASK-853) | SHIPPED 2026-05-10 | Health check + Bicep apply gated por diff/force |
| **V1.1 dashboard + signals (TASK-854)** | **SHIPPED 2026-05-10** | **`/admin/releases` + p95 + last_status (5 of 5 signals)** |
| V1.2 capability granular | Eventual | `platform.release.read_results` para FINANCE_ADMIN observability |
| V1.2 add release CTA | Eventual | Disparar release desde dashboard (workflow_dispatch trigger) |
| V1.2 audit log full timeline | Eventual | Mostrar todas las transitions inline en drawer (V1 solo metadata) |
| V1.2 thresholds tune | Eventual | Ajustar 30/60min thresholds tras 30d steady-state observados |

## Referencias

- [Manual de uso operador](../../manual-de-uso/plataforma/release-dashboard.md)
- [Runbook production-release](../../operations/runbooks/production-release.md)
- [Spec arquitectónica completa](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- [Decisions index ADR](../../architecture/DECISIONS_INDEX.md)
