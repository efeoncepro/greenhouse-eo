# Efeonce Globe — Runtime Handoff

> Continuidad activa del runtime de Globe bajo el control plane de Greenhouse (`EPIC-028` /
> `TASK-1492`). Código, infraestructura y evidencia técnica viven en `efeonce-globe`; este archivo
> conserva sólo el estado mutable, los riesgos abiertos y el siguiente paso. La historia anterior
> permanece auditable en el git log y en las tasks/ADRs enlazadas.
>
> **Corte verificado:** 2026-08-01 · Globe `main@e31518b430b8d23b53abc473068185496a01b713`; Greenhouse
> `develop@f899d951b84aebd23bf8702042b4fffb1252bc1f`. El fondeo mensual live fue verificado sobre
> `649eb08`; migraciones hasta `0045`, API y Studio están aplicados. El worker de expiry/recovery usa código
> `d3fe90e`, digest `sha256:d8295862dc12c14427e90e0bb413577802916c37ca6bf32c202680492ca7bae9`,
> deploy `30717266572` y baseline IaC `e369ef8` sin drift.

## Estado activo

- Globe sigue siendo un producto comercial de Efeonce. El rollout continúa `internal-only`, con
  runtime `internal_smoke`; clientes externos siguen gated por `TASK-1480`.
- `https://globe.efeoncepro.com/producer` es la superficie humana autenticada. El browser usa BFF
  same-origin; no recibe credenciales de workload ni llama providers directamente.
- El reader `globe.producer.fleet.list` es el SoT live. El ledger humano es
  [`GLOBE_MODEL_FLEET_STATUS.md`](GLOBE_MODEL_FLEET_STATUS.md).
- El gateway federado `https://mcp.efeonce.org/mcp` consume ese mismo reader desde el 2026-08-01, pero sólo
  expone lectura interna: principal `globe:service:mcp-provider`, capability
  `globe.producer.catalog.read` y workspace `greenhouse-org:efeonce` exacto. No entrega selección de workspace,
  ejecuciones, assets, revisiones, delivery, créditos ni datos de proveedor.
- Seis rutas de imagen están simultáneamente `available`: Seedream 5 Pro, Nano Banana Pro,
  Nano Banana 2, GPT Image 2, GPT Image 1.5 y Recraft v4.1.
- `TASK-1553` permanece `in-progress` únicamente por el criterio transversal de rate-version
  receipts de `TASK-1468` y onboarding receipts de `TASK-1578`. Este pendiente no revierte la
  disponibilidad live de las seis rutas.
- TASK-1483 y TASK-1628 están completas: Greenhouse staging y Globe internal sirven las vistas enriquecidas y
  pasaron smoke Chrome autenticado sin errores. Esto no abre clientes externos ni amplía MCP write.

## Superficies operativas vigentes

| Superficie | Uso | Autoridad y regla |
| --- | --- | --- |
| Producer autenticado | revisión humana, atestación cuando corresponde y generación real | sesión del operador → BFF; la prueba de usuario debe iniciarse aquí |
| `Globe Operator Lane (keyless)` | evaluación, readiness, routing, auto-promoción, circuito, derechos y confirmación de canary | workflow federado con service accounts disjuntas por acto; combinaciones acción↔lane están allowlisted |
| `Diagnose Governed Run (keyless)` | leer estado final de un run/attempt sin mutarlo | read-only, tenant-scoped y sanitizado; publica artefacto diagnóstico sin mensajes, stack, body upstream ni secretos |
| Efeonce MCP Gateway | consultar la disponibilidad de rutas desde un cliente MCP OAuth | adapter externo de lectura; llama sólo `globe.producer.fleet.list` mediante el principal acotado, no reemplaza el BFF ni el policy de Globe |

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
- Contradicción resuelta por los readers canónicos de TASK-1482/TASK-1586 y el self-view de TASK-1628. El
  `available` histórico es una dimensión del ledger y no la capacidad del período. El fondeo live de agosto dejó
  `effectiveAvailable=800`, cap/remaining `1500`, spent/held `0`, una fuente vigente y pool
  `internal-month:2026-08`.
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
- TASK-1614 permanece `in-progress` sólo por el canary de una pieza nueva. El blocker de créditos fue retirado:
  Producer muestra 800 efectivos y su reader separa ledger, período, funding y daily fence.
- La identidad temporal usada para consumo privado de AXIS debe sustituirse por una identidad de
  máquina antes del rollout externo; no recrees el secreto legacy de Globe.
- El cliente Entra interno del gateway MCP recibe hoy ambos scopes aun cuando solicita el base. Antes de acceso
  B2B debe existir entitlement por tenant/capability y una identidad base-only que pruebe la denegación de Globe.

## Checkpoint de ejecución — Studio Credits enterprise (2026-08-01)

> **Actualización dominante 19:34 UTC:** los párrafos históricos de este checkpoint que dicen “local”, “sin
> migración”, “sin deploy” o describen Globe `develop` quedaron supersedidos por el corte siguiente. Se preservan
> únicamente como trazabilidad del orden de ejecución.

