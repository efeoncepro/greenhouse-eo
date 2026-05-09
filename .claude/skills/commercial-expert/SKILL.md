---
name: commercial-expert-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global commercial-expert skill defaults. Load this first whenever commercial-expert is invoked inside the greenhouse-eo repo. Specializes in ASaaS doctrine (Manifesto V1), Bow-tie alignment with Greenhouse runtime, 3 client_kind playbooks (Active/Self-Serve/Project), Globe clients ICP (enterprise marketing teams), 4-product positioning (servicio agencia / Kortex / Verk / Greenhouse portal), HubSpot portal 48713323 operations, Nubox billing implications, ICO health score integration.
type: overlay
overrides: commercial-expert
user-invocable: true
argument-hint: "[area or specific question]"
---

# commercial-expert — Greenhouse Overlay

This file **overrides** the global `commercial-expert` skill's defaults when working inside the `greenhouse-eo` repository. When there's a conflict, **this overlay wins**.

**Load order**: read global `commercial-expert/SKILL.md` first → then read this overlay → then apply rules.

## Why this overlay exists

The global commercial-expert is good for any modern B2B / SaaS / agency / ASaaS scenario. Greenhouse / Efeonce has specific commercial reality:

- **ASaaS as pinned doctrine** (`docs/strategy/ASAAS_MANIFESTO_V1.md`) defines the model
- **Bow-tie spec adopted** (`spec/Arquitectura_BowTie_Efeonce_v1_1.md` + `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`)
- **3 client_kinds canonical** (Active Account / Self-Serve Customer / Project Customer)
- **4 products** with specific positioning rules
- **Globe clients ICP** (enterprise marketing teams in airlines, banking, retail, telco, manufacturing)
- **Stack runtime**: HubSpot portal 48713323 + Greenhouse operational portal + Nubox billing + Notion delivery + Teams comms

This overlay pins those decisions so the global skill operates against Efeonce's specific runtime.

---

## Canonical authoritative sources (read first when relevant)

- **`docs/strategy/ASAAS_MANIFESTO_V1.md`** — doctrine canónica del modelo ASaaS Efeonce
- **`spec/Arquitectura_BowTie_Efeonce_v1_1.md`** — modelo comercial canónico (HubSpot CRM)
- **`docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`** — contrato puente Bow-tie ↔ Greenhouse
- **`docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`** — operational case lifecycle
- **`docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`** — modelo canónico de identidad
- **`docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`** — economía unitaria por miembro
- **`docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`** — finance domain
- **`CLAUDE.md`** at repo root — operational contract for all agents

---

## Pinned decisions (OVERRIDES global commercial-expert)

### 1. ASaaS Manifesto es la doctrina vinculante

Cualquier recomendación comercial sobre el modelo de negocio (pricing, packaging, positioning, motion design) debe respetar el manifesto. Si la skill propone algo que contradice el manifesto, **el manifesto gana** salvo que el usuario explícitamente pida desafiarlo.

Hard rules del manifesto que tienen consecuencia comercial inmediata:

- **NUNCA** vender un retainer sin scope canónico documentado + telemetría + revisión trimestral
- **NUNCA** firmar SOW sin loaded cost actualizado + project margin proyectado
- **NUNCA** descontar sin obtener concesión recíproca documentada
- **NUNCA** cobrar pilot/discovery sin entry criteria de conversión
- **NUNCA** posicionar los 4 productos a la vez en pitch
- **NUNCA** llamar "ASaaS" a un servicio sin productización + telemetría + economía unitaria

Ver `greenhouse-overlay/asaas-positioning.md` para cómo aplicarlo en discovery + pitch + pricing.

### 2. 3 client_kind playbooks distintos

Los clientes Efeonce no son fungibles. Cada `client_kind` tiene motion, métrica, cadencia, owner role distintos. **NUNCA tratarlos uniformemente.**

| `client_kind` | Motion | Owner | Cadence | North star metric |
|---|---|---|---|---|
| `active` | Account-based, MEDDPICC + Challenger + JTBD | Account Lead | QBR trimestral formal | NRR > 110% |
| `self_serve` | PLG, lifecycle email + in-product | Automation + CSM (futuro) | Digital, in-product | Trial-to-paid + monthly active usage + tier upgrade rate |
| `project` | Hybrid, MEDDPICC light | PM + Account Lead light | Cierre proyecto + post-mortem | Project margin > 30% + conversion to Active or Self-Serve |

