---
name: berel-content-production
description: >-
  Producción editorial de Pinturas Berel (México) de punta a punta: ciclo mensual en Notion,
  reescrituras y artículos nuevos, revisión de comentarios del cliente, formato Tutorial híbrido,
  auditoría SEO/AEO contra URL viva, voz de marca es-MX, banners, derivados sociales y handoff/carga en Drupal. Continúa el flujo
  research → brief y ejecuta brief → pieza publicada → átomos sociales. Invoca copywriting,
  seo-aeo, content-marketing-studio, social-media-studio, notion-platform y greenhouse-ico cuando
  corresponde. Usar para cualquier producción mensual, artículo, tutorial, banner, derivado social,
  QA, publicación o informe periódico de auditoría de Berel.
type: skill
user-invocable: true
argument-hint: '[fase del ciclo, artículo, tutorial o pregunta concreta]'
---

# Berel — Producción de contenidos

> **Skill de cliente, no de oficio.** Ejecuta el proceso acordado por Berel + Efeonce. La fuente de
> verdad viva es la **Wiki de Berel en Notion**; esta skill es su copia operativa para agentes.

**Berel = Pinturas Berel, México.** El contenido vive en `berel.com`, sección **Inspiración**, sobre
Drupal. La voz pública es español de México y habla como la marca, no como Efeonce.
Los informes dirigidos a Berel hablan desde Efeonce como su agencia: ver módulo 17.

## Precedencia documental

Cuando dos fuentes difieren, aplicar este orden:

1. **Petición fechada del cliente** (`Recomendaciones Cliente`).
2. **Spec específica del artefacto**: p. ej. `Spec para imágenes`, `Ficha Tutoriales`, formatos de infografía.
3. **Playbook Producción vivo** en Notion.
4. Guías generales (`6. Voz y Tono`, manuales, módulos de oficio).
5. Esta copia del repo.

Si Notion contiene una regla vieja que contradice una decisión posterior del cliente o una spec más
específica, **no degradar la skill**: mantener la regla más reciente/específica y registrar el drift.

## Cómo se usa

Para informes periódicos dirigidos al cliente, comenzar por el módulo 17 y el canon compartido
de reporting; los pasos siguientes gobiernan la producción de piezas.

1. **Consultar `Formato` en Content Hub antes de escribir.**
   - `Artículo` → modalidades A/B normales.
   - `Tutorial` → modalidad A/B normal + `modules/13_FORMATO_TUTORIAL_HIBRIDO.md`.
   - vacío → no asumir; reportar el gap.
2. **Determinar modalidad por contenido vivo, no por el campo ni por HTTP 200.**
   - A · Reescritura: la URL tiene `title`, H1 y cuerpo editorial real.
   - B · Artículo nuevo: no hay URL viva o la canónica planificada devuelve el shell soft-404.
3. Cargar solo los módulos de la fase solicitada. Para tutoriales, leer también el módulo 12 y
   completar `templates/control-tecnico-tutorial.md`: la estructura no sustituye la validación del sistema.
   Para comentarios o feedback sobre un artículo, cargar el módulo 18 junto con los módulos 03, 04,
   07 y 09; cargar el 08 solo cuando la pieza ya esté publicada.
4. Aplicar las reglas duras.
5. Cerrar con artefacto/tarea/estado verificado en una lectura fresca de Notion.

## Router

