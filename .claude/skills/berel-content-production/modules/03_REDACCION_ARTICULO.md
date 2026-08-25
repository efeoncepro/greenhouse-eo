# 03 · Redacción del artículo (Fase 5 / Fase B5)

> Vale para las dos modalidades. En **A** el bloque se llama `✍️ Reescritura V1`; en **B**,
> `✍️ Artículo V1`. La estructura interna y las reglas editoriales son **idénticas**.

## Cómo se monta

1. **Debajo** del contenido existente y **sin borrar nada**, agregar un encabezado desplegable 1
   para la reescritura.
2. Basarla en: el contenido anterior + las recomendaciones de ambos análisis + la guía de Voz y Tono
   y demás páginas de la wiki (paleta vigente, keywords, recomendaciones SEO).
3. **Verificar cada enlace** antes de dejarlo en el texto, con el protocolo de dos pasos
   (sitemap → ruta de control) → [§ Verificación de enlaces](#verificación-de-enlaces). 🔴 **El sitio
   NUNCA devuelve 404**, así que el código de estado no prueba nada.
4. Controlar la longitud contra la guía y el plan SEO; si excede mucho, **proponer** qué recortar
   (FAQ redundantes, pasos fusionables) **sin ejecutarlo salvo pedido**.
5. **Releer antes de cerrar.** Una errata en el cuerpo publicable obliga a una edición extra y le
   resta credibilidad al entregable; revisar sobre todo **nombres de producto, de color y
   tecnicismos**.
6. Al terminar, `Estado` del artículo a **`En revisión`**.

## Verificación de enlaces

🔴 **berel.com NUNCA devuelve 404.** Una ruta inexistente responde **200 con un shell vacío**: el
código de estado no prueba nada. El protocolo tiene dos pasos y van **en este orden**.

### Paso 1 — Buscar la URL en el sitemap

Los sitemaps son la **lista autoritativa** de URLs del sitio, y buscar ahí es **más barato y más
confiable que adivinar una ruta y probarla**. Verificados el 2026-08-25:

| Sitemap | Qué lista |
|---|---|
| `https://berel.com/sitemap-productos.xml` | Fichas de producto |
| `https://berel.com/sitemap-articulos.xml` | Artículos y piezas editoriales |
| `https://berel.com/sitemap-colores.xml` | Familias de color |

Si la URL no aparece en el sitemap, **no la inventes**: no existe.

### Paso 2 — Confirmar la candidata contra una ruta de control

Sigue siendo **obligatorio**, aunque la URL haya salido del sitemap. Navega la candidata y una ruta
de control inventada —p. ej. `https://berel.com/productos/arquitectonico/esto-no-existe-xyz123`— y
compara la extracción completa:

| Señal | Ruta de control (no existe) | Página real |
|---|---|---|
| `<title>` | ausente | propio de la página |
| `meta description` | ausente | presente |
| `<h1>` | cero | propio |
| Texto extraído | **684 caracteres** (solo navegación y pie) | **más de 2.000 caracteres** |

Medidos el 2026-08-25: la ficha de Berelinte trae **4.699 caracteres**; el tutorial de baño, **5.231**.
Si la candidata no trae `<title>` propio y pesa lo mismo que el control, **no existe**: sustitúyela
por una alternativa verificada y deja el pendiente en el callout ⚠️.

### URLs verificadas el 2026-08-25 — listas para reusar

Fichas de producto, todas bajo `https://berel.com/productos/arquitectonico/`:

| Producto | Ruta |
|---|---|
| Berelinte | `vinilacrilicas/berelinte` |
| Kalos Tone | `vinilacrilicas/kalos-tone` |
| Multitono Pro | `vinilacrilicas/multitono-pro` |
| Insignia | `vinilacrilicas/insignia` |
| Esmalte Summa (semimate) | `esmaltes/esmalte-summa-2` |
| Sellador (acrílico, Serie 580) | `primarios/sellador` |
| Fondo Noxid (primario anticorrosivo) | `primarios/fondo-noxid` |
| Pintura para Pisos | `decorativos/pintura-para-pisos` |

Rutas de navegación, bajo `https://berel.com/`:

| Ruta | Estado |
|---|---|
| `consejos-para-pintar` | Existe — hub de la serie |
| `tutoriales/como-transformar-tu-bano-con-pintura` | Existe |
| `inspiracion/salas` | Existe |
| `inspiracion/banos` | ⚠️ **NO existe** — devuelve el shell de control |
| `tutoriales` y `articulos` a secas | ⚠️ **NO existen** como índices. Los índices reales son `inspiracion/tutoriales` e `inspiracion/articulos`; las piezas individuales sí viven en `articulos/<slug>` y `tutoriales/<slug>` |

🔴 **Que exista `/inspiracion/salas` no implica que existan sus hermanas.** Cada ruta de una familia
se verifica por separado.

### 🔴 Sufijos de variante: enlaza al acabado, no al nombre

El CMS de Berel publica **una URL distinta por acabado**, con sufijo numérico, y **los datos técnicos
difieren entre ellas**. Verificado el 2026-08-25:

| Producto | Variantes publicadas |
|---|---|
| Esmalte Summa | `esmalte-summa` (Mate) · `-0` (Brillante) · `-1` (Satinado) · `-2` (Semimate) |
| Sellador | `sellador` (Acrílico, Serie 580) · `-0` (Vinil-Acrílico, Serie 570) · `-1` (Vinílico) · más `sellador-max`, `sellador-green`, `sellador-invisible`, `sellador-anti-salitre` |
| Berelinte · Kalos Tone | cada uno tiene además su `-0` |

🔴 **Enlazar al nombre de producto no basta: el enlace va a la variante cuyo dato sostiene lo que
afirma el texto.** Si el párrafo habla de acabado semimate, el destino es `esmalte-summa-2`, no
`esmalte-summa`; si cita la Serie 580, es `sellador`, no `sellador-0`. Cruza siempre el dato del
cuerpo con el de la ficha antes de fijar la URL. El modo de falla concreto está documentado en
[`../ANTIPATTERNS.md`](../ANTIPATTERNS.md).

⚠️ **No existe ningún "Sellador 5x1"** en el sitemap. Si aparece mencionado, es memoria, no catálogo.

### Auditoría anti-canibalización: sobre el HTML completo

Cuando el brief pide verificar que **ningún artículo existente use ya la frase objetivo**, no basta
con mirar `title`, `H1` y `meta description`: la frase puede estar enterrada en el cuerpo. Busca la
**frase literal en todo el HTML** de cada página candidata, **con y sin tilde**. Así se cerró esa
verificación para los tres artículos de sala en septiembre 2026.

## Estructura obligatoria del bloque

Dentro del desplegable, **siempre en este orden**:

| Bloque | Qué lleva |
|---|---|
| **Callout de procedencia** | De qué análisis y qué fuentes de la wiki sale esta versión, más la convención de niveles usada (`##` = H2 del artículo, `###` = H3), para que **quien maquete no confunda los encabezados de Notion con los del CMS** |
| **Metadatos propuestos** | Title, meta description, slug y H1, cada uno con su **conteo de caracteres**. 🔴 **En viñetas, no en tabla** — el carácter de barra vertical parte la fila en Notion |
| **Texto completo** | El artículo listo para maquetar: arco de cinco tiempos, tuteo, tablas, FAQ y firma de cierre |
| **Especificación de banners** | Un **callout 🖼️ en la posición exacta del texto** donde va cada pieza, con archivo, medidas, peso, lazy sí/no y **ALT literal**. Es la fuente de verdad que después se copia a la ficha de la subtarea |
| **Callout de pendientes ⚠️** | Todo lo que quedó sin verificar: fichas de producto sin URL pública, series por confirmar, datos que dependen del cliente. *Un pendiente declarado es gestionable; uno omitido se publica como error* |

→ Plantilla copiable: [`../templates/bloque-reescritura.md`](../templates/bloque-reescritura.md)

## Reglas editoriales obligatorias

- **Colores con código alfanumérico.** Cada color se nombra con su código junto al nombre
  (p. ej. `Nombre 1-2804D`).
- 🔴 **Nunca RGB ni HEX en el cuerpo publicable.** Son solo referencia interna para diseño. El
  Catálogo RGB es de consumo interno.
- **Colores enlazados:** **Berel no tiene página por tono, pero sí por familia.** Orden:
  **paleta o artículo propio que rankee** → **`berel.com/colores/<familia>`**. Las nueve verificadas
  en `sitemap-colores.xml` el 2026-08-25: `amarillos` `azules` `cafes` `grises` `morados` `naranjas`
  `pasteles` `rojos` `verdes`. **No hay ninguna otra.**
  🔴 **Nunca la búsqueda del sitio:** `robots.txt` trae `Disallow: /search` y `Disallow: /*?q=`.
- **Productos enlazados a su ficha real** (`berel.com/productos/...`) o a la categoría; **nunca al
  Home, nunca a `/search?q=` y nunca a URLs del backend/CMS**. 🔴 Y a la **variante** correcta, no al
  nombre genérico → [§ Sufijos de variante](#-sufijos-de-variante-enlaza-al-acabado-no-al-nombre).
- Siempre con **anchor descriptivo**; nunca la URL cruda como texto del enlace.
- Incluir **FAQ**, **tabla comparativa** cuando aplique, y la **firma de cierre** de la marca.
- **Especificar los banners dentro de la reescritura** siguiendo la Spec para imágenes: posición
  exacta anclada a una sección real del texto, nombre de archivo `.webp`, ALT exacto y **hero sin
  `lazy`** (es el LCP) → [`05_BANNERS_IMAGENES.md`](05_BANNERS_IMAGENES.md).

### Cuando el dato no está firme

- Si el sitio **no confirma** la URL, enlazar la **familia de color** o la **categoría de producto**,
  y dejar el pendiente en el callout ⚠️. 🔴 **Nunca la búsqueda del sitio como respaldo.**
- Si un **producto no tiene ficha pública localizable** —no aparece en `sitemap-productos.xml` y la
  candidata pesa como el control—: citarlo con su nombre y número de serie confirmados en el
  catálogo, enlazar el catálogo general y dejar el pendiente en el callout ⚠️. **Nunca inventar una
  URL de ficha**, ni deducir un sufijo de variante que no viste en el sitemap.
- Si una fuente de la wiki está **vacía o sin permisos de lectura**, **decirlo explícitamente en el
  entregable** en lugar de rellenar el hueco con supuestos.

## Estándares on-page que la pieza debe cumplir

Del estándar editorial de la marca (→ [`04_VOZ_Y_TONO_BEREL.md`](04_VOZ_Y_TONO_BEREL.md) §6):

- **Title tag (~55-60 car.):** keyword al inicio, marca al cierre.
- **Meta description (~150-155 car.):** keyword + beneficio + CTA. Replicarla en `og:description` y
  `twitter:description`.
- **Jerarquía limpia:** un solo H1, H2 por sección, H3 por subtema. **Nunca saltos H1→H4** ni
  encabezados vacíos del CMS.
- **Extensión:** 900-1.200+ palabras de **cuerpo útil**, no relleno. ⚠️ **Ese rango es un piso
  histórico, no el tamaño real de una pieza con fan-out.** Cuando el brief pide 12 H2 con su cápsula
  autocontenida, la estructura sola ya empuja el cuerpo a **1.800-3.000 palabras** — así salieron las
  tres de septiembre 2026 (N31 ~3.000, N32 ~2.240, N33 ~1.800). **Manda el piso que declare el
  brief**, y si el brief no declara ninguno, manda la estructura: recortar a 1.200 una pieza de 12 H2
  significa dejar cápsulas cojas, que es justo lo que rompe la recuperación por pasajes.
- **AEO:** definiciones canónicas "X es Y" en la primera frase de cada sección · FAQ con respuesta
  directa en la primera línea · tablas comparativas y listas reales (los LLM las extraen con
  facilidad) · datos verificables y citables.
- **Datos estructurados (pendiente para Dev, se anota en el callout ⚠️):** `Article` completo
  (`description`, `author`, `datePublished`/`dateModified`, `image`) · `FAQPage` para las preguntas ·
  `HowTo` para guías paso a paso · `BreadcrumbList` para la migaja. **El texto del schema debe
  coincidir exactamente con el visible.** Unificar dominio a `berel.com` **sin www** entre canónica
  y `@id`.

**Contenido evergreen → arquitectura hub & spoke.** Para temas que se repiten cada temporada
(colores del año, tendencias): una **pillar page atemporal** que acumula ("Colores de Temporada") y
**páginas hijas** por paleta/año ("Paraíso Mexicano 2026"). El hub captura keywords genéricas; cada
hija, las específicas. Enlazado bidireccional y **sin canibalizar preguntas entre ambos**. 🔴 En
piezas evergreen **evita frases dependientes del momento** ("paleta vigente", "temporada actual",
"este año"): rompen la atemporalidad del hub.

## Anatomía esperada del texto

- **Arco de cinco tiempos:** apertura emocional (micro-escena) → desarrollo → resolución → cierre →
  CTA. El cierre **retoma la escena de apertura**: el arco cierra el círculo.
- **Respuesta directa extractable** de **40 a 55 palabras** justo después del gancho. Es lo que cita
  un motor de respuesta.
- **Longitud:** 900–1.200+ palabras según la guía editorial.
- **FAQ de 4 a 6 preguntas**, extractables.
- **CTA con tres acciones**, no un enlace suelto: calcular o explorar · dónde comprar · lectura
  relacionada.
- **Secciones que abren con una frase citable sola**, no con un fragmento suelto.

## 🔴 Ningún texto se cierra sin la auditoría de Voz y Tono

"Suena bien" **no es criterio**. Se revisa contra la lista de fallas típicas
→ [`04_VOZ_Y_TONO_BEREL.md`](04_VOZ_Y_TONO_BEREL.md).

## Cross-links

- Estructura del brief editorial que alimenta la pieza →
  `docs/operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md`
- Craft de titulares, leads, narrativa y edición → skill `copywriting`
- Descubribilidad, schema, citabilidad y FAQ como objeto extractable → skill `seo-aeo`
- Formato Notion (barra vertical, símbolos, desplegables) → [`07_SISTEMA_NOTION.md`](07_SISTEMA_NOTION.md)
- 🔴 Peticiones explícitas del cliente (series, "espacios", Kelvin, encabezados-pregunta, CTA) →
  [`09_RECOMENDACIONES_DEL_CLIENTE.md`](09_RECOMENDACIONES_DEL_CLIENTE.md)
