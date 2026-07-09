# Talent Acquisition — full-cycle, inbound, head hunting

Load when the task is opening a role, sourcing, inbound recruiting, employer brand, or executive search.

## Full-cycle pipeline (the canonical stages)

```
demand → intake/brief → sourcing → screen → assess → interview → decide → offer → close → onboard
```

Each stage has a conversion rate. Recruiting is a funnel — treat it with the same rigor as a sales pipeline (`commercial-expert` is the sibling discipline).

### 1. Intake / job brief (the highest-leverage 30 minutes)

Bad hiring almost always traces to a vague brief. A strong intake with the hiring manager produces:

- **Outcomes, not tasks**: what must be true in 6/12 months for this hire to be a win (Geoff Smart's "scorecard" — a mission + 3–5 measurable outcomes + the competencies that produce them). Ref: *Who* (Smart & Street).
- **Must-have vs nice-to-have competencies**, ranked. Cut the wishlist — over-specced roles repel strong candidates and slow the fill.
- **Skills-based, not credential-based**: define the *demonstrable skills* the role needs, at what level. Skills-based searches are ~12% more likely to produce a quality hire ([AMS 2026](https://www.weareams.com/knowledge-base/what-are-the-top-talent-acquisition-trends-in-2026/)). A portfolio/work sample often beats a diploma.
- **Comp band + level + location model** (national vs remote-global) up front — pay transparency laws increasingly require sharing this (see `global-hiring.md`).
- **The scorecard is the contract** between recruiter and hiring manager and the seed of the assessment (see `assessment-interviewing.md`). Use `templates/job-brief.md` + `templates/scorecard.md`.

### 2. Sourcing (build a slate, don't wait for applies)

Two engines feed the pipeline: **inbound** (they come to you) and **outbound/head hunting** (you go to them). Strong TA runs both.

**Channels**: referrals (highest quality per hire), talent pool / silver-medalists (past finalists), inbound applies (careers), proactive sourcing (LinkedIn/GitHub/Behance/Dribbble for an agency), communities, agencies/RPO for scale, and — for an agency — the creator economy and portfolio platforms.

**Slate discipline**: aim for a *diverse, qualified slate* (multiple strong candidates) before deciding. A single-candidate "we already know who we want" process is where bias and bad hires live.

### Inbound recruiting (careers as a marketing funnel)

Inbound recruiting mirrors inbound marketing — and for Efeonce the same team logic applies (`seo-aeo`, `commercial-expert`):

```
attract (employer brand, careers SEO/content) →
convert (clear roles, low-friction apply) →
nurture (talent pool, updates, respectful comms) →
hire (structured assessment) →
delight (candidate experience → referrals + brand)
```

- **Employer brand is GTM for talent.** Authentic content (real team, real work, real values) beats corporate-speak — especially for Gen Z, who distrust it (see `generations-trends-2026.md`).
- **Candidate experience is a differentiator** in a candidate-driven market: transparent, respectful, fast journeys raise offer-acceptance and protect the brand ([AMS 2026](https://www.weareams.com/knowledge-base/what-are-the-top-talent-acquisition-trends-in-2026/)). Ghosting candidates is brand damage.
- **Talent pool**: keep warm relationships with silver-medalists and inbound interest even when no role is open. In Greenhouse this maps to `candidate_facet` on a Person + a future Talent Pool surface.
- **Careers surface** = the Greenhouse public careers landing (TASK-354). Same tokenized/public pattern serves the assessment (TASK-1363).

### Public vacancy recipe (offer as inbound asset)

The public offer is a conversion asset, not the internal job brief. After intake, use `templates/job-offer-recipe.md` to structure the candidate-facing vacancy:

- candidate promise and role mission first;
- 3-5 success outcomes;
- real work in plain language;
- must-have vs nice-to-have competencies;
- short public competency chips;
- candidate-facing process with no internal template IDs;
- compensation/location transparency;
- nurture path through Talent Pool/Growth Forms when the candidate is not a fit today.

### Head hunting / executive search (outbound for senior + scarce)

For senior, scarce, or confidential roles, inbound is not enough — you hunt.

- **Market map first**: list the target companies + the people who do this role well; understand where the talent sits before outreach.
- **Boolean / x-ray sourcing**: precise searches across LinkedIn, GitHub, Behance/Dribbble (design), portfolios, communities. Search by *demonstrated skill/output*, not just title.
- **Approach passive talent** with a specific, respectful, personalized message: why them, why this, what's in it for their growth (Millennials/Gen Z buy growth + purpose, not just cash). Volume-blast InMail is dead.
- **Confidential searches**: don't expose the client or the backfill; run off the public careers surface.
- **Assess the same way**: a hunted senior still goes through a structured, competency-based process — seniority is not a reason to skip structure (it's a reason to raise the bar on work samples + reference checks). Ref: *Who* reference-check method.

### 3–8. Screen → assess → interview → decide → offer → close

- **Screen** on the must-haves only (skills-based knockout), not the wishlist.
- **Assess + interview**: structured, competency-based — the science and the Greenhouse engine are in `assessment-interviewing.md`.
- **Decide** with a slate + scorecard + evidence, not gut. Debrief structured (each interviewer submits independently *before* the group discusses, to avoid anchoring).
- **Offer/close**: sell growth + purpose + real comp transparency. Speed matters — strong candidates have options. Keep the candidate warm between offer and start (offer-drop/ghosting is bidirectional now).

## Pipeline math (know your funnel)

Track and improve: applies→screen rate, screen→assess, assess→onsite, onsite→offer, offer→accept, time-to-fill, quality-of-hire (90-day + 6-month outcome vs scorecard), source-of-hire, and candidate NPS. A stuck stage tells you where to fix the process — same discipline as a sales funnel.

## Anti-patterns

- Wishlist job specs (repel strong candidates, slow fills).
- Single-candidate processes ("we know who we want") → bias + bad hire.
- Unstructured "culture fit" interviews (low validity, adverse-impact risk — see fairness in `assessment-interviewing.md`).
- Credential screening over skills/work-sample.
- Ghosting candidates (brand damage, kills the inbound funnel).
- Volume-blast outbound (kills employer brand).

## Sources

- AMS — 2026 talent acquisition trends: https://www.weareams.com/knowledge-base/what-are-the-top-talent-acquisition-trends-in-2026/
- Metaview — 2026 recruiting trends: https://www.metaview.ai/resources/blog/recruiting-trends
- Geoff Smart & Randy Street, *Who: The A Method for Hiring* (scorecard + structured reference checks)
