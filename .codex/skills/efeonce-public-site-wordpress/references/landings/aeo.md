# Landing: AEO `/aeo-2/`

Canonical doc: `docs/documentation/public-site/aeo-landing-elementor.md`.

## Identity

- URL: `https://efeoncepro.com/aeo-2/`
- WordPress `postId`: `250265`
- Title: `AEO`
- Status: `publish`
- Current live page: `/aeo-2/`
- Do not touch Home: `postId=2791`
- Do not revive old `/aeo`: `postId=250255`, discarded/trash

## Section Map

Root sections:

- `hero`
- `market`
- `pipeline`
- `levels`
- `service`
- `why`
- `diagnostic`
- `conversion`
- `faq`

Post-hero section headers use Ohio `ohio_badge` widgets with:

```text
.gh-aeo-eyebrow .gh-aeo-eyebrow-badge
.ohio-widget.badge.-outlined
```

Do not reintroduce text-editor eyebrows with lines, pseudo-elements, uppercase, or tracking.

Current approved market copy:

- H2 `marketh`: `El descubrimiento se mudó a la búsqueda con IA. La mayoría de las marcas son invisibles ahí.`
- Card 2 body: `De los consumidores ya usa búsqueda con IA, y la mayoría la prefiere para decidir qué comprar — en todas las generaciones.`
- Card 3 body: `Probabilidad de que los motores de IA repitan la misma lista de marcas en dos respuestas. Sin un sistema, tu aparición es azar.`
- Bottom statement: `SEO te hacía rankear. AEO decide si los motores de IA te mencionan, te citan y te recomiendan — antes de que exista un clic.`

Current approved pipeline copy:

- H2: `Aparecer en las respuestas de IA no es vanidad. Es pipeline.`
- Lead: `Cuando tu marca es la que los motores de IA nombran, ganas algo más que visibilidad: ganas la conversación de compra antes que tu competencia. Y el tráfico que llega desde ahí llega más decidido a comprar.`
- Card 1 body: `Los visitantes que llegan desde motores de IA convierten cerca de 4,4 veces más que los de búsqueda orgánica: llegan pre-calificados por el propio motor.`
- Card 2 body: `De los leads de Docebo ya provienen del tráfico de IA tras priorizar su visibilidad en motores generativos.`
- Bottom statement: `Por eso el AEO no es un experimento de marketing: es un canal de adquisición temprano, con ventaja para quien llega primero.`

Pipeline visual contract:

- Proof cards use compact proof tiles (`gh-aeo-pipeline-compact-proof-tiles-v1`), not the previous giant row-card layout.
- Semrush source mark must use the real AXIS/primitive SVG logotype inline (`semrush-logotype.svg`, `viewBox="0 0 363 44"`), not local text styled as a wordmark.
- Docebo remains an inline accessible wordmark; HubSpot uses the SVG served from WordPress.

Current approved levels copy:

- H2: `El AEO tiene <span class="gh-aeo-levels-title-accent">cinco niveles</span>. Estar indexado te deja en el nivel 1 o 2; del 3 en adelante hay que construirlo.`
- Lead: `¿En cuál estás tú? Léelos hacia abajo: el primero que no te describa es tu próximo nivel. Cada nivel que subes cambia cuánto te recomiendan los motores de IA.`
- Level 1 body: `Estás indexado y visible para buscadores y motores de IA. Si no te encuentran, nada de lo demás importa.`
- Level 2 body: `Los motores de IA leen tu estructura, tu schema y tu contenido sin ambigüedad.`
- Level 3 body: `Lo que los motores de IA dicen de ti es verdad: sin features inventadas, precios viejos ni confusión con tu competencia. Que te lea no es que te describa bien.`
- Level 4 body: `Un agente de IA puede comparar, reservar o comprar en tu sitio sin fricción.`
- Level 5 body: `Eres parte de cómo los motores de IA entienden tu categoría: cuando alguien pregunta, tu marca es la recomendación por defecto.`

Current approved service section:

