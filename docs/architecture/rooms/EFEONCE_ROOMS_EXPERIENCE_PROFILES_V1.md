# Rooms — perfiles de experiencia creativa y SEO/AEO V1

Fecha: 2026-10-07. **Alcance de producto confirmado por el operador; contratos y renderers propuestos, sin implementación.** Owner: Product / Commercial con Creative y SEO/AEO. [ADR](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) · [API](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md) · [EPIC-052](../../epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md).

## 1. Una plataforma, experiencias según lo que se vende

Rooms permite experimentar una capacidad antes de comprarla. La primera experiencia que se materializa es la producción creativa; **SEO/AEO es el segundo perfil de primera clase del alcance V1**, no una futura galería de PDFs. Una sala puede combinar ambos en una propuesta integral. El orden de construcción no limita el modelo de producto.

El núcleo compartido es sala, contexto comercial, inventario, relato, evidencia, edición, acceso, tours, consola del champion, evaluación y próximos pasos. Cada perfil aporta bloques, formas de inspección, validaciones y plantillas de recorrido. Son composiciones del mismo sistema, sin fork por cliente ni aplicaciones separadas. No se requiere construir un marketplace de plugins.

| Perfil | Lo que necesita evaluar el comprador | Instrumentos de demostración |
|---|---|---|
| Producción creativa | Idea, método, calidad y ejecución en los soportes reales | Stage multimedia, adaptaciones, piezas largas, mockups, comparación y fundamentos |
| SEO/AEO | Oportunidad, criterio, ejecución editorial/técnica y forma de medir/operar | Evidencia de diagnóstico, lectura de artículo/landing, radiografía acoplada, linaje de derivados, plan y medición |
| Sala combinada | Cómo una misma solución conecta oportunidad, contenido y activación | Bloques de ambos perfiles dentro de la misma edición/tour y con referencias comunes |

Las plantillas son puntos de partida editables. No se obliga a incluir cada bloque ni se pierde inventario por usar un tour breve. Los requisitos se validan según el alcance declarado de esa propuesta.

## 2. Recorrido SEO/AEO

Secuencia sugerida: **oportunidad → demostración → radiografía → distribución → plan de trabajo y medición → decisión**. Se puede comenzar por la muestra o por un hallazgo. No se impone una dinámica de preguntas y respuestas.

1. **Oportunidad:** un hallazgo verificable, su relevancia y el ámbito del diagnóstico. Puede abrir evidencia de demanda, búsqueda, competencia o visibilidad en IA con fuentes y fecha. No exige un score ni una cifra cuando no existen.
2. **Demostración:** leer una landing o artículo completo, con su identidad y a ancho útil. El comprador experimenta el entregable; la capa técnica no reduce permanentemente su espacio de lectura. Una propuesta de SEO técnico puede demostrar un hallazgo y su intervención sin inventar un artículo de muestra.
3. **Radiografía:** seleccionar un bloque editorial y ver la decisión, metadata/schema de ejemplo, evidencia y relación que le corresponden. Desktop admite contenido e instrumento vinculados; móvil abre un panel legible y devuelve al bloque. La dirección y el significado sobreviven sin animación.
4. **Distribución:** ver cómo una idea se convierte en derivados reales, con vínculo de regreso al fragmento de origen. Usa los mismos visores creativos para imagen, audio y video. Los derivados ausentes no se generan al importar.
5. **Plan y medición:** prioridades, entregables, fases, dependencias del cliente, responsabilidades y definición de éxito. La propuesta puede incluir baseline, indicadores, fuente y cadencia de medición; las incógnitas permanecen visibles. No equivale a un dashboard de operación continua.
6. **Decisión:** alcance propuesto, documentos técnicos/económicos autorizados y siguiente paso. Cuando existe caso de negocio, mostrar supuestos y sensibilidad desde un modelo versionado. Rooms no calcula un ROI por defecto ni genera precios.

El champion puede recorrer este relato, abrir el hallazgo o fragmento técnico ante una pregunta y volver a la misma escena, selección y posición. El evaluador accede al mismo material por su cuenta después de la reunión. La radiografía también tiene utilidad educativa sin oportunidad comercial abierta.

## 3. Modelo de contenido propuesto

Un `ContentBlock` tipado y versionado es la unidad de composición; `Piece/Variant` conserva su especialización multimedia. Los nombres siguientes son candidatos de contrato, no exports ni endpoints existentes:

| Tipo de bloque | Datos y comportamiento requeridos |
|---|---|
| `media` | Referencias a piezas/variantes/derivados y visores existentes |
| `editorial` | Árbol estructurado de artículo/landing, IDs estables por fragmento, identidad cliente y assets autorizados; sin HTML/JS arbitrario |
| `diagnostic` | Hallazgo, ámbito, severidad si aplica, fuente, observación y acción propuesta; filtro por ámbito sin cambiar el snapshot |
| `xray` | Relaciones tipadas entre fragmento editorial/hallazgo, decisión técnica y evidencia; navegación bidireccional y anclas estables |
| `lineage` | Origen y derivados reales; indica relación editorial, no prueba de publicación o rendimiento |
| `plan` | Prioridades/fases, entregables, dependencias, roles y definición de medición |
| `scenario` | Modelo aprobado para la propuesta, versión de fórmula, unidades, inputs/supuestos, límites y resultados; recalcular solo sobre función declarada y acotada, nunca código cargado por el usuario |

