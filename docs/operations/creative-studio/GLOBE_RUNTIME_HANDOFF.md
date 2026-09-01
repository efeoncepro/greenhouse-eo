# Efeonce Globe — Runtime Handoff

> Continuidad activa del runtime de Globe bajo el control plane de Greenhouse (`EPIC-028` /
> `TASK-1492`). Código, infraestructura y evidencia técnica viven en `efeonce-globe`; este archivo
> conserva sólo el estado mutable, los riesgos abiertos y el siguiente paso. La historia anterior
> permanece auditable en el git log y en las tasks/ADRs enlazadas.
>
> **Corte verificado:** 2026-08-02 · Globe `main@fa286dbda0a3c1ce02de7d5a2ab173ba1bf34966`; Greenhouse
> tenía como base `develop@4a609c3adbffd909a665b0a7776fb22ef3d19f01` antes de este cierre documental. TASK-1614 conserva su cierre runtime en Globe
> `d79fda94ba97c7bd4b358c4eaf957ca1389ed9fc`; el corte posterior corresponde a TASK-1504 y no implica que Omni
> esté disponible. El fondeo mensual live fue verificado sobre
> `649eb08`; migraciones hasta `0048`, API y Studio están aplicados. El worker de expiry/recovery usa código
> `d3fe90e`, digest `sha256:d8295862dc12c14427e90e0bb413577802916c37ca6bf32c202680492ca7bae9`,
> deploy `30717266572` y baseline IaC `e369ef8` sin drift.

## Corte 2026-09-01 — TASK-1807: Producer reduce no-op ticks a cada cinco minutos

`globe-producer-worker` cambió su Scheduler de `* * * * *` a `*/5 * * * *` mediante Terraform, sin cambiar
imagen, CPU/memoria, IAM, target, timezone ni retries. El plan canónico incluyó
`development_environment_enabled=true` y el principal de desarrollo para preservar los 20 recursos cuyo estado
vivo depende de ese input: `0 add, 1 change, 0 destroy`; apply `0/1/0`; post-plan `No changes`.

Readback: Scheduler `ENABLED`; primer tick de la nueva cadence `globe-producer-worker-2lq2v` a las 21:00:07Z,
con `queueOldestAgeSeconds=0`, `outboxRetryStorm=0`, `outboxTerminalAttempts=0`, cero divergencias y cero fallos.
La ventana de observación de 24 h sigue abierta. Media Derivatives permanece `*/2`; Asset Governance permanece
`*/1` porque una etapa por tick hace que `*/5` degrade la convergencia a ~20–25 minutos. Rollback Producer:
restaurar `* * * * *`, plan honesto con `0 destroy`, apply y readback. El rollback fue verificado en dry-run con
development, budgets y quota project preservados: sólo update in-place, `0 add, 1 change, 0 destroy`; no se aplicó
porque el runtime permanece sano.

Señal temprana en ventanas iguales de 105 minutos: Producer redujo `billable_instance_time` 71,65% y tanto
CPU allocation como memory allocation 71,63%. El proxy sobre su baseline es CLP 84.169/mes; el techo por conteo
de ticks era CLP 94.003. No se presenta como ahorro facturado hasta que Billing Export alcance el corte.

Preflight de Slice 2 listo, todavía sin apply: `media_derivatives_schedule="2-59/5 * * * *"` produce un único
update in-place desde `*/2`, `0 add, 1 change, 0 destroy`, con development y budgets preservados. Los ticks
2/7/12/.../57 quedan escalonados respecto de Producer; source/apply/readback esperan las 24 h completas.

Guardrails FinOps aplicados después del corte: budgets alert-only Globe CLP 250.000 y consolidado CLP 370.000;
umbrales current 50/75/90/100% y forecast 90/100%; plan posterior sin drift. Los recursos Globe recibieron
`app`, `env`, `owner` y `cost_center` sin cambiar imágenes. Artifact Registry quedó con cleanup policy en dry-run,
KEEP de 10 versiones por paquete y DELETE simulado sobre versiones >30 días; no se borró ningún artefacto.
Cloud Build quedó separado: Globe `f479dd1` publica una policy `dry-run-only` y el comando
`pnpm finops:cloud-build-cleanup-dry-run`, sin opción apply/delete. El inventario live reporta 435 source archives,
631.024.414 bytes totales y 364/491.098.500 bytes elegibles por prefijo `source/` + 30 días, con `mutations=0`;
el bucket conserva soft-delete de siete días y no recibió lifecycle destructivo.

Asset Governance quedó publicado inicialmente en Globe `7eeb1da` y desplegado por el workflow canónico
`33561719287` sobre el digest `sha256:864a33c2ac30a9e10b4ab17c4b34c51cb149a4e1fc22889680875af322c69095`.
El runtime reclama y avanza hasta cuatro stages durablemente fenced por ejecución
(`GLOBE_ASSET_GOVERNANCE_MAX_STAGE_PASSES=4`); paquete 39/39 e infraestructura 5/5.

El canary real reutilizó un output retenido, sin nueva generación ni débito duplicado. Globe `6ff8995` corrigió
la reconciliación de ingest deduplicado y fue desplegado en la API por `33564129824`; el ingest único
`33564656669` creó el asset `asset_7578d730-ec05-45a7-a403-f1fcf290adb9`. El primer submit de derechos reveló
un trigger legado que apuntaba a `public.governed_assets`. Se cercó el scheduler en `rights_reconcile`, intento
4/5; Globe `b34e90d` agregó la migración forward-only 0051, plan `33565168932` y apply `33565516056` verdes.
El reintento `33565602892` verificó rights y se restauró el scheduler a `ENABLED`, `*/1`, UTC.

