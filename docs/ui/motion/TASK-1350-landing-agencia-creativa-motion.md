# TASK-1350 — Agencia Creativa Landing Motion Contract

## Meta

- Status: `implemented-candidate`
- Owner task: `TASK-1350 — Landing pública "Agencia Creativa" (Efeonce · Design Engineer)`
- Related wireframe: [docs/ui/wireframes/TASK-1350-landing-agencia-creativa.md](../wireframes/TASK-1350-landing-agencia-creativa.md)
- Related flow: [docs/ui/flows/TASK-1350-landing-agencia-creativa-flow.md](../flows/TASK-1350-landing-agencia-creativa-flow.md)
- Motion type: `orchestrated`
- Primary primitive / library: Elementor widget `greenhouse_creative_landing_module` + scoped CSS/JS in `eo-elementor-widgets`; no monolithic HTML widget.
- Copy source: approved source HTML `~/Documents/Creative/Ejecución de task 1350/TASK-1350 Landing Agencia Creativa.dc.html`.

## Motion Brief

- Primary user: marketing or in-house creative leader evaluating Efeonce as production capacity.
- Motion intent: make the landing prove craft and operational visibility, not only state it in copy.
- Uncertainty reduced: whether Efeonce can produce with control, speed, quality and measurable operating rhythm.
- User decision supported: trust the offer enough to book a HubSpot meeting.
- Non-goals: scroll-jacking, blank content waiting for JavaScript, fake live client data, heavy animation libraries, replacing the native Efeonce/Ohio header/footer.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero copy | Initial load | Staged opacity/translate entrance via `heroIn`. | Scoped CSS | yes |
| Hero interface | Idle | Floating blobs, dashed selection ants, cursor path and SVG draw. | Scoped CSS SVG animation | yes |
| Trust proof + logo marquee | Idle / hover | AEO `greenhouse_logo_marquee` loop adapted to the hero proof strip; countries pill, `+90 empresas` chip, color logos, edge fade and hover pause. | Public-site LogoMarquee primitive + scoped CSS | yes |
| Section reveals | Scroll into view | Subtle reveal from visible baseline, never content hidden at `opacity:0`. | IntersectionObserver + CSS | yes |
| Creative factory | Idle | Floating production cards, beams, glow, gears, brief tokens and audio/jingle bars. | Scoped CSS keyframes | yes |
| Service marquee | Idle / hover | Continuous marquee; hover pauses the loop. | Scoped CSS | yes |
| Service cards | Hover/focus | Lift, top stripe reveal, icon scale/rotation and color shift. | Scoped CSS | yes |
| Metrics | Scroll into view | Numeric counters count once when visible. | Scoped JS | yes |
| Backlog proof | Scroll into view | Orange progress bar fills only after the owning reveal block enters the viewport. | IntersectionObserver + CSS | yes |
| Work bento | Hover | Art scales, caption settles, featured play overlay scales and turns blue. | Scoped CSS | yes |
| Testimonial | Auto/controls | Carousel advances; controls update slide state. | Scoped JS | yes |
| Process | Scroll into view | Rail fill, token travel and active pulse start only after the process block enters the viewport. | IntersectionObserver + CSS | yes |
| FAQ | Click / keyboard | Native button toggles panel visibility and icon state. | Scoped JS | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Primary CTAs | Scoped blue gradient, white text/icon | Lift, brighter blue gradient, subtle shine and arrow travel; never inherits Ohio white hover background | Orange focus ring, same readable blue state | Lower shadow, no white flash | n/a | n/a | n/a |
| Secondary/fallback links | Underlined text link | Underline/gap/color feedback without theme background image | Visible outline or browser focus plus readable text | Browser/link press | n/a | n/a | n/a |
| Trust proof + logo marquee | Proof chips + color logo loop | `+90 empresas` chip lifts subtly; logo track pauses; logos lift without grayscale/filtering | Pause via `:focus-within` if focusable descendants exist | n/a | n/a | n/a | n/a |
| Service card | Flat white card | `translateY(-8px)`, stripe scale, icon rotate | Same affordance if focusable | n/a | n/a | n/a | n/a |
| Problem card | Calm card with orange marker | Lift and marker emphasis | Keyboard focus mirrors hover | n/a | n/a | n/a | n/a |
| Work card | Dark bento tile | Art `scale(1.06)`, caption settles | n/a | n/a | n/a | n/a | n/a |
| Featured play | Frosted circle | `scale(1.12)` + blue fill | n/a | n/a | n/a | n/a | n/a |
| FAQ row | Closed button | Border/text lift | Visible focus via native button | Toggle open/closed | Open row | n/a | n/a |
| Testimonial controls | Dot/button state | Subtle lift/color | Visible focus | Slide change | Active slide | n/a | n/a |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Hero entry | page paint | hero visible | `.85s cubic-bezier(.2,0,0,1)` | Staggered children, compositor-only. | Content visible immediately. |
| Trust logo marquee | idle | loop continues | `54s linear` | Reuses the AEO 3-set `translate3d(-33.333%,0,0)` pattern with a compact mask and color logos. | Animation disabled; duplicate sets hidden; first set remains static/compact in the strip. |
| Section reveal | near viewport | settled section | `.72s cubic-bezier(.2,0,0,1)` | Starts visible at `opacity:.72` to avoid no-JS blank states. | `opacity:1`, no transform. |
| Factory rise | production card bottom | card exits upward | `6.2s cubic-bezier(.4,0,.2,1)` loop | Cards rise center/left/right with fade. | Cards static/visible; no animation. |
| Service marquee | idle | loop continues | `26s linear` | Infinite x translation with edge mask. | Static text row. |
| Work hover | idle | hover state | `.42s-.55s` | Play/button/art transform only. | Instant/static state, no transform. |
| CTA hover/focus | idle CTA/link | readable hover/focus state | `.18s-.56s cubic-bezier(.2,0,0,1)` | Page-scoped selectors override Ohio/global anchor hover `background-image`; primary uses blue gradient + shine, secondary links keep transparent background. | No lift, no icon travel; readable color/background remains. |
| Counter | first viewport entry | final value | bounded JS interval | Counts metrics once; no fake live data. | Final numbers displayed. |
| Backlog/process rail | before viewport | filled rail / token travel | `1.3s` / `1.5s cubic-bezier(.2,0,0,1)` | `backlogFill`, `procFill` and `procToken` are gated by `[data-ghc-reveal].is-in`; they must not run from page load. | Final/static bar state; token hidden. |
| FAQ toggle | closed | open | host/browser timing | Toggle content and icon state. | Same interaction, no animation reliance. |