Detalle completo en `greenhouse-overlay/client-kind-playbooks.md`.

### 3. ICP Globe = enterprise marketing teams (estricto)

ICP target principal: equipos de marketing enterprise en aviación, banking, retail, telco, manufacturing, services. NO empresas que buscan agencia barata. NO SMBs sin team marketing in-house. NO compañías culture procurement-first.

Detalle ICP completo + anti-ICP en `greenhouse-overlay/globe-clients-icp.md`.

### 4. 4 productos con regla de positioning

| Producto | Cuándo es eje | Cuándo es soporte |
|---|---|---|
| Servicio agencia | Active Account | N/A — corazón ASaaS |
| Kortex | Self-Serve standalone | Componente data CRM en Active |
| Verk | Self-Serve standalone | Componente analítico en Active |
| Greenhouse portal | N/A — siempre soporte | Plumbing en Active y Project |

**Regla**: nunca pitch los 4 a la vez. Decision tree completo en `greenhouse-overlay/product-suite-positioning.md`.

### 5. Métricas Bow-tie computadas Greenhouse-side

Las 6 métricas Bow-tie (NRR, GRR, Expansion Rate, Logo Retention, Time-to-Expansion, Renewal Rate) se computan en `greenhouse_serving.bowtie_metrics_monthly` (TASK-833). HubSpot recibe via projection (TASK-831).

Cualquier discusión sobre métricas dentro del repo debe referenciar la VIEW canónica + helper TS, no fórmulas inventadas. Lint rule `greenhouse/no-untokenized-bowtie-metric-math` rompe build.

Detalle en `metrics/bowtie-metrics-engine.md` (global skill).

### 6. ICO health score integrado al `is_at_risk`

El motion property `is_at_risk` (Bow-tie §7.1) se computa Greenhouse-side con 3 triggers (TASK-832), uno de los cuales es ICO health score en rojo. La integración es bidireccional:

- ICO score afecta `is_at_risk` → projection a HubSpot
- Renewal motion responde a `is_at_risk` → priorización dashboard

Detalle en `greenhouse-overlay/ico-health-score-integration.md`.

### 7. HubSpot portal 48713323 es el CRM canónico

Toda operación CRM (deals, properties, pipeline) vive en HubSpot portal 48713323. Compositions, stages custom, properties contractuales, motion properties: configurados via runbook TASK-830.

Skill defers a:

- `hubspot-greenhouse-bridge` para mecánica del bridge Cloud Run
- `hubspot-ops` para CLI ops del portal
- claude.ai HubSpot MCP para fetching live data

Detalle en `greenhouse-overlay/hubspot-portal-operations.md`.

### 8. Nubox billing reality

Facturación cliente vive en Nubox (no HubSpot, no Greenhouse). Cualquier discusión de pricing / billing / invoicing debe respetar:

- Tax compliance Chile SII (DTE, IVA, retenciones)
- LATAM multi-tax para clientes Globe internacionales
- Currency: CLP primary, USD/EUR para Globe internacional con FX awareness (TASK-766 reader)
- Greenhouse no factura — refleja state Nubox via sync

Detalle en `greenhouse-overlay/nubox-billing-implications.md`. Para profundizar finance, defer to `greenhouse-finance-accounting-operator`.

### 9. Bow-tie alignment es non-negotiable

Cualquier decisión comercial dentro del repo (pricing, motion, comp plan, dashboard) debe alinear con el Bow-tie spec. Si no alinea, primero se actualiza el Bow-tie (proceso formal), luego se ejecuta la decisión.

Esto evita drift entre commercial decisions ad-hoc y la arquitectura canónica.

Detalle en `greenhouse-overlay/bowtie-alignment.md`.

### 10. Stack runtime adoptado

- **CRM**: HubSpot portal 48713323
- **Operational portal**: Greenhouse (este repo)
- **Billing**: Nubox
- **Delivery**: Notion (sync TASK-Notion-conformed-pipeline)
- **Comms cliente**: Teams + email
- **AI / ML**: Vertex AI + Gemini (use `gcp-vertex-ai` skill)
- **Data warehouse**: BigQuery `efeonce-group` + PostgreSQL `greenhouse-pg-dev`

Cualquier "necesitamos otro CRM / billing / portal" requiere ADR formal. **Boring tech preference**: lo que tenemos > lo nuevo, salvo justificación dura.

---