El batch real cerró con `claimed=1`, `applied=1`, `retried=0`, `failed=0`, `promoted=1`, `deleted=0` y
`queueOldestAgeSeconds=678`: inspection `accepted`, malware `clean`, C2PA `unverified/manifest_absent`, rights
`authorized` y terminal `eligible`. El lector gobernado `33565749181` devolvió HTTP 200, lifecycle `active`,
scan `clean`, rights verificadas y `eligibleForGeneration=true`. Se conserva `*/1`; el objetivo era reducir
la dependencia de múltiples ticks antes de espaciar el respaldo. Sólo después de cerrar las ventanas de Producer
y Media se evaluará `4-59/5`, con guardrail de cola <900 s y rollback a `*/1`. El preflight ya probó un único
update in-place, `0 add, 1 change, 0 destroy`; 4/9/14/.../59 evita colisión con Producer 0/... y Media 2/....
La imagen reporta ClamAV 1.4.3 frente
a 1.4.6 recomendada y el aviso no bloqueante de `clamd.conf`; es deuda de imagen separada.

No se hizo rightsizing: el runtime conserva `2 vCPU / 2 GiB`. En la ventana del canary, Cloud Monitoring observó
CPU utilization media muestreada de hasta 56,8% y memory usage media máxima de 586.080.256 bytes; bajar a
1 vCPU no deja headroom y las muestras por minuto no prueban peak/P99 de memoria suficiente para bajar a 1 GiB.
La siguiente evaluación requiere varias ejecuciones con trabajo real, percentiles y ausencia de backlog.

## Corte 2026-08-05 (b) — promoción end-to-end ejecutada; `ref/still/reference-v1` vuelve a estar viva

`promotion_4265dd26-7eda-4918-bd7d-10318dd6cd5f` recorrió `start → stage → promote → activate → canary →
canary-confirm` **sin una sola secuencia escrita a mano**, con el runbook nuevo:

- **`canary_passed` rev 9** (terminal), binding `enabled` rev 5, readiness `promoted` rev 2.
- Identidad exacta: `ref/still/reference-v1` / `fal` / `seedream-5-pro-edit` / `v5-pro`, endpoint
  `fal.seedream.edit`, región `us-central1`, `completionDriver=webhook-and-poll`, capability `image-edit`,
  contrato `preserve-set`.
- Canary: run `b811d5fc-9d80-4e9f-a0ab-736dac528ecd`, attempt `c0bbc8f1-8c23-4d11-96b3-e6efd61361c9`,
  output `sha256:3dae8ef188c8506781daa0b6f21e6e4840bf17bcbabf40c5dd16d12e04b22606` (PNG 8.359.849 B),
  governance `eligible` (revisión 17872). Generado 09:27:11Z, posterior a la activación de 09:24:13Z.
- Economía exacta: **10 aprobados = 10 estimados = 10 gastados**, reserva
  `86f1f6fc-4524-4d42-92fe-bc432d667b84`, una liquidación, `noDoubleDebit`.
- Evidencia reusada de la promoción anterior (sigue vigente): rights
  `arp_f2e93add…:mcra_2ad04617-c83a-4210-8c3c-651f9c71a010` (expira 2027-07-31), review
  `review_850163b7-bc10-481f-9942-1e6b28cd5cbc`, proposal `readiness:5ab78a7fb381a9d1ac19fe58e3292fdc`.

**La divergencia se cerró sola: `promotionReadinessDivergent` pasó de 1 a 0.** Encender el binding volvió
coherente la readiness `promoted`, sin necesitar la capability de pause.

### 🔴 Pausar una readiness NO tiene camino ejecutable hoy

`transitionModelRoute` hace `requireHuman(c)` para todo destino distinto de `promoted`
(`model-readiness.ts:106`) ⇒ un lane de service account **falla cerrado por diseño**; y
`globe.model-readiness.pause` **no está** en `PRODUCER_HUMAN_CAPABILITY_SCOPES` ⇒ un humano por el BFF
tampoco. **Nadie puede pausar una readiness.** Cerrarlo exige el rollout de 3 pasos del broker (el que
tumbó el login de Globe una vez) más una superficie que lo despache. Queda como follow-up; no se construyó
el modo en el operator lane porque habría sido un camino muerto.

## Corte 2026-08-05 — TASK-1641 DESPLEGADO, y el primer ciclo real destapó un falso positivo

**Runtime vigente:** Globe `main@b958a116a23a146b0523d04196e447ae11eb0d58`.

- API `globe-api-internal`, revisión activa **`globe-api-internal-00213-5z9`**, imagen tag `b958a116a23a`,
  tráfico **100%** (verificado con `run services describe`, no con el workflow en verde).
- Job `globe-producer-worker`, imagen por digest
  `sha256:82a4f2d3e0a6efce6e99cbbe91bf95d0a1a8d07128c4c2c9fc1db059ca8c25ed`. Las **dos** corridas del
  contrato (`mode=build` run `30990497627`, `mode=deploy` run `30990750079`).
- `tofu apply` ejecutado sobre plan guardado: **`6 to add, 1 to change, 0 to destroy`**; `tofu plan`
  posterior en **`No changes`**. Verificado en vivo: las 3 métricas
  (`globe_promotion_window_closing`, `globe_promotion_readiness_divergent`,
  `globe_run_abandon_release_degraded`), sus 3 alert policies, y
  `GLOBE_PROMOTION_WINDOW_WARNING_SECONDS=1800` en el Job.

**El consumidor está vivo:** `globe_worker_completed` publica `promotionWindowClosing=0` (correcto: no hay
promociones `activated`) y `promotionReadinessDivergent`.

### 🔴 El primer ciclo reportó 3 divergencias y DOS eran rutas VIVAS

`ref/still/rrss-v1` y `ref/still/openai-v2` tienen su última promoción de la saga en `rolled_back` **y su
binding `enabled`**: las habilitó el **lane automatizado de ADR-010, que no enruta por la saga** y por tanto
no deja operación posterior que las supersede. El remedio que la señal sugiere —pausar esa readiness— **las
habría retirado**.