`EvidenceSnapshot` registra fuente/referencia autorizada, entidad/dominio, mercado/idioma cuando corresponda, fecha/período, método/versión, unidad, cobertura y limitaciones. Una observación de buscador añade consulta y motor; una observación de IA añade modelo/configuración disponibles, run y captura/resultado. Campos no aplicables se justifican; datos desconocidos no se rellenan por inferencia.

Cada claim diferencia **observación, declaración atribuida, hipótesis, simulación y propuesta**. El estado de ejecución distingue **propuesto, implementado en muestra, verificado en sitio y medido**, con ámbito explícito. Una simulación de respuesta IA nunca se presenta como captura real. Una comparación antes/después identifica si la segunda vista es propuesta o resultado verificado.

La edición congela bloques, relaciones, evidencias y modelo de escenario. Interactuar con filtros o supuestos no sobrescribe la edición; guardar un escenario requiere command autorizado y revisión. Actualizar una fuente produce revisión y luego nueva edición explícita. Las URLs de origen son referencias de procedencia, no una dependencia de red durante la presentación.

## 4. AEO X-ray: continuidad y frontera

El [AEO X-ray existente](../../think/radiografia-aeo-architecture.md) es una capacidad de demostración, no solo un diagnóstico. Rooms adopta sus trabajos: **La oportunidad, La pieza, La radiografía y Dónde más vive**, incluyendo lectura completa, acoplamiento y linaje. El [dossier X-ray](../../think/aeo-xray-implementation-dossier-2026-09-30.md) permite revisar lo ya resuelto antes de implementar.

- El objetivo V1 es un adapter de contenido/experiencia hacia bloques nativos de Rooms. Un enlace o iframe puede ser referencia transitoria explícita; **no acredita el perfil SEO/AEO completo**.
- R01 inventaría contrato/exportaciones realmente disponibles; R03/R07 crean el soporte común y especializado; R14 verifica el mapping de X-ray y sus pérdidas. Se preservan IDs de origen, revisión, fragmentos, fuentes, estado y medios. Contenido no convertible queda señalado, nunca eliminado silenciosamente.
- AXIS conserva contratos/recursos portables existentes. Rooms no copia componentes privados de Think ni adopta su tipografía histórica: su entorno usa La órbita, Bricolage/Poppins. El contenido cliente conserva su identidad.
- Think mantiene sus muestras y rutas actuales. No hay migración automática, redirección, retirada o copia de grants. El acceso Rooms se concede independientemente; importar un archivo o URL no hereda autorización de redistribución.
- Assessment, Insights y otras herramientas dueñas producen sus diagnósticos/informes. Rooms importa o referencia versiones autorizadas; no duplica crawlers, research, scoring o conectores de datos como condición de una presentación.

Esta distinción conserva un producto común y permite que captación/educación en Think lleve a una propuesta contextual en Rooms. No exige trasladar primero todos los productos existentes.

## 5. Paridad, publicación y confianza

UI, CLI y MCP deben importar/editar bloques, registrar snapshots de evidencia, relacionar fragmentos y derivados, configurar planes/escenarios permitidos y publicar con idénticas validaciones. El manifest contiene `profiles[]` y versiones de bloques; combinar perfiles no cambia autoridad ni grants. Las operaciones durables se registran en el [contrato API](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).

Publish valida referencias y cobertura de **contenido estructurado además de archivos**. Una relación rota requerida impide publicar; omisiones opcionales quedan explícitas. Diferenciar ausencia, no medido y cero. El schema/JSON-LD del cliente se muestra inerte como evidencia, nunca como marcado SEO activo del dominio Rooms. No se ejecutan scripts importados ni se inyectan datos privados en metadata pública.

El [método comercial](../../commercial/EFEONCE_VENTA_CON_DEMOSTRACION_CONTEXTUAL_V1.md) y el [método de casos SEO/AEO](../../commercial/SEO_AEO_BUSINESS_CASE_METHOD_V1.md) gobiernan los argumentos: una muestra implementada no prueba resultados del sitio; un subconjunto de consultas no representa automáticamente toda la demanda; escenarios sin baseline suficiente se presentan como sensibilidades, no forecasts.

## 6. Aceptación del producto

V1 requiere dos propuestas de marcas distintas: **una creativa y una SEO/AEO**, más un recorrido combinado con material autorizado de una misma marca. No mezclar datos entre clientes para fabricar esa tercera prueba. La creatividad puede ser el primer hito visible; el cierre de EPIC-052 requiere los dos perfiles.

Evidencia pendiente: importar sin pérdida; leer una pieza editorial completa; seleccionar fragmento y abrir fundamento/dato; volver desde derivado al origen; explicar plan/medición; presentar y recuperar selección/scroll sin filtrar notas; operar por los tres canales. Probar ausencia de baseline, fuente inaccesible o desactualizada, ancla rota, datos de otra entidad y respuesta IA ilustrativa. La sesión sigue usando su snapshot y muestra sus límites.

Registrar QA desktop/móvil, teclado, contraste y reduced motion con contenido real. Estas son especificaciones del diseño; no constituyen aceptación visual ni funcional de un runtime existente.
