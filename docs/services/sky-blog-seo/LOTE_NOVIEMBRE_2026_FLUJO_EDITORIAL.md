# Lote editorial de noviembre 2026 · Blog SKY

> **Tipo de documento:** Expediente de servicio (caso de lote editorial)
> **Versión:** 1.0
> **Creado:** 2026-11-05 por Claude (sesión «Research SEO/AEO Content Hub»), con las instrucciones de Julio Reyes
> **Método reutilizable:** [`references/lote-editorial.md`](../../../.claude/skills/sky-blog-seo-editorial/references/lote-editorial.md) de la skill `sky-blog-seo-editorial`
> **Paso a paso:** [Correr un lote editorial del Blog SKY](../../manual-de-uso/growth/correr-lote-editorial-blog-sky.md)
> **Imágenes y banners:** fuera de este documento; los gobierna la skill `sky-blog-graphic-line`

## Estado al 2026-11-05

| Qué | Estado |
| --- | --- |
| Research SEO/AEO | Hecho en los 54 artículos activos del Content Hub, al final de cada página de Notion |
| Redacción POV «El Viajero» | Hecha en los 54: una versión nueva al final de cada página, para revisión de Valentina Hoyos |
| Ficha SEO y metadatos | En los 54, dentro de cada versión |
| Callouts de imagen y banner | En los 54: 157 callouts de imagen y 54 de banner (44 listos, 10 bloqueados) |
| Specs para producción | 54 specs + índice, validadas contra los callouts |
| Estructura de la página | Desde el 06-11 cada ficha está plegada en secciones: callout de lectura, índice y toggles para Brief, Research, Artículo, Fuentes y Producción. Se ordenaron 44; cinco ya venían ordenadas ([norma](../../../.claude/skills/sky-blog-seo-editorial/references/lote-editorial.md)) |
| Revisión de Valentina | Pendiente |
| Aprobación de SKY | Pendiente; cuatro artículos ni siquiera tienen aprobación del tema |
| Publicación en WordPress | **Nada publicado.** No se envió nada a SKY |

Estado técnico: el contenido vive en Notion y los artefactos del lote fuera de Git, salvo el commit del
Workbench indicado en «Dónde vive cada cosa».

## Qué pidió Julio y en qué orden se hizo

1. **Research.** Julio pidió invocar las skills de SEO y AEO y crear el research de cada artículo del
   Content Hub: plan editorial para los nuevos, y para los existentes traer el texto publicado y analizar
   SEO, AEO y contenido para saber qué tomar al reescribir. A mitad de camino: «Con Semrush a ese volumen te
   quedarás sin cuota, haz el research con dataforseo».
2. **Redacción.** «¿Sabes cuál es el tono comunicacional de SKY, el POV del viajero? En Notion tenemos un
   playbook que lo detalla. Necesito que con eso redactes y/o reescribas cada artículo nuevo y/o existente»,
   con callouts de imagen. Al fijar el alcance respondió: «Portada + 2 escenas + Banner de ruta. Para las
   rutas debes ver en la base de Notion la ruta, las tenemos todas allí».
3. **Metadatos.** «En cada una debes dejar también sus metadatos y datos SEO: slug propuesto para artículos
   nuevos, meta descripción, meta title, extracto de máximo 250 caracteres, alt para imágenes».
4. **Specs.** «Vas a guardar cada spec de imágenes porque luego lo pasaremos a una peer session derivada».
5. **Banner.** La ruta va antes del titular y destaca más, porque «el título del artículo ya lo tendrá el
   mismo artículo». Regla aplicada: titular de máximo 6 palabras que no repite el H1.
6. **Producción.** El plan era abrir una sesión derivada con el 25 % listo. Julio preguntó «¿Y si produces
   tú las imágenes?» y la producción siguió en la misma sesión; está documentada aparte.

## Alcance

- **54 artículos activos** del Content Hub (teamspace «Sky Ariline - SEO+AEO», escrito así en Notion):
  32 nuevos y 22 sobre URL existentes.
- **Quedaron fuera 6 filas:** «Escala larga en Santiago» (archivada) y cinco que SKY rechazó (cambio de vuelo,
  mascota en cabina, errores con mascota, bebé y Cancún en 4 días).
- Mercado del lector: 32 Perú, 10 Chile, 7 Chile/Perú, 2 Chile/Argentina, 2 Perú/Chile y 1 Argentina.
- Versiones escritas: 40 v1, 12 v2 y 2 v3. Cada versión nueva quedó debajo de la anterior, que se conserva.

## Flujo que se ejecutó

