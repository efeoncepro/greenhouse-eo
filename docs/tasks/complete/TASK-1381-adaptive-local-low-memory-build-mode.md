# TASK-1381 — Adaptive Local Low-Memory Build Mode

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Status real: `Complete — keep-explicit-only; adaptive selector retirado`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1381-adaptive-local-low-memory-build-mode`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar un modo local low-memory explícito y un selector adaptativo seguro que use la evidencia TASK-1380 para evitar picos cercanos a 8 GiB en equipos de 16 GiB. `pnpm build`, CI, Vercel y producción permanecen intactos hasta que una cohorte n≥5 demuestre el contrato completo.

## Why This Task Exists

TASK-1380 atribuyó el peak a compile/typecheck y observó que `NEXT_BUILD_CPUS=1` reduce tree RSS p50 17,1% frente a 2 workers con +9,5% de duración (n=3). La señal es prometedora pero dispersa; falta convertirla en una ergonomía local explícita, portable y testeada, y repetir la comparación con n≥5 antes de recomendarla como modo local estándar.

## Goal

- Crear comandos locales claros para perfil low-memory y selección adaptativa, sin alterar el build canónico.
- Resolver el perfil desde memoria disponible y overrides explícitos, con fail-closed en CI/Vercel.
- Validar n≥5 con profiler tree RSS, duración y output parity.
- Emitir `adopt | keep-explicit-only | stop` y cerrar documentación/rollback.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- ADR modular permanece `Rejected`; no crear topología ni deployables.
- `pnpm build` y su semántica CI/Vercel no cambian en esta task.
- `experimental.cpus` es implementation detail de Next.js; aislarlo detrás de tooling propio y tests.
- No inferir memoria desde CPU count; usar total memory y override explícito.
- No persistir env values o información sensible del host en artifacts versionados.

## Normative Docs

- `docs/audits/platform/2026-07-10-build-rss-attribution-concurrency.md`
- `docs/tasks/complete/TASK-1380-build-rss-attribution-concurrency.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `scripts/run-next-build.mjs`
- `scripts/next-dist-dir.mjs`
- `scripts/architecture/build-baseline/**`
- `next.config.ts` resolver existente de `NEXT_BUILD_CPUS`.
- TASK-1380 complete.

### Blocks / Impacts

- Mejora opcional de ergonomía local; no bloquea producto ni release.
- Puede actualizar `LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md` si el modo queda adoptado.

### Files owned

- `scripts/build-memory-profile.mjs`
- `scripts/build-memory-profile.test.mjs`
- `package.json`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/audits/platform/2026-07-XX-adaptive-local-low-memory-build.md`
- `docs/tasks/to-do/TASK-1381-adaptive-local-low-memory-build-mode.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `run-next-build.mjs` aplica heap ceiling 8 GiB y dist aislado local.
- `next.config.ts` acepta `NEXT_BUILD_CPUS` positivo y usa default 4.
- `build:fast` fija 2 workers.
- El profiler TASK-1380 entrega `peakTreeRssBytes` por cohort.

### Gap

