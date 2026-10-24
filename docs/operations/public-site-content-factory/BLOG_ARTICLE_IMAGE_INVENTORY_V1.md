# Inventario de imágenes por artículo del blog

> **Tipo de documento:** Norma operativa (inventario y especificación)
> **Version:** 1.0
> **Creado:** 2026-10-24 por Claude, a pedido del operador («cuántas imágenes para todas las posiciones … y sus
> características por cada artículo que se haga»)
> **Alcance:** artículos de Marketing con Manzanitas en `efeoncepro.com/blog`. Glitch tiene sus propias piezas
> (§Fuera de alcance).
> **Medido en vivo:** 2026-10-24, en 390, 768, 1024, 1440 y 1920 px, con la portada del blog v3, las cards v2 del rail
> (`efeonce-editorial-blocks` 0.4.4) y el archivo v3. Si la portada o el rail cambian, vuelve a medir antes de producir.
> **Relacionado:** [Producir la portada de un artículo](../../manual-de-uso/creative/producir-portada-de-articulo-del-blog.md) ·
> [Operar la portada del blog por CLI](../../manual-de-uso/public-site/operar-portada-blog-por-cli.md) ·
> [Estilos editoriales](../../public-site/BLOG_EDITORIAL_BLOCK_STYLES_V1.md) ·
> [Infografías editoriales](../../manual-de-uso/public-site/producir-infografias-editoriales.md) ·
> [Norma de Manzanitas §5.6](../brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) ·
> [Modelo de key visual de portadas](EDITORIAL_COVER_KEY_VISUAL_OPERATING_MODEL_V1.md) (el método: tesis visual, contrato
> de recorte, versiones; este inventario fija las posiciones y medidas del blog de hoy)

## Resumen: cuántas imágenes lleva un artículo

| # | Imagen | ¿Cuándo? | Cuántas | La hace |
|---|---|---|---|---|
| 1 | **Plate** (foto 16:9 sin texto) | siempre | 1 | agente de foto (`design-studio` + `pnpm foto:*`) |
| 2 | **Portada** (destacada + OG + X) | siempre | 1 archivo | agente de composición (`efeonce-graphic-line`) desde el plate |
| 3 | **Imagen del slider** (`hero`) | sólo si el post entra al slider de `/blog/` | 0 o 1 | se recorta del plate (sin foto nueva) |
| 4 | **Imagen de la card del rail** | todavía **no existe la posición**: pendiente de TASK-2051 | 0 hoy | — |
| 5 | **Imágenes del cuerpo** (diagramas, infografías, capturas) | sólo si explican algo que el texto no puede | 0 a N (lo normal: 0 a 2) | agente de contenido (`content-marketing-studio` + infografías) |
| 6 | Foto del autor | ya existe; no se hace por artículo | 0 | — |
| 7 | **Piezas de distribución** (LinkedIn, YouTube, story) | según el plan de canales de esa semana, no por defecto | 0 a 4 | agente social (`social-media-studio`), con su propia norma |

**Mínimo por artículo: 2 archivos** (el plate y la portada) y **1 subida** (la portada). Con slider: 3 archivos y 2
subidas. Todo lo demás depende del contenido o del plan de canales.

Siempre aprueba el operador antes de subir, y el agente que sube avisa antes a las sesiones del blog que estén
trabajando.

## 1. Plate: la foto sin texto

Es la materia prima: de ella salen la portada y, si hace falta, la imagen del slider. No se publica sola.

| Característica | Valor |
|---|---|
| Formato | 16:9, **2560 × 1440**, PNG |
| Cómo | ficha cine (`"registro": "cine"`, `"alcance": "manzanitas"`, la `linea` del tema) → `cine-reviewer` → `pnpm foto:generar <ficha> --quality high --size 2560x1440` → `pnpm foto:validar:cine` y `pnpm foto:validar` → `pnpm foto:emblema` al 100 % |
| Costo | unos USD 0,055 por toma (gpt-image-2.5-sunburst, octubre de 2026) |
| Persona | del **elenco ficticio**, con la prenda de su línea y la marca bordada; nunca Julio ni el equipo real en estas fotos |
| Encuadre | **cara entre el 65 % y el 75 % del ancho** (x 795–900 sobre 1200), en el tercio de arriba. Se pide en torno al 85 %, porque el modelo la corre unos 15 puntos al centro. El 64 % izquierdo en oscuridad calma, sin luces ni objetos. El lecho (mesa o suelo en sombra) abajo, a lo ancho |
| Texto | **ninguno**: ni letras, ni logos de otras marcas, ni carteles legibles |
| Dónde queda | `ai-generations/<fecha>_<tema>/plates/`; no va a git (`pnpm ai-gen:archive` cuando el operador lo decida) |

