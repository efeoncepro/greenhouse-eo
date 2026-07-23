> **Continuidad de runtime de Efeonce Globe — bajo el control plane de Greenhouse (TASK-1492).**
> Este archivo es la continuidad activa del **runtime** de Globe (deploys, rollout, verificación en vivo,
> hardening). Repatriado desde `efeonce-globe/Handoff.md` (historia previa auditable en el git log del repo
> hermano). El `Handoff.md` principal de Greenhouse referencia este archivo para el detalle de runtime de Globe;
> el **código/infra** siguen en `efeonce-globe`. Modelo de contexto: `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.

---

# Handoff

## Active state — 2026-07-23 (Producer interno genera y reproduce; cierre comercial aún no)

### Runtime e identidad

- `TASK-1519` está **complete**: browser → BFF same-origin → API IAM-private opera con delegación, CSRF,
  actor/workspace/surface server-derived, IAM y grants acotados. Las migraciones `0001…0023` están aplicadas.
- Globe `main` está en `eac1730a898b817a6202b5ae309fb60dfce0062a`. CI
  [30036793089](https://github.com/efeoncepro/efeonce-globe/actions/runs/30036793089), deploy API
  [30036836510](https://github.com/efeoncepro/efeonce-globe/actions/runs/30036836510) y deploy Studio
  [30036838868](https://github.com/efeoncepro/efeonce-globe/actions/runs/30036838868) pasaron. Studio sirve
  `globe-studio-internal-00059-2db` al 100%; API sirve `globe-api-internal-00058-hqx` al 100%.
  Los deploy attempts [30036800428](https://github.com/efeoncepro/efeonce-globe/actions/runs/30036800428) y
  [30036802712](https://github.com/efeoncepro/efeonce-globe/actions/runs/30036802712) fallaron antes de build por
  `target_sha` corto y fueron supersedidos por los runs verdes con SHA completo.
- El front door conserva HTTP `301`, HTTPS `200`; API anónima permanece `403`. Clientes externos/Production
  siguen bloqueados por `TASK-1480` y gates comerciales. Internal-only no equivale a GA.

### Producer, catálogo y media

- El catálogo `1.2.0` contiene **10 rutas** (2 Image, 4 Video, 4 Audio). Sólo **3 rutas exactas** están promovidas
  durablemente, con bindings habilitados y circuitos cerrados: Seedream 5 Pro (`ref/still/rrss-v1`), Seedance 2.0
  (`ref/motion/loop-v1`) y ElevenLabs Multilingual v2 (`ref/voice/tts-v1`). Las otras 7 requieren su propia
  evidencia, revisión humana, propuesta, promoción, binding, circuito y canario.
- Readback Cloud SQL del 2026-07-23 confirma que reports/reviews/readiness/bindings/circuits/rights sólo existen
  para esas tres rutas. De las siete pendientes, seis tienen ejecución durable posible tras cerrar evidencia;
  Gemini Omni no tiene provider driver/allowlist/result driver ni secret/IAM del Worker. Voice Changer/Dubbing
  carecen además de `fidelityContract`. Seed Audio tiene fixture y terms packet, pero sólo para evaluación interna
  sin entrega a cliente.
- `scripts/producer-ui-canary-lib.mjs` publica la matriz exacta de siete blockers y ya no permite un batch
  todopoderoso: `stage`, `promote`, `activate` y `rollback` son fases separadas; activation exige readback de
  readiness promoted, binding disabled, circuit open y rights exactos; rollback abre circuito primero.
- Cloud SQL registra al menos 6 runs `completed`. Image, Video y Audio produjeron outputs reales; el feed llegó a
  10 piezas y
  los tres medios se sirvieron con `200`. El video exacto
  `3c6683c7-83dc-46d6-9f11-5c5f21fd13ce` se reprodujo como MP4 1280×720, duración 4.041667 s.
- El bucket privado `efeonce-globe-lab-evidence` contiene 26 objetos / 48,866,088 bytes (~46.60 MiB). Los objetos
  son content-addressed por SHA-256; ownership, manifest, MIME, lineage y estado viven en Postgres/dominio. La UI no
  depende de URLs del proveedor.
- `dcc9a89` hidrata el feed por identidad exacta; `94d1718` corrige selección/render del viewer; `b7adef3`
  recupera sesión válida con CSRF rotado mediante refresh single-flight y un retry. La secuencia live fue
  reader `403` → session `200` → reader `200` → output `200`.
- `8d7ecb1` tipa una sesión realmente ausente/expirada como `authentication_required`, expone reautenticación
  visible, conserva sólo destino/output efímero same-origin y nunca repite commands de gasto. El smoke humano con
  el usuario CEO recorrió dos veces `sesión expirada → Entrar nuevamente → /producer`, rehidrató 10 piezas y abrió
  el viewer real. `f9839ee` corrige además el fallback de modalidad: si el output retenido no repite `mediaType`,
  el viewer usa la modalidad client-safe del item; el SHA desplegado materializó exactamente `img`, `video` y
  `audio`, visibles con controles para Video/Audio, y las tres descargas mostraron confirmación autorizada.
- Gap separado: la UI todavía debe reemplazar su consumer/feed visual por la proyección live y converger cards,
  selección y viewer contra la UI aprobada. `TASK-1525` quedó **complete internal-only** como base
  server-authoritative del reader durable `globe.producer.feed.live.list|changes`: unión
  `active-run | terminal-run | retained-asset`, cursor opaco con paginación `older` y cambios `newer`, store SQL
  batch sin writes/N+1, flag `GLOBE_PRODUCER_LIVE_FEED_ENABLED` fail-closed y errores DB sanitizados. Secuencia
  cerrada el 2026-07-23: recovery gobernado de policies `30027548034` (`6/6` unambiguous, `0` unresolved),
  migración `0026/0027` `30027634439` (`pending=[]`), flag Terraform `2d75909`, grant/parity fix
  `be372d38d7b100635c35e33c5a314119ef8df48c`, hardening SQL `bd63b42`, fix de precedencia/alias runtime
  `ed5e9933696e40234b28391c8ea726f16a4e5f22`, CI final `30030871101` verde, deploy API `30031056615` →
  `globe-api-internal-00056-jqc`, deploy Studio `30031059039` → `globe-studio-internal-00057-pnx`, ambos con
  imagen `ed5e9933696e`, tráfico 100% y `GLOBE_PRODUCER_LIVE_FEED_ENABLED=true`. Reproducción read-only contra
  Cloud SQL local: `ok:true`, `count=2`, primer retained asset con output. Smoke humano final en la pestaña Chrome
  existente `/producer`: `/v1/session` `200`, reader `200`, `count=10`, `modalities=["image","audio","video"]`,
  `watermark=true`, primer item `Seedream · 5 Pro`; tras refresh, DOM `complete`, `Mis generaciones` presente,
  `Seedream · 5 Pro`/`ElevenLabs` presentes, sin `Generación en curso` ni fallback gigante `Vista previa de <uuid>`
  en el primer fold. `TASK-1526` quedó complete internal-only en `eac1730`: cards inline keyed, previews aisladas,
  selección estable, títulos client-safe y watcher acotado hasta terminalización. Smoke humano same-tab en Chrome CEO:
  una generación image nueva apareció inline, progresó sin reload `queued → running → completed`, terminó con preview
  blob `2048×2048`, `uuidFallback=0`, `broken=0` y título propio; viewer Image/Audio/Video quedó
  `producerViewerState=ready`, audio/video reprodujeron silenciados (`played=true`) y no apareció `No tienes acceso`
  ni retry visible.
- **Corrección de aceptación 2026-07-23:** ese smoke no ejercitó invariancia de nodo/cache durante filtros,
  búsqueda, orden y refresh. Auditoría humana posterior en la misma pestaña CEO probó Todas→Video con
  convergencia tardía `12→3` y Video→Todas con desaparición/reaparición de una imagen, nueva Blob URL y retrieval
  repetido. El código confirma que `renderFeed()` reemplaza el subtree y que la cache se poda con el subconjunto
  filtrado. `TASK-1526` vuelve a `in-progress` para un reconciler keyed real, lifecycle de cache acotado y query
  coordinator con debounce/supersession. `eac1730` sigue siendo el runtime vivo hasta un deploy correctivo verde.
  No declara comercial ready.

### Asset Governance y alertas

- `645c143` clasifica MP4/MP3 válidos sin Content Credentials como
  `unverified/c2pa_manifest_absent`, no como dependencia caída. `a5ef907` reconcilia revisiones terminales no
  proyectadas y conserva autoridad durable de rights.
- El Job usa el digest `sha256:23103b5712f035a120a1c84c53d6913710a66535c7ead7f8112ea60bdd345770`
  (tag `a5ef90756ba2`). La ejecución `globe-asset-governance-kn549` terminó verde:
  `claimed=3`, `applied=3`, `promoted=1`, `failed=0`.
- `8d7ecb1` comparte una sola definición SQL de trabajo reclamable entre claim y queue age, supersede el reconcile
  hermano al checkpoint/finalización y ejecuta recuperación bounded/idempotente/auditada desde el Worker. El primer
  tick desplegado terminalizó **6** residuos históricos —los 5 documentados más el run nuevo observado durante el
  diagnóstico— con `superseded_by_terminal_state`; reportó `queueOldestAgeSeconds=0`. El tick siguiente confirmó
  `supersededReconciles=0` y queue age `0`. No se ejecutó SQL manual.
- Las políticas vivas declaran `globe_worker_failed=ERROR` y `queue_age=WARNING`. El evento aislado sigue siendo
  accionable; `CRITICAL` queda reservado para indisponibilidad sostenida o riesgo de gasto/tenant. Triage:
  [`GLOBE_PRODUCER_ALERT_TRIAGE_V1.md`](GLOBE_PRODUCER_ALERT_TRIAGE_V1.md).

### Gaps arquitectónicos decididos, todavía no implementados

- No hay derivados de preview (thumbnail/poster/transcode/waveform/peaks); cards/viewer consumen originales.
- Range no es todavía streaming extremo-a-extremo si el backend materializa el objeto completo.
- Falta fijar si feed muestra `owner-only pending` o sólo `eligible`; `candidate_ready` no equivale a governance
  elegible.
- Falta reconciliación/GC de objetos huérfanos y verificación de metadata cuando un rewrite same-key devuelve
  `412`.
- ADR-008 ya fija esos boundaries: originales privados/inmutables, derivados first-class versionados, gateway
  reautorizante con Range `206/416` y backpressure, feed `pending` owner-only sin bytes hasta `eligible`, y GC
  inventory→mark→grace/holds→dry-run/apply con generation preconditions. La decisión no implementa sus build units
  ni permite declarar commercial ready.
- Ownership ejecutable: `TASK-1528` deriva/transforma/sirve Range; `TASK-1529` inventaría/marca/aplica GC;
  `TASK-1525` materializa feed live y `TASK-1526` consume la proyección en UI. `TASK-1527` coordina promoción/recovery.

## Active state — 2026-07-22 (TASK-1494: Style DNA desplegado; canary positivo bloqueado)

`efeonce-globe` ya implementa los puertos que faltaban para que Reference Intelligence deje de ser una
proyección vacía: identidad tenant-safe desde asset provenance, análisis gobernado por el provider seam Vertex,
paleta determinística local, spend fence/kill switch, caché por workspace+hash+versión y wiring en `studio-web`.
El commit `a5e1289355770abd1a927a6d078dc042b7c29c91` fue pusheado a Globe `main`; CI `29966815213` pasó. El plan
de migración `29966823795` confirmó `0009_reference_intelligence_style_dna.sql` aplicada y esquema limpio, sin
pendientes ni checksum mismatch. Deploys canónicos: API `29966942819` →
`globe-api-internal-00030-xkf` (`sha256:ab72f93d…`, 100%) y Studio `29966944103` →
`globe-studio-internal-00031-vwz` (`sha256:123d472a…`, 100%). Perímetros: API anónima 403; front door Studio
HTTP 301/HTTPS 200.

Configuración live verificada sin exponer secretos: `GLOBE_LAB_ENABLED=true`, provider `composite`, bucket
privado `efeonce-globe-lab-evidence`, cap diario 200 y caller dedicado. Los negativos live devolvieron
`404 not_found` para asset ausente, `400 invalid_request` para versión inventada y `403 access_denied` para
workspace ajeno. La lista de provenance devolvió cero assets. Por ello no se pudo probar `miss → hit` ni el
settlement único de 4 créditos. Ingesta privada está OFF y Model Readiness no tiene promociones firmadas para
crear un asset por canary; no deben eludirse. Próximo paso: cuando el flujo gobernado normal produzca una imagen
interna elegible, ejecutar [el runbook de Style DNA](../../manual-de-uso/creative-studio/operar-reference-intelligence-style-dna.md).
El grant temporal `serviceAccountTokenCreator` del operador fue revocado y la política IAM volvió a contener
solo los subjects WIF de development/staging. Estado: **desplegado internal-only; canary positivo operativamente bloqueado**.

## Active state — 2026-07-22 (TASK-1503: output side del Producer vivo en `globe-api-internal`)

**Lo que hace usable una pieza ya generada quedó operativo.** `TASK-1503` shipeó el *output side* del
Creative Producer: recuperación gobernada de un output (descarga/preview con bytes reales) más las dos
acciones sobre la pieza — marcarla favorita y copiarla como referencia. Capability
`globe.producer.assets.operate` (llevó `GLOBE_CAPABILITIES` de 11 a 12 entradas), **gasto cero**. Deliberadamente **no**
reusa `globe.lab.experiment.run`: descargar lo que ya produjiste no debe implicar poder facturarle a un
proveedor, así que la autorización de recuperar vive fuera de la capability de gasto. Ids: readers
`GLOBE_PRODUCER_ASSET_READERS` = `globe.producer.output.get` / `globe.producer.asset.list`; commands
`GLOBE_PRODUCER_ASSET_COMMANDS` = `globe.producer.asset.favorite` /
`globe.producer.asset.copyAsReference`. Es un **mapa propio**, separado de `GLOBE_PRODUCER_READERS` (ese
es el catálogo de `TASK-1500` y responde a otra capability). SDK:
`getProducerOutput` / `listProducerAssets` / `favoriteProducerAsset` / `copyProducerAssetAsReference`.

**Vive en `globe-api-internal` por AUTORIDAD, no por despliegue** — la misma razón por la que vive ahí el
Model Lab (ver *Dónde vive el Lab* en el bloque de `TASK-1490`). La ruta está en el mismo binario que
corre en ambos modos (`apps/studio-web/src/app.ts`); lo que la hace alcanzable sólo en api mode es quién
lleva la capability: en web mode el principal humano la recibe del broker de Greenhouse, que **no** otorga
`globe.producer.assets.operate`. Desplegar el web no habilita nada; el gate es `TASK-1505`.

### Qué está vivo

- **Servicio `globe-api-internal`, revisión `globe-api-internal-00017-xfm`, imagen `:b12451db2d6e`**,
  desplegada por el camino sancionado: workflow `deploy-internal.yml`, run `29908442357`
  (OIDC → WIF → `globe-deployer`), checkout limpio de `main`.
- **El workflow escribió sólo la imagen.** La revisión conserva runtime SA `api_runtime`, concurrency 20 y
  **maxScale 3**: el drift-trap que cerró `TASK-1508` sigue cerrado. `tofu plan` → **No changes** antes y
  después del deploy.
- **Cobertura `PRODUCER_ASSETS_COVERAGE`:** `http` / `sdk` / `cli` / `worker` / `e2e` **available**;
  `ui` / `mcp` **`policy-blocked`** (gate de `TASK-1505`, no se movió); `sister-platform` `not-applicable`.
- **Re-verificado contra `00017-xfm` (7/7):** retrieval gobernado sirviendo bytes reales (820.868 B,
  `image/png`, `private, no-store`), invariante cross-workspace viva (`not_found`), anónimo → `403`, y las
  anotaciones presentes en Cloud SQL. Gasto cero: la pieza era preexistente.

### Config viva del servicio — las tres variables del output side

- **`GLOBE_PRODUCER_ASSETS_ENABLED`** — kill switch. Su estado real es la variable Terraform
  `producer_assets_enabled`, **default `true` en `infra/terraform/variables.tf`, o sea en git**.
  Deliberadamente **no** en `terraform.tfvars` (gitignoreado): un flag cuyo estado real vive en un archivo
  sin trackear tiene el mismo problema de estado efímero que moverlo con `gcloud`, sólo que mejor
  disfrazado. Probado: `tofu plan` **sin** `terraform.tfvars` → No changes.
- **`GLOBE_PRODUCER_GRANT_SECRET`** — clave HMAC del pase de recuperación. Secret Manager
  `globe-producer-grant-secret`; **contenedor y accessor en Terraform (`secrets.tf`), valor out-of-band**
  (v1, 64 bytes, cero saltos de línea). El `secretAccessor` es **sólo para `api_runtime`**: `web_runtime`
  no tiene consumidor hasta el gate de `TASK-1505`, así que no se le dio. Sin el secreto el mint degrada a
  `dependency_unavailable` — **fail-closed**: no existe camino que sirva bytes sin firma.
- **`GLOBE_PRODUCER_GRANT_TTL_SECONDS`** — **no está seteada en el servicio** (ni en Terraform ni en la
  revisión): el TTL efectivo son los `300` s del default en código (`readStudioRuntimeConfig`, rango
  aceptado 30–900). Es la única de las tres que un `describe` de la revisión **no** muestra; si aparece
  algún día, alguien la seteó fuera de Terraform.

### Estado durable: migración `0003`

`0003_producer_asset_annotations.sql` está **aplicada** en `globe-pg` (las dos tablas existen y
`globe._migrations` la lista). Las anotaciones viven en `DurableProducerAssetStore`
(`packages/database/src/stores/producer-asset-store.ts`) detrás del `AssetAnnotationStorePort` del dominio,
no en memoria. **Delta al spec:** esto estaba diferido a `TASK-1465`, que shipeó sin cubrirlo; con los
servicios en 3 réplicas (`TASK-1508`) un store in-memory no queda "volátil" sino **no determinista**. Por
lo mismo la idempotencia vive en SQL (`ON CONFLICT DO NOTHING` + re-lectura) y no en un read-then-write:
entre réplicas, "revisar y después insertar" es una carrera cuyo síntoma visible es un `referenceId`
duplicado o una estrella re-fechada. `rights='derived-internal'` es un **CHECK**, no una convención.

### Cómo leer una falla (la degradación es deliberada)

- **`not_found` no significa "faltó un dato".** Todo rechazo de autoridad colapsa ahí: workspace ajeno, id
  desconocido, hash que sólo fue *input*, candidato no retenido — indistinguibles desde afuera. El store es
  content-addressed y **tenant-blind** (un bucket para todos los workspaces, el nombre del objeto **es** el
  hash) y guarda tanto outputs como bytes de referencias private-ingest, así que cualquier respuesta más
  fina sería un oráculo para sondear un bucket compartido. La autoridad la pone el dominio:
  `authorizeOwnedOutput` (`packages/domain/src/producer-assets.ts`) gatea contra el **mismo**
  `ExperimentStorePort` del Lab y matchea sólo `outputHashes` de un attempt `outcome==='candidate_ready'`
  con `outputsRetained===true`; nunca consulta `authorizedInputHashes`.
- **`dependency_unavailable` sí es un problema de lectura** y es retryable: cualquier `OutputRetrievalError`
  del seam GCS (`not_found` / `unreadable` / `integrity_mismatch`) degrada ahí. Nunca 200 con cuerpo vacío y
  deliberadamente **nunca `not_found`**: el dominio acaba de certificar que el candidato existe, y
  contradecir el descriptor manda a un operador a cazar un fantasma. Regla de lectura: `not_found` = "no es
  tuyo o no es recuperable"; `dependency_unavailable` = "es tuyo y existe, falló la lectura".
- **La ruta re-ejecuta la autorización después de verificar el pase** (defense in depth): un candidato que
  dejó de ser recuperable deja de ser servible aunque su grant siga vivo. Orden en
  `GET /v1/outputs/:sha256?experiment=&grant=&disposition=`: kill switch → `resolveDispatchPrincipal` →
  verify del grant → `deriveTrustedContext` (workspace tomado de los claims) → `authorizeOwnedOutput` →
  stream con `Content-Disposition` de filename neutro (`globe-<hash12>.<ext>`, sin vendor) y
  `Cache-Control: private, no-store`. Reusa el mismo helper del reader y el mismo `handlerErrorToApiCode`:
  un primitivo, dos transportes, sin política duplicada.
- **El pase no es un bearer autosuficiente.** Opaco, server-minted, **firmado (HMAC-SHA256) no cifrado**
  —sus claims son cosas que el caller ya sabe—, bound a `(workspaceId, experimentId, sha256, disposition)`,
  TTL corto, verify **stateless** y comparación en tiempo constante. Viaja en query porque la UI necesita un
  `src` directo, y eso no abre un hueco porque la ruta autentica **antes** y re-chequea propiedad
  **después**. Nunca se loggea ni entra a un audit event: si aparece en un log, eso es el incidente.
- **Acciones:** `favorite` toma el estado deseado explícito (nunca toggle ciego) y conserva el timestamp
  original en un repeat. `copyAsReference` certifica `ProducerReferenceHandleV1` con
  `rights:'derived-internal'` —**inforjable**, un caller no puede declararlo— y hereda `parentRights` por
  `inheritedDerivedRights`, la misma función del edit base del Lab, para que un ancestro `licensed` no deje
  de restringir en una de las dos derivaciones. Falla cerrado **antes** de mintear si el medio no es
  referenciable (`model-3d`). Cero bytes por la API, cero crédito.

### Rollback real

- **Apagar la capacidad:** `producer_assets_enabled = false` en `infra/terraform/variables.tf` + `apply`.
  No por `gcloud` ni por `terraform.tfvars`: el estado del flag vive en git, y así el próximo plan no lo
  revierte solo.
- **Cortar los pases ya emitidos:** rotar `globe-producer-grant-secret` (versión nueva) invalida todos los
  grants vivos. No hay estado que limpiar porque el verify es stateless, y el radio del corte queda acotado
  por el TTL (≤300 s por defecto).
- Ninguna de las dos toca bytes ni anotaciones: apagar la capacidad no borra piezas, favoritos ni handles.
- Procedimiento paso a paso, canario de verificación y diagnóstico:
  [`docs/manual-de-uso/creative-studio/operar-retrieval-assets-globe.md`](../../manual-de-uso/creative-studio/operar-retrieval-assets-globe.md).

### Gates hacia comercial (identificados, no inventados)

- **Humano interno en el shell web → `TASK-1505`:** grant del broker + flip de `ui`/`mcp`. Hoy una persona
  no puede usar esto, y no es un pendiente de configuración.
- **Cliente externo / comercial → `TASK-1480`**, bloqueada por `TASK-1477`, `TASK-1478`, `TASK-1479` y
  `TASK-1482` (que va sobre `TASK-1468`). Las cinco en `to-do`.
- **Runtime no-interno — sin dueño declarado.** `readStudioRuntimeConfig` **lanza**
  `globe_environment_not_internal_smoke` para cualquier valor distinto de `internal_smoke`, así que hoy no
  existe forma de bootear un runtime comercial. `TASK-1480` no lo menciona. `internal_smoke` es el estadio
  actual del runtime, **no** el techo del producto.
- **Contabilidad comercial:** el spend fence es de **seguridad**, no ledger (`TASK-1468` → `TASK-1482`).
- **Riesgos abiertos:** el de `TASK-1508` (`TASK-1512`, spend fence cross-réplica sin ejercitar) sigue
  vigente, y ya no está solo: se le suma el gap sin dueño del runtime no-interno.

### Lecciones de método (transferibles)

1. Los scripts `test` de cada package de `efeonce-globe` **enumeran archivos a mano**. Un test nuevo que no
   se registra **nunca corre**, y la suite queda verde por no haber mirado. Al agregar un test, registrarlo.
2. Un `execute` síncrono puede exceder el timeout de transporte del **cliente** y completar bien en el
   **servidor**. Leerlo como fallo y reintentar gasta créditos de nuevo: leer el estado antes de reintentar.
3. Un negativo private-ingest con un hash **inexistente** prueba muchísimo menos que uno con un hash que sí
   está en el store como input. La versión válida declara el output retenido de una corrida como input de
   otra y agrega el control de que el output propio de esa corrida **sí** se sirve.
4. Acceso privilegiado temporal: grant acotado → verificar → revocar → **verificar el corte**, sin asumir
   que la revocación propagó. En este rollout fueron tres ventanas de `tokenCreator` y tres cortes
   verificados.

## Active state — 2026-07-21 (TASK-1508: Cloud Run bajo Terraform + cap de 1 instancia corregido)

Los dos servicios Cloud Run **entraron a Terraform** por import brownfield, sin un solo destroy/replace, y
`deploy-internal.yml` quedó reducido a desplegar **sólo la imagen**. Terraform gobierna ingress, invoker posture,
runtime SA, env y secret refs, escala, recursos y el invoker IAM binding de la api; el workflow no vuelve a escribir
configuración. Probado en vivo: un deploy real dejó el `tofu plan` en **No changes**.

**El hallazgo que justifica leer esto:** ambos servicios estaban capados a **1 instancia efectiva**. Un servicio Cloud
Run tiene ceiling a nivel servicio y a nivel revisión, y aplica **el menor**; el de servicio estaba en 1 mientras el de
revisión decía 3, que es el que toda la doc venía citando. Nunca corrió más de una réplica, así que **el spend fence
cross-réplica de `TASK-1465` jamás se ejercitó**. La causa: `--max-instances` escribe campos distintos según el
subcomando (`run deploy` → servicio, `run services update` → revisión), de modo que el workaround que los manuales
prescribían para "restaurar" el techo escribía el campo equivocado. Corregido a **3/3** y ambos campos bajo IaC
(requiere provider `google` >= 7.x; el pin subió de `~> 6.0` a `~> 7.0`, verificado con 76 de 78 recursos en no-op).

**Anti-drift probado en dos ciclos**, uno por servicio (runs `29872768853` web / `29875135147` api): ambos dejaron el
`tofu plan` en **No changes**, con ingress, invoker posture, ceiling 3/3, runtime SA y env intactos. `TASK-1508` cerró.

**Riesgo abierto (el único): `TASK-1512`.** El spend fence cross-réplica sigue **sin ejercitar**: levantar el cap lo
hizo posible por primera vez, pero probarlo exige concurrencia real contra el Model Lab, o sea gasto real de proveedor.
Merece su propia autorización; nadie debería asumirlo verificado. Spec:
`docs/tasks/to-do/TASK-1512-globe-cross-replica-spend-fence-exercise.md`.

**Doc stale detectada y corregida (2026-07-21).** El manual del front door quedó brevemente stale tras `TASK-1508` (prescribía un workaround de `maxScale` que ya no aplicaba); se corrigió en el mismo cierre y hoy es el SoT del procedimiento del operador. Sin deuda pendiente.

**Próximo paso ejecutable:** `TASK-1505` (Producer surface) ya tiene su front door canónico. `TASK-1480`
(Production/clientes externos) sigue siendo el gate que nada de esto levanta.

## Active state — 2026-07-21 (TASK-1507: front door internal-only vivo)

**La URL estable del shell interno de Globe es `https://globe.efeoncepro.com`.** Se sirve por un Global External
Application Load Balancer + serverless NEG (`southamerica-west1`) hacia `globe-studio-internal`, con IP global
`8.233.189.79`, certificado administrado por Google `ACTIVE` (`CN=globe.efeoncepro.com`, issuer `GTS WR3`, vence
`Oct 19 20:35:36 2026 GMT`) y redirect 301 de HTTP a HTTPS. `GLOBE_PUBLIC_BASE_URL` quedó cortado al dominio en la
revisión `globe-studio-internal-00018-zkx`, que sirve el 100% del tráfico.

