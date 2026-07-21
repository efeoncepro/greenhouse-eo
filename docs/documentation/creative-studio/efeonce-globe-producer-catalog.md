# Efeonce Globe — Catálogo gobernado de rutas del Creative Producer

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-07-20 por Claude (TASK-1500)
> **Ultima actualizacion:** 2026-07-20 por Claude (TASK-1500 — modelo público, casa interna)
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
- **Las superficies UI y MCP nacen apagadas** (`policy-blocked`) hasta el gate de la superficie del Producer (`TASK-1505`); las superficies internas (HTTP/SDK/CLI/worker/E2E) están disponibles.

> Detalle técnico: tipos en `efeonce-globe/packages/contracts/src/producer-catalog.ts`; dato + guards + helpers + lectores en `efeonce-globe/packages/domain/src/producer-catalog.ts`; métodos SDK `listProducerRoutes` / `getProducerRoute`.
