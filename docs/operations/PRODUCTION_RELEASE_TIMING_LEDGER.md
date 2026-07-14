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
| 2026-07-14 | Codex | `a3b5ea3adb30-afed291d-c084-4192-aed9-5de9905b8a64` | `29295658046` | `a3b5ea3adb307076c0a44b1be33051005d619ffd` | TASK-1373 production cutover: `CAREERS_NATIVE_GROWTH_FORM_ENABLED` ON en Production + release develop→main + workers/control plane | ~1h20m medido (`2026-07-13T23:20:52Z` → cierre docs/handoff) | 12m16s (`00:20:40Z`→`00:32:56Z`) | ~10m11s (`00:22:39Z`→`00:32:50Z`) | 11m15s (`00:20:40Z`→post-release health `00:31:55Z`) | Primer dispatch `29293287410` corrió antes de CI/Vercel READY; `ci-deep.yml` no provisionaba Chromium y falló con Playwright browser missing; watchdog V1 marcó `ops-worker` drift aunque el job probó diff runtime vacío y `deploy_needed=false`. | (1) Para production release esperar CI + Vercel READY antes del orquestador. (2) Deep Verification necesita provisioning explícito de Playwright Chromium igual que CI. (3) Vercel congela env vars al crear build: `CAREERS_NATIVE_GROWTH_FORM_ENABLED=true` se agregó antes del build productivo. (4) El residual `ops-worker` debe tratarse por evidencia: `838950916b27`→`a3b5ea3adb30` sin cambios en runtime paths, `Ready=True`, no redeploy. (5) GVC prod requiere triple gate + `AGENT_AUTH_SECRET`; sin secreto se usó Playwright directo público como evidencia visual complementaria, no reemplazo canónico. |
| 2026-07-09 | Codex | `433cfa2b0fd3-9964d4e9-438e-4b69-bd62-f068a05c8b97` | `28991488376` | `433cfa2b0fd3a022143ff869448b901042db530d` | TASK-354 public careers route + flags iniciales | No medido formalmente | 12m14s | 10m09s | 11m05s | Ninguno critico; workers normales | Happy path tecnico: workflow cerca de 12m, pero no sirve para evaluar eficiencia del agente porque no mide preparacion/revision/cierre. |
| 2026-07-09 | Codex | `915be02a86ab-7c6aa11e-b9c1-4990-8086-cdfacb3a763b` | `28999468657` | `915be02a86abfd49c71365af8a647f9fdfa35207` | Release acoplado PR #151: fix de inferencia/responsabilidades careers + vacante Account Manager | No medido formalmente; **estimacion operador >=2h** incluyendo revisar, analizar, release, diagnostico, watchdog, docs y respuesta | 26m47s | 21m50s | 13m04s | `transition-released` queued/stale + persecucion innecesaria de watchdog/`ops-worker` residual | La duracion relevante para eficiencia por agente fue >=2h, no 21m50s. Separar agente E2E de control plane. Desde este punto el agente debe cronometrar E2E. |
| 2026-07-10 | Claude Opus 4.8 | `4e7e9093d169-a2238744-44…` | `29089153955` | `4e7e9093d169ac35193e9eb882c3ee8c8a517896` | develop→main completo (50+ commits): **TASK-1362** scan/quarantine de CV (cierra superficie de abuso VIVA: el upload público validaba con `file.type`, nunca inspeccionaba bytes) + TASK-355 Hiring Desk + TASK-1371/1374/1375 + batch develop. 2 migraciones. | **1h 16m** (10:30:27Z→11:46:20Z; cierre operativo con evidencia = push de docs) | 10m 35s (11:21:06→11:31:41) | 8m 32s (512s) | 9m 37s (11:21:06→11:30:43 health OK) | **Gate estricto de `CLAUDE.md` (35k tokens) rompió el CI del PR.** Causa real: `main` estaba **exactamente** en el tope (34.999/35.000) — cualquier línea de cualquier agente lo reventaba. No era deuda de esta task. | (1) **Fix de raíz, no parche:** en vez de exprimir mi texto hasta que entrara, moví el bloque más pesado del archivo (TASK-893 SQL Signal Reader Gate, 1.648 tok / 125 líneas de runbook inline) **verbatim** a `agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` y dejé pointer. 103%→97%, ~1.400 tok de margen recuperados **para todos**. `claude-md audit --strict`: 0 huérfanas. (2) **Los dos gates `production` se aprobaron en 22s de diferencia** (11:23:13 y 11:23:35) con un loop sobre `pending_deployments` (NO sobre `run.status`). Manifest 512s vs 2.782s del release anterior, que se comió el stall de 43 min del 2do gate. **El loop de aprobación debe ser el default.** (3) **El pre-push hook (lint+tsc, ~2 min) se pagó 3 veces.** Hacer el merge canónico del gotcha #1 ANTES del primer push lo reduce a 1. (4) Gotcha #2 confirmado: preflight local dio `requires_break_glass` por 4 migraciones (diff 3-dot resucita 1 ya desplegada); post-merge = `ship`, 0 archivos. Las migraciones reales eran 2. (5) Gotcha #4 confirmado: `ops-worker` quedó en `92a35daec`; diff runtime vacío + no importa el código nuevo + `asset.quarantined` sin consumer reactivo ⇒ residual de label, NO drift. No se forzó redeploy. (6) **Coste dominante = espera de CI** (17m40s develop + 16m59s main = 34m39s, ~46% del E2E). El trabajo del agente fue ~15 min. (7) **Post-release (8 min):** configurar el observer del watchdog destapó **ISSUE-118** — el GitHub App least-privilege está provisionado desde 2026-05 (app 3665723, secreto activo, 3 env vars en Vercel) pero los 3 readers llaman `resolveGithubTokenSync`, PAT-only, que nunca mintea el installation token. Se documentó el gap + mitigación en vez de meter un PAT atado a un usuario. (8) **Colisión multi-agente:** el push de docs falló porque el pre-push corre `eslint .` sobre TODO el repo y Codex tenía un archivo a medio editar con 4 errores. El commit quedó local hasta que Codex lo arregló. Un hook repo-wide convierte el WIP ajeno en un bloqueo propio. |
| 2026-07-09 | Claude Opus 4.8 | `41aefb457ba3-edb048f7-5dbc-46cb-8206-fd34b117a979` | `29044883487` | `41aefb457ba343e5c1eb7dda346f7ab2cf11dc9a` | develop→main completo: TASK-1374/1375 (ebook web-agentica + maquinaria de entrega tokenizada de asset + email) + batch develop (public-site/careers/hiring), 36 commits | ~1h24m (15:11→16:35, incl. lectura/preflight/docs/skill) | 49m (dispatch 15:35 → run completed 16:24) | 46m | ~10m (workers+Vercel+health verdes ~15:45) | **2do gate `production` (jobs Azure gated) sin aprobar → run stalleó ~43m** | El entorno `production` se pide DOS veces (orquestador + Azure gated); hay que aprobar AMBOS de inmediato y polear `pending_deployments` en loop (no solo `run.status`, que queda `waiting` sin revelar el gate). Azure = no-op esperado (Skip Bicep, no diff). Sin el stall el workflow habría sido ~12-15m (como los releases previos de hoy). Documentado en la skill greenhouse-production-release gotcha #6 + paso 6. |
| 2026-07-09 | Codex | `fa2581eaf536-2080521e-d750-4a38-a3d7-83754a5cd086` | `29015217854` | `fa2581eaf5367f2c25b6fb5bd5b14add3335253c` | PR #152: TASK-1371 Careers campos publicos estructurados + UI/copy polish + fix live `Modalidad=LATAM` | ~40m medido desde `2026-07-09T11:20:48Z` hasta cierre documental/final | 21m12s hasta cancel request procesado; runtime green a 10m10s | 16m02s | 10m10s | `transition-released` queued/stale despues de runtime verde; watchdog local sin PG env cayo a fallback GH y reporto falso drift viejo | Release acotado: Vercel READY antes de dispatch, bypass preflight documentado por fresh-main/migracion, transition cerrado por CLI canonico tras cancelar run stale; `ops-worker` quedo en `0cfced559316` pero `git diff 0cfced559316..fa2581eaf536` = 0, residual de label por squash/merge. |
| 2026-07-12 | Codex | `n/a — efeonce-think satellite` | `n/a — Vercel Git deployment` | `3a52256160a9aa808e45a1dc15e44fcfc2794356` | TASK-1386/1387 Surround Discovery en Think `main` | No medido formalmente | n/a | n/a | 15s (Vercel created→Ready) | Ninguno crítico; el candidato aislado inicial fue reemplazado por el deploy trazable de `main` | Think aún no está cableado al control plane multi-repo. La fuente liberada debe ser siempre el commit inmutable de `main`; se preservó WIP ajeno. Sigue pendiente el smoke humano del formulario, no la disponibilidad de la landing. |