```text
Planeación temática, prioridades y minería de huecos ............... modules/14_PLANEACION_TEMATICA_Y_COBERTURA.md
Mes completo, modalidades, tareas y estados ........................ modules/01_CICLO_MENSUAL.md
Numeración mensual, identidad y corrección de referencias .......... modules/16_NUMERACION_EDITORIAL.md
Informe periódico al cliente, continuidad y responsabilidad ........ modules/17_INFORMES_AUDITORIA_CLIENTE.md
Auditoría de URL viva y análisis SEO/AEO ........................... modules/02_ANALISIS_AUDITORIA.md
Redacción de reescritura o artículo nuevo .......................... modules/03_REDACCION_ARTICULO.md
Voz y tono Berel es-MX ............................................. modules/04_VOZ_Y_TONO_BEREL.md
Banners, imágenes y ficha visual ................................... modules/05_BANNERS_IMAGENES.md
Derivados sociales ................................................. modules/06_DERIVADOS_SOCIALES.md
Selección de canales, capacidad y exclusiones reversibles .......... modules/15_DISTRIBUCION_SELECTIVA.md
Sistema Notion, propiedades y relaciones ........................... modules/07_SISTEMA_NOTION.md
CMS Drupal ........................................................ modules/08_PUBLICACION_CMS_DRUPAL.md
Correcciones y pedidos fechados del cliente ........................ modules/09_RECOMENDACIONES_DEL_CLIENTE.md
Revisión y respuesta de comentarios del cliente .................... modules/18_REVISION_COMENTARIOS_CLIENTE.md
Formatos de infografía ............................................. modules/10_FORMATOS_DE_INFOGRAFIA.md
Ficha de producción de infografía ................................. modules/11_FICHA_DE_PRODUCCION_INFOGRAFIA.md
Datos verificados de catálogo ...................................... modules/12_DATOS_VERIFICADOS_DEL_CATALOGO.md
Formato Tutorial híbrido + Paso a Paso ............................. modules/13_FORMATO_TUTORIAL_HIBRIDO.md
Errores ya cometidos ............................................... ANTIPATTERNS.md
Vocabulario ........................................................ GLOSSARY.md
Fuentes y fecha de sincronización .................................. SOURCES.md
Plantillas ......................................................... templates/
```

## Reglas duras

1. 🔴 **Orden canónico:** artículo escrito → banners → derivados sociales. En `Tutorial`, el híbrido
   debe estar escrito antes de crear la tarea de fotos del Paso a Paso.
2. 🔴 **Nada técnico se afirma sin abrir la URL viva.** La extracción de texto plano no prueba
   enlaces, ALT, `title`, jerarquías ni schema.
3. 🔴 **No borrar historia del Content Hub.** Agregar versiones nuevas al final y rotular las anteriores
   como `Histórico`. Una revisión de comentarios autorizada usa reemplazos pequeños. Si aparece operación
   interna dentro de una superficie visible para el cliente, el alcance se amplía al saneamiento completo de
   la versión vigente y sus bloques visibles relacionados; se preserva la historia, no la fuga. Las revisiones
   autorizadas del informe de auditoría se integran en la misma página (módulo 17).
4. 🔴 **Nada se promete sin respaldo documental.** Claims, garantías, rendimientos y cifras deben
   existir en ficha/fuente del cliente. Si dos fuentes contradicen, ninguna entra al cuerpo.
5. 🔴 **Nunca RGB/HEX de colores de pintura en texto público.** Nombre + código alfanumérico. HEX de
   paleta de acento sí puede vivir en una ficha de diseño.
6. 🔴 **Nunca enlazar a `/search` ni `?q=`.** `robots.txt` los bloquea. Producto → página pública o
   categoría; color → paleta/artículo válido o `/colores/<familia>`.
7. 🔴 **berel.com usa soft-404.** HTTP 200 no significa que la página exista. Verificar sitemap +
   control inventado + `title`/H1/cuerpo.
8. 🔴 **Links para CMS se entregan como rutas relativas** desde el primer `/` posterior a `.com`
   cuando el handoff lo requiera; el anchor visible siempre es descriptivo, nunca la URL cruda.
9. 🔴 **Contenido público: voz Berel en es-MX y primera persona plural:** `creamos`, `nuestra paleta`, `nuestro blog`.
   ALT y schema pueden usar tercera persona. En informes al cliente, nosotros = Efeonce (módulo 17).
