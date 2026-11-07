# Lote editorial del Blog SKY: de la investigación al handoff de producción

> Método verificado en el lote del 2026-11-05 (54 artículos del Content Hub). Caso y estado:
> [`LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md`](../../../../docs/services/sky-blog-seo/LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md).
> Paso a paso para el operador: [manual](../../../../docs/manual-de-uso/growth/correr-lote-editorial-blog-sky.md).
> La voz, la estructura y las imágenes las manda el [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e).
> Este archivo fija el orden, los contratos entre fases y las trampas medidas. No copia la voz ni el catálogo de rutas.

## Fases y contrato de salida

| # | Fase | Sale con | No avanza si |
| --- | --- | --- | --- |
| 1 | Inventario | Lista de filas activas del Content Hub con `Trabajo SEO`, mercado y URL existente | Una fila archivada o rechazada por SKY entra al lote |
| 2 | Research SEO/AEO | Sección «🔎 Research SEO/AEO · <fecha>» al final de cada página de Notion | La sección no está en todas las páginas del lote (verificar con búsqueda + fetch) |
| 3 | Pauta y piloto | Pauta de redacción del lote + un artículo piloto revisado | El piloto no pasa la QA de voz ni deja la ficha completa |
| 4 | Redacción por lotes | Versión «✍️ Artículo vN · <fecha> · POV «El Viajero»» al final de cada página | Falta el encabezado, la ficha, algún callout 🖼️/🎫, el claim o la firma |
| 5 | Specs | `specs/<id>.json` + `MANIFEST.json`, validados contra los callouts | Una spec difiere de su callout (manda el callout) |
| 6 | Handoff | Brief de producción + prompt de sesión, copiados donde los lee el Workbench | Se entrega sin decir qué está bloqueado y por qué |

Cada fase es un estado distinto. Research hecho no es artículo redactado; redactado no es aprobado;
aprobado no es publicado. Al reportar, separar siempre **listos, bloqueados con motivo y fuera de alcance**
(regla del Playbook, Fase 10).

## 1. Inventario

- Fuente: Content Hub de SKY (data source `collection://f1e39c2f-efe7-83f0-86db-0725e4f71611`, teamspace
  de Notion «Sky Ariline - SEO+AEO», escrito así en Notion).
- Excluir filas archivadas y las que SKY rechazó (`Aprobación cliente` = Rechazado). En noviembre quedaron
  fuera 6: «Escala larga en Santiago» (archivada) y cinco rechazadas (cambio de vuelo, mascota en cabina,
  errores con mascota, bebé, Cancún en 4 días).
- Registrar por fila: id corto, URL de Notion, título, `Trabajo SEO` (Nuevo · Optimizar URL existente ·
  Restaurar y reescribir), mercado del lector, slug existente si lo hay. En noviembre vivió en `articles.py`.
- Marcar las filas sin aprobación de SKY (`Aprobación cliente` = En espera o vacía, o `Estado` = Idea). En
  noviembre se investigaron y redactaron igual (Ayacucho, equipaje de bodega, equipaje de mano, Colán), pero
  **no generan tareas de diseño ni producción** hasta que SKY apruebe (Playbook, Fase 10). Si la fila está en
  `Idea` sin tema definido, el Playbook dice que no se toca: confirmarlo con Julio antes de redactarla.

## 2. Research SEO/AEO

Cargar `seo-aeo`, `dataforseo-operator` y esta skill.

**Proveedor: DataForSEO, no Semrush, para volumen de lote.** Julio, 05-11-2026: «Con Semrush a ese volumen
te quedarás sin cuota, haz el research con dataforseo». La pasada parcial con Semrush gastó unas 11.000
unidades API antes del cambio. Semrush queda para consultas puntuales.

Insumos por artículo, consolidados en un dossier (`dossier/<id>.md`):

