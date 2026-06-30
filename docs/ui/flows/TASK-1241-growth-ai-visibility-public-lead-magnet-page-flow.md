# TASK-1241 — Public Lead Magnet Page Flow Contract (nodo S1)

> Nodo **S1** + **Journey A** del master flow: `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`. Render `publicWeb` del `ReportArtifactModel`.

## Meta

- Status: `draft`
- Owner task: `TASK-1241 — Public Lead Magnet Page`
- Related wireframe: [docs/ui/wireframes/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md](../wireframes/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md)
- Intended route / surface: página pública del lead magnet (sitio) `[verificar ruta]`
- Flow type: `cross-route`
- Primary primitives: report-artifact `web` (`publicWeb`), intake form
- Copy source: `src/lib/copy/growth.ts`

## Flow Brief

- Primary user: prospecto anónimo
- Entry moment: llega al landing
- Successful outcome: recibe su diagnóstico AEO (web + email/PDF) y queda como lead
- Primary decision/action: enviar el formulario
- Non-goals: portal cliente; evidencia interna

## Surfaces Involved

| Surface | Role | Desktop | Mobile | Primitive |
|---|---|---|---|---|
| Landing + form | entry + intake | hero + form | apilado | form |
| Run status | espera honesta | panel poll | igual | status |
| Public report | resultado | report-artifact web | igual | `AiVisibilityReportArtifact` |

## Flow Map

1. Entry: landing.
2. Primary action: completa form (nombre+apellido + email corporativo + consent + Turnstile).
3. Transition: POST run público (captcha + abuse-guard) → run status.
4. User decision: espera (poll) → ve el report.
5. Completion: report `publicWeb` + email con PDF (TASK-1250/1273) + lead HubSpot (TASK-1242).
6. Recovery / exit: rate_limited/cost_blocked/error honestos.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Enviar form | botón | run status | Enter | captcha + abuse-guard |
| Poll listo | sistema | report | — | aria-live |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | landing | entrar | enviar | hero + form |
| loading | run en preparación | enviar OK | report listo | poll honesto |
| open | report visible | listo | — | report-artifact |
| error | run/intake falló | error | reintentar | mensaje honesto |
| dirty | n/a | — | — | — |
| complete | report + email enviado | listo | — | CTA Efeonce |

## Routing Contract

- Route changes: `path` (landing → status → report por token)
- Canonical URL: landing + report/[token]
- Deep-link behavior: el report es accesible por token (compartible)
- Back button behavior: vuelve al landing
- Reload behavior: report por token persiste
- Shareability: report por token

## Focus & Accessibility

- Initial focus: primer campo del form
- Escape behavior: n/a
- Click-away behavior: n/a
- Focus restore: al status tras enviar; al report al llegar
- Modal vs non-modal: non-modal (página)
- Screen reader announcement: estado del run vía aria-live
- Keyboard traversal: form → enviar → report
- Reduced motion: report se arma reduced-motion safe (motion doc)

## Data & Command Boundaries

- Readers: report/[token] (1239) + run/[handle] (status)
- Commands: POST run público (1240)
- API routes: `/api/public/growth/ai-visibility/run` + `report/[token]` + `run/[handle]`
- Optimistic updates: no
- Cache / invalidation: report por token
- Audit / signals: abuse-guard + grader_intake_events
- Tenant / access boundary: público; email solo en grader_leads con consent (nunca al motor)

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | n/a (público) | — | — |
| not found / empty | report/token inválido | volver al landing | |
| partial / degraded | "sin histórico aún" | — | honesto |
| stale data | report por token (snapshot) | — | |
| timeout / API error | "no pudimos generar tu revisión" | reintentar | |
| dirty exit | n/a | — | |

## GVC Scenario Plan

- Scenario: AEO public lead magnet
- Scenario file: `scripts/frontend/scenarios/aeo-public-lead-magnet.scenario.ts` (a crear)
- Route: landing público (o mockup)
- Viewports: desktop + mobile
- Required steps: landing → form → status → report
- Required captures: landing, form, status, report
- Required `data-capture` markers: `aeo-public-landing`, `aeo-public-report`
- Assertions: noErrorBoundary; público-safe
- Scroll-width checks: desktop + 390
- Accessibility/focus checks: form labels + aria-live
- Reduced-motion evidence: ver motion doc

## Design Decision Log

- Decision: landing público que renderiza `publicWeb` del modelo compartido + intake gobernado
- Alternatives considered: form hand-built (deuda → Growth Forms engine)
- Why this pattern: una fuente, público-safe, Journey A del master flow
- Reuse / extend / new primitive: reuse report-artifact + form
- Open risks: convergencia Growth Forms; ruta pública

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