- No existe comando local low-memory explícito ni selector por RAM.
- Un agente debe recordar manualmente `NEXT_BUILD_CPUS=1`.
- No hay guard que impida usar accidentalmente el modo adaptativo local en CI/Vercel.
- Falta n≥5 para decidir adopción frente a `cpus=2`.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/** + package.json + docs/operations/**`
- Future candidate home: `remain-shared`
- Boundary: `resolver local de build memory profile; solo comandos de desarrollo lo consumen`
- Server/browser split: `n/a — Node tooling local, nunca entra al bundle browser/runtime`
- Build impact: `nuevo entrypoint local que selecciona NEXT_BUILD_CPUS; build canónico permanece intacto`
- Extraction blocker: `none`

<!-- ZONE 2 — PLAN MODE: se completa por el agente ejecutor -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Pure profile resolver

- Implementar resolver puro `low | balanced` desde total memory, override y señales CI/Vercel.
- Default adaptativo local: hosts con ≤20 GiB usan low (`cpus=1`); hosts mayores usan balanced (`cpus=2`).
- Invalid override falla con error canónico; CI/Vercel rechazan el comando adaptativo local.
- Tests cubren thresholds, overrides, CI/Vercel y output sanitizado.

### Slice 2 — Local commands

- Agregar `build:low-memory` explícito y `build:local` adaptativo, ambos delegando al `run-next-build.mjs` existente.
- No duplicar heap/dist/cleanup ni lógica Next.
- Imprimir solo profile/cpu/memory bucket, nunca memoria exacta si no aporta diagnóstico.

### Slice 3 — Cohort verification

- Ejecutar 5 builds seriales `low` y 5 `balanced` con profiler, mismo checkout/host y output aislado.
- Comparar p50/p95 tree RSS, legacy timed RSS, duración, exit y output parity.
- Aplicar target: ≥15% menos tree RSS p50 y p95; tiempo p50 ≤+10%; 100% builds exitosos y parity.

### Slice 4 — Verdict and closure

- `adopt`: documentar `build:local` como recomendado local.
- `keep-explicit-only`: conservar `build:low-memory` opt-in, pero no recomendar adaptive default.
- `stop`: retirar ambos comandos/resolver y conservar solo audit.
- Sincronizar workflow local-first, task/indexes, handoff y changelog.

## Out of Scope

- Cambiar `pnpm build`, `build:fast`, CI, GitHub Actions, Vercel o production build settings.
- Cambiar heap ceiling, Turbopack cache, Roadmap, routes o output tracing.
- Detectar presión dinámica/swap durante el build o mutar workers a mitad de ejecución.
- Crear daemon, UI, telemetry remota, dependency nueva o deployable.
- Push, PR, deploy o release.

## Detailed Spec

El resolver debe ser una función pura que recibe `{ totalMemoryBytes, profileOverride, isCi, isVercel }` y devuelve `{ profile, cpus, memoryBucket, source }` o error canónico. Threshold inicial: `20 GiB`, derivado para que el host de 16 GiB medido use low; es reversible y debe vivir como constante testeada. `build:low-memory` fuerza low; `build:local` usa adaptive. Ninguno altera el proceso padre ni archivos de config.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Resolver/tests antes de package scripts.
- Commands/smoke antes de cohorts.
- Cohorts antes de documentación de adopción.
- Si gates fallan, retirar el adaptive path; no racionalizar una regresión.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| API experimental cambia | Next build | medium | adapter local + smoke real + rollback | config ignored/build error |
| Threshold incorrecto | local DX | medium | override + buckets + n≥5 | tiempo >10% o RSS no mejora |
| Modo local entra a CI | CI/Vercel | low | fail-closed por CI/VERCEL | command ejecutado fuera de local |
| Wrapper duplica lifecycle | build tooling | low | delegar a run-next-build | dist/tsconfig cleanup drift |
| Cohorts calientan host | evidence | medium | serial, orden alternado, confidence | tendencia por orden/swap |

### Feature flags / cutover

N/A — comandos locales opt-in. `pnpm build` queda como rollback inmediato.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert resolver/tests | <15 min | sí |
| 2 | retirar package scripts/wrapper | <15 min | sí |
| 3 | borrar artifacts gitignored | <10 min | sí |
| 4 | volver a `pnpm build`/`build:fast` documentado | inmediato | sí |

### Production verification sequence

N/A — local-only. Verificación: tests → smoke de resolución → 10 builds seriales → docs.

### Out-of-band coordination required

N/A — no external systems.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Resolver puro final exige perfil explícito low/balanced, conserva bucket bounded y falla cerrado en CI/Vercel.
- [x] `build:low-memory` fuerza 1 CPU sin duplicar prebuild ni run-next-build; `build:local` adaptativo fue retirado tras fallar gates.
- [x] `pnpm build`, `build:fast`, next.config, CI y Vercel conservan su comportamiento.
- [x] Tests no dependen del hardware real y cubren invalid inputs/errors.
- [x] Smoke local imprime profile/cpus/bucket/source sin valores sensibles.
- [x] Cohorts low/balanced tienen n=5 válidas, seriales y alternadas.
- [x] Solo se afirma p95 con n=5.
- [x] Output files/traces/bytes mantienen parity práctica y los 10 builds terminaron exit 0.
- [x] Veredicto `keep-explicit-only` sigue gates: p50 +0,2% y p95 -6,8% no cumplen -15%.
- [x] No hubo runtime/config productiva, push, deploy, apps/packages ni dependencia nueva.

## Verification

- `node --test scripts/build-memory-profile.test.mjs`
- `pnpm architecture:build-baseline:test`
- `pnpm exec eslint scripts/build-memory-profile.mjs scripts/build-memory-profile.test.mjs`
- `pnpm task:lint --task TASK-1381`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex --task TASK-1381 --docs`
- `pnpm docs:closure-check`
- `git diff --check`

## Closing Protocol

- [x] Lifecycle/carpeta e índices sincronizados.
- [x] Audit, workflow local-first, Handoff y changelog actualizados proporcionalmente.
- [x] QA Release Auditor y Documentation Governor ejecutados antes del cierre final.
- [x] Excepción goal preflight documentada: operador confirmó registro+ejecución inmediata; hook `--develop` sin segunda pausa.
- [x] TASK-356 y scripts ajenos preservados fuera del commit.

## Follow-ups

- Ninguno automático; una promoción a CI/Vercel exigiría task/ADR separados y evidencia remota.

## Open Questions

- Ninguna bloqueante; el veredicto decide si `build:local` se documenta como recomendado o solo queda el escape hatch explícito.

## Completion Evidence

- Audit: `docs/audits/platform/2026-07-10-adaptive-local-low-memory-build.md`.
- Resolver tests 6/6; lint/syntax PASS; CI fail-closed smoke retorna code 2 + error canónico.
- Cohorte: 5 low + 5 balanced, alternada, 10/10 exit 0.
- Low vs balanced: duration p50 +4,53%; tree RSS p50 +0,20%; p95 -6,77%.
- Output parity: 21.471 files, 1.232 NFT traces, ~615,58 MB.
- Veredicto: `keep-explicit-only`; adaptive path retirado antes del commit.