| Sección | Fuente |
| --- | --- |
| A · Contenido actual | WordPress REST API del blog, sólo para URL existentes (`content/<slug>.md`) |
| B · GSC/GA4 de la URL | Exportes de la auditoría (`outputs/sky-blog-seo-audit-2026-10-23/SKY-clasificacion-1697-posts.csv` y `outputs/sky-blog-top50-2026-09/valor-organico-septiembre-2026.json`) |
| C, F, G · Semrush | Posiciones y volúmenes de la pasada parcial, marcados con fecha |
| D · SERP | `pnpm dataforseo -- serp-compare` (Google móvil, top 10, PAA, AI Overview y sus fuentes) |
| E · Keywords | `pnpm dataforseo -- research` (Labs: suggestions, related, keywords_for_site, overview) |
| H · Canibalización | Cruce del tema contra las URL publicadas del inventario |

Comandos que se usaron (organización SKY `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`):

```bash
# SERP: un panel por mercado. Máximo 20 queries por panel (el de Perú se partió en dos).
pnpm -s dataforseo -- serp-compare --panel <dir>/panel-PE1.json --org $ORG --dry-run
pnpm -s dataforseo -- serp-compare --panel <dir>/panel-PE1.json --org $ORG \
  --max-usd 0.08 --yes --out <dir>/serp-PE1.json --csv <dir>/serp-PE1.csv

# Keywords: máximo 20 seeds por corrida (tres corridas: pe1, pe2, cl1).
pnpm -s dataforseo -- research --keyword "<seed1>,<seed2>,…" --market PE \
  --target blog.skyairline.com --discovery-limit 30 --org $ORG --dry-run
```

El panel lleva `market`, `locale`, `devices: ["mobile"]`, `depth: 10`, `loadAiOverview: true` y entidades
SKY (`blog.skyairline.com`, `skyairline.com`), LATAM y JetSMART. `research` se detuvo en
`awaiting_finalist_approval` (500 candidatas por corrida): la validación SERP se hizo con los paneles, no con
finalistas. Costo total DataForSEO del research: **USD 1,61** (57 SERP + tres corridas de Labs).

Trampas medidas:

- 🔴 **El SERP orgánico viene envuelto por Google.** Parte de los resultados llega con `domain=google.com` y
  `url=https://google.com/goto?url=…`; la fuente real está en `breadcrumb` y `website_name`. `serp-compare`
  compara la entidad contra `domain ?? url`, así que **SKY puede figurar ausente sin estarlo**. Recalcular la
  posición propia desde `breadcrumb`/`website_name` antes de escribir «SKY no aparece».
- El digest del SERP no puede vivir junto a `serp-*.json`: el glob lo vuelve a leer y rompe la pasada
  siguiente. Escribirlo fuera (`../digest.json`).
- Search Console en vivo no se consultó: traer credenciales de producción (`vercel env pull`) fue bloqueado
  por el sistema y no se forzó. Se usaron los exportes de la auditoría. Declararlo en cada research.

**Dónde se escribe.** Al **final** de cada página del Content Hub, con `notion-update-page` →
`insert_content`, `position: end`. Nunca tocar propiedades, `Estado` ni contenido existente. Estructura:
callout gris de uso interno con fuentes y fechas · Lectura del caso · Ficha SEO propuesta · Demanda y SERP ·
AEO (6–10 preguntas mapeadas a H2/FAQ, qué resuelve el TL;DR, entidades) · en URL existentes, Análisis del
contenido actual + tabla «Qué conservar, cambiar y quitar» · Plan editorial · Antes de redactar (datos a
verificar, decisiones del cliente, medición contra el mismo mes del año anterior y congelado T−28).

Se repartió en seis forks por grupo temático (equipaje/trámites, norte de Perú, Cajamarca/Ayacucho/Cusco,
selva, sur y Navidad, Chile/Brasil/Caribe). Al cerrar, confirmar cobertura: una búsqueda de Notion devolvió
50 páginas y las otras cuatro se verificaron una por una.

## 3. Pauta del lote y piloto

Antes de repartir la redacción, escribir una **pauta del lote** (en noviembre: `BRIEF.md`) que traduzca el
Playbook a instrucciones ejecutables y la valide con **un piloto** completo. El piloto de noviembre fue
Zorritos (cuatro inserciones en Notion). Lo que la pauta debe fijar, además de la voz:

- Leer en orden: propiedades de la fila, borradores previos, la sección de research (manda sobre keyword,
  title, slug, H2 y preguntas AEO), y en reescrituras el texto publicado.