## 2. Portada: destacada, Open Graph y X

Un solo archivo cubre la imagen destacada de WordPress, la imagen social de Yoast (Open Graph), la tarjeta de X (usa la
OG cuando el post no tiene una propia) y la imagen principal del schema (`primaryImageOfPage`).

| Característica | Valor |
|---|---|
| Lienzo | 1200 × 630 (1,9:1); **se entrega al doble: 2400 × 1260** |
| Archivo | JPEG calidad 88 con croma 4:4:4 (de 230 a 300 KB en el caso fuente); nombre descriptivo en kebab-case |
| Composición | variante centrada de Manzanitas: cabecera, pregunta y respuesta en x 312–782 · y 50–341; sin bajada, sin firma y sin eslogan |
| Cómo | `ESCALA=2 FIRMA=0 node composicion/componer-centrada.cjs <plate> <linea> "<pregunta>" "<respuesta>" <salida>` y JPEG con `sharp` |
| Metadatos | `alt` que describe la escena y repite el texto de la portada · título del adjunto · sha256 del archivo |
| Subida | `scripts/public-website/blog-post-cover-apply.php`: simulación → `apply` con guardas y respaldo |
| Indexación | el post sale con `max-image-preview:large`: la portada puede salir grande en Google y Discover (pide ≥ 1200 px de ancho; cumple) |

**Dónde se ve y qué recorta** (sobre el lienzo de 1200 × 630):

| Superficie | Qué se ve | Resultado con la portada centrada |
|---|---|---|
| LinkedIn y Facebook (OG) | la imagen completa | ✓ |
| Vista previa compacta de WhatsApp | el cuadrado central, x 285–915 | ✓ texto y cara |
| Tarjeta grande de X | 2:1; puede cortar unos 15 px arriba y abajo (fuente secundaria, sin medir) | ✓ |
| Miniatura «Siguiente» del slider | 96 × 64 (1,5:1), centrada: x 127–1072 | ✓ |
| Archivo del blog v3 (temas, etiquetas, autores, búsqueda) | lista de texto, **sin imagen** | no aplica |
| Cabecera del artículo | Ohio **no muestra** la destacada | no aplica |
| Cards v2 del rail | 440 × 600 y 361 × 492 → x 369–831; 304 × 540 en móvil → x 423–777, con el texto de la tarjeta encima | ✗ **choca**: ver §4 |
| Slider sin `hero` | la destacada a sangre, anclada a la derecha, con el título del slider encima | ✗ **choca**: ver §3 |

Google recomienda dar al schema del artículo varias proporciones (16:9, 4:3 y 1:1). Yoast publica una sola y no es
requisito: no se producen versiones extra.

## 3. Imagen del slider (`hero`)

**Cuándo:** sólo si el post entra al slider de `/blog/` (fijado con `pin` o por ser de los más recientes con imagen;
`pnpm public-website:blog-home slider` muestra el motivo). Sin `hero`, el slider usa la portada con un velo, y su
título cae encima del texto de la portada: **un post con portada de Manzanitas que entra al slider necesita su `hero`**.

| Característica | Valor |
|---|---|
| Formato | **2:1**. Entrega 2400 × 1200 (la que está en vivo mide 1774 × 887); WebP |
| De dónde sale | **se recorta del plate**, sin foto nueva: de 2560 × 1440 a 2560 × 1280, quitando arriba |
| Texto | **ninguno**: el slider pone su propio título (dos líneas, `--light` y `--bold`) |
| Encuadre | el título ocupa la izquierda: x 80–800 en 1440 (x 320–1040 en 1920), y el slider ancla la foto a la derecha. En el teléfono se ve el 61 % central de la imagen. Por eso el **sujeto va entre el 55 % y el 80 % del ancho**, y la mitad izquierda queda oscura y calma |
| Medidas del slider | 1440 × 900 y 1920 × 900 en escritorio, con `object-fit: cover`, `object-position: 100% 50%` y un 10 % de margen por el parallax; en 390, la imagen a 636 × 318, centrada |
| Subida | `pnpm public-website:blog-home hero <post> --image <archivo.webp> --alt "…" --apply` (el velo desaparece) |

Con la cara del plate en x 795–900 (66–75 %), el recorte del plate cumple sin recomponer.

## 4. Imagen de la card del rail (pendiente)

Las cards v2 de «Para leer con calma» usan hoy la **destacada** como foto a sangre vertical y le pintan encima la
etiqueta de formato, el título, la bajada y el autor. Con la portada de Manzanitas, el recorte corta la cabecera, deja
fuera la cara y superpone dos textos. Hoy no afecta a ningún post (los tres del caso fuente no están entre las cuatro
lecturas más nuevas).

