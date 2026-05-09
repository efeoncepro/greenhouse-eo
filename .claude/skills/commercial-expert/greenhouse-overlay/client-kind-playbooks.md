---
last-revised: 2026-05-07
type: greenhouse-overlay
---

# Client Kind Playbooks (Active / Self-Serve / Project)

Los 3 tipos de cliente Efeonce no son fungibles. Cada uno requiere motion, owner, métrica, cadencia y pricing distintos. Tratarlos uniformemente es el error #1 que destruye economía unitaria ASaaS.

Bow-tie spec §5.1 + ASaaS Manifesto §4 son ground truth.

---

## Playbook 1 — Active Account (`client_kind='active'`)

### Quién

Cliente enterprise con MSA + SOWs activos. Operación profunda + recurring. Ej: Sky Airlines, ANAM, Grupo Aguas.

### ICP fit

- Decisor: CMO / Head of Marketing / Head of Brand / Director Performance Marketing
- Buying committee: 5-10 stakeholders (CMO + procurement + legal + IT security + brand director + performance director + analytics lead)
- Empresa: > $100M revenue B2C, > $500M B2B
- Marketing team in-house: 10+ FTEs

### Sales cycle

- 3-9 meses
- Discovery: MEDDPICC + JTBD profundo + Challenger insight
- Proposal: Command of the Message + business outcomes anchored
- Negotiation: deal architecture (multi-year, ramps, opt-outs) + Voss tactical empathy
- AOV: $30K-$500K+ anuales

### Owner role

**Account Lead** (1 senior por cliente). Account-based. Account Lead es accountable for:

- Strategic relationship con economic buyer + champion
- QBR planning + execution
- Renewal motion 90 días before MSA end
- Expansion plays (cross-sell servicios, upsell tier, new SOW)
- Health score monitoring (`is_at_risk` triggers)

### QBR cadence

**Trimestral business review formal** con economic buyer + champion + (optionally) board observer.

QBR canónico per Active:
1. Outcomes update (vs metrics MEDDPICC declarados al cierre)
2. Operational health (delivery telemetría Greenhouse portal)
3. Financial transparency (margin breakdown si NRR > 100% > 12 meses)
4. Roadmap próximos 90 días (delivery + product)
5. Expansion conversation (qué dolores nuevos / oportunidades)
6. Renewal anchor (si MSA en 12 meses)

### North star metrics

| Metric | Target | Frequency |
|---|---|---|
| NRR (per Account) | > 110% | Mensual rolling 12m |
| Logo retention | 100% (no perder Active) | Trimestral |
| Expansion deals/year | ≥ 1 per Active | Trimestral |
| Time-to-Expansion | < 180 días desde Closed-Won | Cohort tracked |

### Pricing model

- **Retainer flat** (MSA monthly value) cubriendo equipo dedicado per scope
- **+ SOWs** project-based para trabajos específicos out-of-scope MSA
- **+ SaaS subs** (Kortex / Verk) cuando aplica
- Annual price review obligatorio
- Margin transparency post 12 meses NRR > 100%

### Hard rules Active

- **NUNCA** renewal sin Account Lead haciendo MEDDPICC review 90 días before MSA end
- **NUNCA** bajar retainer mensual sin scope reduction recíproca
- **NUNCA** ofrecer descuento sin multi-year + case study + referencia mínimas
- **NUNCA** dejar caso operational pending checklist > 14 días sin escalation
- **SIEMPRE** dashboard Active visible para economic buyer + champion (Greenhouse portal client access)

### Anti-patterns Active

- Tratar Active como Self-Serve (impersonal automation) — destruye trust
- Tratar Active como Project (relación transaccional) — pierde NRR
- Account Lead manageando > 5 Active simultáneamente — calidad colapsa
- Skipping QBR por "el cliente está cómodo" — primer signal de churn

### Owner skill stack

Account Lead canónico debe dominar:

- MEDDPICC + JTBD + Forces of Progress
- Challenger Sale Take Control
- Command of the Message
- Voss tactical empathy
- Bow-tie metrics interpretation
- Loaded Cost Model thinking
- Industry knowledge específico al cliente

---

## Playbook 2 — Self-Serve Customer (`client_kind='self_serve'`)

### Quién

Cliente que paga solo SaaS subscription (Kortex y/o Verk) sin MSA de servicio. PLG puro.

### ICP fit

- Decisor: founder / VP / individual practitioner / small team lead
- Decision: individual o team < 5 personas
- Empresa: cualquier tamaño con buyer empowered (auto-buy)
- Geographic: agnostic, PLG global

### Sales cycle

- Días-semanas
- Discovery: in-product activation events + lifecycle email + minimal sales touch
- Free trial → paid (PLG canon)
- Tier upgrade: usage-driven prompts + email lifecycle
- AOV: $50-$2K mensuales

### Owner role

**Automation primary + future CSM** para tier upgrades + retention triggers.

V1.0: motion 100% automation (no FTE dedicado). V1.1+: dedicated CSM cuando MRR Self-Serve justifica.

### QBR cadence

**Digital, in-product**. NO QBR formal.

- Email lifecycle: welcome series + activation triggers + monthly value summary + renewal nurture
- In-product NPS surveys
- Usage-based health score triggers expansion / churn outreach

### North star metrics

| Metric | Target | Frequency |
|---|---|---|
| Trial-to-paid conversion | > 20% | Cohort mensual |
| Monthly active usage | > 60% of seats | Mensual |
| Tier upgrade rate | > 15% YoY | Trimestral |
| Self-Serve churn | < 5% mensual gross | Mensual |
| Expansion via tier upgrade | tracked in $/% | Trimestral |

### Pricing model

- **Tier good/better/best** con anchoring (middle tier target ~70% adoption)
- Annual prepay discount (10-20%) para reduce churn
- Pricing tiers value-based con value metric (seats / usage / outcomes — depende producto)
- **NUNCA** custom pricing en Self-Serve (rompe el modelo)

### Hard rules Self-Serve

- **NUNCA** dedicated rep para deal Self-Serve (rompe unit economics)
- **NUNCA** custom contract / negotiation 1:1 (pricing es self-service)
- **NUNCA** pitchear servicios agencia desde Self-Serve sin transition path documentado
- **SIEMPRE** medir trial-to-paid conversion + identificar fricciones
- **SIEMPRE** lifecycle email automation correlacionada a activation events

### Anti-patterns Self-Serve

- Empujar Self-Serve a Active prematuro (cuando no fit) — baja LTV ratio
- Friction en sign-up / billing por compliance o T&C complejos — destruye conversion
- "We need to get on a call" antes de paid trial — rompe PLG principle

### Path to Active

Algunos Self-Serve evolucionan a Active. Triggers para detectar:

- Self-Serve subscribe + crece team in-product > 10 seats
- Self-Serve solicita custom integration / scoping
- Self-Serve cliente growth + emerge necesidad de strategic services

→ Account-based outreach hand-off a sales (Account Lead opportunity).

---

## Playbook 3 — Project Customer (`client_kind='project'`)

### Quién

Cliente con SOW puntual sin MSA recurrente y sin SaaS. Trabajo específico con principio y fin.

### ICP fit

- Variado, pero generalmente:
- Empresas que conocen el equipo Efeonce vía referidos / community / events
- Necesidad específica time-bound (rebranding, audit, content production short-term)
- Decision committee menor (2-4 stakeholders)

### Sales cycle

- Semanas-meses
- Discovery: MEDDPICC light (M+I+D-Process+P-Process minimum)
- Scope-based proposal con clear deliverables + SLA
- AOV: $10K-$100K

### Owner role

**PM (Project Manager)** + Account Lead light supervisión.

