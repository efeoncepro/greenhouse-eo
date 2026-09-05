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
| **Derivado social** | Pieza atomizada por canal; vive como subítem en Content Hub y subtarea en Tareas |
| **Callout de procedencia** | Explica fuentes, análisis y convenciones que originan el V1/híbrido |
| **Callout de pendientes ⚠️** | Cierre obligatorio con todo dato/URL/asset/capacidad CMS no confirmada |
| **Verificación en la URL publicada** | Sección fechada que documenta lo comprobado contra HTML real |

## Formato Tutorial híbrido

| Término | Qué es |
|---|---|
| **Tutorial híbrido** | Versión de carga CMS que reestructura el V1 cuando `Formato = Tutorial`; no crea una segunda URL |
| **Una intención = una URL** | Regla anti-canibalización: no publicar artículo y tutorial separados para la misma keyword |
| **`🔁 Reescritura en formato Tutorial (híbrido)`** | Toggle final dentro de la misma página del Content Hub |
| **Paso a Paso** | Estructura canónica de 4 pasos del template Tutorial actual |
| **Foto 📸 de paso** | Imagen 1:1 asociada a un paso. No es banner |
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
| **Canonización** | Normalización de formato que Notion aplica al guardar; obliga a releer antes de editar por texto |

## Voz y estructura editorial

| Término | Qué es |
|---|---|
| **Arco de cinco tiempos** | Gancho → respuesta directa → hilo conductor → desarrollo → cierre |
| **Micro-escena** | Apertura sensorial reconocible, sin dramatización excesiva |
| **Respuesta directa** | Cápsula extractable que responde la pregunta sin depender del resto |
| **Definición extractable** | Primera frase de sección que puede citarse sola |
| **Hilo conductor** | Criterio que ordena la pieza de principio a fin |
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