La divergencia que fundó el contrato nunca fue «hubo un rollback» sino «el binding quedó apagado y la
readiness se quedó en `promoted`». «Última promoción revertida» era un **proxy**, y un proxy falla donde otra
autoridad puede deshacerlo. Arreglado en `efeonce-globe@b958a11` (el predicado exige el binding vigente
apagado); **medido en runtime: la señal bajó de 3 a 1** en el ciclo de las 08:55:14Z.

⚠️ **Ningún test atrapó esos dos falsos positivos** — aparecieron leyendo las primeras emisiones reales. Una
señal nueva no está verificada hasta comprobar sus primeras líneas una por una contra el estado real.

### La divergencia que queda es genuina y espera un acto humano

`ref/still/reference-v1` `v5-pro`: binding `enabled=false` (revisión 3), readiness `promoted` (revisión 2),
última promoción `promotion_3db707a6…` revertida el 2026-07-31. El remedio es
`globe.model-readiness.route.pause` sobre esa identidad exacta — autoridad disjunta de la saga a propósito,
así que es un acto de operador, no algo que el sistema deba cerrar solo.

## Corte 2026-08-04 (d) — TASK-1641: Scopes 2, 3, 5 y 6 cerrados en código; **rollout PENDIENTE**

`efeonce-globe@17c3fef` (Scopes 2 y 3) + `@21d6ee3` (Scope 5). `pnpm check` (1.680 tests) y `pnpm build` en
verde. 🔴 **Nada de esto está desplegado ni aplicado**: no hay deploy de API/worker ni `tofu apply`, así que
las tres alertas nuevas **no existen todavía en el proyecto** y la liberación pre-gasto no corre en runtime.

**Un solo consumidor para las dos señales de la saga**, porque son el mismo lector cross-workspace y
separarlos duplicaría el escaneo. Usa la política de scan que ya existía (`app.promotion_recovery_scan`,
migración `0028`): **sin migración nueva**.

- `globe_promotion_window_closing` (WARNING, 30 min de antelación) es el **complemento estricto** de
  `stalled`, que mide `deadline_at <= now` y por tanto avisa cuando la ventana ya venció — las cuatro
  promociones que murieron lo hicieron a +2 s, +18 s, +26 s y +40 s del deadline.
- `globe_promotion_readiness_divergent` (ERROR) es la señal que le faltaba al contrato para que
  `observable` significara algo. Se computa sobre el estado **leído ahora**.

🔴 **El predicado de supersede evitó que la señal naciera falsa.** Dos de las diez promociones revertidas
pertenecen a identidades que **después se volvieron a promover y quedaron selladas**
(`ref/motion/reference-v1`, `ref/video/frames-v1`): su readiness dice `promoted` por esa promoción
posterior, que es legítima. Sin el `NOT EXISTS` por identidad exacta, la señal habría acusado de divergencia
justo a las dos rutas que convergieron, y su remedio habría **retirado dos rutas vivas**.

**Scope 5 — medido contra `globe-pg` antes de tocar código:** la **única** reserva `held` de toda la base es
**pre-gasto** (32 créditos, run terminal sin `provider_operation_id`, TTL hasta el 2026-08-05 18:44Z) y hay
**cero** post-gasto. El 100 % del crédito inmovilizado hoy pertenece a la rama en la que la postura
`observable` era falsa. `abandon` la libera por los mismos primitives del camino hacia adelante; un fallo al
liberar degrada al TTL y se observa (`globe_run_abandon_release_degraded`), nunca se propaga — un throw
dejaría el experimento `running` para siempre.

**`tofu plan` honesto: `6 to add, 1 to change, 0 to destroy`** — tres métricas, tres alertas y el env var
`GLOBE_PROMOTION_WINDOW_WARNING_SECONDS` del worker. Nada más entra en el diff.

**Runbook publicado:** [`GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md`](GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md), con el
canary como paso explícito y el presupuesto real de la ventana (~10 min por intento sobre 3 h). Las tres
alertas con su remedio en [`GLOBE_PRODUCER_ALERT_TRIAGE_V1.md`](GLOBE_PRODUCER_ALERT_TRIAGE_V1.md).

**Siguiente paso**: deploy de `globe-api-internal` + `globe-producer-worker` (dos corridas: `mode=build` y
después `mode=deploy`) desde el SHA exacto con CI verde, `tofu apply` con `0 to destroy`, y verificación
contra la **revisión activa** y el digest etiquetado — nunca contra el workflow en verde.

## Corte 2026-08-04 (c) — TASK-1641: Scope 3 declarado; arranque de sesión nueva

`efeonce-globe@4a0a18b`. `PROMOTION_DEPENDENT_AGGREGATES` declara los tres agregados de la saga con
test bidireccional: circuito y binding `converges`, **readiness `observable`** — su primitive de
reversa existe (`route.pause`) pero exige una capability que la saga no porta, y dársela dejaría que
un rollback automático retire una promoción que un humano firmó. ⚠️ Falta el **consumidor** que emita
la señal; la divergencia hoy es computable, no observada.

🧭 **Para retomar `TASK-1641`:**
[`TASK_1641_SESSION_HANDOFF_2026-08-04.md`](TASK_1641_SESSION_HANDOFF_2026-08-04.md) — scopes cerrados
con evidencia, orden recomendado (el Scope 2 y el cierre del 3 son **el mismo trabajo**) y las trampas
ya pagadas.

## Corte 2026-08-04 (b) — el canary ya produce una ruta arbitraria (TASK-1641 Scope 1)

`efeonce-globe@1767138`, **sin desplegar** (es un script del repo, no runtime). `pnpm producer:canary
--route=<routeId>` deriva el `outputShape` desde el catálogo y resuelve sus entradas desde el feed
retenido. Dry-run verificado contra la API en vivo sobre cuatro rutas: `ref/video/frames-v1` (32 cr,
1 referencia), `ref/motion/reference-v1` (12 cr, 1), `ref/still/rrss-v1` (10 cr, 0) y
`ref/voice/tts-v1` (6 cr, 0). Sobre Veo reproduce **exactamente** la forma, la referencia y el costo
del sello artesanal de anoche.

