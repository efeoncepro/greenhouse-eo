# Public Landing Registry

This registry is the router for landing-specific context. It is not a replacement for
canonical docs or WordPress runtime inspection.

| Landing | URL | WordPress id | Status | Reference | Key guardrails |
| --- | --- | ---: | --- | --- | --- |
| AEO | `https://efeoncepro.com/aeo-2/` | `250265` | publish | `landings/aeo.md` | Do not touch Home `2791`; do not revive old `/aeo` `250255`; protect `heroans`; Growth Forms renderer + Turnstile; live contract gate |
| Agencia Creativa | `https://efeoncepro.com/agencia-creativa/` | `249582` | publish | `landings/agencia-creativa.md` | Protect featured hero `_thumbnail_id=249672`; sticky-scroll edge gutter; comparison table widget |
| About us | `https://efeoncepro.com/about-us-efeonce/` | `249770` | publish | `landings/about-us-efeonce.md` | Loop Marketing module reuses home `lp-container-offset-*`; protect full-bleed section, add only restrained page-scoped gutter |
| HubSpot Services | `https://efeoncepro.com/servicios-contratar-hubspot/` | `244079` | publish | `landings/hubspot-services.md` | Protect Ohio headline featured image `248703`; partner proof legacy sections; headline display helper |

## Registration Rules

- Add a registry row before the second meaningful change to any landing.
- Create a landing file under `references/landings/` before the page accumulates special widgets, forms, hashes, or rollback risks.
- If a landing has a discarded predecessor, record the retired id and status.
- If a landing has a live form, record slug, surface, API base, captcha policy, and verification gate in the landing file.
- If a landing depends on `_thumbnail_id` or Ohio featured headline metas, record the correct attachment id.
