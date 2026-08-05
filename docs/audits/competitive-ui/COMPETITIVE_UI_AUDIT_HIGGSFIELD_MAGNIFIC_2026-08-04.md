# Auditoría comparativa de UI — Higgsfield y Magnific

> **Tipo:** benchmark competitivo de producto y UI
> **Fecha de observación:** 2026-08-04 (America/Santiago)
> **Superficies:** generación de imágenes, vídeo y audio; selección de modelos; referencias; historial, biblioteca y revisión de assets
> **Evidencia:** [capturas de la sesión autenticada](./evidence/2026-08-04/)
> **Síntesis contra Globe:** [benchmark comparativo del 2026-08-05](./GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md)

## Resumen ejecutivo

Higgsfield y Magnific resuelven la experiencia como un sistema de tres capas:

1. **Composer por modalidad:** cada superficie expone controles propios para imagen, vídeo o audio.
2. **Catálogo de modelos y referencias:** el usuario puede elegir capacidad, proveedor, formato y entradas antes de escribir o enviar el prompt.
3. **Asset como producto:** el resultado no termina en la generación; tiene historial, metadata, reproducción, herramientas, comentarios, recreación, referencia, descarga, biblioteca y estados de derechos.

La oportunidad más inmediata para Globe no es ampliar el catálogo de modelos. Es cerrar la paridad de interacción y de estado: que cada control visible ejecute su contrato, que el composer exponga el contrato creativo real de la ruta, y que un asset tenga un viewer completo con lineage, metadata y acciones confiables.

## Alcance y método

La revisión se realizó en las pestañas de Chrome que ya estaban abiertas y autenticadas por el operador. No se creó un perfil, ventana ni sesión nueva. Se navegó directamente por las superficies visibles de ambos productos y se capturaron los estados relevantes.

No se pulsó **Generar**, no se subieron archivos, no se crearon assets de pago y no se descargaron resultados. Se documentó el flujo de preparación y se revisaron assets existentes, incluido un asset de vídeo en el viewer de Higgsfield y estados de selección en Magnific. Por tanto, la auditoría describe con alta confianza la UI y el modelo mental observado, pero no valida la ejecución end-to-end de una generación nueva.

## 1. Higgsfield

### 1.1 Imagen

Ruta observada: `higgsfield.ai/ai/image?model=nano-banana-pro`.

- El composer es compacto y persistente en la parte inferior: prompt, modelo, relación de aspecto, calidad, cantidad, modo Unlimited, Draw y CTA de generación.
- La CTA comunica coste/capacidad directamente (`Generate 2` en la sesión observada), en vez de esconderlo detrás de un paso posterior.
- El selector de modelo es un catálogo amplio con nombre, badges y descripciones. Incluía Soul 2.0, Soul Cinema, GPT Image 2, Seedream 5, Nano Banana Pro/2, Recraft, Flux, Kling, Grok, Z-Image, Multi Reference y WAN, entre otros.
- La abundancia del catálogo ayuda a descubrir capacidades, pero también aumenta el riesgo de que el usuario elija por nombre sin entender latencia, calidad, coste o compatibilidad.

Evidencia: [composer](./evidence/2026-08-04/higgsfield-image-compose.png) · [selector de modelos](./evidence/2026-08-04/higgsfield-image-model-selector.png).

### 1.2 Vídeo

Ruta observada: `higgsfield.ai/ai/video`.

- El composer separa `Create Video`, `Edit Video` y `Motion Control`.
- En `Create Video`, la entrada de modelo aparece como una tarjeta visual (`General / Gemini Omni`) con acción `Change`.
- La composición distingue `Elements` y `Frames`. En `Frames` aparecen `Start frame` y `End frame`, con el segundo marcado como opcional.
- El prompt, modelo (`Gemini Omni Flash`), duración (`8s`), relación (`16:9`) y coste (`Generate 24`) se leen en el mismo panel.
- `History` y `How it works` son modos explícitos del área de resultados. `How it works` explica el flujo en pasos y presenta presets de cámara, framing y VFX.
- El historial se agrupa por fecha y muestra una grilla de resultados. También aparecen estados de gobernanza como `Rights verification required`, no sólo thumbnails exitosos.

