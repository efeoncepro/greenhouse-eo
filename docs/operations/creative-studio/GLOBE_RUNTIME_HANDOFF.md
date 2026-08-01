# Efeonce Globe — Runtime Handoff

> Continuidad activa del runtime de Globe bajo el control plane de Greenhouse (`EPIC-028` /
> `TASK-1492`). Código, infraestructura y evidencia técnica viven en `efeonce-globe`; este archivo
> conserva sólo el estado mutable, los riesgos abiertos y el siguiente paso. La historia anterior
> permanece auditable en el git log y en las tasks/ADRs enlazadas.
>
> **Corte de código verificado:** 2026-08-01 · Globe `main`
> `37b6f7ddd99bbf348613c5cc9e68dae7a5393cd7` (PR `#76`). El runtime está deliberadamente mixto mientras
> termina TASK-1614: API interna y producer worker en `1a810df`; Asset Governance aún en su digest anterior.

## Estado activo

- Globe sigue siendo un producto comercial de Efeonce. El rollout continúa `internal-only`, con
  runtime `internal_smoke`; clientes externos siguen gated por `TASK-1480`.
- `https://globe.efeoncepro.com/producer` es la superficie humana autenticada. El browser usa BFF
  same-origin; no recibe credenciales de workload ni llama providers directamente.
- El reader `globe.producer.fleet.list` es el SoT live. El ledger humano es
  [`GLOBE_MODEL_FLEET_STATUS.md`](GLOBE_MODEL_FLEET_STATUS.md).
- Seis rutas de imagen están simultáneamente `available`: Seedream 5 Pro, Nano Banana Pro,
  Nano Banana 2, GPT Image 2, GPT Image 1.5 y Recraft v4.1.
- `TASK-1553` permanece `in-progress` únicamente por el criterio transversal de rate-version
  receipts de `TASK-1468` y onboarding receipts de `TASK-1578`. Este pendiente no revierte la
  disponibilidad live de las seis rutas.

## Superficies operativas vigentes

| Superficie | Uso | Autoridad y regla |
| --- | --- | --- |
| Producer autenticado | revisión humana, atestación cuando corresponde y generación real | sesión del operador → BFF; la prueba de usuario debe iniciarse aquí |
| `Globe Operator Lane (keyless)` | evaluación, readiness, routing, auto-promoción, circuito, derechos y confirmación de canary | workflow federado con service accounts disjuntas por acto; combinaciones acción↔lane están allowlisted |
| `Diagnose Governed Run (keyless)` | leer estado final de un run/attempt sin mutarlo | read-only, tenant-scoped y sanitizado; publica artefacto diagnóstico sin mensajes, stack, body upstream ni secretos |

El operator lane no es un command genérico. La matriz vigente separa `caller`,
`tenancy-operator`, `auto-lane`, `routing`, `promoter` y `checker`; sólo permite actos explícitos,
entre ellos `evaluate`, `readiness-promote`, `auto-promote`, `route-append`,
`circuit-transition`, `publish-rights`, `promote`, `activate`, `canary-confirm` y los readbacks
correspondientes. No uses SQL manual, SDK de provider directo ni una identidad que combine
promoción, routing y checker.

Commits que fijaron esta operación el 2026-07-30:

- `3f318fb`: lanes federados y keyless.
- `5790dd8`, `5c22647`, `6dc79ab`, `7dbcf02`, `98d8101`: auto-promoción, readiness,
  append exacto de routing, transición canónica de circuito y revisión inicial.
- `0ffd728`: reader de governed run en el operator lane.
- `0f0d66a`: workflow de diagnóstico seguro.

## Rollout de imagen verificado el 2026-07-30

### OpenAI — GPT Image 2 y GPT Image 1.5

- Rutas: `ref/still/openai-v2` y `ref/still/openai-v1-5`.
- El lane gobernado usa la API oficial de OpenAI Images y fija la política comercial efectiva en
  el snapshot antes del gasto (`8e0772e`, `b1bb92c`, `2b75272`).
- GPT Image 2: run de Producer `a81c8049-7772-4933-82f2-1e2e59e5121c`,
  `image/png`, 14 créditos, completado y visible en la UI.
- GPT Image 1.5: promoción `promotion_6d1ff645-2e1a-42c1-85b5-02d2ba3f696b`; run de
  Producer `bf8cd62b-e2d7-4e83-981a-7631a14a5d3a`, `image/png`, 10 créditos,
  completado, con candidato y descarga habilitados después de governance.
- CI `30559712670`, deploy API `30559850637` y deploy worker `30560124218`
  terminaron `success`. El checker `30561393336` confirmó el canary de GPT Image 1.5.
- Las atestaciones comerciales firmadas antes del lane no promovían por sí solas. El estado
  vigente es posterior: driver oficial, política exacta, promoción y generaciones UI están
  completos.

### Vertex — Nano Banana 2