**Ejercitado con gasto real (19:56Z):** `ref/motion/reference-v1` → `candidate_ready`, run
`6a6112f4-15f2-4fec-a8b5-aab2b5759e6b`, output
`sha256:2338c9ef9488a8cb780b974ae96201c1bde247075edbb28faa32a379967459a4`, MP4 **661.995 bytes**
retenido, governance `eligible`; **12 aprobados = 12 gastados**, una reserva y una liquidación,
`noDoubleDebit`. La referencia de entrada la resolvió solo desde el feed retenido.

Leer esa evidencia destapó que el canary **verificaba** el veredicto de governance y **no lo
reportaba** — corregido en `efeonce-globe@a6ff46f`.

El dry-run **certifica** sus referencias (gasto cero, idempotente) porque el estimate de una ruta con
entrada obligatoria no es computable sin ellas — el output lo declara en `referencesCertified`.

## Corte 2026-08-04 (noche) — TASK-1641: Omni y Veo sellados, migración `0050`

**Despliegue.** Globe `main@38c528d` (SHA completo `38c528d27b9ae67d4432055535cbd9e7975410cc`), con CI verde
sobre ese SHA exacto (run `30953279839`).

- API: servicio `globe-api-internal`, revisión activa **`globe-api-internal-00211-8sp`**, imagen
  `southamerica-west1-docker.pkg.dev/efeonce-globe/globe-runtime/globe-api-internal:38c528d27b9a`.
- Worker: Job `globe-producer-worker`, imagen por digest
  `sha256:14b80d2f150b29d25b61862a7bba265da4fbd4bb25c7aa2bd0ae66cb573202d6`, que en Artifact Registry lleva el
  tag `38c528d27b9a`.
- Workflows: `deploy-internal.yml` con `service=globe-api-internal`, y `deploy-producer-worker.yml` en **dos
  corridas** (`mode=build` y después `mode=deploy`), como exige el contrato de ese Job.
- **No se desplegaron** `globe-asset-governance` ni `globe-studio-internal`.

**Migración `0050_generated_asset_rights_authority_effective_lineage.sql`**, aplicada por el workflow keyless
`migrate-internal.yml` `mode=apply`, run `30953709590`, exit 0. La vista
`generated_asset_rights_authority_effective` pasa a proyectar **16 columnas**: `workspace_id`, `asset_id`,
`source_kind`, `run_id`, `attempt_id`, `output_index`, `route_id`, `provider_id`, `model_id`, `model_version`,
`readiness_rights_policy_version`, `route_snapshot_digest`, `parent_rights_digest`, `authority`, `recorded_at`,
`rights_policy_purpose`. Conserva `SELECT` para `globe-api-runtime@`, `globe-web-runtime@`,
`globe-producer-worker@` y `globe-asset-governance@` (los cuatro con sufijo `.iam`).

**`ref/motion/reference-v1` — Gemini Omni: canary sellado.** Identidad exacta
`gemini-omni-flash-preview / preview`, endpoint `vertex.omni.reference-to-video`, región `global`,
`completionDriver=poll`. La promoción **`promotion_1a5d117e-0a0c-4f63-92e7-817a808e0ff3`** quedó en
**`canary_passed`** (revisión 9, estado terminal); binding `enabled=true` revisión 10; circuito `closed`
revisión 9. El canary es run `74ea0dec-27c5-4d11-94d6-e0d459cfd61e`, attempt
`4f4ba0b4-0f4a-49f9-9909-764aeeec940c`, output
`sha256:2c3370a9b3c9c804ff505e98dd288c2588628085a2f2f3bb1a86f5271562695d`, governance `eligible`, generado
`2026-08-04T20:50:57Z` — **posterior** a la activación de `20:49:43Z`, que es lo que lo vuelve elegible como
canary.

**`ref/video/frames-v1` — Veo: canary sellado.** Identidad exacta
`veo-3.1-generate-001 / 3.1`, endpoint `vertex.veo.frames`, región `us-central1`, `completionDriver=poll`. La
promoción **`promotion_ddd0977c-c6e7-4fa6-bd31-61737c108d31`** quedó en **`canary_passed`** (revisión 9, estado
terminal: ya no expira); binding `enabled=true` revisión 11; circuito `closed` revisión 11. El canary es el
run/experimento `d2788195-3b13-4e33-b4fd-46e91638adc6`, attempt `68a75b70-91dc-4a7e-bd65-0d63dd0942f5`, output
`sha256:3a49d5ba1fdfdcc94973ecaf85d8e61d8cea710540e9a694e769e62e3ef17f4b`, governance `eligible`, run creado
`2026-08-04T22:45:11Z` — **posterior** a la activación de `22:03:02Z`, como exige `resolveCanary`. Economía
exacta: **32 créditos reservados = 32 gastados**. Forma de salida usada: 720p, 8 segundos, 16:9, `silent`,
`inputMode {kind:'frames', hasEndFrame:false}`. La referencia de primer cuadro fue el output ya gobernado
`output:8a5e24ec-0a92-4d9d-b9c8-5d52a37e5e5b:0`
(`sha256:b2762b738f45d6dd512cef9dfa0202046a2da9028e9af04d567411e9852093df`, `image/png`), declarado como
`authorizedInputs` con `rights: internal-owned`. El sello lo ejecutó `globe-operator-lane.yml`
`mode=canary-confirm` `lane=checker`, run `30958027741`.

