# Sistema de infografías editoriales Efeonce

Este documento gobierna las infografías de artículos, pillars y piezas editoriales de Efeonce. No define una
plantilla única: define un **shell de marca estable**, un catálogo de **composiciones semánticas** y un contrato
de producción que permite repetir calidad sin repetir la misma lámina.

El companion machine-readable `editorial-infographic-system.json` expone paleta, arquetipos, firma y gates para
scripts, manifests y agentes. Este Markdown explica el criterio; el JSON evita reescribirlo de memoria.

> Principio rector: la riqueza viene de cuánto significado comprime la composición, no de cuántas tarjetas,
> burbujas, sombras o adornos contiene.

## 1. Precedentes auditados

La familia histórica de Marketing con Manzanitas demuestra una gramática consistente con cuerpos distintos:

| Artículo | Activos SVG observados | Arquetipo dominante |
|---|---|---|
| `https://efeoncepro.com/inbound/estrategia-de-contenidos/` | `Reutilizacion-2.svg`, `Topic-Cluster.svg`, `golden-circle.svg` | metáfora, red, comparación/modelo |
| `https://efeoncepro.com/inbound/genera-leads-con-marketing-de-contenidos/` | `eeat-ymyl-1.svg`, `flywheel.svg`, `loop-hi.svg`, `messy-middle.svg` | comparación, ciclo, loop, recorrido |
| `https://efeoncepro.com/inbound/seo-inbound-marketing/` | `Topic-Cluster.svg`, `messy-middle.svg` | red, recorrido |

Hallazgos visuales:

- campo editorial blanco, composición central dominante y lectura de póster autocontenida;
- formas vectoriales planas, bordes limpios, jerarquía tipográfica fuerte y poca ornamentación;
- una metáfora distinta para cada relación: árbol, red, círculos, rueda, loop o recorrido infinito;
- copy reducido al mínimo necesario para navegar la pieza;
- firma de marca estable y confinada al footer, sin competir con el contenido;
- el valor visual está en el **encoding de la relación**, no en una grilla repetida de cards.

Los precedentes son evidencia de sistema, no archivos para copiar literalmente. La ejecución nueva debe conservar
la lógica y modernizar escala, aire, accesibilidad y calidad tipográfica.

## 2. Paleta observada y roles

### Núcleo Efeonce

| Rol | Color observado | Uso |
|---|---|---|
| tinta principal | `#022A4E` | títulos, estructura, firma, contraste principal |
| azul profundo | `#023C70` | segundo nivel, conectores, áreas extensas |
| azul medio | `#024C8F` | jerarquía secundaria |
| azul activo | `#0375DB` | dato, nodo o paso destacado |
| naranja de energía | `#F55D01` | acción, contraste, punto de decisión |
| plomo oscuro | `#263448` | texto auxiliar y neutral de alto contraste |
| plomo medio | `#505964` / `#515150` | soporte, leyendas, contenido secundario |
| blanco | `#FFFFFF` | canvas editorial y espacio negativo |

### Acentos semánticos

- magenta `#BB1954` y púrpura `#633F93` para diferenciar familias, estados o clusters;
- gris `#DBDBDB` para estructura pasiva;
- verdes solo cuando el significado lo necesita;
- paletas de terceros —por ejemplo HubSpot en una pieza de flywheel— son **contextuales**, no una ampliación
  automática de la paleta Efeonce.

Regla 60/30/10: el canvas y la tinta estructural dominan; uno o dos acentos hacen el trabajo semántico. No usar
todos los colores porque existen. En dark mode, el canvas puede pasar al negro plomo del tema y la tinta/acentos
deben remapearse con contraste comprobado; no agregar blobs o fondos decorativos para “llenar”.

## 3. Shell estable, cuerpo variable

### Shell estable

Toda infografía editorial debe resolver:

1. **kicker editorial** opcional;
2. **título autónomo**, entendible fuera del artículo;
3. **bajada** solo cuando agrega el marco necesario;
4. **cuerpo semántico** elegido por la relación;
5. **fuente/nota/límite** si hay evidencia o dato;
6. **footer izquierdo:** fuente, nota, límite y fecha/as-of cuando aplica;
7. **footer derecho:** wordmark oficial + sello URL `efeoncepro.com`.

En infografías de cuerpo, esta ubicación es obligatoria: el header sólo contiene kicker, título y bajada. No
se admite wordmark, dominio, sello ni watermark en el header, las esquinas superiores o el campo explicativo.
Hero, featured, OG, social y deck son superficies diferentes y declaran su propia política de firma.

El sello canónico vive en:

`src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`

Su tratamiento de referencia vive en:

`src/lib/artifact-composer/catalogs/deck-axis/deck-signature.css`

