# TASK-1276 — AEO Operator View Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1276 — AEO Operator View (Growth + Account 360)`
- Related wireframe: [docs/ui/wireframes/TASK-1276-aeo-operator-view.md](../wireframes/TASK-1276-aeo-operator-view.md)
- Intended route / surface: `/growth/aeo` (cockpit) + `/growth/aeo/[organizationId]` (detalle) + facet "AEO" en el Organization Workspace (Account 360)
- Flow type: `cross-route`
- Primary primitives: `CompositionShell` (`masterDetail`), `DataTableShell`, report-artifact view, Organization Workspace facet
- Copy source: `src/lib/copy/growth.ts`

## Flow Brief

- Primary user: operador interno (Account/Growth)
- Entry moment: desde el cockpit Growth/AEO (cross-cliente) o desde el Account 360 de un cliente (contextual)
- Successful outcome: ve el AEO completo del cliente y registra el status de un foco del Plan AEO
- Primary decision/action: cambiar el estado de ejecución de una recomendación (TASK-1275 command)
- Non-goals: no es la vista cliente (`/aeo`); no vive en `/admin`; no re-scorea el grader

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Growth AEO cockpit | Entry cross-cliente | tabla de clientes + score | tabla densa apilada | `DataTableShell` |
| Per-client workbench | Context + write | masterDetail split (navigator + detail) | detail en drawer "Ver detalle" | `CompositionShell` |
| Account 360 facet "AEO" | Entry contextual | tile con score + deep-link al detalle | tile apilado | Organization Workspace facet |

## Flow Map

1. Entry: operador entra al cockpit `/growth/aeo` o al facet AEO del Account 360 del cliente.
2. Primary action: selecciona un cliente (cockpit) o hace clic en el facet (Account 360) → navega al detalle por-cliente.
3. Transition: `/growth/aeo/[organizationId]` carga el workbench masterDetail.
4. User decision: abre un foco del Plan AEO y cambia su status (not_started/in_progress/done/dismissed).
5. Completion: el status persiste (command TASK-1275), el foco refleja el nuevo estado, el cliente lo verá en `/aeo` (follow-up).
6. Recovery / exit: error de write → toast + reintento; navegar atrás vuelve al cockpit/Account 360.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Seleccionar cliente | cockpit row | detalle por-cliente | Enter sobre la fila | navegación de ruta |
| Clic facet AEO | Account 360 | detalle por-cliente (deep-link) | Enter | cross-surface |
| Cambiar status | detalle (control) | write command + estado nuevo | foco + Enter/Space | gobernado por capability |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | sin cliente seleccionado | entrar al cockpit | seleccionar cliente | cockpit visible |
| opening | navegando al detalle | seleccionar/deep-link | detalle cargado | skeleton |
| open | workbench del cliente visible | detalle cargado | navegar atrás | masterDetail |
| loading | cargando status/reporte | abrir detalle/foco | data lista | skeleton |
| error | write/lectura falló | command/reader error | reintento | toast actionable |
| dirty | status cambiado sin confirmar (si aplica confirm) | editar | confirm/cancel | n/a si write directo gobernado |
| complete | status persistido | command OK | — | foco refleja estado |

## Routing Contract

- Route changes: `segment` (`/growth/aeo/[organizationId]`)
- Canonical URL: `/growth/aeo/[organizationId]`
- Deep-link behavior: el facet del Account 360 deep-linkea directo al detalle por-cliente
- Back button behavior: vuelve al cockpit o al Account 360 según origen
- Reload behavior: re-renderiza el detalle por-cliente (server component, dynamic)
- Shareability: URL operador-scoped (no client-facing); requiere capability interna

## Focus & Accessibility

- Initial focus: primer foco del navigator al abrir el detalle
- Escape behavior: n/a (no es modal; es ruta)
- Click-away behavior: n/a
- Focus restore: tras escribir status, foco vuelve al foco editado
- Modal vs non-modal semantics: non-modal (rutas + drawer en compact)
- Screen reader announcement: cambio de status anunciado (aria-live polite)
- Keyboard traversal: cockpit (tabla) → navigator → detalle → control de status
- Reduced motion: cambio de status sin motion gratuito

## Data & Command Boundaries

