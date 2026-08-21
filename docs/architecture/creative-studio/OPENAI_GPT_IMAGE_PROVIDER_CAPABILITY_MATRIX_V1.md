# OpenAI GPT Image — Provider Capability Matrix V1

> **Tipo:** investigación de proveedor y contrato de integración
> **Estado:** Accepted como evidencia de proveedor; no autoriza rollout
> **Validado:** 2026-08-21
> **Owner:** Greenhouse AI Image Generator + Globe Model Fleet
> **Revalidación:** antes de implementar, cambiar precios, promover una ruta o usar una capacidad en preview

## Propósito y frontera de autoridad

Esta matriz consolida la documentación oficial vigente de OpenAI para la familia GPT Image y la traduce a los
contratos de Greenhouse y Efeonce Globe. No es un catálogo runtime ni demuestra disponibilidad.

```text
OpenAI documenta la capacidad
  != el helper Greenhouse la transporta
  != Globe la declara en OutputShapeV1
  != el adapter la envía
  != el output fue verificado
  != la ruta está promovida/disponible
```

La disponibilidad de Globe se lee en `globe.producer.fleet.list`. El código y los canaries viven en
`efeonce-globe`; esta matriz registra evidencia, gaps y criterios de implementación.

## Resultado ejecutivo

- `gpt-image-2` es el único miembro activo y recomendado de la familia. El alias tiene el snapshot fijable
  `gpt-image-2-2026-04-21`.
- OpenAI documenta transparencia nativa para GPT Image 2 **en preview** mediante
  `background: "transparent"`; el output debe ser PNG o WebP. JPEG no admite este modo.
- El helper Greenhouse conserva GPT Image 2, rechaza `transparent + jpeg` antes de red, fija el contrato singular
  a un output y no promete parciales sin un transporte SSE implementado. La aceptación sigue exigiendo QA alfa.
- Globe implementa localmente `backgroundMode` para `ref/still/openai-v2`, lo transporta al adapter y valida alfa
  decodificado. La variante sigue **no desplegada/no promovida** hasta completar canary facturable y readback live.
- Image API permite elegir el modelo exacto. Responses API elige un modelo principal compatible y la herramienta
  `image_generation` administra su propia selección GPT Image; no debe usarse para probar identidad exacta.

## Familia y ciclo de vida

| Identidad API | Snapshot/semántica | Estado oficial al corte | Retiro anunciado | Uso nuevo |
|---|---|---|---|---|
| `gpt-image-2` | alias + `gpt-image-2-2026-04-21` | activo; modelo recomendado | no anunciado | Sí |
| `gpt-image-1.5` | `gpt-image-1.5-2025-12-16` | deprecated; modelo anterior | 2026-12-01 | No |
| `gpt-image-1` | sin snapshot fechado distinto en la ficha | deprecated | 2026-10-23 | No |
| `gpt-image-1-mini` | alias del modelo económico de la generación 1 | deprecated | 2026-12-01 | No |
| `chatgpt-image-latest` | alias del modelo anteriormente usado por ChatGPT | deprecated; no recomendado para API | 2026-12-01 | No |

Los modelos DALL·E no pertenecen a la familia GPT Image. Sus snapshots fueron retirados del API el
2026-05-12; no son una alternativa vigente para una integración nueva.

## Superficies API

| Superficie | Selección | Generación | Edición/referencias | Máscara | Streaming | Identidad exacta |
|---|---|---:|---:|---:|---:|---:|
| `POST /v1/images/generations` | GPT Image directo | Sí | No | No | Sí, `partial_images: 0..3` | Sí |
| `POST /v1/images/edits` | GPT Image directo | No | Sí, una o más imágenes | Sí | Sí, `partial_images: 0..3` | Sí |
| Responses API + `image_generation` | modelo principal GPT-5+; el tool elige GPT Image | Sí | Sí, multi-turn | Según el tool | Sí | No para el GPT Image subyacente |
| Batch API | endpoint Images embebido | Sí | Sí | Sí, según endpoint | resultado diferido, no SSE | Sí en el body del request |

Las fichas de modelo marcan `Streaming: Not supported`, mientras la guía y el API reference documentan streaming
de Image API y Responses API. Para la integración se toma el contrato específico del endpoint como autoridad y se
registra esta contradicción documental; el streaming sigue sin estar probado en Globe.

## Contrato de salida de GPT Image 2

### Fondo y transparencia

`background` acepta `transparent | opaque | auto`. Cuando se pide `transparent`:

