# Production Release Incident Playbook V1

> **Tipo de documento:** Playbook operativo canónico
> **Version:** 1.0
> **Creado:** 2026-05-12 por Claude Opus 4.7 (post incidente TASK-870)
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

## ⚠️ Regla #3: invocá al `arch-architect` ANTES de tocar cualquier cosa canónica

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
| `release_batch_policy` | Mix de dominios irreversibles sin marker `[release-coupled: ...]` | Agregar marker al commit body OR usar `--override-batch-policy` (requiere capability + reason ≥20 chars) |
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
- **Residual post-fix (count viejo pero lastSeen reciente)** → el fix ya está deployado pero hay eventos que llegaron tarde o cold-starts antiguos. Esperá hasta que `lastSeen` salga de los 15min naturales.
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

**Regla**: entre push y trigger del orchestrator, esperá:
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

### 5. No invocar al arch-architect en cambios canónicos

**Caso real**: las 4 modificaciones de Codex tocaron archivos canónicos (`sentry-critical-issues.ts`, `vercel-cron-async-critical-gate.mjs`, etc.) sin arch review. Resultado: la lógica del gate quedó más laxa de lo que el spec V1 documenta, y el bug class real (normalizer drift) quedó sin tocar.

**Regla**: arch-architect review obligatorio para CUALQUIER cambio en `src/lib/secrets/`, `src/lib/release/`, `src/lib/auth-secrets.ts`, workflow files, deploy scripts. Costo: 90s. Beneficio: previene 3h de churn.

---

## Decisión: ¿cuándo eliminar / relajar el preflight?

**Respuesta corta: nunca, salvo bug class del check itself.**

El preflight detectó el incidente actual correctamente: env var corrupta produciendo Sentry burst sostenido. Sin él, el release habría pasado y producción habría tenido la GH App key resolver fallando ~24h+ antes de que alguien lo detectara.

**Cuándo modificar el preflight**:
- ✅ Cuando un check tiene bug class verificado (false positives sostenidos demostrables)
- ✅ Cuando emerge un nuevo failure mode que el catálogo de checks no cubre (agregar check nuevo, no quitar)
- ❌ Cuando "está siendo molesto en un release específico" → eso es la señal correcta
- ❌ Cuando "queremos cerrar el release rápido" → escalá a humano con autoridad, NO al código

---

## Single-source-of-truth de aprendizajes

Si emerge un nuevo failure mode no cubierto por este playbook, documentarlo aquí + arch-architect review + commit canónico. Este playbook ES el aprendizaje canónico cross-agent.

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
