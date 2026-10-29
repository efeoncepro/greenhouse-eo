# Home Inicio Elementor Modules V1

> **Tipo de documento:** Contrato técnico (public site)
> **Version:** 1.1
> **Creado:** 2026-10-29 por Claude (rediseño de la home «La órbita × Pingback»)
> **Ultima actualizacion:** 2026-10-29 por Claude
> **Documentacion funcional:** [home-efeonce-la-orbita.md](../../documentation/public-site/home-efeonce-la-orbita.md)
> **Manual:** [operar-home-efeonce.md](../../manual-de-uso/public-site/operar-home-efeonce.md)
> **Audit del rollout y SEO:** [2026-10-29-home-orbita-rediseno-y-seo.md](../../audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md)
> **Supersede como home a:** [AGENCY_ELEMENTOR_MODULES_V1.md](AGENCY_ELEMENTOR_MODULES_V1.md)

## Identidad y estado vigente

`https://efeoncepro.com/` es la página WordPress `251731` (`page_on_front`, slug interno
`home-claude-design-preview`). El 2026-10-29 01:25 UTC su cuerpo se reemplazó en el lugar por la landing
compilada `inicio`: doce widgets nativos de Elementor generados desde el canvas aprobado «Home Efeonce en órbita»
(Claude Design, `https://claude.ai/artifact/CuJ5wNPXrfYBXV9wFMevNq`, archivo `Main.dc.html`). Es la novena landing
compilada desde canvas sobre el núcleo source-led compartido.

Se conservaron slug, título SEO, canónico, indexación, metas Ohio y el dock compartido
(`manifests/landing-dock/home.json` del runtime). La navegación global del sitio y el footer Ohio enmarcan la página:
el menú dibujado en el canvas **no** se portó (decisión del operador: header y footer son los canónicos del sitio).

| Dato | Valor |
| --- | --- |
| Página | `251731`, `publish`, `index, follow`, canónico `/` |
| Hash `_elementor_data` antes | `9aa8c770…` (el prefijo coincide con el último checkpoint del contrato Agency) |
| Hash `_elementor_data` después | `c148f3df…` |
| Snapshot del cuerpo | `_gh_home_orbita_before_20261029_012508` (post meta de `251731`: Elementor data/settings, featured image, metas Ohio `page_*` y Yoast) |
| Snapshot SEO/social | opción `_gh_home_orbita_seo_before_20261029_092107` |
| Backups de deploy | Kinsta `/tmp/eo-inicio-widgets-before-20261029-012032.tar` … `-092003.tar` |
| Commits Greenhouse (`develop`, locales) | `5532e6371` (home en vivo), `e023f811f` (OG + videos preparados), `7fcdcaa8b` (SEO publicado + `/home-2-2/`), `5990e8a43` (homes antiguas), `0a096881c` (demos Ohio) |
| Commits runtime | `29bf792` (landing `inicio`) pusheado a `main`; `af1a785` (videos diferidos, enlaces, prioridad) **sin push** |
| Release | contrato `inicio-elementor-release.v1` |

**Límite de versionado:** el runtime vivo incluye `af1a785`, que no está en `main` del repo runtime. Antes de otro
release del plugin, exportar el baseline vivo; no reconstruir desde `main`.

## Alcance y decisión

Mismo carril de [primitives públicas](PRIMITIVES.md) que las otras landings compiladas: un widget semántico por
sección dentro de `eo-elementor-widgets`, sobre la base compartida `EO_Source_Led_Landing_Base_Widget` y el
compilador `scripts/public-website/lib/source-led-compiler.cjs`. No es una plataforma UI nueva ni un plugin por
página, y no cambia un contrato compartido: no requiere ADR.