- la capacidad está en preview para `gpt-image-2` y `gpt-image-2-2026-04-21`;
- `output_format` debe ser `png` o `webp`;
- `jpeg` es inválido porque no preserva alfa;
- no debe confundirse un checkerboard renderizado con transparencia real;
- se debe validar que el archivo tenga canal alfa **y al menos un píxel no opaco**;
- el output debe revisarse sobre fondos claros y oscuros para detectar halos y residuos.

`background: "auto"` puede resolver a transparente u opaco. La respuesta del Image API expone el valor resuelto
como `background: "transparent" | "opaque"`; debe conservarse en provenance/readback, no inferirse del prompt.

### Formato, compresión, calidad y tamaño

- Formatos: PNG por defecto, JPEG y WebP.
- `output_compression: 0..100` aplica sólo a JPEG y WebP; no debe enviarse con PNG.
- `quality`: `low | medium | high | auto`; `low` sirve para drafts y `auto` es el default documentado.
- GPT Image 2 admite dimensiones flexibles cuando ambos ejes son múltiplos de 16, cada eje es `<= 3840`, el
  ratio no supera `3:1` y el total queda entre 655.360 y 8.294.400 píxeles.
- Más de 3.686.400 píxeles se considera experimental. La guía presenta 3840×2160 y 2160×3840 como tamaños válidos.
- La prompting guide y la guía principal discrepan entre borde `< 3840` y `<= 3840`; el API guide y sus ejemplos
  actuales sostienen `<= 3840`. Revalidar antes de fijar 3840 como borde contractual.

### Edición, referencias y máscaras

- GPT Image 2 procesa todas las referencias en alta fidelidad. Se debe **omitir** `input_fidelity`; el API no
  permite cambiarlo para este modelo.
- `/v1/images/edits` acepta múltiples referencias. El orden y el rol semántico deben preservarse en el contrato.
- La máscara guía al modelo, pero no es una garantía pixel-perfect. Con múltiples referencias se aplica a la
  primera imagen.
- Un output aceptado exige revisar deriva fuera de la región, identidad, texto/logos y geometría protegida.

### Streaming y costos adicionales

`partial_images` admite de 0 a 3 previews. El resultado final puede llegar antes de completar el número pedido.
Cada imagen parcial añade 100 image-output tokens. Esta función necesita contrato de eventos, lifecycle y costo;
no debe activarse por un cambio de UI aislado.

## Precios oficiales al 2026-08-21

Los valores son USD y evidencia temporal, no precios de cliente ni Studio Credits.

### GPT Image 2 — Standard por 1M tokens

| Modalidad | Input | Cached input | Output |
|---|---:|---:|---:|
| Imagen | $8.00 | $2.00 | $30.00 |
| Texto | $5.00 | $1.25 | — |

Batch figura a la mitad: imagen $4/$1/$15 y texto $2.50/$0.625. En la calculadora oficial, sólo el output de
referencia cuesta aproximadamente:

| Quality | 1024×1024 | 1024×1536 | 1536×1024 |
|---|---:|---:|---:|
| Low | $0.006 | $0.005 | $0.005 |
| Medium | $0.053 | $0.041 | $0.041 |
| High | $0.211 | $0.165 | $0.165 |

El costo total suma prompt de texto, referencias de imagen en edits y output de imagen. En GPT Image 2 una
referencia puede elevar el input por su alta fidelidad automática. No se debe extrapolar linealmente por área:
OpenAI advierte que una resolución no cuadrada mayor puede usar menos output tokens que otra menor.

### Modelos deprecated — output de referencia por imagen

| Modelo | Low 1024² | Medium 1024² | High 1024² | Nota |
|---|---:|---:|---:|---|
| GPT Image 1.5 | $0.009 | $0.034 | $0.133 | retirar antes de 2026-12-01 |
| GPT Image 1 | $0.011 | $0.042 | $0.167 | retirar antes de 2026-10-23 |
| GPT Image 1 Mini | $0.005 | $0.011 | $0.036 | retirar antes de 2026-12-01 |

Estas cifras no justifican nuevas rutas. Para costos actuales se releen pricing y calculadora justo antes del uso.

## Seguridad, datos y provenance

- Los prompts y outputs pasan por moderación. `moderation` acepta `auto` y `low`; no es un bypass de políticas.
- No reintentar automáticamente `image_generation_user_error` ni `moderation_blocked`. Para `429`/`5xx`, leer
  estado/idempotencia antes de repetir un submit billable.
- OpenAI indica que los datos API no se usan para entrenamiento salvo opt-in explícito.
- Por defecto, `/v1/images/generations` y `/v1/images/edits` pueden conservar abuse-monitoring logs hasta 30 días,
  no mantienen application state y son elegibles para ZDR con aprobación y limitaciones.
