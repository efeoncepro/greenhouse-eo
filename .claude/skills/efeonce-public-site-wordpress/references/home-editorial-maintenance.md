# Home editorial maintenance

Use with copywriting and the landing reference when editing Efeonce's public Home. This is a
maintenance contract, not a source of live claims. Current content, hashes and recovery:
`docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md` and the linked dated audits.

## Message and evidence

- For this Home, the operator selected a challenging voice for medium and large companies. Preserve
  the approved hero and its highlighted phrase unless a new instruction changes them. Explain a
  concrete cost or benefit to the client's team; avoid diagnosing every visitor as disconnected.
- Explain what software lets the client do. Ownership of software is not sufficient differentiation;
  Greenhouse's role here is project/deliverable/metric follow-up, not an unsupported growth guarantee.
- Compare working arrangements, scope and responsibilities. Do not invent competitor scores or
  universal yes/no capability claims. An illustrative diagram or dashboard must be identified as such.
- Keep FAQ when they resolve buying objections. An initial meeting sets context and next steps;
  do not promise a complete diagnosis or tailored plan within a short introductory call.
- Keep offer/category/brand doctrine in its existing owners. A page-specific wording decision does
  not change the commercial nature, rollout stage or availability of a product.

## Native editing and typography

- Inventory persisted widget values, including repeater IDs/layout/order, hidden notices, hover text
  and optional states. Change native fields through guarded Document::save; do not replace the page
  with a new source export or write _elementor_data directly. A schema default is not a page override.
- Reuse escaped text controls and semantic templates. FAQ uses `answer_lead` (strong), `f003_texto`
  (body paragraph) and optional `answer_note`; never require the operator to enter arbitrary HTML.
- Hierarchy: one main emphasis, readable body, separate supporting paragraphs. Use existing public
  tokens and loaded fonts; the FAQ adapter uses Geist/body-lg, 1rem, line-height 1.6 and a 66ch limit.
  Empty optional fields must not reserve space. Check inline styles before choosing override scope.
- Comparison cells are editable descriptions, not decorated scores. The branded heading reads
  native `Con` plus the official logo, with alt `Efeonce`; keep table row/column semantics.
- A wrapping emphasis must not break an SVG underline. Verify the actual rendered phrase and stroke
  at desktop/mobile widths; coordinate systems, stroke scaling and dash lengths must agree.

## Verification and closure

- Before mutation: guard page ID/status/ownership and the full document hash; compare previous
  runtime file hashes and create backups. Preserve settings, Yoast, media, URLs and unrelated pages.
- Validate the saved tree, text, controls and live file hashes separately. Preview images and a
  successful CLI exit alone do not prove persistence; inspect returned error/status fields.
- Cache purges may take time. Read the normal public URL again before declaring publication. A
  cache-busting QA URL can isolate stale delivery, but return to and verify the normal URL as well.
- Check desktop and mobile open/closed/hover states. Inspect text fit, card collisions and document
  overflow. Internal table scrolling is intentional; clipped decorative effects are not text overflow.
- Record applied changes, snapshots, evidence and remaining risks. Do not certify authenticated
  Elementor save/reopen, cross-frame keyboard navigation, booking/analytics or unsupported business
  claims from a text/renderer pass. Separate CMS publication, local files, commit and push.