- Root id/classes: `servic`, `.gh-aeo-service gh-aeo-service-method`; inserted after `levels9` and before `why5421`.
- CSS markers: `gh-aeo-service-method-v1`, compact state `gh-aeo-service-method-density-v3`, result marker `gh-aeo-service-result-v1`, icon style widget marker `gh-aeo-service-card-icons-v1`, rhythm cleanup `gh-aeo-service-rhythm-cleanup-v1`.
- Eyebrow: `El servicio`
- H2: `Un tablero te muestra el problema. Cerrarlo es otra historia.`
- Lead: `No te entregamos un score y te deseamos suerte. Nos hacemos cargo de tu visibilidad en los motores de IA: con Surround Discovery —nuestro motor— subimos tu marca por la escalera, nivel a nivel y mes a mes, hasta que te prefieran.`
- Card 1: `01 · Medir` / `Medimos, siempre` / `Monitoreamos tu visibilidad en ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude, por mercado y por prompt. Sabes dónde estás y cómo te mueves, mes a mes.`
- Card 2: `02 · Crear` / `Creamos activos que los motores de IA citan` / `Construimos el contenido y la arquitectura que los motores entienden, citan y reproducen — para máquinas y para humanos. No "más contenido": el correcto.`
- Card 3: `03 · Distribuir` / `Te ponemos en cada superficie` / `Distribuimos tu presencia donde los motores de IA descubren marcas, no solo en tu sitio. Apareces donde se toma la decisión.`
- Card 4: `04 · Optimizar` / `Optimizamos en loop` / `Cada ciclo aprende del anterior: subimos un nivel, medimos, corregimos y volvemos a subir. La visibilidad ante los motores de IA no se "logra"; se sostiene.`
- Card icons: decorative/contextual 3D PNGs inside `serv1cat`-`serv4cat` as `.gh-aeo-service-card-icon`, `alt="" aria-hidden="true"`. WordPress attachment IDs: `250642` measure, `250643` create, `250644` distribute, `250645` optimize. Source files live in `docs/assets/public-site/aeo-service-icons/`. Scope icon CSS to `.elementor-element-servic`, not `#servic`, because Elementor renders `data-id="servic"` plus class rather than a DOM id.
- Note: `Cómo trabajamos: funcionamos como tu equipo de AEO dedicado. Empezamos por el diagnóstico, priorizamos por impacto, ejecutamos en ciclos y te reportamos el avance en la escalera. Combinamos las mejores herramientas del mercado con sistemas propios, pero el método conduce. Medible por etapas, sin amarres.`
- Result: `El resultado: dejas de aparecer por azar. Subes de visible a preferido — y esa preferencia llega a la conversación de compra antes que tu competencia.` (`visible` and `preferido` are emphasized with `<em>`).
- Visual contract: static editorial service section, compact H2 aligned to post-hero scale, desktop 2x2 low cards, mobile 390 one column, no ornamental hover/motion and no center rail/pseudo-line behind the cards. The header-to-grid gap is measured by the grid margin only: 48px desktop and 32px mobile. The teal service title accent must inherit the H2 tracking in desktop and mobile.

Current approved why section:

- Root id/classes: `why5421`, `.gh-aeo-why gh-aeo-why-optimized gh-aeo-why-reference-layout`; positioned after `servic` and before `diagnos`.
- CSS markers: `gh-aeo-why-reference-layout-v1`, rhythm cleanup `gh-aeo-section-rhythm-cleanup-v1`.
- Eyebrow: `Por qué nosotros`.
- H2: `No improvisamos el AEO. Lo operamos con método propio y casos reales.` with the second sentence as teal color-only accent. The accent span must inherit the H2 tracking; do not let it fall back to `letter-spacing: normal`.
- Navy panel: `¿Y si esto lo hace mi propio equipo?` plus the literal reference body and three internal cards with teal bullet dots:
  - `Velocidad. Levantarlo desde cero toma meses de curva de aprendizaje, y el AEO premia a quien llega primero.`
  - `Método. No es "alguien que sepa de IA": es un sistema probado —Surround Discovery—, multimercado y en español.`
  - `Foco. Tu equipo sigue en lo suyo; nosotros traemos la ejecución ya andando, sin desenfocarlo.`
