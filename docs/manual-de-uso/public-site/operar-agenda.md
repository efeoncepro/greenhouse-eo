# Operar la landing Agenda

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-20 por Claude
> **Ultima actualizacion:** 2026-10-20 por Claude
> **Documentacion tecnica:** [Registro de primitives (`AgendaLandingModules`, `NativeMeetingSchedulerHost`)](../../architecture/public-site/PRIMITIVES.md#registry) ·
> [contrato del lanzador source-led y agendador en línea](../../architecture/public-site/PRIMITIVES.md#source-led-meeting-launcher-contract)
> **Documentacion funcional:** [agenda.md](../../documentation/public-site/agenda.md)

## Para qué sirve

Para cambiar el copy o el diseño de [`/agenda/`](https://efeoncepro.com/agenda/) (página `251583`), republicar su
cuerpo con guarda de hash, revertir la página, el SEO o los archivos del plugin, y verificar que el agendador nativo
real sigue cargando.

## Antes de empezar

- El checkout es compartido: corre `git status --short` en `greenhouse-eo` y en `efeonce-public-site-runtime` antes
  de tocar nada. No mezcles cambios ajenos en tu paquete ni en tu commit.
- Para cualquier operación por WP-CLI, corre primero `pnpm public-website:ssh-check`.
- Confirma la identidad: `251583`, slug `agenda`, estado `publish`. Los scripts del carril se detienen si no coincide.
- La fuente que compila el carril vive en `scripts/public-website/agenda-source/`: `Main.dc.html` (el canvas «Landing
  Agendar — Efeonce» sin el chrome del sitio y sin agendador dibujado), `assets.json`, `host.css`, `page.css`,
  `page-custom.css` (con `__ID__`), `scheduler-host.html` y `og/`.
- La guía del agente para esta landing está en `efeonce-public-site-wordpress/references/landings/agenda.md`.
- Las decisiones de diseño (par de voz del hero, CTA en acento Growth, sin eslogan suelto) están registradas en la skill
  `efeonce-graphic-line`. Si un cambio las toca, es una decisión del operador, no un ajuste de copy.

## Qué vive dónde

| Pieza | Dónde vive | Cómo se cambia |
| --- | --- | --- |
| Textos y estructura de las cuatro secciones (`hero`, `como`, `preguntas`, `cierre`) | Schemas y plantillas del plugin, compilados desde `Main.dc.html` | Recompilar y desplegar |
| CSS de la landing (`host.css` y la capa `page.css`, que enmarca y tematiza el agendador) | `assets/css/agenda-landing.css` del plugin | Recompilar y desplegar |
| Agendador (`scheduler-host.html`) | Widget HTML dentro del documento de la página | Republicar |
| CSS propio de la página (`page-custom.css`) | Ajustes de la página en Elementor | Republicar |
| Título, descripción, robots, OG | Metadatos Yoast | `configure-agenda-seo.php` |

La página guarda los cuatro módulos sin textos propios: muestran los valores del compilado. Por eso un cambio de copy
llega a la página con sólo desplegar los archivos del plugin, sin republicar.

## Cambiar el copy o el diseño de las secciones

1. Cambia el canvas aprobado y actualiza `agenda-source/Main.dc.html` (más `host.css` o `page.css` si corresponde).
   Mantén el copy en hechos: 30 minutos y Microsoft Teams vienen del agendador real.
2. Recompila. Escribe directo en el runtime compartido (`/Users/jreye/Documents/efeonce-public-site-runtime`, o lo
   que diga `PUBLIC_SITE_RUNTIME_ROOT`). No edites a mano los archivos generados.

   ```bash
   node scripts/public-website/compile-agenda-elementor-source.cjs
   ```

3. Corre los dos gates del núcleo común (ambos incluyen `agenda`; si cambiaste algo compartido, también protegen a
   Medios, Performance e Inbound):

   ```bash
   node scripts/public-website/verify-source-led-compilers.cjs
   php scripts/public-website/verify-source-led-render.php
   ```

4. Exporta un baseline vivo reciente y arma el paquete acotado (contrato `agenda-elementor-release.v1`). Escribe
   `tmp/agenda-elementor-release/{package.zip,manifest.json}`:

   ```bash
   pnpm public-website:export-live-code -- --output <dir-baseline>
   node scripts/public-website/build-agenda-elementor-package.cjs <dir-baseline>
   ```

   Revisa el diff de **todos** los archivos incluidos, en especial `includes/class-eo-widgets-loader.php` y
   `includes/widgets/class-eo-source-led-landing-base.php`, que son compartidos y viajan completos.

5. Despliega (sólo con autorización vigente para ese cambio):

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-agenda-elementor-package.php \
     --input-file ./tmp/agenda-elementor-release/package.zip \
     --input-file ./tmp/agenda-elementor-release/manifest.json --wp-user 12
   ```

   El deploy acepta sólo rutas de la allowlist de Agenda, compara el SHA previo de cada archivo contra el vivo, guarda
   un backup TAR en `/tmp` de Kinsta e imprime `scoped_package_installed` con su ruta. Anota esa ruta: es tu rollback.

6. Verifica en vivo (ver [Qué revisar después](#qué-revisar-después)).

## Republicar el cuerpo de la página (con guarda de hash)

Hace falta sólo si cambiaste `scheduler-host.html`, `page-custom.css` o el orden de los módulos.
`publish-agenda-elementor-page.php` reemplaza el cuerpo completo de `251583` (hero · agendador · cómo · preguntas ·
cierre); no crea páginas.

1. Lee el hash actual de `_elementor_data` de `251583` con una lectura que no escriba (por ejemplo un eval que imprima
   `hash('sha256', get_post_meta(251583, '_elementor_data', true))`). Compáralo con el último publicado (registrado
   en la referencia de la landing). Si difiere, alguien editó la página: revisa qué cambió antes de seguir.
2. Escribe un spec `{ "pageId": 251583, "expectedDataSha": "<hash leído>" }` en un archivo temporal y publica:

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/publish-agenda-elementor-page.php \
     --input-file ./scripts/public-website/agenda-source/page-custom.css \
     --input-file ./scripts/public-website/agenda-source/scheduler-host.html \
     --input-file ./tmp/agenda-republish.json --wp-user 12
   ```

3. Antes de escribir, el script valida que el widget HTML monte exactamente el agendador gobernado (superficie
   `fhsf-efeonce-lead-gen-web`, clave `discovery`, loader público, `id="agenda"`) y que no haya enlaces de HubSpot.
   Guarda un snapshot `_gh_agenda_v2_before_<UTC>`, copia las metas de layout Ohio desde Performance (`251997`), no
   toca los metadatos Yoast y verifica que no cambiaron las páginas protegidas ni el chrome global.
4. Resultado `replace_verified`: imprime el snapshot, el hash nuevo y el estado `noindex` (debe venir vacío). Anota el
   snapshot y el hash en la referencia de la landing.

## Cambiar el SEO

`configure-agenda-seo.php` escribe los metadatos Yoast (título, descripción, OG/Twitter), quita `noindex`/`nofollow`
e importa la imagen OG como **adjunto nuevo** (nunca sobrescribe el anterior), que también queda como imagen
destacada. Recibe el PNG de 1200×630 compuesto desde `agenda-source/og/og.html`. Guarda antes un snapshot en una opción
(`_gh_agenda_seo_before_<UTC>`) e imprime `seo_indexable_og_set`. Los textos están en el script: cámbialos ahí y vuelve
a correrlo; no se editan a mano en Yoast.

## Qué revisar después

- 1440 y 375 px sin desborde horizontal (`scrollWidth == innerWidth`).
- El agendador cargado con disponibilidad real (no un espacio vacío ni un error), enmarcado sobre el borde del hero, y
  la sección clara empieza **debajo** del marco (si el fondo claro sube junto con la tarjeta, se perdió el
  `display:flow-root`; ver [Problemas comunes](#problemas-comunes)).
- Consola sin errores.
- Ningún enlace a `meetings.hubspot.com` en el HTML servido.
- Los enlaces a `#agenda` llevan al agendador y le pasan el foco.
- Robots `index, follow`, canonical `/agenda/`, OG propio e imagen destacada `252024` (después de republicar, confirma
  que la imagen destacada sigue puesta).
- Header y footer globales intactos.

**No hagas una reserva para verificar.** El agendador real crea reuniones reales en el calendario. Una reserva
controlada exige decisión del operador (el 2026-10-20 dijo «no por ahora»).

## Qué significan los estados

| Estado / señal | Qué significa |
| --- | --- |
| `scoped_package_installed` | El deploy terminó y dejó backup TAR en `/tmp` de Kinsta |
| `Live drift: <ruta>` | Un archivo vivo no coincide con el baseline: alguien lo cambió. Relee el vivo; no cambies hashes |
| `Path outside Agenda release scope.` | El manifest trae una ruta fuera de la allowlist |
| `Live Elementor data changed since discovery: <hash>` | La página cambió desde que leíste el hash. No escribió nada; revisa antes de reintentar |
| `Unexpected scheduler host input.` | El `scheduler-host.html` no monta el agendador gobernado o trae un enlace de HubSpot |
| `replace_verified` | El cuerpo se reemplazó y se verificó; imprime snapshot y hash |
| `Unrelated page changed` / `Global site chrome changed` | Una guarda detectó un cambio fuera de alcance: restaura el snapshot impreso |
| `seo_indexable_og_set` | El SEO quedó escrito; imprime adjunto OG y snapshot |
| `rolled_back` | El rollback de página terminó |

## Rollback

Cada script dejó un snapshot. Toma antes un snapshot del estado actual y purga Kinsta al final.

1. **Página** (`rollback-agenda-elementor-page.php`): recibe un JSON con el snapshot impreso por el publicador. El del
   rediseño del 2026-10-20 es `_gh_agenda_v2_before_20261020_163500`:

   ```bash
   # tmp/agenda-rollback.json → { "snapshot": "_gh_agenda_v2_before_20261020_163500",
   #                              "seoSnapshot": "_gh_agenda_seo_before_20261020_165619" }
   pnpm public-website:wpcli -- --eval-file scripts/public-website/rollback-agenda-elementor-page.php \
     --input-file ./tmp/agenda-rollback.json --wp-user 12
   ```

   Restaura el documento de Elementor, la imagen destacada, las metas Ohio y las metas Yoast guardadas en el snapshot.
   Ese snapshot es anterior a la indexación, así que la página vuelve al estado del piloto, incluido su `noindex`.
   `seoSnapshot` (opcional) restaura o borra los campos SEO que no estaban en el snapshot de página. El adjunto OG queda
   en la biblioteca.
2. **Sólo SEO**: restaura cada campo desde la opción `_gh_agenda_seo_before_20261020_165619` (borra los que no
   existían; vuelve a poner `_yoast_wpseo_meta-robots-noindex=1` si se quiere volver a ocultar) y purga.
3. **Archivos del plugin**: restaura el TAR del deploy (`/tmp/eo-agenda-widgets-before-*.tar` en Kinsta; el de Medios
   recompilado ese día es `/tmp/eo-medios-widgets-before-20261020-165811.tar`) sólo sobre las rutas del manifest. Si
   restauras widgets que la página todavía usa, revierte primero la página. Los TAR viven en `/tmp` y pueden
   desaparecer.
4. Purga caché y repite [Qué revisar después](#qué-revisar-después).

## Qué no hacer

- **No** hagas una reserva en una prueba visual.
- **No** toques el header ni el footer: son los globales del sitio y otra línea de trabajo los está cambiando.
- **No** uses el CTA `efeonce-discovery-30` ni el botón `<greenhouse-cta>` para esta página: aquí el agendador va en
  línea, con el adaptador del piloto.
- **No** dibujes un agendador ni pongas una imagen en su lugar: la landing funciona con el agendador real o no funciona.
- **No** agregues enlaces a `meetings.hubspot.com`; la recuperación es nativa (navegar meses, «Reintentar»).
- **No** prometas en el copy lo que el agendador no hace (por ejemplo, que Nexa acompaña la reunión).
- **No** uses la plantilla `elementor_canvas`: rompe el runtime global de Ohio en esta página.
- **No** escribas `_elementor_data` a mano ni despliegues el checkout runtime completo.
- **No** la agregues a un menú sin decisión del operador.

## Problemas comunes

- **El fondo claro de «Cómo es la reunión» sube junto con la tarjeta del agendador.** El marco tiene margen negativo
  para montarse sobre el hero; sin `display:flow-root` en `.gh-agenda-scheduler`, ese margen colapsa a través de la
  sección y arrastra su fondo. Se corrigió en vivo el 2026-10-20 en `agenda-source/page.css`; si reaparece, revisa que
  la regla siga en el CSS compilado.
- **El agendador se ve distinto al canvas.** Es esperado: en vivo se ve el renderer de producción. La composición AXIS
  aprobada del agendador está pendiente (`TASK-2007`); no la imites desde la landing.
- **El publicador se niega con «Live Elementor data changed».** Alguien guardó la página después de tu lectura. Lee de
  nuevo el hash, revisa qué cambió y decide si tu republicación lo pisaría.
- **No logro pasar un archivo a un script.** `pnpm public-website:wpcli` sólo reenvía archivos con `--input-file`;
  escribe el spec en `tmp/` y pásalo así.

## Referencias técnicas

- [Registro de primitives del sitio público](../../architecture/public-site/PRIMITIVES.md#registry)
- [Arquitectura del agendador nativo](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md)
- [Configurar el CTA del agendador nativo](../growth/configurar-cta-scheduler-nativo.md)
- [Navegación global del sitio (respaldo `/agenda/`)](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#agendador)
- Scripts: `scripts/public-website/{compile,build,deploy,publish,rollback}-agenda-elementor-*` y `configure-agenda-seo.php`.
- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` (`class-eo-agenda-landing-*`,
  `includes/agenda/`, `assets/css/agenda-landing.css`, `assets/js/agenda-landing.js`, `assets/img/agenda/`).
