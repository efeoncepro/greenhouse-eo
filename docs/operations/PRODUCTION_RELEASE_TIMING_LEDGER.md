# Production Release Timing Ledger

> **Owner:** Platform / DevOps
> **Source of truth:** human operating ledger for release elapsed time.
> **Related:** `docs/operations/runbooks/production-release.md`,
> `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`,
> `docs/tasks/complete/TASK-854-release-deploy-duration-last-status-signals.md`

Este ledger mide cuanto tarda realmente un pase a produccion por agente. La
metrica principal es el **tiempo agente end-to-end**, no la duracion del
workflow. Las senales automaticas (`platform.release.deploy_duration_p95` y
`release_manifests.completed_at - started_at`) son submetricas tecnicas.

El tiempo agente end-to-end incluye todo lo que consume al agente: leer playbook,
revisar contexto, analizar diffs, preparar PR/merge, resolver conflictos,
disparar/seguir el orquestador, approvals, flags, watchdog, smoke, diagnostico,
documentacion, handoff y respuesta final.

## Regla obligatoria

Cada agente que ejecute, recupere o cierre un pase a produccion debe agregar una
fila en este archivo antes de declarar cierre.

Campos obligatorios:

- Fecha.
- Agente (`Codex`, `Claude`, humano u otro).
- Release ID (`greenhouse_sync.release_manifests.release_id`).
- GitHub Actions run ID del `Production Release Orchestrator`.
- Target SHA.
- Motivo / scope del release.
- **Tiempo agente end-to-end (metrica principal):** desde que el agente toma la
  primera accion relacionada con el release hasta que comunica el cierre
  operativo con evidencia.
- Tiempo workflow: `run_started_at -> updated_at` del workflow.
- Tiempo manifest: `started_at -> completed_at` en `release_manifests`.
- Tiempo a runtime verde: inicio del workflow -> post-release health OK.
- Desglose de fases cuando exista: preparacion/revision, PR/merge, control
  plane, post-release diagnosis, docs/handoff.
- Bloqueo principal y aprendizaje.

Si el agente no empezo con cronometro, debe registrarlo como `no medido
formalmente` y usar una estimacion marcada como tal si el operador la reporta.
Desde 2026-07-09, no cronometrar cuenta como deuda de proceso del agente.

## Como medir

GitHub Actions:

```bash
gh api repos/efeoncepro/greenhouse-eo/actions/runs/<run_id> \
  --jq '{id,created_at,run_started_at,updated_at,head_sha,conclusion,html_url}'

gh api repos/efeoncepro/greenhouse-eo/actions/runs/<run_id>/jobs \
  --jq '.jobs[] | {name,status,conclusion,started_at,completed_at}'
```

Manifest:

```sql
SELECT release_id, target_sha, state, started_at, completed_at,
       EXTRACT(EPOCH FROM (completed_at - started_at))::int AS duration_seconds
FROM greenhouse_sync.release_manifests
WHERE release_id = '<release_id>';
```

Agent timer:

```text
start = primera accion release-related del agente (leer/revisar/analizar cuenta)
stop  = release comunicado con evidencia + docs/handoff actualizados
```

## Ledger

| Fecha | Agente | Release ID | Run ID | Target SHA | Scope | Tiempo agente E2E (principal) | Workflow | Manifest | Runtime verde | Bloqueo principal | Aprendizaje |
|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| 2026-07-09 | Codex | `433cfa2b0fd3-9964d4e9-438e-4b69-bd62-f068a05c8b97` | `28991488376` | `433cfa2b0fd3a022143ff869448b901042db530d` | TASK-354 public careers route + flags iniciales | No medido formalmente | 12m14s | 10m09s | 11m05s | Ninguno critico; workers normales | Happy path tecnico: workflow cerca de 12m, pero no sirve para evaluar eficiencia del agente porque no mide preparacion/revision/cierre. |
| 2026-07-09 | Codex | `915be02a86ab-7c6aa11e-b9c1-4990-8086-cdfacb3a763b` | `28999468657` | `915be02a86abfd49c71365af8a647f9fdfa35207` | Release acoplado PR #151: fix de inferencia/responsabilidades careers + vacante Account Manager | No medido formalmente; **estimacion operador >=2h** incluyendo revisar, analizar, release, diagnostico, watchdog, docs y respuesta | 26m47s | 21m50s | 13m04s | `transition-released` queued/stale + persecucion innecesaria de watchdog/`ops-worker` residual | La duracion relevante para eficiencia por agente fue >=2h, no 21m50s. Separar agente E2E de control plane. Desde este punto el agente debe cronometrar E2E. |

### Nota 2026-07-09 — Codex release acoplado PR #151

El operador corrigio la interpretacion: **21m50s no fue lo que tardo el
agente**. Ese valor mide solo el manifest. El trabajo real incluyo revisar,
analizar, preparar el release acoplado, seguir el orquestador, diagnosticar
watchdog/`ops-worker`, cerrar manifest, actualizar docs y responder. Como Codex
no inicio cronometro al principio, la medicion comparable queda como
`no medido formalmente; estimacion operador >=2h`.

Desglose cualitativo disponible:

```text
preparacion/revision: no medido formalmente
PR/merge: no medido formalmente
orquestador/control-plane: workflow 26m47s; manifest 21m50s; runtime verde 13m04s
post-release diagnosis/watchdog: no medido formalmente; fue el principal exceso
smoke/verificacion: no medido formalmente
docs/handoff/final: no medido formalmente
total agente E2E: estimacion operador >=2h
```

## Desglose obligatorio desde el siguiente release

Cada fila nueva debe agregar, en la columna `Aprendizaje` o en una nota debajo
de la tabla, el desglose:

```text
preparacion/revision:
PR/merge:
orquestador/control-plane:
post-release diagnosis/watchdog:
smoke/verificacion:
docs/handoff/final:
total agente E2E:
```

Si una fase se solapa con otra, marcarla como solapada; no esconderla.

## Optimizaciones a evaluar

- Automatizar captura de `run_id`, `release_id`, `runtime_green_at` y duraciones
  desde GitHub + Postgres al cerrar el orquestador.
- Agregar campo `operator_timer_started_at` al comando/harness de release cuando
  exista una interfaz agente formal.
- Reducir falsos positivos humanos separando en el dashboard: `runtime green`,
  `manifest closed`, `watchdog residual`, `docs closed`.
- Modelar explicitamente el caso `ops-worker` change-gated en el watchdog para
  que no sume error cuando el diff runtime es vacio.
