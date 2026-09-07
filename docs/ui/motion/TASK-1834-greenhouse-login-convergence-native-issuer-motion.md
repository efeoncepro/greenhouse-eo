# TASK-1834 — Greenhouse Login Convergence on Efeonce ID (motion)

## Meta

- Status: `selected direction v2 — implementation pending`
- Owner task: `TASK-1834`
- Visual direction: `docs/ui/visual-directions/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Related wireframe: `docs/ui/wireframes/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Related flow: `docs/ui/flows/TASK-1834-greenhouse-login-convergence-native-issuer-flow.md`
- Motion posture: the entry redirect is nonvisual; motion explains only a stable rendered state.

## Motion brief

An enabled Greenhouse `/login` returns a server redirect and therefore has no entrance, exit, spinner, progress or
handoff animation. The issuer renders its contextual page directly only when authentication is required. Motion may
communicate the state of an invoked authentication method, an issuer status, a callback denial or a Greenhouse
context selector; it must not manufacture continuity between hosts or imply completion before server validation.

## State transitions

| Transition | Feedback | Reduced-motion equivalent |
|---|---|---|
| Greenhouse entry → issuer/callback | none; normal browser navigation after server `302` | identical |
| issuer contextual ready | context and H1 render with the page; no staged reveal | identical static render |
| issuer method ready → pending | invoked control adopts canonical pending/disabled semantics and honest status | immediate text and `aria-busy` |
| email requested → status | canonical stable status panel | identical static status |
| callback → returning | existing progress treatment only if server validation is perceptible | immediate status text |
| callback → denied | existing alert mounts and receives focus | same alert without entrance animation |
| resolving → context required | selector mounts with heading focus | identical static selector |
| recovery retry → entry | normal navigation; no countdown or auto-bounce | identical |

## Constraints

- Reuse existing duration, easing and motion tokens; no local keyframes or numeric timing literals.
- Redirect and protocol timing never wait for animation completion.
- Never render an intermediate Greenhouse splash, skeleton, progress percentage or success checkmark to disguise the
  cross-host navigation.
- A slow redirect does not justify a client-only loading page; transport failure resolves to a stable recovery state.
- Pending is conveyed through text, disabled semantics and `aria-busy`, never by a spinner alone.
- Focus restoration occurs after a stable destination mounts and does not depend on an animation event.
- Product context does not pulse, rotate or behave like promotional content.
- Recovery never uses timed auto-redirect because it must break redirect loops.

## Route and continuity behavior

- The normal enabled Greenhouse entry renders no intermediate UI and emits no artificial screen-reader message.
- Efeonce ID lands fully rendered with trusted `Greenhouse` context; it does not replay Greenhouse branding motion.
- A sufficient issuer session may return directly, so absence of the issuer page is an expected success path.
- `Volver a Greenhouse` navigates immediately to the registered safe recovery route.
- Callback success navigates only after server-side protocol, subject and context validation.
- Callback failure remains on a stable Greenhouse recovery surface rather than bouncing between hosts.
- Any upstream Microsoft transition is owned by Microsoft and must not be visually imitated by Efeonce.

## GVC evidence

- Assert that enabled Greenhouse entry produces no captured intermediate document, legacy-form flash or actionable
  `Continuar` surface.
- Capture issuer direct and Greenhouse-contextual variants to prove intentional context differences.
- Capture issuer method pending/status, callback denial, recovery and visible zero/multiple-context outcomes.
- Repeat pending, denial, recovery and context-required flows with `prefers-reduced-motion: reduce`.
- Verify identical meaning, accessible name, focus order and recovery actions in both motion modes.

## Acceptance checklist

- [ ] Enabled entry has no decorative cross-host transition, fake completion or bespoke timing.
- [ ] Issuer pending, status, denied, recovery and context-required states remain understandable with motion disabled.
- [ ] Focus and navigation never wait for animation events.
- [ ] Recovery has no timed automatic redirect.
- [ ] GVC evidence proves no intermediate Greenhouse screen and covers both issuer context variants.
