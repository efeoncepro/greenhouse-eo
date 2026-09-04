# Informes de auditoría SEO/AEO para clientes

> Modelo operativo V1 · 2026-09-04 · Dueño: práctica SEO/AEO de Efeonce.
> Aplica a auditorías periódicas y sus revisiones. La skill `seo-aeo` aporta el oficio;
> la skill del cliente aporta alcance, voz y fuentes vivas.

## Propósito y autoridad

El informe rinde cuentas del trabajo de la agencia, interpreta resultados con límites verificables y
mantiene continuidad entre ciclos. El lector es el cliente: las instrucciones para agentes, consultas
SQL, errores de herramientas y procedimientos de publicación pertenecen al soporte interno.

Este modelo operacionaliza los contratos existentes de
[documentación](DOCUMENTATION_OPERATING_MODEL_V1.md),
[contexto de agentes](../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md) y
[AI Visibility Grader](../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md).
No modifica scoring, permisos, runtime ni el proceso de aprobación del producto. Una auditoría que
identifica un defecto del instrumento no constituye su implementación o despliegue.

Caso fechado: [auditoría Berel, agosto de 2026](../audits/seo/BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md).
Sus cifras, URLs y pendientes describen ese corte; no deben copiarse como estado vigente en otra auditoría.

## 1. Intake y continuidad antes de diagnosticar

1. Fija cliente, organización, dominio, mercado, idioma, periodo completo, comparación y fecha de revisión.
   Verifica los identificadores de las propiedades GSC/GA4; una sesión abierta no prueba que sea el cliente correcto.
2. Lee el contenido completo de las auditorías anteriores relevantes, incluidos anexos, compromisos y
   metodología. Un título o resumen no basta. Si cambia el proveedor o universo, conserva el antecedente
   y explica por qué no hay comparación directa.
3. Lee la skill del cliente, alcance de la agencia, Content Hub, playbook, briefs, tareas y seguimiento
   técnico. Comprueba qué ya redactamos, aprobamos, cargamos, publicamos o tenemos pendiente.
4. Contrasta las páginas públicas, incluidos título, contenido, canónica, enlaces y correspondencia con
   la ficha editorial. Estado «Publicado», tarea «Listo» o HTTP 200 no sustituyen esa comprobación.
5. Construye una matriz de continuidad: hallazgo anterior, fuente/fecha, evidencia actual, estado,
   responsabilidad y criterio de cierre. Conserva identificadores existentes y no borres asuntos abiertos.

Estados recomendados: **corregido** (condición verificada dentro del alcance), **parcial** (avance sin
cierre completo), **persiste** (condición repetida) y **no comparable** (método, criterio o datos no
permiten comparación). Corregir una condición técnica no prueba una mejora de tráfico o ingresos.

Distingue por pieza redacción, aprobación, carga CMS, publicación pública y registro del Hub. Un estado
atrasado del Hub no acredita un retraso del cliente. Una URL actual no reconstruye su fecha de publicación.

## 2. Evidencia y denominadores

Cada cifra debe poder rastrearse a fuente, identidad, fecha, filtros, unidad, universo y limitaciones.
Conserva insumos mínimos reproducibles en el espacio interno autorizado, sin credenciales ni datos
personales innecesarios. La fuente y el límite relevantes se explican junto a la cifra del informe.

| Fuente | Control obligatorio |
|---|---|
| GSC | Separa total de propiedad, detalle consulta–URL, páginas, países/dispositivos y superficies Web/IA. Exportaciones parciales o anonimizadas no reconstruyen automáticamente el total. |
| GA4 | Declara propiedad, rango, dimensión de adquisición y canal. Clics GSC no son sesiones; eventos repetibles no son personas, leads ni ventas. Cero registrado no prueba cero actividad real. |
| DataForSEO | Declara mercado, idioma, dispositivo, fecha, producto y metodología ETV cuando aplique. Consumir la API no convierte una estimación de tráfico en tráfico observado. No mezcles fórmulas ni proveedores. |
| Rastreo | Declara límite, páginas efectivas, recursos, JavaScript/renderizado y fecha. Alertas se superponen; su suma no es número de páginas. Un puntaje alto de muestra no certifica todo el sitio. |
| Sitio público | Separa entradas de sitemap, URLs únicas, URLs rastreadas y páginas indexadas. El grafo de enlaces del cuerpo editorial no es el de todo el sitio. Sin entrada desde otro artículo no equivale a página huérfana. |
| Experiencia | Separa datos de campo y laboratorio; grupos móviles/escritorio y motivos pueden solaparse. Una foto posterior al mes no representa su promedio mensual. |
| Backlinks | Inventario, ventanas móviles de altas/bajas, dominios y enlaces tienen denominadores distintos. Spam score no es porcentaje de enlaces tóxicos. |

