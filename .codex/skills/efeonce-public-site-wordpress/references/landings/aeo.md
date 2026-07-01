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
- `diagnostic`
- `why`
- `conversion`
- `faq`

Post-hero section headers use Ohio `ohio_badge` widgets with:

```text
.gh-aeo-eyebrow .gh-aeo-eyebrow-badge
.ohio-widget.badge.-outlined
```

Do not reintroduce text-editor eyebrows with lines, pseudo-elements, uppercase, or tracking.

## Hero Guardrail

Do not touch the hero unless explicitly requested.

Protect the right hero widget:

- Elementor widget id: `heroans`
- Expected `settings.html` md5:

```text
e0b951b2456a83578cd9e22005900521
```

Validate this hash before/after unrelated Elementor saves.

## Growth Forms Bridge

The conversion widget `convers` uses a custom HTML bridge, not the generic `<greenhouse-form>` renderer.

Reason: the generic renderer emits Turnstile `captchaToken` since TASK-1294 and has `form-key` since TASK-1297, but TASK-1298's first live migration was reverted because Ohio broke the renderer controls visually. Pre-live parity is now proven with hostile fixture + real-composition preview in memory; the live AEO bridge remains in place until the governed live cutover runs with Elementor backup, `heroans` guard, Kinsta purge and GVC/frame evidence on the saved page.

Scope note: AEO is a critical restored landing with a protected hero and a reverted bridge incident,
so its gate is intentionally stricter than a normal new Growth Form embed. Do not copy AEO-only
requirements (`heroans`, bridge-live guard, AEO copy/layout assertions) into unrelated forms. Reuse
the platform pattern instead: stable `form-key`, live-safe preview, desktop/mobile 390 frame review,
overflow check, and pixel sampling only when host CSS risk justifies it.

Identifiers:

- Form slug: `efeonce-aeo-diagnostic`
- Form definition: `fdef-efeonce-aeo-diagnostic`
- Form key: `b120566a-dd1a-43c8-956a-4e0121e805b8`
- Current published version: `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4` (v5; declares `copy.submit`, preserves `ui_policy_json.security.captcha` and aligns select placeholders)
- Deprecated versions: v4 `fver-dbdd6a02-7e89-4d65-b29e-7228b7475a94`, v3 `fver-9507f6a7-431d-4215-a699-9c713328b69b`, v2 `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657`, v1 `fver-efeonce-aeo-diagnostic-v1`
- Surface: `fhsf-efeonce-aeo-diagnostic`
- API base: `https://greenhouse.efeoncepro.com`
- Turnstile site key in WordPress: `0x4AAAAAADqwX2R7v-k9pItv`
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
- The bridge must use debounced `/verify-email`, `aria-invalid`, `aria-describedby`, field-level errors, and success only after remote verification.

## Conversion Visual Contract

- `.gh-aeo-conversion` owns the section separation as a light band.
- `.gh-aeo-form-card` is a transparent Elementor host: no border, no shadow, no padding.
- `.gh-aeo-growth-form-card` is the only visible card.
- Do not expose internal kickers such as `Growth Forms · Diagnóstico AEO`.
- Public card starts with `Solicita tu diagnóstico AEO`.
- Renderer pre-live layout: desktop pairs short fields/selects (`Nombre` + `Email`, `País` + `Tamaño`) and keeps long intent fields full-width; mobile 390 stacks to one column with no horizontal overflow.

Typography:

- Conversion H2 and `.gh-aeo-growth-form-title` must compute `letter-spacing:-0.045em`.
- Lead, labels, inputs, selects, CTA, trust, privacy, and errors must remain `normal/0`.
- Verify computed style, not just static CSS.

Mandatory gate after touching conversion/form CSS or HTML:

```bash
pnpm public-website:verify-aeo-form-typography
pnpm public-website:verify-aeo-prelive-contract
```

Mandatory renderer pre-live gate after touching `src/growth-forms-renderer/**` for AEO:

```bash
pnpm public-website:verify-aeo-prelive-contract
```

## FAQ Contract

- FAQ root: `faq5b46`, `.gh-aeo-faq`.
- FAQ header: `faqeyeb` uses eyebrow `Antes de avanzar`; the `ohio_heading` title is `Respuestas claras para decidir`. Keep the header decision-oriented, not generic `Preguntas frecuentes`.
- FAQ widget: `faqlist`, `ohio_accordion`, `.gh-aeo-faq-accordion`, 9 tabs.
- Schema/init widget: `schema3`, `.gh-aeo-jsonld`.
- Keep JSON-LD `ProfessionalService` + `FAQPage` in `schema3`.
- FAQ copy is decision-oriented: explain what AEO optimizes, 5 levels, SEO difference, diagnostic deliverable, price, timing, contract/permanence, industry fit, and HubSpot dependency.
- When `faqlist` copy changes, sync the `FAQPage` node inside `schema3` JSON-LD `@graph` in the same `Document::save()`.
- Current scoped initializer: `gh-aeo-faq-accordion-init-v5`.
- The initializer owns click/keyboard, ARIA, measured-height motion, and toggle-close behavior. Clicking an open item must close it and leave no active item (`activeIndex=-1`).
- Do not restore `height:auto`/`display:none` as the transition mechanism; it causes the visible pop. Use measured pixel height and reduced-motion fallback.
- Current visual treatment is a lightweight editorial list, not a card. `.gh-aeo-faq-accordion` and inner `.ohio-widget.accordion` must stay transparent with `border:0`, `box-shadow:none`, `border-radius:0`.
- Do not restore the teal answer rail; `.accordion-body` must not use `border-left`.
- Current CSS markers: `gh-aeo-faq-compact-density-v1`, `gh-aeo-faq-compact-density-v2`, `gh-aeo-faq-accordion-motion-v1`, `gh-aeo-faq-accordion-motion-v2`, `gh-aeo-faq-editorial-list-v1`, `gh-aeo-faq-editorial-list-v2`, `gh-aeo-faq-editorial-list-v3`.

## Verification Checklist

- `heroans` hash unchanged for non-hero work.
- Desktop and mobile 390px screenshots/measurements.
- `scrollWidth == clientWidth`.
- 7 post-hero Ohio badges if post-hero section headers are touched.
- FAQ accordion opens, closes on second click, and animates with intermediate heights.
- Conversion form has one visible card, no technical kicker.
- Bridge/live baseline + renderer pre-live frame gate + WordPress guard passes: `pnpm public-website:verify-aeo-prelive-contract`. The frame review must include fresh/nonblank PNGs plus pixel sampling of real input/select/CTA boxes.
- Required errors inline for `firstName`, `email`, `brandWebsite`.
- Gmail/free email: `/verify-email >= 1`, `/submit = 0`, inline error.
- Corporate email: `/verify-email >= 1`, field success before Turnstile/submit.
- Submit without token fails as `captcha_failed/missing_token` and creates no lead.