- Ruta: `ref/still/nanobanana-2-v1`; modelo `gemini-3.1-flash-image`, región `global`.
- El endpoint oficial respondió HTTP 200 en `efeonce-globe`; el 404 histórico de allowlist está
  retirado.
- Evaluación exacta: reporte `51818214-863d-4542-8e9b-eb50c1cb5be9`, experimento
  `82e3f630-63e8-4c59-a629-8ea670c79dd7`, 5/5 checks, 10 créditos,
  `image/png`, SHA-256
  `aa3268e81afbd1ef3cd7794426500881abb6abd63b92569d0050107af5551b5e`.
- Revisión humana `review_8ce9fa89-b566-4d51-b150-1d83fce0dec6`; atestación
  `mcra_4a15625c-0186-4d01-bae1-472071c38e4d`.
- Readiness, binding y circuito se promovieron mediante operator lanes
  `30564131652`, `30564134009`, `30564136579` y `30564202157`, todos `success`.
- Generación real iniciada en el Producer autenticado: run
  `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a`, 10 créditos, `completed/retained`,
  `image/png`, SHA-256
  `b8a0eb45289558a2cb99e9989fa401aa794035c709505b10c58fba34e0768c1e`.
- El smoke descubrió un off-by-one en la finalización: `vertex-output:` tiene 14 caracteres y el
  driver aplicaba `slice(15)`. `1fb57285` usa la longitud del prefijo y agrega regresión focal.
  CI `30565123529` y worker `30565166238` quedaron verdes; el outbox recuperó el mismo run
  idempotentemente, sin una segunda generación ni un segundo cobro.

### Fal — Recraft v4.1 Vector

- Ruta: `ref/still/vector-v1`; endpoint `fal.recraft.text-to-vector`; modelo
  `recraft-v4.1-vector` versión `v4.1`; rate 4 créditos; restricción `no-sublicense`.
- Evaluación exacta: reporte `19504a56-3e70-43f5-a86a-bbc425312cd0`, experimento
  `a11692b1-3241-434f-8949-8cb4fc1b63b6`.
- Revisión humana `review_f38176d1-22b0-4639-884b-a1d61c00f5f4`; atestación
  `mcra_e7d74373-edbc-4de6-abd7-1c0888baa162`.
- Generación real iniciada en el Producer autenticado: run
  `b5631c86-707a-41d9-8ecc-ef61caa8200c`, attempt
  `eca867f2-a0cf-49d1-abfa-ebd06bc49c8a`, 4 créditos, `completed/retained`.
  La UI mostró Recraft v4.1, `Imagen · vectorizar`, el SVG real, `Guardada` y descarga.
- Fal declara `image/svg+xml` en el resultado, pero su CDN entrega esos bytes como
  `application/octet-stream`. El comportamiento se confirmó contra el endpoint y no se resolvió
  ampliando el allowlist MIME global.
- `84d6a8e` acepta el transporte genérico sólo cuando la salida esperada es SVG, verifica que el
  stream realmente empiece como SVG antes del ingest y sirve el asset con CSP sandbox. Es
  fail-closed para cualquier otro medio o contenido.
- `7f4d5ea` preserva razones seguras de finalización gobernada; `23ee9b5` preserva fallos seguros
  del stream del provider. El cliente sigue recibiendo códigos canónicos, nunca detalle upstream.
- CI `30573503498`, worker `30573508938`, API/Studio `30573523066` y
  `30573523128` terminaron `success`. El diagnóstico final `30574036402` confirmó run y
  attempt `completed`.
- Hubo intentos previos que fallaron antes del gasto por estado de circuito ausente. Después de
  cerrar el circuito se reutilizó el run final; no se regeneró durante el diagnóstico.

## Evidencia visual y de integridad

El índice canónico de capturas, runs, hashes y workflows está en
[`evidence/2026-07-30/README.md`](evidence/2026-07-30/README.md).

Las capturas son evidencia de la UI autenticada, no autoridad de estado por sí solas. Para declarar
una ruta disponible deben concordar: reader live, identidad de ruta, rate vigente, evaluación,
revisión/rights, readiness, binding, circuito, run terminal, output retenido y readback/diagnóstico.

## TASK-1614 — Seedance R2V durable evaluation (2026-08-01)

- Migración Globe `0040` aplicada; API interna y producer worker desplegados. No se desplegó Studio.
- Policy `seedance-r2v-evaluation` v2 publicada para `ref/video/motion-v1 / fal / seedance-2.0-r2v / 2.0`,
  `purpose=evaluation`, `appliesTo=derived`.