Evidencia: [composer e historial](./evidence/2026-08-04/higgsfield-video-history.png) · [composer](./evidence/2026-08-04/higgsfield-video-compose.png).

### 1.3 Revisión de un asset de vídeo

El viewer `Asset showcase` es la superficie más madura observada en Higgsfield:

- reproductor con pausa, velocidad, mute, volumen, timecode, barra de progreso, comentario sobre el tiempo y fullscreen;
- pestañas `Info`, `Tools` y `Comments`;
- `Info` con prompt copiable, inputs de referencia, detalles de modelo, calidad, tamaño y fecha;
- acciones `Recreate`, `Reference`, `Download`, `Like`, compartir y menú de más acciones;
- `Tools` con `Edit video`, `Reframe`, `Upscale`, `Remove Background` y `Change scene & lighting`;
- `Comments` con comentario sin timestamp, comentario asociado a un rango temporal, dibujo y emojis.

Este patrón convierte la revisión en una etapa de trabajo, no en un modal pasivo. El usuario puede entender el origen, modificar el resultado y reutilizarlo sin volver a empezar desde cero.

Evidencia: [viewer](./evidence/2026-08-04/higgsfield-video-asset-viewer.png) · [Info](./evidence/2026-08-04/higgsfield-video-asset-info.png) · [Tools](./evidence/2026-08-04/higgsfield-video-asset-tools.png).

### 1.4 Audio

Ruta observada: `higgsfield.ai/audio`.

- La navegación separa `Voiceover`, `Change Voice` y `Translate`.
- El workspace muestra proyectos y generaciones existentes con waveform, texto truncado, preset de voz y duración.
- El composer expone un prompt de audio, modelo (`Eleven v3`) y preset de voz (`NExa`).
- El menú de modelos explica diferencias de capacidad: multi-speaker y ambiente, tags de emoción/delivery, idiomas, narración larga y traducción.
- La CTA aparece deshabilitada mientras faltan entradas, pero el layout deja visible la intención de generar.

Evidencia: [composer y biblioteca](./evidence/2026-08-04/higgsfield-audio-compose.png) · [selector de modelos](./evidence/2026-08-04/higgsfield-audio-model-selector.png).

## 2. Magnific

### 2.1 Shell y descubrimiento

Magnific usa un shell claro y persistente con rail de `Crear`, `Inicio`, `Buscar`, `Stock`, `Explorar`, `Proyectos` y `Biblioteca`. La sección de herramientas agrupa explícitamente `Spaces`, `Generar imágenes`, `Generar vídeos`, `Texto a voz`, `Designer`, `Escenas 3D` y `Stock`.

El inicio funciona como lanzador de modalidades y como superficie de biblioteca. La separación entre herramienta, proyecto y asset reduce la ambigüedad de dónde continuar un trabajo.

### 2.2 Imagen

Ruta observada: `/es/app/ai-image-generator`.

- El composer muestra el modelo (`Auto`), cantidad de referencias (`0/8`) y slots semánticos (`Estilo`, `Personaje`, `Añadir`).
- El prompt admite referencias por mención (`@`) y `Prompt con IA` tiene un toggle explícito.
- Cantidad de outputs, relación de aspecto y modo ilimitado están junto a la CTA. `Generar` permanece deshabilitado cuando faltan entradas.
- El selector de modelos ofrece búsqueda, proveedor, categorías y señales de tiempo/coste/resolución. Ejemplos observados: `Auto` con referencias y ~5 s; `GPT 2` con 2K–4K, ~1 m 11 s y rango de coste; `Google Nano Banana 2 Lite` y `Seedream 5 Pro` con sus tiempos y resoluciones.
- El panel de referencias tiene una taxonomía operativa: `Historial`, `Subidas`, `Todas las referencias`, `Stock`, `Estilo`, `Personaje`, `Elemento`, `Localización`, `Color`, `Efectos`, `Cámara` y `Dibujo`. Incluye búsqueda, `+ Crear`, drop zone, upload y `Tomar foto`.
- La biblioteca de referencias tiene una vista específica de personajes con `Biblioteca / Por Magnific`, filtros `Todo / Privado / Compartido` y búsqueda.

