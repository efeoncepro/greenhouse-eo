# TASK-1724 — Talent Pool Consent and Self-Service Wireframe

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1724-talent-pool-consent-self-service.md`
- Visual direction mode: `repo-native-benchmark`
- UI rigor: `ui-standard`
- Surfaces: existing Careers apply + new tokenized `/public/careers/talent-profile/[token]` route.
- Brand: Efeonce public; locale es-CL/en-US through canonical dictionaries.

## Experience and action hierarchy

1. Apply remains about the current opening; mandatory process consent stays independent.
2. Optional Talent Pool consent explains future-role purpose, duration and withdrawal before acceptance.
3. Self-service reads current status and allows exactly one primary action: join/renew, update availability or withdraw.
4. Privacy link/help remain visible; no surface promises contact, selection or employment.

## Desktop Target — 1440×1000

The existing Careers form keeps its single-column rhythm and adds one separated optional block after mandatory
process consent. Self-service uses a centered settings-flow paper with a narrative status/purpose lead, an open
evidence ledger, availability second and actions last. It introduces no dashboard chrome, card grid or second
navigation system.

## Mobile Target — 390×844

Both consent controls retain full labels/help. Self-service sections stack without horizontal scrolling; the primary
action precedes withdrawal in DOM order, dialogs fit the viewport and policy/expiry copy never truncates.

## Action Hierarchy

1. Submit the current application independently from optional future-opportunity consent.
2. Join/renew or update availability when the server permits it.
3. Withdraw membership as a visible secondary action with equal accessibility.
4. Open privacy/recovery without changing state.

## Visual Fidelity Mapping

- Public shell, typography and form rhythm reuse Careers TASK-354.
- Trust/status uses one `settingsFlow` paper, semantic Chip/Alert and typography; no card wall. The trust ledger is
  the task-native dominant moment and uses dividers/rhythm rather than nested cards.
- Buttons, dialog, focus and states use MUI/AXIS semantic tokens; no literal values.
- Feedback uses the motion contract and preserves identical reduced-motion meaning.

## Copy Ledger

| id | visible copy | purpose |
|---|---|---|
| `careers.apply.consent.process` | Acepto el tratamiento para este proceso | mandatory current purpose |
| `careers.apply.consent.talentPool` | Quiero que Efeonce considere mi perfil para futuras oportunidades | independent optional purpose |
| `careers.talentPool.status.active` | Tu perfil está disponible para futuras oportunidades | ready state |
| `careers.talentPool.status.processOnly` | Tu información se usa sólo para el proceso actual | needs-reconsent state |
| `careers.talentPool.withdraw` | Retirar mi perfil | candidate action |
| `careers.talentPool.unavailable` | Este enlace ya no está disponible | anti-oracle state |

## State Copy

| state | visible copy | recovery / behavior |
|---|---|---|
| ready | `Tu perfil está disponible para futuras oportunidades` | update availability or withdraw |
| loading | `Consultando el estado de tu perfil…` | stable shell; wait, no identity hint |
| empty | `Tu información se usa sólo para el proceso actual` | offer join only when allowed |
| partial | `Algunos datos aún se están actualizando` | keep legal state authoritative; retry optional data |
| error | `No pudimos completar esta acción` | retry safely; prior state remains unchanged |
| denied | `Este enlace ya no está disponible` | generic recovery; no existence leak |

## Accessibility Contract

- Independent checkbox labels/descriptions, visible required/optional semantics and no preselection. Validation is
  delayed until interaction or submit and clears as soon as the value becomes valid.
- One `<h1>`, logical headings, first-error focus, live receipt and status text independent of color.
- Withdrawal dialog traps/restores focus; Escape/cancel never writes state.
- 200% zoom, 390px reflow, target size and contrast meet WCAG 2.2 AA.
- Reduced motion removes transitions but preserves status, receipt and focus movement.

## First fold — apply addition

```text
┌─ Postular a {vacante} ────────────────────────────────────────────┐
│ …campos existentes…                                               │
│ [ ] Acepto el tratamiento para ESTE proceso.  [Aviso de privacidad]│
│                                                                   │
│ Mantener mi perfil para futuras oportunidades (opcional)          │
│ [ ] Quiero que Efeonce considere mi perfil durante {vigencia}.     │
│     Puedes retirarlo cuando quieras. No afecta esta postulación.   │
│                                                [Enviar postulación]│
└───────────────────────────────────────────────────────────────────┘
```

## First fold — self-service

```text
┌─ Efeonce public shell ─────────────────────────────────────────────┐
│ Tu perfil para futuras oportunidades                               │
│ Estado: {En el banco | Sólo este proceso | Retirado | Vencido}      │
│ Vigencia/finalidad en lenguaje claro                                │
│ ┌─ Qué usamos ───────────────────────────────────────────────────┐ │
│ │ experiencia/evidencia gobernada · disponibilidad · preferencias │ │
│ │ No mostramos contacto/CV fuera del equipo autorizado.          │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ Disponibilidad [Ahora | 30 días | 60+ días | No disponible]        │
│ [Acción primaria según estado]      [Retirar mi perfil]             │
│ Aviso de privacidad · contacto de privacidad                       │
└────────────────────────────────────────────────────────────────────┘
```

## State and copy inventory

- Default eligible, active, `needs_reconsent`, withdrawn and expired.
- Loading skeleton, submit pending, success receipt, conflict/refreshed state and generic server error.
- Invalid/expired/replayed token uses one anti-oracle response and a safe request-new-link path.
- Privacy URL is `https://efeoncepro.com/politica-de-privacidad/`; `/privacy` must not remain in either renderer.
- Copy distinguishes treatment for the current process from optional future-opportunity membership.
- Long purpose/policy copy wraps; no ellipsis on consent, duration, status or withdrawal consequences.

