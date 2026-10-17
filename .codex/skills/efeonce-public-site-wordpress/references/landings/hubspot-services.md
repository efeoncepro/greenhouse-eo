# Landing: HubSpot Services

> **Delta 2026-10-16 (noche) — correcciones post-publicación, detalle del dock y renderer CTA 1.3.1.** Complementa los
> dos deltas siguientes (no los repite).
> - **Correcciones de implementación** (en la fuente `hubspot-v2-source/` y el compilador): el compilador
>   reescribía `.panel-body` como `body` (regex) → paneles sin padding; ahora sólo reemplaza `html`/`body` como selectores de
>   elemento. `.links-underline a:hover` de Ohio volvía blancas las cards enlazadas → neutralizado en `host.css` dentro de
>   `.gh-hsv2`. Cifras estáticas (+90, 6, −56%, +10) con `nowrap`; el contador `@property` terminaba en 89. Reveals ligados al
>   scroll que terminaban en `cover 35–60%` dejaban cards/títulos/barras desfasados mientras se leía → todo reveal termina en
>   `entry 70–100%`. Móvil: etiqueta de la comparación antes de cada fila (`[role=rowheader]{order:-1}`), tachado en cada
>   línea (span inline + `box-decoration-break: clone`; el span tachado era ítem flex), grilla «¿Workflow o agente?» a una
>   columna, fichas laterales de agentes ocultas, títulos de panel 42 px (evita «expectativa-s»), áreas táctiles ≥ 44 px, sin
>   indicador de scroll. Desktop: fichas laterales de agentes `width: min(230px, calc(50% - 132px))` y etiqueta «Supervisora»
>   bajo el botón. Se quitó la línea «Bresler: +180 % de ventas digitales · caso publicado» bajo los logos (pedido del
>   operador). Reglas generales en `references/source-led-elementor-patterns.md`.
> - **Dock, lo que falta arriba:** CTA `hubspot-discovery-meeting` = `open_meeting_scheduler` (`fhsf-efeonce-lead-gen-web` /
>   `discovery`), placement `embedded`, style `minimal`, label «Agendar reunión», targeting `/servicios-contratar-hubspot/`,
>   priority 180; surface «Efeonce HubSpot landing (WordPress)» `csur-56a96b52-44ca-43d8-a61f-8c365c211487` (origins
>   `efeoncepro.com` + `www`). El CTA de contacto `contacto-discovery-meeting` no sirve aquí: su targeting es sólo
>   `/contacto/`. El host reduce el card al botón (oculta `.ghc-content`/`.ghc-dismiss`, card `display:flex; gap:0`). Sin
>   soporte de scroll-timeline el dock queda siempre visible, más arriba (84 px); en desktop `display:none`. Las reglas que
>   salen del scope (`timeline-scope`, barra de Ohio) van en `page.css` porque el scoping del compilador también reescribe
>   `body` en `host.css`. **Re-correr el publicador rota el key** → hay que volver a correr `republish-hubspot-v2-page.php`
>   con el archivo nuevo. Publicador: con `pnpm pg:connect` arriba,
>   `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-hubspot-meeting-cta.ts`.
>   Medición: fila en `TRACKING-PLAN.md` §CTAs (familia `greenhouse_cta_*` por `cta_slug`); conversión = receipt
>   server-confirmed `gh_meeting_*`, nunca el click; sin reserva de prueba. Verificado live a 390 px: oculto en el hero,
>   visible a mitad de página con la barra de Ohio oculta, abre el scheduler full-screen, Escape cierra, se oculta en la
>   agenda y en el footer; desktop sin dock.
> - **Secuencia de deploy:** `node scripts/public-website/compile-hubspot-v2-elementor-source.cjs` →
>   `pnpm public-website:export-live-code` (baseline fresca en `tmp/public-site-code-baselines/<ts>`) →
>   `node scripts/public-website/build-hubspot-v2-elementor-package.cjs <baseline>` →
>   `pnpm public-website:wpcli -- --eval-file ./tmp/deploy-hubspot-v2-elementor-package.php --input-file ./tmp/hubspot-v2-elementor-release/package.zip --input-file ./tmp/hubspot-v2-elementor-release/manifest.json --wp-user 12`
>   → sólo si cambia el árbol o los settings:
>   `pnpm public-website:wpcli -- --eval-file ./tmp/republish-hubspot-v2-page.php --input-file ./scripts/public-website/hubspot-v2-source/page-custom.css --input-file ./scripts/public-website/hubspot-v2-source/form.json --input-file ./.auth/hubspot-v2-meeting-cta-surface.json --wp-user 12`.
>   El republicador guarda snapshot `_gh_hubspot_v2_before_<fecha>`, exige `GH_EXPECT_HASH` y protege los hashes de la Home,
>   `249582`, `251279` y `251981`; el deploy deja backup tar en `/tmp/eo-hubspot-v2-widgets-before-<fecha>.tar`.
> - **Commits:** runtime `efeoncepro/efeonce-public-site-runtime` (main, empujados) `28912f9`, `1d3646f`, `8c0a627`,
>   `af2c3c0`, `05fb924` — el «sin push» del delta v2 ya no aplica; greenhouse-eo (develop) `d9340a3f0`, `bc84ee41a`,
>   `6a4db1cfe`, `e6a223022`, `0f065206b` y `e7db7f558` (local al 2026-10-16).
> - **Renderer CTA 1.3.1 (code complete, rollout pendiente):** en el scheduler nativo, `font: 650 .84rem/1 inherit` (y otras
>   tres reglas) son inválidas y el navegador las descarta; el diálogo vive en `<body>` y hereda el CSS de Ohio, así que el
>   título tomaba el `h2` del tema y «Cerrar agenda» quedaba en 74 px partido en tres líneas a 390 px (aquí y en
>   `/contacto/`). Corregido en `src/growth-cta-renderer/styles.ts` + `meeting-action.ts`, guarda
>   `styles-font-shorthand.test.ts`, commit `e7db7f558`; verificado por interceptación del bundle local (128×44 px en una
>   línea a 390 y 820 px). Llega a la página sólo con el release a producción de `renderer-latest.js`. Arquitectura: `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` §29.
> - **Pendientes:** envío real controlado del formulario y lectura en HubSpot; Rich Results Test + solicitud de indexación en
>   GSC; decidir +90 vs +120 empresas; readback del nivel Gold en el directorio de HubSpot; release del renderer 1.3.1.