### Desglose 2026-07-12 — Think `main`

```text
preparacion/revision: no medido formalmente
PR/merge: push directo autorizado a main; sin PR
orquestador/control-plane: n/a (satellite sin binding multi-repo)
post-release diagnosis/watchdog: inspección Vercel de SHA/dominio + HTTP
smoke/verificacion: verifier Playwright 1440/390/reduced-motion, sin submit
docs/handoff/final: en curso al registrar esta fila
total agente E2E: no medido formalmente
```

### Desglose 2026-07-14 — Codex TASK-1373 production cutover

```text
preparacion/revision: ~22m (release skills + playbook + branch/main/develop state + flag/env preflight)
PR/merge: ~18m (merge main->develop sin diff runtime, push develop/main, fix CI Deep Playwright)
orquestador/control-plane: 12m16s en run final 29295658046, con dos approvals production aprobados
post-release diagnosis/watchdog: ~8m (watchdog run 29296256877, residual ops-worker validado con logs)
smoke/verificacion: ~7m (HTTP/API fail-closed + Playwright desktop/mobile; GVC prod bloqueado por auth local)
docs/handoff/final: ~13m
total agente E2E: ~1h20m
```

Evidencia operativa:

- Release final: `a3b5ea3adb30-afed291d-c084-4192-aed9-5de9905b8a64`,
  orchestrator `29295658046`, target SHA
  `a3b5ea3adb307076c0a44b1be33051005d619ffd`, conclusion `success`.
