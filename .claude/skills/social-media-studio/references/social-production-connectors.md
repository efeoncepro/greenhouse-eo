# Producción social: conectores por operación

Inventario observado el **2026-09-12**. Leer el schema callable de la sesión antes de ejecutar; esto no es un
catálogo permanente, aprobación enterprise, precio ni promesa de disponibilidad. No es necesario instalar o usar
todas las herramientas para producir una pieza. El acceso a un conector no autoriza ampliar scopes ni publicar.

## Selección

| Necesidad | Ruta posible | Condición |
|---|---|---|
| Crear/editar imagen en esta conversación | motor nativo `image_gen` | seguir la skill `imagegen`; revisar el input local primero |
| Imagen/video por referencias, presets o producto | Higgsfield | discovery → schema → costo si aplica → input confirmado → job → lectura |
| Upscale de un plate insuficiente | Magnific | comparar nitidez/fidelidad; no usar para arreglar concepto ni tipografía |
| Geometría/material exactos y repetibles | mockup fotográfico o 3D disponible | arte oficial, superficie calibrada y material; no afirmar que existe herramienta 3D sin verificar |
| Texto editorial, firma gráfica, export | compositor determinístico | fuente y logo oficiales; fuera del último pase generativo |
| Producción gobernada del portal/Globe | skill del runtime | este workflow no cambia su allowlist, ledger o aprobación |

## Higgsfield: contrato observado

1. `models_recommend` o `models_search` obtiene IDs; `models_get` devuelve parámetros, enums, ratios y roles
   de media del modelo elegido. No reutilizar el antiguo `models_explore(action:...)` sin discovery.
2. `estimate_image_cost` / `estimate_video_cost` son preflight de lectura. `generate_image` y `generate_video`
   crean jobs; no usarlos para averiguar precios. Aplicar la autorización y el límite de producción del encargo.
3. Input local: leer `media_upload` y su confirmación vigentes. No pasar una ruta local como URL ni usar un
   attachment helper con un archivo que no sea un attachment del usuario. No asumir que existe
   `media_upload_widget`; nunca publicar un bucket como atajo de upload.
4. Guardar `job_id`/índice y consultar `jobs_wait` para estados terminales. `job_display` muestra una creación
   específica. Un job aceptado/en cola no es una imagen terminada. Respetar el mecanismo de vista/descarga del tool.
5. Releer el resultado antes de la siguiente operación. Un batch sólo paraleliza alternativas independientes;
   no una cadena donde el segundo paso depende de revisar el primero.

**Readback de esta sesión:** `models_recommend(input:image,type:image)` y
`models_get(model_id:gpt_image_2_5)` devolvieron referencia de imagen, variantes `flare|sunburst`,
ratios incluidos `9:16` y `4:5`, resoluciones `1k|2k|4k`. Es evidencia de catálogo, **no un smoke de generación**
ni autorización del runtime Globe. El MCP puede diferir de la web, CLI y API directa.

Para macros/presets, cargar instrucciones del preset real y comprobar si su ejecución está disponible.
No adoptar un efecto porque sea popular: debe ejecutar el mecanismo creativo y preservar el producto.

## Magnific: separar catálogo de generación y upscale

- El MCP observado expone `images_models_list`, `images_upscale`, `creations_wait` y `creations_show`.
- `images_models_list` es catálogo de texto-a-imagen; buscar «upscale» allí devolvió cero modelos en esta sesión.
  **Eso no prueba que falte upscale:** existe como herramienta separada.
- `images_upscale` acepta un `creationIdentifier` importado y `scale: 2x|4x`; no acepta en este schema los sliders
  de creatividad/HDR/resemblance. No inventar esos argumentos ni equiparar este tool a la API directa.