Evidencia: [composer](./evidence/2026-08-04/magnific-image-compose.png) · [modelos](./evidence/2026-08-04/magnific-image-model-selector.png) · [referencias](./evidence/2026-08-04/magnific-image-references.png) · [personajes](./evidence/2026-08-04/magnific-reference-characters.png).

### 2.3 Vídeo

Ruta observada: `/es/app/ai-video-generator`.

- El composer cambia las referencias a slots propios de vídeo: `Imagen inicial` e `Imagen final`.
- `Añadir contenido` permite incorporar entradas adicionales; `Plano` ofrece modo `+` y `Manual`.
- El prompt documenta el modelo de interacción: referencias por `@img1`, `@vid1`, etc., con contador `0/1999`.
- Duración (`5–6"`), relación (`16:9`) y audio están expuestos sin abrir un submenú.
- El selector de modelos muestra capacidades, proveedor, resolución, audio y rangos de coste. Se observaron `Auto`, MiniMax H3, Seedance 2.0 Fast, Seedance 2.0, Kling 3.0 y Kling 3.0 Omni, además de filtros de proveedor, función, resolución y un switch de varios.
- El selector comunica una diferencia importante entre modelos: Start/End, Multi, referencias de audio, resolución y coste no son capacidades genéricas del composer; son propiedades del modelo elegido.
- El panel de referencias mantiene el mismo patrón de historial, subidas, stock y drop zone.

Evidencia: [composer](./evidence/2026-08-04/magnific-video-compose.png) · [modelos y capacidades](./evidence/2026-08-04/magnific-video-model-selector.png) · [referencias](./evidence/2026-08-04/magnific-video-references.png).

### 2.4 Audio

Ruta observada: `/es/app/voiceover-generator`.

- La herramienta es `Texto a voz`, con modelo, voces, script y parámetros de salida.
- El modelo seleccionado (`ElevenLabs v3`) explica que admite tags de audio. El script documenta ejemplos como `[risas]` y `[pausa 0,5s]` y tiene contador `0/5000`.
- Hay dos voces de interlocutor, tono (`Neutro`), intensidad (`20%`), formato (`MP3`), sample rate (`44.1 kHz`), bitrate (`128 kbps`), pronunciación y streaming.
- El selector incluía `ElevenLabs v3`, `ElevenLabs v2`, Gemini Flash TTS Voice Replication y `Seed Audio 1.0 Experimental`.
- En la sesión apareció un defecto de localization: una opción expuso la clave interna `audio.models.geminiV31FlashTtsVoiceReplication.name` y su descripción, en vez de copy de producto.
- La biblioteca permite seleccionar un asset existente y muestra una barra contextual `1 seleccionado` con `Descargar` y otras acciones. La selección es reversible y no consume créditos.

Evidencia: [composer](./evidence/2026-08-04/magnific-audio-compose.png) · [selector](./evidence/2026-08-04/magnific-audio-model-selector.png) · [estado seleccionado](./evidence/2026-08-04/magnific-audio-selected.png).

### 2.5 Revisión de assets en biblioteca

En la biblioteca de imagen se observaron cards con prompt, relación, modelo, modo de razonamiento y resolución. Cada card expone acciones de `Seleccionar elemento`, `Más opciones`, `Eliminar`, `Descargar`, `Me gusta`, `Editar`, `Guardar en la biblioteca` y `Recrear`.