> **Delta 2026-10-16 (tarde) — dock móvil.** Bajo 760 px, `244079` muestra un dock fijo con «Agendar reunión» y «Ir al
> formulario» (`#agenda-form`). Aparece al salir del hero y se oculta al entrar a `#agenda` (scroll-driven, `timeline-scope`
> en `body` vía `hubspot-v2-source/page.css`, la capa que se agrega SIN scoping); mientras se ve, la `.elements-bar.left` de
> Ohio se aparta y vuelve desde el formulario. «Agendar reunión» es el CTA gobernado `hubspot-discovery-meeting`
> (`open_meeting_scheduler`, scheduler nativo, `cta-location=hubspot_mobile_dock`) con surface propia; publicador
> `scripts/growth/publish-hubspot-meeting-cta.ts` (key 0600 en `.auth/hubspot-v2-meeting-cta-surface.json`, que
> `republish-hubspot-v2-page.php` recibe como tercer input; nunca al repo). Sin surface/key el dock cae a `/agenda/`.
> El token de plantilla es `meeting_launcher`: un token con el mismo nombre que un campo lo reemplaza el valor del campo.

> **Delta 2026-10-16 — v2 publicada (rediseño por los 4 resultados de HubSpot).** El cuerpo de `244079` ya no son los
> 11 widgets `greenhouse_hubspot_*`: son **14 widgets `greenhouse_hubspot_v2_*`** (hero, marquesina, numeros, punto,
> diferencia, resultados, riesgo, agentes, metodo, seguridad, caso, partner, preguntas, agenda) compilados desde el canvas
> Design `https://claude.ai/artifact/K5kub2AHMQzB1sAwACe9X9` (copia en `scripts/public-website/hubspot-v2-source/Main.dc.html`,
> con dos FAQ SEO extra). Pipeline: `prepare-hubspot-v2-assets.cjs` → `compile-hubspot-v2-elementor-source.cjs` →
> `build-hubspot-v2-elementor-package.cjs <baseline>` → `deploy-hubspot-v2-elementor-package.php` (contrato
> `hubspot-v2-elementor-release.v1`) → `republish-hubspot-v2-page.php` (snapshot `_gh_hubspot_v2_before_20261016_214609`:
> árbol, settings, metas Ohio y thumbnail anteriores; hash previo `cc9710c8…`, nuevo `52308ef5…`; metas Ohio copiadas de
> `251981`) → `configure-hubspot-v2-seo.php` (snapshot `_gh_hubspot_v2_seo_before_20261016_214622`; OG/thumbnail
> attachment `251991`; title «Partner HubSpot: implementación de CRM y agentes de IA | Efeonce», focus «partner hubspot»,
> Semrush CL/MX/CO 2026-10-16). Preview local sin WordPress: `preview-hubspot-v2-local.cjs`. Runtime commit en
> `efeonce-public-site-runtime` (feat(hubspot): v2 landing modules…, sin push). Formulario: el mismo Growth Form
> gobernado `efeonce-hubspot-scope` (`bb220383-…`, surface `fhsf-efeonce-hubspot-scope`, multipaso, HubSpot `direct`)
> en tarjeta de papel; el diseño de dos pasos del canvas queda como brief para una versión futura del formulario.
> Schema: el widget `preguntas` emite Service `#service` (cinco países, catálogo sin precios) + FAQPage (6);
> `includes/hubspot-v2/seo.php` agrega `about → #service` y el adaptador v1 (`includes/hubspot/seo.php`) no agrega su
> Service mientras el FAQ v2 esté en la página. Rollback del cuerpo: `Document::save()` con el árbol y settings del
> snapshot + metas; plugin backup `/tmp/eo-hubspot-v2-widgets-before-20261016-214459.tar` (temporal). Verificado live
> 1440/390 sin desborde, 14 módulos, un H1, canonical, OG, Service+FAQPage únicos, formulario paso 1 de 3.
> Decisiones del operador (2026-10-16): fotos cine aprobadas en esta web; leyes de datos por mercado (5 países), nunca
> sólo Chile; sin fotos de Julio (plate HS6b rechazado); cifras ANAM públicas sólo de atención (−56 %, −76 %, 5 rutas,
> 23 fuentes); sin montos. **Todo lo que sigue sobre los 11 widgets v1 es historia** (siguen instalados como rollback).


