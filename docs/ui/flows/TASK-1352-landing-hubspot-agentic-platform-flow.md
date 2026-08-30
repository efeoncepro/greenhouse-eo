# TASK-1352 — Flow contract: pillar HubSpot

## Meta

- Status: `draft; ready after research and first-fold acceptance`.
- Owner task: `TASK-1352 — Landing HubSpot: sistema vivo de crecimiento`.
- Related wireframe: [`TASK-1352-landing-hubspot-agentic-platform.md`](../wireframes/TASK-1352-landing-hubspot-agentic-platform.md).
- Intended route: `/servicios/hubspot/`.
- Flow type: `single-surface + in-page exploration + governed form + conditional cross-route links`.
- Primary primitives: semantic links/buttons/details, page-scoped atlas/lens, `<greenhouse-form>`, Meetings.
- Copy source: approved TASK-1352 copy deck and canonical renderer copy.
- Primary conversion: accepted initial-assessment request.

## Flow Brief

- Primary user: miembro del buying group que evalúa HubSpot, un partner o la evolución de un portal existente.
- Entry moment: llega con intención comercial, comparativa, sectorial, de capability o referral.
- Successful outcome: entiende fit, familia de resultado, límites y siguiente paso; envía una evaluación válida o sale
  informado si no existe fit.
- Primary decision/action: solicitar evaluación inicial sin costo.
- Secondary action: Meetings para quien ya tiene contexto y desea conversar.
- Non-goals: personalización opaca por referrer, cotización automática, diagnóstico autónomo, lead por click, gating de
  contenido, forced capture o construcción de backend.

## Principios de continuidad

1. Cualquier entrada debe poder reconstruir categoría, outcome, relación Efeonce×HubSpot y acción sin depender del
   referrer.
2. Seleccionar familia o sector cambia énfasis y contexto, nunca la verdad de la oferta.
3. La página funciona como documento completo sin JS; enhancements no crean información exclusiva.
4. La evaluación gratuita se explica antes de solicitar datos.
5. No-fit es una salida válida; la conversión no justifica presión ni ocultamiento.
6. Sólo `submission accepted` es lead. Clicks, scroll, selections y form start son señales diagnósticas.

## Entry Intent Matrix

| Entrada | Intención probable | Confirmación inmediata | Ruta sugerida sin ocultar el resto |
|---|---|---|---|
| búsqueda partner/implementación | comparar experiencia y riesgo | categoría, accountability, delivery | hero → proof → atlas |
| búsqueda capability/Hubs | resolver necesidad puntual | familia outcome + mecanismo elegible | hero → familia correspondiente |
| búsqueda agentes/IA | evaluar automatización | datos/gobierno/eligibility antes de autonomía | hero → familia 06 + R8 |
| búsqueda sectorial | buscar fit contextual | lente, JTBD y preguntas sectoriales | hero → R4 |
| comparación/precio | comprender decisión/costo | fit, alcance, cluster verificado | hero → R5/R6/R10 |
| Solutions Directory/co-sell | validar delivery | relación factual, proceso, proof | hero → R7/R9 |
| referral/outbound | confirmar credibilidad | resultado, evidencia, CTA clara | hero → R3/R9 |
| cliente/cross-sell | expandir portal existente | seis familias y operación | hero → R3/R7 |

UTM sólo mide. Una family/sector key explícita y allowlisted puede preenfatizar contenido, pero se anuncia y nunca
oculta otras familias.

## Surfaces Involved

| Surface | Rol | Desktop | Mobile/compact | Primitive |
|---|---|---|---|---|
| base page | contexto y recorrido | stage + sections | flujo vertical | semantic document |
| outcome atlas | seleccionar/leer familia | rail + panel | sequence/details | buttons/details after prototype |
| sector lens | contextualizar | selector + adjacent content | vertical controls | buttons with pressed state |
| FAQ | resolver preguntas | native disclosure | native disclosure | details/summary |
| conversion chamber | explicar/capturar | embedded section | natural flow | greenhouse-form |
| Meetings | alternativa externa | new tab/link | new tab/link | governed URL |
| clusters | profundización | cross-route | cross-route | internal links |

