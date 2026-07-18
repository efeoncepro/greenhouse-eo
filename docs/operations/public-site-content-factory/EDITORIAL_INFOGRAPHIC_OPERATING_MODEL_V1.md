# Editorial Infographic Operating Model V1

> **Tipo:** canon operativo reusable para infografías editoriales.
> **Estado:** vigente.
> **Versión:** 1.0.
> **Fecha:** 2026-07-18.
> **Owner:** Content Marketing + Design Studio + Public Site.
> **Aplica a:** artículos, pillars, guías y derivados editoriales Efeonce.
> **Caso de calibración:** `El fin de la web “solo para humanos”`, post WordPress `249387`.

## 1. Propósito

Este documento convierte los aprendizajes visuales, técnicos, editoriales y SEO de las infografías Efeonce en
un proceso repetible. Evita que la calidad dependa de recordar una conversación, copiar una lámina anterior o
confundir riqueza con decoración.

La unidad de trabajo no es “una imagen”. Es un **argumento visual autónomo** con:

- un trabajo editorial y un delta explicativo verificables;
- una composición semántica elegida por la relación;
- una firma de marca gobernada;
- source, delivery, metadata y lineage;
- integración accesible y rastreable;
- QA de archivo, columna, tema, viewport y canal de distribución.

## 2. Fuentes de verdad y precedencia

| Pregunta | Source of truth |
|---|---|
| Método portable | `.codex/skills/content-marketing-studio/references/deterministic-editorial-infographics.md` |
| Estilo Efeonce | `.codex/skills/content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md` |
| Contrato machine-readable | `.codex/skills/content-marketing-studio/efeonce/editorial-infographic-system.json` |
| SEO de imágenes/SVG | `.codex/skills/seo-aeo/references/editorial-image-seo.md` |
| Operación WordPress | `.codex/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md` |
| Proceso completo del post | `AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md` |
| Estado de un artículo | visual system + manifest + Media Library/readback + runtime |

Ante discrepancias, prevalecen el delivery verificado y el runtime sobre previews o manifests históricos. El
Markdown explica criterio; el JSON alinea tooling; los scripts hacen enforcement; ninguno sustituye inspección
humana del significado.

## 3. Fronteras de superficie

### 3.1 Infografía de cuerpo

Su función es explicar una relación dentro de la narrativa. Para Efeonce:

- el header contiene solamente kicker, título y bajada editorial;
- toda la información de marca vive en el footer;
- el footer reúne fuente/fecha a la izquierda y wordmark oficial + sello `efeoncepro.com` a la derecha;
- no hay logo, dominio, watermark ni sello en la parte superior o en el campo de datos;
- light usa canvas blanco `#FFFFFF`; dark usa negro plomo `#111013`;
- no se agregan blobs, burbujas ambientales, fondos celestes, glow, glass o marco exterior decorativo;
- el color codifica significado; no rellena espacio.

### 3.2 Portada o featured

Instala la tesis y debe sobrevivir el crop del theme y de cards. Puede ser conceptual y raster. No tiene que
repetir el shell de una infografía de cuerpo. Su brief declara:

- foco y centro óptico;
- crop seguro para featured y cards;
- presencia o ausencia de firma;
- tratamiento de texto, normalmente compuesto después y no generado;
- si el theme ya muestra la portada, no se repite dentro del body.

### 3.3 Open Graph y social

Es un derivado de distribución, no una exportación automática del featured. Debe probarse en el ratio real,
miniatura y preview. JPEG/PNG/WebP raster son la opción social-safe; SVG de cuerpo no se reutiliza como OG por
inercia. Featured y OG pueden compartir master, pero mantienen archivos, hashes, crops, Media IDs y roles
distintos.

## 4. Anatomía Efeonce de una infografía de cuerpo

```text
┌──────────────────────────────────────────────────────────────┐
│ KICKER                                                       │
│ Título autónomo                                              │
│ Bajada opcional                                              │
│                                                              │
│              CUERPO SEMÁNTICO VARIABLE                       │
│     mecanismo / mapa / circuito / escala / recorrido         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Fuente · as-of                         wordmark  efeoncepro.com│
└──────────────────────────────────────────────────────────────┘
```

El footer es una zona reservada, no una fila que el cuerpo puede invadir. El builder debe marcarla con un grupo
identificable —por ejemplo `data-footer="true"`— y probar que ningún asset de marca exista fuera de él.

Assets oficiales:

- wordmark light: `public/branding/logo-full.svg`;
- wordmark dark: `public/branding/logo-negative.svg`;
- sello URL: `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`.