> **Delta 2026-10-09 — entrega a HubSpot activa.** `efeonce-hubspot-scope` v4 entrega en `direct` al formulario HubSpot «Lead Gen - Servicios HubSpot» (registro `scripts/growth/hubspot-destinations.registry.ts`, herramienta `pnpm growth:forms:activate-hubspot-destinations`). Toda mención posterior en este archivo a destino `disabled`, `greenhouse_only`, sombra o «hasta el cutover» es historia. Evidencia: `docs/audits/public-site/2026-10-09-growth-forms-hubspot-delivery-audit.md`.

## Identity and owners

- URL: `https://efeoncepro.com/servicios-contratar-hubspot/`; WordPress page `244079`, published.
- Menu item `244116`: «Servicios HubSpot»; URL and hierarchy retained.
- Eleven native `greenhouse_hubspot_*` widgets own the body; Ohio owns header/footer.
- Canon: `docs/architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md`.
- Manual/rollback: `docs/manual-de-uso/public-site/hubspot-elementor.md`.
- Initial publication: `docs/audits/public-site/2026-08-30-hubspot-elementor-publication.md`.

The approved Claude Design export replaced the legacy body. Its SHA is
`f95b6254c2434b58a4d6855dded40dd3a38acb19b881e090e1928674ab8bb812`.
Keep that source intact; approved later corrections live in adapters and native content. Do not restore
legacy sections or rejected designs. `/servicios/hubspot/` was not the published migration target.
Consult the task registry for formal TASK-1352 lifecycle; publication alone does not close its broader scope.