**Re-verificado en runtime a las 23:09Z** con el reader canónico (`globe-operator-lane.yml` `mode=get`
`lane=routing`, run `30959001009`): `canary_passed` rev. 9, binding `enabled` rev. 11, circuito `closed` rev. 11,
governance `eligible`. El `deadlineAt` de `2026-08-05T01:03:02Z` **queda en el agregado pero no se puede cobrar**:
los barridos de expiración excluyen `canary_passed` y `rolled_back`. Y D12 de `ISSUE-138` se re-confirmó sobre el
attempt del propio canary —`gs://efeonce-globe-lab-evidence/governed-veo/68a75b70-…/sample_0.mp4`—, así que ese
issue pasó a `resolved/` con sus 13 hallazgos cerrados.

⚠️ **Matiz de honestidad: el canary NO se produjo desde la UI del Producer.** Se produjo por el **carril
gobernado**, con los commands canónicos del spine (`globe.lab.experiment.estimate` → `prepare` → `execute`)
sobre el transporte de `scripts/producer-ui-canary-lib.mjs`. La UI **sigue sin poder producirlo**: el botón
«Usar como referencia» del feed no despacha ningún command —`ProducerFeedRoute.tsx` cablea `onReference`,
`onRecreate`, `onFavorite` y `onDownload` a `() => undefined`—, y sin referencia el estimado no se calcula. O
sea: la promoción está sellada y la ruta habilitada, pero el **Scope 1 de TASK-1641 —un canary de ruta
arbitraria canónico y committeado— sigue pendiente**, y la generación desde el Producer para rutas con entrada
obligatoria sigue bloqueada.

**Bloqueo vigente de la entrada de referencias en el Producer.** La ruta exige 1-2 referencias de imagen y sus
**dos** caminos de entrada siguen rotos hoy:

1. **«Usar como referencia» y «Recrear» en el feed del Producer no despachan ningún command**: cero
   `POST /v1/commands`, cero consola. **«Añadir a favoritos» en la misma tarjeta sí registra**, así que el
   defecto no está en el overlay.
2. **La subida ingesta, pero Asset Governance falla en la etapa `inspecting` con `dependency_unavailable`**
   tras 5 intentos. Assets afectados: `asset_f861b971-4a6b-44eb-afc0-95623718131b` y
   `asset_86670e74-c71f-498a-9727-92d2f9a60461`.

⚠️ **Límite declarado del segundo hallazgo:** el ingest se disparó con un `File` sintético desde el browser.
**Antes de llamarlo defecto de plataforma hay que reproducirlo con una subida real por el selector de archivos.**

Evidencia gobernada de la promoción, por si hiciera falta reconstruir el linaje:

- `rightsEvidenceId` `arp_0bbbb5b5e8c880dd760a32879b505e32fbbe10278c009b0b1412b6dab4f13869:mcra_4da3c2f3-3be4-453d-84fd-b31764537951`
  (expira 2027-07-31).
- `reviewId` `review_48829ea4-53c6-42b6-bdec-800714d4ba12`.
- `proposalId` `readiness:dcc03360bb39d9b132f68d1a7b0c4d84`.

## Corte 2026-08-04 (tarde) — sello del reloj, canary reparado e ISSUE-139

**Revisiones activas:** `globe-api-internal-00207-28r`, `globe-studio-internal-00149-w9c` y el Job
`globe-producer-worker`, las tres sobre el mismo digest etiquetado **`e7a732c9b62e`**. Verificadas contra la
revisión activa y el tag del digest, no contra el workflow verde.

Commits en Globe `main`: `a69cb1f` (sello del reloj de la cola), `753042c` (una sola definición de
`coarseProgress`), `f06eae7` (el reader del experimento proyecta el attempt en vuelo), `e3088b2` (el entrypoint
del canary vuelve a parsear + guard), `e7a732c` (`ISSUE-139`).

🔴 **El sello del reloj, verificado sobre `governed_run_outbox`:** de **131 filas `done`**, **23 son
históricamente contradictorias** (`completed_at < available_at`), peor caso **−9,7 horas**. De las selladas por el
código nuevo: **0 contradictorias**, en los tres tipos de job. ⚠️ **Toda edad o latencia calculada sobre filas
anteriores al sello es sospechosa** — no cierres un incidente sobre ellas.

🔴 **El canary de generación estuvo ROTO desde el 2026-08-03.** Un comentario de bloque contenía una expresión de
cron literal cuya barra-asterisco **cierra el comentario**: el script dejó de parsear. `pnpm check` seguía
**verde** porque la suite importa la librería, no el script. `e3088b2` lo repara y agrega un guard que **parsea
todos los `scripts/*.mjs`** — un gate que no ejercita el entrypoint no lo cubre.

**`ISSUE-139` (resuelta):** el descriptor de output anunciaba un MIME **adivinado por modalidad** — un MP3 se
anunciaba `audio/wav`. Los bytes servidos SIEMPRE fueron correctos; mentía el descriptor, así que un consumidor
que lo use para nombrar la descarga produce la extensión equivocada. **La detectó el propio canary**, no un
usuario.

**Latencia end-to-end medida de una imagen: 7 min 48 s**, dentro del presupuesto de ~7,9 min.

**Sigue abierto:** `D12` de `ISSUE-138` (`storageUri` de Veo) — necesita un canary con gasto real, decisión del
operador.

## Corte 2026-08-04 — cadencia de Asset Governance (`ISSUE-137`)

`asset_governance_schedule` pasó de `*/5 * * * *` a **`*/1 * * * *`** en Globe **`d78ce01`**. `tofu plan`
con `0 to destroy` y el único cambio en el `google_cloud_scheduler_job.asset_governance`; Scheduler live
verificado en **`*/1 * * * * ENABLED`**, región **`southamerica-east1`** (Cloud Scheduler no soporta
`southamerica-west1`, que es donde vive el Job).

**Efecto medido** con dos generaciones reales por el carril workload, leído contra `globe-pg`:

| | governance | end-to-end | créditos | output |
|---|---|---|---|---|
| imagen (Seedream 5 Pro) | 183 s | 471,8 s | 10 = 10 | PNG 7,57 MB `retained` |
| video (Seedance) | 183,8 s | 474,0 s | 16 = 16 | MP4 `retained` |

