# Production Release Incident Playbook V1

> **Tipo de documento:** Playbook operativo canónico
> **Version:** 1.1
> **Creado:** 2026-05-12 por Claude Opus 4.7 (post incidente TASK-870)
> **Ultima actualizacion:** 2026-08-06 por Claude Opus 5 (caso positivo release `70e912056273`)
> **Audience:** Cualquier agente AI (Claude, Codex, Cursor) y operadores humanos que enfrenten un `Production Release Orchestrator` fallando

---

## Por qué existe este documento

El 2026-05-11 se intentó promover `develop → main`. La promoción quedó **2 días bloqueada** porque:

1. Codex pasó ~3h pusheando 5 commits (`75273cb7`, `59f5115c`, `a4d65aa2`, `7841f547`, `c41a26b8`) tratando de "ajustar el gate" en vez de investigar la causa raíz.
2. La causa raíz era trivial — 1 env var con caracteres corruptos en Vercel production — pero invisible si no se lee el output del preflight como diagnóstico.
3. Claude tardó otras ~2.5h en cerrar end-to-end (fix env + normalizer V2 hardening + reliability signal + bonus AZURE_AD_CLIENT_ID drift) porque el preflight detectaba issues residuales secuenciales.

**Objetivo de este playbook**: cerrar un release blocker similar en <30 min, no en 2 días.

---

## ⚠️ Regla #1: el preflight NO es el problema. Es el diagnóstico.

Cuando `Production Release Orchestrator` falla en `Preflight (TASK-850 CLI)`:

- **NO bajes la severidad del gate.** Codex hizo 4 commits "fix(release): gate sentry on active production incidents" / "scope production sentry gate" / etc. Cada uno hizo el gate **más permisivo**. Ninguno tocó la causa raíz.
- **NO uses `bypass_preflight_reason` como solución default.** Ese flag SOLO trigger `--override-batch-policy` en el CLI (per `production-release.yml` Job 1) — NO bypassa Sentry, NO bypassa migrations pendientes, NO bypassa CI fail. Es un override granular, NO un mute global.
- **SÍ lee el JSON output completo del preflight ANTES de tocar código.** Cada `checkId` con `severity != ok` te dice exactamente qué fix es necesario.

---

## ⚠️ Regla #2: el orden de las cosas importa

**Secuencia canónica** cuando preflight falla:

```text
1. Leer JSON `preflight-result.json` completo (gh run view <id> --log-failed)
   ↓
2. Categorizar cada check failure:
   - "config drift"  → fix config (env var, secret, IAM)
   - "código bug"    → fix código + tests + commit
   - "estado runtime" → wait (e.g. Sentry burst se enfría)
   - "infra externa" → escalate (e.g. Azure/GCP outage)
   ↓
3. Por cada failure: aplicar fix MÁS LOCAL posible (env var > 1 archivo > refactor)
   ↓
4. Verificar el fix LIVE antes de re-trigger orchestrator
   - Sentry: query Sentry API para confirmar issue lastSeen está fuera de 15min
   - Vercel: redeploy + verify build Ready
   - Cloud Run: `gcloud run revisions describe` + smoke endpoint manual
   - PG: `pnpm pg:doctor`
   ↓
5. Re-trigger orchestrator solo cuando TODOS los checks pueden pasar
```

**Antipattern**: re-trigger orchestrator inmediatamente después de un push esperando que CI mágicamente recargue. Va a fallar igual y vas a perder otra hora.

---

## ⚠️ Regla #3: invoca al `arch-architect` ANTES de tocar cualquier cosa canónica

Codex no lo hizo. Sus 4 fix commits introdujeron drift adicional en `sentry-critical-issues.ts` que después tuvo que ser reconciliado. El arch verdict toma 90 segundos y previene esta clase de errores.

Cuándo invocar al arch:
- Cualquier cambio a `src/lib/secrets/`, `src/lib/release/preflight/`, `src/lib/auth-secrets.ts`, `services/ops-worker/server.ts`
- Cualquier cambio al `production-release.yml` workflow
- Cualquier cambio a un reliability signal o al `getReliabilityOverview`
- Cualquier cambio que toque más de 2 archivos en el mismo PR

---

## Checklist operativo cuando el Orchestrator falla

### Paso 1 — Leer el preflight JSON sin tocar nada