| Fase | Qué se hizo | Evidencia |
| --- | --- | --- |
| Inventario | 54 filas con `Trabajo SEO`, mercado y URL existente | Lista del lote (`articles.py`) |
| Research | Un dossier por artículo con contenido publicado (WordPress REST), GSC/GA4 de la auditoría, Semrush parcial, SERP y Labs de DataForSEO, y canibalización. Seis forks escribieron la sección «🔎 Research SEO/AEO · 05-11-2026» al final de cada página | Cobertura comprobada en Notion: 50 páginas en una búsqueda y 4 una por una |
| Pauta y piloto | Pauta de redacción del lote sobre el Playbook; piloto completo en Zorritos (cuatro inserciones) y ajustes obligatorios tras el piloto | Pauta `BRIEF.md` §10 |
| Redacción | Nueve lotes temáticos en paralelo (53 artículos) que replicaron el piloto | Cada lote volvió a leer sus páginas tras insertar |
| QA | Revisión del borrador antes de insertar y conteo de marcadores en Notion después | Scripts `qa.py` y `verify*.py` |
| Specs | Copia literal de los callouts a `specs/<id>.json`, índice `MANIFEST.json` | Regeneradas y validadas al cierre |
| Handoff | Brief de producción, prompt de sesión y notas por lote | `PRODUCTION_BRIEF.md`, `PROMPT_SESION_PRODUCCION.md`, `NOTAS_LOTES.md` |

**Datos del research.** DataForSEO: 57 SERP de Google móvil (Perú, Chile y Argentina) con AI Overview y
preguntas de la SERP, más tres corridas de keywords relacionadas; costo total USD 1,61. Semrush: volúmenes y
posiciones de las URL existentes, unas 11.000 unidades API antes de cambiar de proveedor. Search Console no se
consultó en vivo: traer las credenciales de producción quedó bloqueado por el sistema y se usaron los exportes
de la auditoría del 23-10 y de septiembre de 2026. Los volúmenes son estimaciones de mercado; los clics de
Search Console son datos propios.

## Cómo quedó cada artículo en Notion

Al final de la página, debajo del research:

1. Encabezado `✍️ Artículo vN · 05/11/2026 · POV «El Viajero»` y un callout 🎥 con Trabajo SEO, mercado e
   intensidad del «yo».
2. **Ficha SEO y metadatos** (uso interno): keyword principal y variantes, H1, meta title (máximo 60
   caracteres), meta description (140–155), slug propuesto o URL existente, canónica, extracto (máximo 250),
   categoría y etiquetas, OG title y description, imagen destacada, ALT de cada imagen y del banner, resumen
   del JSON-LD con el código en un bloque aparte, enlaces internos, 301 propuestos, mercado, intensidad,
   Trabajo SEO y fecha. Los conteos de caracteres se calcularon.
3. El artículo con la estructura del Playbook: callout de portada, gancho, TL;DR de 40–60 palabras, bloques
   con «Datos para planificar», tabla por perfil, al menos cuatro H2 en pregunta, errores, «Lo que tienes que
   saber antes de viajar», callout del banner, FAQ de 5–7 preguntas, cierre con «Está bueno SKY.» una sola
   vez y firma `Por Equipo editorial del Blog SKY · Actualizado: 05/11/2026`.
4. Fuera del cuerpo: «Fuentes (uso interno)», callouts rojos de hallazgos con dueño, toggle de imágenes y, en
   reescrituras, toggle «Qué se cambió en esta versión».

Los callouts 🖼️ y 🎫 son instrucciones de producción y se borran al publicar. Lo no verificable quedó como
`[Pendiente antes de publicar: …]`.

## Esquema de las specs

Una spec por artículo (`specs/<id>.json`), copia literal de los callouts. Si difiere de Notion, manda el
callout. Esquema completo en `SCHEMA.md` del paquete.

| Bloque | Campos |
| --- | --- |
| Artículo | `id`, `notion_url`, `titulo`, `slug`, `mercado`, `version`, `descartes[]` |
| `imagenes[]` | `pieza`, `rol` (portada o escena), `posicion`, `pregunta`, `tipo`, `modificadores`, `registro` (D o E), `archivo`, `formato`, `lazy`, `alt`, `que_muestra`, `hora_clima`, `personas`, `primer_plano`, `ancla_pov`, `no[]`, `fidelidad`, `reutilizacion` (sólo portada) |
| `banner` | `pieza`, `estado` (listo o bloqueado), `motivo_bloqueo`, `receta`, `origen` y `destino` (IATA + ciudad), `home_market`, `url`, `ruta_verificada_el`, `fuente`, `titular`, `cta`, `archivo`, `alt`, `posicion` |

`MANIFEST.json` resume el lote: 54 artículos, 157 imágenes (las cinco noticias llevan dos), banners 44
listos y 10 bloqueados, con titular, ruta y motivo de bloqueo por artículo.

## Qué quedó bloqueado y por qué

**Banners bloqueados (10).** Un banner sólo se produce con una ruta 🟢 Activa del mercado del lector en
«Precios y Rutas SKY». Si no la hay, el callout queda escrito con su motivo y un callout rojo para Paid / Ad Ops.

