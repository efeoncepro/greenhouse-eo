# ISSUE-140 — Globe: el encoder de inputs gobernados emite la forma de Gemini y Veo rechaza todo submit

> **Estado:** ✅ **Resolved 2026-08-04** (`efeonce-globe@cd8bad1` + `@015b9d7`) — dos defectos de la misma familia,
> corregidos, desplegados y verificados con una generación real. La ruta Veo produce.
> **Detectado:** 2026-08-04 · **Ambiente:** Globe producción (`globe-api-internal`, `globe-producer-worker`)
> **Severidad:** Alta — la ruta Veo no podía generar ni una sola pieza por el camino gobernado
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028)
> **Desbloqueó:** `ISSUE-138` D12, hoy **cerrado con evidencia de runtime**

## Delta 2026-08-04 (cierre) — ✅ RESUELTO en dos capas; la ruta Veo GENERA

Segundo defecto, encontrado al verificar el primero y **de la misma familia**: el driver validaba la **FORMA** de
un identificador que fabrica el proveedor.

```
VEO_OPERATION = /^projects\/[a-z0-9-]+\/(?:locations\/[a-z0-9-]+\/)?operations\/[A-Za-z0-9._~-]+$/
```

Vertex, para un publisher model, devuelve
`projects/efeonce-globe/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/<id>`
— **verificado en el runtime real**. La regex no tenía lugar para `publishers/google/models/<model>/`, así que el
submit era aceptado, el nombre real llegaba, la validación lo rechazaba y **el nombre se descartaba sin persistirse
jamás**. Para un driver `poll` puro eso es pérdida irreversible con gasto incurrido: Fal sobrevive porque su webhook
repone la evidencia; Veo no tiene segundo escritor.

**Invisible porque los fixtures inventaban la forma corta** mientras los endpoints de esos mismos tests ya llevaban
`/publishers/google/models/…`: la suite verificaba una ficción. Corregidos los 4 fixtures al formato real.

**El fix no fue ampliar la regex.** Un operation name es un identificador **opaco**: su forma es del proveedor y
puede cambiar sin aviso — Fal y OpenAI sólo exigen string no vacío, y el adapter del Lab (único camino Veo que había
generado video real) nunca validó forma. Lo que sí protege un invariante es que la operación sea **NUESTRA**:
`assertVeoOperationOwnership` la contrasta contra proyecto, región y modelo que la ruta gobernada ya declaró — la
misma autoridad que `assertVeoEndpoint` aplica al endpoint, sin fijar el orden de los segmentos.

**Los dos fixes comparten diagnóstico:** el driver se acoplaba a detalles del proveedor que no controla (la forma
del encoding, la forma del id) en vez de a lo que sí gobierna (qué superficie consume, de quién es la operación).

### Evidencia de cierre

`efeonce-globe@cd8bad1` (encoder) + `@015b9d7` (id opaco), desplegados y verificados: API
`globe-api-internal-00210-pr5` imagen `015b9d72eaa0`, Job del worker con el digest etiquetado al mismo SHA.

Run `f0e8b876-…` → **`candidate_ready`**, MP4 de 7.988.662 bytes, `retained: true`, con liquidación exacta. El video
aterrizó en `gs://efeonce-globe-lab-evidence/governed-veo/d752100d-…/sample_0.mp4` → **cierra D12 de `ISSUE-138`**.

309 tests verdes, `pnpm check` y `pnpm build` verdes, test de propiedad probado en rojo.

### 🔴 Lo que queda abierto (no bloquea la generación)

1. **`canary-confirm` responde `internal_error` 500.** El asset estaba `active` + `eligible` y el run `completed`,
   así que la evidencia existía; la saga quedó en `verifying_canary` y no hay reintento posible desde ese estado
   (el command exige `activated`). El sello de la promoción es hoy inalcanzable por una excepción no manejada. Es
   `ISSUE-127` otra vez: un 500 opaco donde debería haber una razón nombrada. **Dueño: `TASK-1641`.**
2. **La reserva no converge cuando el run muere por `reschedule()` → `abandon()`.** Diagnóstico completo: la
   liberación está acoplada a `finalize()`, que exige `completion` persistida, y `RUN_DEPENDENT_AGGREGATES` declara
   `credit_reservations` como `observable` delegando en el expiry TTL de **24 h**. Eso es correcto **post-gasto**
   (el settlement ya decidió) pero no **pre-gasto**, donde nadie cobró y no hay riesgo de doble movimiento. La
   distinción ya existe en la política de fases (`POST_SPEND_KINDS`) y **no se propaga a `abandon()`**.
   **Dueño: `TASK-1641`.**

## Delta 2026-08-04 (noche) — fix desplegado y verificado; destapa un segundo defecto aguas abajo

