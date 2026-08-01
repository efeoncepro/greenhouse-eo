# TASK-1614 — Globe durable model evaluation lifecycle

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `verification-only`
- Backend impact: `yes`
- Epic: `EPIC-028`
- Status real: `Código sistémico y migración aplicados; rollout de Asset Governance bloqueado por IAM`
- Domain: `Globe / Model Lab / evaluation / worker`
- Owner: `Efeonce Globe runtime`
- Runtime code: Globe `main` hasta PR `#76` (`37b6f7ddd99bbf348613c5cc9e68dae7a5393cd7`)
- ADRs: [Evaluation Harness](../../architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md) y
  [Asset Governance Worker](../../architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md)

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

## Live progress — 2026-08-01

- La implementación de output rights y lineage se integró por PR/CI en Globe. La migración
  `0040_generated_rights_policy_purpose.sql` se aplicó mediante el workflow `30679292565`; API interna y producer
  worker se desplegaron y verificaron sin desplegar Studio.
- La policy `seedance-r2v-evaluation` v2 está publicada y releída con `purpose=evaluation`, provider `fal`, modelo
  `seedance-2.0-r2v`, versión `2.0`, ruta exacta `ref/video/motion-v1` y `appliesTo=derived`.
- El video fuente se incorporó por private-ingest como asset
  `asset_6e9c95d3-7b94-473d-b91a-00f8b35d9eec`, `video/mp4`, 773.219 bytes, SHA-256
  `69cbc966999963ed2959c9adedf409560097dce06700d4fe5c9719292a392509`, retención `working-30d` hasta
  `2026-08-30T23:27:57.776Z`. El readback de Asset Governance quedó `scan=clean`, rights `verified`, lifecycle
  `active` y `eligibleForGeneration=true`.
- La evaluación nueva `eval_16272c31b11f75be3e0369870f89746b`, attempt
  `9361550f-6ce3-456d-b710-d5cd3ded6217`, llegó a Fal y el proveedor completó la generación. El estado durable quedó
  `completion_received/finalizing`; el outbox reintenta `complete` de forma recuperable y no se debe lanzar otro
  provider run.
- El bloqueo vigente ya no es saldo, webhook ni polling: el finalizer clasifica `asset_rights_denied` al registrar
  el output derivado, pese al readback elegible del asset fuente. La investigación está acotada a la concordancia
  entre `generatedAssetParents`, la proyección durable de derechos que consume `registerGeneratedAsset` y el
  snapshot de autoridad. PR `#72` añadió un diagnóstico allowlisted de ese linaje y pasó CI antes de integrarse.
- Los runs viejos de la identidad exacta se cancelaron mediante el command canónico cuando su estado lo permitía;
  los que ya estaban provider-completed/approved devolvieron conflicto de transición y se preservan como evidencia,
  sin forzar SQL ni estados inválidos.
- Atestación, readiness, binding/promoción y prueba final en Chrome continúan pendientes. El criterio permanece
  exclusivamente **Video → control de movimiento/cámara → Seedance 2.0** en la sesión autenticada de
  `jreyes@efeonce.cl`; no se toca Omni, Seed Audio ni Seedance Loop, y Seedream no cuenta como evidencia.

## Root cause y rollout sistémico — 2026-08-01

- El diagnóstico allowlisted confirmó que el bloqueo no estaba en Fal, saldo, webhook, policy ni parent lineage.
  Un job terminal de Asset Governance podía proyectar una revisión antigua después de una escritura de rights más
  nueva y sobrescribir esa dimensión con evidencia stale. El reader componía el estado más reciente y podía mostrar
  el parent elegible mientras `registerGeneratedAsset` consumía la proyección persistida degradada.
- La divergencia también es visible sin inferencia en los readers: `30682664152` leyó el asset elegible antes de
  la carrera y `30684654795` leyó después `rights=rejected`, `lifecycle=rejected` y
  `eligibleForGeneration=false`. El objeto private-ingested y su retención permanecen intactos; el recovery debe
  reproyectar autoridad, no crear otro asset fuente.