- Voz POV «El Viajero» en hipotético inmersivo; nunca «cuando fui» ni anécdotas propias. Sin voseo.
- Patrón sándwich: datos duros en la tabla «Datos para planificar» de cada bloque, fuera del relato.
- Cero cifras sin fuente oficial. Lo que no se puede verificar queda como
  `[Pendiente antes de publicar: …]`. Dos fuentes que se contradicen se anotan como hallazgo, no se elige.
- Callouts y saltos de línea en formato Notion (ver §6). Borradores de respaldo en `<id>/part*.md` antes de
  insertar.
- **Ajustes que dejó el piloto** (pauta §10): continuidad de viaje sin enlace; sólo dos menciones de ruta
  («Cómo llegar volando» y el banner); JSON-LD fuera de la tabla; hallazgos editoriales en callout rojo con
  dueño; si el H1 del research promete algo sin fuente, se deja como hallazgo para Valentina en vez de
  cambiarlo en silencio.

## 4. Redacción por lotes

Nueve lotes temáticos en paralelo (B1–B9, 53 artículos) después del piloto. Cada artículo se agrega al final
de su página como `# ✍️ Artículo vN · <fecha> · POV «El Viajero»`: v1 si no había borrador; si había, la
versión siguiente (noviembre: 40 v1, 12 v2, 2 v3). La versión anterior queda arriba como histórico.

**Ficha SEO y metadatos** (Julio, 05-11-2026: «en cada una debes dejar también sus metadatos y datos SEO:
slug propuesto para artículos nuevos, meta descripción, meta title, extracto de máximo 250 caracteres, alt
para imágenes»). Va justo después del callout 🎥 de encabezado, en tabla Campo · Valor, sin campos vacíos:

| Campo | Criterio |
| --- | --- |
| Keyword principal y variantes | Del mercado del lector; toda variante declarada aparece en el texto |
| H1 | Título visible |
| Meta title | Máximo 60 caracteres, keyword al inicio, sin superlativos, conteo entre paréntesis |
| Meta description | 140–155 caracteres, conteo entre paréntesis |
| Slug | Nuevo: propuesto, corto, con la keyword, verificado contra las URL publicadas. Reescritura: se conserva la URL existente salvo que el research proponga otra |
| URL canónica | `https://blog.skyairline.com/<slug>/` |
| Extracto | Máximo 250 caracteres, autocontenido, sin el claim |
| Categoría y etiquetas | Destinos · Planificación de viaje · Cultura · Noticias · Compromiso SKY; 3–6 etiquetas |
| OG title y OG description | Iguales al meta o más cálidos |
| Imagen destacada / OG | Archivo de IMG 1 y su variante 1200 × 630 |
| ALT | Los de IMG 1–3 y banner, **idénticos** a sus callouts |
| Schema JSON-LD | Article (NewsArticle en noticias) + FAQPage + BreadcrumbList; autor «Equipo editorial del Blog SKY». La fila resume; el código va en un bloque ```json debajo de la tabla, generado desde la FAQ real |
| Enlaces internos y 301 | URL reales del research; 301 sólo como propuesta |
| Mercado, intensidad del «yo», Trabajo SEO, fecha | Mismos valores que el encabezado |

Los conteos se calculan (`python3 -c "print(len('…'))"`), no se estiman.

**Callouts.** Por artículo: tres 🖼️ (IMG 1 portada arriba del gancho, IMG 2 e IMG 3 en el punto exacto de
su ancla) y un 🎫 de banner de ruta después de «Lo que tienes que saber» y antes de la FAQ. Julio respondió
«Portada + 2 escenas + Banner de ruta» al fijar el alcance. Las noticias llevan dos imágenes; la excepción se
documenta en el toggle de imágenes. El contenido visual del callout (tipos A–H, registro D/E, primer plano,
fidelidad, reutilización) lo gobiernan el Playbook y la skill `sky-blog-graphic-line`; esta skill sólo exige
que el callout exista, que su ALT coincida con la ficha y que su ancla sea una frase literal del texto.

**Rutas del banner y de «Cómo llegar volando».** Julio: «para las rutas debes ver en la base de Notion la
ruta, las tenemos todas allí». Fuente única: base «Precios y Rutas SKY»
(`c6bcd3d717794691b706befbc25c4b74`). Se enlaza sólo una fila 🟢 Activa del **mercado del lector**, con la URL
limpia (sin parámetros). El día del lote se volcaron las filas activas a `rutas.md` y los redactores no
consultaron otra fuente. Si no hay ruta activa para ese mercado, el banner se escribe igual con encabezado
`🚧 Bloqueado`, el motivo, sin URL, y un callout rojo para Paid / Ad Ops. Nunca inventar una URL de ruta.

**Titular del banner** (Julio, 05-11-2026: «el título del artículo ya lo tendrá el mismo artículo y el nombre
de la ruta debería destacar más»): la ruta es el primer elemento; el titular va en segundo nivel, máximo 6
palabras, no repite ni parafrasea el H1 ni el meta title.

**QA antes de insertar** (`qa.py <id> "<keyword>" "<var1;var2>"`): palabras de cuerpo publicable, TL;DR de
40–60 palabras que abre con la keyword, variantes presentes, claim una sola vez, H2 en pregunta, palabras
prohibidas (voseo, superlativos vacíos, experiencia propia, el texto nombrando su estructura), `|` dentro de
callouts, ALT idénticos entre callout y ficha, ancla POV literal en el texto, menciones de ruta y aperturas de
párrafo repetidas.

**Verificación después de insertar** (`verify*.py`/`vfy.py` sobre el resultado de `notion-fetch`): una sola
vez el encabezado ✍️, IMG 1–3, BANNER 1, la firma `Por Equipo editorial del Blog SKY · Actualizado: <fecha>`,
«Está bueno SKY.», «Fuentes (uso interno)», el bloque ```json y los toggles; cero `&lt;br` y cero `<details>`.
Después, la ficha se pliega en secciones (§6, «Estructura de la ficha») y se verifica con `verify.py`.