- Readers: `readOperatorScopedAeoReport` + `readOperatorCrossOrgAeoScores` (TASK-1287, clientes **y prospectos**, scope operador) + `readRecommendationStatuses` (TASK-1275)
- Commands: `setRecommendationStatus` (TASK-1275) · `requestGraderRunForOrganization` (TASK-1277, run sobre cliente/prospecto) · `sendAeoReportAndOpenOpportunity` (TASK-1279, envío + deal)
- API routes: rutas de los commands (lane `[verificar]`)
- Optimistic updates: opcional (status); el run y el envío NO son optimistic (esperan resultado)
- Cache / invalidation: revalidar el detalle tras el write/run
- Audit / signals: audit append-only + outbox (TASK-1275/1279); send log con consentimiento (TASK-1279)
- Tenant / access boundary: operador solo ve/escribe orgs en su scope; capabilities `…recommendation.set_status`, `…run.operator`, `…opportunity.open`

## Cross-Sell Extension — run operador + envío + consentimiento (amendment TASK-1276)

Surfaces adicionales (sobre el detalle operador):

| Surface | Role | Desktop | Compact | Primitive |
|---|---|---|---|---|
| Subject picker | elegir target, **agrupado por motion**: clientes con AEO · clientes sin AEO (Expansion) · prospectos HubSpot (New Business) | selector + búsqueda con grupos | apilado | combobox/lista agrupada |
| Run CTA | correr el motor sobre el target | botón "Correr AEO" → preparando→ready | igual | `GreenhouseButton` |
| Send + opportunity | enviar informe + abrir deal | `propose→confirm→execute` con **consent + legalBasis + dealIntent**, en lane in-flow non-modal | drawer temporal en compact | **AdaptiveSidecar `composer`** (NO confirm embutido en el detail canvas) |

Flow del cross-sell:

1. Operador elige target (subject picker, agrupado por motion) → 2. "Correr AEO" (`requestGraderRunForOrganization`, TASK-1277) → preparando → reporte con **foco competitivo per-motor** (AI Overviews · ChatGPT · Perplexity · Gemini, no agregado único) → 3. "Enviar + abrir oportunidad" (AdaptiveSidecar `composer`): recipient + **consent gate** (prospecto requiere consentimiento capturado; cliente = relación) + `legalBasis` + `dealIntent` (Expansion cliente / New Business prospecto) → confirmar → `sendAeoReportAndOpenOpportunity` (TASK-1279) envía email + crea/vincula deal HubSpot → 4. estado "enviado + oportunidad abierta" (con link al deal) o error honesto.

Consent gate (state): `consent_required` (prospecto sin consentimiento → bloquea el envío con CTA "registrar consentimiento", NUNCA cold send) · `ready_to_send` · `sent`.

Failure adicional: `consent_required` → mostrar el gate, no enviar; `hubspot_write_failed` → degradar honesto (informe enviado, deal pendiente de reintento).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | el operador sin scope no ve el cliente | — | tenant boundary |
| not found / empty | "Sin runs AEO" | generar/agendar (según capability) | |
| partial / degraded | focos sin status visibles como "sin seguimiento" | — | honesto |
| stale data | "datos al …" | refrescar | |
| timeout / API error | toast "No pudimos guardar" | reintentar | actionable=true |
| dirty exit | n/a (write directo gobernado) | — | |

## GVC Scenario Plan

- Scenario: AEO operador cockpit → detalle → cambio de status
- Scenario file: `scripts/frontend/scenarios/growth-aeo-operator.scenario.ts` (nuevo)
- Route: `/growth/aeo` + `/growth/aeo/[organizationId]` (o mockup harness)
- Viewports: desktop 1440 + mobile 390
- Required steps: cockpit → seleccionar cliente → abrir foco → cambiar status
- Required captures: cockpit, workbench, control de status
- Required `data-capture` markers: `aeo-operator-cockpit`, `aeo-operator-detail`
- Assertions: noLoginRedirect, noErrorBoundary
- Scroll-width checks: sin scroll horizontal desktop ni mobile 390
- Accessibility/focus checks: foco restaurado tras write
- Reduced-motion evidence: status change reduced-motion safe

## Design Decision Log

- Decision: dos entradas (Growth cockpit cross-cliente + Account 360 facet contextual) al mismo detalle por-cliente; NO `/admin`
- Alternatives considered: solo cockpit Growth (pierde el modelo mental "este cliente"); `/admin/...` (rechazado: admin = salud de plataforma)
- Why this pattern: Growth = nav global/local del programa AEO; Account 360 = nav contextual desde el cliente
- Reuse / extend / new primitive: `reuse` (masterDetail + report model); control de status = nuevo cliente del command TASK-1275
- Open risks: reader operador-scoped vs client-scoped (TASK-1243) — resolver en Discovery
- Follow-up: status visible también en la vista cliente `/aeo`

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
