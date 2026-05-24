# TASK-933 — Secret Manager: destruir versiones Frame.io desactivadas + fix destroy-on-rotate

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `ops`
- Epic: `optional`
- Status real: `75 versiones desactivadas (reversible); pendiente grace + destroy irreversible`
- Rank: `TBD`
- Domain: `ops|cloud|cost|security`
- Blocked by: `grace period (confirmar que nada se rompe antes del destroy irreversible)`
- Branch: `optional (acción gcloud, no código — salvo el fix root-cause)`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Cerrar el quick-win de Secret Manager del Cloud Cost Audit 2026-05-24: los secrets `frameio-access-token` y `frameio-refresh-token` tenían **76 versiones cada uno** (152 = 70% de las 216 versiones del proyecto), todas enabled, acumuladas por un flujo OAuth de refresh que **dejó de correr el 2026-03-24** (dormido ~2 meses). El 2026-05-24 se **desactivaron las versiones 1-75** de ambos (reversible, dejando solo la 76 activa). Falta: tras un grace period, **destruir** las versiones desactivadas (irreversible — recién ahí se libera el storage, ~$8/mo) y dejar el **fix de fondo** (destroy-on-rotate) como requisito del pipeline Frame.io.

## Why This Task Exists

Cada renovación del token OAuth de Frame.io agregaba una versión nueva sin destruir la vieja. Los tokens OAuth rotantes solo dejan válida la última copia; las viejas son tokens muertos. Secret Manager cobra storage por cada versión NO destruida (enabled o disabled). El flujo de refresh **no vive en greenhouse-eo** (corre externo; acá Frame.io es el pipeline TASK-020 aún en `to-do`).

## Dependencies & Impact

### Depends on

- Disable ya ejecutado (2026-05-24): versiones 1-75 de ambos secrets `disabled`, versión 76 `enabled`.
- `gcloud` autenticado contra `efeonce-group` (ADC local).

### Impacts

- **TASK-020** (Frame.io BigQuery analytics pipeline, `to-do`): cuando se productivice, su flujo de refresh DEBE hacer destroy-on-rotate (keep-N). Requisito heredado de esta task.
- Helper canónico `secrets:rotate` (CLAUDE.md "Secret Manager Hygiene"): debe destruir versiones superseded al rotar — generaliza a cualquier secret.

### Files owned

- `docs/audits/cloud-cost/CLOUD_COST_AUDIT_2026-05-24.md`
- `Handoff.md`
- `changelog.md`

## Scope

### Paso 1 — Grace period (verificar que nada se rompe)

Las versiones 1-75 están `disabled` (reversible). Confirmar que ningún consumer falla por no encontrarlas (Frame.io está dormido → no debería haber consumer activo). Si algo las necesitara, **re-enable** con `gcloud secrets versions enable <v> --secret=<s>`.

### Paso 2 — Destroy (DESTRUCTIVO, irreversible, libera el storage)

Solo tras grace OK. Mantener la versión 76 (la última creada, único token potencialmente válido):

```bash
PROJ=efeonce-group
for s in frameio-access-token frameio-refresh-token; do
  for v in $(seq 1 75); do
    gcloud secrets versions destroy "$v" --secret="$s" --project=$PROJ --quiet
  done
done
# verificar: solo 76 debe quedar (enabled), el resto destroyed
```

### Paso 3 — Fix root-cause (escalable, previene reacumulación)

- Documentar en **TASK-020** que el flujo de refresh Frame.io debe destruir versiones viejas on-rotate (keep-N, ej. keep-2).
- Verificar que el helper canónico `secrets:rotate` destruye superseded al rotar; si no, agregarlo (aplica a NextAuth/Azure/Nubox/etc.).

## Out of Scope

- Construir un cron destructor recurrente de versiones de secrets (over-engineering + riesgo de destrucción automática irreversible para un flujo dormido). El fix vive en el productor cuando exista.
- Tocar los otros 44 secrets (sanos, 1-5 versiones c/u).

## Acceptance Criteria

- [ ] Grace period sin incidentes (ningún consumer falló por versión faltante).
- [ ] Versiones 1-75 de ambos secrets frameio en estado `destroyed`; versión 76 `enabled`.
- [ ] Conteo total de versiones del proyecto baja ~150 (de 216 a ~66).
- [ ] Requisito destroy-on-rotate documentado en TASK-020 + verificado en `secrets:rotate`.
- [ ] `changelog.md` + `Handoff.md` + audit actualizados con el ahorro real.

## Verification

```bash
# versiones por secret frameio (debe ser ~1 enabled, resto destroyed)
for s in frameio-access-token frameio-refresh-token; do
  echo "$s: enabled=$(gcloud secrets versions list "$s" --project=efeonce-group --filter='state:ENABLED' --format='value(name)' | wc -l) destroyed=$(gcloud secrets versions list "$s" --project=efeonce-group --filter='state:DESTROYED' --format='value(name)' | wc -l)"
done
```

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con ahorro real
- [ ] `changelog.md` actualizado
- [ ] `TASK_ID_REGISTRY.md` refleja lifecycle final

## Delta 2026-05-24

N/A — task creada 2026-05-24 como follow-up del Cloud Cost Audit. Paso 1 (disable reversible 1-75) ya ejecutado el mismo día; solo la versión 76 queda activa en ambos secrets. Rollback: re-enable de cualquier versión mientras NO se haya ejecutado el destroy (Paso 2).
