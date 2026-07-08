# Workforce planning + org design

Load when the task is headcount, capacity, build-vs-buy-vs-borrow, or org shape. This is where talent strategy meets the business — and where Greenhouse's ICO + capacity data make it quantitative.

## The core question: build vs buy vs borrow

Before opening a role, decide *how* to cover the need:

| Option | Means | When |
|---|---|---|
| **Build** | develop/upskill/reassign existing people | skill exists nearby; growth motivates; time allows |
| **Buy** | hire (internal employee) | ongoing core capability; structural need |
| **Borrow** | contractor / EOR / partner / staff-aug | temporary, specialized, or geographic coverage; speed |

Efeonce, as an agency, uses all three — and the demand can be *internal* or *for a client*. This is exactly the Greenhouse `TalentDemand` model (stakeholder internal/client × engagement on_demand/on_going × fulfillment mode internal_reassignment / internal_hire / staff_augmentation / contractor / partner). The workforce-planning decision *produces* a `TalentDemand`.

## Capacity gap → demand (the trigger)

- **Capacity gap** = required capacity − available capacity, by skill/role/period. It's the honest trigger for a `TalentDemand` — not "we feel busy".
- In Greenhouse, **ICO delivery metrics + team capacity** are the source of the signal (see `greenhouse-ico`): over-allocation, bottleneck roles, forecast demand. Consume those signals; don't guess headcount.
- **Over-allocation is dual-signal**: it justifies opening demand *and* flags burnout/flight risk (see `engagement-wellbeing.md`). Read it both ways.

## Headcount planning

- **Driver-based, not gut**: tie headcount to demand drivers (pipeline, delivery load, client growth), like driver-based finance forecasting. Compose with `greenhouse-finance-accounting-operator` for the cost side (loaded cost per member), but talent owns the *capability* plan.
- **Lead time**: hiring takes weeks/months — plan demand ahead of the gap, not after. Time-to-fill from your pipeline math (`talent-acquisition.md`) sets the lead.
- **Bench vs just-in-time**: a small bench of versatile talent absorbs shocks; too much bench is cost. For an agency, blend a stable core (buy) with flexible edges (borrow).

## Org design for an agency

- **Roles are real and colored** in Greenhouse: Account, Operations, Strategy, Design, Development, Media (each with a canonical color). Org shapes revolve around client pods + shared capabilities.
- **Spans + layers**: keep manager spans sane — manager overload is the #1 engagement killer (see `engagement-wellbeing.md`). Don't design an org that burns its managers.
- **Skills matrix**: map who can do what at what level (the same competency model as assessment). A skills matrix + capacity = a real workforce plan. (Greenhouse has a skills-matrix/staffing foundation — TASK-157.)
- **Career paths**: org design must leave room to grow (retention). A flat org with no path bleeds Millennials/Gen Z.

## Succession + key-person risk

- Identify **key-person dependencies** (single points of failure) and plan succession/knowledge-transfer — especially with **unretiring Boomers** who can mentor/transfer before exit.
- **9-box** (performance × potential) for talent review → who to develop, promote, or backfill.

## How to apply in Greenhouse

- A workforce-planning conclusion should **produce a `TalentDemand`** with the right stakeholder/engagement/fulfillment mode — the front door of the Hiring/ATS domain (`greenhouse-runtime.md`).
- Consume **ICO/capacity signals** for the gap; **finance** for cost; this skill owns the capability + org logic.
- Boundary: don't compute margins/loaded cost here (finance) or pay (payroll) — recommend the *plan* + *demand*, hand the numbers to the owners.

## Sources / foundations

- Build-buy-borrow talent framework (widely used in strategic workforce planning)
- Greenhouse Hiring/ATS architecture (`TalentDemand` demand matrix) — `references/greenhouse-runtime.md`
- 9-box grid (performance × potential) — standard talent-review tool
