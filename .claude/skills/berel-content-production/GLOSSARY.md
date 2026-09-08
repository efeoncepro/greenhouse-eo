# Glosario — Berel

## Cliente y sitio

| Término | Qué es |
|---|---|
| **Berel / Pinturas Berel** | Marca mexicana de pinturas, cliente de Efeonce. Opera en México. Se capitaliza siempre |
| **berel.com** | Dominio canónico sin `www`; unificarlo entre canonical y `@id` del schema |
| **Inspiración** | El blog de Berel. Artículos bajo `/articulos/`, tutoriales bajo `/tutoriales/` |
| **Don Bere** | Personaje de marca del registro técnico/tutorial |
| **BerelTip** | Consejo práctico de oficio dentro del contenido |
| **Tienda de Pintura Berel** | Nombre oficial del punto de venta. CTA a `/ubica-tienda` |
| **App Color Berel** | Nombre exacto de la app |
| **Color del Año** | 2026 = Pitaya 2-3605D; 2025 = Maíz 2-1403T |
| **Catálogo RGB** | Base interna para diseño. RGB/HEX no salen al cuerpo publicable |
| **Código alfanumérico** | Identificador público del color; se usa junto al nombre |
| **Ficha técnica** | Documento técnico oficial que respalda prestaciones, condiciones y cifras; no es la URL editorial del producto |
| **Página pública del producto** | URL navegable de berel.com para el producto; se verifica en sitemap y contra soft-404 |
| **Producto de awareness** | Producto nuevo o de baja notoriedad que exige explicar primero su diferenciador e incluir el render oficial del empaque |

## Ciclo de producción

| Término | Qué es |
|---|---|
| **`Formato`** | Propiedad del Content Hub que decide estructura CMS: `Artículo` o `Tutorial`. No decide modalidad A/B |
| **Modalidad A · Reescritura** | La URL contiene artículo vivo (`title` + H1 + cuerpo). La arquitectura SEO se audita |
| **Modalidad B · Artículo nuevo** | No existe contenido vivo; incluye canónica planificada que todavía responde soft-404. La arquitectura SEO se decide antes de escribir |
| **Soft-404 Berel** | Ruta inexistente que responde HTTP 200 con shell vacío. Por eso HTTP 200 no prueba existencia |
| **`N##`** | Número continuo del artículo entre meses |
| **`N1…N4`** | Numeración de los cuatro banners dentro de un artículo; reinicia en cada pieza |
| **🔁** | Imagen base de adaptación social. Una sola por artículo |
| **Ficha de contenido** | Ficha de 13 campos para banner fotográfico |
| **Ficha de producción de infografía** | Ficha de 9 secciones + tabla modular para cualquier pieza que sea infografía |
| **Ficha visual contextual** | Especificación de un banner N1–N4 o foto de paso que acompaña el texto que representa y se copia literalmente a la tarea de diseño; es parte del entregable, no una nota interna |
| **Derivado social** | Pieza atomizada por canal; vive como subítem en Content Hub y subtarea en Tareas |
| **Toggle de evidencia** | Research, análisis SEO/AEO, análisis de contenido o Plan/Brief que documenta fuentes, método, hallazgos, limitaciones y decisiones; permanece en la página como prueba del trabajo y no forma parte de la narrativa editorial |
| **Registro privado sensible** | Credenciales, secretos, prompts, conversación cruda, datos restringidos u operación que no debe exponerse en el Content Hub |
| **Pendiente trazable** | Dato, URL, asset o capacidad CMS no confirmada; se documenta con fuente, impacto, owner y siguiente paso en evidencia, o en privado si es sensible; nunca se publica como hecho en la narrativa |
| **Verificación en la URL publicada** | Sección fechada que documenta lo comprobado contra HTML real |

## Formato Tutorial híbrido

