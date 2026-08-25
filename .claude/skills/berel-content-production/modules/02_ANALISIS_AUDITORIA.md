# 02 · Análisis SEO/AEO y análisis de contenido (Fases 3 y 4)

> Solo aplica a la **Modalidad A · Reescritura**. En Modalidad B no hay página publicada que
> auditar: la arquitectura se **decide** en el `🧭 Plan editorial y SEO`
> (→ [`01_CICLO_MENSUAL.md`](01_CICLO_MENSUAL.md), Fase B3).

## 🔴 Prerrequisito obligatorio: abrir la URL publicada en vivo

El análisis **no se escribe sobre el `Contenido anterior del artículo`** rescatado en la Fase 2. Esa
extracción es texto plano y **no prueba nada** sobre enlaces, imágenes, ALT, `title` ni jerarquía de
encabezados.

Auditar solo con ese texto lleva a **afirmar cosas falsas**. *Caso real:* se dio por hecho que un
artículo no tenía enlaces de color cuando sí los tenía.

**Abrir siempre la página real con extracción completa, una URL a la vez, y recién entonces
escribir.**

> **La ausencia en la extracción no es ausencia en la página.** Ningún hallazgo técnico se afirma
> sin haber abierto la URL en vivo.

## Fase 3 · Análisis SEO/AEO

En la página del artículo, un encabezado desplegable 1 titulado `Análisis SEO/AEO` con un análisis
profundo que cubra:

- **Keyword** principal y secundarias; intención de búsqueda y volumen estimado.
- **Title, meta description, H1–H3, slug/URL.**
- **AEO:** respuestas directas al inicio, bloque FAQ, aptitud para featured snippets y motores de
  respuesta.
- **Enlazado** interno (artículos propios) y externo; oportunidades de interlinking.
- **Imágenes:** ALT descriptivo, formato `.webp`, peso, `loading="lazy"` (excepto el hero, que es
  LCP).
- **E-E-A-T**, datos verificables y comparación con la competencia.
- Cierre con **recomendaciones priorizadas** (accionables, ordenadas por impacto).

### Verificación obligatoria en la URL publicada

Comprobar cada punto en el **HTML real** y dejar constancia en una sección final del análisis
titulada `Verificación en la URL publicada`, **con la fecha de auditoría**:

| Qué revisar | Qué mirar y errores típicos ya detectados |
|---|---|
| `title` real | Longitud y orden. **El CMS antepone `Pinturas Berel` + separador**, que consume los primeros caracteres —los de mayor peso—. Medir el largo real: pasando los 60 caracteres se trunca en resultados |
| Encabezados | El nivel **real** de cada uno, no el que aparenta el texto. Errores vistos: saltos de H1 directo a H4, ausencia total de H2 y H3, y jerarquías invertidas (un H4 antes que un H3) |
| Enlaces | Cuáles existen de verdad **y hacia dónde apuntan**. Separar los enlaces a artículos propios de los de taxonomía (`/search?q=`), que son páginas de resultados y **no cuentan como enlazado interno**. Error visto: un color enlazado a la búsqueda de **otro** color |
| Imágenes | Cuántas hay realmente (**hay artículos con cero**), el ALT literal de cada una y si existe hero para `og:image`. Errores vistos: ALT con el nombre de archivo o con una etiqueta interna en lugar de una descripción |
| Etiquetas / taxonomía | Si corresponden al tema y a la keyword. Errores vistos: etiquetas huérfanas (un tema que el artículo no toca) y etiquetas de producto en un artículo cuya consulta es de técnica |
| Duplicaciones | **El CMS repite el H1 como párrafo de texto plano** bajo el bloque de compartir |
| Menciones sin enlazar | Productos y "Te puede interesar" que aparecen en negrita o cursiva y **no llevan a ningún lado** |
| Fecha de publicación | La que expone el sitio, para juzgar vigencia y **cazar datos caducados**: Color del Año de ciclos anteriores, promociones sin vigencia |

**Dos reglas al cerrar la verificación:**

1. 🔴 Si la verificación **desmiente algo que ya se escribió**, corregirlo **en el cuerpo del
   análisis**, no solo anotarlo al final: *el documento no puede quedar con afirmaciones falsas.*
2. Los **errores de producción** que aparezcan (enlaces rotos o apuntando al destino equivocado) se
   **reportan aparte al usuario**: se corrigen de inmediato en el sitio, sin esperar a la
   reescritura.

## Fase 4 · Análisis de contenido

Otro encabezado desplegable 1 titulado `Análisis de contenido`, con el mismo rigor:

- **Estructura narrativa y arco**: apertura emocional → desarrollo → resolución → cierre → CTA.
- **Ajuste a la guía de Voz y Tono**: acompañante experto, tuteo al lector, "nosotros" para la
  marca, léxico local → [`04_VOZ_Y_TONO_BEREL.md`](04_VOZ_Y_TONO_BEREL.md).
- **Profundidad y vacíos** de contenido frente a la intención de búsqueda.
- **Longitud** frente a la guía editorial (**900–1.200+ palabras**) y frente a la competencia.
- Presencia de **FAQ (4–6 preguntas)**, **tabla comparativa** y datos concretos.
- Cierre con **recomendaciones priorizadas**.

## Verificado vs. estimado

**Distinguir siempre lo verificado de lo estimado.** Los volúmenes de búsqueda y las comparaciones
de competencia **sin herramienta de datos van marcados como estimación**. No conviertas una
impresión en un número.

## Cross-links

- Metodología de research y priorización editorial que precede al ciclo →
  `docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`
- Oficio SEO/AEO (schema, chunking, citabilidad, entidad, E-E-A-T) → skill `seo-aeo`
- Contrato HTML/SEO de la imagen editorial → `seo-aeo/references/editorial-image-seo.md`
