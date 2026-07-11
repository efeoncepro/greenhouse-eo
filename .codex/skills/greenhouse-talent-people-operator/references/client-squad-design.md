# Client Squad Design & Staff Augmentation (Talent-as-a-Service)

Load when the task is **assembling a delivery team to assign to a client** — a proposal/RFP squad, a retainer pod, a staff-aug request, or the "team & governance" section of a bid. This is the *delivery-facing* counterpart of `workforce-planning.md` (which decides build/buy/borrow and produces a `TalentDemand`): here you design the **actual pod** — roles, seniority, % dedication, hierarchy and synergies — and hand the numbers to finance/commercial.

> **One-line boundary.** Workforce-planning decides *whether and how* to cover a need; this module designs *the squad that covers it for a specific client*; finance prices the dedication × loaded cost; commercial sets margin/packaging; contracting/legal drafts the contract; payroll owns pay. You design the **capability shape**, never the money or the contract.

## The two engagement modes (pick one per engagement)

Efeonce sells talent to clients in two shapes. Naming them correctly changes the whole design, the accountability and the pricing.

| Mode | What the client buys | Who directs the work | Accountability | When it fits |
|---|---|---|---|---|
| **Managed Squad / Delivery Pod** (default, ASaaS-native) | an **outcome/service** delivered by an Efeonce-run cross-functional pod | **Efeonce** (via an Account Lead + delivery leads) | Efeonce owns delivery, quality and SLA | retainers, RFPs/licitaciones, "run this capability for us" (e.g. blog/SEO, performance, brand) |
| **Staff Augmentation** | **named role(s)** embedded into the client's team | the **client** directs the day-to-day | shared; client owns the plan, Efeonce owns the person's quality/continuity | "we need a senior X for N months", capacity overflow, client already has the operating system |

**Rule:** a **licitación / RFP that buys a *service*** (nobody is naming individuals) is a **Managed Squad**, not staff-aug — even if the bases never say "squad". Model it as a pod Efeonce runs to an SLA. Reserve staff-aug for when the client explicitly wants bodies embedded under their direction. The ASaaS doctrine (`efeonce-agency`) favors Managed Squad: Efeonce sells the operating system + outcome, not headcount.

## Anatomy of a squad (the five things every blueprint declares)

A squad is not a list of names. It is a **structured pod**. Every blueprint declares, per member and for the whole:

1. **Role** — what capability they bring (from the taxonomy below).
2. **Seniority** — Lead / Senior / Mid / Junior (sets what they own and the cost band).
3. **% dedication (FTE fraction)** — how much of their capacity this engagement consumes.
4. **Reporting line** — who they report to inside the pod (hierarchy).
5. **RACI per workstream** — who is Responsible / Accountable / Consulted / Informed for each stream of work.

Plus, for the whole squad: **a single Account Lead** (one accountable interlocutor), **total dedicated FTE**, and the **synergy map** (how lanes feed each other).

## Role taxonomy (canonical agency roles × capability roles)

Start from the **canonical Greenhouse agency roles** (colored in runtime: Account, Strategy, Design, Development, Media) and add the **capability roles** the engagement needs. Map each to a **real Efeonce role in nómina** so finance can attach loaded cost — never invent a role that has no home.

| Lane | Canonical / capability roles | Typical seniority |
|---|---|---|
| **Cuenta** | Account Lead / Ejecutivo de Cuenta (single interlocutor) | Senior/Lead |
| **Estrategia** | Content/Editorial Strategist, SEO Lead, Growth Strategist | Senior/Lead |
| **SEO/AEO** | SEO/AEO Specialist, Technical SEO | Senior/Mid |
| **Contenido** | Editor, Copywriter/Redactor SEO, Content Creator | Senior→Junior |
| **Diseño** | Visual Designer, Art Director / Creative Ops Lead | Senior/Lead |
| **Audiovisual** | AV Producer / Video Editor (Globe Studio) | Senior/Mid |
| **Social** | Social Content Strategist (atomización, no gestión de cuentas del cliente) | Senior/Mid |
| **Datos** | Data/Analytics (GA4, Search Console, AI-visibility) | Senior/Mid |
| **Medios** | Media Planner/Buyer, Paid (Reach) — si el engagement lo pide | Senior/Mid |
| **Infra** | Tracking/Martech (Wave) — si el engagement lo pide | Senior/Mid |