**El `*.run.app` ya no es alcanzable por browser.** El ingress del web quedó en
`internal-and-cloud-load-balancing` (`gcloud run services update … --ingress`), así que el acceso directo por
`https://globe-studio-internal-818083690953.southamerica-west1.run.app` devuelve **404** y el dominio por el ALB
devuelve **200** con el shell real (`<title>Efeonce Globe — Internal creative studio</title>` + su propio
`x-correlation-id`: responde la app, no el balanceador). Ese origen `run.app` **sigue en el allowlist OAuth** a
propósito, como camino de rollback; retirarlo es un comando, no un incidente:
`pnpm sister-platform:redirect --client globe --remove https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback --apply`.

**Cómo se opera el allowlist ahora.** Greenhouse ganó la primitive aditiva
`updateSisterPlatformOAuthRedirectUris` (`src/lib/sister-platforms/oauth-broker.ts`) + el CLI
`pnpm sister-platform:redirect` (`--client/--add/--remove`, dry-run sin `--apply`): una transacción que toca sólo
`redirect_uris`, sin rotar el client secret ni reemplazar el array — a diferencia del seed
`seed-globe-internal-pilot.ts`, que hace ambas cosas y **no** sirve para un cutover. El SSO humano se verifica con
`efeonce-globe/scripts/smoke-human-federation.mjs` (tres piernas: `/auth/start` → authorize → callback);
`GLOBE_SMOKE_RESOLVE=host:ip` permite smokear un front door recién publicado desde un resolver con cache negativa
sin debilitar ninguna aserción. Verde antes y después del hardening de ingress.

