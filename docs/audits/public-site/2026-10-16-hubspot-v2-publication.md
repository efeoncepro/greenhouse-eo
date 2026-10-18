# Landing Servicios HubSpot v2 — publicación, correcciones y dock móvil (2026-10-16)

> **Tipo de documento:** Audit / evidencia de rollout
> **Version:** 1.0
> **Creado:** 2026-10-17 por Claude
> **Contrato técnico:** contrato v2 pendiente. Fuente: `scripts/public-website/hubspot-v2-source/`. El
> [contrato v1](../../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md) es histórico.
> **Documentación funcional:** [hubspot-elementor.md](../../documentation/public-site/hubspot-elementor.md) ·
> **Manual:** [hubspot-elementor.md](../../manual-de-uso/public-site/hubspot-elementor.md)

**Publicado y verificado el 2026-10-16.** El cuerpo de `https://efeoncepro.com/servicios-contratar-hubspot/`
(página `244079`) se reemplazó por la v2: un rediseño por los cuatro resultados de HubSpot (Genera demanda / Cierra
negocios / Supera las expectativas de tus clientes / Acelera el crecimiento), con HubSpot presentado como «Agentic
Customer Platform», en 14 widgets nativos `greenhouse_hubspot_v2_*`. Misma URL y misma página: la v1 (once widgets
«HubSpot · …», 2026-08-30) quedó reemplazada. Header y footer canónicos de Ohio, sin HTML forzado.

Origen: reunión con Simón Suárez (PDM de HubSpot) del 2026-10-07 y canvas aprobado
<https://claude.ai/artifact/K5kub2AHMQzB1sAwACe9X9>, línea gráfica «La órbita», acento revenue/HubSpot `#e86bd0` sobre
oscuro y `#8e1b82` sobre claro.

## Publicación inicial (2026-10-16)

| Dato | Valor |
| --- | --- |
| Página | `244079`, `/servicios-contratar-hubspot/` |
| Hash antes | `cc9710c8…` (la v1, mismo prefijo que el último readback de la v1 del 2026-08-31) |
| Hash después | `52308ef5…` |
| Snapshot de rollback | `_gh_hubspot_v2_before_20261016_214609` |
| Snapshot SEO | `_gh_hubspot_v2_seo_before_20261016_214622` |
| Widgets | 14: hero, marquesina, numeros, punto, diferencia, resultados, riesgo, agentes, metodo, seguridad, caso, partner, preguntas, agenda; cada uno en un container `gh-hsv2-section clb__dark_section` |
| Metas Ohio | copiadas de `251981` (Agencia de Medios) |
| Contrato de paquete | `hubspot-v2-elementor-release.v1` |
| Formulario | Growth Form `efeonce-hubspot-scope`, key `bb220383-530e-4b3c-891f-bbdc75d7d112`, surface `fhsf-efeonce-hubspot-scope`, tres pasos, entrega `direct` a HubSpot «Lead Gen - Servicios HubSpot»; card con id `agenda-form` |
| Imagen social y destacada | adjunto `251991` (1200×630, desde `og/og.html`) |

### Pipeline

Clon del pipeline source-led de Agencia de Medios:

- **Fuente** `scripts/public-website/hubspot-v2-source/`: `Main.dc.html` (canvas + deltas SEO), `host.css` (capa host
  acotada a `.gh-hsv2`), `page.css` (nuevo: capa de página que el compilador agrega sin acotar; cada regla se guarda con
  `:has(.gh-hsv2 …)`), `page-custom.css`, `form.json`, `blob-map.tsv`, `assets.json`, `used-assets.json`, `og/og.html` y
  `og/og-hubspot.png`.
- **Compilador** `compile-hubspot-v2-elementor-source.cjs` → emite en el repo runtime
  `wp-content/plugins/eo-elementor-widgets/includes/hubspot-v2/{schemas,templates}/` y
  `assets/css/hubspot-v2-landing.css`.
- **Widgets PHP** `includes/widgets/class-eo-hubspot-v2-landing-base.php` + `class-eo-hubspot-v2-landing-widgets.php`.
- **SEO** `includes/hubspot-v2/seo.php` (WebPage `about → #service`); el adapter v1 `includes/hubspot/seo.php` se salta su
  `Service` cuando la página tiene el FAQ v2.
- **Scripts** `prepare-hubspot-v2-assets.cjs`, `build-hubspot-v2-elementor-package.cjs` (salida
  `tmp/hubspot-v2-elementor-release`), `deploy-hubspot-v2-elementor-package.php` (allowlist de rutas hubspot-v2 +
  `hubspot/seo.php`; backup `/tmp/eo-hubspot-v2-widgets-before-<fecha>.tar`), `republish-hubspot-v2-page.php` (inputs
  `page-custom.css`, `form.json` y opcional `meeting-cta.json`; snapshot `_gh_hubspot_v2_before_<fecha>`; guard
  `GH_EXPECT_HASH`; protege los hashes de Home, `249582`, `251279` y `251981`), `configure-hubspot-v2-seo.php` y
  `preview-hubspot-v2-local.cjs` (render local a `tmp/hubspot-v2-preview/index.html`).

