> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-11 por Codex
> **Documentacion tecnica:** [CLAUDE.md §Production Preflight CLI invariants (TASK-850)](../../../CLAUDE.md), [Spec TASK-850](../../tasks/in-progress/TASK-850-production-preflight-cli-complete.md), [Runbook production-release.md §11](../../operations/runbooks/production-release.md)

# Production Preflight CLI

## Para que sirve

Antes de promover el codigo de `develop` a `main` (production), `pnpm release:preflight` ejecuta 12 checks fail-fast en paralelo y te dice si es seguro avanzar. Cada check verifica una pieza distinta del sistema (GitHub Actions, Vercel, Postgres, GCP, Azure, Sentry, batch policy del diff) y reporta severity `ok | warning | error | unknown`. Al final el CLI te entrega un **`readyToDeploy: SI | NO`** que es la senal canonica para decidir.

Es el complemento del watchdog (TASK-849): el watchdog detecta blockers en runtime cada 30 min; el preflight es lo que ejecutas tu ANTES de disparar el release.

## Antes de empezar

- Estar en checkout local con `origin/main` actualizado (`git fetch origin`).
- Tener Cloud SQL Proxy disponible (el script `pg-doctor` y `pg-connect:status` lo levantan auto).
- Tener autenticadas las CLIs que vas a usar (todas opcionales — degradadas honestas):
  - **GitHub App** instalada (App ID `3665723`, Installation ID `131127026`) — recomendado canonico
  - **`gcloud`** auth + ADC (`gcloud auth login` + `gcloud auth application-default login`)
  - **`az login`** si tienes acceso al Azure tenant
  - Vars de entorno opcionales en `.env.local`: `VERCEL_TOKEN`, `SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF` o `SENTRY_AUTH_TOKEN`, `AZURE_GITHUB_ACTIONS_APP_ID`

Si una CLI/token falta, el check correspondiente reporta `severity=unknown`/`status=not_configured`, baja la `confidence` y deja `readyToDeploy: NO`. En el orquestador, eso bloquea production hasta recuperar visibilidad.

## Paso a paso

### 1) Run basico (exploratory)

```bash
pnpm release:preflight
```

Te muestra los 12 checks en orden con icons:

- ✓ ok
- ⚠ warning
- ✗ error
- ? unknown

Y un overall status final:

- ✓ READY → todo verde, deploy seguro
- ⚠ DEGRADED → algun check con warning; revisar antes de avanzar
- ✗ BLOCKED → algun check con error; NO avanzar
- ? UNKNOWN → checks degradados, faltan tokens

### 2) Run en CI / orchestrator workflow

```bash
pnpm release:preflight --json --fail-on-error
```

- `--json` → output machine-readable (ProductionPreflightV1 v1)
- `--fail-on-error` → exit 1 si `readyToDeploy=false` → `DEGRADED`, `UNKNOWN` y `BLOCKED` frenan production

### 3) Run apuntando a otro SHA o branch

```bash
pnpm release:preflight --target-sha=<sha> --target-branch=main
```

Por default toma git HEAD vs main. Util para validar un SHA puntual antes de mergear.

### 4) Override batch policy (break-glass)

```bash
pnpm release:preflight --override-batch-policy --fail-on-error
```

Solo cuando el check `release_batch_policy` reporta `requires_break_glass` (e.g. release legitimo que mezcla auth_access + cloud_release con dependencia documentada). Requiere capability `platform.release.preflight.override_batch_policy` (EFEONCE_ADMIN solo) + audit row con reason >= 20 chars. Downgrade error → warning, NO blocker.

## Que significan los estados

### Overall status

| Status | Significa | Que hacer |
|---|---|---|
| ✓ READY | Todos los 12 checks ok, sin degraded sources | Avanzar con el release |
| ⚠ DEGRADED | Algun check warning, ningun error | NO avanzar production; resolver o justificar via break-glass documentado |
| ✗ BLOCKED | Al menos un check con error | NO avanzar; resolver el error y re-run |
| ? UNKNOWN | Sin check ok suficientes para decidir | Configurar tokens faltantes y re-run |

### Severity por check

- **`ok`**: el check paso. Verde.
- **`warning`**: hay una observacion (e.g. CI corriendo, smoke aun pending, Vercel staging not READY). En production normal bloquea porque `readyToDeploy=false`.
- **`error`**: hay un blocker (e.g. CI failure, pending sin jobs, Sentry critical >=10, migrations pendientes). Bloquea.
- **`unknown`**: no se pudo verificar (e.g. no token, API down). Baja confidence y bloquea production normal hasta recuperar evidencia.