```bash
gh run view <RUN_ID> --log-failed 2>&1 | grep -A 5 '"checkId"\|"severity"\|"summary"\|"title"' | head -60
```

Identifica:
- `checkId` que falló
- `severity` (`warning` también bloquea — el gate filtra por `readyToDeploy` no por severity alone)
- `summary` describe la falla
- `topIssues[].title` (si es Sentry) — el ERROR EXACTO que está firing

### Paso 2 — Mapear el check a su acción correctiva

| Check ID | Causa típica | Fix canónico |
|---|---|---|
| `target_sha_exists` | SHA no existe en `main` o no fue pusheado | `git push origin main` |
| `ci_green` | CI rojo en el SHA target | Investigar workflow run de CI, fix → push → wait CI verde |
| `playwright_smoke` | 0 workflows smoke runs para el SHA | `gh workflow run playwright.yml --ref main` esperar a verde |
| `release_batch_policy` | Mix de dominios irreversibles sin marker `[release-coupled: ...]` | Agregar el marker **abriendo una línea** del cuerpo del commit de squash (se lee sólo de ese commit, TASK-1676) OR usar `--override-batch-policy` (requiere capability + reason ≥20 chars) |
| `release_batch_policy` **`unknown`, "Diff vacío"** | El rango no contiene archivos: el `target_sha` coincide con el último release `released`, o falta `git fetch`/historia completa en el checkout | **NO es una aprobación** — verificar el `target_sha` y la base que declara el evidence (`diffBase`/`diffBaseSource`). Nunca bypassear esto como si fuera un `ship` |
| `stale_approvals` | Run waiting > umbral en Production environment | Aprobar el run pendiente OR cancelar `gh run cancel` |
| `pending_without_jobs` | Run queued/in_progress con `jobs.length === 0` (deadlock por concurrency) | Verificar `concurrency` setting per TASK-848; cancel el run trapped |
| `vercel_readiness` | `VERCEL_TOKEN` unset OR Vercel API down | Set token en workflow env OR esperar Vercel recovery |
| `postgres_health` | `pg:doctor` falla | Ejecutar `pnpm pg:doctor` local, fix lo que reporte |
| `postgres_migrations` | Migrations pendientes | `pnpm pg:connect:migrate` |
| `gcp_wif_subject` | WIF federated credential desconfigurada | Verificar `az ad app federated-credential list` o `gcloud iam workload-identity-pools providers describe` |
| `azure_wif_subject` | Mismo, pero Azure | `az ad app federated-credential list --id <client-id>` |
| `sentry_critical_issues` | **El crítico — ver paso 3** | Investigar runtime, NO el gate |

### Paso 3 — Si la falla es `sentry_critical_issues`

**No** modifiques el gate. Investiga:

El check conserva severidad estricta. Si el resultado es `timeout` sin evidencia de issues, distingue latencia de la
consulta de un incidente runtime: el runner dispone de un presupuesto explícito de 20 s y la consulta canónica está
acotada al umbral de 10 issues. Un timeout con ese presupuesto sigue siendo bloqueo y requiere diagnosticar la API o
la autenticación; nunca se convierte automáticamente en warning.

```bash
TOKEN=$(gcloud secrets versions access latest --secret=greenhouse-sentry-incidents-auth-token --project=efeonce-group)

# Listar issues activos en últimos 15 min (mismo window que preflight)
curl -s "https://sentry.io/api/0/projects/efeonce-group-spa/javascript-nextjs/issues/?query=is:unresolved+level:error&environment=production&limit=30" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "
import sys,json
from datetime import datetime,timezone
now=datetime.now(timezone.utc).timestamp()
for i in json.load(sys.stdin):
    ls = datetime.fromisoformat(i['lastSeen'].replace('Z','+00:00')).timestamp()
    age_min = (now - ls) / 60
    if age_min < 15:
        print(f\"id={i['id']} age={age_min:.1f}min count={i['count']}\")
        print(f\"  title={i['title'][:130]}\")
"
```

Por cada issue activo en ventana 15min, decidir:

- **Recurrente (lastSeen <5min, count alto)** → bug runtime real. Investigar el code path que lo emite. Fix → deploy → wait → verify.
- **Residual post-fix (count viejo pero lastSeen reciente)** → el fix ya está deployado pero hay eventos que llegaron tarde o cold-starts antiguos. Espera hasta que `lastSeen` salga de los 15min naturales.
- **Real pero non-blocker** → mark as `resolved` en Sentry API (`PUT /api/0/issues/<id>/`), no bloquea preflight. Si reaparece, se crea issue nuevo (no recicla el resolved).

### Paso 4 — Verificar fix LIVE antes de re-trigger

**NO re-triggear orchestrator hasta confirmar:**

- Sentry issues que bloqueaban ya no firing (query Sentry API)
- Vercel production deployment `Ready` con SHA correcto
- Workers Cloud Run en revision esperada (`gcloud run revisions describe <svc>-XXXXX-XXX --format='value(spec.containers[0].env[?(name=="GIT_SHA")].values)'`)

### Paso 5 — Re-trigger con bypass reason significativo

```bash
gh workflow run production-release.yml --ref main \
  -f target_sha=<sha> \
  -f bypass_preflight_reason="<≥20 chars describiendo QUÉ se arregló, NO why se bypassa>"
```

Bypass reason **no es** "bypass the gate". Es audit log para forensics futuros. Ejemplo bueno:
- `"TASK-870: env GH App key fixed via vercel env update; AZURE_AD_CLIENT_ID added a ops-worker; smoke 5/5 verde"`

Ejemplo malo:
- `"override preflight"` ← inútil para forensics

---

## Anti-patterns documentados (no repetir)

### 1. "Bajar la severidad del gate" en vez de fix runtime

**Caso real (Codex 2026-05-12)**: 4 commits seguidos tratando de hacer `sentry-critical-issues.ts` más permisivo (ventana 24h → 15min, ventana 15min → 5min, etc.). Resultado: la causa raíz (env var corrupta) quedó 3h sin atacar.

**Regla**: cualquier modificación a archivos bajo `src/lib/release/preflight/checks/*` requiere arch review explícito. Si el gate está detectando algo, EL GATE ESTÁ HACIENDO SU TRABAJO.

### 2. Re-triggear orchestrator después de cada push sin verificar runtime

**Caso real**: Codex re-trigger 4 veces (`25729006167`, `25730555533`, `25734474468`, `25734817631`) sin esperar que los fixes propagaran a runtime. Cada trigger era ruido.

**Regla**: entre push y trigger del orchestrator, espera:
- ~3 min para Vercel build complete + cold-start cycles
- ~5-15 min para que Sentry active window se enfríe si el fix lo requería

### 3. Tratar fix de env var como "no es código"

**Caso real**: la corrupción de `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` no fue detectada en 4 attempts porque Codex no inspeccionó los bytes hex del env var. Asumió que la env era "config", no "code".

**Regla**: ante un Sentry burst recurrente de un secret-related error, SIEMPRE inspeccionar bytes hex del env var:

```bash
vercel env pull --environment production /tmp/.x --cwd <repo> --yes
grep "^FOO_SECRET_REF=" /tmp/.x | xxd
rm -f /tmp/.x
```

### 4. Promover develop → main directo sin preflight local

**Caso real**: el merge `75273cb7 release: promote develop to production` fue empujado a `main` directo. Después se descubrió que CI estaba degraded, migrations pendientes, etc.

**Regla**: ANTES de pushear el merge a main, correr `pnpm release:preflight --target-sha=$(git rev-parse develop) --target-branch=main --json` localmente. Si reporta `readyToDeploy=false`, **no pushear**.

### 5. Usar variables bash readonly built-in como locales en workflow steps

**Caso real (2026-05-12 run `25740470728`)**: el step `Poll Vercel API for production deployment matching target_sha` en `production-release.yml` asignaba `UID="${MATCHING%%|*}"`. `$UID` es READONLY built-in de bash (process user ID). bash rechazó con `UID: readonly variable` → exit 1 → step falló sin haber pollado un solo ciclo → release marcado degraded/aborted aunque production estaba healthy.

**Regla**: NUNCA usar como nombre de variable local en shell steps de GH Actions ninguno de los siguientes:

- `UID`, `EUID`, `PPID` — process IDs
- `BASH_SOURCE`, `BASHOPTS`, `SHELLOPTS` — shell config
- `BASH`, `BASH_VERSION`, `BASH_VERSINFO` — bash metadata
- `BASH_ARGC`, `BASH_ARGV`, `BASH_LINENO`, `BASH_REMATCH` — bash internals
- `HOSTNAME`, `HOSTTYPE`, `MACHTYPE`, `OSTYPE` — system identity

Prefijar con un contexto explícito (`DEPLOY_UID`, `BUILD_PPID`, etc.) o usar minúsculas (`deploy_uid`).

### 6. No invocar al arch-architect en cambios canónicos

**Caso real**: las 4 modificaciones de Codex tocaron archivos canónicos (`sentry-critical-issues.ts`, `vercel-cron-async-critical-gate.mjs`, etc.) sin arch review. Resultado: la lógica del gate quedó más laxa de lo que el spec V1 documenta, y el bug class real (normalizer drift) quedó sin tocar.

**Regla**: arch-architect review obligatorio para CUALQUIER cambio en `src/lib/secrets/`, `src/lib/release/`, `src/lib/auth-secrets.ts`, workflow files, deploy scripts. Costo: 90s. Beneficio: previene 3h de churn.

### 7. Confundir latencia de evidencia o skip esperado con deploy omitido

**Caso real (TASK-1328, 2026-07-03)**: el primer orquestador fallo porque `main` todavia no tenia toda la evidencia para el `target_sha` (CI/smoke en carrera). Despues el release termino bien, pero surgio la duda de si Azure o `ico-batch-worker` se habian skippeado. Azure habia hecho `no_infra_diff` esperado; `ico-batch-worker` si ejecuto deploy, paso health y quedo `Ready=True`. El drift real era solo `ops-worker`, detectado por watchdog.

**Regla**:

- Preflight race por CI/smoke faltante = esperar o disparar el check para el SHA exacto; no cambiar gates.
- Azure `no_infra_diff` = skip esperado solo si el job termina `success` y el summary explica la razon.
- Worker "skip/no deploy" = aceptable solo si Cloud Run ya expone el `target_sha` o el watchdog queda OK.
- Si `pnpm release:watchdog --json` reporta `worker_revision_drift`, el release no esta cerrado aunque el orquestador haya terminado.
- Ante duda operacional, mirar job summary/log + Cloud Run `Ready=True` + `GIT_SHA`; no inferir desde el nombre del job.

### 8. Leer tarde el playbook y redescubrir condiciones comunes

**Caso real (2026-07-09, TASK-354 / Account Manager opening):** el release
estaba autorizado como acoplado, runtime terminó sano y la transición final se
atascó por cola de runner. El agente invirtió tiempo persiguiendo
`ops-worker`/watchdog y condiciones ya documentadas en vez de aplicar primero
la skill/runbook de release. El operador lo señaló correctamente: approvals,
workers lentos, `ops-worker` change-gated y queue final son condiciones comunes
del camino de producción.

**Regla**:

- Antes de cualquier paso a producción, leer la skill
  `greenhouse-production-release`, este playbook, el runbook de producción y el
  runbook de watchdog.
- Si el único drift es `ops-worker`, validar diff runtime entre el `GIT_SHA` de
  Cloud Run y el `target_sha`. Si no hay archivos, no redeployar por etiqueta.
- Si `transition-released` queda queued tras runtime verde, no usar SQL: esperar
  o, con aprobación explícita, cerrar con
  `pnpm release:orchestrator-transition-state` y razón auditada.
- Si el operador pidió medir tiempos, registrar cada fase sin convertir la
  medición en investigación nueva.
- Todo cierre de release debe actualizar
  `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` con agente, fecha,
  release ID, run ID, SHA y tiempos. El KPI principal es el tiempo agente
  end-to-end, incluyendo revisar, analizar, ejecutar, diagnosticar, documentar y
  responder; workflow/manifest son submetricas tecnicas. Si no hubo cronometro
  formal, registrar `no medido formalmente` + estimacion del operador si existe,
  y corregir el proceso para el siguiente release.

---

## Caso positivo 2026-08-06 — el release que no generó incidente

