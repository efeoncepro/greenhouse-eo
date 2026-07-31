# TASK-1614 — Globe durable model evaluation lifecycle

- Status: `in-progress`
- Domain: `EPIC-028 / Globe / Model Lab / evaluation / worker`
- Type: implementation + architecture
- Priority: P0
- Owner: Efeonce Globe runtime
- ADR: [Async evaluation lifecycle](../../architecture/creative-studio/EFEONCE_GLOBE_ASYNC_EVALUATION_LIFECYCLE_DECISION_V1.md)

## Objective

Make long-running model evaluations durable and provider-neutral so an upstream HTTP timeout cannot be mistaken for a model verdict or leave an operator without a recoverable evidence path.

## Scope

- Add a receipt tied to deterministic experiment/report identity.
- Compile evaluation routes through an explicit server-owned binding lane.
- Reuse the spend fence, governed run, outbox, worker and manifest finalizer.
- Create reports only after manifest checkpoint and make creation idempotent.
- Poll report and terminal experiment state in the operator lane.
- Validate Seedance R2V through the real UI only after objective report evidence exists.

## Acceptance evidence

- Domain and creative-runner typechecks pass.
- Unit coverage proves durable acceptance, stable idempotency and scheduler route binding.
- Live evaluation returns a terminal objective report or a terminal classified failure.
- Playwright UI evidence proves attestation and promotion for the exact route/model/version.
- Producer UI proves availability, estimate, generation, playback/download and one retained asset per model tested.

## Explicit exclusions

Do not alter already promoted Omni, Seed Audio or Seedance Loop; do not bypass the daily spend cap; do not add provider-specific timeout patches; do not write direct SQL or create a second ledger/catalog.

## Live progress — 2026-07-31

- The evaluation command now returns a durable receipt and schedules provider work at the evaluation boundary;
  the operator client unwraps the canonical command envelope and waits for the retained report or a classified
  terminal experiment state.
- The first live Seedance R2V attempt was accepted but stopped before provider submission with
  `provider_input_resolution_failed`: the source-controlled golden fixture named a synthetic hash without a
  runtime object. Webhook/poll processing was not the blocker.
- The durable path now fails closed for missing or `test-fixture` runtime inputs. A caller must first certify a
  retained output with `globe.producer.asset.copyAsReference` and pass the returned canonical handle as
  `authorizedInputs`; the effective inputs are persisted and scored for lineage.
- The exact identity remains `ref/video/motion-v1` / `fal` / `seedance-2.0-r2v` / `2.0`. Omni, Seed Audio and
  Seedance Loop remain outside this mutation scope.
- Code and CI integrados están completos hasta Globe PR `#31`. Un cambio adicional no integrado vive en el
  worktree aislado `/private/tmp/globe-evaluation-rights`, branch
  `codex/evaluation-rights-provenance`, basado en Globe `949ce88` (PR `#32`). Añade `purpose` a las políticas de
  output rights, resolución exacta antes del gasto, lineage durable de referencias, padre derivado en el finalizer
  y bloqueos de entrega/share para outputs de evaluación. Incluye migración `0040_generated_rights_policy_purpose.sql`.
- Los 253 tests de `@efeonce-globe/creative-runner` pasan, incluidos los casos de policy faltante, purpose incorrecto,
  `appliesTo` incompatible y parent derivado. `pnpm typecheck` también pasó. El `pnpm check` completo se interrumpió
  deliberadamente al cerrar esta sesión mientras había llegado a `packages/database`; esa salida no es evidencia de
  regresión y debe repetirse desde cero en la siguiente sesión.
- Eval live afectada: experiment/run `eval_9a239466522375abadde98c21fdd7ca2`, attempt
  `468360ff-d890-4602-8d02-46629aef10b4`, operación Fal
  `019fb9bc-0f69-7820-9d9c-061b1a08d6fb`. Fal produjo un MP4 de 1.411.201 bytes, hash
  `sha256:90f2a61f0ab89fb70fb3db068549393119c5c0c478d2002b6db2deaabf022748`, retenido en el bucket privado,
  pero el finalizer rechazó correctamente porque el snapshot inmutable no contenía `generatedRights`. No existe
  asset gobernado para ese output; cancelar el run canónicamente después del rollout, no mutarlo.
- El viejo ancla Veo (`sha256:69cbc966...`, reference handle
  `85f694b5-30ff-4d30-8fa1-dd248729c5fe`) tampoco tiene fila de activo gobernado. Para la nueva evaluación, descargar
  temporalmente el video privado, subirlo por private-ingest, esperar Asset Governance elegible y pasar el
  `LabAuthorizedInputV1` canónico. No usar outputs de Seedance Loop como fuente: están explícitamente fuera de scope.
- El workspace ya fue fondeado por el command API canónico: +500, cap 800→1500, disponible 836; IDs durables están
  registrados en la skill `greenhouse-globe` bajo “Último fondeo real verificado”.

## Handoff ejecutable

1. Inspeccionar y preservar el worktree Globe; ejecutar `pnpm check` completo y `git diff --check`.
2. Rebasar contra `origin/main` sólo dentro del worktree aislado, abrir PR, esperar CI y desplegar API + worker con
   la migración 0040. No tocar el checkout compartido donde Claude trabaja UI.
3. Publicar una policy `purpose=evaluation`, exacta para `ref/video/motion-v1 / fal / seedance-2.0-r2v / 2.0`,
   `appliesTo=derived`, con las cuatro restricciones internas obligatorias y digest de términos
   `sha256:93e8ed03a8948e33d1cb03df5929da47f50d6f642d7949a85bf9b6f82c4c85bb`.
4. Private-ingest + governance del video fuente, cancelar canónicamente los runs viejos y lanzar una evaluación nueva.
   Exigir report `objective_pass_pending_human` y un activo retenido/elegible antes de attestation/promoción.
5. Completar rights comerciales, revisión humana, readiness, binding y promoción sólo para la identidad exacta de
   Seedance R2V. No tocar Omni, Seed Audio ni Seedance Loop.
6. Criterio final: en la sesión Chrome autenticada de `jreyes@efeonce.cl`, abrir explícitamente **Video**, elegir el
   control de movimiento/cámara y **Seedance 2.0**, generar una pieza nueva, reproducirla y verificar retención y
   governance. La captura previa estaba en **Imagen → Seedream** y no cuenta como prueba.
7. Limpiar proxy Cloud SQL PID 15604, archivos/worktrees temporales y cerrar el subagente sólo después de preservar
   cambios y evidencia.