10. 🔴 **Mexicanidad por objetos y contexto, no por etiquetas ni modismos cerrados.**
11. 🔴 **Auditoría de voz obligatoria antes de cerrar.** Revisar detalles, no solo “sensación de tono”.
12. 🔴 **Sin series de producto en cuerpo público**, incluidas tablas, materiales y CTA. Las series
    quedan en fichas técnicas/notas para Dev.
13. 🔴 **CTA nunca al Home.** Siempre al destino específico de la intención.
14. 🔴 **ALT, archivo y posición se declaran una vez y se copian.** La fuente editorial vive en la
    ficha contextual N1–N4 dentro de la versión vigente del artículo; la tarea visual debe copiarla de forma
    literal. La ficha acompaña la sección que representa y no se agrupa al principio ni al final. Si diseño ya
    produjo el asset, composición, copy, ALT, archivo y posición quedan congelados hasta una conciliación de
    cambio explícita con el equipo de diseño.
15. 🔴 **Spec para imágenes manda sobre el Playbook** si difieren.
16. 🔴 **Verificado ≠ estimado.** Volumen, competencia o cifras sin herramienta se etiquetan como
    estimación.
17. 🔴 **Dato no confirmado fuera de la narrativa; brecha trazable en evidencia.** Un dato, URL, asset o
    capacidad CMS no confirmada no se publica como hecho ni disclaimer dentro del toggle editorial. Cuando
    afecta el análisis o la decisión, se documenta profesionalmente en el toggle de evidencia correspondiente
    con fuente, alcance, owner y siguiente paso; credenciales, prompts, conversación entre agentes y operación
    sensible permanecen en el sistema privado de Efeonce.
18. 🔴 **No declarar inexistencia por ausencia en un listado paginado.** Probar sitemap/patrón,
    búsqueda de navegación y luego preguntar al cliente.
19. 🔴 **Avance en tres grupos:** listos · bloqueados con motivo · fuera de alcance.
20. 🔴 **Navegar el sitio de a una llamada por vez** cuando la extracción completa sea necesaria.
21. 🔴 **La petición fechada del cliente le gana a una guía general.**
22. 🔴 **Infografías solo con formatos aprobados:** Pasos · Señalización · Tipos de Color ·
    Técnica-Foto · Técnica-Gráfica; la ficha nombra formato + variante.
23. 🔴 **La ficha depende de qué es la pieza, no de su número.** Una infografía usa su ficha de
    producción completa aunque sea N3 o N4.
24. 🔴 **Rojo de infografía = `#B3153A` (Rojo Editorial)**; no confundir con color de pintura.
25. 🔴 **No convertir etiquetas químicas/comerciales en taxonomías excluyentes.** Recomendar por
    superficie → exposición → función → ficha específica.
26. 🔴 **Instagram = Story, no post estático.** Decisión posterior del cliente: secuencia 9:16; la
    mención vieja a “Instagram Post estático” del Playbook no gobierna.
27. 🔴 **Paridad social:** tarea + subítem deben terminar con la misma cadena de contenido/enlaces;
    verificar todos los pares seleccionados y los históricos modificados en lectura fresca.
28. 🔴 **Pieza histórica = `Archivo YYYY`** y sin programación hasta validar vigencia/derechos.
29. 🔴 **Sensibilidad y consolidación cambian el CTA** y pueden bloquear derivados hasta confirmar
    canónica.
30. 🔴 **`Formato` decide estructura, no la modalidad.** `Tutorial` no reemplaza A/B: agrega una
    versión híbrida para CMS.
31. 🔴 **Una intención = una URL.** Nunca publicar artículo y tutorial duplicados para la misma
    keyword. El híbrido reestructura el V1 y conserva aproximadamente 90% de su cobertura útil.
32. 🔴 **Tutorial Paso a Paso = 4 pasos canónicos** salvo instrucción expresa del cliente/template;
    cada paso lleva foto 📸, y esas fotos no son los banners horizontales.
