# Home «La órbita» — rediseño, SEO/OG y retiro de páginas (2026-10-29)

> **Tipo de documento:** Audit / evidencia de rollout
> **Version:** 1.0
> **Creado:** 2026-10-29 por Claude
> **Contrato técnico:** [HOME_INICIO_ELEMENTOR_MODULES_V1.md](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md)
> **Funcional:** [home-efeonce-la-orbita.md](../../documentation/public-site/home-efeonce-la-orbita.md) ·
> **Manual:** [operar-home-efeonce.md](../../manual-de-uso/public-site/operar-home-efeonce.md)

**Publicado y verificado el 2026-10-29.** El cuerpo de `https://efeoncepro.com/` (página `251731`, `page_on_front`)
se reemplazó en el lugar por la landing compilada `inicio` (doce widgets `greenhouse_inicio_*`) desde el canvas
aprobado «Home Efeonce en órbita». Después se corrigieron SEO y social, y se retiraron las homes antiguas y las demos
del tema Ohio.

## Diseño y decisiones del operador

Canvas: `https://claude.ai/artifact/CuJ5wNPXrfYBXV9wFMevNq` (`Main.dc.html`, tipo Design). Decisiones registradas en
los hilos de comentarios:

| Tema | Decisión |
| --- | --- |
| Agentes | La primera versión (escenario oscuro, ciclo, familias) fue rechazada. Entre tres direcciones se eligió «Constelación de Sparks» y se aprobó. Fondo blanco. Excepción aprobada: la constelación mezcla los colores de las cinco líneas. |
| AEO | Se pidió algo «muchísimo más power»; entre tres direcciones se eligió «Pregunta en vivo». Marcado como ejemplo ilustrativo. |
| Testimonios | Reseñas textuales de Constanza Rojas y Adriana Contreras (Team SKY) desde experiencia.efeoncepro.com; rotan cada 8 s; encuadre de prueba de relación. |
| Cierre de marca | Quitado (logo en órbita + «Empower your Growth» + «Desde Santiago, operando en…»). |
| Header y footer | Los canónicos del sitio; el menú dibujado del canvas no se portó. |
| Cifra | «+90 marcas» (no +120). |
| Agentes en la home | Se publica aunque la oferta humano-agente estaba sólo para validación. |
| Corte | Reemplazo directo tras QA. |

## Rollout del cuerpo

| Dato | Valor |
| --- | --- |
| Momento | 2026-10-29 01:25 UTC |
| Snapshot | `_gh_home_orbita_before_20261029_012508` |
| Hash `_elementor_data` | `9aa8c770…` → `c148f3df…` |
| Backups de deploy | Kinsta `/tmp/eo-inicio-widgets-before-20261029-012032.tar` … `-092003.tar` |
| Conservado | slug, título SEO, canónico, indexación, metas Ohio, dock compartido (`manifests/landing-dock/home.json`) |
| Preview de QA | `252177`, creada y luego enviada a la papelera |
| Gates | `verify-source-led-compilers.cjs` y `verify-source-led-render.php` incluyen `inicio`; las otras seis landings del núcleo quedaron idénticas byte a byte y en render |
| Pre-live local | render de todos los módulos con stubs (`tmp/inicio-local/render.php`), servido estático y revisado en navegador |

Verificación en vivo a 1440, 1280 y 390 px: desborde 0, sin imágenes rotas, sin errores de consola, el diálogo del
agendador abre (sin agendar), canónico, robots, título y descripción intactos.

Hallazgos de QA corregidos antes y durante el rollout: reset `border-box` del canvas; rieles desde 1181 px
(`--gh-rail`) para los widgets laterales de Ohio; medir con `getBoundingClientRect().top + scrollY` porque
`offsetTop` es relativo al contenedor de Elementor; en móvil, espacio para el rótulo de la lente, AEO como sección
normal, Sparks de media altura ocultos (`gh-mid`) y tarjetas del motor a las cuatro esquinas; palabras del hero
movidas del `<h1>` a `<template>`. Aceptado: un layout por fila en repetidores con estilos inline (Sparks 18,
partners 9).

## Auditoría SEO y social (2026-10-29 09:21 UTC)

### Antes

