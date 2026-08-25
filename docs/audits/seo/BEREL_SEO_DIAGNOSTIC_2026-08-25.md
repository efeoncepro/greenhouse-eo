# Berel — diagnóstico de búsqueda orgánica y arquitectura de contenido — Auditoría 2026-08-25

## Estado

- Tipo: auditoría de cliente (búsqueda orgánica, arquitectura de contenido y línea base medida)
- Cliente: **Berel** (`berel.com`), fabricante mexicano de pintura arquitectónica. Efeonce le opera el blog.
- Fecha: 2026-08-25
- Scope: perfil de dominio y catálogo, panorama competitivo en México, línea base medida en Search Console, backlog de striking distance, arquitectura e indexabilidad del sitio, historia de la estrategia editorial y los cinco briefs entregados
- Método: Semrush (base `mx`, agosto 2026) · Search Console `sc-domain:berel.com` vía la conexión de Greenhouse · inspección directa de HTML de `berel.com` con `curl`/fetch · SERP en vivo · Notion (Content Hub de Berel y documentos de propuesta)
- Ventana medida: **2026-07-31 a 2026-08-22 (23 días, 151.782 filas)**
- Verdict: **el techo de Berel no está en la cantidad de artículos, está en que el sitio no permite encontrarlos.** Existe un activo editorial que prueba que el modelo funciona y nunca se replicó; existen 115 artículos que ninguna URL del sitio lista.
- Hallazgo de operación de cuenta: **el carril de striking distance de §5 no es una capacidad por construir — está terminada y operable hoy en el portal, la conexión de Search Console del cliente lleva activa desde el 31 de julio, y nadie la había corrido para esta cuenta** (§5.0).
- Documento interno de Efeonce sobre un cliente. **No es una propuesta comercial** y no está redactado para entregarse al cliente tal cual.

> ## Convención de evidencia — leer antes de citar cualquier cifra
>
> Cada dato de este documento lleva su naturaleza declarada. No son intercambiables:
>
> | Marca | Fuente | Qué significa |
> |---|---|---|
> | **MEDIDO** | Search Console (`sc-domain:berel.com`) | Lo que realmente pasó en la ventana de 23 días. Impresiones, clics, posición ponderada. |
> | **ESTIMADO** | Semrush base `mx` | Modelo de terceros. Volúmenes de búsqueda, Authority Score, tráfico, backlinks. Útil para dimensionar demanda que Berel **no** tiene; no sirve para juzgar rendimiento propio. |
> | **OBSERVADO** | SERP en vivo / HTML del sitio | Una foto de un momento. No es serie, no es promedio, y un SERP se mueve. |
>
> **Regla de uso.** Esta auditoría documenta el estado observado el 2026-08-25. Los defectos de arquitectura (§6) caducan en cuanto el equipo de Berel toque el sitio; la línea base (§4) y el backlog (§5) caducan con el paso de las semanas. Revalidar contra runtime antes de consumir cualquier cifra.

**Dónde vive lo que este documento no es dueño de definir:**

