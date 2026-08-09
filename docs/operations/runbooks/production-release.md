# Production Release Runbook

> **Audience:** EFEONCE_ADMIN + DEVOPS_OPERATOR
> **Spec canónico:** [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
> **Source task:** TASK-848 V1 (parcial; V1.1 follow-ups en TASK-850..855)
> **Last updated:** 2026-08-06
> **Timing ledger:** [PRODUCTION_RELEASE_TIMING_LEDGER.md](../PRODUCTION_RELEASE_TIMING_LEDGER.md)

Este runbook es el contrato operativo para promover `develop` → `main` y para ejecutar rollback de emergencia.

## 0. Disciplina para agentes: no redescubrir el release

Antes de tocar PRs, flags, approvals, workflows o manifests de production, el
agente debe cargar la skill `greenhouse-production-release` y releer este
runbook, el playbook de incidentes y la spec del control plane. El objetivo es
operar el camino canónico, no investigar de cero condiciones que ya son parte
normal del release.

Condiciones comunes que se deben reconocer sin abrir bucles exploratorios:

- approvals del environment `Production` pertenecientes al orquestador activo;
- CI/smoke warnings del squash commit fresco de `main`;
- workers que tardan 7-10 min mientras Cloud Run queda `Ready=True`;
- Azure `no_infra_diff`;
- `ops-worker` con `deploy_needed=false` por diff runtime vacío;
- `transition-released` esperando runner después de que runtime y health ya
  están verdes.

Si el operador pide medir tiempos, medirlos como telemetría de operación:
preflight, PR/merge, dispatch, approval, workers, Vercel READY, health,
transition final, watchdog y flags. Medir no autoriza perseguir cada latencia
como incidente.

Todo agente que ejecute, recupere o cierre un release debe iniciar un timer en
su primera accion de release, incluyendo revisar, leer playbook, analizar y
preparar. La metrica principal es **tiempo agente end-to-end**, no
`release_manifests.completed_at - started_at`. Antes del cierre debe actualizar
`docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` con agente, fecha, release
ID, run ID, target SHA, tiempo agente E2E, workflow elapsed, manifest elapsed,
runtime-green elapsed, desglose de fases, bloqueo principal y aprendizaje.

## 1. Decision tree (flujo normal canonico)

```text
                                    ┌─────────────────────────────────┐
                                    │  develop está verde (CI + Smoke)│
                                    └───────────────┬─────────────────┘
                                                    │
              ┌──────────────────────────────┐
              │ 1. Promover el SHA a main    │
              │    via PR/merge controlado   │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 2. Esperar evidencia main    │
              │ CI + CI Deep + Vercel READY  │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 3. Disparar orquestador      │
              │    para ese SHA exacto       │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 4. Preflight TASK-850        │
              │    bloquea antes de deploy   │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 5. Aprobar gate Production   │
              │    del orquestador           │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 6. Deploy + health + manifest│
              │    released/degraded         │
              └──────────────────────────────┘
```

> **Antes del paso 1, correr §2.4** (pre-empción de los 3 gotchas del
> squash-merge). Es la diferencia verificada entre un release que pasa a la
> primera y uno que quema runs, bypasses y retries.

`production-release.yml` es el brazo activo canonico del release a
produccion. Los workflows individuales de workers conservan `push:develop`
para staging y `workflow_dispatch` para break-glass documentado, pero
production normal NO se despliega por `push:main` ni aprobando workers sueltos.
El orquestador invoca los workers via `workflow_call`, pasa `expected_sha`,
espera Vercel production READY y transiciona `greenhouse_sync.release_manifests`.

## 2. Preflight checklist (V1 manual + TASK-850 CLI canonico)

**TASK-850 SHIPPED 2026-05-10** — la tabla manual de abajo queda como referencia conceptual. Ejecutar **siempre** `pnpm release:preflight` que automatiza los 12 checks, incluido `release_batch_policy`, en una sola llamada con output JSON machine-readable.

```bash
# Pre-PR (operador local)
pnpm release:preflight                       # human output, todos los 12 checks
pnpm release:preflight --json                # JSON machine-readable

# CI gate (TASK-851 orchestrator workflow)
pnpm release:preflight --json --fail-on-error   # exit 1 si readyToDeploy=false

# Break-glass (EFEONCE_ADMIN solo, requiere capability + audit)
pnpm release:preflight --override-batch-policy --fail-on-error
```

Flags:

- `--target-sha=<sha>` (default git HEAD)
- `--target-branch=<branch>` (default main)
- `--json`, `--fail-on-error`, `--override-batch-policy`

Output canonico: `ProductionPreflightV1` (versionado `contractVersion='production-preflight.v1'`). Operator decide en base a `readyToDeploy: SI | NO`; en modo `--fail-on-error`, cualquier `readyToDeploy=false` debe fallar el gate.

**Leccion 2026-07-03 (TASK-1328):** si el `target_sha` acaba de llegar a `main`, el preflight puede fallar por carrera de evidencia (`ci_green` o `playwright_smoke` aun corriendo / sin run para ese SHA). Eso no se arregla cambiando el gate ni interpretando que Azure o workers "skippearon". La accion correcta es:

1. Iniciar un watch acotado inmediatamente despues de promover a `main`; no hacer trabajo no relacionado mientras el SHA quede sin release manifest.
2. Antes del **primer** dispatch, esperar `CI`, `CI Deep Verification` y el deployment Vercel Production `READY`, todos para el SHA exacto de `main`.
3. Disparar el orquestador solo cuando esa evidencia exista. Un check pendiente no es un warning elegible para bypass ni una razon para quemar un run fallido.
4. Si se usa `bypass_preflight_reason`, dejar una razon forense concreta: los checks anteriores ya estan verdes y el bypass cubre solamente la ausencia inevitable del smoke de `develop` en el squash SHA de `main`.

Si por algun motivo el CLI no esta disponible (e.g. local sin checkout, o auth expirada), la tabla manual abajo sirve como fallback documental. **Cualquier check rojo bloquea el release.**

| # | Check | Cómo verificar | Bloqueante |
|---|---|---|---|
| 1 | CI verde en commit cabeza de develop | `gh run list --branch develop --workflow=CI --limit 1` | Sí |
| 2 | Playwright smoke verde | `gh run list --branch develop --workflow="Playwright E2E smoke" --limit 1` | Sí |
| 3 | Sin runs production "stale waiting" | `gh run list --status waiting` y verificar que ninguno > 24h en allowlist | Sí |
| 4 | Sin runs "pending sin jobs" | `gh run list --status queued` + inspect cada uno con `gh run view <id>` | Sí |
| 5 | Vercel staging Ready | `vercel ls greenhouse-eo --environment=staging` ✓ Ready | Sí |
| 6 | Postgres health | `pnpm pg:doctor` | Sí |
| 7 | Outbox sin dead-letter pendiente | `psql -c "SELECT count(*) FROM greenhouse_sync.outbox_events WHERE status='dead_letter'"` debe ser 0 | Recomendado |
| 8 | Sentry sin incidents critical 24h | Vercel/Sentry UI o `/admin/operations` Cloud subsystem | Sí |
| 9 | Reliability dashboard `/admin/operations` sin signals `error` | Inspeccionar UI | Sí |
| 10 | WIF subjects GCP + Azure correctos | Sec 2.1 abajo | Sí (después de cualquier cambio infra) |
| 11 | Batch size policy OK | Sec 2.2 abajo; V1.1 lo automatiza en TASK-850 | Sí |

Despues del merge a `main` y antes del primer dispatch, sumar tres gates de
readiness para el SHA exacto promovido: `CI` exitoso, `CI Deep Verification`
exitoso y Vercel Production `READY`. La evidencia de `develop` no reemplaza
estos gates de `main`, y un deployment Vercel de otro SHA tampoco.

### 2.1. Verificación WIF subjects (fallback manual)

**GCP**:

```bash
gcloud iam workload-identity-pools providers describe github-actions-provider \
  --location=global \
  --workload-identity-pool=github-actions-pool \
  --project=efeonce-group \
  --format='value(attributeCondition)'
```

Debe permitir AMBOS:
- `assertion.ref == 'refs/heads/main'`
- `assertion.environment == 'production'` (si algún workflow declara `environment: production`)

**Azure** (App Registration `Greenhouse Bot Registration`):

```bash
az ad app federated-credential list --id <AZURE_CLIENT_ID> --query "[].subject"
```

Debe incluir AMBOS:
- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main`
- `repo:efeoncepro/greenhouse-eo:environment:production`

**Si falta**: agregar via `az ad app federated-credential create --id <CLIENT_ID> --parameters '{...}'` ANTES del release.

### 2.2. Production release batch size policy

Greenhouse promueve a producción en lotes pequeños, coherentes y reversibles. La unidad de decisión no es el
número de commits: es **blast radius + reversibilidad + evidencia de validación**.

Regla base:

- Un release normal debe contener **un bloque funcional coherente**.
- Ese bloque puede tener varios commits si todos pertenecen al mismo objetivo y comparten rollback.
- No mezclar dominios sensibles salvo dependencia directa documentada.

Matriz operativa:

| Tipo de cambio | Política de batch | Bloquea si se mezcla con |
|---|---|---|
| Docs-only / task specs | Agrupable si no cambia runtime | Nada, salvo que oculte cambio runtime |
| UI bajo riesgo | Hasta 2-3 cambios relacionados | DB/auth/payroll/finance/infra no relacionados |
| Payroll / Previred / compliance | 1 causa raíz por release | Finance/auth/cloud/migrations no requeridas |
| Finance / billing / accounting | 1 causa raíz por release | Payroll/auth/cloud/migrations no requeridas |
| Auth / access / entitlements | 1 causa raíz por release | Payroll/finance/cloud no requeridas |
| Cloud / deploy / release infra | 1 slice por release | Cambios funcionales no requeridos |
| DB migration | Release dedicado o acoplado solo a su consumer directo | Refactors/UI no requeridos |
| Hotfix | 1 cambio mínimo y reversible | Cualquier mejora oportunista |

Bloqueantes:

- más de un cambio irreversible en el mismo release;
- más de un dominio sensible sin dependencia declarada;
- rollback no explicable en una frase;
- staging no valida el flujo afectado;
- signals `error` en `/admin/operations`;
- stale approvals o pending runs sin jobs;
- el release se describe naturalmente con "también incluye...".

Excepción break-glass:

- solo para incidente productivo activo;
- requiere razón escrita, owner humano, rollback explícito y actualización de `Handoff.md`;
- no permite agregar mejoras no relacionadas.

### 2.3. Gotchas del squash-merge (verificados 2026-07-03 #139 y 2026-08-06 #178; fix de raíz = ISSUE-114)

El flujo de promoción por **squash-merge** hace que `main` (commits squash de releases previos) **no sea ancestro de `develop`**. Eso produce condiciones recurrentes que **NO son fallas reales** — reconocelas y aplica la mitigación en vez de perseguirlas:

1. **El PR `develop→main` conflicta ("merge commit cannot be cleanly created").** Conflictos en docs (Handoff/changelog/README/registry) y a veces código, porque ambos lados editaron desde una merge-base vieja. **Resolución robusta:** en `develop`, `git merge origin/main -X ours --no-edit` (`develop` es autoritativo: contiene todo `main` por construcción, ya que los squash de `main` son DE commits de `develop`). Verifica `git log origin/main --not develop` vacío **y** `git diff HEAD@{1} HEAD -- src/ scripts/` sin cambios de código → push `develop` → el PR queda MERGEABLE. Bonus: **avanza la merge-base** y reduce la divergencia del próximo release. **NUNCA** cherry-pick a `main` (duplica SHAs).

2. **~~Preflight `release_batch_policy=requires_break_glass` como falso positivo.~~ RESUELTO 2026-08-08 (ISSUE-114).** El classifier usaba diff *three-dot* (`origin/main...target`, merge-base) y resucitaba archivos ya desplegados en un release previo como `cloud_release` irreversible. **Ya no**: `collectChangedFiles` usa **two-dot** y ambos consumidores del rango (archivos + commit bodies) lo resuelven por `buildReleaseDiffRange`, con guardrail anti-regresión en `checks/release-batch-policy.test.ts`. **Consecuencia operativa: si hoy ves `cloud_release` en el classifier, es REAL — no lo descartes como fantasma ni le pongas marker.** Verifícalo igual con `git diff origin/main..target -- <archivo>`; si devuelve líneas, el dominio está de verdad en el batch. Nota aparte: post-merge, con `target` = HEAD de `main`, el rango queda vacío y el batch-policy del orchestrator pasa siempre — **el gate sólo tiene dientes en la corrida local pre-merge**, que es donde se toma la decisión humana.

3. **`playwright_smoke` (0 runs) + evidencia aún corriendo en el commit fresco de `main`.** El smoke corre en `develop` (ya verde); el commit squash de `main` no tiene su propio smoke. Esperar `CI`, `CI Deep Verification` y Vercel Production `READY` para el SHA exacto **antes del primer dispatch**. Solo entonces `bypass_preflight_reason` (≥20 chars) puede cubrir la ausencia inevitable del smoke en el squash; nunca checks pendientes o fallidos. Documentar el motivo real, no uno generico.

4. **Pushes docs-only a `develop` justo antes del release cancelan el build de staging y bloquean el preflight (gotcha #7 de la skill; verificado 2026-08-06, release `fcee5ab9f7ce`).** El Ignored Build Step de Vercel (`scripts/ci/vercel-ignore-build.mjs`, gotcha #5 de la skill) cancela los builds docs-only de `develop`; el check `vercel_environments` del preflight exige que el deploy más reciente de **staging** esté `READY` y falla con "Production READY, pero staging deploy CANCELED" (severity `warning` pero **exit 1** → run del orquestador quemado: run `31104631142`). **Resolución verificada 2026-08-06 — producir la evidencia, no bypassear:** `vercel redeploy <url-del-deployment-cancelado> --scope efeonce-7670142f` (~6 min de build), esperar `READY` y re-dispatchar. Pre-empción: **secuenciar los pushes docs-only para DESPUÉS del release** y verificar que el último deploy de staging no esté `CANCELED` antes del dispatch.

5. **El merge canónico `-X ours` puede colar contenido de `main` que `develop` corrigió DESPUÉS del último release (gotcha #8 de la skill; verificado 2026-08-06, release `fcee5ab9f7ce`).** `-X ours` solo decide los hunks en conflicto; los hunks de `main` que aplican limpio **entran** — y si `develop` había eliminado esa línea después del release anterior, el merge la resucita como regresión real. Caso real: `git merge origin/main -X ours` trajo a `develop` 1 línea de `src/lib/ai/dataforseo.ts` (`dataForSeoBreaker.recordFailure(family)` incondicional) que la auditoría de TASK-1300 había eliminado en `develop` después del release anterior — habría contado 4xx de caller y abierto el breaker. La verificación 2 del gotcha #1 (`git diff HEAD@{1} HEAD -- src/ scripts/ services/ migrations/` vacío) es exactamente la que lo detecta — por eso no se omite. **Resolución verificada 2026-08-06:** cuando la verificación 1 (`git log origin/main --not HEAD`) está vacía y la 2 muestra drift regresivo main→develop: `git reset --hard HEAD@{1}` y `git merge origin/main -s ours --no-edit` (estrategia `ours` COMPLETA: árbol de `develop` EXACTO, ancestría avanzada, PR MERGEABLE). Verificar que `git diff HEAD@{1} HEAD` salga **totalmente** vacío. Regla: `-s ours` solo es legítimo cuando la verificación 1 está vacía (`main` no tiene commits únicos); si no lo está, esos commits se perderían — ahí el merge se resuelve a mano.

6. 🔴 **`split_batch` y `requires_break_glass` NO se resuelven igual, y el marker sólo sirve para el primero** (verificado leyendo `batch-policy/classifier.ts`, release `2c87d71e2eca` del 2026-08-09). El gotcha #2 y el paso B de §2.4 hablan del marker `[release-coupled: …]`, y es fácil leerlos como "batch policy rojo ⇒ marker". No:

   | Decisión | Qué la dispara | Única salida |
   |---|---|---|
   | `split_batch` | `findUncoupledIndependentSensitiveDomains` — pares de dominios sensibles independientes mezclados | marker en el cuerpo del squash, **o** partir el batch |
   | `requires_break_glass` | `hasIrreversibleDomain(domains)` — **cualquier** dominio irreversible, con o sin mezcla | `bypass_preflight_reason` (≥20 chars) |

   El classifier evalúa `split_batch` **antes**, así que un `requires_break_glass` significa que el par no estaba en la lista de independientes: **ponerle marker no cambia nada**. Consecuencia: todo release que toque `migrations/`, `src/lib/release/**` o `.github/workflows/` va a pedir bypass. `TASK-1681` evaluó relajar la severidad y lo descartó con datos.

7. **Una sola instancia Cloud SQL: `greenhouse-pg-dev` sirve a producción, staging y local** (verificado 2026-08-09). Una migración aplicada "en dev" **ya está aplicada para producción**. Antes de redactar la razón de un bypass con `db_migrations`, comprobá `SELECT name, run_on FROM public.pgmigrations WHERE name LIKE '%<task-id>%'`: si ya están aplicadas, ese dominio es reconciliación de archivos con un estado ya realizado y el rollback no necesita undo ni backfill — un hecho auditable, no una opinión.

8. **`vercel redeploy` NO resuelve un staging `Canceled` cuando el commit más nuevo es docs-only (verificado 2026-08-09, release del cierre del carril cliente).** El gotcha #7 recomienda `vercel redeploy <url-cancelado>`, y eso funciona cuando el build se canceló por otra causa. Si la cancelación la produjo el **Ignored Build Step** sobre un commit docs-only, el redeploy **reevalúa el mismo diff y se vuelve a cancelar** — verificado: el redeploy de `greenhouse-278mab620` salió `The deployment has been canceled.` en segundos.

   Las salidas reales, en orden de preferencia:

   1. **Pre-empción (la única gratis):** secuenciar los pushes docs-only **después** del release. Es lo que ya dice el gotcha #7 y la razón por la que existe.
   2. **Tocar un doc de control de release.** `scripts/ci/vercel-ignore-build.mjs` mantiene un set `deployControlDocs` que **NO** cuenta como docs-only: `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`, `FEATURE_FLAG_STATE_LEDGER.md`, `PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md`, los runbooks de release/watchdog y los manuales de orchestrator/preflight/watchdog. Un cambio ahí fuerza `action: 'build'`. Si igual debes documentar algo del release —y casi siempre lo debes—, ese commit **produce la evidencia como efecto**, sin inventar un cambio de código.
   3. Un cambio de código real, si existe uno pendiente y legítimo. **NUNCA** inventar uno para forzar el build.

   Y vale saber por qué el check se queja de algo que no está roto: `vercel_readiness` mira el deploy de staging **más reciente sin importar su estado**, así que un skip deliberado de nuestro propio ignore-build se lee igual que un build fallado. El staging anterior `Ready` puede contener todo el código del release; lo único que le falta son docs. Es una tensión entre dos mecanismos propios, no una falla de staging — pero el check igual sale con exit 1, así que hay que producirle el deploy.

9. **El context gate tiene que ser lo ÚLTIMO que corres antes de commitear, y `docs:closure-check` NO lo incluye (verificado 2026-08-09, run `31340366010` rojo en `develop`).** Secuencia que falla y se siente correcta: corres `docs:context-check:strict` → 0/0 → después agregas una entrada al changelog o al Handoff → corres `docs:closure-check` → 0 warnings → commiteas. El commit sale con `changelog.md` en 61 entradas y el CI lo rechaza.

   Los dos gates miran cosas distintas: `docs:closure-check` audita si la documentación acompaña al cambio (arquitectura, funcional, manuales, flags), y **no** verifica techos de contexto. `docs:context-check:strict` es el que cuenta entradas, líneas y tokens — y cualquier edición posterior a `Handoff.md`/`changelog.md` invalida su resultado.

   **Regla:** si tocas `Handoff.md` o `changelog.md` después de correr el context gate, **vuelve a correrlo**. Y como en el cierre de un release se tocan los dos casi siempre, el orden seguro es: todas las ediciones documentales → `docs:closure-check` → `docs:context-rotate --apply` si hace falta → `docs:context-check:strict` → commit.

> El ops-worker que queda con GIT_SHA rezagado tras el release **no es drift** — ver §4.1 (change-gate `deploy_needed=false` cuando el código de worker no cambió).

### 2.4. Camino recomendado: pre-emptar los 3 gotchas ANTES del PR (verificado 2026-08-06)

Los gotchas de §2.3 no hay que sufrirlos: hay que **pre-emptarlos**. El release
del 2026-08-06 (`70e912056273d0a30e2aa8dacc2f4e62076e3b44`, run `31058032196`,
PR #177, 355 commits / 221 archivos de código / 14 migraciones) fue el primero
del ledger que **pasó a la primera, sin `bypass_preflight_reason` y sin retry**,
con `drift_count=0` en el watchdog. Lo que cambió no fue el batch: fue el orden.

Esta es la secuencia recomendada. Cada bloque neutraliza un gotcha **antes** de
que llegue al control plane.

#### Paso A — Gotcha #1: merge canónico en `develop` ANTES de crear el PR

```bash
date -u +%Y-%m-%dT%H:%M:%SZ          # ancla del timer agente E2E (ver §0)
git status --short                    # árbol limpio; el checkout es compartido
git fetch origin

git switch develop
git merge origin/main -X ours --no-edit
```

`develop` es autoritativo: contiene todo `main` por construcción, porque los
squash de `main` son DE commits de `develop`. `-X ours` resuelve los conflictos
de contenido a favor de `develop` **automáticamente**, pero **no** resuelve los
conflictos `modify/delete`: esos quedan detenidos y hay que decidirlos a mano.

**Caso real 2026-08-06 (modify/delete):** `TASK-1590` estaba **borrada** en
`develop` (se había movido de `to-do/` a `in-progress/`) y **modificada** en
`main`. Git no puede elegir solo. La resolución correcta conserva el estado de
`develop` — borrar la copia que `main` quiere resucitar:

```bash
git status --short | grep '^DU\|^UD'          # listar los modify/delete
git rm docs/tasks/to-do/TASK-1590-*.md        # develop manda: la task ya migró
git commit --no-edit
```

**Verificación dura — las dos deben salir vacías antes de pushear:**

```bash
git log origin/main --not HEAD --oneline                        # main ⊆ develop
git diff HEAD@{1} HEAD -- src/ scripts/ services/ migrations/   # 0 código movido
```

La primera prueba que no dejaste nada de `main` fuera; la segunda prueba que el
merge fue **documental**, no que `-X ours` te comió código de producción. Recién
ahí:

```bash
git push origin develop     # → el PR develop→main queda MERGEABLE
```

Bonus: avanza la merge-base y reduce la divergencia del próximo release.
**NUNCA** cherry-pick a `main` para evitar el conflicto (duplica SHAs).

#### Paso B — Gotcha #2: marker `[release-coupled: …]` sólo si el acoplamiento es REAL

> **Delta 2026-08-08 (ISSUE-114 resuelta).** Este paso nació cuando el classifier
> inflaba el batch con diff *three-dot*. Ya usa **two-dot**, así que **los dominios
> que reporta ahora son reales**. El marker volvió a significar lo que decía:
> *"estos dominios conviven a propósito"*. **No lo pongas para silenciar al gate** —
> si no puedes nombrar el acoplamiento en una frase, el batch se parte (§2.2).
>
> Antes de escribirlo, corre el preflight local y mira qué dominios quedan:
>
> ```bash
> pnpm release:preflight --target-sha=$(git rev-parse develop) --target-branch=main
> ```
>
> Un solo dominio irreversible (típico: `db_migrations` acopladas a su consumer
> directo) **no** es un acoplamiento que declarar — es un release de migración
> normal, que el operador reconoce conscientemente.

Cuando el acoplamiento sí existe, se declara en el **cuerpo del commit de squash**,
que es lo que el classifier del orquestador lee — nunca con `bypass_preflight_reason`.

```bash
pnpm release:preflight --target-sha=$(git rev-parse develop) --target-branch=main

gh pr create --base main --head develop \
  --title "release: promote develop to production" --body "<scope del batch>"

gh pr merge <pr> --squash --body "$(cat <<'EOF'
[release-coupled: batch periódico develop→main; los dominios mezclados son
acumulación de una semana de trabajo independiente y ya verde, no un
acoplamiento de diseño. Rollback = revertir el squash.]
EOF
)"
```

El marker debe explicar **por qué los dominios conviven**, no pedir permiso. Con
él, el preflight del orquestador pasó `ship` sin bypass. Si la razón honesta es
"son cambios acoplados de verdad y no sé explicar el rollback en una frase",
entonces el batch **sí** hay que partirlo (§2.2), no marcarlo.

#### Paso C — Gotcha #3: disparar el smoke sobre `main`, no bypassearlo

`playwright_smoke` no existe para el SHA de squash. La alternativa **honesta** al
bypass es producir el check de verdad:

```bash
gh workflow run playwright.yml --ref main
gh run list --workflow=playwright.yml --branch main --limit 1
```

El 2026-08-06 tardó **3m10s** (run `31057847351`) y quedó verde sobre el SHA de
`main`. Ese es el costo total de no bypassear nada. Usa
`bypass_preflight_reason` sólo si el smoke **falla por infraestructura** y el
operador lo autoriza explícitamente — nunca por ahorrarse 3 minutos.

#### Paso D — Esperar la evidencia del SHA exacto antes del dispatch

Todos verdes **para el SHA de `main`**, no para el de `develop`:

- `CI` → `completed/success`
- `CI Deep Verification` → `completed/success`
- Vercel Production → `Ready` y **aliased** al custom domain
- el smoke recién disparado del Paso C

```bash
SHA=$(git rev-parse origin/main)
gh run list --branch main --commit "$SHA" --limit 10 \
  --json name,status,conclusion --jq '.[] | "\(.name)\t\(.status)/\(.conclusion)"'
vercel ls greenhouse-eo --environment=production --scope efeonce-7670142f
```

**Piso duro: no dispatchar antes de 8 min desde el push a `main`** (Vercel
`BUILDING` race). El 2026-08-06: push `23:32Z`, dispatch `23:56:03Z` → **24 min**,
holgado. El workflow cerró en 10m51s (`23:56:03Z`→`00:06:54Z`) con el manifest
`released`.

#### Paso E — Aprobar los gates poleando `pending_deployments`, no `run.status`

El entorno `production` se pide **dos veces** (§3 y gotcha #6 de la skill). Polea
`pending_deployments` en loop desde el arranque: el 2026-08-06 el primer gate
apareció a los ~2m45s del arranque y se aprobó ahí mismo; el run cerró sin stall.
Los jobs Azure terminaron en `Skip Bicep deploy (no diff)` + `skipped`, que es el
no-op esperado (§4.1), no una falla.

```bash
gh api "repos/efeoncepro/greenhouse-eo/actions/runs/<run_id>/pending_deployments" \
  --jq '.[] | {env:.environment.name, id:.environment.id, canApprove:.current_user_can_approve}'
```

#### Paso F — Post-release: flags nuevos exigen redeploy, no sólo `env add`

Vercel **congela las env vars al crear el build**: un flag agregado después del
build productivo del release no existe para el runtime hasta que hay un
deployment nuevo. El 2026-08-06, `GROWTH_SEO_ENABLED=true` en Production requirió
redeploy explícito (`dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`) para quedar vivo. Si el
flag se puede prender **antes** del merge del PR, el build del release lo hornea
y ahorras el redeploy. Y recuerda que prender un flag es **multi-runtime**: mapea
dónde se lee antes de tocar nada (§4 check #6 + `FEATURE_FLAG_STATE_LEDGER.md`).

## 3. Approval del environment Production

En el flujo canonico se aprueba el job `approval-gate` del workflow
`Production Release Orchestrator`. Despues de esa aprobacion, el orquestador
coordina en paralelo los deploys que corresponden y registra el estado en
`greenhouse_sync.release_manifests`.

**Workflows que requieren approval del environment `Production`** (allowlist canónica):

- `Ops Worker Deploy`
- `Commercial Cost Worker Deploy`
- `ICO Batch Worker Deploy`
- `HubSpot Greenhouse Integration Deploy`
- `Azure Teams Deploy`
- `Azure Teams Bot Deploy`

Estos workflows individuales siguen protegidos porque pueden ejecutarse por
`workflow_dispatch` en escenarios break-glass y por `workflow_call` desde el
orquestador. Si aparece un run individual esperando approval para production,
tratarlo como break-glass o drift operacional: NO asumir que reemplaza el
orquestador. Validar primero si hay un run `Production Release Orchestrator`
activo para el mismo `target_sha`.

En el orquestador normal puede haber mas de un approval visible: primero el
gate `Production Release Orchestrator` y despues jobs gated invocados desde el
mismo run (por ejemplo Azure). Aprobarlos solo si pertenecen al run activo y al
`target_sha` esperado. No aprobar approvals obsoletos solo porque el nombre del
workflow parece relacionado.

Approval desde GitHub UI:

```
Repo → Actions → <Workflow> → <Run> → Review pending deployments → Approve & deploy
```

**⚠️ Crítico**: NO aprobar runs viejos (>24h). Si hay runs antiguos waiting, **cancelar primero**:

```bash
gh run list --status waiting --workflow=<name>
gh run cancel <stale_run_id>
```

Reason: el concurrency fix Opcion A (TASK-848 Slice 3) cancela pending nuevos cuando se aprueba runs stale. Runs en `waiting` por > 24h son detectados por reliability signal `platform.release.stale_approval`.

## 4. Post-deploy verification

| # | Check | Cómo verificar |
|---|---|---|
| 1 | Vercel production Ready | `vercel ls greenhouse-eo --environment=production` |
| 2 | Cloud Run workers Ready | `gcloud run services list --project=efeonce-group --region=us-east4` — todos Ready=True |
| 3 | Sentry sin nuevos errors | Sentry UI filter `release:<sha>` últimos 30min |
| 4 | Smoke flows críticos | Browser real: login, `/finance/cash-out`, `/agency/operations`, `/admin/operations` |
| 5 | Reliability signals OK | `/admin/operations` subsystem `Platform Release` debe estar OK |
| 6 | **Flags pendientes de prender** | Revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` → **§ Pendientes de acción**: ¿hay flags `*_ENABLED` code-complete cuyo flip estaba gated a este release? Si sí, `vercel env add <FLAG>=true Production` (+ ops-worker si aplica) + redeploy + smoke del flujo + actualizar la fila del ledger. **El deploy del código NO prende los flags** (default OFF); olvidarlo deja la feature invisible en prod (deuda cognitiva). |
| 7 | Watchdog sin drift real | `GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json` debe quedar `aggregateSeverity: ok`; workers esperados: `ops-worker`, `commercial-cost-worker`, `ico-batch-worker`, `hubspot-greenhouse-integration`. Excepcion V1: si solo `ops-worker` reporta drift pero el diff runtime Cloud Run SHA → target es vacio y `deploy_needed=false`, documentar residual de label y no redeployar. Desde el fix de `6f7e246ea` el watchdog ya devuelve `drift_count=0` y explica el residual change-gated en su `detail` — ver §4.1.1. |
| 8 | Timing ledger actualizado | Agregar/actualizar fila en `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` con agente, fecha, release ID, run ID, SHA, **tiempo agente E2E** (principal), subtiempos técnicos, desglose por fase, bloqueo principal y aprendizaje. |

### 4.1. Leccion TASK-1328: skip esperado vs drift real

No cerrar un release por intuicion de logs. Hay tres casos distintos:

| Caso | Interpretacion | Cierre permitido |
|---|---|---|
| Azure job dice `no_infra_diff` / `no diff` | Skip esperado: el workflow hizo health/gating y no aplico Bicep porque no habia cambios infra. | Si el job termina `success` y no hay health failure. |
| Worker job dice que no redeploya por runtime-equivalente | Skip esperado solo si el diff de rutas runtime entre el SHA servido y el `target_sha` es vacío. Caso tipico: `ops-worker` change-gated. | Si `Ready=True`, el diff runtime es vacío y queda documentado como residual de label, aunque el watchdog V1 siga marcando drift. |
| Watchdog reporta `worker_revision_drift` con `drift_count > 0` | Drift confirmado: existe un SHA comparable y no coincide. | No; recuperar drift y re-ejecutar watchdog. |
| Watchdog reporta `data_missing` con `drift_count = 0` | Evidencia insuficiente: puede ser `gcloud` ausente/expirado o una consulta Cloud Run fallida. No prueba drift. | No cerrar aun; restaurar autenticacion o usar logs/evidencia autenticada, sin redeploy automatico. |

Checklist concreto cuando el operador pregunta si un worker "se skippeo":

```bash
GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json

# Estado + GIT_SHA de los 4 workers, uno por línea. Con --expected-sha marca los que
# difieren (que NO es lo mismo que drift: ver la tabla de arriba).
pnpm release:workers --expected-sha=<target_sha>
```

**Por qué acá va un wrapper y no `gcloud` crudo (TASK-1676).** En el release del
2026-08-08/09 fallaron **tres** comandos copiados de esta documentación:
`vercel ls --target=` (el flag pasó a `--environment` en el CLI 50.x), un
`gcloud run services describe --format="value(...filter(...))"` que empezó a crashear
(`TransformFilter() takes 2 positional arguments but 3 were given`), y un
`vercel redeploy` que no hace lo que la doc prometía. **Ninguno de los comandos
envueltos en `pnpm` falló.** Un wrapper es un lugar donde el cambio de una herramienta
se arregla una vez y el uso diario lo ejercita; un snippet en markdown es un fósil que
nadie corre hasta que hay un incidente — y ahí el operador no puede distinguir
"comando viejo" de "sistema roto".

Regla: **si `pnpm release:workers` falla por flags, la herramienta cambió — se corrige
el wrapper, no cada bloque de la doc.** El `gcloud` crudo queda como último recurso
cuando hay que inspeccionar algo que el wrapper no proyecta:

```bash
# Último recurso — inspección ad hoc de un servicio puntual.
gcloud run services describe ico-batch-worker \
  --project=efeonce-group --region=us-east4 --format=json
```

Interpretacion:

- `data_missing` con `drift_count=0` es un warning de observabilidad, no drift. Si la sesion local de `gcloud` esta ausente o expirada, reautenticar o consultar los logs del job del orquestador antes de decidir. No redeployar para corregir una falta de evidencia.
- `ico-batch-worker` con deploy job ejecutado, health OK, `Ready=True` y watchdog synced = NO fue skippeado.
- `ops-worker` con workflow que salta deploy por diff runtime y `GIT_SHA` viejo puede ser cierre valido si la comparacion de rutas runtime demuestra que el servicio servido es equivalente al target. No forzar redeploy solo para alinear el label.
- La recuperacion canonica para drift real es rerun del orquestador para el mismo `target_sha`; si el orquestador esta bloqueado, usar workflow individual como break-glass aprobado. Direct `gcloud run deploy` local es ultimo recurso break-glass y debe quedar documentado con target SHA, revision, verificacion y watchdog final.

### 4.1.1. Excepcion conocida: `ops-worker` change-gated

`ops-worker` puede conservar en Cloud Run un `GIT_SHA` anterior aunque el
release sea runtime-equivalente. Antes de re-disparar workflows individuales,
comparar el SHA servido por Cloud Run contra el target del release solo en las
rutas runtime del worker:

```bash
git diff --name-only <cloud_run_git_sha> <release_target_sha> -- \
  package.json pnpm-lock.yaml tsconfig.json \
  services/ops-worker scripts/ops-worker src/lib/ops src/lib/release
```

Si el comando no devuelve archivos, el workflow summary indica
`deploy_needed=false`, Cloud Run esta `Ready=True` y el resto del release esta
verde, tratarlo como **residual de label por change-gate**, no como incidente.
Documentar el hallazgo en `Handoff.md` y no gastar otra corrida para empujar una
revision identica.

**Delta 2026-08-06 — el watchdog ya lo clasifica bien.** Hasta el release
`503186d7147a` (2026-07-17), el watchdog reportaba este residual como
`severity=error` por comparación mecánica de SHA, sin el contexto del
change-gate, y cada agente tenía que refutarlo a mano con el `git diff` de
arriba. El fix vive en el commit `6f7e246ea` de `main`: en el release
`70e912056273` el `ops-worker` quedó en `558558263e80` (un SHA de `develop` del
mismo día) y el watchdog reportó **`drift_count=0`**, explicando el residual en
su propio `detail` (`change-gated — rutas runtime sin cambios`). Consecuencia
operativa: si hoy ves `severity=error` por `ops-worker` con diff runtime vacío,
**no es el falso positivo histórico** — revisa que estés corriendo el reader del
`main` actual antes de asumirlo benigno. El `git diff` de arriba sigue siendo la
verificación que manda.

### 4.1.2. Transition final en cola tras runtime verde

Si `transition-released` queda queued o sin runner despues de que workers,
Vercel READY, health y smoke productivo ya estan verdes, no editar
`greenhouse_sync.release_manifests` por SQL. Opciones:

1. Esperar si el runner avanza dentro de la ventana normal.
2. Cancelar el run obsoleto si GitHub Actions quedo atascado.
3. Con aprobacion explicita del operador, cerrar por el CLI canonico:

```bash
pnpm release:orchestrator-transition-state \
  --release-id=<release_id> \
  --to-state=released \
  --reason="Runtime verified green; GitHub transition job queued/stale"
```

Esa ruta es contingencia documentada, no parche: conserva state machine, audit
row y outbox. Registrar run ID, release ID, motivo y evidencias de salud.

### 4.2. HubSpot drift recovery

Si `platform.release.worker_revision_drift` reporta solo
`hubspot-greenhouse-integration` drifted y el `target_sha` del ultimo release en
`greenhouse_sync.release_manifests` ya fue verificado, primero preferir un
rerun de `production-release.yml` para ese SHA. Usar el workflow individual del
bridge solo como break-glass aprobado si el orquestador esta bloqueado:

```bash
gh workflow run hubspot-greenhouse-integration-deploy.yml \
  --ref main \
  -f environment=production \
  -f expected_sha=<release target_sha> \
  -f skip_tests=false
```

Luego verificar:

```bash
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/contract
GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json
```

Steady state esperado: `drift_count=0` y `4/4 workers synced`.

Hard rules:

- No editar `greenhouse_sync.release_manifests` por SQL para "arreglar" drift.
- No reintroducir production deploy por `push:main` en workers.
- No usar `skip_tests=true` salvo break-glass aprobado y documentado en `Handoff.md`.
- No tocar rutas, payloads, webhooks ni secretos del bridge si el problema es solo revision drift.

## 5. Rollback automatizado (Vercel + Cloud Run)

Si post-deploy verification falla, ejecutar rollback. Capability requerida: `platform.release.rollback` (EFEONCE_ADMIN solo).

### 5.1. Identificar release a hacer rollback

```bash
# Última fila de release_manifests para target_branch=main:
psql -c "SELECT release_id, target_sha, vercel_deployment_url, previous_vercel_deployment_url, previous_worker_revisions FROM greenhouse_sync.release_manifests WHERE target_branch='main' ORDER BY started_at DESC LIMIT 1"
```

Anotar:
- `release_id` (formato `<short_sha>-<uuid>`)
- `previous_vercel_deployment_url`
- Cada revision de `previous_worker_revisions` JSONB

### 5.2. Exportar env vars

```bash
export PREV_VERCEL_URL='https://greenhouse-eo-<previous-deployment>.vercel.app'
export PREV_OPS_WORKER_REVISION='ops-worker-00174-abc'
export PREV_COMMERCIAL_COST_WORKER_REVISION='commercial-cost-worker-00098-xyz'
export PREV_ICO_BATCH_WORKER_REVISION='ico-batch-worker-00045-def'
export PREV_HUBSPOT_INTEGRATION_REVISION='hubspot-greenhouse-integration-00067-ghi'
```

### 5.3. Dry-run primero

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/release/production-rollback.ts \
  --release-id=<release_id> \
  --reason="Release degraded: post-release health check fallo en /finance/cash-out con 5xx" \
  --dry-run
```

Verificar el plan emitido. Si es correcto, re-correr SIN `--dry-run`.

### 5.4. Apply rollback

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/release/production-rollback.ts \
  --release-id=<release_id> \
  --reason="Release degraded: post-release health check fallo en /finance/cash-out con 5xx"
```

El CLI:

1. Vercel alias swap: `vercel alias set <PREV_VERCEL_URL> greenhouse.efeoncepro.com`
2. Cloud Run workers traffic split: per worker, `gcloud run services update-traffic ... --to-revisions=<prev>=100`
3. HubSpot integration mismo patron

### 5.5. Post-rollback verification

Mismo checklist sec. 4 pero contra el deployment previo. Esperar 2-3 min para que tráfico se estabilice.

## 6. Rollback manual de Azure config / Bicep (V1 manual)

**⚠️ Azure NO tiene rollback automatizado V1**. Reapply de Bicep templates puede ser destructivo (e.g. delete-on-deletion, federated credential rotation, App Service config reset).

Procedimiento:

1. **Identificar Bicep deployment previo**:
   ```bash
   az deployment group list \
     --resource-group greenhouse-prod \
     --query "[?provisioningState=='Succeeded'] | sort_by(@, &timestamp) | reverse(@) | [0:5].{name:name, timestamp:timestamp, deployment:properties.templateLink.uri}"
   ```

2. **Verificar template previo en repo**:
   ```bash
   git log --oneline infra/azure/<service>/main.bicep | head -10
   git show <previous_commit>:infra/azure/<service>/main.bicep
   ```

3. **Dry-run with what-if**:
   ```bash
   az deployment group what-if \
     --resource-group greenhouse-prod \
     --template-file infra/azure/<service>/main.bicep \
     --parameters @infra/azure/<service>/main.parameters.json
   ```

4. **Apply solo si what-if NO muestra deletes** o solo muestra updates esperados:
   ```bash
   az deployment group create \
     --resource-group greenhouse-prod \
     --template-file infra/azure/<service>/main.bicep \
     --parameters @infra/azure/<service>/main.parameters.json
   ```

5. **Verificar funcionalidad post-apply**: smoke test del Teams Bot + Logic Apps + Notifications.

### 6.1. Azure infra release gating (TASK-853, automatizado en orquestador)

A partir de TASK-853 SHIPPED 2026-05-10, los 2 Azure workflows (`azure-teams-deploy.yml` + `azure-teams-bot-deploy.yml`) operan en gating mode automatico cuando se invocan desde el orquestador `production-release.yml`:

- **Health check Azure (preflight-style)** corre SIEMPRE: WIF login + provider register + RG ensure. Si WIF roto o providers no registrados, el job falla loud antes de tocar Bicep.
- **Bicep apply real** corre solo cuando:
  - `force_infra_deploy=true` en el dispatch del orquestador (operator override explicito), O
  - Diff detectado en `infra/azure/<sub>/**` entre `origin/main~1` y el `target_sha` del release (auto detection)
- **Skip silencioso NO**: el workflow agrega annotation `::notice::` + entry en `GITHUB_STEP_SUMMARY` con la razon del skip (`force_infra_deploy=true` | `push_path_filter_matched` | `infra_diff_detected` | `no_infra_diff`).

Ejemplo de invocacion via orquestador:

```bash
gh workflow run production-release.yml \
  -f target_sha=<sha> \
  -f force_infra_deploy=false   # default; Bicep solo si diff detectado
```

Force apply (e.g. cuando un Bicep template cambio sin diff de paths trivial):

```bash
gh workflow run production-release.yml \
  -f target_sha=<sha> \
  -f force_infra_deploy=true
```

### 6.2. WIF subjects canonicos Azure

Federated credential del Azure AD App Registration (tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4`) acepta los siguientes subjects desde el repo `efeoncepro/greenhouse-eo`:

- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main` (deploys auto via push:main)
- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/develop` (staging)
- `repo:efeoncepro/greenhouse-eo:environment:production` (cuando workflow declara `environment: production`)

Verificar via:

```bash
az ad app federated-credential list --id <AZURE_CLIENT_ID> -o table
```

Si emerge un subject nuevo (e.g. nuevo workflow, nuevo branch), agregar via:

```bash
az ad app federated-credential create --id <AZURE_CLIENT_ID> --parameters '{
  "name": "gh-actions-<descriptor>",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:efeoncepro/greenhouse-eo:<subject>",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

### 6.3. Rollback automatizado Azure (V2 contingente)

Azure NO tiene rollback automatico V1 porque:

- Bicep templates pueden contener `delete-on-deletion` semantics
- Federated credentials rotation puede dejar el WIF sin acceso temporalmente
- App Service config reset puede invalidar webhooks externos

V2 contingente (cuando emerja necesidad):

- `az deployment group what-if` mandatory antes de cualquier apply
- Restoration desde Bicep template del commit previo (`git show <prev>:infra/azure/<sub>/main.bicep`)
- Smoke test obligatorio post-restore (Teams Bot + Logic Apps healthy)
- Out of scope para TASK-853; queda como follow-up cuando el orquestador acumule incident data suficiente para justificarlo.

## 7. Decision tree: rollback vs forward-fix vs incident mode bypass

```text
                          ┌────────────────────────┐
                          │  Release degraded?     │
                          └───────────┬────────────┘
                                      ▼
                  ┌───────────────────────────────────┐
                  │ Severity de impacto en producción │
                  └─────┬─────────┬───────────┬───────┘
                        │         │           │
                  CRÍTICO    DEGRADED   MENOR
                  (5xx,      (slow,    (typo,
                   datos     algunas   estilo,
                   corruptos) features  copy)
                  perdidos)   afectadas
                        │         │           │
                        ▼         ▼           ▼
                ┌──────────┐ ┌────────┐ ┌──────────┐
                │ ROLLBACK │ │FORWARD │ │FORWARD   │
                │ INMEDIATO│ │FIX     │ │FIX next  │
                │ (sec. 5) │ │ASAP    │ │release   │
                │          │ │(<2h)   │ │ciclo     │
                └──────────┘ └────────┘ └──────────┘
```

### 7.1. Cuándo usar `bypass_preflight`

NUNCA en operación normal. Solo en:

- **Incident mode** activo confirmado (P0/P1 incident reported)
- Operador con capability `platform.release.bypass_preflight` (EFEONCE_ADMIN solo)
- Reason >= 20 chars en formato: `"Bypass preflight: <incidente> + post-mortem TBD <fecha>"`
- Audit row escrita automáticamente

## 8. Reliability signals operativos

Visitar [`/admin/operations`](https://greenhouse.efeoncepro.com/admin/operations) subsystem **Platform Release**:

| Signal | Steady | Cuándo alerta |
|---|---|---|
| `platform.release.stale_approval` | 0 | Runs production "waiting" > 24h |
| `platform.release.pending_without_jobs` | 0 | Runs en queued/in_progress > 5min con jobs:[] |
| `platform.release.deploy_duration_p95` (V1.1) | <30min | p95 release > 30min sostenido |
| `platform.release.last_status` (V1.1) | `released` | Último release `degraded\|aborted\|rolled_back` |
| `platform.release.github_webhook_unmatched` (V1.2) | 0 | Webhooks GitHub release `unmatched`/`failed` en 24h |

Si **stale_approval** o **pending_without_jobs** > 0:
1. `gh run list --status waiting --status queued` para identificar runs
2. Cancelar runs antiguos: `gh run cancel <id>`
3. Re-correr el deploy si fue cancelado en cascada

## 9. Configuración requerida (one-time)

### 9.1. GitHub Personal Access Token para reliability signals

Para que los 2 signals nuevos consulten GitHub API, configurar `GITHUB_RELEASE_OBSERVER_TOKEN` en Vercel env vars:

```bash
# Token con scopes: actions:read, deployments:read
gh auth token | vercel env add GITHUB_RELEASE_OBSERVER_TOKEN production
```

Si no se configura, los signals quedan en `severity='unknown'` con summary explicativo (degraded mode honesto).

### 9.2. WIF subjects para production environment

Verificar y documentar en Sec 2.1.

### 9.3. GitHub release webhook

Configurar un repository webhook en `efeoncepro/greenhouse-eo`:

- Payload URL: `https://greenhouse.efeoncepro.com/api/webhooks/github/release-events`
- Content type: `application/json`
- Secret: mismo valor que `GITHUB_RELEASE_WEBHOOK_SECRET` en Vercel/Secret Manager.
- Events: `workflow_run`, `workflow_job`, `deployment_status`, `check_suite`, `check_run`.
- Active: enabled.

Validación operativa:

```bash
pnpm pg:connect -- -c "SELECT processing_status, count(*) FROM greenhouse_sync.github_release_webhook_events WHERE received_at >= now() - interval '24 hours' GROUP BY 1"
```

Regla: `unmatched` debe investigarse, pero no muta releases. `failed` sí es incidente de ingestion/reconciliation porque GitHub va a reintentar y puede bloquear evidencia near-real-time.

## 10. Hard rules (anti-regresión)

- **NUNCA** aprobar runs production "waiting" > 24h. Cancelar primero.
- **NUNCA** ejecutar rollback sin pasar por `production-rollback.ts` (idempotente, audit-safe).
- **NUNCA** usar `bypass_preflight` fuera de incident mode con post-mortem comprometido.
- **NUNCA** rollback manual de Azure Bicep sin `what-if` previo.
- **NUNCA** asumir que un worker o Azure "skippeo" sin leer el job summary/log y sin verificar Cloud Run `Ready=True` + `GIT_SHA` o watchdog OK. Azure `no_infra_diff` puede ser skip esperado; worker drift nunca es cierre.
- **SIEMPRE** anotar rollback en `Handoff.md` con razón + post-mortem trigger.
- **SIEMPRE** verificar reliability signals OK antes Y después de release.
- **SIEMPRE** revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (**§ Pendientes de acción**) al planear y al cerrar un paso a producción: hay features `code-complete` cuyo flag default-OFF debe **prenderse en prod junto a este release** (a veces + migración/ops-worker). El deploy del código no los activa; saber qué prender se lee del ledger, no de la memoria. Tras prender, actualizar la fila del ledger (snapshot por environment).

## 11. Referencias

- Spec: [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- Tabla: `greenhouse_sync.release_manifests` (manifest persistido)
- Tabla: `greenhouse_sync.release_state_transitions` (audit append-only)
- Tabla: `greenhouse_sync.github_release_webhook_events` (ledger GitHub release webhooks redacted)
- CLI: [scripts/release/production-rollback.ts](../../../scripts/release/production-rollback.ts)
- Reliability: [src/lib/reliability/queries/release-stale-approval.ts](../../../src/lib/reliability/queries/release-stale-approval.ts), [release-pending-without-jobs.ts](../../../src/lib/reliability/queries/release-pending-without-jobs.ts)
- Workflows fix Opcion A: `.github/workflows/{ops-worker,commercial-cost-worker,ico-batch}-deploy.yml`
- Capabilities: `platform.release.execute`, `platform.release.rollback`, `platform.release.bypass_preflight`

## Release control plane shipped scope

V1 entrego foundation + concurrency fix + rollback CLI. V1.1 completo el camino
canonico de release:

- **TASK-850 SHIPPED** Production Preflight CLI completo (12 checks, WIF subjects + GH API blockers + batch policy).
- **TASK-851 SHIPPED** `production-release.yml` workflow orchestrator (state machine + manifest writes automaticos).
- **TASK-852 compactado en TASK-851** Worker SHA verification (`expected_sha` + Ready=True polling).
- **TASK-853 SHIPPED** Azure infra release gating (Bicep diff detector + manual rollback runbook ampliado).
- **TASK-854 SHIPPED** 2 signals adicionales (`deploy_duration_p95` + `last_status`) + dashboard `/admin/releases`.