- Globe PR `#74` (`1a810dfbd189eeb7130ba30e01d90370734f1bd0`) corrige la autoridad por causa raíz. La migración
  `0041_asset_governance_authority_revision.sql` agrega `rights_revision` a assets/jobs y evidencia append-only;
  los jobs quedan pineados a su revisión y la proyección terminal fusiona malware, C2PA y rights como dimensiones
  independientes. Una revisión stale ya no puede degradar rights nuevos ni cuarentenizar por un fallo antiguo sólo
  de rights. Replay y reconciliación siguen idempotentes y revisionados.
- Verificación de implementación: `pnpm check` y `pnpm build` completos en verde; CI PR `30684242455` y CI de
  `main` `30684380636` terminaron `success`. El plan de migración `30684391269` mostró sólo `0041` pendiente y el
  apply/readback `30684420198` terminó `success`, sin drift ni checksum inesperado.
- API interna (`30684456492`) y producer worker (`30684472892`) se desplegaron desde `1a810df` y terminaron
  `success`. Studio no se desplegó. La completion de Fal del run existente se conserva; no se creó otro provider run
  ni se volvió a gastar.
- El primer rollout de Asset Governance (`30684456659`) falló cerrado porque el scheduler estaba `ENABLED` y el
  workflow exigía pausa previa. Globe PR `#75` (`353aa3b49e0f285901658c6ca71f1d9ae50048f1`) agregó el modo keyless
  `managed_reconcile`: captura baseline, pausa si corresponde, despliega por digest, ejecuta una reconciliación y
  restaura el estado inicial del scheduler. CI `30684633070` terminó `success`.
- El retry `30684770248` ejercitó ese camino y falló antes de build/deploy con
  `PERMISSION_DENIED cloudscheduler.jobs.pause`. Globe PR `#76`
  (`37b6f7ddd99bbf348613c5cc9e68dae7a5393cd7`) agregó un rol custom mínimo para el deployer con sólo
  `cloudscheduler.jobs.pause` y `cloudscheduler.jobs.enable`; CI `30684915496` y Terraform Check `30684915503`
  terminaron `success`. El rol está mergeado en HCL pero **todavía no provisionado**; por tanto el Job de Asset
  Governance aún no ejecuta el fix de PR `#74` y la finalización/report/promoción permanecen cerradas.

## Handoff ejecutable

1. Provisionar por el carril IaC el rol custom de PR `#76`; leer el plan y exigir cero destroy/replace antes del
   apply. Verificar por readback que `globe-deployer` puede pausar/reanudar sólo schedulers existentes.
2. Reejecutar `Deploy Asset Governance Job (keyless)` sobre el SHA exacto de `main`, modo `deploy` +
   `managed_reconcile`. Exigir digest desplegado, scheduler restaurado a su estado inicial y ejecución one-shot
   exitosa; no pausar ni reanudar manualmente fuera del workflow.
3. Reanudar/finalizar el mismo run provider-completed `eval_16272c31b11f75be3e0369870f89746b`; no invocar Fal
   nuevamente. Exigir report
   `objective_pass_pending_human` y un activo retenido/elegible antes de attestation/promoción.
4. Completar rights comerciales, revisión humana, readiness, binding y promoción sólo para la identidad exacta de
   Seedance R2V. No tocar Omni, Seed Audio ni Seedance Loop.
5. Criterio final: en la sesión Chrome autenticada de `jreyes@efeonce.cl`, abrir explícitamente **Video**, elegir el
   control de movimiento/cámara y **Seedance 2.0**, generar una pieza nueva, reproducirla y verificar retención y
   governance. La captura previa estaba en **Imagen → Seedream** y no cuenta como prueba.
6. Limpiar proxies, artefactos/worktrees temporales y cerrar subagentes sólo después de preservar
   cambios y evidencia.