- Doce widgets `greenhouse_inicio_{hero,marcas,motor,lineas,trabajo,aeo,agentes,greenhouse,metodo,respaldo,faq,agenda}`.
- Bandas claras: `marcas`, `motor`, `trabajo`, `agentes`, `respaldo`, `agenda`; el resto son oscuras.
- Cero widgets HTML. Ningún control acepta HTML, CSS ni JavaScript.

## Fuente

`scripts/public-website/inicio-source/`:

| Archivo | Rol |
| --- | --- |
| `Main.dc.html` | Canvas aprobado sin el menú dibujado |
| `assets.json` | 105 blobs del canvas → nombres de asset |
| `used-assets.json` | Assets realmente usados (lo lee el empaquetador) |
| `host.css` | Ajustes del host Ohio para los módulos |
| `page-custom.css` | CSS full-bleed de la página (`__ID__` = id de página) |
| `page.css` | Vacío |
| `og/` | `og.html` (composición de la imagen social 1200×630) y sus insumos |

## Compilador

`scripts/public-website/compile-inicio-elementor-source.cjs` no toca WordPress. Evalúa una vez el DCLogic del canvas
y **expande a marcado estático editable cada estado que el canvas cambiaba en runtime**:

- palabras del hero, dentro de un `<template data-gh-words>` (no dentro del `<h1>`);
- descripciones y rótulos;
- preguntas AEO y estados de «Tu marca»;
- vistas de Greenhouse, pasos del método, testimonios, columnas del comparador y panel de FAQ.

Conserva **una sola copia** de las colecciones que el canvas duplicaba para sus loops; el JS crea las copias
`aria-hidden`. Reemplaza el agendador de ejemplo del canvas por `<gh-meeting-cta location="home_agenda">`.

Emite por sección un schema + plantilla en `includes/inicio/{schemas,templates}` (88 archivos generados) y
`assets/css/inicio-landing.css`.

**Repetidores:** `lineas_hero`, `elenco`, `logos`, `herramientas`, `lineas`, `piezas_a`, `piezas_b`, `sparks`,
`partners`, `faq`. Los repetidores con estilos inline por fila generan un layout por fila (Sparks 18, partners 9):
aceptado.

## Runtime

Repo `efeoncepro/efeonce-public-site-runtime`, `wp-content/plugins/eo-elementor-widgets/`:

- `includes/widgets/class-eo-inicio-landing-base.php` y `class-eo-inicio-landing-widgets.php` (12 widgets).
- `includes/inicio/{schemas,templates}` (generados).
- `assets/css/inicio-landing.css` (generado).
- `assets/js/inicio-landing.js`: escrito a mano, lee sólo el DOM. En el editor de Elementor no corre nada (se ven
  los estados estáticos); con `prefers-reduced-motion` todos los estados quedan legibles y quietos.
- `assets/img/inicio/`: 97 assets usados, incluidos 5 mp4.
- Registro en `includes/class-eo-widgets-loader.php`.

Comportamientos de carga (desde la corrida SEO del 2026-10-29): los videos de trabajos llevan `preload="none"` y sólo
se reproducen en pantalla (IntersectionObserver), así que al cargar se descargan 0 MB de video; el primer retrato del
hero va con `fetchpriority="high"` y el resto `low`; los enlaces internos de las líneas abren en la misma pestaña y
los externos en pestaña nueva.

## Agendador