| Aspecto | Estado |
| --- | --- |
| Título | «Efeonce \| Agencia de marketing digital y tecnología» |
| Canónico / robots | `/`, `index, follow`; robots.txt sin bloqueos; sitemap con lastmod nuevo |
| Schema | un grafo Yoast (WebPage, ImageObject, BreadcrumbList, WebSite, Organization) |
| Estructura | un solo `<h1>`, 0 imágenes sin alt, 22 enlaces 200 e indexables, CLS 0 |
| Imagen OG / destacada | `248149`, arte 2025, WebP 2000×960 (2,08:1), sin alt |
| Peso de carga | 9 MB, de los cuales 6,2 MB eran los 5 videos de trabajos (se descargaban al cargar, también en móvil) |

### Después

Script `scripts/public-website/configure-inicio-seo.php`; snapshot opción `_gh_home_orbita_seo_before_20261029_092107`.

| Aspecto | Estado |
| --- | --- |
| Imagen OG / Twitter / destacada | `252184` `efeonce-home-que-necesita-tu-marketing-og.png`, PNG 1200×630, composición centrada, con alt; reflejada en `_elementor_page_settings.post_featured_image`. `248149` sigue en la biblioteca |
| Meta description | «Un solo equipo de marketing y tecnología: estrategia, creatividad, web, SEO y AEO, medios y CRM. Con agentes de IA y tu operación a la vista en Greenhouse.» |
| OG/Twitter title | «¿Qué necesita tu marketing? \| Efeonce» |
| OG/Twitter description | «Crecer, destacar, aparecer, rendir y vender: cinco especialidades de marketing y tecnología en un solo equipo, con tu operación a la vista en Greenhouse.» |
| Título SEO | sin cambios |
| Videos | `preload="none"` y reproducción sólo en pantalla: 0 MB de video al cargar |
| Enlaces | internos de las líneas en la misma pestaña; externos en pestaña nueva |
| Hero | primer retrato `fetchpriority="high"`, el resto `low` |

### No medido

- PageSpeed / Lighthouse: la cuota pública de PSI estaba agotada el 2026-10-29 y no se pudo descargar Lighthouse.
- Core Web Vitals de campo.

## Páginas retiradas

Por pedido del operador, el 2026-10-29. Todas a la papelera (reversible, nunca borrado permanente).

| Página | Id | Destino | Script |
| --- | --- | --- | --- |
| `/home-2-2/` «Home 2» (indexable y en el sitemap, competía con la portada) | `248852` | 301 → `/` | `retire-home-2-2.php` |
| `/home-2/` (home anterior, respaldo noindex) | `2791` | 301 → `/` | `retire-old-homes.php` |
| `/home/` | `242261` | 301 → `/` | `retire-old-homes.php` |
| `/home-prueba/` | `246396` | 301 → `/` | `retire-old-homes.php` |
| Borradores | `248857`, `250260` | papelera | `retire-old-homes.php` |
| Preview de QA | `252177` | papelera | `retire-old-homes.php` |
| `/homedemo1-elementor/` | `21460` | 301 → `/` | `retire-ohio-demos.php` |
| `/homedemo8-elementor/` | `21466` | 301 → `/` | `retire-ohio-demos.php` |
| `/homedemo17-elementor/` | `20305` | 301 → `/` | `retire-ohio-demos.php` |
| `/homedemo27-elementor/` | `18734` | 301 → `/` | `retire-ohio-demos.php` |
| `/homedemo35-elementor/` (fuente del Demo 35, histórica desde el blog v3 del 2026-10-24) | `225984` | 301 → `/` | `retire-ohio-demos.php` |

No tocados: borradores de demos `21404` «Coming Soon» y `243726` «Demo 10»; copia de trabajo `251875`
`/demo35-blog-magazine-copia-trabajo/` (publicada, `noindex`).

Verificado: las variantes con y sin barra final y con UTM redirigen; el sitemap ya no lista esas URL; la portada y
`/blog/` responden 200.

Lección: `scripts/public-website/create-yoast-redirect.php` no acepta la portada como destino (normaliza `/` a `//` y
exige un post publicado en el destino). Para retirar páginas hacia `/` se usan los scripts `retire-*`: redirección
Yoast `WPSEO_Redirect('origen', '/', 301, 'plain')` + `wp_trash_post`, con corrida en seco y guardas de id, título,
estado y menú. Rollback: `wp_untrash_post( <id> )`, restaurar su estado y borrar la redirección del origen.

