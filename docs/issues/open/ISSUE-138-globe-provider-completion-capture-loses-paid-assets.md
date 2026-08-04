# ISSUE-138 — Globe: la captura de completitud pierde assets ya cobrados en los tres proveedores

> **Estado:** Open — **11 de 13 arreglados y en `main`; 2 declarados por depender del proveedor**
> **Detectado:** 2026-08-04 · **Ambiente:** Globe producción (`globe-producer-worker`, `globe-api-internal`)
> **Severidad:** Alta — tres caminos distintos terminan en un asset generado, facturado e irrecuperable
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028, `TASK-1469`)

## Cómo apareció

No lo reportó un usuario ni una alerta: **lo destapó una pregunta del operador** — *"¿1469 no trataba de los
webhooks y de saber cuándo un modelo avisa que el asset está listo?"*. Esa pregunta expuso que yo había cerrado
`TASK-1469` verificando sólo la deuda de convergencia, con su bloque `## Acceptance Criteria` —22 ítems sobre
justamente ese carril— sin recorrer. La auditoría que siguió, contrastando la documentación oficial de cada
proveedor contra el código, encontró 13 huecos.

**El sistema estaba en verde durante todo eso.** Los tres agujeros graves no producen error visible: dos de
ellos fallan *exactamente en el momento del éxito*, que es la peor forma de fallar.

## Los tres que pierden un asset ya cobrado

### D1 · Fal — el rescate del lost-ack recupera el id y no las URLs

Cuando el POST de submit llega a Fal pero nuestra respuesta HTTP se pierde, el attempt queda
`submission_unknown` sin evidencia de operación. Después llega el webhook firmado, y el camino de rescate
—cuyo propio comentario en el código se llama *"the lost-ack recovery path"*— escribe **sólo**
`provider_operation_id` y `provider_accepted_at` (`packages/database/src/stores/governed-run-store.ts:625-631`).

El único escritor de `provider_status_url` / `provider_response_url` es `markSubmissionAccepted`
(`:497-505`), que ya no se va a ejecutar. Y las dos salidas exigen esas URLs:

- `FalProductionResultDriver.resolve` → `fal_response_evidence_missing` (`production-result-drivers.ts:77-78`)
- `FalGovernedRunDriver.reconcile` → `fal_provider_operation_evidence_missing` (`governed-provider-runtime.ts:191-193`)

**Consecuencia:** Fal ejecutó y facturó; tenemos el `request_id` en la mano; el run queda trabado y la reserva
de crédito colgada. Se ve sólo como un `retryStorm`.

⚠️ **La salida obvia está prohibida por una regla dura vigente:** *nunca reconstruir las URLs de la queue de
Fal desde el slug*. Cualquier arreglo tiene que respetarla o cambiarla con argumento, no rodearla.

### D2 · Vertex/Veo — un techo de 2 MB delante de un video que vuelve en base64

`DEFAULT_MAX_JSON_BYTES = 2 MB` (`production-result-drivers.ts:19`) acota el body del poll
(`:311` → `:343` → `boundedResponseBytes`), mientras el mismo archivo declara un presupuesto de salida de
**64 MB** (`:18`). Como **no pasamos `storageUri`**, el MP4 vuelve **inline en `bytesBase64Encoded`**, con el
~33 % de sobrecosto de base64.

Los polls `pending` pasan sin problema —son chicos— y **revienta exactamente el que trae el video**.

**No depende de medición:** 64 MB a través de un caño de 2 MB es inalcanzable por construcción. Y el repo ya
había resuelto este mismo problema para OpenAI con una constante dedicada de **24 MB** (`:20`) sin replicarlo
en Veo.

### D3 · Omni — una generación de minutos dentro de una lease de 60 segundos

Google documenta que la generación de Omni *"can take over a minute"*; `GLOBE_GOVERNED_LEASE_MS` tiene default
**60 000 ms** (`apps/creative-runner/src/governed-runtime-config.ts:32`).

Si la lease vence con la llamada síncrona en vuelo, el sistema hace **lo correcto** y no re-submite: pasa a
`submission_unknown` y encola reconcile. Pero `VertexOmniGovernedRunDriver.reconcile` exige un
`providerOperationId` **que nunca se escribió** (`vertex-omni-governed-driver.ts:111-112`), porque la evidencia
sólo nace al final del submit.

**Peor:** los bytes **sí se ingirieron a GCS** (`:97`) y su hash se perdió. El asset existe, está pagado, y no
hay forma de alcanzarlo.

## Riesgo alto sin pérdida de asset

### D4 · OpenAI — el submit síncrono no tiene timeout, y su anti-doble-cobro no está verificado

