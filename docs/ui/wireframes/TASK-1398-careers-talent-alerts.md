# TASK-1398 — Careers Talent Alerts Wireframe

## Purpose

Surface N4 of the public Careers journey: a voluntary, low-friction “Career Alerts” subscription for people who do not see a suitable opening today. It must make a clear promise, collect only the fields configured by the published Growth Form and leave the visitor in control.

## Desktop wireframe

```text
┌───────────────────────────────────────────────────────────────────────┐
│  ¿Aún no encuentras tu próxima oportunidad?                            │
│  Recibe alertas cuando publiquemos nuevas vacantes en Efeonce.         │
│                                                                        │
│  [ nombre (si el formulario lo configura) ] [ email ] [ Suscribirme ] │
│  □ Acepto recibir alertas de carrera y conozco la política de privacidad│
│  Puedes desuscribirte en cualquier momento.                            │
└───────────────────────────────────────────────────────────────────────┘
```

- Banda plena al final de Careers, después de vacantes/CTA de aplicación y antes del footer.
- Un solo foco: la suscripción. No compite con “Postular” ni hace promesas de proceso de selección.
- El formulario es el `<greenhouse-form>` publicado por TASK-1397; el host no replica sus inputs, validación ni submit.

## Compact wireframe

```text
┌───────────────────────────────┐
│ ¿Aún no encuentras tu próxima │
│ oportunidad?                  │
│                               │
│ Recibe alertas de carrera.    │
│ [ nombre ]                    │
│ [ email ]                     │
│ [ Suscribirme ]               │
│ consentimiento + privacidad   │
└───────────────────────────────┘
```

- Campos, consentimiento y CTA se apilan; nunca se corta el label ni aparece scroll horizontal de página.
- El CTA mantiene ancho táctil y el estado pending no modifica la posición del contenido de manera brusca.

## States

| Estado | Contenido y comportamiento |
|---|---|
| Loading | Skeleton/placeholder del host, sin campos falsos interactivos. |
| Default | Promesa, formulario publicado y nota de desuscripción. |
| Validation | Errores accesibles que provienen del renderer; foco al primer error. |
| Submitting | CTA pending; inputs siguen coherentes con el contrato del renderer. |
| Accepted | Confirmación genérica, sin revelar si el correo ya estaba inscrito. |
| Unavailable | Si flag/form no está disponible, ocultar la banda sin dejar un CTA muerto. |
| Network error | Mensaje recuperable y reintento; no mostrar error del proveedor. |
| Vacancy-list empty | Usar la misma banda como siguiente paso de la empty state, sin duplicar formulario simultáneo. |

## Accessibility notes

- Landmarks, heading hierarchy y labels llegan del host/renderer canónico.
- Consentimiento tiene texto visible y enlace a privacidad; no se preselecciona.
- Success/error se anuncian con el patrón accesible del renderer y no dependen solo del color/motion.
- Móvil se valida a 390px con `scrollWidth === clientWidth`.

## Implementation Mapping

- Route/surface: `src/app/public/careers/**`.
- Primitive decision: reuse `<greenhouse-form>`; no primitive ni formulario Careers nuevo.
- Form contract: stable `formKey` and published surface delivered by TASK-1397.
- Host composition: genuine one-region public-page section; Composition Shell is considered but does not apply because this is an embedded public form band, not a multi-region portal view.
- Copy source: create/reuse canonical Careers/Growth microcopy; no literal reusable copy in JSX.
- States: renderer-owned submit/validation/success/error; host owns placement, unavailable and vacancy-list-empty orchestration.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/careers-talent-alerts.scenario.ts`.
- Route: `/public/careers` (confirm the deployed Careers route during Discovery).
- Viewports: 1440 and 390.
- Captures: loaded band, validation, accepted/generic-success, unavailable/flag-off and vacancy-list empty state.
- Markers: `data-capture="careers-talent-alerts"` and `data-capture="careers-empty-alerts"`.
- Assertions: no horizontal overflow, keyboard focus reaches fields and CTA, consent visible, no console errors, pending/accepted state, reduced-motion evidence.

## Design Decision Log

- Decision: reuse the governed Growth Form renderer as a clearly framed Careers band.
- Alternatives considered: custom local newsletter form (rejected: bypasses consent, anti-abuse, async handling and API parity); applicant intake form (rejected: a subscriber is not an applicant).
- Why this pattern: it makes the product promise real while preserving a single public PII ingress and existing email preference controls.
- Reuse / extend / new primitive: reuse renderer; extend Careers page with one tokenized host section; no new primitive.
- Source reference: the local Careers prototype establishes hierarchy only. Its colloquial “locos” copy is deliberately not carried forward.
- Open risks: form key, final microcopy and availability behavior must be verified against TASK-1397 before `UI ready` can change to `yes`.
