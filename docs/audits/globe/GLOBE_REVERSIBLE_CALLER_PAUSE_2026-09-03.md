# QA Release Audit — Globe reversible caller pause

## Verdict

BLOCK para cierre integral de la protección contra redeploy; pausa runtime verificada.

Closure state: `code complete, rollout pendiente` para la declaración de deploy. La única mutación cloud
autorizada y aplicada fue pausar el scheduler; no requiere una nueva revisión del worker para surtir efecto.

## Scope

- `services/ops-worker/deploy.sh`: quinto argumento `true` del caller Globe; no cambia el helper compartido.
- `deploy-contract.test.ts`: ejecuta el helper real con `gcloud` simulado, sin acceso cloud.
- Runbook, arquitectura de scheduling/tenancy, funcional/manual, continuidad, task/índices y skills espejo.
- Proyecto destino del cambio: `efeonce-group`, `us-east4`, `ops-globe-tenancy-reconcile`.
- Fuera de alcance: otros schedulers, worker compartido, Terraform, datos, IAM, secretos, reactivación y release.
- Checkout compartido inicialmente limpio; no branch switch, worktree, commit, push ni deploy.

## Risk Classification

| Risk | Level | Why |
| --- | --- | --- |
| Scheduler externo compartido | High | Un deploy desde source anterior puede reanudar llamadas con SQL detenido |
| Recuperación de tenancy | High | La pausa deja expirar leases; la reapertura requiere refresco autorizado |

## Injected Skills

- Google Cloud Cost Optimization y Cloud Run Basics: contención reversible y lectura del estado real.
- `greenhouse-secret-hygiene`: lectura selectiva de metadatos, sin credenciales ni cambios IAM.
- `greenhouse-globe` / `greenhouse-globe-model-fleet`: producto comercial preservado, lifecycle y gasto cerrado.
- `software-architect-2026`: continuidad de las autoridades existentes, sin nuevo runtime ni excepción auth.
- `greenhouse-documentation-governor` / `greenhouse-qa-release-auditor`: cobertura, mirrors y evidencia.
- Sugerencias automáticas Teams/HubSpot/Vercel excluidas: este diff no cambia esas integraciones ni releases.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Pause/readback | PASS | `PAUSED` a `2026-09-03T22:26:05Z`; `userUpdateTime=2026-09-03T22:26:04.107725Z` |
| Config preservada | PASS | Cron `*/5 * * * *`, `America/Santiago`, target e identidad OIDC sin cambios |
| SQL readback | PASS | `globe-pg` `STOPPED/NEVER`, deletion protection activa |
| Observación posterior | PASS inicial | Lectura a `22:36Z`: cero requests indexadas entre `22:26:05Z` y `22:35:40Z` tanto al caller en ops-worker como a Globe API; intervalos `22:30` y `22:35` omitidos |
| Readback final | PASS | A `22:36:00Z` el scheduler seguía `PAUSED`, mismo cron/target/OIDC y `userUpdateTime` |
| Shell | PASS | `bash -n services/ops-worker/deploy.sh` |
| Pruebas focales | PASS | 18/18 en `pnpm exec vitest run services/ops-worker/deploy-contract.test.ts` |
| Falsificación | PASS | Cambiar temporalmente sólo el argumento a `false` produjo 2 fallos pause/resume; restaurado `true`, 18/18 verdes |
| ESLint | PASS | `pnpm exec eslint services/ops-worker/deploy-contract.test.ts` |
| Workers | PASS | `worker:build-contract-gate` y `worker:runtime-deps-gate` |
| Skills | PASS | `pnpm skills:mirrors`, pares Globe/fleet idénticos |
| Task | PASS | `task:lint --task TASK-1807`, 0 errores/warnings; sigue in-progress |
| Docs | PASS | `docs:closure-check` sin warnings; índice Creative Studio válido |
| Contexto | PASS | `docs:context-check:strict`, 0 errores/warnings; una entrada histórica rotada sin pérdida |
| Ops lint | PASS con avisos ajenos | Sin errores; 13 warnings de paridad de epics no modificadas |

## Blockers

1. La protección declarativa no está publicada: cualquier deploy desde el source anterior puede reactivar el
   caller. Efeonce Platform debe promover el cambio por el carril autorizado y verificar el scheduler otra vez.

## Conditional Follow-Ups

1. Billing posterior necesita ventanas completas y retraso de ingestión; no hay ahorro realizado certificado.
2. La reactivación no se ensayó: no despertar SQL ni generar trabajo para probar documentación.
3. Logs son una observación inicial con ingestión asíncrona, no garantía de silencio futuro. Las dos últimas
   requests previas al corte llegaron a `22:25:00.580723Z` y `22:25:10.529287Z` y duraron ~127 s; su
   finalización posterior a la pausa no constituye una nueva invocación. No se canceló trabajo aceptado.

## False-Closure Traps Checked

- Pruebas locales no acreditan publicación del source ni estado remoto futuro.
- `minScale=0` no impide que nuevas solicitudes levanten la API.
- Scheduler/ops-worker HTTP 200 no demuestra reconciliación de dominio exitosa.
- No hay UI ni cambios de bundle: no se ejecutó build general ni GVC.
- No hubo nuevas migraciones, cambios de permisos, restauración ni plan Terraform; no se afirma ausencia de drift.
- El ADR de tenancy conserva historia y autoridad; sólo documenta la excepción operativa de hibernación.

## Final Call

La pausa es reversible y el procedimiento de recuperación está en el
[runbook canónico](../../operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md).
La mitigación aplicada, la promoción pendiente y la medición financiera son estados separados; no cerrar
TASK-1807 ni reactivar el producto por interpretar este informe como autorización.
