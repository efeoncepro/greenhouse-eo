# TASK-1524 / Globe — Commercial Login Cinematic Threshold

## Meta

- Status: `draft`
- Owner task: `TASK-1524`
- Product Design asset: `docs/ui/visual-directions/TASK-1524-globe-commercial-login-cinematic-threshold-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: `../efeonce-globe/apps/studio-web` root anónima.
- Copy source: namespace versionado `globe.login.*`.
- Primitive decision: `extend` Orbital Threshold → Cinematic Threshold.
- UI ready target: `yes` tras keyframes, animatic y first-fold approval.

## Brief

- Primary user: cliente, creativo, Brand Manager o equipo Efeonce con cuenta Globe.
- User moment: primera llegada comercial o retorno para entrar al estudio.
- Job to be done: reconocer valor y acceder sin fricción ni incertidumbre técnica.
- Primary decision signal: `Entrar a Globe`.
- Non-goals: homepage, pricing/signup, dashboard, autoplay sonoro o showreel infinito.

## Desktop Target — 1440×1000

1. Header transparente: logo/lockup start; privacidad/soporte end.
2. Cinematic stage full-bleed con poster visible desde HTML.
3. Copy safe zone start: eyebrow → headline → subheadline → CTA/helper.
4. Signals `Imagen · Video · Audio` como prueba breve, no features cards.
5. Motion control en esquina opuesta; footer comercial integrado.
6. El subject audiovisual vive en center/end y termina como Globe sin cruzar la lectura.

## Mobile Target — 390×844

Header compacto → headline → subheadline → CTA/helper → media subject → signals/footer. Master 9:16 o secuencia
vertical propia; CTA full-width y visible antes del fold. Motion control de 44px. Sin scroll horizontal ni
crop que esconda la transformación principal.

## Action Hierarchy

- Primary: `Entrar a Globe`.
- Secondary: `Pausar/Reproducir animación`; `Conoce Globe` sólo con URL comercial real.
- Destructive: none.
- Selection vs action: media no es clickable ni bloquea CTA.
- Pending/disabled: CTA mantiene geometría, usa `aria-busy` y evita doble navegación.

## Visual Fidelity Mapping

| Source cue | Globe token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| TASK-1455 open navy plane | Orbital Threshold extended | arrival/brand scale | internal status rail |
| One Idea, Many Forms | cinematic media stage | multimodal promise | clip slideshow |
| Stable copy over motion | copy safe zone | conversion/action | glass login card |
| Canonical Globe settle | real SVG/post comp | identity | generated wordmark |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | brand + commercial utility | native header/nav | static config |
| 1 | Media stage | poster/video/fallback | picture + video | media manifest |
| 2 | Copy lead | value proposition | semantic heading block | copy namespace |
| 3 | Primary access | OAuth entry/helper | anchor/button region | `/auth/start` |
| 4 | Suite signals | image/video/audio | inline semantic list | static product truth |
| 5 | Motion control | pause/resume | native button | media element state |
| 6 | Footer | privacy/terms/support | nav/footer | approved URLs |
| 7 | Error state | safe recovery/correlation | inline alert | canonical auth error mapping |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `globe.login.eyebrow` | Lead | `GLOBE · AI CREATIVE SUITE` | none | product category |
| `globe.login.title` | Lead | `Tu marca puede crear más. Sin dejar de ser tu marca.` | none | H1 |
| `globe.login.body` | Lead | `Lleva una idea a imagen, video y audio en un solo estudio, con la velocidad de la IA y el criterio de tu equipo.` | none | one idea |
| `globe.login.enter` | Access | `Entrar a Globe` | none | primary |
| `globe.login.helper` | Access | `Inicio de sesión seguro con tu cuenta de Greenhouse.` | none | auth transparency |
| `globe.login.signals` | Signals | `Imagen · Video · Audio` | none | no overclaim |
| `globe.login.pause` | Control | `Pausar animación` | none | visible/access name |
| `globe.login.play` | Control | `Reproducir animación` | none | visible/access name |
| `globe.login.connecting` | Access | `Abriendo tu estudio…` | none | pending |
| `globe.login.acquire` | Utility | `¿Aún no usas Globe? Conoce el estudio` | none | only with real URL |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Tu marca puede crear más. Sin dejar de ser tu marca.` | canonical body | `Entrar a Globe` | poster/video |
| loading | same as ready | no media-loading copy | `Abriendo tu estudio…` | auth only |
| media fallback | same as ready | same canonical body | `Entrar a Globe` | no error shown |
| expired | `Tu sesión terminó.` | `Tu trabajo sigue guardado.` | `Volver a entrar` | calm |
| denied | `Esta cuenta no tiene acceso a Globe.` | `Revisa tu cuenta o contacta a tu equipo Efeonce.` | `Volver a Greenhouse` | safe |
| partial | `Globe está tardando más de lo esperado.` | `Puedes intentar entrar nuevamente.` | `Reintentar` | no raw status |
| error | `No pudimos abrir Globe.` | `Tu trabajo no se modificó.` | `Intentar de nuevo` | correlation secondary |

