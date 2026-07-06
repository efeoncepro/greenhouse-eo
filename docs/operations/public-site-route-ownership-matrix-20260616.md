# Public Site Route Ownership Matrix — 2026-06-16

## Purpose

Define how `efeoncepro.com` routes should be owned during the transition from the current WordPress/Kinsta public runtime to the target Astro/Vercel frontend runtime governed from Greenhouse.

This matrix is a planning artifact. It does not change DNS, Vercel, Kinsta or WordPress.

## Decision Summary

- Target public frontend: Astro/Vercel through `efeoncepro/efeonce-web`.
- Current production frontend: WordPress/Kinsta until route parity gates are green.
- CMS/admin/origin: WordPress/Kinsta, target host `cms.efeoncepro.com`.
- Greenhouse: control plane for asset lifecycle, preview, deploy, rollback, route ownership and SEO preflight.
- Primary SEO surface: `https://efeoncepro.com`.
- Rejected for primary SEO: `landing.efeoncepro.com`.

## Route Ownership Matrix

| Route / Concern | Current owner | Target owner | Transition posture | SEO / operational rule |
|---|---|---|---|---|
| `/` | WordPress/Kinsta | Astro/Vercel | Cut over only with core-page parity | No placeholder/scaffold; canonical apex only |
| `/servicio-*`, `/servicios-*`, service pages | WordPress/Elementor | Astro/Vercel | First coded landing pilot after SEO foundation | Same-domain only; no indexable subdomain |
| `/servicios/` | WordPress/Elementor | Astro/Vercel | Live as minimal parent page for nested service URLs | Expand into editorial services hub before heavy internal linking |
| `/servicios/posicionamiento-seo/` | WordPress/Elementor | Astro/Vercel | Live SEO service landing (TASK-1343) | Canonical same-domain; CTA to Think Brand Visibility; preserve Ohio widgets until redesign decision |
| Business cases / campaign pages | WordPress/Elementor or absent | Astro/Vercel | New pages start as Vercel previews, noindex until approved | HubSpot attribution and canonical required |
| `/blog` | WordPress/Kinsta | Astro/Vercel rendering WordPress content | Do not cut over until blog listing/card/meta parity exists | Sitemap/canonical must not duplicate WordPress-rendered listing |
| Blog posts | WordPress Gutenberg content | Astro/Vercel rendering WordPress content | Headless render preferred; proxy only temporary and gated | Preserve Yoast/meta/schema or deliberate replacement |
| `/wp-admin/*` | WordPress/Kinsta | `cms.efeoncepro.com/wp-admin/*` | Keep admin off public Astro runtime | Never proxy admin through public Astro unless explicitly security-reviewed |
| `/wp-login.php` | WordPress/Kinsta | `cms.efeoncepro.com/wp-login.php` | Same as admin | Avoid public apex login exposure after cutover |
| `/wp-json/*` | WordPress/Kinsta | `cms.efeoncepro.com/wp-json/*` or internal origin | Consumers use CMS/origin host | Public frontend should not expose API as content surface |
| `/wp-content/uploads/*` media | WordPress/Kinsta | WordPress media origin or Astro image pipeline | Keep source URLs stable until image strategy task | Avoid broken media; optimize via Astro/Vercel only after allowlist |
| `sitemap.xml` / sitemap index | WordPress/Yoast | Astro/Vercel | Target Astro owns sitemap after apex cutover | Include only canonical production URLs; exclude previews/demo routes |
| `robots.txt` | WordPress/Kinsta | Astro/Vercel | Target Astro owns after apex cutover | Block/internal noindex routes; reference canonical sitemap |
| Vercel preview URLs | Vercel | Vercel | Preview-only | Must be noindex/protected; never primary SEO target |
| `landing.efeoncepro.com` | none | none for primary SEO | Non-indexed QA only if ever used | Must not host canonical service landings |
| `cms.efeoncepro.com` | planned/WordPress | WordPress/Kinsta | CMS/admin/API host | Should not compete with public frontend indexing |
| Redirects from old slugs | WordPress/Kinsta | Astro/Vercel after cutover | Build redirect map before cutover | 301 permanent redirects for moved URLs |
| HubSpot forms/meetings | HubSpot embedded in WP | HubSpot embedded in Astro | Preserve IDs and UTMs per page | Form smoke and attribution checks required |

## SEO Preflight Checklist

Before any route reaches production under Astro:

- [ ] Current URL inventory captured from live WordPress crawl.
- [ ] Existing status codes recorded for each route.
- [ ] Current titles, descriptions, canonicals, OG tags and structured data captured.
- [ ] Current sitemap entries captured.
- [ ] Target Astro route emits canonical URL on `https://efeoncepro.com`.
- [ ] Preview/Vercel URLs are noindex or protected.
- [ ] Redirect map exists for every changed path.
- [ ] Sitemap excludes internal showcase routes: `/blocks`, `/forms-test`, `/header-sidebar-preview`, `/header-variants`, `/primitives`.
- [ ] Robots policy references canonical sitemap and does not block canonical pages.
- [ ] HubSpot form IDs, meeting URLs and UTM handling are preserved or intentionally replaced.
- [ ] GVC visual evidence exists for desktop and mobile.
- [ ] Lighthouse SEO/performance/accessibility smoke exists for home, one service landing and one blog page/post.
- [ ] Search Console inspection plan exists for post-cutover key URLs.

## Cutover Sequence

1. Keep WordPress/Kinsta live while `efeonce-web` hardens routes in Vercel preview.
2. Remove or noindex scaffold/demo routes.
3. Ship SEO foundation in `efeonce-web`: canonical helper, sitemap filtering, robots, redirects support and JSON-LD contract.
4. Build route parity for home, core service pages, blog listing and representative post.
5. Run side-by-side content/SEO comparison against live WordPress.
6. Prepare DNS/front-door implementation task with rollback.
7. Get explicit operator approval.
8. Cut over apex to Astro/Vercel.
9. Keep WordPress available as CMS/admin/origin.
10. Monitor Search Console, Vercel deploys, forms and analytics.

## Rollback

Rollback before apex cutover is to stop promoting Astro previews. Rollback after apex cutover is to restore WordPress/Kinsta as public front door and revert Vercel domain routing, then resubmit sitemap/canonical checks.

No rollback should rely on deleting content. The goal is routing reversal and canonical cleanup.