- Globe usa únicamente `main`; Greenhouse usa `develop`; ambos conservan un solo checkout y cero worktrees
  aislados.
- Migraciones Globe `0043`–`0045` y Greenhouse TASK-1586/TASK-1629 están aplicadas con readback limpio. El cliente
  público `greenhouse-admin-cli` está activo y el CLI OAuth PKCE completó loopback desde Chrome autenticado.
- Operación live `23db5b0e-89dd-4661-9b8d-c12f9be4ad7a`: target 800, grant 800, cap 1500, pool determinístico
  `internal-month:2026-08`, estado `completed`, capacidad efectiva `0 → 800`, un grant y una allocation.
- Greenhouse `/admin/globe/credits`, CLI `status` y Globe Producer leyeron 800 efectivos, funding 800, cap y
  remaining 1500, spent/held 0 y cero blockers. Evidencia:
  [`evidence/2026-08-01/README.md`](evidence/2026-08-01/README.md).
- El rollover ya crea o reutiliza el pool mensual dentro de la misma transacción que grant, allocation y policy;
  un pool pausado/cerrado/incompatible falla cerrado. Fix Globe `649eb08`, CI `30714494242`, deploy API
  `30714686669`, deploy Studio `30714686697`.
- TASK-1629 queda probado por ambos canales: browser one-shot y OAuth PKCE/API/CLI. TASK-1482 no conserva blocker
  runtime propio. TASK-1468/TASK-1579 conservan únicamente sus gaps más amplios de lifecycle/calibración; el
  rollout de expiry quedó activo. Scheduler `lmb2r` reportó `claimed=2`, `reconciliationRequested=2`,
  `deferred=2`, `failed=0`; canary `j8nnw` terminó sobre el mismo digest.
- Los dos holds antiguos son `submission_unknown` sin `providerOperationId`. Permanecen diferidos bajo
  TASK-1630 y sostienen la métrica de edad; resolverlos exige evidencia autoritativa o decisión Finance, nunca
  force-release. TASK-1586 está `complete` porque el recovery plane y worker operan correctamente.

- Goal activo: completar TASK-1482 → TASK-1468+1579 → TASK-1586 → TASK-1629 → TASK-1483 → TASK-1628 con
  migraciones, runtime, observabilidad, runbooks y evidencia local/staging/live; no basta código ni documentación.
- Preflight ejecutado: `pnpm codex:task-hook TASK-1482 --develop --subagents` sobre el checkout compartido.
- Auditoría inicial Globe: el kernel durable, reservas y fondeo `propose → confirm` existen; no se crea otro
  ledger. `evaluateCreditBudget` no comparte el evaluador transaccional de `reserve`; `getAvailability` mezcla
  historia completa con período; caps de proyecto/período omiten holds; candidatos no aplican período/scopes ni
  `fundingPriority`; `settle` no reautoriza `actual > reserved`; no hay caller operativo de expiry ni
  `ensure-funded` por objetivo.
- Auditoría inicial Greenhouse: están vivos intents, provenance, delegación agente persistente, API Platform y CLI.
  La regla de segundo confirmador ya es condicional en base de datos, aunque quedan mensajes/comentarios stale.
  La autoridad one-shot CEO→agente y los adapters de readback/ensure-funded aún no están implementados.
- G0 workspace authorization quedó code-complete local: API Platform preserva `workspaceBindings` del OAuth y
  los aplica antes del broker; las rutas admin resuelven la misma proyección Greenhouse y también fallan cerradas.
  Evidencia: 19 tests focales y `pnpm typecheck` verdes. No está desplegado todavía.
- Primer slice del kernel TASK-1482 quedó code-complete local en Globe: `CreditDecisionSnapshotV2` publica período,
  spent+holds, remaining, funding elegible, capacidad efectiva, blockers, coverage y freshness; preview y reserve
  consumen los mismos facts/evaluator; pool/grant respetan período y capability scope; `fundingPriority` ordena
  candidatos; los caps mensual/proyecto descuentan holds; reserve pinnea período, fingerprint, máximo autorizado y
  versión de settlement; `actual > reserved` falla cerrado. La migración aditiva es `0043_credit_decision_snapshot_v2.sql`.
  Evidencia local: `pnpm check && pnpm build` terminó con exit 0; 42 tests de contracts, 389 de domain, 126 de
  database y 284 de studio-web, además de los gates/clientes del monorepo. No se aplicó la migración ni hubo deploy.
  Commit local de Globe `develop`: `8e2c0cb feat(credits): unify decision snapshot and reserve policy`.
- Estado de repos: Greenhouse en `develop` con WIP ajeno preservado. Globe ahora tiene `develop` creado desde
  `origin/main@001ce1b`, publicado y activo en el checkout compartido; `main` permanece como rama predeterminada
  y de release. El commit `9dc166c` agrega el contrato no-worktree/develop y CI para pushes a `develop`; su frase
  inicial sobre default branch se corrigió inmediatamente después. El JSON ajeno no versionado sigue intacto.
  GitHub branch protection no está disponible para este repo privado en el plan actual (API 403); no se falsea
  ese control. `main` sigue release-only y sus workflows de deploy exigen SHA exacto.