### Decisions del check release_batch_policy

- `ship` → diff seguro, deploy ok
- `split_batch` → mezcla dominios sensibles independientes (e.g. payroll + finance) sin documentar acoplamiento. Dividir en 2 releases separados, o agregar marker `[release-coupled: <razon>]` en el commit body.
- `requires_break_glass` → tocas dominio irreversible (db_migrations, auth_access, payroll, finance, cloud_release). Necesitas capability + audit + `--override-batch-policy` flag.

## Que NO hacer

- **NUNCA** ignorar un check `error` y avanzar igual. Es exactamente lo que el incidente 2026-04-26 → 2026-05-09 hubiese evitado si hubiera existido.
- **NUNCA** correr con `--override-batch-policy` sin capability + audit. La idea es que solo el operador EFEONCE_ADMIN con justificacion documentada lo use.
- **NUNCA** asumir que `unknown` es seguro. Si Sentry esta down (`severity=unknown`), NO podemos verificar que production no este on fire. Conservador: trata unknown como "necesito mas info".
- **NUNCA** modificar `--target-branch` a algo que no sea `main` para ejecutar el release real. Otras branches son solo para exploratory testing.

## Problemas comunes

| Sintoma | Causa probable | Fix |
|---|---|---|
| `7 checks unknown` | Sin GitHub App + Vercel + Sentry + Azure tokens en local | Setup tokens en `.env.local` o usar GH App canonico |
| `target_sha_exists error` | SHA no existe o pull request aun no mergeado | `git fetch origin && git log <sha>` para verificar |
| `ci_green warning "aun corriendo"` | CI todavia en progreso | Esperar 5-10 min y re-run |
| `release_batch_policy split_batch` | Diff mezcla payroll + finance independientes | Dividir en 2 PRs separados, o agregar `[release-coupled: <razon>]` en commit body |
| `release_batch_policy requires_break_glass` | Tocas migrations, auth, payroll, finance, o cloud_release | Si es legitimo: `--override-batch-policy` con capability + audit |
| `pending_without_jobs error` | Hay zombie runs queued (sintoma deadlock TASK-848) | `gh run cancel <id>` para los runs zombie ANTES de re-run |
| `stale_approvals error >=7d` | Run waiting Production approval > 7 dias | `gh run cancel <id>` o aprobar |
| `vercel_readiness error` | Latest production deploy ERROR/BUILDING | Investigar Vercel logs; resolver antes de promover |
| `postgres_health error` | pg:doctor fallo | Verificar Cloud SQL Proxy + GCP ADC + secret rotation reciente |
| `postgres_migrations error` | Hay migrations pendientes | `pnpm pg:connect:migrate` para aplicarlas |
| `gcp_wif_subject error` | WIF provider drift attribute mapping | Reaplicar terraform/bicep que provisiona el WIF |
| `azure_wif_subject warning` | Azure App sin federated credential production | Agregar via Azure Portal con subject `repo:efeoncepro/greenhouse-eo:environment:production` |
| `sentry_critical_issues error >=10` | Production en fire mode | Resolver issues criticos ANTES de promover; el release nuevo solo agrega ruido |
| `sentry_critical_issues unknown` | Sentry API down | NO promover hasta que recuperes visibility |

## Referencias tecnicas

- Spec: [TASK-850](../../tasks/in-progress/TASK-850-production-preflight-cli-complete.md)
- Source code:
  - CLI: [scripts/release/production-preflight.ts](../../../scripts/release/production-preflight.ts)
  - Composer: [src/lib/release/preflight/composer.ts](../../../src/lib/release/preflight/composer.ts)
  - Runner: [src/lib/release/preflight/runner.ts](../../../src/lib/release/preflight/runner.ts)
  - Registry: [src/lib/release/preflight/registry.ts](../../../src/lib/release/preflight/registry.ts)
  - Checks: [src/lib/release/preflight/checks/](../../../src/lib/release/preflight/checks/)
  - Batch policy: [src/lib/release/preflight/batch-policy/](../../../src/lib/release/preflight/batch-policy/)
- Migration capabilities: `migrations/20260510144012098_task-850-preflight-capabilities.sql`
- CLAUDE.md §Production Preflight CLI invariants (TASK-850)
- Doc funcional: [release-preflight.md](../../documentation/plataforma/release-preflight.md)
- Runbook production-release: [production-release.md](../../operations/runbooks/production-release.md)