No modal es obligatorio. Si el renderer vigente abre una surface, debe conservar Escape, focus trap apropiado,
restore y fallback; el contenido comercial permanece en la página.

## Journey principal

```text
ENTRY
  ↓
R1 category + outcome + Efeonce ownership + primary action
  ├─ high intent → #evaluacion
  ├─ conversation ready → Meetings secondary
  └─ needs understanding → continue
      ↓
R2 VoC tension confirms relevance
      ↓
R3 exact six-family atlas
  ├─ select/read family → outcome + fit + mechanism + limit + same CTA
  ├─ optional live cluster → cross-route and back continuity
  └─ retain allowlisted family context
      ↓
R4 optional sector lens → examples/questions/emphasis
      ↓
R5 fit/no-fit
  ├─ no-fit likely → alternative/cluster/exit, no capture pressure
  └─ fit plausible → continue
      ↓
R6 free assessment vs paid blueprint understood
      ↓
R7 delivery + R8 eligibility + R9 proof
      ↓
R10 FAQ/cluster resolves objection
      ↓
R11 governed assessment form
  ├─ accepted → factual success + optional Meetings
  ├─ validation → correction with values preserved
  ├─ rejection/rate limit → safe explanation + recovery
  ├─ transport error → retry/fallback
  └─ embed unavailable → visible alternative
```

## Action hierarchy and analytics

| Level | Action | UI | Destination | Analytics meaning |
|---|---|---|---|---|
| primary | assessment CTA | one solid treatment | `#evaluacion` | diagnostic click |
| secondary | Meetings | subordinate link/button | verified external URL | outbound click |
| selection | family | control | in-page state | engagement only |
| selection | sector | pressed control | adjacent state | engagement only |
| editorial | cluster | descriptive link | verified internal URL | navigation |
| conversion | valid submit | form submit | governed command | accepted = lead |
| business outcome | meeting/opportunity | downstream readback | HubSpot/Meetings | reported separately |

No analytics label includes free text or PII. Event names/params require Tracking Plan approval and cardinality cap.

## Outcome Atlas Flow

Canonical order and stable keys:

| Key | Family |
|---|---|
| `marketing_content_aeo` | Marketing, Content & AEO |
| `sales_ai_pipeline` | Sales & AI Pipeline |
| `revenue_lifecycle` | Revenue Lifecycle |
| `service_success_delivery` | Service, Customer Success & Delivery |
| `data_integration_intelligence` | Data, Integration & CRM Intelligence |
| `agent_hub_operations` | Agent Hub & Agentic Operations |

Keys are analytics/form context identifiers only after allowlist approval. They are not translated text and cannot
be generated from an arbitrary label.

### Default

- All six names are visible and in canonical order.
- Desktop may emphasize 01 visually; this is presentation, not recommendation.
- Mobile/no-JS/reduced motion displays the full six-family sequence.
- A deep link can emphasize a known family key and move focus to its heading after user-initiated navigation.

### Activation

```text
idle → hover/focus affordance
activate family
  → validate key against allowlist
  → interrupt previous visual transition
  → update pressed/expanded/current semantics
  → reveal/emphasize already-present panel
  → announce new family only when needed
  → preserve scroll and focus
  → optionally retain hidden form context
```

- Mouse, touch and keyboard paths are equivalent.
- If tabs are chosen, implement complete tab semantics/arrow navigation. Otherwise buttons/details keep natural tab
  order. Never create a hybrid ARIA pattern.
- No network request is necessary to read a family.
- Back/history is not polluted by every selection. Hash support is allowed only if deep-link value justifies it.
- Family changes cannot alter pricing, eligibility or promised deliverable automatically.

## Sector Lens Flow