La combinación de metadatos resumidos en la card, selección múltiple y barra contextual permite revisar una colección rápidamente. El viewer detallado puede quedar reservado para acciones de edición o para inspeccionar lineage.

Evidencia: [biblioteca y selección](./evidence/2026-08-04/magnific-image-generator.png) · [estado de assets](./evidence/2026-08-04/magnific-image-assets.png).

## 3. Patrones comparados

| Patrón | Higgsfield | Magnific | Implicación para Globe |
|---|---|---|---|
| Composer por modalidad | Sí, con rutas Image/Video/Audio | Sí, con herramientas separadas | El composer genérico debe delegar en controles nativos de la ruta. |
| Selección de modelo | Catálogo visual y amplio | Búsqueda, proveedor, capacidades, tiempo, coste y resolución | El nombre del modelo no basta; el selector debe explicar la decisión. |
| Referencias | Frames, inputs y acciones Reference/Recreate | Slots semánticos, historial, stock y upload | Las referencias deben tener roles, lineage y compatibilidad explícita. |
| CTA y coste | Coste visible en la CTA | Coste/rango visible en el selector | El usuario debe poder confirmar antes de consumir créditos. |
| Historial | Por fecha, grilla y estados de derechos | Creaciones, proyectos y biblioteca | El output debe conservar estados terminales, derechos y retención. |
| Viewer | Info/Tools/Comments, player y timecode | Cards accionables y selección múltiple | Globe necesita una superficie MediaStage común y completa. |
| Reutilización | Recreate y Reference | Recreate, Edit, Library y selección | Las acciones deben ser reales, zero-spend cuando corresponda y conservar origen. |
| Ayuda | `How it works` contextual | Taxonomía visible y affordances de cada herramienta | El producto debe enseñar el flujo dentro de la tarea. |

## 4. Qué adoptar, adaptar y descartar

### Adoptar

- Composers específicos para imagen, vídeo y audio, con defaults y validaciones propios.
- Selector de modelos con búsqueda, proveedor, capacidades compatibles, resolución, latencia orientativa y coste.
- Slots de referencia semánticos (`Estilo`, `Personaje`, `Start`, `End`, `Audio`, etc.) y panel con historial, subidas, stock y biblioteca.
- Viewer de asset con reproducción, metadata, prompt copiable, inputs, lineage, comentarios, herramientas y acciones de reutilización.
- Historial por fecha/proyecto y estados visibles de procesamiento, rights verification, fallo y retención.
- Ayuda contextual de tipo `How it works`, especialmente para vídeo y controles de cámara.
- Waveform, duración, voz, formato y parámetros de exportación como metadata de primera clase en audio.

### Adaptar a Globe

- Convertir `creativeContract` en un contrato visible del composer: controles, referencias, negative prompt, evidencia y parámetros deben venir de la ruta y del modelo, no de un formulario genérico.
- Hacer que `Reference` y `Recreate` sean operaciones de lineage zero-spend; una generación nueva debe ser una decisión separada.
- Mostrar antes de generar: route/model identity, capacidad, coste estimado, input requerido, duración/resolución, retención y estado de derechos.
- Construir una taxonomía de referencias orientada a los contratos de Globe, sin copiar categorías que no tengan semántica real en la ruta.
- Unificar Info/Tools/Comments en un `MediaStage`, pero mantener herramientas condicionadas por modalidad y capabilities.
- Mantener acciones rápidas en cards y reservar el viewer para revisión profunda, especialmente en feeds densos.

### Descartar