## 5. Specs de imágenes y banner

Julio: «vas a guardar cada spec de imágenes porque luego lo pasaremos a una peer session derivada». La spec
es una **copia literal** de los callouts del artículo; si difiere de Notion, manda el callout y se corrige el
JSON.

```bash
python3 specgen.py <id> <meta.json>
# meta.json: notion_url, titulo, slug, mercado, version, descartes[], banner_extra{origen,destino,home_market,cta}
```

`specgen.py` lee `<id>/part*.md`, extrae los callouts 🖼️/🎫 campo por campo y escribe `specs/<id>.json`
según `SCHEMA.md` (imágenes con pieza, rol, posición, pregunta, tipo, registro, archivo, formato, `lazy`, ALT,
qué muestra, hora y clima, personas, primer plano, ancla POV, prohibiciones, fidelidad y reutilización; banner
con estado, motivo de bloqueo, receta, origen/destino, home market, URL, fecha de verificación, fuente,
titular, CTA, archivo, ALT y posición). `MANIFEST.json` indexa los 54 con su estado.

🔴 **Lotes paralelos pisan los scripts compartidos.** En noviembre dos lotes sobrescribieron el generador
común (`mkspec.py`) y uno reescribió todas las specs recortando `formato`. Regla: cada lote usa su propio
generador, y al cierre **todas** las specs se regeneran y validan contra los `part*.md` (`specs/extract.py`)
antes del handoff. Los scripts del lote vivieron en el scratchpad de la sesión y no están versionados.

## 6. Formato en Notion que rompe en silencio

- Saltos de línea dentro de callouts y FAQ: `<br />`. Nunca `|` dentro de una celda o de un callout.
- Toggles: `<toggle color="gray_bg">…</toggle>`, nunca `<details>`.
- Evitar `<`, `≤` y `~` sueltos: escribir «menos de», «cerca de».
- El JSON-LD no cabe en una celda: bloque ```json bajo la tabla.
- Textos largos: 2–4 inserciones consecutivas al final, en orden. Si una falla, corregir y reintentar sólo esa.

### Estructura de la ficha: secciones plegables, nunca texto corrido

Julio, 06-11-2026: «dejaste la chorrera de texto y no organizaste la información en toggles jerárquicos;
cuando el cliente vea eso no va a saber qué ver». SKY lee estas fichas. Brief, research, artículo, fuentes y
producción apilados (500 a 900 líneas) no dejan ver dónde está el artículo. Toda ficha con research o
artículo queda así, en este orden. El modelo es la ficha de Punta Sal:

1. Callout 🧭 azul: «Cómo leer esta página: cada sección se abre con el triángulo de la izquierda. La 3 es el
   artículo; las demás son material interno (research, fuentes, producción).»
2. `<table-of-contents />`.
3. `<toggle heading="h1">` **📋 Brief del encargo**: el contenido de «Tema y enfoque», sin su H2.
4. `<toggle heading="h1">` **🔎 Research SEO/AEO · fecha · uso interno**.
5. `<toggle heading="h1">` **✍️ Artículo vN · fecha · POV «El Viajero»**. Lleva adentro:
   - el callout 🎥;
   - `<toggle heading="h2">` **Ficha SEO y metadatos**, con la tabla;
   - `<toggle color="gray_bg">` **JSON-LD para Dev**, con el bloque ```json;
   - el cuerpo publicable, abierto, con sus callouts.