- Vercel Production deployment `dpl_7Wpv3vSPoDXnTQq8Za2Xfw2ZHkt2`
  sirve `https://greenhouse.efeoncepro.com` con
  `CAREERS_NATIVE_GROWTH_FORM_ENABLED=true`.
- CI `29294733436` y Deep Verification `29294733458` verdes en el SHA final.
- Watchdog `29296256877` falla con `worker_revision_drift` solo para
  `ops-worker`; orquestador job `86968856985` dejo evidencia de
  `deploy_needed=false`, diff runtime vacío desde `838950916b27` hasta
  `a3b5ea3adb30`, revision `ops-worker-00487-rjm` `Ready=True`.
- Smoke productivo TASK-1373: pagina `/public/careers/EO-OPN-0009/apply`
  monta `<greenhouse-form>` con form key
  `9f7a8fc0-6fa7-4670-8e2d-efe0ce354001`, surface
  `public-careers-nextjs`, sin `gh-application-form-helper`; API contract
  `styleVariant=careers-html-fidelity`, `composition=static`, `cvFile=true`;
  submit sin captcha responde `403 captcha_failed/missing_token`.
- Visual complementario Playwright directo: desktop 1440 y mobile 390 guardados
  en `/tmp/task1373-prod-visual-smoke`, native form/input/button presentes y
  `scrollWidth == clientWidth` en ambos.

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

### Nota 2026-07-09 — Codex release acotado PR #152

Cronometro formal iniciado en `2026-07-09T11:20:48Z`. El operador pidio
`commit + push` y un release rapido, sin la ceremonia completa. Se hizo PR #152
`develop -> main`, squash merge a `fa2581eaf5367f2c25b6fb5bd5b14add3335253c`
y dispatch del orquestador con `bypass_preflight_reason` documentado porque el
lote incluia migraciones/fresh-main y los gates locales ya estaban verdes.

Desglose medido:

```text
preparacion/revision: ~4m (leer contratos minimos, confirmar clean tree y push)
PR/merge: ~8m (PR #152, merge origin/main -X ours por divergencia squash, push, squash merge)
orquestador/control-plane: 10m10s hasta runtime verde; 16m02s manifest; 21m12s hasta cancel/stale run
post-release diagnosis/watchdog: ~6m (watchdog sin PG env -> falso drift; rerun con PG env; ops-worker diff_count=0)
smoke/verificacion: ~4m (health 200, Careers detail/apply desktop/mobile, Cloud Run GIT_SHA)
docs/handoff/final: ~8m (ledger + handoff + docs commit/push)
total agente E2E: ~40m
```

Evidencia operativa:

- Manifest `released`, `started_at=2026-07-09T11:35:22Z`,
  `completed_at=2026-07-09T11:51:23Z`, `manifest_seconds=962`.
- GitHub run `29015217854` dejo todos los jobs runtime verdes y
  `/api/auth/health` verde, pero el job `Transition release_manifests -> released`
  quedo `queued`; se solicito cancel y se cerraron las transiciones por
  `pnpm release:orchestrator-transition-state`, no SQL.
- Careers production sirve Sentry release `fa2581eaf536`; detalle
  `EO-OPN-0009` muestra `Ubicacion=LATAM`, `Modalidad=Remoto`, no
  `Modalidad=LATAM`, sin overflow desktop/mobile.
- Cloud Run directo: `commercial-cost-worker`, `ico-batch-worker` y
  `hubspot-greenhouse-integration` sirven `GIT_SHA=fa2581eaf536...`.
  `ops-worker` sirve `0cfced559316...`; `git diff --name-only
  0cfced559316502233e8a550ca588ea1a7049897
  fa2581eaf5367f2c25b6fb5bd5b14add3335253c` devuelve 0 paths, asi que es
  residual de label, no drift runtime.

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