33. 🔴 **Fotos de tutorial:** una sola tarea de diseño por secuencia, 1:1 de 500 px, sin texto/logo,
    coherencia de espacio/luz/muro. Cada ficha se conserva junto a su paso y se copia literalmente a la
    tarea, que nace solo cuando el híbrido ya existe. Si el arte ya fue producido, la spec queda congelada.
34. 🔴 **Banners heredados conservan su especificación completa y contextual.** El híbrido incluye las
    fichas N1–N4 en sus posiciones editoriales y la tarea visual conserva una copia literal. El arte final,
    cuando exista, manda sobre cualquier mejora no solicitada: no cambiar brief, copy, ALT, archivo, medida,
    lazy-load ni posición sin reconciliar el asset ya producido.
35. 🔴 **Canónica planificada soft-404 puede vivir como metadata**, pero no activa enlaces entrantes
    ni derivados hasta QA live de `title`, H1, cuerpo, canonical y schema.
36. 🔴 **Cuatro macropasos no permiten omitir operaciones.** Preparación, compatibilidad, mezcla,
    dilución, aplicación y esperas se verifican por producto/acabado; declarar no aplica con fuente.
37. 🔴 **Campo vacío del CMS ≠ dato inexistente.** Contrastar Wiki, página y PDF oficial antes de
    bloquear un dato; tacto, repintado, curado, primer lavado y reocupación son condiciones distintas.
38. 🔴 **Cambio de producto = revisión de dependencias**, no reemplazo de nombre. Aplicar el
    protocolo del módulo 13 a texto, tablas, FAQ, ALT, PNG, banners, tareas y pares sociales.
39. 🔴 **Auditar no autoriza reescribir.** Una corrección de una pieza previa se limita al alcance
    aprobado; conservar historia, metadatos, colores, alias y assets no afectados.

40. 🔴 **Etiquetas obligatorias desde la creación de cada tarea visual:** guardar `Tipo de pieza`
    y `Canal de pieza` como propiedades de Tareas según el módulo 07, también en reservas bloqueadas.
    No basta escribirlas en el brief ni completar `Tipo de entregable` o `Formato`.
    Principales editoriales sin tipo/canal; conservar tareas agrupadas y fórmulas existentes.
    Verificar ambas etiquetas en todas las tareas visuales del lote antes de cerrar.

41. 🔴 **Contrato vigente:** ocho artículos mensuales de 3.000–5.000 palabras, cincuenta gráficas
    y cuatro superficies activas; tres videos mensuales con cortesía mayo–octubre extendida por
    el operador a noviembre/diciembre 2026. Las cincuenta incluyen blog y RRSS; superficies:
    Blog, Facebook, Instagram y Pinterest. No inferir cumplimiento desde filas de tareas. Detalle y restricciones en módulo 15.
42. 🔴 **Cuatro opciones, no cuatro derivados obligatorios.** Aplicar el módulo 15 antes de crear
    tareas: Producir / No aplica / Pendiente por artículo/canal, con fuente y motivo. Las reservas
    descartadas sin producción se cancelan de forma reversible y dejan de llevar tipo/canal;
    nunca retirar etiquetas a piezas trabajadas/entregadas sin conciliación autorizada.

43. 🔴 **Numerar por bloque mensual completo, no por orden de trabajo.** Reservar slots antes del
    siguiente mes; heredar N## por ID de artículo. Corregir solo con mapa autorizado y readback de
    dependencias; conservar archivos históricos con equivalencia. Banner N1–N4 no es N## editorial.
    Protocolo y mapa noviembre/diciembre: módulo 16.

44. 🔴 **El informe rinde cuentas de nuestra gestión.** Leer auditorías anteriores y operación viva;
    asumir los pendientes de lo que redactamos/publicamos, distinguir estados y revisar toda la
    redacción, incluidas tablas, anexos y propiedades. Cierre con Notion + Markdown releídos: módulo 17.