Latest recorded editorial readback (2026-08-31):
`cc9710c8adca07e54058c31e7edcecb0a80d78d2c95abf3e8042f3bddd2afe72`.
This is a comparison baseline, not evidence of current live state: re-read WordPress before every write.

## Native content, source regeneration and mutation

The schemas expose 190 root text fields plus repeaters; 23 panels (14 products, four sectors, five stages)
and six FAQ answers render server-side. Text, links and Media remain editable in Elementor.

- Compiler: `scripts/public-website/compile-hubspot-elementor-source.cjs`.
- Brand adapter: `scripts/public-website/hubspot-brand-assets.cjs`.
- Accumulated approved copy: `scripts/public-website/hubspot-editorial-copy.json`, applied by its CJS
  adapter **after** the brand adapter. Repeater patches use stable `_layout` identities, not visible labels.
- Keep field keys stable. Partner keys f029–f031 were retired without renumbering the remaining fields.
- A schema default is not the current saved value. Read the live document; changing defaults alone does
  not replace editor overrides. Update only the intended fields through `Document::save()`.
- Do not blindly regenerate/deploy the full package: preserve normalized fonts/CSS, media adapters and
  accumulated editorial changes. Compare the generated delta before an allowlisted file deployment.

Before remote operations run `pnpm public-website:ssh-check`. Snapshot the page, Elementor tree/settings,
Ohio metadata, featured image and relevant reference-page hashes. Use the wrapper and scoped deployment
manifest with previous/new file SHA; do not overwrite the runtime checkout or directly write `_elementor_data`.

Before `Document::save()`, retain settings and explicitly preserve `post_featured_image` with attachment
`248703` (`EO_Hubspot_Hiro2-2.webp`, observed 2001×801), not inline logo `243106`.
Verify `_thumbnail_id`, `get_the_post_thumbnail_url()`, `page_header_title_background_type`,
`page_header_title_background_*`, and `elementorFrontendConfig.post.featuredImage` afterwards.
The approved hero owns H1; the legacy Ohio headline remains hidden. Never patch the parent theme.

Read back exact expected tree delta, protected metadata and deployed SHA. A guard alert after save can
concern derived Elementor/cache/IndexNow metadata: investigate the persisted result before retrying,
never rerun a mutation just because its final guard stopped. Purge, allow edge propagation, then verify
normal anonymous URL without interception. A stale cached response is not proof that publication failed.
Rollback restores only affected files/fields via native save after checking intervening edits. Check
backup retention before use; dated snapshot names and tar paths belong in the linked audits.

## Design and brand boundaries

The user explicitly separated copy/SEO from design. Text edits may change natural wrapping/height, but
must not change templates, CSS, JS, typography, media, layout, header/footer or form behavior without scope.

- Timeline: transparent stations, terracotta active/completed dots and synchronized progress, keyboard,
  reduced motion and SSR. Do not restore filled white/blue buttons. The first station now reads «Revisar».
- Partner proof: two columns, original badge at 116 px desktop / 96 px mobile; native directory URL retained.
- Hubs: 16 Media controls cover eight official isotipos, three AI-engine logos and five semantic icons.
  The same Media controls drive each card and its SSR panel, including after reordering. Render identity
  before JS; never briefly show the previous selection's logo.
- Official marks: six Hub icons plus Smart CRM and Agent Hub, original SVG geometry/colors/provenance.
  The Agent Hub mark accompanies the approved «Breeze y agentes de IA» label; it is not a discovered
  Breeze wordmark. No dedicated AEO mark was identified in the reviewed kit.
- Semantic Tabler icons in light blue distinguish AEO, Sales Workspace, Customer Success Workspace,
  Marketing Studio and Enablement conversacional. Do not describe them as official HubSpot logos.
- MCP reuses original ChatGPT, Claude and Gemini PNG URLs from `/aeo-2/`; do not duplicate/recolor assets,
  add Perplexity, or infer a newly operational integration from a displayed logo.