Secuencia de deploy registrada:

```bash
node scripts/public-website/compile-hubspot-v2-elementor-source.cjs
pnpm public-website:export-live-code            # baseline fresca en tmp/public-site-code-baselines/<ts>
node scripts/public-website/build-hubspot-v2-elementor-package.cjs <baseline>
pnpm public-website:wpcli -- --eval-file ./tmp/deploy-hubspot-v2-elementor-package.php \
  --input-file ./tmp/hubspot-v2-elementor-release/package.zip \
  --input-file ./tmp/hubspot-v2-elementor-release/manifest.json --wp-user 12
# sólo si cambia el árbol o los settings:
pnpm public-website:wpcli -- --eval-file ./tmp/republish-hubspot-v2-page.php \
  --input-file ./scripts/public-website/hubspot-v2-source/page-custom.css \
  --input-file ./scripts/public-website/hubspot-v2-source/form.json \
  --input-file ./.auth/hubspot-v2-meeting-cta-surface.json --wp-user 12
```

## SEO y schema

- Semrush CL/MX/CO (2026-10-16): «implementación hubspot» ≈ 0; la demanda está en «hubspot crm», «que es hubspot» y
  «partner hubspot».
- Title «Partner HubSpot: implementación de CRM y agentes de IA | Efeonce».
- Meta «Somos Partner Gold de HubSpot. Implementamos y operamos tu CRM y sus agentes de IA para generar demanda, cerrar
  negocios y cuidar a tus clientes.».
- Focus «partner hubspot»; OG/Twitter propios; OG attachment `251991`, también imagen destacada.
- Schema: `Service` `#service` (cinco países; catálogo con los cuatro resultados + agentes + Blueprint + operación) +
  `FAQPage`. Yoast sigue siendo dueño de WebPage/WebSite/Organization.

## Rondas de corrección (2026-10-16)

Después de la publicación inicial:

| Problema | Causa | Corrección |
| --- | --- | --- |
| Paneles sin padding | El compilador reescribía `.panel-body` como selector `body` (regex) | Sólo reemplaza `html`/`body` como selectores de elemento |
| Cards enlazadas se volvían blancas al hover | Ohio `.links-underline a:hover` anima un subrayado de fondo en todo enlace | Neutralizado en `host.css` dentro de `.gh-hsv2` |
| Cifra en 89 en vez de +90 | El contador con `@property` terminaba en 89 | Cifras estáticas (+90, 6, −56%, +10) con `nowrap` |
| Cards, títulos y barras desfasados al leer | Rangos de animación terminaban en `cover 35–60%` | Regla: todo reveal termina cuando el elemento entra completo (`entry 70–100%`), nunca en `cover N%` |
| Comparación sin etiqueta en móvil | Orden de la fila | `[role=rowheader]{order:-1}` |
| Tachado roto en móvil | El span tachado era ítem flex | Se envuelve en un span inline + `box-decoration-break: clone` |
| Móvil: grilla «¿Workflow o agente?», fichas de agentes, títulos | — | Grilla a una columna, fichas laterales ocultas, títulos de panel 42 px (evita «expectativa-s»), áreas táctiles ≥44 px, sin indicador de scroll |
| Desktop: fichas laterales de agentes tapadas | Ancho fijo | `width: min(230px, calc(50% - 132px))`; etiqueta «Supervisora» bajo el botón |
| Línea «Bresler: +180 % de ventas digitales · caso publicado» bajo los logos | Pedido del operador | Retirada |

## Dock móvil (2026-10-16)

- **Comportamiento:** a ≤760 px, dock fijo (cápsula translúcida, dos botones de 48 px): «Agendar reunión» e «Ir al
  formulario» (`#agenda-form`). Aparece al salir del hero y se oculta al entrar a `#agenda`, por scroll (`view-timeline`
  `--gh-hero` y `--gh-agenda`, `timeline-scope` en body vía `page.css`). Mientras se ve, `.elements-bar.left` de Ohio
  (switch claro/oscuro) se aparta y vuelve desde el formulario. Sin soporte de scroll-timeline: dock siempre visible, a
  84 px. En desktop `display:none`.
- **CTA gobernado `hubspot-discovery-meeting`:** `open_meeting_scheduler` (`meetingSurfaceId fhsf-efeonce-lead-gen-web`,
  `schedulerKey discovery`), placement `embedded`, style `minimal`, label «Agendar reunión», targeting
  `/servicios-contratar-hubspot/`, priority 180, `cta-location=hubspot_mobile_dock`.
- **Surface propia** «Efeonce HubSpot landing (WordPress)» `csur-56a96b52-44ca-43d8-a61f-8c365c211487` (origins
  `efeoncepro.com` + `www`).