Antes: ~1085 s de governance y ~22 min end-to-end. Que **imagen y video coincidan** siendo otro medio y otro
peso es la prueba de que la latencia era **cadence-bound, no size-bound** — y por tanto que el arreglo
generaliza. Presupuesto canónico y su razón estructural: [ADR-007 § Presupuesto de
latencia](../../architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md).

Consecuencias para lo que ya estaba escrito acá: la brecha que declara `TASK-1632` (despertar governance sin
esperar al Scheduler) **se encogió de ~5 min a ~1 min** — sigue válida por sus otras razones, pero su
dimensionamiento cambió (ver su Delta 2026-08-04). En el otro eje, `*/1` son **1440 ejecuciones/día** en vez
de 288.

## Estado activo

- Globe sigue siendo un producto comercial de Efeonce. El rollout continúa `internal-only`, con
  runtime `internal_smoke`; clientes externos siguen gated por `TASK-1480`.
- `https://globe.efeoncepro.com/producer` es la superficie humana autenticada. El browser usa BFF
  same-origin; no recibe credenciales de workload ni llama providers directamente.
- El reader `globe.producer.fleet.list` es el SoT live. El ledger humano es
  [`GLOBE_MODEL_FLEET_STATUS.md`](GLOBE_MODEL_FLEET_STATUS.md).
- El gateway federado `https://mcp.efeonce.org/mcp` expone el reader y el write interno one-shot
  `globe.credits.funding.ensure`. La tool acepta sólo `authorityId`; Greenhouse retiene identidad, límites y
  command, y Globe conserva la autoridad económica. No habilita generaciones, assets, delivery ni datos provider.
- Seis rutas de imagen están simultáneamente `available`: Seedream 5 Pro, Nano Banana Pro,
  Nano Banana 2, GPT Image 2, GPT Image 1.5 y Recraft v4.1.
- Las **dos** rutas de video quedaron promovidas, selladas y habilitadas el 2026-08-04:
  `ref/motion/reference-v1` (Gemini Omni) y `ref/video/frames-v1` (Veo 3.1) tienen su promoción en
  `canary_passed` terminal, binding habilitado y circuito cerrado.
- El canary de Veo se produjo por el **carril gobernado**, no desde la UI del Producer: la entrada de
  referencias del Producer sigue rota, así que el Scope 1 de `TASK-1641` (canary de ruta arbitraria canónico y
  committeado) sigue pendiente.
- `TASK-1553` permanece `in-progress` únicamente por el criterio transversal de rate-version
  receipts de `TASK-1468` y onboarding receipts de `TASK-1578`. Este pendiente no revierte la
  disponibilidad live de las seis rutas.
- TASK-1483, TASK-1628 y TASK-1630 están completas: Greenhouse staging y Globe internal sirven las vistas
  enriquecidas, MCP write pasó canary real y el corte no abre clientes externos.

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

## TASK-1614 — Seedance R2V durable evaluation (cerrada 2026-08-02)

- La identidad exacta `ref/video/motion-v1 / fal / seedance-2.0-r2v / 2.0` quedó activada y confirmada. La saga
  `promotion_557d4df1-994e-45ac-92f7-7ef885aa967e` pasó de `activated` rev. 7 a `canary_passed` rev. 9 mediante
  `canary-confirm` workflow `30742268557`; binding habilitado, circuito `closed`, completion driver
  `webhook-and-poll`.
- Producer autenticado con Google/Chrome `jreyes@efeonce.cl` y Greenhouse `jreyes@efeoncepro.com` generó exactamente
  una pieza nueva seleccionando **Video → Movimiento/control cámara → Seedance 2.0** y usando el parent gobernado
  `asset_6e9c95d3-7b94-473d-b91a-00f8b35d9eec` (SHA
  `sha256:69cbc966999963ed2959c9adedf409560097dce06700d4fe5c9719292a392509`).
- Run `bbe6dfff-41df-4569-95ef-07c51d555b97` y attempt
  `7bb11342-f0cd-4265-8c15-0c429617e1ae` son los únicos nuevos y terminaron `completed`; `run-get` workflow
  `30742234399` confirmó `providerAccepted=true`, `currentAttempt=1`, sin segundo run ni segundo cobro.
- El cobro único fue de 16 créditos (`800 → 784`). El output retenido es `video/mp4`, 788624 bytes,
  SHA `sha256:93adbf46c85efecd1ad51e7ebbc577cec21c23055ad3e250c876638a70400a5f`. Playback Chrome: `readyState=4`,
  duración `4.041667s`, `currentTime` `0 → ~1.699s`, `paused true → false`, `ended=false`, error `null`.
- Asset Governance final: `sourceKind=derived`, parent/ancestor correctos, `rights.verdict=verified`,
  `rightsClass=derived-internal`, `parentRights=internal-owned`, `scan=clean`, lifecycle `active`,
  `eligibleForGeneration=true`, governance `eligible/terminal=true` y retención `working-30d` hasta
  `2026-09-01T07:51:14.141Z`.
- La causa raíz de lineage se corrigió sin mutar autoridad histórica: migración `0048`, grants mínimos de parent
  rights y secuencia de auditoría, reparación `globe-asset-governance-ms9np` y progresión normal del worker hasta
  `promoted=1`. Los commits Globe `2e3b6a8`, `9036bbf`, `118f692`, `94a315a`, `f0d0bfdd0781dbe81df49a97f9a9689c323d5c37`
  y `d79fda94ba97c7bd4b358c4eaf957ca1389ed9fc` están en `main`.
- No se volvió a evaluar, no se invocó Fal directamente, no se fondeó, no se ejecutó SQL/break-glass y no se tocó
  Omni, Seed Audio, Seedance Loop, Veo o Seedream. Studio no requirió despliegue para este cierre.

