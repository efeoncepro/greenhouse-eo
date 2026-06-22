# Greenhouse Public Site Astro Runtime Strategy Decision V1

## Status

Accepted (direction). Implementation is gated by child tasks and explicit operator approval before any DNS, Vercel production domain, WordPress, Kinsta or Search Console cutover.

## Date

2026-06-16

## Owner

Product / Platform Architecture / Marketing Operations

## Scope

- Public website `efeoncepro.com`.
- Astro/Vercel repo `efeoncepro/efeonce-web`.
- WordPress/Kinsta runtime currently serving `efeoncepro.com`.
- Greenhouse Public Site control plane and future commands/readers.
- SEO/AEO continuity for service landings, blog, institutional pages, sitemap, canonical URLs and redirects.

## Reversibility

Two-way-but-slow.

The decision is reversible before production cutover because it only authorizes a direction and implementation tasks. After apex-domain cutover, rollback is still possible by returning DNS/front-door routing to WordPress/Kinsta, but it requires route, sitemap, cache, analytics and Search Console coordination.

## Confidence

Medium-high.

The direction matches the business need to scale VIBE Coding production and uses a stack already prototyped in `efeonce-web`. Confidence is not high until `efeonce-web` removes scaffold/demo routes, ships SEO foundations, renders real core/blog/landing routes, and passes visual/SEO gates against production-equivalent content.

## Validated As Of

2026-06-16.

Runtime and repo evidence:

- Current live public runtime remains WordPress/Kinsta, documented in `docs/operations/public-site-repository-control-plane-discovery-20260614.md`.
- Existing WordPress runtime binding remains `docs/operations/public-site-runtime-repository-binding-20260614.json`.
- `efeonce-web` local repo: `/Users/jreye/Documents/efeonce-web`, remote `git@github.com:efeoncepro/efeonce-web.git`, branch `develop`, SHA `389ab0ab45aeeab83c2e385e78e8eda34234eadb`.
- GitHub repo: `efeoncepro/efeonce-web`, private, default branch `main`, last pushed `2026-04-12T23:24:13Z`.
- Vercel project: `.vercel/project.json` reports `projectName=efeonce-web`, `projectId=prj_i52CnPvaoNB0Lweqk7L7cLimv7W9`, team `team_gmNiF4YCHmc1wqsHUTCvqjmN`; `vercel ls efeonce-web --scope efeonce-7670142f` shows Ready and Error deployments from 65 days ago.
- `efeonce-web` stack: Astro `^6.1.5`, `@astrojs/vercel` `^10.0.4`, Tailwind `^4.2.2`, React islands `^19.2.5`, output `static`, sitemap integration and typed Astro env.
- `efeonce-web` is still scaffolded: `src/pages/index.astro` is a `noindex` placeholder, and internal demo routes such as `/blocks`, `/forms-test`, `/header-sidebar-preview`, `/header-variants` and `/primitives` exist.

External docs checked:

- Vercel Astro docs: `https://vercel.com/docs/frameworks/frontend/astro`
- Vercel rewrites docs: `https://vercel.com/docs/routing/rewrites`
- Vercel redirects docs: `https://vercel.com/docs/routing/redirects`
- Astro on-demand rendering docs: `https://docs.astro.build/en/guides/on-demand-rendering/`
- Google canonical docs: `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Google site move docs: `https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes`

## Delta 2026-06-17 — TASK-1161 materializa el reader read-only

Greenhouse ya tiene la primera pieza runtime de observabilidad para esta decisión: el contrato `public-site-astro-binding.v1`, implementado en `src/lib/public-site/astro/` y expuesto por `GET /api/admin/public-site/binding`.

El reader compone binding estático, route ownership, GitHub HEAD y Vercel deployments con degradación honesta por fuente. También siembra las capabilities `public_site.runtime_binding.read` y `public_site.route_ownership.read`, y agrega la signal `public_site.astro_deploy_failed` al Reliability Control Plane.

Esto **no** cambia el cutover: WordPress/Kinsta sigue siendo el runtime live y Astro/Vercel sigue siendo el rail objetivo hasta completar route parity, SEO/canonical/redirect gates y aprobación humana.

## Delta 2026-06-17 — TASK-1167 agrega el control-plane GitHub del rail Astro

Greenhouse agrega la pieza repo/CI del rail objetivo Astro: contratos `public-site-github-control-plane.v1` y `public-site-github-command-adapter.v1`, implementados bajo `src/lib/public-site/astro/github-control-plane/` y expuestos por `GET /api/admin/public-site/github-control-plane` y `POST /api/admin/public-site/github-commands`.

El repo queda fijado server-side como `efeoncepro/efeonce-web`. El reader observa GitHub Actions `CI`, ramas `main`/`develop`, runs recientes, PRs/issues/releases y correlacion de commit con el binding reader de TASK-1161. Los commands V1 quedan allowlisted y default OFF: rerun de CI fallido y dispatch de `CI` sobre refs permitidos, con `Idempotency-Key`, `executeApiPlatformCommand()` y frase humana para dispatch.

Estado real verificado: el `CI` de `efeonce-web` en `main` esta rojo; la nueva signal `public_site.astro_ci_failed` reporta `error` hasta que se arregle en el repo publico. Staging quedo verificado en `greenhouse-8arcw12v5` con reader HTTP 200 `confidence=high`, command OFF HTTP 409 y reliability severity `error`. Esto no autoriza deploy, rollback, DNS ni cutover.

## Context

Efeonce needs to update service landing pages, business cases and acquisition assets much faster than WordPress + Ohio + Elementor currently allows. The operator explicitly wants those assets controlled from Greenhouse and generated with the speed of VIBE Coding, using the existing Ohio/Figma design assets as a basis for tokenized production.

The current Public Site architecture (`EPIC-019`) was created to govern WordPress/Kinsta from Greenhouse. That remains valuable for the live site, bridge inspection, draft-only content workflows and emergency WordPress operations. However, using Elementor as the primary production lane for every future landing keeps the highest-leverage marketing surface in the slowest authoring model.

The obvious escape, `landing.efeoncepro.com`, is rejected for primary SEO. It splits authority and makes service pages feel detached from the main brand. The correct target is same-domain ownership: `efeoncepro.com/<service-route>` remains the public URL.

## Decision

Adopt **Astro/Vercel as the target public frontend runtime for `efeoncepro.com`**, with WordPress/Kinsta retained as CMS/admin/editorial origin and legacy runtime until the front-door cutover is ready.

The target state is:

```text
Greenhouse Public Site control plane
  -> GitHub/Vercel binding for efeoncepro/efeonce-web
  -> Astro frontend at efeoncepro.com
  -> WordPress/Kinsta at cms.efeoncepro.com for admin, REST/content origin, media and legacy bridge
  -> HubSpot for forms, meetings and CRM attribution
```

This is not an immediate production migration. It is a governed direction:

- WordPress/Kinsta continues serving production until Astro has route parity for the launch set.
- `efeonce-web` becomes the target implementation rail for new coded public frontend assets once its scaffold/SEO/deploy gaps close.
- Greenhouse remains the operator control plane. Operators should not need to open GitHub/Vercel for normal page operations.
- The main domain remains the SEO surface. Landings must not ship as `landing.efeoncepro.com` except as non-indexed preview or temporary internal QA.
- Blog content can remain authored in WordPress, but public rendering should move to Astro/headless for the same-domain frontend when the blog route is included in cutover. Path proxy to WordPress may be used only as a temporary, explicitly gated transition if canonical and sitemap checks are green.
- WordPress bridge/content-factory work remains relevant for source inspection, draft cloning, editorial refresh, and emergency live-site operations.

## Runtime Contract

### Source of truth by concern

| Concern | Source of truth after this decision |
|---|---|
| Public frontend runtime target | `efeoncepro/efeonce-web` on Astro/Vercel |
| Current production runtime before cutover | WordPress/Kinsta |
| CMS/editorial authoring | WordPress/Kinsta |
| Greenhouse-owned asset lifecycle | Greenhouse |
| Git/version/deploy rail for Astro | GitHub repo `efeoncepro/efeonce-web` + Vercel project `efeonce-web` |
| Git/version/deploy rail for WordPress code | GitHub repo `efeoncepro/efeonce-public-site-runtime` |
| Forms/meetings/conversion attribution | HubSpot |
| SEO canonical URL for public assets | `https://efeoncepro.com/...` |