- **Publicador** `scripts/growth/publish-hubspot-meeting-cta.ts` (clon del de influencers, TASK-1598): author → review →
  publish + register/rotate surface + smoke de render. El embed key se escribe 0600 en
  `.auth/hubspot-v2-meeting-cta-surface.json` y no entra al repo; `republish-hubspot-v2-page.php` lo recibe como tercer
  input y lo deja en los settings del widget agenda. Re-correr el publicador rota el key y obliga a republicar. Sin
  surface/key, el dock cae a un enlace a `/agenda/`.
- `contacto-discovery-meeting` está targeteado sólo a `/contacto/`; por eso no sirve en otra landing.
- El host reduce el card del CTA a su botón (patrón de contacto): oculta `.ghc-content`/`.ghc-dismiss`, card
  `display:flex; gap:0`.
- **Trampas:** (a) un token de plantilla con el mismo nombre que un campo del schema lo reemplaza el valor del campo →
  el token del dock se llama `meeting_launcher`; (b) el acotado del compilador reescribe `body` también en `host.css` →
  las reglas de página van en `page.css`.
- **Medición:** fila en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` §CTAs (familia `greenhouse_cta_*`, se
  distingue por `cta_slug`). Conversión = contrato `gh_meeting_*` (receipt server-confirmed), nunca el click. Sin
  reserva de prueba.

## Renderer de CTAs 1.3.1 (code complete, rollout pendiente)

- **Bug:** en el diálogo del agendador nativo, `font: 650 .84rem/1 inherit` (y otras tres reglas) son inválidas
  —`inherit` no puede ir dentro del shorthand `font`— y el navegador descarta la declaración. El título tomaba el `h2` de
  Ohio y «Cerrar agenda» quedaba en 74 px partido en tres líneas a 390 px, en `/servicios-contratar-hubspot/` y en
  `/contacto/`.
- **Fix** en `src/growth-cta-renderer/styles.ts` (longhands con `font-family: inherit`; botón `flex: none` + `nowrap`) y
  `meeting-action.ts` (contenedor de títulos `.ghc-meeting-titles` con `min-width: 0`); `RENDERER_VERSION` 1.3.0 → 1.3.1;
  guarda `src/growth-cta-renderer/__tests__/styles-font-shorthand.test.ts` (57 tests verdes).
- **Verificado** sirviendo el bundle local por interceptación sobre las dos páginas reales: botón de 128×44 px en una
  línea a 390 y 820 px, cabecera sin overflow.
- **Estado:** commit `e7db7f558` en develop, local y sin empujar. Llega a los hosts sólo con el release a producción
  (`renderer-latest.js`).
- **Trampa:** `RENDERER_CSS` es un template literal; un backtick en un comentario CSS lo cierra.

## Verificación en vivo

- Publicación inicial: hash `cc9710c8…` → `52308ef5…` con snapshot; SEO aplicado con su snapshot.
- Dock a 390 px: oculto en el hero, visible a mitad de página (barra de Ohio oculta), abre el agendador nativo (diálogo a
  pantalla completa), Escape cierra, se oculta en la agenda y en el footer. Desktop sin dock.
- Renderer 1.3.1: verificado por interceptación local, no en producción.

## Commits

| Repo | Rama | Commits | Estado |
| --- | --- | --- | --- |
| `efeoncepro/efeonce-public-site-runtime` | main | `28912f9`, `1d3646f`, `8c0a627`, `af2c3c0`, `05fb924` | empujados |
| greenhouse-eo | develop | `d9340a3f0`, `bc84ee41a`, `6a4db1cfe`, `e6a223022`, `0f065206b` | empujados |
| greenhouse-eo | develop | `e7db7f558` (renderer CTA 1.3.1) | local, sin empujar |

## Pendientes

- Envío real del formulario (prueba controlada) y lectura del lead en HubSpot.
- Rich Results Test y solicitud de indexación en Search Console.
- Decidir +90 vs +120 empresas; readback del nivel Gold en el directorio de HubSpot.
- Release a producción del renderer de CTAs 1.3.1.
- Republicaciones posteriores (dato del orquestador): las rondas de corrección sólo reinstalaron el paquete del plugin
  (respaldos `/tmp/eo-hubspot-v2-widgets-before-20261016-215545.tar`, `-221116`, `-221620` y `-230544` en Kinsta), sin
  republicar el árbol. El dock republicó una vez: hash `52308ef5…` → `ad862750…`, snapshot
  `_gh_hubspot_v2_before_20261016_231745`; sus ajustes posteriores volvieron a ser sólo paquete (respaldos `-231711`,
  `-231818`, `-232059`, `-232231`, `-232417`).
- Contrato técnico v2 en `docs/architecture/public-site/` (hoy sólo existe el de la v1).
- Saldos de proveedores de media al 2026-10-16: Fal con ambas cuentas negativas (A −0,29 USD, B −0,35 USD); Higgsfield
  3.690,6 créditos (plan Ultra).

## Límites

- No se hizo envío real del formulario ni reserva de prueba: no se afirma lead creado ni conversión.
- No se corrió Rich Results Test ni se pidió indexación.
- Los tar de `/tmp` en Kinsta son temporales.
