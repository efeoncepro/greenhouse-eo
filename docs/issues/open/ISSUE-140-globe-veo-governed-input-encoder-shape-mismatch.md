# ISSUE-140 — Globe: el encoder de inputs gobernados emite la forma de Gemini y Veo rechaza todo submit

> **Estado:** Open — causa raíz localizada y reproducida con probe de gasto cero; fix no aplicado
> **Detectado:** 2026-08-04 · **Ambiente:** Globe producción (`globe-api-internal`, `globe-producer-worker`)
> **Severidad:** Alta — la ruta Veo no puede generar ni una sola pieza por el camino gobernado
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028)
> **Bloquea:** `ISSUE-138` D12 (el fix de `storageUri` no es ejercitable)

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