45. 🔴 **Toda página de Notion compartida con Berel es visible, pero cumple dos funciones que no se mezclan.**
    Los toggles de `Research`, análisis SEO/AEO, análisis de contenido y Plan/Brief son evidencia profesional
    obligatoria del trabajo y permanecen en la página. El toggle de artículo, reescritura o tutorial contiene
    únicamente la narrativa final, sus metadatos aprobables y las specs contextuales requeridas. Nunca dejar
    dentro de ese toggle notas de agente, razonamiento operativo, QA, pendientes, CMS/Dev ni mensajes entre
    agentes. En ningún punto de la página se copian prompts, secretos, credenciales o conversación cruda.
    **Las fichas contextuales N1–N4 y las fotos de paso no son notas internas:** son parte del entregable.
46. 🔴 **Producto nuevo o con baja notoriedad requiere una rama editorial propia.** No asumir
    posicionamiento ni titular como `Guía [Producto]`: lectura simple, diferenciador del brief al frente
    y render oficial del empaque dentro del sistema visual. `Premium` puede describir la línea, nunca la
    formulación; `sin plomo` no es argumento comercial.
47. 🔴 **Dato faltante no se publica como disclaimer.** Retirarlo del cuerpo, registrarlo con impacto y
    siguiente paso en el toggle de evidencia —o en privado si es sensible— y solicitar la fuente oficial. En
    comparativas, cada columna nombra su producto y los criterios exclusivos de uno solo quedan fuera de la tabla.
48. 🔴 **CTA técnico con salida real.** Si el texto recomienda consultar a un especialista, debe enlazar
    de forma descriptiva a `/contacto`. Las temperaturas de luz se expresan como `luz cálida (2700–3000 K)`,
    `luz neutra (4000 K)` y `luz fría (5000 K o más)`; los watts miden consumo, no calidez.
49. 🔴 **Notion aprobado/corregido no equivale a sitio actualizado.** Si la pieza ya estaba publicada,
    registrar el cambio pendiente en Drupal, ejecutarlo solo con autorización y verificar después la URL
    pública. Guardar en Notion, cargar en CMS, publicar y comprobar el runtime son estados distintos.
50. 🔴 **Revisar comentarios empieza por inventariar todos los hilos.** Una vista parcial o un marcador
    visible no prueba cobertura. Leer comentarios nuevos y anteriores, incluidas sus respuestas, y separar
    `nuevo`, `atendido`, `bloqueado` y `fuera de alcance`. `Atendido` nunca significa `resolved`.
51. 🔴 **Separar diagnóstico de remedio.** El cliente puede identificar correctamente el problema sin que
    su frase propuesta sea la mejor solución. Tomar la sustancia, no la letra; explicar con respeto cualquier
    alternativa y sostenerla con una regla editorial, un dato o evidencia SEO/AEO.
52. 🔴 **Claridad antes que ingenio; una sección, una intención.** Si una frase requiere una segunda lectura,
    se reescribe en llano. El contenido bajo un encabezado que no responde su pregunta se reubica, no se pierde:
    recibe encabezado propio y una línea puente que lo cosa al hilo. En cuerpo evergreen, nunca usar etiquetas
    de temporada, trimestre o vigencia; color = nombre + código.
53. 🔴 **Cada hilo atendido recibe respuesta y queda abierto para el cliente.** Indicar qué se aceptó, qué se
    cambió de otra manera y por qué. Efeonce no marca hilos como resueltos. El cierre exige edición o decisión,
    respuesta y lectura fresca; el contador de hilos abiertos no es una métrica de deuda de la agencia.
54. 🔴 **Un comentario que crea doctrina se captura el mismo día.** Actualizar `Aprendizajes del feedback` y
    el Playbook; reportar hallazgos fuera de alcance aparte. Si la pieza ya está publicada, abrir además el
    pendiente CMS sin confundir la corrección en Notion con el sitio actualizado. Detalle: módulo 18.
