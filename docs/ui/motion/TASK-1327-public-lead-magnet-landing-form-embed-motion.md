# TASK-1327 — Brand Visibility Landing Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1327 — Public lead-magnet landing + embed del form gobernado`
- Related wireframe: [docs/ui/wireframes/TASK-1327-public-lead-magnet-landing-form-embed.md](../wireframes/TASK-1327-public-lead-magnet-landing-form-embed.md)
- Related flow: [docs/ui/flows/TASK-1327-public-lead-magnet-landing-form-embed-flow.md](../flows/TASK-1327-public-lead-magnet-landing-form-embed-flow.md)
- Motion type: `orchestrated`
- Primary primitive / library: `GSAP` + CSS in the Think Astro route; no Greenhouse MUI primitive because the route lives in Astro.
- Copy source: local Think landing copy aligned to the wireframe state copy.

## Motion Brief

- Primary user: executive/growth decision maker entering a premium public lead magnet.
- Motion intent: make the entry/form feel enterprise and make the post-submit analysis wait feel trustworthy until the report appears on screen.
- Uncertainty reduced: form contract loading, submit pending, async grader wait, report readiness and transition to the report screen.
- User decision supported: complete the form and understand what is happening after submit without confusing pre-submit preview with actual diagnosis.
- Non-goals: decorative spectacle, fake progress, provider/raw prompt simulation, blocking animations, scroll-jacking, motion that hides form usability.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Page entry | Initial load | Staged reveal of lead magnet thesis, signal preview and form host. | CSS classes / IntersectionObserver optional | yes |
| Signal preview | Initial load and idle | Subtle lanes suggesting future report dimensions, not real live data. | CSS transform/opacity | yes |
| Form contract loader | Renderer not ready | Stable skeleton with branded "resolving governed form" state; no spinner-only UI. | CSS skeleton | yes |
| Form host ready | Contract resolved | Replace skeleton with form using short opacity/translate transition. | CSS transition | yes |
| Submit pending | Renderer submitting | Form area shows pending state controlled by renderer; host may add non-blocking status context if renderer event exists. | Renderer + CSS | yes |
| Analysis wait | Submit accepted | Rich async analysis console with governed status chip, four honest stages, visual signal scan and live-region copy. Actual current state only advances from accepted/queued/processing/ready when a safe handle reports it. | GSAP + CSS + governed status reader | yes |
| Report ready | Safe status handle says ready | Show report link, set short-lived arrival flag, play a full-page transition overlay, then navigate to `/brand-visibility/r/<token>`. | GSAP timeline + sessionStorage handoff | yes |
| Error/degraded | Renderer/load/authorization failure | Calm static state with one retry/recovery path. | CSS + live region | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Primary form anchor CTA | Solid/quiet enterprise button | Elevation or border signal | Visible ring | Slight compression | n/a | Disabled if jumping to loading host | n/a |
| Diagnostic cards | Static evidence labels | Border/ink lift | Visible ring if interactive | n/a | n/a | n/a | n/a |
| Form retry | Secondary action | Border/ink lift | Visible ring | Slight compression | n/a | Shows loading label | Error copy remains stable |
| Analysis panel | Ambient analysis console | n/a | Focusable status region | n/a | Current step if real status exists | Non-fake stage/progress indicator | Report ready/error text |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Page entry | blank main | hero/form shell | 240-420ms ease-out | opacity + translateY under 16px, stagger under 80ms | immediate content, no stagger |
| Form contract | `form.loading` | `form.ready` | 180-240ms ease-out | crossfade skeleton to renderer host | instant swap with status text |
| Submit | `form.ready` | `form.submitting` | renderer-owned | pending affordance and disabled duplicate submit | static pending text |
| Accepted | `form.submitting` | `analysis.waiting` | 450-720ms `power3.out` | replace form area with analysis console; stagger copy, visual scan and stage map | instant status panel |
| Status update | `analysis.waiting` | next governed status | 300-600ms `power3.out` | update status chip, stage map, live region and bounded stage bar; no fake percentage text | text update only |
| Report handoff | `analysis.ready` | report route navigation | 860-1200ms `power3.out` | dim current page, show `Reporte listo` overlay, then navigate | immediate navigation after ready text |
| Report arrival | report route load | report hero/summary visible | 500-700ms `power3.out` | if the loader set the arrival flag, hero, summary panel and first section enter as a continuation of the handoff | default report render |
| Error | any loading/pending | error/degraded | 0-160ms | stop ambient motion; show stable recovery | static error |

## Report-Skeleton Mapping

El loader post-submit debe sentirse como el reporte que se está construyendo. Usar skeletons modulares inspirados en el reporte actual, sin valores.

| Skeleton piece | Mirrors report block | Motion guidance |
|---|---|---|
| Analysis core / signal scan | Hero navy + gauge/report signal language | Rotating SVG rings, scan path and signal nodes; no number. |
| Signal cards | Resumen ejecutivo / dimension families | Four static cards: Presencia, Citabilidad, Categoria, Operabilidad; no measured values. |
| Engine rows | Share of Model por motor | Placeholder rows with engine labels if roster is static; no rates. |
| Citation map | Fuentes citadas | Domain-row skeletons without fake domains. |
| Readiness cards | Operabilidad | Two cards for base/action with neutral bars. |
| Category preview | Categoría percibida | Neutral chips for category lenses. |
| Ladder silhouette | MaturityLadder | Five rungs greyed out; no current rung. |
| Recommendation placeholder | Brecha prioritaria | One neutral priority box without recommendation text. |

