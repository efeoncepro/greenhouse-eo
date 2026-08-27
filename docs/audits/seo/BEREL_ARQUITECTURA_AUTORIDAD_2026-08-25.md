# Berel — arquitectura de autoridad del blog y plan editorial de octubre — Auditoría 2026-08-25

## Estado

- Tipo: auditoría de cliente — **arquitectura de autoridad del corpus editorial** (grafo de enlaces, entidad de marca recurrente, vocabulario) y **plan editorial de octubre**
- Cliente: **Berel** (`berel.com`), fabricante mexicano de pintura arquitectónica. Efeonce le opera el blog.
- Fecha: 2026-08-25 · Versión: 1.0
- Scope: estado real de los slots de octubre; el grafo de enlaces internos medido con el filtro correcto; la orfandad de la entidad "Color del Año Berel" y su mapa por ciclo; el hueco de vocabulario del corpus y el léxico propietario del catálogo; la demanda medida de octubre con sus trampas; dos activos con posición y sin explotar; la fuga de SERP de marca; un riesgo de claim en una página ya publicada; y los entregables con sus bloqueantes
- Método: inspección directa del HTML de los 113 artículos con `curl`/fetch y extracción de enlaces y términos sobre `<main>` renderizado · DataForSEO (volúmenes, KD y SERP base MX, location 2484, consultas del 2026-08-25 con costo registrado) · Search Console `sc-domain:berel.com` vía la conexión de Greenhouse · Notion (Content Hub de Berel) · Teams (confirmaciones del operador)
- Verdict: **el corpus de Berel no está construyendo autoridad porque no está conectado, y su entidad más valiosa —el color del año— es la pieza más aislada del sitio.** 0,38 enlaces editoriales por artículo, 86% de las piezas sin un solo enlace entrante editorial, y la ficha ancla del color 2026 con **cero** entrantes y **cero** salientes editoriales: lo que parecía un ciclo encadenado era el pie de página global. Y hay una cosa **viva hoy** que no espera calendario editorial: una página publicada hace ocho días con claims de salud sin método ni norma.
- Documentos hermanos: [`BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](BEREL_SEO_DIAGNOSTIC_2026-08-25.md) (línea base del dominio, competencia, defectos D-01 a D-10, briefs N29–N33) y [`BEREL_COLOR_DEL_ANO_2027_2026-08-25.md`](BEREL_COLOR_DEL_ANO_2027_2026-08-25.md) (research, ángulo y plan de lanzamiento de la pieza-hito anual). Este documento **corrige una premisa** del segundo (§4.2) y **declara una discrepancia de conteo** con el primero (§12.4).
- Documento interno de Efeonce sobre un cliente. **No es una propuesta comercial** y no está redactado para entregarse al cliente tal cual.

> ## Convención de evidencia — leer antes de citar cualquier cifra
>
> | Marca | Fuente | Qué significa |
> |---|---|---|
> | **MEDIDO** | Search Console (`sc-domain:berel.com`), consulta directa a la API de DataForSEO con fecha y costo registrados, o conteo sobre el corpus completo de 113 artículos descargados | Una medición. Cada línea declara **cuál** de las tres: dato propio de la propiedad, índice de un proveedor, o conteo sobre el HTML del sitio. No son la misma cosa. |
> | **OBSERVADO** | HTML en vivo, SERP en vivo, `datePublished` del JSON-LD, contenido de un PDF del cliente | Una foto de un momento. No es serie ni promedio. |
> | **INFERIDO** | Deducción sobre datos observados o medidos | La conclusión no se observó: se dedujo. Se declara sobre qué. |
> | **SIN DATO** | No se midió, no se verificó, o la fuente no lo devolvió | **No es cero.** Una keyword que la API no devolvió no tiene volumen cero: no tiene dato. |
>
> Este documento **no usa** ESTIMADO ni REPORTADO en hallazgos propios. Donde cita una cifra ESTIMADA de Semrush lo hace a través de un hermano y lo declara, porque **Semrush estuvo inoperante toda la sesión** (§12.1).
>
> **Regla de uso.** Documenta el estado observado el 2026-08-25. El grafo de enlaces y los defectos caducan en cuanto el equipo de Berel toque el sitio; la demanda y los SERP caducan con las semanas; el estado de los slots caduca en cuanto alguien edite el Content Hub. Revalidar antes de consumir.

**Dónde vive lo que este documento no es dueño de definir:** el oficio de SEO/AEO en la skill `seo-aeo`; el uso comercial en `seo-aeo-practice`; el proceso repetible de priorización editorial en [`SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md); el estándar de forma de un brief en [`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](../../operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md). **Acá está la evidencia del caso.**

---

## 1. Resumen ejecutivo

Cinco cosas, y la primera no es de SEO.

1. **Hay una página publicada con claims de salud sin método ni norma** (§2). `colores-para-el-cuarto-infantil-que-crecen-con-ellos`, del 2026-08-17, afirma que un producto *"no tiene olor, es anti-viral, anti-bacterial y anti-hongos"* y que otro *"resiste más de 60,000 ciclos de lavado"*. Es una página viva, sobre la recámara de un niño. **Es lo único de este documento que no espera calendario editorial.**

2. **El corpus no está conectado.** MEDIDO sobre los 113 artículos: **43 enlaces editoriales**, o sea **0,38 por pieza**; **86% de los artículos sin un solo enlace entrante editorial**; nadie supera 4 salientes; y entre **16% y 23% del enlazado editorial apunta a soft 404** (§4). El conteo bruto decía otra cosa porque un destino está cableado en el pie de página de **113 de 113** artículos, lo que infla ~2,6× y fabrica hubs que no existen.

3. **La entidad más valiosa de la marca es la pieza más aislada del sitio.** `/articulos/color-berel-2026` tiene **cero entrantes y cero salientes editoriales**. Ningún satélite del ciclo Pitaya enlaza a su propia ficha ancla. Ningún ciclo encadena al siguiente. **Y las dos mejores piezas del ciclo creen estar enlazadas y no lo están**: el `href` de `paleta-calidez-vibrante` hacia Paraíso Mexicano apunta a un slug muerto (§5). El destino que sí está en las 113 páginas es la ficha del color — pero por chrome, no por edición: eso es exactamente lo que hizo parecer que "2025 enlaza a 2026".

4. **Hay un hueco de vocabulario medible y un léxico propietario sin usar.** En el cuerpo de los 113 artículos: `ofrenda` **0**, `sobremesa` **0**, `mesa compartida` **0**, `candelaria` **0**, `nochebuena` **0**. Tres años publicando el color del año sobre hospitalidad mexicana **sin escribir nunca la palabra ofrenda**. Al mismo tiempo, el catálogo tiene colores llamados **Cazuela de Barro**, **Comal** e **Itacate** — nombres que ningún competidor puede publicar — y un mismo código aparece con **dos nombres distintos** en artículos distintos (§6).

5. **Dos activos ya tienen posición y no tienen contenido.** La calculadora ranquea **#1 en México** con `meta description` de relleno, cero encabezados y cero JSON-LD; y una pieza de 2024 de 734 palabras ranquea **#9 en `colores del altar de muertos`** siendo **el único fabricante de pintura del top 10** (§8). Subir eso no requiere producir contenido nuevo: requiere operar lo que ya rankea.

Y una tensión de planificación que este documento **declara sin resolver**: los slots de octubre no eran siete libres —cuatro son artículos ya publicados, uno está bloqueado, dos están libres— y se entregaron **tres** briefs (§3.1 y §3.3).

---

## 2. 🔴 Lo único vivo hoy: riesgo de claim en una página publicada

Va primero **porque no depende de ningún calendario editorial y ya está publicado.** Todo lo demás de este documento es arquitectura y planificación; esto es una página que un padre o una madre puede estar leyendo hoy.

OBSERVADO — `berel.com/articulos/colores-para-el-cuarto-infantil-que-crecen-con-ellos`, `datePublished` **2026-08-17** (hace ocho días), 3.985 palabras, 14 H2.

| Claim publicado (verbatim) | Producto | Qué falta |
|---|---|---|
| *"no tiene olor, es anti-viral, anti-bacterial y anti-hongos"* | Berelex Green | **método, norma y alcance.** "Anti-viral" y "anti-bacterial" son claims de eficacia sanitaria: sin norma de ensayo ni organismo de referencia, no son verificables |
| *"resiste más de 60,000 ciclos de lavado"* | Berelinte | **método.** Un número de ciclos sin la norma de ensayo que lo produce no es un dato, es una cifra |

Por qué esto es distinto de una imprecisión editorial:

- **Son claims de salud, en una página sobre la habitación de un niño.** El lector al que le habla la pieza es exactamente el que menos puede verificarlos.
- **La cuenta ya tiene precedente de esta clase de error.** Está registrado en el diagnóstico general (§11.9): Berelinte declara *"mejor resistencia al salpiqueo al aplicarse con rodillo"* y **no** declara resistencia a manchas; esa confusión llegó una vez a un brief de cliente. La regla dura de la cuenta es **"si la ficha no lo declara literalmente, el H2 no se escribe"** — y acá el problema no está en un brief, está en una página publicada.
- **Lo que sí está verificado de estas líneas es más angosto.** OBSERVADO en ficha: Berelinte declara *"Esta pintura NO contiene plomo"* y *"Compuestos orgánicos volátiles (COV): < 50 g/L"*. **Ninguno de los dos claims de la tabla de arriba se verificó contra ficha en esta sesión: SIN DATO.**

**Acción, y no es editorial:** revisar los dos claims contra la ficha técnica vigente del producto, con norma y método a la vista. Si la ficha los declara literalmente, agregar norma y método al texto. Si no los declara, **retirarlos de la página publicada**. Dueño: cliente (producto/regulatorio). **No espera al calendario de octubre.**

> **Consecuencia sobre el plan editorial:** el territorio "espacios donde hay niños" es justamente el que quedó **en pausa** (§11.4), y su objeto citable —un checklist de COV, plomo, lavabilidad y tiempo de reocupación— es del mismo material que estos claims. **Escribir la pieza nueva antes de auditar la publicada sería producir un segundo activo sobre datos no verificados** (INFERIDO, de la relación entre el objeto propuesto y los claims observados).

---

## 3. El calendario real: octubre, y lo que no sabemos de noviembre

### 3.1 Siete slots declarados no son siete piezas

OBSERVADO — Content Hub de Berel en Notion, 2026-08-25:

| Estado real | Cuántos | Qué implica |
|---|---|---|
| **Artículos ya publicados** | **4** | No son piezas nuevas: son **refrescos**. El trabajo es reposicionar y consolidar, no producir |
| **Bloqueado** | **1** | Bloqueado por gráficos de campaña |
| **Libres de verdad** | **2** | La única capacidad real de pieza nueva del mes |

**Los siete llevan la misma fecha marcador `2026-10-15`** (OBSERVADO). Es una fecha de plantilla, no un calendario: no hay secuencia, no hay orden de publicación y no hay separación entre lo que se escribe y lo que se refresca.

Y los cuatro publicados no están en condiciones de sostener un clúster: **tres de los cuatro tienen cero H2** con **1.900–2.400 palabras** (MEDIDO — conteo de encabezados sobre `<main>`). Es el mismo patrón de "generación vieja" que el hermano del color documenta para la ficha ancla (§8.3 de aquel documento): jerarquía rota, sin bloque de preguntas, sin objeto citable. **Un refresh de esas cuatro piezas rinde más que un artículo nuevo**, y no compite con nada.

### 3.2 Noviembre: SIN DATO

**No se inventariaron los slots de noviembre en esta sesión.** Lo único de noviembre que quedó medido u observado es:

- **La segunda ola de PR del ciclo del color** (OBSERVADO): Pantone hace teaser a mediados de noviembre —reloj de cuenta regresiva con la **fecha**, no el color, más juego de predicción por familia—. Es una ventana de reactivación, **no un slot editorial**.
- **El slot que el kit del ciclo pondría ahí** (INFERIDO, §4.4): con ancla de publicación el 15-sep, el desarrollo mayor de paleta cae alrededor del **29-nov-2026**.

Todo lo demás de noviembre —cuántos slots hay, cuáles están libres, qué fechas reales tienen— es **SIN DATO**. No se declara "noviembre está libre".

### 3.3 La tensión aritmética, declarada y sin resolver

**Dos slots libres, tres briefs entregados** (§11.1). No se resolvió en la sesión a qué slot entra cada brief, ni si uno de ellos ocupa el slot bloqueado, uno de los cuatro refrescos, o un slot de noviembre. **Es una decisión de calendario del cliente** —el calendario editorial lo dicta el cliente, registrado en el diagnóstico general (§7.2)— y hay que cerrarla antes de que los briefs se conviertan en artículos. Se declara como bloqueante (§11.5, BA-1), no como detalle.

---

## 4. El grafo de enlaces internos, medido con el filtro correcto

### 4.1 Por qué el conteo bruto mentía

MEDIDO — extracción de enlaces sobre `<main>` renderizado de los 113 artículos.

El sitio tiene módulos globales —pie de página y carrusel de "relacionados"— que **inyectan los mismos destinos en todas las páginas**. Contarlos como enlaces internos produce tres errores de lectura al mismo tiempo:

1. **Infla el conteo ~2,6×.**
2. **Fabrica "hubs" que no existen**: un destino cableado en la plantilla parece un nodo central del clúster y no lo es. De tres supuestos "sumideros de autoridad", **solo uno era real**; los otros dos eran destinos cableados.
3. **Hace parecer conectado lo que está aislado** — y ese es el error caro (§5.1).

**Un solo destino está presente en 113 de 113 artículos** (MEDIDO): la ficha `/articulos/color-berel-2026`, cableada en el pie de página global.

**El filtro correcto:** descartar todo destino que aparezca en **más del 50% de las páginas** —eso es chrome, no edición— y medir solo el cuerpo editorial.

> **Y la consecuencia operativa es la opuesta a la intuitiva.** A un destino cableado **no se le dan salidas: se le quitan las entradas.** La terna fija de "relacionados" se reemplaza por un módulo contextual dirigido por el mapa de clúster. Un enlace que está en todas las páginas no transmite tema: transmite plantilla.

### 4.2 Lo medido, con el chrome fuera

MEDIDO — 113 artículos, enlaces del cuerpo editorial:

| Métrica | Valor | Lectura |
|---|---|---|
| Enlaces editoriales totales | **43** | contra 112 de conteo bruto |
| **Por artículo** | **0,38** | menos de un enlace editorial cada tres piezas |
| **Artículos sin un solo entrante editorial** | **86%** | contra 72% de conteo bruto |
| Artículos sin ningún saliente | **70%** | |
| Máximo de salientes en una pieza | **4** | ninguna pieza actúa como hub |
| **Enlaces editoriales que apuntan a soft 404** | **16%–23%** | ver §4.3 |

**Qué significa 0,38 en la práctica.** Un corpus de 113 piezas con 43 enlaces editoriales no es un clúster: es un archivo. Cada artículo nuevo nace sin recibir autoridad interna y sin transmitirla, y eso se compone con el defecto D-01 del diagnóstico general —**no existe índice de blog**, los 113 artículos no se listan en ninguna URL del sitio—. Los dos juntos explican por qué 113 piezas producen **un solo** activo con enlaces externos y **un solo** activo con posiciones.

> **Regla que sale de acá, y que ordena la prioridad de todo el plan editorial:** mientras el grafo esté así, **arreglar una pieza existente rinde más que publicar una nueva**. No es una opinión de método: es la lectura directa de 0,38 enlaces por pieza y 86% sin entrantes.

### 4.3 El enlazado que apunta a nada

**Entre 16% y 23% del enlazado editorial apunta a soft 404** (MEDIDO — resolución de destinos contra el inventario servido). Causa observada: **el overhaul de 2026 renombró slugs sin actualizar los enlaces que apuntaban a ellos.** Los destinos muertos con más enlaces entrantes son piezas de sala, de acabados y de humedad — territorios que el corpus sí cubre, enlazados a URLs que ya no existen.

Y por el defecto **D-04** del diagnóstico general —una URL inexistente devuelve **HTTP 200**, sin `<title>`, sin `<h1>`, sin JSON-LD y con canonical literal `berel.comundefined`— **ninguno de estos enlaces aparece roto en un chequeo por status code.** Un crawler automatizado reporta salud.

**Bug distinto, y probablemente del CMS:** **dos `href` truncados a ~65 caracteres** cuyo destino está vivo (MEDIDO). No es un slug renombrado: es una cadena cortada. Se arregla en la plantilla o en el editor, no en el artículo.

### 4.4 ⚠️ Discrepancia de conteo declarada y no resuelta

**Las cifras de §4.2 son las de la medición de la sesión.** Al re-contar sobre `data.json` —el dataset intermedio de la propia sesión, 113 páginas, enlaces `/articulos/` extraídos de `<main>`— se reproducen los números **previos** al filtro, no los posteriores:

| | Sesión (§4.2) | Re-conteo sobre el dataset intermedio |
|---|---|---|
| Enlaces | 43 editoriales (de 112 brutos) | **112**, y el filtro ">50% de las páginas" **no descarta ninguno** dentro de `<main>` |
| Sin entrante | 86% | **71,7%** |
| Sin saliente | 70% | **37,2%** |
| Máx. salientes | 4 | **4** ✔ |
| A destino inexistente | 16%–23% | **18,8%** ✔ (dentro de la banda) |

Lo que sí se reproduce y confirma el mecanismo: **`/articulos/color-berel-2026` aparece en 113 de 113 páginas del corpus descargado**, pero **fuera de `<main>`** — es decir, el destino cableado vive en el pie, y por eso no lo ve una extracción restringida al cuerpo.

**Lectura honesta:** la dirección del filtro es coherente (quitar chrome sube ambos porcentajes de aislamiento, y así lo hace), y el destino cableado en 113/113 está verificado por dos vías. Pero **el paso exacto que lleva 112 → 43 no es reconstruible desde el dataset intermedio**: la extracción que produjo el 43 fue más estricta que "enlaces `/articulos/` dentro de `<main>` menos los que aparecen en >50% de las páginas". **No se resolvió.** Antes de presentarle al cliente la cifra de 0,38 enlaces por pieza, hay que rehacer la extracción declarando el criterio exacto de "cuerpo editorial" (párrafos del artículo, excluyendo pie, carrusel de relacionados y CTA de plantilla). Las conclusiones cualitativas —corpus desconectado, entidad huérfana, ~19% a soft 404— **se sostienen con ambos conteos**; la cifra fina, no.

---

## 5. 🔴 La entidad "Color del Año Berel" está huérfana

Es el hallazgo central de este documento. La marca tiene una **entidad propia que se repite cada año** y que ningún competidor puede disputar — y la trata como un artículo de calendario.

### 5.1 La ficha ancla no tiene entradas ni salidas editoriales

MEDIDO — grafo editorial de §4.2:

| Nodo | Entrantes editoriales | Salientes editoriales |
|---|---|---|
| **`/articulos/color-berel-2026`** (ficha ancla, Pitaya `2-3605D`) | **0** | **0** |

Cuatro consecuencias, todas MEDIDAS u OBSERVADAS:

- **Ningún satélite del ciclo Pitaya enlaza a su propia ficha ancla.** Ni *Distrito Urbaya*, ni *Paraíso Mexicano*, ni *Calidez Vibrante*.
- **Ningún ciclo encadena al siguiente.** No hay 2025 → 2026 ni 2026 → 2025 en el cuerpo editorial.
- **La ficha no distribuye autoridad a nada**, ni a las paletas que la desarrollan ni a las familias de color.
- **Y el enlazado que sí tiene apunta a rutas bloqueadas:** `/articulos/color-berel-2026` enlaza a `/search?q=Rojos` y `/search?q=color del año 2026`, dos rutas que su propio `robots.txt` bloquea (`Disallow: /search`, `Disallow: /*?q=`). Es autoridad emitida y perdida — el defecto D-03 del diagnóstico general, en la pieza más importante de la marca.

> 🔴 **Corrección a un documento hermano.** El [research del Color del Año 2027](BEREL_COLOR_DEL_ANO_2027_2026-08-25.md) (§8.1, acción 4) dice *"encadenar 2026 → 2027 (**el 2025 ya enlaza al 2026**)"*. **El paréntesis es falso.** Lo que hacía parecer que el 2025 enlazaba al 2026 era **el pie de página global**, presente en 113 de 113 artículos (§4.1). **No existe el eslabón editorial 2025 → 2026.** La acción no es "encadenar 2026 → 2027": es **encadenar los tres ciclos, porque ninguno está encadenado.**

**La ironía que explica el error:** el único destino cableado en todas las páginas del sitio es, precisamente, la ficha del color del año. La entidad está simultáneamente **en todas partes** (como chrome) y **en ninguna** (como edición). Un conteo bruto la ve como el hub más fuerte del sitio. El conteo correcto la ve como el nodo más aislado.

### 5.2 Las dos mejores piezas del ciclo creen estar enlazadas

OBSERVADO. `/articulos/paleta-calidez-vibrante` (2026-07-22, **1.470 palabras, la pieza más larga del ciclo**) enlaza a Paraíso Mexicano usando el slug **`/articulos/paraiso-mexicano-2026-colores-que-saben-mexico`**, que **devuelve 200 con `<title>` vacío**. El slug vivo es **`/articulos/paraiso-mexicano-2026`**.

O sea: las dos mejores piezas del ciclo 2026 —la paleta más desarrollada y la paleta con el bug de cápsula— **están enlazadas en el HTML y desenlazadas en la práctica.** Y por D-04 nadie lo nota: el destino responde 200.

Esto es un caso de §4.3 con nombre y apellido, y es el arreglo de menor esfuerzo de todo el documento: **un `href`.**

### 5.3 El mapa de la entidad por ciclo

OBSERVADO — HTML en vivo, `datePublished` del JSON-LD y material del cliente (`NOMBRE DE PALETAS FINALES CON PSICOLOGIA DEL COLOR.docx`, 2026-07-10):

| Ciclo | Ficha ancla | Estado de la ficha | Satélites del ciclo | Cadencia |
|---|---|---|---|---|
| **2024** | `/articulos/color-berel-2024` | **no existe** — 200 sin `<title>` y sin JSON-LD. Es otro soft 404 de la familia. **Cualquier fecha atribuida a un "color 2024" es un dato inexistente** | **SIN DATO** | **SIN DATO** |
| **2025** — Maíz `2-1403T` | `/articulos/color-berel-2025` | 200 · **422 palabras** · título y canonical correctos · JSON-LD `Article` · **generación vieja: H1 → H3, cero H2** | *Eterna Armonía* — **Paola Izaguirre** (artes y cultura), ene–mar 2025 | `datePublished` **2024-07-31** |
| **2026** — Pitaya `2-3605D` | `/articulos/color-berel-2026` | 200 · **581 palabras** · correcta · `Article` · **generación vieja, cero H2** | *Distrito Urbaya* — **Rodrigo Castro** (diseño gráfico), ene–mar 2026 · *Paraíso Mexicano* — **Francisco Aguilar** (moda y contenido), abr–jun 2026 · `/articulos/paleta-calidez-vibrante` (2026-07-22) | `datePublished` **2025-09-29** |
| **2027** — "Bien y de Buenas" `1-3404D` | `/articulos/color-berel-2027` | **200 con título vacío ANTES de existir** — el bloqueante con reloj propio (BL-5 del hermano) | por definir | publicación en conflicto: **15-sep vs. "primera semana de octubre"** (BL-1 del hermano) |

Cuatro lecturas del mapa:

- **La colaboración con creadores es parte nativa del formato**, no un agregado — y Berel publica con autores anónimos. El `author` del JSON-LD es `"@type":"Person","name":"Equipo Editorial Berel"`: **un `Person` que no es una persona.** La palanca está identificada, con nombres, y sin usar.
- **La ficha ancla es la única pieza que no migró a la generación nueva.** Las paletas satélite tienen H2 en pregunta y bloque de preguntas; la ficha del color —el activo de marca— sigue en 400–580 palabras con jerarquía rota.
- **Bug de cápsula:** `paraiso-mexicano-2026` tiene H3 *"¿Cuál es el Color del Año Berel 2026?"* y *"¿Cuál es el Color del Año 2026?"*. **La paleta satélite responde la pregunta que le pertenece a la ficha ancla.** Con la ficha sin entrantes editoriales (§5.1), el satélite no solo compite: **gana**.
- **No hay cadencia propia utilizable.** Dos `datePublished` observables, a dos meses de distancia (31-jul-2024 y 29-sep-2025), sobre años distintos, y el tercer punto no existe. **No se presenta "Berel publica en julio" ni "en septiembre" como patrón propio.** La ventana del 2027 se justifica solo por el calendario del mercado, y eso está en el hermano (§5.3).

**La superficie de descubrimiento de toda la entidad es un hub con un solo enlace saliente.** `/articulos/colores-de-temporada` es la página con más impresiones del ciclo (**6.116**, MEDIDO — Search Console, ventana 2026-07-31 a 2026-08-22), sigue mostrando *Paraíso Mexicano* como paleta vigente y **enlaza a un solo artículo**. Como no hay índice de blog (D-01), **ese hub es la única vía real de descubrimiento interno del corpus** (INFERIDO, de la ausencia de índice más el conteo de salientes del hub). El hermano registra además que su carpeta de assets aparece vacía en el inventario local — **con la advertencia explícita de que puede ser sincronización de OneDrive y hay que reverificarlo antes de reportarlo** (§9.1 y §11.5 de aquel documento).

### 5.4 El kit de 6 piezas: el molde para 2027 en adelante

Deducido de lo que **sí funcionó** en los ciclos 2025 y 2026, con la cadencia expresada **relativa al anuncio** (no a un mes del calendario), y con el eslabón que ningún ciclo hizo bien marcado explícitamente. Las fechas de la última columna son **INFERIDAS** sobre el ancla 15-sep-2026, que **no está confirmada** (BL-1):

| Momento | Pieza | Rol en la autoridad | Fecha si el ancla es 15-sep-2026 |
|---|---|---|---|
| **D−30** | *(no es pieza)* **arreglar y reservar el slug destino** | Sin esto, Google puede indexar la URL vacía antes del lanzamiento | **2026-08-16 — ya pasó.** Y el destino **ya devuelve 200 vacío** |
| **D+0** | **Ficha ancla**, en generación nueva | El nodo de la entidad. H2 en pregunta, FAQ con `FAQPage`, `author` `Person` real, dato de fabricante | 2026-09-15 |
| **D+2** | **Aplicación profesional** | Le habla al que especifica: arquitecto, interiorista, contratista | 2026-09-17 |
| **D+30** | 🔴 **Satélite de espíritu, anclado a estacionalidad** | **El eslabón que ningún ciclo hizo bien, y el que produce capilaridad.** Traduce el concepto del color a una ocasión de uso real | **2026-10-15** — es exactamente la pieza entregada en §11.1 |
| **D+75** | **Paleta / desarrollo cromático mayor** | El formato que ya rinde: `paleta-calidez-vibrante` es la pieza más larga del ciclo | 2026-11-29 |
| **D+150** | **Tendencia cultural** | Segunda ola, aprovecha los compilados de fin de año y el teaser de Pantone | 2027-02-12 |
| **D+240** | **Segundo desarrollo** | Sostiene el ciclo hasta el anuncio siguiente | 2027-05-13 |

**Dos reglas duras del kit**, y las dos salen de lo que falló:

1. **Bidireccionalidad obligatoria.** Cada satélite enlaza a la ficha ancla **y** la ficha ancla enlaza a cada satélite. Hoy: 0 y 0 (§5.1).
2. **Encadenamiento de ciclos, incluida la ficha del año N ↔ año N−1.** Hoy: ningún eslabón editorial existe, y el que se creía existente era chrome (§5.1).

> **Por qué esto reencuadra el trabajo.** Una entidad de marca que se repite cada año **no es una pieza de calendario: es un clúster que compone autoridad anualmente.** Tratarla como "masa estacional" —clasificarla como difícil de convertir en autoridad y descartarla— fue exactamente el error de lectura de esta sesión, y es al revés: **ahí vive la gravedad de marca de Berel**, en el único territorio donde no tiene competencia posible.

---

## 6. Vocabulario: un hueco medido y un léxico propietario sin usar

### 6.1 Términos con cero menciones en 113 artículos

MEDIDO — conteo de términos sobre el **cuerpo** de los 113 artículos (no sobre el slug, no sobre el título):

| Término | Menciones en el corpus |
|---|---|
| `ofrenda` | **0** |
| `sobremesa` | **0** |
| `mesa compartida` | **0** |
| `recibir visitas` | **0** |
| `sala-comedor` | **0** |
| `rosca de reyes` | **0** |
| `candelaria` | **0** |
| `tamales` | **0** |
| `nochebuena` | **0** |
| `anfitrión` | **1** — y es de fútbol |

**Tres años publicando el color del año sobre hospitalidad mexicana sin escribir nunca la palabra ofrenda.** Y el racional del cliente para 2027 dice, literal, *"una mesa compartida, una conversación que se prolonga, una casa abierta"* (OBSERVADO — `Racional Color del Año 2027.pdf`), con **Hospitalidad** y **Convivencia** entre sus ocho conceptos clave.

**Por qué esto no lo muestra ninguna herramienta de keywords:** un hueco de vocabulario no es un hueco de demanda. Se ve **contando términos del concepto en el corpus propio**, no consultando volúmenes. Y contarlos por slug no sirve: el antipatrón de esta sesión fue barrer 113 artículos por patrón de slug, concluir "territorio libre" y descubrir después que el contenido decía otra cosa —incluida una tabla que se iba a proponer como "objeto citable inexistente" y **ya estaba publicada verbatim**—.

### 6.2 El activo más desaprovechado: los nombres del propio catálogo

OBSERVADO — catálogo de color de Berel. Hay colores con nombre de **objeto de casa** y de **comida mexicana**:

| Color | Código | Por qué importa |
|---|---|---|
| **Cazuela de Barro** | `1-3005D` | objeto de la cocina mexicana, en el corazón del territorio "mesa" |
| **Comal** | `4-2103T` | idem |
| **Itacate** | `2-1103T` | **la comida que te dan para llevar cuando te vas de una casa.** Es la palabra exacta de la hospitalidad mexicana |
| **Mole Poblano** | `327N` | |
| **Calor de Hogar** | `321N` | |
| **Tierra Mojada** | `329N` | |

Y en el brief entregado se consolidaron doce, agregando **Harina de Trigo `2-1606P`**, **Terrenal `1-1607P`**, **Tierra de Siena `1-3109D`**, **Canela Mascabado `1-1209D`**, **Caja de Pandora `322N`** y **Café Huarache `330N`** (§11.1).

**Son nombres propietarios: ningún competidor puede publicar esa tabla.** Es la clase de activo que un keyword tool nunca sugiere y que solo aparece leyendo el catálogo del cliente.

> **Y por eso el gate de utilidad citable falla acá — legítimamente.** El método exige que el objeto siga sirviendo sin logo ni CTA (`unbrand test`). Cuando el objeto **ES** la entidad de marca —un léxico propietario—, quitar la marca lo vacía: **el gate falla por construcción**. La lectura correcta no es "arreglarlo" ni marcarlo verde para que cuadre: es que **la pieza es construcción de entidad, no utilidad neutra**, y por lo tanto **se mide por menciones y citas del léxico, no por backlinks al objeto**. Declararlo fallado y explicar por qué es más honesto y más útil que forzar el verde.

### 6.3 ⚠️ Un mismo código con dos nombres

OBSERVADO — en artículos distintos del mismo sitio:

| Código | Nombre A | Nombre B |
|---|---|---|
| `1-3605D` | Terra Nova | Terracota Nova |
| `4-2103T` | Comal | Gris Comal |
| `1-2804D` | Pay de Nuez | Café Pay de Nuez |

**Disuelve la entidad justo donde debería concentrarse.** Un motor de respuesta que intente resolver "qué color es `4-2103T` de Berel" encuentra dos nombres en la misma fuente. **Hay que fijar un nombre por código antes de publicar cualquier tabla de léxico**, o la pieza que debería construir la entidad la fragmenta.

---

## 7. La demanda medida de octubre, y sus tres trampas

**MEDIDO — DataForSEO, base MX (location 2484, es), 2026-08-25. Costo total de la sesión ≈ USD 0,14** (≈0,08 en los lotes de octubre + 0,013 en la familia cromática + 0,049 en backlinks).

| Keyword | Vol./mes | KD | Intención | Nota del SERP |
|---|---|---|---|---|
| **`pintura vinilica o acrilica`** | **4.400** | **0** | transaccional | una papelería (`officedepot.com.mx`) es **#1** en una pregunta de química de pintura; Comex y Sherwin ranquean con **página de producto**, no con explicación |
| **`colores para sala y comedor`** | **3.600** | **0** | informacional | **SERP limpio: los dos únicos fabricantes de pintura que ranquean son de EE.UU. Cero fabricantes mexicanos** |
| `colores tierra` | 2.900 | — | informacional | apoyo del clúster de la mesa |
| `tipos de pintura para pared` | 590 | 0 | informacional | **hay featured snippet a ganar**; 3 sitios de España en el top 7 mexicano, cero fabricantes mexicanos |
| `cuanto rinde una cubeta de pintura` | 590 | **0** | informacional | **ningún fabricante mexicano tiene un artículo**; Comex y Behr ranquean con la **herramienta**. Berel ausente. AI Overview presente |
| `pintura para escuelas` | 320 | **0** | **informacional** | los dos únicos fabricantes del top 10 **no son mexicanos** |

### Las tres trampas, declaradas

| Keyword | Volumen | Por qué **no** es objetivo |
|---|---|---|
| **`color terracota`** | 22.200 | **Ya lo ocupa Berel**, con `paleta-calidez-vibrante` (2026-07-22). Escribir "el artículo del terracota" es competir contra una pieza propia de cinco semanas antes |
| **`color arcilla`** | 4.400 | **SERP del material**, no del color de pintura: Shutterstock, Wikipedia, arcilla de modelar. Volumen alto, vínculo nulo |
| **`precio por metro cuadrado de pintura`** | 720 | **SERP 100% de mano de obra**: homepro, cronoshare, habitissimo, TikTok, Reddit. **Berel no fija precio de mano de obra ni vende trabajo.** No es su territorio |

> ⚠️ **La API devolvió 9 de 28, 11 de 18 y 9 de 15 keywords según el lote.** **Las no devueltas no son volumen cero: son ausencia de dato en el índice del proveedor.** No se reportan como cero, ni acá ni al cliente. **SIN DATO.**

Y un matiz de método que esta sesión pagó: **volumen alto con vínculo débil es trampa.** Antes de fijar una keyword estacional como objetivo, el orden de verificación es: (1) ¿el ritual **es** el concepto de la pieza? (2) ¿su paleta o su materia es la del producto? (3) ¿hay demanda medida con **SERP verificado**? (4) ¿queda hueco leyendo el **contenido propio**? Las tres trampas de arriba mueren en el paso (3) o en el (4), no en el volumen.

---

## 8. Dos activos con posición y sin explotar

### 8.1 La calculadora ranquea #1 y no tiene nada que citar

`berel.com/productos/calculadora` **ranquea #1 en México** para `calculadora de pintura` (170/mes, KD 0 — MEDIDO). Estado real de la página (OBSERVADO, reverificado 2026-08-25):

| Elemento | Estado |
|---|---|
| `<title>` | "Calculadora \| Pinturas Berel" ✔ |
| `meta description` | **"Página de calculadora"** — marcador de posición |
| Encabezados | **cero H1, cero H2, cero H3** |
| JSON-LD | **cero bloques** en el HTML crudo |
| Contenido | ~851 palabras, casi todas del bloque promocional compartido de Esmalte Summa |
| Sitemaps | **no está en ninguno** — vive bajo `/productos/`, fuera de `sitemap-articulos.xml` |

**Ranquea por dominio y por título. No hay nada que un tercero pueda citar.** Y está **ausente** del SERP de la pregunta en lenguaje natural (`cuanto rinde una cubeta de pintura`, 590/mes) precisamente porque no tiene contenido.

Dos precisiones que corrigen lecturas previas de esta misma sesión:

- 🔴 **El marcado está AUSENTE, no inválido.** Una lectura anterior reportó un `"@type":"Color"` inválido nueve veces por página. **Era un artefacto de método**: se des-escapó el HTML y se leyó el payload RSC de Next.js como si fuera JSON-LD. **En el HTML crudo hay cero.** Y las dos cosas piden acciones **opuestas**: ausente → **agregar** (`WebApplication`/`SoftwareApplication` + `BreadcrumbList`); inválido → retirar. El JSON-LD de los **artículos**, en cambio, es correcto (`Article`, `WebPage`, `Organization`, `ImageObject`, `Person`, `BreadcrumbList`, `ListItem`).
- ⚠️ **No inventar un tipo para el color.** Verificado contra schema.org: **no existe** `Color`, ni `ColorSwatch`, ni `Paint`. `color` es una **propiedad** cuyo `domainIncludes` es `Product` y su `rangeIncludes` es `Text`.

**Y la ruta obvia ya está ocupada por el shell:** `/calculadora`, `/rendimiento`, `/calculadora-de-pintura` y cuatro variantes más **devuelven 200 con título vacío** — el mismo soft 404 de familia. **No proponerlas como destino.**

### 8.2 #9 en `colores del altar de muertos`, con una pieza de 2024 sin estructura

MEDIDO/OBSERVADO. Berel ranquea **#9** en `colores del altar de muertos` con una pieza de **2024**, **734 palabras**, **cero H2**, y es **el único fabricante de pintura del top 10**. **AI Overview presente** en el SERP. Volumen de la keyword: **SIN DATO** en esta sesión.

Es striking distance sin usar, en una fecha con reloj: **el altar se arma antes del 2 de noviembre.** Y se cruza con §6.1 de la forma más elocuente del documento: **una marca que ranquea en `colores del altar de muertos` y nunca ha escrito la palabra `ofrenda` en 113 artículos** (INFERIDO, del cruce entre la posición observada y el conteo de términos).

---

## 9. `berelmexico.com`: fuga de SERP de marca

OBSERVADO + MEDIDO. `berelmexico.com` es un **sitio WordPress independiente** (`generator: WordPress 7.1`) que usa la marca Berel:

- Se describe como *"Berel Mexico — empresa líder en pintura 100% mexicana"*; menciona "Pinturas Berel" **4 veces** y "distribuidor" **1 vez**.
- **Ranquea #2 en `mejor pintura para exteriores`** (480/mes, comercial — MEDIDO) **por encima de `berel.com`**.
- Su `<title>` está roto (`- % Berel Mexico Color, pi`) y su `meta description` es "pinturas berel siempre contigo".

> **No se pudo verificar si está autorizado. SIN DATO.** Va como **hallazgo para el cliente**, no como acusación. Puede ser un distribuidor autorizado con un sitio mal hecho, o puede no serlo — y las dos cosas piden acciones distintas. Lo único afirmable hoy es que **un dominio de tercero con la marca le gana el SERP a `berel.com` en una keyword comercial.**

---

## 10. Prioridad: qué hacer con esto

Orden por alcance × confianza / esfuerzo. La implementación del sitio es del equipo de Berel, no de Efeonce (registrado en el diagnóstico general, §10); las acciones de contenido y de operación de cuenta son de Efeonce.

| # | Acción | Base | Dueño | Esfuerzo |
|---|---|---|---|---|
| **R0** | **Revisar contra ficha los dos claims de la página del cuarto infantil.** Si la ficha no los declara literalmente con norma y método, retirarlos | §2 | Cliente (producto/regulatorio) | bajo, **sin espera** |
| **R1** | **Arreglar el `href` muerto** de `paleta-calidez-vibrante` → `/articulos/paraiso-mexicano-2026` | §5.2 | Efeonce (edición) | **un `href`** |
| **R2** | **Encadenar la entidad**: satélites ↔ ficha ancla en ambos sentidos, y ficha del año N ↔ año N−1, en los tres ciclos | §5.1, §5.4 | Efeonce (edición) | bajo |
| **R3** | **Fijar un nombre por código** en todo el corpus antes de publicar cualquier tabla de léxico | §6.3 | Cliente (producto) + Efeonce | bajo |
| **R4** | **Reemplazar la terna fija de "relacionados" por un módulo contextual** dirigido por el mapa de clúster, y quitarle entradas cableadas al destino de plantilla | §4.1 | Desarrollo de Berel | medio |
| **R5** | **Arreglar el 16–23% de enlaces editoriales a soft 404** y los **dos `href` truncados** (bug de CMS, distinto) | §4.3 | Efeonce (edición) + Desarrollo | medio |
| **R6** | **Dar contenido a la calculadora**: `meta description` real, H1/H2, JSON-LD `WebApplication`/`SoftwareApplication` + `BreadcrumbList`, y **meterla a un sitemap** | §8.1 | Desarrollo de Berel | medio |
| **R7** | **Refrescar la pieza de `colores del altar de muertos`** —H2 en pregunta, FAQ, léxico de §6— antes del 2 de noviembre | §8.2, §6.1 | Efeonce | bajo |
| **R8** | **Refrescar los cuatro artículos ya publicados de octubre** (tres con cero H2) en vez de tratarlos como piezas nuevas | §3.1 | Efeonce | medio |
| **R9** | **Verificar con el cliente el estatus de `berelmexico.com`** | §9 | Cliente | bajo |
| **R10** | **Rehacer la extracción del grafo declarando el criterio exacto de "cuerpo editorial"** antes de presentarle la cifra de 0,38 al cliente | §4.4 | Efeonce | bajo |

**R1 y R2 son la mejor relación esfuerzo/retorno del documento**: no requieren producir contenido, no dependen de que el cliente entregue datos y conectan la entidad más valiosa de la marca. **R0 va antes que todo porque ya está publicado.**

---

## 11. Los entregables

### 11.1 Los tres briefs de octubre

| Rol en el clúster | Pieza | Cabeza medida | Objeto citable | Dependencia |
|---|---|---|---|---|
| **Pillar de superficie** | *Vinílica, acrílica o esmalte: cuál va en cada superficie* | `pintura vinilica o acrilica` **4.400 KD 0** + `tipos de pintura para pared` 590 (featured snippet) + `mejor pintura para exteriores` 480 + fachadas/madera/metal/techos | **matriz superficie × ambiente → tipo de pintura**, con el criterio de decisión explícito y **los casos de no-uso** ("en qué NO usar vinílica") | media — el criterio es de oficio de fabricante |
| **Nodo consolidador de rendimiento** | *Cuánto rinde de verdad una cubeta de pintura* | `cuanto rinde una cubeta de pintura` **590 KD 0**; clúster **neutro de marca ≈ 2.480/mes** | **tabla de rendimiento por línea Berel** (m²/L declarado, manos, tipo de superficie) + **el método de cálculo** + **los factores que lo cambian** + **los límites** ("el rendimiento de ficha es de laboratorio") | **alta — los datos por línea los entrega el cliente.** El sitio público no los expone consolidados |
| **Satélite de espíritu del ciclo 2027** (D+30 del kit, §5.4) | *Comal, Itacate, Cazuela de Barro: la paleta de la mesa mexicana* | `colores para sala y comedor` **3.600 KD 0**; clúster **≈ 8.970/mes** | **léxico cromático de la mesa mexicana**: 12 colores con código y rol **propuesto** en el espacio, con ancla estable `#lexico-mesa-mexicana` | alta — acabado, comportamiento bajo luz cálida y lavabilidad los entrega el cliente |

**Del tercero se fijaron las cuatro superficies** (OBSERVADO — brief entregado): título de trabajo *"Comal, Itacate, Cazuela de Barro — la paleta de la mesa mexicana"* · H1 con dos puntos · **SEO title** *"Colores para sala y comedor: la paleta de la mesa mexicana"* (57 caracteres) · **OG** *"Itacate es la comida que te dan para llevar cuando te vas de una casa. También es un color."* · **slug** `colores-para-sala-y-comedor` · publicación **15-oct-2026**. Los cuatro comparten tesis y hacen trabajos distintos; **el slug no intenta ser headline**.

> ⚠️ **Los títulos de los dos primeros son los del research, no se verificó cuál quedó depositado en el Content Hub. SIN DATO.** Y una regla de craft que esta sesión aprendió pagando: **la taxonomía interna no va en el nombre visible** ("Nodo consolidador —", "Pillar —", "Satélite 3"). La arquitectura va en el brief; en el título va la promesa.

**Sinergia interna que solo tiene el segundo:** Berel **ya es #1 con la calculadora** (§8.1). El artículo de rendimiento es la capa de contenido que esa página no tiene; **se enlazan mutuamente** y arregla que Berel esté ausente del SERP de la pregunta.

**Anti-canibalización verificada leyendo el contenido, no el slug** (OBSERVADO): `colores-para-el-cuarto-infantil-que-crecen-con-ellos` (2026-08-17) ya tiene un H2 *"¿Cuánta pintura necesitas?"* con un ejemplo trabajado de un cuarto de 3×3 y **enlaza a la calculadora**. **El artículo de rendimiento no repite ese ejemplo y enlaza a esa pieza**; su delta citable es el dato por línea de producto, el método y sus límites.

### 11.2 El brief del Color del Año 2027

Depositado en el slot **N28** del Content Hub. **13 secciones**: las 11 del formato hermano de los briefs de espacios más dos propias de una pieza-hito, **Plan de PR** y **Atomización / distribución**. El research completo, el mapa competitivo, el calendario del ciclo y los cinco bloqueantes abiertos viven en [`BEREL_COLOR_DEL_ANO_2027_2026-08-25.md`](BEREL_COLOR_DEL_ANO_2027_2026-08-25.md); **este documento aporta sobre él una corrección** (§5.1: el eslabón 2025 → 2026 no existe) **y el kit de ciclo** (§5.4).

### 11.3 Forma de los briefs: qué cambió en esta sesión

Los primeros briefs de la sesión salieron de **27.000 a 70.000 caracteres**. Un brief de 12.000 palabras **no se puede usar para redactar**. La corrección fue de forma, no de contenido:

- **Brief** = contrato de la pieza, para quien redacta. **Techo duro 12.000 caracteres.** Vive en el slot.
- **Dossier** = la evidencia, para quien decide y audita. Anexo enlazado: **se cita y se enlaza, no se transcribe.**

El brief de la mesa mexicana salió en **10.035 caracteres sin recortar al final** — el recorte fue de diseño. El estándar quedó escrito en [`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](../../operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md).

Y una separación que hay que mantener en cualquier brief con dato de fabricante: **lo que el brief propone editorialmente** (qué color va en qué muro) **no es lo que la ficha declara**. La columna va rotulada **"propuesto"**, y la regla se sostiene: **si la ficha no lo declara literalmente, el H2 no se escribe** y la columna se retira de la tabla.

### 11.4 El de escuelas quedó EN PAUSA, y por qué

**Estado: `[EN PAUSA]`, sin fecha.** El tema era *"cómo elegir pintura para un espacio donde hay niños"* (clúster ≈1.010/mes neutro: `pintura ecologica` 480 + `pintura para escuelas` 320 + `pintura no toxica` 90 + `pintura sin plomo` 50 + `pintura para cuarto de bebe` 40 + `pintura sin olor` 30 — MEDIDO).

**El motivo no es de demanda. Es que se cayó la razón por la que la pieza existía:**

1. **El ángulo por el que se propuso —volumen más potencial de enlace editorial— murió en la auditoría del corpus propio.** El territorio ya está tocado, y la pieza publicada hace una semana (`cuarto-infantil`, 3.985 palabras, 14 H2) cubre parte del material. **Cuando muere el porqué, la pieza vuelve a cero, no a otro ángulo** — buscarle un ángulo nuevo para salvarla es publicar por publicar.
2. **Reorientarla a `pintura para escuelas` la hace hablarle a otro comprador.** Una dirección de colegio o un arquitecto que especifica una obra institucional no es el lector del resto del blog. **Eso no es una decisión de SEO: es comercial**, y Efeonce **no tiene ese dato**. No se asume: se declara y se pregunta.
3. **Y su objeto citable depende de los claims que hoy están sin verificar** (§2): un checklist de COV, plomo, lavabilidad y tiempo de reocupación se construye con exactamente los datos que la página del cuarto infantil publica sin método (INFERIDO).

**Lo que sí quedó verificado y sirve cuando se reabra:** el territorio está tocado **solo en generación vieja y en clave de promo de producto** —`pinta-con-inteligencia-para-el-regreso-clases` (2025, 1.834 palabras, 0 H2), `descubre-las-soluciones-institucionales-de-berel…` (2024, 1.812 palabras, 0 H2), `berelex-green-ahora-purifica-el-aire` (2024, 2.777 palabras, 0 H2)—; los dos únicos fabricantes que ranquean en `pintura para escuelas` **no son mexicanos**; y hay claims que Berel **sí** puede declarar (`NO contiene plomo`, `COV < 50 g/L`). **Se escribe `COV`, no `VOC`.**

### 11.5 Bloqueantes abiertos de este documento

Ninguno resuelto al 2026-08-25. Son **adicionales** a los cinco del hermano del color (BL-1 a BL-5).

| # | Bloqueante | Qué bloquea | Dueño | Estatus |
|---|---|---|---|---|
| **BA-1** | **Aritmética de slots de octubre**: dos libres, tres briefs entregados; siete slots con la misma fecha marcador | La secuencia real de publicación de octubre | Cliente (calendario) | **abierto** |
| **BA-2** | **Claims de la página del cuarto infantil** sin método ni norma | Nada editorial — es una página viva (§2) | Cliente (producto/regulatorio) | **abierto — sin espera** |
| **BA-3** | **Datos de fabricante** del objeto citable de dos de los tres briefs: rendimiento por línea, acabado por color, comportamiento bajo luz cálida, lavabilidad | El objeto citable de la pieza de rendimiento y **dos H2** de la de la mesa | Cliente | **abierto** |
| **BA-4** | **Un nombre por código** (§6.3) | Publicar cualquier tabla de léxico sin fragmentar la entidad | Cliente (producto) | **abierto** |
| **BA-5** | **Slug destino de los briefs de octubre no verificado** contra la familia de soft 404 | Publicar sobre una ruta que responde 200 vacío | Desarrollo de Berel | **abierto** |
| **BA-6** | **Inventario de slots de noviembre** (§3.2) | Cualquier plan que pase de octubre, incluido el D+75 del kit | Efeonce + Cliente | **abierto** |

---

## 12. Límites de esta auditoría

Lo que **no** se verificó, declarado para que nadie lo asuma cubierto.

1. **Semrush estuvo inoperante toda la sesión.** Cinco intentos en serie, con pausas, sobre cuatro herramientas distintas: cero reportes. **Nunca funcionó**, así que **no se puede distinguir cuota de límite de plan**. Todo lo cuantitativo de este documento viene de **DataForSEO o de Search Console**; no se mezclan cifras de los dos proveedores en un mismo reporte. Nota operativa conocida: cuando el MCP de Semrush agota cuota, el mensaje afirma que el plan no incluye acceso MCP. Es engañoso.
2. **No se corrió el carril de striking distance para esta cuenta en esta sesión.** El diagnóstico general (§5.0) documenta que la superficie existe, está `complete` y es operable en `/admin/growth/seo/keywords`, y que **nadie la había corrido para Berel**. Las posiciones de §8 son de SERP y de Search Console, no de esa superficie. **El backlog oficial tiene que salir de ahí.**
3. **AI Overviews: se detectó su presencia en el SERP, no a quién citan.** Presente en `cuanto rinde una cubeta`, `pintura vinilica o acrilica`, `mejor pintura para exteriores`, `pintura ecologica`, `pintura para salitre`, `cuanto cuesta pintar` y en `colores del altar de muertos`. **Medir a quién citan exige correr los prompts desde México**, y eso no se hizo. Un Share of Voice en motores de respuesta **no es un proxy de esto**.
4. **Discrepancias de conteo entre auditorías, declaradas y no resueltas.** (a) **113 vs. 115 artículos**: este documento y el research de octubre miden **113** (inventario de los siete sitemaps y corpus descargado); el diagnóstico general dice **115**. (b) **43 vs. 112 enlaces editoriales** (§4.4). Ninguna de las dos se resolvió. Antes de citar cualquiera de esas cifras al cliente, hay que reconciliarlas.
5. **19 + 7 + 6 keywords no devueltas por la API** en los tres lotes de octubre, más nueve en la familia cromática. **Ausencia de dato, no volumen cero.**
6. **No se verificó si `berelmexico.com` es distribuidor autorizado** (§9).
7. **No se leyó el estudio de Profeco** sobre rendimiento y resistencia a la intemperie de pinturas, que aparece **#3 en `mejor pintura para exteriores`** vía `gob.mx`. Es fuente citable de tercero y referencia obligada de la pieza de rendimiento. **Obligatorio leerlo y verificar cómo salió Berel antes de citarlo.**
8. **No hay fichas técnicas por línea.** Se verificó que el sitio público no las expone de forma consolidada. Todo el objeto citable de dos de los tres briefs depende de datos que **debe entregar el cliente** (BA-3).
9. **El volumen de `colores del altar de muertos` es SIN DATO.** La posición #9 y el AI Overview están observados; la demanda no se midió.
10. **La ventana de Search Console son 23 días** (2026-07-31 a 2026-08-22). Las impresiones citadas —6.116 del hub— se leen con ese límite: **no hay estacionalidad ni comparación interanual**, y este es un corpus con estacionalidad evidente (Día de Muertos, Navidad, temporada de lluvias, color de temporada).
11. **Los slots de noviembre no se inventariaron** (§3.2), y **el estado de los slots de octubre caduca en cuanto alguien edite el Content Hub**.
12. **El conteo de términos de §6.1 se hizo sobre el cuerpo renderizado, con la lista de términos declarada.** Un término que no está en esa lista **no está descartado: no se buscó.** Concluir ausencia desde un solo eje de búsqueda no vale, y por eso la lista va explícita.

---

## Referencias

- Diagnóstico general de la cuenta: [`BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](BEREL_SEO_DIAGNOSTIC_2026-08-25.md) — línea base medida, panorama competitivo, defectos de arquitectura **D-01 a D-10** (contexto directo de §4 y §5), backlog de striking distance y briefs N29–N33.
- Pieza-hito anual: [`BEREL_COLOR_DEL_ANO_2027_2026-08-25.md`](BEREL_COLOR_DEL_ANO_2027_2026-08-25.md) — research del color 2027, ángulo de hospitalidad, mapa competitivo de la categoría, calendario del ciclo, plan de PR y los bloqueantes BL-1 a BL-5. **Este documento corrige su §8.1** (§5.1) y le agrega el kit de ciclo (§5.4).
- Oficio y doctrina de método (entidades, topical authority, citabilidad, Query Fan-Out, AEO): skill `seo-aeo`.
- Estándar de forma de un brief editorial: [`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](../../operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md).
- Proceso repetible de priorización editorial: [`SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md).
- Uso comercial (encuadre, pricing, upsell): skill `seo-aeo-practice`.
- Superficie de oportunidades striking-distance en el portal: UI `/admin/growth/seo/keywords` (`TASK-1308`), reader [`keyword-opportunities-reader.ts`](../../../src/lib/growth/seo/keyword-opportunities-reader.ts) (`TASK-1302`), lane ecosystem/MCP `api/platform/ecosystem/growth/seo/keyword-opportunities` (`TASK-1645`).
- Slots del entregable: Content Hub de Berel en Notion — **N28** (color 2027) y los slots de octubre con fecha marcador `2026-10-15`.
