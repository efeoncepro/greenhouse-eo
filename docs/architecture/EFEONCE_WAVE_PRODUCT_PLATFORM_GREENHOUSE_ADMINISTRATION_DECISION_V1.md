# ADR — Wave como product house y Greenhouse como administración transversal

> **Status:** `Proposed`
> **Date:** 2026-07-27
> **Owner:** Wave Product + Product/Architecture + Greenhouse Platform
> **Scope:** Efeonce product houses, Wave, sus Product Services, Agentic Readiness, Greenhouse Admin, sister-platform integrations
> **Reversibility:** `two-way-but-slow`
> **Confidence:** `medium`
> **Validated as of:** 2026-07-27 — validación documental contra el modelo de Wave, el contrato de sister platforms y el patrón de Globe; runtime propio de Wave aún no verificado en este repositorio.

## Context

La documentación vigente reconoce a Wave como product brand de servicios digitales, pero todavía mezcla la capa de
producto con el portal Greenhouse. La dirección confirmada por el operador es que Wave será la **casa de producto** de
todos sus Product Services, de forma análoga a cómo Globe posee su propia plataforma creativa.

Greenhouse será el **admin/control plane transversal de todas las plataformas y product houses de Efeonce**, no sólo de
Wave. Esto exige separar claramente:

- quién posee la experiencia y runtime del producto;
- quién administra organizaciones, acceso, relaciones, contratos y operaciones;
- dónde viven los datos y secretos;
- cómo se integran los sistemas sin compartir runtime ni source of truth.

## Decision

Wave será el **product house de la capa de producto digital** de sus Product Services. Wave posee, por Product Service o
producto compuesto:

- la experiencia de producto pública, interna y cliente;
- los contratos API/readers/commands aplicables;
- el runtime de ejecución, workers y proveedores;
- la evidencia, scoring, reportes y lifecycle funcional;
- la infraestructura, secretos, observabilidad, costos y recuperación propios;
- el roadmap y la evolución de producto.

Greenhouse será el **admin/control plane transversal de todo el ecosistema de productos Efeonce**. Greenhouse posee:

- la administración de organizaciones, espacios, usuarios y relaciones Efeonce;
- la entrada de identidad del ecosistema y la federación SSO hacia las plataformas habilitadas;
- bindings explícitos hacia productos hermanos;
- administración transversal de acceso/entitlements cuando corresponda, con enforcement local en Wave;
- contratos comerciales, engagement, delivery, handoffs y reporting administrativo;
- deep links, proyecciones y señales consumibles por el portal;
- integración gobernada con Wave, sin apropiarse de su runtime ni de sus datos transaccionales.

Todos los productos que nazcan bajo una product house Efeonce deben ser **Agent Native** y tener **Full API Parity**
desde el contrato inicial. La UI, el agente, MCP/SDK, API y automatizaciones deben consumir los mismos commands,
readers, capabilities, contratos de evidencia y reglas de autoridad. Agent Native no significa autonomía irrestricta:
la autoridad, aprobaciones, budgets, tools y evaluación siguen siendo explícitos.

La relación comercial y contractual continúa liderada por Efeonce. Wave es la casa de producto; no una entidad
contractual separada por defecto.

## Identity and access experience

Clientes y colaboradores deben autenticarse una sola vez para acceder a las plataformas Efeonce que tienen habilitadas.
Greenhouse funciona como entry point administrativo y proveedor de contexto/federación; entrar a Wave, Globe, Kortex,
Verk u otra plataforma habilitada no debe pedir un segundo login.

La regla es **una identidad y una experiencia de acceso, con enforcement local por plataforma**:

- Greenhouse administra la identidad del ecosistema, la relación con organización/space, bindings y entitlements
  administrativos.
- La plataforma destino recibe una sesión federada o handoff firmado y resuelve un subject local estable, sin copiar ni
  compartir una base de usuarios transaccional.
- Wave conserva sus propios permisos, tenancy, capabilities, sesiones internas cuando apliquen y reglas de autoridad.
- Una revocación, expiración o cambio de entitlement debe impedir el acceso tanto desde Greenhouse como desde el deep
  link directo a la plataforma destino.
- El menú, launcher o deep link de Greenhouse sólo muestra superficies autorizadas; ocultar una opción nunca reemplaza
  el enforcement server-side del producto destino.
