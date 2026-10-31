# Independent Rooms first-experience review

Reviewer: rooms_qa, separate from the UI implementer. Runtime: production build at http://127.0.0.1:3210. The assessment below uses the rendered screenshots and interactions, not the fact that tests passed.

Final validation: 25 Playwright tests passed; 3 viewport duplicates of the API-only test were intentionally skipped. Four GVC variants (1440×900,390×844,1024×768,320×740), 68 frames, no quality findings and no console, page, hydration or HTTP errors. The early opening frames are intentionally transient; use the following settled detail markers for visual acceptance.

| Dimension | Score / 5 | Rendered rationale |
| --- | --- | --- |
| hierarchy | 4.75 | The hero has one dominant concept and one primary action; article and workspace headings separate the three tasks clearly. |
| proportions | 4.5 | Photography keeps its full source composition; the revised dark gallery uses available height and the tablet landscape fits both edges. |
| rhythm | 4.5 | Spacing, editorial dividers and section numbering give a consistent reading rhythm across the paper surface. |
| density | 4.25 | The reading column is comfortable; the mobile evidence panel repeats several title layers before the factual metadata. Next action: consolidate the fragment/title introduction on mobile without removing context or source metadata. |
| depth | 4.5 | Navy proposal, paper reading surface and dark gallery make context changes clear; restrained backdrop separates inspection from the proposal. |
| surfaceEconomy | 4.75 | Work is presented as photography, reading columns and divided rows instead of stacked card containers or invented dashboard metrics. |
| visualImpact | 4.75 | The campaign photography creates a distinct focal point and the large typographic concept remains recognizable on mobile. |
| typography | 4.5 | Bricolage heading and Poppins body are actually loaded; article copy remains legible, with deliberate hierarchy and wrapping at 200% text. |
| color | 4.5 | Navy, paper and teal distinguish hierarchy; DOM text passes automated contrast, and gallery captions were independently measured at 9.82:1. Embedded raster lettering has a separate unverified pixel-contrast limitation. |
| iconography | 4.5 | Directional arrows and close icons have narrow, clear roles, with accessible names and adequate interaction targets. |
| responsive | 4.5 | Headers and tabs wrap, editorial content reflows, and all three photo formats fit the inspector across the four widths. The 1024 landscape defect was corrected and rechecked. |
| motion | 4.5 | Action feedback is visible without distracting from the proposal; focus restoration and reduced-motion flows remain usable. |
| fidelity | 4.5 | The implementation matches the task's dominant creative stage, full editorial reading, contextual radiography and separate operation workspace. This is contract fidelity, not a claim of pixel identity with an unavailable approved canvas. |
| genericTemplateResistance | 4.75 | The room centers actual campaign work and contextual decisions; the operator view uses compact room rows and explicit capabilities rather than decorative KPI cards. |

Scores describe this synthetic first experience, not production readiness. Mean: 4.554/5; minimum: 4.25. Remaining polish is the mobile evidence introduction density, not a blocked core flow.

## Primary evidence

- Desktop entry: `01-desktop/frames/01-initial-room.png`
- Mobile entry: `02-mobile/frames/01-initial-room.png`
- Desktop portrait inspection: `01-desktop/frames/07-piece-detail.png`
- Desktop landscape inspection: `01-desktop/frames/09-landscape-detail.png`
- Tablet landscape regression: `03-tablet/frames/09-landscape-detail.png`
- Mobile portrait inspection: `02-mobile/frames/07-piece-detail.png`
- Desktop editorial: `01-desktop/frames/10-editorial-reading.png`
- Compact editorial: `04-compact/frames/10-editorial-reading.png`
- Mobile radiography: `02-mobile/frames/11-radiography-detail.png`
- Operator workspace: `01-desktop/frames/14-operator-workspace.png`
- Administrator access: `01-desktop/frames/15-administrator-access.png`

## Accessibility and authority limits

Axe incomplete results are preserved in the runtime repository at `.captures/experience/*/*.axe.json`. The remaining incomplete items concern gallery captions over a composite/background classification. Their actual foreground `color(srgb 0.736157 0.763608 0.781176)` against solid `rgb(0,26,51)` measures 9.8186:1; rendered inspection confirms these captions sit below the image on navy. Evidence: `.captures/experience/manual-caption-contrast.json`.

Axe does not certify text baked into photographic PNGs. The cream campaign headline crosses a lighter sky in parts of the portrait artwork. Its overall content is readable in the reviewed frames and mirrored in the accessible image label, but no blanket WCAG pixel-contrast claim is made for the generated art.

Demo roles are explicitly synthetic personas, not authenticated real users. Client HTML/scripts/API responses omit the actual natural-language private note. The real API rejects fabricated headers, bearer credentials, cookies and role queries with 401. Operator/admin actions that are not implemented remain marked pending. First-room permissionRows remain a documented initial workspace limitation.