- Fuente canónica private-ingested: `asset_6e9c95d3-7b94-473d-b91a-00f8b35d9eec`, SHA-256
  `69cbc966999963ed2959c9adedf409560097dce06700d4fe5c9719292a392509`, 773.219 bytes, `video/mp4`,
  `working-30d`. El readback elegible `clean / verified / active / eligibleForGeneration=true` de `30682664152`
  precede la escritura terminal stale; el readback actual `30684654795` muestra la proyección persistida
  `rights=rejected / lifecycle=rejected / eligibleForGeneration=false`, que debe reconciliar PR `#74` sin repetir
  ingest ni provider spend.
- Run `eval_16272c31b11f75be3e0369870f89746b`, attempt `9361550f-6ce3-456d-b710-d5cd3ded6217`: Fal completó;
  estado `completion_received/finalizing`. No repetir provider spend: recuperar por readback/outbox.
- El diagnóstico allowlisted de PR `#72` confirmó que `generatedAssetParents` y la policy eran correctos. La causa
  era una carrera de autoridad: una proyección terminal stale de Asset Governance podía escribir rights antiguos
  después de una revisión más nueva. El reader compuesto mostraba el parent elegible, pero
  `registerGeneratedAsset` consumía la proyección persistida degradada y rechazaba `asset_rights_denied`.
- PR `#74` (`1a810df`) corrige la causa con `rights_revision` por asset/job, evidencia append-only y merge terminal
  independiente de malware, C2PA y rights. Una revisión stale ya no degrada derechos nuevos ni cuarenteniza por un
  fallo antiguo sólo de rights. `pnpm check`, `pnpm build`, CI PR `30684242455` y CI main `30684380636` pasaron.
- Migración `0041_asset_governance_authority_revision.sql`: plan `30684391269` limpio y apply/readback
  `30684420198` exitoso. API interna `30684456492` y producer worker `30684472892` se desplegaron desde `1a810df`;
  Studio no se desplegó.
- Asset Governance no se desplegó todavía. `30684456659` falló cerrado porque el scheduler estaba activo. PR `#75`
  (`353aa3b`) agregó lifecycle keyless `managed_reconcile`: captura baseline, pausa un scheduler activo, despliega
  el digest, ejecuta una reconciliación y restaura el estado inicial. CI `30684633070` pasó.
- El retry `30684770248` falló antes de build/deploy con
  `PERMISSION_DENIED cloudscheduler.jobs.pause`. PR `#76`
  (`37b6f7ddd99bbf348613c5cc9e68dae7a5393cd7`) añadió un rol custom mínimo con sólo
  `cloudscheduler.jobs.pause` + `cloudscheduler.jobs.enable`; CI `30684915496` y Terraform Check `30684915503`
  pasaron. El rol está mergeado en HCL pero aún no provisionado. Hasta aplicar IaC, desplegar/reconciliar el Job y
  recuperar el run no existen report, atestación, readiness, promoción ni prueba UI válidos.

## Riesgos abiertos

- Rollout externo/comercial sigue gated por `TASK-1480`; `internal_smoke` describe el estadio, no
  la naturaleza del producto.
- `TASK-1553` no puede cerrarse hasta registrar los receipts transversales de `TASK-1468` y
  `TASK-1578`.
- Gemini Omni continúa sólo en Model Lab para su ruta gobernada; no extrapoles la promoción de
  Vertex imagen a Interactions video.
- TASK-1614 permanece bloqueada operativamente en el rollout de Asset Governance: el deployer aún no tiene en vivo
  el rol mínimo de scheduler que PR `#76` declara. No uses IAM amplio ni pausa manual como sustituto del apply.
- La identidad temporal usada para consumo privado de AXIS debe sustituirse por una identidad de
  máquina antes del rollout externo; no recrees el secreto legacy de Globe.

## Siguiente paso ejecutable

1. Planear y aplicar el HCL de PR `#76`; aceptar sólo cero destroy/replace y verificar por readback que
   `globe-deployer` recibió el rol custom mínimo, sin permisos create/delete/update de Scheduler.
2. Reejecutar `Deploy Asset Governance Job (keyless)` desde el SHA exacto de `main`, modo `deploy` +
   `managed_reconcile`. Exigir digest exacto, topología `parallelism=1/taskCount=1`, reconciliación exitosa y estado
   final del scheduler igual al inicial.
3. Leer y recuperar `eval_16272c31b11f75be3e0369870f89746b` hasta report
   `objective_pass_pending_human` y output retenido/elegible. No volver a invocar Fal.
4. Completar revisión/atestación, readiness, binding, promoción, reader live y generación UI sólo para
   `ref/video/motion-v1 / fal / seedance-2.0-r2v / 2.0`. La prueba final es Chrome autenticado como
   `jreyes@efeonce.cl` en **Video → control de movimiento/cámara → Seedance 2.0**, con pieza nueva, playback,
   retención y governance. Omni, Seed Audio, Seedance Loop e Imagen/Seedream quedan fuera de la evidencia.
5. Después de TASK-1614, retomar los receipts de `TASK-1578`/`TASK-1553`; no confundir ese backlog de imagen con el
   bloqueo P0 actual.