> Lead with **"Efeonce"** to the client and describe lanes by capability ("nuestro equipo de contenido y SEO"); the Globe/Reach/Wave unit labels are internal (`efeonce-agency` brand rule). The client contracts Efeonce, not four sub-brands.

## Seniority ladder (what each level owns)

- **Lead** — owns the outcome of a lane, sets the standard, is Accountable in RACI, faces the client. Low dedication %, high leverage.
- **Senior** — owns complex execution end-to-end without supervision; mentors Mid/Junior.
- **Mid** — executes standard work reliably; escalates edge cases.
- **Junior** — executes scoped tasks under review; the QA gate catches issues.

**Rule:** every lane needs an owner at **Senior or Lead**. A pod of only Juniors with no senior owner fails QA and SLA — and reads as under-resourced in a bid.

## The dedication / FTE model (the load-bearing math)

- **% dedication** = the fraction of a person's monthly capacity this engagement consumes. `1.0 FTE ≈ full-time`. A person can serve multiple pods, but their dedications across all engagements **must sum ≤ their real capacity** (over-allocation is an ICO burnout/flight-risk signal — see `engagement-wellbeing.md` + `greenhouse-ico`).
- **Derive dedication from the scope, not the wish.** Translate deliverables → hours/month → FTE fraction. Example logic: *"8 SEO articles/mo × ~4–6 productive hrs each = ~40 hrs → the Editor lane needs ~0.5 FTE"*. Declare the assumption.
- **Dedicado vs compartido:** a Lead is usually **shared** (low % across pods); an executor may be **dedicated** (high % to one pod). Say which.
- **Sum to a credible total.** Report **total dedicated FTE** for the squad. A blog/SEO retainer is typically ~2 FTE distributed across 8–10 roles, not 1 body doing everything — that distribution *is* the quality argument.
- **Capacity reconciliation is a hard gate:** before committing a blueprint, confirm each named-or-slotted person has the free capacity (via ICO/skills-matrix). A blueprint that over-allocates the team is a delivery risk, not a plan.

## Hierarchy & reporting (single throat to choke)

```
                 Account Lead  ── single interlocutor, Accountable for the whole
                 /            \
        Delivery Lead A       Delivery Lead B        (lane owners, Senior/Lead)
        (e.g. SEO/Editorial)  (e.g. Creative/Visual)
        /     |     \              |      \
      IC     IC     IC            IC      IC          (Senior/Mid/Junior executors)
```

- **Exactly one Account Lead** per client — the single point of coordination and the person Accountable to the client. Never a pod with two "who's in charge?".
- **Delivery leads** own each lane's quality and SLA; ICs execute and escalate.
- Keep **manager spans sane** (span/layers from `workforce-planning.md`): a lead drowning in a 12-person pod is the #1 delivery + engagement killer.

## Synergy map (why a pod beats N freelancers)

The differentiator is not *having* the roles — it's that **the lanes feed each other without a human copy-pasting context**:

- **Data → Strategy:** the monthly reporting lane's findings feed next month's editorial grid (Evolve → the next Express). Same operating system, shared context.
- **Strategy → Execution:** the SEO Lead's keyword/intent map briefs the editor and the SEO specialist from one source.
- **Content → Visual → Social:** one article produces its image, its video and its social atom in one flow (atomización), not three parallel productions.
- **One Account Lead** holds the client context so no lane loses it.

Name the synergies in the blueprint — they are the reason the squad is a *system*, not a staffing table.

## RACI per workstream (the accountability grid)

For each workstream, declare exactly one **Accountable** (the lane owner) and the **Responsible** executors:

| Workstream | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Planificación editorial | Estratega/SEO Lead | Account Lead | cliente | squad |
| Producción de contenido | Editor + Redactores | Estratega/SEO Lead | SEO/AEO | Account Lead |
| SEO/AEO on-page | SEO/AEO Specialist | SEO Lead | Editor | Account Lead |
| Visual + multimedia | Diseñador + AV | Dirección Creativa | Estratega | Account Lead |
| Adaptación social | Social Strategist | Dirección Creativa | Editor | cliente |
| Reportería | Analista + SEO/AEO | SEO Lead | Account Lead | cliente |
| Relación con el cliente | Account Lead | Account Lead | delivery leads | squad |