**Corregido en `efeonce-globe@cd8bad1`, desplegado y verificado en runtime** (API `globe-api-internal-00209-lzw`
con imagen `cd8bad1c6893`; Job `globe-producer-worker` con el digest `sha256:378b53e8…` etiquetado al mismo SHA).

El fix **no fue** pasarle su encoder a Veo, sino que **ningún driver pueda heredar la forma de otro**: el parámetro
`encoder` pasa a ser **requerido** y las formas se declaran en `PROVIDER_INPUT_ENCODERS`
(`geminiInlineData` · `vertexPredictInline` · `rawBase64`). Un driver nuevo elige su forma o no compila.

El barrido de implementadores —hecho en una sola pasada, no iterando contra el compilador— encontró **5
constructores en producción, 2 de ellos heredando el default en silencio**: Veo (roto) y el driver de imagen de
Vertex (que funcionaba **sólo porque el default ERA su forma**). Ambos declaran ahora la suya.

Test `provider-input-encoders.test.ts`, registrado en el script `test` del package y **probado en rojo**: atrapa la
regresión en tres asertos, incluido *"dos formas idénticas significan que un proveedor está heredando la de otro"*.
`pnpm check` (308 + 301) y `pnpm build` verdes.

### Verificación en runtime: el submit ya pasa

Canary sobre el runtime corregido (run `61d75e38-c309-43c9-9d79-479cff6e00c2`, 32 cr):

| | Antes del fix | Después |
|---|---|---|
| Código | `veo_submit_invalid` | `veo_operation_evidence_invalid` |
| Progresión | `submitting` → terminal en 1 vuelta | **`submitting` durante 6 vueltas** |
| Operación en Vertex | nunca creada | el request **fue aceptado** |

**El rechazo del submit está cerrado.** Vertex ya no rechaza el body.

### 🔴 Lo que queda abierto — dos defectos nuevos, distintos de éste

1. **`veo_operation_evidence_invalid`**: el poll pide `attempt.providerOperation.providerOperationId` y el attempt
   lo tiene **vacío** — la evidencia de la operación no quedó persistida pese a que el submit fue aceptado. Es la
   familia del **lost-ack de `ISSUE-138` D1**, ahora en el carril de Veo: si Vertex creó la operación, hay un video
   potencialmente generado y facturado que no podemos recuperar.
2. **La reserva de crédito NO convergió.** El run quedó terminal (el código está clasificado `terminal`, no
   `unknown`) y los 32 créditos siguen **retenidos sin `release`**, verificado dos ciclos del worker después. El run
   anterior, que murió con `provider_failed`, **sí liberó** — así que el camino de liberación depende de *por dónde*
   murió el run y no del hecho de que murió. Es el invariante de convergencia terminal de ADR-021/`TASK-1469`
   incumplido sobre el agregado de crédito.

Ambos son **aguas abajo** de este issue y no lo reabren: este issue cerró el rechazo del submit. Se registran acá
porque los destapó su verificación, y necesitan dueño propio.

## Síntoma

Toda generación por `ref/video/frames-v1` (`vertex-video` / `veo-3.1-generate-001`) termina en
`failed` con `errorCode: veo_submit_invalid`, `failureReason: policy_rejected`, y
`provider_operation_id` vacío: **Vertex rechaza el submit con HTTP 400 y nunca se crea la operación**.

Evidencia (2026-08-04, workspace `greenhouse-org:efeonce`):

| Dato | Valor |
|---|---|
| Run | `f1c0184f-c404-47cb-8f36-cfde131ace26` |
| Attempt | `bdcecae2-8047-4610-8702-e7b2002619d0` |
| Progresión | `waiting → submitting → finalizing → terminal` |
| Crédito | reserva 32 → release −32, **`spent_delta = 0`** |

**No hay pérdida económica: el fence liberó la reserva completa.** El daño es de capacidad —la ruta está
promovida y no produce— y de diagnóstico.

## Causa raíz

`HashBoundProviderRequestMaterializer` reemplaza cada nodo `{"$authorizedInput": "sha256:…"}` del body
compilado usando un **encoder por defecto** que emite `{ data, mimeType }`
([`governed-provider-runtime.ts:68`](../../../../efeonce-globe/apps/creative-runner/src/governed-provider-runtime.ts)):

```ts
encode: async ({ asset }) => ({ data: Buffer.from(asset.bytes).toString('base64'), mimeType: asset.mimeType }),
```

Esa es la forma de **`inlineData` de Gemini**, correcta para Omni. Pero Veo, invocado por
`:predictLongRunning`, exige **`{ bytesBase64Encoded, mimeType }`**. El driver de Veo se construye sin
encoder propio, así que hereda el default
([`governed-production-composition.ts:168`](../../../../efeonce-globe/apps/studio-web/src/governed-production-composition.ts)):

