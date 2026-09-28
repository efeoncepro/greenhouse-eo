# Glitch Flash · Claude Sonnet 5.5 — primer Glitch con la nueva línea — 2026-09-28

> **Hito:** es el **primer Glitch producido y lanzado con la nueva línea gráfica** (sub-línea Glitch de
> `efeonce-graphic-line`), coherente de punta a punta: canvas → 4 redes → blog. También es el **primer Glitch Flash**:
> el formato que sale ante una noticia puntual, fuera de la edición semanal.

## Estado

Programado en Metricool el 28-sep-2026 (hora Chile, `America/Santiago`) y publicado en el blog el mismo día. Las
horas son de ese día; la publicación efectiva en cada red se confirma con un readback posterior a la hora
(`providers[].status = PUBLISHED` + `publicUrl`).

| Hora | Red | Marca (`blogId`) | Post Metricool | Qué sale |
| --- | --- | --- | --- | --- |
| 16:15 | LinkedIn página Efeonce | `3961547` | `383721808` | documento «Glitch Flash · Claude Sonnet 5.5»; primer comentario con el enlace de suscripción |
| 16:20 | Instagram `efeoncepro` | `3961547` | `383721396` (antes `383719049`) | carrusel de 3 PNG (portada, noticia, contraportada) con alt text por lámina |
| 16:25 | Threads `efeoncecl` | `3961547` | `383721858` | la portada sola, sin «Desliza» |
| 16:30 | LinkedIn personal Julio Reyes | `5105024` | `383721893` | documento con mención `@[urn:li:organization:20503593\|Efeonce]` |