Se incrustan o empaquetan de forma autónoma en el delivery. No se redibujan, no se solicitan al generador y no
se enlazan como recursos remotos.

## 5. Riqueza editorial y shareability

Una pieza premium no es la que contiene más módulos. Es la que vuelve inevitable una comprensión que antes
requería varios párrafos. Debe pasar:

1. **Autonomía:** se entiende fuera del artículo.
2. **Delta:** revela mecanismo, frontera, criterio, evidencia o consecuencia; no parafrasea.
3. **Ruta en tres segundos:** el ojo sabe dónde comenzar y cómo avanzar.
4. **Profundidad:** permite una segunda lectura con detalle útil.
5. **Jerarquía:** una tesis domina; lo demás la demuestra.
6. **Precisión:** labels, escalas, cifras y límites son exactos.
7. **Atribución:** fuente y firma sobreviven sin convertir la pieza en anuncio.
8. **Thumbnail:** tesis, tipo y marca siguen reconocibles al tamaño del canal.
9. **Conversación:** contiene una observación lo bastante clara para citar, guardar o compartir.

La shareability debe declarar destino. `body-ready` no equivale a `social-ready`. Para cada destino registrar
ratio, safe area, tamaño mínimo de tipo, crop, preview y archivo/URL final. Los PNG de revisión generados por un
builder no son entregables sociales hasta tener lineage, persistencia y QA del canal.

## 6. Catálogo de composiciones semánticas

Elegir la forma por la relación, no por la lámina anterior.

| Relación | Arquetipo | Pregunta de control |
|---|---|---|
| progreso + frontera | paisaje/ejes | ¿Se ven a la vez avance y condición de gobierno? |
| capas compartidas | corte arquitectónico | ¿Se distingue interfaz de capacidad/source of truth? |
| varios estándares por frontera | mapa de ecosistema | ¿La proximidad significa algo y evita sugerir ranking? |
| pruebas + retorno | circuito de evaluación | ¿El feedback/recovery es parte del mecanismo? |
| avance en dos dimensiones | escala de dos ejes | ¿Una dimensión puede crecer sin la otra? |
| diagnóstico por dominios | ruta de inspección | ¿Cada fallo lleva a detener/degradar con seguridad? |
| delegación + registro | cadena de custodia/autoridad | ¿Se ve quién autoriza, ejecuta, confirma y prueba? |
| reutilización | árbol/sistema | ¿La ramificación expresa causalidad? |
| temas/actores conectados | red | ¿Cada enlace tiene semántica, no ornamento? |
| feedback repetido | ciclo/loop | ¿El retorno cambia el estado? |
| contraste | split/comparación | ¿La forma muestra el criterio decisivo? |
| evidencia cuantitativa | dataviz | ¿La escala y encoding son honestos? |

Dos piezas adyacentes no repiten arquetipo salvo necesidad argumental. El shell conserva la familia; el cuerpo
conserva la inteligencia del argumento.

## 7. Contrato source → delivery

### 7.1 Source SVG

Puede conservar texto vivo, capas, referencias internas y metadata de edición. Debe tener dimensiones,
`viewBox`, `<title>`, `<desc>`, nombres/versiones estables y assets oficiales. Nunca se publica por accidente.

### 7.2 Delivery SVG

Debe ser autónomo, portable y saneado:

- `width`, `height` y `viewBox` explícitos;
- sin script, event handlers, `foreignObject`, `javascript:`, `@import` o recursos remotos;
- sin IDs duplicados ni referencias rotas;
- sin fonts externas; texto contorneado cuando la fidelidad es crítica;
- sin clipping, overflow, colisiones o conectores sobre copy;
- sin filtros/gradientes salvo decisión deliberada y probada;
- brand assets confinados al footer para el perfil Efeonce;
- MIME `image/svg+xml`, URL pública estable y GET `200`.

El texto contorneado garantiza fidelidad visual, pero deja de ser texto HTML indexable o seleccionable. La
semántica accesible y SEO reside en el HTML: `alt`, caption, contexto y copy adyacente.

### 7.3 Raster

Se usa cuando el contenido es fotográfico/texturado, el canal lo exige, la política de seguridad bloquea SVG o
una comparación al tamaño real demuestra una ventaja. SVG no necesita export `@2x`; un vector ya escala con la
densidad. Para decidir peso comparar transferencia gzip/Brotli del SVG con raster optimizado al ancho real.

## 8. Responsive y tema