```text
all_sectors (default)
  ├─ select professional_b2b
  ├─ select saas_technology
  └─ select manufacturing_distribution

selected sector
  → update pressed state and visible heading
  → change examples/questions/order of emphasis only
  → preserve structural claims and CTA
  → retain allowlisted context if form opened
  → reset returns to all_sectors
```

- Sector is never inferred invisibly from UTM, IP, CRM or company name.
- No sector lens appears “complete” without evidence/owner; unsupported examples are omitted.
- Selection cannot imply a productized vertical solution that the offer does not support.

## Fit/No-fit Flow

```text
read condition
  ├─ not applicable → continue
  ├─ uncertain → add question/context to assessment
  └─ clear no-fit → read alternative or live cluster → exit safely
```

- No modal, countdown or CTA escalation follows a no-fit signal.
- The visitor may still ask for evaluation, but copy never promises that Efeonce will force HubSpot to fit.
- Analytics may record navigation to the no-fit cluster, not a negative lead or inferred company status.

## Assessment Threshold Flow

Before the first field, the user must encounter:

1. what the free assessment does;
2. what it does not deliver;
3. when a paid blueprint is recommended;
4. what information is requested and why;
5. privacy/consent and the next factual step.

CTA from any region scrolls/jumps to R11 and focuses the section heading. It does not focus the first field until the
user has context.

## Form State Machine

| State | Meaning | Entry | Exit | UI requirements |
|---|---|---|---|---|
| ready | form usable | render | input/submit | expectation visible |
| editing | values present | input | submit/navigation | no unexpected loss |
| validating | local/server rules | submit | invalid/submitting | status announced |
| invalid | fields need correction | validation fail | edit/resubmit | summary + field errors + preserved values |
| submitting | request in flight | valid | accepted/rejected/error | block duplicate; stable layout |
| accepted | canonical acceptance | success | optional Meetings/end | factual next step; one lead event |
| rejected | safely rejected | policy/server | edit/fallback | no raw internals |
| rate_limited | retry constrained | server | wait/fallback | timeframe only if known |
| transport_error | request failed | network/server | retry/fallback | values preserved |
| unavailable | embed/runtime missing | mount failure | alternate channel | fallback already visible |

### Submit sequence

```text
submit
  → prevent duplicate
  → validate
     ├─ invalid: focus summary then first invalid field
     └─ valid: announce submitting
         ├─ accepted: render success, emit accepted event once
         ├─ rejected/rate_limited: render safe recovery
         └─ error: preserve values, retry/fallback
```

- Do not auto-open Meetings after acceptance.
- Do not promise reply time unless an approved SLA exists.
- Deduplication, routing and CRM write remain server-side contracts.
- PII never enters URL, dataLayer, console or browser error telemetry.

## Cluster Routing Contract

- Route changes: `path` only through explicit internal links; atlas/lens default to in-page state.
- Canonical URL: `/servicios/hubspot/`.
- Legacy: `/servicios-contratar-hubspot/` → one-hop 301.
- Deep links: optional stable `#familia-<key>`/`#evaluacion`; only if implemented accessibly and documented.
- Back: browser-native restoration; no forced scroll top.
- Reload: complete document remains understandable; stable hash restores context if supported.
- Shareability: pillar works without selection state; clusters own distinct intents.

Cluster link render gate:

1. HTTP 200;
2. canonical self-reference;
3. indexable;
4. non-placeholder content;
5. reciprocal descriptive link to pillar.

If any gate fails, omit the link without leaving an empty card.

## Focus & Accessibility

- Initial focus: browser default; skip link remains available.
- In-page CTA: focus R11 heading after navigation; avoid surprise on simple anchor click if native behavior already
  provides sufficient context—prototype and document final choice.
- Atlas/lens: activation does not move focus away from trigger; announcement avoids duplicate verbosity.
- FAQ: native summary focus; open state communicated by browser semantics.
- Form invalid: summary, then first invalid field; all valid values preserved.
- Form accepted: focus success heading and announce once.
- External Meetings: visible new-tab disclosure where appropriate; `rel="noopener"`.
- Escape/click-away: only if an optional overlay exists; restore to trigger and never discard silently.
- Reduced motion: jump/cross-fade or instant state; focus/meaning unchanged.