- Acciones todavía no realizadas: no migración aplicada, no deploy, no fondeo, no generación ni release completo.
  El slice de kernel queda en commit local de `develop`; su push/promoción se decide sólo dentro del rollout.
  La verificación browser futura debe usar la sesión Chrome autenticada anclada a `jreyes@efeonce.cl`.
- Próximo punto seguro de continuación: cerrar TASK-1468+1579 con outcomes explícitos de settlement y expiry
  reconciliada antes de liberar holds; luego implementar `ensure-funded` idempotente sobre `propose → confirm`.
  TASK-1482 sigue `in-progress`: código local no equivale a migración aplicada ni operación live.
- TASK-1579 pasó a `in-progress`. La policy local `studio-credits-settlement-v1` ya converge ambos finalizadores en
  cuatro outcomes: settle, release, keep-held-for-reconciliation y requires-reauthorization. Timeout aceptado,
  parcial y fallback fuera del envelope no liberan ni cobran. `pnpm check && pnpm build` pasó completo; commit
  local de Globe `develop`: `9acfa58`. El próximo slice
  es expiry periódica en el `globe-producer-worker` existente, secuencial después del governed batch, con
  claim/lease/fencing y reconciliación obligatoria; no se libera por TTL a ciegas.
- El slice de expiry ya quedó code-complete local: migración `0044_credit_reservation_expiry_claims.sql`, claim
  tenant-scoped con `FOR UPDATE SKIP LOCKED`, lease/fencing, ejecución posterior al governed batch y liberación
  exclusiva ante evidencia terminal `failed|cancelled`. `completed|timed_out|unknown|partial` conserva el hold;
  estados activos solicitan cancelación o conciliación. El worker expone summary y edad del hold vencido más
  antiguo, con alerta WARNING a 900 segundos. Flag Terraform default `false`; no se aplicó migración ni deploy.
- La rama predeterminada, de integración y release de `efeonce-globe` es y debe seguir siendo `main`. Su checkout
  compartido trabaja directamente en `main`; `develop` corresponde únicamente a `greenhouse-eo`. No usar
  worktrees ni cambiar el default branch como parte de esta ejecución.
- TASK-1586 quedó code-complete local a nivel de contrato/read-recovery: capacity admin/self comparte evaluator
  con reserve; lifecycle de funding tiene operation list/get, expiry bounded, receipt append-only y reconcile
  readback-first que jamás repite la mutación económica. Globe agrega migración `0045`; SDK tiene wrappers tipados.
  Greenhouse agrega status/preview/operations/reconcile con entitlement y binding OAuth exacto, más la migración
  de catálogo `20260801130000000_task-1586-globe-credit-recovery-entitlements.sql`. Evidencia focal: Globe
  contracts 44/44, domain 406/406, database 139/139, SDK 18/18 y studio-web 286/286; Greenhouse 9/9, migration
  marker gate y typecheck verdes. Sigue pendiente migrar, desplegar, activar el worker y verificar staging/live.

## Rollout Studio Credits verificado el 2026-08-01

- Greenhouse Vercel staging: deployment `dpl_F153TxebTXfkLVjg12SiJtqSBXsH`, `Ready`, alias
  `https://dev-greenhouse.efeoncepro.com`; no hubo release completo ni promoción a producción.
- Globe API: workflow `30721563575`, revisión `globe-api-internal-00183-cml`, digest
  `sha256:84918e8d5c1836731b85f1e20f5ac91b459b7db0bfee8eaa49546f18b852c15d`, Ready y 100 % del tráfico.
- Globe Studio: workflow `30721563554`, revisión `globe-studio-internal-00132-rdt`, digest
  `sha256:5c4c5b171f9b700d73f64454aea24d864f44f30b9cd6836d8f6d86a4b8e90f7c`, Ready y 100 % del tráfico.
- Chrome autenticado con `jreyes@efeonce.cl` verificó ambas surfaces, cifras 800/800/1500/0/0, daily fence
  500/120/380 y cero errores de consola. El smoke fue read-only y no repitió la mutación económica.

## Siguiente paso ejecutable

1. Extender exclusivamente el gateway existente `https://mcp.efeonce.org/mcp` para MCP write cuando tenga
   identidad agente propagada, scopes y conformance equivalentes; no crear otro servidor MCP.
2. Completar receipts/calibración de TASK-1468/TASK-1579 y la decisión Finance sobre los 500.000 históricos.
3. Reconciliar los dos outcomes históricos sólo con evidencia de provider/receipt o procedimiento Finance
   explícito; mientras tanto permanecen diferidos, observables y nunca force-released.
4. TASK-1614 ya no está bloqueada por créditos; ejecutar su canary nuevo desde Producer cuando corresponda.
5. Mantener rollout externo y acceso MCP B2B gated por TASK-1480/TASK-1631 y sus canaries de identidad.