## Primitive & Token Mapping

- Primitive: public-site Elementor widget `greenhouse_creative_landing_module`, with the trust strip reusing the public `greenhouse_logo_marquee` primitive from AEO.
- Imports allowed: scoped CSS/JS from `eo-elementor-widgets`; Tabler icon webfont already registered by plugin; native browser APIs.
- Imports forbidden: GSAP/Lottie/React bundles for this candidate, prototype runtime assets (`x-import`, `sc-if`, `_ds_bundle`, `support.js`), custom header/footer.
- Timing tokens: implemented as page-scoped CSS durations matching source HTML; future extraction should map them into shared public-site motion tokens if this widget becomes a family.
- Easing tokens: source-mapped cubic-bezier values, mostly `.2,0,0,1` and `.4,0,.2,1`.
- Layout animation: no layout-morph; stable section/card dimensions and transform-only movement.
- CSS properties: transform, opacity, background, stroke-dashoffset; avoid top/left layout loops.
- GSAP/Lottie justification: not used in the candidate to keep the Elementor runtime lighter and closer to the approved HTML/CSS motion.

## Reduced Motion Contract

- Detection: JS sets `.gh-creative[data-motion="off"]` when `prefers-reduced-motion: reduce`; CSS also has a media fallback.
- Replacement behavior: all content visible, transforms removed, animations/transitions disabled.
- Meaning preserved: every animated element has text, icon or static visual equivalent.
- Animations removed: hero stagger, reveal motion, trust logo marquee, factory cards/bars/gears/glow, marquee, cursor, counters animation and process pulse.
- Animations retained: native focus indication and immediate state changes only.

## Accessibility & Feedback

- Focus visibility: CTA links and FAQ buttons remain native focusable controls.
- Keyboard activation: FAQ uses buttons; CTAs use links; no hover-only required action.
- Live region / status behavior: no async status surface in this landing; carousel and FAQ state remain visible.
- Color-independent state: active/open states pair color with icon, position, transform or text.
- Motion-independent meaning: source claims and conversion path are readable with motion disabled.
- Error/destructive stability: none; meeting/contact links fail through normal browser navigation.

## Performance Guardrails

- Compositor-only properties: animation work stays on transform/opacity/stroke where possible.
- Layout reads/writes: JS only reads viewport/element visibility for reveal, counters and parallax; no scroll-jacking.
- Animation scope: limited to landing root `.gh-creative`; native Efeonce/Ohio header/footer untouched.
- Chart/counter constraints: counters display illustrative landing metrics only; no fake live portal data.
- Mobile constraints: no horizontal page overflow at 390px; first fold remains readable; reduced-motion static at 390px verified.

## GVC / Micro Evidence