- Navy panel close: `Complemento, no reemplazo: te damos un sistema probado y velocidad.`
- Why rhythm: because the header has no lead paragraph, the navy panel should sit closer than normal content: 40px desktop, 32px mobile. Do not restore stacked `header margin-bottom` + panel `margin-top`.
- Proof: `Marcas que ya confían en nosotros`, separado del panel navy; widget `greenhouse_logo_marquee` (`whylogom`) con 7 logos únicos en 3 sets idénticos (`sky`, `anam`, `gobierno-santiago`, `berel`, `carozzi`, `bresler`, `marca-chile`) y proof row tipo `TeamAvatarGroup` con discos solapados en color de Berel, Sky y Bresler, `+120 marcas - 4 países` con ícono flat de mundo (Inter/sistema, no mono/dashed box genérico). La pill debe sentirse como proof caption secundario: sombra muy baja, borde sutil, globe inline slate sin círculo teal. Validar visualmente por fases; no usar assets que ocupan ancho pero quedan invisibles o abren huecos perceptibles.
- Typography guard: display tracking is allowed only on H1/H2 display titles and their accent spans (`herotit`, `levelsh`, `serviceh`, `whyhead`); internal H3/proof labels/body/pills stay `normal/0`.
- Old `whygrid`, `whycred`, and `whyearl` are not visible in the current reference layout.
- Elementor class note: update both `css_classes` and `_css_classes` for container classes; `css_classes` is what renders on the live root.
- Post-hero rhythm guard: avoid double gaps between section headers and first content. Current measured contract is 52px desktop / 28px mobile for normal post-hero sections, 48px / 32px for `service`, and 40px / 32px for `why`. The cleanup marker also removes extra top margins from `pipeline`, `diagnostic`, and `faq` content blocks.

Current approved diagnostic section:

- Root id/classes: `diagnos`, `.gh-aeo-diagnostic gh-aeo-diagnostic-optimized`; positioned after `why5421` and before `convers`.
- Eyebrow: `El primer paso del servicio`.
- H2: `Tu Diagnóstico de Visibilidad en IA`.
- Lead: `Antes de mover nada, vemos exactamente dónde estás. Gratis y personalizado: es el mapa con el que arrancamos a subirte por la escalera.`
- Card 1: `Score real` / `Tu score real en ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude` / `Sabes, con dato, si los motores de IA te ven o te ignoran hoy.` / outcome `Score por motor`.
- Card 2: `Share of voice` / `Tu share of voice vs. tus competidores reales` / `Descubres a quién están recomendando los motores de IA en tu lugar.` / outcome `Mapa competitivo`.
- Card 3: `Prompts críticos` / `Los prompts —en español, por país— donde no apareces` / `Ves el hueco exacto, no una idea vaga.` / outcome `Prompts donde no apareces`.
- Card 4: `Plan priorizado` / `Un plan de acción priorizado` / `Sales con los primeros movimientos claros, no con un PDF que archivas.` / outcome `Primeros movimientos claros`.
- Note: `Lectura experta`; `No es un reporte automático. Nuestro equipo lo interpreta a la luz de tu categoría y tu mercado: qué significan los números para ti y qué hacer con ellos. El dato lo da la máquina; el criterio lo ponemos nosotros.` The words `para ti` are emphasized with `<em>`.
- CTA: `Empieza con un diagnóstico gratis`.
- Diagnostic copy follows the red-line reference screenshot from 2026-07-02. Keep the current 2x2 card layout unless the operator explicitly asks for the reference's flat row layout.

## Hero Guardrail

Do not touch the hero unless explicitly requested.

Current approved hero copy:

- Badge `herotag`: `AEO · Visibilidad en IA`
- Subcopy `herosub`: `Hacemos que los motores de IA —<strong>ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude</strong>— entiendan, citen y recomienden tu marca cuando tu comprador pregunta.`
- CTA `herobut`: `Empieza con un diagnóstico gratis`, linked to `#diagnostico`.
- Reassurance `heronot`: `En 24–48h sabes en qué nivel estás — y por dónde empezamos a subirte · Sin costo · Sin compromiso`.