El módulo `agenda` reutiliza el CTA gobernado del menú global, `site-nav-discovery-meeting` (superficie site-nav,
allowlist de todo el sitio). El publisher escribe la superficie y el key en el widget `agenda`; `cta_location=home_agenda`;
fallback `/agenda/`. Mecanismo compartido: `SourceLedMeetingLauncher` en [PRIMITIVES](PRIMITIVES.md#registry).

## Accesibilidad del `<h1>`

El `<h1>` lleva el texto para lectores de pantalla «¿Qué necesita tu marketing? Crecer, destacar, aparecer, rendir y
vender.». El párrafo visible de la pregunta queda `aria-hidden` y las letras animadas son decorativas. Un solo `<h1>`
en la página.

## Carril de release

Todo pasa por SSH/WP-CLI después de `pnpm public-website:ssh-check`, con
`pnpm public-website:wpcli -- --eval-file … --input-file … --wp-user 12`.

1. **Compilar:** `node scripts/public-website/compile-inicio-elementor-source.cjs`.
2. **Gates:** `node scripts/public-website/verify-source-led-compilers.cjs` (regenera cada landing migrada y compara
   byte a byte con el runtime) y `php scripts/public-website/verify-source-led-render.php` (huella de render por
   módulo). Ambos incluyen `inicio`; en este rollout las otras seis landings del núcleo (medios, performance, inbound,
   agenda, nosotros, partners) quedaron idénticas byte a byte y en render.
3. **Baseline vivo:** `pnpm public-website:export-live-code -- --output <dir>`.
4. **Paquete:** `node scripts/public-website/build-inicio-elementor-package.cjs <dir>` → `tmp/inicio-elementor-release/`
   (`package.zip` + `manifest.json`). No muta el sitio.
5. **Deploy:** `deploy-inicio-elementor-package.php` (contrato `inicio-elementor-release.v1`): allowlist de rutas de
   la home (admite mp4), hash por archivo, guarda de drift contra el SHA vivo anterior, backup TAR en `/tmp` de Kinsta
   y purga de caché.
6. **Publicación:** `publish-inicio-elementor-page.php <page-custom.css> <spec.json> [<meeting.json>]`.
   - `{ "mode": "preview" }` crea una copia de QA publicada con `noindex`, fuera de menús.
   - `{ "mode": "replace", "pageId": 251731, "expectedDataSha": "<sha256 del _elementor_data vivo>" }` reemplaza el
     cuerpo de la portada en el lugar.
   - El tercer input opcional es `.auth/site-nav-meeting-cta-surface.json` (archivo 0600 del CTA del menú global).
   - Antes de escribir: preflight de controles y render de los 12 widgets; snapshot `_gh_home_orbita_before_<UTC>`.
     La featured image se lee antes de `Document::save` y se restaura/verifica después.
7. **Rollback:** `rollback-inicio-elementor-page.php` con `{ "snapshot": "_gh_home_orbita_before_<UTC>" }` y,
   opcionalmente, `"seoSnapshot"`. Exige que `page_on_front` siga siendo `251731`; restaura Elementor data/settings,
   featured image, metas Ohio y Yoast (borra las que no existían), reconstruye el indexable Yoast y purga Kinsta.

## SEO y social

`scripts/public-website/configure-inicio-seo.php` (recibe un PNG 1200×630; snapshot en opción
`_gh_home_orbita_seo_before_<UTC>`). Yoast sigue siendo dueño único del grafo (`WebPage`, `ImageObject`,
`BreadcrumbList`, `WebSite`, `Organization`); los widgets no emiten JSON-LD.

| Campo | Valor |
| --- | --- |
| Título SEO | «Efeonce \| Agencia de marketing digital y tecnología» (sin cambios) |
| Meta description | «Un solo equipo de marketing y tecnología: estrategia, creatividad, web, SEO y AEO, medios y CRM. Con agentes de IA y tu operación a la vista en Greenhouse.» |
| OG/Twitter title | «¿Qué necesita tu marketing? \| Efeonce» |
| OG/Twitter description | «Crecer, destacar, aparecer, rendir y vender: cinco especialidades de marketing y tecnología en un solo equipo, con tu operación a la vista en Greenhouse.» |
| OG / Twitter / featured image | `252184` `efeonce-home-que-necesita-tu-marketing-og.png`, 1200×630 PNG |

La imagen social se compone en `inicio-source/og/og.html` y se renderiza con Playwright a 1200×630. Composición
centrada (lente con la persona y logo centrado abajo; pregunta y «Crecer.» a la izquierda; Destacar, Aparecer, Rendir
y Vender a la derecha) para sobrevivir al recorte cuadrado de las apps de chat y al 2:1 de X. Lleva alt descriptivo.
Se importa siempre como **adjunto nuevo** (las redes cachean por URL) y queda también en
`_elementor_page_settings.post_featured_image`, porque Elementor reescribe la featured image al guardar desde el
editor. La anterior (`248149`, arte 2025, WebP 2000×960) sigue en la biblioteca.

## Móvil y tablet (pasada 2026-10-29)

Objetivo del operador: que en teléfono la home sea igual de espectacular que en escritorio. Tres auditorías en paralelo
(ritmo y tipografía, escenas interactivas, touch y accesibilidad) a 320/360/390/430/768/1024 px; los cambios viven en
`inicio-source/host.css` (capa responsive), `inicio-source/page.css` (capa de página sin scope), el compilador y
`inicio-landing.js`.

Cortes: `≤360`, `≤520`, `≤699`, `≤900` (teléfono/tablet vertical, la misma frontera que `narrow()` en JS), `521–900`,
`640–900`, `700–900` y `901–1180` (tablet horizontal / laptop chico). Sobre 1180 no cambia nada.

| Sección | Teléfono | Tablet |
| --- | --- | --- |
| Hero | Lente `min(64vw,300px)` que sigue al dedo: deslizar cambia la línea, tocar pasa a la siguiente; botones de ancho completo; la rotación se pausa fuera de pantalla (`.hero.idle`). | Grilla de dos columnas desde 700 px. |
| Motor | La escena se resuelve con la etapa centrada en pantalla, no al salir; las tarjetas van a las esquinas (`ORD_NARROW`) con texto que envuelve; el copy de la solución espera a la escena resuelta (`[data-gh-ready]`); la flotación sólo corre con la escena visible. | Fichas de 200 px. |
| Líneas | Pestañas de 44 px con chevron; al abrir una línea la página la lleva bajo la navegación; la foto se ve en la tarjeta. | Cuerpo a dos columnas con foto. |
| Trabajo | Arrastrar una cinta la recorre (Web Animations sobre la animación CSS) y retoma al soltar; con `saveData` sólo pósters. | — |
| AEO | Vuelve a avanzar con el scroll («Baja para ver cómo cambia la respuesta» se cumple): la etapa sigue a la respuesta en pantalla; riel de etapas horizontal; filas apiladas a su alto real (`--ty`); motores en una fila con scroll y el activo a la vista. | Etapas con scroll igual que teléfono. |
| Agentes | Tocar un Spark lo enciende y muestra su leyenda bajo el copy (`.sk-live`, `aria-live`); sin tocar, un recorrido guiado enciende uno cada 3,2 s; la pista dice «Toca un Spark.» en touch. | Altura `clamp(820px,100vw + 140px,1080px)`. |
| Greenhouse | KPI a dos columnas sin cortes; la línea del gráfico se dibuja al llegar a pantalla; deslizar el tablero cambia de vista. | KPI a cuatro columnas desde 640 px. |
| Método | Las cuatro etapas y «Ciclo completo» ocurren con el anillo entero en pantalla; estaciones en grilla 2×2 bajo el anillo, tocables; la descripción del paso va fuera del anillo (`.m-desc`). | Brújula con la estación sur visible. |
| Respaldo | Testimonios en una sola celda (alto estable); deslizar cambia la cita y elegir una detiene la rotación (WCAG 2.2.2); la rotación sólo corre con la sección visible; los partners se reparten en grilla al llegar (`gh-stack`). | Abanico dimensionado con `cqw`. |
| FAQ | Al abrir una respuesta bajo otra abierta, la pregunta tocada queda bajo la navegación. | — |
| Agenda | El correo es un enlace `mailto:`; «Copiar» anuncia «Correo copiado» (`aria-live`) y tiene respaldo sin la API de portapapeles. | — |

Dock y selector de tema: la sección `#top` marca el inicio del dock compartido (`data-landing-dock-start`) y `#agenda`
su parada (`data-landing-dock-stop`); en `page.css`, mientras el dock se muestra (≤1180 px), el selector claro/oscuro
de Ohio (`.elements-bar`) sube 76 px para no quedar debajo.

Movimiento reducido: todas las escenas quedan en su estado final legible; las cintas se vuelven scroll horizontal con
snap; no hay recorrido guiado ni rotación de citas.


- No reescribir el cuerpo de `251731` fuera de `publish-inicio-elementor-page.php` con `expectedDataSha`.
- No portar el menú dibujado del canvas ni modificar header/footer desde este carril.
- No desplegar el checkout runtime completo: el paquete es acotado por allowlist y parte del baseline vivo.
- Cada estado que rota debe seguir siendo marcado editable en Elementor; el JS sólo lee el DOM, nunca trae copy propio.
- Las palabras animadas del hero viven en `<template data-gh-words>`, nunca dentro del `<h1>`.
- Nueva imagen social = adjunto nuevo + reflejo en `post_featured_image`; nunca sobrescribir el archivo en el lugar.
- Las cifras de Greenhouse y la escena AEO son ilustrativas; no presentarlas como datos en vivo ni resultados.
- No agregar JSON-LD desde los widgets: Yoast es dueño del grafo.

## Lecciones de QA

- El canvas usa reset `border-box` (no el `content-box` de Nosotros).
- Los widgets laterales de Ohio necesitan rieles desde 1181 px (`--gh-rail`).
- En el sitio, `offsetTop` es relativo al contenedor de Elementor: medir con `getBoundingClientRect().top + scrollY`.
- Móvil: reservar espacio para el rótulo de la lente; AEO es sección normal (sin sticky) y desde la pasada móvil la
  etapa avanza con el scroll, no por pregunta; Sparks a media altura ocultos (`gh-mid`); tarjetas del motor a las
  cuatro esquinas con texto que envuelve.
- Reglas del canvas con dos clases (`.mstep.s1`) ganan a una regla responsive de una clase: en móvil hay que repetir
  la propiedad en el mismo selector compuesto (pasó con la alineación de las estaciones del método).
- El contador de KPI arrancaba en negativo porque el primer frame de `requestAnimationFrame` llega con un timestamp
  anterior al `performance.now()` del arranque: el progreso se acota a `[0,1]`.
- Si un texto cambia de estructura, las claves `fNNN_` del schema se renumeran; es seguro porque los widgets de
  `251731` sólo guardan título y márgenes (los textos salen de los defaults del schema). Antes de desplegar, confirmar
  que la página no tenga valores `fNNN_` guardados.
- Las palabras del hero dentro del `<h1>` ensuciaban su texto accesible: se movieron a `<template>`.
- Pre-live local: render de todos los módulos con stubs (`tmp/inicio-local/render.php`, basado en
  `verify-source-led-render.php`), servido estático y revisado en navegador antes de tocar el sitio.
- `create-yoast-redirect.php` no acepta la portada como destino (normaliza `/` a `//` y exige un post publicado):
  para retirar páginas hacia `/` se usan los scripts `retire-*` (ver audit).

## Pendientes

- Pasada móvil 2026-10-29: código y compilado listos y verificados en local (320/390/768/1024); despliegue a
  producción pendiente de autorización del operador.
- PageSpeed / Lighthouse y Core Web Vitals de campo: no medidos (cuota pública de PSI agotada el 2026-10-29).
- Prueba de guardar y recargar desde el editor de Elementor: no registrada en este rollout.
- Push de `af1a785` al runtime y de los commits de `develop` en Greenhouse.
- Backlog global del sitio (no del cuerpo de la home): ver [audit](../../audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md#backlog-global).
