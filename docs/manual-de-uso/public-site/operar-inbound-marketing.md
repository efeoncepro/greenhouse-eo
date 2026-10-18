# Operar la landing Inbound Marketing

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-18 por Claude
> **Ultima actualizacion:** 2026-10-18 por Claude
> **Documentacion tecnica:** [Registro de primitives (`InboundLandingModules`, `EfeonceMention`, lanzador de reunión)](../../architecture/public-site/PRIMITIVES.md#registry) ·
> [contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md) ·
> [PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)
> **Documentacion funcional:** [inbound-marketing.md](../../documentation/public-site/inbound-marketing.md)

## Para qué sirve

Para editar el contenido de [`/agencia-inbound-marketing/`](https://efeoncepro.com/agencia-inbound-marketing/)
(página `242601`), cambiar su diseño de forma gobernada, rotar el key del botón de reunión y revertir la publicación si
algo sale mal.

**Antes de usar esta landing como referencia para otra:** su diseño es de esta landing, no una plantilla
([PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)). Lo reutilizable son los
mecanismos que este manual opera (compilador común, carril de paquete y rollback, lanzador de reunión, `EfeonceMention`,
Growth Forms y Growth CTA). Una landing nueva deriva su diseño de su propia necesidad.

## Antes de empezar

- El checkout es compartido: corre `git status --short` en `greenhouse-eo` y en `efeonce-public-site-runtime` antes de
  tocar nada. No mezcles cambios ajenos en tu paquete ni en tu commit.
- Para cualquier operación por WP-CLI, corre primero `pnpm public-website:ssh-check`.
- Confirma la identidad: `242601`, slug `agencia-inbound-marketing`, ítem de menú `243616`. Los scripts se niegan
  (`Target page drift.`) si el slug no coincide.
- El diseño aprobado es el canvas «La órbita» (`https://claude.ai/artifact/R3pppHeU6tVLmXJ9BtaDN4`). La fuente que
  compila el carril vive en `scripts/public-website/inbound-source/` (`Main.dc.html`, `host.css`, `page.css`,
  `page-custom.css` con `__ID__`, `form.json`, `assets.json`, `used-assets.json`, `blob-map.tsv`, `media/`, `og/`).
- La guía operativa del agente para esta landing es la referencia
  `efeonce-public-site-wordpress/references/landings/inbound-marketing.md` de la skill.

## Editar textos y preguntas frecuentes en Elementor

1. Abre `wp-admin/post.php?post=242601&action=elementor`.
2. Selecciona el contenedor de la sección y su widget `greenhouse_inbound_*` (hay once: `hero`, `confianza`, `partida`,
   `vivo`, `cambio`, `rompe`, `metodo`, `ciclo`, `planes`, `reglas`, `diagnostico`).
3. Edita textos, enlaces e imágenes desde los controles del widget. Ningún control acepta HTML, CSS ni JavaScript.
4. Las preguntas frecuentes están en el widget `diagnostico`, como lista: agrega, quita o cambia filas. Esa lista
   alimenta el `FAQPage`, así que lo visible y lo declarado cambian juntos.
5. En `diagnostico` están también el `form key` y la `surface` del formulario y la descripción del `Service`. En `hero`
   y `diagnostico` están los campos del lanzador de reunión (`meeting_cta`, `meeting_surface`, `meeting_embed_key`,
   `meeting_location`, `meeting_fallback_url`, `meeting_fallback_label`). No los cambies a mano: el key se escribe al
   republicar (ver [Rotar el key del botón de reunión](#rotar-el-key-del-botón-de-reunión)).
6. Guarda, purga la caché y revisa con la [lista de verificación](#lista-de-verificación).

La prueba completa de abrir, guardar y recargar desde el editor **todavía no está certificada**. Si al guardar algo
desaparece o una sección cambia de forma, detente y escala antes de reintentar.

## Cambiar el diseño (no el contenido)

La estructura de cada sección sale de plantillas compiladas desde el canvas. Un cambio de diseño sigue el carril
canvas → compilar → paquete → deploy → publicar.

1. Cambia el diseño en el canvas aprobado y actualiza la fuente en `scripts/public-website/inbound-source/`. La piel
   del diálogo de reunión está en `page.css` (acotada con `body:has(.gh-inbound)`); la de los botones de reunión, en
   `host.css` (`.meet-cta`, `.meet-cta--ghost`, `.meet-cta--dock`).
2. Si cambió la media del canvas, prepara los assets:

   ```bash
   node scripts/public-website/prepare-inbound-assets.cjs
   ```

3. Recompila. Escribe directo en el runtime compartido (`/Users/jreye/Documents/efeonce-public-site-runtime`, o lo que
   diga `PUBLIC_SITE_RUNTIME_ROOT`): `includes/inbound/{schemas,templates}` y `assets/css/inbound-landing.css`. No
   edites a mano los archivos generados.

   ```bash
   node scripts/public-website/compile-inbound-elementor-source.cjs
   ```

4. Corre las guardas del núcleo común. La base y el compilador son compartidos con Agencia de Medios y Performance
   Marketing, así que un cambio aquí puede moverlas:

   ```bash
   node scripts/public-website/verify-source-led-compilers.cjs
   php scripts/public-website/verify-source-led-render.php
   ```

5. Exporta un baseline vivo reciente y arma el paquete acotado (contrato `inbound-elementor-release.v1`):

   ```bash
   pnpm public-website:export-live-code -- --output <dir-baseline>
   node scripts/public-website/build-inbound-elementor-package.cjs <dir-baseline>
   ```

   Revisa la lista de archivos que cambian y el diff de **todos** los incluidos, en especial
   `includes/class-eo-widgets-loader.php` y `includes/widgets/class-eo-source-led-landing-base.php`, que son compartidos.
   El paquete también lleva los tres archivos de `EfeonceMention` si difieren del vivo.

6. Despliega (sólo con autorización vigente para ese cambio):

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-inbound-elementor-package.php \
     --input-file ./tmp/inbound-elementor-release/package.zip \
     --input-file ./tmp/inbound-elementor-release/manifest.json --wp-user 12
   ```

   El deploy acepta sólo rutas de la allowlist de Inbound (widgets `class-eo-inbound-landing-*`, la base común, el
   loader, `includes/inbound/**`, `eo-mention.php` y los assets de la landing y de la mención), deja un backup TAR en
   `/tmp` de Kinsta y responde `scoped_package_installed`.

7. Si cambió la lista de módulos o los settings de la página, republica el cuerpo:

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/publish-inbound-elementor-page.php \
     --input-file ./scripts/public-website/inbound-source/page-custom.css \
     --input-file ./scripts/public-website/inbound-source/form.json \
     --input-file <spec.json> \
     --input-file ./.auth/inbound-meeting-cta-surface.json --wp-user 12
   ```

   `<spec.json>` es un archivo temporal: `{ "mode": "replace", "pageId": 242601, "expectedDataSha": "<sha256 del
   _elementor_data vivo>" }`. Si alguien editó la página desde que leíste el hash, se detiene. `{ "mode": "preview" }`
   crea en cambio una página de QA `noindex`. El **cuarto input** es el archivo del key de reunión: sin él, los tres
   botones de reunión caen al enlace `/agenda/`. Antes de escribir guarda un snapshot `_gh_inbound_v2_before_<UTC>`;
   anótalo.

8. Si cambiaste metadatos, corre `configure-inbound-seo.php` (deja su propio snapshot `_gh_inbound_seo_before_<UTC>`).
9. Purga la caché y verifica (ver [Lista de verificación](#lista-de-verificación)). Un cambio a un archivo PHP que ya
   existía puede tardar 1 a 2 minutos en verse en la web.

## Rotar el key del botón de reunión

Los tres botones «Agenda una reunión» son un solo Growth CTA, `inbound-discovery-meeting` (`open_meeting_scheduler`,
scheduler `fhsf-efeonce-lead-gen-web` + `discovery`), con su surface propia «Efeonce Inbound landing (WordPress)». Cada
lugar se mide con su `cta-location`: `inbound_hero`, `inbound_closing` e `inbound_mobile_dock`.

1. Levanta el proxy de Cloud SQL: `pnpm pg:connect`.
2. Corre el publicador del CTA:

   ```bash
   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= npx tsx --env-file=.env.local \
     --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-inbound-meeting-cta.ts
   ```

   Escribe el embed key con permisos 0600 en `.auth/inbound-meeting-cta-surface.json` (ignorado por git). **Nunca
   imprimas, copies ni pegues ese key** en el repo, un audit, un chat o un log.
3. **Re-correr el publicador rota el key**: el anterior deja de valer. En el mismo momento republica la página con el
   cuarto input (paso 7 de la sección anterior). Si no, los tres botones quedan apuntando a un key muerto.
4. Verifica los tres placements en vivo.

## Scripts del carril (referencia)

| Script | Qué hace | Snapshot / salida |
| --- | --- | --- |
| `prepare-inbound-assets.cjs` | Convierte la media del canvas a assets del plugin | `assets/img/inbound/` |
| `compile-inbound-elementor-source.cjs` | Compila el canvas en schemas, plantillas y CSS sobre el núcleo común | Archivos en el runtime |
| `verify-source-led-compilers.cjs` + `verify-source-led-render.php` | Guardas del núcleo común compartido | Falla si una landing hermana cambia |
| `build-inbound-elementor-package.cjs <baseline>` | Arma el paquete con hashes previos | `tmp/inbound-elementor-release/` |
| `deploy-inbound-elementor-package.php` | Instala el paquete con allowlist y guarda de SHA | Backup TAR en `/tmp` de Kinsta |
| `publish-inbound-elementor-page.php` | `preview` (página de QA noindex) o `replace` (cuerpo en el lugar, con `expectedDataSha`) | `_gh_inbound_v2_before_<UTC>` |
| `configure-inbound-seo.php` | Metadatos Yoast + imagen social `252016` | `_gh_inbound_seo_before_<UTC>` |
| `rollback-inbound-elementor-page.php` | Restaura cuerpo, metas Ohio, imagen destacada y Yoast desde los snapshots | `rolled_back` |
| `scripts/growth/publish-inbound-meeting-cta.ts` | Publica el CTA de reunión y escribe (o rota) el key | `.auth/inbound-meeting-cta-surface.json` (0600) |
| `scripts/growth/publish-inbound-diagnostic-form.ts` | Publica el Growth Form `efeonce-inbound-diagnostic` | Formulario en Growth Forms |

## Rollback

1. Escribe un archivo temporal con los snapshots del corte que quieres deshacer. Para el corte del 2026-10-18:

   ```json
   { "snapshot": "_gh_inbound_v2_before_20261018_111856", "seoSnapshot": "_gh_inbound_seo_before_20261018_111909" }
   ```

2. Corre el rollback:

   ```bash
   pnpm public-website:wpcli -- --eval-file scripts/public-website/rollback-inbound-elementor-page.php \
     --input-file <rollback.json> --wp-user 12
   ```

   Devuelve el cuerpo anterior (widgets nativos de Ohio y el `hubspot-form` antiguo), las metas y los campos de Yoast;
   borra las metas que antes no existían. La imagen social nueva queda en la biblioteca.
3. Si también hay que deshacer los archivos del plugin, restaura el TAR del deploy (`/tmp/eo-inbound-widgets-before-*.tar`
   en Kinsta) sólo sobre las rutas del manifest. Los TAR viven en `/tmp` y pueden desaparecer. Recuerda que la base
   común y `EfeonceMention` también los usan otras landings.
4. Purga la caché y verifica la página, el menú y las landings hermanas.

## Lista de verificación

- [ ] 1440 y 390 px sin desborde horizontal (`scrollWidth == clientWidth`).
- [ ] Once módulos, un solo `h1`, canonical, `index, follow`, OG `252016`, bloques `Service` y `FAQPage`.
- [ ] El formulario se dibuja; «Arma tu primer ciclo» actualiza la pregunta al cambiar producto y mercado.
- [ ] Las diez menciones de servicio pintan el isotipo.
- [ ] El HTML trae tres lanzadores de reunión (`inbound_closing`, `inbound_hero`, `inbound_mobile_dock`), no el enlace
      de respaldo.
- [ ] Desde el hero, la ventana de reunión abre y cierra; Escape la cierra y el foco vuelve al botón.
- [ ] Desde el cierre, la ventana abre igual.
- [ ] A 390 px, desde la barra móvil abre a pantalla completa; las dos mitades de la barra miden lo mismo (179 px).
- [ ] El botón secundario del hero tiene su fondo propio (no se ve la costura entre el panel y la foto).
- [ ] Agencia de Medios y Performance Marketing se ven igual que antes del cambio (la base es compartida).

## Qué significan los estados

| Estado / señal | Qué significa |
| --- | --- |
| `scoped_package_installed` | El deploy terminó y dejó backup en `/tmp` de Kinsta |
| `Path outside Inbound Marketing release scope.` | El manifest trae una ruta fuera de la allowlist |
| `replace_verified` / `preview_verified` | El publicador escribió, releyó y confirmó que no tocó páginas protegidas ni el chrome global; `meetingLauncher: true` indica que recibió el key |
| `Live Elementor data changed since discovery` | Alguien cambió la página después de que leíste el hash. Relee; no cambies el hash a ciegas |
| `Invalid meeting CTA surface or key.` | El cuarto input no tiene la forma esperada |
| `Target page drift.` | La página `242601` no tiene el slug esperado: el script no escribió |
| `seo_and_og_set` | Metadatos e imagen social aplicados |
| `rolled_back` | El rollback restauró el cuerpo y las metas |

## Qué no hacer

- **No** uses esta landing como plantilla de otra ni describas su aspecto como «el estilo del sitio»
  ([PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)).
- **No** imprimas ni copies el embed key de reunión; **no** commitees `.auth/inbound-meeting-cta-surface.json`.
- **No** re-corras el publicador del CTA sin republicar la página justo después.
- **No** pegues HTML, CSS ni JavaScript en un widget, ni agregues un widget HTML.
- **No** escribas `_elementor_data` a mano ni despliegues el checkout runtime completo.
- **No** copies el CSS de `EfeonceMention` dentro de la landing: es global.
- **No** declares verificados el envío del formulario, `generate_lead` ni una reserva sin hacerlos de verdad.

## Problemas comunes

- **El botón de reunión no se ve o mide 0.** `<greenhouse-cta>` contiene su ancho (container-type inline-size): necesita
  un ancho explícito, y dentro de una fila flex también lo necesita su contenedor.
- **La ventana de reunión se estira hasta abajo.** Es un `<dialog class="ghc-meeting-surface">` que se agrega a `<body>`
  y se abre con `showModal()` (capa superior, sin peleas de `z-index`). Un diálogo modal tiene `top:0;bottom:0`: necesita
  `height: fit-content`.
- **Una regla para el título del diálogo no aplica.** El bundle de producción no trae la clase `ghc-meeting-titles`;
  apunta a `.ghc-meeting-toolbar>:not(.ghc-meeting-close)`.
- **El fondo no se desplaza mientras la ventana está abierta.** Es esperado: el renderer bloquea el scroll con
  `html.style.overflow=hidden` y lo restaura al cerrar; el foco vuelve al botón.
- **Un botón con borde sobre la foto del hero se ve «incrustado» o con bordes sucios.** Era transparente y quedaba sobre
  la costura entre el panel oscuro y la foto. Un botón de contorno sobre el límite de una foto o un degradado necesita su
  propio fondo (aquí: navy translúcido con desenfoque).
- **En la barra móvil se corta «Agenda una reunión».** El botón del canvas trae `flex:1` en línea; con `flex-basis:0`
  su padding queda fuera del reparto y ocupa 34 px más. Se corrige con `nav.mbar>*{flex:1 1 50%!important;min-width:0}`.
- **Un título de etapa («Amplificar», «Optimizar») se parte a mitad de palabra.** Se resolvió con
  `word-break:normal; overflow-wrap:normal; hyphens:none; white-space:nowrap` y un tamaño `clamp(40px,3.5vw,56px)`.
- **Una regla de la hoja de estilos no gana.** Los estilos en línea que vienen del canvas le ganan; para sobrescribirlos
  hace falta `!important`.
- **`?m=1` devuelve 404.** WordPress lo toma como consulta de fecha. Para saltar la caché usa `?v=`.
- **Cambié un PHP y la web no lo refleja.** El opcache de PHP-FPM tarda 1 a 2 minutos en tomar cambios de un archivo
  existente, aunque WP-CLI ya los vea.
- **La guarda de render falla con `sanitize_key`.** No existe en el stub de la guarda; sanitiza con `preg_replace`.

## Pendientes conocidos

Primer envío real del formulario (HubSpot `succeeded` y GA4 `generate_lead`), primera reserva real, Rich Results Test,
prueba de guardar y recargar en el editor, esconder la barra móvil mientras el formulario está en pantalla (como hace
Performance) y la precarga del formulario desde la página (`TASK-2039`).

## Referencias técnicas

- [Registro de primitives del sitio público](../../architecture/public-site/PRIMITIVES.md#registry)
- [Contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md)
- [Tracking Plan](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md)
- [Configurar un Growth CTA con scheduler nativo](../growth/configurar-cta-scheduler-nativo.md)
- [PDR-026 — Cada landing deriva su patrón de diseño de su necesidad](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)
- [TASK-2039](../../tasks/to-do/TASK-2039-landing-signals-prefill-growth-forms.md)
- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` (`class-eo-inbound-landing-*`,
  `class-eo-source-led-landing-base.php`, `includes/inbound/`, `includes/eo-mention.php`, `assets/js/inbound-landing.js`).
