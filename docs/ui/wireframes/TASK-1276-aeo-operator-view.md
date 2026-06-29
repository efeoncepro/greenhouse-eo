# TASK-1276 / AEO Operator View — Growth cockpit + Account 360 facet

## Meta

- Status: `draft`
- Owner task: TASK-1276
- Product Design asset: reusa el target aprobado de TASK-1248 (`split-workbench-final-target.png`) — misma `masterDetail` CompositionShell, vista operador
- Intended consumers: operadores internos de Efeonce (Growth/Account) — NUNCA `client_*`
- Copy source: `src/lib/copy/growth.ts` (extender `GH_GROWTH_AI_VISIBILITY_*`, no literals en JSX)
- Primitive decision: `reuse` (CompositionShell `masterDetail` + `TeamAvatarGroup` kind `brands` + report-artifact model)
- UI ready target: `no`

## Brief

- Primary user: operador interno (Account/Growth) que presta el servicio AEO a un cliente
- User moment: revisar el AEO completo de un cliente y registrar el avance del Plan AEO (status por foco)
- Job to be done: ver diagnóstico + recomendaciones accionables + escribir el estado de ejecución (TASK-1275)
- Primary decision signal: qué focos están abiertos/en curso/hechos y dónde está la brecha
- Non-goals: no es la vista cliente (esa es `/aeo`, read-only); no vive en `/admin` (admin = salud de plataforma)

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Breadcrumb "Inicio / Growth / AEO" + título + selector de cliente | `GreenhouseBreadcrumbs` | nav |
| 1 | Cockpit (cross-client) | Lista de clientes con su score AEO + último run | `DataTableShell` | reader cross-org |
| 2 | Navigator (aside) | Dimensiones + Plan AEO (focos) del cliente seleccionado | `CompositionShell` masterDetail | report model |
| 3 | Detail (primary) | Detalle del foco: diagnóstico + charts + **control de status** (write) | report-artifact view + status control | TASK-1275 command/reader |
| 4 | Account 360 facet | Tile "AEO" en el Organization Workspace → deep-link al detalle del cliente | facet del workspace | org workspace projection |
| 5 | Subject picker | elegir target, **agrupado por motion**: clientes con AEO / clientes sin AEO (Expansion) / prospectos HubSpot (New Business) | combobox + búsqueda con grupos | reader orgs + prospectos (TASK-706) |
| 6 | Run CTA (operador) | "Correr AEO" sobre el target (puerta operador) | `GreenhouseButton` | `requestGraderRunForOrganization` (TASK-1277) |
| 7 | Foco competitivo | marca vs competidores / share of voice **POR MOTOR** (AI Overviews · ChatGPT · Perplexity · Gemini), no agregado único — gancho de venta | charts del report (por motor) | report model |
| 8 | Send + opportunity | "Enviar informe + abrir oportunidad" — recipient + **consent + legalBasis + dealIntent** (prospecto) en `propose→confirm→execute` | **AdaptiveSidecar `composer`** (NO confirm embutido en el detail canvas) | `sendAeoReportAndOpenOpportunity` (TASK-1279) |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.aeo.operator.cockpit.title` | 0 | AEO | — | nav interno = "growth" es taxonomía correcta |
| `growth.aeo.operator.status.in_progress` | 3 | En curso | — | espeja enum TASK-1275 |
| `growth.aeo.operator.status.done` | 3 | Hecho | — | |
| `growth.aeo.operator.status.dismissed` | 3 | Descartado | reason | requiere motivo |
| `growth.aeo.account360.facet.title` | 4 | AEO | — | facet Account 360 |
| `growth.aeo.operator.run.cta` | 6 | Correr AEO | — | puerta operador |
| `growth.aeo.operator.send.cta` | 8 | Enviar informe + abrir oportunidad | — | consume TASK-1279 |
| `growth.aeo.operator.send.consent_required` | 8 | Registra el consentimiento del contacto para enviar | — | prospecto, NUNCA cold send |
| `growth.aeo.operator.send.legal_basis.label` | 8 | Base legal del envío | — | input requerido por el command (`legalBasis`) |
| `growth.aeo.operator.send.deal_intent.expansion` | 8 | Abrir oportunidad de expansión | — | cliente → pipeline Expansion (`dealIntent`) |
| `growth.aeo.operator.send.deal_intent.new_business` | 8 | Abrir oportunidad nueva | — | prospecto → pipeline New Business (`dealIntent`) |
| `growth.aeo.operator.competitive.per_engine` | 7 | Cómo te ve cada motor | engine name | SoV por motor, no agregado |
| `growth.aeo.operator.send.sent` | 8 | Informe enviado · oportunidad abierta | deal link | éxito |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | cockpit + workbench con data | — | |
| loading | — | skeletons del cockpit + workbench | — | |
| empty | Sin runs AEO | Este cliente aún no tiene un diagnóstico AEO | Generar/agendar (según capability) | |
| partial | — | algunos focos sin status | — | degradación honesta |
| error | No pudimos cargar el AEO | — | Reintentar | actionable=true |
| denied | — | el operador sin scope de la org no ve el cliente | — | tenant boundary |

## Accessibility Contract

- Heading order: h1 (AEO) → h2 (cliente) → h3 (foco)
- Chart/table alternatives: reusa las alternativas accesibles del report-artifact (TASK-1248/1252)
- Aria labels: control de status con label explícito + estado por color-independiente (texto, no solo color)
- Focus notes: foco vuelve al foco seleccionado tras escribir status
- Color-independent state labels: status como texto + chip nombrado, nunca color solo

## Implementation Mapping

- Route / surface: `/growth/aeo` (cockpit) + `/growth/aeo/[organizationId]` (detalle operador) + facet AEO en el Organization Workspace (Account 360). NO `/admin`.
- Primitives: `CompositionShell` (`masterDetail`), `TeamAvatarGroup` (`brands`), report-artifact view, `DataTableShell`
- Variants / kinds: composición `masterDetail`, kind `workbench`
- Component candidates: reuso del view-adapter de `modelFromClientReport` en variante operador + control de status nuevo
- Copy source: `src/lib/copy/growth.ts`
- Data reader / command: `readRecommendationStatuses` + `setRecommendationStatus` (TASK-1275) + reader del reporte operador-scoped `[verificar]`
- API parity: la escritura de status es el command gobernado de TASK-1275 (UI = cliente del primitive)
- Access / capability: viewCode interno (sección Growth, routeGroup `internal`, NUNCA `client_*`) + capability `growth.ai_visibility.recommendation.set_status` para el write
- Runtime consumers: operador UI (write) · Nexa/MCP (por construcción)
- Print/email/PDF considerations: reusa el PDF de TASK-1273 si el operador exporta
- GVC markers: `data-capture="aeo-operator-cockpit"`, `data-capture="aeo-operator-detail"`

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-aeo-operator.scenario.ts` (nuevo)
- Route: `/growth/aeo` + `/growth/aeo/[organizationId]` (o mockup harness si la data no está)
- Viewports: desktop 1440 + mobile 390
- Required steps: cargar cockpit → seleccionar cliente → abrir foco → cambiar status
- Required captures: cockpit, workbench operador, control de status
- Required `data-capture` markers: `aeo-operator-cockpit`, `aeo-operator-detail`
- Assertions: noLoginRedirect, noErrorBoundary
- Scroll-width checks: sin scroll horizontal desktop ni mobile 390
- Accessibility/focus checks: foco restaurado tras write de status
- Reduced-motion evidence: status change sin motion gratuito (reduced-motion safe)

## Design Decision Log

- Decision: la vista operador vive en **Growth + facet Account 360**, NO en `/admin`
- Alternatives considered: `/admin/growth/ai-visibility` (rechazado: admin = salud operativa de plataforma, no programa Growth)
- Why this pattern: dos modelos mentales — Growth = programa AEO cross-cliente; Account 360 = "este cliente" contextual; ambos al mismo detalle por-cliente
- Reuse / extend / new primitive: `reuse` (masterDetail + report model + TeamAvatarGroup); status control = componente nuevo cliente del command de TASK-1275
- Open risks: que el detalle por-cliente requiera un reader operador-scoped distinto del client-scoped (TASK-1243) — resolver en Discovery
- Follow-up: mostrar el status también en la vista cliente `/aeo` (follow-up TASK-1248)

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