55. 🔴 **Una sola zona editorial vigente y limpia para revisión.** Debe estar identificada inequívocamente y
    contener metadatos aprobables, texto público y las cuatro fichas visuales contextuales N1–N4. Los toggles
    de evidencia permanecen como hermanos separados; su análisis, fuentes, limitaciones y decisiones no se
    intercalan dentro de la narrativa editorial.
56. 🔴 **Una fuga dentro del toggle editorial es un incidente centinela, no una corrección de una frase.** Si
    el cliente la señala en un punto, inventariar la página completa para reconocer fronteras y luego releer y
    sanear la zona editorial vigente y sus callouts. No borrar ni convertir en fuga los toggles hermanos de
    análisis/evidencia ni los comentarios; el saneamiento es quirúrgico, preserva N1–N4, fotos de paso, anclas
    y el copy que sustenta arte producido. Reportar aparte otras páginas potencialmente afectadas.
57. 🔴 **`success` de Notion no prueba estructura.** Tras cada reemplazo, releer el markdown guardado y el
    render; confirmar que cada hijo conserva su tabulador y sigue dentro del toggle correcto. Texto expulsado
    al final de la página deja la corrección incompleta aunque la API responda correctamente.
58. 🔴 **Gate fail-closed antes de `En revisión` o aviso al cliente.** Ejecutar
    `node scripts/client-visible-copy-gate.mjs <export.md>` sobre la página fresca y completar la lectura humana
    de cliente. Si la lectura está truncada, contiene bloques desconocidos, faltan fichas N1–N4 o el gate detecta
    operación interna en el toggle editorial fuera de esas fichas, no declarar la pieza lista.
59. 🔴 **El historial de versiones es recuperación, no exploración.** Si una edición daña estructura o anclas,
    capturar primero el inventario de discusiones, restaurar una sola versión conocida y comprobar los mismos
    `discussion id`, autores y estados antes de volver a editar. No recorrer versiones a prueba y error ni tomar
    el botón `Restaurar` como evidencia de que los hilos sobrevivieron. Después, solo reemplazos pequeños que
    preserven las anclas; conteo de observaciones del cliente, discusiones, comentarios y respuestas son métricas
    distintas. Protocolo y taxonomía: módulo 18.

## Lo que no se toca

- Fórmulas y automatizaciones de `Tareas`, incluido `[GH] RpA v2`.
- Credenciales de `Accesos CMS`: nunca se copian a repo, log, commit ni prompt.
- Alias de URL de artículos existentes salvo instrucción explícita y plan de redirección.
- Contenido histórico, toggles de análisis/evidencia o material ajeno al bloque editorial vigente, salvo
  rotular versiones editoriales anteriores inequívocamente como `Histórico`. Nunca borrar evidencia, versiones
  ni historia para sanear la narrativa.

## Criterio de cierre

Una ejecución no termina porque una API respondió `success`. Termina cuando una **segunda lectura
fresca** confirma contenido, relaciones, responsables, fechas, formato, estados y jerarquía de toggles; los
toggles de análisis/evidencia siguen presentes y separados; la zona editorial no contiene notas de agente ni
operación ajena a la narrativa; N1–N4 permanecen contextuales y en paridad literal con las tareas visuales. En
lotes: reportar listos, bloqueados con motivo y fuera de alcance.

## Metodología de deck ejecutivo mensual

Para resumir una auditoría o informe en un deck para directorio, cargar `docs/operations/EFEONCE_EXECUTIVE_REPORT_DECK_METHOD_V1.md`: continuidad de evidencia, producción mensual frente a acumulada, On-time con denominadores, narrativa ejecutiva, selección visual antes de implementación, marcas/pie/contraportada, HTML como insumo del PDF A4 y verificación del archivo final. El caso Berel conserva sus decisiones y límites; las cifras no se reutilizan entre meses.