## TASK-1504 — Gemini Omni (despliegue y saga activada; canary pendiente, checkpoint 2026-08-02)

> **Superado el 2026-08-04 (noche):** el canary de `ref/motion/reference-v1` quedó **sellado** bajo la promoción
> `promotion_1a5d117e-0a0c-4f63-92e7-817a808e0ff3` (`canary_passed`, revisión 9, terminal). Lo que sigue en esta
> sección se conserva como trazabilidad del checkpoint del 2026-08-02 — la promoción `promotion_922157fa…` y el
> bloqueo del modo `Elementos` **no describen el estado vigente**. El corte válido es el de arriba.

- Globe `main@62337b483fd965cd3a518fa1b9d13c7b0ac6d3f4` integra el driver gobernado con simetría API/worker
  para `ref/motion/reference-v1 / vertex-omni / gemini-omni-flash-preview / preview`; CI `30743786928` terminó
  verde. Los readbacks canónicos sobre ese SHA quedaron verdes: rights `30743848333`, readiness
  `30743849301`, route `30743850171` y circuit `30743851095`.
- La evaluación existente ya produjo un candidato retenido de 40 créditos: reporte
  `5f20a731-26e3-423b-b453-f5f0758e160f`, revisión `review_e77b2999-0da9-4eea-9081-3a0068b8a580` y attempt
  `d68605db-7d33-4ea6-b540-e6063668f3f7`. Route binding está habilitado rev. 5 y readiness `promoted` rev. 2,
  pero el circuito permanece `open` por `promotion_recovery_canary_unattested`; por tanto Omni aún no está
  `available` ni puede declararse cerrado.
- La atestación correcta e inmutable es `mcra_8c59f455-8704-47b1-9489-26d468f8ff8d`, con uso comercial y entrega
  a cliente permitidos, `sublicensable=false`, términos específicos de Gemini Omni y digest
  `sha256:04e949c5a43564c336d5380362b8cd2515766ee6bc85a736abec94cec7e53d4b`. La atestación anterior
  `mcra_3f32e30a-b4ff-4c34-82b0-7f1a0be4a6e9` es jurídicamente incorrecta y no debe reutilizarse.
- Globe `main@fa286dbda0a3c1ce02de7d5a2ab173ba1bf34966` corrige la causa raíz: la clave de idempotencia de
  `auto-promote` ya incorpora la atestación y el test de corrección de términos quedó verde. CI `30744034457`
  terminó verde (`check` + `build`). API workflow `30744857697` quedó en revisión
  `globe-api-internal-00187-9ht` con 100% de tráfico; worker workflow `30744857698` terminó con digest
  `sha256:764acd30c1e4678c87042e1fe004b25c984529cb92df3e0c5e18bd59b5e8a36a`. OpenTofu confirmó
  `1 to add, 2 to change, 0 to destroy`. API y worker tienen el gate Omni activo y acceso IAM al secret
  `globe-gemini-api-key`.
  La policy y la saga quedan verificadas en el delta posterior; sólo falta ejecutar exactamente un asset nuevo
  desde Producer con playback, cobro único, retención, lineage, Asset Governance y `canary-confirm`. No se debe
  abrir otro experimento ni repetir a ciegas el canary existente.

### Delta posterior — policy y saga activadas, sin canary (2026-08-02)

- `auto-promote` `30745031010` terminó `success` con `mcra_8c59f455-8704-47b1-9489-26d468f8ff8d`. La policy
  derivada `arp_8090d31ae570c016f84cad0f7aee09ba84578f1dbd3622074a38cfa03a839ff5` se leyó en `30745219391`
  con `no-sublicense`, `commercialUse=true`, `clientDelivery=true`, `sublicensable=false`, términos de
  Gemini Omni y digest `sha256:04e949c5a43564c336d5380362b8cd2515766ee6bc85a736abec94cec7e53d4b`.
- La operación `promotion_922157fa-b708-45cc-8bbf-b08d761afb21` recorrió start/stage/promote/activate en
  `30745272975`, `30745297572`, `30745319614` y `30745343659`. Los readbacks `30745513017`, `30745514170`,
  `30745515254`, `30745516291` y `30745517313` reconciliaron `activated` rev. 7, readiness `promoted` rev. 2,
  route rev. 7, binding habilitado y circuito cerrado por `promotion_activated`.
- El Producer autenticado mostró 784 créditos disponibles, pero después de seleccionar Video y
  `Gemini Omni Flash · Preview` mantuvo `Elementos` deshabilitado con `Todavía no hay un modelo publicado para
  este modo`, reproducido en dos pestañas. No se ejecutó generación, no hubo cobro ni run/attempt/output, y no
  se ejecutó `canary-confirm`. No se desplegó Globe Studio ni se usó bypass; la discrepancia Producer/BFF queda
  bloqueante y fuera del alcance autorizado de esta sesión.
- Diagnóstico live preciso: `/_client-seam` devuelve hidratación `ok` en la revisión Studio
  `globe-studio-internal-00133-b9k` (`595f0cb5460e`), pero el bundle publicado declara
  `MODE_CAPABILITIES.video[3] = undefined`; el filtro de modos convierte `Elementos` en cero rutas y lo deshabilita.
  Resolverlo exige una corrección y despliegue de Studio, prohibidos en este alcance.

## TASK-1632 — handoff interno de completion (diseño corregido, implementación pendiente)

- Globe ya verifica y deduplica el callback de Fal y encola `complete`. La brecha es despertar la finalización de
  Producer y Asset Governance sin esperar al Scheduler, mediante wakes durables at-least-once; los schedulers
  permanecen como mecanismo de recuperación.
- Este flujo vive íntegramente dentro de Globe. Greenhouse no participa; TASK-1475 conserva por separado cualquier
  evento o proyección futura entre productos. TASK-1632 no modifica el cierre de TASK-1614 ni el estado de promoción
  de TASK-1504. Al corte existe diseño corregido, pero no migración, deploy ni evidencia runtime de TASK-1632.

