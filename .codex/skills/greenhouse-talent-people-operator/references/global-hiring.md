# Global & national hiring (Efeonce hires everywhere)

Load when hiring outside Chile, remote/distributed, or choosing an engagement model. Efeonce contrata talento nacional (Chile) e internacional. This reference owns the **talent/engagement-model recommendation**; **payroll, tax, and contracts are OUT of scope here** — hand off to `greenhouse-payroll-auditor` (amounts/tax/previsional) and Workforce Contracting Studio + legal (the contract).

## The 2026 global-remote reality

- **Distributed is default** for agency-type talent: hybrid ~50%, fully remote ~25%; **contractor demand up ~50%**. ([Teamed 2026](https://www.teamed.global/blog/remote-work-regulations-global-employer-guide-2026), [Deel 2026](https://www.deel.com/global-hiring-report-2026/))
- **LatAm (+156%) and Eastern Europe (+143%) are the top remote-hiring destinations** — timezone-aligned, cost-competitive. Efeonce sits *inside* the LatAm advantage: same-timezone, Spanish-native talent that US/global companies are fighting for. Use it as an employer-brand angle.
- **EOR market** ≈ $7.45B in 2026 → growing ~6.5%/yr; EOR is the standard way to employ compliantly in a country where you have no entity. ([Rise 2026](https://www.riseworks.io/blog/the-2026-state-of-global-hiring-eor-data-trends-and-workforce-intelligence))
- **Compliance is the hard part**: 87% of companies expanding in 2026 cite local tax/employment regulation as the hardest task; 86% of HR leaders cite international labor-law compliance as their top challenge.
- **Pay transparency going global**: EU Pay Transparency Directive enforceable **Jun 2026** (100+ employees). Plus GDPR + national data-protection (e.g. India DPDP) raise data-handling complexity for cross-border candidate data.

## Engagement-model decision (who is the legal employer?)

This is the first fork after "we want to hire person X in country Y". Map it to the Greenhouse `ContractType`:

| Model | Legal employer | When | Greenhouse `contractType` |
|---|---|---|---|
| **Internal employee (Chile)** | Efeonce SpA | core, ongoing, Chile, subordination | `indefinido` / `plazo_fijo` |
| **Honorarios (Chile)** | — (service provider) | Chile, genuinely independent service, SII retention | `honorarios` |
| **Contractor (international)** | — (independent, via Deel) | independent, project/ongoing, abroad | `contractor` |
| **EOR (international)** | Deel/EOR as legal employer | you need an *employee* abroad but have no entity | `eor` |
| **International internal** | Efeonce SpA (operational payer, NOT EOR) | specific approved profile | `international_internal` |

**Classification is the load-bearing decision** and a legal-risk hotspot: if a person shows subordination/dependency signals but is engaged as `contractor`/`honorarios`, that is misclassification risk — **escalate before proceeding** (this mirrors the payroll skill's red flag). Talent recommends the model; **payroll + legal validate and execute**.

## Sourcing + assessing globally

- **Timezone + language fit** are real selection criteria for distributed roles — make them explicit competencies, not afterthoughts (async-first works; see below).
- **Comp benchmarking by geography**: pay bands vary by market; benchmark to the *talent market*, not a single HQ number. With pay transparency, be ready to publish + justify the band. (Numbers/amounts → finance/payroll; talent owns the *band recommendation* + market rationale.)
- **Async-first assessment**: distributed hiring favors async, structured evaluation (recorded work samples, structured written interviews) — which *also* raises validity + fairness. Async-first models correlate with large talent-pool expansion. ([State of Remote Work 2026](https://remotive.com/blog/state-of-remote-work-2026/))
- **Cross-cultural interviewing**: structure travels better than "culture fit" (which is culturally biased). Use behavioral anchors that describe *outcomes*, not culturally-specific style.
- **Candidate data across borders**: candidate PII crosses jurisdictions — handle with the masked/reveal/audit rigor (see `greenhouse-runtime.md`); don't ship sensitive PII to AI providers.

## Cross-cultural + generational overlay

Global hiring compounds with generational design (`generations-trends-2026.md`): a Gen Z developer in LatAm and a Gen X strategist in Europe want different things. Segment by *what the person values*, verified per-person, on top of the market/model layer.

## Hard boundary (do not cross)

- Talent recommends: **model** (employee/contractor/EOR/honorarios), **market**, **band recommendation**, **timezone/language fit**, **classification risk flag**.
- Payroll owns: statutory pay, tax, previsional, SII retention, Deel/EOR payroll truth, receipts. → `greenhouse-payroll-auditor`.
- Legal/contracting owns: the offer letter + employment/service contract, jurisdiction clauses. → Workforce Contracting Studio + legal.
- **Never** approve a treaty/withholding rate, a net-pay figure, or a contract clause here.

## Sources

- Deel — Global Hiring Report 2026: https://www.deel.com/global-hiring-report-2026/
- Rise — 2026 State of Global Hiring (EOR data): https://www.riseworks.io/blog/the-2026-state-of-global-hiring-eor-data-trends-and-workforce-intelligence
- Teamed — Remote work regulations global guide 2026: https://www.teamed.global/blog/remote-work-regulations-global-employer-guide-2026
- Remotive — State of Remote Work 2026: https://remotive.com/blog/state-of-remote-work-2026/