Para una entrega SVG autónoma, consumir esa geometría durante el build e incrustarla en el SVG final. No enlazarla
como recurso remoto, no redibujarla y no mutar el source. Resolver su fill/opacidad por canvas. El viejo sello
`efeonce.cl` no se mantiene en piezas nuevas.

Wordmarks públicos oficiales: `public/branding/logo-full.svg` en light y
`public/branding/logo-negative.svg` en dark. `AxisWordmark` es interno y no se usa en piezas públicas.

### Cuerpo variable: elegir por relación

| Relación que debe entenderse | Arquetipo recomendado | Evitar |
|---|---|---|
| origen → ramas → reutilización | metáfora/sistema | lista de cards sin causalidad |
| actores o temas conectados | red/ecosistema | órbitas decorativas sin encoding |
| repetición o retroalimentación | ciclo/loop | timeline lineal |
| pasos con progreso y decisiones | camino/proceso | cuatro cajas idénticas |
| contraste entre dos enfoques | split/comparación | tabla densa si la forma importa |
| niveles, madurez o capas | modelo estratificado | escalera genérica sin criterio de eje |
| magnitudes, distribución o evidencia | chart/mapa de datos | ilustración que simula precisión |

Una serie es reconocible por su shell, paleta, tipografía, tratamiento de línea y firma; **no** porque todas las
piezas usen la misma grilla. Dos infografías consecutivas no deberían repetir arquetipo salvo que la relación lo
exija.

## 4. Benchmark Semrush: qué adoptar y qué no

Semrush funciona como referencia de categoría porque trata la infografía como un póster compartible:

- título grande y promesa legible sin el artículo;
- navegación visual clara mediante números, recorridos o nodos;
- una gran forma organizadora en vez de una colección de módulos equivalentes;
- marca y URL constantes en cabecera o footer dentro de sus ejemplos;
- composiciones altas cuando el relato necesita recorrido;
- copy breve pero suficiente para que el asset circule solo.

Adoptar el **principio de sistema** —chrome constante + arquetipo variable + lectura autónoma—, no su trade dress,
paleta, ilustraciones ni layouts literales. La cabecera observada en Semrush no modifica la regla Efeonce:
en infografías de cuerpo, la firma completa permanece únicamente en el footer. Fuentes primarias de benchmark,
verificadas en 2026-07:

- `https://www.semrush.com/blog/infographic-examples/`
- `https://www.semrush.com/blog/content-marketing-tips/`
- `https://www.semrush.com/blog/types-of-content-marketing/`

## 5. Contrato de riqueza y shareability

Una infografía está lista para compartir solo si pasa estos tests:

- **autonomía:** título, tesis, firma y fuente permiten entenderla fuera de contexto;
- **delta explicativo:** hace visible una relación que el párrafo no comunica igual de rápido;
- **escaneo:** la ruta de lectura se descubre en tres segundos;
- **profundidad:** contiene mecanismo, criterio, evidencia o consecuencia; no solo slogans;
- **jerarquía:** una idea domina y los detalles se subordinan;
- **recorte:** conserva identidad y tesis en thumbnail/social cuando el destino lo requiere;
- **atribución:** la firma permanece visible pero no parece un anuncio;
- **citabilidad:** datos, definiciones y límites tienen fuente o nota cuando corresponde.

`body-ready` y `social-ready` son estados distintos. Un destino compartible declara ratio, safe area, tamaño
mínimo de tipo al thumbnail, crop/preview y archivo durable con lineage. Un PNG local de revisión no es un
derivado social publicado.

No llenar la pieza para que “se sienta premium”. Premium es edición, precisión, aire, consistencia óptica y una
metáfora inevitable para el argumento.

## 6. SVG directo como entrega web preferida

Para diagramas, infografías y visuales tipográficos vectoriales, evaluar primero SVG directo. La auditoría de los
siete precedentes arrojó:

| Asset | SVG raw | SVG servido comprimido | WebP 1200 px comparativo |
|---|---:|---:|---:|
| Reutilización | 249,843 B | 47,822 B | 101,690 B |
| Topic Cluster | 56,872 B | 12,365 B | 66,262 B |
| Golden Circle | 268,303 B | 39,030 B | 85,216 B |
| EEAT/YMYL | 163,464 B | 24,302 B | 71,044 B |
| Flywheel | 55,880 B | 22,248 B | 70,800 B |
| Loop | 41,879 B | 14,912 B | 68,610 B |
| Messy Middle | 42,577 B | 14,770 B | 82,862 B |

En esta muestra, el SVG comprimido fue aproximadamente **2.1× a 5.6× más liviano** que un WebP comparable,
además de conservar nitidez a cualquier densidad. Es evidencia de esta familia, no una promesa universal.