- OpenAI declara ZDR compatible para `gpt-image-2`, 1.5, 1 y 1-mini. Los inputs de imagen se escanean para CSAM;
  un posible positivo puede retenerse para revisión manual incluso bajo ZDR/MAM/Eyes Off.
- Image storage/data residency regional requiere leer la tabla vigente y, en varias regiones, aprobación enhanced
  ZDR/MAM. No asumir residencia desde la ubicación de Globe.
- El Content Provenance API (`POST /v1/content_provenance_checks`) puede verificar C2PA y SynthID soportados. Un
  `not_detected` no demuestra que la imagen sea humana ni descarta metadata removida, transformaciones o modelos
  legacy. La verificación de provenance complementa, pero no reemplaza, el lineage interno de Globe.

## Mapeo contra Greenhouse y Globe

| Capa | Estado observado 2026-08-21 | Consecuencia |
|---|---|---|
| OpenAI | transparencia GPT Image 2 en preview | provider-supported |
| Greenhouse helper | conserva GPT Image 2 y rechaza JPEG transparente antes de red | implementado local; aceptar el asset sigue exigiendo QA alfa |
| Greenhouse CLI | conserva el modelo exacto y no activa fallback a 1.5 | canary local facturable aprobado 2026-08-21: `gpt-image-2`, PNG 1024×1024, `quality=low`, `background=transparent`, canal alfa y 470.164 píxeles totalmente transparentes; no demuestra el runtime Globe |
| Greenhouse helper singular | fija `n=1` y rechaza `numberOfImages != 1` | evita pagar outputs que el contrato singular descartaría |
| Greenhouse Responses helper | rechaza `partialImages > 0` mientras no exista parser SSE | no promete parciales desde un camino no streaming |
| Globe `ImageOutputShapeV1` | `backgroundMode` aditivo, default canónico por ruta | implementado local; snapshots legacy leen `auto` |
| Globe OpenAI adapter | compila `transparent` sólo para GPT Image 2 y mantiene PNG | implementado local; 1.5 falla antes de red |
| Globe result driver | decodifica bytes y exige alfa + píxel no opaco | implementado local; canary/runtime pendiente |
| Globe ruta `ref/still/openai-v2` | generación prompt-only con `auto | opaque | transparent`; edit deferred | implementado local; promoción/canary pendientes |

### Contrato local implementado para transparencia en Globe

La implementación mantiene `backgroundMode` dentro de `OutputShapeV1`/constraints, no como control creativo:

```text
backgroundMode: opaque | transparent | auto
```

La ruta declara compatibilidad por modelo, la mapea al provider request, retiene el valor resuelto y valida bytes,
canal alfa y píxel no opaco. El runtime de Globe mantiene PNG; WebP no se anuncia todavía. La promoción requiere
canary propio sobre fondo claro/oscuro y no hereda evidencia del PNG histórico con fondo no especificado.

## Contradicciones y preguntas abiertas

1. Las fichas de modelo dicen que streaming no está soportado; la guía y endpoints sí lo documentan.
2. El párrafo introductorio del endpoint de edits omite GPT Image 2, pero el enum y los ejemplos lo incluyen.
3. El borde 3840 aparece como `< 3840` en prompting y `<= 3840` en la guía/API actual.
4. La transparencia de GPT Image 2 está en preview. No hay garantía de estabilidad ni equivalencia con una ruta
   productiva hasta un canary que inspeccione alfa real.
5. Responses API no expone identidad elegible del GPT Image subyacente; no sirve como evidencia de modelo exacto.

Cuando fuentes oficiales discrepan, se conserva la contradicción y se valida el endpoint concreto con un probe
controlado antes de cambiar el contrato.

## Fuentes oficiales

Todas fueron consultadas el 2026-08-21:

- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Create image](https://developers.openai.com/api/reference/resources/images/methods/generate)
- [Create image edit](https://developers.openai.com/api/reference/resources/images/methods/edit)
- [GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2)
- [GPT Image 1.5](https://developers.openai.com/api/docs/models/gpt-image-1.5)
- [GPT Image 1](https://developers.openai.com/api/docs/models/gpt-image-1)
- [GPT Image 1 Mini](https://developers.openai.com/api/docs/models/gpt-image-1-mini)
- [chatgpt-image-latest](https://developers.openai.com/api/docs/models/chatgpt-image-latest)
- [Pricing](https://developers.openai.com/api/docs/pricing)
- [Deprecations](https://developers.openai.com/api/docs/deprecations)
- [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Content provenance](https://developers.openai.com/api/docs/guides/content-provenance)
