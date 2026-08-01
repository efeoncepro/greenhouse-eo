# Efeonce Globe — Runtime Handoff

> Continuidad activa del runtime de Globe bajo el control plane de Greenhouse (`EPIC-028` /
> `TASK-1492`). Código, infraestructura y evidencia técnica viven en `efeonce-globe`; este archivo
> conserva sólo el estado mutable, los riesgos abiertos y el siguiente paso. La historia anterior
> permanece auditable en el git log y en las tasks/ADRs enlazadas.
>
> **Corte de código verificado:** 2026-08-01 · Globe `main`
> `90d0d48861d03e17ef95e2b7cbabdb14b7c1af47` (PR `#82`). Migraciones hasta `0042` aplicadas; API
> interna, producer worker y Asset Governance desplegados. Studio no se desplegó para TASK-1614.

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

- PRs `#74…#82` están mergeados. El lifecycle keyless del scheduler quedó provisionado y ejercido; migraciones
  `0040`, `0041` y `0042`, API interna, producer worker y Asset Governance están aplicados. PR `#81` cerró
  replay de derived rights y PR `#82` el grant mínimo de persistencia del reporte.
- Policy de evaluación `seedance-r2v-evaluation` v2 permanece publicada para
  `ref/video/motion-v1 / fal / seedance-2.0-r2v / 2.0`, `purpose=evaluation`, `appliesTo=derived`.
- Fuente canónica private-ingested: `asset_6e9c95d3-7b94-473d-b91a-00f8b35d9eec`, SHA-256
  `69cbc966999963ed2959c9adedf409560097dce06700d4fe5c9719292a392509`, retención hasta
  `2026-08-30T23:27:57.776Z`. Output exacto retenido:
  `sha256:58cc144e0092dbbcd585bdaff44046c7df83df6071ba32bcfc3e05191b28be41`, retención hasta 2026-08-31.
- Evaluación `eval_16272c31b11f75be3e0369870f89746b`, attempt
  `9361550f-6ce3-456d-b710-d5cd3ded6217`, terminó con reporte `candidate_ready`. Fal no se volvió a invocar.
- Atestación `mcra_abf61584-46b2-4aa1-adb5-1374d46a6966`, revisión
  `review_8561c3a9-67ed-4a51-a777-5d7d98746d9f` y readiness
  `readiness:3fec1f4037aad02f6eb07f471bc7c949` están firmados.
- Policy productiva `arp_77a9a0efe8b3f6d3d66a635bfcb05fba2e5268e07baa637ad1bfbe829a301dc4` y saga
  `promotion_4bda2e0f-6264-4633-a370-4aecf5deaa1a` están activadas: binding revision 2 habilitado y circuito
  revision 2 cerrado.
- Playwright verificó el candidato retenido (`readyState=4`, duración 5,06195 s, reproducción 0→1,738 s, sin
  error) y la selección exacta **Video → Movimiento/control cámara → Seedance 2.0**. La generación final nueva no se
  ejecutó porque el composer muestra presupuesto de agosto `0 / 0`.
- Contradicción pendiente: balance live `available=500836`; usage agosto `allocated=0`, `spent=0`; fondeo
  durable anterior `+500`, cap `800→1500`, disponible `836`. No ejecutar otro fondeo hasta reconciliar policy,
  grants, budget y período por readers canónicos.
- Identidad Google/Chrome: `jreyes@efeonce.cl`. Identidad Greenhouse verificada:
  `jreyes@efeoncepro.com` / `user-efeonce-admin-julio-reyes`. Los intentos fallidos de OAuth y adapter no
  crearon propuesta, grant, run ni gasto.

## Riesgos abiertos

- Rollout externo/comercial sigue gated por `TASK-1480`; `internal_smoke` describe el estadio, no
  la naturaleza del producto.
- `TASK-1553` no puede cerrarse hasta registrar los receipts transversales de `TASK-1468` y
  `TASK-1578`.
- Gemini Omni continúa sólo en Model Lab para su ruta gobernada; no extrapoles la promoción de
  Vertex imagen a Interactions video.
- TASK-1614 permanece `in-progress` sólo por el canary de una pieza nueva. Antes de mutar presupuesto se debe
  explicar la divergencia entre fondeo durable, balance, usage agosto y el `0 / 0` visible. No asumir saldo Fal,
  ausencia de grant ni UI stale sin reader.
- La identidad temporal usada para consumo privado de AXIS debe sustituirse por una identidad de
  máquina antes del rollout externo; no recrees el secreto legacy de Globe.

## Siguiente paso ejecutable

1. Empezar sólo con discovery: leer TASK-1614, TASK-1566, TASK-1616 y el manual de fondeo. No desplegar, fondear,
   generar ni usar SQL.
2. Consultar policy efectiva, grants, budget/availability y usage de agosto mediante primitives canónicas. Reconciliar
   los IDs del fondeo previo registrados en TASK-1614 y clasificar la causa antes de proponer nada.
3. Autorizar `propose → confirm` únicamente si el plan legible demuestra un déficit real; recuperar primero intents
   ambiguos y verificar actor humano `jreyes@efeoncepro.com`.
4. Con presupuesto admitido, generar una sola pieza en Playwright con **Video → Movimiento/control cámara →
   Seedance 2.0** y verificar run, playback, retención, governance y canary de la saga.
5. No tocar Omni, Seed Audio, Seedance Loop, Veo ni Seedream. Cerrar TASK-1614 sólo con esa evidencia.