- La [documentación de la API Creative](https://docs.magnific.com/api-reference/image-upscaler-creative/image-upscaler)
  describe ampliación con detalle generativo y controles de fidelidad/creatividad. Es otra superficie: verificar
  acceso y contrato antes de usarla. No abrir una integración nueva sólo para imitar una receta.
- Para importar y renderizar, descubrir las herramientas actuales y seguir sus instrucciones. Guardar
  identificador, leer estado terminal y mostrar con `creations_show` cuando el conector lo requiera.

Regla de aplicación: ampliar **antes** de añadir texto y firma editorial exactos. Si el plate ya contiene
marca física, revisarla después del upscale; rechazar cualquier cambio de silueta, letras, proporción o acabado. Comparar crops 100% de cara/manos/producto,
bordes, materiales y detalles culturales; más nitidez puede ser invención. Si el plate ya alcanza la resolución
de destino, omitir upscale. `images_resize` o Sharp ajustan píxeles; no recuperan detalle ausente.

## Motor nativo de imagen

Usar la herramienta disponible de la sesión y la skill `imagegen`; no prometer un ID/version de modelo que la
herramienta no exponga. Input con roles y locks explícitos, imagen local inspeccionada, output revisado antes de
editar. Para exactitud: escena sin lettering → corrección localizada si hace falta → composición con fuente/logo
reales. Para logos físicos, insertar antes el pase descrito en [brand-in-scene.md](brand-in-scene.md):
escena + arte oficial como referencias, materialización y revisión de identidad. No requiere pasar por Higgsfield ni simular créditos o un ledger de Globe.

## Handoff entre manos

Cada operación declara: `input + rol`, `delta único`, `locks`, `herramienta/modelo expuesto`, `parámetros`,
`salida/ID/hash`, `costo observado o no disponible`, `crítica`, `keep/retry/reject`.
No descargar media para eludir restricciones de visualización; usar primero la salida nativa o archivo permitido.
Nunca enviar el master ya tipografiado a un enhancer que vuelva probabilísticos sus textos o marcas.

Si el conector falla, distinguir `no expuesto`, `sin sesión`, `input incompatible`, `job failed` y
`resultado aún pendiente`. Continuar con una ruta autorizada equivalente cuando exista, informando el cambio;
no afirmar que se probó una mano que sólo fue investigada.


## Contrato de entrada por operación

Estos campos son un registro de producción del agente, **no argumentos nuevos de las APIs**. Traducirlos sólo
a parámetros admitidos; cuando el schema no exponga un control, describir la intención en prompt si corresponde
y reconocer que no equivale a una máscara, lock geométrico o garantía técnica.

| Campo del registro | Contenido obligatorio |
|---|---|
| `purpose` | defecto concreto o resultado que falta; no «mejorar» sin criterio |
| `inputs` | ruta/ID permitido, versión y rol de cada referencia |
| `reference_roles` | `identity`, `structure`, `material`, `cultural_context`, `anti_reference` según necesidad |
| `precedence` | identidad oficial prevalece en forma; estructura en posición; material sólo en acabado |
| `locks` | elementos que deben conservarse y cómo se comprobarán |
| `delta` | cambio principal solicitado y región/tiempo afectados |
| `output_contract` | formato, dimensiones/duración admitidas, contenido exacto reservado al compositor |
| `acceptance` | pruebas visuales/técnicas concretas y fallos que hacen rechazar el resultado |
| `execution` | herramienta y modelo expuestos, parámetros realmente enviados, job/resultado, costo conocido o no disponible |
| `review` | cambios observados, fallos restantes y decisión `keep | retry | reject | switch_route` |

No asumir que nombres como `identity` son enums válidos de un proveedor. No inventar IDs de máscara, seed,
control de cámara, creatividad, profundidad, tipografía o preservación de identidad.

### Preflight y autoridad sin bloqueos artificiales

1. Descubrir tools disponibles, leer schema y skill aplicable. Reutilizar descubrimiento de esta sesión si no
   cambió la operación; no consultar catálogos por ritual en cada pase.
2. Verificar que las referencias pueden entrar por la vía admitida. No publicar archivos ni ampliar permisos
   para convertir una ruta local en URL. Un upload autorizado no equivale a publicar la pieza en redes.
3. Si hay estimador y costo relevante, consultarlo; registrar costo no disponible cuando la superficie no lo
   exponga. No inventar precio cero. Respetar límite existente y no añadir presupuesto por inferencia.
4. Ejecutar dentro de la autorización del encargo. No pedir nuevamente autorización para correcciones ya
   incluidas. Compra nueva, ampliación de presupuesto o consentimiento requerido por el tool sí necesitan su
   autorización específica. No simular reserva/settlement de Globe en un encargo local.
5. Esperar mediante el contrato del tool, inspeccionar el output y guardar lineage antes del siguiente pase.
   Un estado `completed` prueba ejecución, no calidad. Un catálogo que enumera una capacidad no la prueba.

### Qué evidencia permite afirmar cada estado

- **Investigado:** fuente o schema leído, fecha y superficie identificadas.
- **Disponible en sesión:** tool callable localizado; no prueba acceso a cada modelo ni gasto habilitado.
- **Ejecutado:** respuesta terminal y output/ID recuperados.
- **Revisado técnicamente:** dimensiones/archivo y checks relevantes verificados.
- **Revisado visualmente:** inspección real de escena y detalles, con fallos anotados.
- **Aprobado por persona:** decisión explícita identificable; nunca inferida del silencio ni de checks verdes.
- **Publicado:** readback en destino; no se deduce de upload, programación ni export.

### Relevo imagen → video con producto

Entregar el anchor aceptado y el arte oficial por roles admitidos, acción/cámara y zonas de texto. Revisar
producto y marca al inicio, durante oclusión/movimiento y al final. Si la marca se transforma entre frames,
reparar la toma o usar una ruta con control temporal; un frame correcto no certifica el clip. Titulares,
subtítulos y end card exactos se componen después. Si sólo falta duración, orden o cierre, editar en lugar de
regenerar. Documentar qué toma o píxel ausente justifica cada generación adicional.