## Greenhouse-canonical patterns inventory

When advising commercial decisions inside this repo, the patterns below are pre-canonized:

| Need | Reference | Pattern |
|---|---|---|
| Pricing decision con margin transparency | TASK-MEMBER_LOADED_COST + ASaaS Manifesto §6.2 | Loaded cost model + margin breakdown post-MSA |
| Pipeline metric drift | Bow-tie spec §9 + TASK-833 | VIEW `bowtie_metrics_monthly` + helper + reliability signals |
| HubSpot config drift | TASK-830 | Runbook + verify script + reliability signal |
| HubSpot ↔ Greenhouse projection | TASK-831 | Reactive consumer + outbox + dead_letter |
| `is_at_risk` evaluation | TASK-832 | 3 triggers + Cloud Scheduler cron + projection |
| Operational case lifecycle | TASK-816..821 | DDL + commands + UI + cascade + HubSpot trigger |
| Client onboarding cascade | TASK-820 cascade | Outbox `client.lifecycle.case.completed` → reactive consumers |
| Capability-gated commercial action | TASK-403 + TASK-742 | Capability granular + audit log + reliability signal |

---

## Hard rules (Greenhouse-specific commercial)

- **NUNCA** proponer pricing change sin validar contra Loaded Cost Model + Bow-tie metrics impact
- **NUNCA** posicionar los 4 productos a la vez (regla del manifesto)
- **NUNCA** describir un servicio como "ASaaS" sin scope canónico + telemetría + economía unitaria documentadas
- **NUNCA** sugerir motion comercial sin alinear con `client_kind` correspondiente
- **NUNCA** computar NRR/GRR/Expansion Rate fuera de la VIEW canónica
- **NUNCA** asumir que HubSpot lifecyclestage es source of truth — Greenhouse manda (spec puente §3.1)
- **NUNCA** recomendar discount sin concesión recíproca documentable
- **NUNCA** crear capability comercial sin gate granular least-privilege
- **SIEMPRE** referenciar el manifesto ASaaS al hablar de positioning del modelo
- **SIEMPRE** distinguir las 3 client_kind audiences (Active/Self-Serve/Project) en motion + content + pricing decisions
- **SIEMPRE** invocar `arch-architect` cuando una decisión comercial fuerza arquitectura nueva
- **SIEMPRE** invocar `greenhouse-finance-accounting-operator` cuando pricing decision toca margin / FX / accounting

---

## Synergies with other skills

- `arch-architect` (greenhouse-pinned) — cuando commercial decision fuerza arquitectura
- `greenhouse-finance-accounting-operator` — pricing con margin transparency, deal economics, revenue recognition
- `hubspot-greenhouse-bridge` — operational mechanics of HubSpot integration
- `hubspot-ops` — HubSpot CLI / portal config operations
- `greenhouse-ux-writing` — cualquier microcopy comercial visible al cliente
- `greenhouse-payroll-auditor` — when pricing decision affects member loaded cost
- `claude-api` — when designing AI-assisted prospecting / conversation intelligence

---

## Output convention

Commercial deliverables generated within this repo go to:

- **Strategic docs**: `docs/strategy/` (manifesto, ICP refinements, motion designs, pricing strategy)
- **Operational playbooks**: `docs/playbooks/` (sales playbooks, onboarding playbooks, QBR templates per client_kind)
- **Battlecards / Win-loss / ICP canvases**: `docs/sales-enablement/`
- **ADRs comerciales**: `docs/adr/` if introduced (consult user before introducing pattern broadly)

Ad-hoc deal reviews / MEDDPICC cards / forecasts: discutir vía conversation, no commit a repo (transient operational data).

---

## File map (Greenhouse overlay)

```
.claude/skills/commercial-expert/
├── SKILL.md                           # this file
└── greenhouse-overlay/
    ├── bowtie-alignment.md            # alineación spec Bow-tie + spec puente
    ├── client-kind-playbooks.md       # 3 playbooks (Active / Self-Serve / Project)
    ├── globe-clients-icp.md           # ICP Globe + anti-ICP
    ├── asaas-positioning.md           # narrative + pitch + pricing ASaaS
    ├── product-suite-positioning.md   # decision tree 4 productos
    └── (futuros: ico-health-score-integration.md, hubspot-portal-operations.md, nubox-billing-implications.md)
```

V1.0 prioriza los 5 archivos arriba. V1.1 agrega los 3 que faltan según necesidad.
