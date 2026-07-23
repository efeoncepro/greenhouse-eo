# TASK-1532 — Globe One-Click Generate

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1532`
- Product Design asset: `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
- Visual direction mode: `source-led`
- Intended consumers: Globe Producer operators on desktop and mobile
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Primitive decision: `extend` — existing Producer primary generate action
- UI ready target: `yes`

## Brief

- Primary user: operador creativo listo para producir una composición válida.
- User moment: terminó de configurar prompt, target, referencias y output.
- Job: iniciar la generación con una sola intención, manteniendo costo y límites transparentes.
- Primary signal: CTA único muestra costo vigente cuando está disponible y progreso honesto cuando debe resolverlo.
- Creative Prompt handoff: sólo una propuesta aceptada se convierte en input estimable; preview/reject no alteran costo.
- Non-goals: ocultar gasto, saltar hard caps o ejecutar automáticamente mientras el usuario edita.

## Desktop Target — 1440×1000

El bloque de ejecución conserva un solo CTA primario. Con estimate vigente muestra `Generar · 10 créditos`.
Mientras la configuración cambia conserva `Generar`; el estimate se actualiza en background sin crear otro botón.
Si el usuario pulsa antes de resolverlo, el mismo CTA pasa por `Calculando costo…` y `Preparando…` antes de
`Generando…`. El costo y saldo permanecen como información secundaria, no como acción.

## Mobile Target — 390×844

El CTA ocupa el ancho disponible con target táctil de 44 px. Costo y recovery hacen wrap debajo sin introducir
scroll horizontal. Ningún segundo botón compite con Generar.

## Action Hierarchy

- Primary: `Generar` / `Generar · {credits} créditos`.
- Secondary: none for estimation.
- Conditional confirmation: sólo cuando una policy server-side exige aprobación por costo/cambio material.
- Disabled: únicamente input/route/capability inválidos o command activo; estimate stale no deshabilita Generar.

## Visual Fidelity Mapping

| Source cue | Runtime mapping | Preserved intent | Rejected pattern |
|---|---|---|---|
| Producer primary CTA | existing generate button | one creative intent | Estimate + Generate pair |
| Credit transparency | existing cost/budget copy | informed spend | hidden charge |
| Async honesty | existing button/status tokens | causal progression | fake percentage |
| Compact composer | existing execution block | surface economy | extra card/modal by default |

## Layout Skeleton

| Region | Purpose | Candidate | Source |
|---|---|---|---|
| Cost line | estimate/saldo/recovery | existing execution status | server estimate |
| Primary CTA | estimate→validate→prepare | existing generate button | controller state |
| Inline error | explain blocked outcome | existing error surface | canonical error |

## Copy Ledger

| Copy id | Text | Dynamic values |
|---|---|---|
| `producer.generate.action` | `Generar` | none |
| `producer.generate.withEstimate` | `Generar · {credits} créditos` | `credits` |
| `producer.generate.estimating` | `Calculando costo…` | none |
| `producer.generate.preparing` | `Preparando generación…` | none |
| `producer.generate.running` | `Generando…` | none |
| `producer.generate.costChanged` | `El costo cambió antes de generar.` | none |
| `producer.generate.insufficient` | `No hay créditos suficientes para esta generación.` | none |
| `producer.generate.retryEstimate` | `No pudimos validar el costo. Intenta nuevamente.` | none |

## State Copy

| State | CTA | Supporting copy | Recovery |
|---|---|---|---|
| ready | `Generar · {credits} créditos` | estimate vigente | click |
| loading | `Calculando costo…` | sin gasto | wait |
| empty | `Generar` disabled | `Completa el prompt o los inputs requeridos.` | focus missing input |
| partial | `Generar` | `Validaremos el costo al continuar.` | click |
| denied | `Generar` disabled | razón de capability/policy | request access |
| ready-estimated | `Generar · {credits} créditos` | estimate vigente | click |
| ready-stale | `Generar` | cálculo en background | click continues |
| estimating | `Calculando costo…` | sin gasto | wait |
| preparing | `Preparando generación…` | costo validado | wait |
| running | `Generando…` | status durable | view feed |
| invalid | `Generar` disabled | razón concreta | fix input |
| insufficient | `Generar` | saldo requerido/disponible | manage credits |
| error | `Generar` | canonical message + correlation | retry |
| changed | `Revisar costo actualizado` | diferencia material | confirm/cancel |
| prompt-proposal | `Generar` | propuesta aún no aceptada; costo del source vigente | accept or keep source |
| prompt-accepted | `Generar` | nuevo brief; estimate anterior invalidado | automatic estimate |

## Accessibility Contract

- Button accessible name includes state, not decorative icon only.
- `aria-busy` applies to execution block during estimate/prepare.
- Live region announces state changes once, without unrelated run messages.
- Focus remains on CTA through internal stages; blocked recovery moves only by explicit user action.
- State meaning is textual and independent of color/motion.

## Implementation Mapping

- Route/surface: `/producer`; `../efeonce-globe/apps/studio-web`.
- Pattern: existing Producer execution block.
- Decision: extend existing generate action; remove manual estimate action.
- Components: `producer-controller.ts`, `producer-ui.ts`, `producer-copy.ts`, `producer-client.ts`.
- Contracts: existing `client.estimate(payload)` and governed prepare/generate command.
- Creative Prompt contract: accepted `CreativePromptProposalV2` updates canonical structured brief; its revision
  participates in the fingerprint without exposing agent internals.
- API parity: no browser cost calculation; server remains authoritative.
- Access: current route/capability/trusted context.
- States: ready-estimated, ready-stale, estimating, preparing, running, invalid, insufficient, changed, error.

## GVC Scenario Plan

- Scenario: extend `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs`.
- Route: `/producer?gvc=task-1532-one-click-generate`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`
- Steps: valid config background estimate; click with current/stale/missing estimate; cost change; insufficient;
  timeout/reconcile; double click; prompt/negative/seed/route change; TASK-1531 preview/reject/accept.
- Captures: ready-estimated, ready-stale, estimating, preparing, insufficient, changed and error.
- Markers: `producer-execution`, `producer-generate-primary`, `producer-credit-estimate`.
- Assertions: exactly one primary CTA; no manual estimate button; no duplicate prepare/spend; prompt proposal
  preview/reject emits zero estimate, accept invalidates once and estimates the accepted brief.
- Scroll-width: `scrollWidth === clientWidth`.
- Accessibility/focus: keyboard, live region, busy and focus retention.
- Review dossier: `required`
- Baseline surface ID: `globe.creative-producer-surface`.

## Design Decision Log

- Decision: one-click intent with automatic estimate and server revalidation.
- Alternatives: retain two buttons; disable Generate until background estimate; hide estimate entirely.
- Why: removes system ceremony while preserving cost transparency and spend safety.
- Reuse/extend/new: extend.
- Open risks: estimate storms, stale cost, double click and unknown outcome after client timeout.

### Creative Prompt Engineer synergy

`TASK-1530 proposal → TASK-1531 review → accept → canonical brief update → invalidate estimate → TASK-1532
automatic estimate → one-click Generate`. Ownership remains separate: TASK-1532 consumes the accepted DTO and
never interprets creative decisions, profiles or model policy.

## Acceptance Checklist

- [x] Single action hierarchy is explicit.
- [x] Cost remains visible without becoming a separate task.
- [x] Desktop/mobile, states, copy, accessibility and GVC are implementable.
- [x] Server remains authoritative for cost and spend.
