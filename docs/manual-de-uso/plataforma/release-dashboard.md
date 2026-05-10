> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-10 por Claude
> **Documentacion tecnica:** [CLAUDE.md §Release Observability Completion invariants (TASK-854)](../../../CLAUDE.md), [Spec TASK-854](../../tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md), [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)

# Dashboard de Releases — `/admin/releases`

## Para qué sirve

Vista operator-facing del histórico de releases producción (promociones `develop → main`). Cada release queda persistido en `release_manifests` por el orquestador (TASK-851) con audit trail completo + outbox events. Este dashboard te da visibilidad rápida del estado y del último release, sin tener que abrir GitHub Actions ni la consola Postgres.

Complementa los **2 nuevos signals reliability** (`platform.release.deploy_duration_p95` + `platform.release.last_status`) que ahora viven en `/admin/operations` bajo el subsystem `Platform Release` (5 of 5 signals canónicos).

## Antes de empezar

- Tener capability `platform.release.execute` (EFEONCE_ADMIN o DEVOPS_OPERATOR). En V1 esa misma capability funciona como read-equivalent.
- El dashboard requiere que TASK-851 orquestador haya generado al menos 1 release. Si nunca corrió, vas a ver el empty state "Sin releases aún" con link al runbook.

## Cómo usarlo

### 1) Vista general (tabla)

URL: `/admin/releases`

Columnas:

| Columna | Significado |
|---|---|
| SHA | Primeros 12 chars del commit deployado (tabular-nums) |
| Estado | Chip color-coded del estado actual (released/degraded/aborted/in-flight) |
| Inicio | Timestamp formato regional |
| Duración | `completed_at - started_at` (`—` si in-flight) |
| Operador | `triggered_by` del manifest |
| Intento | `#N` (incrementa en re-runs del mismo SHA) |

La tabla viene ordenada `started_at DESC` (release más reciente arriba). Cursor pagination footer: botón **"Cargar más releases"** trae los siguientes 30.

### 2) Banner top (atención inmediata)

Si el último release está en `degraded`/`aborted`/`rolled_back` con < 24h de antigüedad, vas a ver un Alert rojo arriba con:

- **Título**: "Atención inmediata"
- **Body**: detalle del último release problemático + link "Ver detalle"
- **Tono warning** (naranja) si la antigüedad está entre 24h-7d

Si el último release fue `released` exitoso o no hay releases activos problemáticos, **no aparece banner** — la tabla se renderiza directo.

### 3) Click en row → drawer manifest viewer

Cualquier row de la tabla es clickeable (también con Enter/Space para keyboard nav). Abre un drawer **anchor='right'** con todo el detalle del release:

| Sección | Contenido |
|---|---|
| Estado | Chip color-coded con label |
| Metadata | release_id completo, target_sha, branch destino/origen, intento, operador, timestamps, duración |
| Enlaces | URL Vercel deployment (si está poblado) |
| Comando rollback | `pnpm release:rollback --release-id=...` con botón **copy-to-clipboard** + explainer |

El comando rollback siempre se muestra (no requiere capability adicional para verlo), pero **ejecutarlo** requiere `platform.release.rollback` (EFEONCE_ADMIN solo).

### 4) Nuevos signals en `/admin/operations`

Bajo el subsystem **Platform Release** ahora ves 5 signals (vs 3 anteriores):

- `stale_approval` (TASK-848 V1.0)
- `pending_without_jobs` (TASK-848 V1.0)
- `worker_revision_drift` (TASK-849 V1.0)
- **`deploy_duration_p95`** ← nuevo TASK-854
- **`last_status`** ← nuevo TASK-854

## Qué significa cada estado

| Estado release | Color chip | Significa |
|---|---|---|
| `preflight` | info azul | Manifest INSERTed, esperando approval gate |
| `ready` | info azul | Approval recibido, workers van a empezar |
| `deploying` | info azul | Workers en deploy paralelo |
| `verifying` | info azul | Workers OK, Vercel READY, health pendiente |
| `released` | success verde | Todo verde end-to-end (release exitoso) |
| `degraded` | warning naranja | Health soft-falló pero workers + Vercel OK; operador decide rollback o forward-fix |
| `aborted` | error rojo | Job falló mid-flight (preflight, deploy, etc.) |
| `rolled_back` | error rojo | Operador disparó `pnpm release:rollback` |