- Art direction crea composiciones distintas; no encoge el desktop.
- Un `<picture>` usa `<source media>` para tema/viewport y un único `<img src>` como fallback semántico.
- El fallback debe ser estable y representativo —normalmente desktop light—, no un placeholder.
- Para la familia Web Agéntica: desktop `1600×1080`, mobile `1200×1600`, breakpoint `860px`.
- Light/dark son masters deliberados. No invertir mediante CSS.
- Labels esenciales deben ser legibles en CSS pixels dentro de la columna real.
- ALT y caption son compartidos por concepto; no cambian por tema o viewport.

## 9. SEO, descubrimiento y accesibilidad

Google Search admite SVG y descubre imágenes desde `<img src>`, incluido el `<img>` fallback dentro de
`<picture>`. La decisión correcta no es “SVG sí/no”, sino si la integración completa es rastreable y semántica.

Contrato mínimo:

- URL indexable/crawlable, estable, descriptiva y con extensión coherente;
- GET `200`, `Content-Type: image/svg+xml`, dimensiones intrínsecas y sin bloqueo robots;
- un `<img src>` real; no usar sólo `background-image` CSS;
- `alt` útil, caption y texto cercano que expliquen la tesis;
- canonical/indexabilidad de la página y sitemap correctos;
- compresión y cache sin impedir actualizaciones versionadas;
- featured/OG raster verificado por compatibilidad de previews.

`<title>`/`<desc>` dentro del SVG ayudan sobre todo cuando se incrusta inline; no sustituyen el `alt` del
`<img>`. No prometer indexación: después de publicar se verifica rastreabilidad, sitemap y, cuando corresponda,
URL Inspection/GSC como observación asíncrona.

## 10. Flujo operativo

1. Congelar copy, claims y ubicación narrativa.
2. Completar el contrato con `conceptId`, delta, evidencia, límites y destinos.
3. Elegir arquetipo y probar wireframe monocromo.
4. Definir shell, footer, paleta y variantes.
5. Construir source y delivery separados.
6. Ejecutar auditor SVG y gates geométricos.
7. Revisar delivery al 100%.
8. Probar columna desktop, mobile, light, dark y thumbnail/canal declarado.
9. Completar alt, caption, filename, fuente, hashes y manifest.
10. Subir mediante Media Library gobernada y leer ID, URL, MIME, bytes y metadata.
11. Integrar con un solo `<picture>`/`<img>` accesible.
12. Verificar GET, headers, render, `naturalWidth`, selección de variantes y ausencia de overflow.
13. Mantener el post privado hasta aprobación humana.
14. Tras publicación, repetir QA live y separar rastreabilidad de indexación asíncrona.

## 11. Gates bloqueantes

| Gate | Bloquea si |
|---|---|
| editorial | no hay delta, tesis o límite explícito |
| composición | el arquetipo no representa la relación |
| premium | la densidad viene de decoración o cards repetidas |
| geometría | texto/formas salen del canvas, colisionan o invaden footer |
| marca | logo/dominio fuera del footer, asset redibujado o firma dominante |
| seguridad | contenido activo, referencia remota o MIME incorrecto |
| responsive | desktop encogido, texto microscópico o variante equivocada |
| tema | canvas decorativo o inversión automática |
| SEO/a11y | falta `<img src>`, alt, caption/contexto o URL crawlable |
| social | se llama shareable sin destino, crop, preview y archivo durable |
| provenance | faltan source, delivery, hashes, versión, Media ID/URL o estado |

## 12. Caso de calibración Web Agéntica v7

La v7 materializa siete composiciones, cada una con desktop/mobile × light/dark: `28` delivery SVG. Su builder
prueba overflow, colisión y marca fuera del footer antes de contornear tipografía. El auditor verificó `28/28`
sin texto vivo, gradientes ni filtros. WordPress conserva siete `<picture>` con `21` sources y un único fallback
por concepto. Los archivos públicos respondieron `200`, `image/svg+xml`, Brotli y cache anual.

Esto demuestra el método, no fija una plantilla. El caso completo vive en
`docs/public-site/WEB_AGENTICA_EDITORIAL_VISUAL_SYSTEM_V1.md` y
`docs/public-site/WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json`.

## 13. Definition of Done

Una infografía está **producida** cuando contrato, source, delivery, metadata, hashes y QA de archivo/contexto
están completos. Está **integrada** cuando Media Library y DOM tienen readback. Está **verificada** cuando la
superficie pública sirve el archivo correcto, su semántica HTML y sus variantes sin overflow. `body-ready`,
`featured-ready`, `OG-ready`, `social-ready` y `indexed` son estados distintos y no se heredan.