- Scenario: live candidate smoke + motion probe.
- Scenario file: `tmp/task1350_verify_creative_v2.mjs` plus ad hoc Playwright computed-style motion audit from 2026-07-07.
- Route: `https://efeoncepro.com/agencia-creativa-v2/`
- Viewports: desktop `1440`, mobile `390`, reduced-motion `390`.
- Required steps: page load, module inventory, header/footer check, prototype-runtime absence, scroll-width check, reduced-motion check, hover probes for service and work cards.
- Required captures: `.captures/task1350-creative-v2-2026-07-07T07-58-54-052Z/desktop-1440.png`, `mobile-390.png`, `reduced-motion-390.png`.
- Required frame labels: `desktop-1440`, `mobile-390`, `reduced-motion-390`.
- Required `data-capture` markers: `creative-hero`, `creative-workflow`, `creative-work`, plus module roots `data-ghc-module`.
- Assertions: 14 modules present, `scrollWidth == clientWidth`, no console errors, no prototype runtime strings, CSS/JS loaded, FAQ schema present, HubSpot Meetings links with UTM.
- Reduced-motion evidence: computed-style audit confirmed `data-motion="off"`, `animationName="none"` on `.ghc-fab-rise` and `.ghc-fab-bars i`, reveal `opacity:1` and `transform:none`.
- Scroll-bound motion evidence 2026-07-07: live Playwright probe confirmed backlog/process animations are idle at page top (`width=0`, `animationName=none`), run after their reveal block receives `is-in` (`backlogFill`, `procFill`, `procToken`), and collapse to final/static states under reduced motion. Remote CSS rollback: `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-scroll-motion-fix-20260707T104605Z.css`.
- CTA hover/focus evidence 2026-07-07: live Playwright audit `.captures/task1350-cta-hover-audit-after/` checked all visible CTA/fallback anchors on `/agencia-creativa-v2/`; result `failures=0`, `consoleErrors=0`, mobile overflow `0`, reduced-motion failures `0`. The final CTA hover screenshot is `.captures/task1350-cta-hover-audit-after/desktop-1440-02-agenda-una-reuni-n.png`; secondary link screenshot `.captures/task1350-cta-hover-audit-after/desktop-1440-01-mira-c-mo-medimos.png`. Remote rollback: `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-cta-hover-20260707T110557Z.css`.
- Trust logo marquee evidence 2026-07-07: live Playwright audit `.captures/task1350-trust-logo-marquee-2026-07-07T11-31-00Z/` checked desktop `1440`, mobile `390` and reduced-motion `390`; result `setCount=3`, `firstSetCount=7`, `filter=none`, `animationName=gh-logo-marquee-scroll`, `animationDuration=54s`, hover `paused`, duplicate sets hidden under reduced-motion, and page overflow `0`. Remote rollbacks: `class-eo-creative-landing-module-widget-before-trust-logo-marquee-20260707T112826Z.php`, `creative-landing-before-trust-logo-marquee-20260707T112826Z.css`, `creative-landing-before-trust-logo-marquee-reduced-motion-20260707T113012Z.css`.
- Trust proof final evidence 2026-07-07: live Playwright audit `.captures/task1350-trust-90-companies-20260707T114517Z/` checked desktop `1440`, mobile `390` and reduced-motion `390`; result countries `Chile · Colombia · México · Perú`, `+90 empresas` chip, no old trust/FAQ/schema claims, count hover lift, marquee hover `paused`, duplicate sets hidden under reduced-motion, logo filters `none`, and page overflow `0`. Remote rollbacks: `class-eo-creative-landing-module-widget-before-trust-countries-20260707T114111Z.php`, `creative-landing-before-trust-countries-20260707T114111Z.css`, `class-eo-creative-landing-module-widget-before-trust-90-companies-20260707T114517Z.php`, `creative-landing-before-trust-90-companies-20260707T114517Z.css`.

## Design Decision Log

- Decision: implement the approved HTML as governed Elementor modules/widgets, preserving the source motion system with scoped CSS/JS instead of one large HTML widget.
- Alternatives considered: keep original code-custom/no-Elementor plan; paste one full HTML blob into Elementor; rebuild from screenshots.
- Why this pattern: the operator explicitly requested Elementor by modules/widgets, fidelity to the rich HTML, and Efeonce native header/footer.
- Reuse / extend / new primitive: new public-site semantic widget `CreativeLandingModule` in `eo-elementor-widgets`; it is a candidate-specific module family with 14 instances. The hero trust strip extends/reuses AEO's governed `LogoMarquee` primitive rather than introducing a parallel marquee.
- Open risks: final cutover from `/agencia-creativa/` is pending operator approval; current candidate remains `noindex`.
- Follow-up: after approval, remove noindex, decide canonical/redirect, and re-run live SEO/schema/CWV checks post-cutover.

## Acceptance Checklist

- [x] The owning task declares this file in `Motion` when required.
- [x] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [x] Reduced-motion behavior preserves the same meaning.
- [x] Focus, selected, pending and error states do not rely on motion alone.
- [x] Imports use approved public-site runtime rail and scoped widget assets.
- [x] Performance guardrails avoid layout thrash and excessive animation.
- [x] GVC/micro evidence proves meaningful interaction, not only a static screenshot.
- [x] Design decision log explains why this motion is needed and what was rejected.