Protect the right hero widget:

- Elementor widget id: `heroans`
- Expected `settings.html` md5:

```text
e0b951b2456a83578cd9e22005900521
```

Validate this hash before/after unrelated Elementor saves.

## Growth Forms Renderer

The conversion widget `convers` uses the generic `<greenhouse-form>` renderer by stable Growth Forms `form-key`.
Its root container renders HTML id `diagnostico`; all non-form Ohio CTAs that send visitors to the form must use `#diagnostico`. The Growth Forms submit CTA remains the renderer `<button type="submit">`, not an anchor.

Live status: TASK-1298 cutover completed 2026-07-01 with Elementor `Document::save`, backup meta `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`, Kinsta purge and `heroans` unchanged (`e0b951b2456a83578cd9e22005900521`). Do not restore the temporary bridge unless the operator explicitly requests rollback.

Scope note: AEO is a critical restored landing with a protected hero and a reverted bridge incident,
so its gate is intentionally stricter than a normal new Growth Form embed. Do not copy AEO-only
requirements (`heroans`, live renderer guard, AEO copy/layout assertions) into unrelated forms. Reuse
the platform pattern instead: stable `form-key`, live-safe preview, desktop/mobile 390 frame review,
overflow check, and pixel sampling only when host CSS risk justifies it.

Identifiers:

- Form slug: `efeonce-aeo-diagnostic`
- Form definition: `fdef-efeonce-aeo-diagnostic`
- Form key: `b120566a-dd1a-43c8-956a-4e0121e805b8`
- Current published version: `fver-f2f8abde-3b11-42b3-bf78-a309ef7678ad` (v7; `style_variant=diagnostic_premium`, declares `copy.submit="Empezar con mi diagnóstico →"`, preserves `ui_policy_json.security.captcha` and aligns premium select placeholders/listboxes)
- Deprecated versions: v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d`, v5 `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4`, v4 `fver-dbdd6a02-7e89-4d65-b29e-7228b7475a94`, v3 `fver-9507f6a7-431d-4215-a699-9c713328b69b`, v2 `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657`, v1 `fver-efeonce-aeo-diagnostic-v1`
- Surface: `fhsf-efeonce-aeo-diagnostic`
- API base: `https://greenhouse.efeoncepro.com`
- Turnstile site key in render contract: `0x4AAAAAADqwX2R7v-k9pItv`
- HubSpot portal: `48713323`
- HubSpot form GUID: `8649e76c-8b01-41f3-9b0c-5713d7b4dba6`

Fields:

- `firstName`
- `email`
- `brandWebsite`
- `country`
- `companySize`
- `mainCompetitor`

HubSpot mapping:

- `firstName -> firstname`
- `email -> email`
- `country -> pais_gh`
- `companySize -> tamano_de_la_empresa`
- `mainCompetitor -> marca_de_competencia`
- `brandWebsite` persists in Greenhouse but is not mapped until HubSpot form/property exists.

Email contract:

- `email.validator=corporate_email`
- `validation_schema.emailPolicy={mode:"block_field",field:"email"}`
- `ui_policy_json.security.captcha={provider:"turnstile",required:true,mode:"invisible",siteKey:"0x4AAAAAADqwX2R7v-k9pItv",execution:"submit"}` in the published contract. Public `GET` serializes this and public `POST` fails closed without token.
- Gmail/free/disposable must be blocked inline before `/submit`.
- The renderer must use debounced `/verify-email`, `aria-invalid`, `aria-describedby`, field-level errors, and success only after remote verification.

## Conversion Visual Contract

- `.gh-aeo-conversion` owns the section separation as a light band.
- `.gh-aeo-form-card` is a transparent Elementor host: no border, no shadow, no padding.
- `.gh-aeo-growth-form-card` is the only visible card.
- Do not expose internal kickers such as `Growth Forms · Diagnóstico AEO`.
- Public card starts directly with the rendered form fields; do not restore the old internal H3 `Solicita tu diagnóstico AEO` unless the operator explicitly asks for it.
- Renderer live layout: desktop pairs short fields/selects (`Nombre` + `Email`, `País` + `Tamaño`) and keeps long intent fields full-width; mobile 390 stacks to one column with no horizontal overflow. Single selects use premium combobox/listbox, not the native OS popup.

