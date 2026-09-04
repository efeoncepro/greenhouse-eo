# 17 · Informes de auditoría SEO/AEO para Berel

Este módulo gobierna el informe periódico dirigido a Berel. El módulo 02 sigue gobernando el
análisis de una URL previo a una reescritura; no sustituye este cierre de gestión.

**Canon compartido:** [SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md](../../../../docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md).
Cargar también `seo-aeo`, `seo-aeo-practice` y `dataforseo-operator` para metodología y medición.

## 1. Quién habla y de qué responde

En el informe **nosotros = Efeonce**, la agencia SEO/AEO que redacta y publica los contenidos.
Berel es el destinatario. La primera persona de marca del módulo 04 aplica al contenido público,
no a esta rendición de cuentas. No escribir como una consultora externa que descubre nuestro trabajo.

- Explicar qué hicimos, qué resultados medimos, qué queda pendiente de nuestra gestión y qué requiere
  una decisión o validación específica de Berel.
- Asumir las correcciones editoriales, enlaces, metadatos y registros de nuestra operación cuando
  corresponden al alcance vigente. No disolverlas en «verificar la calidad de lo publicado».
- Distinguir autoría de un contenido concreto de responsabilidad de mantenimiento: no atribuirnos
  la redacción de todo el archivo histórico sin evidencia.
- Coordinar con el proveedor web solo los cambios que realmente requieran desarrollo, rutas,
  plantillas o infraestructura. La existencia de un proveedor no convierte toda carga CMS en su tarea.
- Si no conocemos quién ejecutó una mejora técnica, describir el cambio observado sin atribuirlo.
- Proponer en condicional las ampliaciones no acordadas; describir nuestros pendientes existentes
  como pendientes de gestión. No presentar una iniciativa ya contratada o desarrollada como nueva.

| Redacción que diluye nuestra responsabilidad | Redacción que rinde cuentas, si la evidencia la respalda |
|---|---|
| «Además de verificar la calidad de lo publicado» | «Corregiremos los enlaces y metadatos pendientes de las piezas que redactamos y publicamos» |
| «Se localizaron versiones desarrolladas» | «Redactamos estas piezas; la validación indicada en cada una sigue pendiente» |
| «Con participación de Efeonce en el CMS» | «Redactamos y publicamos las piezas del ciclo» |
| «Comprobar que las especificaciones lleguen al CMS» | «Corregiremos estos campos en el CMS y comprobaremos el resultado público» |
| «Recomendamos crear un Content Hub y empezar tutoriales» | «El Content Hub y los tutoriales ya forman parte de nuestra operación; el siguiente pendiente es…» |

Son ejemplos de enfoque, no frases para copiar sin comprobar su estado ni promesas de ejecución.

## 2. Leer la continuidad antes de redactar

1. Abrir la DB de auditorías y leer los informes anteriores relevantes, completos: cuerpo, tablas,
   anexos, propiedades y plan. Identificar el mes base y conservar los identificadores de hallazgos.
2. Leer el Playbook Producción, Recomendaciones Cliente, Content Hub y tareas del ciclo, incluidos
   cuerpos, relaciones y entregables. Consultar ciclos próximos cuando la recomendación pueda
   duplicar trabajo ya escrito o en producción.
3. Conciliar cada hallazgo anterior con evidencia actual: corregido, persiste, parcial o no
   comparable. Una tarea antigua sin actualizar no prueba que nadie haya ejecutado el cambio.
4. Revisar la URL pública, con control de soft-404, antes de afirmar publicación o corrección.
5. Documentar para uso interno fuente, fecha, alcance y discrepancias; explicar al cliente solo las
   limitaciones que afectan la interpretación o una decisión.

Puntos de entrada, que deben releerse y no tomarse como snapshots vigentes:

- DB de auditorías: `0d33444c255e47c0808125bc34d59000`.
- Content Hub: `35f39c2fefe7808186efc6ec63475640`.
- Playbook Producción: `3b239c2fefe780ceb71dff4f5bed4646`.
- Tareas: `35c39c2fefe780c9bc37e811a7b95a7c`.
- Recomendaciones Cliente y fuentes específicas: [SOURCES.md](../SOURCES.md).

## 3. Conciliar producción y publicación por pieza

Registrar por ID estable de Content Hub, no solo por N##, que puede haber sido renumerado:

| Estado | Evidencia que lo respalda |
|---|---|
| Redactado | Cuerpo o versión desarrollada y fecha del entregable |
| Aprobado | Aprobación aplicable al contenido o versión concreta |
| Cargado en CMS | Registro de carga y contenido guardado, sin inferir publicación |
| Publicado | URL real con contenido, canónica y fecha verificable cuando exista |
| Registro conciliado | Content Hub y tareas consistentes con el estado comprobado |

Conservar esas dimensiones separadas. Una pieza publicada con una tarea «En revisión» puede tener
un registro desactualizado: no atribuir demora a Berel sin revisar la aprobación. Una URL vacía en
el Hub no prueba falta de publicación. Una fecha de edición tampoco prueba la fecha de publicación.

En la matriz del ciclo, mostrar modalidad, trabajo realizado, resultado público, pendiente y
responsable sustentado. No contar filas de tareas como cumplimiento del contrato ni mezclar piezas
escritas de próximos meses con publicaciones del mes auditado.

## 4. Medición y AEO Grader

Aplicar el canon compartido para distinguir GSC, GA4, DataForSEO y Grader. En Berel:

- Confirmar propiedad, dominio/subdominio, país, periodo y filtros. Una propiedad de Efeonce nunca
  sirve como evidencia del cliente. No equiparar agregados de GSC con extractos de consulta/URL.
- Separar resultados del mes auditado de verificaciones realizadas después de su cierre.
  Un rastreo o run posterior es una observación posterior, no una medición retrospectiva del mes.
- No llamar ventas o solicitudes a interacciones con colores, inspiración o localizador sin una
  conversión comercial validada. Explicar qué representa el evento.
- Leer el run completo del AEO Grader: fecha e identificador, preguntas, mercado, categoría,
  respuestas, fuentes y comprobaciones. El sector debe reflejar la intención de pinturas y
  recubrimientos; una etiqueta amplia de «Manufactura» puede invalidar la lectura competitiva.
- Si el run tiene preguntas mal encuadradas o señales técnicas falsas, conservar el resultado bruto
  con sus límites, asumir la corrección de nuestra medición y no convertir su score en un KPI
  comparable ni recalcular un score corregido sin metodología.
- Un HTTP 200 no demuestra MCP, API ni otra capacidad: contrastar cuerpo, protocolo y control de
  ruta inexistente. El soft-404 de Berel exige especial atención en estas comprobaciones.

## 5. Claims y Laboratorio Berel

Cuando una cifra de rendimiento, lavado, duración o compatibilidad difiera entre ficha, artículo y
material aprobado, identificar la discrepancia y sus condiciones. **No afirmar que el claim es
falso por la discrepancia ni elegir la cifra más favorable.** Consultar las fuentes del módulo 12 y
la validación de Laboratorio que corresponda. Asumir nuestra conciliación editorial de texto,
tablas, FAQ, imágenes y metadatos; no declarar una validación técnica que aún no existe.

## 6. Revisión integral y entrega

Antes de publicar, revisar todo el documento, no solo el resumen:

- Continuidad de hallazgos y plan anterior; trabajo existente y pendientes de nuestra gestión.
- Voz de agencia en párrafos, encabezados, tablas, notas, anexos y propiedades resumen de Notion.
- Denominadores, periodos, fuentes, score bruto y límites de interpretación.
- Responsables y verbos: separar ejecutado, observado, pendiente y propuesta sin atribuciones falsas.
- Coherencia entre resumen, evidencia, prioridades y criterios de cierre.

Cuando el operador solicite subagentes, repartir revisiones independientes de continuidad/contenido,
evidencia/medición y voz/responsabilidad. Una revisión de tono no reemplaza la conciliación de datos.
Integrar los comentarios y hacer una lectura completa final tras resolver solapamientos.

Crear el nuevo periodo en la DB indicada; durante correcciones, actualizar la misma auditoría, sin
duplicarla ni reescribir meses previos. Guardar la copia Markdown acordada. No modificar piezas,
tareas ni el sitio por el mero hecho de registrar sus pendientes en la auditoría.

El cierre exige lectura fresca de Notion y de la copia local: comprobar secciones, tablas, cifras,
identificadores, enlaces y propiedades. Una escritura aceptada no basta. Si no se pudo guardar o
verificar una superficie, informar exactamente cuál; nunca declarar ambas actualizadas por inferencia.

## Caso fechado

[Auditoría de agosto de 2026](../../../../docs/audits/seo/BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md):
caso que originó estas reglas, revisado en septiembre de 2026. Sus métricas, estados y limitaciones
del Grader no son hechos permanentes ni una plantilla para copiar a otros meses.