`createOpenAiImagesGovernedTransport` hace `fetch` **sin `AbortSignal.timeout`**
(`openai-images-governed-driver.ts:167`), mientras el transporte de Fal lo acota entre 1 s y 120 s
(`governed-provider-runtime.ts:286-293`). Con lease de 60 s, una generación colgada permite que otro worker
reclame el job y **vuelva a llamar a OpenAI**.

La única defensa es el header `idempotency-key` (`:172`), y **NO ESTÁ VERIFICADO que OpenAI lo honre en
`/v1/images/generations`**: no aparece en su referencia de Images.

### D5 · El código de error del reconcile se borra — y es lo que vuelve invisible a D2

`ProductionProviderResultError` guarda su causa en `.code` (`production-result-drivers.ts:24-30`), pero
`reconciliationFailureCode` lee `.errorCode` (`packages/domain/src/governed-run-lifecycle.ts:665-672`).
Resultado: `provider_response_too_large`, `veo_poll_quota_exhausted` y `veo_poll_access_denied` colapsan **en
el mismo string**.

Es **`ISSUE-127` en el único camino donde no se había arreglado**: `finalizationFailureCode` sí lee `.code`
(`:581`). Y al borrarse el nombre, tampoco se puede clasificar → todo cae a `unknown`.

### D6 · Fal no reporta `FAILED` por el status endpoint, así que el poll no sabe cerrar un fallo

La queue de Fal documenta sólo `IN_QUEUE | IN_PROGRESS | COMPLETED`; el fallo del modelo llega como **código
HTTP del response endpoint**. Nosotros mapeamos `404 ⇒ pendiente` cuando su doc dice *"the request cannot be
found"*, y cualquier 5xx a `fal_result_unavailable` → reschedule
(`governed-provider-runtime.ts:335-343`). Las ramas `FAILED`/`CANCELLED` del reconcile (`:204-209`) no
corresponden a ningún valor documentado.

**Si el webhook se pierde y el run falló en el modelo, el poll no lo cierra nunca** — reintenta con la reserva
retenida. Es justo el modo de fallo que el poll existe para cubrir.

## Medio y bajo

| | Hueco | Riesgo |
|---|---|---|
| D7 | Fal: ventana de replay de 300 s contra una política de reintentos de 2 h. Si Fal reutiliza el timestamp original, todo reintento posterior a 5 min se rechaza. **NO VERIFICADO** en su doc | medio, se compone con D6 |
| D8 | Fal: `catch` ciego que convierte cualquier error interno en 400 (`app.ts:1951-1953`) — un blip de Postgres descarta la señal | medio |
| D9 | Fal: sin verificar `x-fal-webhook-user-id` ni la allowlist de IP que Fal publica en `api.fal.ai/v1/meta`. Su JWKS es **global**: un tercero puede provocar una entrega genuinamente firmada. No permite robar un asset, **sí matar runs ajenos** | medio |
| D10 | Veo: la espera `pending` usa backoff de **error** en vez de la cadencia de espera que el módulo ya define (`WAITING_POLL_MS`). Hasta ~5 min de latencia después de que la pieza existe | medio |
| D11 | Fal: fallbacks de modelo activos por defecto; el modelo que ejecutó puede no ser el del `route_snapshot` aprobado y tarifado | gobernanza económica |
| D12 | Veo: `resolve()` re-consulta la operación mucho después del `done`; la retención de una Operation con resultado inline es **NO VERIFICADO** | medio |
| D13 | OpenAI: el verificador de webhook es código muerto y su ruta es **irregistrable** (OpenAI usa una URL estática por proyecto; la nuestra exige el correlation id en el path) | bajo, pero engaña |

## Lo que está BIEN y no hay que tocar

- **`poll` para OpenAI es correcto POR DISEÑO**, no una omisión: OpenAI **no emite eventos de webhook para
  imágenes**. Sus 16 eventos son `response.*`, `batch.*`, `fine_tuning.job.*`, `eval.run.*` y
  `realtime/live.call.incoming`.
- **Vertex no ofrece callback por request**; su propia doc de LRO describe polling. El worker durable es la
  respuesta correcta, y los 2 intentos en `poll` con cero señales son **coherentes con el proveedor**.
- **El esquema de firma de Fal coincide carácter por carácter** con su contrato: SHA-256 hex del cuerpo crudo,
  cuatro partes unidas por `\n` en orden request-id → user-id → timestamp → digest.
- **El digest se calcula sobre `rawBody`, nunca sobre JSON re-serializado.** Cualquier refactor que meta un
  `JSON.parse`/`stringify` en el camino rompe la verificación.
- **El payload del webhook nunca se persiste ni se usa como resultado**: siempre se lee del `response_url`.
  Es literalmente la remediación que Fal prescribe para `payload_error`, y ya la teníamos.
