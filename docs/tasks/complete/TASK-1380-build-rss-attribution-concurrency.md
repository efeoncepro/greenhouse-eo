# TASK-1380 — Build RSS Attribution & Concurrency Experiment

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Complete — proceed hacia modo local low-memory; sin cambio de defaults/runtime`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1380-build-rss-attribution-concurrency`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Atribuir el pico de memoria del build de Greenhouse a fases y procesos concretos, y probar una matriz controlada de concurrencia/workers. La salida debe recomendar una optimización pequeña y comprobable o detener la hipótesis, sin reabrir el desacople físico rechazado por TASK-1379.

## Why This Task Exists

TASK-1379 redujo 88,6–96,2% los artifacts Roadmap y mejoró clean p50 19,9%, pero warm RSS p95 empeoró 9,8% hasta 8,25 GB. Medir solo el proceso wrapper no permite distinguir compilador Next/Turbopack, typecheck, static generation, tracing, prebuild o child workers; otra migración estructural sin atribución repetiría el riesgo de optimizar el síntoma equivocado.

## Goal

- Medir memoria por árbol de procesos y por fase con una metodología reproducible y sanitizada.
- Comparar concurrencia/workers mediante variantes controladas y al menos tres muestras para cualquier candidata.
- Identificar la causa dominante con confidence explícita y emitir `proceed | stop` para una única siguiente optimización.
- Mantener runtime, topología, deploy y configuración productiva sin cambios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- El ADR modular permanece `Rejected`; esta task no autoriza `apps/*`, `packages/*`, proyectos Vercel ni deployables.
- Separar RSS del wrapper de RSS agregado/peak del árbol de procesos y documentar las limitaciones de macOS.
- Ejecutar builds serialmente, etiquetar toda variante y no mezclar cohorts, cache states o configuración de máquina.
- No versionar artifacts crudos, env values, rutas privadas, argumentos sensibles ni dumps de proceso.
- Revertir toda configuración experimental que no sea la recomendación aceptada; esta task no hace cutover productivo.

## Normative Docs