Typography:

- Conversion H2 and `.gh-aeo-growth-form-title` must compute `letter-spacing:-0.045em`.
- Lead, labels, inputs, selects, CTA, trust, privacy, and errors must remain `normal/0`.
- Verify computed style, not just static CSS.

Mandatory gate after touching conversion/form CSS or HTML:

```bash
pnpm public-website:verify-aeo-form-typography
pnpm public-website:verify-aeo-live-contract
```

Mandatory renderer live gate after touching `src/growth-forms-renderer/**` for AEO:

```bash
pnpm public-website:verify-aeo-live-contract
```

## FAQ Contract

- FAQ root: `faq5b46`, `.gh-aeo-faq`.
- FAQ header: `faqeyeb` uses eyebrow `Antes de avanzar`; the `ohio_heading` title is `Respuestas claras para decidir`. Keep the header decision-oriented, not generic `Preguntas frecuentes`.
- FAQ widget: `faqlist`, `ohio_accordion`, `.gh-aeo-faq-accordion`, 14 tabs.
- Schema/init widget: `schema3`, `.gh-aeo-jsonld`.
- Keep JSON-LD `ProfessionalService` + `FAQPage` in `schema3`.
- FAQ copy follows the updated source HTML `/Users/jreye/Documents/AEO/landing-aeo-efeonce-mockup.html`: what AEO is, AEO/GEO/Answer Engine naming, how ChatGPT recommends a brand, 5 levels, service scope, working model, diagnostic vs service, SEO difference, free-analysis objection, price, timing, contract/permanence, industry/country fit, and HubSpot dependency.
- When `faqlist` copy changes, sync the `FAQPage` node inside `schema3` JSON-LD `@graph` in the same `Document::save()`.
- Current scoped initializer: `gh-aeo-faq-accordion-init-v5`.
- The initializer owns click/keyboard, ARIA, measured-height motion, and toggle-close behavior. Clicking an open item must close it and leave no active item (`activeIndex=-1`).
- Do not restore `height:auto`/`display:none` as the transition mechanism; it causes the visible pop. Use measured pixel height and reduced-motion fallback.
- Current visual treatment is a lightweight editorial list, not a card. `.gh-aeo-faq-accordion` and inner `.ohio-widget.accordion` must stay transparent with `border:0`, `box-shadow:none`, `border-radius:0`.
- Do not restore the teal answer rail; `.accordion-body` must not use `border-left`.
- Current CSS markers: `gh-aeo-faq-compact-density-v1`, `gh-aeo-faq-compact-density-v2`, `gh-aeo-faq-accordion-motion-v1`, `gh-aeo-faq-accordion-motion-v2`, `gh-aeo-faq-editorial-list-v1`, `gh-aeo-faq-editorial-list-v2`, `gh-aeo-faq-editorial-list-v3`.
- Current page-scoped overflow guard: `gh-aeo-page-menu-overflow-guard-v1` hides Ohio's inactive `#site-navigation .sub-menu-wide` only while the nav is not hovered/focused, preventing false horizontal `scrollWidth` during AEO visual captures without patching the global header.

## Verification Checklist

- `heroans` hash unchanged for non-hero work.
- Desktop and mobile 390px screenshots/measurements.
- `scrollWidth == clientWidth`.
- 7 post-hero Ohio badges if post-hero section headers are touched.
- FAQ accordion opens, closes on second click, and animates with intermediate heights.
- Conversion form has one visible card, no technical kicker.
- Renderer live baseline + WordPress guard passes: `pnpm public-website:verify-aeo-live-contract`. The frame review must include fresh/nonblank PNGs plus pixel sampling of real input/select/CTA boxes.
- Required errors inline for `firstName`, `email`, `brandWebsite`.
- Gmail/free email: `/verify-email >= 1`, `/submit = 0`, inline error.
- Corporate email: `/verify-email >= 1`, field success before Turnstile/submit.
- Submit without token fails as `captcha_failed/missing_token` and creates no lead.