| Artículos | Motivo |
| --- | --- |
| Cajamarca, Carnaval de Cajamarca, Cumbemayo | Lima–Cajamarca no está catalogada para Perú |
| Chiclayo | Lima–Chiclayo no está catalogada |
| Talara, noticia de Talara | Lima–Talara no está catalogada |
| Lima en 3 días | Santiago–Lima no tiene fila para el mercado Chile |
| Cancún | Todas las rutas a Cancún están archivadas |
| Puntualidad Chile y Perú | La puntualidad se mide sobre toda la operación y la nota no lleva llamado de venta |

**Artículos sin aprobación de SKY (4):** Ayacucho, equipaje de bodega, equipaje de mano y Colán. Están
redactados, pero no generan tareas de diseño ni se producen hasta que SKY apruebe.

## Decisiones y datos pendientes

| Tema | Qué falta | Dueño |
| --- | --- | --- |
| `Trabajo SEO` mal cargado | Ocho fichas «Nuevo» ya tienen URL publicada (Catacaos, Iquitos, Perú en diciembre, Lima en 3 días, Chiclayo, manglar, viajar con amigos y mal de altura). No se cambió la propiedad: se preguntó a Julio | Julio / Valentina |
| Peso del equipaje de mano | 10 kg o 12 kg: las fuentes de SKY se contradicen; los artículos de equipaje lo dejan pendiente | SKY / Producto-SAC |
| Líquidos | El Centro de Ayuda se contradice en vuelos nacionales y en aerosoles | Producto-SAC |
| Catálogo de rutas | Faltan Lima–Talara, Lima–Chiclayo, Lima–Cajamarca, Santiago–Cusco y Santiago–Lima (Chile). El catálogo no se edita desde mayo de 2026. Lima–São Paulo figura archivada, pero el blog del 31/08/2026 dice que SKY la opera | Paid / Ad Ops |
| Check-in | Elegir la URL principal entre `/que-es-el-check-in/` y `/check-in-automatico/` | Julio |
| Noticias | Puntualidad: junio y septiembre sólo tienen respaldo en medios. GOL: anuncio del 26/10/2026 sin comunicado oficial | Redacción / SKY |
| Fechas oficiales | Carnaval de Cajamarca y Candelaria 2027, plan de Año Nuevo en Santiago 2026-27, feriados de diciembre en Perú | Redacción, al publicarse |
| Cena navideña peruana | Publicar antes del 15/11 | Valentina |
| Viajar con niños en Perú | Estado «Bloqueado» con aprobación «Aprobado» y sin motivo escrito | Valentina |
| Cancún | Confirmar si sigue siendo prioridad | Natalia (SKY) |

El detalle por lote (imágenes ya producidas que no se regeneran, adjuntos cruzados, correcciones a textos
publicados, 301 propuestos) está en `NOTAS_LOTES.md`.

La producción de imágenes que siguió a este handoff (banners, portadas y escenas, con sus bloqueos, costos y
pendientes) está en [LOTE_NOVIEMBRE_2026_PRODUCCION_IMAGENES.md](LOTE_NOVIEMBRE_2026_PRODUCCION_IMAGENES.md).

## Restricciones que se respetaron

- No se cambiaron propiedades del Content Hub ni se crearon tareas o páginas.
- No se publicó en WordPress, no se ejecutaron 301 y no se envió nada a SKY.
- Ninguna ruta fuera de «Precios y Rutas SKY»; ninguna cifra sin fuente; español neutro sin voseo.
- Los callouts de imagen prohíben aviones, cabinas y uniformes SKY; la IMG 2 ya producida de equipaje de mano,
  que muestra una cabina, quedó para archivar. Para la producción visual rige además la decisión
  de Julio del 05-11 de no usar Nano Banana Pro.

## Dónde vive cada cosa

| Artefacto | Ubicación |
| --- | --- |
| Research, artículos, fichas y callouts | Notion, al final de cada página del Content Hub |
| Playbook | [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e) |
| Rutas | [Precios y Rutas SKY](https://app.notion.com/p/c6bcd3d717794691b706befbc25c4b74) |
| Specs, brief y notas | `ai-generations/2026-11-05_sky-blog-lote/specs/` (sin versionar) y Creative Workbench `projects/sky/blog-lote-2026-11/specs/` (commit `b81e0df` en la rama `claude/sky-blog-visual-system`, sin push al 05-11) |
| Dossiers, pauta, borradores y scripts | Scratchpad de la sesión del 05-11. Es temporal y no está versionado: antes del próximo lote hay que llevar los scripts a un lugar gobernado |

## Medición

Se mide contra el mismo mes del año anterior y con una foto T−28 congelada antes de publicar, como fija el
[marco del servicio](README.md#medición-y-baseline). Ningún artículo de este lote tiene todavía fecha de
publicación.