(Adapt the workstreams to the engagement; the pattern — one Accountable per stream — is fixed.)

## Pod archetypes (start from these, tune per engagement)

Pre-baked squads speed up proposals. Each is a default role mix + dedication ranges; tune to the scope.

- **Content/SEO Pod** — Account Lead · Content/SEO Lead · SEO/AEO Specialist · Editor · Copywriter · Visual Designer · AV Producer · Social Strategist · Data/Analytics. ~2 FTE. *(The SKY blog archetype.)*
- **Creative Pod** — Account Lead · Creative Ops Lead · Senior Designers · AV Producer · Copywriter. Brand/creative execution at volume.
- **Growth/Performance Pod** — Account Lead · Growth Strategist · Media Planner/Buyer · Analyst · CRO/Landing · Martech. Paid + conversion.
- **Full-Funnel Pod** — a composed pod spanning Strategy + Content + Media + Data under one Account Lead, for integrated retainers.

## Hand-offs (this module designs the shape; others own the rest)

| Need | Hand off to |
|---|---|
| **Loaded cost** of the squad (% dedication × loaded cost/role from nómina) | `greenhouse-finance-accounting-operator` (source: `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` + `greenhouse_payroll`) |
| **Margin / packaging / price** of the engagement | `commercial-expert` (ASaaS doctrine, umbral de margen por BU) |
| **Bid/proposal** wiring (team section, RFP) | `greenhouse-public-private-tenders` (`propuesta-tecnica-economica.md`) |
| **Capacity/over-allocation** signal | `greenhouse-ico` + `engagement-wellbeing.md` (dual-signal) |
| **Runtime demand** creation | produce a `TalentDemand` (stakeholder=`client`, fulfillment=`staff_augmentation`/managed) → `greenhouse-runtime.md` |
| **Contract** of a staff-aug engagement | Workforce Contracting Studio + legal |
| **Pay** of any member | `greenhouse-payroll-auditor` — never here |

## Runtime binding (Greenhouse)

- A squad blueprint for a client maps to a **`TalentDemand`** with `stakeholder=client` and the right `fulfillment` mode, plus the **skills-matrix/staffing** foundation (TASK-157) for who-can-do-what-at-what-level.
- Consume **ICO capacity + delivery load** for the reconciliation gate; consume **finance loaded cost** for the numbers; this module owns the **capability shape + governance**, not the economics.

## Hard rules (anti-regression)

- **NEVER** present a squad without **exactly one accountable Account Lead** (single interlocutor).
- **NEVER** design a lane without a **Senior/Lead owner**; an all-Junior pod fails QA/SLA and reads as under-resourced.
- **NEVER** let a person's dedications across all engagements **exceed their real capacity** — over-allocation is an ICO burnout/flight-risk signal, not a stretch goal. Reconcile against capacity before committing.
- **NEVER** invent a role with no home in nómina/skills-matrix (finance can't attach loaded cost to a fantasy role — mark clearly as `[EST]` if a role isn't yet staffed and must be estimated).
- **NEVER** name real individuals to a client **without their consent**; default external representation is **role + seniority** (+ anonymized CV if needed). Treat any named-person data with the masked/reveal/audit rigor of employee PII.
- **NEVER** compute pay/comp here (→ payroll) or margin/price here (→ commercial); design the shape, hand the numbers over.
- **NEVER** call a *service* bid "staff augmentation" — if nobody is naming embedded bodies under client direction, it's a **Managed Squad**.
- **ALWAYS** declare per member: role, seniority, % dedication, reporting line; and for the pod: total FTE, the single Account Lead, the RACI grid and the synergy map.
- **ALWAYS** derive dedication from scope→hours→FTE with the assumption stated, not from a wish.

## Sources / foundations

- Build-buy-**borrow** + `TalentDemand` fulfillment modes — `workforce-planning.md` + `references/greenhouse-runtime.md`.
- Canonical agency roles + ASaaS doctrine (sell the operating system, not headcount) — `efeonce-agency` + `docs/context/`.
- Loaded cost model — `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`.
- RACI (Responsible/Accountable/Consulted/Informed) — standard delivery-governance tool.
- Over-allocation as dual burnout/flight-risk signal — `engagement-wellbeing.md` + `greenhouse-ico`.
- Artifact: `templates/squad-blueprint.md`.