- `docs/audits/platform/2026-07-10-greenhouse-build-dependency-baseline.md`
- `docs/audits/platform/2026-07-10-roadmap-materialized-index-ab.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `scripts/architecture/build-baseline/**`
- `scripts/run-next-build.mjs`
- `next.config.ts`
- `package.json`
- TASK-1376 y TASK-1379 completas.

### Blocks / Impacts

- Define la próxima optimización de build/cache/memoria; no bloquea trabajo de producto.
- Puede proponer una task posterior acotada sobre Next/Turbopack, typecheck, static generation, tracing o concurrencia.

### Files owned

- `scripts/architecture/build-baseline/**`
- `artifacts/architecture/build-baseline/**` (output local gitignored)
- `docs/audits/platform/2026-07-XX-build-rss-attribution-concurrency.md`
- `docs/tasks/to-do/TASK-1380-build-rss-attribution-concurrency.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `architecture:build-baseline measure` captura wall time y peak RSS del wrapper mediante `/usr/bin/time -l`.
- `summarize --prefix` separa cohorts y calcula p50/p95 nearest-rank.
- El build usa heap de 8 GiB y `NEXT_BUILD_CPUS=2` en la metodología baseline.
- Existen 3 clean + 5 warm del baseline y del experimento TASK-1379.

### Gap

- No hay sample periódico del árbol de procesos ni identidad padre/child/worker.
- No existe timeline de fases ni correlación entre peak RSS y compilación/typecheck/static generation/tracing.
- No se ha comparado una matriz aislada de concurrencia conservando los demás factores.
- El dato actual no demuestra si el peak pertenece a un solo proceso, suma concurrente o presión externa del host.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/architecture/build-baseline/** + docs/audits/platform/**`
- Future candidate home: `remain-shared`
- Boundary: `telemetría local sanitizada de build + audit; ningún runtime de producto la consume`
- Server/browser split: `n/a — tooling Node local, sin bundle browser`
- Build impact: `instrumentación on-demand y builds experimentales seriales; no agrega imports al runtime Next.js`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente ejecutor la completa tras Discovery.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Profiler contract

- Extender el tooling con muestreo periódico del árbol de procesos: pid/ppid, command class allowlisted, RSS, elapsed y sample timestamp.
- Emitir un timeline sanitizado y resumen por process class/fase, sin argumentos/env crudos.
- Agregar tests de parser, agregación, redacción, plataformas no soportadas y cleanup tras señales/fallo.

### Slice 2 — Phase attribution

- Detectar fases desde logs/markers del build sin modificar código productivo.
- Correlacionar cada sample con `prebuild`, `compile`, `typecheck`, `collect-page-data`, `static-generation`, `tracing` o `unknown`.
- Reportar peak del root, peak agregado del tree, top process classes y confidence; nunca forzar una fase si no hay evidencia.

### Slice 3 — Concurrency matrix

- Ejecutar una matriz inicial controlada sobre valores soportados de workers/concurrencia manteniendo heap, commit, dist y cache state explícitos.
- Hacer discovery barato de variantes; promover solo candidatas no regresivas a mínimo 3 muestras seriales.
- Comparar duración, root/tree RSS, output y errores/OOM; excluir muestras contaminadas con razón registrada.

### Slice 4 — Verdict and closure

- Publicar auditoría con método, evidencia, limitaciones, causa dominante y `proceed | stop`.
- Si `proceed`, proponer una sola task de optimización con target y rollback; no implementarla aquí.
- Sincronizar task lifecycle, índices, handoff y changelog; conservar artifacts locales gitignored.

## Out of Scope

- Reabrir EPIC-026 o cambiar el ADR modular a Accepted/Proposed.
- Materializar Roadmap otra vez, dividir apps/packages o crear deployables.
- Push, PR, deploy, Vercel config, secrets, migrations, API/UI o runtime productivo.
- Adoptar una configuración solo porque usa menos memoria si empeora duración >10%, rompe output o reduce cobertura del build.
- Usar Activity Monitor/manual screenshots como única evidencia.

## Detailed Spec

Cada muestra debe registrar `runId`, SHA/dirty state, hardware/versiones, variante, cache state, wall time, exit, root peak RSS, aggregate tree peak RSS, sample interval, process-class peaks, phase peaks, output bytes, warnings, exclusions y confidence. Los comandos se clasifican por allowlist (`next`, `node`, `typescript`, `worker`, `shell`, `other`) sin persistir argv completo.

El veredicto es `proceed` solo si una hipótesis tiene causa atribuible y una variante/optimización muestra mejora material reproducible de tree RSS sin regresión >10% en p50, sin errores y sin pérdida de output. En otro caso es `stop` y se documenta qué evidencia falta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 debe pasar tests/redaction antes de perfilar builds.
- Slice 2 debe probar attribution antes de comparar variantes.
- Slice 3 corre serialmente y promueve candidatas solo tras discovery.
- Slice 4 no recomienda configuración sin muestras comparables y rollback.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Muestreo altera la medición | local build | medium | intervalo ≥250 ms, overhead medido, control sin profiler | delta control >3% |
| RSS agregado doble-cuenta procesos terminados | profiler | medium | snapshot simultáneo por PID y peak por timestamp | aggregate incoherente con host |
| Matriz congela el equipo | local DX | medium | builds seriales, variante barata primero, stop ante presión | swap/OOM/exit no-cero |
| Logs cambian entre versiones | attribution | medium | fases unknown + confidence, tests con fixtures | alto porcentaje unknown |
| Se filtran argv/env | security | low | allowlist de clases + redaction tests | secret-like finding |
| Optimización cambia cobertura | Next build | low/medium | comparar route/output counts y build exit | artifacts/rutas faltantes |

### Feature flags / cutover

N/A — tooling local on-demand; ninguna variante se aplica a producción en esta task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revertir profiler y borrar artifacts locales | <30 min | sí |
| 2 | Revertir markers/parser | <30 min | sí |
| 3 | Restaurar config/env baseline y eliminar dist experimental | <15 min | sí |
| 4 | Preservar auditoría histórica y corregir recomendación con nueva evidencia | <30 min | sí |

### Production verification sequence

N/A — no rollout. Verificación local con tests, builds seriales y revisión del audit.

### Out-of-band coordination required

N/A — repo-only. Si el host no puede sostener la matriz sin interferir trabajo activo, reducir variantes y declarar confidence; no usar infraestructura remota sin autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El profiler captura root y árbol de procesos con timeline sanitizado y overhead controlado.
- [x] Cada muestra separa root peak RSS de aggregate tree peak RSS y declara sample interval/confidence.
- [x] La atribución cubre fases conocidas y conserva `unknown` cuando no hay evidencia.
- [x] Tests cubren parsing, aggregation, redaction y agregación; el sampler degrada sin lanzar si `ps` falla.
- [x] Existe control sin profiler: p50 2.667 ms plain vs 2.659 ms profiled (-0,3%, n=5 por variante).
- [x] La matriz mantiene SHA/hardware/heap/cache state comparables y ejecuta builds seriales.
- [x] Toda candidata al veredicto tiene al menos 3 muestras válidas; no se afirma p95 con n=3.
- [x] Se comparan duración, tree RSS, legacy timed RSS, exit, route/output counts y build bytes.
- [x] El audit identifica compile/typecheck como causa dominante con confidence low-to-medium, sin confundir correlación con causalidad.
- [x] El veredicto final es `proceed` y propone solo TASK-1381 low-memory/adaptativa con target/rollback.
- [x] No quedan cambios experimentales en runtime/config, ni apps/packages/deployables, push o deploy.
- [x] Artifacts contienen cero secrets/env/argv crudo y permanecen gitignored.

## Verification

- `pnpm architecture:build-baseline:test`
- `pnpm exec eslint scripts/architecture/build-baseline/*.mjs`
- `pnpm task:lint --task TASK-1380`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex --task TASK-1380 --runtime --docs`
- `pnpm docs:closure-check`
- `git diff --check`

## Closing Protocol

- [x] `Lifecycle` y carpeta sincronizados.
- [x] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados.
- [x] `Handoff.md` y `changelog.md` actualizados.
- [x] Auditoría QA y Documentation Governor ejecutados antes del cierre final.
- [x] Excepción de goal preflight documentada: el operador confirmó registro y ejecución inmediata en el mismo mensaje; se ejecutó hook con `--develop` sin segunda pausa.
- [x] Cambios ajenos al scope preservados.

## Follow-ups

- Propuesta no registrada: `TASK-1381 — Adaptive Local Low-Memory Build Mode`; requiere confirmación de autoría antes de reservar ID.
- EPIC-026 permanece cerrado aun si una optimización interna resulta favorable.

## Open Questions

- Ninguna bloqueante; discovery decidirá el mecanismo de muestreo macOS más estable y las variantes soportadas reales.

## Completion Evidence

- Audit: `docs/audits/platform/2026-07-10-build-rss-attribution-concurrency.md`.
- Tooling tests: 10/10; ESLint focal PASS.
- Overhead: -0,3% p50 (n=5 plain + n=5 profiled).
- Builds: `cpus=1` n=3, `cpus=2` n=3, `cpus=4` discovery n=1; todos exit 0.
- Output parity: 21.471 files, 1.232 NFT traces y ~615,57 MB en cohorts pos-fix.
- Verdict: `proceed` low-to-medium confidence; no defaults/runtime/deploy changed.