### Phase gates

| Phase | Public runtime | What is allowed | What is blocked |
|---|---|---|---|
| 0 current | WordPress/Kinsta | Live fixes and content operations through existing WordPress lane | Treating Astro as production source |
| 1 build/preview | WordPress/Kinsta live, Astro on Vercel preview | Build coded landings/core/blog routes in `efeonce-web`, noindex previews, GVC/Lighthouse/SEO tests | Indexable Astro landings on a subdomain |
| 2 launch readiness | WordPress/Kinsta live, Astro production candidate | Route inventory, redirect map, sitemap/canonical parity, HubSpot attribution, Search Console preflight | DNS/apex cutover without operator approval |
| 3 apex cutover | Astro/Vercel apex, WordPress as `cms`/origin | Same-domain public frontend on Astro; WordPress admin/API on CMS host | WordPress public rendering as untracked parallel source |
| 4 optimization | Astro/Vercel apex | Greenhouse-controlled asset workflow, deploy/rollback/status, route-level SEO automation | Direct production deploys without Greenhouse audit |

### Greenhouse control-plane contract

Future Greenhouse Public Site UI/actions must map to server-side primitives:

- `public_site.runtime_binding.read`
- `public_site.route_ownership.read`
- `public_site.asset_change.create`
- `public_site.asset_change.preview`
- `public_site.asset_change.request_review`
- `public_site.asset_change.deploy`
- `public_site.asset_change.rollback`
- `public_site.seo_preflight.run`

These names are directional until a child implementation task creates the canonical capability catalog.

## Route Ownership

The canonical route matrix lives in `docs/operations/public-site-route-ownership-matrix-20260616.md`.

Hard rules:

- Service landings and business-case pages target Astro under `efeoncepro.com`.
- WordPress admin must move to or remain accessible through `cms.efeoncepro.com/wp-admin`.
- WordPress REST/API should be consumed from `cms.efeoncepro.com/wp-json` or an internal service URL, not exposed as the public frontend source.
- If any temporary Vercel rewrite proxies public paths to WordPress, the rewrite must be documented with canonical, sitemap, cache and rollback checks before production.
- Internal Astro showcase/demo routes must be noindexed or removed before any production domain binding.

## Alternatives Considered

### Alternative A: Keep WordPress/Elementor as primary runtime and only improve automation

Rejected as primary strategy.

This preserves current production stability and avoids migration, but it does not solve the core production-speed problem. It keeps the business dependent on Elementor JSON/manual layout operations for the highest-leverage acquisition pages.

### Alternative B: Put Astro landings on `landing.efeoncepro.com`

Rejected.

This is operationally easy and SEO-strategically weak. The operator explicitly called it a poor fit because the main domain is `efeoncepro.com`. It also creates duplicate governance and weakens the public-site information architecture.

### Alternative C: Path-based hybrid with WordPress apex and Astro only for selected same-domain paths

Rejected as target, acceptable only as a temporary transition if proven.

Same-domain path routing sounds attractive, but if WordPress owns apex and Astro owns only selected paths, routing, cache, redirects, sitemap, preview, canonical tags and debugging become a multi-origin production problem. This can be used as a short bridge only with explicit route matrix and rollback.

### Alternative D: Astro/Vercel apex, WordPress as headless CMS/admin

Accepted as target.

This matches the existing `efeonce-web` architectural premise: Astro owns the public frontend, WordPress remains the known editorial interface, and Vercel gives preview/deploy rails suitable for code-generated public assets.

### Alternative E: Full CMS migration away from WordPress

Rejected for now.

It expands scope without clear near-term value. WordPress already contains editorial content, Yoast, media and known workflows. The faster move is to replace public rendering, not authoring.

## Consequences

### Positive

- Landings become code assets that agents can create, review, test and deploy with predictable diffs.
- The public site aligns with VIBE Coding without splitting SEO into a subdomain.
- WordPress remains useful as CMS/admin and bridge inspection source.
- Greenhouse can become the true control plane for public-site assets instead of a thin wrapper over Elementor.
- Vercel previews provide a cleaner review lane for product/design/SEO than live Elementor mutation.

### Costs and risks