## No-JS and degradation matrix

| Failure/state | User experience | Measurement state |
|---|---|---|
| JS blocked | full document, six families, sectors, FAQ, anchors | client analytics unavailable |
| CSS partial | semantic DOM and headings remain | declare visual degradation only |
| asset unavailable | Efeonce treatment + factual text | asset failure logged safely |
| motion unsupported/reduced | final static states | no motion event needed |
| form fails mount | visible Meetings/contact fallback | conversion path degraded |
| Meetings unavailable | assessment remains primary | outbound unavailable |
| cluster not live | no link | no false navigation |
| claim expires | claim block removed | proof completeness degraded |
| analytics blocked | conversion continues | no inferred zero |
| slow network | stable layout and status | latency observable without PII |

## Data & Command Boundaries

- Readers: none introduced by landing; public content is served by WordPress.
- Commands: existing Growth Forms submit only.
- API routes: existing public form contract; no new route from this task.
- Optimistic update: none for business result; only local UI feedback.
- Cache/invalidation: WordPress/Kinsta and canonical public-site process.
- Audit/signals: form/HubSpot readback according to existing contracts.
- Access: public; consent, anti-abuse and origin rules remain server-side.
- Hidden context allowlist: source page, known family key, known sector key and governed UTM only.

## Telemetry Contract

- Canonical conversion: `gh_form_submission_accepted → generate_lead`, once.
- Secondary business signals: Meeting scheduled/held, qualified lead, opportunity and quote, each separate.
- Diagnostic candidates: assessment CTA click, Meetings outbound, family select, sector select, cluster navigation,
  form start, validation error and transport error.
- No new key event without tracking-plan decision.
- Verify consent, dedupe, allowlist, source/medium and cross-domain behavior.
- Absence of analytics data is `unknown`, not zero.

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-flow`.
- Route: preview and canonical live.
- Viewports: 1440×1100, 1024×900, 390×844.
- Steps: each entry path; atlas 01→03→06; sector all→each→reset; no-fit exit; CTA→R11; invalid submit;
  accepted fixture; rejection/error; embed fallback; Meetings; cluster/back; no-JS; reduced motion.
- Captures: entry/hero, selected families, sector, fit, threshold, form ready/invalid/submitting/accepted/error,
  fallback and mobile sequence.
- Markers: all wireframe markers plus `hubspot-form-invalid`, `hubspot-form-accepted`, `hubspot-form-fallback`.
- Assertions: focus, ARIA, history, no hidden content, one primary action, one lead event, no PII, no overflow,
  redirect/canonical and links.
- Reduced-motion evidence: same states reached with no translate/draw/stagger.

## Design Decision Log

- Decision: single-page decision journey with optional exploration; conversion remains a governed endpoint.
- Alternatives: wizard, quiz/grader, modal-first lead form, personalized landing by referrer.
- Why: buyer needs breadth and fit before capture; wizard/modal would hide citable content and increase friction.
- Reuse/extend/new: reuse form/Meetings; extend local atlas/lens.
- Open risks: exact form identity, deep-link value, cluster readiness, server error vocabulary and SLA.
- Follow-up: resolve in TASK-1352 discovery; do not invent in implementation.

## Acceptance Checklist

- [ ] Every entry path reconstructs category, outcome, ownership and action.
- [ ] Six families and three sectors are canonical and fully reachable.
- [ ] Selection changes emphasis only; no hidden truth or opaque personalization.
- [ ] Free assessment boundary precedes form data collection.
- [ ] No-fit provides a safe exit without forced capture.
- [ ] Form states preserve data, focus, privacy and recovery.
- [ ] Only accepted submit is lead; downstream outcomes remain separate.
- [ ] Routing/deep links/back/reload and cluster gates are explicit.
- [ ] No-JS, reduced motion, analytics blocked and dependency failures remain honest.
- [ ] GVC proves flow states, not only static layout.
