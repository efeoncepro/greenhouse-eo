# Home Inicio Elementor Modules V1

> **Tipo de documento:** Contrato técnico (public site)
> **Version:** 1.0
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

## Invariantes

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
- Móvil: reservar espacio para el rótulo de la lente; AEO pasa a sección normal (la etapa avanza por pregunta);
  Sparks a media altura ocultos (`gh-mid`); tarjetas del motor a las cuatro esquinas con tipografía menor.
- Las palabras del hero dentro del `<h1>` ensuciaban su texto accesible: se movieron a `<template>`.
- Pre-live local: render de todos los módulos con stubs (`tmp/inicio-local/render.php`, basado en
  `verify-source-led-render.php`), servido estático y revisado en navegador antes de tocar el sitio.
- `create-yoast-redirect.php` no acepta la portada como destino (normaliza `/` a `//` y exige un post publicado):
  para retirar páginas hacia `/` se usan los scripts `retire-*` (ver audit).

## Pendientes

- PageSpeed / Lighthouse y Core Web Vitals de campo: no medidos (cuota pública de PSI agotada el 2026-10-29).
- Prueba de guardar y recargar desde el editor de Elementor: no registrada en este rollout.
- Push de `af1a785` al runtime y de los commits de `develop` en Greenhouse.
- Backlog global del sitio (no del cuerpo de la home): ver [audit](../../audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md#backlog-global).