## Pasada móvil y tablet (2026-10-29, tarde)

Pedido del operador: «la experiencia debe ser igual de espectacular o mejor en mobile que en desktop». Tres subagentes
auditaron el sitio en vivo a 320/360/390/430/768/1024 px (ritmo y tipografía; escenas interactivas; touch y
accesibilidad). Hallazgos principales y su corrección:

- Escenas que en teléfono se resolvían fuera de pantalla (motor, método) o no avanzaban (AEO): ahora se resuelven con la
  etapa en pantalla y AEO vuelve a avanzar con el scroll.
- Interacciones que dependían del hover (Sparks, abanico de partners, pausa de citas, lente del hero): equivalentes
  táctiles (tocar, deslizar, recorrido guiado, reparto al llegar).
- Cortes de texto y objetivos táctiles chicos (pills, pestañas, segmentos, KPI): 44 px mínimo y texto que envuelve.
- Accesibilidad: elegir una cita detiene la rotación; leyenda de Sparks y copia del correo con `aria-live`; correo como
  `mailto:`; estaciones del método operables con teclado.
- El dock compartido no tenía inicio/parada en la home y tapaba el selector de tema de Ohio.

Verificación local (render con stubs, servidor estático): 320, 390, 768 y 1024 px sin desborde horizontal ni errores
de consola; escenas revisadas sección por sección. Encontrado y corregido en esa revisión: pista de Sparks partida en
dos columnas, estaciones del método con alineación mixta (especificidad del canvas) y contador KPI que arrancaba en
negativo. Paquete acotado: 190 archivos, 7 cambiados (5 de `includes/inicio/`, CSS y JS), sha
`82a18c49…`. La página no tiene textos `fNNN_` guardados (verificado en vivo), así que la renumeración de claves de los
schemas `agenda` y `agentes` no altera contenido. Despliegue autorizado por el operador («Vamos») y aplicado a las 12:17 UTC (`scoped_package_installed`, backup
`/tmp/eo-inicio-widgets-before-20261029-121754.tar`). Verificación en vivo, emulación de teléfono de 375 px: JS y CSS
nuevos servidos; desborde 0; dock oculto en el hero, visible a mitad de página (con el selector de tema subido 76 px) y
oculto de nuevo en la agenda; AEO avanza con el scroll; la pista dice «Toca un Spark.». A 1440 px: desborde 0, sin
errores de consola, un `<h1>`, canónico `/` e `index, follow` intactos. Las 8 «imágenes sin cargar» que aparecen al
medir son fotos diferidas del menú global (cargan al abrirlo), no de la home. Nota de método: con el panel del
navegador oculto, `requestAnimationFrame` no corre y el dock parece no mostrarse; hay que hacer scroll real o forzar un
render con una captura.

## Commits

- Greenhouse `develop` (locales, sin push): `5532e6371` (home en vivo), `e023f811f` (OG + videos preparados),
  `7fcdcaa8b` (SEO publicado + `/home-2-2/`), `5990e8a43` (homes antiguas), `0a096881c` (demos Ohio).
- Runtime: `29bf792` (landing `inicio`) pusheado a `main`; `af1a785` (videos diferidos, enlaces, prioridad) sin push.

## Backlog global

No es del cuerpo de la home:

- La descripción del `WebSite` en el schema es el tagline «Agencia de marketing 360°».
- Yoast no tiene cuenta de X (`twitter_site`).
- Slider Revolution `sr7.js` (100 KB) y Font Awesome brands (116 KB) cargan en la home sin uso.
- Al compartir, refrescar las cachés de LinkedIn Post Inspector y Facebook Sharing Debugger.

## Pendientes

- Probar la pasada móvil en un teléfono real (toques, deslizamientos, recorrido de Sparks).
- El selector de tema de Ohio queda sobre la esquina del botón «Agenda tu diagnóstico» en la agenda (posición por
  defecto del tema, previa a esta pasada).
- Medir PageSpeed / Lighthouse y CWV de campo cuando haya cuota.
- Prueba de guardar y recargar desde el editor de Elementor (no registrada en este rollout).
- Push de `af1a785` al runtime y de los commits de `develop`.