Si el contrato real no entrega etapa granular, el skeleton puede avanzar con ambient motion pero los labels permanecen neutrales. No usar progreso porcentual.

## Primitive & Token Mapping

- Primitive: no Greenhouse runtime primitive; use Think route-local CSS components and the governed `<greenhouse-form>`.
- Imports allowed: native Astro/CSS; route-local `gsap` import for the post-submit loader/report handoff; minimal client script for renderer events/status if documented by Growth Forms; existing Think utilities.
- Imports forbidden: Lottie, heavy animation libraries beyond the existing GSAP dependency, ad hoc polling libraries, local form state machines that duplicate Greenhouse.
- Timing tokens: map to Think/AXIS CSS variables if present; otherwise keep local durations bounded and documented.
- Easing tokens: ease-out for entrance, linear/soft ease for ambient lanes; no bounce/spring spectacle.
- Layout animation: avoid layout morphs that can shift the form; reserve stable dimensions for form host and analysis panel.
- CSS properties: transform, opacity, background-position for ambient shimmer; avoid animating width/height/top/left.
- GSAP justification: the wait state and cross-route report handoff need a single orchestrated timeline with staggered entrance, ambient SVG motion, progress-stage updates and exit overlay. CSS alone made the state feel too flat for a long enterprise wait; GSAP remains scoped to this route and does not own form validation or business logic.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)`.
- Replacement behavior: show all content immediately; replace ambient loaders with static skeleton and text.
- Meaning preserved: every state has text title/body and does not require animation to understand.
- Animations removed: entrance stagger, ambient SVG scan, shimmer, translate transitions and report handoff overlay.
- Animations retained: focus ring and instant state changes only.

## Accessibility & Feedback

- Focus visibility: all actionable controls keep visible focus; no hover-only affordances.
- Keyboard activation: CTA/FAQ/retry use native links/buttons.
- Live region / status behavior: form loading, submit accepted, analysis waiting, ready and error states use polite live region when host controls the state.
- Color-independent state: current step labels and status text must be visible; not color-only.
- Motion-independent meaning: loader labels explain whether the form is loading, submission is pending, analysis is running, or the report is ready.
- Error/destructive stability: error states stop ambient motion and keep recovery copy static.

## Performance Guardrails

- Compositor-only properties: transform/opacity/background-position only.
- Layout reads/writes: no repeated layout measurement loops; no scroll-jacking.
- Animation scope: limited to hero, signal preview, form loader, analysis panel, report handoff overlay and contextual report-arrival entrance.
- Chart/counter constraints: no animated fake metrics or counters before real report data exists.
- Mobile constraints: no full-screen canvas; keep first form reach short and avoid heavy assets that hurt LCP/INP.

## GVC / Micro Evidence

- Scenario: Think Brand Visibility landing rich states
- Scenario file: `scripts/frontend/scenarios/think-brand-visibility-landing.scenario.ts` or Think-local Playwright equivalent
- Route: `/brand-visibility`
- Viewports: 1440, 1280, 390
- Required steps: capture page entry settled state, form loading skeleton, form ready, submit pending/accepted in controlled test mode if safe, report-ready handoff overlay, reduced-motion mode.
- Required captures: first fold, form loader, analysis wait panel, report-ready overlay, degraded/error, mobile first fold, mobile analysis panel.
- Required frame labels: `entry-settled`, `form-loading`, `form-ready`, `analysis-wait`, `report-handoff`, `reduced-motion`.
- Required `data-capture` markers: `brand-visibility-landing`, `brand-visibility-hero`, `brand-visibility-signal-preview`, `brand-visibility-form`, `brand-visibility-form-loader`, `brand-visibility-analysis`, `brand-visibility-report-preview`, `brand-visibility-trust`.
- Assertions: no layout shift that moves the form unexpectedly, no fake progress percentage, no page overflow, reduced-motion disables ambient animation.
- Reduced-motion evidence: dedicated capture or assertion with `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: use rich, restrained lead-magnet motion before submit, then a GSAP-orchestrated analysis console and cross-route report handoff after accepted until the report appears.
- Alternatives considered: static form page, decorative hero animation, fake progress bar, email-only success, immediate blank redirect to report loading page.
- Why this pattern: the user needs confidence during uncertainty; the page should feel premium and operational without presenting diagnosis before the run exists.
- Reuse / extend / new primitive: reuse Think shell + route-local CSS/GSAP states + Growth Forms renderer; no new Greenhouse primitive.
- Open risks: renderer events/status handle may be limited; if on-screen report completion is not possible, TASK-1327 has a contract gap rather than an acceptable email-only finish.
- Follow-up: confirm the governed success/status contract returns enough information to reach `/brand-visibility/r/<token>` from the same experience.

## Acceptance Checklist

- [x] The owning task declares this file in `Motion` when required.
- [x] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [x] Reduced-motion behavior preserves the same meaning.
- [x] Focus, selected, pending and error states do not rely on motion alone.
- [x] Imports use approved Greenhouse wrappers/primitives.
- [x] Performance guardrails avoid layout thrash and excessive animation.
- [x] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [x] Design decision log explains why this motion is needed and what was rejected.