```ts
materializer: new HashBoundProviderRequestMaterializer(inputResolver),
```

Vertex recibe `image: { data: …, mimeType: … }`, no encuentra `bytesBase64Encoded`, y responde
`400 image mime type is empty` → el driver lo clasifica `veo_submit_${status}` → `veo_submit_invalid`.

**El adapter del Lab sí lo hace bien** (`vertex-video-adapter.ts:379` emite `bytesBase64Encoded` +
`mimeType`). La divergencia es entre el carril **Lab** y el carril **gobernado**: el segundo nunca
recibió la forma que su proveedor pide.

### Reproducción — probes de gasto cero contra Vertex

Un 400 no factura, así que la causa se aísla sin gastar:

| Probe | Body | Resultado |
|---|---|---|
| A | `image` **con** `mimeType` + base64 inválido + `storageUri` | `Invalid base64 encoded bytes` |
| B | igual que A + `generateAudio:false` + `durationSeconds:8` | `Invalid base64 encoded bytes` |
| C | `image` **sin** `mimeType` | **`image mime type is empty`** ← reproduce el fallo |

A y B prueban que `storageUri`, `generateAudio:false`, `durationSeconds:8` y `aspectRatio:16:9`
**son aceptados**: el único rechazo es la forma del nodo de imagen.

## Lo que este issue exonera

- 🔴 **D12 de `ISSUE-138` NO es la causa.** El probe A confirma que `storageUri` es aceptado por
  `veo-3.1-generate-001`. El fix de D12 está bien; simplemente **nunca se ejecuta**, porque el submit
  muere antes de crear la operación.
- La atestación de derechos, la revisión humana, el readiness, los rates y el binding estaban todos
  correctos: la promoción se completó sin observaciones.

## Bug class

Es la misma familia de `ISSUE-139`: **un default que acierta para unos consumidores y miente para otro**.
Ahí un MIME por modalidad describía mal los bytes; acá una forma de encoding pensada para `inlineData`
describe mal el nodo que Veo espera. El default no falla ruidosamente — produce un body que el proveedor
acepta parsear y rechaza por una razón que no nombra el campo real.

Y hereda el agravante de `ISSUE-127`: `veo_submit_invalid` colapsa *todos* los 400 de Vertex en un solo
código, así que el operador ve "rechazo permanente" sin saber qué campo lo causó. El mensaje real
(`image mime type is empty`) sólo aparece reproduciendo el request a mano.

## Solución propuesta

Dar al driver de Veo su **encoder propio**, en vez de heredar el de Gemini:

```ts
veo = new VeoGovernedRunDriver({
  transport: …,
  allowedOutputBuckets: input.veoOutputBuckets,
  materializer: new HashBoundProviderRequestMaterializer(inputResolver, {
    encode: async ({ asset }) => ({
      bytesBase64Encoded: Buffer.from(asset.bytes).toString('base64'),
      mimeType: asset.mimeType,
    }),
  }),
});
```

El puerto `AuthorizedProviderInputEncoderPort` **ya existe y ya es inyectable** — el segundo parámetro del
constructor está previsto para exactamente esto. No hace falta arquitectura nueva.

**Consideración de diseño (para el fix, no para este issue):** que el encoder correcto sea el default y
Veo el que se desvía es la razón por la que nadie lo notó. Vale evaluar si el encoder debe ser un dato
declarado **por driver** —de modo que un driver nuevo tenga que elegir explícitamente su forma— en lugar
de heredar en silencio la del primer consumidor. Es el mismo remedio que ADR-022 aplicó a los inputs.

### Gate de cierre

- Test registrado en el script `test` de su package (el repo enumera los archivos a mano).
- `pnpm check && pnpm build` en `efeonce-globe`.
- Deploy de **`globe-api-internal`** (ahí vive `governed-production-composition.ts`) **y** del worker.
- Generación real por `ref/video/frames-v1` que llegue a `candidate_ready` con output `retained`.
- Verificar que el objeto aterriza en `gs://efeonce-globe-lab-evidence/governed-veo/<attemptId>/` —
  eso cierra **D12 de `ISSUE-138`** por evidencia de runtime.

## Impacto en la promoción vigente

La promoción `promotion_3902259f-c56b-4c7e-8589-5e31f9a077a3` quedó `activated` sin canary y va a
revertirse sola por deadline. **Eso es correcto:** la ruta no puede generar, así que no debe quedar
seleccionable. Re-promoverla cuesta 4 dispatches (~3 min) una vez que el fix esté desplegado.