- Catálogos extensos donde el usuario sólo puede diferenciar modelos por nombre.
- Rangos numéricos sin unidad, significado o vínculo con la cuenta/plan.
- CTA deshabilitada sin explicar qué falta, cuánto cuesta o qué input desbloquea la acción.
- Anuncios que compiten visualmente con el composer y el CTA principal.
- Copiar un catálogo de proveedores sin una matriz de capacidades y límites verificable.
- Cualquier control visualmente presente que no ejecute su acción; en Globe esto es especialmente importante para `Reference`, `Recreate`, `Favorite` y `Download` del feed.
- Claves de localization visibles en producto; la incidencia de Gemini TTS en Magnific debe quedar como contraejemplo de QA.

## 5. Backlog recomendado para Globe

| Prioridad | Entrega | Resultado verificable |
|---|---|---|
| P0 | Reparar las acciones del feed `Reference`, `Recreate`, `Favorite` y `Download`, y exponer el input obligatorio para rutas que lo requieren | Cada control visible tiene handler real, estado de éxito/error y evidencia browser; no hay no-op. Relacionado con TASK-1641. |
| P0 | Cablear `creativeContract` en el composer y declarar controles por ruta/modelo | La UI no ofrece campos o defaults que el adapter ignora; negative prompt y controles de evidencia tienen dueño explícito. Relacionado con TASK-1633. |
| P1 | Entregar `MediaStage` para imagen, vídeo y audio | Info/Tools/Comments, metadata, prompt, inputs, lineage, reproducción/timecode y acciones condicionadas por capability. |
| P1 | Implementar referencias y recreación zero-spend | `Reference`/`Recreate` prellenan el composer, conservan `sourceAssetId` y no crean un job hasta que el usuario confirma. |
| P1 | Mejorar el model picker | Search, proveedor, capacidades, compatibilidad, coste, latencia, resolución, audio y restricciones por cuenta/ruta. |
| P1 | Completar biblioteca e historial | Grid/list, proyectos, fecha, filtros, estados terminales, derechos, retención, selección múltiple y acciones confiables. |
| P2 | Añadir audio de primera clase | Waveform, script/tags, voz, pronunciación, formato, timecode y revisión de asset. |
| P2 | Añadir ayuda y estados de tarea | `How it works`, empty/loading/error, motivos de CTA disabled y recuperación segura sin duplicar jobs. |

## 6. Hallazgos técnicos de la sesión

- Higgsfield fue estable para la navegación observada. Los errores de consola fueron mensajes de extensión Chrome sobre respuestas asíncronas cerradas.
- Magnific mostró fallos de carga de algunos iconos externos, un `404` del icono de Google y fallback de WebSocket a polling. No bloquearon la exploración, pero justifican un guard de assets externos y telemetría de conexión.
- Magnific expuso una clave interna de localization en el selector de audio. Debe agregarse una prueba de render con fallback y una revisión visual de todos los nombres de modelos.
- En ambos productos el estado deshabilitado del CTA es útil como señal, pero puede mejorar si explica la condición faltante o el impacto de coste.

## 7. Confianza y límites

**Confianza alta** para los layouts, labels, affordances y flujos visibles en las cuentas autenticadas durante la sesión. Los nombres, modelos, precios, tiempos, orden de catálogo y disponibilidad pueden variar por plan, región, fecha o rollout.

No se evaluaron calidad de outputs, tiempos reales de generación, cobro, upload, descarga efectiva ni recuperación de un job fallido. Esas áreas requieren una prueba separada con prompt, archivos y presupuesto confirmados por el operador.

## Cierre y handoff

**Documentation closure:** Updated: esta auditoría y 21 capturas en `docs/audits/competitive-ui/evidence/2026-08-04/`. Checked/no update needed: `project_context.md`, `Handoff.md` y `changelog.md`; el artefacto es un benchmark standalone y no cambia el runtime. Required but pending: asignar owners/tareas para las prioridades P0–P2 y decidir cualquier ADR de plataforma UI, contratos creativos o lineage. Verification: `pnpm docs:closure-check` y `git diff --check`. Closure state: **complete for research; implementation pending**.