Blog: post **251941**, publicado ~16:16 →
[`efeoncepro.com/glitch/glitch-flash-claude-sonnet-5-5/`](https://efeoncepro.com/glitch/glitch-flash-claude-sonnet-5-5/).

Media: `gs://efeonce-group-greenhouse-public-media-prod/campaigns/glitch-flash-sonnet-55-2026-09-28/` (PNG).
Canvas de diseño (artifact «Design», 6 láminas): <https://claude.ai/artifact/KjHuJNQXkH4vLA7pumUiaz>.

## Decisiones del operador (2026-09-28)

1. **Glitch tiene dos formatos.** La **edición semanal** sale los lunes, se numera «Edición #N» y trae el Top 8. El
   **Glitch Flash** se dispara ante una noticia puntual; no es la edición entera y **no lleva número**. La imagen
   puede decir «flash».
2. **Más personalidad al Flash.** Pedido sobre la primera versión; el resultado se aprobó y es el que se publicó.
3. **El gesto del narrador (Guttery) en la contraportada varía por edición** para sonar conversacional; no es una
   frase fija.
4. **Chip de portada:** «PORTADA» servía para la prueba; en producción va «LA NOTICIA».
5. **LinkedIn personal = thought leadership.** Julio pidió más naturalidad: primera persona, opinión propia, la
   noticia como pretexto, sin lista de specs. La página usa la voz del narrador de Glitch. Regla registrada en
   `social-media-studio/efeonce/EFEONCE_OVERLAY.md`.
6. **El operador revisa los copys antes de programar.** Ningún post se creó sin esa revisión.
7. **Imágenes de Anthropic publicadas con crédito y sin licencia** (decisión del operador; ver Pendientes).

## Método de punta a punta

### 1. Investigar la noticia

Lectura de las fuentes primarias del lanzamiento (anuncio, tabla de resultados, casos de empresas, notas de
seguridad) para escribir con cifras verificadas. Del mismo dossier salen el copy de las redes y el artículo del blog;
así los tres dicen lo mismo.

### 2. Componer desde las plantillas aprobadas

No se dibujó desde cero. El Flash parte de las plantillas aprobadas de la edición (portada A, interior de la noticia
1, contraportada, banner A del blog y banner interno 1600×900), con los valores del token `glitchLine`
(`glitch-tokens.css` generado) y los archivos de `AXIS_GLITCH_ASSETS` (`@efeoncepro/axis-brand-assets`). Cambios del
Flash frente a la edición:

| Elemento | Edición semanal | Glitch Flash |
| --- | --- | --- |
| Cabecera derecha | «EDICIÓN» sobre «#N» | «NO ESPERA AL LUNES» sobre estela de bytes + «FLASH» (mismo tamaño que el número) |
| Estela de bytes | — | celdas cuadradas en el acento, 13 × 5, densidad y opacidad que crecen hacia la palabra; a la izquierda de «FLASH». Sin cursiva ni skew; cuadrados, no círculos (una sola esfera por pieza: la manzana) |
| Cabecera compacta del interior | «EDICIÓN #N» | «NO ESPERA AL LUNES» + estela + «FLASH» |
| Chip de portada | «PORTADA» | «LA NOTICIA» (portada, Threads y banner del blog) |
| Chip del interior | «NOTICIA n» | «ANUNCIO» (+ medio · fecha) |
| Avance n/8 | 8 segmentos + «n / 8» | se quita; queda «DESLIZA» + mano Plastilina |
| Muletilla de contraportada | «el #N+1 sale el lunes.» | «léelo completo / en nuestro blog.» en dos líneas |
| Nota de suscripción | igual en ambos: invita al semanal | igual |
| Firma | logo Efeonce centrado abajo | igual |

### 3. Foto oficial capturada del canvas de Anthropic

La portada de la página de Anthropic no es una imagen ni un video descargable: es una animación dibujada en canvas.
Se capturó limpia con Playwright a 3840×2160 ocultando el overlay, se recortó cerca del horizonte y se **levantó la
exposición** antes del duotono y la fractura de bytes (funciones canónicas de `src/lib/glitch-composition/`). Sin ese
paso la escena oscura se fundía con el fondo navy y la falla no se veía. Interior y banner de noticia usan fotogramas
del video de lanzamiento.

### 4. Copys por red

Un copy por red, no el mismo texto pegado cuatro veces: la página habla con la voz del narrador de Glitch; Instagram
acompaña el carrusel; Threads sale con la portada sola; el LinkedIn de Julio es su opinión en primera persona. El
operador los revisó y ajustó antes de programar; el LinkedIn personal pasó por una ronda de naturalidad.

### 5. Programar en Metricool

Receta completa en `social-media-studio/references/video-delivery-metricool.md` §«una pieza en cuatro redes». Puntos
de esta corrida:

- PNG en el bucket público, con nombres nuevos (`v2-…`) al reemplazar media, por caché.
- El post de Instagram que ya estaba programado para las 20:00 con una imagen vieja **se actualizó en su lugar** con
  `updateScheduledPost` (el ID pasó de `383719049` a `383721396`; el UUID se conserva). No se duplicó.
- Readback de orden por firma de imagen (miniatura reducida en gris contra los PNG locales): **10 de 10** correctas.
- El clasificador de permisos de la sesión bloqueó el primer `createScheduledPost` («External System Writes») y
  pasó después de la instrucción explícita del operador.

### 6. Blog

Post 251941, autor Julio Reyes, categoría Glitch (también primaria de Yoast), creado privado con el Content Factory
(`pnpm public-website:content-factory:run --spec … --send --author-id 1`) y publicado tras la QA. Imagen destacada:
el banner 16:9 del canvas (attachment 251943, con crédito «Imagen: Anthropic»); el banner 1600×900 abre la sección
«Qué anunció Anthropic» (attachment 251945). Nueve H2, apertura «El micrófono se abre… en modo Flash» y cierre «El
micrófono se cierra. — El equipo editorial de Glitch» + suscripción.

El callout **Glitch Drop** (`efeoncepro/glitch-drop`) no existe como `kind` del spec del Content Factory: se insertó
reemplazando un párrafo marcador con `parse_blocks` / `serialize_blocks` en un eval gobernado, como bloque dinámico
con el texto en su atributo. Snapshots de cada cambio, purga de caché y QA en vivo (HTTP 200, canonical,
`index, follow`, og:image, TOC de 9 enlaces, desktop 1280 y móvil 390 sin overflow). El detalle operativo del blog
pertenece a `efeonce-public-site-wordpress`.

## Errores encontrados y cómo se corrigieron

| Error | Dónde se vio | Corrección |
| --- | --- | --- |
| Chip «PORTADA» de prueba en una pieza ya programada | post de Instagram programado a las 20:00 | se cambió a «LA NOTICIA», se subió el PNG como `v2-…` y se actualizó el mismo post con `updateScheduledPost` en vez de crear otro |
| «el resto, el lunes» en la contraportada | revisión del operador | rechazada por no sonar natural; queda «léelo completo / en nuestro blog.» en dos líneas |
| El párrafo tras el Glitch Drop repetía la frase del drop | QA en vivo del blog | se reescribió el párrafo; snapshot previo guardado |
| Escena de la foto invisible sobre el navy | composición de la portada | exposición levantada antes del duotono |

## Pendientes y discrepancias (no resueltas)

1. **Licencia de las imágenes de Anthropic.** Se publicaron con crédito y sin licencia por decisión del operador. Si
   la pieza pasa a pauta o a reutilización, revisar derechos con `legal-privacy-ip-operator`.
2. **Numeración #17.** `efeonce-graphic-line/references/glitch.md` dice que la próxima edición es la **#17**
   (decisión del 2026-09-27), pero el blog ya tiene «Glitch #16» (2026-07-21) y «Glitch #17» (2026-07-28, post
   251605). Pregunta abierta para el operador; no se tocó ninguno de los dos lados.
3. **El Flash no es canon todavía.** No tiene plantilla en el Artifact Composer (`glitch-carousel` / `glitch-stills`)
   ni pieza en `glitchLine` de AXIS; la estela de bytes es un SVG autorado en la sesión, no un token. El próximo
   Flash debe partir de este canvas o convertirlo en plantilla.
4. **Content Factory desactualizado frente a los bloques del sitio.** El artículo sólo usó párrafo, lista, tabla,
   imagen y el TOC de Yoast; el Glitch Drop tuvo que inyectarse aparte. Lo señaló el operador.
5. Confirmar `PUBLISHED` + `publicUrl` en las cuatro redes después de las 16:30.