**Riesgos abiertos (estado al cierre de 1507; ambos primeros quedaron cerrados por `TASK-1508`).**

- **El ingress no estaba gobernado por IaC.** Se fijó por `gcloud` porque los servicios Cloud Run seguían fuera de
  Terraform. No era drift-trap del workflow (`deploy-internal.yml` no pasa `--ingress` y `gcloud run deploy` preserva
  lo no especificado). **Cerrado:** `TASK-1508` adoptó los servicios y Terraform gobierna el `ingress`.
- **El ceiling de escala sí era drift-trap — y peor de lo que se creía.** `deploy-internal.yml` hardcodeaba
  `--max-instances=1`. Lo que ningún doc registraba: ese flag escribe el ceiling **de servicio** desde `gcloud run
  deploy` y el **de revisión** desde `gcloud run services update`, y Cloud Run aplica **el menor** — así que el techo
  efectivo **era 1** aunque la revisión dijera 3, y el workaround `gcloud run services update … --max-instances=3`
  que varios manuales prescribían era **inefectivo**: escribía el campo equivocado y aparentaba restaurarlo.
  **Cerrado:** `TASK-1508` corrigió el techo a **3/3**, puso ambos campos bajo Terraform y dejó el workflow
  image-only. Consecuencia registrada: el spend fence cross-réplica nunca se ejercitó → `TASK-1512`.
