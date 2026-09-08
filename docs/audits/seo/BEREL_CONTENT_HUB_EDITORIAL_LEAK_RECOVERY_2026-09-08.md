# Berel — recuperación de fugas editoriales en Content Hub — Auditoría 2026-09-08

## Alcance y naturaleza de la evidencia

- Cliente: Berel (`berel.com`).
- Superficie: artículos de octubre, noviembre y diciembre de 2026 en `Content Hub | Todos los proyectos`.
- Incidente centinela: `Cómo pintar herrería y proteger el metal del óxido`.
- Fuente operativa: páginas y comentarios de Notion, Playbook Producción y `Spec para imágenes`.
- Naturaleza: octubre conserva conteos de readback registrados en el cierre; noviembre y diciembre registran el
  resultado reportado en el hilo de ejecución. Antes de reutilizar esos estados como evidencia actual, volver a
  leer Notion: este documento no reemplaza la fuente viva.
- Fuera de alcance: publicar en Drupal, modificar assets/Frame.io, cambiar estados de aprobación o cerrar hilos
  del cliente.

## Causa raíz

Una primera limpieza trató como equivalentes tres capas distintas: notas internas que sí debían salir de la
versión editorial, toggles de análisis que debían permanecer como prueba y fichas visuales que eran parte del
entregable. El reemplazo demasiado amplio retiró specs contextuales y modificó copy no solicitado. La reparación
correcta fue restaurar primero, fijar baseline de hilos/specs y aplicar solo reemplazos pequeños sobre defectos
confirmados.

La frontera vigente es:

| Capa                                                           | Debe permanecer                                                           | No puede contener                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Research, análisis SEO/AEO, análisis de contenido y Plan/Brief | fuentes, decisiones, límites y evidencia profesional                      | prompts, secretos, credenciales, conversación cruda                                                          |
| `✍️ Versión vigente para revisión`                             | Title, meta description, slug, H1, narrativa pública y specs contextuales | notas de agente, QA operativo, fuentes/CMS/schema para Dev, pendientes editoriales, links internos de Notion |
| Tarea privada Efeonce                                          | operación sensible, credenciales y coordinación interna                   | contenido que deba aprobar Berel                                                                             |

## Recuperación de octubre

Se revisaron los diez artículos del mes y el artículo centinela. Los siete artículos preventivos dañados por la
limpieza se restauraron desde el baseline anterior; en los tres con feedback se preservaron las correcciones
justificadas y se recuperaron historia, anclas y specs. El readback registrado confirmó:

- 11/11 páginas con toggles de evidencia separados;
- 44 fichas N1–N4 contextuales y 12 fotos de paso sin cambios frente al baseline;
- 30 discusiones y 59 comentarios conservados, con seis hilos resueltos por el cliente y 24 abiertos;
- ocho fragmentos operativos fuera de lugar corregidos en tres páginas mediante reemplazos pequeños;
- cero cambios en arte, Frame.io, Drupal, tareas o estados.

La clasificación primaria de las 25 observaciones del cliente fue: claridad/estructura 10, precisión de producto
7, voz/localización 5 y alcance editorial/negocio 3. SEO/AEO funcionó principalmente como restricción del remedio,
no como razón para aceptar literalmente cada sugerencia.

## Barrido preventivo de noviembre

El lote vigente se identifica por el mapa editorial como N43–N51. La revisión se extendió a todas sus páginas,
no solo a las que tenían comentarios. Los tipos de defecto corregidos durante el pase fueron:

- sufijos y rótulos de auditoría dentro de la lectura editorial;
- fuentes, controles y metadatos operativos mezclados con el copy público;
- destinos visibles de Notion usados donde correspondía una URL pública de Berel;
- más de una versión presentada como vigente.

Las correcciones se hicieron sobre las zonas vigentes, sin retirar toggles de análisis ni reescribir specs. El
hilo de ejecución avanzó a diciembre después del cierre del lote; este audit no inventa un conteo de bloques,
hilos o páginas modificadas que no quedó reconciliado en un ledger durable. Un siguiente cambio sobre noviembre
debe comenzar con readback fresco y baseline propio.

## Barrido preventivo de diciembre

El alcance fue N52–N59: ocho páginas, descritas durante la ejecución como seis artículos y dos tutoriales; una de
las piezas permaneció `Bloqueado`. La revisión reportó tres páginas con enlaces públicos mal formados, dos
encabezados con `acabado impecable` y notas operativas dentro de zonas vigentes. Se corrigieron los defectos
confirmados y el gate final reportó 8/8 zonas vigentes sin links de Notion, duplicaciones, fugas internas ni daño
de jerarquía. Las specs visuales y anclas de comentarios se mantuvieron fuera del alcance de cambio.

`Segundasegunda capa` **no** fue un defecto de Notion: fue un typo en el resumen del agente. La lectura fresca
mostró `Paso 4. Segunda capa para un acabado uniforme`. La respuesta debió corregirse sin atribuir una edición al
artículo. Esta distinción forma parte del QA: un error en el reporte no se convierte en una mutación de la fuente.

## Comentarios: decisión, no complacencia

Cada comentario se descompone en diagnóstico, remedio y fundamento. Las definiciones de marca o negocio del
cliente gobiernan. Una propuesta de redacción, SEO/AEO o técnica se valida contra voz es-MX, intención, fuentes y
contratos de producto; si no corresponde, se conserva la observación válida, se aplica una solución mejor y se
explica con respeto. Efeonce responde cada hilo atendido, pero no lo marca como resuelto.

El caso `pintura sana` ilustra el método: el cambio a `pintura en buen estado` mejora claridad, pero no es correcto
afirmar que `sana` no se usa en México. El Diccionario del español de México registra `sano` para materiales en
buen estado y fuentes técnicas mexicanas usan `pintura sana`/`superficie sana`. En copy de consumo se evita la
colocación por ambigua y se describe la condición física: `recubrimiento firme, seco y sin desprendimientos`.

## Controles preventivos promovidos

1. Auditar todo el mes aun cuando no haya comentarios; una fuga centinela amplía cobertura de lectura, no
   autoridad de reescritura.
2. Registrar baseline de discusiones, autores, `resolved`, jerarquía y specs antes de editar.
3. Restaurar una sola versión conocida si hubo daño; no buscar versiones mediante restauraciones sucesivas.
4. Editar sobre lectura fresca y con el ancla mínima; volver a leer estructura y render después de cada fase.
5. Ejecutar el gate sobre un export completo y después leer como cliente; el gate no reemplaza juicio humano.
6. Mantener Notion, tarea visual, Frame.io, Drupal y URL pública como estados y evidencias separados.

## Decisión documental

No se abrió ADR. Es un contrato editorial/QA específico del cliente que aplica el Playbook y no cambia source of
truth, schema, acceso, API, runtime, plataforma ni autonomía compartida. La doctrina operativa vive en la skill
`berel-content-production`; esta auditoría conserva la evidencia fechada del incidente y sus límites.
