# Efeonce Globe — Catálogo gobernado de rutas del Creative Producer

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.4
> **Creado:** 2026-07-20 por Claude (TASK-1500)
> **Ultima actualizacion:** 2026-08-02 (TASK-1633 — contrato creativo route-driven en implementación)
> **Documentacion tecnica:** [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)

## Qué es y para qué sirve

El **catálogo de rutas** es la fuente de verdad de *"qué puede hacer cada ruta creativa"* de Efeonce Globe. Por cada ruta declara: qué capacidad sirve (imagen, video o audio), qué formas de salida admite con sus límites (resoluciones, duración mínima y máxima, cantidad de imágenes por lote, formatos de audio), qué especialidades tiene (multi-hablante, etiquetas de emoción, HD, idiomas), si puede emitir audio, qué modos de entrada acepta (prompt, referencia, frames, etc.) y **cómo se nombra**.

Ese "cómo se nombra" tiene tres capas separadas a propósito:

- **El modelo** (nombre + versión, por ejemplo "Seedance" · "2.0") — **es público, lo ve el cliente.** Mostrar el modelo real **añade valor**: un cliente enterprise sabe qué modelo da mejor calidad, así que ver "corre en Seedance 2.0" es una señal de calidad y un ancla de posicionamiento de la suite. La versión es una etiqueta libre y opcional (aguanta "2.0", "5 Pro", "Multilingual v2" o simplemente no aparecer).
- **La casa** (por ejemplo "Studio Still I") — es la **clasificación interna** de Efeonce para agrupar rutas. La ve solo el operador, no el cliente.
- **El identificador técnico del proveedor** (el *slug*: `bytedance/seedream/...`), **el costo del proveedor y el margen** — **no aparecen en el catálogo en absoluto**. El slug vive únicamente dentro del adaptador; el costo y el margen son lo confidencial del negocio. Un guard automático rompe la carga del catálogo si alguien intenta colar un slug.

> **Nota:** "Seedance 2.0" (nombre del modelo) **no** es lo mismo que `bytedance/seedance-2.0/text-to-video` (slug de ruteo). El primero es una marca legible que sí mostramos; el segundo es plomería interna que nunca sale.

## Por qué existe

Sin catálogo, la superficie del Producer tendría que adivinar qué opciones ofrecer (y ofrecería 30 segundos en un modelo que tope en 10), la validación del contrato de run (`TASK-1501`) no tendría contra qué rechazar **antes de gastar crédito**, y el estimador de costo (`TASK-1502`) no tendría la dimensión "ruta" (la unidad de crédito es `ruta × forma de salida`, nunca el modelo). Y no habría dónde vivir el modelo público que sirve de ancla de posicionamiento ni la casa interna de clasificación.

## Cómo se comporta

- **Es dato versionado, no código.** Agregar o ajustar una ruta es editar una lista de datos y subir su versión; el motor que la sirve no cambia. Los valores actuales son *seed* anclado a los motores verificados en vivo (video 3-10 s / 720p / 16:9 y 9:16; imagen en lotes de 1-4; audio mp3).
- **Se lee por dos lectores gobernados** (`listar` y `obtener una ruta`), protegidos por la capability `globe.producer.catalog.read`. La audiencia se resuelve en el servidor y **falla cerrada hacia el cliente**: el modelo (nombre + versión) viaja siempre; la **casa** solo viaja si quien pregunta tiene la autoridad de operador (`globe.producer.route.reveal_house`).
- **Una ruta desconocida es "no encontrada"**, sin pistas de si existe en otro lado.
- **Los mismos datos alimentan a los consumidores internos** (validación pre-gasto y estimador) por funciones directas en el proceso — nadie reconstruye los límites por su cuenta.
- **Las superficies nacen fail-closed.** La UI del Producer fue promovida al cerrar `TASK-1505`; MCP conserva su
  gate independiente. HTTP/SDK/CLI/worker/E2E siguen sus estados declarados en el capability registry.

## Operación, inputs y controles son ejes distintos

ADR-022 y TASK-1633 extienden cada revisión de ruta con un contrato creativo autocontenido. El objetivo es que
Producer, BFF, SDK, MCP, CLI, compiler y workers lean la misma semántica, sin matrices paralelas por modelo:

- `operation` dice qué intención ejecuta la ruta (`create`, `edit`, `extend`, `upscale`, etc.).
- `inputSlots` dice qué significa cada asset y conserva rol, media, cardinalidad y orden. Una referencia visual,
  first frame, edit source y motion source no son intercambiables aunque compartan MIME.
- `inputCombinations` declara conjuntos válidos, incluidos caminos prompt-only o condicionados por asset.
- `creativeControls` declara si cámara, estilo, movimiento, timing, audio u otro control se aplica como parámetro
  nativo, semántica de prompt, referencia, pre/postproceso o si no está soportado.
- `outputContract` declara modalidad, MIME y packaging real; un MP4 con audio embebido no se representa como dos
  outputs ficticios.

El adapter server-side sigue siendo el único lugar que conoce campos, endpoint o slug del proveedor. El browser
no concatena instrucciones vendor-specific ni infiere tareas por cantidad/tipo de archivos. Durante la migración,
`inputModes` y `referencePolicy` siguen disponibles para compatibilidad, pero una ruta nueva debe declarar el
contrato creativo y fallar antes del gasto ante contradicciones.

Estado honesto al 2026-08-02: el contrato y su threading están en WIP local sin commit/deploy. La UI route-driven,
el transporte Omni Vertex ADC y los canaries todavía no están operativos. Continuidad:
[`TASK-1633`](../../tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md) y
[`plan`](../../tasks/plans/TASK-1633-plan.md).

> Detalle técnico: tipos en `efeonce-globe/packages/contracts/src/producer-catalog.ts`; dato + guards + helpers + lectores en `efeonce-globe/packages/domain/src/producer-catalog.ts`; métodos SDK `listProducerRoutes` / `getProducerRoute`.

## Varios modelos por capacidad (multi-modelo, TASK-1553)

La dirección del negocio es **usar los mejores modelos del mercado e ir agregándolos, sin que uno reemplace a otro**. El catálogo lo permite tratando **cada modelo/tier como una ruta**. Hoy conviven y fueron ejercitados desde el Producer: Seedream 5 Pro, Nano Banana Pro, Nano Banana 2, GPT Image 2, GPT Image 1.5 y Recraft v4.1 Vector.

- **El modelo se elige por la ruta, no por la capacidad.** Antes, "generar imagen" resolvía a un único modelo fijo; ahora cada ruta resuelve a su propio modelo, así dos modelos del mismo proveedor (GPT Image 2 **y** 1.5; Nano Banana Pro **y** 2) pueden coexistir y elegirse. El nombre del modelo sigue siendo público (señal de calidad); el identificador de proveedor (el *slug*) nunca entra al catálogo.
- **Actualizar ≠ agregar.** *Actualizar* un modelo es subir su versión **dentro de la misma ruta** (reemplaza). *Agregar* un modelo/tier es una **ruta nueva** que coexiste con las demás. Nunca se cambia el proveedor/linaje de una ruta existente para "reusarla" como otro modelo — eso sería sustituir un modelo por otro a escondidas, y está prohibido.
- **Recomendado por defecto.** El catálogo puede declarar, por capacidad, una **ruta recomendada por defecto** (hoy, imagen → Seedream), para que quien no elija explícitamente conserve el comportamiento actual. La selección explícita sigue siendo el contrato principal; la forma del selector visible es trabajo de `TASK-1552`.
- **Disponible no significa sólo “aparece”.** La disponibilidad se deriva de readiness + binding por workspace. La
  prueba de salida de una promoción incluye una generación real desde la UI autenticada, no sólo tests o un probe
  directo al proveedor.

> Detalle técnico: decisión y contrato en [ADR-013 — Route-Based Model Resolution](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md). Resolución por-ruta en los adapters (`efeonce-globe/apps/creative-runner/src/{openai,vertex,fal}-adapter.ts`), política del composite por-ruta (`composite-adapter.ts`), rutas + `recommendedDefault` en `packages/domain/src/producer-catalog.ts`. Una ruta nueva es **inerte hasta promoverse** (readiness `promoted` + binding `enabled`).