- **La dedupe** (`PK (provider, delivery_id)` + `UNIQUE (provider, provider_event_id)`) implementa exactamente
  la recomendación de entrega at-least-once.
- **La carrera webhook-antes-del-ack ya está resuelta**: `markSubmissionAccepted` adopta señales huérfanas en
  la misma transacción.
- **Un solo efecto económico por attempt** (`dedupeKey` + `UNIQUE (economic_decision_key)`).
- **Una lease de `submit` vencida nunca vuelve a ser elegible.** En proveedores sin idempotency key, ésta es
  la propiedad que impide pagar dos veces.
- **Omni y la lane de imagen ingieren los bytes ANTES de acusar aceptación.** Es el orden correcto.

## Nota de método sobre las fuentes

`docs.fal.ai` devolvió **HTTP 429** en todos los intentos de lectura en vivo. Su contrato se leyó de **dos
espejos verbatim independientes que coinciden entre sí**, más probes en vivo del JWKS (dos hosts) y de
`api.fal.ai/v1/meta`. Es evidencia fuerte, **no de primera mano**. Las afirmaciones sobre OpenAI y Google sí
provienen de su documentación oficial en vivo.

Los tres hallazgos graves (D1, D2, D3) más D4 y D5 se **verificaron de forma independiente** leyendo el código,
con `archivo:línea`.

## Delta 2026-08-04 — resuelto end-to-end salvo dos que dependen del proveedor

Nueve commits en `efeonce-globe@main`, `pnpm check` y `pnpm build` verdes en cada uno.

| | Qué se hizo | Commit |
|---|---|---|
| **D2** | El techo del poll se **DERIVA** del presupuesto de salida a través de su expansión base64, y el submit conserva el suyo. Eran dos números que tenían que estar de acuerdo declarados por separado; ahora el test afirma la relación, así que subir uno sin el otro rompe el build. **Probado en rojo revirtiendo el fix** | `0e9d696` |
| **D5** | `reconciliationFailureCode` lee `.code` además de `.errorCode`, y conserva la clase del error como sufijo. **21 códigos a `terminal`, 7 a `transient`, `veo_result_not_ready` a `waiting`** — la tercera espera del ciclo, que caía a `unknown`. `safeStatus` separa `rejected` en `invalid` (4xx) y `unavailable` (5xx) | `b88cfdb` |
| **D3** | Lease de 60 s → 10 min. Una lease larga sólo hace más lento un takeover; una corta pierde una pieza pagada | `b0a85cb` |
| **D4** | Timeout acotado en el submit de OpenAI, espejo del de Fal (30 s default, techo 120 s) | `b0a85cb` |
| **D8** | El ingress devuelve **503** ante un fallo nuestro y **400** sólo ante un rechazo definitivo. El test existente atrapó que mi primera clasificación era demasiado gruesa: un cuerpo sobredimensionado también es definitivo | `b0a85cb` |
| **D10** | Un `pending` usa la cadencia de espera (10 s fijos) en vez del backoff exponencial de error | `b0a85cb` |
| **D6** | **Se respeta `X-Fal-Retryable`**, la propia señal del proveedor, en vez de inferir del status. El 400 pasa a leerse como «todavía no completada». El 404 se conserva pendiente **a propósito**: darlo por terminal con evidencia de segunda mano mataría corridas vivas | `3e9a599` |
| **D9** | El `x-fal-webhook-user-id` se compara contra el nuestro cuando está configurado. Cableado de punta a punta (`GLOBE_FAL_USER_ID`) pero **sin configurar**, porque el valor no se adivina — ver abajo | `3e9a599` + `1febd9e` |
| **D1** | El rescate parcial queda **nombrado y auditado** (`lost_ack_recovered_without_follow_up`). No se arregla adivinando la URL — ver abajo | `44c6da9` |
| **D11** | `x-app-fal-disable-fallbacks` en cada submit: un reruteo silencioso cobraría por un modelo que nadie aprobó y dejaría el `route_snapshot` mintiendo | `a5ebb13` |
| **D13** | El segmento de correlación pasa a ser **opcional sólo para OpenAI**, que configura su webhook por proyecto con URL estática. Su evento trae el `response_id` y el store ya sabe correlacionar por él. En Fal sigue obligatorio | `a5ebb13` |
| **D7, D12** | **Declarados donde vive el riesgo**, no en un doc aparte | `0b5f875` |

### Guards nuevos, todos derivados y en ambas direcciones

- `production-result-failure-classification.test.ts` — **deriva el vocabulario del archivo fuente** en vez de copiarlo, y **encontró cuatro códigos que se me habían pasado**. Cubre también la dirección contraria: una excepción que deja de ser excepción queda mintiendo.
- El test del presupuesto inline afirma que el techo puede transportar la salida declarada, con su margen de envoltorio.