### Source SVG vs delivery SVG

- **source SVG:** editable, con texto vivo si el flujo creativo lo necesita, capas y metadata de producción;
- **delivery SVG:** autónomo, saneado, optimizado y portable; texto convertido a contornos cuando la fidelidad
  tipográfica es crítica; `viewBox`, `width` y `height` explícitos; sin dependencias externas.

El delivery SVG debe bloquear:

- `<script>`, event handlers, `<foreignObject>` y enlaces externos;
- fonts, imágenes o CSS remotos;
- IDs/defs rotos, contenido fuera del `viewBox` y clipping accidental;
- texto vivo sin fuente embebida o fallback deliberado;
- filtros/gradientes innecesarios que inflen peso o generen diferencias de render.

Agregar `<title>` y `<desc>` cuando el SVG se incruste inline. Si se sirve con `<img>`, el contrato accesible vive
principalmente en `alt`, caption y contexto HTML; no duplicar una descripción extensa.

### Cuándo rasterizar

Crear PNG/WebP/JPEG/AVIF solo cuando:

- el asset contiene fotografía, textura o efectos raster;
- el destino social/OG/CMS no acepta SVG;
- se necesita un fallback de compatibilidad comprobado;
- el SVG optimizado resulta más pesado que el derivado raster al tamaño real;
- la política de seguridad del runtime no permite SVG.

No rasterizar por costumbre. Registrar bytes comparables al ancho real y elegir por evidencia.

### SEO y descubrimiento del SVG

Google admite SVG cuando existe en un `<img src>`. Un `<picture>` conserva un único `<img>` fallback estable;
las variantes de tema/viewport son art direction, no cuatro URLs que deban competir por indexación. El texto
convertido a paths fija la apariencia, pero no reemplaza contenido HTML indexable. Filename, ALT, caption,
descripción larga/texto cercano y la página canónica llevan la semántica.

Verificar GET `200`, `Content-Type: image/svg+xml`, dimensiones, crawlability y robots. Mantener
featured/OG/Twitter como raster social-safe. Ver
`../../seo-aeo/references/editorial-image-seo.md`.

## 7. Light, dark y responsive

- Si una composición funciona sobre canvas blanco deliberado, puede mantenerse como póster blanco en ambos temas.
- Si debe integrarse al tema, producir variantes light/dark explícitas y servirlas con `<picture>`/`media` o el
  mecanismo gobernado del runtime; no confiar en filtros CSS.
- Para ratios diferentes, crear SVGs art-directed separados. No encoger un póster horizontal hasta volver
  ilegible su copy.
- Texto esencial: mínimo visual equivalente a 16 CSS px en la columna real; notas, 12–14 CSS px según contraste.
- Calcular `fontSizeSVG × anchoCSS / viewBoxWidth`; las dimensiones de exportación no prueban legibilidad.
- Todo label debe quedar dentro del `viewBox` y de su safe area; medir bounding boxes, no aprobar “a ojo”.

## 8. Flujo repetible

1. Completar `templates/editorial-infographic-contract.md`.
2. Elegir arquetipo desde la relación, no desde el gusto.
3. Dibujar estructura monocroma y probar ruta de lectura.
4. Aplicar roles de paleta y shell Efeonce.
5. Producir source SVG y delivery SVG separado.
6. Ejecutar `pnpm content:editorial-svg:audit -- <delivery.svg...>` sobre el delivery.
7. Comparar bytes comprimidos contra raster al ancho real cuando aplique.
8. Inspeccionar al 100%, en columna desktop y mobile, y en thumbnail.
9. Validar ALT, caption, fuente, firma y sello URL.
10. Integrar por Media ID, hacer readback y verificar superficie pública antes de declarar rollout completo.

## 9. Gates

| Gate | Bloquea si |
|---|---|
| argumento | no existe delta explicativo o la tesis depende del artículo para entenderse |
| arquetipo | la forma no representa la relación o repite una plantilla por inercia |
| marca | usa `efeonce.cl`, redibuja la burbuja o el branding domina el contenido |
| SVG | hay contenido inseguro, referencias externas, clipping o ausencia de `viewBox` |
| tipografía | hay overflow, labels minúsculos o dependencia de fuente no controlada |
| performance | se eligió formato sin comparar bytes y uso real |
| accesibilidad | falta ALT/caption/alternativa larga según complejidad y modo de integración |
| SEO | falta `<img src>` fallback, filename descriptivo, contexto HTML, MIME/GET o crawlability |
| contexto | falla en columna, mobile, dark/light o thumbnail requerido |
| trazabilidad | no existen source, delivery, hashes, contrato y manifest |
