# Berel — conteo real de piezas de septiembre 2026 contra contrato — Auditoría 2026-09-19

## Estado

- Tipo: auditoría de cliente, conteo de la producción del mes contra el cupo contractual. Solo lectura.
- Cliente: **Berel** (`berel.com`). Efeonce produce el contenido; Berel publica mediante su proveedor web.
- Fecha de corte: 2026-09-19 · Versión 1.0.
- Resultado: el mes vive en un solo proyecto, `Produccion Creativa - Septiembre 26`, con **118 tareas**
  (12 principales editoriales y 106 piezas visuales). **Artículos 12 contra 8 (+4)**. **Gráficas, contadas por archivo:
  90 entregables contra 50 (+40)**. **Videos: 10 entregables contra 3 (+7)**. El operador decidió que el excedente
  **se descuenta de los meses siguientes**.
- No acredita: que Berel haya aceptado ese descuento, que las piezas cumplan la extensión contractual, que existan los
  archivos que no se encontraron ni que se hayan corregido las etiquetas de Notion. **No se editó nada** en Notion,
  SharePoint ni Frame.io.
- Documentos hermanos: [Colores de Temporada 2027](BEREL_COLORES_DE_TEMPORADA_2027_2026-09-16.md) (deltas del
  19-sep) · [Clasificación de tareas y conteo de piezas](BEREL_PIECE_COUNT_CLASSIFICATION_2026-09-03.md) ·
  [Numeración editorial](BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
- Canon del contrato y de la unidad de conteo: módulo 15 de la skill
  [`berel-content-production`](../../../.claude/skills/berel-content-production/modules/15_DISTRIBUCION_SELECTIVA.md)
  (§Capacidad y conteo). Este documento lo aplica a un mes; no lo modifica.
- Convención de evidencia: **OBSERVADO** = lectura directa de Notion, SharePoint, Frame.io o Teams en la fecha de
  corte; **INFERIDO** = deducción declarada que no se verificó contra el archivo. **MEDIDO** no aplica: este documento
  no usa Search Console ni GA4. Una cifra «según Notion» es OBSERVADA sobre la propiedad de la tarea, **no** sobre el
  archivo; por eso cada total indica si tiene archivo verificado. Caduca: el conteo cambia con cada entrega, tarea o
  corrección de etiquetas; revalidar antes de reutilizarlo.

## 1. Regla de conteo

- **Cupo contractual** (módulo 15, informado por el operador el 2026-09-03): **8 artículos al mes · 50 piezas
  gráficas al mes, blog y redes sociales incluidos · 3 videos cortos al mes, contados aparte**.
- **Unidad: el archivo.** El propio operador contó por archivo en la asignación aprobada de noviembre (32 banners, 4
  fotos de N50 y 14 gráficas sociales suman 50). El conteo principal va por archivo; también se muestra por tarea,
  que es la unidad del rollup de Notion. Una secuencia de 4 fotos es 1 tarea y 4 archivos. Las Stories entregadas son
  1 PNG por artículo.
- **Cuatro criterios**, porque cada uno responde otra pregunta:
  - *Producidas por el equipo al cierre*: en uso + entregadas que no se usarán + comprometidas sin empezar. Mide el
    esfuerzo del mes.
  - *Entregables al cliente al cierre*: en uso + pendientes; la versión v2 reemplaza a la original. Es la cifra
    contractual.
  - *Entregadas y en uso hoy*: lo que ya está en manos del cliente y se va a usar.
  - *Piso verificado*: solo lo que tiene archivo encontrado. Es el mínimo defendible.
- El material de marca de Berel (banner principal del Color del Año y masters de las paletas 2027) **no cuenta**: no hay
  tareas ni archivos de Efeonce para ese material.

## 2. Fuentes y cobertura (OBSERVADO)

| Fuente | Qué se leyó | Resultado |
|---|---|---|
| Notion `Proyectos` | proyectos con «Septiembre» o fechas en 2026-09 | **uno solo**: `Produccion Creativa - Septiembre 26`, todavía en estado `Planificación` |
| Notion `Tareas` | las 118 tareas con `Proyecto` = septiembre (SQL paginado, 100 + 18) | 12 principales y 106 subtareas visuales. Ninguna tarea de estos 12 artículos queda fuera del proyecto |
| SharePoint `Berel-Efeonce / Squad Berel / Workspace Oficial / 04_Entregables / 04. Articulos Septiembre` | listado archivo por archivo de las 9 carpetas N25–N34 | entrega real de N25–N34. **No hay carpeta de N28, N60 ni N61** |
| Frame.io | N28 `r6p_WB-8`, N60 `4pzeKPE6`, N61 `efRQ0F39` y tres enlaces compartidos del 02-sep | 6 archivos por artículo (2 banners + post, story, pin y reel), subidos el 16 y 17 de septiembre, estado «Aprobación interna» |
| Teams (canales interno y compartido de Berel) | mensajes con enlaces de Frame.io del 25-ago al 19-sep | aprobación de Berel del 08-sep; reemplazo de la infografía de pasos por fotos (02-sep) |

Las fórmulas y rollups de Notion (`Piezas Totales` y afines) no son legibles por el conector: el conteo se reconstruye
desde las propiedades. La reconstrucción del rollup da `Tipo de pieza` informado en **102** tareas (88 estáticas y 14
videos; 48 de blog y 54 de redes). **Ese 102 no es el número real** (§7).

## 3. Artículos (OBSERVADO)

| N | Tarea | Formato | Modalidad | Estado de la tarea | Content Hub | Publicación |
|---|---|---|---|---|---|---|
| N25 | Renueva tu Sala con Kalos Tone y Multitono Pro | Artículo | Reescritura | Listo | Publicado | 09-sep |
| N26 | 5 Errores al Pintar | Artículo | Reescritura | Listo | En feedback | 17-sep |
| N27 | Color y Resistencia para tus Exteriores | Artículo | Reescritura | Listo | Publicado | 15-sep |
| N28 | Color del Año 2027 — Bien y de Buenas | Artículo | Nuevo | Listo para revisión | En revisión (V2) | 29-sep |
| N29 | Cómo pintar tu cocina | Tutorial | Nuevo | Listo | Publicado | 12-sep |
| N30 | Cómo pintar tu recámara | Tutorial | Nuevo | Listo | En revisión | 26-sep |
| N31 | Cómo pintar tu sala y sala-comedor | Artículo (tarea de fotos: Tutorial) | Nuevo | Listo | En feedback | 03-oct |
| N32 | Cómo pintar un piso de cemento | Artículo | Nuevo | Listo | En feedback | 03-oct |
| N33 | Cómo pintar herrería | Tutorial | Nuevo | Listo | Publicado | 21-sep |
| N34 | Colores de Temporada (pillar 2026) | Artículo | Reescritura (completada el 31-ago) | Listo | Publicado | 20-sep |
| N60 | Colores de Temporada 2027 — Raíces de la piel | Artículo | Nuevo | Listo para revisión | En revisión (V2) | 29-sep |
| N61 | Colores de Temporada Berel 2027 (hub) | Artículo | Nuevo | Listo para revisión | En revisión (V2) | 29-sep |

- **Total: 12 artículos contra 8, excedente de 4** (8 nuevos y 4 reescrituras). Sin N34, que se cerró el 31 de agosto
  dentro del proyecto de septiembre: 11, excedente de 3.
- Una cifra anterior de «9 artículos en el proyecto» no se reproduce con ninguna regla (ni por modalidad ni por fecha)
  y queda descartada.
- Fuera del conteo: 3 artículos del proyecto de **agosto** se publican en septiembre (impermeabilizante el 05-sep, moho
  y salitre el 19-sep, pintura y barniz para madera el 23-sep). Son producción de agosto.
- Nota contractual: las V2 de N28, N60 y N61 rondan 1.120–1.430 palabras
  ([auditoría del 16-sep](BEREL_COLORES_DE_TEMPORADA_2027_2026-09-16.md)), por debajo de las 3.000–5.000 del contrato.

## 4. Gráficas y videos por artículo

Leyenda: T = tareas en Notion; A-N = archivos según Notion; A-SP = archivos verificados en SharePoint.

### N25–N34 (todas las tareas en `Listo`)

Berel aprobó el 08-sep (Teams): todo lo demás quedó aprobado y se estaba subiendo a la carpeta de entregables.

| Art. | Banners T / A-SP | Fotos de paso T (A-N) / A-SP | Sociales estáticos T / A-SP | Reel T / A-SP | Gráficas A-N | Gráficas A-SP | Hallazgo |
|---|---|---|---|---|---|---|---|
| N25 | 4 / 4 | — | 3 (FB, post IG, Pin) / 2 (Pin, Story) | 1 / 1 | 7 | 6 | falta el post FB/IG en SharePoint; sociales con `Canal = Blog` |
| N26 | 4 / 4 | — | 2 (post IG, FB) / 2 (post, Story) | — | 6 | 6 | sin Pin ni Reel (no hubo tareas) |
| N27 | 4 / 4 | — | 3 / 3 (Pin, post, Story) | 1 / 1 | 7 | 7 | — |
| N29 | 4 / 3 | 1 (4) / 4 | 3 / 3 | 1 / 1 | 11 | 10 | falta el banner N2 (infografía); la tarea 438 (N3) no tiene etiquetas |
| N30 | 4 / 3 | 1 (4) / **0** | 3 / 3 | 1 / 1 | 11 | 6 | falta N2 (infografía; tarea 445 sin etiquetas); la carpeta PASOS contiene **5 fotos de N38** |
| N31 | 4 / 4 | 1 (4) / **0** | 3 / 3 | 1 / 1 | 11 | 7 | sin carpeta de pasos; tarea 620 sin etiquetas y en conflicto Tutorial/Artículo |
| N32 | 4 / 3 | — | 3 / **0** | 1 / **0** | 7 | 3 | la carpeta SOCIAL MEDIA contiene archivos de **N23** (agosto); la tarea principal aún dice «(Pendiente Socials)» |
| N33 | 4 / 4 | 1 (4) / 4 | 3 / 2 (post, Story) | 1 / 1 | 11 | 10 | falta el Pin; tarea 461 (N2) sin etiquetas; el 08-sep se agregó un cierre nuevo y el original pasó a portada |
| N34 | 4 / 2 | — | 3 archivadas / 0 | 1 archivada / 0 | 4 | 2 | en SharePoint solo cierre y didáctico; las 4 sociales `Archivadas` siguen etiquetadas |
| **Suma** | 36 / 31 | 4 (16) / 8 | 23 activas / 18 | 7 / 6 | **75** | **57** | |

### N28, N60 y N61 (campaña 2027; ninguno tiene carpeta de entregables todavía)

| Art. | Banners | Derivados originales (Frame.io) | Derivados v2 | Estado |
|---|---|---|---|---|
| N28 | N1 portada (738) y N4 cierre (735) entregados y **sin uso**; N2 luces (739) y N3 acabados (740) **sin empezar** | post, Story, Pin y Reel (736, 741, 742, 737), **sin uso** | FB, Story, Pin y Reel (744–747), sin empezar | 2 + 3 + 1 entregados sin uso; 2 + 3 + 1 comprometidos |
| N60 | N1 (723) y N4 (724) entregados y **en uso** | post, Story, Pin y Reel (725, 743, 726, 733), **sin uso** | 748–751, sin empezar | N2 y N3 no existen por decisión: Berel entrega los masters |
| N61 | N1 (729) y N4 (730) entregados y **en uso** (N4 con 1 comentario en Frame.io) | post, Story, Pin y Reel (728, 731, 732, 734), **sin uso** | 752–755, sin empezar | igual que N60 |

- Frame.io verificado: 18 archivos (6 por artículo). Las carpetas «Social Media» de N60 y N61 dicen «5 Items» y muestran
  4 archivos; se cuentan 4 (probable pila de versiones, INFERIDO).
- Los derivados originales no se usan porque el arte entregado son renders de ambientes que no usan la base vigente
  (luces N2 en el Color del Año; masters en el hub y en Raíces). Las tareas v2 los rehacen; las originales se conservan.
- Las tareas 741–743 se crearon para piezas que se entregaron sin tarea (Story y Pin de N28; Story de N60).

## 5. Totales de gráficas (cupo 50)

| Estado | Tareas | Archivos (Notion) | Archivos verificados |
|---|---:|---:|---:|
| Entregadas y en uso (N25–N34 + banners de N60 y N61) | 67 | 79 | 61 (57 en SharePoint + 4 en Frame.io) |
| Entregadas que **no se usarán** (N1 y N4 de N28 + 9 derivados estáticos originales) | 11 | 11 | 11 (Frame.io) |
| En curso | 0 | 0 | — |
| Sin empezar (N2 y N3 de N28 + 9 derivados estáticos v2) | 11 | 11 | — |
| Archivadas de N34 (no producidas; excluidas) | 3 | 0 | 0 |

| Criterio | Tareas | Excedente | Archivos | Excedente |
|---|---:|---:|---:|---:|
| **Producidas por el equipo al cierre del mes** | 89 | +39 | **101** | **+51** |
| Producidas a la fecha (sin las que no se han empezado) | 78 | +28 | 90 | +40 |
| **Entregables al cliente al cierre** (cifra contractual) | 78 | +28 | **90** | **+40** |
| Entregadas y en uso hoy | 67 | +17 | 79 | +29 |
| Piso verificado con archivo, en uso | — | — | 61 | +11 |

Sensibilidad: sin N34, restar 4 tareas y 4 archivos según Notion (2 verificados). Aun con el criterio más conservador y
sin N34, el mes queda sobre 50: 59 archivos verificados, excedente de 9.

## 6. Videos (cupo 3)

| Estado | Cantidad |
|---|---:|
| Reels entregados y en uso: N25, N27, N29, N30, N31, N32 y N33 | 7 (6 verificados en SharePoint; N32 no) |
| Reels originales de N28, N60 y N61 que no se usarán (Frame.io) | 3 |
| Reels v2 sin empezar | 3 |
| Reel de N34 archivado | 1 (excluido) |

Producidos al cierre: 13, excedente de 10. **Entregables al cierre: 10, excedente de 7.** Verificados en uso: 6,
excedente de 3.

## 7. Resumen contra contrato

| Línea | Cupo | Cifra contractual | Excedente | Otros criterios |
|---|---:|---:|---:|---|
| Artículos | 8 | 12 | **+4** | sin N34: 11 (+3) |
| Gráficas (por archivo) | 50 | 90 entregables | **+40** | producidas 101 (+51) · en uso hoy 79 (+29) · piso verificado 61 (+11) |
| Videos | 3 | 10 entregables | **+7** | producidos 13 (+10) · verificados en uso 6 (+3) |

**Decisión del operador:** el excedente se descuenta de los meses siguientes. Registrarlo frente a Berel y reflejarlo en
el cupo de los meses que absorben el saldo es trabajo pendiente; este documento no lo acredita.

## 8. Hallazgos de datos (no corregidos)

1. Cuatro piezas visuales sin `Tipo de pieza` ni `Canal de pieza`: 438, 445, 461 y 620. El rollup se queda corto.
2. Cuatro tareas `Archivadas` de N34 (428, 429, 431 y 432) conservan sus etiquetas. El rollup suma de más 3 estáticos y
   1 video.
3. Sociales de N25 (413, 415, 417 y 420) con `Canal de pieza = Blog` en vez de redes sociales.
4. La tarea 733 (Reel de N60) tiene `Tipo de entregable = Diseño gráfico`.
5. SharePoint con archivos fuera de lugar: `N30/PASOS` contiene fotos de N38 y `N32/SOCIAL MEDIA` contiene archivos de
   N23.
6. El proyecto de septiembre sigue en `Planificación` con la producción terminada; la tarea principal de N32 aún dice
   «(Pendiente Socials)».
7. Teams 02-sep: la infografía de pasos de N29, N30 y N33 se reemplazó por fotos de paso (enlaces `N29_BN_DIDACTICO`,
   `N30_BN_DIDACTICO` y `N33_BN_INFOGRFIA`). SharePoint no tiene el N2 de N29 ni el de N30: es posible que el arte se
   haya hecho y no se usara. No se verificó cuál pieza quedó fuera.
8. Las tareas 416 y 419 no existen en la base (probablemente se borraron). No afectan el conteo.

Mientras estos puntos sigan abiertos, **el rollup de Notion no sirve para contar contra contrato**: el conteo se
reconstruye desde las propiedades y se contrasta con los archivos.

## 9. Verificado e inferido

- **OBSERVADO:** 12 artículos y 118 tareas (Notion); 57 gráficas y 6 reels de N25–N34 en SharePoint; 18 archivos de
  N28, N60 y N61 en Frame.io; aprobación de Berel del 08-sep (Teams).
- **INFERIDO o no verificado:** que existan las 18 gráficas de N25–N34 que no aparecen en SharePoint (tareas en `Listo`
  sin archivo encontrado: fotos de N30 y N31, sociales y un banner de N32, N2 de N29 y N30, Pin de N33, post de N25, N1
  y N2 de N34); que los «5 Items» de Frame.io sean versiones; que los posts de efemérides que aparecen en el Frame.io
  compartido sean de otro cliente y no de Berel; si N34 se imputa a agosto o a septiembre.

## 10. Límites

- Una ausencia en un listado no prueba que el archivo no exista: Frame.io anida carpetas «Social Media» y SharePoint
  tiene archivos fuera de lugar (§8). Antes de cancelar o descontar una pieza por «archivo inexistente», abrir las
  subcarpetas y preguntar al equipo dueño. En esta misma campaña se canceló por error el Reel de N61 (tarea 734) y hubo
  que revertirlo.
- Los rollups de Notion no se leyeron evaluados (el conector no expone su resultado): la cifra de 102 es una
  reconstrucción desde propiedades.
- El descuento del excedente es una decisión interna del operador; la aceptación de Berel no se leyó.
- La extensión de los artículos, los servicios que no son piezas (SEO técnico, AEO, Digital PR, link building) y el
  reporting quedan fuera de este conteo.