Presenta las variaciones comparables; no atribuyas causalidad a un cambio sin fechas de implementación,
ventana adecuada y evidencia. Recomendaciones antiguas sobre resultados enriquecidos o requisitos de IA
se contrastan con documentación oficial vigente antes de mantenerlas como fallas.

## 3. Integración de un AEO Grader existente

Lee el run real y sus insumos, no solo la pantalla del puntaje:

- identidad de marca, dominio y organización; fecha, mercado e idioma;
- preguntas efectivamente ejecutadas, categoría, intención y si nombran la marca;
- motores/modelos, versiones del conjunto y del scoring; respuestas exitosas, fallidas y omitidas;
- respuestas y fuentes, extracción de menciones, competidores, dimensiones, probes y comparación histórica.

**Validez antes del puntaje.** Preguntar por una industria amplia no mide necesariamente la categoría
comercial del cliente. Si las preguntas son impropias, conserva el resultado como salida del instrumento,
explica el límite y no lo uses como línea base, deterioro de marca o justificación para producir contenido.
La agencia asume la corrección de su configuración y la repetición pendiente; no presenta esa falla como
una carencia del cliente. No ejecutes un nuevo run de pago ni cambies configuración por el mero hecho de
haber recibido un pedido de revisar e incorporar uno existente.

**Mención asistida no es descubrimiento.** Separa respuestas a preguntas que nombran la marca de las que
no la nombran. Una observación es una combinación de pregunta y motor, no una pregunta única. Dimensiones
que usan subconjuntos solapados no se suman. Un Share of Voice alto sin competidores declarados o con
extracción incompleta no prueba liderazgo: contrasta el texto, no solo el array normalizado.

**Clasificación no es verdad factual.** Sentimiento mixto no equivale a falsedad. Un flag de desviación
puede señalar ambigüedad o una limitación legítima. Contrasta afirmaciones con fuentes de producto y distingue
compradores, empleados y distribuidores. La proporción de respuestas que cita el dominio no es la proporción
de todas las citas. Una fuente clasificada como propia/ganada/noticia no valida cada afirmación de la respuesta.

**HTTP 200 no prueba capacidad.** Para archivos/contratos de descubrimiento, comprueba contenido y formato,
no solo disponibilidad. HTML de fallback en `/openapi.json` o `/.well-known/mcp` no demuestra una API o MCP.
No presentes como certificación de operabilidad un agregado que incluye esos falsos positivos. Archivo
`llms.txt` presente no acredita citas o posicionamiento. Prueba omitida no es aprobada; consulta fallida no es
cero resultados. Un agregado de preparación técnica se mantiene separado del puntaje de percepción.

**Comparación histórica.** Revisa pertinencia de preguntas, mercado, motores, versiones y cobertura antes
de interpretar tendencia. Un run posterior al mes es complemento fechado, no evidencia retroactiva de todo
el mes. Mantén GSC IA, sesiones atribuidas a IA en GA4 y respuestas del Grader como fuentes diferentes.

## 4. Voz de agencia responsable

Antes de redactar, fija quién habla y ante quién. En un informe de Efeonce para el cliente, «nosotros» es
Efeonce. En un artículo público de la marca puede tener otro referente; no traslades ese registro al informe.

Si redactamos y publicamos, dilo y asume los pendientes demostrados. No conviertas una omisión de nuestra
publicación en un consejo genérico para el cliente. Tampoco atribuyas a Efeonce cambios técnicos cuya autoría
no está demostrada. El informe reconoce resultados, trabajo hecho, pendientes propios y dependencias reales.

