# 03 · Redacción del artículo (Fase 5 / Fase B5)

> Vale para las dos modalidades. En **A** el bloque se llama `✍️ Reescritura V1`; en **B**,
> `✍️ Artículo V1`. La estructura interna y las reglas editoriales son **idénticas**.

## Cómo se monta

1. **Debajo** del contenido existente y **sin borrar nada**, agregar un encabezado desplegable 1
   para la reescritura.
2. Basarla en: el contenido anterior + las recomendaciones de ambos análisis + la guía de Voz y Tono
   y demás páginas de la wiki (paleta vigente, keywords, recomendaciones SEO).
3. **Verificar cada enlace** navegando al sitio antes de dejarlo en el texto (extracción completa,
   una URL a la vez). Si una URL devuelve 404 o solo búsqueda, **sustituirla por una alternativa
   verificada**.
4. Controlar la longitud contra la guía y el plan SEO; si excede mucho, **proponer** qué recortar
   (FAQ redundantes, pasos fusionables) **sin ejecutarlo salvo pedido**.
5. **Releer antes de cerrar.** Una errata en el cuerpo publicable obliga a una edición extra y le
   resta credibilidad al entregable; revisar sobre todo **nombres de producto, de color y
   tecnicismos**.
6. Al terminar, `Estado` del artículo a **`En revisión`**.

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
- **Colores enlazados:** 🔴 **Berel no tiene página pública por color** — el catálogo
  `berel.com/colores` es un explorador por familia que no genera URL por tono. Orden de preferencia:
  **paleta o artículo propio que rankee** → `berel.com/colores` cuando la intención es dónde ver o
  comprar → y **solo como último recurso** la búsqueda del sitio, **verificada**.
- **Productos enlazados a su ficha real** (`berel.com/productos/...`) o a la categoría; **nunca al
  Home, nunca a `/search?q=` y nunca a URLs del backend/CMS**.
- Siempre con **anchor descriptivo**; nunca la URL cruda como texto del enlace.
- Incluir **FAQ**, **tabla comparativa** cuando aplique, y la **firma de cierre** de la marca.
- **Especificar los banners dentro de la reescritura** siguiendo la Spec para imágenes: posición
  exacta anclada a una sección real del texto, nombre de archivo `.webp`, ALT exacto y **hero sin
  `lazy`** (es el LCP) → [`05_BANNERS_IMAGENES.md`](05_BANNERS_IMAGENES.md).

### Cuando el dato no está firme

- Si el sitio **no confirma** un enlace de color/producto, usar `/search?q=<término>` verificado como
  respaldo.
- Si un **producto no tiene ficha pública localizable**: citarlo con su nombre y número de serie
  confirmados en el catálogo, enlazar el catálogo general y dejar el pendiente en el callout ⚠️.
  **Nunca inventar una URL de ficha.**
- Si una fuente de la wiki está **vacía o sin permisos de lectura**, **decirlo explícitamente en el
  entregable** en lugar de rellenar el hueco con supuestos.

## Estándares on-page que la pieza debe cumplir

Del estándar editorial de la marca (→ [`04_VOZ_Y_TONO_BEREL.md`](04_VOZ_Y_TONO_BEREL.md) §6):

- **Title tag (~55-60 car.):** keyword al inicio, marca al cierre.
- **Meta description (~150-155 car.):** keyword + beneficio + CTA. Replicarla en `og:description` y
  `twitter:description`.
- **Jerarquía limpia:** un solo H1, H2 por sección, H3 por subtema. **Nunca saltos H1→H4** ni
  encabezados vacíos del CMS.
- **Extensión:** 900-1.200+ palabras de **cuerpo útil**, no relleno.
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
