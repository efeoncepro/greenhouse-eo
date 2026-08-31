# Landing: HubSpot Services

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