| Evitar cuando somos autores y publicadores | Redacción situada, si la evidencia la respalda |
|---|---|
| «Además de verificar la calidad de lo publicado» | «Corregiremos los enlaces que dejamos publicados hacia direcciones antiguas». |
| «Se localizaron ocho versiones públicas» | «Redactamos y publicamos las ocho piezas; quedan pendientes estos registros». |
| «Con participación de Efeonce en el CMS» | «Completamos la redacción y la carga en el CMS». |
| «Verificar que las especificaciones lleguen al CMS» | «Cargaremos los metadatos pendientes y comprobaremos el resultado público». |
| «Crear guías de sellador» sin leer el Hub | «La guía ya publicada será la base del siguiente ajuste de enlazado». |
| «El cliente debe implementar SEO/AEO» | «Continuaremos la optimización prevista y coordinaremos estos cambios de plantilla con desarrollo». |

Los ejemplos no autorizan afirmar una publicación o prometer una fecha no comprobadas. Una propuesta nueva
fuera del alcance acordado se redacta como propuesta; un compromiso existente no se disfraza de iniciativa
nueva. No uses la aprobación de producto o al proveedor web para diluir nuestra responsabilidad editorial.

Los problemas técnicos sí se explican al cliente cuando afectan el negocio: qué ocurre, qué implica, qué
haremos, de quién depende y cómo se cerrará. Omite instrucciones para el operador y detalles de herramientas
que no ayuden a evaluar el resultado.

## 5. Estructura del entregable

Adapta la extensión al alcance, manteniendo estos componentes:

1. Resultados ejecutivos, límites materiales y prioridades de nuestra gestión.
2. Periodo, fuentes y bases de comparación.
3. Rendimiento observado, oportunidades, estado técnico y experiencia.
4. Trabajo editorial efectivamente realizado y pendientes de publicación/mantenimiento.
5. Autoridad y AEO, con validez del Grader cuando se incorpora.
6. Plan: prioridad, situación, responsabilidad propia, coordinación y criterio de cierre.
7. Continuidad de hallazgos anteriores, inventarios accionables y fuentes.

Una corrección del instrumento se presenta como tal. No copies recomendaciones automáticas del Grader a
un plan cliente sin cruzarlas con el alcance, contenido existente y validez de sus insumos.

## 6. Revisión integral y publicación

La revisión editorial cubre título, resumen, cada párrafo, tablas, anexos, fuentes y propiedades de la base
de datos. No basta buscar y reemplazar la frase que motivó una corrección. Comprueba quién realiza cada
acción, evidencia del tiempo verbal, continuidad, denominadores y ausencia de atribuciones no sustentadas.

Cuando haya autorización para subagentes, reparte tareas independientes: historia/contenido, datos/método
y técnica/QA. Define ownership de archivos y un integrador. Resuelve contradicciones entre revisores antes
de publicar; cantidad de revisores no sustituye la lectura de la versión integrada.

Para una entrega en Notion y Markdown:

1. Lee la página existente y el schema de su base antes de escribir. Actualiza la misma auditoría cuando
   el pedido sea una revisión; no dupliques páginas ni alteres hallazgos anteriores sin dejar su nuevo estado.
2. Guarda la copia Markdown del informe con ruta estable. Mantén evidencia interna separada del texto cliente.
3. Usa el formato nativo documentado por Notion, especialmente tablas. Prefiere actualizaciones puntuales;
   preserva relaciones, propiedades, contenido ajeno, páginas hijas y bases incrustadas.
4. Revisa también resumen de hallazgos y plan de acción de la base: no pueden conservar la voz o conclusión
   descartadas del cuerpo. No conviertas puntajes de distintos instrumentos en un «puntaje general» sin definición.
5. Vuelve a leer el documento guardado. Compara contenido completo, celdas, cifras, encabezados, identificadores
   y propiedades con el Markdown. Normaliza solo diferencias conocidas del render (enlaces automáticos, formato).
   Los conteos por sí solos no demuestran igualdad.
6. Reporta qué quedó guardado y verificado y qué permanece pendiente. Publicar el informe no significa haber
   corregido el sitio, cambiado el Grader, enviado un correo ni ejecutado otro run.

## Criterio de cierre

El informe está listo cuando su historia es trazable, las cifras conservan su alcance, la agencia responde
por su trabajo, las dependencias están justificadas y ambas copias coinciden tras la lectura de verificación.
El cierre documental no convierte los pendientes técnicos o metodológicos descritos en acciones ejecutadas.

## Presentación institucional

La entrega aplica el [estándar de marca de informes Efeonce](EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md): pie y contacto en cada página, logos oficiales y gráficos interpretables. Para PDF, el HTML es insumo; el cierre exige revisar el archivo exportado en su formato final.