- Full light HubSpot wordmark in Licencias uses the operator's express partner authorization for this use.
  ANAM identification/logo was also explicitly requested; neither establishes additional external consent
  documentation nor validates the case's metrics.

Provenance, manifests and QA: `docs/audits/public-site/2026-08-31-hubspot-{brand-assets,product-marks,mcp-logos,semantic-icons}.md`.
Timeline details: `docs/audits/public-site/2026-08-31-hubspot-timeline-partner-fix.md`.

## Editorial contract

Use `copywriting` + `greenhouse-ux-content-accessibility` and the canonical HubSpot offer for further edits.
Scope «resto del sitio» in this review was clarified by the operator to mean **this landing only**.
Do not restore internal jargon such as «consultor de la práctica», unexplained fit, handoff or backlog.

The accumulated overlay covers licensing, proof-ledger, conversion, assessment, FAQ, sectors and delivery.
Keep these distinctions consistent across visible sections and hidden panels:

- Licenses: tools, users, plans and **estimated** AI consumption; no absolute price-parity, savings or
  exact future-consumption promise. Ongoing operation is an agreed service, not automatically included.
- ANAM: customer context, knowledge base, human escalation and responsibilities; approved 56% average,
  76% best month and 100%/44% bars are retained with a result caveat. The detailed backing report remains
  unlocated in the SEO audit. Rewriting or naming the customer is not independent metric validation.
- Gold: partner-program status, not exclusive permission to implement or a guarantee of results.
- First step/conversion: one free hour with a specialist to clarify priorities and next steps. A final
  technical scope/quote is not promised within that hour. Optional Blueprint is separately priced;
  implementation and continued operation depend on their agreed scopes.
- Industries: four panels explain possible operational difficulties and starting points; do not imply
  proven sector expertise without evidence or claim HubSpot replaces an ERP.
- Method: five stages describe action, deliverable and approval. Preserve validation and change-control
  meaning while using plain Spanish.

Editorial evidence and scoped rollback:
`docs/audits/public-site/2026-08-31-hubspot-editorial-copy.md` and
`docs/audits/public-site/2026-08-31-hubspot-industry-method-copy.md`.

## SEO and form ownership

Yoast owns schema; the page-only Service adapter and native social/breadcrumb fields preserve that owner.
Register SEO hooks before `template_redirect`; preserve HTTPS redirect, local icon map/subset and fallback.
Title: «Implementación y operación de HubSpot | Efeonce».
Description: «Implementamos y migramos tu HubSpot, Hub por Hub, y lo operamos contigo. Trabaja con Efeonce, Solutions Partner Gold.»
Body-copy requests do not authorize metadata changes. Read current SEO before editing; do not infer that
GSC processed this version from an older crawl. See `docs/audits/public-site/2026-08-31-hubspot-seo-aeo.md`.

Growth Forms owns `efeonce-hubspot-scope`, variant `hubspot_pillar`, and the pinned canonical renderer.
WordPress must not own duplicate fields, consent, validation or submit logic. Current audit records a
Greenhouse-only destination and no real-lead conversion test; displaying HubSpot copy/logos is not delivery
proof. Keep the brief data-use statement aligned with the canonical form; never promise no third-party
processing. No fake success, test lead or message send without the applicable authorization.

## Proportional verification

Use focused PHP renderer tests and `verify-hubspot-{copy,section-copy,seo,timeline,product-marks,semantic-icons,mcp-logos}`
scripts for the affected surface. For copy, compare exact native tree changes and all panel texts, plus
1414/878/390 px, keyboard, no-JS and motion preferences where interactions are involved. Protect other
widgets/pages, featured image, metadata and the canonical form; do not submit it for a copy-only check.

The Ohio menu can retain desktop hover while resizing and briefly overflow. Move the pointer away and
wait for stable geometry before measuring; do not hide UI, patch the global header, or claim a stable-frame
check proves every animation frame. Preview interception is development evidence; final QA must use the
unmodified anonymous page. Record local edits, CMS save, file publication, live readback and Git commit
separately. Use documentation-governor at closure; keep detailed evidence in audits, not this router.