- **Hueco de gobernanza de la primitive de redirect allowlist → `TASK-1513`.** `updateSisterPlatformOAuthRedirectUris`
  acepta `actorUserId` pero no lo persiste, no hay capability que declare quién puede mover un allowlist y no existe
  route/MCP: es CLI-only por diseño hasta que `TASK-1513` cierre las tres piezas
  (`GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` §15.5).
- **Cache negativa de DNS.** El SOA de `efeoncepro.com` tiene minimum TTL 86400, así que un NXDOMAIN cacheado antes
  de crear el registro persiste ~24h en el resolver local y `dscacheutil -flushcache` sin `sudo` no hace nada. El
  síntoma engañoso es `curl` devolviendo `status=000` sin `remote_ip`. Verificar con `dig @8.8.8.8` y
  `curl --resolve` antes de concluir que el dominio está roto.
- **Costo fijo nuevo:** ~US$18,25/mes por las forwarding rules globales + ~US$0,024 por GiB servido (in+out),
  precios de la Cloud Billing Catalog API al 2026-07-21. Si se destruye el ALB, destruir **también** la IP global:
  reservada y sin adjuntar factura como IP estática ociosa.
- **Sigue internal-only.** Publicar el dominio no habilita Production, clientes externos ni marketing: eso está
  gateado por `TASK-1480`. `globe-api-internal` no recibe custom domain, sigue IAM-private (403 anónimo) y su
  audience se deriva de `run.app`, nunca del dominio browser.

