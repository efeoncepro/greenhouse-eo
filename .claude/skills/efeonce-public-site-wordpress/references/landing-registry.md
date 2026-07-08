# Public Landing Registry

This registry is the router for landing-specific context. It is not a replacement for
canonical docs or WordPress runtime inspection.

| Landing | URL | WordPress id | Status | Reference | Key guardrails |
| --- | --- | ---: | --- | --- | --- |
| AEO | `https://efeoncepro.com/aeo-2/` | `250265` | publish | `landings/aeo.md` | Do not touch Home `2791`; do not revive old `/aeo` `250255`; protect `heroans`; Growth Forms renderer + Turnstile; live contract gate |
| Agencia Creativa | `https://efeoncepro.com/agencia-creativa/` | `249582` | publish | `landings/agencia-creativa.md` | Protect featured hero `_thumbnail_id=249672`; sticky-scroll edge gutter; comparison table widget |
| Agencia Creativa V2 candidate | `https://efeoncepro.com/agencia-creativa-v2/` | `251279` | publish + noindex | `landings/agencia-creativa.md`; motion `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md` | Elementor modular widget `greenhouse_creative_landing_module` (14 instances); source HTML from `~/Documents/Creative/...dc.html`; native Efeonce/Ohio header/footer; do not redirect until operator approval |
| About us | `https://efeoncepro.com/about-us-efeonce/` | `249770` | publish | `landings/about-us-efeonce.md` | Loop Marketing module reuses home `lp-container-offset-*`; protect full-bleed section, add only restrained page-scoped gutter |
| Desarrollo de sitios web | `https://efeoncepro.com/desarrollo-sitios-web/` | `250816` | publish | `landings/desarrollo-sitios-web.md` | TASK-1345 live v1; Elementor document with AEO-style native Ohio hero + premium Hero Factory visual v14 in `wdvis` on the native hero gradient; premium sections through `final-growth-form`; Growth Form `efeonce-desarrollo-web-cotizacion` v2 + Turnstile; no Wave/sweep/scan/local animation background/header overrides; no header/wrapper overrides |
| HubSpot Services | `https://efeoncepro.com/servicios-contratar-hubspot/` | `244079` | publish | `landings/hubspot-services.md` | Protect Ohio headline featured image `248703`; partner proof legacy sections; headline display helper |
| Posicionamiento SEO | `https://efeoncepro.com/servicios/posicionamiento-seo/` | `251078` | publish | `landings/posicionamiento-seo.md` | TASK-1343 Claude Design artifact; Elementor default template with native Ohio `header-3` light-background variant; preserve keyword marquee + scroll reveal motion; no `elementor_canvas`, no custom sticky header, no forced dark hero; CTA to Think Brand Visibility |
| Redes Sociales | `https://efeoncepro.com/servicios/redes-sociales/` | `251300` | publish + noindex | `landings/redes-sociales.md` | TASK-1351 Claude Design final HTML artifact; source is `~/Documents/social/Task 1351 execution/Redes Sociales.dc.html`, not captures; 12 separate Elementor widgets, no monolithic HTML/module widget; native Efeonce/Ohio masthead/footer; guardrails for hero parallax/tilt/counter, rich includes explorer, wall slots/motion/assets v1, metrics 4-card section, full Greenhouse dashboard, bridge radial system map, proof wording, and full creators profile section live in the landing ref; Growth Form `efeonce-social-audit` + Turnstile, HubSpot delivery disabled until cutover |

## Registration Rules

- Add a registry row before the second meaningful change to any landing.
- Create a landing file under `references/landings/` before the page accumulates special widgets, forms, hashes, or rollback risks.
- If a landing has a discarded predecessor, record the retired id and status.
- If a landing has a live form, record slug, surface, API base, captcha policy, and verification gate in the landing file.
- If a landing depends on `_thumbnail_id` or Ohio featured headline metas, record the correct attachment id.