PM es accountable for:
- Project scope + delivery
- Margin tracking (target > 30%)
- Scope creep prevention
- Cierre + post-mortem
- Conversion identification (potencial Active or Self-Serve)

### Cadence

**Solo cierre de proyecto + post-mortem**. NO QBR formal recurring.

- Kickoff + weekly status + milestone reviews + closeout
- Post-mortem documenta: what worked, what didn't, conversion potential

### North star metrics

| Metric | Target | Frequency |
|---|---|---|
| Project margin | > 30% | Per project |
| NPS | > 8 | Closeout |
| Conversion to Active or Self-Serve | tracked | Per project |
| Scope creep | minimized via change orders | Per project |

### Pricing model

- **Project-based fixed-fee** (preferred) o **time-and-materials with cap** (when scope ambiguous)
- 50% upfront, 50% on delivery (or milestone-based)
- Loaded cost + reasonable margin (cost-plus para Project es aceptable, value-based bonus)

### Hard rules Project

- **NUNCA** Project sin scope canónico documentado + change order policy
- **NUNCA** scope creep absorbido sin change order
- **NUNCA** pricing < cost recovery + 30% margin
- **NUNCA** Project tratamiento como Active (no QBR formal, no retainer continuity expectations)

### Anti-patterns Project

- Aceptar scope ambiguo "para no perder el deal" → margin erosion garantizada
- No documentar lessons learned → conversion potential perdido
- Tratar Project como demo → over-deliver sin proportional payment

### Path to Active or Self-Serve

Project conversion es palanca de growth. Identificar oportunidades:

- Cliente Project muestra adoption + repeated need → propose MSA + transition to Active
- Cliente Project descubre Kortex / Verk via service → propose SaaS subscription
- PM marca conversion potential en post-mortem → Account Lead toma over para outreach

---

## La oscilación entre kinds

Los clientes pueden oscilar:

- **Self-Serve → Active**: cliente firma MSA + servicios sobre la SaaS sub
- **Active → Self-Serve**: cliente cancela MSA pero mantiene SaaS sub
- **Active → Project**: cliente cancela MSA pero mantiene SOW puntual
- **Project → Active**: cliente firma MSA + nuevos SOWs
- **Project → Self-Serve**: cliente adopta SaaS sub al terminar SOW
- **Cualquiera → Former Customer**: todo revenue cesa
- **Former → reactivation → cualquiera**: win-back motion

Cada transición es persistida en `client_kind_history` (TASK-816 Delta) — append-only, audit completo.

**Implicación operativa**: cuando un cliente cambia kind:

1. Owner role transfer (e.g., Account Lead → PM cuando Active → Project)
2. Cadence change (e.g., trimestral QBR → ad-hoc cuando Active → Project)
3. North star metric change
4. Pricing model change (puede)
5. Comp plan attribution change (importante for AE incentives)

---

## Decision tree: ¿qué playbook aplico?

```
¿El cliente tiene MSA activo?
├── Sí → ¿Tiene SOWs activos?
│   ├── Sí → Active Account
│   └── No → Active Account (transitorio, MSA solo)
└── No → ¿Tiene SaaS sub activa?
    ├── Sí → ¿Tiene SOW activo también?
    │   ├── Sí → Project Customer (con SaaS as supplement)
    │   └── No → Self-Serve Customer
    └── No → ¿Tiene SOW activo?
        ├── Sí → Project Customer
        └── No → Former Customer / no clasificable
```

Helper canónico Greenhouse: `classifyClientFromContract(organizationId)` (TASK-817 Delta).

---

## Cross-references

- **Manifesto ASaaS** — `docs/strategy/ASAAS_MANIFESTO_V1.md` §4
- **Bow-tie spec** — `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §5.1
- **Spec puente** — `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §5
- **Pricing per kind** — `pricing/asaas-pricing-model.md` (global skill)
- **QBR per segment** — `customer-success/qbr-cadence-by-segment.md` (global skill)