**Continuó en `TASK-1508` (complete 2026-07-21)** — adoptó los dos servicios Cloud Run en Terraform por
import/no-replace y dejó un solo escritor (Terraform gobierna configuración estable y seguridad; el workflow quedó
image-only). Ahí quedaron pineados `ingress`, ambos ceilings de escala e `invokerIamDisabled`; ver el bloque
**Active state — 2026-07-21 (TASK-1508 …)** al inicio de este archivo. Spec de cierre del front door:
`docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md`; decisión que implementa: ADR-004
`docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`.

## Active state — 2026-07-21 (TASK-1466 desplegada + verificada internal-only)

SPEC-008 materializa `client-operated | co-operated | efeonce-managed` como accountability versionada —nunca como
grant— mediante commands/readers Full API Parity, store Postgres append-only y audit atómico. Runtime commit
`00fee5ded505` y fix del smoke `3baafde831563` están en `efeonce-globe/main`; `pnpm check && pnpm build` pasó.

**Cloud SQL:** `0002_operating_responsibilities.sql` aplicada por el migrador IAM. El verifier live confirmó owner
`globe_owner`, grants DML para `globe-api-runtime`/`globe-web-runtime` y siete constraints. **Cloud Run:** workflows
`29858616172` (API) y `29858618168` (Studio) exitosos; revisiones Ready `globe-api-internal-00012-lcq` y
`globe-studio-internal-00017-4sd`, imagen `00fee5ded505`, ambas en `maxScale=3`.

**Smoke:** scope `task-1466-smoke-be28c266-4ff4-473d-9cec-2e286198bdc4`; auth ausente y audiencia incorrecta
denegadas, assign v1, replay estable, replay conflictivo=409, change v2, effective/history y cross-workspace deny.
Readback durable: dos versiones (`co-operated` → `efeonce-managed`) y dos auditorías correlacionadas en
`greenhouse-org:efeonce`. El smoke requiere `--include-email` al mintear el ID token; el helper ya lo incorpora.
Los grants temporales `serviceAccountTokenCreator` de proyecto y service account fueron revocados y verificados.

La capacidad queda **operativa internal-only**. UI, MCP, clientes externos y producción comercial continúan bloqueados.
El drift conocido de `deploy-internal.yml` quedó **cerrado por `TASK-1508`**: el workflow es image-only y Terraform
gobierna ambos ceilings, así que ya no hay nada que "restaurar" a mano tras un deploy. El `maxScale=3` que se leía en
esas revisiones era el ceiling de revisión; el de servicio seguía en 1, y el efectivo era el menor.

## Active state — 2026-07-21 (TASK-1465: persistencia durable desplegada + verificada en vivo)

**Globe deja de vivir en memoria.** `TASK-1465` le dio a Globe su primera base de datos durable y desplegó
los dos servicios contra ella. Cloud SQL **`globe-pg`** (Postgres 16, `southamerica-west1`, tier chico,
~US$15–30/mo fijo), **keyless**: la app autentica como **usuario IAM** por el conector de Cloud SQL (sin
contraseñas en el runtime), sólo por conector (sin acceso de red directo). Es **de Globe**, nunca compartida
con Greenhouse. La persistencia vive en `packages/database` (cliente + runner de migraciones); el setup de
roles de una sola vez (`bootstrap.sql`) crea el rol dueño `globe_owner` y luego revuelve la contraseña de
`postgres` — no queda contraseña de admin en pie.

**Los cinco almacenes son durables** detrás de las mismas interfaces (drop-in, sin reescribir consumidores):
experimentos, evaluaciones, el **spend fence** (ahora **atómico entre réplicas** — el freno de seguridad que
recién habilita correr multi-réplica), sesiones + transacciones de OAuth, más una bitácora de auditoría
append-only. Tablas del esquema `globe`: `experiments`, `evaluation_reports`, `human_sessions`,
`oauth_transactions`, `spend_fence_runs`, `spend_fence_days`, `audit_log`.

**Desplegado en vivo:** ambos servicios Cloud Run corren durables — `globe-studio-internal` (cáscara web/login) y
`globe-api-internal` (API del Model Lab), **cada uno con su propio usuario IAM** de base; bajan a cero cuando están
ociosos (~US$0 extra). **Verificado en vivo:** golpear `/auth/start` en el servicio corriendo **persistió una fila
`oauth_transactions` en Postgres** — evidencia real desde el servicio, no sólo por el seam local. *(Corrección de
historia: este bloque reportó `maxScale=3`, que era el ceiling de revisión. El de servicio seguía en 1 y Cloud Run
aplica el menor, así que el techo efectivo **era 1**; `TASK-1508` lo corrigió a 3/3.)*

**Fix de build (Dockerfile construye `packages/database`):** el Dockerfile no compilaba el paquete de
persistencia; se corrigió para que la imagen incluya `packages/database`. Un servicio hace durable su runtime
sólo si declara las tres `GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME` / `GLOBE_POSTGRES_DATABASE` /
`GLOBE_POSTGRES_USER` (el usuario IAM de runtime del servicio); si falta alguna, **arranca en memoria** — sólo
permitido en el environment `internal_smoke`.