## Accessibility and interaction

- Independent checkbox labels and descriptions via `aria-describedby`; no preselection.
- Error summary focuses the first invalid field; pending state prevents duplicate submission without hiding content.
- Withdrawal uses an accessible confirmation dialog, returns focus to its trigger and issues a durable receipt.
- Status changes announce through one polite live region; reduced motion uses instant state replacement.
- Target size, reflow, 200% zoom, keyboard order and contrast meet WCAG 2.2 AA.

## Implementation Mapping

| Region | Consumer | Contract |
|---|---|---|
| Careers apply | existing Careers form/Growth Form renderers | optional, separate consent fields from TASK-1723 public contract |
| Self-service shell | existing public Careers shell + route-local `settingsFlow` trust sheet | tokenized read DTO; no session/account creation |
| Status/purpose | existing typography, Chip/Alert/Disclosure primitives | `readTalentPoolSelfServiceStatus` |
| Availability | MUI form controls through existing wrappers | `updateTalentAvailability` |
| Join/renew/withdraw | GreenhouseButton + accessible Dialog | canonical TASK-1723 commands; idempotency token server-side |
| Copy | `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts` or talent-pool namespace | no component-local reusable copy |

### Primitive and typography decision

- `reuse`: Careers public shell, `GreenhouseButton`, MUI `FormControl`/`RadioGroup`, `Alert`, `Chip`, `Skeleton`
  and `Dialog`. No new primitive and no raw input/button replacement.
- One `h1`/Poppins page identity. Section labels, body, metadata, availability and receipt use Geist theme roles;
  no local font family, weight tier or size is introduced.
- The legal-state receipt is announced through a persistent `role='status'` node that exists before mutation.
- Withdrawal remains a modal interruption; cancellation and Escape never write, and close restores trigger focus.

## GVC Scenario Plan

- Scenario: `hiring-talent-pool-self-service`; route covers apply opt-in and
  `/public/careers/talent-profile/[fixture-token]` self-service.
- Quality profile: `premium`.
- Viewports: 1440×1000 and 390×844; `qualityProfile: 'premium'`.
- Captures: apply unchecked, self-service active, needs-reconsent, withdrawn, expired/invalid token, validation error.
- Markers: `talent-pool-opt-in`, `talent-pool-status`, `talent-pool-purpose`, `talent-pool-primary-action`.
- Assertions: privacy URL 200, controls independent, no console/a11y errors, focus restore, reduced-motion equivalent,
  `scrollWidth <= clientWidth` at both viewports.
- Review dossier: `docs/ui/reviews/TASK-1724-talent-pool-consent-self-service/`.
- Baseline decision: create a new self-service baseline only after an Apto dossier; preserve the Careers baseline.
- Scorecard: `docs/ui/reviews/TASK-1724-talent-pool-consent-self-service.scorecard.json`; average ≥4.5, no dimension <4.

## Design Decision Log

- Selected two-moment trust flow over checkbox-only and candidate-account alternatives.
- Reuse public Careers shell and settings-flow composition; no new primitive or account runtime.
- Chrome Modern Web Guidance was consulted for semantic forms, post-interaction validation, modal focus and native
  DOM order; Greenhouse maps that intent to MUI/AXIS rather than copying raw HTML/CSS examples.
- Opt-in remains optional and independent; withdrawal is first-class rather than a footer link.
- Open risk: Legal/Privacy must approve purpose/TTL/copy before live recontact; UI can ship gated without enabling membership.