6. `<toggle heading="h1">` **🗂️ Fuentes y hallazgos · uso interno**: la tabla de fuentes y los callouts 🚨.
7. `<toggle heading="h1">` **🧪 Producción y cambios**: los toggles 🖼️ de imágenes y 📝 de cambios.

Sin separadores `---` entre secciones. Si la página guarda una versión anterior completa (los artículos de
prueba de octubre), esa versión, con su encuadre, va en un primer toggle **🗄️ Encuadre y versión anterior ·
solo referencia**. El callout 🧭 lo dice: «La 3 es el artículo vigente. La 1 guarda el encuadre y la versión
anterior solo como referencia». Las subpáginas (V1, V2, V3) quedan dentro de ese toggle, intactas.

**Cómo aplicarla sobre fichas ya escritas.** No reescribir la página con `replace_content`: obliga a
reenviarla entera, de 50 a 100 KB. Usar `update_content` con anclas cortas que insertan las etiquetas
`<toggle>`/`</toggle>` en los límites de cada sección. Todas van en una sola llamada para que la página quede
balanceada. El generador está en `outputs/sky-blog-content-hub-estructura/genops.py`: toma el resultado de
`notion-fetch` y produce las anclas, que deben ser únicas en la página. `verify.py` lee la página otra vez y
exige:

- balance 0;
- cinco toggles h1;
- fuera de los toggles, sólo el callout 🧭 y el índice;
- cero etiquetas literales.

Antes de tocar una página, mirar su estructura: si ya tiene toggles h1 (la ordenó el equipo) o pestañas
`<tabs>`, no se toca.

Fichas «Idea» sólo con el brief (lote de diciembre, temas rechazados): no hace falta plegarlas. El brief
recién se pliega cuando la ficha recibe el research.

Caso fuente: el 06-11-2026 se ordenaron 44 fichas del lote de noviembre y de las pruebas de octubre, empezando
por el piloto de Tarapoto. Cinco ya estaban ordenadas:

- con toggles: Punta Sal, Tipos de equipaje, Zorritos y Año Nuevo en Santiago;
- con pestañas: Cena de Navidad chilena.

## 7. Handoff a producción

El handoff es un paquete, no un mensaje: `specs/` (54 JSON + `MANIFEST.json` + `SCHEMA.md` +
`NOTAS_LOTES.md`), `PRODUCTION_BRIEF.md` (norma de la sesión de producción) y `PROMPT_SESION_PRODUCCION.md`
(prompt de arranque). Copias: `ai-generations/<fecha>_sky-blog-lote/specs/` en este repo y
`projects/sky/<pieza>/specs/` en el Creative Workbench. `NOTAS_LOTES.md` lleva por lote: imágenes ya producidas
que no se regeneran, piezas para archivar, artículos sin aprobación, banners bloqueados y hallazgos por dueño.
La producción visual sigue `sky-blog-graphic-line`; esta skill termina en la spec.

## 8. Lo que el lote no hace

- No cambia propiedades del Content Hub (ni siquiera `Trabajo SEO` cuando está mal), no crea tareas ni
  páginas nuevas sin pedido.
- No publica en WordPress ni envía nada a SKY. No ejecuta 301.
- Antes de publicar, el Playbook exige borrar los callouts 🖼️/🎫, cargar los ALT exactos y resolver o
  declarar cada `[Pendiente antes de publicar]` y `[link interno: …]`.