Hasta esta versión, este playbook sólo documentaba incidentes. Eso deja un sesgo:
enseña a salir de un pozo, no a no caerse. El release
`70e912056273d0a30e2aa8dacc2f4e62076e3b44` (release_id
`70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`, run `31058032196`, PR #177)
es el primer registro del ledger que **pasó a la primera: sin
`bypass_preflight_reason`, sin retry del orquestador y con `drift_count=0`** en el
watchdog. Workflow 10m51s (`23:56:03Z`→`00:06:54Z`), manifest `released`.

Y no fue por ser un release chico: **355 commits, 221 archivos de código y 14
migraciones** (EPIC-022 SEO, EPIC-028 Globe, identity 1616/1631, payroll 1630,
Nexa 1182, EPIC-040). Es exactamente el perfil de batch que en releases
anteriores producía `requires_break_glass`, bypass documentado y un retry.

### Qué se hizo distinto

**Los tres gotchas conocidos se pre-emptaron en vez de sufrirlos.** Esa es toda
la diferencia. La secuencia con comandos exactos vive en el runbook
(`docs/operations/runbooks/production-release.md` §2.4); acá queda el principio,
que es lo que este playbook debe enseñar:

| Gotcha | Lo que se venía haciendo (reactivo) | Lo que se hizo (pre-emptivo) |
|---|---|---|
| #1 PR conflictivo | Descubrir el conflicto al crear el PR y pelearlo contra el reloj | `git merge origin/main -X ours --no-edit` en `develop` **antes** de crear el PR → PR MERGEABLE de entrada |
| #2 batch policy | Aceptar `requires_break_glass` y pedir `bypass_preflight_reason` | Marker `[release-coupled: <razón>]` **abriendo una línea** del cuerpo del commit de squash → preflight del orquestador pasa `ship` sin bypass |
| #3 `playwright_smoke` ausente | Bypassear el check que no existe para el SHA de squash | `gh workflow run playwright.yml --ref main` y esperar verde (3m10s, run `31057847351`) → el check **existe de verdad** |

> **Corrección posterior sobre el #2 (TASK-1676 / ISSUE-145, 2026-08-09).** Ese
> `ship` no lo produjo el marker: en esa fecha el orquestador computaba el diff
> contra `origin/main` con el `target_sha` ya mergeado, así que el rango era vacío
> y el check aprobaba por vacuidad — 3 releases seguidos, uno con 1045 archivos y
> 14 migraciones. El marker se escribió cuatro veces creyendo que hacía algo. Hoy
> la base es el `target_sha` del último manifest `released`, un diff vacío devuelve
> `unknown` en vez de `ship`, y el marker recién ahora se lee donde este playbook
> dice que se lee. La técnica del #2 sigue siendo la correcta; lo que cambió es que
> pasó a ser cierta.

Detalle del #1 que conviene no perder: hubo un conflicto **modify/delete** real
(`TASK-1590` borrada en `develop` porque migró a `in-progress/`, modificada en
`main`). `-X ours` no resuelve modify/delete — hay que decidirlo a mano. Se
resolvió conservando el estado de `develop` (`git rm` de la copia en `to-do/`) y
se verificó con `git log origin/main --not HEAD` vacío **y**
`git diff HEAD@{1} HEAD -- src/ scripts/ services/ migrations/` vacío. Esa
segunda verificación es la que prueba que el merge fue documental y que `-X ours`
no se comió código de producción.

### El principio general

> **Un gotcha documentado y no pre-emptado es un incidente agendado.**

Los tres gotchas de §2.3 del runbook estaban escritos hace más de un mes. Que
estuvieran escritos no evitó ni un solo bypass: se leían **después** de tropezar.
La regla que este caso deja es de orden, no de conocimiento — el catálogo de
gotchas se aplica **antes** de crear el PR, no cuando el gate ya está rojo.

Corolario sobre el bypass: `bypass_preflight_reason` casi nunca es la única
salida. En este release, el gotcha #2 tenía una respuesta declarativa (el marker)
y el #3 tenía una respuesta ejecutable (disparar el smoke por 3 minutos). Antes
de escribir un bypass, la pregunta correcta es **"¿puedo producir la evidencia
que falta?"**, no "¿cómo justifico saltármela?".

### Lo demás que salió bien y por qué

- **Espera de evidencia sobre el SHA exacto de `main`** — `CI`, `CI Deep
  Verification`, Vercel Production `Ready` (deployment
  `dpl_8ygHujBn7ahfC1Yk6671iY7xZ6Re`, aliased a `greenhouse.efeoncepro.com`) y el
  smoke recién disparado. Push a `main` `23:32Z`, dispatch `23:56Z` → **24 min**,
  muy por encima del piso de 8 min que evita la carrera con Vercel `BUILDING`.
- **Gates aprobados con loop sobre `pending_deployments`, no sobre `run.status`** —
  el primer gate se aprobó a los ~2m45s del arranque y el run cerró sin stall.
  Comparar con el release `41aefb457`, donde el 2do gate sin aprobar stalleó ~43
  min. Los jobs Azure cerraron en `Skip Bicep deploy (no diff)` + `skipped`: el
  no-op esperado, no una falla (anti-pattern #7).
- **Residual `ops-worker` ya clasificado por el watchdog** — quedó en
  `558558263e80` con diff de rutas runtime vacío y `Ready=True`. Novedad respecto
  de todos los releases anteriores: el watchdog reportó `drift_count=0` y explicó
  el residual en su propio `detail` (`change-gated`), en vez del `severity=error`
  mecánico. El fix vive en el commit `6f7e246ea` de `main`. El bug class del
  anti-pattern #7 dejó de requerir refutación manual.

### Lo que igual costó tiempo (para el próximo)

- **Vercel congela las env vars al crear el build.** `GROWTH_SEO_ENABLED=true` en
  Production requirió **redeploy** (`dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`) para
  quedar vivo. Si el flag se puede prender antes del merge del PR, el build del
  release lo hornea y el redeploy no existe.

Registro completo de tiempos y desglose por fase:
`docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md`, fila 2026-08-06.

---

## Decisión: ¿cuándo eliminar / relajar el preflight?

**Respuesta corta: nunca, salvo bug class del check itself.**

El preflight detectó el incidente actual correctamente: env var corrupta produciendo Sentry burst sostenido. Sin él, el release habría pasado y producción habría tenido la GH App key resolver fallando ~24h+ antes de que alguien lo detectara.

**Cuándo modificar el preflight**:
- ✅ Cuando un check tiene bug class verificado (false positives sostenidos demostrables)
- ✅ Cuando emerge un nuevo failure mode que el catálogo de checks no cubre (agregar check nuevo, no quitar)
- ❌ Cuando "está siendo molesto en un release específico" → eso es la señal correcta
- ❌ Cuando "queremos cerrar el release rápido" → escala a humano con autoridad, NO al código

---

## Single-source-of-truth de aprendizajes

Si emerge un nuevo failure mode no cubierto por este playbook, documentarlo aquí + arch-architect review + commit canónico. Este playbook ES el aprendizaje canónico cross-agent.

Desde la V1.1 esto también aplica al revés: si un release **evitó** un blocker
conocido por una secuencia replicable, documentar el caso positivo (qué se hizo
distinto y en qué orden) y llevar los comandos exactos al runbook. Un playbook
que sólo colecciona incidentes enseña a salir del pozo, no a no caerse.

**Referencias**:
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (TASK-848)
- `docs/operations/runbooks/production-release.md` (runbook estándar)
- `docs/tasks/in-progress/TASK-870-secret-manager-normalizer-hardening-v2.md` (incidente fuente)
- CLAUDE.md sección "Secret Manager Hygiene" + "Production Preflight CLI invariants"
- `.claude/skills/greenhouse-production-release/SKILL.md` (skill canónica para Claude)
- `.codex/skills/greenhouse-production-release/SKILL.md` (skill canónica para Codex)

---

## Métricas de éxito de este playbook

Si funciona, los próximos release blockers deberían cerrar en:

- **<5 min** — preflight falla por config drift conocido (env, migration, smoke)
- **<30 min** — preflight falla por runtime issue que requiere investigación
- **<2h** — preflight falla por bug class nuevo que requiere code fix + arch review

Si un release blocker toma >2h, **stop y escala a humano**: hay algo no cubierto por este playbook que merece investigación profunda + actualización de este doc.

---

> **Última lección del 2026-05-12**: Codex perdió 3h y Claude otras 2.5h. El fix real eran 2 comandos (`vercel env update` + `gcloud run update`) + 1 atomic commit del hardening canonico. La diferencia entre 5h y 5min fue **invocar arch-architect ANTES** y **leer el preflight JSON como diagnóstico** en vez de obstáculo.