| Término | Qué es |
|---|---|
| **Tutorial híbrido** | Versión de carga CMS que reestructura el V1 cuando `Formato = Tutorial`; no crea una segunda URL |
| **Una intención = una URL** | Regla anti-canibalización: no publicar artículo y tutorial separados para la misma keyword |
| **Versión vigente — Tutorial híbrido** | Única zona activa cuando `Formato = Tutorial`; la versión previa queda como historial |
| **Paso a Paso** | Estructura canónica de 4 pasos del template Tutorial actual |
| **Foto 📸 de paso** | Imagen 1:1 asociada a un paso. No es banner; su ficha contextual se conserva junto al paso y se replica en la tarea de secuencia |
| **Secuencia Paso a Paso** | Una sola tarea de diseño que agrupa las fotos del tutorial |
| **`N##_PASO-X`** | Nomenclatura de archivo de diseño para fotos de pasos |
| **`Tutorial Contenido`** | Bloque Drupal donde se montan Productos Berel, Materiales/Herramientas y Colores sugeridos |
| **Banners heredados** | Banners N1–N4 del V1 que se copian completos al híbrido, no como puntero |

## Sistema en Notion

| Término | Qué es |
|---|---|
| **📆 Content Hub** | Base de planificación editorial; contiene `Formato`, estado, enlace y relaciones |
| **Tareas** | Base de ejecución de artículos, banners, sociales y secuencia Tutorial |
| **Proyectos** | Contenedor mensual `Produccion Creativa - [Mes] [AA]` |
| **ítem principal / Subítem** | Jerarquía dentro de Content Hub |
| **Tarea principal / Subtareas** | Jerarquía dentro de Tareas |
| **`Artículo (Content Hub)`** | Relación que une ejecución con planificación |
| **`[GH] RpA v2`** | Writeback de Greenhouse; read-only desde Notion |
| **Encabezado desplegable** | Toggle usado para estructurar la página del artículo |
| **Zona editorial vigente** | Único toggle de artículo, reescritura o tutorial identificado para revisión; contiene metadatos aprobables, copy público y fichas visuales contextuales |
| **Superficie del cliente** | Toda página, toggle, callout, comentario o bloque accesible por Berel; ninguno se presume privado |
| **Nota interna de agente** | Prompt, chain-of-thought, mensaje entre agentes, QA operativo o instrucción ajena a la narrativa. Nunca vive dentro de la zona editorial; material sensible no vive en ningún punto de la página. No incluye toggles de evidencia ni fichas visuales contextuales |
| **Incidente centinela** | Una fuga interna detectada en la zona editorial que obliga a inventariar la página y revisar por completo ese toggle y sus callouts |
| **Canonización** | Normalización de formato que Notion aplica al guardar; obliga a releer antes de editar por texto |
| **Hilo de comentario** | Comentario inicial más todas sus respuestas; se evalúa completo, nunca desde una réplica aislada |
| **Atendido** | Estado operativo Efeonce: existe decisión, cambio cuando aplica, respuesta y readback fresco |
| **Resuelto** | Estado nativo que cierra el hilo en Notion; pertenece al cliente y no equivale a `atendido` |

## Voz y estructura editorial

| Término | Qué es |
|---|---|
| **Arco de cinco tiempos** | Gancho → respuesta directa → hilo conductor → desarrollo → cierre |
| **Micro-escena** | Apertura sensorial reconocible, sin dramatización excesiva |
| **Respuesta directa** | Cápsula extractable que responde la pregunta sin depender del resto |
| **Definición extractable** | Primera frase de sección que puede citarse sola |
| **Hilo conductor** | Criterio que ordena la pieza de principio a fin |
| **Una sección, una intención** | El contenido bajo un encabezado responde únicamente la pregunta que ese encabezado promete |
| **Costura / línea puente** | Transición que conecta un bloque reubicado con la sección anterior para que no se sienta insertado |
| **Regla anti-ingenio** | Claridad en primera lectura; si una frase compacta exige releerse, se redacta en llano |
| **Dosis del producto** | Control de cuánto y dónde aparece el producto |
| **CTA triple** | Explorar/calcular · comprar/ubicar · seguir leyendo |
| **Dos registros** | Inspiracional/editorial y técnico/tutorial |
| **Hub & spoke** | Pillar atemporal + páginas hijas específicas, con enlazado bidireccional |

## Enlaces y distribución

| Término | Qué es |
|---|---|
| **Ruta relativa CMS** | En handoff, enlace interno desde el primer `/` posterior a `.com`, con anchor descriptivo |
| **`/search?q=`** | Ruta bloqueada por robots; nunca se usa como destino editorial |
| **Familia de color** | Destino `/colores/<familia>` cuando no hay paleta/artículo más específico |
| **Instagram Story** | Formato vigente de Instagram para derivados Berel; no post estático |
| **Paridad social** | Tarea y subítem deben terminar con el mismo contenido/enlaces finales |