## Accessibility Contract

- Heading order: one H1; utility/footer landmarks after main.
- Media alternative: video decorative (`aria-hidden`) because headline/body provide full meaning.
- Aria labels: CTA, pause/play, privacy/terms/support and copy correlation action.
- Focus notes: DOM order matches visual; media never receives focus; skip link reaches main.
- Color-independent state labels: text/icon/boundary; contrast AA in every reviewed frame.
- Motion: pause control, one-shot playback, reduced-motion poster equivalence.

## Implementation Mapping

- Route/surface: `GET /`; `/auth/start`; canonical callback errors; authenticated redirect `/producer`.
- Primitives: native header/main/footer, picture/video, anchor/button, inline alert.
- Variants/kinds: Globe `cinematic-threshold`, `media-playing|paused|settled|static`.
- Component candidates: existing render helpers in `apps/studio-web/src/ui.ts`.
- Copy source: `globe.login.*` constants/module.
- Data reader/command: existing session/OAuth only.
- API parity: `/v1/session` unchanged.
- Access/capability: server authority; no plan/grant inference in browser.
- Runtime consumers: studio-web anonymous root.
- Print/email/PDF considerations: none.
- GVC markers: `globe-commercial-login`, `globe-cinematic-stage`, `globe-login-copy`,
  `globe-login-primary-action`, `globe-motion-control`, `globe-login-state`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/globe-commercial-login.scenario.ts`.
- Route: anonymous root + safe errors + authenticated redirect.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required steps: poster, playing beat, settle, pause/resume, reduced, media fail, CTA focus/pending, denied/error.
- Required captures: desktop/mobile poster/beat/settled/focus/error and reduced-motion static.
- Required `data-capture` markers: implementation mapping list.
- Assertions: first HTML contains H1/CTA/poster; no pilot/internal copy; auth invariants; pause and fallback.
- Scroll-width checks: document, stage and footer.
- Accessibility/focus checks: skip, tab order, pause, CTA, alerts and contrast on intermediate frames.
- Reduced-motion evidence: no source autoplay and poster equivalent.
- Review dossier: `required`.
- Baseline: `globe.commercial-login` after direction/first-fold approval.

## Design Decision Log

- Decision: Cinematic Threshold / One Idea, Many Forms.
- Alternatives considered: Living Contact Sheet; Generative Portal.
- Why this pattern: ownable product story, full static equivalence and lower runtime risk.
- Reuse/extend/new primitive: extend; registry promotion through `TASK-1485` only if justified.
- Open risks: media weight, vertical direction, provenance and acquisition URL.
- Follow-up: optional sound/sonic identity and commercial acquisition flow.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Poster/video/static/error states are explicit.
- [ ] No copy implies unavailable capabilities or internal status.
- [ ] Media meaning has a textual equivalent.
- [ ] State and aria copy is implementation-ready.
- [ ] Mapping names media, copy, auth contract and route.
- [ ] GVC plan proves temporal and static states.
- [ ] Decision log explains extend before implementation.