## Qué NO hacer

- **NUNCA** ejecutar el comando rollback copy-pasted sin verificar primero el `release_id` correcto en el drawer. Cada release tiene un ID único; rollback equivocado puede empeorar la situación.
- **NUNCA** asumir que el dashboard refleja el último estado en tiempo real — el cache puede ser de hasta 30s.
- **NUNCA** modificar `release_manifests` directo via SQL — anti-immutable trigger lo bloquea.
- **NUNCA** confundir el comando rollback con un botón en el dashboard. V1 es read-only **por design**: ejecutarlo requiere CLI manual + capability + audit row.

## Problemas comunes

| Síntoma | Causa probable | Fix |
|---|---|---|
| "Sin releases aún" pero hay releases en GitHub Actions | TASK-851 orquestador todavía no se invocó (el dashboard lee `release_manifests`, no GitHub directly) | Disparar primer release via `production-release.yml` o esperar al primer release real |
| Banner persistente "degraded" | Último release falló en post-release-health soft-fail | Inspeccionar drawer + decidir rollback (`pnpm release:rollback`) o forward-fix con nuevo release |
| `deploy_duration_p95 = warning` en `/admin/operations` | P95 entre 30-60 min — pipeline lento pero funcional | Inspeccionar últimos releases en `/admin/releases`, ver qué jobs alargan el critical path |
| `deploy_duration_p95 = error` (>=60min) | Pipeline degradado — sintoma serio | Investigar concurrency issues, watchdog alerts, Cloud Run quota, GitHub Actions runner slowness |
| `last_status = unknown` con release in-flight | Release activo en `preflight|ready|deploying|verifying` | Esperar a que termine; no es un blocker |
| Drawer no abre al click row | JavaScript disabled o sesion expirada | Verificar consola browser; refresh + re-login si aplica |
| "Cargar más releases" falla | API endpoint timeout o auth expirada | Refresh + re-intentar; verificar capability si persiste |
| Banner aparece pero no debería | `lastStatusSignal` cache stale | Esperar 30s + refresh; si persiste, último release realmente está en mal estado |

## Referencias técnicas

- Spec: [TASK-854](../../tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md)
- Source code:
  - Page: [src/app/(dashboard)/admin/releases/page.tsx](../../../src/app/(dashboard)/admin/releases/page.tsx)
  - View: [src/views/greenhouse/admin/releases/AdminReleasesView.tsx](../../../src/views/greenhouse/admin/releases/AdminReleasesView.tsx)
  - Drawer: [src/views/greenhouse/admin/releases/ReleaseDrawer.tsx](../../../src/views/greenhouse/admin/releases/ReleaseDrawer.tsx)
  - Columns: [src/views/greenhouse/admin/releases/columns.tsx](../../../src/views/greenhouse/admin/releases/columns.tsx)
  - Cursor pagination helper: [src/lib/release/list-recent-releases-paginated.ts](../../../src/lib/release/list-recent-releases-paginated.ts)
  - Microcopy: [src/lib/copy/release-admin.ts](../../../src/lib/copy/release-admin.ts)
- Reliability signals:
  - [src/lib/reliability/queries/release-deploy-duration.ts](../../../src/lib/reliability/queries/release-deploy-duration.ts)
  - [src/lib/reliability/queries/release-last-status.ts](../../../src/lib/reliability/queries/release-last-status.ts)
- API: [src/app/api/admin/releases/route.ts](../../../src/app/api/admin/releases/route.ts)
- CLAUDE.md sección "Release Observability Completion invariants (TASK-854)"
- Doc funcional: [release-dashboard.md](../../documentation/plataforma/release-dashboard.md)
- Manual orchestrator: [release-orchestrator.md](release-orchestrator.md)
- Manual preflight: [release-preflight.md](release-preflight.md)
- Manual watchdog: [release-watchdog.md](release-watchdog.md)