**⚠️ Drift-trap que este bloque registró — ya cerrado por `TASK-1508`.** `deploy-internal.yml` hardcodeaba
`--max-instances=1`, y el workaround que varios manuales prescribían tras un deploy
(`gcloud run services update <servicio> --max-instances=3`) era **inefectivo**: escribía el ceiling de **revisión**,
no el de **servicio**, y Cloud Run aplica el menor, así que dejaba el techo efectivo en 1 aparentando haberlo
restaurado. `TASK-1508` corrigió el techo a **3/3**, puso ambos ceilings bajo Terraform y dejó el workflow
image-only, así que ya no hay drift que vigilar ni workaround que correr.
**Diferido:** un modelo rico de workspace / members / grants. Docs: funcional
[`docs/documentation/creative-studio/persistencia-durable-globe.md`], manual
[`docs/manual-de-uso/creative-studio/operar-persistencia-globe.md`], spec
`docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`.

## Active state — 2026-07-21 (front door e IaC separados: TASK-1507 → TASK-1508)

**Decisión (ADR-004, `EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`).** Para la release
internal-only, el web/BFF/SSO shell **se queda en Cloud Run** (servidor Node nativo; el target Next.js queda
`superseded` para el shell interno) — migrar a Vercel se rechaza: parte el trust boundary sin beneficio interno.
El **frontend cliente comercial** (`TASK-1505`+) es una superficie separada con host + framework **diferidos**
(Vercel + Next.js sobre edge global es candidato vivo), a decidir cuando se construya la UI de 1505 y antes de
`TASK-1480` Production; elegir Cloud Run para el shell interno **no** cierra esa puerta. Tres gates distintos,
nunca mezclados: URL internal-only / HA (gate `TASK-1465`, **ya cleared** — ver el bloque de persistencia durable) /
Production externo (`TASK-1480`).

**Front door → `TASK-1507`: IMPLEMENTADO (complete 2026-07-21).** `globe.efeoncepro.com` se sirve vía **Global
External ALB + serverless NEG** (`southamerica-west1`) → `globe-studio-internal` (path GA, no domain mapping
directo), el ingress del web quedó en `internal-and-cloud-load-balancing` y `globe-api-internal` sigue sin custom
domain, IAM-private y con audience `run.app`. Estado vigente, comandos y riesgos abiertos: ver el bloque
**Active state — 2026-07-21 (TASK-1507: front door internal-only vivo)** al inicio de este archivo.

**Cloud Run IaC + deploy ownership → `TASK-1508`: COMPLETE (2026-07-21).** Adoptó los dos servicios vivos por
import/no-replace y eliminó la doble escritura: Terraform gobierna configuración estable y seguridad; el workflow
`gcloud run deploy` quedó image-only. Ahí quedaron pineados `invokerIamDisabled` (web `True`, api `False`), los dos
ceilings de escala (servicio y revisión, ambos en 3) e `ingress`. Detalle y evidencia: el bloque
**Active state — 2026-07-21 (TASK-1508 …)** al inicio de este archivo.

## Active state — 2026-07-20 (TASK-1490 desplegada + verificada en el servicio + hardening de auth)

### Dónde vive el Lab (corrección de rollout)

El Model Lab se opera por **api mode**, servido por **`globe-api-internal`** (rev con imagen
`2b3a19f`), corriendo como **`globe-api-runtime`**. Es el único servicio con un caller autorizado:
en api mode el principal es el service principal, que sí tiene `globe.lab.experiment.run`. En **web
mode** (`globe-studio-internal`) el principal humano lleva sólo `globe.studio.access` — el broker de
Greenhouse **no** otorga la capability del Lab a humanos — así que ahí el Lab es inalcanzable. El
primer rollout prendió los flags en `studio-web` (inertes) y dio `aiplatform.user` a `web_runtime`
(la SA equivocada); ambos corregidos. Config viva de `globe-api-internal`:
`GLOBE_LAB_ENABLED=true` · `GLOBE_LAB_PROVIDER=composite` ·
`GLOBE_LAB_INPUT_BUCKET=efeonce-globe-lab-evidence` · `GLOBE_LAB_OMNI_EDITABLE=false` ·
`GLOBE_LAB_DAILY_CAP_CREDITS=200`. `studio-web` quedó con el Lab **apagado** (`fake`, disabled).

*(Delta 2026-07-22 — `TASK-1503`: ese mismo servicio suma hoy el output side del Producer con **dos**
variables seteadas en la revisión, `GLOBE_PRODUCER_ASSETS_ENABLED=true` · `GLOBE_PRODUCER_GRANT_SECRET` =
`secretRef:globe-producer-grant-secret:latest`, y corre la revisión `globe-api-internal-00017-xfm`. La
tercera variable del output side, `GLOBE_PRODUCER_GRANT_TTL_SECONDS`, **no está seteada acá**: el TTL
efectivo son los 300 s del default en código, así que un `describe` de esta revisión muestra dos, no tres.
Vive acá por el mismo motivo que el Lab —quién lleva la capability, no dónde se desplegó el binario—,
aunque a diferencia del Lab su capability es de gasto cero.
Detalle, rollback y gates: el bloque **Active state — 2026-07-22 (TASK-1503 …)** al inicio de este
archivo.)*

### Verificado en vivo contra el servicio desplegado (no sólo por el seam local)

El chain **generate → edit por referencia (cross-model)** corrió end to end contra
`globe-api-internal`, autenticado como el caller REAL (`greenhouse-globe-caller`) con un ID token
audienced al servicio: generate Nano Banana (`outputsRetained=true` → la SA del servicio escribió al
bucket) → edit `editMode=reference` con lineage encadenado. Cierra el gap "bindings presentes pero no
ejercitados desde el servicio". La concesión `tokenCreator` para mintear ese token fue **temporal y
revocada** al terminar.

### Hardening de auth (api mode) — robusto, no parche

Al preparar el rollout se encontró que en api mode la app devolvía el service principal (con la
capability de gasto del Lab) **sin verificar el token**, confiando sólo en Cloud Run IAM. Con
`invokerIamDisabled=True` (ver abajo) ese perímetro se salta y el principal quedaría expuesto a
internet. Ahora la app **verifica el ID token del caller** como segunda capa (defense in depth):
- Verificación **local** contra las claves públicas de Google cacheadas
  (`google-auth-library.verifyIdToken`), sin round-trip por request — reemplazó un primer intento
  con `tokeninfo` que era un SPOF externo síncrono en el hot path.
- **Audience explícito** (`GLOBE_API_EXPECTED_AUDIENCE`, multi-valor por los dos formatos de URL
  run.app) + **allowlist** de SAs (`GLOBE_API_CALLER_SERVICE_ACCOUNTS`). Ambos son gates
  fail-closed: sin allowlist o sin audience declarado, el servicio no acepta a nadie.
- El ID token va en **`Authorization`** (Cloud Run lo reenvía a la app), NO en
  `X-Serverless-Authorization` (Cloud Run lo consume). El SDK se corrigió a `Authorization`; con
  X-Serverless el perímetro pasaba y la app rechazaba al caller legítimo con 401.

### ⚠️ Decisión pendiente — `invokerIamDisabled: True` en `globe-studio-internal`

Anterior a esta sesión: el studio tiene `invokerIamDisabled=True`, así que Cloud Run no verifica el
invoker y el servicio es alcanzable desde internet aunque su IAM esté vacío (`globe-api-internal`
**no** lo tiene: anónimo → 403). Es coherente con que el studio es una **app web con SSO** (un
browser no presenta ID token), y su auth es la sesión-cookie de la app — apagarlo rompería el
callback OAuth. **La capa de app aguanta** (anónimo → 401 en commands/capabilities). Pendiente:
decidir explícitamente si el flag se documenta como intencional (con el smoke ajustado: el contrato
"anónimo → 403" no aplica a web mode) o si el studio va detrás de un proxy autenticado. Y, follow-up
de raíz: los servicios Cloud Run **no** están gestionados por Terraform hoy (los crea el workflow),
así que nada previene que el flag drift-ee — gobernar `invoker_iam_disabled` en IaC lo cerraría de
raíz en vez de sólo detectarlo.