- El oficio — doctrina de los dos carriles de priorización, trampas de interpretación de Search Console, chunking y citabilidad — vive en la skill `seo-aeo`, módulos [`02_SEO_CONTENT`](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) y [`07_MEASUREMENT`](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md).
- El proceso repetible que convierte esta evidencia en calendario editorial vive en [`docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md).
- El uso comercial (pricing, encuadre de venta, upsell) vive en la skill [`seo-aeo-practice`](../../../.claude/skills/seo-aeo-practice).

Cuando este documento toca metodología, la resume en una línea y enlaza. Lo que aporta es **evidencia del caso**.

---

## 1. Resumen ejecutivo

Berel es la mayor empresa mexicana de pintura arquitectónica y compite en búsqueda con un Authority Score de **39 contra los 57 de Comex** (ESTIMADO). Su tráfico orgánico es **~90% de marca**: la sola query `berel` aporta el 43,5% del total, de modo que el volumen agregado del dominio no dice nada sobre su capacidad de captar demanda no-marca. Tiene **un solo activo editorial** que demuestra que el modelo funciona: el tutorial de baño sostiene **catorce keywords no-marca en top 3** con una única URL, y ese formato nunca se replicó. Al mismo tiempo, **no aparece en el top 10 de ninguno de los siete espacios del hogar** salvo baño, precisamente por ese tutorial. Y el techo no está en la cantidad de artículos —hay 115— sino en que **el sitio no permite encontrarlos**: no existe índice de blog, `/colores` está rota como página indexable y el enlazado editorial apunta a una ruta bloqueada por `robots.txt`.

---

## 2. Perfil del cliente y catálogo

Berel (`berel.com`) fue fundada en 1937 en Monterrey por el ingeniero Bernardo Elosúa; en 1943 pasa a Berel S.A. Es la mayor empresa **mexicana** de pintura arquitectónica, con más de 1.700 puntos de venta bajo modelo de concesionarios/franquicia. Los lectores del blog son 100% mexicanos.

El sitio corre en Next.js App Router con backend Drupal headless. Superficie: **164 URLs de contenido** (115 artículos, 14 tutoriales, 10 de inspiración, 27 páginas) más **114 productos**.

El catálogo importa porque define qué temas tienen respaldo de producto y cuáles no. Cualquier brief que prometa una solución sin SKU detrás es un claim que el cliente no puede sostener.

| Familia | Composición (114 SKUs) |
|---|---|
| Arquitectónico | vinilacrílicas 16 · primarios 12 · esmaltes 12 · aerosoles 9 · decorativos 4 · barnices 4 · reductores 5 |
| Maderas | nitrocelulosa 8 · poliuretano 4 · complementos 3 · acabados 1 |
| Impermeabilizantes (Kover) | 17 |
| Profesional | industria 11 · construcción 5 · reductores 2 · primarios 1 |

Líneas comerciales: Berelinte, Berelex/Green/3en1/Semibrillante, Kalos Tone, Multitono Pro/Max, Insignia, Konberel, Pintura Autoenfriante, Esmalte Summa, Beralkid, Qualik, Biometal, Fondo Noxid, Kover Cryl/Pro/Térmico/Poliuretano/Secado Rápido/Restaurador, Thinner Americano.

**Consecuencia directa de la estructura del catálogo:** los "decorativos" son alberca, pisos, pizarrón y canchas. Berel **no tiene producto de textura tipo chukum**, y su único epóxico (`esmalte-epoxico-catalizado`) es de línea profesional/industria, no de consumo. Eso descarta temas con demanda medible por falta de respaldo, no por falta de oportunidad (§9).

---

## 3. Panorama competitivo y de autoridad

### 3.1 Los tres dominios que importan

ESTIMADO — Semrush, base `mx`, agosto 2026:

| Dominio | Authority Score | Dominios de referencia | Backlinks | Keywords orgánicas | Tráfico org./mes | Valor |
|---|---|---|---|---|---|---|
| comex.com.mx | **57** | 2.373 | 57.055 | 65.784 | 1.213.867 | $446.500 |
| **berel.com** | **39** | 604 | 7.742 | 9.390 | 91.059 | $5.673 |
| sherwin.com.mx | 39 | 621 | 7.643 | 5.938 | 60.906 | $6.722 |
| doal.com.mx | — | — | — | 8 | ~0 | $0 |
| pinturasprisa.com | — | — | — | 17 | 7 | $0 |

Lectura: la categoría en México tiene **un solo dominio fuerte**. Comex está a 18 puntos de Authority Score y a un orden de magnitud en tráfico; Berel y Sherwin están empatados en autoridad; el resto del mercado no existe en búsqueda.

**El tráfico de Berel es ~90% de marca.** Solo `berel` (49.500 ESTIMADO) aporta el 43,5% del total. Es el dato que reencuadra todo lo demás: los 91.059 de tráfico mensual no miden capacidad editorial, miden reconocimiento de marca.

### 3.2 Sherwin-Williams México no está en la conversación

OBSERVADO — SERP en vivo: **`sherwin.com.mx` no aparece en el top 10 de ningún SERP de espacios en México.** Quienes sí aparecen son dominios hermanos de otros países y marcas sin operación local: `sherwin.com.ar`, `sherwin.cl`, `dunnedwards.com`, `benjaminmoore.com`, `behrpaint.com.mx`, `cemix.com`, `keim.com`, `promart.pe`, `hagaloustedmismo.cl`.

Es una señal de SERP flojo: la demanda informacional de espacios en México está siendo atendida por contenido que no fue escrito para México.

### 3.3 Cómo gana Comex el contenido informacional

Comex organiza por **espacio** y por **tarea**, no por producto. ESTIMADO — tráfico mensual por URL:

| URL de Comex | Eje | Tráfico |
|---|---|---|
| `/espacios/fachadas` | espacio | 7.054 |
| `/espacios/cocina` | espacio | 4.332 |
| `/espacios/bano` | espacio | 2.839 |
| `/pintar/como-elegir-la-mejor-pintura-blanca` | tarea | 4.959 |
| `/tips/pintar/como-pintar-pisos` | tarea | 3.715 |
| `/tips/barnizar-y-entintar/pintura-para-madera` | tarea | 3.473 |
| `/chukret-...-chukum` | producto/textura | 6.903 |
| `/calcular-cantidad-pintura` | herramienta | 2.392 |

Y gana con menos profundidad de la que parece. OBSERVADO: Comex rankea **#3 para `colores para cocina`** (12.100 ESTIMADO) con una página cuyo HTML de servidor contiene **nueve palabras de texto** — todo lo demás se renderiza en JS. **Gana por autoridad, no por profundidad de contenido.** Eso define el terreno: donde Berel no puede ganar por autoridad, tiene que ganar por ser la página que realmente responde.

### 3.4 Perfil de enlaces: qué contenido gana autoridad

ESTIMADO. De los **115 artículos de Berel, solo UNO gana enlaces de verdad**: `/articulos/como-el-color-afecta-la-percepcion-del-espacio`, con **25 dominios de referencia**. Todos los demás tienen tres o menos. El resto del perfil del dominio es home (475 dominios) y directorio de tiendas (18).

Comex gana enlaces con: `/comextrends` 47 dominios · `/tips/impermeabilizar/como-tapar-una-gotera` 20 · `/comextrends/color-del-anio` 19 · `/promociones` 19 · `/paletas-de-color` 17.

**Lectura convergente entre ambos perfiles:** en esta categoría el contenido que atrae enlaces es (a) el **conceptual sobre color aplicado al espacio** y (b) el de **problema urgente concreto**. El único artículo de Berel que gana enlaces es exactamente del tipo (a). Es la segunda prueba —después del tutorial de baño— de que el modelo que funciona ya está en el sitio y no se replicó.

---

## 4. La línea base medida

### 4.1 Fuente, ventana y su límite

MEDIDO. `sc-domain:berel.com` está conectada en Greenhouse bajo el modelo operador-mediado: token en Secret Manager, capability `growth.search_console.connect`, reader canónico `readSearchConsoleAnalytics`, tabla `greenhouse_growth.seo_gsc_daily`, serie diaria de `TASK-1302`.

Ventana disponible: **2026-07-31 a 2026-08-22 = 23 días, 151.782 filas.**

**Límite duro:** la serie arrancó el 31 de julio. **No hay historia larga.** No se puede leer estacionalidad, no hay comparación interanual y no se puede separar tendencia de ruido. Todo lo que sigue es una fotografía de tres semanas, no una serie temporal.

### 4.2 Curva de CTR propia (filas no-marca)

MEDIDO:

| Posición | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CTR | 4,25% | 3,05% | 2,29% | 1,35% | 1,12% | 0,80% | 0,57% | 0,49% | 0,31% | 0,35% | 0,35% | 0,40% |

El benchmark de industria para posición 1 ronda **28-40%**. Berel obtiene **4,25%**.

**Esto no es un problema de Berel: es el vertical.** AI Overviews y las galerías de Pinterest se comen el clic antes de que el resultado orgánico tenga oportunidad. La consecuencia práctica es de método: usar la **curva propia** en lugar de un benchmark ajeno absorbe ese efecto sin tener que estimarlo, y es por eso que el objetivo de todo el backlog de §5 se fija en **2,29% (posición 3 propia)** y no en un número de industria.

### 4.3 Línea base por tema

MEDIDO — 23 días, filas no-marca:

| Tema | Impresiones | Clics | Queries | Pos. ponderada |
|---|---|---|---|---|
| SELLADOR | 40.498 | 193 | 1.027 | 7,3 |
| PISO/CEMENTO | 10.259 | 99 | 371 | 7,0 |
| BAÑO (ya ganado) | 6.041 | 48 | 366 | 7,9 |
| RECÁMARA/CUARTO | 5.784 | 10 | 327 | 7,3 |
| FACHADA/EXTERIOR | 2.333 | 26 | 375 | 10,1 |
| HERRERÍA/METAL | 2.221 | 55 | 230 | 8,1 |
| COCINA | 363 | 1 | 94 | 10,9 |
| SALA/COMEDOR | 147 | 0 | 60 | 12,0 |

**Berel no aparece en el top 10 de ninguno de los siete espacios del hogar**, salvo baño por la vía del tutorial. Recámara es el caso más elocuente: 5.784 impresiones con **10 clics** en 23 días. La demanda llega y no convierte en visita.

### 4.4 El activo probado

MEDIDO/ESTIMADO. `/tutoriales/como-transformar-tu-bano-con-pintura` sostiene **catorce keywords no-marca en top 3** con una sola URL:

| Keyword | Vol. ESTIMADO | Pos. |
|---|---|---|
| pintura para baños | 4.400 | #2 |
| pintura para baño | 4.400 | #2 |
| colores de pintura para baños | 880 | #2 |
| colores para pintar un baño | 720 | #2 |
| ideas para pintar un baño | 210 | #3 |
| pintura para regadera de baño | 110 | #2 |
| pintura especial para baños | 90 | #2 |
| pintura para pintar baños | 70 | **#1** |
| pintura para regadera | 70 | #3 |
| pintura acrilica para baños | 50 | #2 |
| que pintura usar para baños | 40 | **#1** |
| pintura de baño | 40 | #2 |
| ideas para pintar mi baño | 40 | #3 |
| baño para pintar | 30 | #2 |

Más un #4 en `como pintar un baño` (210), fuera de top 3.

⚠️ **Honestidad del dato.** Las catorce suman 11.150 nominal, pero `pintura para baños` y `pintura para baño` (4.400 cada una) son **la misma demanda agrupada**: descontado el par, el piso defendible es **~6.750/mes**. El caso se defiende por **conteo de posiciones**, no por volumen agregado.

**El hallazgo estratégico:** ese formato de tutorial existe **solo para baño** y nunca se replicó a ningún otro espacio.

### 4.5 Qué páginas capturan impresiones no-marca hoy

MEDIDO — 23 días, impresiones no-marca (clics entre paréntesis):

home 36.417 (306) · artículo del sellador 27.406 (71) · `/lineamaderas` 13.725 (162) · ficha removedor 10.179 (60) · ficha pintura-para-pisos 8.668 (86) · `/colores/grises` 6.382 (20) · tutorial baño 5.502 (46) · artículo mes-de-nacimiento 5.157 (47) · tutorial alberca 5.052 (21) · ficha sellador 4.795 (42).

Dos observaciones: **las fichas de producto capturan más demanda informacional que los artículos**, y `/colores/grises` es la sexta página del sitio en impresiones no-marca — un hub de color, no un artículo.

---

## 5. El backlog de striking distance

### 5.0 La superficie que produce este backlog ya existe en el portal

**Este carril no es un entregable artesanal ni una capacidad que Efeonce tenga que construir.** Está terminado, gobernado y operable hoy en Greenhouse:

| Pieza | Dónde vive | Task dueña |
|---|---|---|
| Reader canónico | [`src/lib/growth/seo/keyword-opportunities-reader.ts`](../../../src/lib/growth/seo/keyword-opportunities-reader.ts) | `TASK-1302` |
| Ruta ecosystem | `api/platform/ecosystem/growth/seo/keyword-opportunities` | `TASK-1645` |
| **UI de operador** | **`/admin/growth/seo/keywords`** — `KeywordOpportunitiesView`, `KeywordOpportunityTable`, `KeywordOpportunityMap`, `KeywordOpportunityVerdict` | `TASK-1308` (`complete`) |

El reader aplica **el mismo score** que se usó para producir las tablas de §5.1 y §5.2 —`impresiones × (CTR_esperado_en_objetivo − CTR_actual)` = clics incrementales, con la curva de CTR derivada de la propia organización— y **ya separa la canibalización como CONSOLIDACIÓN**, que es exactamente el carril B de §5.2. Las 57 oportunidades y los 576 clics incrementales de techo son **evidencia de lo que esa superficie devuelve**, no un artefacto hecho a mano para esta auditoría.

> **El hallazgo incómodo, y el más accionable de la cuenta.** La capacidad está construida y `complete`. La conexión de Search Console de Berel está activa y **acumulando datos desde el 31 de julio**. Y **nadie la había corrido para esta cuenta.** No es un problema de producto: es de **operación de la cuenta**.

MEDIDO — 23 días, filas no-marca, posiciones 8-20, mínimo 150 impresiones.

**Total: 57 oportunidades · 30.259 impresiones · 117 clics hoy · 576 clics incrementales** si todas subieran a posición 3.

⚠️ **576 es un techo aritmético, no un pronóstico.** Es el resultado de aplicar `impresiones × max(0, CTR_objetivo − CTR_actual)` con `CTR_objetivo = 2,29%` (posición 3 de la curva propia) a las 57 oportunidades. Asume que todas suben, que ninguna canibaliza a otra y que la curva de CTR no se mueve. Ninguna de las tres cosas va a pasar. Sirve para ordenar prioridades entre sí, no para prometer un número.

### 5.1 Carril A — empujar (una sola página compitiendo)

| Query | Impresiones | Pos. | Clics incr. | Página |
|---|---|---|---|---|
| colores para recamaras | 2.150 | 8,1 | **46** | `/articulos/tendencias-de-decoracion-y-pintura-para-recamaras` |
| barniz marino | 1.058 | 9,7 | 21 | — |
| pintura gris | 1.139 | 8,5 | 20 | `/colores/grises` |
| pintura gris para interiores | 626 | 9,6 | 12 | — |
| pintura para madera blanca | 706 | 8,2 | 12 | — |
| resanador de grietas | 537 | 8,8 | 11 | — |
| sellador transparente | 469 | 9,2 | 9 | — |
| pintura para pisos de concreto | 424 | 10,1 | 7 | — |

Otras señales del mismo carril: `pintura blanca` 1.438 @12,5 → 29 · `thinner americano` 431 @10,1 → 10 · `impermeabilizar` 419 @10,1 → 10.

### 5.2 Carril B — consolidar (varias páginas de Berel compitiendo entre sí)

| Query | Impresiones | Pos. | Páginas de Berel compitiendo |
|---|---|---|---|
| pintura | 4.127 | 9,0 | **26** |
| sellador para pared | 2.895 | 8,1 | 4 |
| sellador antisalitre | 1.391 | 10,4 | 3 |
| pintura para alberca | 1.155 | 8,3 | 3 |
| sellador de pintura | 1.028 | 9,1 | 3 |
| galon de pintura | 390 | 11,3 | 3 |

Este carril no se resuelve escribiendo: se resuelve decidiendo cuál página es la canónica del tema y subordinando el resto. Es el mismo problema que §6 documenta como canibalización.

### 5.3 Qué hay que descartar del backlog

`cafe negro portal` 900 · `fhegarsa tequila` 244 · `de que color es agosto` 281.

Son **artefactos del subdominio hash** `fs4inq5psfy6zdpxht.berel.com` (§6). No tienen valor comercial, no pertenecen a Berel como marca y no deben contarse como oportunidad. Aparecen en el dato porque el subdominio está indexado, no porque haya demanda relevante.

---

## 6. Defectos de arquitectura del sitio

OBSERVADO — inspección directa de HTML, `robots.txt` y menú de navegación. Ordenados por severidad e impacto, no por tipo.

Los dos primeros limitan el techo de todo lo demás: mientras existan, cada artículo nuevo nace con menos autoridad interna y menos posibilidad de ser descubierto de la que le corresponde.

### D-01 — No existe índice de blog · **crítico**

**Qué es.** `/articulos`, `/blog` y `/tutoriales` son soft 404. `/inspiracion/articulos` está en el menú, titulada "Articulos", pero es **duplicado exacto** de `/inspiracion`: mismo `h1` "Inspiración para cada espacio" y un solo enlace a artículos. **Los 115 artículos no se listan en ninguna URL del sitio.** El único camino humano es `/consejos-para-pintar`, que expone **4 de 115**.

**Cómo se verificó.** Petición directa a cada ruta candidata y comparación del HTML de `/inspiracion/articulos` contra `/inspiracion`; conteo de enlaces salientes en `/consejos-para-pintar`.

**Consecuencia.** Ni un usuario ni un crawler pueden llegar al 96% del contenido editorial por navegación. Los artículos dependen de que Google los recuerde desde el sitemap, sin recibir autoridad interna ni contexto de sección. Es la causa raíz de que 115 artículos produzcan un solo activo con enlaces y un solo activo con posiciones.

### D-02 — `/colores` está rota como página indexable · **crítico**

**Qué es.** Sin `<h1>`, **sin canonical**, 239 caracteres de contenido, **cero enlaces salientes**. Además declara `@type:"Web page"`, que no es un tipo válido de schema.org (el correcto es `WebPage`).

**Cómo se verificó.** Lectura del HTML de servidor de `/colores`.

**Consecuencia.** Es el catálogo de color: el activo central de una marca de color, y la puerta natural de toda la demanda de familias cromáticas. Hoy no puede rankear ni distribuir autoridad hacia los nueve hubs de familia que sí existen (`/colores/grises` ya captura 6.382 impresiones no-marca **sin** ayuda de su propia página madre).

### D-03 — Enlazado editorial hacia una ruta bloqueada por robots · **alto**

**Qué es.** El `robots.txt` declara `Disallow: /search` y `Disallow: /*?q=`. Los artículos enlazan los colores a `/search?q=<color>`: **39 enlaces únicos en solo 8 artículos revisados.** Deberían apuntar a `/colores/<familia>`, que existen: amarillos, azules, cafés, grises, morados, naranjas, pasteles, rojos, verdes.

**Cómo se verificó.** Extracción de enlaces salientes de una muestra de 8 artículos y contraste contra `robots.txt` y contra las rutas de familia efectivamente servidas.

**Consecuencia.** Cada mención de color en el blog envía autoridad interna a un destino que el crawler no puede seguir. Es autoridad emitida y perdida, y son 39 enlaces en una muestra de 8 artículos sobre un corpus de 115 — la magnitud real es mayor.

### D-04 — Soft 404 que responde HTTP 200 · **alto**

**Qué es.** Una URL inexistente devuelve **200** con ~111KB, **sin `<title>`, sin `<h1>`, sin JSON-LD** y con canonical literal `https://berel.comundefined`.

**Cómo se verificó.** Petición a una ruta inventada y lectura del HTML devuelto.

**Consecuencia.** Un chequeo por status code no lo detecta. Cualquier auditoría automatizada del sitio —propia o de un tercero— reporta salud donde hay páginas vacías indexables, y ese es el mecanismo por el que D-01, D-06 y D-07 pudieron convivir tanto tiempo sin ser vistos.

### D-05 — 20 grupos de artículos canibalizados · **alto**

**Qué es.** Grupos de artículos compitiendo por la misma intención. Los peores: humedad **9** · madera **7** · psicología/elección de color **7** · sostenibilidad **7** · Kover **5** (dos sobre el **mismo SKU**) · exteriores **5** · térmico **5** · Frida Kahlo 4 · Pitaya/Color 2026 4 · Navidad 4 · Color del año 3 · Eterna Armonía 3 · sala 3 · cocina 3 · preparación/sellador 3 · Summa 3 · Día de Muertos 2 · Distrito Urbaya 2 · Berelex Green 2 · errores al pintar 2.

**Cómo se verificó.** Agrupación del inventario de 115 artículos por intención y contraste con el carril B de §5.2.

**Consecuencia.** Es la contraparte estructural del carril B: `pintura` con 26 páginas compitiendo, `sellador para pared` con 4. Ningún artículo nuevo sobre un tema ya canibalizado mejora la situación; la agrava.

### D-06 — Los siete hubs `/inspiracion/*` son galerías vacías · **medio**

**Qué es.** 2-3 enlaces cada uno, **el 100% hacia otros hubs**, cero a productos y cero a artículos. **Ninguno tiene meta description.** Y no existe `BreadcrumbList` ni `ItemList` en ninguna página del sitio.

**Cómo se verificó.** Conteo y clasificación de enlaces salientes de los siete hubs; búsqueda de tipos de schema en el HTML servido.

**Consecuencia.** La estructura por espacios —el eje con el que Comex gana (§3.3)— existe como URLs pero está vacía de contenido y de enlazado. La ausencia de `ItemList` y `BreadcrumbList` además le niega al buscador cualquier señal de jerarquía del sitio.

### D-07 — Cuatro patrones de URL fuera de `/articulos/` · **medio**

**Qué es.**

- `/impermeabilizante-para-azotea-como-elegir` — en raíz
- `/pintura-y-barniz-para-madera-como-elegir` — en raíz
- `/inspiracion/articulos/moho-salitre-y-humedad-como-repararlos` — plural
- `/inspiracion/articulo/un-ejemplo-.../slgo` — singular **más sufijo sin significado**; contenido **duplicado** de `/articulos/un-ejemplo-...` y con `<title>` "Salas que dan gusto", que no corresponde al slug

**Cómo se verificó.** Inventario de URLs de contenido y comparación de contenido y `<title>` entre pares sospechosos.

**Consecuencia.** Cinco convenciones de URL para un mismo tipo de contenido, con al menos un duplicado exacto y un `<title>` desalineado del slug. Rompe cualquier regla de agrupación por directorio, propia o del buscador.

### D-08 — Enlaces internos rotos hacia soft 404 · **medio**

**Qué es.** Enlazan a rutas que no existen: `/articulos/mas-color-para-tu-hogar-con-berelinte` · `/articulos/que-acabado-elegir-mate-semibrillante-o-brillante` (la versión viva es `el-acabado-equivocado-puede-opacar-el-color-perfecto-...`) · `/articulos/tecnicas-de-pintura-y-decoracion-de-paredes-para-tu-sala-con-berel`. Y **el menú global** enlaza `/colores-de-temporada`, que es soft 404 (el real es `/articulos/colores-de-temporada`).

**Cómo se verificó.** Resolución de destinos de enlaces internos y del menú global contra las rutas realmente servidas.

**Consecuencia.** El caso del menú global es el más costoso: es un enlace presente en todas las páginas del sitio apuntando a una página vacía. Por D-04, ninguno de estos casos aparece en un chequeo por status code.

### D-09 — Subdominio hash rogue indexado · **medio**

**Qué es.** `fs4inq5psfy6zdpxht.berel.com` rankeando para nombres de ferreterías: `calzada arboleda` 9.900 @6, `ferreteria alvarado` 1.300 @8 y ~25 casos más.

**Cómo se verificó.** Aparición del host en las filas de Search Console del dominio y contraste de las queries contra el negocio de Berel.

**Consecuencia.** Contamina la propiedad de dominio con demanda que no es de Berel, ensucia toda agregación de Search Console y expone un host que nadie declaró como público. Es el origen de los descartes de §5.3.

### D-10 — URLs mal registradas en Notion · **bajo**

**Qué es.** Seis de los Enlaces del Content Hub de Berel apuntan a soft 404.

**Cómo se verificó.** Resolución de los enlaces registrados en el Content Hub contra las rutas servidas.

**Consecuencia.** El registro operativo del contenido no coincide con el sitio. Cualquier medición o refresh que parta del Content Hub arranca de referencias muertas.

---

## 7. Historia de la estrategia

Notion — verificado.

### 7.1 La serie por espacios sí se propuso, en marzo de 2026

El pitch de licitación de marzo de 2026 dice textualmente *"5 espacios / Sala, recámara, cocina, baño, exterior — el calendario editorial completo"* y *"topic clusters para los cinco espacios del hogar"*. Se ancló en el artículo modelo *"Cómo elegir el color perfecto para tu sala"* con evidencia de Semrush: **+13.000 búsquedas/mes en el clúster de interiores, KD 19-32, cero marcas de pintura posicionadas**.

Comedor y cuarto infantil **no** estaban en esa lista de cinco.

### 7.2 Por qué no se ejecutó — tres razones, ninguna técnica

1. **Era un upsell.** `presupuesto_detallado_berel.docx` la ubica en el escenario superior: *"4 artículos adicionales por mes… Serie Laboratorio Berel"*.
2. **El calendario real lo dicta el cliente.** Maria Fernanda Vega, por Teams el 22/07/2026, con eje **producto + temporalidad**, no espacios.
3. **La infraestructura quedó vacía.** El tipo "Serie de Artículos" existe pero **cero de las 117 filas** lo usa, y la plantilla está sin llenar: "Serie 1 / Serie 2 / Seria 4".

### 7.3 El diagnóstico ya estaba escrito

`propuesta_estrategica_berel.docx` dice: *"Sin clusters temáticos — El blog publica contenido aislado sin arquitectura de pillar pages ni topic clusters ▸ Canibalización de keywords"*.

Es decir: la canibalización que §6 (D-05) mide hoy en 20 grupos **estaba diagnosticada y propuesta desde antes**. No es un hallazgo nuevo; es un hallazgo que llevaba meses sin ejecutar.

### 7.4 Decisión arquitectónica pendiente: Modelo A vs Modelo B

La única Pillar Page del hub (🎨 Colores de Temporada, estado "En revisión", 15-sep) **no tiene un solo subítem**. Su propio análisis de agosto dice que *"el contenido que vive encima de esa base hoy no funciona como pilar, funciona como un artículo de temporada single-use"*, y propone elegir entre:

- **Modelo A** — pilar acumulativo
- **Modelo B** — pilar + clúster hub & spoke ← recomendado en ese mismo análisis

**Nadie registró la decisión.** Sigue abierta.

### 7.5 Higiene del Content Hub

Las relaciones "Pilar JTBD", "Buyer Persona" y "Calendario de Contenidos" del Content Hub de Berel apuntan a **las bases de marketing de Efeonce** (7 pilares Wave/Globe/Reach, 21 personas B2B tipo "María Marketing"). Ninguna de las 117 filas de Berel las usa: están **al 100% en null**.

No hay contaminación de datos porque nadie las llenó, pero el esqueleto del hub de un cliente está apuntando al modelo comercial de la agencia. Cualquier automatización futura sobre esas relaciones escribiría el dato equivocado.

---

## 8. Lo entregado

Cinco briefs en el Content Hub, con publicación prevista **2026-09-15**:

| Slot | Artículo | Demanda del clúster (ESTIMADO) | Línea base MEDIDA | Estatus |
|---|---|---|---|---|
| N29 | Cómo pintar tu cocina | `colores para cocina` 12.100 + `pintura para cocina` 2.900 | 363 imp @10,9 | greenfield |
| N30 | Cómo pintar tu recámara | 42.760/mes piso defendible (47.160 nominal) | 5.784 imp @7,3 | **striking distance** |
| N31 | Cómo pintar tu sala y sala-comedor | 18.850/mes en 12 keywords; eje sala-comedor 7.200 | 147 imp @12,0 | greenfield |
| N32 | Cómo pintar un piso de cemento | ~14.600 de captura objetivo (18.480 crudo) | 10.259 imp @7,0 | señal fuerte |
| N33 | Cómo pintar herrería y proteger el metal del óxido | ~13,4k suma bruta con solapamiento | 2.221 imp @8,1 | autoridad vía fichas |

Cada brief entrega **11 secciones** dentro de un encabezado desplegable 1 en Notion: definición, demanda verificada, panorama competitivo, mapa de Query Fan-Out, estructura con H2 como preguntas literales, citabilidad, producto, enlazado interno, on-page, medición y refresh, supuestos y límites.

Los cinco cuelgan de `/consejos-para-pintar`, **el único hub bien construido del sitio**. Es una decisión deliberada: dado D-01, es el único punto de anclaje que existe.

**Qué quedó fuera y por qué:**

- **Baño — no entra.** Ya está ganado por el tutorial (§4.4). Un artículo nuevo sobre baño competiría con las catorce posiciones que ya existen; sería crear un caso de D-05 a mano.
- **Exteriores — no entra.** Ya hay **7 activos** sobre el tema. El trabajo ahí es **reposicionar y consolidar, no agregar**; entra al carril B, no al carril de contenido nuevo.

---

## 9. Hipótesis descartadas con datos

Documentadas para que nadie las reabra sin dato nuevo.

| Hipótesis | Por qué se descarta |
|---|---|
| **"Cuánto cuesta pintar una casa"** | Solo 210/mes (ESTIMADO). El clúster de costo en México lo dominan los **carros** (`cuanto cuesta pintar un carro` 2.400). No vale un slot. |
| **Familias de color como tema de blog** (`gris claro` 27.100, `azul turquesa` 60.500, `círculo cromático` 90.500, `psicología del color` 14.800) | OBSERVADO: SERP de diseño gráfico y referencia, no de hogar. Ese volumen pertenece al hub `/colores`, no al blog. |
| **Azulejos** (`pintura para azulejos` 4.400; SERP sin ninguna marca mexicana) | Demanda limpia y SERP abierto, **pero Berel no tiene producto declarado para azulejo**. Descartada por falta de respaldo, no por falta de oportunidad. |
| **Chukum** (`chukum` 18.100 + `acabado chukum` 1.900; es la página informacional #1 de Comex con 6.903 de tráfico) | Berel no tiene línea de texturas. Mismo criterio. **Vale pasarla al cliente como señal de PRODUCTO, no de contenido.** |
| **Thinner** (`thinner` 33.100, `aguarras` 8.100) | El head es transaccional. Lo ganable con artículo es `para qué sirve el thinner` (720) y `diferencia entre thinner y aguarrás` (170): contenido de apoyo, no slot principal. Berel sí tiene Thinner Americano (431 imp @10,1 MEDIDO). |

**Un matiz de método que aplica a esta sección.** El eje de la query importa más que la familia: descartar toda la familia de grises mirando el SERP de `gris claro` habría sido un error, porque `pintura gris` es otra query con intención de pintura — 1.139 impresiones @8,5 MEDIDO, y `/colores/grises` es la sexta página del sitio en impresiones no-marca. En cambio `círculo cromático` y `psicología del color` sí son trampa. La regla operativa vive en la skill `seo-aeo` (módulo 02); acá queda el caso.

---

## 10. Recomendaciones priorizadas

Orden por RICE cualitativo: **alcance × impacto × confianza / esfuerzo**. No hay estimación numérica de esfuerzo porque la implementación es del equipo de Berel, no de Efeonce.

**Antes que cualquier bloque va B0** (§5.0): correr para Berel la superficie de oportunidades que el portal ya tiene. No requiere construir nada, no requiere producir contenido y no depende de que Berel toque su sitio — es la única recomendación de esta auditoría que Efeonce puede ejecutar hoy por su cuenta.

**Y entre bloques, el orden es: (a) rinde antes que (c).** Los arreglos de arquitectura tocan **las 164 URLs de contenido** con esfuerzo de desarrollo acotado; un artículo nuevo toca una URL. Y sin (a), los artículos nuevos rinden menos por construcción: **nadie puede navegarlos** —ni el usuario ni el crawler— porque no existe índice de blog, y cada mención de color que hagan enviará autoridad a una ruta bloqueada por `robots.txt`. Publicar contenido nuevo antes de (a) es pagar producción para alimentar un canal con fuga.

### Bloque (a) — arquitectura: alto retorno, bajo esfuerzo

| # | Acción | Defecto | Alcance | Confianza |
|---|---|---|---|---|
| **A1** | **Crear un índice de blog real** que liste los 115 artículos, paginado, con `ItemList`, y colgarlo del menú global reemplazando el duplicado `/inspiracion/articulos` | D-01 | 115 artículos hoy inalcanzables | alta |
| **A2** | **Reparar `/colores`** como página indexable: `h1`, canonical, contenido, enlaces a las nueve familias, y `@type` corregido a `WebPage` | D-02 | activo central de una marca de color | alta |
| **A3** | **Redirigir el enlazado editorial** de `/search?q=<color>` a `/colores/<familia>` | D-03 | ≥39 enlaces en 8 artículos; corpus de 115 | alta |
| **A4** | **Arreglar los enlaces internos rotos**, empezando por el del **menú global** (`/colores-de-temporada` → `/articulos/colores-de-temporada`), que está en todas las páginas | D-08 | sitio completo | alta |
| **A5** | **Sacar de índice el subdominio hash** `fs4inq5psfy6zdpxht.berel.com` | D-09 | limpia toda la medición de la propiedad | alta |
| A6 | Hacer que las URLs inexistentes devuelvan **404 real** | D-04 | habilita cualquier auditoría automatizada futura | alta |
| A7 | Poblar los siete hubs `/inspiracion/*` con enlaces a artículos y productos + meta description + `BreadcrumbList`/`ItemList` | D-06 | el eje con el que gana Comex | media |
| A8 | Consolidar los cuatro patrones de URL en la convención `/articulos/` con redirecciones | D-07 | 5 convenciones → 1 | media |

A1-A5 son el corazón del bloque: alcance máximo, confianza alta y ninguno depende de producir contenido nuevo.

### Bloque (b) — carril A de striking distance: empujar lo que ya rankea

**B0 — Correr para Berel la superficie que ya existe: `/admin/growth/seo/keywords`.** No hay que armar un reporte de striking distance: hay que **operar la cuenta en la herramienta que el portal ya tiene** (§5.0). Es la acción de menor esfuerzo y mayor confianza de toda esta auditoría — la capacidad está `complete`, el dato del cliente está conectado desde el 31 de julio, y el backlog de §5 es lo que esa superficie devuelve. Todo lo que sigue en este bloque es priorización **sobre** su salida, y la cifra que se le presente al cliente debe salir de ahí (§11.10).

Trabajo sobre páginas existentes, sin producción nueva. Techo agregado del backlog completo: **576 clics incrementales** (§5, con su advertencia).

1. **`colores para recamaras`** — 2.150 imp @8,1, **46 clics incrementales**, la oportunidad individual más grande del backlog. Página: `/articulos/tendencias-de-decoracion-y-pintura-para-recamaras`. Converge con el brief N30, que ya está entregado.
2. **`pintura blanca`** (1.438 @12,5 → 29) y **`pintura gris`** (1.139 @8,5 → 20, en `/colores/grises`). El segundo depende de A2: `/colores/grises` está capturando 6.382 impresiones no-marca sin ayuda de su página madre.
3. **`barniz marino`** (1.058 @9,7 → 21) y la familia de madera (`pintura para madera blanca` 706 @8,2 → 12), respaldadas por `/lineamaderas`, que ya es la tercera página del sitio en impresiones no-marca.
4. **Carril B — consolidación**, empezando por `sellador para pared` (2.895 @8,1, 4 páginas) y el caso extremo `pintura` (4.127 @9,0, **26 páginas**). Esto es la misma acción que resolver D-05: decidir la canónica y subordinar el resto. **No requiere escribir; requiere decidir.**

### Bloque (c) — carril B de contenido nuevo

Los cinco briefs de §8, con publicación 2026-09-15, en el orden en que la evidencia los respalda:

1. **N30 recámara** — el único de los cinco que ya está en striking distance (5.784 imp @7,3). Es el que menos depende de ganar autoridad nueva.
2. **N32 piso de cemento** — señal medida fuerte (10.259 imp @7,0) y respaldo de producto verificado en ficha.
3. **N33 herrería y metal** — autoridad ya presente vía fichas de producto (2.221 imp @8,1).
4. **N29 cocina** y **N31 sala** — greenfield puro (363 y 147 impresiones). Máxima demanda estimada, mínima señal propia. Son los que más dependen de que el bloque (a) esté hecho.

**Decisión que hay que registrar antes de escalar este bloque:** Modelo A vs Modelo B de la pillar page (§7.4). Sin ella, cada artículo nuevo se cuelga de `/consejos-para-pintar` por descarte, no por arquitectura.

---

## 11. Límites de esta auditoría

Lo que **no** se verificó, declarado para que nadie lo asuma cubierto:

1. **La ventana medida son 23 días.** No hay estacionalidad, no hay comparación interanual, no se puede separar tendencia de ruido. En una categoría con estacionalidad evidente —impermeabilizantes en temporada de lluvias, color de temporada, Navidad, Día de Muertos— eso es un límite grande.
2. **Quedaron consultas de Semrush pendientes por cuota de unidades API.** Varios clústeres no se cerraron con datos de terceros. Nota operativa: cuando el MCP de Semrush agota cuota, el mensaje de error afirma que *el plan no incluye acceso MCP*; es un mensaje engañoso. Si el mismo reporte funcionó antes en la sesión, es cuota, no plan.
3. **No se auditaron los 115 artículos uno a uno.** El inventario y la agrupación por canibalización cubren el corpus completo, pero el análisis de **enlazado interno se hizo sobre una muestra de 8 artículos**. Los 39 enlaces a ruta bloqueada de D-03 son el hallazgo de esa muestra; la magnitud real en 115 artículos es mayor y no está cuantificada.
4. **No se revisaron Core Web Vitals, `hreflang` ni imágenes.** Rendimiento, internacionalización y optimización de assets están fuera de esta auditoría. En un sitio Next.js con backend headless y galerías de inspiración, los tres merecen su propia pasada.
5. **Los totales de clúster de terceros llevan la inflación declarada.** Dos vías conocidas: pares singular/plural que son la misma demanda (`colores para cocina`/`colores para cocinas` ambos 12.100; `pintura para piso`/`pintura para pisos`) y valores idénticos repetidos que apuntan a agrupación por bucket de la fuente (en herrería, 6 de 14 keywords repetían valor: dos en 880, cuatro en 720). Por eso los briefs de §8 declaran piso defendible, no suma bruta. Presentar la suma bruta como demanda limpia es exactamente donde el cliente pregunta.
6. **Las agregaciones por tema de §4.3 pueden tener doble conteo por sitelinks.** Con dimensiones `[query, page]`, una búsqueda donde aparecen varias páginas del sitio genera una fila por página. Medido: en queries de marca la inflación es grande (`berel` aparece con 300 páginas y suma 86.282 impresiones; `/productos` sola aporta 15.193 con 20 clics); en los temas no-marca de esta auditoría la inflación fue **1,0x-1,1x, dentro del ruido**. Para el backlog de §5 el par `(query, page)` **es** la unidad correcta y no está afectado.
7. **La posición reportada con pocas impresiones no es interpretable.** `pintura para sala` tiene 1.600 estimados y 26 impresiones @9,6: es muestra insuficiente, no herramienta inflada. El diagnóstico válido en esos casos es la **brecha volumen-vs-impresiones**, no la posición.
8. **Los SERP de §3 son fotos, no series.** Un SERP se mueve. Y en dos casos el conteo de dominios del top 10 no es 10: en `pintura anticorrosiva` son 10 resultados y 9 dominios (YouTube ocupa #8 y #10); en `colores para cocina` son 10 resultados y 9 dominios (`co.pinterest.com` ocupa #1 y #9, más `ar.pinterest.com` en #10 → Pinterest se lleva 3 de 10). En ambos casos el dato real **refuerza** la conclusión de SERP flojo, pero el conteo hay que declararlo bien.
9. **Los claims de producto se verificaron contra ficha, no contra laboratorio.** Los hechos de ficha relevantes están registrados en el dossier de research; el precedente a evitar está documentado: Berelinte declara *"mejor resistencia al salpiqueo al aplicarse con rodillo"* y **no** declara resistencia a manchas — salpiqueo al aplicar no es lo mismo que manchas en uso, y esa confusión llegó una vez a un brief de cliente. Igual criterio: la Pintura para Pisos es **acrílica, no epóxica**; Biometal **no es autoimprimante**; Fondo Noxid es para hierro o acero, **no** para aluminio ni galvanizado; Qualik **no** menciona azulejo ni cerámica.

10. **El backlog de §5 se calculó con un script ad-hoc que replica el score del reader canónico**, no con la superficie del portal. El score es el mismo (`impresiones × (CTR_objetivo − CTR_actual)` con curva de CTR propia), pero la ventana no: acá son **23 días** por lo que hay de serie, y el reader canónico trabaja sobre **28 días**. **La cifra oficial —la que se le presenta al cliente y la que el cliente puede auditar— debe salir de `/admin/growth/seo/keywords`**, que es la fuente de verdad. Las tablas de §5.1 y §5.2 son ordenamiento de prioridades verificado, no el reporte entregable.

---

## Referencias

- Oficio y doctrina de método: skill `seo-aeo`, módulos [`02_SEO_CONTENT`](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) (contenido, topical authority, intención) y [`07_MEASUREMENT`](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md) (Search Console, striking distance, curvas de CTR).
- Proceso repetible de priorización editorial: [`docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md).
- Uso comercial del diagnóstico (pricing, encuadre, upsell): skill [`seo-aeo-practice`](../../../.claude/skills/seo-aeo-practice).
- Conexión de Search Console en Greenhouse: capability `growth.search_console.connect`, reader `readSearchConsoleAnalytics`, tabla `greenhouse_growth.seo_gsc_daily`, serie diaria de `TASK-1302`.
- Superficie de oportunidades striking-distance en el portal: UI `/admin/growth/seo/keywords` (`TASK-1308`), reader [`keyword-opportunities-reader.ts`](../../../src/lib/growth/seo/keyword-opportunities-reader.ts) (`TASK-1302`), lane ecosystem/MCP `api/platform/ecosystem/growth/seo/keyword-opportunities` (`TASK-1645`).
