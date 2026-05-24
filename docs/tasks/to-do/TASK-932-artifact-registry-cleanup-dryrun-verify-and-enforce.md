# TASK-932 — Artifact Registry cleanup: verificar dry-run + flip a enforced (gcr.io)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `ops`
- Epic: `optional`
- Status real: `Esperando segunda señal (GCP dry-run log)`
- Rank: `TBD`
- Domain: `ops|cloud|cost`
- Blocked by: `GCP dry-run evaluation timer (AR evalúa la policy en horas / hasta ~24h)`
- Branch: `optional (cambio es gcloud, no código — salvo ajuste del script)`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Cerrar el quick-win de costo de Artifact Registry detectado en la sesión 2026-05-24: la cleanup policy `keep-15 + >14d` ya está **seteada en dry-run** sobre el repo `gcr.io` (efeonce-group, location `us`) y **no borra nada**. Falta verificar la **segunda señal independiente** (la evaluación dry-run del propio GCP, que loggea a Cloud Logging qué borraría) y, con doble señal verde, pasar la policy a **enforced** (`--no-dry-run`). Libera ~128GB / ~$9-13/mo y queda recurrente (previene re-acumulación).

## Why This Task Exists

`gcr.io` acumuló **185GB** (635 versiones de los 4 worker images) en ~49 días por la velocidad de deploys (~13/día). Es ~$13/mo de storage puro. La policy keep-15 + >14d limpia el cruft preservando estructuralmente: la imagen live de cada worker (keep-15 → la sirviendo es la más nueva) + 14 días completos de rollback. Se siguió el procedimiento canónico GCP (dry-run → revisar logs → enforce) + defensa en profundidad de dos señales independientes porque el script de verificación es self-authored (tuvo 2 bugs corregidos el mismo día).

## Dependencies & Impact

### Depends on

- Policy dry-run ya aplicada (2026-05-24) sobre `gcr.io` location `us`.
- Script `scripts/cloud/verify-artifact-cleanup-dryrun.sh` (commit `831da41f` en develop).
- `gcloud` autenticado contra `efeonce-group` (ADC local — el sandbox remoto de `/schedule` NO sirve, sin credenciales GCP).
- TASK-930 (config coupling staging/prod del ops-worker) — relacionada solo porque los deploys de worker pushean estas imágenes; no bloqueante.

### Impacts

- Rollback de release (`production-rollback.ts` usa `--to-revisions`): la ventana queda en últimos 15 deploys + 14 días por worker (más que suficiente). Revisiones MUY viejas (>keep+14d) pierden su imagen — esperado.

### Files owned

- `scripts/cloud/verify-artifact-cleanup-dryrun.sh`
- `Handoff.md`
- `changelog.md`

## Scope

### Paso 1 — Verificar (read-only)

```bash
bash scripts/cloud/verify-artifact-cleanup-dryrun.sh
```

Confirmar:
- `cleanupPolicyDryRun = True`.
- **Señal 2 presente**: el paso 2 del script muestra logs de evaluación dry-run de AR (Cloud Logging). Si siguen vacíos, AR aún no evaluó → reintentar más tarde (NO flipear sin señal 2).
- **Hard gate = 0**: ningún digest sirviendo ahora cae en el set de borrado.
- Revisar el número informativo de revisiones históricas que pierden imagen (esperado, transparencia).

### Paso 2 — Flip a enforced (DESTRUCTIVO, requiere confirmación humana)

Solo si señal 1 (script SEGURO) **y** señal 2 (logs AR coinciden con la simulación) están verdes:

```bash
cat > /tmp/cleanup-policy.json <<'JSON'
[
  { "name": "keep-recent-15", "action": { "type": "Keep" }, "mostRecentVersions": { "keepCount": 15 } },
  { "name": "delete-older-than-14d", "action": { "type": "Delete" }, "condition": { "olderThan": "1209600s" } }
]
JSON
gcloud artifacts repositories set-cleanup-policies gcr.io \
  --location=us --project=efeonce-group \
  --policy=/tmp/cleanup-policy.json --no-dry-run
```

### Paso 3 — Verificar post-flip + cierre

- Confirmar `cleanupPolicyDryRun = False` y que los 4 workers siguen healthy (imagen live intacta, `/health` 200).
- Confirmar reducción de `Repository Size` de `gcr.io` (puede tardar en reflejarse).
- Actualizar `changelog.md` + `Handoff.md` con el ahorro real.

## Out of Scope

- Borrar imágenes a mano (`gcloud container images delete`) — usar la policy recurrente.
- Tocar los repos `cloud-run-source-deploy` / `gcf-artifacts` (separados, fuera de scope).
- Reducir KEEP_RECENT/KEEP_DAYS por debajo del margen seguro sin re-correr el script.

## Acceptance Criteria

- [ ] Script corrido con señal 2 (logs AR) presente y coincidente con la simulación.
- [ ] Hard gate = 0 confirmado.
- [ ] Policy en `--no-dry-run` (enforced) con `keep-15 + >14d`.
- [ ] 4 workers healthy post-flip (imagen live intacta).
- [ ] `changelog.md` + `Handoff.md` actualizados con ahorro real.

## Verification

- `bash scripts/cloud/verify-artifact-cleanup-dryrun.sh` → veredicto SEGURO + señal 2 presente.
- `gcloud artifacts repositories describe gcr.io --location=us --project=efeonce-group --format='value(cleanupPolicyDryRun)'` → `False` post-flip.
- Smoke `/health` de los 4 workers.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con ahorro real
- [ ] `changelog.md` actualizado
- [ ] `TASK_ID_REGISTRY.md` refleja lifecycle final

## Delta 2026-05-24

N/A — task creada 2026-05-24 como follow-up del dry-run de Artifact Registry (sesión de diagnóstico de costos GCP/Vercel). Rollback: si algo no convence, la policy vuelve a dry-run o se borra (`delete-cleanup-policies`).