## Active state — 2026-07-20

- `apps/creative-runner` now owns **two dedicated Vertex video adapters** that replace the removed
  `generateContent` video path (video is not servable via `generateContent`), realizing the `LabRunnerPort` seam
  without touching domain, contracts or transports. Both were **verified live 2026-07-20** through the sanctioned
  Model Lab seam against the motion golden brief `product-motion-loop`, each settling `objective_pass_pending_human`:
  - `VertexVideoAdapter` (`apps/creative-runner/src/vertex-video-adapter.ts`, commit `1d5635b` + fix `0e06fdc`):
    keyless Vertex **Veo** (`veo-3.0-fast-generate-001`, us-central1) via the long-running predict flow
    `:predictLongRunning` → `:fetchPredictOperation` → base64/GCS — the method Veo requires. 32 credits, real MP4.
  - `VertexOmniAdapter` (`apps/creative-runner/src/vertex-omni-adapter.ts`, commit `f56452a`): **Gemini Omni Flash**
    (`gemini-omni-flash-preview`, reasoning-native video) via the **Interactions API**. GENERATE is keyless on
    Vertex (`aiplatform.googleapis.com/v1beta1/.../interactions`, ADC Bearer, no key). 40 credits.
- **Stateful EDIT surface split (found live):** the stateful edit (`previous_interaction_id` + `store`) is **not**
  available on the keyless Vertex path — it returns 400 "do not support previous_interaction_id". Edit needs the
  **Gemini API** surface (`generativelanguage`) + an API key (`globe-gemini-api-key`); OAuth is rejected there.
- **Lab EDIT-COMMAND shipped + live-verified (commit `a765d55`, prior follow-up now closed):** the seam threads
  edit end to end — `PrepareExperimentPayloadV1.previousInteractionId` + `ExperimentAttemptManifestV1.providerRunRef`
  (contracts/domain/runner), `VertexOmniAdapter` dual-transport (generate keyless Vertex / edit Gemini-key).
  **Cross-surface gotcha found + fixed live:** a keyless Vertex interaction id is NOT editable on the Gemini surface
  (different id namespaces), so an editable generate (`store:true`) also runs on the Gemini surface. Verified live
  through the seam: prepare(video-generate,store)→execute→candidate_ready with `providerRunRef=v1_…` →
  prepare(previousInteractionId)→execute→**EDIT candidate_ready, new video + chainable id**. Generalizing edit to
  all editable models (reference-based paradigm) + **multi-reference / combined cross-modal refs** (the seam already
  carries a `resolvedInputs` array; Omni/Veo/single-key Fal consume only the first) = **TASK-1490**.
- The Composite selects the video engine by a **fidelity anchor** `GLOBE_LAB_VIDEO_ANCHOR` =
  `fal` (Seedance, default) | `vertex-video` (Veo) | `vertex-omni` (Omni), replacing the fixed policy for video.
  Live motion matrix through the seam: Omni 40 cr, Veo 32 cr, Seedance 20 cr — all `objective_pass_pending_human`
  (craft verdict stays human, never auto-passed).
- **Provisioned live 2026-07-20:** `generativelanguage.googleapis.com` enabled; secrets `globe-gemini-api-key` +
  `globe-fal-api-key` created in Secret Manager with runtime-SA `secretAccessor`; Terraform `secrets.tf` + import
  blocks **applied (`tofu apply`: 8 imported, 0 destroy; `tofu plan` clean, "No changes")**. The Globe-owned Fal key
  **retires the shared `greenhouse-fal-api-key` exception at the code level**.
- **studio-web DEPLOYED to Cloud Run (`globe-studio-internal` rev `00007-jrr`, Ready), 2026-07-20** — the first
  keyless deploy of the real provider stack (Omni + Veo + Seedance + track B + edit-command). URL
  `https://globe-studio-internal-a6odmgzpvq-tl.a.run.app` (private/internal). **`GLOBE_LAB_PROVIDER` stays `fake` in
  the deployed service** (config inherited) — the real engines are deployed but OFF; enabling them is a flag flip
  (`GLOBE_LAB_ENABLED=true` + `GLOBE_LAB_PROVIDER=composite` + `GLOBE_LAB_VIDEO_ANCHOR`), a gated decision.
- **Cloud Build deploy IAM gaps fixed (commit `d264039`, live + Terraform):** the first `gcloud builds submit` 403'd —
  TASK-1464's IaC lacked (a) deployer `cloudbuild.builds.editor` + `storage.admin` (source staging bucket), and (b)
  the compute-default build SA's `storage.objectViewer` / `artifactregistry.writer` / `logging.logWriter` /
  `cloudbuild.builds.builder`. Also the Dockerfile missed `packages/sdk` (studio-web devDep). All fixed + tracked
  in `infra/terraform/{iam,locals}.tf`.
- **Billing finding (do not misbuy):** Omni video has **no free API tier** ($0.10/s); the Gemini API bills
  Prepay/Postpay + an API key and is the **only** surface that serves stateful edit today. "Gemini Enterprise"
  per-seat is **UNRELATED** — do not buy it. Recommendation: enable **Postpay** to avoid the Prepay $0-balance cliff.

## Active state — 2026-07-19

- Repository: `efeoncepro/efeonce-globe`, branch `main`.
- GCP project `efeonce-globe` now has a TASK-1454 non-production identity slice: dedicated service accounts, Vercel WIF, Artifact Registry and private `globe-api-internal`; no database, provider secret, asset bucket, external client or Production environment exists.
- Node 24 monorepo foundation is green.
- Greenhouse connectivity is now specified by `docs/architecture/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001).
- `packages/sdk` implements typed transport, injected authentication, a server-only Google ADC ID-token adapter,
  and (TASK-1481) typed `capabilities`/`dispatchCommand`/`dispatchReader` methods over the private API.
- `packages/contracts` owns the namespaced capability, principal, health and API error contracts, plus (TASK-1481)
  the untrusted command/reader envelopes, canonical result/error, `policy_blocked` code and capability coverage.
- `packages/domain` owns (TASK-1481) the trusted command context (branded, server-only), `deriveTrustedContext`
  (validates workspace selection against bindings), and the `CapabilityRegistry` dispatch with per-surface coverage.
- `apps/studio-web` exposes (TASK-1481) the private API contract spine (`/v1/capabilities`, `/v1/commands`,
  `/v1/readers`) with an inert fixture and a cross-surface conformance harness. Creative capabilities remain
  policy-blocked until their own tasks (TASK-1457+).
- `packages/domain` + `apps/creative-runner` own (TASK-1457) the Safe Model Lab: experiment commands/readers on
  the spine, state machine, `LabSpendFence` hard cap, private-ingest policy, kill switch, and the provider seam
  (`FakeReferenceAdapter` + `LabRunner`) proven end to end with a deterministic fake. `GLOBE_LAB_ENABLED` defaults
  OFF; the live provider canary was **later realized and verified live by TASK-1486/1487/1488** (see below),
  though the durable deploy stays gated and `GLOBE_LAB_PROVIDER` defaults to `fake`.
- `packages/domain` + `apps/studio-web` own (TASK-1458) the Golden Briefs & Evaluation Harness
  (`globe.lab.evaluation.run`, SPEC-003) — the **second business capability on the spine**. It consumes the Model
  Lab (`runModelLabExperiment`) to score golden briefs (still `rrss-key-visual-still`, motion
  `product-motion-loop`, audio `glitch-microphone-foley`, with declared rights) against versioned rubrics,
  separating objective automated checks from human criteria. The verdict is never auto-`passed`
  (`objective_fail` | `objective_pass_pending_human`); reports are versioned, workspace-scoped and carry their
  own limitations. Proven with the same deterministic fake canary (zero spend/infra); `ui`/`mcp` remain
  `policy-blocked`. It **shares the TASK-1457 live-canary rollout gate**; the human-judgment `ui` surface and a
  durable report store are **deferred**. Spec: `docs/architecture/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`;
  runbook §7-ter in `docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`.
- `infra/terraform/` + `.github/workflows/` own (TASK-1464) the keyless IaC foundation. **APPLIED live 2026-07-19**
  (`tofu apply`: 23 imported, 13 added, 0 changed, 0 destroyed — no live identity destroyed/replaced). Now live:
  GitHub WIF pool/provider (ACTIVE), deployer run.admin + act-as, private `efeonce-globe-lab-evidence` bucket,
  SA-key-created log metric, remote state in `gs://efeonce-globe-tfstate`. State is remote; only the HCL is in git.
  Runbook: `docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`.
