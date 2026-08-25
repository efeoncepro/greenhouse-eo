# Berel — Color del Año 2027 "Bien y de Buenas": research, ángulo y plan de lanzamiento — Auditoría 2026-08-25

## Estado

- Tipo: auditoría de cliente — research de una **pieza-hito anual** (color del año), su ángulo editorial, su mapa competitivo y su plan de lanzamiento
- Cliente: **Berel** (`berel.com`), fabricante mexicano de pintura arquitectónica. Efeonce le opera el blog.
- Fecha: 2026-08-25 · Versión: 1.0
- Scope: el material del cliente y su cobertura, la decisión de ángulo, el mapa competitivo de "color del año" en México, el calendario del ciclo 2027, la demanda medida de la familia cromática, el estado de enlaces y de prensa, la deuda técnica de rutas que toca el lanzamiento, la convención de assets y el modelo de canal, el entregable y sus bloqueantes
- Método: PDF del racional del cliente (OneDrive del Squad) · DataForSEO (volúmenes base MX y backlinks, consultas del 2026-08-25 con costo registrado) · Search Console `sc-domain:berel.com` vía la conexión de Greenhouse · inspección directa de HTML con `curl`/fetch sobre `berel.com` y sobre los sitios de la categoría · `datePublished` de JSON-LD y datelines de comunicados como fuente primaria de fechas · Notion (Content Hub de Berel) · Teams (confirmaciones del operador)
- Verdict: **la categoría entera está vacía de contenido y la ventana del ciclo 2027 está abierta hoy.** Berel tiene el mejor activo técnico de la categoría en México y, aun así, **no tiene un solo enlace editorial** y **su hito anual nunca ha generado una nota de prensa mexicana fechada**. El trabajo del 2027 no es escribir mejor: es dejar de lanzar al vacío y llegar antes que Comex.
- Relación con el diagnóstico general: este documento es **hermano** de [`BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](BEREL_SEO_DIAGNOSTIC_2026-08-25.md), no lo reemplaza. Aquel documenta la línea base del dominio, la arquitectura del sitio y los cinco briefs de espacios (N29–N33). Este documenta **una sola pieza** —el slot N28— porque tiene research competitivo propio, calendario propio con fecha de caducidad, plan de PR y plan de distribución que ninguna otra pieza del ciclo tiene.
- Documento interno de Efeonce sobre un cliente. **No es una propuesta comercial** y no está redactado para entregarse al cliente tal cual.

> ## Convención de evidencia — leer antes de citar cualquier cifra
>
> Este documento usa **cinco** marcas. Son tres más de las que usa el diagnóstico general, porque acá hay
> fechas de mercado y afirmaciones de terceros que no se pudieron verificar de primera fuente.
>
> | Marca | Fuente | Qué significa |
> |---|---|---|
> | **MEDIDO** | Search Console (`sc-domain:berel.com`) o consulta directa a la API de DataForSEO, con fecha y costo registrados | Una medición. Las dos no son la misma cosa: Search Console es dato propio de la propiedad; DataForSEO es el índice de un proveedor, medido pero de terceros. Cada línea declara cuál de las dos. |
> | **ESTIMADO** | Semrush base `mx` | Modelo de terceros. Cuando en este documento un dato ESTIMADO de Semrush choca con uno MEDIDO por DataForSEO, **manda el MEDIDO** y la corrección queda escrita. |
> | **OBSERVADO** | HTML en vivo, SERP en vivo, `datePublished` del JSON-LD, dateline de un comunicado | Una foto de un momento. No es serie ni promedio. |
> | **INFERIDO** | Deducción sobre datos observados | La conclusión no se observó; se dedujo. Se declara sobre qué. |
> | **REPORTADO** | Un tercero lo afirma y no se pudo verificar de primera fuente | No es un hecho verificado. No se presenta como tal, ni al cliente ni en el brief. |
>
> **Regla de uso.** Este research documenta el estado del 2026-08-25 y **caduca por diseño**: el calendario
> del ciclo 2027 (§5) cambia cada vez que una marca anuncia, y el claim diferenciador de §5.3 **deja de ser
> verdad** en cuanto Comex publique. Revalidar antes de consumir cualquier cifra o cualquier claim.

**Dónde vive lo que este documento no es dueño de definir:** el oficio de SEO/AEO vive en la skill `seo-aeo`; el uso comercial en `seo-aeo-practice`; la línea base del dominio, la arquitectura del sitio y el backlog de striking distance viven en el [diagnóstico general](BEREL_SEO_DIAGNOSTIC_2026-08-25.md). La metodología agnóstica al cliente que salió de esta sesión —cómo se trata una pieza-hito anual en cualquier cuenta— se documenta por separado; **acá está la evidencia del caso**, no la doctrina.

---

## 1. Resumen ejecutivo

El cliente entregó el racional del **Color del Año 2027: "Bien y de Buenas", código Berel `1-3404D`** — un tono tierra cálido con matices rojizos. El material trae la **capa editorial completa** (concepto, escenario cultural, ocho conceptos clave, moodboard) y **no trae capa técnica**: ni acabados, ni rendimiento, ni base, ni en qué línea vive el color.

Tres hallazgos reordenaron el planteo:

1. **El competidor más peligroso era una pieza propia.** `/articulos/paleta-calidez-vibrante`, publicada cinco semanas antes, ya tiene un H2 llamado "Terracota y tonos tierra" y usa "arraigo", que es uno de los ocho conceptos literales del racional 2027. El artículo del terracota ya existe y lo escribió Berel.
2. **Alguien más publicó la tesis primero, y no es competidor de categoría.** Trendo.mx anunció "Sana Sana" el 31-jul-2026 con el mismo mecanismo (modismo mexicano) y la misma tesis (bienestar cotidiano). Berel **no puede presentar ese concepto como hallazgo propio**. El consuelo es que la página de Trendo tiene 77 palabras y cero JSON-LD: ganaron narrativa, **no** ganan búsqueda.
3. **La salida es hospitalidad.** Es el eje más distintivo del racional del cliente —"una mesa compartida… una casa abierta"— y **nadie lo ocupa**: ni Trendo (fue por indulgencia individual), ni Calidez Vibrante (fue por el tono), ni el color 2025 (fue por raíces y sol).

Sobre eso, el diagnóstico duro: **la categoría entera está vacía de contenido**. Ninguna marca en México tiene una URL de color del año que ranquee y tenga contenido de verdad. Comex —el único competidor real— tiene una ficha de **una frase**, sin JSON-LD, **todavía mostrando el color 2025**. Berel tiene el mejor activo técnico de la categoría (JSON-LD, `llms.txt` vivo, allowlist explícita de ocho bots de IA, sitemap index) y aun así **no tiene un solo enlace editorial** y **su anuncio del color 2025 no generó ninguna nota de prensa mexicana fechada**, mientras Comex tuvo cuatro medios el mismo ciclo. El problema de Berel no es el activo: es autoridad, enlaces y prensa.

Y hay una deuda técnica que es bloqueante: **`/articulos/color-berel-2027` y `/color-berel-2027` ya devuelven HTTP 200 con título vacío**. Si Google descubre el destino antes de publicar, lo indexa vacío.

---

## 2. El color y el material del cliente

### 2.1 Qué entregó el cliente

Fuente: `Racional Color del Año 2027.pdf`, subido por Maria Fernanda Vega Sanchez el **2026-08-24 18:28** a OneDrive `Berel - Efeonce - Squad Berel/Workspace Oficial/02_Recursos/`. Confirmado por Teams el 2026-08-24 22:25 y 22:29. Todo lo de esta sección es **textual del PDF** (OBSERVADO).

| Elemento | Contenido |
|---|---|
| Nombre | **"Bien y de Buenas"** |
| Código Berel | **`1-3404D`** |
| Descripción cromática | "tono tierra cálido con matices rojizos, de saturación moderada", que "evoca la arcilla, los pigmentos naturales y la tierra iluminada por la luz cálida del sol" |
| Concepto de inspiración | "La tierra representa nuestras raíces, identidad y sentido de pertenencia; mientras que la luz cálida del sol simboliza optimismo, esperanza y la capacidad de disfrutar el presente… vivir con los pies firmes sobre la tierra y la mirada puesta en un horizonte lleno de posibilidades." |
| Escenario cultural | "revalorización del arraigo, la hospitalidad y el bienestar cotidiano como expresiones de la identidad cultural mexicana" |
| Carácter | "transmite cercanía, estabilidad y bienestar, generando ambientes acogedores que invitan a permanecer, convivir y compartir" |
| Posicionamiento **anti-aspiracional** | "A diferencia de las tendencias que proponen estilos de vida aspiracionales, Bien y de Buenas encuentra su inspiración en aquello que forma parte de la vida diaria y de la riqueza de lo cotidiano: **una mesa compartida, una conversación que se prolonga, una casa abierta y la capacidad de hacer sentir a cualquier persona como parte de la familia**." |
| Anclaje mexicano | "La hospitalidad, la calidez y el sentido de comunidad son valores profundamente arraigados en la cultura nacional." |
| Conceptos clave (lista literal) | Arraigo · Tierra · **Hospitalidad** · Bienestar cotidiano · Convivencia · Calidez humana · Optimismo · Sentido de pertenencia |
| Moodboard | muros de arcilla · cocina con gabinetes terracota y madera · arco de barro en vegetación · alberca con arquitectura en tierra · textiles · tapete artesanal · interiores con luz cenital cálida (8 referencias) |

**Cómo despliega Berel un color del año** (OBSERVADO en `NOMBRE DE PALETAS FINALES CON PSICOLOGIA DEL COLOR.docx`, 2026-07-10): el color no vive solo, se despliega en **paletas estacionales, cada una con colaborador externo, temporalidad y psicología del color por tono**. Precedentes del ciclo Pitaya: *Eterna Armonía* — Paola Izaguirre (artes y cultura), ene–mar 2025 · *Distrito Urbaya* — Rodrigo Castro (diseño gráfico), ene–mar 2026 · *Paraíso Mexicano* — Francisco Aguilar (moda y contenido), abr–jun 2026. **La colaboración con creadores es parte nativa del formato**, no un agregado.

### 2.2 Qué NO cubre el material — y la advertencia de "candidato"

> ⚠️ **El PDF dice "Color candidato". La confirmación de que este es el color definitivo vino verbal del operador** (Teams, 2026-08-24). No hay confirmación escrita del cliente en el material. Es la primera cosa que hay que dejar por escrito antes de que el brief se convierta en artículo.

El racional trae la capa editorial completa y **no trae capa técnica**. Falta, y debe venir del cliente (OBSERVADO — ausencia verificada en el PDF):

- acabados disponibles y **brillo a 60°**
- rendimiento (m²/L)
- base de tintado
- si es de interiores, de exteriores o de ambos
- presentaciones
- en qué línea comercial vive el color

Verificado además (OBSERVADO, 2026-08-25): **`1-3404D` no existe hoy en `berel.com`**, y la ruta de producto que se probó también devuelve soft 404. No hay dónde enlazar el color todavía.

**Matiz importante, y va a favor:** el artículo del color 2026 **solo dijo "interiores y exteriores"** (OBSERVADO). O sea, la capa técnica del 2027 **no es paridad perdida, es mejora sobre el estándar propio**. Decirlo así cambia la conversación con el cliente: no estamos tapando un hueco, estamos subiendo el estándar — y es justo la capa que §7.4 identifica como el motor de enlaces de Berel.

---

## 3. El ángulo adoptado: hospitalidad

### 3.1 La canibalización interna — el competidor era una pieza propia

OBSERVADO. Tres piezas de Berel compiten por el mismo territorio semántico que el racional 2027:

| Pieza | Fecha | Qué ocupa |
|---|---|---|
| **Maíz 2-1403T** (color 2025) | ciclo 2025 | "una profunda conexión con nuestras **raíces**, nuestra historia y la **identidad cultural**… evoca **el sol**, la luz y la energía vital… invitándonos a reflexionar sobre el **bienestar**" |
| **`/articulos/paleta-calidez-vibrante`** | **2026-07-22** (5 semanas antes) | 1.470 palabras, la pieza más larga del ciclo. `<title>` = "Calidez Vibrante 2026: colores terracota y tierra para tu hogar". Un H2 literal: **"Terracota y tonos tierra: el corazón de Calidez Vibrante"**. Y el cuerpo: *"El terracota —a medio camino entre el rojo y el café— transmite **arraigo**, calidez y modernidad con tradición"* |
| Racional 2027 | 2026-08-24 | **"Arraigo" es uno de los ocho conceptos clave literales del PDF** |

> **No se escribe "el artículo del terracota". Ese lugar ya lo ocupa Berel mismo, hace cinco semanas.**

Consecuencia operativa: **Calidez Vibrante pasa a ser el desarrollo cromático al que el 2027 ENLAZA**, no su competidor.

### 3.2 El pre-emptor de tesis: Trendo (no estaba en el mapa competitivo)

OBSERVADO. **Trendo.mx ya anunció su color 2027 para Latinoamérica: "Sana Sana"**, turquesa Pantone 331 C / `#A2EFD6`, `datePublished 2026-07-31`, URL propia `trendo.mx/sana-sana-color-2027`.

La colisión **no es de color** — es de mecanismo y de tesis:

| | Trendo "Sana Sana" (31-jul-2026) | Berel "Bien y de Buenas" |
|---|---|---|
| Nombre | modismo mexicano | modismo mexicano |
| Anclaje | identidad visual mexicana, barrios, fachadas | identidad cultural mexicana, hospitalidad, la casa |
| Tesis | nostalgia + búsqueda de bienestar | arraigo + bienestar cotidiano |
| Palabra del año | **"Indulgencia": pequeñas recompensas cotidianas** | "los pequeños momentos", "la riqueza de lo cotidiano" |
| Despliegue | 4 paletas: Sega, Squishy, Alacrán, Pachuco | paletas estacionales con colaborador |

Dos lecturas, y las dos importan:

- **Berel NO puede presentar "el bienestar cotidiano y lo pequeño" como hallazgo propio.** La plataforma de tendencias mexicana de referencia lo publicó seis semanas antes y la prensa de diseño ya lo cubrió. Esto va escrito en el brief, no es opcional.
- **Ganar la tesis no es ganar el SERP.** La página de Trendo es una landing de captura de **77 palabras** ("Descarga el reporte"), **sin JSON-LD**. Ganaron narrativa por video, Instagram y prensa. **No compiten en búsqueda.**

Riesgo derivado que hay que medir y que hoy no se está midiendo: **que un motor de respuesta atribuya el concepto a la marca equivocada.** Entra como métrica AEO explícita del seguimiento post-publicación.

### 3.3 Por qué hospitalidad

Es el único eje del material del cliente que **nadie ocupa**, ni interna ni externamente:

- **Trendo** fue por indulgencia y placer individual.
- **Calidez Vibrante** (Berel) fue por el tono cromático.
- **Maíz** (Berel) fue por raíces y sol.
- **Nadie ocupó la casa abierta, la mesa compartida, recibir, hacer sentir a cualquiera parte de la familia.**

Y es, al mismo tiempo, **el material más distintivo del PDF**: el bloque anti-aspiracional y el anclaje mexicano son los dos párrafos donde el racional del cliente dice algo que ningún otro documento de la categoría dice.

---

## 4. El mapa competitivo verificado de la categoría en México

### 4.1 Nadie tiene una URL de "color del año" que ranquee **y** tenga contenido

OBSERVADO — verificación en vivo, 2026-08-25. Esta tabla **reemplaza** cualquier lectura previa de competencia menor: un agente construyó un bloque de afirmaciones sin verificar y lo retiró; lo que sigue es lo que sobrevivió con dato observado.

| Marca | ¿Color del año propio? | Su activo real | El defecto que lo hace batible |
|---|---|---|---|
| **Comex** | **sí** — Cielito Lindo + Xoconostle | `/comextrends/color-del-anio`, **19 dominios de referencia** | La ficha es **UNA FRASE**, **sin JSON-LD**, y **sigue mostrando el color 2025 (Bambú 237-05), 11 meses desactualizada** |
| **Sherwin MX** | heredado del corporativo (Universal Khaki SW 6150) | la URL que ranquea es un **CPT "slider" de 76 palabras**: cero H1, cero H2, `description` vacía, sin `Article` | **`/colores/color-2026/` da 404 estando enlazada desde su propio menú principal** |
| **Behr MX** | sí (Hidden Gem N430-6A) | **la mejor página es-MX de la categoría**: URL dedicada, `hreflang` de 6 nodos, description real | app Vue de **~360 palabras**, **sin H1**, **sin JSON-LD (0 bloques)**, sin PDF. El marcado rico vive en el newsroom corporativo, no en la página comercial |
| **Prisa** | no propio | usa "Mocha Mousse" y "Peach Fuzz" **sin citar fuente**, mapeados a códigos propios | enterrado en `/inspiracion-salas/`, sin meta description, ningún encabezado corresponde al contenido de color, **no menciona 2026**; su blog de color 2021 da 404 |
| **Osel** | **no** | — | SPA sin SSR, `robots.txt` y `sitemap.xml` **404**, 0 JSON-LD. Sus "tendencias" viven en un distribuidor y están **congeladas en 2025** |
| **Doal** | **no** | — | blog **abandonado desde feb-2024**; color genérico de 2022; mitad B2B ferretero |
| **"Vinci"** | **no aplica** | — | **no existe como fabricante de pintura**: es marca escolar de Grupo Fila Dixon. Confirmado el error de identificación de la lista original |

> **Comex es el único competidor real de Berel en color del año.** Y su ficha es una frase desactualizada. **La categoría entera está vacía de contenido.**

### 4.2 El incumbente de "terracota" es batible, y no por autoridad de pintura

OBSERVADO. Los dos que ganan el SERP de `color terracota` son piezas que nadie ha tocado:

- **Invesa `/significado-del-color-terracota/`** — publicado **2021-10-07**, modificado **2021-10-11**: casi cinco años sin tocarse y sigue rankeando. ~924 palabras. **H2 duplicado literal** (el mismo título dos veces, texto idéntico). **Cero tablas, cero códigos de color** (ni HEX, ni Pantone, ni un color propio). Sin FAQ, sin PDF, sin video. **No vende ni un producto** y cierra enlazando a un artículo de cultivo de aguacate. El dominio es **agroquímico**, con la pintura como división secundaria: autoridad temática débil. Lo único que sí tiene y Berel no: schema `Article` + **`Person`** (autor con `@id` de entidad) + `BreadcrumbList`.
- **Ceresita `/psicologia-del-color`** — tiene el activo comercial correcto (**PAPRIKA**, descrito literal como *"un terracota cálido e intenso inspirado en los tonos de la tierra"*, con código y ambientes) envuelto en una SPA React de **~150 palabras**, sin H1, sin JSON-LD, sin canonical, description vacía, en un dominio que devuelve `<title>Project name</title>` (placeholder de Symfony/Sonata) en casi todas sus rutas.

**Lectura:** el incumbente de "terracota" es batible **con el formato que Berel ya demostró** —el tutorial de baño y `como-el-color-afecta-la-percepcion-del-espacio`—: tabla + códigos + FAQ + producto + dato de fabricante.

### 4.3 La palanca de colaborador está libre en toda la categoría

OBSERVADO. Ni Comex, ni Sherwin, ni Behr, ni Prisa nombran colaboradores externos. **El único de las ocho marcas es Ceresita**, verbatim de su página: *"Junto a **Pilar Sordo**, psicóloga, escritora y conferencista chilena, te invitamos a conocer la importancia de los colores."* Sherwin y Behr solo tienen voceras internas (Sue Wadden, Erika Woelfel).

Berel dice "expertos en moda y textiles", "expertos en arquitectura, interiorismo, diseño gráfico, artes y cultura" — **siempre anónimos** — pero internamente tiene los nombres: **Paola Izaguirre**, **Rodrigo Castro**, **Francisco Aguilar** (§2.1). **Un colaborador nombrado enlaza la pieza a su portafolio; un experto anónimo no enlaza nada.** No es cosmético: es la diferencia entre tener autor-entidad y no tenerlo.

### 4.4 Berel tiene el mejor activo técnico de la categoría

OBSERVADO:

| | Berel | Comex | Trendo | Sherwin MX |
|---|---|---|---|---|
| JSON-LD en el activo de color | `Article` + `BreadcrumbList` | **0** | **0** | `WebPage` sin `Article` |
| `llms.txt` | **sí, vivo**, y ya lista los colores por año | no | no | no |
| `robots.txt` | versionado, **allowlist explícita de 8 bots de IA** | `Allow: /` genérico | — | — |
| Sitemap del editorial | índice de 7 sub-sitemaps | **no existe** | — | sí |
| Largo de la ficha del color | 581 palabras | **1 frase** | 77 palabras | 76 palabras |

Postura AEO verificada en el `robots.txt` vivo: **GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended y Applebot-Extended están todos permitidos**. **No hay nada que arreglar ahí.**

Sobre `llms.txt`: está desplegado e idéntico al del Squad. Su ROI es marginal (Google no lo usa; según Ahrefs, el 97% de los `llms.txt` reciben cero requests). **No lo quites, no le atribuyas resultados** — solo actualiza la línea del color del año cuando salga el 2027.

**El problema de Berel en esta categoría no es el activo técnico. Es autoridad, enlaces y prensa (§7).**

---

## 5. El ciclo 2027: calendario, ventana y el claim que caduca

### 5.1 Estado del ciclo 2027 al 2026-08-25

| Actor | Anuncio | Fecha | Qué es | Estatus |
|---|---|---|---|---|
| **Valspar** | Cottage Door 8004-38E | **~5-ago-2026** | **la primera y única marca de pintura** con COTY 2027 anunciado. Forbes titula que "kicks off 2027 Color Of The Year season" | OBSERVADO |
| **Sherwin-Williams** | forecast **Colormix 2027 "Rewild"** (48 tonos) | **30-jul-2026** | **pre-señal, no anuncio.** De ahí saldrá su COTY | OBSERVADO |
| WGSN + Coloro | Luminous Blue | 29-abr-2025 | forecaster B2B, no marca de pintura | OBSERVADO |
| Trendo | Sana Sana | **31-jul-2026** | agencia de tendencias, no fabricante | OBSERVADO |
| **Pantone, Comex, Behr, Benjamin Moore** | — | — | **nada** | OBSERVADO |

Contraste externo: **Young House Love, que rastrea 14 marcas, confirmó el 2026-08-24 que solo una marca ha anunciado** (OBSERVADO).

> **No usar el 4-jul-2026 como fecha de Trendo.** Una nota lo afirma, pero la página da 403 a lectura automatizada. La fecha verificada por `datePublished` es **31-jul-2026**.

### 5.2 El ciclo 2026, verificado contra fuente primaria

Cada fila declara si la fecha sale de un dateline / JSON-LD propio (OBSERVADO), de una nota de tercero (REPORTADO) o de una deducción (INFERIDO):

| Marca | Color 2026 | Fecha | Estatus |
|---|---|---|---|
| Behr | Hidden Gem N430-6A | **30-jul-2025** | OBSERVADO (dateline del press release) |
| Valspar | Warm Eucalyptus | **7-ago-2025** | OBSERVADO ("CLEVELAND, Aug. 7, 2025") |
| Dutch Boy | Melodious Ivory | **19-ago-2025** | OBSERVADO (PDF oficial) |
| Glidden (PPG) | Warm Mahogany | 26-ago-2025 | **REPORTADO** — Businesswire bloquea todo acceso |
| **Sherwin-Williams + HGTV Home** | Universal Khaki SW 6150 | **24-sep-2025** | OBSERVADO. **Anuncio conjunto**, una sola fecha para las dos marcas |
| **BEREL** | **Pitaya 2-3605D** | **29-sep-2025** | OBSERVADO (`datePublished` de su propio JSON-LD) |
| **Comex** | Cielito Lindo + Xoconostle (**dos colores, primera vez en 18 años**) | **1-oct-2025 o antes** | **INFERIDO** de Obras/Expansión — la fecha de la nota sí está observada, la del anuncio no |
| PPG | Secret Safari | 2-oct-2025 | **REPORTADO** |
| Benjamin Moore | Silhouette AF-655 | **16-oct-2025** | OBSERVADO |
| **Pantone** | Cloud Dancer 11-4201 | **4-dic-2025** | OBSERVADO ("CARLSTADT, N.J – December 4, 2025") |

Dos patrones con más de un ciclo detrás:

- **Pantone, 4 ciclos seguidos: primera semana de diciembre (entre el 1 y el 7).**
- **Comex, 2 ciclos seguidos: ventana 1–26 de octubre.**

Cadencia propia de Berel, según el `datePublished` de su JSON-LD (OBSERVADO, reverificado en vivo 2026-08-25): color 2025 (Maíz) → **2024-07-31** · color 2026 (Pitaya) → **2025-09-29**. **`/articulos/color-berel-2024` NO existe**: devuelve 200 sin `<title>` y sin JSON-LD — es otro soft 404 de la familia (§7). Cualquier fecha atribuida a un "color 2024" es un dato inexistente.

> ⚠️ **La cadencia propia de Berel NO es un argumento utilizable.** Solo hay dos fechas observables y están a **dos meses** de distancia (31-jul y 29-sep), sobre años distintos; el tercer punto que se había citado (un "color 2024" el 27-jul-2024) **no existe**. Con dos puntos separados por dos meses no hay patrón. **No presentar "Berel publica en julio" ni "Berel publica en septiembre" como cadencia propia.** El argumento de la ventana descansa **exclusivamente** en el calendario del mercado (§5.1): publicar entre Sherwin y Comex, y ~80 días antes de Pantone. Ese sí está verificado con fuente primaria y se sostiene solo.

### 5.3 La ventana, y el claim que caduca

**Publicar el 15-sep-2026** deja a Berel:

- **delante de Comex**, que vive en la ventana 1–26 de octubre (2 ciclos verificados);
- **~80 días antes de Pantone**, o sea **la fuente ya existe cuando se armen los compilados** de fin de año;
- como **segunda marca de pintura del mundo y primera de México** con color del año 2027 anunciado (INFERIDO del estado de §5.1, que es observado).

> 🔴 **Claim perecedero — tiene fecha de caducidad y dueño de retiro.**
> *"Primera marca mexicana de pintura con color del año 2027 anunciado"* es **un hecho verificable hoy** y **deja de serlo en cuanto Comex publique**, lo que su propio patrón sitúa entre el 1 y el 26 de octubre.
> El retiro del claim es una tarea con fecha, y aplica **en tres lugares**: la pieza publicada, el material de PR ya enviado y **los assets ya entregados a quien opera los canales** (§9.2). Un claim que caduca sin retirarse es un pasivo.

**Ventana de PR de segunda ola, ya identificada:** Pantone hace teaser — reloj de cuenta regresiva a mediados de noviembre con **la fecha** (no el color) y juego de predicción por familia de color. Es un segundo momento natural para reactivar la pieza (OBSERVADO).

**Sobre el segundo pico de búsquedas:** el pico de enero **no se afirma como dato duro**. La única fuente que lo cuantificaba era contenido agregado de baja confiabilidad y se descartó. Lo que sí se sostiene es **evidencia editorial**: Milenio 31-dic, Young House Love 2-ene, Coolhuntermx 5-ene, las tres con fecha observada. Es una señal de comportamiento del mercado, no una cifra.

### 5.4 Validación de terceros que juega a favor

OBSERVADO — citas listas para usar, y ninguna obliga a compararse con Pantone:

- **Sherwin-Williams Colormix 2027 "Rewild"** (30-jul-2026) incluye **"sun-baked clays"** y se organiza en tres relatos: Revive, Reignite y **Reconnect**, sobre **herencia** y la relación entre las personas y la naturaleza. → **Berel no va a contracorriente.** En 2027 hay dos corrientes (azul sereno vs. tierra/arraigo) y Berel está del lado que respalda el forecast más influyente del sector pintura.
- **Pantone View Home + Interiors 2027**, revelado por **Leatrice Eiseman** en The Inspired Home Show (marzo 2026): siete paletas bajo el concepto *Sense-Abilities*. Dos apuntan al color de Berel: **Grounded** = "organic shadings and varietal earth tones" · **Honest** = "warm and comforting hues – browns, reds and oranges". → El concepto del PDF ("los pies firmes sobre la tierra") traduce casi literalmente a *Grounded*. Es **corroboración externa atribuible sin compararse con Pantone**.
- Medios en español ya listan terracota como tendencia 2027: idealista, ámbito, canal26, elidealgallego, milideas.

---

## 6. La demanda medida de la familia cromática

**MEDIDO — DataForSEO, base MX (location 2484), 2026-08-25, costo real $0,013:**

| Keyword | Volumen | KD | CPC | Intención |
|---|---|---|---|---|
| **color ladrillo** | **4.400** | **0** | 0,10 | informacional |
| **color adobe** | **1.300** | 38 | **1,67** | **transaccional** |
| color teja | 390 | 0 | — | informacional |
| paleta de colores tierra | 390 | 0 | — | informacional |
| **color del año 2027** | **90** | — | — | informacional |
| colores calidos para sala | 90 | 53 | — | informacional |
| colores tierra para interiores | 70 | 31 | 0,12 | informacional |
| color terracota combinaciones | 20 | 18 | — | informacional |

> 🔴 **Corrección a Semrush.** El dossier base decía, ESTIMADO, que `color del año 2027` estaba **"sin volumen todavía"**. **MEDIDO: ya tiene 90/mes.** La demanda del término ya nació.

Sin datos (no medibles en MX en esta consulta): `colores 2027`, `tendencias de color 2027`, `colores para casa 2027`, `decoracion 2027`, `colores de moda 2027`, `colores para interiores 2027`, `tendencias 2027`, `color tierra quemada`, `color del año berel`.

**Contexto de demanda evergreen (ESTIMADO — Semrush, base `mx`, agosto 2026):** `color terracota` **22.200** · `color rojizo` **22.200** · `color arcilla` 4.400 · `color tierra` 2.900 · `tonos tierra` 880 · `color barro` 720 · `pintura color terracota` 480 · `significado del color terracota` 40. Y `color del año 2026` **3.600/mes** con pico en enero–febrero; `bien y de buenas` 20/mes, y buena parte es el modismo, no el color. **El nombre del color no tiene demanda hasta que se anuncia: Berel la crea y luego la captura**, igual que pasó con "pitaya".

**El precedente que lo prueba (MEDIDO — Search Console, ventana 2026-07-31 a 2026-08-22):** `color pitaya` → **699 impresiones, posición 4,1**. Semrush estimaba 320/mes; Search Console mide ~900/mes. **La demanda real fue mayor que la estimación.** Y `color pitaya comex` le dio a Berel **44 impresiones**: la gente busca el color de Berel y le pone la marca del competidor.

**El nombre está libre, y es mejor punto de partida que "pitaya"** (OBSERVADO): "bien y de buenas" no está documentada como expresión consolidada; los buscadores devuelven glosarios genéricos de mexicanismos donde no aparece. **No hay entidad que disputar.** "Pitaya", en cambio, compite con la fruta. Y **Berel ya es la fuente citada de su propio color cuando la marca está en la consulta**: "color del año 2026 Berel Pitaya" devuelve `berel.com` ×5. **El activo funciona; el hueco es el espacio de consulta SIN marca.**

> ⚠️ **`color ladrillo` (KD 0, 4.400) y `color adobe` (transaccional, CPC 1,67) NO están fijadas como objetivo.** Falta verificar su SERP mexicano: una dificultad sospechosamente baja puede ser demanda de **referencia de código** (muestrarios, códigos HEX) y no del tema — es exactamente la trampa en la que ya se cayó una vez con la familia de grises. Hasta verificarlas, van como **oportunidad condicionada**, nunca como objetivo.

---

## 7. Enlaces y prensa: el hueco real

### 7.1 Berel no tiene un solo enlace editorial

> 🔴 **Corrección MEDIDA sobre una cifra ESTIMADA que ya circulaba.**
> El research base —y con él el [diagnóstico general, §3.4](BEREL_SEO_DIAGNOSTIC_2026-08-25.md)— cita el artículo `/articulos/como-el-color-afecta-la-percepcion-del-espacio` con **25 dominios de referencia** (ESTIMADO, Semrush). Ese artículo es "el único de los 115 que gana enlaces".
> **MEDIDO con DataForSEO ($0,049): tiene 4 dominios de referencia vivos, y son basura**: `dateando.com`, `eco-turismo.info`, `notideporte.info`, `shorturl.at`.

**Berel no tiene un solo enlace editorial.** La brecha con Comex es mayor de lo que suponía el dossier, y la oportunidad es más limpia: **no hay que superar un activo propio, hay que crear el primero.**

### 7.2 Comex: 36 dominios, con su matiz

**MEDIDO — DataForSEO.** `/comextrends` tiene **36 dominios de referencia**. Medios editoriales reales: `decarq.com` (rank 88, arquitectura) · **`elle.mx`** (68) · `trendyurbano.mx` (50) · `material-fair.com` (36) · **`elpais.com`** · **`milenio.com`** · **`tvazteca.com`** · `sopitas.com` · `pijamasurf.com` · `revistamoi.com` · `tecnne.com` · `edomexaldia.com` · `elpublicista.info` · `portaldeactualidad.com` · `casarosapolanco.com` · `vieyraestudio.com`.

> ⚠️ **El conteo bruto infla.** Siete de los 36 son **pinturerías de su propia red de distribuidores** (Puebla, Metro, Culiacán, Mochis, Villahermosa, Tampico, Mazatlán) y dos son almacenamiento de Azure. **Los enlaces editoriales reales son ~11–16** (INFERIDO del desglose observado).

**Esa lista nominal es prospección cálida:** son medios que **ya demostraron que enlazan ESTE formato en ESTE mercado**.

### 7.3 El anuncio de Berel no tiene una sola nota de prensa mexicana fechada

> 🔴 **OBSERVADO. Este es EL hallazgo del plan de PR.**
> No se encontró **ningún medio mexicano con nota fechada** del anuncio de Pitaya (color 2026). **La fecha del 29-sep-2025 sale exclusivamente de su propio sitio.**
> Comex, el mismo ciclo, tuvo cuatro: Obras/Expansión (1-oct), a! Diseño (7-oct), The Point (13-oct), Coolhuntermx (14-oct).

**No es que la prensa cubra a Berel sin enlazarlo. Es que no lo cubre. Berel lanza su hito anual al vacío.**

### 7.4 Dos motores de enlaces distintos — no confundirlos

OBSERVADO. El motor de Comex y el de Berel no son el mismo, y **copiar el de Comex no es una opción este año**:

| | **Comex — PR + evento físico + PDF** | **Berel — profundidad técnica de fabricante** |
|---|---|---|
| Cómo lo hace | libro *ColorLife TRENDS 2026*, 18ª edición · investigación de campo con 16 creativos en Oaxaca · colaboraciones fuera de categoría (tenis Panam, sillas Labenze/Grupo Requiez) · showroom · sección permanente en a! Diseño (`a.com.mx/colorlife-trends/`) | su único artículo con enlaces: 2.327 palabras, 11 H2 + 14 H3, FAQ de 8, tablas, un H2 llamado **"La luz, el acabado y el subtono: lo que un fabricante sí te dice"** |
| El detalle que lo define | la URL con 19 dominios es una ficha de **una frase** desactualizada — los enlaces los gana el ecosistema, no la página | **datos propietarios** (*"un acabado mate (brillo 60° menor al 5% en líneas como Berelinte)"*), **consejo honesto que puede frenar la venta** (*"prueba siempre el color con un brochazo en la pared real y obsérvalo de día y de noche durante 24 horas"*), y **cero enlaces salientes a fuentes externas**: su autoridad ES ser el fabricante |
| ¿Replicable por Berel en este ciclo? | **No.** Berel no tiene ese músculo de PR | **Sí. Es el motor propio.** |

> **El artículo 2027 no gana enlaces por ser bonito. Los gana si dice algo sobre ESE color que solo Berel puede decir**: subtono, comportamiento bajo luz de norte y de sur, acabado recomendado, cobertura, cómo se comporta en fachada bajo sol directo.
>
> Y por eso la ficha técnica de `1-3404D` (§2.2) **no es un detalle administrativo: es el insumo del motor de enlaces.**
>
> **Regla dura del claim de producto, que ya se rompió una vez en esta cuenta:** *si la ficha no lo declara literalmente, el H2 no se escribe.* No se rellena con lógica de oficio ni con la ficha de otra marca. Una palabra cambia el claim.

---

## 8. La deuda técnica que toca este lanzamiento

### 8.1 Rutas: el destino ya devuelve 200 vacío

> 🔴 **Corrección OBSERVADA al dossier base.** El dossier describía las rutas cortas como **duplicados de contenido**. No lo son: **son soft 404 huérfanos.**

OBSERVADO, 2026-08-25:

| URL | HTTP | Palabras | `<title>` | canonical | JSON-LD |
|---|---|---|---|---|---|
| `/articulos/color-berel-2026` | 200 | 581 | correcto | correcto | `Article` |
| `/color-berel-2026` | 200 | **88 (solo menú y pie)** | **vacío** | **`berel.comundefined`** | **0** |
| `/articulos/color-berel-2025` | 200 | 422 | correcto | correcto | `Article` |
| `/color-berel-2025` | 200 | **88** | **vacío** | **`berel.comundefined`** | **0** |

Las cortas **no están enlazadas desde ningún lado** y **no están en ningún sitemap** (revisados los cinco), y aun así acumulan **2.059 y 1.048 impresiones** — **3.107 combinadas** (MEDIDO, Search Console). **Google está indexando páginas vacías bajo un nombre que promete el color del año.**

> 🔴 **Y lo urgente: `/color-berel-2027` y `/articulos/color-berel-2027` YA devuelven HTTP 200 con título vacío** (OBSERVADO). Si Google descubre la URL destino antes de publicar, **la indexa vacía**.

**Acciones, en orden:**

1. **Arreglar el soft 404 genérico ANTES de la publicación.** Es el bloqueante duro.
2. `301` de `/color-berel-2026` y `/color-berel-2025` a sus `/articulos/…`.
3. Publicar en **`/articulos/color-berel-2027`** — el patrón que el nav, el `llms.txt` y el sitemap ya reconocen. **No crear ruta corta.**
4. Encadenar 2026 → 2027 (el 2025 ya enlaza al 2026).
5. **Actualizar el hub `/articulos/colores-de-temporada`**, que es la página con más impresiones del ciclo (**6.116**, MEDIDO), sigue mostrando *Paraíso Mexicano* como paleta vigente y **enlaza a un solo artículo**. Como no hay índice de blog navegable, **ese hub es la única vía real de descubrimiento interno.**

### 8.2 Familias de color: cuatro de nueve están rotas

OBSERVADO — dos pasadas con cache-busting. Rotas (soft 404, sin `<title>`, canonical `berel.comundefined`): `/colores/amarillos`, `/colores/azules`, `/colores/morados`, `/colores/verdes`. Sanas: `/colores/cafes`, `/colores/grises`, `/colores/naranjas`, `/colores/pasteles`, `/colores/rojos`.

**Las tres que el color 2027 necesita —cafés, naranjas, rojos— funcionan.** Pero **si la paleta complementaria incluye un verde o un azul, ese enlace va a una página muerta.** Es una condición a verificar cuando llegue la paleta, no un problema resuelto.

Y el defecto de la regla de la casa sigue vivo: **`/articulos/color-berel-2026` enlaza a `/search?q=Rojos` y `/search?q=color del año 2026`**, rutas que su propio `robots.txt` bloquea. **No repetirlo en el 2027.**

### 8.3 Dos generaciones editoriales, y la pieza ancla quedó en la vieja

OBSERVADO:

| | Generación **vieja** (`color-berel-2026`, `-2025`) | Generación **nueva** (jul-2026 →: `paleta-calidez-vibrante`, `paraiso-mexicano-2026`, `como-el-color-afecta…`) |
|---|---|---|
| Encabezados | **H1 → H3, cero H2.** Jerarquía rota | **H2 en pregunta literal** |
| Plantilla | "El origen de X" / "Cómo usar X" / "Inspiración" — clonada año con año | temática, con bloque FAQ |
| Largo | 400–580 palabras | 1.000–1.500 |
| FAQ | no | sí (6–8 preguntas) |
| CTA comercial | **ninguno** | "Da el siguiente paso" |

> **El artículo del Color del Año es el ÚNICO que no migró. El 2027 debe nacer en la generación nueva.**

Tres defectos más, todos OBSERVADOS y todos accionables en la misma pieza:

- **Bug de cápsula:** `paraiso-mexicano-2026` tiene H3 "¿Cuál es el Color del Año Berel 2026?" y "¿Cuál es el Color del Año 2026?" — **la paleta satélite está respondiendo la pregunta que le corresponde a la pieza ancla.** Esa pregunta pertenece al artículo del color.
- **Ningún artículo de Berel declara `FAQPage`**, aunque dos ya tienen el bloque de FAQ escrito. El marcado es gratis y **nadie en la categoría lo tiene**.
- El `author` del JSON-LD es `"@type":"Person","name":"Equipo Editorial Berel"` — **un `Person` que no es una persona**. Rompe E-E-A-T y desperdicia la palanca de colaboradores de §4.3.

**Schema recomendado, verificado contra schema.org (no inventar):** **no existe ningún tipo dedicado a un color.** `color` es una **propiedad**, no un tipo; su `domainIncludes` es `Product` y su `rangeIncludes` es `Text`. No hay `Color`, ni `ColorSwatch`, ni `Paint`. Lo correcto: **`Article`** (con `author` como `Person` **real**) · **`BreadcrumbList`** · **`FAQPage`** (el hueco gratis) · **`Product` + `color`** para modelar el color como propiedad del producto de pintura · `ImageObject` con `caption`. Opcional no prioritario: `DefinedTerm` dentro de un `DefinedTermSet`.

---

## 9. Distribución: assets, convención y modelo de canal

### 9.1 La convención del cliente y su degradación medida

OBSERVADO — inventario de los entregables reales del Squad, barrido por carpeta y por extensión (no por patrón de nombre; ver §11):

| Periodo | Estado de la convención |
|---|---|
| **jun–jul 2026** | slots **`B01`–`B05`** por pieza, con `B01` = portada y `B05` = cierre |
| **agosto 2026** | **se pierde el código `B0#`** · baja a **3–4 piezas** por nota · **tres convenciones en paralelo el mismo mes** · Pinterest cae de **6/8 a 3/9** mientras REEL sube a **8/9** · **N22 sin su Banner N2** |

> ⚠️ **`N21 "Colores de temporada"` —el hub con 6.116 impresiones, la única vía real de descubrimiento interno del blog (§8.1)— tiene la carpeta de assets vacía.**
> **Esto NO se reporta al cliente todavía.** Una carpeta vacía en un inventario local puede ser **sincronización de OneDrive**, no incumplimiento de entrega. **Hay que reverificarlo con el equipo de diseño antes de convertirlo en un hallazgo** (§11).

Consecuencia para el plan del 2027: la convención **no se inventa, se deriva** — y hoy está degradada, así que hay que declarar **cuál de las tres convenciones se adopta** antes de pedir piezas. Cada pieza se amarra a la sección del brief de donde sale su contenido, para que diseño no tenga que inventar. Y los slots que dependan de un dato no verificado (por ejemplo, cualquier pieza que muestre acabado o rendimiento) **se condicionan igual que sus H2**.

### 9.2 El modelo de canal: Efeonce entrega insumo, no publica

> **Confirmado por el operador el 2026-08-25: la cuenta de Pinterest existe, la opera OTRA AGENCIA, y Efeonce entrega el insumo (texto + imagen). Efeonce NO publica.**

Consecuencias que hay que declarar en el entregable, no asumir:

- **El entregable no es una parrilla: es un paquete de insumo.** Tabla campo por campo de lo que sí es responsabilidad de Efeonce: imagen, título, descripción, URL de destino, alt, tablero/categoría sugerida y **fecha sugerida — no comprometida**.
- **No se promete cobertura de publicación.** El objetivo propio es **cobertura de insumo entregado**.
- **La medición no es nativa.** O se le pide el reporte a quien publica, o se infiere por tráfico de referencia al destino. **Hay que declarar cuál de las dos ANTES de comprometer una métrica.**
- **El retiro del claim perecedero de §5.3 hay que comunicárselo a quien publica**, porque tiene copy vivo. Esa comunicación **es un entregable con fecha**, no un recordatorio.

### 9.3 Pinterest no es "un canal social" en este vertical: es una superficie de búsqueda

OBSERVADO en el SERP mexicano: en `colores para cocina`, Pinterest ocupa **#1, #9 y #10** (`co.pinterest.com` en #1 y #9, `ar.pinterest.com` en #10). En `pintura anticorrosiva`, **YouTube ocupa #8 y #10**.

Consecuencia operativa concreta: **el título y la descripción de la pieza en Pinterest se escriben con la consulta, no con el nombre de la campaña**; el destino es la **URL canónica** (`/articulos/color-berel-2027`, §8.1); y el tablero se organiza **por tema perenne, no por año**.

---

## 10. El entregable y los bloqueantes abiertos

### 10.1 Lo entregado

**Brief completo depositado en el slot N28 "Color del año 2027"** del Content Hub de Berel en Notion (`https://app.notion.com/3a639c2fefe7807d847cc099a0b99966`), que estaba en estado `Idea`, tipo `Publicación de blog`, con **el cuerpo en blanco** y la nota interna *"Sin enlace ni brief: pendiente de tema/material del cliente (Modalidad B)"*. Ese material es justamente el que llegó el 2026-08-24.

**13 secciones dentro de un encabezado desplegable de nivel 1** — las **11 del formato hermano** de los briefs N29–N33 (definición · demanda verificada · panorama competitivo · mapa de Query Fan-Out · estructura del artículo · elementos de citabilidad · producto Berel · enlazado interno · on-page · medición y refresh · supuestos y límites) **más dos propias de una pieza-hito**: **Plan de PR** y **Atomización / distribución**.

**El marcado de evidencia viaja al brief, dato por dato** (§Convención). Ningún dato REPORTADO o INFERIDO se presenta ahí como verificado, y la sección de límites del brief transcribe los huecos de este research **sin maquillar**.

### 10.2 Bloqueantes abiertos

Ninguno de estos cinco está resuelto al 2026-08-25. La columna **dueño** es INFERIDA salvo donde se indica: se deduce de que el calendario editorial lo dicta el cliente (Maria Fernanda Vega, por Teams el 2026-07-22) y de que **la implementación del sitio es del equipo de Berel, no de Efeonce** (registrado en el diagnóstico general, §10).

| # | Bloqueante | Qué bloquea | Dueño | Estatus |
|---|---|---|---|---|
| **BL-1** | **Conflicto de fecha de publicación.** La propiedad de la tarea N28 dice **2026-09-15**; el cuerpo de la tarea dice **"primera semana de octubre"** | **Todo el plan.** Octubre cae dentro de la ventana de Comex (1–26 oct) y **invalida el claim diferenciador de §5.3** | Cliente (Maria Fernanda Vega) — decisión; Efeonce plantea el costo de mover la fecha | **abierto** |
| **BL-2** | **Confirmación escrita del color.** El PDF dice "Color **candidato**"; la confirmación vino **verbal** del operador | Publicar un color que el cliente no confirmó por escrito | Cliente | **abierto** |
| **BL-3** | **Quién firma el 2027.** Berel tiene los nombres internamente (Paola Izaguirre, Rodrigo Castro, Francisco Aguilar) pero publica con autores anónimos | El `author` `Person` real del JSON-LD (§8.3) y la palanca de enlaces de §4.3 | Cliente | **abierto** |
| **BL-4** | **Ficha técnica de `1-3404D`**: acabados, brillo 60°, rendimiento, base, interior/exterior, presentaciones, línea | **Cuatro H2 del brief** y el motor de enlaces completo (§7.4). Hoy `1-3404D` **no existe en `berel.com`** | Cliente | **abierto** |
| **BL-5** | **URL de ficha de producto + soft 404 del destino.** `/articulos/color-berel-2027` **ya devuelve 200 con título vacío** | El enlace a producto de la pieza, y el riesgo de que Google indexe el destino vacío antes de publicar | Equipo de desarrollo de Berel | **abierto — el más urgente por fecha** |

**BL-5 es el único con reloj propio**: no depende de la fecha de publicación, depende de cuándo Google descubra la URL.

---

## 11. Límites de este research

Lo que **no** se pudo medir o verificar, declarado para que nadie lo asuma cubierto:

1. **Semrush quedó inoperante por cuota en los tres frentes.** Sin posiciones, tráfico, SERP features ni AI Overviews medidos por esa vía. Todo lo cuantitativo de Semrush que aparece acá viene del dossier base, marcado ESTIMADO. Nota operativa conocida: cuando el MCP de Semrush agota cuota, **el mensaje de error afirma que el plan no incluye acceso MCP**. Es engañoso. Si el mismo reporte funcionó antes en la sesión, es cuota, no plan.
2. **AI Overviews del SERP mexicano: sin datos.** No se midieron. `WebSearch` es US-only y **no es sustituto**.
3. **El Share of Voice en motores de respuesta es un proxy, no una medición.** Un SoV real exige correr los prompts en AI Overviews, ChatGPT, Perplexity y Gemini **desde México**. Lo que hay hoy no es eso.
4. **`color ladrillo` y `color adobe` no están verificadas en SERP.** Tienen volumen y dificultad medidos, pero **no se miró su SERP mexicano**. Van como oportunidad **condicionada**, nunca como objetivo, hasta verificar que no son demanda de referencia de código (§6).
5. **El hallazgo de inventario de N21 puede ser sincronización de OneDrive.** La carpeta de assets del hub aparece vacía en el inventario local. **Antes de reportarlo al cliente hay que reverificarlo con el equipo de diseño.** Un hallazgo de inventario local **no es una acusación de proceso**.
6. **Falta la lista nominal de los 19 dominios de `/comextrends/color-del-anio`** (la de 36 corresponde a `/comextrends`, §7.2) **y el perfil de anclas de `berel.com`**.
7. **`behrpaint.com.mx` responde 403 (Cloudflare) a lectura automatizada.** Lo de Behr en §4.1 se verificó por las vías que sí respondieron; no hubo lectura completa del sitio.
8. **Dos fechas del ciclo 2026 son REPORTADAS, no verificadas de primera fuente**: Glidden (26-ago-2025) y PPG (2-oct-2025). Businesswire bloquea todo acceso automatizado. Y la de **Comex (1-oct-2025 o antes) es INFERIDA**: lo observado es la fecha de la nota de Obras/Expansión, no la del anuncio.
9. **La cadencia propia de Berel no es utilizable como argumento.** Solo hay dos `datePublished` observables (31-jul-2024 y 29-sep-2025) y están a dos meses de distancia; la ruta del supuesto color 2024 es un soft 404 y su fecha no existe (§5.2). **No hay patrón propio.** La ventana se justifica solo por el calendario del mercado.
10. **El pico de búsquedas de enero no está cuantificado.** La única fuente que lo medía era contenido agregado de baja confiabilidad y se descartó. Lo que se sostiene es evidencia editorial de tres medios con fecha observada, que es una señal, no una cifra.
11. **`"Vinci"` salió de la lista competitiva original y no corresponde a ninguna empresa mexicana de recubrimientos arquitectónicos.** Es marca escolar de Grupo Fila Dixon. **Es un error de identificación de la lista de partida, no un competidor que se dejó de analizar** — pero conviene revisar de dónde salió esa lista antes de reusarla.
12. **La ventana de Search Console son 23 días** (2026-07-31 a 2026-08-22). No hay estacionalidad, no hay interanual, y **este es justamente un tema estacional**. Las impresiones de §6 y §8.1 se leen con ese límite encima.

---

## Referencias

- Diagnóstico general de la cuenta: [`BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](BEREL_SEO_DIAGNOSTIC_2026-08-25.md) — línea base del dominio, panorama competitivo, arquitectura del sitio (los defectos D-01 a D-10, que son el contexto de §8), backlog de striking distance y los cinco briefs de espacios N29–N33.
- Oficio y doctrina de método (SEO técnico, citabilidad, chunking, Query Fan-Out, AEO): skill `seo-aeo`.
- Uso comercial del research (encuadre, pricing, upsell): skill `seo-aeo-practice`.
- Proceso repetible de priorización editorial: [`docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md).
- Conexión de Search Console en Greenhouse: capability `growth.search_console.connect`, reader `readSearchConsoleAnalytics`, tabla `greenhouse_growth.seo_gsc_daily`, serie diaria de `TASK-1302`.
- Slot del entregable: Content Hub de Berel en Notion, tarea **N28 "Color del año 2027"**.