**Encargado el 2026-10-24** a la sesión dueña del rail (TASK-2051): una imagen propia de la card por post, un punto
focal (`pos` → `object-position`), o las dos cosas. Hasta que exista, **no se produce ninguna imagen para esta
posición**; cuando exista, saldrá del plate:

| Característica | Valor esperado (confirmar cuando la posición exista) |
|---|---|
| Lo que se ve | x 369–831 en escritorio y tablet; x 423–777 en el teléfono (sobre 1200 × 630) |
| Texto | ninguno: la tarjeta pone el suyo |
| Encuadre | la cara dentro de x 423–777 y en la mitad de arriba (y < 340); nada importante en los ~80 px de las esquinas de arriba (etiqueta y botón); la mitad de abajo pareja y oscura (el degradado y el título la tapan) |
| Choque con el plate | la cara del plate cae en x 795–900, fuera de la franja: sin un punto focal hacia la derecha, la card necesita un recorte propio del plate |

## 5. Imágenes del cuerpo

Sólo si explican lo que el texto no puede: un diagrama, una infografía con datos, una captura de la herramienta. Nunca
para decorar. En el caso fuente: dos en inbound, una en paid media y ninguna en topic clusters.

| Característica | Valor |
|---|---|
| Infografía o diagrama | **SVG directo** (fuente editable aparte del SVG saneado de entrega), sin `@2x`; variantes de escritorio, móvil, claro y oscuro sólo cuando la composición cambia de verdad (`<picture>`). Proceso: [producir infografías editoriales](../../manual-de-uso/public-site/producir-infografias-editoriales.md) y `pnpm content:editorial-svg:audit` |
| Foto o captura | raster real de la biblioteca de medios (nunca inventar IDs o URLs), ancho ≥ la columna del artículo |
| Alineación | `{ "kind": "image", "align": "center" }` si es más angosta que la columna o cuadrada |
| Texto alternativo | `alt` corto y específico; caption con la fuente si es evidencia; descripción larga cerca cuando la infografía es compleja; `alt=""` sólo si es decorativa |
| Marca | color sólo de los tokens de la línea gráfica; el acento es el de la línea del tema |
| Subida | con la spec del artículo (Content Factory); el cuerpo se reemplaza con `blog-post-content-republish.php` |

## 6. Piezas de distribución (fuera del sitio)

No son del artículo: son de cada canal y salen sólo si el plan de canales de la semana las pide. Cada una tiene su
norma y sus medidas. Este inventario no las reemplaza.

| Pieza | Cuándo | Medidas y norma |
|---|---|---|
| Post de LinkedIn con el enlace | si el artículo se empuja en LinkedIn (página de Efeonce o Julio) | 1200 × 627, nativa, nunca recortada de un 16:9 (`efeonce-graphic-line` → `applications.md` §A5). Todavía **sin camino fotográfico canónico** |
| Edición del newsletter Marketing con Manzanitas (LinkedIn de Julio) | quincenal, no por artículo; enlaza al artículo | **sin pieza en el registro**: no se improvisa, se le pide al operador ([estrategia §8.2](../../strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md)) |
| Miniaturas de YouTube | si el artículo acompaña un tutorial | **dos** miniaturas Escena 16:9 (1280 × 720) para la prueba A/B, logo abajo a la izquierda, sin eslogan; cierre de YouTube aparte (norma de Manzanitas §5.7) |
| Story de Instagram | máximo una por semana, como generosidad | 1080 × 1920, zona segura del 87 %, enlace al blog o a Glitch (norma §5.6) |

## Quién hace qué

| Paso | Agente o persona | Skill o herramienta |
|---|---|---|
| Ficha y plate | agente de foto | `design-studio`, `cine-reviewer`, `pnpm foto:*` |
| Portada y recorte del `hero` | agente de composición | `efeonce-graphic-line` (Manzanitas §4.5), `componer-centrada.cjs` |
| Imágenes del cuerpo | agente de contenido | `content-marketing-studio`, infografías editoriales, Content Factory |
| Aprobación | **el operador**, viendo la portada junto a sus recortes | — |
| Subida, `hero` y QA en vivo | agente del sitio público, coordinado con las sesiones del blog | `efeonce-public-site-wordpress`, `blog-post-cover-apply.php`, `blog-home hero`, `blog-home verify --browser` |
| Piezas de distribución | agente social | `social-media-studio`, con la norma del canal |

## Fuera de alcance

- **Glitch** (ediciones y Flash): banners 16:9 y 1:1, banner de noticia con crédito y sus piezas propias
  (`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` §6).
- **Recursos de la portada** (guías, herramientas, diagnóstico) y **eventos**: tienen su propia imagen, que se carga
  con `blog-home resource` o `blog-home event` ([manual](../../manual-de-uso/public-site/operar-portada-blog-por-cli.md)).