- Requires real migration readiness: core pages, blog rendering, redirects, sitemap, canonical tags, forms and analytics.
- `efeonce-web` is not production-ready today; internal demo routes and placeholder home must be removed or noindexed.
- DNS/front-door cutover is a high-blast-radius operation and must be a future task with human approval.
- Blog route strategy is the hardest seam: headless render is cleaner; proxy is faster but riskier.
- Two repo rails exist after this decision: `efeonce-web` for frontend and `efeonce-public-site-runtime` for WordPress code/bridge. Greenhouse must hide this complexity from operators.

### Neutral

- This does not delete `EPIC-019`. It recalibrates it: WordPress control-plane work becomes the CMS/bridge/legacy rail, while Astro becomes the target public frontend rail.
- This does not publish any new landing or move `efeoncepro.com` today.

## SEO and Cutover Contract

Before any apex or path cutover:

- Crawl and inventory current WordPress URLs, titles, meta descriptions, canonicals, status codes, sitemap entries and organic-priority pages.
- Create redirect map for changed paths, with 301s for permanent moves.
- Ensure every public Astro route emits canonical URLs on `https://efeoncepro.com`.
- Ensure temporary previews and Vercel deployment URLs are noindex or protected.
- Ensure sitemap includes only canonical production URLs and excludes demo/internal routes.
- Preserve or intentionally replace Yoast/meta/OG/schema data.
- Preserve HubSpot form IDs, meeting links, UTMs and attribution parameters.
- Run GVC visual checks, Lighthouse SEO/performance/accessibility checks and manual form smoke.
- Use Search Console after cutover to inspect key URLs and monitor coverage/indexing.

## Security Boundary

- No WordPress, Vercel or GitHub secrets in docs.
- Greenhouse must operate with provider credentials only from server-side commands/readers.
- Vercel preview URLs must not expose private content or indexable duplicate pages.
- WordPress Application Passwords and bridge HMAC secrets remain governed by the existing Public Site security posture.
- Production cutover must have rollback and owner sign-off.

## Observability Contract

Future implementation tasks must define signals for:

- `public_site.astro_deploy_failed`
- `public_site.astro_ci_failed`
- `public_site.astro_preview_unverified`
- `public_site.route_canonical_mismatch`
- `public_site.sitemap_drift`
- `public_site.redirect_missing`
- `public_site.form_attribution_failed`
- `public_site.wordpress_origin_sync_failed`

## Revisit When

- `efeonce-web` fails to reach production readiness after the SEO/core/blog/landing hardening tasks.
- WordPress editorial workflows stop being valuable enough to keep as CMS.
- Vercel cost, routing, cache or preview constraints become materially worse than WordPress/Kinsta.
- Blog/headless rendering creates SEO loss that cannot be mitigated with redirects/canonicals/sitemap controls.
- Greenhouse cannot provide a usable control plane over GitHub/Vercel without forcing operators back into developer tools.

## Self-Critique

### What breaks in 12 months?

The likely failure is dual-rail confusion: Astro frontend and WordPress CMS/code rails drift because Greenhouse does not hide enough complexity. Mitigation: binding manifests, route ownership matrix, deploy records and clear ownership modes.

### What breaks in 36 months?

If WordPress becomes too expensive to maintain as CMS, this decision still leaves content-source migration for later. Mitigation: keep Astro content normalization thin and source-agnostic.

### Cognitive debt risk

High if agents create one-off Astro sections without a token/component system. Mitigation: child tasks must harden design tokens, component registry and SEO helpers before bulk landing production.

### Lock-in

Vercel becomes the front-door provider. Replacing it would be more than a one-day task after cutover, but Astro keeps the frontend portable compared with a proprietary page builder.

### Observability gap

Search/indexing failures can be silent for days. Mitigation: preflight, Search Console checks, sitemap/canonical drift signals and post-cutover monitoring.

### AI-specific risk

Agent-generated landing pages may ship convincing but inaccurate claims or broken attribution. Mitigation: Greenhouse review/approval workflow, source-backed copy, HubSpot attribution checks and GVC/Lighthouse gates before deploy.

### Regional/compliance gap

No special Chilean data-residency issue is introduced by a public marketing frontend, but forms/HubSpot consent and analytics/cookie governance must be preserved in the cutover task.
