# ISSUE-107 — ops-worker path filter excluye src/lib/nubox → Nubox sync con código stale

> **Estado:** Resolved
> **Detectado:** 2026-06-22 (durante el release develop→main de TASK-1210)
> **Resuelto:** 2026-06-22
> **Ambiente:** Production (ops-worker Cloud Run, us-east4)
> **Severidad:** Media (no corrompe data; deja el worker con código stale silenciosamente)

## Síntoma

Durante el rollout de TASK-1210 (release develop→main `3a39c68ba`), tras prender los flags
MXN/CLF, el `worker_revision_drift` del watchdog quedó en **error**: el ops-worker servía
`GIT_SHA=1d0c731` ("chore: cut app runtime to node 24", TASK-845), no el SHA del release.
El deploy del orchestrator (`ops-worker-deploy.yml`, `expected_sha=3a39c68ba`) corrió "success"
pero **no creó revisión nueva** — detectó "worker runtime paths unchanged" y se salteó.

## Causa raíz

El ops-worker **corre el Nubox sync** (`/nubox/sync` diario 7:30 + `/nubox/quotes-hot-sync`
cada 15 min), que llama `upsertIncomeFromSale` (materialización de income, bundlea
`src/lib/nubox/**`). Pero el path filter de `.github/workflows/ops-worker-deploy.yml` —
en sus **3 listas** (`paths:` trigger, build-detection array, `WORKER_RUNTIME_PATHS` de la
drift-detection) — **NO incluía `src/lib/nubox/**`** (solo `sync`, `payroll`, `knowledge`,
`reliability`, `notion-metrics`, `integrations` + 2 archivos finance puntuales).

El skip-logic (`git diff --quiet EXPECTED_SHA..CURRENT_GIT_SHA -- WORKER_RUNTIME_PATHS`)
no veía el cambio a `src/lib/nubox/sync-nubox-to-postgres.ts` (el fix de native plane
backfill de TASK-1210, y antes los cambios de TASK-1209) → `deploy_needed=false` → skip →
worker stuck en código stale. El fix sistémico de TASK-1210 (native plane en la rama UPDATE)
**nunca llegó al worker** hasta esta corrección.

## Impacto

- El ops-worker corría `upsertIncomeFromSale` con código anterior al fix → para facturas
  foráneas (MXN export) ya proyectadas como CLP, el native plane no se backfilleaba en los
  syncs automáticos. **No corrompe data** (la rama UPDATE vieja deja `native_amount` como
  está; el backfill manual de Berel ya cubrió las 2 filas live).
- Clase de bug más amplia: cualquier cambio a `src/lib/nubox` (o partes de `src/lib/finance`
  que el worker bundlea) quedaba silenciosamente stale en producción.

## Solución

1. **Agregar `src/lib/nubox/**` a las 3 listas de paths** del `ops-worker-deploy.yml`
   (commit `9910c7ab4`, develop).
2. **Agregar los 8 flags MXN/CLF a `services/ops-worker/deploy.sh`** (`:-true`, persistente
   vs `--set-env-vars` destructivo).
3. **Redeploy break-glass del ops-worker** vía `gh workflow run ops-worker-deploy.yml --ref
   develop -f environment=production -f expected_sha=3a39c68ba` — con nubox ya en
   `WORKER_RUNTIME_PATHS`, la drift-detection forzó el rebuild → worker a `GIT_SHA=3a39c68ba`
   con el código nubox correcto + flags.

## Verificación

- ops-worker revisión activa `GIT_SHA=3a39c68ba0d6` (= release target).
- Flags `FINANCE_CORE_MXN_ENABLED`/`NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`/`FINANCE_CLF_*` = true.
- Watchdog `platform.release.worker_revision_drift` → **ok** ("4/4 workers synced"),
  aggregateSeverity = ok.

## Follow-up

- Auditar si otras partes de `src/lib/finance/**` que el worker bundlea (reactive consumers,
  account-balance materializers) deberían estar en el path filter — actualmente solo 2
  archivos finance puntuales están listados. Riesgo de la misma clase de staleness.