- `apps/creative-runner` + `apps/studio-web` own (TASK-1486/1487/1488) the **real provider stack** for the Model
  Lab, realizing the `LabRunnerPort` seam without touching domain, contracts, transports or the conformance
  harness. `VertexCreativeAdapter` (TASK-1486, keyless ADC/WIF) routes Google-native capabilities — image → Nano
  Banana `gemini-2.5-flash-image` (image only — a video route to Gemini Omni Flash was later **removed**: Omni is
  not callable via `generateContent`, see the Track B / provider-correction bullet below) — and
  was **verified live 2026-07-19** (`image-generate` → `candidate_ready`, `provider=vertex`, `proposedRoute==actualRoute`,
  `estimated==actual==10`, output as `sha256:…`, fence reserved/settled). `FalCreativeAdapter` (TASK-1487, keyed,
  Fal queue API) routes the allowlisted non-Google stack, and `CompositeProviderAdapter` (TASK-1487) routes
  Vertex + Fal by `supports()` + an explicit policy. TASK-1488 grows `CREATIVE_CAPABILITIES` to **ten**
  (+`image-upscale`/`video-upscale`/`model-3d-generate`) with **ten models verified live** (Seedream 5, Recraft
  v4.1, Topaz, Seedance 2.0, Seed Audio `fal-ai/seed-audio`, ElevenLabs, Hyper3D Rodin v2.5; the six text-driven
  ones generated end to end). Hard rule found live: ByteDance models on Fal use the slug **without** the `fal-ai/`
  prefix. `GLOBE_LAB_PROVIDER` = `fake|vertex|fal|composite` (default `fake`, reversible). Spec §"Realización" /
  §"Segundo adapter" / expansion + live verification: `docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`.
- `apps/creative-runner` + `packages/domain` own (TASK-1459) the **Still Model Lab recommendation matrix**: a real,
  honest comparison of the still portfolio (Vertex Nano Banana at 10 credits / ~7 s vs Fal Seedream 5 Pro at 10
  credits / ~138 s), both settling `objective_pass_pending_human` — the differentiator is latency and the craft
  verdict stays with a human, never auto-passed. It also fixed a `route_stable` bug in the Fal adapter and did not
  wait for the durable ledger or workbench.
- `provider-contract` + `apps/creative-runner` + `apps/studio-web` own **Track B — hash→bytes input resolution**
  (`40c6a95`): the `InputResolverPort` seam injected into the `LabRunner` resolves an experiment's declared input
  hashes to real bytes at the single provider-invocation point (`FixtureInputResolver` for golden-brief fixtures;
  keyless content-addressed `GcsInputResolver` + integrity check for real inputs; `RightsRoutedInputResolver`),
  attaching them server-internal to the request. Vertex inlines them (`generateContent` `inlineData`); Fal uploads
  to Fal storage → short-lived URL. **This closed the `inputs_unavailable` block** on the input-bearing golden
  briefs — the motion + audio briefs now run end to end. Full provenance/rights/retention stays TASK-1467.
- **First live motion + audio canary** (through Track B): **Fal Seedance 2.0** ran `product-motion-loop`
  (`objective_pass_pending_human`, 20 cr, ~155 s) and **Fal Seed Audio** ran `glitch-microphone-foley`
  (`objective_pass_pending_human`, 6 cr, ~16 s) — the working motion + audio engines today. The **Vertex Omni
  video path was removed** (`77d2949`): `gemini-omni-flash-preview` 400s on `generateContent` (Interactions API
  only); a `generateContent` adapter cannot serve Vertex video.
- **Follow-ups still open** on the provider stack: Globe's own Fal API key (the live Fal canary borrowed the repo
  key as a documented temporary exception), a `studio-web` deploy / Dockerfile for the runtime, a **dedicated
  Vertex video adapter** (Veo `predictLongRunning` / Omni Interactions API — `generateContent` cannot serve video),
  and a fidelity-contract selector replacing the Composite's fixed policy.
- Workload bridge evidence is green for anonymous denial, exact audience, wrong audience and Vercel WIF. Human federation is also live for the internal pilot: Greenhouse migration applied, Globe OAuth client/binding active for `efeonce_internal`, callback/session deployed and allow/deny/replay/revocation/correlation smokes green.
- TASK-1455 is live on `globe-studio-internal-00006-445`: the root, callback redirect, authenticated `/studio`, recovery and logout states use the canonical Globe assets. The premium GVC scenario passed at 1440×1000 and 390×844, including keyboard, reduced motion, axe, layout, runtime, performance and enterprise rubric.
- EPIC-028 has an accepted parallel execution baseline. Greenhouse is the canonical task control plane and now
  owns `TASK-1456…1481`, hooks, lifecycle, QA and handoff. Globe owns implementation/runtime/evidence only and
  has no local task registry. Model Lab, governed platform and commercial validation start in parallel. Live
  inference may begin only behind the bounded Lab gate; UI/MCP requires the separate promotion gate.

## Immediate next step

1. Ejecutar `TASK-1527` para persistir/reanudar la operación multi-principal; no promover ninguna de las 7 hasta
   cerrar terms/fixture/report/review/proposal/canary exactos. Priorizar Seed Audio sólo como internal-evaluation.
2. Ejecutar `TASK-1528` y luego `TASK-1529`; verificar derivados, Range/load y GC. El original privado no
   sustituye esa arquitectura.
3. Continuar `TASK-1526` reabierta: reemplazar el renderer replace-all por reconciliación DOM keyed, desacoplar
   cache de previews del filtro y coordinar filtro/search/orden sin respuestas stale; conservar reauth/títulos/
   viewer ya verificados. Validar en el Chrome existente, nunca otra sesión ni una descarga incidental.
4. Mantener clientes externos/Production cerrados hasta `TASK-1480` y sus dependencias; no interpretar el éxito
   internal-only como promoción comercial.

Fresh-session handoff prompt: [`EPIC_028_FRESH_SESSION_PROMPT.md`](docs/operations/EPIC_028_FRESH_SESSION_PROMPT.md).

Do not add a service-account key, enable Production or widen the OAuth audience. `globe-studio-internal` is network-reachable because the organization policy blocks `allUsers` IAM binding; application authorization remains internal-only and the service is configured with Cloud Run's no-invoker-IAM-check setting. The API service remains IAM-private.