## Riesgos abiertos

- ✅ **Gate de fichas de ruta: cerrado el 2026-08-05.** Estuvo rojo por evidencia de proveedor vencida
  (`seedance-text-api`, `provider_primary`, observada 2026-07-22 con `ttlDays: 14`) de la que dependía el edge
  `provider_supported` de `ref/motion/loop-v1`. **Era preexistente** —verificado corriendo el validador con
  `--as-of 2026-08-04`—: venció por calendario. Se **revalidó**, no se editó la fecha: probe de existencia de
  gasto cero contra el endpoint de runtime (`POST {}` a `https://fal.run/bytedance/seedance-2.0/text-to-video`
  con la key propia de Globe) → **HTTP 422**, o sea el endpoint resuelve y rechazó el payload vacío en
  validación, no en ruteo (404 habría significado que el slug dejó de existir). `observedAt` a 2026-08-05 con
  nota que declara **qué** se verificó. Las 8 fichas pasan `--strict-freshness`.


- Rollout externo/comercial sigue gated por `TASK-1480`; `internal_smoke` describe el estadio, no
  la naturaleza del producto.
- `TASK-1553` no puede cerrarse hasta registrar los receipts transversales de `TASK-1468` y
  `TASK-1578`.
- Gemini Omni (`promotion_1a5d117e…`) y Veo 3.1 (`promotion_ddd0977c…`) ya tienen su canary sellado, ambos
  `canary_passed` revisión 9. La regla general se mantiene: **no confundir `promoted` en readiness ni un
  circuito cerrado con disponibilidad** hasta que exista el canary y su `canary-confirm`.
- 🔴 La **generación desde el Producer para rutas con entrada de referencia obligatoria sigue bloqueada**: los
  dos caminos de entrada (feed y subida) siguen rotos, descritos en el corte del 2026-08-04 (noche). El canary
  de Veo se selló por el carril gobernado, así que el bloqueo no revierte la promoción, pero **el Scope 1 de
  `TASK-1641` —un canary de ruta arbitraria canónico y committeado— sigue pendiente**.
- El fallo de Asset Governance en `inspecting` (`dependency_unavailable`, 5 intentos) se observó con un `File`
  sintético desde el browser. **No está probado como defecto de plataforma** hasta reproducirlo con una subida
  real por el selector de archivos.
- TASK-1614 está cerrada con evidencia live completa. El rollout externo/comercial continúa gated por `TASK-1480`;
  esta restricción no afecta el canary interno ni la naturaleza comercial de Globe.
- La identidad temporal usada para consumo privado de AXIS debe sustituirse por una identidad de
  máquina antes del rollout externo; no recrees el secreto legacy de Globe.
- El cliente Entra interno del gateway MCP recibe hoy base + reader (`efeonce.mcp.read` y `efeonce.mcp.globe.read`)
  aun cuando solicita el base. Antes de acceso B2B debe existir entitlement por tenant/capability y una identidad
  base-only que pruebe la denegación de Globe. El tercer scope del gateway, el write interno
  `efeonce.mcp.globe.credits.funding.ensure` gateado por `globeCreditFunding.enabled`, se autoriza aparte y no
  está verificado en esa co-emisión.
- Los 500.000 históricos permanecen sólo como auditoría append-only; ninguna proyección operativa los publica.

## Checkpoint de ejecución — Studio Credits enterprise (2026-08-01)

> **Actualización dominante 23:55 UTC:** TASK-1630 está cerrada. Los párrafos históricos de este checkpoint que dicen “local”, “sin
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
- Los dos holds antiguos fueron adjudicados mediante la decisión Finance exacta
  `historical_submission_unknown_no_deliverable`; se liberaron 14+16 con receipts gobernados y runs terminales.
  El bootstrap de 500.000 quedó fuera de status/UI/API/CLI/MCP, sin borrar su historia append-only.
- MCP `3add7b2`, deploy `30723992263`, pasó OAuth/Entra + WIF + RFC 8693 + command Greenhouse. La authority
  `df166eab-2c22-4009-a674-b83c8df307e4` terminó `completed/no_effect` y no duplicó los 800 efectivos.

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

1. Desbloquear **uno** de los dos caminos de entrada de referencia del Producer. Ya no hay ventana que corra
   —la promoción de Veo está sellada—, pero sin esto la generación desde la UI para rutas con entrada
   obligatoria sigue muerta. El camino 1 («Usar como referencia» / «Recrear» no despachan command) está aislado
   a esos dos controles, porque «Añadir a favoritos» sí registra desde la misma tarjeta; el handler vive en
   `ProducerFeedRoute.tsx`, que cablea `onReference`, `onRecreate`, `onFavorite` y `onDownload` a
   `() => undefined`. Para el camino 2, **primero reproducir la subida con el selector real** antes de tratar el
   `dependency_unavailable` de `inspecting` como defecto de plataforma.
2. **Desplegar `TASK-1641`** (todos sus scopes están code-complete y ninguno está en runtime): API + worker
   desde el SHA exacto con CI verde —el worker en **dos** corridas, `mode=build` y después `mode=deploy`— y
   `tofu apply` con el plan honesto, que verificado da `6 to add, 1 to change, 0 to destroy`. Verificar contra
   la revisión activa y el digest etiquetado, nunca contra el workflow en verde. Hasta entonces las tres
   alertas nuevas no existen en el proyecto y la liberación pre-gasto no corre.
3. Implementar TASK-1632 dentro de Globe sin introducir a Greenhouse en el path de finalización; conservar los
   schedulers como recovery y demostrar deduplicación/idempotencia antes del rollout.
4. Completar receipts/calibración amplia de TASK-1468/TASK-1579 sin reabrir TASK-1614/TASK-1630 ni alterar los
   800 efectivos. Mantener rollout externo y acceso MCP B2B gated por TASK-1480/TASK-1631.