### Lo verificado en el panel de Fal, que confirma el diagnóstico desde el proveedor

- Su sección «Webhooks» es un **registro** (*"View your webhook requests"*), **no una configuración**: no hay nada que habilitar. **34 entregas, todas `202`**, todas a `globe.efeoncepro.com/v1/provider-webhooks/fal/<handle>` — el handle va por request, confirmando la asimetría con OpenAI que motiva D13.
- La API key del panel coincide con la nuestra.

### 🔴 Los dos que NO se cierran, y por qué

**D1 — el rescate del lost-ack sigue sin recuperar el asset.** La salida obvia (armar
`{queue}/requests/{request_id}`) **está prohibida por contrato y no es derivable**: un modelo con sub-path deja
de coincidir, así que adivinarla mandaría a leer el resultado de otra cosa. Tres formas candidatas, todas
pendientes de decisión:

1. **Base de seguimiento declarada por endpoint** en el allowlist — convierte una derivación imposible en dato
   curado y verificado por un humano. Es la más alineada con el repo (*"si el motor sólo soporta N valores,
   que el schema los ENUMERE"*), y necesita la doc en vivo de Fal.
2. **El payload del webhook como portador de último recurso** — hoy nunca se persiste, y por buenas razones.
   Cambia una postura de seguridad y es decisión del operador.
3. **Command gobernado para adjuntar evidencia** — un humano que lee el request en el panel de Fal recupera la
   corrida. La más cara, la que no depende de nadie más.

Mientras tanto la corrida muere con un código nombrado y el rescate parcial queda auditado, así que estos casos
son **enumerables**: sin eso ni siquiera se podía medir cuántos assets pagados se pierden por este camino.

**D9 — el guard está cableado y deliberadamente sin configurar.** El panel de Fal **no expone ese identificador
como valor**, sólo el username. Configurarlo con una suposición sería peor que dejarlo apagado: si el valor está
mal, el guard rechaza **todas** las entregas legítimas y tumba el carril de webhooks — un fallo mayor que el que
cierra. Así que el sistema lo **observa**: sobre una entrega real y ya verificada emite
`globe.provider_webhook.account_identity_observed`, y sólo mientras el guard siga sin configurar. Con la próxima
generación queda el valor medido y se configura.

Que la observación sea **posterior** a la verificación no es un detalle de orden: si fuera antes, cualquiera
podría dictar desde afuera el valor que el operador va a terminar configurando.

### Rollout ejecutado

Los **tres runtimes** en `0b5f875a19cb`, verificado con el drift guard contra revisión activa y digest —no
contra el workflow en verde—: API `00203-77k`, Studio `00146-hdx`, worker `sha256:4060447a5095`. Salud
post-deploy limpia.

## Solución propuesta

Orden por dependencia, no por severidad: **D5 primero porque es barato y destapa a los demás.**

1. **D5** — `reconciliationFailureCode` lee `.code` además de `.errorCode`, espejo de `finalizationFailureCode`;
   y los códigos del poll se clasifican en la política de reintentos **en el mismo commit** (regla de
   nacimiento de `ISSUE-135`).
2. **D2** — presupuesto de JSON propio para el poll de Veo, dimensionado contra el presupuesto de salida.
3. **D1** — el rescate del lost-ack persiste la evidencia de seguimiento, **sin violar la regla de no
   reconstruir URLs desde el slug**.
4. **D3** — que una generación de minutos no muera por una lease de 60 s.
5. **D4** — timeout acotado en el transporte de OpenAI, espejo del de Fal.
6. **D6, D8, D9, D10** — clasificación honesta del 404/5xx de Fal, `catch` que distingue infraestructura de
   firma inválida, verificación del `user-id`, y cadencia de espera en el reconcile.
7. **D7, D11, D12, D13** — declarar lo no verificado y retirar o cablear el código muerto.

## Lo que NO es

- **No es** una falla del diseño de captura. Los tres mecanismos son los correctos para cada proveedor.
- **No es** que a OpenAI le falte webhook: no existe para imágenes.
- **No es** que Vertex debiera tener callback: no lo ofrece.

## Relacionado

- `TASK-1469` — dueña del carril de completitud; lleva el arreglo.
- `ISSUE-127` — sanitización sin contraparte de observabilidad. **D5 es su aparición número 12**, y la primera
  en el camino de reconciliación.
- `ISSUE-135` — tope de reintentos sin señal. D5 le impide clasificar; D2 muere por su tope.
- `ISSUE-137` — experimentos en `running` con cero intentos: familia adyacente, alcance propio.
- `TASK-1470` — routing/fallback/circuit-breaker policy: dueña declarada de D11.
