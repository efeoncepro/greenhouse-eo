# Operar la landing Servicios HubSpot (v2)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 2.0
> **Creado:** 2026-08-31 por Codex
> **Ultima actualizacion:** 2026-10-17 por Claude
> **Documentacion tecnica:** contrato v2 pendiente; detalle en el
> [audit de publicación v2](../../audits/public-site/2026-10-16-hubspot-v2-publication.md). El
> [contrato v1](../../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md) es histórico.
> **Documentacion funcional:** [Landing Servicios HubSpot](../../documentation/public-site/hubspot-elementor.md)

## Para qué sirve

Para editar el contenido de [`/servicios-contratar-hubspot/`](https://efeoncepro.com/servicios-contratar-hubspot/)
(página WordPress `244079`), cambiar su diseño de forma gobernada, desplegarlo, republicar la página, operar el
botón «Agendar reunión» del dock móvil y revertir si algo sale mal.

Desde el 2026-10-16 la página es la **v2**: 14 widgets `greenhouse_hubspot_v2_*`. Los once widgets «HubSpot · …»
de la v1 ya no están en esta página; lo que la v1 decía sobre paneles, timeline, licencias o iconografía no aplica.

## Antes de empezar

- Lee el [audit de publicación v2](../../audits/public-site/2026-10-16-hubspot-v2-publication.md): ahí están los
  hashes, snapshots y trampas conocidas.
- El checkout es compartido: corre `git status --short` en Greenhouse y en `efeonce-public-site-runtime` antes de
  tocar nada, y no te lleves cambios ajenos.
- Para cualquier comando WP-CLI, corre primero `pnpm public-website:ssh-check`.
- Los `--eval-file` de este manual apuntan a copias en `./tmp/` de los scripts de `scripts/public-website/`. El
  wrapper sube el archivo local a Kinsta y lo ejecuta; cualquier ruta local sirve, pero copia siempre la versión
  vigente del repo.
- Confirma la identidad: `244079` es `/servicios-contratar-hubspot/`. El republicador toma el contrato Ohio de
  `251981` (Agencia de Medios) y protege los hashes de Home, `249582`, `251279` y `251981`: si alguno cambia
  durante la corrida, aborta.

## Editar textos, imágenes y listas en Elementor

1. Abre `wp-admin/post.php?post=244079&action=elementor`.
2. En el navegador de estructura, cada módulo vive en un contenedor `gh-hsv2-section clb__dark_section` con su
   widget `greenhouse_hubspot_v2_<módulo>`: hero, marquesina, numeros, punto, diferencia, resultados, riesgo,
   agentes, metodo, seguridad, caso, partner, preguntas, agenda.
3. Edita textos, enlaces e imágenes desde los controles; las imágenes se eligen de la biblioteca de Media. En las
   listas (preguntas, resultados, agentes, etc.) agrega, quita o reordena filas. No hay campo para HTML.
4. No dupliques anclas. `#agenda-form` (la card del formulario) y `#agenda` los usa el dock móvil: si cambian, el
   botón «Ir al formulario» y el ocultamiento del dock dejan de funcionar.
5. Guarda, purga la caché y revisa en 1440 y 390 px.

**Ojo al recompilar:** el compilador numera los campos en orden (`fNNN_*`). Un cambio estructural en la fuente
renumera los campos y las ediciones hechas a mano en Elementor quedan huérfanas. Antes de recompilar, lleva a la
fuente lo que se haya editado en Elementor.

## Cambiar el diseño (no el contenido)

El diseño vive en `scripts/public-website/hubspot-v2-source/`:

| Archivo | Qué contiene |
| --- | --- |
| `Main.dc.html` | El canvas aprobado más los ajustes SEO. |
| `host.css` | La capa del host, acotada a `.gh-hsv2`. |
| `page.css` | Reglas de página que deben salir de la landing (body, chrome de Ohio). El compilador las agrega **sin** acotar; cada regla se protege con `:has(.gh-hsv2 …)`. Hoy contiene el `timeline-scope` del body y la regla que aparta la barra inferior de Ohio. |
| `page-custom.css` | CSS de página que el republicador deja en los settings de Elementor. |
| `form.json` | `formKey` y `surface` del Growth Form. |
| `blob-map.tsv`, `assets.json`, `used-assets.json` | Mapa y uso de los assets del canvas. |
| `og/og.html`, `og/og-hubspot.png` | Fuente y resultado de la imagen social de 1200×630. |

Para revisar sin WordPress: `node scripts/public-website/preview-hubspot-v2-local.cjs` escribe
`tmp/hubspot-v2-preview/index.html` con los defaults de cada schema (el formulario sale como un recuadro: el renderer
real sólo existe en el sitio). Si hay media nueva, prepárala con `prepare-hubspot-v2-assets.cjs`.

### Secuencia de despliegue

Desde la raíz de Greenhouse, en este orden:

1. Recompila:

   ```bash
   node scripts/public-website/compile-hubspot-v2-elementor-source.cjs
   ```

   Emite en el repo runtime `wp-content/plugins/eo-elementor-widgets/includes/hubspot-v2/{schemas,templates}/` y
   `assets/css/hubspot-v2-landing.css`.
2. Exporta una baseline viva fresca (queda en `tmp/public-site-code-baselines/<ts>`):

   ```bash
   pnpm public-website:export-live-code
   ```

   Usa siempre una baseline nueva: el deploy compara el hash previo de cada archivo con lo que está vivo y aborta con
   `Live drift` si no calza.
3. Arma el paquete (contrato `hubspot-v2-elementor-release.v1`, salida `tmp/hubspot-v2-elementor-release`):

   ```bash
   node scripts/public-website/build-hubspot-v2-elementor-package.cjs <baseline>
   ```

4. Despliega:

   ```bash
   pnpm public-website:wpcli -- --eval-file ./tmp/deploy-hubspot-v2-elementor-package.php \
     --input-file ./tmp/hubspot-v2-elementor-release/package.zip \
     --input-file ./tmp/hubspot-v2-elementor-release/manifest.json --wp-user 12
   ```

   Sólo acepta rutas de la allowlist v2 (widgets `class-eo-hubspot-v2-landing-*`, `hubspot-v2/**`, `hubspot/seo.php`,
   el loader y los assets v2) y deja un backup en Kinsta en `/tmp/eo-hubspot-v2-widgets-before-<fecha>.tar`.
5. **Sólo si cambió el árbol de módulos o los settings de la página**, republica (sección siguiente). Un cambio de
   CSS o de template se ve con el deploy más una purga.

## Republicar la página

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/republish-hubspot-v2-page.php \
  --input-file ./scripts/public-website/hubspot-v2-source/page-custom.css \
  --input-file ./scripts/public-website/hubspot-v2-source/form.json \
  --input-file ./.auth/hubspot-v2-meeting-cta-surface.json --wp-user 12
```

- El **tercer input** es el JSON de la surface del CTA del dock (`surfaceId` + `embedKey`). Es opcional para el script,
  pero **si lo omites el widget agenda queda sin key y el botón «Agendar reunión» cae al enlace `/agenda/`**.
- Antes de escribir, el script guarda un snapshot `_gh_hubspot_v2_before_<fecha>` (árbol Elementor, settings, metas
  `page_*`/`_page_*` e imagen destacada), prueba cada widget, guarda con `Document::save`, copia las metas Ohio de
  `251981`, relee todo, verifica que las páginas protegidas no cambiaron y purga Kinsta.
- Para que se niegue si alguien tocó la página desde la última lectura, pasa el hash vivo esperado en
  `GH_EXPECT_HASH`. La salida imprime `previousHash`, `hash` y el nombre del snapshot: anótalos en el audit.

## Publicar o rotar el CTA del dock

«Agendar reunión» es el Growth CTA `hubspot-discovery-meeting` (`open_meeting_scheduler` con `meetingSurfaceId
fhsf-efeonce-lead-gen-web` y `schedulerKey discovery`, placement `embedded`, style `minimal`, targeting
`/servicios-contratar-hubspot/`, priority 180, `cta-location=hubspot_mobile_dock`). Tiene su propia surface,
«Efeonce HubSpot landing (WordPress)» (`csur-56a96b52-44ca-43d8-a61f-8c365c211487`, origins `efeoncepro.com` y `www`).

1. Levanta el proxy de Cloud SQL: `pnpm pg:connect`.
2. Corre el publicador:

   ```bash
   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= npx tsx --env-file=.env.local \
     --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-hubspot-meeting-cta.ts
   ```

   Hace author → review → publish, registra o rota la surface y corre un smoke de render. Escribe el embed key con
   permisos 0600 en `.auth/hubspot-v2-meeting-cta-surface.json`. **Ese archivo nunca va al repo.**
3. **Re-correr el publicador rota el key.** El key anterior deja de valer, así que en el mismo momento republica la
   página con el tercer input (sección anterior). Si no lo haces, el dock queda apuntando a un key muerto.
4. Verifica en vivo a 390 px (ver «Verificar»).

No uses el CTA de contacto `contacto-discovery-meeting`: está targeteado sólo a `/contacto/` y no aparece en esta
landing. La configuración general de un CTA con agendador está en
[Configurar un Growth CTA con scheduler nativo](../growth/configurar-cta-scheduler-nativo.md).

## Operar SEO

Título, descripción, frase clave, Open Graph/Twitter e imagen social se aplican con `configure-hubspot-v2-seo.php`,
que recibe un único input: el PNG de `og/og-hubspot.png`. Cada corrida importa el PNG como **adjunto nuevo** y lo
deja como imagen OG/Twitter y destacada (hoy el adjunto `251991`): no lo re-corras sólo para releer valores.

El schema `Service` (`#service`) + `FAQPage` sale del widget de preguntas a través de `includes/hubspot-v2/seo.php`
(WebPage `about → #service`). El adapter v1 `includes/hubspot/seo.php` sigue cargado, pero se salta su `Service`
cuando la página tiene el FAQ v2: no lo borres ni lo reactives.

## Verificar

- 1440 y 390 px: `scrollWidth == clientWidth`, un solo `h1`, los 14 módulos en orden.
- Haz scroll real hasta cada sección antes de medir: las animaciones están ligadas al scroll.
- Dock a 390 px: oculto en el hero, visible a mitad de página (la barra inferior de Ohio se aparta), abre el agendador
  nativo en pantalla completa, Escape lo cierra, se oculta en la agenda y en el footer. En desktop no existe.
- Formulario montado desde el contrato (no el texto alternativo), tres pasos.
- JSON-LD con `Service` y `FAQPage`; header y footer de Ohio sin cambios.
- La medición del dock es de la familia `greenhouse_cta_*` (se distingue por `cta_slug`). La conversión es la
  reserva confirmada por el servidor (`gh_meeting_*`), nunca el click. No hagas reservas de prueba.

## Rollback

**Página:** toma primero un snapshot del estado actual. Lee la opción `_gh_hubspot_v2_before_<fecha>` de la
republicación que quieres deshacer (la primera publicación de la v2 es `_gh_hubspot_v2_before_20261016_214609`, que
contiene la v1). Restaura árbol y settings con `Document::save` —nunca escribiendo `_elementor_data` a mano—, luego
las metas y la imagen destacada desde el snapshot, y purga.

**Archivos del plugin:** restaura el tar `/tmp/eo-hubspot-v2-widgets-before-<fecha>.tar` de Kinsta sólo sobre los
paths del manifest. Los tar de `/tmp` son temporales: verifica que existan antes de contar con ellos.

**SEO:** restaura cada campo desde `_gh_hubspot_v2_seo_before_20261016_214622` (borra los que no existían antes) y
purga.

**Volver a la v1:** los respaldos de la v1 siguen registrados (`_gh_hubspot_rollback_20260830` y los snapshots de copy
del 2026-08-31) en las [auditorías de agosto](../../audits/public-site/2026-08-30-hubspot-elementor-publication.md).
Volver a la v1 es una decisión del operador, no una recuperación de rutina.

## Qué no hacer

- **No** pegues HTML, CSS ni JavaScript en un widget ni agregues un widget HTML.
- **No** edites `_elementor_data` directamente ni llames `Document::save` a mano: usa el republicador.
- **No** despliegues todo el checkout runtime: tiene trabajo de otras sesiones. Usa el paquete acotado.
- **No** pongas reglas de body o del chrome de Ohio en `host.css`: el compilador las reescribe y no llegan. Van en
  `page.css`, protegidas con `:has(.gh-hsv2 …)`.
- **No** llames a un token de plantilla igual que un campo del schema (ver «Problemas comunes»).
- **No** commitees `.auth/hubspot-v2-meeting-cta-surface.json` ni pegues el embed key en el repo o en un audit.
- **No** re-corras el publicador del CTA sin republicar la página después.
- **No** cambies campos, consentimiento o destino del formulario desde la página: son de Growth Forms.
- **No** toques header, footer, Home ni menús para arreglar algo de esta landing.

## Problemas comunes

- **Los paneles quedan sin padding.** Un compilador anterior reescribía `.panel-body` como si fuera `body`. Hoy sólo
  reemplaza `html`/`body` como selectores de elemento; si vuelve a pasar, revisa ese reemplazo antes de tocar CSS.
- **Las cards enlazadas se ponen blancas al pasar el mouse.** Es el subrayado animado de Ohio
  (`.links-underline a:hover`). Está neutralizado en `host.css` dentro de `.gh-hsv2`; no lo quites.
- **Una cifra se parte o el contador termina en 89.** Las cifras son estáticas con `nowrap`; no vuelvas a un contador
  con `@property`.
- **Cards, títulos o barras quedan a medio animar mientras se lee.** Todo reveal debe terminar cuando el elemento entra
  completo (`entry 70–100%`), nunca en `cover N%`.
- **En móvil la comparación pierde la etiqueta, el tachado sale mal o un título se parte («expectativa-s»).** Revisa las
  reglas móviles del audit: etiqueta con `[role=rowheader]{order:-1}`, tachado en un span inline con
  `box-decoration-break: clone`, títulos de panel de 42 px.
- **En desktop las fichas laterales de agentes quedan tapadas.** Su ancho es `min(230px, calc(50% - 132px))`.
- **El dock no aparece, o el botón «Agendar reunión» abre `/agenda/`.** Falta la surface o el key: republica con el
  tercer input; si rotaste el key, ese es el motivo.
- **El dock no se oculta o la barra de Ohio no se aparta.** La regla está en `page.css` (el `timeline-scope` del body y la
  barra). Si se movió a `host.css`, el compilador reescribió `body` y la regla no llega.
- **El botón del dock muestra el valor de un campo en vez del CTA.** Un token de plantilla con el mismo nombre que un
  campo del schema se reemplaza por el valor del campo. Por eso el token del dock se llama `meeting_launcher`.
- **El card del CTA muestra texto o una X además del botón.** El host lo reduce al botón: oculta `.ghc-content` y
  `.ghc-dismiss` y deja el card en `display:flex; gap:0`.
- **En el agendador, a 390 px, el título sale enorme y «Cerrar agenda» se parte en tres líneas.** Es un bug del renderer
  de CTAs (un `font` shorthand con `inherit`, que el navegador descarta). Está corregido en la versión 1.3.1, que llega
  sólo con la próxima publicación de Greenhouse a producción; no lo parches desde la página.
- **El deploy falla con `Live drift`.** La baseline no es fresca o alguien cambió un archivo vivo: exporta otra baseline
  y revisa quién tocó ese archivo antes de reintentar.
- **El republicador falla con `Unrelated page changed`.** Otra sesión editó Home, `249582`, `251279` o `251981` durante
  la corrida. No reintentes a ciegas: confirma qué cambió.

## Referencias técnicas

- [Audit de publicación v2](../../audits/public-site/2026-10-16-hubspot-v2-publication.md)
- [Contrato runtime de Growth Forms](../../architecture/growth-public-forms-runtime-contract.md)
- [Incrustar un formulario de Growth](../growth/incrustar-formulario-wordpress-astro.md)
- [Configurar un Growth CTA con scheduler nativo](../growth/configurar-cta-scheduler-nativo.md)
- [Plan de medición](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md) (§CTAs)
- [Playbook de landings Ohio + Elementor](wordpress-ohio-elementor-landing-playbook.md)
- Fuente: `scripts/public-website/hubspot-v2-source/` y scripts `*-hubspot-v2-*` en `scripts/public-website/`.
- Publicador del CTA: `scripts/growth/publish-hubspot-meeting-cta.ts`.
- Plugin: `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` (`class-eo-hubspot-v2-landing-*`,
  `includes/hubspot-v2/`).