- La sesión unificada no autoriza acceso implícito entre plataformas ni permite que una plataforma lea o mute el runtime
  de otra fuera de su contrato.

## Product Services covered by Wave

La decisión aplica a:

1. Search Visibility 360.
2. Web Experience 360.
3. Measurement & Analytics.
4. Agent Systems & Platforms.
5. Digital Automation & Integrations.

Sobre estas familias, Wave puede construir Product Services compuestos. **Experience LaunchOps** y **Agentic Readiness**
son los primeros ejemplos documentados; ninguno crea una sexta familia. Experience LaunchOps integra web, Search/AEO,
measurement, agentes, automatización, governance y release. Agentic Readiness funciona como diagnóstico/wedge y puede
abrir esas mismas rutas de expansión.

Wave debe operar una arquitectura de **puertas especializadas**, no un mega-diagnostic único:

```text
Brand Visibility Snapshot / Grader
→ Search Visibility 360

Agentic Readiness Snapshot / Audit
→ Web Experience 360 + Agent Systems & Platforms

Launch Readiness / Experience Diagnostic
→ Experience LaunchOps
```

Las puertas pueden compartir plataforma, identidad, evidencia, distribución y administración Greenhouse, pero no deben
compartir scoring, claims, reportes ni next steps por conveniencia. Cada una conserva un problema y una decisión de
compra reconocibles.

El primer recorrido de **Agentic Readiness** será:

```text
Agentic Readiness Snapshot
→ Agentic Readiness Grader/Audit
→ Agent-Ready Web Foundation
→ Search Visibility / Agent Systems / Automation / Measurement
→ Monitoring recurrente
```

## Boundary model

| Concern | Wave | Greenhouse |
|---|---|---|
| Product UI and customer workbench | Source of truth | Deep link/projection only |
| Product API and execution commands | Owner | Consumer through governed adapter |
| Product data, evidence and scoring | Source of truth | Public/admin-safe projection only |
| Workers, providers and Lighthouse/Chromium | Owner | No execution ownership |
| Organization/space/customer relationship | Consumes explicit binding | Source of truth |
| Admin access and commercial context | Enforces local product policy from context | Administers cross-product context |
| Contracts, SOW, delivery and handoffs | Product delivery inputs | Source of truth for Efeonce operations |
| Secrets, databases and deployment | Isolated Wave runtime | Isolated Greenhouse runtime |

Greenhouse administra también los bindings, acceso administrativo y proyecciones de otras product houses como Globe,
Kortex, Verk y futuras plataformas. Esa administración transversal no convierte sus runtimes, bases de datos o
capabilities en módulos Greenhouse.

## Integration contract

Wave and Greenhouse are peer systems:

- no shared database, runtime, session store or undifferentiated secret namespace;
- all cross-platform access uses stable IDs and explicit `sister_platform_bindings`;
- read/context/deep-link flows are preferred before cross-platform mutations;
- mutations require an explicit Wave API/command contract, actor, capability, idempotency and audit trail;
- events and projections are versioned, tenant-safe and replay/reconciliation aware;
- Greenhouse may show status, summaries and approved deliverable references, but cannot reconstruct Wave scoring or
  mutate Wave storage directly;
- Wave may consume Greenhouse context only through the approved integration contract and cannot infer authorization
  from labels or URLs.

## Agentic Readiness boundary

The Agentic Readiness product owns in Wave:

- public snapshot and intake contract;
- Lighthouse/Chromium and technical probes;
- agent task evaluation and evidence;
- readiness dimensions, score and confidence/insufficient-data states;
- internal/client-safe report models;
- remediation plan, monitoring and historical trend;
- product-specific runtime cost and provider governance.

Greenhouse may administer:

- which organization or prospect is bound to the Wave product;
- product access and commercial context;
- operator handoff, lead lifecycle and account reporting;
- safe summary projections and deep links.

The current Greenhouse Brand Visibility Grader remains a coexistence/legacy rail until a later migration decision.
This ADR does not authorize extracting or moving it.

## Agent Native and Full API Parity contract

Para todo nuevo producto de Wave:

- la intención puede entrar por UI, API, MCP, SDK o agente autorizado;
- todos los consumers resuelven el mismo command/reader contract server-side;
- la UI no contiene lógica de negocio exclusiva ni es el único camino ejecutable;
- cada capability declara actor, scope, autoridad, aprobación, idempotencia, audit, coste y degradación;
- los agentes no pueden ampliar permisos, presupuesto, tenant, scope ni lifecycle por inferencia;
- la evaluación del agente usa evidencia del mismo runtime y distingue `propose`, `approve`, `execute` y `judge`;
- API parity se verifica con una coverage matrix y conformance tests antes de promover la capability.

El baseline no requiere que todos los productos compartan una API monolítica. Requiere que cada producto tenga sus
contratos programáticos equivalentes y que Greenhouse administre su acceso y proyección mediante adapters gobernados.

## Alternatives considered

### A. Keep Agentic Readiness inside Greenhouse

Rejected as the target shape. It would repeat the product/runtime coupling that this decision is intended to resolve and
make Greenhouse the accidental owner of Wave product IP, workers, providers and customer-facing UX.

### B. Create a sixth independent product outside Wave

Rejected. Agentic Readiness composes Web Experience, Search Visibility, Agent Systems, Measurement and Automation. A
separate house would fragment ownership and commercial expansion without a distinct customer boundary.

### C. Put every Wave Product Service in one undifferentiated runtime

Rejected as a default. Wave may share platform primitives, identity adapters and evidence conventions, but each Product
Service must retain a bounded contract, owner, lifecycle and deployment decision.

### D. Treat Wave as only a service label and let delivery teams own the platform

Rejected. It would prevent repeatable product evolution, weaken evidence ownership and make every service a custom
implementation.

## Consequences

### Benefits

- Wave can evolve product experiences independently of Greenhouse releases.
- Product IP, runtime cost and evidence remain attributable to the correct product house.
- Greenhouse gains a consistent admin pattern across Wave, Globe and future sister platforms.
- Agentic Readiness can serve as lead magnet, internal workbench, client product and commercial wedge without changing
  ownership each time.

### Costs and risks

- A new Wave runtime requires its own identity, tenancy, observability, deploy, support and recovery controls.
- Cross-platform projections introduce eventual consistency and reconciliation work.
- The current Greenhouse grader creates a migration/coexistence burden.
- Product boundaries must be enforced in contracts, not only in repository folders or branding.

## Quality scenarios

| Concern | Scenario | Measure / evidence |
|---|---|---|
| Source of truth | Greenhouse reads a Wave readiness result | No Wave scoring/data tables are recreated in Greenhouse; projection carries provenance and version |
| Tenant safety | A client requests a report through Greenhouse | Binding resolves one authorized Wave tenant; cross-tenant reads are denied and audited |
| Product independence | Wave ships a report/runtime change | Greenhouse remains compatible through versioned projection/contract without importing Wave internals |
| Single access experience | A user opens an enabled Wave or Globe surface from Greenhouse | No second login; federated subject resolves to the correct local tenant and revoked access fails closed |
| Cost control | A public snapshot triggers analysis | Wave applies budget, rate, provider and stop-loss controls before provider execution |
| Failure isolation | Wave is unavailable | Greenhouse shows a degraded/deep-link state; it does not retry or execute Wave logic locally |
| Evidence integrity | An Agentic Readiness score is shown | Score links to run/model/provenance and distinguishes measured, unavailable and insufficient-data states |
| Commercial routing | A diagnostic finishes for a Wave account | Report and CRM handoff identify the affected Wave route and a concrete next decision; no generic lead-only outcome |

## Transition and rollout

1. Accept this ADR and define the Wave repository/runtime as the implementation home.
2. Define the Agentic Readiness product contract and first governed slice.
3. Build Wave-side product/runtime foundations and a Greenhouse read/admin bridge in separate tasks.
4. Keep the current Brand Visibility Grader operational during coexistence; do not perform a big-bang extraction.
5. Revisit migration only after Wave has a verified runtime, product evidence, cost baseline and consumer parity.

## Revisit when

- Wave repository/runtime ownership is confirmed or changes materially.
- A Product Service needs a shared platform primitive that changes the current boundary.
- Greenhouse requires a write path into Wave beyond the current read/admin model.
- Cross-platform latency, cost, tenant, security or recovery evidence breaches the agreed thresholds.
- The Brand Visibility Grader migration/coexistence decision becomes actionable.
